# Verified Result Card migration dependency order — REVIEW ONLY

Source: read-only Preview PostgreSQL `pg_constraint` catalog, 2026-11-22. This supplements the six-table catalog and RPC inventory. No writes were performed.

## Confirmed dependencies
- `public.test_attempts.id` is PRIMARY KEY; `status` is constrained to `in_progress`, `submitted`, `expired`.
- `public.result_delivery_notices.attempt_id` references `public.test_attempts(id) ON DELETE CASCADE`.
- `public.result_delivery_notices.student_id` references `auth.users(id) ON DELETE CASCADE`.
- `public.result_delivery_notices.sent_by` references `auth.users(id)`.
- `public.result_delivery_notices(attempt_id,student_id)` is UNIQUE, enabling upsert conflict handling.
- `public.result_card_templates.template_key` is PK, restricted to `default`.
- Template `theme` allowed values: modern, classic, minimal; version >= 1; change_reason trimmed length 12–1000; updated_by references `auth.users(id)`.

## Migration order proposal
1. Confirm `public.test_attempts`, `public.tests`, `auth.users`, `public.is_super_admin()`, `public.student_account_is_eligible(uuid)` in the Production catalog.
2. Create six Result tables using exact Preview definitions, including identity/default, PK/FK, checks, indexes, and triggers. Create independent audit tables before triggers.
3. Enable RLS and apply least-privilege policies and column grants. The student mark-read operation must not permit changing immutable notice fields.
4. Create audit trigger functions and bind triggers.
5. Create verified publisher and delivery RPC functions, explicitly restrict EXECUTE and validate SECURITY DEFINER owner/search_path.
6. Add new immutable result version, atomic release/revoke state and private audit separately from delivery notices; the latter are NOT equivalent to released content.
7. Validate on a disposable restored copy using multiple authenticated identities and concurrent sessions.
8. Approve merge and Production migration only after independent recovery evidence and owner authorization.

## Blocking design questions
- Preview `result_delivery_notices` uses cascading deletes: if attempts/users are deleted, notices disappear. Confirm whether private audit tables survive deletion as required by retention policy.
- `send_result_to_student` presently accepts submitted attempts but does not independently establish a versioned release state.
- Determine exact grant/trigger/sequence definitions before generating runnable migration; a partial copy is not safe.
- Validate UI route ownership and result PDF object storage authorization separately.

**Current release gate: NO-GO.** This file is a dependency map, not a runnable migration.
