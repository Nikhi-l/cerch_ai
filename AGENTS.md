# Repository Guidelines

Note: `agent.md` and `AGENTS.md` serve the same purpose. See `agent.md` for the agent working protocol (PRD planning, modular changes), and use the docs under `docs/` and product guidelines under `project guidelines/` for all planning and updates.

## Project Structure & Module Organization
- `app/`: Next.js App Router routes (chat, auth), API routes, and server actions.
- `components/`: Reusable React UI (chat, messages, editors, selectors, icons).
- `artifacts/`: Server/client handlers for text, code, image, and sheet artifacts.
- `lib/`: Providers, prompts, DB (Drizzle + Postgres), utilities, and editor helpers.
- `hooks/`: Custom React hooks used across the UI.
- `tests/`: Playwright E2E/API tests (`e2e`, `routes`, `pages`).

## Build, Test, and Development Commands
- `pnpm install`: Install dependencies.
- `pnpm dev`: Start local dev server (Next.js turbo).
- `pnpm build`: Run DB migrations then build the app.
- `pnpm start`: Start the production build locally.
- `pnpm test`: Run Playwright tests.
- `pnpm lint` / `pnpm lint:fix`: ESLint + Biome linting.
- `pnpm format`: Biome formatting.

## Coding Style & Naming Conventions
- Formatter/Linter: Biome + ESLint (see `biome.jsonc`).
- Indent: 2 spaces; width 80; semicolons always; single quotes; JSX uses double quotes.
- React components: PascalCase `.tsx` in `components/`.
- Hooks: `useX` camelCase in `hooks/`.
- Files: kebab-case for non-components; types/interfaces in `lib/*.ts`.

## Testing Guidelines
- Framework: Playwright (`@playwright/test`). Tests live in `tests/` and end with `.test.ts`.
- Run: `pnpm test`. Use stable selectors (e.g., `data-testid`) for reliability.
- Prefer realistic flows: chat lifecycle, artifacts CRUD, auth/session.

## Commit & Pull Request Guidelines
- Commit style: Conventional Commits (`feat:`, `fix:`, `chore:`, `style:`). Keep scope small and messages imperative.
- PRs: clear description, linked issues, steps to test, and screenshots/GIFs for UI changes. Request review before merge; keep PRs focused.

## Security & Configuration Tips
- Required env vars: `OPENAI_API_KEY`, `POSTGRES_URL`, `AUTH_SECRET` (use `.env.local`).
- Do not commit secrets or logs with sensitive data. Use test doubles/mocks in tests.
- Verify migrations locally before `pnpm build`; Playwright runs with `PLAYWRIGHT=true` via script.

## Modular Changes
- Prefer additive, modular changes. Create a separate file for independent modules rather than growing large files.
- Keep interfaces backward compatible to avoid breaking existing flows; deprecate gradually.
- Place new modules by type: `components/` (UI), `hooks/` (React hooks), `lib/` (utils/types/AI), `artifacts/` (artifact handlers), `app/` (routes/actions), `tests/` (Playwright).

## Repo Structure (Detailed)
- `app/`: Next.js App Router routes and API handlers.
  - Chat API: `app/(chat)/api/chat/route.ts` wires AI tools (`lib/ai/tools/*`) into the `ai` SDK `streamText` call. Controls streaming, message persistence, rate limits, and resumable streams.
  - Pages: `app/(chat)` for chat, `app/(auth)` for auth, `app/credits` for credits.
- `components/`: Reusable UI components (chat, messages, editors, selectors, icons). See `docs/components.md` for a breakdown.
- `artifacts/`: Artifact system for text/code/image/sheet/webset/people/company.
  - Per-kind folders: each has `server.ts` (server-side handlers) and `client.tsx` (client rendering + streaming update logic).
  - `actions.ts`: server actions to fetch suggestions linked to a document.
- `lib/`: Core logic.
  - `ai/`: prompts, providers, model mapping, entitlements, and tool definitions under `ai/tools/*`.
  - `db/`: Drizzle schema and queries; used by chat and artifacts for persistence.
  - `utils.ts`, `errors.ts`, `constants.ts`: shared helpers and error responses.
- `hooks/`: Cross-UI hooks such as `use-artifact`, `use-chat-visibility`, `use-auto-resume`.
- `tests/`: Playwright E2E/API tests.
- `docs/`: Documentation (Crustdata reference and architecture docs like `repo-structure.md`, `components.md`).
- `project guidelines/`: Product roadmaps and PRDs (e.g., `Product_roadmap.md`).

### Artifacts
- Purpose: Let the AI create/update structured documents (text, code, image, sheet, webset, people, company) that stream into a live editor with versioning.
- Server: `artifacts/<kind>/server.ts` defines handlers used by tools (`createDocument`, `updateDocument`, `requestSuggestions`) to generate and persist content.
- Client: `artifacts/<kind>/client.tsx` declares how to render content, consume stream parts, and expose artifact-specific UI.
- UI: `components/artifact.tsx` orchestrates artifact viewing, versioning, diffs, toolbar actions, and inline chat toolbar for follow-ups.

### AI Tools
- Registered in `app/(chat)/api/chat/route.ts` under `tools` and selectively enabled via `experimental_activeTools`.
- `lib/ai/tools/create-document.ts`: Create an artifact with a title/kind and stream initial content.
- `lib/ai/tools/update-document.ts`: Update an existing artifact by id/kind; streams changes and persists new versions.
- `lib/ai/tools/request-suggestions.ts`: Ask the model to suggest edits/comments for a document; stored as suggestions.
- `lib/ai/tools/get-weather.ts`: Demo tool used in messages UI.
- `lib/ai/tools/gmail.ts`: Example Gmail query tool using OpenAI Responses.

For a deeper overview, see `docs/repo-structure.md` and `docs/components.md`.

## Working Protocol (PRD Planning)
- Always consult `docs/` (technical docs) and `project guidelines/` (PRDs/roadmaps) before starting work.
- Plan each change in a concise PRD (context, goals, scope, approach, risks, validation, rollout) and keep it updated as a living record.
- Store PRDs under `project guidelines/` or `docs/prd/<topic>.md`; link PRs to PRDs and cross-reference affected files.

### PRD Sections (Minimum)
- Context: Problem statement and background.
- Goals/Non-goals: What success looks like; explicit out-of-scope.
- Scope & Assumptions: Surfaces, users, constraints, dependencies.
- Approach: Proposed solution, alternatives considered, trade-offs.
- Impacted Areas: Files, modules, APIs, data flows.
- Risks & Mitigations: Technical/product risks and mitigations.
- Validation: Test plan, success criteria, observability.
- Rollout/Rollback: Migration steps, flags, recovery plan.
- Links: Related issues, PRs/commits, and docs.

### Conventions
- Use stable filenames like `docs/prd/<short-topic>.md` for new PRDs.
- Cross-reference code paths and tests for traceability.
- Each PR should link to the relevant PRD entry; each PRD should link back.

Note: The folder on disk is named `project guidelines/` (with a space).
