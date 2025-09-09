# PRD: People Filters v2 (Crustdata‑compliant)

## Context
- Current people flow mixes heuristic parsing with partial filter mapping. Inconsistent prefill and occasional chat text leakage reduce confidence.
- Crustdata People Discovery API expects a structured `filters` object with nested conditions, operators (`=`, `!=`, `in`, `not_in`, `>`, `<`, `=>`, `=<`, `(.)`), and array semantics. We must build this exactly rather than sending free‑form `q`.
- We have docs for: People Discovery API, Filters Autocomplete (region/title/industry/school), and examples for nested employers/education.
- Goals: deterministic, documented filter building; crisp UI with canonical suggestions; background fetch; artifact shown only on success.

## Goals / Non‑Goals
- Goals:
  - Build compliant filter payloads for `/screener/persondb/search/` using Crustdata’s schema.
  - Prepopulate the filter UI from the user query; canonicalize via Autocomplete.
  - Run background search (no chat text), show people artifact only when rows exist, otherwise short inline message.
  - Keep code modular, concise, and easy to test.
- Non‑Goals:
  - Multi‑provider expansion or offline fallback.
  - Replacing Company flow (can mirror later).

## Scope & Assumptions
- Surfaces: PeopleFiltersCard, background route (`/api/cerch/people`), provider client, prompt guidance.
- Dependencies: Crustdata token and credits; Drizzle Postgres for document persistence; SWR for UI state.
- Assumption: We can call Filters Autocomplete without credits; throttle to avoid spam.

## Filter Model (UI → FilterSpec → Crust Filters)
- UI FilterState (subset, all optional):
  - `region: string` (canonicalized if possible)
  - `title: string | string[]` (tokenized OR list)
  - `company: string`
  - `skills: string` (free text)
  - `languages: string | string[]` (OR list)
  - `min_connections: number`
  - `experience_bucket: enum('Less than 1 year','1 to 2 years','3 to 5 years','6 to 10 years','More than 10 years')`
  - `employer_size_min/max: number` (headcount)
  - `industry: string | string[]`
- FilterSpec → Crust filters (People Discovery In‑DB):
  - Wrap with `{ op: 'and', conditions: [...] }`.
  - Column mapping:
    - `region` → `{ column: 'region', type: '(.)', value }`
    - `title` → OR list → `{ op: 'or', conditions: [{ column: 'current_employers.title', type: '(.)', value }, ...] }`
    - `company` → `{ column: 'current_employers.name', type: '(.)', value }`
    - `skills` → `{ column: 'skills', type: '(.)', value }`
    - `languages` → `{ column: 'languages', type: 'in', value: string[] }`
    - `min_connections` → `{ column: 'num_of_connections', type: '=>', value: number }`
    - `experience_bucket` → map to `years_of_experience_raw` min (0|1|3|6|10) with `=>`
    - `employer_size_min/max` → `current_employers.company_headcount_latest` with `=>` / `=<`
    - `industry` → `all_employers.company_industries` with `in` (string[])
  - Array semantics:
    - Ensure ANDed conditions on the same nested prefix (e.g., `current_employers`) apply within a single object where intended; otherwise, use OR across separate objects.
  - No `q` when any filters exist (avoid over‑constraining).

## Canonicalization & Autocomplete
- Integrate Filters Autocomplete API:
  - GET `/screener/linkedin_filter/autocomplete?filter_type=region|title|industry|school&query=...&count=...`
- UI behavior:
  - Region & Title inputs show suggestions (debounced, min 2 chars, max 8 per request, on blur lock selection).
  - On initial prefill, canonicalize region/title asynchronously and replace value if a top suggestion matches; keep original if not.
  - Languages: split by comma or `|`; trim and dedupe.
- Throttling: 200–300ms debounce, abort previous requests, max 8 suggestions, ignore empty query.

## Background Flow
- PeopleFiltersCard:
  - Prefill from tool result (inferredFilters), then attempt canonicalization.
  - Single button: “Cerch now”.
  - On click → POST `/api/cerch/people` with `{title, baseQuery, filters}`.
  - Show loading bar; on success, open artifact; on zero results, show concise inline text.
