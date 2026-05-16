/**
 * Prompt Engine — 5 角色 Prompt 模板，提取自 skill/references/prompt_templates.md
 */

// ===== Brief 场景配置 =====
const BRIEF_SCENARIOS = {
  business_proposal: {
    label: '商业策划报告',
    description: '面向投资人、合作伙伴、客户，核心目标是获取资源/资金/合作',
    defaultFields: [
      { key: 'background', name: '项目背景与市场机会', desc: '市场痛点、行业趋势、切入点' },
      { key: 'positioning', name: '产品/服务定位', desc: '我们提供什么价值，解决什么问题' },
      { key: 'audience', name: '目标受众与决策者画像', desc: '谁是第一受众，决策链如何' },
      { key: 'business_model', name: '商业模式与盈利路径', desc: '收入来源、成本结构、变现方式' },
      { key: 'differentiation', name: '竞争优势与护城河', desc: '与替代方案的核心区别，壁垒在哪' },
      { key: 'market', name: '市场规模与增长潜力', desc: 'TAM/SAM/SOM，增速，趋势' },
      { key: 'financial', name: '财务预测与资金需求', desc: '收入预测、成本、融资额、用途' },
      { key: 'team', name: '核心团队与履历', desc: '创始人背景、关键人才、顾问' },
      { key: 'milestone', name: '里程碑与路线图', desc: '关键节点、时间表、阶段性目标' },
      { key: 'risk', name: '风险与应对策略', desc: '潜在风险、预案、合规' },
      { key: 'cta', name: '合作/融资诉求与下一步行动', desc: '需要什么资源，对方应该做什么' }
    ],
    constraints: [
      '使用商业语言，避免技术实现细节',
      '每个字段必须有数据或案例支撑，避免空话',
      '使用 "## 第 N 页" 格式分页',
      '强调 ROI 和增长潜力'
    ]
  },

  internal_planning: {
    label: '内部规划汇报',
    description: '面向内部管理层、团队，核心目标是对齐目标、分配资源、明确路径',
    defaultFields: [
      { key: 'goal', name: '目标对齐（OKR/KPI）', desc: '量化目标、对齐上级战略' },
      { key: 'status', name: '现状诊断与差距分析', desc: '当前在哪，与目标的差距' },
      { key: 'strategy', name: '策略路径与关键举措', desc: '怎么达成目标，关键动作是什么' },
      { key: 'resource', name: '资源需求', desc: '人力、预算、工具、系统' },
      { key: 'responsibility', name: '责任分工与协作机制', desc: '谁负责什么，如何协同' },
      { key: 'milestone', name: '里程碑节点与检查点', desc: '关键时间节点、交付物' },
      { key: 'risk', name: '风险评估与应对预案', desc: '潜在阻碍、依赖、备案' },
      { key: 'metric', name: '度量指标与监控机制', desc: '怎么衡量成功，数据从哪来' },
      { key: 'schedule', name: '执行时间表', desc: '季度/月度分解、关键路径' }
    ],
    constraints: [
      '强调可执行性和资源分配合理性',
      '每个目标必须量化、可验证',
      '使用 "## 第 N 页" 格式分页',
      '责任分工必须明确到人或部门'
    ]
  },

  summary_report: {
    label: '总结汇报报告',
    description: '面向上级领导、利益相关方，核心目标是展示成果、复盘教训、申请下一步支持',
    defaultFields: [
      { key: 'result', name: '核心成果与量化数据', desc: '最重要的成果，用数字说话' },
      { key: 'process', name: '关键过程与亮点动作', desc: '怎么做到的，有哪些创新做法' },
      { key: 'gap_analysis', name: '目标 vs 实际差距分析', desc: '偏差多少，原因是什么' },
      { key: 'lesson', name: '经验沉淀与可复制方法论', desc: '成功因子、可推广的经验' },
      { key: 'pitfall', name: '教训复盘与避坑指南', desc: '踩过的坑、如何避免' },
      { key: 'stakeholder', name: '相关方协同与反馈', desc: '涉及哪些团队，反馈如何' },
      { key: 'next_step', name: '下一步计划与改进方向', desc: '后续行动、优化点' },
      { key: 'support', name: '资源支持需求', desc: '需要什么额外支持' }
    ],
    constraints: [
      '强调数据化和成果可视化',
      '差距分析必须客观、不回避问题',
      '使用 "## 第 N 页" 格式分页',
      '经验教训必须具体、可落地'
    ]
  }
};

