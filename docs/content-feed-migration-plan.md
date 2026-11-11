# Notice Board and Live Admin Content — Supabase migration

_Last reviewed: 12 November 2026_

## Target architecture
- Supabase PostgreSQL is the canonical store for structured website content, notices, tests and student records.
- Google Drive is reserved for actual learning assets such as PDFs, PPTs, images and videos. Supabase stores metadata and links.
- Google Sheets and Apps Script are retired from the website architecture.
- Public readers can access only published content. Admin writes require a signed-in user with the server-side `public.is_admin()` role.
- Public content must never expose student profiles, mobile numbers, answer keys, unpublished tests or internal admin metadata.

## Implemented in Preview
- Added `public.site_notices` for published announcements.
- Added `public.admin_content_items` for teacher-authored questions and learning-material metadata.
- Enabled RLS with public SELECT limited to published rows and authenticated admin-only management.
- Replaced the Notice Board and Live Admin Content JSONP feeds with Supabase reads.
- Removed the legacy local Google Sheets result bridge, Apps Script collector source and browser-only teacher vault/PIN panel from the test engine.
- The student test attempt and result workflow remains Supabase RPC-based and is not removed.

## Remaining verification and rollout
1. Build and Preview CI must pass.
2. Test anonymous read of published content and rejection of anonymous writes.
3. Test admin CRUD in Preview, including publication and unpublication.
4. Test empty/error states and mobile/desktop layouts.
5. Only after verification, apply the same schema migration to Production and deploy the site changes.
6. Confirm the Production site is reading Supabase before retiring any remaining external Apps Script deployment manually.

## Data and deletion policy
- The owner deleted the legacy Google Sheet; there is no spreadsheet migration source available.
- No Google Drive files are deleted or moved.
- No student test records or Supabase data are deleted as part of this change.
- No Production schema or deployment changes have been made by this PR.
