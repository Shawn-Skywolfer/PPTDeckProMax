/**
 * Artifact Store — IndexedDB persistence, project CRUD, auto-save, export/import
 */

const DB_NAME = 'DeckProMaxDB';
const DB_VERSION = 1;

const EMPTY_ARTIFACTS = {
  deck_brief: '',
  deck_vibe_brief: '',
  deck_narrative_arc: '',
  deck_hero_pages: '',
  deck_layout_v1: '',
  deck_clean_pages: '',
  deck_visual_composition: '',
  deck_asset_plan: '',
  deck_visual_system: '',
  deck_component_tokens: '',
  deck_theme_tokens: '{}',
  deck_geometry_rules: '',
  deck_page_skeletons: '',
  slide_state: {
    project_id: '',
    global_status: 'briefing',
    visual_locked: false,
    review_iteration: 0,
    output_mode: 'pptx+html',
    pages: []
  },
  deck_review_report: '',
  layout_manifest: { pages: [] },
  review_package: {},
  deck_review_findings: [],
  commercial_scorecard: {
    overall_score: null,
    dimensions: {
      audience_fit: null,
      buying_reason_clarity: null,
      proof_strength: null,
      objection_coverage: null,
      narrative_flow: null,
      commercial_ask: null
    },
    summary: null,
    recommended_action: null,
    weak_dimensions: []
  },
  review_rollback_plan: {},
  asset_manifest: { assets: [] },
  image_build_jobs: { batch_size: 4, initial_review_batch: '', batches: [], jobs: [] },
  style_lock: { version: 1, style_id: '', visual_rules: {}, source_files: {} },
  interview_preparation: null,
  interview_session: null,
  deck_expert_context: ''
};

function generateId() {
  return 'proj_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
}

class ArtifactStore {
  constructor() {
    this.db = null;
    this.currentProject = null;
    this.saveTimeout = null;
    this.listeners = [];
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('projects')) {
          const store = db.createObjectStore('projects', { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
    });
  }

  on(event, handler) {
    this.listeners.push({ event, handler });
  }

  emit(event, data) {
    this.listeners.filter(l => l.event === event).forEach(l => l.handler(data));
  }

  createProject(name, mode = 'expert', outputMode = 'pptx+html') {
    const now = Date.now();
    const project = this._hydrateProject({
      id: generateId(),
      name: name || '未命名项目',
      createdAt: now,
      updatedAt: now,
      mode,
      currentStep: 0,
      globalStatus: 'briefing',
      visualLocked: false,
      reviewIteration: 0,
      outputMode,
      artifacts: {
        ...JSON.parse(JSON.stringify(EMPTY_ARTIFACTS)),
        slide_state: {
          ...EMPTY_ARTIFACTS.slide_state,
          project_id: generateId(),
          output_mode: outputMode
        }
      },
      interview: {
        mode: 'chat',
        sessionState: 'preparing',
        claims: [],
        gaps: [],
        answers: {},
        fillRate: 0,
        redactionPending: 0
      },
      calls: []
    });

    this.currentProject = project;
    this._persist(project);
    this.emit('project:created', project);
    return project;
  }

  async loadProject(id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['projects'], 'readonly');
      const store = tx.objectStore('projects');
      const request = store.get(id);

