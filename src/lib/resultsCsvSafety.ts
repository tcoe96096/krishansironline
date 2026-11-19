/** Escape an admin-only CSV cell without allowing spreadsheet formula execution.
 * CSV quoting alone does not neutralize Excel/Sheets formulas. A leading
 * whitespace/control prefix can also precede a formula marker.
 * Keep all output as quoted UTF-8 text; never evaluate imported cell values.
 */
export function escapeResultsCsvCell(value: unknown): string {
  const raw = String(value ?? '');
  // A tab, CR or LF at the start is itself an injection vector; preserve
  // visible text while neutralizing spreadsheet interpretation.
  // Include invisible format characters that JavaScript \s does not match.\n  // These can visually hide a formula marker in imported spreadsheet data.\n  const unsafe = /^[\s\u0000-\u001f\u007f-\u009f\u00ad\u180e\u200b-\u200d\u2060]*[=+@-]/u.test(raw)
    || /^[\t\r\n]/u.test(raw);
  const safe = unsafe ? "'" + raw : raw;
  return '"' + safe.replace(/"/g, '""') + '"';
}
