# Quick Company Filters Tool Card

Status: Implemented (UI + registration)

## Context
Users often ask for company data and want to quickly narrow results by common facets (location, employee count, industry). We want a custom UI tool card that the model can surface inline in chat to collect these filters. Back-end linking to a search API will follow later.

## Goals / Non-goals
- Goals: Provide a reusable UI card for quick company filters; expose a no-op AI tool that triggers rendering of this card; wire into the chat route and message renderer.
- Non-goals: Implement actual filtering logic, API calls, persistence, or state management beyond static UI.

## Scope & Assumptions
- Surfaces: Chat message stream rendering for tool invocations.
- Assumptions: Model can call the tool when a user asks for company data; UI remains static for now.

## Approach
- Create a React component `components/quick-filters.tsx` that matches the provided design (Buttons, Card, Lucide icons).
- Add a tool `lib/ai/tools/quick-company-filters.ts` using `tool()` from `ai` with a descriptive prompt to guide invocation when users ask for companies.
- Register the tool in `app/(chat)/api/chat/route.ts` under `tools` and `experimental_activeTools`.
- Extend `components/message.tsx` to render `<QuickFilters />` for both call and result states of `quickCompanyFilters`.

## Impacted Areas
- components/quick-filters.tsx (new)
- lib/ai/tools/quick-company-filters.ts (new)
- components/message.tsx (render mapping)
- app/(chat)/api/chat/route.ts (tool registration)

## Risks & Mitigations
- Risk: Model may not call the tool reliably. Mitigation: Use a strong description; future work can extend prompts.
- Risk: UI may need interactivity/state later. Mitigation: Component is modular for future enhancements.

## Validation
- Manual: Ask for “company data” or similar; confirm the `quickCompanyFilters` tool is invoked and the card renders.
- Visual: Ensure styles match design and align with existing UI components.

## Rollout / Rollback
- Rollout: Already gated by the model choosing to call the tool; no flags necessary.
- Rollback: Remove the import/registration and the message mapping.

## Links
- Weather tool pattern: `lib/ai/tools/get-weather.ts`, `components/weather.tsx`, usage in `components/message.tsx`.

