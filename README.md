# PPT Deck Pro Max

AI 驱动的 PPT 生成工作流系统。从原始材料到可导出的 PPTX，覆盖 Brief 提炼、专家访谈、叙事构建、视觉系统、页面施工、QA 评审的完整链路。

---

## 一、项目简介

PPT Deck Pro Max 不是模板填充工具，而是一个**结构化内容生产系统**。它通过多轮 AI 协作，将零散的业务材料转化为有说服力、有视觉层级的演示文稿。

**核心设计原则：**
- 先锁定内容，再讨论视觉
- 专家访谈填补知识缺口（Gap Fill Rate ≥ 80%）
- 每个页面必须有视觉主角（图表、架构图、大数字、截图等）
- 全链路可追溯、可评审、可回滚

---

## 二、技术架构

| 层级 | 技术 |
|------|------|
| 前端 | 原生 ES Modules + Tailwind CSS + Marked.js + Chart.js |
| 后端 | Python HTTP 服务器（`start_server.py`） |
| 构建 | Python `pptx` 库生成 PPTX |
| 存储 | localStorage（项目数据 + Provider 配置） |
| AI 调用 | OpenAI-compatible API（支持 AIHubMix / DeepSeek / OpenAI / 通义千问等） |

**模块清单：**
- `app.js` — 入口、UI 渲染、事件绑定
- `workflowEngine.js` — 步骤流转与状态机
- `artifactStore.js` — 产物持久化与项目管理
- `providerManager.js` — LLM Provider 配置、连通测试、分角色绑定
- `aiCaller.js` — 统一 AI 调用与流式输出
- `promptEngine.js` — 5 角色 Prompt 模板（Brief / Visual / Build / Review / Interviewer）
- `interviewManager.js` — 专家访谈、GAP 检测、问卷/聊天双模式
- `pptxBuilder.js` — PPTX 生成
- `htmlBuilder.js` — HTML 导出
- `slidePreview.js` — 幻灯片预览渲染
- `qaEngine.js` — AI 评审与 Rollback Plan

---

## 三、本地部署（必须步骤）

### 3.1 环境要求

- Python 3.8+
- Chrome / Edge / Firefox 最新版
- 可访问外部 LLM API（需自备 API Key）

### 3.2 启动步骤

**步骤 1：进入项目目录**
```bash
cd PPT-Deck-Pro-Max/webapp
```

**步骤 2：启动本地服务器（必须）**
```bash
python start_server.py
```

输出示例：
```
Serving HTTP on :: port 8080 (http://localhost:8080/) ...
```

> ⚠️ **重要**：必须使用 `http://localhost:8080` 访问，不能直接用文件协议 `file://` 打开 `index.html`，否则 ES Modules 会因 CORS 报错，所有按钮无响应。

**步骤 3：浏览器打开**
```
http://localhost:8080
```

**步骤 4：配置 Provider（首次使用必须）**
1. 点击页面右上角 **Provider** 按钮
2. 选择预设（AIHubMix / OpenAI / DeepSeek / 通义千问 / 自定义）
3. 输入 BaseURL 和 APIKey
4. 点击 **测试连通**
5. 显示 ✓ 连通成功后，点击 **保存配置**

---

## 四、完整工作流（用户操作指南）

### Step 0：项目初始化

1. 打开首页后，点击 **"新建项目"**
2. 输入项目名称（如 `Q3 汇报`）
3. 选择模式：
   - **Expert** — 完整 11 步工作流（推荐）
   - **Quick** — 精简步骤，快速出稿
4. 项目创建成功后，左侧步骤器会高亮当前步骤

**其他操作：**
- 导入项目：点击 **"导入项目"**，选择之前导出的 `.json` 备份文件
- 切换项目：页面顶部下拉框选择已有项目

---

### Step 1：Brief 生成（内容策略选择）

**第一步：选择 Brief 提炼策略**

页面顶部有下拉框，三种业务场景可选：

| 场景 | 适用对象 | 核心目标 |
|------|----------|----------|
| **商业策划报告** | 投资人、合作伙伴、客户 | 获取资源/资金/合作 |
| **内部规划汇报** | 内部管理层、团队 | 对齐目标、分配资源、明确路径 |
| **总结汇报报告** | 上级领导、利益相关方 | 展示成果、复盘教训、申请支持 |

**第二步：粘贴源材料**

在 **"源材料"** 文本框中粘贴你的原始文档、报告或会议记录（建议 500-2000 字）。

**第三步（可选）：二次自定义提示词**

