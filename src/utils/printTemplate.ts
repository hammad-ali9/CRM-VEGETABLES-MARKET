/**
 * Shared professional print template for Abbasi & Co reports.
 * Opens a new window with styled HTML and triggers print.
 */

import pdfHeaderImgUrl from '../assets/PDF Header.jpeg';

export interface PrintColumn {
  label: string;     // Urdu column header text
  align?: 'left' | 'right' | 'center';
}

export interface PrintSummaryRow {
  label: string;
  value: string;
  bold?: boolean;
  color?: string;
}

export interface PrintOptions {
  title: string;
  subtitle?: string;
  periodLabel: string;
  columns: PrintColumn[];
  rows: string[][];
  summaryRows?: PrintSummaryRow[];
  emptyMessage?: string;
}

const BRAND_COLOR = '#1a1a2e';

export function openPrintWindow(opts: PrintOptions) {
  const fmt = (v: string) => v ?? '';

  const theadCells = opts.columns.map(c =>
    `<th style="text-align:${c.align ?? 'left'}">${c.label}</th>`
  ).join('');

  const tbodyRows = opts.rows.length === 0
    ? `<tr><td colspan="${opts.columns.length}" class="empty">${opts.emptyMessage ?? 'اس دور میں کوئی ریکارڈ نہیں'}</td></tr>`
    : opts.rows.map((row, i) =>
        `<tr class="${i % 2 === 0 ? 'even' : 'odd'}">${row.map((cell, ci) =>
          `<td style="text-align:${opts.columns[ci]?.align ?? 'left'}">${fmt(cell)}</td>`
        ).join('')}</tr>`
      ).join('');

  const summaryHtml = opts.summaryRows ? `
    <div class="summary-box">
      <table class="summary-table">
        ${opts.summaryRows.map(r => `
          <tr>
            <td class="sum-label${r.bold ? ' bold' : ''}">${r.label}</td>
            <td class="sum-value${r.bold ? ' bold' : ''}" style="color:${r.color ?? 'inherit'}">${r.value}</td>
          </tr>`).join('')}
      </table>
    </div>` : '';

  const html = `<!DOCTYPE html>
<html lang="ur" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>${opts.title} — ${opts.periodLabel}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', 'Noto Nastaliq Urdu', Arial, sans-serif;
      font-size: 11px;
      color: #1a1a1a;
      background: #fff;
      padding: 20px 24px;
      direction: rtl;
    }

    /* ── PDF Header Image ── */
    .pdf-header-img {
      width: 100%;
      margin-bottom: 0;
      line-height: 0;
    }
    .pdf-header-img img {
      width: 100%;
      height: auto;
      display: block;
    }

    /* ── Report Info Bar (below image) ── */
    .report-info-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: ${BRAND_COLOR};
      color: white;
      padding: 7px 14px;
      margin-bottom: 14px;
    }
    .report-title { font-size: 13px; font-weight: 700; }
    .report-sub { font-size: 10px; opacity: 0.75; margin-right: 8px; }
    .report-info-right { text-align: left; font-size: 10px; opacity: 0.85; }
    .period-badge {
      display: inline-block;
      background: rgba(255,255,255,0.2);
      padding: 2px 10px; border-radius: 20px;
      font-size: 10px; font-weight: 600; margin-bottom: 3px;
    }

    /* ── Table ── */
    .table-wrap { margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: ${BRAND_COLOR}; color: white; }
    th {
      padding: 8px 9px; font-size: 10px; font-weight: 600;
      letter-spacing: 0.01em;
    }
    td { padding: 6px 9px; border-bottom: 1px solid #f0f0f0; font-size: 10.5px; }
    tr.even { background: #fafafa; }
    tr.odd  { background: #ffffff; }
    .empty { text-align: center; padding: 24px; color: #aaa; font-style: italic; }

    /* ── Summary ── */
    .summary-box {
      float: left; width: 260px;
      border: 1px solid #e8e8e8; border-radius: 8px;
      overflow: hidden; margin-top: 4px;
    }
    .summary-table { width: 100%; border-collapse: collapse; }
    .sum-label, .sum-value {
      padding: 6px 11px; font-size: 10.5px; border-bottom: 1px solid #f0f0f0;
    }
    .sum-label { color: #555; }
    .sum-value { text-align: right; font-weight: 500; }
    .bold { font-weight: 700 !important; font-size: 11.5px !important; }

    /* ── Bank + Footer bar ── */
    .bottom-bar {
      clear: both;
      margin-top: 14px;
      padding: 8px 12px;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      background: #fafafa;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      gap: 16px;
    }
    .bank-info { display: flex; gap: 16px; flex-wrap: wrap; align-items: center; }
    .bank-label { font-weight: 700; color: ${BRAND_COLOR}; font-size: 10px; }
    .bank-field { color: #333; }
    .bank-mono { font-family: monospace; font-size: 10.5px; font-weight: 600; }
    .footer-credit { font-size: 9px; color: #aaa; white-space: nowrap; }

    /* ── Print: fit to one page ── */
    @media print {
      html { zoom: 62%; }
      body { padding: 6px 10px; }
      @page { size: A4 landscape; margin: 5mm; }
    }
  </style>
</head>
<body>
  <div class="pdf-header-img">
    <img src="${pdfHeaderImgUrl}" alt="عباسی اینڈ کو" />
  </div>

  <div class="report-info-bar">
    <div>
      <span class="report-title">${opts.title}</span>
      ${opts.subtitle ? `<span class="report-sub"> — ${opts.subtitle}</span>` : ''}
    </div>
    <div class="report-info-right">
      <div class="period-badge">${opts.periodLabel}</div>
      <div>پرنٹ: ${new Date().toLocaleString('ur-PK')}</div>
    </div>
  </div>

  <div class="table-wrap">
    <table>
      <thead><tr>${theadCells}</tr></thead>
      <tbody>${tbodyRows}</tbody>
    </table>
  </div>

  ${summaryHtml}

  <div class="bottom-bar">
    <div class="bank-info">
      <span class="bank-label">بینک اکاؤنٹ (ادائیگی کے لیے):</span>
      <span class="bank-field">نام: <strong>خالد محمود عباسی</strong></span>
      <span class="bank-field">اکاؤنٹ: <span class="bank-mono">08120103923924</span></span>
      <span class="bank-field">IBAN: <span class="bank-mono">PK67MEZN0008120103923924</span></span>
      <span class="bank-field">میزان بینک، کھنہ پل ۔ راولپنڈی</span>
    </div>
    <span class="footer-credit">بذریعہ <a href="https://www.nexauratechs.com" target="_blank" style="color:${BRAND_COLOR};font-weight:600;text-decoration:none">نیکساؤرا ٹیکنالوجیز</a></span>
  </div>

  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
