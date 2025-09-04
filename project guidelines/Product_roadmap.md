# PRD: Crustdata Integration, GPT-5 Tool Calling, and Artifacts

## Summary
- Purpose: Enable high‑quality People and Company discovery via Crustdata, surfaced as live, editable artifacts alongside chat.
- Scope: Current flow walkthrough, issues found, and a roadmap to harden the Crustdata integration, clarify GPT‑5 function calling behavior, and ensure artifact UX is robust.

## Goals
- Reliable Crustdata queries for People and Company artifacts with consistent data shaping to CSV for UI.
- Clear, observable tool‑calling by GPT‑5 with strong guardrails and error handling.
- Smooth artifact streaming, persistence, and versioning.

## Non‑Goals
- Building a complete filter UI for Crustdata (autocomplete, saved filters) in this phase.
- Advanced deduping/merging across multiple providers.

## Current Architecture & Flow

### 1) Chat Request Lifecycle
- Entry: `POST /app/(chat)/api/chat/route.ts` (Next.js Route Handler).
- Auth & limits: user session validated; daily message cap checked via Drizzle/Postgres.
- System prompt: Combines a regular assistant prompt with “artifacts” guidance (`lib/ai/prompts.ts`).
- Model selection: `lib/ai/providers.ts` maps to OpenAI via `@ai-sdk/openai`:
  - `chat-model` → `gpt-5`
  - `chat-model-reasoning` → `gpt-5-reasoning` with extracted reasoning traces
  - `artifact-model` → `gpt-5` (used to generate artifact content)
- Streaming: Uses `ai` SDK `streamText` with resumable streams and message persistence.

### 2) GPT‑5 Function Calling (Tools)
- Tools are registered in `app/(chat)/api/chat/route.ts` under `tools` and enabled via `experimental_activeTools` (disabled for reasoning model).
- Implemented tools (wrapping `ai` SDK’s `tool` helper):
  - `createDocument` (`lib/ai/tools/create-document.ts`)
  - `updateDocument` (`lib/ai/tools/update-document.ts`)
  - `requestSuggestions` (`lib/ai/tools/request-suggestions.ts`)
  - `getWeather` (example tool)
  - `gmailQuery` (OpenAI Responses/Gmail example)
- Call/Result Display: Tool invocations and results render in `components/message.tsx`.
- Guardrails: Each tool validates arguments via `zod` schemas and writes structured stream parts (e.g., `kind`, `id`, `title`, `text-delta`, `sheet-delta`, `finish`).

### 3) Artifacts Pipeline
- Registry: `lib/artifacts/server.ts` exports `documentHandlersByArtifactKind` mapping kinds → server handlers.
- Creation Flow (createDocument):
  1. GPT calls `createDocument(kind, title)`.
  2. Handler’s `onCreateDocument` generates initial content and streams it (e.g., CSV for tables).
  3. `createDocumentHandler` persists a version to DB via `saveDocument`.
- Update Flow (updateDocument): Similar, but loads the latest document then rewrites/updates.
- Client UX: `components/artifact.tsx` renders artifact UI; artifacts define client config under `artifacts/*/client.tsx` with `onStreamPart` updating the UI in real time. CSV is shown in `WebsetTable`.
- Versioning: Document versions saved in `document` table; UI supports previous/next version navigation.

### 4) Crustdata Integration (Current Implementation)
- Provider code: `lib/providers/crustdata/client.ts`.
  - Config: `CRUSTDATA_API_BASE` (default `https://api.crustdata.com`), `CRUSTDATA_API_TOKEN` (or legacy `CRUSTDATA_API`).
  - HTTP helpers: `crustFetch`, `crustPost` add `Authorization: Token <token>`.
  - Credits: `getRemainingCredits()` calls `GET /user/credits`; shown in `app/(chat)/layout.tsx` and `app/credits/page.tsx`.
  - People Provider (`crustPeopleProvider.getPeople`):
    - Endpoint: `POST ${API_BASE}${PEOPLE_PATH}`, where `PEOPLE_PATH` defaults to `/screener/persondb/search/`.
    - Builds an `op/conditions`-style filter block from `SearchQuery` and POSTS `{ filters, limit }`.
    - Response normalization: `normalizePeopleRows` coerces rows into a fixed schema (name/title/company/linkedin_url/etc.).
  - Company Provider (`crustCompanyProvider.getCompanies`):
    - Endpoint: `POST /screener/screen/`.
    - If only `q` provided → sends `{ gpt_prompt: q, count }` (Crustdata AI search).
    - Else builds `filters: { op: 'and', conditions: [...] }` and posts `{ filters, count }`.
    - Normalization: `normalizeCompanyRows` (name/industry/company_url/linkedin_url/location/size/funding/logo_url/description).