点击 **"二次自定义提示词"** 可展开面板：
- **自定义字段**：用 JSON 格式修改/增加锁定字段
  ```json
  [{"name":"核心痛点","desc":"用户最痛的3个点"}]
  ```
- **自定义约束**：每行一条，覆盖默认约束
- **重置为默认**：一键恢复场景默认模板

**第四步：生成 Brief**

点击 **"生成 Brief"**，AI 会根据选定策略和源材料输出结构化的 `deck_brief.md`。

**各场景默认锁定字段：**

**商业策划报告：**
1. 项目背景与市场机会
2. 产品/服务定位
3. 目标受众与决策者画像
4. 商业模式与盈利路径
5. 竞争优势与护城河
6. 市场规模与增长潜力
7. 财务预测与资金需求
8. 核心团队与履历
9. 里程碑与路线图
10. 风险与应对策略
11. 合作/融资诉求与下一步行动

**内部规划汇报：**
1. 目标对齐（OKR/KPI）
2. 现状诊断与差距分析
3. 策略路径与关键举措
4. 资源需求
5. 责任分工与协作机制
6. 里程碑节点与检查点
7. 风险评估与应对预案
8. 度量指标与监控机制
9. 执行时间表

**总结汇报报告：**
1. 核心成果与量化数据
2. 关键过程与亮点动作
3. 目标 vs 实际差距分析
4. 经验沉淀与可复制方法论
5. 教训复盘与避坑指南
6. 相关方协同与反馈
7. 下一步计划与改进方向
8. 资源支持需求

---

### Step 2：Expert Interview（专家访谈）

**第一步：确认场景（自动同步 Brief）**

进入 Interview 步骤后，场景选择器会自动沿用 Brief 步骤选定的策略。你也可以手动切换：
- 商业策划报告
- 内部规划汇报
- 总结汇报报告

> 切换场景会重置当前访谈进度，系统会提示确认。

**第二步：开始访谈**

点击 **"开始访谈"**，系统会自动分析 Brief 中的 Claims，并检测知识缺口（Gaps）。

**第三步：回答问题（聊天模式）**

- AI 会提出假设导向的问题
- 在输入框输入回答，按 **Enter** 发送（**Shift+Enter** 换行）
- 每 3-4 个问题会包含 1 个反证问题（counter-hypothesis）
- 右侧 **Gap Fill Rate** 进度条实时更新

**第四步：问卷模式（批量填补）**

点击顶部的 **"问卷"** 切换模式：
- 所有未填补的缺口以卡片形式列出
- 每个卡片显示缺口类型、所属 Claim、提示问题
- 填写后点击 **"保存所有回答"**

**第五步：完成访谈**

当 **Gap Fill Rate ≥ 80%** 时，点击 **"完成并生成 Expert Context"**。

**各场景的 GAP 检测体系：**

**商业策划报告（7 类缺口）：**
- 市场缺口 — 市场规模、趋势、目标客群是否清晰
- 商业模式缺口 — 收入来源、成本结构、盈利路径
- 财务缺口 — 预测数字、资金需求、ROI
- 团队缺口 — 核心背景、分工、人才缺口
- 竞争缺口 — 竞品分析、差异化、护城河
- 风险缺口 — 潜在风险、应对预案
- 里程碑缺口 — 时间表、节点、阶段目标

**内部规划汇报（7 类缺口）：**
- 目标缺口 — 是否量化、可衡量、对齐战略
- 策略缺口 — 路径、举措、备选方案
- 资源缺口 — 人力、预算、工具
- 责任缺口 — 负责人、分工、协作
- 里程碑缺口 — 检查点、交付物、时间表
- 风险缺口 — 阻碍、依赖、预案
- 度量缺口 — 指标、数据、监控机制

**总结汇报报告（6 类缺口）：**
- 结果缺口 — 核心成果是否量化
- 过程缺口 — 关键动作、方法论
- 差距缺口 — 目标 vs 实际偏差分析
- 教训缺口 — 成功/失败经验提炼
- 下一步缺口 — 后续计划、改进方向
- 相关方缺口 — 部门协同、反馈

---

### Step 3：Redaction（敏感信息审查）

1. 系统会自动标记回答中的敏感项（公司名、人名、具体金额、内部数据）
2. 对每个敏感项选择处理方式：
   - **保留** — 原样保留在最终文档中
   - **脱敏** — 替换为泛化描述
   - **删除** — 从文档中移除
3. 点击 **"确认并生成"** 输出最终版 Expert Context

---

### Step 4：Vibe（视觉风格定义）

1. 点击 **"生成 Vibe Brief"**
2. AI 基于 Brief 输出视觉 mood、配色、字体、图形语言
3. 生成产物：`deck_vibe_brief.md`

