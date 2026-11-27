/**
 * CSV cell/row escaping shared by every CSV export.
 *
 * INVARIANT: every cell written to a CSV that a person may open in a
 * spreadsheet goes through csvCell — exported values come from public forms,
 * so a value such as `=HYPERLINK(...)` must never reach Excel/Sheets as a
 * formula (CSV injection).
 */

/**
 * A spreadsheet treats a cell as a formula when it starts with = + - @, and
 * TAB / CR at the start can be used to smuggle one in (OWASP CSV Injection).
 * Leading whitespace before the trigger is covered too, because some
 * importers trim cells before interpreting them.
 */
const FORMULA_START = /^[\t\r]|^\s*[=+\-@]/;

/**
 * Escape one value as a quoted CSV cell.
 * null/undefined become an empty cell; everything else is stringified.
 * Formula-like values get a leading single quote, which spreadsheets read as
 * "this is text". Accepted trade-off: "-5" and "+27 82 ..." are prefixed too.
 */
export function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  const safe = FORMULA_START.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** Escape a list of values as one comma-separated CSV line (no line ending). */
export function csvRow(values: readonly unknown[]): string {
  return values.map(csvCell).join(",");
}