      request.onsuccess = () => {
        if (request.result) {
          this.currentProject = this._hydrateProject(request.result);
          this.emit('project:loaded', request.result);
          resolve(this.currentProject);
        } else {
          reject(new Error('Project not found'));
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async listProjects() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['projects'], 'readonly');
      const store = tx.objectStore('projects');
      const index = store.index('updatedAt');
      const request = index.openCursor(null, 'prev');
      const projects = [];

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          projects.push({
            id: cursor.value.id,
            name: cursor.value.name,
            updatedAt: cursor.value.updatedAt,
            mode: cursor.value.mode,
            currentStep: cursor.value.currentStep,
            globalStatus: cursor.value.globalStatus
          });
          cursor.continue();
        } else {
          resolve(projects);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteProject(id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['projects'], 'readwrite');
      const store = tx.objectStore('projects');
      const request = store.delete(id);
      request.onsuccess = () => {
        if (this.currentProject?.id === id) {
          this.currentProject = null;
        }
        this.emit('project:deleted', id);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  getCurrentProject() {
    return this.currentProject;
  }

  getArtifact(key) {
    if (!this.currentProject) return null;
    return this.currentProject.artifacts[key];
  }

  setArtifact(key, value) {
    if (!this.currentProject) return;
    this.currentProject.artifacts[key] = value;
    this.currentProject.updatedAt = Date.now();
    this._debouncedSave();
    this.emit('artifact:changed', { key, value });
  }

  setInterviewData(data) {
    if (!this.currentProject) return;
    this.currentProject.interview = { ...this.currentProject.interview, ...data };
    this.currentProject.updatedAt = Date.now();
    this._debouncedSave();
    this.emit('interview:changed', this.currentProject.interview);
  }

  addCall(call) {
    if (!this.currentProject) return;
    this.currentProject.calls.push(call);
    this.currentProject.updatedAt = Date.now();
    this._debouncedSave();
    this.emit('call:added', call);
  }

  getTotalCost() {
    if (!this.currentProject) return 0;
    return this.currentProject.calls.reduce((sum, c) => sum + (c.estimatedCostUsd || 0), 0);
  }

  setStep(step) {
    if (!this.currentProject) return;
    this.currentProject.currentStep = step;
    this.currentProject.updatedAt = Date.now();
    this._debouncedSave();
    this.emit('step:changed', step);
  }

  setProjectMeta(data) {
    if (!this.currentProject) return;
    this.currentProject = {
      ...this.currentProject,
      ...data,
      updatedAt: Date.now()
    };
    this._debouncedSave();
    this.emit('project:meta-changed', data);
  }

  setGlobalStatus(status) {
    if (!this.currentProject) return;
    this.currentProject.globalStatus = status;
    this.currentProject.updatedAt = Date.now();
    this._debouncedSave();
    this.emit('status:changed', status);
  }

  exportProject() {
    if (!this.currentProject) return null;
    return JSON.stringify(this.currentProject, null, 2);
  }

  async importProject(jsonString) {
    try {
      const project = this._hydrateProject(JSON.parse(jsonString));
      if (!project.id || !project.artifacts) {
        throw new Error('Invalid project format');
      }
      project.updatedAt = Date.now();
      await this._persist(project);
      this.currentProject = project;
      this.emit('project:imported', project);
      return project;
    } catch (err) {
      this.emit('project:import-error', err.message);
      throw err;
    }
  }

  _debouncedSave() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      if (this.currentProject) {
        this._persist(this.currentProject);
      }
    }, 500);
  }

  async _persist(project) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['projects'], 'readwrite');
      const store = tx.objectStore('projects');
      const request = store.put(project);
      request.onsuccess = () => {
        this.emit('project:saved', project.id);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  _hydrateProject(project) {
    const now = Date.now();
    return {
      createdAt: now,
      updatedAt: now,
      mode: 'expert',
      currentStep: 0,
      globalStatus: 'briefing',
      visualLocked: false,
      reviewIteration: 0,
      outputMode: 'pptx+html',
      briefScenario: project?.briefScenario || 'business_proposal',
      artifacts: JSON.parse(JSON.stringify(EMPTY_ARTIFACTS)),
      interview: {
        mode: 'chat',
        sessionState: 'preparing',
        claims: [],
        gaps: [],
        answers: {},
        fillRate: 0,
        redactionPending: 0
      },
      calls: [],
      ...(project || {}),
      artifacts: {
        ...JSON.parse(JSON.stringify(EMPTY_ARTIFACTS)),
        ...(project?.artifacts || {})
      },
      interview: {
        mode: 'chat',
        sessionState: 'preparing',
        claims: [],
        gaps: [],
        answers: {},
        fillRate: 0,
        redactionPending: 0,
        ...(project?.interview || {})
      }
    };
  }

  // Auto-backup to localStorage every 10 saves
  _backupCount = 0;
  async _persistWithBackup(project) {
    await this._persist(project);
    this._backupCount++;
    if (this._backupCount % 10 === 0) {
      try {
        localStorage.setItem('deck_backup_' + project.id, JSON.stringify(project));
      } catch (e) {
        // Storage full, ignore
      }
    }
  }
}

export const artifactStore = new ArtifactStore();
export { EMPTY_ARTIFACTS };
