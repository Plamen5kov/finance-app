/**
 * CSV Parsing Utilities - pure functions extracted from ImportService.
 */

/** Parse CSV content into rows of string arrays, handling quoted fields. */
export function parseCSV(content: string): string[][] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return lines.map((line) => parseCSVLine(line));
}

/** Parse a single CSV line handling quoted fields with commas. */
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current);
  return result;
}

/** Parse a numeric amount string, stripping currency symbols. Returns 0 for invalid. */
export function parseAmount(value: string): number {
  if (!value || !value.trim()) return 0;
  const n = parseFloat(value.replace(/[^\d.-]/g, ''));
  return isNaN(n) ? 0 : n;
}
