/**
 * App Entry Point — 连接所有模块，处理 UI 交互
 */

import { providerManager, PRESETS } from './modules/providerManager.js';
import { artifactStore } from './modules/artifactStore.js';
import { workflowEngine, STEPS } from './modules/workflowEngine.js';
import { aiCaller } from './modules/aiCaller.js';
import { promptEngine, BRIEF_SCENARIOS } from './modules/promptEngine.js';
import { InterviewManager, SCENARIO_CONFIG } from './modules/interviewManager.js';
import { SlidePreview } from './modules/slidePreview.js';
import { QAEngine } from './modules/qaEngine.js';
import { pptxBuilder } from './modules/pptxBuilder.js';
import { htmlBuilder } from './modules/htmlBuilder.js';

// ===== Global State =====
let currentMode = 'expert';
let currentProject = null;
let interviewManager = null;
let slidePreview = new SlidePreview();
let qaEngine = new QAEngine();

// ===== DOM Elements =====
const els = {
  stepper: document.getElementById('stepper'),
  stepTitle: document.getElementById('step-title'),
  stepBadge: document.getElementById('step-badge'),
  stepContent: document.getElementById('step-content'),
  stepIndicator: document.getElementById('step-indicator'),
  prevBtn: document.getElementById('prev-step'),
  nextBtn: document.getElementById('next-step'),
  modeQuick: document.getElementById('mode-quick'),
  modeExpert: document.getElementById('mode-expert'),
  modeBadge: document.getElementById('mode-badge'),
  projectSelect: document.getElementById('project-select'),
  providerToggle: document.getElementById('provider-toggle'),
  providerDrawer: document.getElementById('provider-drawer'),
  providerPanel: document.getElementById('provider-panel'),
  providerOverlay: document.getElementById('provider-overlay'),
  providerClose: document.getElementById('provider-close'),
  providerLabel: document.getElementById('provider-label'),
  providerStatusDot: document.getElementById('provider-status-dot'),
  saveProvider: document.getElementById('save-provider'),
  exportBtn: document.getElementById('export-btn'),
  exportModal: document.getElementById('export-modal'),
  exportPanel: document.getElementById('export-panel'),
  exportOverlay: document.getElementById('export-overlay'),
  exportClose: document.getElementById('export-close'),
  costDisplay: document.getElementById('cost-display'),
  previewTabs: document.querySelectorAll('.preview-tab'),
  previewContent: document.getElementById('preview-content'),
  toastContainer: document.getElementById('toast-container')
};

// ===== Toast Notifications =====
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  const colors = {
    info: 'bg-slate-800 text-white',
    success: 'bg-emerald-600 text-white',
    error: 'bg-rose-600 text-white',
    warning: 'bg-amber-500 text-white'
  };
  toast.className = `toast px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${colors[type] || colors.info}`;
  toast.textContent = message;
  els.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 200);
  }, 3000);
}

// ===== Loading Indicator =====
function showLoading(button, text = '生成中...') {
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = `<div class="spinner inline-block mr-2"></div>${text}`;
  return () => {
    button.disabled = false;
    button.innerHTML = original;
  };
}

// ===== AI Generation =====
async function generateArtifact(role, artifactKey, promptData, button) {
  const stopLoading = button ? showLoading(button) : () => {};

  try {
    const prompt = promptData;
    const messages = [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user }
    ];

    let generatedText = '';
    const response = await aiCaller.streamChat({
      role,
      messages,
      onChunk: (delta, full) => {
        generatedText = full;
        // Update textarea in real-time if it exists
        const textarea = document.querySelector(`[data-artifact="${artifactKey}"]`);
        if (textarea) {
          textarea.value = generatedText;
        }
      },
      onError: (err) => {
        showToast('生成失败: ' + err.message, 'error');
      }
    });

    artifactStore.setArtifact(artifactKey, response.text);
    artifactStore.addCall({
      id: `call_${Date.now()}`,
      role,
      model: providerManager.getModelForRole(role),
      provider: providerManager.config.preset,
      timestamp: Date.now(),
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      estimatedCostUsd: response.cost,
      promptPreview: prompt.user.substring(0, 200),
      status: 'done'
    });

    updatePreview();
    updateCostDisplay();
    showToast(`${artifactKey} 生成完成`, 'success');
    return response.text;
  } catch (err) {
    showToast('生成出错: ' + err.message, 'error');
    throw err;
  } finally {
    stopLoading();
  }
}

// Per-role model cache
const roleModelCache = {};

