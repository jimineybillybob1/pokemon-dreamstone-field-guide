import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = process.argv[2];

if (!inputPath) {
  throw new Error("Usage: node scripts/inspect-dex.mjs <dex.xlsx>");
}

const blob = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(blob);

for (const sheet of workbook.worksheets.items) {
  const used = sheet.getUsedRange();
  console.log(`\n=== ${sheet.name} (${used.address}) ===`);
  console.log(JSON.stringify(used.values.slice(0, 20), null, 2));
}
