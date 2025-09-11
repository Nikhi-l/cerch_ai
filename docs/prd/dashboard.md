# Dashboard for People & Company Artifacts

## Context
- Users create People and Company artifacts during chat sessions. There is no single place to browse previously created artifacts outside the chat stream.
- Request: Add a minimalist dashboard section accessible from the chat sidebar that lists past People and Company artifacts with a central search.

## Goals / Non-goals
- Goals:
  - Add a Dashboard page showing user’s People and Company artifacts in two columns.
  - Provide a centered heading “Search your past artifacts” with a search input that filters artifacts by title.
  - Add an entry point button to the top-left of the chat history (sidebar header).
- Non-goals:
  - Full artifact editing from the dashboard.
  - Server-side search or advanced filters (client-side title filter only for now).
  - Listing other artifact kinds.

## Scope & Assumptions
- Scope: New route `/(chat)/dashboard` with layout parity to chat (sidebar + credits). Minimal read-only list with links.
- Assumes existing `Document` records include kinds `people` and `company` and are associated with the authenticated user.
- Auth required; anonymous users see a prompt to log in.

## Approach
- DB: Add a query util to fetch a user’s documents filtered by kinds.
- Routing: Create `app/(chat)/dashboard/page.tsx` to fetch and pass data to a client UI component.
- UI: Build `components/Dashboard.tsx` (client) rendering:
  - Heading and search input (with added spacing below the heading).
  - A segmented tab (People | Company) above a single, wider list that shows title and relative created time.
- Navigation: Add a “Dashboard” ghost icon button in `components/app-sidebar.tsx` header.
- Optional: Add a basic artifact viewer route (`/(chat)/artifact/[id]`) for read-only viewing of People/Company artifacts.

## Impacted Areas
- Files:
  - `lib/db/queries.ts` (new getter function)
  - `app/(chat)/dashboard/page.tsx` (new page)
  - `components/Dashboard.tsx` (new UI)
  - `components/app-sidebar.tsx` (new button)
  - `components/icons.tsx` (add DashboardIcon)
  - Optional: `app/(chat)/artifact/[id]/page.tsx` (viewer)

## Risks & Mitigations
- Risk: Large artifact counts could slow initial page load.
  - Mitigation: Client-side filter only; if needed later, add server pagination and search API.
- Risk: No existing direct mapping from Document -> Chat for returning to context.
  - Mitigation: Provide a simple viewer route for read-only access by id.

## Validation
- Manual:
  - Auth user visits `/dashboard` and sees heading, search, and a single list with a People/Company tab.
  - Typing in search filters both columns in real time.
  - Sidebar button navigates to dashboard.
  - Clicking an item opens `/artifact/[id]` read-only viewer for People/Company.
  - Artifact viewer shows Back and Open Chat actions when possible.

## Rollout / Rollback
- Rollout: Ship as additive routes/components; no migrations.
- Rollback: Remove the new route, UI, and button. No data changes.

## Status & Links
- Status: Implemented in repo, pending QA.
- Code: `app/(chat)/dashboard/page.tsx`, `components/Dashboard.tsx`, `lib/db/queries.ts`, `components/app-sidebar.tsx`, `app/(chat)/artifact/[id]/page.tsx`.
- Follows: Product roadmap focus on People/Company artifacts surfacing.
