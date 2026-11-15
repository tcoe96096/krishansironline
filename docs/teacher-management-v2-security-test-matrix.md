# Teacher Management v2 — security verification matrix (review only)

This is a **test plan**, not evidence that database tests passed. The proposed SQL has NOT been executed. Run only after the owner separately authorizes a disposable Preview test database.

| ID | Identity / scenario | Action | Required result |
|---|---|---|---|
| SEC-01 | Anonymous | Read teacher profiles, qualifications, resume metadata, assignments, audit | Denied |
| SEC-02 | Teacher A | Read or edit Teacher B profile/resume | Denied |
| SEC-03 | Teacher A | Set own approved status or employee ID | Denied |
| SEC-04 | Teacher A | Grant own class/subject/work | Denied |
| SEC-05 | Ordinary Admin | Call employee ID or assignment RPC | Denied |
| SEC-06 | Super Admin | Issue ID for pending/suspended/rejected teacher | Denied |
| SEC-07 | Super Admin | Issue ID twice for same approved teacher | Same existing ID; no duplicate issuance |
| SEC-08 | Two concurrent approvals | Issue distinct IDs | Unique constraint protects collisions; retry or rollback |
| SEC-09 | Super Admin | Grant duplicate active assignment | Rejected; only one active scope |
| SEC-10 | Super Admin | Grant unsupported work type or class | Rejected |
| SEC-11 | Super Admin | Revoke active assignment | Revoked and audit event recorded atomically |
| SEC-12 | Super Admin | Revoke nonexistent assignment | Rejected |
| SEC-13 | Suspended teacher | Use previously assigned material/result permissions | Denied by server authorization |
| SEC-14 | Teacher A | Download Teacher B private resume | Denied; no public URL |
| SEC-15 | Any client | Upload renamed executable or >5 MB resume | Rejected by server signature/size checks |
| SEC-16 | Ordinary client | Modify or delete audit events | Denied |
| SEC-17 | Super Admin | Employee ID issuance with audit insert failure | Entire transaction rolls back |
| SEC-18 | Super Admin | Assignment grant with audit insert failure | Entire transaction rolls back |
| SEC-19 | All roles | Call RPC through crafted arguments / wrong auth.uid | Server verifies identity and scope |
| SEC-20 | Migration review | Check existing grants, functions, schema conflicts, indexes, storage policies | No regression to existing Teacher or Result access |

## Required release gates
1. Independently review the exact implementation and privileges of `public.is_super_admin()`.
2. Run additive schema in a disposable, separately approved Preview environment; inspect table ownership, default privileges and `SECURITY DEFINER` search paths.
3. Write executable Supabase/Postgres integration tests for each case above and capture results.
4. Confirm private storage and file signature verification; do not rely on the browser MIME/extension checks.
5. Verify old enrollment and grants compatibility; create a safe rollback strategy.
6. Only then consider reviewed authenticated RPC grants and frontend integration.
7. No production SQL, merge or publication without explicit separate owner approval.

## Known gaps
The current draft functions are **not ready to execute**: schema and RPC compatibility are unverified, no read/write RLS policies are approved, no authorized RPC execution grants exist, no private bucket policies exist, and full approval transaction integration is not implemented.