// ===== Provider Drawer =====
function initProviderDrawer() {
  els.providerToggle.addEventListener('click', () => {
    els.providerDrawer.classList.remove('hidden');
    setTimeout(() => {
      els.providerPanel.classList.add('translate-x-0');
      els.providerPanel.classList.remove('translate-x-full');
    }, 10);
  });

  function closeDrawer() {
    els.providerPanel.classList.remove('translate-x-0');
    els.providerPanel.classList.add('translate-x-full');
    setTimeout(() => els.providerDrawer.classList.add('hidden'), 300);
  }

  els.providerClose.addEventListener('click', closeDrawer);
  els.providerOverlay.addEventListener('click', closeDrawer);

  document.querySelectorAll('.provider-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.provider-preset').forEach(b => {
        b.classList.remove('border-2', 'border-indigo-500', 'bg-indigo-50', 'text-indigo-700');
        b.classList.add('border', 'border-slate-200', 'text-slate-600');
      });
      btn.classList.remove('border', 'border-slate-200', 'text-slate-600');
      btn.classList.add('border-2', 'border-indigo-500', 'bg-indigo-50', 'text-indigo-700');

      const preset = btn.dataset.preset;
      providerManager.setPreset(preset);
      document.getElementById('provider-baseurl').value = PRESETS[preset].baseUrl;
    });
  });

  const config = providerManager.exportConfig();
  document.getElementById('provider-baseurl').value = config.baseUrl;
  document.getElementById('provider-apikey').value = config.apiKey;
  if (config.preset) {
    const presetBtn = document.querySelector(`[data-preset="${config.preset}"]`);
    if (presetBtn) presetBtn.click();
  }

  document.getElementById('test-connection').addEventListener('click', async () => {
    const statusEl = document.getElementById('connection-status');
    statusEl.classList.remove('hidden', 'bg-emerald-50', 'text-emerald-700', 'bg-rose-50', 'text-rose-700', 'bg-amber-50', 'text-amber-700');
    statusEl.classList.add('bg-amber-50', 'text-amber-700');
    statusEl.textContent = '正在测试连通性...';

    // Use current input values, not saved config
    const baseUrl = document.getElementById('provider-baseurl').value.trim();
    const apiKey = document.getElementById('provider-apikey').value.trim();

    const result = await providerManager.testConnectionWithConfig(baseUrl, apiKey);
    if (result.success) {
      statusEl.classList.remove('bg-amber-50', 'text-amber-700');
      statusEl.classList.add('bg-emerald-50', 'text-emerald-700');
      statusEl.textContent = `✓ 连通成功 (${result.method})`;
      els.providerStatusDot.className = 'w-2 h-2 rounded-full bg-emerald-400';
      showToast('Provider 连通成功', 'success');
    } else {
      statusEl.classList.remove('bg-amber-50', 'text-amber-700');
      statusEl.classList.add('bg-rose-50', 'text-rose-700');
      statusEl.textContent = `✗ 连通失败: ${result.error}`;
      els.providerStatusDot.className = 'w-2 h-2 rounded-full bg-rose-400';
      showToast('Provider 连通失败', 'error');
    }
  });

  els.saveProvider.addEventListener('click', () => {
    providerManager.setBaseUrl(document.getElementById('provider-baseurl').value);
    providerManager.setApiKey(document.getElementById('provider-apikey').value);
    // Save role bindings (provider + model)
    document.querySelectorAll('.role-provider-select').forEach(select => {
      const role = select.dataset.role;
      const providerName = select.value;
      const modelSelect = document.querySelector(`.role-model-select[data-role="${role}"]`);
      const model = modelSelect ? modelSelect.value : '';
      providerManager.setRoleBinding(role, providerName, model);
      if (model) {
        providerManager.setRoleModel(role, model);
      }
    });
    els.providerLabel.textContent = PRESETS[providerManager.config.preset]?.name || 'Custom';
    showToast('Provider 配置已保存', 'success');
    closeDrawer();
  });

  // Config import/export
  document.getElementById('export-config-btn').addEventListener('click', () => {
    const config = providerManager.exportConfig();
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ppt-deck-provider-config-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('配置已导出', 'success');
  });

  document.getElementById('import-config-btn').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const imported = JSON.parse(text);
        providerManager.importConfig(imported);
        // Refresh UI
        document.getElementById('provider-baseurl').value = providerManager.config.baseUrl || '';
        document.getElementById('provider-apikey').value = providerManager.config.apiKey || '';
        if (providerManager.config.preset) {
          const presetBtn = document.querySelector(`[data-preset="${providerManager.config.preset}"]`);
          if (presetBtn) {
            document.querySelectorAll('.provider-preset').forEach(b => {
              b.classList.remove('border-2', 'border-indigo-500', 'bg-indigo-50', 'text-indigo-700');
              b.classList.add('border', 'border-slate-200', 'text-slate-600');
            });
            presetBtn.classList.remove('border', 'border-slate-200', 'text-slate-600');
            presetBtn.classList.add('border-2', 'border-indigo-500', 'bg-indigo-50', 'text-indigo-700');
          }
        }
        renderProviderPool();
        // Restore role bindings
        document.querySelectorAll('.role-provider-select').forEach(select => {
          const role = select.dataset.role;
          const binding = providerManager.config.roleBindings[role];
          if (binding && binding.providerName) {
            select.value = binding.providerName;
            const modelSelect = document.querySelector(`.role-model-select[data-role="${role}"]`);
            if (modelSelect && binding.model) modelSelect.value = binding.model;
          }
        });
        showToast('配置已导入', 'success');
      } catch (err) {
        showToast('配置导入失败: ' + err.message, 'error');
      }
    };
    input.click();
  });

  // Provider Pool
  function renderProviderPool() {
    const container = document.getElementById('provider-pool-list');
    const pool = providerManager.config.providerPool || [];
    if (pool.length === 0) {
      container.innerHTML = '<div class="text-xs text-slate-400 text-center py-2">暂无额外 Provider</div>';
    } else {
      container.innerHTML = pool.map(p => `
        <div class="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-100" data-pool-name="${p.name}">
          <div class="min-w-0">
            <div class="text-xs font-medium text-slate-700 truncate">${p.name}</div>
            <div class="text-[10px] text-slate-400 truncate">${p.preset} · ${p.baseUrl}</div>
          </div>
          <button class="pool-remove-btn text-xs px-1.5 py-0.5 text-rose-500 hover:bg-rose-50 rounded transition-colors" data-name="${p.name}">删除</button>
        </div>
      `).join('');
      container.querySelectorAll('.pool-remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          providerManager.removeProviderFromPool(btn.dataset.name);
          renderProviderPool();
          updateRoleProviderOptions();
        });
      });
    }
    updateRoleProviderOptions();
  }

  function updateRoleProviderOptions() {
    const pool = providerManager.config.providerPool || [];
    const globalOption = '<option value="__global__">使用全局 Provider</option>';
    const poolOptions = pool.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
    document.querySelectorAll('.role-provider-select').forEach(select => {
      const currentVal = select.value;
      select.innerHTML = globalOption + poolOptions;
      select.value = currentVal || '__global__';
    });
  }

  // Inline provider pool addition form
  const poolPresetSelect = document.getElementById('pool-preset');
  const poolBaseUrlInput = document.getElementById('pool-baseurl');
  poolPresetSelect.addEventListener('change', () => {
    const preset = poolPresetSelect.value;
    if (PRESETS[preset] && preset !== 'custom') {
      poolBaseUrlInput.value = PRESETS[preset].baseUrl;
    }
  });
  // Initialize with first preset
  if (PRESETS[poolPresetSelect.value]) {
    poolBaseUrlInput.value = PRESETS[poolPresetSelect.value].baseUrl;
  }

  document.getElementById('add-pool-provider').addEventListener('click', async () => {
    const name = document.getElementById('pool-name').value.trim();
    const preset = poolPresetSelect.value;
    const baseUrl = poolBaseUrlInput.value.trim();
    const apiKey = document.getElementById('pool-apikey').value.trim();

    if (!name) {
      showToast('请输入 Provider 名称', 'warning');
      return;
    }
    if (!baseUrl) {
      showToast('请输入 Base URL', 'warning');
      return;
    }

    // Test connection first
    const testBtn = document.getElementById('add-pool-provider');
    const originalText = testBtn.innerHTML;
    testBtn.disabled = true;
    testBtn.innerHTML = '<div class="spinner inline-block mr-1" style="width:12px;height:12px;border-width:1px;"></div>测试中...';

    try {
      // Step 1: verify provider is reachable
      const testResult = await providerManager.testConnectionWithConfig(baseUrl, apiKey);
      if (!testResult.success) {
        showToast('连通失败: ' + testResult.error, 'error');
        testBtn.disabled = false;
        testBtn.innerHTML = originalText;
        return;
      }

      // Step 2: try to fetch models (optional — many providers don't support /models)
      const models = await providerManager.refreshModelsForConfig(baseUrl, apiKey);
      providerManager.addProviderToPool(name, preset, baseUrl, apiKey);
      renderProviderPool();

      if (models.length === 0 || models[0]?.id === 'default') {
        showToast(`Provider "${name}" 已添加 (models 端点不可用，可手动输入模型名)`, 'warning');
      } else {
        showToast(`Provider "${name}" 已添加 (${models.length} 个模型)`, 'success');
      }

      // Clear form
      document.getElementById('pool-name').value = '';
      document.getElementById('pool-apikey').value = '';
    } catch (err) {
      showToast('添加失败: ' + err.message, 'error');
    } finally {
      testBtn.disabled = false;
      testBtn.innerHTML = originalText;
    }
  });

  renderProviderPool();

  document.getElementById('toggle-apikey').addEventListener('click', () => {
    const input = document.getElementById('provider-apikey');
    input.type = input.type === 'password' ? 'text' : 'password';
  });

  // Per-role model refresh, filter, and selection
  const ROLES = ['brief', 'visual', 'build', 'review', 'interviewer'];

  async function refreshModelsForRole(role) {
    // Read the currently selected provider from UI (not saved binding)
    const providerSelect = document.querySelector(`.role-provider-select[data-role="${role}"]`);
    const providerName = providerSelect ? providerSelect.value : '__global__';

    let baseUrl, apiKey;
    if (providerName === '__global__') {
      baseUrl = providerManager.config.baseUrl;
      apiKey = providerManager.config.apiKey;
    } else {
      const provider = providerManager.config.providerPool.find(p => p.name === providerName);
      if (provider) {
        baseUrl = provider.baseUrl;
        apiKey = provider.apiKey;
      } else {
        showToast(`[${role}] 未找到 Provider: ${providerName}`, 'error');
        return;
      }
    }

    const btn = document.querySelector(`.role-refresh-models[data-role="${role}"]`);
    const originalHTML = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<div class="spinner inline-block" style="width:10px;height:10px;border-width:1px;"></div>';
    }

    try {
      const models = await providerManager.refreshModelsForConfig(baseUrl, apiKey);
      roleModelCache[role] = models;
      if (models.length > 0) {
        renderRoleModelList(role, models);
        showToast(`[${role}] 已加载 ${models.length} 个模型`, 'success');
      } else {
        renderRoleModelList(role, []);
        showToast(`[${role}] 未能获取模型列表`, 'warning');
      }
    } catch (err) {
      renderRoleModelList(role, []);
      showToast(`[${role}] 刷新失败: ${err.message}`, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
      }
    }
  }

  function renderRoleModelList(role, models, filter = '') {
    const container = document.querySelector(`.role-model-list[data-role="${role}"]`);
    const modelSelect = document.querySelector(`.role-model-select[data-role="${role}"]`);
    if (!container) return;

    const filtered = filter
      ? models.filter(m => m.id.toLowerCase().includes(filter.toLowerCase()))
      : models;

    if (filtered.length === 0) {
      container.innerHTML = '<div class="p-2 text-xs text-slate-400 text-center">暂无模型</div>';
    } else {
      container.innerHTML = filtered.map(m => `
        <div class="p-2 hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between group" data-model-id="${m.id}" data-role="${role}">
          <div class="flex-1 min-w-0">
            <div class="text-xs text-slate-700 truncate font-medium">${m.id}</div>
          </div>
          <button class="role-model-select-btn opacity-0 group-hover:opacity-100 px-1.5 py-0.5 text-[10px] bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 transition-all" data-model="${m.id}" data-role="${role}">
            选择
          </button>
        </div>
      `).join('');
    }

    // Update model select dropdown
    const options = ['<option value="">使用默认模型</option>', ...models.map(m => `<option value="${m.id}">${m.id}</option>`)].join('');
    if (modelSelect) {
      const currentVal = modelSelect.value;
      modelSelect.innerHTML = options;
      modelSelect.value = currentVal;
    }

    container.querySelectorAll('[data-model-id]').forEach(row => {
      row.addEventListener('click', () => {
        const model = row.dataset.modelId;
        const r = row.dataset.role;
        const select = document.querySelector(`.role-model-select[data-role="${r}"]`);
        if (select) select.value = model;
        showToast(`[${r}] 已选择模型: ${model}`, 'success');
      });
    });
  }

  ROLES.forEach(role => {
    const refreshBtn = document.querySelector(`.role-refresh-models[data-role="${role}"]`);
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => refreshModelsForRole(role));
    }

    const filterInput = document.querySelector(`.role-model-filter[data-role="${role}"]`);
    if (filterInput) {
      filterInput.addEventListener('input', (e) => {
        const models = roleModelCache[role] || [];
        renderRoleModelList(role, models, e.target.value);
      });
    }

    // Clear model list when provider changes to avoid stale data
    const providerSelect = document.querySelector(`.role-provider-select[data-role="${role}"]`);
    if (providerSelect) {
      providerSelect.addEventListener('change', () => {
        roleModelCache[role] = [];
        renderRoleModelList(role, []);
        const modelSelect = document.querySelector(`.role-model-select[data-role="${role}"]`);
        if (modelSelect) modelSelect.innerHTML = '<option value="">使用默认模型</option>';
      });
    }
  });
}

