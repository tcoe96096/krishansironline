# Preview result delivery grants / RPC ACL verification — 2026-11-22

Read-only `information_schema.role_table_grants` and `pg_proc` catalog checks.

| Object | Verified grants to browser roles |
|---|---|
| `public.result_delivery_notices` | authenticated: SELECT only |
| `public.result_delivery_audit` | authenticated: SELECT only |
| `public.result_card_templates` | anon: SELECT; authenticated: SELECT |
| `public.send_result_to_student(uuid)` | authenticated: EXECUTE; SECURITY DEFINER owned by postgres |
| `public.publish_result_card_template(text,jsonb,text)` | authenticated: EXECUTE; SECURITY DEFINER owned by postgres |
| `public.can_publish_result_card_template()` | authenticated: EXECUTE; SECURITY INVOKER owned by postgres |

**Correction to earlier hypothesis:** Although Preview has an authenticated UPDATE RLS policy for `result_delivery_notices`, the verified *table-level* role grants show only SELECT for authenticated, so the policy alone does **not** confer UPDATE capability. Check column-specific grants and other inherited memberships before claiming the notice is editable. The actual mark-read UI path must be reviewed separately.

**Security implications:** Both mutating RPCs are SECURITY DEFINER and explicitly granted EXECUTE to authenticated. They enforce authorization internally; verify their guards with real JWTs. Their ownership is postgres, so carefully assess RLS bypass and function search_path. Do not broaden grants in Production without a specific reviewed need.

**Next gates:** Confirm column grants and inherited privileges; design narrowly scoped mark-read RPC if needed; verify private result version storage; real-role integration tests; independent restore evidence. No database writes occurred.
