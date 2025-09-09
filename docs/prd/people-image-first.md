# PRD: People — Image-First Ordering

## Context
Users want people profiles with a profile image to appear first. Today, people results are unsorted, so entries without images can dominate the top of the list.

## Goals / Non-goals
- Goal: Default-order people results so profiles with a non-empty `profile_image_url` appear first.
- Goal: Apply consistently across artifact creation, pagination, and demo flows.
- Non-goal: Add a full UI control for toggling this behavior (can be a follow-up).

## Scope & Assumptions
- Applies to: `artifacts/people` creation and update, `/api/cerch/people` initial and `.../next` pagination routes.
- Assumes the normalized schema includes `profile_image_url` for people.

## Approach
- Add a reusable helper `sortPeopleByImage(rows)` in `lib/providers/sort.ts`.
- Use it in:
  - `lib/providers/aggregatePeople` (covers artifact create/update flows).
  - `/api/cerch/people` and `/api/cerch/people/next` (covers demo + provider-backed API routes).
- Update demo rows to include a couple of sample profile image URLs and sort them, so the demo also shows image-first ordering.

## Impacted Areas
- `lib/providers/sort.ts` (new)
- `lib/providers/index.ts` (aggregatePeople)
- `app/(chat)/api/cerch/people/route.ts`
- `app/(chat)/api/cerch/people/next/route.ts`

## Risks & Mitigations
- Risk: Unexpected reordering relative to provider ranking.
  - Mitigation: Only a stability-preserving, shallow sort on the boolean presence of `profile_image_url`.
- Risk: Placeholder/invalid image URLs could still be treated as “has image”.
  - Mitigation: Trim/ignore empty, `null`, and `undefined` strings; further heuristics can be added later if needed.

## Validation
- Manual: Create a People artifact via chat and via the People demo buttons. Confirm rows with `profile_image_url` appear first.
- Pagination: Use “Find more results” and confirm the appended chunk is also image-first within its chunk.

## Rollout / Rollback
- Rollout: Default-on; no flags required.
- Rollback: Remove the helper calls and demo image URLs; behavior returns to provider order.

## Links
- Code: `lib/providers/sort.ts`, `lib/providers/index.ts`, `app/(chat)/api/cerch/people/*`.