- Server route `/api/cerch/people`:
  - Build FilterSpec → Crust filters using a dedicated FilterBuilder.
  - Call People Discovery with `{ filters, limit }`.
  - Persist CSV and return `{ ok, id, title }` or `{ ok:false, error }`.

## Implementation Plan
1) Add FilterBuilder
- File: `lib/providers/crustdata/people-filters.ts`
- Exports: `buildPeopleFilters(spec: FilterSpec): CrustFilters` plus helpers to group OR/AND, normalize arrays, and map experience buckets.

2) UI Autocomplete
- Files: `lib/providers/crustdata/client.ts` (already has autocomplete helpers), `components/people-filters-card.tsx` (wire debounced suggestions for region/title/industry).
- Add small `hooks/use-debounced-autocomplete.ts` (optional) or inline debounce.

3) Server Route
- File: `app/(chat)/api/cerch/people/route.ts` (exists)
- Replace/adapt current `buildPeopleQuery` usage with FilterBuilder for structured filters. Keep a fallback `(.)` on headline if user provided only base text and no UI filters.

4) Prefill + Canonicalization
- Files: `lib/providers/parse.ts` (extraction: region/title/company; conservative), `components/people-filters-card.tsx` (set initial state from result; run canonicalization for region/title after mount). Do not block UI on autocomplete.

5) Prompt Guidance (minor)
- File: `lib/ai/prompts.ts`: ensure the assistant uses `peopleFilters` first for people queries; keep responses concise, no extra text after the card.

6) Error Handling & Observability
- Provide clear messages for 401/403 (token/credits), network timeouts, and zero results.
- Gate debug logs behind `DEBUG_CRUSTDATA`.

## Edge Cases
- Mixed roles (“SWE or SRE”): split into titles → OR block.
- Company name embedded in lowercase (“google employees”): title‑case without over‑normalizing acronyms.
- Region free text misspelled: keep `(.)` fuzzy match even if autocomplete fails.
- Languages and industries as CSV: split, trim, dedupe; cap list length.
- Employer size provided only as max or min: include single‑sided comparison.
- Multiple array‑field conditions on employers: if intent suggests same employer, AND; else use OR cautiously.

## Validation
- Unit tests for FilterBuilder mapping (input FilterSpec → expected Crust filters), including:
  - OR titles, languages list, min/max ranges, experience buckets, nested employer conditions, and empty spec fallback.
- Route smoke tests: 200 with rows > 0 yields `{ok:true}`; zero rows `{ok:false}`.
- E2E flows:
  - “tech folks at Google in SF” → prefilled company/region → artifact with rows.
  - “SREs in NYC 6+ years” → title OR + region + exp → rows.

## Rollout / Rollback
- Rollout incrementally behind a small feature flag in PeopleFiltersCard (default ON).
- Rollback: switch builder usage off, revert to existing aggregation path.

## Impacted Areas
- `components/people-filters-card.tsx` (autocomplete + canonicalize; no chat leakage)
- `lib/providers/crustdata/people-filters.ts` (new FilterBuilder)
- `app/(chat)/api/cerch/people/route.ts` (use FilterBuilder)
- `lib/providers/parse.ts` (prefill extraction)
- `lib/ai/prompts.ts` (tool guidance)

## Risks & Mitigations
- Over‑constrained queries → retain `(.)` fuzzy and allow user to loosen filters.
- Autocomplete latency → non‑blocking; debounce and cache suggestions.
- Provider 401/403 → explicit UI message; do not show empty artifact.

## Code Changes (Concise & Separate)
- Add: `lib/providers/crustdata/people-filters.ts` (FilterBuilder)
- Update: `/api/cerch/people` to use FilterBuilder
- Update: `components/people-filters-card.tsx` for autocomplete + canonicalization
- Update: `lib/ai/prompts.ts` minimal guidance
- Tests: unit tests under `lib/providers/__tests__/people-filters.spec.ts`

## Links
- Crustdata People Discovery API docs (repo: `Crustdata_docs/Crustdata_people_api_docs `)
- Filters Autocomplete API (repo: `Crustdata_docs/Crustdata_filter_docs`)
- Existing PRD: `docs/prd/people-filters-card.md`