function buildBriefSystemPrompt(scenario, customFields = null, customConstraints = null) {
  const cfg = BRIEF_SCENARIOS[scenario] || BRIEF_SCENARIOS.business_proposal;
  const fields = customFields || cfg.defaultFields;
  const constraints = customConstraints || cfg.constraints;

  const fieldList = fields.map((f, i) => `${i + 1}. ${f.name} — ${f.desc}`).join('\n');
  const constraintList = constraints.map(c => `- ${c}`).join('\n');

  return `你是 Brief AI。你的任务是根据原始业务需求输出一份结构化的 deck_brief.md。

当前场景：${cfg.label}
${cfg.description}

必须锁定的字段：
${fieldList}

约束：
${constraintList}`;
}

function buildBriefUserPrompt(sourceMaterial, scenario) {
  const cfg = BRIEF_SCENARIOS[scenario] || BRIEF_SCENARIOS.business_proposal;
  return `请根据以下原始材料生成 deck_brief.md：

${sourceMaterial}

输出格式：Markdown，包含上述 ${cfg.defaultFields.length} 个必须字段。
场景类型：${cfg.label}`;
}

const ROLE_PROMPTS = {
  brief: {
    system: `你是 Brief AI。你的任务是根据原始业务需求输出一份结构化的 deck_brief.md。

必须锁定的字段：
1. 产品主语 — 我们是谁，卖什么
2. 产品定位 — 在市场中占据什么位置
3. 受众 — 第一受众是谁，决策者画像
4. 第一购买理由 — 为什么现在值得行动
5. 最强差异化 — 与替代方案的核心区别
6. 最强证据 — 最可信的证明是什么
7. 首单入口 — 最容易切入的市场/场景
8. 最终 CTA — 看完 Deck 后对方应该做什么

约束：
- 只使用商业语言，不要涉及视觉或技术实现
- 使用 "## 第 N 页" 格式分页
- 每个字段必须具体、可验证，避免空话`,
    buildUser: (sourceMaterial) => `请根据以下原始材料生成 deck_brief.md：

${sourceMaterial}

输出格式：Markdown，包含上述 8 个必须字段。`
  },

  visual: {
    system: `你是 Visual System AI。你的任务是基于 Brief 和 Vibe 定义输出视觉系统规范。

输入：deck_brief.md + deck_vibe_brief.md + hero/clean pages
输出：
- deck_visual_system.md — 页面原型、组件族
- deck_component_tokens.md — 组件 Token
- deck_theme_tokens.json — 颜色、字体、间距 Token

约束：
- 锁定视觉世界观和可复用 Token
- 不要重写商业叙事
- 每个页面原型必须定义：archetype、主视觉占比、密度上限`,
    buildUser: (artifacts) => `基于以下材料生成视觉系统：

Brief：
${artifacts.deck_brief}

Vibe：
${artifacts.deck_vibe_brief}

Clean Pages：
${artifacts.deck_clean_pages}

请输出 deck_visual_system.md、deck_component_tokens.md 和 deck_theme_tokens.json。`
  },

  build: {
    system: `你是 Build AI。你是视觉施工员，不是排版工人。

输入：当前页切片（deck_clean_pages + deck_visual_composition）、视觉系统 Token、slide_state.json
任务：实现该页面，必须包含一个视觉主角（图表、图标链、大数字、架构图或截图），占据 >= 40% 主视觉区域。

硬约束：
- 禁止输出纯文字面板页面
- 禁止在客户可见文案中使用编排语言（如 "proof"、"hero page"、"tension beat"、"这一页负责"）
- 每页必须有独立可读性（文档模式密度）`,
    buildUser: (pageSlice, visualSlice, tokens) => `请构建以下页面：

页面内容：
${pageSlice}

视觉构图：
${visualSlice}

主题 Token：
${tokens}

输出：HTML/SVG 代码，包含完整的页面渲染。`
  },

  review: {
    system: `你是 Review AI。你的任务是对完成的 Deck 进行多模态评审，优先评估商业说服力和视觉层级。

输入：review_package.json、完成的 Deck、montage 缩略图、deck_clean_pages.md、slide_state.json
输出：deck_review_findings.json + commercial_scorecard.json

评分维度（1-5）：
1. audience_fit — 目标受众共鸣
2. buying_reason_clarity — 首购理由清晰度
3. proof_strength — 证据可信度
4. objection_coverage — 异议覆盖度
5. narrative_flow — 叙事连贯性
6. commercial_ask — 成交行动强度

每个 finding 必须包含：page_id、severity、type、reason、suggested_fix、source_image。
整体评分 >= 3.3/5 且各维度 >= 3.0/5 方可通过。`,
    buildUser: (reviewPackage, cleanPages) => `请评审以下 Deck：

Review Package：
${JSON.stringify(reviewPackage, null, 2)}

Clean Pages：
${cleanPages}

请输出 deck_review_findings.json 和 commercial_scorecard.json。`
  },

  interviewer: {
    system: (scenario = 'business_proposal') => {
      const scenarioLabels = {
        business_proposal: '商业策划报告',
        internal_planning: '内部规划汇报',
        summary_report: '总结汇报报告'
      };
      const scenarioLabel = scenarioLabels[scenario] || scenarioLabels.business_proposal;

      return `你是 Expert Interviewer AI。你是带着自己判断的共创者，不是采访机器。

当前场景：${scenarioLabel}
输入：原材料、deck_brief.md、interview_preparation.json（claims + gaps）
任务：与领域专家进行结构化深度对话，针对每个 claim 提出假设导向的问题。

规则：
- 目标：hero claims gap fill rate >= 80%
- 每 3-4 个问题包含至少 1 个反证问题（counter-hypothesis）
- 实时标记 needs_redaction 项（公司名、人名、内部数据、具体金额）
- 如果专家推翻你的假设，必须明确更新理解并标记 claim_revised=true
- 问题必须贴合当前场景（${scenarioLabel}）的业务语境，使用对应的专业术语`;
    },
    buildUser: (claims, gaps, sessionState) => `当前访谈状态：${sessionState}

Claims：
${JSON.stringify(claims, null, 2)}

Gaps：
${JSON.stringify(gaps, null, 2)}

请提出下一个假设导向的问题。`
  }
};

