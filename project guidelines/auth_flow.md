# Auth Flow — Issues and Fix Plan (PRD)

## Summary
- Symptom: During sign‑up, duplicate User records are sometimes created for the same email.
- Impact: Confusing login behavior, orphaned data, and inconsistent sessions when multiple `User` rows share one email.

## Current Flow (Credentials)
- Pages: `app/(auth)/register/page.tsx` and `app/(auth)/login/page.tsx` (client forms).
- Server actions: `app/(auth)/actions.ts` → `register()` and `login()`.
- Auth: NextAuth Credentials in `app/(auth)/auth.ts` with `authorize()` reading from DB via `getUser(email)`.
- DB access: `lib/db/queries.ts` (`getUser`, `createUser`) with Drizzle + Postgres.

## Symptoms Observed
- Multiple `User` rows share the same `email` after a single sign‑up attempt.
- Subsequent login may authenticate against an arbitrary row (first returned), masking the problem until other flows query users by email.

## Root Causes
- No unique constraint on `User.email`:
  - Schema (`lib/db/schema.ts`) defines `email` as `varchar(64).notNull()` without `unique()`.
  - Migrations (`lib/db/migrations/0000_keen_devos.sql`) do not add a unique index.
  - Result: DB accepts duplicates; application relies on a non‑atomic “check‑then‑insert”.

- Race condition in register flow (TOCTOU):
  - `register()` performs `getUser(email)` then `createUser(email, password)` in separate statements.
  - Two concurrent requests can both observe “user not found” and insert two rows.

- Missing email normalization:
  - No lowercasing/trim at write or read → `User@example.com` and `user@example.com` are treated as different, multiplying duplicate risk.

- Optional: Double submit from UI/network retries:
  - UI disables submit while pending, but multi‑tab or slow network retries can still issue concurrent requests.

## Reproduction (Example)
1) Open the register page in two tabs.
2) Submit the same email/password in both within a short interval.
3) Observe 2+ `User` rows with the same `email` in the DB.

## Fix Plan
- Database constraints (required):
  - Add a unique index on normalized email: `UNIQUE (lower(email))`.
  - Consider Postgres `citext` for case‑insensitive unique email.

- Atomic create with conflict handling (required):
  - Update `createUser` to an upsert pattern: insert with `onConflictDoNothing()` (or `onConflict({ target: [lower(email)] }).doNothing()`) and inspect `returning()` to detect conflicts.
  - Adjust `register()` to treat conflict as `user_exists` without error.

- Normalize email (required):
  - On input: lowercase and trim in `register()` and `login()` (e.g., Zod `.transform((s) => s.trim().toLowerCase())`).
  - In queries: read with normalized email to match stored values.

- Optional hardening:
  - Add rudimentary rate limiting on register attempts per IP/email.
  - Add server‑side idempotency key for sign‑up submissions (hidden field + short TTL store).

## Migration Notes
- Pre‑req: Identify and resolve existing duplicates before adding unique index.
  - Detect duplicates: `SELECT lower(email), count(*) FROM "User" GROUP BY lower(email) HAVING count(*) > 1;`
  - Resolution options (choose per product need):
    - Keep the most recently active user; merge or delete others.
    - If no merge logic exists, export duplicates and prune manually.
  - After cleanup, create `UNIQUE INDEX CONCURRENTLY user_email_unique_idx ON "User" (lower(email));`

## Risks
- Unique index creation fails if duplicates remain → validate/pre‑clean thoroughly.
- Normalization may alter behavior for users who relied on mixed‑case email display → store raw email for display if needed, enforce normalized column for uniqueness.

## Validation
- Unit/Integration:
  - Attempt concurrent `register()` with the same email in 2+ requests → exactly one row is inserted, the other returns `user_exists`.
  - Register then login with mixed‑case email → login succeeds and returns the same user id.
- E2E (Playwright):
  - Add a test to simulate two parallel registrations; assert only 1 user in DB.

## Implementation Pointers
- Files to change:
  - Schema/migrations: add unique index on normalized email.
  - `lib/db/queries.ts#createUser`: use `onConflictDoNothing()` with `returning()`; or wrap in transaction if additional writes are added later.
  - `app/(auth)/actions.ts`: Zod `.transform()` to normalize email in both `register()` and `login()`.
  - `lib/db/queries.ts#getUser`: either normalize input before calling or ensure callers pass normalized email.

## Out of Scope (Now)
- Email verification and password reset flows.
- OAuth providers; current scope is Credentials provider only.

## References
- Schema: `lib/db/schema.ts` (`User` table has no unique constraint on `email`).
- Queries: `lib/db/queries.ts` (`getUser`, `createUser`).
- Auth: `app/(auth)/auth.ts`, `app/(auth)/actions.ts`.
