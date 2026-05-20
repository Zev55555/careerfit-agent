# CareerFit Agent

**面向真实岗位 JD 的 AI 求职材料匹配原型。**

CareerFit Agent 是一个 AI 产品原型，用来把用户的 Master 简历和真实岗位 JD 连接起来，生成更贴近岗位要求、但尽量不失真的求职材料。它关注的不是“一键美化简历”，而是岗位拆解、经历证据匹配、项目证据保护、质量检查、ATS 关键词覆盖和 A4 PDF 导出。

本项目不会承诺提高真实投递通过率，也不保证获得面试机会。

## 项目简介

很多 JD 定制类工具容易出现三个问题：

- 只把 JD 关键词贴到技能区，项目经历没有真正支撑岗位职责；
- 为了显得匹配而过度包装，写出候选人并没有证据支撑的能力；
- 定制过程中删掉 Master 简历里原本很有说服力的项目证据。

CareerFit Agent 尝试用更可控的流程解决这些问题：

```text
Master 简历 -> JD 分析 -> 经历证据匹配 -> 生成定制版本 -> 质量检查 -> PDF 导出
```

系统会从用户维护的 Master 简历出发，分析目标 JD，再围绕有证据支撑的经历改写技能区和项目 bullet，并通过多层质量防护降低 JD 硬贴、AI 痕迹、过度包装和强证据丢失问题。

## 核心功能

- **Master 简历导入**
  - 支持 PDF 简历解析；
  - 支持 Master JSON 导入 / 导出；
  - 未导入前显示空白引导态，不暴露任何默认个人信息。

- **JD 分析**
  - 解析岗位方向、岗位职责、任职要求、关键词、风险点和经历证据矩阵；
  - 支持 AI 产品、Agent 应用、大模型应用、自动识别岗位和自定义岗位方向。

- **基于证据的简历生成**
  - 根据当前 Master 和 JD 生成岗位定制版本；
  - 不只改技能区，也会让项目经历回应岗位职责；
  - 支持 N+1 项目桥接 bullet：保留项目原始强证据，同时补充一条安全的岗位定向表达。

- **Resume Quality Guardrail**
  - 检测 JD 硬贴、AI 痕迹、过度包装、无证据技能和真实性风险；
  - 对确定性问题做保守规则修复；
  - 保护原始项目中的强证据，避免定制版反而弱于 Master。

- **ATS 关键词覆盖**
  - 检查岗位核心关键词是否被自然覆盖；
  - 避免关键词堆砌；
  - 对缺少证据的关键词给出风险提示，而不是硬塞进简历正文。

- **Master vs Generated 对比**
  - 对比原始 Master 和生成版本是否真的更适合当前 JD；
  - 如果生成版削弱了原始强证据，会触发修复机制。

- **A4 PDF 导出**
  - 固定中文 A4 简历预览；
  - 一页内容预算检查；
  - 支持导出最终 PDF。

## 产品亮点

- **不是通用改写，而是 JD 到经历证据的匹配**  
  系统会尽量先判断 JD 要什么、Master 里有什么证据，再决定怎么写。

- **N+1 项目桥接 bullet**  
  项目经历保留原始强证据，再增加一条和当前岗位相关的桥接 bullet，避免项目区变成纯关键词堆砌。

- **质量防护机制**  
  规则检查会拦截“对应 JD”“满足岗位要求”等 AI 痕迹，以及商业化上线、模型训练、企业级落地等无证据高风险表达。

- **ATS-friendly，但不关键词堆砌**  
  关键词只有在有项目或技能证据支撑时才会被写入。缺少证据的关键词会作为风险提示，而不是伪造成候选人能力。

- **改前改后对比**  
  生成版会和 Master 简历做对比，减少“为了贴 JD 反而删掉强证据”的问题。

## 效果验证

项目使用真实岗位 JD 做了原始版与生成版对照测试，并采用统一的 HR 风格评分维度评估岗位匹配度。

