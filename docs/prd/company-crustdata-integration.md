# Company Artifact: Crustdata Integration + Debugging

Status: Implemented (parsing + debug logs)

## Context
Users request company datasets (e.g., “B2B SaaS companies in the USA with headcount 50–500 founded after 2015”). We want to fetch results from Crustdata and render them as a Company artifact (CSV table), with visibility into the full flow for debugging.

## Goals / Non-goals
- Goals:
  - Parse freeform company queries into structured filters (industry, HQ/country, size, year_founded).
  - Call Crustdata Company Discovery API and stream normalized results into the artifact.
  - Add debug logs to trace provider requests/responses and artifact streaming.
- Non-goals:
  - Deep NLP understanding of industries/regions (simple heuristics only).
  - UI for persisting or editing complex filter state.

## Scope & Assumptions
- Surfaces: Company artifact server, providers (Crustdata client), aggregation, and table rendering.
- Assumes Crustdata env vars are configured (`CRUSTDATA_API_TOKEN`, optional base and paths).
- Debug controlled by `DEBUG_CRUSTDATA=true`.

## Approach
- Add `parseCompanyQuery(text)`:
  - Extracts: `industry`, `hq`/`country`, `size_min/size_max` (supports ranges like `50-500`), `year_founded_min/max` (supports phrases like “after 2015”).
- Update `artifacts/company/server.ts`:
  - Use `parseCompanyQuery` in create/update flows.
  - Add logs for parsed queries, provider result counts, and streamed CSV length.
- Update `lib/providers/crustdata/client.ts` (company):
  - Add logs for POST payload characteristics, response keys, normalized row count, and error messages.
- Update `artifacts/company/client.tsx` and table behavior:
  - Pass `variant="company"` to `WebsetTable` with `autoHideEmptyColumns` and `hideImageUrlColumns` enabled (cleaner view; avatars can still show if logos are available).

## Impacted Areas
- `lib/providers/parse.ts` (new: `parseCompanyQuery`)
- `artifacts/company/server.ts` (use parser + logs)
- `lib/providers/crustdata/client.ts` (company logs)
- `artifacts/company/client.tsx` (table variant and options)

## Risks & Mitigations
- Risk: Heuristic parsing may mislabel filters. Mitigation: `q` still passes through; provider supports `gpt_prompt` when only natural language is provided.
- Risk: Missing env vars leading to empty results. Mitigation: Error logs and `DEBUG_CRUSTDATA` tracing.
- Risk: Column mismatch across rows. Mitigation: Normalization step and auto-hide empty columns.

## Validation
- Enable `DEBUG_CRUSTDATA=true`.
- Ask: “B2B SaaS companies in the USA with LinkedIn headcount 50–500, founded after 2015.”
  - Expect logs (`[CRUSTDATA:COMPANY]`, `[CRUSTDATA:CLIENT]`) with parsed filters, POST payload info, and row counts.
  - Company artifact shows a CSV table with data. Empty columns and logo URL columns are hidden.

## Rollout / Rollback
- Rollout: No flags; logs gated by env var.
- Rollback: Revert changes to the affected files; parser is isolated.

## Links
- People integration PRD: `docs/prd/people-crustdata-integration.md`
- Providers: `lib/providers/crustdata/client.ts`, `lib/providers/parse.ts`
- Artifacts: `artifacts/company/server.ts`, `artifacts/company/client.tsx`

