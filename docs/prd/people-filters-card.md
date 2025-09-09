# People Filters Card for Crustdata (People AI)

## Context
- Users ask for people/company discovery (e.g., “find me tech folks in SF”).
- Today, the assistant may immediately create artifacts, but users often need to refine filters (title, region, industry, skills, etc.).
- Crustdata People Discovery API supports rich filters; we want a minimal, modern UI card in-chat (like Weather) to collect refinements before creating artifacts.

## Goals / Non-goals
- Goals:
  - Add a People Filters card that appears in chat to refine searches.
  - Keep the design minimal and on-theme; offer skip option.
  - On submit or skip, create artifacts for both people and company.
  - Use existing artifact pipeline (people/company handlers).
- Non-goals:
  - Full autocomplete integration for filters (out of scope for first pass).
  - Overhauling provider/filter mapping; we use a curated subset.

## Scope & Assumptions
- Surfaces: Chat UI message stream, tool invocation rendering, artifacts pane.
- Users: Signed-in chat users.
- Constraints: Network may be restricted in dev; provider calls run in production. Keep UI responsive without autocomplete.
- Dependencies: `lib/providers/crustdata`, `artifacts/people`, `artifacts/company`.

## Approach
- Add a new tool `peopleFilters` that the model calls when it detects a people/company discovery intent. It returns an object with `baseQuery` and inferred defaults (via `parsePeopleQuery`).
- Add `components/people-filters-card.tsx` (minimal card): inputs for region, title, industry, skills, languages, experience range, min connections, size range, and actions: “Create List” and “Skip”.
- Wire it into `components/message.tsx` similar to the Weather card. Pass `append` so the card can send a follow-up message that instructs the model to call `createDocument` for `people` and `company` with composed titles.
- Update prompts to prefer `peopleFilters` first for people/company queries, then create artifacts.
- Register tool in chat route and enable in `experimental_activeTools`.

## Impacted Areas
- Files:
  - `lib/ai/tools/people-filters.ts` (new)
  - `components/people-filters-card.tsx` (new)
  - `components/message.tsx`, `components/messages.tsx`, `components/chat.tsx` (pass `append`, render card)
  - `app/(chat)/api/chat/route.ts` (register tool)
  - `lib/ai/prompts.ts` (guidance tweak)

## Risks & Mitigations
- Model may still skip the tool: strengthened prompt guidance; the follow-up message from the card explicitly instructs tool usage with exact args.
- Overfitting filter UI to provider: we keep a safe subset mapping to stable fields.
- Network restrictions in dev: card works without live autocomplete; artifacts rely on server-side providers in prod.

## Validation
- Manual: Prompt “find me tech folks in SF” → see People Filters card → submit/skip → observe two createDocument tool calls → artifacts open and stream.
- Edge: Skip path uses only base query.

## Rollout / Rollback
- Behind no flag; purely additive. Rollback by removing the tool and UI wiring.

## Links
- Crustdata People API docs in `Crustdata_docs/Crustdata_people_api_docs `
- Filters autocomplete docs in `Crustdata_docs/Crustdata_filter_docs`

