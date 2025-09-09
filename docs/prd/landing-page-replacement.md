# Landing Page Replacement PRD

## Context
The existing landing page is a minimal Spline demo. A richer landing page exists in `landingpage.html` with animations and marketing copy. We want this new page to serve as the site's entry point.

## Goals
- Serve `landingpage.html` when users visit `/`.
- Ensure primary call‑to‑action buttons navigate to the chat window.

## Non-goals
- Redesign of chat or authentication flows.
- Copy or design changes beyond integrating the provided HTML.

## Scope & Assumptions
- Replace `/` route with static HTML file in `public`.
- Update CTA buttons (`Generate my first list`) to link to `/chat`.
- Assume existing chat route at `/chat` remains unchanged.

## Approach
- Move `landing.html` to `public/landingpage.html`.
- Replace `app/page.tsx` with a redirect to `/landingpage.html`.
- Convert CTA buttons to anchor tags targeting `/chat`.

## Impacted Areas
- `app/page.tsx`.
- `public/landingpage.html`.

## Risks & Mitigations
- **Risk:** Static HTML may bypass Next.js layout styling.
  - *Mitigation:* Keep page self‑contained with its own styles.
- **Risk:** Redirect loop if file missing.
  - *Mitigation:* Ensure `landingpage.html` committed under `public/`.

## Validation
- Run linting and Playwright tests (`pnpm lint`, `pnpm test`).
- Manually verify landing page loads and CTA links to `/chat`.

## Rollout/Rollback
- Rollout: deploy updated build.
- Rollback: revert commit to restore previous landing page.

## Links
- PR: (TBD)
