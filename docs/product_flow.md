# Cerch AI Product Flow

This document captures how Cerch AI stitches the Vercel Chat SDK, artifact system, and Crustdata integrations together to power people/company discovery.

## 1. End-to-End Flow
1. **User prompt** enters via the chat UI and posts to `POST /app/(chat)/api/chat/route.ts`.
2. The route handler authenticates the session, enforces daily limits, and persists the user message (Drizzle + Postgres).
3. We hydrate the Vercel Chat SDK (`streamText`) with:
   - **System prompt** from `lib/ai/prompts.ts` (guides tool usage + artifact behavior).
   - **Model provider** from `lib/ai/providers.ts`, backed by `@ai-sdk/openai` (GPT-5 family).
   - **Tools**: `createDocument`, `updateDocument`, `requestSuggestions`, `peopleFilters`, `companyFilters`, `gmailQuery`, `getWeather`.
4. The streaming response is piped through resumable streams; tool invocations emit structured events consumed by the UI.
5. When a tool returns an artifact payload, we persist it with `saveDocument` and surface it in the chat sidebar via `components/artifact.tsx`.
6. Users can iterate on artifacts (update, suggestion review) or run additional searches via People/Company filter cards.

## 2. Chat & Tooling Stack
- **Chat SDK**: Vercel’s `ai` package provides `createDataStream`, `streamText`, resumable buffering, and tool invocation plumbing.
- **Auth & Limits**: `auth()` from `app/(auth)/auth` establishes the user; `entitlementsByUserType` gates daily usage.
- **Error handling**: `ChatSDKError` (`lib/errors.ts`) maps codes → localized messages; handled in the chat route and downstream API routes.
- **Persistence**: `lib/db/queries.ts` saves chats, messages, stream IDs, and documents. CSV artifacts are stored in Postgres for future retrieval.

## 3. Artifact Lifecycle
- Server handlers live under `artifacts/<kind>/server.ts` with `createDocumentHandler` from `lib/artifacts/server`.
- Each handler orchestrates provider calls, streams intermediary statuses (`status`, `sheet-delta`) and returns final CSV or text.
- Client renderers under `artifacts/<kind>/client.tsx` map streamed parts to UI widgets (tables, editors, etc.).
- Artifacts persist versions; users reopening a chat triggers `setArtifact` hooks to reload the latest state.

## 4. Crustdata Integrations
### Providers & Auth
- Provider helpers: `lib/providers/crustdata/client.ts` exports `crustPeopleProvider`, `crustCompanyProvider`, `getRemainingCredits`, and `isCrustConfigured()` (reads cookie/env token).
- Requests use `Authorization: Token <token>` via `fetchWithTimeout`; base URL defaults to `https://api.crustdata.com` (configurable with `CRUSTDATA_API_BASE`).
- Required env vars: `CRUSTDATA_API_TOKEN` (or cookie `crustdata-api-token`), optional `CRUSTDATA_PEOPLE_PATH`, `CRUSTDATA_COMPANY_SEARCH_PATH`.

### People Search
- Endpoint: defaults to `POST /screener/persondb/search/` with `{ filters, limit, cursor }` (Crustdata people discovery).
- `buildPeopleSearchQuery` (`lib/providers/crustdata/people-filters.ts`) maps UI specs → Crustdata filter DSL, synthesising `and`/`or` operator trees (titles, company, region, languages, skills, experience, size) and keyword fallbacks directly against the persondb schema.
- `crustPeopleProvider.getPeople()` normalizes results via `normalizePeopleRows`, retains `next_cursor`, and logs debug info when `DEBUG_CRUSTDATA=true`.
- Routes:
  - `POST /api/cerch/people`: orchestrates artifact creation, caching, and chat message stitching.
  - `POST /api/cerch/people/next`: paginates using the saved cursor/spec.
- UI: `components/people-filters-card.tsx` collects filters, shows inline errors, invokes the route, and opens the resulting artifact via `useArtifact()`.

### Company Search
- Endpoint: `POST /screener/company/search` (AI-assisted discovery). When filters are absent we fall back to `gpt_prompt` queries.
- `crustCompanyProvider.getCompanies()` converts filters to Crustdata’s schema (region/industry/headcount) and normalizes with `normalizeCompanyRows`.
- Route `POST /api/cerch/company` persists CSV artifacts and supports demo data when the token is missing.

### Auxiliary APIs
- **Credits**: `getRemainingCredits()` calls `GET /user/credits` for display on `/credits` and chat layout.
- **Enrichment**: `enrichPeopleBasicProfile()` wraps `GET /screener/person/enrich/basic_profile` for profile expansions.

## 5. UI Touchpoints
- **Chat thread**: `components/message.tsx` renders assistant messages, tool call cards, and the People Filters card inside the conversation.
- **Filters card**: Debounced fetch → `/api/cerch/people`; on success persists artifact metadata (cursor/spec/limit) for pagination.
- **Artifacts table**: `components/artifact.tsx` + sheet renderer show normalized CSV output with pagination and export.
- **Credits badge**: `app/(chat)/layout.tsx` loads `getRemainingCredits()` to remind users about Crustdata usage.

## 6. Error & Resiliency Strategy
- Missing tokens: `isCrustConfigured()` gates live calls; routes fall back to seeded demo datasets and return actionable errors when configuration is absent.
- OpenAI key: `lib/ai/providers.ts` expects `OPENAI_API_KEY` (or per-request `apiKey`) to instantiate models; the chat route surfaces explicit `ChatSDKError` codes.
- Network & API failures: Providers log context-tagged errors, return `{ rows: [], source: 'crustdata' }`, and the UI displays “No profiles found” with next steps.
- Debugging: Set `DEBUG_CRUSTDATA=true` to log payload hints, response keys, and normalization counts without leaking secrets.

## 7. Data Persistence & Credits
- Documents saved via `saveDocument` include `creditCost` metadata from providers (currently an estimated 0 placeholder, ready for future tracking).
- `peopleCache` in `/api/cerch/people` caches latest artifact IDs per user/spec to avoid duplicate writes.
- Cursor-based pagination enables incremental fetching while respecting Crustdata rate limits.

## 8. External References
- Crustdata docs shipped with the repo under `Crustdata_docs/` for people, company, filters, and credits.
- Additional PRDs cover evolution paths: `docs/prd/people-filters-v2.md`, `docs/prd/company-crustdata-integration.md`.
- For architecture and component breakdown, see `docs/repo-structure.md` and `docs/components.md`.