function renderModelList(models) {
  // Global model list removed; models are now per-role
}

// ===== Mode Toggle =====
function initModeToggle() {
  function updateMode(mode) {
    currentMode = mode;
    if (mode === 'expert') {
      els.modeExpert.classList.add('bg-white', 'text-indigo-600', 'shadow-sm');
      els.modeExpert.classList.remove('text-slate-500');
      els.modeQuick.classList.remove('bg-white', 'text-indigo-600', 'shadow-sm');
      els.modeQuick.classList.add('text-slate-500');
      els.modeBadge.textContent = 'Expert';
      els.modeBadge.className = 'text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30';
    } else {
      els.modeQuick.classList.add('bg-white', 'text-indigo-600', 'shadow-sm');
      els.modeQuick.classList.remove('text-slate-500');
      els.modeExpert.classList.remove('bg-white', 'text-indigo-600', 'shadow-sm');
      els.modeExpert.classList.add('text-slate-500');
      els.modeBadge.textContent = 'Quick';
      els.modeBadge.className = 'text-xs font-medium px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/30';
    }
    if (currentProject) {
      currentProject.mode = mode;
    }
    renderStepper();
    renderStepContent();
  }

  els.modeQuick.addEventListener('click', () => updateMode('quick'));
  els.modeExpert.addEventListener('click', () => updateMode('expert'));
}

// ===== Project Management =====
async function loadProjectList() {
  const projects = await artifactStore.listProjects();
  els.projectSelect.innerHTML = '<option value="">+ 新建项目</option>' +
    projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
}

async function loadProject(id) {
  try {
    const project = await artifactStore.loadProject(id);
    currentProject = project;
    currentMode = project.mode;
    workflowEngine.setStep(project.currentStep);
    updateModeUI();
    renderStepper();
    renderStepContent();
    updatePreview();
    updateCostDisplay();
    showToast(`已加载项目: ${project.name}`, 'success');
  } catch (err) {
    showToast('加载项目失败', 'error');
  }
}

function createNewProject() {
  const name = prompt('项目名称:', '我的 Deck 项目');
  if (!name) return;
  const project = artifactStore.createProject(name, currentMode);
  currentProject = project;
  workflowEngine.setStep(0);
  interviewManager = null;
  qaEngine = new QAEngine();
  loadProjectList();
  renderStepper();
  renderStepContent();
  updatePreview();
  showToast('项目创建成功', 'success');
}

function updateModeUI() {
  if (currentMode === 'expert') {
    els.modeExpert.click();
  } else {
    els.modeQuick.click();
  }
}

// ===== Stepper & Navigation =====
function renderStepper() {
  if (!els.stepper) return;
  workflowEngine.renderStepper(els.stepper, currentProject, currentMode);
}

function renderStepContent() {
  const step = workflowEngine.getCurrentStep();
  if (!step) return;

  els.stepTitle.textContent = step.title;
  els.stepBadge.textContent = `Step ${step.id}`;
  els.stepIndicator.textContent = `步骤 ${step.id}: ${step.shortTitle}`;

  const prev = workflowEngine.getPrevStep(currentMode);
  const next = workflowEngine.getNextStep(currentMode);
  els.prevBtn.disabled = !prev;
  els.nextBtn.disabled = !next || !workflowEngine.canAdvance(currentProject);

  const content = buildStepUI(step);
  els.stepContent.innerHTML = '';
  els.stepContent.appendChild(content);
}

