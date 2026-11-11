# Notice Board and Live Admin Content — staged migration plan

_Last reviewed: 11 November 2026_

## Current decision

Keep both existing legacy feeds active for now:

- Public Notice Board: existing Apps Script JSONP read feed.
- Live Admin Content: existing Apps Script JSONP read feed.

The Preview snapshot that disables these feeds is **not** to be copied into Production at this stage. Disabling a working live source before a verified replacement exists would remove current website content.

## Target architecture

- PostgreSQL/Supabase is the canonical store for structured, authenticated admin-managed content.
- Public content is served only through a deliberately public read model/RPC or a server-side endpoint that returns approved fields.
- Admin create/update/delete operations require a valid Supabase session and a server-side `public.is_admin()` check.
- Public announcements and study content must not expose student profiles, mobile numbers, answer keys, unpublished tests, or internal admin metadata.
- Keep the existing Apps Script integration as a temporary compatibility source during transition.

## Migration phases

### Phase 0 — Preserve (current)

- Leave both Apps Script feeds enabled.
- Record current payload shape, section names, announcement fields, refresh behavior and fallback behavior.
- Do not change current public content or remove existing source URLs while the replacement is incomplete.

### Phase 1 — Build replacement in parallel

- Define Supabase tables/content types for notices and approved site content.
- Add admin-only write operations with server-side role validation and audit history.
- Add a public read path that returns only published/approved content.
- Preserve current UI component contracts where possible so the source can be switched without a visual regression.
- Do not copy secrets or Apps Script private configuration into frontend code.

### Phase 2 — Preview verification

- Use the existing Preview project (no new paid project/branch).
- Test empty, populated, malformed and unavailable feed responses.
- Verify publication/unpublication, ordering, date handling, refresh, mobile layout and accessibility.
- Verify anonymous users can read only approved public content and cannot write.
- Verify non-admin authenticated users cannot publish or edit.
- Compare Preview output with the live feed for representative notices and content.

### Phase 3 — Controlled cutover

- Obtain owner confirmation after Preview verification.
- Switch one feed at a time, starting with the lower-risk feed.
- Keep the old Apps Script read path available as a rollback option during the observation period.
- Monitor errors and content parity before switching the second feed.

### Phase 4 — Retire legacy integration

Only after both replacements are verified in Production and rollback is no longer required:
- Remove the legacy JSONP loader and obsolete configuration.
- Revoke or restrict the old Apps Script deployment if no other consumers depend on it.
- Update operational documentation and record the retirement date.

## Acceptance criteria

- No loss of existing notices or public content during cutover.
- Admin permissions are enforced server-side, not by hidden buttons or local storage.
- Public payloads contain only approved published content.
- No service-role key, OAuth secret, shared secret or private spreadsheet identifier is exposed in browser bundles.
- Mobile and desktop smoke tests pass.
- Rollback to the previous feed is documented and tested.

## Current status

- Notice Board replacement: **Pending**.
- Live Admin Content replacement: **Pending**.
- Legacy feeds: **Preserved / still in use**.
- Production cutover: **Not authorized until replacement verification and owner acceptance**.
