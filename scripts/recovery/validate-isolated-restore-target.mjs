#!/usr/bin/env node
/**
 * Validates the *destination identity* before a real backup restore.
 * No connections, secrets, restores, or writes. Never treats validation as restore success.
 */
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

export const PROTECTED_PROJECTS = Object.freeze([
  'vsqwlkqqsxcehvdsdbna', // production
  'zgpkmfqioqvincmgyfpi'  // existing preview
]);
const REF_PATTERN = /^[a-z]{20}$/;
const DB_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/;

export function validateRestoreTarget({projectRef, host, user, database, port, confirmProjectRef} = {}) {
  const errors = [];
  const ref = String(projectRef ?? '').trim().toLowerCase();
  const hostname = String(host ?? '').trim().toLowerCase();
  const username = String(user ?? '').trim();
  const db = String(database ?? '').trim();
  const numberPort = Number(port);
  const confirmation = String(confirmProjectRef ?? '').trim().toLowerCase();

  if (!REF_PATTERN.test(ref)) errors.push('INVALID_PROJECT_REF');
  if (PROTECTED_PROJECTS.includes(ref)) errors.push('PROTECTED_PROJECT_REF');
  if (!ref || confirmation !== ref) errors.push('DESTINATION_CONFIRMATION_MISMATCH');
  if (!DB_NAME_PATTERN.test(db)) errors.push('INVALID_DATABASE_NAME');
  if (numberPort !== 5432) errors.push('INVALID_PORT');

  // Fail closed: no arbitrary hostnames, IPs, proxies or ambiguous poolers.
  // Supabase direct host ties the hostname to the isolated project reference.
  if (!ref || hostname !== `db.${ref}.supabase.co`) errors.push('DESTINATION_HOST_MISMATCH');
  if (username !== 'postgres') errors.push('DESTINATION_USER_MISMATCH');

  for (const protectedRef of PROTECTED_PROJECTS) {
    if (hostname.includes(protectedRef) || username.includes(protectedRef)) {
      errors.push('PROTECTED_DESTINATION_IDENTITY');
      break;
    }
  }
  return {ok: errors.length === 0, errors};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = validateRestoreTarget({
    projectRef: process.env.KSOL_RESTORE_TARGET_PROJECT_REF,
    host: process.env.KSOL_RESTORE_TARGET_HOST,
    user: process.env.KSOL_RESTORE_TARGET_USER,
    database: process.env.KSOL_RESTORE_TARGET_DB,
    port: process.env.KSOL_RESTORE_TARGET_PORT,
    confirmProjectRef: process.env.KSOL_RESTORE_CONFIRM_PROJECT_REF
  });
  // Do not print hostnames, credentials or other environment values.
  console.log(result.ok ? 'ISOLATED_TARGET_IDENTITY_OK (no restore performed)' : 'ISOLATED_TARGET_IDENTITY_REJECTED: ' + result.errors.join(','));
  if (!result.ok) process.exitCode = 2;
}
