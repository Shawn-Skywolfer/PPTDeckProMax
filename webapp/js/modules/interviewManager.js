/**
 * Interview Manager — Expert Interview 多场景（商业策划 / 内部规划 / 总结汇报）
 */

import { aiCaller } from './aiCaller.js';
import { promptEngine } from './promptEngine.js';
import { artifactStore } from './artifactStore.js';

// ===== 场景化 GAP 配置 =====
const SCENARIO_CONFIG = {
  business_proposal: {
    label: '商业策划报告',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    description: '面向投资人、合作伙伴、客户，核心目标是获取资源/资金/合作',
    gaps: {
      market: {
        label: '市场缺口',
        icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        color: 'blue',
        patterns: /(市场|规模|趋势|需求|用户画像|目标客户|细分市场|赛道|行业)/,
        prompt: '这个市场/行业的规模、趋势、目标客群是否讲得清楚？有没有数据支撑？'
      },
      model: {
        label: '商业模式缺口',
        icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        color: 'emerald',
        patterns: /(模式|盈利|变现|收费|订阅|分成|收入|营收|赚钱|变现|商业化)/,
        prompt: '商业模式是否清晰？收入来源、成本结构、盈利路径有没有讲明白？'
      },
      financial: {
        label: '财务缺口',
        icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        color: 'amber',
        patterns: /(\d+万|\d+亿|元|美元|收入|成本|利润|ROI|投资回报|现金流|预算|融资|估值|营收)/,
        prompt: '财务预测、收入模型、成本结构、资金需求是否有具体数字支撑？'
      },
      team: {
        label: '团队缺口',
        icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
        color: 'indigo',
        patterns: /(团队|创始人|背景|经验|履历|顾问|合伙人|核心成员|组织架构)/,
        prompt: '核心团队的背景、经验、分工是否清楚？有没有关键人才缺口？'
      },
      competitive: {
        label: '竞争缺口',
        icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
        color: 'purple',
        patterns: /(竞品|竞争|对手|差异化|护城河|优势|劣势|SWOT|壁垒|替代方案)/,
        prompt: '竞争格局分析是否完整？与替代方案的差异化、护城河在哪里？'
      },
      risk: {
        label: '风险缺口',
        icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
        color: 'rose',
        patterns: /(风险|挑战|不确定性|政策|监管|应对|预案|危机|合规|法律)/,
        prompt: '潜在风险和挑战是否被识别？有没有应对预案和风控措施？'
      },
      milestone: {
        label: '里程碑缺口',
        icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
        color: 'cyan',
        patterns: /(里程碑|节点|时间表|阶段|Q1|Q2|Q3|Q4|20\d{2}|roadmap|路线图|计划)/,
        prompt: '关键里程碑、时间节点、阶段目标是否明确？有没有清晰的时间表？'
      }
    }
  },

  internal_planning: {
    label: '内部规划汇报',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
    description: '面向内部管理层、团队，核心目标是对齐目标、分配资源、明确路径',
    gaps: {
      goal: {
        label: '目标缺口',
        icon: 'M13 10V3L4 14h7v7l9-11h-7z',
        color: 'blue',
        patterns: /(目标|目的|OKR|KPI|指标|达成|完成率|定量化|SMART)/,
        prompt: '目标是否具体、可衡量、可达成？有没有明确的量化指标？'
      },
      strategy: {
        label: '策略缺口',
        icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 7m0 13V7',
        color: 'indigo',
        patterns: /(策略|路径|方法|举措|行动|计划|方案|打法|战术|关键动作)/,
        prompt: '实现目标的路径、策略、关键举措是否清晰？有没有备选方案？'
      },
      resource: {
        label: '资源缺口',
        icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
        color: 'emerald',
        patterns: /(资源|预算|人力|人员|编制|资金|工具|系统|设备|支持)/,
        prompt: '所需资源（人力、预算、工具）是否明确？有没有资源缺口？'
      },
      responsibility: {
        label: '责任缺口',
        icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
        color: 'amber',
        patterns: /(负责|责任人|owner|分工|协作|部门|角色|牵头|配合)/,
        prompt: '负责人、分工、协作关系是否清晰？有没有责任模糊的地带？'
      },
      milestone: {
        label: '里程碑缺口',
        icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
        color: 'cyan',
        patterns: /(里程碑|节点|检查点|阶段|时间点|截止|deadline|周期|季度)/,
        prompt: '关键里程碑、检查点、时间表是否明确？各阶段的交付物是什么？'
      },
      risk: {
        label: '风险缺口',
        icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
        color: 'rose',
        patterns: /(风险|阻碍|瓶颈|问题|挑战|应对|预案|备案|依赖|阻塞)/,
        prompt: '潜在风险、阻碍因素、依赖关系是否识别？有没有应对预案？'
      },
      metric: {
        label: '度量缺口',
        icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
        color: 'violet',
        patterns: /(指标|度量|衡量|数据|统计|考核|评估|监控|复盘|追踪)/,
        prompt: '衡量成功的指标、数据来源、监控机制是否明确？怎么知道目标达成了？'
      }
    }
  },

  summary_report: {
    label: '总结汇报报告',
    icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    description: '面向上级领导、利益相关方，核心目标是展示成果、复盘教训、申请下一步支持',
    gaps: {
      result: {
        label: '结果缺口',
        icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
        color: 'emerald',
        patterns: /(结果|成果|产出|完成|达成|实现|交付|数据|增长|提升|突破)/,
        prompt: '核心成果是否量化？有没有具体的数据、指标来证明成果？'
      },
      process: {
        label: '过程缺口',
        icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
        color: 'blue',
        patterns: /(过程|执行|推进|开展|实施|动作|措施|方法|路径|关键步骤)/,
        prompt: '关键动作、执行过程、方法论是否描述清楚？有没有亮点做法？'
      },
      gap_analysis: {
        label: '差距缺口',
        icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
        color: 'amber',
        patterns: /(差距|差异|不足|未完成|偏离|目标 vs|对比计划|未达标|滞后)/,
        prompt: '目标 vs 实际的差距分析是否到位？偏差原因有没有讲清楚？'
      },
      lesson: {
        label: '教训缺口',
        icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
        color: 'indigo',
        patterns: /(经验|教训|复盘|总结|反思|启示|最佳实践|踩坑|避坑|沉淀)/,
        prompt: '成功经验、失败教训、可复制的方法论是否提炼出来了？'
      },
      next_step: {
        label: '下一步缺口',
        icon: 'M13 10V3L4 14h7v7l9-11h-7z',
        color: 'cyan',
        patterns: /(下一步|后续|计划|展望|改进|优化|迭代|延续|深化|拓展)/,
        prompt: '后续计划、改进方向、下一步行动是否明确？需要什么支持？'
      },
      stakeholder: {
        label: '相关方缺口',
        icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
        color: 'violet',
        patterns: /(部门|团队|协同|配合|反馈|满意度|支持|参与方|干系人|影响)/,
        prompt: '涉及哪些部门/团队？各方反馈如何？协同中遇到了什么问题？'
      }
    }
  }
};

