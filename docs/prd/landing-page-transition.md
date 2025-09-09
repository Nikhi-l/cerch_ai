# Landing Page Transition

## Context
The initial hero page needed a smooth transition to a detailed landing page and a clear path to the chat experience.

## Goals
- Show Spline hero first.
- On scroll or click, animate in the detailed landing page.
- Link calls to action to chat and login routes.

## Non-goals
- Styling changes to existing chat or auth pages.

## Scope & Assumptions
- Animation handled on client side.
- Middle page served from static HTML.

## Approach
- Use `framer-motion` to fade out the hero and slide in an iframe with the landing HTML.
- Enhance landing HTML with links to `/chat` and `/login`.

## Impacted Areas
- `app/page.tsx`
- `public/landing.html`

## Risks & Mitigations
- Large HTML file: load via iframe to isolate.

## Validation
- Manual navigation test: hero → landing → chat/login.
- `pnpm lint`
- `pnpm test`

## Rollout/Rollback
- Rollout via deployment.
- Rollback by reverting commit.

## Links
- N/A
