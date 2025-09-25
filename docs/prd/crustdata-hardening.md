# PRD: Crustdata Integration Hardening & Product Flow Docs

## Context
- Product demos rely on Vercel Chat SDK flows plus Crustdata people/company discovery, but the current integration returns empty results when tokens are missing, lacks actionable errors, and has fragile filter handling.
- Product and GTM teams requested a concise `product_flow.md` doc that maps the end-to-end experience (chat prompts → tool invocations → artifacts) so new contributors can understand how Cerch AI is assembled.
- Crustdata API docs (People, Company, Filters Autocomplete, Credits) highlight canonical endpoints, payload shapes, and error semantics we are not fully leveraging today (e.g., canonical filter values, pagination cursors, explicit 401 messaging).

## Goals / Non-Goals
- Goals:
  - Document the core Cerch AI product flow and Crustdata touchpoints in `docs/product_flow.md`.
- Ensure backend routes short-circuit when configuration is missing, emit precise error responses (missing OpenAI API key, Crustdata token, upstream errors), and preserve cursors.
 - Upgrade people/company filter handling to align with Crustdata docs, generating Crustdata-compliant operator trees (titles, regions, industries, skills, keywords) with user-facing feedback when zero rows are returned.
- Replace LinkedIn filters autocomplete dependency with direct `/screener/persondb/search` operator trees generated from query analysis, so filters are always explicit and portable.
- Non-Goals:
  - Building offline/demo datasets beyond the existing seeded CSVs.
  - Replacing the artifacts pipeline or adding new data providers.

## Scope & Assumptions
- Surfaces: `app/(chat)/api/chat`, `app/(chat)/api/cerch/*`, `components/people-filters-card.tsx`, `lib/providers/crustdata/*`, new `docs/product_flow.md`.
- Assumptions: Crustdata token stored via cookie/env; OpenAI key provided via env or per-request; all filtering handled through `/screener/persondb/search` without reliance on LinkedIn filter autocomplete.
- Dependencies: Chat SDK streaming, existing `toCSV` normalization, Drizzle persistence for documents/messages.

## Approach
1. Write `docs/product_flow.md` describing chat lifecycle, tool orchestration, artifact persistence, and Crustdata integrations (include diagrams-as-text and key endpoints from docs).
2. Update backend guards:
   - Validate OpenAI API key before invoking provider; throw a distinct `ChatSDKError` with actionable messaging.
   - Await `isCrustConfigured()` checks, bubble 401/403 details from Crustdata, and surface zero-result errors deterministically.
   - Ensure people/company routes return structured error payloads consumed by UI.
3. Enhance Crustdata provider & filters:
   - Normalize query builder to follow Crustdata filter schema and include cursor support.
   - Improve error logging/return shape, distinguishing between auth issues and empty datasets.
4. Upgrade People Filters UI:
   - Keep inputs lightweight (manual free text) while surfacing inline validation and result messaging.
   - Ensure artifact metadata stores cursor/spec for resumable pagination without background autocomplete calls.

## Impacted Areas
- Documentation: `docs/product_flow.md`, `docs/prd/crustdata-hardening.md` (this file).
- API routes: `app/(chat)/api/chat/route.ts`, `app/(chat)/api/cerch/people*`, `app/(chat)/api/cerch/company/route.ts`.
- Providers: `lib/providers/crustdata/client.ts`, `lib/providers/crustdata/people-filters.ts` (potential helpers), `lib/providers/types.ts` if new error signatures needed.
- UI: `components/people-filters-card.tsx`.

## Risks & Mitigations
- Risk: Surfacing detailed errors may leak sensitive info → sanitize messages (e.g., “Crustdata token missing” without echoing token), log details server-side only.
- Risk: Filter tightening could reduce result counts → keep fuzzy `(.)` matches and provide user guidance when zero rows returned.

## Validation
- Manual: Trigger chat without OpenAI key → expect clear error; perform people/company searches with and without Crustdata token → confirm fallback dataset + explicit messaging.
- Automated: Unit tests for `buildPeopleSearchQuery` covering titles/regions/languages/min-max; optional integration test for the query-parsing heuristics.
- UI smoke: Use People Filters card to run a search with manual filters (no autocomplete); verify artifact cursor metadata persists.

## Rollout / Rollback
- Rollout: Land documentation + backend safeguards first, then UI enhancements; feature toggles not required but debug logging controlled via `DEBUG_CRUSTDATA`.
- Rollback: Revert provider changes and UI updates; documentation additions remain harmless.

## Links
- Crustdata Docs: `/Crustdata_docs/Crustdata_people_api_docs `, `/Crustdata_docs/Crustdata_company_api_docs`, `/Crustdata_docs/Crustdata_filter_docs`, `/Crustdata_docs/crustdata_remaining_credits_api`.
- Existing PRDs: `docs/prd/people-filters-v2.md`, `docs/prd/company-crustdata-integration.md`.
- Repo: Cerch AI (Vercel Chat SDK + artifacts).
