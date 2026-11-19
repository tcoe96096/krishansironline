# Preview user_roles TRUNCATE grant source — verified 18 November 2026

**READ-ONLY EVIDENCE. No SQL mutations or deployment.**

Project: Supabase Preview `zgpkmfqioqvincmgyfpi` (NOT Production).

Query executed:
```sql
SELECT grantee,privilege_type,is_grantable
FROM information_schema.role_table_grants
WHERE table_schema='public' AND table_name='user_roles'
  AND privilege_type='TRUNCATE'
ORDER BY grantee;
```

Observed explicit grants:

| Grantee | TRUNCATE | Grantable |
| --- | --- | --- |
| anon | yes | no |
| authenticated | yes | no |
| postgres | yes | yes |
| service_role | yes | no |

This confirms the two client roles have direct table grants, not merely a theoretical effective-privilege result. The candidate `teacher_v2_user_roles_truncate_remediation_REVIEW_ONLY.sql` revokes TRUNCATE from PUBLIC, anon and authenticated, leaving privileged service_role/postgres grants unchanged. This is a **proposal**, not evidence of successful remediation. Check effective grants again after any separately approved execution; role inheritance must still be reviewed. RLS cannot protect TRUNCATE. Verify recoverable Preview backup/restore first. No destructive TRUNCATE test is permitted.
