# PRD: Serve landing.png from the public directory

## Context
The static landing page references `/landing.png`, but relying on a custom route to read the file from the repository root fails once the app is built for a serverless environment, so the image never loads.

## Goals / Non-goals
- Goals:
  - Ensure the landing page image is served correctly in production.
- Non-goals:
  - Redesign the landing page or asset pipeline.

## Scope & Assumptions
- Move the `landing.png` asset into the `public/` folder so it is bundled automatically.
- Remove the custom image route.

## Approach
- Relocate `landing.png` to `public/` and delete `app/landing.png/route.ts` so the image is served as a standard static asset.

## Impacted Areas
- `public/landing.png`
- Removed: `app/landing.png/route.ts`

## Risks & Mitigations
- **Risk:** Moving the asset could break existing references.
  - **Mitigation:** The image continues to be referenced as `/landing.png`, which still resolves after relocation.

## Validation
- Execute `pnpm lint`, `pnpm test`, and `pnpm run build` to ensure no new regressions (known failures persist).

## Rollout / Rollback
- Rollout: merge and deploy.
- Rollback: revert commit if image fails to load.

## Links
- Related issue: landing page image 404 on production.