function buildStepUI(step) {
  const container = document.createElement('div');
  container.className = 'max-w-4xl mx-auto animate-fade-in';

  switch (step.key) {
    case 'init':
      container.innerHTML = `
        <div class="text-center py-16">
          <div class="w-20 h-20 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-indigo-100">
            <svg class="w-10 h-10 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          </div>
          <h3 class="text-xl font-bold text-slate-800 mb-2">创建你的 Deck 项目</h3>
          <p class="text-slate-500 mb-8 max-w-md mx-auto">我们将引导你完成从 Brief 到最终 PPTX 的完整流程。选择模式并开始。</p>
          <div class="flex gap-3 justify-center">
            <button id="init-project-btn" class="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40">
              新建项目
            </button>
            <button id="import-project-btn" class="px-6 py-3 bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 font-medium rounded-xl transition-all">
              导入项目
            </button>
          </div>
        </div>
      `;
      setTimeout(() => {
        document.getElementById('init-project-btn')?.addEventListener('click', createNewProject);
        document.getElementById('import-project-btn')?.addEventListener('click', () => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.json';
          input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const text = await file.text();
            try {
              await artifactStore.importProject(text);
              currentProject = artifactStore.getCurrentProject();
              loadProjectList();
              renderStepper();
              renderStepContent();
              updatePreview();
              showToast('项目导入成功', 'success');
            } catch (err) {
              showToast('项目导入失败: ' + err.message, 'error');
            }
          };
          input.click();
        });
      }, 0);
      break;

    case 'brief': {
      const sourceVal = currentProject?.artifacts.deck_brief || '';
      const briefScenario = currentProject?.briefScenario || 'business_proposal';
      const scenarioOptions = Object.entries(BRIEF_SCENARIOS).map(([key, cfg]) =>
        `<option value="${key}" ${key === briefScenario ? 'selected' : ''}>${cfg.label}</option>`
      ).join('');

      container.innerHTML = `
        <div class="mb-4 flex items-center justify-between">
          <div>
            <h3 class="text-sm font-semibold text-slate-700">Brief 提炼策略</h3>
            <p class="text-xs text-slate-500 mt-0.5" id="brief-scenario-desc">${BRIEF_SCENARIOS[briefScenario].description}</p>
          </div>
          <select id="brief-scenario" class="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400">
            ${scenarioOptions}
          </select>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-semibold text-slate-700 mb-2">源材料</label>
          <textarea id="source-material" class="artifact-editor w-full h-48 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all resize-y" placeholder="在此粘贴源文档、报告或会议记录..."></textarea>
        </div>

        <div class="mb-4 border border-slate-200 rounded-xl overflow-hidden">
          <button id="toggle-custom-prompt" class="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-left text-xs font-medium text-slate-600 flex items-center justify-between transition-colors">
            <span>二次自定义提示词（可选）</span>
            <svg id="custom-prompt-chevron" class="w-4 h-4 text-slate-400 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </button>
          <div id="custom-prompt-panel" class="hidden">
            <div class="p-4 space-y-3 bg-white">
              <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">自定义锁定字段（JSON 格式，留空使用默认）</label>
                <textarea id="custom-fields" class="w-full h-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-y" placeholder='[{"name":"字段名","desc":"字段说明"}]'></textarea>
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">自定义约束（每行一条，留空使用默认）</label>
                <textarea id="custom-constraints" class="w-full h-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-y" placeholder="每行输入一条约束..."></textarea>
              </div>
              <div class="flex items-center gap-2">
                <button id="reset-custom-prompt" class="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">重置为默认</button>
                <span class="text-[10px] text-slate-400">修改后仅影响本次生成，不会保存为全局模板</span>
              </div>
            </div>
          </div>
        </div>

        <button id="generate-brief-btn" class="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 mb-6">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          生成 Brief
        </button>
        ${buildArtifactEditor('deck_brief', 'deck_brief.md', '生成后的 Brief 将显示在这里...')}
      `;
      setTimeout(() => {
        const sourceTextarea = container.querySelector('#source-material');
        const briefTextarea = container.querySelector('[data-artifact="deck_brief"]');
        const scenarioSelect = container.querySelector('#brief-scenario');
        const scenarioDesc = container.querySelector('#brief-scenario-desc');
        const customPromptPanel = container.querySelector('#custom-prompt-panel');
        const customPromptChevron = container.querySelector('#custom-prompt-chevron');
        const customFieldsTextarea = container.querySelector('#custom-fields');
        const customConstraintsTextarea = container.querySelector('#custom-constraints');
        if (sourceVal && briefTextarea) briefTextarea.value = sourceVal;

        // Scenario switch
        scenarioSelect.addEventListener('change', () => {
          const scenario = scenarioSelect.value;
          scenarioDesc.textContent = BRIEF_SCENARIOS[scenario].description;
          currentProject.briefScenario = scenario;
          // Also sync interview scenario for consistency
          currentProject.interviewScenario = scenario;
          artifactStore.setInterviewData({ scenario });
          showToast(`已切换 Brief 策略: ${BRIEF_SCENARIOS[scenario].label}`, 'success');
        });

        // Toggle custom prompt panel
        container.querySelector('#toggle-custom-prompt').addEventListener('click', () => {
          customPromptPanel.classList.toggle('hidden');
          customPromptChevron.classList.toggle('rotate-180');
        });

        // Reset custom prompts
        container.querySelector('#reset-custom-prompt').addEventListener('click', () => {
          customFieldsTextarea.value = '';
          customConstraintsTextarea.value = '';
          showToast('已重置为默认提示词', 'success');
        });

        container.querySelector('#generate-brief-btn').addEventListener('click', () => {
          const source = sourceTextarea.value.trim();
          if (!source) {
            showToast('请先输入源材料', 'warning');
            return;
          }
          const scenario = scenarioSelect.value;

          // Parse custom fields
          let customFields = null;
          const fieldsText = customFieldsTextarea.value.trim();
          if (fieldsText) {
            try {
              customFields = JSON.parse(fieldsText);
              if (!Array.isArray(customFields)) throw new Error('必须是数组');
            } catch (e) {
              showToast('自定义字段 JSON 格式错误: ' + e.message, 'error');
              return;
            }
          }

          // Parse custom constraints
          let customConstraints = null;
          const constraintsText = customConstraintsTextarea.value.trim();
          if (constraintsText) {
            customConstraints = constraintsText.split('\n').map(s => s.trim()).filter(Boolean);
          }

          const prompt = promptEngine.buildBriefPrompt(source, scenario, customFields, customConstraints);
          generateArtifact('brief', 'deck_brief', prompt, container.querySelector('#generate-brief-btn'));
        });
      }, 0);
      break;
    }

    case 'expert_interview':
      container.innerHTML = buildInterviewUI();
      setTimeout(() => initInterviewUI(container), 0);
      break;

    case 'redaction':
      container.innerHTML = buildRedactionUI();
      setTimeout(() => initRedactionUI(container), 0);
      break;

    case 'vibe': {
      const brief = currentProject?.artifacts.deck_brief || '';
      container.innerHTML = `
        ${buildArtifactEditor('deck_vibe_brief', 'deck_vibe_brief.md', '视觉 mood、配色、字体、图形语言...')}
        <button id="generate-vibe-btn" class="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 mb-6">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          生成 Vibe Brief
        </button>
        ${buildArtifactEditor('deck_narrative_arc', 'deck_narrative_arc.md', 'Beat 序列、情感曲线...')}
      `;
      setTimeout(() => {
        container.querySelector('#generate-vibe-btn').addEventListener('click', () => {
          const prompt = promptEngine.buildVisualSystemPrompt({
            deck_brief: brief,
            deck_vibe_brief: currentProject?.artifacts.deck_vibe_brief || '',
            deck_clean_pages: currentProject?.artifacts.deck_clean_pages || ''
          });
          // Generate both
          generateArtifact('visual', 'deck_vibe_brief', prompt, container.querySelector('#generate-vibe-btn'));
        });
      }, 0);
      break;
    }

    case 'narrative': {
      const brief = currentProject?.artifacts.deck_brief || '';
      const expertCtx = currentProject?.artifacts.deck_expert_context || '';
      container.innerHTML = `
        <button id="generate-narrative-btn" class="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 mb-6">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          生成叙事弧线
        </button>
        ${buildArtifactEditor('deck_narrative_arc', 'deck_narrative_arc.md', 'Beat 序列、情感曲线、过渡逻辑...')}
        ${buildArtifactEditor('deck_hero_pages', 'deck_hero_pages.md', 'Hero page 选择...')}
      `;
      setTimeout(() => {
        container.querySelector('#generate-narrative-btn').addEventListener('click', () => {
          const prompt = promptEngine.buildNarrativePrompt(brief, expertCtx);
          generateArtifact('brief', 'deck_narrative_arc', prompt, container.querySelector('#generate-narrative-btn'));
        });
      }, 0);
      break;
    }

    case 'layout':
      container.innerHTML = buildArtifactEditor('deck_layout_v1', 'deck_layout_v1.md', '逐页布局草稿...');
      break;

    case 'compression': {
      const layout = currentProject?.artifacts.deck_layout_v1 || '';
      const brief = currentProject?.artifacts.deck_brief || '';
      container.innerHTML = `
        <button id="generate-compression-btn" class="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 mb-6">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          生成 Clean Pages
        </button>
        ${buildArtifactEditor('deck_clean_pages', 'deck_clean_pages.md', '压缩后的逐页文案...')}
        ${buildArtifactEditor('deck_visual_composition', 'deck_visual_composition.md', '每页视觉主角定义...')}
      `;
      setTimeout(() => {
        container.querySelector('#generate-compression-btn').addEventListener('click', () => {
          const prompt = promptEngine.buildCompressionPrompt(layout, brief);
          generateArtifact('brief', 'deck_clean_pages', prompt, container.querySelector('#generate-compression-btn'));
        });
      }, 0);
      break;
    }

    case 'assets':
      container.innerHTML = buildArtifactEditor('deck_asset_plan', 'deck_asset_plan.md', '素材需求清单...');
      break;

    case 'visual_system': {
      const vibe = currentProject?.artifacts.deck_vibe_brief || '';
      const cleanPages = currentProject?.artifacts.deck_clean_pages || '';
      container.innerHTML = `
        <button id="generate-visual-system-btn" class="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 mb-6">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          生成视觉系统
        </button>
        ${buildArtifactEditor('deck_visual_system', 'deck_visual_system.md', '组件族、Token...')}
        ${buildArtifactEditor('deck_component_tokens', 'deck_component_tokens.md', '组件 Tokens...')}
        ${buildArtifactEditor('deck_theme_tokens', 'deck_theme_tokens.json', '{"colors": {"primary": "#6366f1"}}')}
        ${buildArtifactEditor('deck_geometry_rules', 'deck_geometry_rules.md', '几何规则...')}
        ${buildArtifactEditor('deck_page_skeletons', 'deck_page_skeletons.md', '页面骨架...')}
      `;
      setTimeout(() => {
        container.querySelector('#generate-visual-system-btn').addEventListener('click', () => {
          const prompt = promptEngine.buildVisualSystemPrompt({
            deck_brief: currentProject?.artifacts.deck_brief || '',
            deck_vibe_brief: vibe,
            deck_clean_pages: cleanPages
          });
          generateArtifact('visual', 'deck_visual_system', prompt, container.querySelector('#generate-visual-system-btn'));
        });
      }, 0);
      break;
    }

    case 'build':
      container.innerHTML = buildBuildUI();
      setTimeout(() => initBuildUI(container), 0);
      break;

    case 'qa':
      container.innerHTML = buildQAUI();
      setTimeout(() => initQAUI(container), 0);
      break;

    default:
      container.innerHTML = `<div class="text-center py-12 text-slate-400">此步骤的编辑器即将推出</div>`;
  }

  return container;
}

