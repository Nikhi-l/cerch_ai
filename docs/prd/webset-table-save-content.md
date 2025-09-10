# PRD: Optional onSaveContent in WebsetTable

## Context
The production build failed because `WebsetTable` called `onSaveContent` without receiving it as a prop, causing a TypeScript error.

## Goals / Non-goals
- Goals:
  - Allow `WebsetTable` to accept an optional `onSaveContent` handler and guard its usage.
  - Pass the handler from the people artifact so enrichment updates persist.
- Non-goals:
  - Refactor enrichment behavior beyond wiring the callback.

## Scope & Assumptions
- Impacts `components/webset-table.tsx` and its usage in `artifacts/people/client.tsx`.
- Assumes other artifacts remain read-only and need not provide the handler.

## Approach
- Extend `WebsetTableProps` with an optional `onSaveContent` function.
- Use optional chaining when invoking the handler after enrichment.
- Forward `onSaveContent` from the people artifact to `WebsetTable`.

## Impacted Areas
- `components/webset-table.tsx`
- `artifacts/people/client.tsx`

## Risks & Mitigations
- **Risk:** Missing handler could silently drop enrichment updates.
  - **Mitigation:** Enrichment button only meaningful when handler provided; optional chaining avoids runtime errors.

## Validation
- Run `pnpm lint` and eslint on touched files.
- Execute `pnpm test` and `pnpm run build` to ensure the build progresses past the previous failure.

## Rollout / Rollback
- Rollout: merge and deploy.
- Rollback: revert commit if issues arise.

## Links
- Related build error: `Cannot find name 'onSaveContent'` in `components/webset-table.tsx`.
