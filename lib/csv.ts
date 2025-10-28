export type CsvRow = Record<string, string>;

export type CsvParseResult = {
  headers: string[];
  rows: CsvRow[];
};

function splitLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
}

export function parseCsv(content: string): CsvParseResult {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = splitLine(lines[0]).map((header) => header.trim());
  const rows: CsvRow[] = [];

  for (let index = 1; index < lines.length; index += 1) {
    const values = splitLine(lines[index]).map((value) => value.trim());
    const row: CsvRow = {};

    headers.forEach((header, position) => {
      row[header.toLowerCase()] = values[position] ?? '';
    });

    rows.push(row);
  }

  return { headers, rows };
}
