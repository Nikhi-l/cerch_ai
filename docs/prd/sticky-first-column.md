# PRD: Sticky First Column for People/Company Tables

## Context
People and Company artifacts render wide, scrollable tables. The first data column is the entity name (often with an avatar). Scrolling horizontally moves the entire table, making row identification harder.

## Goals / Non-goals
- Goal: Keep the first data column (Name) sticky during horizontal scroll for People and Company artifacts.
- Non-goal: Change column order, add reordering, or affect other artifact types.

## Scope & Assumptions
- Applies only to tables rendered by `WebsetTable` when `variant` is `people` or `company`.
- Assumes the CSV headers start with `name` for these variants (current server outputs do).

## Approach
- Add conditional sticky positioning to the Name header and cells.
- Offset the sticky Name column by the fixed index column width (48px).
- Keep existing styles, resizing, filtering, and export functionality unchanged.

## Impacted Areas
- `components/webset-table.tsx`
- Consumers: `artifacts/people/client.tsx`, `artifacts/company/client.tsx`

## Risks & Mitigations
- Risk: Overlapping z-index between index and name columns.
  - Mitigation: Use consistent backgrounds and z-index; keep index and name at `z-10`, with solid backgrounds.
- Risk: Columns hidden via UI may affect indices.
  - Mitigation: Stickiness applies specifically to the Name column; hidden columns are skipped as before.

## Validation
- Manually verify:
  - People and Company artifacts show Name column fixed when horizontally scrolling.
  - Index column remains sticky at far left.
  - Column resizing continues to work for Name and other columns.
  - Export/filters/search unaffected.

## Rollout / Rollback
- Rollout: Ship as default behavior for People and Company variants.
- Rollback: Remove the conditional sticky logic in `webset-table.tsx` and rebuild.

