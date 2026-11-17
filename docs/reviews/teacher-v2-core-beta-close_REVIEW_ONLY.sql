-- REVIEW ONLY. NOT EXECUTED. Requires target-specific incident/rollback authorization.
-- No data, employee identity, audit or assignment record is deleted.
BEGIN;
UPDATE private.teacher_beta_features SET enabled=false;
INSERT INTO private.teacher_beta_feature_audit(action,reason)
VALUES('close_beta','Owner authorized closing all Teacher Beta feature gates');
COMMIT;
