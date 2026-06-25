import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";

export async function generatePdfReport(title: string, sections: Record<string, unknown>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text(title, { align: "center" });
    doc.moveDown();
    doc.fontSize(10).text(`Generated: ${new Date().toISOString()}`, { align: "right" });
    doc.moveDown();

    for (const [key, value] of Object.entries(sections)) {
      doc.fontSize(14).text(key.replace(/_/g, " ").toUpperCase());
      doc.fontSize(10).text(JSON.stringify(value, null, 2), { width: 500 });
      doc.moveDown();
    }

    doc.end();
  });
}

export async function generateExcelReport(
  title: string,
  rows: Array<Record<string, string | number>>,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(title.slice(0, 31));
  if (rows.length === 0) {
    sheet.addRow(["metric", "value"]);
    sheet.addRow(["empty", 0]);
  } else {
    const headers = Object.keys(rows[0]!);
    sheet.addRow(headers);
    for (const row of rows) {
      sheet.addRow(headers.map((h) => row[h] ?? ""));
    }
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function toCsv(rows: Array<Record<string, string | number>>): string {
  if (!rows.length) return "metric,value\nempty,0\n";
  const headers = Object.keys(rows[0]!);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => String(row[h] ?? "").replace(/,/g, ";")).join(","));
  }
  return lines.join("\n");
}