---

### Step 5：Narrative（叙事弧线）

1. 点击 **"生成叙事弧线"**
2. AI 输出：
   - `deck_narrative_arc.md` — Beat 序列、情感曲线、过渡逻辑
   - `deck_hero_pages.md` — 6 类 Hero Page 选择

---

### Step 6：Layout（页面布局草稿）

- 查看/编辑 `deck_layout_v1.md`
- 逐页定义内容结构和信息层级

---

### Step 7：Compression（内容压缩）

1. 点击 **"生成 Clean Pages"**
2. AI 将 Layout 转化为：
   - `deck_clean_pages.md` — 每页只有一个结论，用视觉结构替代段落
   - `deck_visual_composition.md` — 每页视觉主角定义

**压缩规则：**
- 每页只有一个结论
- 用视觉结构替代段落
- 移除内部讨论痕迹
- 保留证据（具体数字、客户名、系统节点）

---

### Step 8：Assets（素材规划）

- 查看/编辑 `deck_asset_plan.md`
- 列出每页需要的图表、截图、图标、图片素材

---

### Step 9：Visual System（视觉系统）

1. 点击 **"生成视觉系统"**
2. AI 输出完整视觉规范：
   - `deck_visual_system.md` — 页面原型、组件族
   - `deck_component_tokens.md` — 组件 Token
   - `deck_theme_tokens.json` — 颜色、字体、间距 Token
   - `deck_geometry_rules.md` — 几何规则
   - `deck_page_skeletons.md` — 页面骨架

---

### Step 10：Build（构建与导出）

**构建 HTML 预览：**
1. 点击 **"构建 HTML 预览"**
2. 右侧面板切换到 **"幻灯片"** 标签
3. 实时查看每页渲染效果

**导出 PPTX：**
1. 点击 **"导出 PPTX"**
2. 浏览器下载 `.pptx` 文件

> 如果 Clean Pages 为空，按钮区域会提示："暂无页面，请先在 Clean Pages 步骤定义内容"

---

### Step 11：QA + 评审

**运行 AI 评审：**
1. 点击 **"运行 AI 评审"**
2. 系统从 6 个维度评分（1-5）：
   - audience_fit — 目标受众共鸣
   - buying_reason_clarity — 首购理由清晰度
   - proof_strength — 证据可信度
   - objection_coverage — 异议覆盖度
   - narrative_flow — 叙事连贯性
   - commercial_ask — 成交行动强度
3. 整体评分 ≥ 3.3 且各维度 ≥ 3.0 方可通过

**添加 Finding：**
- 在表单中填写 page_id、severity、type、reason、suggested_fix
- 提交后出现在 Findings 列表

**生成 Rollback Plan：**
- 点击 **"生成 Rollback Plan"**
- 系统根据 Findings 生成逐页返工计划

---

## 五、Provider 配置详解

### 5.1 全局 Provider

1. 点击页面右上角 **Provider** 按钮打开抽屉
2. 选择预设：
   - AIHubMix（默认）
   - OpenAI
   - Anthropic
   - DeepSeek
   - 通义千问
   - 自定义
3. 输入 BaseURL 和 APIKey
4. 点击 **测试连通** — 系统先尝试 `/models`，失败则回退到 `chat/completions`
5. 显示 ✓ 后点击 **保存配置**

### 5.2 Provider Pool（多 Provider 管理）

在 Provider 抽屉下方的 **"添加 Provider 到 Pool"** 区域：
1. 填写名称（如 `DeepSeek-Test`）
2. 选择预设
3. 输入 BaseURL 和 APIKey
4. 点击 **测试并添加**
5. 连通成功后加入 Pool 列表

**Pool 用途：**
- 不同角色可绑定不同 Provider（如 Brief 用 GPT-4，Visual 用 Claude）
- 支持成本分摊和模型能力差异化

### 5.3 分角色绑定

在 Provider 抽屉的 **"分角色 Provider 绑定"** 区域：

| 角色 | 职责 |
|------|------|
| Brief | 内容策略与 Brief 生成 |
| Visual | 视觉系统与 Token 定义 |
| Build | 页面构建与 HTML/SVG 输出 |
| Review | QA 评审与评分 |
| Interviewer | 专家访谈与 Gap 检测 |

**操作步骤：**
1. 对每个角色，从下拉框选择：
   - **使用全局 Provider** — 使用抽屉顶部配置的全局设置
   - **Pool 中的某个 Provider** — 使用 Pool 中的独立配置
