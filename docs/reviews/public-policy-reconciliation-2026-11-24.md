# Public policy reconciliation — 24 November 2026
Scope: website policy content, footer and support routes. No production database migration, RLS change, live security attestation or release authorization.

| Evidence inspected on main | Policy decision |
| --- | --- |
| src/context/AuthContext.tsx; src/components/AuthModal.tsx; src/lib/supabase.ts | Describe actual student registration fields, mobile/email/password and internal alias; no claim of SMS verification. Privacy notice before data entry. |
| src/services/testService.ts; src/components/ResultsPortal.tsx; docs/student-live-release-checklist.md | Describe private attempt history, server RPCs, separate answer keys and limits; older audit is dated, not live proof. |
| src/components/TeacherSiteWorkspace.tsx; docs/teacher-v2-production-readiness-2026-11-22.md | Teacher approval is separate from OAuth; activation-dependent features are conditional, not live promises. |
| docs/student-auto-purge-preview.md | Preview-only purge can retain named academic records while removing auth identity and selected geography fields. No promise of automatic production deletion or a fixed retention period. |
| public/privacy-policy.html; public/terms-of-service.html; public/ksol-encrypted-backup.html; docs/recovery/real-backup-restore-preflight-2026-11-23.md | Preserve owner-only Drive authorization, encryption, scope, revocation and backup disclosure. Legacy policy URLs generated from current bilingual text. Archive readback is not full restore verification. |
| index.html and default-branch code search for adsbygoogle/googlesyndication | External Google Fonts present; no matching AdSense script found. Do not claim no tracking or advertising across all runtime configurations. |
| src/components/ContactSection.tsx | Old form set local success state only. Replace with an explicitly user-sent email draft; remove unnecessary name field. No receipt, persistence or delivery promise. |
| src/services/siteConfigService.ts | Existing brand configuration retained; secure policy authoring/versioning is not yet implemented. |

Remaining release checks: owner/qualified reviewer approves policy accuracy and applicable legal obligations; verify production data flows, retention, providers, deployed flags, child consent and data request process. A privacy notice is not verified parental consent. Do not enable new data collection or change live Auth/RLS on this PR. Separate admin policy editing, consent evidence and support tickets require scoped design, authorization and tests. Do not claim full compliance or security certification.
