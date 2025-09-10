# PRD: Inline Demo Video with Poster (YouTube privacy‑mode)

## Context
The landing page demo area now uses a poster‑first inline player: we render a static dashboard screenshot, and on click we swap to a privacy‑mode YouTube iframe that autoplays within the same frame. This avoids a hard redirect to YouTube.

## Goals / Non-goals
- Goals:
  - Show the dashboard screenshot by default (fast, brand‑consistent).
  - On click, inline‑play the YouTube demo in privacy‑mode with modest branding.
  - Avoid channel/title overlays prior to user interaction.
- Non-goals:
  - Building a full custom player; we still rely on YouTube iframe once playing.

## Scope & Assumptions
- Update only `landing.html`:
  - Wrap the screenshot in a `.video-wrap.js-ytembed` container with a play overlay.
  - On click, replace with `youtube-nocookie.com/embed` iframe (`autoplay=1&modestbranding=1`).

## Approach
- Add a small inline script that swaps the poster for an iframe on click.

## Impacted Areas
- `landing.html`

## Risks & Mitigations
- Risk: External host (YouTube) blocked/unavailable.
  - Mitigation: Poster remains; consider self‑hosted MP4/HLS fallback later.

## Validation
- Load `/` and verify:
  - Poster renders with rounded border, 16:9 sizing.
  - Click play: player swaps in‑place and auto‑plays.
  - No channel/title shown before interaction; modest branding after.

## Rollout / Rollback
- Rollout: Merge and deploy.
- Rollback: Set the wrapper back to a static `<img>` or link‑out CTA.

## Links
- YouTube video: https://youtu.be/QPH7cj_rL-o
