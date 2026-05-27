type ExcelRow = Record<string, string | number | boolean | null | undefined>;

export async function exportRowsToExcel(params: {
  rows: ExcelRow[];
  sheetName?: string;
  fileName: string;
}): Promise<void> {
  const { rows, sheetName = "Sheet1", fileName } = params;
  const { utils, writeFileXLSX } = await import("xlsx");

  const wb = utils.book_new();
  const ws = utils.json_to_sheet(rows);
  utils.book_append_sheet(wb, ws, sheetName);
  writeFileXLSX(wb, fileName);
}
