-- Read-only acceptance checks for the Preview purge foundation.
-- Run after the migration. This file does not create users or delete Auth identities.
select
  (select count(*)=2 from pg_extension where extname in ('pg_cron','pg_net')) as scheduler_extensions_installed,
  (select count(*)=5 from information_schema.columns
    where table_schema='public' and table_name='student_profiles'
      and column_name in ('purge_claim_token','purge_claimed_at','purge_attempts','purge_completed_at','purge_last_error_code')) as lifecycle_columns_installed,
  (select count(*)=0 from cron.job where jobname='student-auto-purge-daily') as no_purge_cron_job_active,
  (select count(*)=0 from public.student_profiles
    where purge_completed_at is not null and account_status <> 'deleted') as no_completed_non_deleted_profiles;
