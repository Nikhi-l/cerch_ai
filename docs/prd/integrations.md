# PRD: CRM Integrations – Settings and Gated Flow

## Context
Users want to sync People/Company datasets into their CRMs (HubSpot, Salesforce, Pipedrive, Zoho, Close). We already surface datasets and enrichment in chat; now we need a clear integrations surface with a structured, gated flow.

## Goals
- Provide an Integrations UI that lists supported CRMs and explains the sync flow.
- Gated experience on Free plan with clear CTA to upgrade.
- Keep color scheme and typography consistent with the app.

## Non‑Goals
- Implementing actual OAuth/field mapping in this iteration.
- Building background sync jobs.

## Approach
- Add an Integrations overlay with:
  - Heading: “CRM Integrations”.
  - Subheading: “You are currently on the free plan. Subscribe to enable CRM integrations.”
  - How it works steps (connect, map, select mode, test, enable, monitor).
  - Grid of CRMs; disabled buttons labeled “Subscribe to enable”.
  - Footer actions: Close, View plans.
- Reuse existing AlertDialog and Button components for consistency.

## UX Flow
1) User clicks Integrations.
2) Overlay opens with How it works and CRM tiles.
3) On Free plan: all actions disabled; CTA to view plans.
4) (Future) On paid plan: show Connect, then OAuth, then field mapping and sync scheduling.

## Impacted Areas
- components/integrations-overlay.tsx

## Risks & Mitigations
- Risk: Users expect working OAuth. Mitigate via “Coming soon / Subscribe to enable”.
- Risk: Overpromising. Keep copy generic and accurate.

## Validation
- Manual test that overlay opens from artifact header.
- Verify copy, disabled states, and CTAs.

## Rollout
- Additive UI only; no migrations.
