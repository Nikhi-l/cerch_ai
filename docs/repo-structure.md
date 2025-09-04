# Repository Structure and Architecture

This document provides a deeper overview of the repository layout, how data flows through chat, tools, and artifacts, and where to add new functionality safely.

## Top-Level Layout
- `app/`: Next.js App Router routes (chat, auth, credits) and API routes.
- `components/`: UI components for chat, messages, editors, tool previews, and layout.
- `artifacts/`: Artifact kinds (text, code, image, sheet, webset, people, company) with server and client logic.
- `lib/`: AI prompts/providers/tools, database schema/queries, utilities, and error handling.
- `hooks/`: Reusable React hooks shared across the UI.
- `tests/`: Playwright E2E/API tests.
- `docs/`: Documentation (this file, component docs, provider docs).
- `project guidelines/`: Product roadmaps and PRDs.

## Chat Request Lifecycle
- Entry: `app/(chat)/api/chat/route.ts`.
- Auth: Validates session, enforces per-user daily message caps.
- System prompt: Built in `lib/ai/prompts.ts` using request hints (geolocation when available).
- Model/provider: Selected via `lib/ai/providers.ts` and `lib/ai/models.ts`.
- Streaming: Uses `ai` SDK `streamText` with word chunking and resumable streams when Redis is configured.
- Tools: Enabled via `experimental_activeTools` and implemented under `lib/ai/tools/*`.
- Persistence: User and assistant messages saved via `lib/db/queries`.

## AI Tools
- Purpose: Extend the model with deterministic functions for artifact creation, updates, suggestions, and demos.
- Registration: In `app/(chat)/api/chat/route.ts` under `tools`.
- Implementations:
  - `lib/ai/tools/create-document.ts`: Create an artifact (`kind`, `title`), stream initial content, and persist a first version.
  - `lib/ai/tools/update-document.ts`: Load latest version, compute updates, stream changes, persist a new version.
  - `lib/ai/tools/request-suggestions.ts`: Generate suggestions for a document; stored and later fetched via `artifacts/actions.ts`.
  - `lib/ai/tools/get-weather.ts`: Demo weather tool rendered inline in chat.
  - `lib/ai/tools/gmail.ts`: Gmail query demo using OpenAI Responses.

## Artifacts Architecture
- Purpose: First-class, live-editable documents created/updated by the AI with versioning and streaming UX.
- Definition: `components/artifact.tsx` maps artifact kinds to client renderers (`artifactDefinitions`).
- Server handlers: `artifacts/<kind>/server.ts` define creation/update logic and streaming parts (text deltas, sheet deltas, finish).
- Client renderers: `artifacts/<kind>/client.tsx` render content, consume stream parts, and expose artifact-specific controls.
- Actions: `artifacts/actions.ts` exposes server actions (e.g., fetch document suggestions) used by the UI.
- UI overlay: The Artifact overlay handles:
  - Versioning: Fetches/persists versions via `/api/document` and Drizzle queries.
  - Diff mode: Toggle and compare current vs. previous versions.
  - Toolbar: Follow-up prompts and quick actions (save, diff, mode).

## Components Overview
- Chat: `components/chat.tsx` orchestrates `useChat`, messages, input, and the Artifact overlay.
- Messages: `components/messages.tsx` renders message list; `components/message.tsx` renders individual messages.
- Tool UI: `components/document.tsx` and `components/document-preview.tsx` show tool calls/results and link into the Artifact overlay.
- Editors: `text-editor.tsx`, `code-editor.tsx`, `image-editor.tsx`, `sheet-editor.tsx`, `markdown.tsx`.
- Sidebar & Navigation: `app-sidebar.tsx`, `sidebar-history.tsx`, `sidebar-history-item.tsx`, `sidebar-user-nav.tsx`, `sidebar-toggle.tsx`.
- Inputs & Actions: `multimodal-input.tsx`, `message-editor.tsx`, `message-actions.tsx`, `create-artifact.tsx`.
- Display & Helpers: `webset-table.tsx`, `diffview.tsx`, `console.tsx`, `icons.tsx`, `toast.tsx`, `version-footer.tsx`.
- UI primitives: `components/ui/*` (button, input, select, sidebar, tooltip, etc.).

See `docs/components.md` for a detailed list with descriptions.

## Database and Persistence
- Database: Drizzle + Postgres schema under `lib/db/schema` with queries in `lib/db/queries`.
- Messages: `saveMessages`, `getMessagesByChatId` used by chat route and UI.
- Documents: `saveDocument` and related queries power artifact versioning and history.

## Resumable Streams
- Optional Redis-backed resumable streaming via `resumable-stream`.
- When Redis is missing or unreachable, the app logs a single line and falls back to non-resumable streaming.

## Modularity Guidelines
- Prefer additive modules in separate files; avoid large monoliths.
- Keep interfaces stable; deprecate progressively.
- Place new files by domain (UI/components, artifacts, hooks, lib/ai/tools, app routes).