function buildArtifactEditor(key, placeholder, defaultValue) {
  const value = currentProject?.artifacts[key] || '';
  return `
    <div class="mb-6">
      <div class="flex items-center justify-between mb-2">
        <label class="text-sm font-semibold text-slate-700">${key}</label>
      </div>
      <textarea
        class="artifact-editor w-full h-64 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all resize-y"
        placeholder="${placeholder}"
        data-artifact="${key}"
      >${typeof value === 'string' ? value : JSON.stringify(value, null, 2)}</textarea>
    </div>
  `;
}

// ===== Interview UI =====
function buildInterviewUI() {
  const interview = currentProject?.interview;
  const scenarioOptions = Object.entries(SCENARIO_CONFIG).map(([key, cfg]) =>
    `<option value="${key}">${cfg.label}</option>`
  ).join('');

  return `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-slate-800">Expert Interview</h3>
          <p class="text-xs text-slate-500 mt-0.5" id="scenario-desc">${SCENARIO_CONFIG[interview?.scenario || 'business_proposal'].description}</p>
        </div>
        <div class="flex items-center gap-2">
          <select id="interview-scenario" class="text-xs px-2 py-1 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400">
            ${scenarioOptions}
          </select>
          <div class="flex items-center gap-2 bg-slate-100 rounded-lg p-0.5">
            <button class="interview-mode-btn px-3 py-1 text-xs font-medium rounded-md bg-white text-indigo-600 shadow-sm" data-mode="chat">聊天</button>
            <button class="interview-mode-btn px-3 py-1 text-xs font-medium rounded-md text-slate-500 hover:text-slate-700" data-mode="questionnaire">问卷</button>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
        <div class="flex-1">
          <div class="flex items-center justify-between mb-1">
            <span class="text-sm font-medium text-indigo-900">Gap Fill Rate</span>
            <span class="text-sm font-bold text-indigo-700" id="fill-rate-display">${interview?.fillRate || 0}%</span>
          </div>
          <div class="progress-bar" style="min-height: 6px;">
            <div class="progress-bar-fill" id="fill-rate-bar" style="width: ${Math.max(interview?.fillRate || 0, 3)}%"></div>
          </div>
        </div>
      </div>

      <div id="interview-content" class="border border-slate-200 rounded-xl overflow-hidden bg-white">
        <div class="p-8 text-center text-slate-400">
          点击「开始访谈」启动结构化对话
        </div>
      </div>

      <div class="flex gap-2">
        <button id="start-interview" class="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-all">
          开始访谈
        </button>
        <button id="finalize-interview" class="flex-1 px-4 py-2.5 bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 text-sm font-medium rounded-lg transition-all">
          完成并生成 Expert Context
        </button>
      </div>
    </div>
  `;
}

