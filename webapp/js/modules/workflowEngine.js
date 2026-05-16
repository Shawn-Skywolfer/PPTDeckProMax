/**
 * Workflow Engine — Step 0-8 state machine, expert/quick branching, gate validation
 */

const STEPS = [
  {
    id: 0,
    key: 'init',
    title: '初始化项目',
    shortTitle: '初始化',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    description: '创建项目，选择模式和预设',
    artifacts: [],
    outputs: [],
    gates: []
  },
  {
    id: 1,
    key: 'brief',
    title: '锁定 Brief',
    shortTitle: 'Brief',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    description: '定义产品主语、定位、受众、CTA',
    artifacts: ['deck_brief'],
    outputs: ['deck_brief'],
    gates: [
      { check: (p) => p.artifacts.deck_brief.length > 100, message: 'Brief 内容过短' }
    ]
  },
  {
    id: 1.5,
    key: 'expert_interview',
    title: 'Expert Interview',
    shortTitle: '专家访谈',
    icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
    description: '结构化专家对话，填补知识缺口',
    artifacts: ['deck_brief'],
    outputs: ['interview_session', 'deck_expert_context'],
    gates: [
      { check: (p) => p.interview.fillRate >= 80, message: 'Gap fill rate 未达 80%' },
      { check: (p) => p.interview.redactionPending === 0, message: '仍有待脱敏项' }
    ],
    expertOnly: true
  },
  {
    id: 1.6,
    key: 'redaction',
    title: 'Redaction Review',
    shortTitle: '脱敏审批',
    icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
    description: '审查敏感信息，确认脱敏决策',
    artifacts: ['interview_session'],
    outputs: ['deck_expert_context'],
    gates: [
      { check: (p) => p.interview.redactionPending === 0, message: '仍有待脱敏项' }
    ],
    expertOnly: true
  },
  {
    id: 2,
    key: 'vibe',
    title: '锁定 Vibe',
    shortTitle: 'Vibe',
    icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
    description: '视觉 mood、配色、字体、图形语言',
    artifacts: ['deck_brief'],
    outputs: ['deck_vibe_brief'],
    gates: [
      { check: (p) => p.artifacts.deck_vibe_brief.length > 50, message: 'Vibe brief 未填写' }
    ]
  },
  {
    id: 3,
    key: 'narrative',
    title: '叙事弧线 + Hero Pages',
    shortTitle: '叙事',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    description: 'Beat 序列、情感曲线、Hero 页面选择',
    artifacts: ['deck_brief', 'deck_vibe_brief'],
    outputs: ['deck_narrative_arc', 'deck_hero_pages'],
    gates: [
      { check: (p) => p.artifacts.deck_narrative_arc.length > 100, message: '叙事弧线未生成' }
    ]
  },
  {
    id: 4,
    key: 'layout',
    title: 'Layout 草稿',
    shortTitle: 'Layout',
    icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z',
    description: '逐页标题、结论、区域结构、视觉建议',
    artifacts: ['deck_narrative_arc', 'deck_hero_pages'],
    outputs: ['deck_layout_v1'],
    gates: []
  },
  {
    id: 5,
    key: 'compression',
    title: '内容压缩 + 视觉构图',
    shortTitle: '压缩/构图',
    icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
    description: '逐页精简文案 + 视觉主角定义',
    artifacts: ['deck_layout_v1'],
    outputs: ['deck_clean_pages', 'deck_visual_composition'],
    gates: [
      { check: (p) => p.artifacts.deck_clean_pages.length > 200, message: 'Clean pages 未生成' }
    ]
  },
  {
    id: 5.5,
    key: 'assets',
    title: 'Asset 计划',
    shortTitle: 'Assets',
    icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
    description: '截图需求梳理、占位图、素材清单',
    artifacts: ['deck_visual_composition'],
    outputs: ['deck_asset_plan', 'asset_manifest'],
    gates: []
  },
  {
    id: 6,
    key: 'visual_system',
    title: '锁定视觉系统',
    shortTitle: '视觉系统',
    icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
    description: '组件族、Token、图表规则、几何规则',
    artifacts: ['deck_vibe_brief', 'deck_clean_pages'],
    outputs: ['deck_visual_system', 'deck_component_tokens', 'deck_theme_tokens', 'deck_geometry_rules', 'deck_page_skeletons'],
    gates: [
      { check: (p) => p.artifacts.deck_visual_system.length > 100, message: '视觉系统未生成' }
    ]
  },
  {
    id: 7,
    key: 'build',
    title: '构建 Deck',
    shortTitle: 'Build',
    icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
    description: '逐页 HTML/SVG 构建，状态更新',
    artifacts: ['deck_clean_pages', 'deck_visual_composition', 'deck_visual_system', 'deck_theme_tokens'],
    outputs: ['slide_state', 'layout_manifest'],
    gates: []
  },
  {
    id: 8,
    key: 'qa',
    title: 'QA + 评审',
    shortTitle: 'QA',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    description: '评审报告、商业评分、Rollback 计划',
    artifacts: ['slide_state'],
    outputs: ['deck_review_report', 'deck_review_findings', 'commercial_scorecard', 'review_rollback_plan'],
    gates: []
  }
];

