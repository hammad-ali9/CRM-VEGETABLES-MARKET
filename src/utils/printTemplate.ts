/**
 * Shared professional print template for Abbasi & Co reports.
 * Opens a new window with styled HTML and triggers print.
 */

export interface PrintColumn {
  label: string;
  urdu?: string;
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
  rows: string[][];          // each inner array = one row of cell values
  summaryRows?: PrintSummaryRow[];
  emptyMessage?: string;
}

const BRAND_COLOR = '#1a1a2e';
const ACCENT_COLOR = '#16213e';

export function openPrintWindow(opts: PrintOptions) {
  const fmt = (v: string) => v ?? '';

  const theadCells = opts.columns.map(c =>
    `<th style="text-align:${c.align ?? 'left'}">${c.label}${c.urdu ? `<br><span class="urdu">${c.urdu}</span>` : ''}</th>`
  ).join('');

  const tbodyRows = opts.rows.length === 0
    ? `<tr><td colspan="${opts.columns.length}" class="empty">${opts.emptyMessage ?? 'No records for this period'}</td></tr>`
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
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${opts.title} — ${opts.periodLabel}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 11px;
      color: #1a1a1a;
      background: #fff;
      padding: 24px 28px;
    }

    /* ── Header ── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 16px;
      border-bottom: 3px solid ${BRAND_COLOR};
      margin-bottom: 20px;
    }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-logo {
      width: 44px; height: 44px; border-radius: 10px;
      background: ${BRAND_COLOR};
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 20px; font-weight: 900;
    }
    .brand-name { font-size: 18px; font-weight: 800; color: ${BRAND_COLOR}; }
    .brand-sub { font-size: 10px; color: #666; margin-top: 2px; }
    .header-right { text-align: right; }
    .report-title { font-size: 15px; font-weight: 700; color: ${ACCENT_COLOR}; }
    .report-meta { font-size: 10px; color: #888; margin-top: 4px; }
    .period-badge {
      display: inline-block; margin-top: 6px;
      background: ${BRAND_COLOR}; color: white;
      padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 600;
    }

    /* ── Table ── */
    .table-wrap { margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: ${BRAND_COLOR}; color: white; }
    th {
      padding: 9px 10px; font-size: 10px; font-weight: 600;
      letter-spacing: 0.03em; text-transform: uppercase;
    }
    .urdu { font-size: 9px; opacity: 0.75; font-weight: 400; }
    td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; font-size: 11px; }
    tr.even { background: #fafafa; }
    tr.odd  { background: #ffffff; }
    tr:hover { background: #f0f4ff; }
    .empty { text-align: center; padding: 28px; color: #aaa; font-style: italic; }

    /* ── Summary ── */
    .summary-box {
      float: right; width: 280px;
      border: 1px solid #e8e8e8; border-radius: 8px;
      overflow: hidden; margin-top: 4px;
    }
    .summary-table { width: 100%; border-collapse: collapse; }
    .sum-label, .sum-value {
      padding: 7px 12px; font-size: 11px; border-bottom: 1px solid #f0f0f0;
    }
    .sum-label { color: #555; }
    .sum-value { text-align: right; font-weight: 500; }
    .bold { font-weight: 700 !important; font-size: 12px !important; }

    /* ── Footer ── */
    .footer {
      clear: both;
      margin-top: 28px; padding-top: 12px;
      border-top: 1px solid #e8e8e8;
      display: flex; justify-content: space-between;
      font-size: 9px; color: #aaa;
    }

    /* ── Print ── */
    @media print {
      body { padding: 12px 16px; }
      @page { margin: 1cm; size: A4 landscape; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="brand-logo">A</div>
      <div>
        <div class="brand-name">Abbasi &amp; Co</div>
        <div class="brand-sub">Tomato Trading Management System</div>
      </div>
    </div>
    <div class="header-right">
      <div class="report-title">${opts.title}</div>
      <div class="report-meta">${opts.subtitle ?? ''}</div>
      <div class="period-badge">${opts.periodLabel}</div>
      <div class="report-meta" style="margin-top:6px">Printed: ${new Date().toLocaleString()}</div>
    </div>
  </div>

  <div class="table-wrap">
    <table>
      <thead><tr>${theadCells}</tr></thead>
      <tbody>${tbodyRows}</tbody>
    </table>
  </div>

  ${summaryHtml}

  <div style="margin-top: 24px; padding: 12px; border: 1.5px solid #eee; border-radius: 8px; width: fit-content; min-width: 280px; clear: both;">
    <div style="font-size: 9px; font-weight: 700; color: ${BRAND_COLOR}; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; border-bottom: 1px solid #eee; padding-bottom: 4px;">
      Bank Account Details (برائے مہربانی اس اکاؤنٹ میں ادائیگی کریں)
    </div>
    <div style="font-size: 10.5px; color: #1a1a1a; line-height: 1.6;">
      <div style="font-weight: 700;">Name: KHALID MEHMOOD ABBASI</div>
      <div style="font-family: monospace; font-size: 11px; font-weight: 600;">Account: 08120103923924</div>
      <div style="font-family: monospace; font-size: 11px; font-weight: 600;">IBAN: PK67MEZN0008120103923924</div>
      <div style="font-size: 9.5px; color: #666; font-weight: 500;">Meezan Bank, KHANNA PUL-RAWALPINDI Branch</div>
    </div>
  </div>

  <div class="footer">
    <span>Abbasi &amp; Co — Tomato Trading Management System</span>
    <span>Powered By <a href="https://www.nexauratechs.com" target="_blank" style="color:#1a1a2e;font-weight:600;text-decoration:none">Nexaura Technologies</a></span>
  </div>

  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
