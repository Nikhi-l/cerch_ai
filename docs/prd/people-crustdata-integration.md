# People Artifact: Crustdata Integration + Debugging

Status: Implemented (parsing + debug logs)

## Context
Users ask for people data (e.g., “find me software developers in sfs”). The desired behavior is to fetch people from Crustdata using appropriate filters and display the results in the People artifact (CSV table view). The flow existed but was unreliable and lacked debugging visibility.

## Goals / Non-goals
- Goals: 
  - Parse freeform people queries into structured filters (role + location) when creating/updating a People artifact.
  - Call Crustdata People API with filters and stream results to the artifact.
  - Add robust debug logs to trace requests and responses.
- Non-goals:
  - Complex NLP parsing; we implement a conservative heuristic only.
  - Persisting selected filters in UI or adding advanced UI interactions.

## Scope & Assumptions
- Surfaces: Artifact server for `people`, providers (Crustdata client), and aggregation.
- Assumes env vars are configured for Crustdata (`CRUSTDATA_API_TOKEN`, etc.).
- Debugging is controlled by `DEBUG_CRUSTDATA=true` in the environment.

## Approach
- Add a parser `lib/providers/parse.ts` to extract `region` and `title` from text (supports 'sf/sfs/sfo/san francisco', 'nyc', etc.; matches common dev titles).
- Update `artifacts/people/server.ts` to use the parser, log parsed queries, provider counts, and streamed CSV length.
- Add debug logging to `lib/providers/crustdata/client.ts` around POST payload, response keys, and normalized row counts.
- Add aggregation-level logs in `lib/providers/index.ts` and light logs in `createDocument`/`updateDocument` for traceability.

## Impacted Areas
- `lib/providers/parse.ts` (new)
- `artifacts/people/server.ts` (updated)
- `lib/providers/crustdata/client.ts` (updated)
- `lib/providers/index.ts` (updated)
- `lib/ai/tools/create-document.ts` (updated)
- `lib/ai/tools/update-document.ts` (updated)

## Risks & Mitigations
- Risk: Heuristic parsing may miss locations/roles. Mitigation: Query `q` still passes through; Crustdata OR matches help retrieve relevant results.
- Risk: Logging sensitive info. Mitigation: We never log tokens; logs are gated by `DEBUG_CRUSTDATA`.
- Risk: API shape differences. Mitigation: Robust `extractArray` and normalization already in place; logs added to inspect response keys.

## Validation
- Set `DEBUG_CRUSTDATA=true` and request: “find me software developers in sfs”.
  - Expect logs for parsed query (region 'San Francisco', title 'software developer' or 'software engineer').
  - Observe provider POST log and normalized rows count.
  - People artifact should render a CSV table with results.

## Rollout / Rollback
- Rollout: No flags; debug logging controlled by env var.
- Rollback: Revert changes to the affected files; parser is isolated.

## Links
- Artifacts architecture: `docs/repo-structure.md`
- People artifact: `artifacts/people/server.ts`, `artifacts/people/client.tsx`
- Crustdata provider: `lib/providers/crustdata/client.ts`

