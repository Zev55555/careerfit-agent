# CareerFit Agent

**AI job application assistant for JD-to-evidence matching and resume quality guardrails.**

CareerFit Agent is an AI product prototype for turning a Master Resume and a real job description into a more role-aligned application resume. It focuses on JD analysis, evidence matching, project evidence preservation, quality checks, ATS-friendly keyword coverage, and A4 PDF export.

It is not a one-click resume optimizer and does not claim to guarantee interviews or application outcomes.

## Project Overview

Many JD-based resume tools overfit to keywords, rewrite projects into generic claims, or remove the original evidence that made a candidate credible. CareerFit Agent explores a more controlled workflow:

```text
Master Resume -> JD Analysis -> Evidence Matching -> Generated Resume -> Quality Check -> PDF Export
```

The system starts from a user-controlled Master Resume, analyzes the target JD, rewrites skills and project bullets around supported evidence, and applies guardrails to reduce over-claiming, JD copying, AI traces, and evidence loss.

## Core Features

- **Master Resume import**
  - PDF resume parsing
  - Master JSON import / export
  - Empty import state before any Master is loaded, with no default personal information exposed

- **JD analysis**
  - Role direction, responsibilities, keywords, risks, evidence matrix, and resume strategy
  - Preset and flexible directions such as AI product, Agent applications, LLM applications, auto-detected roles, and custom roles

- **Evidence-based resume generation**
  - Generates a role-aligned resume from the current Master and JD
  - Rewrites both skills and project experience, instead of only changing keyword lists
  - Uses N+1 project bridge bullets: keep original strong evidence, then add one JD-oriented bridge bullet when safe

- **Resume Quality Guardrail**
  - Detects JD hard-pasting, AI trace language, over-claiming, unsupported skills, and truth risks
  - Applies conservative rule-based repairs where safe
  - Protects strong project evidence from being removed during tailoring

- **ATS-friendly keyword coverage**
  - Checks whether important JD keywords are naturally covered
  - Avoids keyword stuffing and blocks missing / unsupported keywords from being inserted as fake skills

- **Master vs Generated comparison**
  - Compares the generated resume against the Master Resume for the same JD
  - Detects when generation weakens original strong evidence
  - Can trigger a hybrid repair flow to recover important evidence

- **A4 PDF export**
  - Fixed Chinese A4 resume preview
  - One-page content budget checks
  - PDF export route for final review

## Product Highlights

- **JD-to-evidence matching, not generic rewriting**  
  The system tries to connect each JD requirement to supported resume evidence before writing it into the generated resume.

- **N+1 Project Bridge Bullets**  
  Project bullets preserve original strong evidence while adding one controlled JD bridge bullet, so projects do not become vague keyword paragraphs.

- **Resume Quality Guardrail**  
  Rule checks catch JD-copy language, seniority inflation, unsupported terms, and over-packaged claims such as commercial launch, model training, or enterprise deployment when not supported.

- **ATS-friendly without keyword stuffing**  
  Keywords are considered useful only when backed by evidence. Missing keywords are surfaced as risks rather than silently inserted.

- **Master vs Generated evaluation**  
  The generated version is compared with the Master Resume to reduce regressions where tailoring deletes stronger original evidence.

## Benchmark Validation

The project has been evaluated with real JD benchmark cases using a consistent HR-style scoring rubric. Across 50 scoring records, generated versions improved the average score from **74.52** to **81.26**, an average lift of **6.74 points**, with a **72% win rate**.

This benchmark is an internal product evaluation method. It does not represent real application pass rates, interview conversion rates, or hiring outcomes.

## Tech Stack

Scanned from the current repository:

- [Next.js](https://nextjs.org/) 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- OpenAI API
- `pdf-parse` for PDF text extraction
- Playwright for PDF rendering/export
- ESLint

## Local Development

```bash
npm install
```

For local PDF export, install the Chromium browser used by Playwright:

```bash
npx playwright install chromium
```

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Useful commands:

```bash
npm run lint
npm run build
npm run start
```

On Windows PowerShell, the equivalent commands are:

```powershell
npm.cmd run dev
npm.cmd run lint
npm.cmd run build
```

## Environment Variables

Create `.env.local` from `.env.example`:

```env
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL_DEEP=gpt-5.4
OPENAI_MODEL_FAST=gpt-5.4-mini
AI_MODEL_TIER=fast
```

Model tiers:

- `AI_MODEL_TIER=fast`: uses `OPENAI_MODEL_FAST`, default `gpt-5.4-mini`
- `AI_MODEL_TIER=deep`: uses `OPENAI_MODEL_DEEP`, default `gpt-5.4`

The legacy `OPENAI_MODEL` variable is not recommended. The active model is selected from `OPENAI_MODEL_DEEP`, `OPENAI_MODEL_FAST`, and `AI_MODEL_TIER`.

Never commit `.env.local` or real API keys.

## Deploy on Vercel

1. Push the repository to GitHub.
2. Import the project in Vercel.
3. Set environment variables in the Vercel Dashboard:
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL_DEEP`
   - `OPENAI_MODEL_FAST`
   - `AI_MODEL_TIER`
4. Install command:

   ```bash
   npm install
   ```

5. Build command:

   ```bash
   npm run build
   ```

6. Output directory:
   - Leave unset for this Next.js project.

After deployment, test:

- `/`
- `/api/ai-status`
- `/api/analyze-jd`
- `/api/tailor-resume`
- `/api/export-pdf`

PDF export should be tested after Vercel deployment. The current export route uses Playwright Chromium, and serverless Chromium compatibility may require a follow-up adjustment.

## Deployment Notes

- The API routes use server-side logic and should be deployed as a Next.js app, not as a static-only site.
- `/api/upload-resume` parses uploaded PDFs in memory.
- `/api/analyze-jd` and `/api/tailor-resume` require OpenAI configuration for real AI output.
- `/api/export-pdf` depends on Playwright and is the main deployment risk area on serverless platforms.

## Project Status

CareerFit Agent is an MVP / prototype. The core loop is complete:

```text
Import Master -> Analyze JD -> Generate role-aligned resume -> Run quality checks -> Export PDF
```

The project is still being iterated with real JD benchmark cases, especially around evidence preservation, project bridge bullets, and anti-overpackaging guardrails.

## Safety Notes

- Do not commit `.env.local`.
- Do not commit real API keys.
- Do not commit personal resume PDFs.
- Do not commit `resume-master.json` or generated resume exports.
- Keep demo data anonymized.
- If examples are needed, place sanitized fixtures in a separate example directory.

