# PRD: Serve landing screenshot reliably

## Context
The static landing page previously referenced `/landing.png`, but relying on a custom route to read the file from the repository root failed once the app was built for a serverless environment, so the image never loaded. Loading from the `public` folder also proved unreliable, so the screenshot is now hosted externally.

## Goals / Non-goals
- Goals:
  - Ensure the landing page image is served correctly in production.
- Non-goals:
  - Redesign the landing page or asset pipeline.

## Scope & Assumptions
- Reference a remotely hosted screenshot to ensure the landing page renders an image even when the local asset pipeline fails.
- Remove the custom image route.

## Approach
- Delete `app/landing.png/route.ts` and point the `<img>` element to `https://i.postimg.cc/Prgn5JYj/Screenshot-2025-09-10-at-3-12-24-AM.png`.

## Follow-up
- Replace the temporary external link with a local asset once the image pipeline is stable.

## Impacted Areas
- `landing.html`
- Removed: `app/landing.png/route.ts`

## Risks & Mitigations
- **Risk:** External host may become unavailable.
  - **Mitigation:** Replace with a locally served asset when feasible.

## Validation
- Execute `pnpm lint`, `pnpm test`, and `pnpm run build` to ensure no new regressions (known failures persist).

## Rollout / Rollback
- Rollout: merge and deploy.
- Rollback: revert commit if image fails to load.

## Links
- Related issue: landing page image 404 on production.