// 默认场景
const DEFAULT_SCENARIO = 'business_proposal';

class InterviewManager {
  constructor(scenario = DEFAULT_SCENARIO) {
    this.scenario = scenario;
    this.scenarioConfig = SCENARIO_CONFIG[scenario] || SCENARIO_CONFIG[DEFAULT_SCENARIO];
    this.mode = 'chat';
    this.messages = [];
    this.currentGapIndex = 0;
    this.gaps = [];
    this.claims = [];
    this.redactionItems = [];
    this.questionCount = 0;
    this.counterHypothesisCount = 0;
  }

  setScenario(scenario) {
    if (SCENARIO_CONFIG[scenario]) {
      this.scenario = scenario;
      this.scenarioConfig = SCENARIO_CONFIG[scenario];
      // Reset gaps to use new scenario definitions
      this.gaps = [];
      this.claims = [];
      this.currentGapIndex = 0;
    }
  }

  getGapDefinitions() {
    return this.scenarioConfig.gaps;
  }

  extractClaimsAndGaps(cleanPages, brief) {
    const claims = [];
    const lines = (cleanPages || '').split('\n');
    let currentClaim = null;

    lines.forEach((line, idx) => {
      const match = line.match(/^##?\s*(.+)$/);
      if (match) {
        if (currentClaim) claims.push(currentClaim);
        currentClaim = { id: `claim_${idx}`, text: match[1].trim(), line: idx, gaps: [] };
      }
    });
    if (currentClaim) claims.push(currentClaim);

    // If no claims found, create from brief
    if (claims.length === 0 && brief) {
      const briefClaims = brief.match(/##?\s+(.+)/g);
      if (briefClaims) {
        briefClaims.forEach((c, i) => {
          claims.push({ id: `claim_brief_${i}`, text: c.replace(/^#+\s*/, ''), line: i, gaps: [] });
        });
      }
    }

    // Detect gaps for each claim based on scenario
    const gapDefs = this.getGapDefinitions();
    claims.forEach(claim => {
      const text = claim.text.toLowerCase();
      Object.entries(gapDefs).forEach(([gapKey, gapDef]) => {
        if (!gapDef.patterns.test(text)) {
          claim.gaps.push(gapKey);
        }
      });
    });

    // Prioritize: hero claims (first 3) with more gaps first
    const heroClaims = claims.slice(0, 3);
    const otherClaims = claims.slice(3);

    const allGaps = [];
    heroClaims.forEach(claim => {
      claim.gaps.forEach(gap => {
        allGaps.push({ claimId: claim.id, claimText: claim.text, type: gap, filled: false });
      });
    });
    otherClaims.forEach(claim => {
      claim.gaps.forEach(gap => {
        allGaps.push({ claimId: claim.id, claimText: claim.text, type: gap, filled: false });
      });
    });

    this.claims = claims;
    this.gaps = allGaps;
    return { claims, gaps: allGaps };
  }

  getFillRate() {
    if (this.gaps.length === 0) return 0;
    const filled = this.gaps.filter(g => g.filled).length;
    return Math.round((filled / this.gaps.length) * 100);
  }

  async generateNextQuestion() {
    const sessionState = this.getFillRate() >= 80 ? 'wrapping_up' : 'in_progress';
    const claims = this.claims;
    const gaps = this.gaps.filter(g => !g.filled);

    // Counter-hypothesis every 3-4 questions
    this.questionCount++;
    const useCounterHypothesis = this.questionCount % 4 === 0;

    const prompt = promptEngine.buildInterviewerPrompt(claims, gaps, sessionState, this.scenario);

    const response = await aiCaller.streamChat({
      role: 'interviewer',
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user + (useCounterHypothesis ? '\n\n【要求】请提出一个反证假设问题（counter-hypothesis）。' : '') }
      ],
      onChunk: () => {},
      onDone: () => {},
      onError: (err) => console.error('Interview error:', err)
    });

    return response.text;
  }

  addUserAnswer(question, answer) {
    this.messages.push({ role: 'ai', content: question });
    this.messages.push({ role: 'user', content: answer });

    // Mark relevant gap as filled
    if (this.currentGapIndex < this.gaps.length) {
      this.gaps[this.currentGapIndex].filled = true;
      this.gaps[this.currentGapIndex].answer = answer;
      this.currentGapIndex++;
    }

    // Check for redaction items
    const redactionPatterns = /(公司名称|人名|具体金额|内部数据|机密)/g;
    if (redactionPatterns.test(answer)) {
      this.redactionItems.push({
        text: answer.match(/(.{0,50})/)?.[0] + '...',
        status: 'pending',
        question
      });
    }
  }

  finalize() {
    const filledGaps = this.gaps.filter(g => g.filled);
    const gapDefs = this.getGapDefinitions();
    const scenarioLabel = this.scenarioConfig.label;

    const expertContext = `# Expert Context

## 访谈元数据
- 场景类型: ${scenarioLabel}
- 生成时间: ${new Date().toISOString()}
- Gap Fill Rate: ${this.getFillRate()}%
- 已回答缺口: ${filledGaps.length}/${this.gaps.length}
- 待脱敏项: ${this.redactionItems.filter(r => r.status === 'pending').length}

## 核心 Claims
${this.claims.map(c => `- **${c.text}** (${c.gaps.length} 个缺口)`).join('\n')}

## 已填补缺口
${filledGaps.map(g => `- [${gapDefs[g.type]?.label || g.type}] ${g.claimText}: ${g.answer?.substring(0, 100)}...`).join('\n')}

## 未填补缺口
${this.gaps.filter(g => !g.filled).map(g => `- [${gapDefs[g.type]?.label || g.type}] ${g.claimText}`).join('\n')}

## Brief Feedback
（如访谈中发现 Brief 不准确之处，请在此记录）
`;
    return expertContext;
  }

  // ===== UI Methods =====

  renderChatUI(container, onSend) {
    container.innerHTML = `
      <div class="flex flex-col h-96">
        <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
          ${this.messages.map(m => this.renderMessage(m)).join('')}
        </div>
        <div class="p-3 border-t border-slate-200 bg-white">
          <div class="flex gap-2 items-end">
            <textarea id="chat-input" rows="2" class="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none" placeholder="输入你的回答...（Shift+Enter 换行）"></textarea>
            <button id="chat-send" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-all">发送</button>
          </div>
        </div>
      </div>
    `;

    const input = container.querySelector('#chat-input');
    const sendBtn = container.querySelector('#chat-send');
    const messagesDiv = container.querySelector('#chat-messages');

    function autoResize() {
      input.style.height = 'auto';
      input.style.height = Math.min(120, input.scrollHeight) + 'px';
    }

    sendBtn.addEventListener('click', () => {
      const text = input.value.trim();
      if (!text) return;
      onSend(text);
      input.value = '';
      input.style.height = 'auto';
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendBtn.click();
      }
    });

    input.addEventListener('input', autoResize);

    // Scroll to bottom
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  formatContent(text) {
    if (!text) return '';
    // Escape HTML
    let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // Convert markdown-like formatting
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/^#{2,3}\s+(.+)$/gm, '<h4 class="font-semibold text-slate-800 mt-2 mb-1">$1</h4>');
    html = html.replace(/^[-*]\s+(.+)$/gm, '<li class="ml-4 list-disc">$1</li>');
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li class="ml-4 list-decimal">$1</li>');
    html = html.replace(/\n\n/g, '</div><div class="mt-2">');
    html = html.replace(/\n/g, '<br>');
    if (!html.startsWith('<')) {
      html = '<div>' + html + '</div>';
    }
    return html;
  }

  renderMessage(msg) {
    if (msg.role === 'ai') {
      const content = this.formatContent(msg.content);
      return `
        <div class="flex gap-2">
          <div class="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
          </div>
          <div class="chat-bubble-ai px-3 py-2 text-sm max-w-[85%] leading-relaxed">${content}</div>
        </div>
      `;
    } else {
      const content = this.formatContent(msg.content);
      return `
        <div class="flex gap-2 justify-end">
          <div class="chat-bubble-user px-3 py-2 text-sm max-w-[85%] leading-relaxed">${content}</div>
          <div class="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
            <svg class="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
          </div>
        </div>
      `;
    }
  }

  renderQuestionnaireUI(container, onAnswer) {
    const gapDefs = this.getGapDefinitions();
    const gapCards = this.gaps.map((gap, idx) => {
      const gapInfo = gapDefs[gap.type];
      if (!gapInfo) return '';
      return `
        <div class="p-4 bg-white border border-slate-200 rounded-xl card-hover" data-gap-index="${idx}">
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-lg bg-${gapInfo.color}-100 flex items-center justify-center flex-shrink-0">
              <svg class="w-4 h-4 text-${gapInfo.color}-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${gapInfo.icon}"/></svg>
            </div>
            <div class="flex-1">
              <div class="text-xs font-medium text-${gapInfo.color}-600 mb-1">${gapInfo.label}</div>
              <div class="text-sm text-slate-700 mb-2">${gap.claimText}</div>
              <textarea
                class="questionnaire-answer w-full h-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-${gapInfo.color}-500/20 resize-none"
                placeholder="${gapInfo.prompt || '请补充相关信息...'}"
                data-gap-index="${idx}"
              >${gap.answer || ''}</textarea>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="space-y-3 max-h-96 overflow-y-auto p-1">
        ${gapCards}
      </div>
      <button id="save-questionnaire" class="w-full mt-4 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-all">
        保存所有回答
      </button>
    `;

    container.querySelector('#save-questionnaire').addEventListener('click', () => {
      const answers = container.querySelectorAll('.questionnaire-answer');
      answers.forEach(textarea => {
        const idx = parseInt(textarea.dataset.gapIndex);
        const text = textarea.value.trim();
        if (text) {
          this.gaps[idx].answer = text;
          this.gaps[idx].filled = true;
        }
      });
      onAnswer();
    });
  }

  renderRedactionUI(container, onConfirm) {
    if (this.redactionItems.length === 0) {
      container.innerHTML = `
        <div class="p-4 bg-emerald-50 rounded-lg text-center text-emerald-700 text-sm">
          <svg class="w-5 h-5 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          暂无需要脱敏的项目
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="space-y-2">
        ${this.redactionItems.map((item, idx) => `
          <div class="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
            <div class="flex-1 min-w-0">
              <div class="text-xs text-slate-500 mb-1">${item.question.substring(0, 50)}...</div>
              <div class="text-sm text-slate-700 truncate">${item.text}</div>
            </div>
            <div class="flex gap-1 ml-2">
              <button class="redaction-btn px-2 py-1 text-xs bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition-colors" data-idx="${idx}" data-action="clear">保留</button>
              <button class="redaction-btn px-2 py-1 text-xs bg-amber-50 text-amber-600 rounded hover:bg-amber-100 transition-colors" data-idx="${idx}" data-action="redact">脱敏</button>
              <button class="redaction-btn px-2 py-1 text-xs bg-rose-50 text-rose-600 rounded hover:bg-rose-100 transition-colors" data-idx="${idx}" data-action="remove">删除</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    container.querySelectorAll('.redaction-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        const action = btn.dataset.action;
        this.redactionItems[idx].status = action;
        btn.parentElement.parentElement.classList.add('opacity-50');
        onConfirm();
      });
    });
  }
}

export { InterviewManager, SCENARIO_CONFIG };
