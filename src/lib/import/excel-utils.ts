import * as XLSX from 'xlsx';

/**
 * Parse Excel file and return raw rows (client-safe, no 'use server')
 */
export function parseExcelFile(buffer: ArrayBuffer): { headers: string[]; rows: Record<string, unknown>[] } {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

  if (rawData.length === 0) {
    return { headers: [], rows: [] };
  }

  // First row is headers
  const headers = rawData[0].map(String);
  const rows = rawData.slice(1).map((row) => {
    const obj: Record<string, unknown> = {};
    row.forEach((value, index) => {
      const header = headers[index];
      if (header) {
        obj[header] = value;
      }
    });
    return obj;
  }).filter((row) => Object.values(row).some((v) => v !== undefined && v !== null && v !== ''));

  return { headers, rows };
}