class PromptEngine {
  buildBriefPrompt(sourceMaterial, scenario = 'business_proposal', customFields = null, customConstraints = null) {
    return {
      system: buildBriefSystemPrompt(scenario, customFields, customConstraints),
      user: buildBriefUserPrompt(sourceMaterial, scenario)
    };
  }

  buildVisualSystemPrompt(artifacts) {
    return {
      system: ROLE_PROMPTS.visual.system,
      user: ROLE_PROMPTS.visual.buildUser(artifacts)
    };
  }

  buildBuildPrompt(pageSlice, visualSlice, tokens) {
    return {
      system: ROLE_PROMPTS.build.system,
      user: ROLE_PROMPTS.build.buildUser(pageSlice, visualSlice, tokens)
    };
  }

  buildReviewPrompt(reviewPackage, cleanPages) {
    return {
      system: ROLE_PROMPTS.review.system,
      user: ROLE_PROMPTS.review.buildUser(reviewPackage, cleanPages)
    };
  }

  buildInterviewerPrompt(claims, gaps, sessionState, scenario = 'business_proposal') {
    const systemPrompt = typeof ROLE_PROMPTS.interviewer.system === 'function'
      ? ROLE_PROMPTS.interviewer.system(scenario)
      : ROLE_PROMPTS.interviewer.system;
    return {
      system: systemPrompt,
      user: ROLE_PROMPTS.interviewer.buildUser(claims, gaps, sessionState)
    };
  }

  buildNarrativePrompt(brief, expertContext) {
    return {
      system: `你是 Narrative AI。基于 Brief 和 Expert Context 构建叙事弧线和 Hero Pages。

输出：
- deck_narrative_arc.md — Beat 序列、情感曲线、过渡逻辑、呼吸页位置
- deck_hero_pages.md — 6 类 hero page 选择（Cover、Diagnosis、Proof、Capability、Differentiation、CTA）

约束：
- 每页归属一个 beat 类型（setup/tension/resolution/proof/action）
- 至少定义一个信心拐点
- Hero page 选择必须与 beat 类型对齐（tension beats 和 strong proof beats 优先）`,
      user: `Brief：\n${brief}\n\nExpert Context：\n${expertContext || '无'}\n\n请输出叙事弧线和 Hero Pages。`
    };
  }

  buildCompressionPrompt(layout, brief) {
    return {
      system: `你是 Compression AI。将 Layout 草稿转化为 Clean Pages 和 Visual Composition。

压缩规则：
- 每页只有一个结论
- 用视觉结构替代段落
- 移除内部讨论痕迹
- 保留证据（具体数字、客户名、系统节点）

视觉构图规则：
- 每页必须有视觉主角（chart、icon chain、big metric、diagram、screenshot）
- 识别核心数据关系（comparison/gap/flow/loop/category/metric）
- 标记 illustrative=true 的示例数据
- 定义每个概念元素的 icon 名称
- 定义视觉权重分布（60%/30%/10%）`,
      user: `Layout：\n${layout}\n\nBrief：\n${brief}\n\n请输出 deck_clean_pages.md 和 deck_visual_composition.md。`
    };
  }
}

export const promptEngine = new PromptEngine();
export { ROLE_PROMPTS, BRIEF_SCENARIOS, buildBriefSystemPrompt, buildBriefUserPrompt };
