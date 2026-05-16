/**
 * QA Engine — Review findings, commercial scorecard, rollback plan generation
 */

import { getRollbackPlan, FINDING_TYPES, FINDING_SEVERITIES } from '../data/rollbackMap.js';
import { aiCaller } from './aiCaller.js';
import { promptEngine } from './promptEngine.js';

class QAEngine {
  constructor() {
    this.findings = [];
    this.scorecard = {
      overall_score: null,
      dimensions: {
        audience_fit: 3,
        buying_reason_clarity: 3,
        proof_strength: 3,
        objection_coverage: 3,
        narrative_flow: 3,
        commercial_ask: 3
      }
    };
    this.rollbackPlan = null;
  }

  addFinding(finding) {
    this.findings.push({
      id: `finding_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: Date.now(),
      ...finding
    });
  }

  removeFinding(id) {
    this.findings = this.findings.filter(f => f.id !== id);
  }

  generateRollbackPlan() {
    const plan = {
      summary: {
        total_findings: this.findings.length,
        impacted_pages: [...new Set(this.findings.map(f => f.page_id).filter(Boolean))],
        by_severity: {},
        by_type: {}
      },
      page_actions: [],
      stage_actions: []
    };

    // Group by page
    const byPage = {};
    this.findings.forEach(f => {
      const page = f.page_id || '__global__';
      if (!byPage[page]) byPage[page] = [];
      byPage[page].push(f);
    });

    Object.entries(byPage).forEach(([pageId, findings]) => {
      const primaryFinding = findings[0];
      const route = getRollbackPlan(primaryFinding.type);

      plan.page_actions.push({
        page_id: pageId,
        findings: findings,
        primary_route: route,
        routes: findings.map(f => getRollbackPlan(f.type))
      });

      // Add stage action
      const existingStage = plan.stage_actions.find(s => s.rollback_stage === route.rollback_stage);
      if (!existingStage) {
        plan.stage_actions.push({
          rollback_stage: route.rollback_stage,
          rollback_owner: route.target_role,
          targets: [...new Set(findings.map(f => getRollbackPlan(f.type)).flatMap(r => r.target_files))],
          reasons: findings.map(f => f.reason)
        });
      }
    });

    // Count by severity/type
    this.findings.forEach(f => {
      plan.summary.by_severity[f.severity] = (plan.summary.by_severity[f.severity] || 0) + 1;
      plan.summary.by_type[f.type] = (plan.summary.by_type[f.type] || 0) + 1;
    });

    this.rollbackPlan = plan;
    return plan;
  }

  calculateOverallScore() {
    const dims = this.scorecard.dimensions;
    const values = Object.values(dims).filter(v => v !== null);
    if (values.length === 0) return 0;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    this.scorecard.overall_score = Math.round(avg * 10) / 10;
    return this.scorecard.overall_score;
  }

  async runAIReview(project) {
    const reviewPackage = {
      project_id: project.id,
      artifacts: {
        brief: project.artifacts.deck_brief?.substring(0, 2000),
        clean_pages: project.artifacts.deck_clean_pages?.substring(0, 3000),
        hero_pages: project.artifacts.deck_hero_pages?.substring(0, 1000)
      }
    };

    const prompt = promptEngine.buildReviewPrompt(reviewPackage, project.artifacts.deck_clean_pages);

    const response = await aiCaller.streamChat({
      role: 'review',
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user }
      ],
      onChunk: () => {},
      onDone: () => {},
      onError: (err) => console.error('Review error:', err)
    });

    // Try to parse JSON from response
    try {
      const jsonMatch = response.text.match(/```json\n?([\s\S]*?)\n?```/) ||
                       response.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        if (data.findings) {
          data.findings.forEach(f => this.addFinding(f));
        }
        if (data.scorecard) {
          this.scorecard = { ...this.scorecard, ...data.scorecard };
        }
      }
    } catch (e) {
      console.warn('Failed to parse AI review response:', e);
    }

    this.calculateOverallScore();
    return response;
  }

  renderFindingsForm(container, onAdd) {
    container.innerHTML = `
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">页面</label>
            <select id="finding-page" class="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm">
              <option value="__global__">全局</option>
              ${[...Array(20)].map((_, i) => `<option value="slide_${String(i+1).padStart(2, '0')}">Slide ${i+1}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">严重度</label>
            <select id="finding-severity" class="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm">
              ${FINDING_SEVERITIES.map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">类型</label>
          <select id="finding-type" class="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm">
            ${FINDING_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">原因</label>
          <textarea id="finding-reason" class="w-full h-16 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm resize-none" placeholder="描述发现的问题..."></textarea>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">建议修复</label>
          <textarea id="finding-fix" class="w-full h-16 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm resize-none" placeholder="建议如何修复..."></textarea>
        </div>
        <button id="add-finding-btn" class="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-all">
          添加 Finding
        </button>
      </div>
    `;

    container.querySelector('#add-finding-btn').addEventListener('click', () => {
      const finding = {
        page_id: container.querySelector('#finding-page').value,
        severity: container.querySelector('#finding-severity').value,
        type: container.querySelector('#finding-type').value,
        reason: container.querySelector('#finding-reason').value,
        suggested_fix: container.querySelector('#finding-fix').value,
        source_image: ''
      };
      if (!finding.reason) {
        alert('请填写原因');
        return;
      }
      this.addFinding(finding);
      onAdd(finding);
      container.querySelector('#finding-reason').value = '';
      container.querySelector('#finding-fix').value = '';
    });
  }

  renderScorecard(container, onChange) {
    const dims = [
      { key: 'audience_fit', label: '受众匹配', desc: '目标受众共鸣' },
      { key: 'buying_reason_clarity', label: '购买理由清晰度', desc: '首购理由是否明确' },
      { key: 'proof_strength', label: '证据强度', desc: '证据可信度' },
      { key: 'objection_coverage', label: '异议覆盖', desc: '风险缓解' },
      { key: 'narrative_flow', label: '叙事连贯性', desc: '故事逻辑' },
      { key: 'commercial_ask', label: '成交行动', desc: 'CTA 强度' }
    ];

    const overall = this.calculateOverallScore();
    const statusColor = overall >= 3.3 ? 'text-emerald-600' : overall >= 2.5 ? 'text-amber-600' : 'text-rose-600';
    const statusBg = overall >= 3.3 ? 'bg-emerald-50' : overall >= 2.5 ? 'bg-amber-50' : 'bg-rose-50';

    container.innerHTML = `
      <div class="space-y-4">
        <div class="p-4 ${statusBg} rounded-xl text-center">
          <div class="text-3xl font-bold ${statusColor}">${overall > 0 ? overall.toFixed(1) : '—'}</div>
          <div class="text-xs text-slate-500 mt-1">整体评分 (目标 ≥ 3.3)</div>
          ${overall > 0 ? `
            <div class="text-xs mt-2 ${overall >= 3.3 ? 'text-emerald-700' : 'text-rose-700'}">
              ${overall >= 3.3 ? '✓ 通过门槛' : '✗ 需要返工'}
            </div>
          ` : ''}
        </div>
        <div class="space-y-3">
          ${dims.map(d => `
            <div>
              <div class="flex items-center justify-between mb-1">
                <span class="text-sm text-slate-700">${d.label}</span>
                <span class="text-sm font-bold text-slate-800" id="score-${d.key}">${this.scorecard.dimensions[d.key]}</span>
              </div>
              <input type="range" min="1" max="5" step="0.5" value="${this.scorecard.dimensions[d.key]}"
                class="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                data-dimension="${d.key}"
              >
              <div class="text-xs text-slate-400">${d.desc}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    container.querySelectorAll('input[type="range"]').forEach(input => {
      input.addEventListener('input', (e) => {
        const dim = e.target.dataset.dimension;
        this.scorecard.dimensions[dim] = parseFloat(e.target.value);
        container.querySelector(`#score-${dim}`).textContent = e.target.value;
        this.calculateOverallScore();
        onChange?.(this.scorecard);
      });
    });
  }

  renderFindingsList(container, onDelete) {
    if (this.findings.length === 0) {
      container.innerHTML = '<div class="text-center py-8 text-slate-400 text-sm">暂无 findings</div>';
      return;
    }

    container.innerHTML = `
      <div class="space-y-2">
        ${this.findings.map(f => {
          const route = getRollbackPlan(f.type);
          const severityColors = {
            low: 'border-l-4 border-l-slate-300',
            medium: 'border-l-4 border-l-amber-400',
            high: 'border-l-4 border-l-orange-500',
            critical: 'border-l-4 border-l-rose-500'
          };
          return `
            <div class="p-3 bg-white border border-slate-200 rounded-lg ${severityColors[f.severity] || ''}">
              <div class="flex items-center justify-between mb-1">
                <div class="flex items-center gap-2">
                  <span class="text-xs px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">${f.page_id}</span>
                  <span class="text-xs font-medium text-slate-500">${f.type}</span>
                  <span class="text-xs font-bold ${f.severity === 'critical' ? 'text-rose-600' : f.severity === 'high' ? 'text-orange-600' : 'text-slate-600'}">${f.severity}</span>
                </div>
                <button class="delete-finding text-slate-400 hover:text-rose-500 transition-colors" data-id="${f.id}">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <div class="text-sm text-slate-700 mb-1">${f.reason}</div>
              <div class="text-xs text-slate-500">→ ${route.rollback_stage} / ${route.target_role}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    container.querySelectorAll('.delete-finding').forEach(btn => {
      btn.addEventListener('click', () => {
        this.removeFinding(btn.dataset.id);
        this.renderFindingsList(container, onDelete);
      });
    });
  }

  renderRollbackPlan(container) {
    if (!this.rollbackPlan) {
      container.innerHTML = '<div class="text-center py-8 text-slate-400 text-sm">先生成 rollback plan</div>';
      return;
    }

    const plan = this.rollbackPlan;
    container.innerHTML = `
      <div class="space-y-4">
        <div class="grid grid-cols-3 gap-2 text-center">
          <div class="p-2 bg-slate-50 rounded-lg">
            <div class="text-lg font-bold text-slate-800">${plan.summary.total_findings}</div>
            <div class="text-xs text-slate-500">总问题</div>
          </div>
          <div class="p-2 bg-slate-50 rounded-lg">
            <div class="text-lg font-bold text-slate-800">${plan.summary.impacted_pages.length}</div>
            <div class="text-xs text-slate-500">影响页</div>
          </div>
          <div class="p-2 bg-slate-50 rounded-lg">
            <div class="text-lg font-bold text-slate-800">${plan.stage_actions.length}</div>
            <div class="text-xs text-slate-500">回退阶段</div>
          </div>
        </div>
        <div class="space-y-2">
          ${plan.stage_actions.map(action => `
            <div class="p-3 bg-white border border-slate-200 rounded-lg">
              <div class="flex items-center justify-between mb-1">
                <span class="text-sm font-medium text-indigo-700">${action.rollback_stage}</span>
                <span class="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">${action.rollback_owner}</span>
              </div>
              <div class="text-xs text-slate-500">${action.targets.join(', ')}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
}

export { QAEngine };
