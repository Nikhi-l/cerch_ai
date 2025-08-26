# Repository Guidelines

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
