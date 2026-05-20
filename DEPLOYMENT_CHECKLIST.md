# 部署检查清单

## 推送到 GitHub 前

- [ ] `.env.local` 没有被 Git 跟踪。
- [ ] 没有提交真实 OpenAI API Key。
- [ ] 没有提交个人简历 PDF。
- [ ] 没有提交真实 `resume-master.json`。
- [ ] `data/` 和 `output/` 已被忽略，或只包含不会被提交的本地文件。
- [ ] 公开 README 使用统一项目名 `CareerFit Agent`。
- [ ] 已运行 `npm run lint`。
- [ ] 已运行 `npm run build`。

## Vercel 项目设置

- Install Command：`npm install`
- Build Command：`npm run build`
- Output Directory：留空
- Framework Preset：Next.js

需要配置的环境变量：

- `OPENAI_API_KEY`
- `OPENAI_MODEL_DEEP`
- `OPENAI_MODEL_FAST`
- `AI_MODEL_TIER`

## 部署后 Smoke Test

- [ ] 首页可以正常打开。
- [ ] 没有 Master 简历时，页面显示空白导入态，而不是默认个人数据。
- [ ] 配置 `OPENAI_API_KEY` 后，`/api/ai-status` 返回 `configured=true`。
- [ ] PDF 上传可以解析简历。
- [ ] JD 分析可以返回结果。
- [ ] 定制简历可以生成。
- [ ] `/api/tailor-resume` 返回中包含 `qualityReview`、`atsReview` 和 `comparisonReview`。
- [ ] PDF 导出可以成功。
- [ ] 如果 PDF 导出失败，需要记录 Vercel Function Logs 和错误信息，再单独修复 Serverless Chromium 兼容问题。
- [ ] 浏览器 console 没有明显运行时错误。

## 已知部署风险

当前 PDF 导出依赖 Playwright Chromium。本地开发环境可以运行，但 Vercel Serverless 环境需要部署后单独验证。

如果 `/api/export-pdf` 在线上失败，后续可能需要接入 Vercel 兼容的 Chromium 方案，或调整 PDF 渲染策略。
