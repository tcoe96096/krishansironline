-- Preview only. Schedule after backend and browser integration have been validated.
-- The worker locks due attempts and never writes new answers after the deadline.
select cron.schedule('ksol-exam-finalize-v1','* * * * *','select ksol_exam_private.finalize_due_attempts();');
