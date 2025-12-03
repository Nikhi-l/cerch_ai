# CLAUDE.md - AI Assistant Guide for Cerch AI

This document provides essential context for AI assistants working on the Cerch AI codebase.

## Project Overview

**Cerch AI** is an AI-powered chatbot application built with Next.js 15 and the Vercel AI SDK. It features:
- Multi-model chat (GPT-5, GPT-5 Reasoning)
- Artifact system for creating/editing documents (text, code, sheets, images, websets, people, companies)
- Real-time streaming with resumable streams
- Authentication via NextAuth.js
- PostgreSQL database with Drizzle ORM

## Quick Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server (Next.js Turbo)
pnpm build            # Run migrations + build
pnpm start            # Start production server
pnpm test             # Run Playwright tests
pnpm lint             # ESLint + Biome linting
pnpm lint:fix         # Auto-fix lint issues
pnpm format           # Biome formatting
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Run migrations
pnpm db:studio        # Open Drizzle Studio
```

## Repository Structure

```
cerch_ai/
├── app/                    # Next.js App Router
│   ├── (chat)/             # Chat routes and API
│   │   ├── api/chat/       # Chat API route (main AI entry point)
│   │   ├── api/cerch/      # Cerch data APIs (people, company)
│   │   ├── api/document/   # Document/artifact API
│   │   ├── api/gmail/      # Gmail integration
│   │   └── chat/           # Chat pages
│   ├── (auth)/             # Authentication routes
│   └── credits/            # Credits page
├── artifacts/              # Artifact system
│   ├── text/               # Text artifacts
│   ├── code/               # Code artifacts
│   ├── sheet/              # Spreadsheet artifacts
│   ├── image/              # Image artifacts
│   ├── webset/             # Webset/table artifacts
│   ├── people/             # People search artifacts
│   ├── company/            # Company search artifacts
│   └── actions.ts          # Server actions for artifacts
├── components/             # React UI components
│   ├── ui/                 # Primitive UI components (shadcn)
│   ├── chat.tsx            # Main chat container
│   ├── artifact.tsx        # Artifact overlay system
│   ├── webset-table.tsx    # Table component for data
│   └── ...                 # Other feature components
├── lib/                    # Core library code
│   ├── ai/                 # AI-related code
│   │   ├── prompts.ts      # System prompts
│   │   ├── providers.ts    # Model providers
│   │   ├── models.ts       # Model definitions
│   │   ├── entitlements.ts # User entitlements
│   │   └── tools/          # AI tool implementations
│   ├── db/                 # Database (Drizzle + Postgres)
│   │   ├── schema.ts       # Database schema
│   │   ├── queries.ts      # Database queries
│   │   └── migrations/     # SQL migrations
│   └── providers/          # External data providers
├── hooks/                  # React hooks
├── tests/                  # Playwright tests
│   ├── e2e/                # End-to-end tests
│   ├── routes/             # API route tests
│   └── pages/              # Page object models
├── docs/                   # Documentation
│   ├── prd/                # Product requirement docs
│   ├── components.md       # Component catalog
│   └── repo-structure.md   # Architecture docs
└── project guidelines/     # PRDs and roadmaps
```

## Key Architecture Patterns

### Chat Request Lifecycle
1. Entry: `app/(chat)/api/chat/route.ts`
2. Auth validation and rate limiting
3. System prompt built via `lib/ai/prompts.ts`
4. Model/provider selected via `lib/ai/providers.ts`
5. Streaming via AI SDK `streamText` with resumable streams
6. Tools registered under `experimental_activeTools`
7. Messages persisted via `lib/db/queries`

### Artifact System
- **Purpose**: First-class, live-editable documents with versioning and streaming
- **Kinds**: `text`, `code`, `image`, `sheet`, `webset`, `people`, `company`
- **Server handlers**: `artifacts/<kind>/server.ts` - creation/update logic
- **Client renderers**: `artifacts/<kind>/client.tsx` - rendering and streaming updates
- **Overlay UI**: `components/artifact.tsx` - versioning, diffs, toolbar

### AI Tools
Located in `lib/ai/tools/`:
- `create-document.ts` - Create new artifacts
- `update-document.ts` - Update existing artifacts
- `request-suggestions.ts` - Generate suggestions for documents
- `people-filters.ts` - People search/filtering
- `company-filters.ts` - Company search/filtering
- `get-weather.ts` - Demo weather tool
- `gmail.ts` - Gmail integration

### Database Schema
Key tables in `lib/db/schema.ts`:
- `User` - User accounts
- `Chat` - Chat sessions with visibility
- `Message_v2` - Chat messages with parts/attachments
- `Document` - Artifacts with versioning (composite PK: id + createdAt)
- `Suggestion` - Document edit suggestions
- `Stream` - Resumable stream tracking

## Coding Conventions

### Style Guide
- **Formatter/Linter**: Biome + ESLint (see `biome.jsonc`)
- **Indent**: 2 spaces
- **Line width**: 80 characters
- **Semicolons**: Always
- **Quotes**: Single quotes for JS, double quotes for JSX
- **Trailing commas**: Always

### Naming Conventions
- React components: `PascalCase.tsx` in `components/`
- Hooks: `use-kebab-case.ts` in `hooks/`
- Other files: `kebab-case.ts`
- Types/interfaces: In `lib/*.ts` files

### File Organization
- **UI components**: `components/`
- **Primitive UI**: `components/ui/`
- **React hooks**: `hooks/`
- **AI/tools**: `lib/ai/tools/`
- **Database**: `lib/db/`
- **Artifacts**: `artifacts/<kind>/`
- **Routes**: `app/`
- **Tests**: `tests/`

## Testing

### Framework
- **Playwright** for E2E and API testing
- Tests in `tests/` directory with `.test.ts` extension

### Running Tests
```bash
pnpm test                    # Run all tests
```

### Test Structure
- `tests/e2e/` - End-to-end UI tests
- `tests/routes/` - API route tests
- `tests/pages/` - Page object models
- `tests/fixtures.ts` - Test fixtures
- `tests/helpers.ts` - Test utilities

### Best Practices
- Use stable selectors (`data-testid`)
- Prefer realistic flows (chat lifecycle, artifacts CRUD)
- Use `PLAYWRIGHT=true` env var for test-specific behavior

## Environment Variables

Required variables (see `.env.example`):
```bash
AUTH_SECRET=       # NextAuth secret (generate with openssl rand -base64 32)
XAI_API_KEY=       # xAI API key for models
POSTGRES_URL=      # PostgreSQL connection string
BLOB_READ_WRITE_TOKEN=  # Vercel Blob storage token
REDIS_URL=         # Redis for resumable streams (optional)
```

## Git & PR Guidelines

### Commit Style
Use Conventional Commits:
- `feat:` - New features
- `fix:` - Bug fixes
- `chore:` - Maintenance
- `style:` - Formatting
- `docs:` - Documentation
- `test:` - Tests
- `refactor:` - Refactoring

### PR Requirements
- Clear description with linked issues
- Steps to test
- Screenshots/GIFs for UI changes
- Request review before merge
- Keep PRs focused and atomic

## Development Guidelines

### Adding New Features
1. Consult `docs/` and `project guidelines/` first
2. Create/update PRD in `docs/prd/<topic>.md`
3. Prefer additive, modular changes in separate files
4. Keep interfaces backward-compatible
5. Add tests for new functionality

### Modular Changes
- Create separate files for independent modules
- Avoid growing large monolithic files
- Deprecate gradually when breaking changes needed
- Use feature flags for risky changes

### Security
- Never commit secrets or `.env` files
- Use environment variables for sensitive data
- Verify migrations locally before build
- Use test doubles/mocks in tests

## Key Files Reference

| File | Purpose |
|------|---------|
| `app/(chat)/api/chat/route.ts` | Main chat API entry point |
| `lib/ai/prompts.ts` | System prompts for AI |
| `lib/ai/providers.ts` | Model provider configuration |
| `lib/db/schema.ts` | Database schema definitions |
| `lib/db/queries.ts` | Database query functions |
| `components/chat.tsx` | Main chat UI container |
| `components/artifact.tsx` | Artifact overlay system |
| `middleware.ts` | Auth middleware |
| `biome.jsonc` | Biome linter/formatter config |

## Common Tasks

### Adding a New Artifact Kind
1. Create `artifacts/<kind>/server.ts` with handlers
2. Create `artifacts/<kind>/client.tsx` with renderer
3. Add kind to `lib/db/schema.ts` document enum
4. Register in `components/artifact.tsx` `artifactDefinitions`

### Adding a New AI Tool
1. Create `lib/ai/tools/<tool-name>.ts`
2. Register in `app/(chat)/api/chat/route.ts` under `tools`
3. Add to `experimental_activeTools` if conditional

### Adding a New Component
1. Create in `components/` (or `components/ui/` for primitives)
2. Use PascalCase naming
3. Add to `docs/components.md` catalog

## Related Documentation

- `AGENTS.md` - Agent working protocol
- `docs/repo-structure.md` - Detailed architecture
- `docs/components.md` - Component catalog
- `project guidelines/Product_roadmap.md` - Product roadmap
- `docs/prd/` - Product requirement documents
