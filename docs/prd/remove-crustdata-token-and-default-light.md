# PRD: Remove Crustdata token field from Settings and default light theme

## Context
- The Crustdata API token is now provided by the backend, so the client-side settings UI should not request or store it.
- Current default theme is dark; product wants default white (light) theme.

## Goals
- Remove the Crustdata API token field from all settings UIs.
- Set the default theme to light (white) while preserving ability to toggle dark.

## Non-goals
- Changing server token retrieval logic or provider behavior.
- Removing existing token-related actions/utilities (left intact for backward compatibility).

## Scope & Assumptions
- Update UI components only: `components/chat-settings.tsx`, `components/settings-overlay.tsx`.
- Update theme default in `app/layout.tsx` via `next-themes` provider.
- Assume backend supplies token (env or headers); UI no longer sets cookie.

## Approach
- Delete the Crustdata token section from both settings components and remove the associated import.
- Change `defaultTheme` from `dark` to `light` in the root `ThemeProvider`.

## Impacted Areas
- UI: settings modal(s) and root layout.
- Files:
  - `components/chat-settings.tsx`
  - `components/settings-overlay.tsx`
  - `app/layout.tsx`

## Risks & Mitigations
- Risk: Users previously relying on the client token input may lose that path.
  - Mitigation: Server continues to source the token via env; cookie setter remains for compatibility if reintroduced.

## Validation
- Open settings: verify no Crustdata token field appears.
- Load app fresh: confirm light theme applies by default; toggle still switches themes.

## Rollout/Rollback
- Rollout is immediate on deploy.
- Rollback by re-adding the token section and switching `defaultTheme` back to `dark`.

## Links
- Providers: `lib/providers/crustdata/client.ts`
- Actions: `app/(chat)/actions.ts`
