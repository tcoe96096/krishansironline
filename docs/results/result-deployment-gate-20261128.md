# Result Management deployment gate (review only, 2026-11-28)

Combined PR #199; no production changes. Evidence at commit 52b21d37e4591ece2696894f04a9b9187c184a8f:
- Disposable PostgreSQL run 46097492827: RESULT_ATOMIC_PACKAGE_SYNTHETIC_ASSERTIONS_PASSED, snapshot, template and publication assertions all passed.
- Portable Deno PDF, logical Hindi text, private adapter, and disabled package CI passed.
- Browser flags remain disabled by default. Production and Preview currently have no dedicated result PDF Edge endpoint (read-only inventory 2026-11-28).

Ordered activation prerequisites:
1. Reconcile existing Preview template objects; do not execute the fresh-install atomic SQL there unchanged. It deliberately rejects preexisting objects. Use a disposable cloud database or a reviewed non-destructive reconciliation, not destructive reset.
2. Verify the exact package with independently pinned font hashes, applicable licenses, locked dependency versions, and actual Supabase Edge bundler/resource limits. No real data in public CI.
3. Before enabling approval, independently verify JWTs and storage byte readback, rate limits, request reconciliation, and current template/snapshot binding. Keep manual upload disabled. A generated PDF is not released until separate admin authorization.
4. Production: confirm a complete independently verified recovery (database, auth, storage service, private object bytes) and deployment authorization. Run preflight against actual schema; apply the atomic SQL only to a compatible target. Confirm a published template exists.
5. Deploy reviewed server functions disabled, verify actual runtime and access gates, then enable server flags and finally frontend flags. GitHub Pages only for website hosting; Cloudflare DNS only. Do not introduce paid services.
6. Stop on mismatch. Do not drop data, reset existing Preview objects, or silently bypass gates. Rollback by disabling flags first, preserving approved artifacts and audit logs.

Current blocker: no complete recovery proof and no live Edge package verification yet. The CI evidence is synthetic, not a claim of production readiness.
