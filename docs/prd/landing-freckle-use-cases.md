# PRD: Landing Page – Email Deliverability to 90% and Use Cases from Conversational CRM Enrichment

Updated: 2025-09-10

## Context
The marketing landing page shows an "Email deliverability" stat and a high‑level overview of how teams use Cerch AI. We want to: (1) change the email deliverability/availability percentage to 90%, and (2) incorporate relevant use cases inspired by Freckle (conversational enrichment, CRM sync, and always‑on enrichment) to better reflect conversational workflows users expect.

## Goals / Non‑goals
- Goals:
  - Update all visible instances of email deliverability/availability to 90%.
  - Add concise “Popular use cases” that highlight conversational enrichment and CRM‑centric flows.
- Non‑goals:
  - Announce new integrations or pricing.
  - Duplicate Freckle copy; content must be paraphrased and brand‑appropriate.

## Scope & Assumptions
- Scope: Static landing page (`landing.html`). No app routes or API changes.
- Assumptions: We keep claims generic (e.g., “integrations, webhooks, CSV”) to avoid over‑promising specific vendors.

## Approach
- Edit the inline stat in the terminal demo and the stats counter to 90%.
- Replace the three testimonial cards under “How teams use Cerch AI” with six use‑case cards, keeping the same success‑card style for visual consistency. The use‑cases map to:
  - Conversational enrichment in plain English
  - Auto‑enrichment across sources (integrations/webhooks/CSV)
  - Fill gaps from sparse inputs
  - Waterfall coverage & verification (emails/phones/socials)
  - Account research at scale (hiring, self‑serve, pricing tiers)
  - Keep CRM as source of truth (create/update/lookup)
 - Remove the temporary duplicate “Popular use cases” grid to avoid repetition.

## Impacted Areas
- File: `landing.html` (hero terminal stat, stats counter, swap testimonial cards → use‑case cards).
- Also simplified the floating media controls: removed Share; Play now links to the YouTube demo (`https://youtu.be/QPH7cj_rL-o`).

## Risks & Mitigations
- Risk: Over‑claiming integrations.
  - Mitigation: Use generic phrasing; avoid naming specific CRMs unless confirmed elsewhere.
- Risk: Visual imbalance or layout overflow.
  - Mitigation: Reuse existing Tailwind utility patterns and 3‑column grid used on the page.

## Validation
- Visual QA in browser: verify both stat locations display 90%.
- Content QA: ensure use cases read naturally and align with Cerch positioning.

## Rollout / Rollback
- Rollout: Safe to ship; static content only.
- Rollback: Revert `landing.html` and this PRD entry if copy needs iteration.

## Links
- Source inspiration: https://www.freckle.io/
- Changed file: `landing.html`
