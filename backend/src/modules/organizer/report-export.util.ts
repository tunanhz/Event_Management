import path from 'path';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { IRevenueReport } from './revenue-report.model';

/**
 * Excel/PDF renderers for a generated RevenueReport. Both read the report's
 * *frozen* totalRevenue/ticketBreakdown (computed once at generation time in
 * organizer.service.ts) — exporting never re-queries registrations, so a
 * report keeps reading the same numbers no matter when it's downloaded.
 *
 * PDF text embeds the "Be Vietnam Pro" TTF (same family the frontend uses via
 * next/font/google) because pdfkit's built-in Helvetica/Times/Courier are
 * WinAnsi-only and cannot render Vietnamese diacritics — without an embedded
 * Unicode font, names like "Vé thường" would render as garbled boxes.
 */

const FONT_REGULAR = path.join(process.cwd(), 'assets', 'fonts', 'BeVietnamPro-Regular.ttf');
const FONT_BOLD = path.join(process.cwd(), 'assets', 'fonts', 'BeVietnamPro-Bold.ttf');

function formatVnd(amount: number): string {
  return `${Math.round(amount).toLocaleString('vi-VN')}đ`;
}

function formatDate(date?: Date): string {
  if (!date) return '—';
  return new Date(date).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function rangeLabel(report: IRevenueReport): string {
  const from = report.fromDate ? formatDate(report.fromDate) : 'Từ đầu';
  const to = report.toDate ? formatDate(report.toDate) : 'đến nay';
  // Plain hyphen, not "→" — the embedded Be Vietnam Pro TTF has no arrow
  // glyph, so pdfkit silently drops it and leaves a gap in the PDF export.
  return `${from} - ${to}`;
}

/**
 * Content-Disposition value for a downloaded report file. HTTP header values
 * must be ASCII — Node's `res.setHeader` throws ERR_INVALID_CHAR on a raw
 * Vietnamese string — so this sends both: an ASCII fallback (diacritics
 * stripped) via `filename=`, and the real UTF-8 name via the RFC 6266
 * `filename*=` extension that every modern browser already prefers over the
 * ASCII fallback, so the saved file still gets the proper Vietnamese name.
 */
export function buildContentDisposition(reportName: string, extension: string): string {
  const asciiBase = reportName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics (á→a, ệ→e, ...)
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D') // đ/Đ has no NFD decomposition, needs its own mapping
    .replace(/[^A-Za-z0-9\- ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const asciiName = `${asciiBase || 'bao-cao'}.${extension}`;
  const utf8Name = encodeURIComponent(`${reportName}.${extension}`);
  return `attachment; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`;
}

/** Build the .xlsx workbook for one report: overview sheet + per-ticket detail sheet. */
export async function buildReportWorkbook(
  report: IRevenueReport,
  eventTitle: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'EventBox';
  workbook.created = new Date();

  const overview = workbook.addWorksheet('Tổng quan');
  overview.columns = [
    { header: 'Trường', key: 'k', width: 22 },
    { header: 'Giá trị', key: 'v', width: 48 },
  ];
  overview.addRows([
    { k: 'Tên báo cáo', v: report.reportName },
    { k: 'Sự kiện', v: eventTitle },
    { k: 'Khoảng thời gian', v: rangeLabel(report) },
    { k: 'Tổng doanh thu', v: formatVnd(report.totalRevenue) },
    { k: 'Ngày tạo', v: formatDate(report.generatedAt) },
  ]);
  overview.getRow(1).font = { bold: true };
  overview.getColumn('k').font = { bold: true };

  const detail = workbook.addWorksheet('Chi tiết theo loại vé');
  detail.columns = [
    { header: 'Loại vé', key: 'name', width: 28 },
    { header: 'Giá vé (đ)', key: 'price', width: 16 },
    { header: 'Số vé đã bán', key: 'sold', width: 16 },
    { header: 'Doanh thu (đ)', key: 'revenue', width: 18 },
  ];
  detail.getRow(1).font = { bold: true };
  for (const row of report.ticketBreakdown) {
    detail.addRow({
      name: row.ticketName,
      price: row.price,
      sold: row.sold,
      revenue: row.revenue,
    });
  }
  if (report.ticketBreakdown.length === 0) {
    detail.addRow({ name: 'Chưa có loại vé nào', price: '', sold: '', revenue: '' });
  }
  detail.getColumn('price').numFmt = '#,##0';
  detail.getColumn('revenue').numFmt = '#,##0';

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/** Build a one-page PDF summary for one report: header block + ticket table. */
export function buildReportPdf(report: IRevenueReport, eventTitle: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.registerFont('BeVietnamPro', FONT_REGULAR);
    doc.registerFont('BeVietnamPro-Bold', FONT_BOLD);

    doc.font('BeVietnamPro-Bold').fontSize(18).text(report.reportName);
    doc.moveDown(0.5);

    doc.font('BeVietnamPro').fontSize(11);
    doc.text(`Sự kiện: ${eventTitle}`);
    doc.text(`Khoảng thời gian: ${rangeLabel(report)}`);
    doc.text(`Ngày tạo: ${formatDate(report.generatedAt)}`);
    doc.moveDown();

    doc.font('BeVietnamPro-Bold').fontSize(13).text('Tổng doanh thu');
    doc.font('BeVietnamPro-Bold').fontSize(22).fillColor('#059669').text(formatVnd(report.totalRevenue));
    doc.fillColor('black');
    doc.moveDown(1.2);

    doc.font('BeVietnamPro-Bold').fontSize(13).text('Chi tiết theo loại vé');
    doc.moveDown(0.4);

    // Manual 4-column table — pdfkit has no built-in table layout.
    const startX = doc.x;
    const colWidths = [200, 100, 90, 110];
    const colX = [
      startX,
      startX + colWidths[0],
      startX + colWidths[0] + colWidths[1],
      startX + colWidths[0] + colWidths[1] + colWidths[2],
    ];
    const rowHeight = 22;

    const drawRow = (y: number, cells: string[], bold: boolean) => {
      doc.font(bold ? 'BeVietnamPro-Bold' : 'BeVietnamPro').fontSize(10);
      doc.text(cells[0], colX[0], y, { width: colWidths[0] });
      doc.text(cells[1], colX[1], y, { width: colWidths[1], align: 'right' });
      doc.text(cells[2], colX[2], y, { width: colWidths[2], align: 'right' });
      doc.text(cells[3], colX[3], y, { width: colWidths[3], align: 'right' });
    };

    let y = doc.y;
    drawRow(y, ['Loại vé', 'Giá vé', 'Đã bán', 'Doanh thu'], true);
    y += rowHeight;
    doc
      .moveTo(startX, y - 4)
      .lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y - 4)
      .strokeColor('#cccccc')
      .stroke();

    const rows = report.ticketBreakdown.length
      ? report.ticketBreakdown
      : [{ ticketName: 'Chưa có loại vé nào', price: 0, sold: 0, revenue: 0 } as any];

    for (const row of rows) {
      if (y > 760) {
        doc.addPage();
        y = 50;
      }
      drawRow(
        y,
        [
          row.ticketName,
          report.ticketBreakdown.length ? formatVnd(row.price) : '',
          report.ticketBreakdown.length ? String(row.sold) : '',
          report.ticketBreakdown.length ? formatVnd(row.revenue) : '',
        ],
        false
      );
      y += rowHeight;
    }

    doc.end();
  });
}