function initInterviewUI(container) {
  const scenarioSelect = container.querySelector('#interview-scenario');
  const scenarioDesc = container.querySelector('#scenario-desc');
  const currentScenario = currentProject?.interview?.scenario || currentProject?.briefScenario || 'business_proposal';

  if (scenarioSelect) {
    scenarioSelect.value = currentScenario;
  }

  // Create or recreate interviewManager with correct scenario
  if (!interviewManager || interviewManager.scenario !== currentScenario) {
    interviewManager = new InterviewManager(currentScenario);
    // Restore persisted gaps/claims if any
    if (currentProject?.interview?.claims) {
      interviewManager.claims = currentProject.interview.claims;
    }
    if (currentProject?.interview?.gaps) {
      interviewManager.gaps = currentProject.interview.gaps;
    }
    if (currentProject?.interview?.messages) {
      interviewManager.messages = currentProject.interview.messages;
    }
  }

  const contentDiv = container.querySelector('#interview-content');
  const fillRateDisplay = container.querySelector('#fill-rate-display');
  const fillRateBar = container.querySelector('#fill-rate-bar');

  function updateFillRate() {
    const rate = interviewManager.getFillRate();
    fillRateDisplay.textContent = rate + '%';
    fillRateBar.style.width = rate + '%';
    artifactStore.setInterviewData({ fillRate: rate, scenario: interviewManager.scenario });
  }

  // Scenario switch handler
  if (scenarioSelect) {
    scenarioSelect.addEventListener('change', () => {
      const newScenario = scenarioSelect.value;
      if (newScenario === interviewManager.scenario) return;

      // Confirm if there's active progress
      const hasProgress = interviewManager.gaps.length > 0 || interviewManager.messages.length > 0;
      if (hasProgress) {
        const confirmed = confirm(`切换场景将重置当前访谈进度。确定切换到「${SCENARIO_CONFIG[newScenario].label}」？`);
        if (!confirmed) {
          scenarioSelect.value = interviewManager.scenario;
          return;
        }
      }

      interviewManager.setScenario(newScenario);
      if (scenarioDesc) scenarioDesc.textContent = SCENARIO_CONFIG[newScenario].description;
      updateFillRate();

      // Persist
      artifactStore.setInterviewData({
        scenario: newScenario,
        claims: interviewManager.claims,
        gaps: interviewManager.gaps,
        messages: interviewManager.messages,
        fillRate: interviewManager.getFillRate()
      });

      // Reset UI
      contentDiv.innerHTML = `<div class="p-8 text-center text-slate-400">
        场景已切换为「${SCENARIO_CONFIG[newScenario].label}」，点击「开始访谈」启动结构化对话
      </div>`;
      showToast(`已切换场景: ${SCENARIO_CONFIG[newScenario].label}`, 'success');
    });
  }

  // Recursive chat handler: processes answer, generates next question, re-renders
  async function handleChatAnswer(question, answer) {
    interviewManager.addUserAnswer(question, answer);
    updateFillRate();

    if (interviewManager.getFillRate() >= 100) {
      showToast('所有缺口已填补', 'success');
      return;
    }

    const nextQuestion = await interviewManager.generateNextQuestion();
    interviewManager.messages.push({ role: 'ai', content: nextQuestion });
    interviewManager.renderChatUI(contentDiv, (nextAnswer) => handleChatAnswer(nextQuestion, nextAnswer));
  }

  // Mode switching
  container.querySelectorAll('.interview-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.interview-mode-btn').forEach(b => {
        b.classList.remove('bg-white', 'text-indigo-600', 'shadow-sm');
        b.classList.add('text-slate-500');
      });
      btn.classList.add('bg-white', 'text-indigo-600', 'shadow-sm');
      btn.classList.remove('text-slate-500');

      const mode = btn.dataset.mode;
      if (mode === 'chat') {
        // Render existing messages; if interview in progress, re-attach handler to last AI question
        const lastAiMsg = interviewManager.messages.filter(m => m.role === 'ai').pop();
        if (lastAiMsg) {
          interviewManager.renderChatUI(contentDiv, (answer) => handleChatAnswer(lastAiMsg.content, answer));
        } else {
          interviewManager.renderChatUI(contentDiv, () => {});
        }
      } else {
        interviewManager.renderQuestionnaireUI(contentDiv, () => {
          updateFillRate();
          showToast('问卷回答已保存', 'success');
        });
      }
    });
  });

  container.querySelector('#start-interview').addEventListener('click', async () => {
    if (!currentProject) return;
    const cleanPages = currentProject.artifacts.deck_clean_pages || '';
    const brief = currentProject.artifacts.deck_brief || '';

    showToast('正在分析 Claims 和 Gaps...', 'info');
    const { claims, gaps } = interviewManager.extractClaimsAndGaps(cleanPages, brief);
    artifactStore.setInterviewData({ claims, gaps });

    if (gaps.length === 0) {
      showToast('未发现知识缺口', 'success');
      return;
    }

    showToast(`发现 ${gaps.length} 个知识缺口，开始访谈...`, 'info');

    // Activate chat mode UI without triggering the mode switcher callback chain
    container.querySelectorAll('.interview-mode-btn').forEach(b => {
      b.classList.remove('bg-white', 'text-indigo-600', 'shadow-sm');
      b.classList.add('text-slate-500');
    });
    const chatBtn = container.querySelector('[data-mode="chat"]');
    chatBtn.classList.add('bg-white', 'text-indigo-600', 'shadow-sm');
    chatBtn.classList.remove('text-slate-500');

    // Generate first question and render chat with recursive handler
    const question = await interviewManager.generateNextQuestion();
    interviewManager.messages.push({ role: 'ai', content: question });
    interviewManager.renderChatUI(contentDiv, (answer) => handleChatAnswer(question, answer));
  });

  container.querySelector('#finalize-interview').addEventListener('click', () => {
    const expertContext = interviewManager.finalize();
    artifactStore.setArtifact('deck_expert_context', expertContext);
    artifactStore.setInterviewData({ sessionState: 'finalized' });
    showToast('Expert Context 已生成', 'success');
    updatePreview();
  });
}

function buildRedactionUI() {
  return `
    <div class="space-y-6">
      <h3 class="text-lg font-semibold text-slate-800">Redaction Review</h3>
      <p class="text-sm text-slate-500">审查所有敏感信息，选择处理方式。</p>
      <div id="redaction-list" class="space-y-2"></div>
      <button id="confirm-redaction" class="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-all">
        确认并生成 deck_expert_context.md
      </button>
    </div>
  `;
}

