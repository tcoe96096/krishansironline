# Study Materials PPT management (review/preview first)

This change replaces the broken static Class 10 cards with a database catalogue.
Original decks were not present in main. Upload the originals through Admin once
the feature is activated. No other website module is intentionally changed.

## Activation prerequisites

1. Verify the target project's current schema, storage policies, recovery and role
   access. Apply the new migration to isolated Preview first. Do not make either
   bucket public. Existing tables and teacher policies are not modified.
2. Configure GitHub environment study-ppt-worker for Preview only, with
   STUDY_PPT_PROJECT_REF and STUDY_PPT_SUPABASE_URL environment variables and
   STUDY_PPT_SERVICE_ROLE_KEY environment secret. Never put the service role key
   in VITE variables, browser code, commits or logs. Use a dedicated GitHub
   environment; restrict authorized branches and reviewers as appropriate.
3. Run conversion in Preview (manual workflow or scheduled after merge). GitHub
   scheduling is best-effort; conversion may be delayed. The workflow needs
   Linux sudo/unshare and the specified packages. Confirm one actual conversion.
4. Verify Admin and Super Admin upload, conversion, preview, publish, download,
   edit, unpublish, delete, retry. Anonymous and student accounts must see only
   published ready metadata and rendered slides; attempt original download
   with OFF (deny), ON (allow), OFF again (deny). Verify no draft slides can be
   read. Test mobile slide navigation, keyboard, and Class 6–12 filters.
5. Only after Preview passes, approve production migration and reconfigure the
   dedicated conversion environment for the verified Production project; never
   share Preview credentials with Production. Verify production role behavior.
   No production migration or live deployment is performed by this PR itself.

Original PPTX files remain in a private bucket; viewers receive rendered PNG
slides, not the original. OFF hides the download button and storage RLS denies
the source. ON enables direct authenticated/anonymous storage reads through RLS.
Already downloaded files, screenshots and browser image capture cannot be
revoked or completely prevented. Animations, embedded media and transitions are
not preserved by static conversion; presentation contents and fonts may differ.

## Recovery
Unpublish first; retain original files while investigating. A stuck worker claim
is reset after 45 minutes. Conversion failures can be retried from Admin. An
interrupted deletion stays in deleting status for retry. An ambiguous metadata
insert can leave a private unreferenced original; review manually with Admin
before removing. Do not delete existing unrelated data during rollout.
