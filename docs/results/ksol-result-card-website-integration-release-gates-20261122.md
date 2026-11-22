# KSOL Result Card → krishansir.online integration and merge gates (REVIEW ONLY)

**Target:** `https://krishansir.online`, GitHub Pages frontend, Supabase backend. DNS remains Cloudflare-only. This file is a deployment checklist, not authorization to deploy.

## Verified database facts (read-only)
- Preview has six Result tables; all six have RLS enabled, **none has FORCE RLS**. FORCE RLS is not automatically appropriate for SECURITY DEFINER owners: evaluate per table.
- Preview includes template publishing and result delivery RPCs; Production lacks corresponding name-filtered Result objects.
- Preview `send_result_to_student` is super-admin-only and is not idempotent for repeated sends: it updates notice and appends another audit row.
- Preview notice UPDATE policy is row-restricted but column-level grant / trigger behavior remains unverified.

## Website integration acceptance
1. UI calls verified backend endpoints using logged-in session, never service_role or a secret key in browser.
2. Result template editor and published style read only approved template fields.
3. Student result inbox shows only the current recipient's released, non-revoked results. Fresh authorization for view/download/print; no cross-student leakage.
4. Teacher editing is separate from publishing and student access. Super Admin approval and audit are mandatory for release/revoke.
5. Result PDF and letterpad assets are private; downloaded PDF corresponds to current approved version. UI handles expired session, withdrawn/revoked result and offline state.
6. UI links from relevant student/admin dashboards; preserve existing navigation and avoid touching Teacher v2, Student/Exam module source in this scoped PR. A separate explicitly approved integration PR will be needed for cross-module wiring.
7. Browser smoke tests: logged out, student A, student B, inactive student, teacher, super admin; mobile and desktop; view/download/print; revoke during active session.
8. GitHub Pages publish only after backend migrations, RLS, backups, CI, and explicit owner approval; Cloudflare DNS unchanged.

## Ordered release checklist
- [ ] Independent backup artifact and disposable restore demonstrated
- [ ] Dependency-complete Production SQL migration approved
- [ ] RPC, grants, RLS, storage and immutable audit reviewed
- [ ] Authenticated role matrix and concurrency tests pass
- [ ] Review-only synthetic workflow pass verified
- [ ] Scoped backend PR approved; no other module changes
- [ ] Website integration PR separately approved and tested
- [ ] Owner explicitly approves database migration, merge and production publish
- [ ] Post-deploy checks and rollback/compensating plan recorded

**Current status: NO-GO for live publication.** No database write, merge, result send or deployment performed.
