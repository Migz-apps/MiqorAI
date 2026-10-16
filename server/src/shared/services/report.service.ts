import { prisma } from "../lib/prisma.js";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";

function formatPdfValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function ensurePdfRoom(doc: PDFKit.PDFDocument, needed: number) {
  if (doc.y + needed > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
}

function renderPdfKeyValues(doc: PDFKit.PDFDocument, obj: Record<string, unknown>) {
  for (const [key, value] of Object.entries(obj)) {
    ensurePdfRoom(doc, 16);
    doc.fontSize(10).font("Helvetica-Bold").text(`${key.replace(/_/g, " ")}: `, { continued: true });
    doc.font("Helvetica").text(formatPdfValue(value));
  }
}

function renderPdfTable(doc: PDFKit.PDFDocument, rows: Array<Record<string, unknown>>) {
  const headers = Object.keys(rows[0] ?? {});
  if (!headers.length) return;
  const usable = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colWidth = usable / headers.length;

  const renderRow = (cells: string[], bold: boolean) => {
    ensurePdfRoom(doc, 18);
    const y = doc.y;
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9);
    let maxHeight = 0;
    cells.forEach((cell, idx) => {
      doc.text(cell, doc.page.margins.left + idx * colWidth, y, { width: colWidth - 6 });
      maxHeight = Math.max(maxHeight, doc.heightOfString(cell, { width: colWidth - 6 }));
    });
    doc.x = doc.page.margins.left;
    doc.y = y + maxHeight + 4;
  };

  renderRow(headers.map((h) => h.replace(/_/g, " ")), true);
  for (const row of rows) {
    renderRow(headers.map((h) => formatPdfValue(row[h])), false);
  }
}

export async function generatePdfReport(title: string, sections: Record<string, unknown>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).font("Helvetica-Bold").text(title, { align: "center" });
    doc.moveDown();
    doc.fontSize(10).font("Helvetica").text(`Generated: ${new Date().toISOString()}`, { align: "right" });
    doc.moveDown();

    for (const [key, value] of Object.entries(sections)) {
      ensurePdfRoom(doc, 40);
      doc.fontSize(14).font("Helvetica-Bold").text(key.replace(/_/g, " ").toUpperCase());
      doc.moveDown(0.5);
      doc.font("Helvetica");
      if (
        Array.isArray(value) &&
        value.length > 0 &&
        value.every((item) => item && typeof item === "object" && !Array.isArray(item))
      ) {
        renderPdfTable(doc, value as Array<Record<string, unknown>>);
      } else if (Array.isArray(value)) {
        for (const item of value) {
          ensurePdfRoom(doc, 14);
          doc.fontSize(10).text(`• ${formatPdfValue(item)}`);
        }
      } else if (value && typeof value === "object") {
        renderPdfKeyValues(doc, value as Record<string, unknown>);
      } else {
        doc.fontSize(10).text(formatPdfValue(value));
      }
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

function csvField(value: string | number | null | undefined): string {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: Array<Record<string, string | number>>): string {
  if (!rows.length) return "metric,value\nempty,0\n";
  const headers = Object.keys(rows[0]!);
  const lines = [headers.map(csvField).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvField(row[h])).join(","));
  }
  return lines.join("\n");
}

export async function listReportSchedules(ownerType: string, ownerId: string) {
  return prisma.reportSchedule.findMany({ where: { ownerType, ownerId, isActive: true } });
}

export async function createReportSchedule(
  ownerType: string,
  ownerId: string,
  input: { report_type: string; frequency: string; email?: string },
) {
  return prisma.reportSchedule.create({
    data: { ownerType, ownerId, reportType: input.report_type, frequency: input.frequency, email: input.email },
  });
}
