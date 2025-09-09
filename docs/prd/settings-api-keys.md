# PRD: Settings – API Keys UX

## Context
- Users need to provide an OpenAI API key and optionally a Crustdata API token.
- The prior OpenAI key UI had an “Auto/Custom” toggle, which caused confusion.
- Crustdata token configuration existed only via environment variable.

## Goals / Non-goals
- Goals:
  - Prompt users to add an OpenAI API key if missing.
  - Simplify OpenAI key entry to a single input field.
  - Add UI to set a Crustdata API token persistently per-user.
- Non-goals:
  - Broader settings redesign.
  - Token validation against providers.

## Scope & Assumptions
- Surfaces: Settings dialog (gear icon in chat input), Credits page token usage, People/Company artifact handlers.
- Assumes cookies are an acceptable storage method for per-user tokens.

## Approach
- OpenAI:
  - Remove “Auto/Custom” select; provide a single password field with save/clear.
  - Auto-open the Settings dialog with a message “Please add your OpenAI API key” when no key is present.
- Crustdata:
  - Add a new “Crustdata API Token” input with save/clear; store a `crustdata-api-token` cookie.
  - Update Crustdata client to resolve token from cookie first, otherwise environment.
  - Make `isCrustConfigured()` async; update artifact handlers to await this.

## Impacted Areas
- UI: `components/api-key-input.tsx`, `components/chat-settings.tsx`, `components/settings-overlay.tsx`, new `components/crustdata-token-input.tsx`.
- Server actions: `app/(chat)/actions.ts` (add `saveCrustdataApiTokenAsCookie`).
- Providers: `lib/providers/crustdata/client.ts` (cookie-aware token, async checks).
- Artifacts: `artifacts/people/server.ts`, `artifacts/company/server.ts` (await config check).

## Risks & Mitigations
- Risk: Using cookies for tokens may lead to confusion vs. env vars.
  - Mitigation: Cookie overrides env; messaging clarifies optional token.
- Risk: `cookies()` not available outside request context.
  - Mitigation: Access only within async functions invoked by routes/server handlers.

## Validation
- Manual: 
  - Load chat with no OpenAI key cookie; Settings auto-opens.
  - Add OpenAI key; save; dialog closes and chat flows work.
  - Add Crustdata token; verify Credits page shows number; People/Company artifacts don’t error.

## Rollout/Rollback
- Rollout: No migrations; purely additive UI + provider logic. Safe to deploy.
- Rollback: Revert the above files.

## Links
- Code: see impacted files above.

