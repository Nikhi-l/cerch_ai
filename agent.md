# Agent Working Guide

- Documentation: All technical docs live in `docs/`.
- Project guidelines: PRDs, roadmaps, and processes live in `project guidelines/`.
- Always consult both before starting, and keep them up to date while working.

## PRD-Style Planning and Documentation
- Plan every change in a concise PRD format and keep it as a living record.
- Update the plan in `docs/` and/or `project guidelines/` as work progresses.

### Minimum PRD Sections
- Context: Problem statement and background.
- Goals/Non-goals: What success looks like; what’s explicitly out of scope.
- Scope & Assumptions: Surfaces, users, constraints, and dependencies.
- Approach: Proposed solution, alternatives considered, trade-offs.
- Impacted Areas: Files, modules, APIs, and data flows.
- Risks & Mitigations: Technical and product risks with mitigations.
- Validation: Test plan, success criteria, and observability.
- Rollout/Rollback: Migration steps, flags, and recovery plan.
- Links: Related issues, PRs/commits, and docs.

### Working Protocol
- Before implementation: Draft or update the PRD entry in `project guidelines/`
  (e.g., extend `Product_roadmap.md`) or add a focused PRD file under `docs/`.
- During implementation: Reflect scope/decision changes in the PRD immediately.
- On completion: Mark status, outcomes, follow-ups, and link the merged PR.

### Conventions
- Use stable filenames like `docs/prd/<short-topic>.md` when creating new PRDs.
- Cross-reference code paths and tests for traceability.
- Each PR should link to the relevant PRD entry; each PRD should link back.

Note: The folder on disk is named `project guidelines/` (with a space).

### Modular Changes
- Prefer additive, modular changes: create a separate file for independent modules instead of expanding large existing files.
- Keep interfaces backward-compatible to avoid breaking existing flows; deprecate gradually when needed.
- Place new modules in the correct folder by type: `components/` (UI), `hooks/` (React hooks), `lib/` (utils/types), `artifacts/` (artifact handlers), `app/` (routes/actions), `tests/` (Playwright).
- Use feature flags or incremental rollouts for risky changes; ensure old paths remain functional until migration is complete.
