# Deployment Checklist

## Before Pushing to GitHub

- [ ] `.env.local` is not tracked.
- [ ] No real OpenAI API key is committed.
- [ ] No personal resume PDF is committed.
- [ ] No real `resume-master.json` is committed.
- [ ] `data/` and `output/` are ignored or contain only sanitized files outside Git tracking.
- [ ] Public README uses the project name `CareerFit Agent`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.

## Vercel Project Settings

- Install command: `npm install`
- Build command: `npm run build`
- Output directory: leave unset
- Framework preset: Next.js

Environment variables:

- `OPENAI_API_KEY`
- `OPENAI_MODEL_DEEP`
- `OPENAI_MODEL_FAST`
- `AI_MODEL_TIER`

## Post-Deploy Smoke Test

- [ ] Home page opens.
- [ ] No Master state shows the empty import preview, not default personal data.
- [ ] `/api/ai-status` returns `configured=true` when the Vercel environment has `OPENAI_API_KEY`.
- [ ] PDF upload parses a resume.
- [ ] JD analysis returns a result.
- [ ] Tailored resume generation returns a result.
- [ ] `qualityReview`, `atsReview`, and `comparisonReview` are present in tailor responses.
- [ ] PDF export succeeds.
- [ ] If PDF export fails, capture Vercel function logs and error message for a focused serverless Chromium fix.
- [ ] Browser console has no obvious runtime errors.

## Known Deployment Risk

The PDF export route uses Playwright Chromium. It works in local development, but Vercel serverless compatibility must be verified after deployment. A follow-up may be needed to use a Vercel-compatible Chromium package or an alternate PDF rendering strategy.
