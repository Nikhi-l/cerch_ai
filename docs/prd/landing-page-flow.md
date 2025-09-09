# Landing Page Transition Flow

## Context
Currently the root page jumps directly to login. We need a multi-step landing experience with a hero Spline scene followed by a marketing page.

## Goals / Non-goals
- Provide initial hero page that fades out on user interaction and reveals a marketing landing page.
- From the marketing page, "Try" and "Generate my first list" CTAs should route users to login/chat.
- Not building complex CMS or redesigning chat/auth flows.

## Scope & Assumptions
- Use existing Next.js app.
- Middle marketing page is static HTML with its own animations.
- Users reach chat via login.

## Approach
1. Move provided `landing.html` into `public/landing/index.html` so it can be served directly.
2. Convert `app/page.tsx` to a client component that fades out and navigates to `/landing` on scroll or button click.
3. Update CTA buttons in the landing HTML to link to `/login`.

## Impacted Areas
- `app/page.tsx`
- `public/landing/index.html`

## Risks & Mitigations
- Navigation timing may feel abrupt → use short fade-out before redirect.
- Large static HTML might slow load → keep it separate from main bundle.

## Validation
- `pnpm lint`
- `pnpm test`
- Manual: visit `/`, click or scroll to see transition, use CTA to reach login.

## Rollout / Rollback
Deploy as usual; revert commit to rollback.

## Links
- N/A
