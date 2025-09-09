# PRD: Dark Mode Toggle and Theming

## Context
Users requested a dark mode with a jet‑black background, white text, and existing dark violet accents preserved (e.g., chat window and “Add Enrichment” actions).

## Goals / Non-goals
- Goals:
  - Add a top‑right toggle to switch between light and dark.
  - In dark mode: background black, text white, keep violet accents.
  - Ensure chat bubbles and data tables remain readable and on-brand.
- Non-goals:
  - Comprehensive redesign or new color palette.
  - Changing copy or flows.

## Scope & Assumptions
- App-wide theming via CSS variables and Tailwind `dark` class.
- Persisted preference handled by `next-themes`.
- Update key components using hard-coded colors to respect dark mode.

## Approach
- Enable `dark` theme in `ThemeProvider` and add `ThemeToggle` component.
- Define dark tokens in `app/globals.css` and `.dark .chat-theme` overrides.
- Minimal component updates where hard-coded `bg-white` was used (messages, webset table) with `dark:` classes.

## Impacted Areas
- `app/layout.tsx` (provider + global toggle placement)
- `app/(chat)/layout.tsx` (credits pill offset)
- `app/globals.css` (dark tokens, CodeMirror dark styles, chat theme dark overrides)
- `components/theme-toggle.tsx` (new)
- `components/message.tsx` (assistant bubble + thinking state)
- `components/webset-table.tsx` (container + sticky column backgrounds, avatar bg)

## Risks & Mitigations
- Overlap between chat credits pill and toggle → offset credits to the left.
- Hard-coded colors elsewhere → audit as issues arise; use CSS vars or `dark:` utilities.

## Validation
- Manual: Toggle dark mode across chat and webset table; verify black background, white text, violet accents; ensure “Add Enrichment” remains purple.
- Playwright: existing tests should continue to pass; no new selectors changed.

## Rollout/Rollback
- Rollout: ship as default-off (light) with toggle available.
- Rollback: remove `ThemeToggle` and dark token overrides; keep light defaults.

## Links
- Files: `app/layout.tsx`, `app/(chat)/layout.tsx`, `app/globals.css`, `components/theme-toggle.tsx`, `components/message.tsx`, `components/webset-table.tsx`
