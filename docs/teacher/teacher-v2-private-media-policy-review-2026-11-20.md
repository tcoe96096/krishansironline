# Teacher v2 private media authorization — REVIEW ONLY

Status: **NO-GO**. This document is a proposal, not an installed policy, migration, or successful acceptance result. Feature flags remain OFF.

## Boundary and ownership

Use private Supabase Storage buckets for teacher photos and resumes; never expose public buckets, public URLs, service-role keys, or unrestricted signed URLs in the browser. Object paths must be server-assigned, bound to immutable authenticated user ID and media type, and checked against the authoritative teacher application/profile owner. A teacher employee ID is display metadata, **not** an authorization credential.

Registration can stage a photo locally, but durable upload requires authenticated ownership and a private object policy. If registration precedes login, retain the image only locally until an authenticated session exists; do not treat a client-supplied teacher ID as proof. Reject MIME/content mismatch, enforce size limits, sanitize names, and use generated opaque object keys.

## Role contract (deny by default)

| Actor | Upload own | Read own | Read other teacher | Delete other teacher |
| --- | --- | --- | --- | --- |
| Anonymous | Deny | Deny | Deny | Deny |
| Pending authenticated teacher | Allow only own authorized staging path | Allow only own | Deny | Deny |
| Approved teacher | Allow own authorized path | Allow own | Deny | Deny |
| Independent reviewer | Deny by default | Deny unless explicitly assigned review scope | Only assigned application, time-limited | Deny |
| Super admin | Controlled audited administrative path | Authorized audited path | Authorized audited path | Controlled audited path |

A reviewer's authority must be checked server-side against an independently assigned review scope, not an editable claim in teacher profile data. Revocation must stop issuance of new signed URLs; previously issued URLs may remain valid until expiration, so choose short TTLs and document this residual risk.

## Required read-only inventory and real acceptance

1. Inspect `storage.buckets` privacy and MIME/size limits; also inspect **RLS and policies on `storage.objects`**, including `USING` and `WITH CHECK`, for all teacher buckets. Bucket privacy alone does not prove object isolation.
2. Inventory `SELECT/INSERT/UPDATE/DELETE` grants and any SECURITY DEFINER helpers; validate search_path and identity checks for helpers.
3. Authenticate separate Teacher A and Teacher B sessions. Confirm A can upload/read only A's objects and B cannot list, fetch, overwrite, move, or delete A's object. Check path traversal and client-supplied owner IDs.
4. Test pending, rejected, approved, reviewer (assigned/unassigned), super-admin and anonymous identities with both allowed and denied operations. Preserve HTTP results, audit logs, policy version, project ID, test timestamp, and commit SHA.
5. Verify that no frontend uses `getPublicUrl` for teacher private media, and signed URL generation is restricted to an authorized server-side pathway. Confirm Google OAuth identity cannot be used to impersonate another teacher.
6. Restore a full backup into a separate isolated environment and verify data/schema/roles/media recovery before any Preview changes; obtain distinct explicit owner authorization for any migration or grant change.

## Integration constraint

Teacher-owned UI/backend contracts only. Coordinate required Study Materials, Results, and Studio interfaces via separate proposals; do not edit their owned files. PR #109 remains strictly read-only. No Preview/Production mutation, merge, deploy, DNS changes, or feature activation is authorized by this document.
