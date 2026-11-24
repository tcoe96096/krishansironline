# Study Materials PPT management (review/preview first)

This change replaces the broken static Class 10 cards with a database catalogue.
Original decks were not present in main. Upload the originals through Admin once
the feature is activated. No other website module is intentionally changed.

## Activation prerequisites

1. Verify the target project's current schema, storage policies, recovery and role
   access. Apply the new migration to isolated Preview first. Do not make either
   bucket public. Existing tables and teacher policies are not modified.
2. Configure GitHub environment `study-ppt-worker-preview` with a Preview-only
   `STUDY_PPT_SERVICE_ROLE_KEY` environment secret. Restrict it to the exact
   feature branch and use environment approval if available. Never put the key
   in frontend code, repository variables, commits, or logs.
3. Enable repository variable `STUDY_PPT_PREVIEW_ENABLED=true` only after the
   Preview environment is configured. A push to the feature branch runs the
   Preview queue worker without merging or deploying production. The workflow
   pins the Preview URL and ref. The pull-request smoke job needs no secrets.
   Upload a sample via Preview Admin before running the worker; verify its
   output and keep the sample unpublished until role checks pass.
4. Verify Admin and Super Admin upload, conversion, preview, publish, download,
   edit, unpublish, delete, retry. Anonymous and student accounts must see only
   published ready metadata and rendered slides; attempt original download
   with OFF (deny), ON (allow), OFF again (deny). Verify no draft slides can be
   read. Test mobile slide navigation, keyboard, and Class 6–12 filters.
5. Only after Preview passes, approve the production migration and configure
   the distinct `study-ppt-worker-production` environment with the Production
   key and main-only branch restriction. Enable repository variable
   `STUDY_PPT_PRODUCTION_ENABLED=true` only when production is ready. Main-only
   scheduled or manual runs use the pinned Production ref and URL. Never
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
