# PRD: Integrations Dropdown in Artifact Header

## Context
Clicking the Integrations button in artifact headers navigated to the settings page. The desired UX is an inline dropdown (no navigation) that lists integrations with on/off toggles, similar to the Actions dropdown.

## Goals / Non-goals
- Goal: Replace navigation with a dropdown below the Integrations button showing available integrations and their active status via toggles.
- Non-goal: Implement backend persistence or billing gates. Local persistence is sufficient.

## Scope & Assumptions
- Scope: Artifact header only (`ArtifactIntegrations`).
- Assumptions: A default list of integrations is acceptable. Persist state in `localStorage`.

## Approach
- Reuse dropdown primitives under `components/ui/dropdown-menu`.
- Provide a checkbox-style toggle per integration (Radix DropdownMenuCheckboxItem) to avoid menu closing semantics issues.
- Persist enabled map in `localStorage` under `integrations:enabled`.

## Impacted Areas
- `components/integrations-overlay.tsx`: Replace router navigation with dropdown and toggles.
- `components/integrations-grid.tsx`: Export default integrations as `DEFAULT_INTEGRATIONS` for reuse.

## Risks & Mitigations
- Risk: Toggle clicks close the menu unexpectedly.
  - Mitigation: Use `DropdownMenuCheckboxItem` which handles toggling without closing.
- Risk: Inconsistent lists between grid and dropdown.
  - Mitigation: Single source of truth via exported `DEFAULT_INTEGRATIONS`.

## Validation
- Click Integrations in any artifact: dropdown opens in place, no redirect.
- Toggling items updates count label and persists across refresh via localStorage.

## Rollout / Rollback
- Rollout: Default behavior for all artifacts.
- Rollback: Restore previous button with router push to `/settings/integrations`.

