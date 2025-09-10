# PRD: Watch Demo CTA linking to YouTube

## Context
The landing page demo area previously cycled between a static screenshot, a YouTube embed, and a locally hosted `<video>`. To simplify and avoid embedding, revert the section to a static screenshot and add a clear “Watch Demo” CTA that opens the YouTube video.

## Goals / Non-goals
- Goals:
  - Use a prominent “Watch Demo” button that links to the YouTube demo in a new tab.
  - Keep the screenshot visible within the demo section for quick visual context.
- Non-goals:
  - Inline video embedding or player controls on the landing page.

## Scope & Assumptions
- Update only `landing.html`:
  - Restore demo area to an `<img>` screenshot.
  - Add/enable a Watch Demo button pointing to YouTube.

## Approach
- Replace the embedded video with the existing screenshot image element.
- Enable the Watch Demo CTA as an `<a>` with `target="_blank"` and `rel="noopener noreferrer"` to `https://youtu.be/QPH7cj_rL-o`.

## Impacted Areas
- `landing.html`

## Risks & Mitigations
- Risk: External video host (YouTube) may be blocked or unavailable.
  - Mitigation: Keep static screenshot as baseline visual; alternative hosting can be added later.

## Validation
- Load `/` and `/landing` and verify:
  - Screenshot renders with rounded border and responsive sizing.
  - Watch Demo button is visible and opens the video in a new tab.

## Rollout / Rollback
- Rollout: Merge and deploy.
- Rollback: Revert to previous video embedding if required.

## Links
- YouTube video: https://youtu.be/QPH7cj_rL-o