class WorkflowEngine {
  constructor() {
    this.steps = STEPS;
    this.currentStep = 0;
    this.listeners = [];
  }

  on(event, handler) {
    this.listeners.push({ event, handler });
  }

  emit(event, data) {
    this.listeners.filter(l => l.event === event).forEach(l => l.handler(data));
  }

  getSteps(mode = 'expert') {
    if (mode === 'quick') {
      return this.steps.filter(s => !s.expertOnly);
    }
    return this.steps;
  }

  getStep(id) {
    return this.steps.find(s => s.id === id);
  }

  getCurrentStep() {
    return this.getStep(this.currentStep);
  }

  setStep(id) {
    const step = this.getStep(id);
    if (!step) return false;
    this.currentStep = id;
    this.emit('step:changed', step);
    return true;
  }

  canAdvance(project) {
    if (!project) return false;
    const step = this.getCurrentStep();
    if (!step || !step.gates || step.gates.length === 0) return true;
    return step.gates.every(g => g.check(project));
  }

  getGateErrors(project) {
    if (!project) return ['请先创建项目'];
    const step = this.getCurrentStep();
    if (!step || !step.gates) return [];
    return step.gates.filter(g => !g.check(project)).map(g => g.message);
  }

  getNextStep(mode = 'expert') {
    const steps = this.getSteps(mode);
    const currentIndex = steps.findIndex(s => s.id === this.currentStep);
    if (currentIndex === -1 || currentIndex >= steps.length - 1) return null;
    return steps[currentIndex + 1];
  }

  getPrevStep(mode = 'expert') {
    const steps = this.getSteps(mode);
    const currentIndex = steps.findIndex(s => s.id === this.currentStep);
    if (currentIndex <= 0) return null;
    return steps[currentIndex - 1];
  }

  advance(mode = 'expert') {
    const next = this.getNextStep(mode);
    if (next) {
      this.setStep(next.id);
      return next;
    }
    return null;
  }

  goBack(mode = 'expert') {
    const prev = this.getPrevStep(mode);
    if (prev) {
      this.setStep(prev.id);
      return prev;
    }
    return null;
  }

  getStepStatus(stepId, project) {
    if (!project) return 'pending';
    const step = this.getStep(stepId);
    if (!step) return 'pending';

    if (stepId === this.currentStep) return 'active';

    // Check if step outputs exist
    const hasOutputs = step.outputs && step.outputs.every(key => {
      const val = project.artifacts[key];
      if (typeof val === 'string') return val.length > 0;
      if (Array.isArray(val)) return val.length > 0;
      if (typeof val === 'object' && val !== null) return Object.keys(val).length > 0;
      return false;
    });

    if (hasOutputs) return 'completed';
    return 'pending';
  }

  renderStepper(container, project, mode = 'expert') {
    const steps = this.getSteps(mode);
    container.innerHTML = '';

    steps.forEach((step, index) => {
      const status = this.getStepStatus(step.id, project);
      const isClickable = status === 'completed' || status === 'active';

      const el = document.createElement('div');
      el.className = `step-item px-3 py-2 rounded-lg cursor-pointer ${isClickable ? 'hover:bg-slate-800' : 'opacity-60 cursor-not-allowed'}`;
      el.dataset.stepId = step.id;

      let badgeClass = 'pending';
      let badgeContent = `<span class="text-xs">${index + 1}</span>`;
      if (status === 'active') {
        badgeClass = 'active';
      } else if (status === 'completed') {
        badgeClass = 'completed';
        badgeContent = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>`;
      }

      el.innerHTML = `
        <div class="flex items-start gap-3">
          <div class="step-badge ${badgeClass} mt-0.5">${badgeContent}</div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium ${status === 'active' ? 'text-white' : 'text-slate-300'} truncate">${step.shortTitle}</div>
            <div class="text-xs text-slate-500 truncate">${step.description}</div>
          </div>
          ${status === 'completed' ? '<svg class="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>' : ''}
        </div>
      `;

      if (isClickable) {
        el.addEventListener('click', () => {
          this.setStep(step.id);
        });
      }

      container.appendChild(el);
    });
  }
}

export const workflowEngine = new WorkflowEngine();
export { STEPS };
