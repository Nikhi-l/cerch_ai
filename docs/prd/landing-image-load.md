# PRD: Load landing.png with bundler-aware path

## Context
The static landing page references `/landing.png`, but the Next.js route serving the image read it from `process.cwd()`, which fails in the serverless build, so the image never loads.

## Goals / Non-goals
- Goals:
  - Ensure the landing page image is served correctly in production.
- Non-goals:
  - Redesign the landing page or asset pipeline.

## Scope & Assumptions
- Touches `app/landing.png/route.ts` only.
- Assumes `landing.html` continues to live at the repository root.

## Approach
- Resolve the image path relative to the route module using `new URL` and `fileURLToPath` so the bundler includes the asset.

## Impacted Areas
- `app/landing.png/route.ts`

## Risks & Mitigations
- **Risk:** Incorrect relative path still results in 404.
  - **Mitigation:** Use `new URL('../../landing.png', import.meta.url)` tested locally.

## Validation
- Run ESLint on the route.
- Execute `pnpm lint`, `pnpm test`, and `pnpm run build` to ensure no new regressions (known failures persist).

## Rollout / Rollback
- Rollout: merge and deploy.
- Rollback: revert commit if image fails to load.

## Links
- Related issue: landing page image 404 on production.
