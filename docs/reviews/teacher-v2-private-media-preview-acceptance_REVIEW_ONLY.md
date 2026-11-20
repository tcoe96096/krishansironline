# Teacher v2 private-media authorization — REVIEW ONLY (2026-11-20)

Status: **DESIGN / TEST PLAN ONLY**. No bucket creation, SQL execution, grants, deployment or feature activation. Keep all teacher media flags OFF.

## Threat model and ownership

- Registration photo and resume are private user data. The registration demo's in-memory object URL is **not** persistent storage and must not be treated as proof of storage acceptance.
- Storage bucket must be private. Never embed service-role keys, public object URLs, persistent signed URLs or bearer tokens in the browser, evidence logs or database rows.
- Use an authenticated server-issued opaque media object identifier; derive ownership from verified `auth.uid()` and server-side application record, **never** from an employee ID, client-supplied role, arbitrary path or Google email.
- Store photo/resume separately under random object keys. Enforce content-type, extension, byte limit and file signature server-side; avoid trusting browser metadata. Record audit events without raw media paths, tokens or sensitive metadata.
- A teacher may read/replace their own approved media subject to account state. Admin review is limited to a separately authenticated, verified Super Admin with a server-side review purpose; no broad staff or generic authenticated access.
- Rejected/withdrawn applications, revoked accounts and expired review authorization must deny subsequent access. Retention/deletion policy requires explicit owner review; no automatic deletion in this packet.
- Private media access must use short-lived server-issued signed links after authorization, with no public listing, no cross-user caching, and safe expiry/revocation handling. Do not log signed URLs.

## Required authenticated Preview acceptance cases

| ID | Actor | Operation | Expected |
|---|---|---|---|
| M01 | Teacher A, verified auth | Upload own photo to authorized application | Allow only after validated ownership, size, type and signature |
| M02 | Teacher A | Read own photo after fresh login | Allow only if server-authorized; persisted object displayed |
| M03 | Teacher B | Read/replace Teacher A photo | Deny, including guessed path and copied object identifier |
| M04 | Teacher A | Read Teacher B resume | Deny |
| M05 | Anonymous | List, upload, download or delete any teacher object | Deny |
| M06 | Generic authenticated student/staff | Read or list teacher objects | Deny |
| M07 | Verified Super Admin with review purpose | Read applicant media | Allow limited scoped review; audit without signed URL |
| M08 | Claimed admin in client metadata without server grant | Read applicant media | Deny |
| M09 | Teacher with forged employee ID, role or object path | Access another user's media | Deny |
| M10 | Teacher A | Upload oversized, unsupported or mismatched-signature file | Deny without persisted object |
| M11 | Expired/revoked reviewer | Reuse old signed URL / request new one | New issue denied; expired link must fail |
| M12 | Teacher A after withdrawal/revocation | Read/replace protected media | Deny according to approved lifecycle policy |
| M13 | Any non-owner | Delete another teacher's object | Deny |
| M14 | Teacher A | Replace own photo | Only current authorized object available; no orphaned public copy |

For every case capture: exact Preview project reference, role identity class (no PII), test timestamp, object-policy version, request outcome, and sanitized evidence reference. Mark **BLOCKED**, not PASS, until tested against real authenticated Preview roles and Storage RLS. Mock/unit tests cannot satisfy this gate.

## Release gate

1. Verify full, restorable backup/recovery independently (TOC listing is insufficient).
2. Review candidate SQL/Storage RLS, grants and RPC ownership against live read-only catalog evidence; resolve Preview `public.user_roles` TRUNCATE exposure and missing v2 RPCs in a separately approved change.
3. Run M01–M14 with positive and negative real Preview identities; confirm signed-link expiry and unauthorized list denial.
4. Obtain distinct explicit owner authorization for any Preview mutation and later separate Production approval. Never infer approval from CI success.
5. Keep GitHub Pages hosting, Cloudflare DNS-only and all feature flags OFF until gates are met.

Ownership boundary: teacher-only proposal. Do not modify Results, Study Materials, Website Studio, PR #109, or Production.