在 50 条评分记录中，生成版平均分从 **74.52** 提升至 **81.26**，平均提升 **6.74 分**，胜率 **72%**。

该结果是基于统一评分标准的产品 benchmark，不代表真实投递通过率、面试转化率或录用结果。

## 技术栈

根据当前仓库扫描，项目主要使用：

- [Next.js](https://nextjs.org/) 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- OpenAI API
- `pdf-parse`：PDF 文本解析
- Playwright：PDF 渲染与导出
- ESLint

## 本地运行

安装依赖：

```bash
npm install
```

如果需要本地测试 PDF 导出，需要安装 Playwright 使用的 Chromium：

```bash
npx playwright install chromium
```

启动开发服务器：

```bash
npm run dev
```

打开：

```text
http://localhost:3000
```

常用命令：

```bash
npm run lint
npm run build
npm run start
```

Windows PowerShell 中也可以使用：

```powershell
npm.cmd run dev
npm.cmd run lint
npm.cmd run build
```

## 环境变量

复制 `.env.example` 为 `.env.local`：

```env
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL_DEEP=gpt-5.4
OPENAI_MODEL_FAST=gpt-5.4-mini
AI_MODEL_TIER=fast
```

模型档位：

- `AI_MODEL_TIER=fast`：使用 `OPENAI_MODEL_FAST`，默认 `gpt-5.4-mini`；
- `AI_MODEL_TIER=deep`：使用 `OPENAI_MODEL_DEEP`，默认 `gpt-5.4`。

旧的 `OPENAI_MODEL` 不再推荐使用。当前模型选择以 `OPENAI_MODEL_DEEP`、`OPENAI_MODEL_FAST` 和 `AI_MODEL_TIER` 为准。

不要提交 `.env.local`，也不要提交真实 API Key。

## 部署到 Vercel

1. 将仓库 push 到 GitHub。
2. 在 Vercel 中导入项目。
3. 在 Vercel Dashboard 配置环境变量：
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL_DEEP`
   - `OPENAI_MODEL_FAST`
   - `AI_MODEL_TIER`
4. Install Command：

   ```bash
   npm install
   ```

5. Build Command：

   ```bash
   npm run build
   ```

6. Output Directory：
   - Next.js 项目无需手动设置，保持为空即可。

部署后建议测试：

- `/`
- `/api/ai-status`
- `/api/analyze-jd`
- `/api/tailor-resume`
- `/api/export-pdf`

注意：当前 PDF 导出依赖 Playwright Chromium。本地可用不代表 Vercel Serverless 环境一定完全兼容，部署后需要重点测试 `/api/export-pdf`。如果失败，需要单独处理 Serverless Chromium 兼容方案。

## 部署说明

- 项目包含 Next.js API Routes，应按 Next.js 应用部署，不适合作为纯静态站点部署。
- `/api/upload-resume` 会在内存中解析上传的 PDF。
- `/api/analyze-jd` 和 `/api/tailor-resume` 在配置 OpenAI 后会调用真实 AI。
- `/api/export-pdf` 依赖 Playwright，是 Vercel 部署后最需要重点验证的部分。

## 项目状态

当前项目处于 MVP / Prototype 阶段，核心链路已完成：

```text
导入 Master -> 分析 JD -> 生成定制简历 -> 质量检查 -> 导出 PDF
```

项目仍在基于真实 JD benchmark 持续迭代，重点包括项目证据保护、N+1 项目桥接 bullet、反过度包装和生成质量评估。

## 安全注意事项

- 不要提交 `.env.local`。
- 不要提交真实 API Key。
- 不要提交个人简历 PDF。
- 不要提交 `resume-master.json` 或生成后的简历文件。
- 示例数据必须脱敏。
- 如果需要公开 demo 数据，建议放在单独的示例目录中，并使用虚构用户。