function initRedactionUI(container) {
  const currentScenario = currentProject?.interview?.scenario || currentProject?.briefScenario || 'business_proposal';
  if (!interviewManager) interviewManager = new InterviewManager(currentScenario);
  const listDiv = container.querySelector('#redaction-list');

  interviewManager.renderRedactionUI(listDiv, () => {
    const pending = interviewManager.redactionItems.filter(r => r.status === 'pending').length;
    artifactStore.setInterviewData({ redactionPending: pending });
  });

  container.querySelector('#confirm-redaction').addEventListener('click', () => {
    const expertContext = interviewManager.finalize();
    artifactStore.setArtifact('deck_expert_context', expertContext);
    artifactStore.setInterviewData({ sessionState: 'finalized', redactionPending: 0 });
    showToast('脱敏完成，Expert Context 已生成', 'success');
    updatePreview();
  });
}

// ===== Build UI =====
function buildBuildUI() {
  return `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-slate-800">构建 Deck</h3>
        <div class="flex gap-2">
          <button id="build-html-btn" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-all flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/></svg>
            构建 HTML 预览
          </button>
          <button id="build-pptx-btn" class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-all flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10l2-9H5l2 9zm0 0L5 9h14l-2 12m-5-6v6m0 0H9m3 0h3"/></svg>
            导出 PPTX
          </button>
        </div>
      </div>
      <div id="build-pages-list" class="space-y-3">
        <div class="p-4 bg-slate-50 rounded-lg text-center text-slate-400 text-sm">
          暂无页面，请先在「Clean Pages」步骤定义内容
        </div>
      </div>
    </div>
  `;
}

function initBuildUI(container) {
  container.querySelector('#build-html-btn').addEventListener('click', () => {
    showToast('HTML 预览已更新到右侧面板', 'success');
    // Switch to slides tab
    document.querySelector('[data-tab="slides"]').click();
    updatePreview();
  });

  container.querySelector('#build-pptx-btn').addEventListener('click', async () => {
    const btn = container.querySelector('#build-pptx-btn');
    const stopLoading = showLoading(btn, '导出中...');
    try {
      const result = await pptxBuilder.buildPPTX(currentProject);
      if (result.success) {
        showToast(`PPTX 导出成功 (${result.method})`, 'success');
      } else {
        showToast('导出失败: ' + result.error, 'error');
      }
    } catch (err) {
      showToast('导出出错: ' + err.message, 'error');
    } finally {
      stopLoading();
    }
  });
}

// ===== QA UI =====
function buildQAUI() {
  return `
    <div class="space-y-6">
      <h3 class="text-lg font-semibold text-slate-800">QA + 评审</h3>
      <div class="grid grid-cols-3 gap-3">
        <div class="p-4 bg-white border border-slate-200 rounded-xl text-center">
          <div class="text-2xl font-bold text-slate-800" id="qa-overall-score">—</div>
          <div class="text-xs text-slate-500 mt-1">商业评分</div>
        </div>
        <div class="p-4 bg-white border border-slate-200 rounded-xl text-center">
          <div class="text-2xl font-bold text-slate-800" id="qa-findings-count">${qaEngine.findings.length}</div>
          <div class="text-xs text-slate-500 mt-1">发现问题</div>
        </div>
        <div class="p-4 bg-white border border-slate-200 rounded-xl text-center">
          <div class="text-2xl font-bold text-slate-800" id="qa-rework-count">${qaEngine.rollbackPlan?.stage_actions?.length || 0}</div>
          <div class="text-xs text-slate-500 mt-1">需返工</div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <h4 class="text-sm font-semibold text-slate-700 mb-3">添加 Finding</h4>
          <div id="finding-form"></div>
        </div>
        <div>
          <h4 class="text-sm font-semibold text-slate-700 mb-3">商业评分</h4>
          <div id="scorecard-panel"></div>
        </div>
      </div>

      <div>
        <h4 class="text-sm font-semibold text-slate-700 mb-3">Findings 列表</h4>
        <div id="findings-list"></div>
      </div>

      <div>
        <h4 class="text-sm font-semibold text-slate-700 mb-3">Rollback Plan</h4>
        <div id="rollback-panel"></div>
      </div>

      <div class="flex gap-2">
        <button id="run-qa-btn" class="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-all">
          运行 AI 评审
        </button>
        <button id="generate-rollback-btn" class="flex-1 px-4 py-2.5 bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 text-sm font-medium rounded-lg transition-all">
          生成 Rollback Plan
        </button>
      </div>
    </div>
  `;
}

function initQAUI(container) {
  const formDiv = container.querySelector('#finding-form');
  const scorecardDiv = container.querySelector('#scorecard-panel');
  const findingsDiv = container.querySelector('#findings-list');
  const rollbackDiv = container.querySelector('#rollback-panel');

  qaEngine.renderFindingsForm(formDiv, () => {
    qaEngine.renderFindingsList(findingsDiv);
    updateQASummary();
  });

  qaEngine.renderScorecard(scorecardDiv, () => {
    updateQASummary();
  });

  qaEngine.renderFindingsList(findingsDiv, () => {
    updateQASummary();
  });

  container.querySelector('#run-qa-btn').addEventListener('click', async () => {
    const btn = container.querySelector('#run-qa-btn');
    const stopLoading = showLoading(btn, '评审中...');
    try {
      await qaEngine.runAIReview(currentProject);
      qaEngine.renderFindingsList(findingsDiv);
      updateQASummary();
      showToast('AI 评审完成', 'success');
    } catch (err) {
      showToast('评审失败: ' + err.message, 'error');
    } finally {
      stopLoading();
    }
  });

  container.querySelector('#generate-rollback-btn').addEventListener('click', () => {
    qaEngine.generateRollbackPlan();
    qaEngine.renderRollbackPlan(rollbackDiv);
    updateQASummary();
    showToast('Rollback Plan 已生成', 'success');
  });
}

function updateQASummary() {
  const overallEl = document.getElementById('qa-overall-score');
  const findingsEl = document.getElementById('qa-findings-count');
  const reworkEl = document.getElementById('qa-rework-count');

  if (overallEl) overallEl.textContent = qaEngine.scorecard.overall_score?.toFixed(1) || '—';
  if (findingsEl) findingsEl.textContent = qaEngine.findings.length;
  if (reworkEl) reworkEl.textContent = qaEngine.rollbackPlan?.stage_actions?.length || 0;
}

// ===== Preview Panel =====
function updatePreview() {
  const activeTab = document.querySelector('.preview-tab.active') ||
                   document.querySelector('.preview-tab[data-tab="markdown"]');
  if (!activeTab) return;

  const tabName = activeTab.dataset.tab;

  if (tabName === 'markdown') {
    const previewMarkdown = document.getElementById('preview-markdown');
    const step = workflowEngine.getCurrentStep();
    if (!step || !currentProject) {
      previewMarkdown.innerHTML = '<div class="text-center py-12 text-slate-400 text-sm">暂无产物预览</div>';
      return;
    }

    const artifactKey = step.outputs?.[0];
    if (artifactKey) {
      const value = currentProject.artifacts[artifactKey];
      if (typeof value === 'string' && value.length > 0) {
        previewMarkdown.innerHTML = marked.parse(value);
      } else if (typeof value === 'object') {
        previewMarkdown.innerHTML = `<pre class="text-xs bg-slate-100 p-3 rounded-lg overflow-auto">${JSON.stringify(value, null, 2)}</pre>`;
      } else {
        previewMarkdown.innerHTML = '<div class="text-center py-12 text-slate-400 text-sm">暂无产物预览</div>';
      }
    }
  } else if (tabName === 'slides') {
    const previewSlides = document.getElementById('preview-slides');
    if (currentProject) {
      slidePreview.updatePreview(previewSlides, currentProject.artifacts);
    }
  } else if (tabName === 'json') {
    const previewJson = document.getElementById('preview-json');
    if (currentProject) {
      const step = workflowEngine.getCurrentStep();
      const artifactKey = step?.outputs?.[0];
      if (artifactKey) {
        const value = currentProject.artifacts[artifactKey];
        previewJson.innerHTML = `<pre class="text-xs bg-slate-100 p-3 rounded-lg overflow-auto">${JSON.stringify(value, null, 2)}</pre>`;
      }
    }
  }
}

