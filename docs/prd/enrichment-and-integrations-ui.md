# PRD: Integrations Overlay + Enrichment UI

## Context
- Integrations menu was a small dropdown; users want a popup similar to Settings with clear integration tiles.
- Need a minimal UI to enrich table data by creating a new column or filling an existing column (e.g., fill missing profile images or descriptions).

## Goals
- Add an Integrations popup with cards for key providers.
- Add an “Add Enrichment” flow on people tables to select target column/new column and trigger enrichment.

## Scope
- UI only for integrations (cards with “Coming soon”).
- Functional enrichment for People via Crustdata Basic Profile (profile image, description/headline, location, canonical LinkedIn URL).

## Approach
- Integrations: New `IntegrationsOverlay` using AlertDialog. Wire into `ArtifactIntegrations`.
- Enrichment: New `EnrichmentDialog` + client-side CSV update in `WebsetTable`.
- API: `POST /api/cerch/people/enrich/basic` batches LinkedIn URLs (<=25) and returns normalized rows.

## Impacted Files
- components/integrations-overlay.tsx (new)
- components/artifact-integrations.tsx (updated)
- components/enrichment-dialog.tsx (new)
- components/webset-table.tsx (updated)
- app/(chat)/api/cerch/people/enrich/basic/route.ts (new)
- lib/providers/crustdata/client.ts (export enrichPeopleBasicProfile)

## Risks
- Enrichment depends on Crustdata token and endpoint access; gracefully no-ops if not configured.
- Email enrichment not covered by Basic Profile; UI currently focuses on supported fields.

## Validation
- Open Integrations from artifact header → modal with tiles.
- In a People artifact, click “Add Enrichment”, choose a field and column, run enrichment, and see cells filled.

## Rollout
- Default-on. Rollback by removing overlay+dialog and the route.