- Artifact handlers for these providers:
  - People: `artifacts/people/server.ts` → `aggregatePeople()` with `[crustPeopleProvider]` → `toCSV()` → stream `sheet-delta`.
  - Company: `artifacts/company/server.ts` → `aggregateCompanies()` with `[crustCompanyProvider]` → `toCSV()` → stream `sheet-delta`.

## Issues & Gaps Observed
- People endpoint/schema mismatch:
  - Current code posts to `/screener/persondb/search/` with `{ filters: { op, conditions }, limit }` and `column` expressions. Crustdata’s documented People Search uses `/screener/person/search` and expects a different payload shape (array of `{ filter_type, type, value }`) and pagination via `page` for synchronous searches.
  - Using `limit` for People sync searches is not per docs; sync recommends `page` (25 results/page). `limit` is intended for async/background jobs.
- Default paths and operators:
  - Company path (`/screener/screen/`) looks correct and uses `op/conditions` with operators like `(.)`, `=>`, `=<` (per docs).
  - People operators + fields should map to documented `filter_type` values (e.g., CURRENT_TITLE, CURRENT_COMPANY, REGION/LOCATION) rather than freeform `column` names.
- Config discoverability:
  - `.env.example` doesn’t document `CRUSTDATA_API_BASE` or `CRUSTDATA_API_TOKEN`.
- Error clarity:
  - Errors throw generic `Crust Data request failed: <status>`. Response body isn’t surfaced in logs, making it hard to diagnose schema/endpoint mismatches.
- Minor:
  - `aggregatePeople/Companies` return `source: 'llm'` even when sourcing Crustdata; cosmetic, but confusing for telemetry.
  - No explicit request timeout; long-running searches can hang the UI feedback.

## Roadmap & Deliverables

### Milestone 1 — Fix People API Integration (Sync Search)
- Default to In‑DB `POST /screener/persondb/search/` for higher caps (can fetch more; we’re using `limit: 100` now).
- Keep support for realtime `POST /screener/person/search` via `CRUSTDATA_PEOPLE_PATH` override (uses `{ filter_type, type, value }` + `page`).
- Acceptance criteria:
  - People artifact returns non-empty rows for common queries using the In‑DB endpoint.
  - Clear debug logs are printed during local testing.

### Milestone 2 — Observability & Robustness
- Add structured debug logs (non‑prod) in Crustdata client: method, path, payload preview, status, duration; include response snippet for errors.
- Add artifact‑level logs (People/Company) to show query and returned row counts.
- Plan for timeouts and user feedback; not yet implemented.
- Acceptance criteria:
  - Failures show status + short diagnostic; logs identify path and payload preview.

### Milestone 3 — Async People Jobs (Optional, if needed >500)
- Support `background_job=true` + `limit` for large pulls (up to 10k), poll with `job_id`.
- Stream partial data as ready, then hydrate final results.
- Acceptance criteria:
  - Ability to fetch >500 profiles with progress; resilient to intermittent failures.

### Milestone 4 — Credits & Cost Awareness
- Set estimated `creditCost` from returned row counts and Crustdata pricing guidance (e.g., 1 credit per company row). Show per-request usage in UI badges.
- Add safeguards in People/Company handlers to respect daily caps.
- Acceptance criteria:
  - Credit estimate visible in debug/telemetry; optional UI indicator near the artifact.

### Milestone 5 — DX & Configuration
- Update `.env.example` with:
  - `CRUSTDATA_API_BASE`, `CRUSTDATA_API_TOKEN`
  - Optional overrides: `CRUSTDATA_PEOPLE_PATH`, `CRUSTDATA_COMPANY_DISCOVERY_PATH`
  - `CRUSTDATA_DEBUG` to enable verbose local logs
- Add quick “smoke test” scripts for credits, people, and company endpoints. (Pending)
- Acceptance criteria:
  - New dev can configure and run an end‑to‑end artifact generation in <10 minutes.