function initPreviewTabs() {
  els.previewTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      els.previewTabs.forEach(t => {
        t.classList.remove('text-indigo-600', 'border-b-2', 'border-indigo-500', 'bg-white', 'active');
        t.classList.add('text-slate-500');
      });
      tab.classList.add('text-indigo-600', 'border-b-2', 'border-indigo-500', 'bg-white', 'active');
      tab.classList.remove('text-slate-500');

      ['markdown', 'slides', 'json', 'images'].forEach(id => {
        document.getElementById(`preview-${id}`).classList.add('hidden');
      });
      document.getElementById(`preview-${tab.dataset.tab}`).classList.remove('hidden');

      updatePreview();
    });
  });
}

// ===== Cost Display =====
function updateCostDisplay() {
  const cost = artifactStore.getTotalCost();
  els.costDisplay.textContent = `$${cost.toFixed(2)}`;
}

// ===== Export Modal =====
function initExportModal() {
  els.exportBtn.addEventListener('click', () => {
    els.exportModal.classList.remove('hidden');
    setTimeout(() => els.exportPanel.classList.add('scale-100', 'opacity-100'), 10);
  });

  function closeModal() {
    els.exportPanel.classList.remove('scale-100', 'opacity-100');
    setTimeout(() => els.exportModal.classList.add('hidden'), 200);
  }

  els.exportClose.addEventListener('click', closeModal);
  els.exportOverlay.addEventListener('click', closeModal);

  document.querySelectorAll('.export-option').forEach((btn, index) => {
    btn.addEventListener('click', () => {
      if (index === 2) { // JSON backup
        const data = artifactStore.exportProject();
        if (data) {
          const blob = new Blob([data], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${currentProject?.name || 'project'}.json`;
          a.click();
          URL.revokeObjectURL(url);
          showToast('项目备份已下载', 'success');
        }
      } else if (index === 0) { // PPTX
        closeModal();
        pptxBuilder.buildPPTX(currentProject).then(result => {
          if (result.success) {
            showToast(`PPTX 导出成功 (${result.method})`, 'success');
          } else {
            showToast('PPTX 导出失败: ' + result.error, 'error');
          }
        });
      } else if (index === 1) { // HTML
        closeModal();
        htmlBuilder.buildHTML(currentProject).then(result => {
          if (result.success) {
            showToast(`HTML 导出成功 (${result.slideCount} 页)`, 'success');
          } else {
            showToast('HTML 导出失败: ' + result.error, 'error');
          }
        });
      } else if (index === 3) { // Montage
        closeModal();
        pptxBuilder.buildMontage(currentProject).then(result => {
          if (result.success) {
            showToast(`缩略图拼图导出成功 (${result.slideCount} 页)`, 'success');
          } else {
            showToast('拼图导出失败: ' + result.error, 'error');
          }
        });
      } else {
        showToast('导出功能开发中', 'info');
      }
      closeModal();
    });
  });
}

// ===== Navigation =====
function initNavigation() {
  els.prevBtn.addEventListener('click', () => {
    const prev = workflowEngine.goBack(currentMode);
    if (prev) {
      artifactStore.setStep(prev.id);
      renderStepContent();
      renderStepper();
    }
  });

  els.nextBtn.addEventListener('click', () => {
    if (!currentProject) {
      showToast('请先创建或加载一个项目', 'warning');
      return;
    }
    const errors = workflowEngine.getGateErrors(currentProject);
    if (errors.length > 0) {
      showToast('请先完成当前步骤: ' + errors[0], 'warning');
      return;
    }
    const next = workflowEngine.advance(currentMode);
    if (next) {
      artifactStore.setStep(next.id);
      renderStepContent();
      renderStepper();
    }
  });
}

// ===== Event Listeners for Artifact Editing =====
function initArtifactEditing() {
  els.stepContent.addEventListener('input', (e) => {
    if (e.target.classList.contains('artifact-editor')) {
      const key = e.target.dataset.artifact;
      if (key) {
        artifactStore.setArtifact(key, e.target.value);
        updatePreview();
      }
    }
  });

  // Generate buttons
  els.stepContent.addEventListener('click', (e) => {
    const btn = e.target.closest('.generate-btn');
    if (!btn) return;

    const artifactKey = btn.dataset.artifact;
    if (!artifactKey) return;

    // Handle generation based on current step
    const step = workflowEngine.getCurrentStep();
    if (!step) return;

    e.preventDefault();
    e.stopPropagation();

    // Generation is handled in each step's init function
  });
}

// ===== Resize Handle =====
function initResizeHandle() {
  const handle = document.getElementById('resize-handle');
  const sidebar = document.getElementById('right-sidebar');
  if (!handle || !sidebar) return;

  let isResizing = false;
  let startX = 0;
  let startWidth = 0;

  handle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = sidebar.offsetWidth;
    handle.classList.add('resizing');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const delta = startX - e.clientX;
    const newWidth = Math.max(280, startWidth + delta);
    sidebar.style.width = newWidth + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      handle.classList.remove('resizing');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });
}

// ===== Workflow Engine Events =====
workflowEngine.on('step:changed', (step) => {
  renderStepContent();
  renderStepper();
  updatePreview();
});

// ===== Artifact Store Events =====
artifactStore.on('artifact:changed', () => {
  updatePreview();
});

artifactStore.on('call:added', () => {
  updateCostDisplay();
});

// ===== Provider Events =====
providerManager.on('connection:online', () => {
  els.providerStatusDot.className = 'w-2 h-2 rounded-full bg-emerald-400';
});

providerManager.on('connection:offline', () => {
  els.providerStatusDot.className = 'w-2 h-2 rounded-full bg-rose-400';
});

// ===== Initialization =====
async function init() {
  await artifactStore.init();
  await loadProjectList();

  initProviderDrawer();
  initModeToggle();
  initPreviewTabs();
  initExportModal();
  initNavigation();
  initArtifactEditing();
  initResizeHandle();

  els.projectSelect.addEventListener('change', (e) => {
    if (e.target.value) {
      loadProject(e.target.value);
    } else {
      createNewProject();
    }
  });

  const projects = await artifactStore.listProjects();
  if (projects.length > 0) {
    await loadProject(projects[0].id);
  } else {
    renderStepper();
    renderStepContent();
  }

  showToast('PPT Deck Pro Max 已就绪', 'success');
}

init().catch(err => {
  console.error('Init failed:', err);
  showToast('初始化失败: ' + err.message, 'error');
});