2. 点击角色旁的 **"刷新模型"** 按钮
3. 模型列表加载后，点击某行选中模型（或从下拉框选择）
4. 切换 Provider 后，模型列表会自动清空，防止选错模型
5. 全部配置完成后，点击 **保存配置**

### 5.4 配置导入/导出

- **导出配置** — 点击 Provider 抽屉底部的 **"导出配置"**，下载 JSON 文件
- **导入配置** — 点击 **"导入配置"**，选择之前导出的 JSON，自动恢复全局 Provider、Pool、角色绑定

---

## 六、导出功能

点击页面右上角 **"导出产物"** 按钮：

| 导出类型 | 说明 |
|----------|------|
| **PPTX 演示文稿** | 下载 `.pptx` 文件，可直接用 PowerPoint / WPS / Keynote 打开 |
| **HTML 网页** | 下载独立 `.html` 文件，可离线打开浏览 |
| **项目备份 (JSON)** | 下载完整项目数据，包含所有产物、访谈记录、配置，可用于恢复 |
| **缩略图拼图** | 生成所有页面的缩略图拼接为一张大图 |

**导入恢复：**
- 在 Step 0 点击 **"导入项目"**
- 选择之前导出的 JSON 备份
- 项目完全恢复到导出时的状态

---

## 七、UI 交互细节

### 7.1 预览面板

- 右侧面板支持 **Markdown / 幻灯片 / JSON / 图片** 四种预览模式
- 拖动中间分隔线可自由调整预览面板宽度（无上限限制）
- Markdown 预览支持自动换行，不溢出容器

### 7.2 步骤导航

- 点击 **"上一步" / "下一步"** 切换步骤
- 步骤未满足条件时，按钮禁用或提示"请先创建或加载一个项目"
- Expert 模式显示完整 11 步，Quick 模式显示精简步骤

### 7.3 产物编辑

- 每个步骤的文本框支持实时编辑
- 内容自动保存到 localStorage
- 刷新浏览器后数据不丢失

---

## 八、项目结构

```
PPT-Deck-Pro-Max/
├── webapp/
│   ├── index.html              # 主页面
│   ├── app.css                 # 全局样式
│   ├── start_server.py         # 本地 HTTP 服务器
│   ├── backend.py              # 后端 API（PPTX 生成等）
│   └── js/
│       ├── app.js              # 入口与 UI 控制
│       ├── modules/
│       │   ├── workflowEngine.js
│       │   ├── artifactStore.js
│       │   ├── providerManager.js
│       │   ├── aiCaller.js
│       │   ├── promptEngine.js
│       │   ├── interviewManager.js
│       │   ├── pptxBuilder.js
│       │   ├── htmlBuilder.js
│       │   ├── slidePreview.js
│       │   ├── qaEngine.js
│       │   └── ...
│       └── data/
│           ├── pricingTable.js
│           └── rollbackMap.js
├── build_deck.py               # Python PPTX 构建脚本
├── package.json                # Node 依赖（前端构建用）
└── TEST_PLAN.md                # 完整测试计划
```

---

## 九、常见问题

**Q1：点击按钮没反应？**  
A：必须使用 `http://localhost:8080` 访问，不能直接用文件协议打开 `index.html`。

**Q2：Provider 连通测试失败（401）？**  
A：APIKey 错误或已过期。检查 Key 是否有效，或尝试切换预设。

**Q3：刷新后项目数据丢失？**  
A：检查浏览器是否禁用了 localStorage，或使用"导出产物"定期备份。

**Q4：模型列表为空？**  
A：该 Provider 不支持 `/models` 端点。系统会自动回退并显示"默认模型 (models 端点不可用)"。

**Q5：如何切换 Brief / Interview 场景？**  
A：在对应步骤顶部的下拉框选择。Brief 场景会自动同步到 Interview 步骤。

---

## 十、测试计划（概要）

完整测试计划见 `TEST_PLAN.md`，覆盖以下 9 大模块：

1. **项目初始化** — 新建、导入、切换
2. **Provider 配置** — 全局配置、Pool 管理、角色绑定、模型交互
3. **工作流步骤** — Brief、Interview、Redaction、Vibe、Narrative、Layout、Compression、Visual System
4. **Build & QA** — HTML 预览、PPTX 导出、AI 评审
5. **导出功能** — PPTX / HTML / JSON / Montage
6. **UI 交互** — 面板调整、预览切换、Toast、加载状态
7. **配置持久化** — 刷新保留、导入导出
8. **边界条件** — 超长文本、空 Key、网络断开、快速连点
9. **兼容性** — Chrome / Edge / 缩放 / 移动端

---

## License

MIT
