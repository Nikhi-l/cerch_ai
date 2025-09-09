# Landing Page Flow

## Context
The current home page goes directly to login via a button. A new animated landing page has been added and should appear after initial interaction with the hero page.

## Goals
- Introduce an intermediate landing experience with animations.
- Allow users to reach the chat/login flow via calls to action.

## Non-goals
- Redesign chat or auth flows.

## Scope & Assumptions
- Animation triggered by scroll or button click.
- Landing page hosted as static HTML under `/public/landing`.

## Approach
- Embed the HTML landing page via an iframe and transition between sections using CSS animations.
- Update landing page buttons to link to `/login`.

## Impacted Areas
- `app/page.tsx`
- `public/landing/index.html`

## Validation
- Manual check that the transition runs and CTA links open the login page.

## Rollout/Rollback
- Rollout with standard deployment.
- Revert commit to rollback.

## Links
- PR: TODO
