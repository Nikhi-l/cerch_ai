# PRD: Fix UIMessage import in People Filters card

## Context
The Vercel build failed because `UIMessage` was imported from `@ai-sdk/react`, which does not export that type. This caused a type error and halted production builds when rendering the People Filters card.

## Goals / Non-goals
- **Goals:** Import `UIMessage` from the correct package so the People Filters card compiles.
- **Non-goals:** Refactor People Filters card functionality or alter messaging logic.

## Scope & Assumptions
- Affects `components/people-filters-card.tsx` only.
- Assumes existing `UseChatHelpers` typings remain unchanged.

## Approach
- Import `UIMessage` from the `ai` package instead of `@ai-sdk/react`.

## Impacted Areas
- `components/people-filters-card.tsx`

## Risks & Mitigations
- **Risk:** Future SDK updates may change where `UIMessage` is exported.
  - **Mitigation:** Type checking will fail again, signaling required updates.

## Validation
- Run ESLint on `components/people-filters-card.tsx`.
- Attempt `pnpm build` to ensure the type error is resolved.

## Rollout / Rollback
- Rollout: merge and deploy.
- Rollback: revert commit.

## Links
- Build error: `"@ai-sdk/react" has no exported member named 'UIMessage'.`
