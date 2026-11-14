-- MANUAL ACTIVATION ONLY — do not run during Preview package deployment.
-- Requires Preview-only Vault secrets:
--   student_purge_project_url
--   student_purge_service_role_jwt
-- Schedules one daily call at 21:00 UTC (02:30 Asia/Kolkata).
-- Worker independently refuses to run unless BOTH execution-gate secrets are set.

do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name='student_purge_project_url')
     or not exists (select 1 from vault.decrypted_secrets where name='student_purge_service_role_jwt') then
    raise exception 'Missing required Preview Vault secrets; scheduler was not installed';
  end if;
  if exists (select 1 from cron.job where jobname='student-auto-purge-daily') then
    perform cron.unschedule('student-auto-purge-daily');
  end if;
  perform cron.schedule(
    'student-auto-purge-daily',
    '0 21 * * *',
    $job$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name='student_purge_project_url')
          || '/functions/v1/student-auto-purge',
        headers := jsonb_build_object(
          'Content-Type','application/json',
          'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='student_purge_service_role_jwt')
        ),
        body := jsonb_build_object('trigger','daily_scheduler')
      );
    $job$
  );
end $$;
