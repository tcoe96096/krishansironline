/** Escape an admin-only CSV cell without allowing spreadsheet formula execution.
 * CSV quoting alone does not neutralize Excel/Sheets formulas. A leading
 * whitespace/control prefix can also precede a formula marker.
 * Keep all output as quoted UTF-8 text; never evaluate imported cell values.
 */
export function escapeResultsCsvCell(value: unknown): string {
  const raw = String(value ?? '');
  // A tab, CR or LF at the start is itself an injection vector; preserve
  // visible text while neutralizing spreadsheet interpretation.
  const unsafe = /^[\s\u0000-\u001f\u007f-\u009f]*[=+@-]/u.test(raw)
    || /^[\t\r\n]/u.test(raw);
  const safe = unsafe ? "'" + raw : raw;
  return '"' + safe.replace(/"/g, '""') + '"';
}
