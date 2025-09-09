# PRD: Pass append helper to artifact messages

## Context
The build failed because `PreviewMessage` requires an `append` helper, but `ArtifactMessages` didn't forward it. This prevented artifact chats from rendering in production.

## Goals / Non-goals
- Goals:
  - Include the `append` helper in `ArtifactMessages` and its call site.
- Non-goals:
  - Refactor message rendering or chat helpers beyond wiring the missing prop.

## Scope & Assumptions
- Affects artifact chat rendering in `components/artifact-messages.tsx` and its usage in `components/artifact.tsx`.
- Assumes `append` remains a stable callback from `useChat`.

## Approach
- Add an `append` prop to `ArtifactMessages` and pass it through to each `PreviewMessage`.
- Update the `ArtifactMessages` usage in `artifact.tsx` to supply `append`.

## Impacted Areas
- `components/artifact-messages.tsx`
- `components/artifact.tsx`

## Risks & Mitigations
- **Risk:** Missing `append` could reappear if API changes.
  - **Mitigation:** Type definitions enforce the prop; build will fail if omitted.

## Validation
- Run `pnpm lint` and `pnpm test`.
- Verify build succeeds locally.

## Rollout / Rollback
- Rollout: merge and deploy.
- Rollback: revert commit.

## Links
- Related build error: property 'append' missing in `PreviewMessage`.
