# Repository Guidelines

## Structure
- `app/` – Next.js routes.
- `components/` – React components.
- `lib/` – Server utilities and AI helpers.
- `tests/` – Playwright tests.

## Commands
- `pnpm install`
- `pnpm dev`
- `pnpm lint`
- `pnpm test`

## Style
- TypeScript and React with shadcn/ui.
- Prefer existing patterns and keep code formatted.

## Testing
- Run `pnpm lint` and `pnpm test` before committing.

## Pull Requests
- Keep commits focused and include a summary of changes.

## Security & Environment
- Never commit secrets.
- Required env vars: `OPENAI_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
- Optional: `GOOGLE_REDIRECT_URI`.