### Milestone 6 — Testing
- Add Playwright flows for People/Company artifact creation from suggested prompts.
- Add mocked route tests (network disabled) with captured fixtures to validate CSV streaming and persistence.
- Acceptance criteria:
  - E2E reliably passes; CSV columns stay consistent for core flows.

## Data Contracts (Current vs. Target)
- Company Discovery (current): `POST /screener/screen/` with `{ filters: { op, conditions }, count }` or `{ gpt_prompt, count }`; normalize to columns: name, industry, company_url, linkedin_url, location, size, funding, logo_url, description, tags.
- People Search (target): `POST /screener/person/search` with `{ filters: [ { filter_type, type, value } ], page }` for sync; normalize to columns: name, title, company, industry, location, linkedin_url, website, profile_image_url, description, tags.

### Supported People Endpoints
- In‑DB (default): `POST /screener/persondb/search/`. Payload uses `{ filters: { op, conditions }, limit }`. We currently default to `limit: 100`.
- Realtime: `POST /screener/person/search` (optional via `CRUSTDATA_PEOPLE_PATH`). Payload uses `filter_type` array and `page` for sync (≤25). Our client maps common filters and `q` → `KEYWORD` when this mode is selected.

## Security & Configuration
- Required env vars: `OPENAI_API_KEY`, `POSTGRES_URL`, `AUTH_SECRET`, `CRUSTDATA_API_TOKEN`. Optional: `CRUSTDATA_API_BASE`.
- Do not log secrets. Avoid logging full payloads; include minimal hints for debugging.

### Auth & DB Setup (Dev)
- Ensure `POSTGRES_URL` is set in `.env.local` and the database is reachable.
- Run migrations before logging in: `pnpm db:migrate` (or `pnpm build`). The migration script attempts to enable `pgcrypto` automatically.
- If auth errors mention database queries, watch server logs for `[DB]` messages. The code now logs helpful hints when `POSTGRES_URL` is missing and uses a shorter DB connect timeout.

### Resumable Streams (Redis) Setup
- Resumable streaming is optional and uses Redis via `resumable-stream`.
- If `REDIS_URL` is missing or Redis is unreachable (e.g., ENOTFOUND/ECONNREFUSED), the app now logs a single line and falls back to non‑resumable streaming automatically.
- For local testing, either:
  - unset `REDIS_URL` to avoid connection attempts, or
  - point `REDIS_URL` to a reachable local/remote Redis instance.

## Open Questions
- Confirm whether `/screener/persondb/search/` is a private/legacy endpoint and whether it accepts the current `op/conditions` format. If not, migrate to `/screener/person/search`.
- Confirm `filter_type` mappings for languages/connections and other advanced facets.
- Do we want to cap default counts (e.g., 25 companies) to respect credits by default?

## File Map & Key References
- Crustdata providers: `lib/providers/crustdata/client.ts`
- Aggregation: `lib/providers/index.ts`
- Normalization: `lib/providers/normalize.ts`
- Tool wiring: `app/(chat)/api/chat/route.ts`
- Tools: `lib/ai/tools/*`
- Artifacts server handlers: `artifacts/*/server.ts`
- Artifacts client configs: `artifacts/*/client.tsx`
- System prompts: `lib/ai/prompts.ts`
- Credits surfaces: `app/(chat)/layout.tsx`, `app/credits/page.tsx`

## Recent Updates
- Switched default People endpoint to `/screener/persondb/search/` with `limit: 100`; realtime `/screener/person/search` remains available via env override.
- Added structured debug logs in Crustdata client (GET/POST start, ok/error, duration, payload/response snippets) gated by `CRUSTDATA_DEBUG` or non‑prod.
- Added artifact‑level logs (People/Company) to show query and returned row counts.
- Updated `.env.example` with Crustdata vars, People path default (`/screener/persondb/search/`), and `CRUSTDATA_DEBUG`.
- Auth/DB: Added DB connect timeout, clearer `[DB]` logs, automatic `pgcrypto` enable during migrations.
- Auth: Restored `authorize` to original template behavior (removed custom try/catch logging).
- DB Schema: Added migration `0007_fix_chat_schema.sql` to align `Chat` table with code (adds `title`, drops deprecated `messages`). Run `pnpm db:migrate`.
- Small hardening: skip sending `filters` when empty to reduce 400s.
