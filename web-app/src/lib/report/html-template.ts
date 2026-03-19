import { marked } from 'marked'

export interface ReportHtmlOptions {
  orgName: string
  orgLogo?: string
  primaryColour: string
  accentColour: string
  textColour: string
  caseNumber: string
  caseDate: string
  assessorName: string
  clientName: string
  sections: Array<{ heading: string; bodyHtml: string }>
  financialSummary?: Record<string, unknown>
  disclaimerText?: string
}

marked.setOptions({ breaks: true, gfm: true })

export function mdToHtml(md: string): string {
  return marked.parse(md, { async: false }) as string
}

export function buildReportHtml(options: ReportHtmlOptions): string {
  const {
    orgName,
    orgLogo,
    primaryColour,
    accentColour,
    textColour,
    caseNumber,
    caseDate,
    assessorName,
    clientName,
    sections,
    financialSummary,
    disclaimerText,
  } = options

  const logoHtml = orgLogo
    ? `<img src="${orgLogo}" class="org-logo" alt="${orgName}" />`
    : ''

  const sectionsHtml = sections
    .map(
      (s, i) => `
      <div class="report-section">
        <div class="section-heading">${i + 1}. ${escapeHtml(s.heading)}</div>
        <div class="section-body">${s.bodyHtml}</div>
      </div>`,
    )
    .join('\n')

  const financialHtml = financialSummary
    ? buildFinancialTable(financialSummary)
    : ''

  const disclaimerBlock = disclaimerText
    ? `<div class="disclaimer">${escapeHtml(disclaimerText)}</div>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(caseNumber)} – Assessment Report</title>
<style>
  :root {
    --primary: ${primaryColour};
    --accent: ${accentColour};
    --text: ${textColour};
    --muted: #6B6B7E;
    --bg-alt: #FAFAF8;
    --border: #E5E7EB;
  }

  @page {
    size: A4;
    margin: 20mm 15mm 25mm 15mm;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
      'Helvetica Neue', Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.5;
    color: var(--text);
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 8mm;
    padding-bottom: 4mm;
    border-bottom: 2px solid var(--primary);
  }

  .header-left { flex: 1; }

  .org-logo {
    max-width: 120px;
    max-height: 60px;
    object-fit: contain;
  }

  .header-right {
    text-align: right;
    flex: 1;
  }

  .org-name {
    font-size: 14pt;
    font-weight: 700;
    color: var(--primary);
    margin-bottom: 2mm;
  }

  .title-bar {
    background: var(--primary);
    color: #fff;
    text-align: center;
    padding: 8px 16px;
    font-size: 13pt;
    font-weight: 700;
    letter-spacing: 0.5px;
    margin-bottom: 6mm;
  }

  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2mm 8mm;
    margin-bottom: 8mm;
    font-size: 9pt;
  }

  .meta-item { display: flex; gap: 2mm; }
  .meta-label { color: var(--muted); min-width: 80px; }
  .meta-value { font-weight: 600; }

  .report-section {
    margin-bottom: 6mm;
    page-break-inside: avoid;
  }

  .section-heading {
    background: var(--primary);
    color: #fff;
    padding: 4px 10px;
    font-size: 10pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    margin-bottom: 3mm;
  }

  .section-body {
    padding: 0 2mm;
    font-size: 9.5pt;
    line-height: 1.6;
  }

  .section-body p { margin-bottom: 2mm; }
  .section-body ul, .section-body ol { padding-left: 5mm; margin-bottom: 2mm; }
  .section-body table { width: 100%; border-collapse: collapse; margin: 3mm 0; }
  .section-body th {
    background: var(--accent);
    color: #fff;
    padding: 3px 6px;
    text-align: left;
    font-size: 8pt;
    font-weight: 600;
  }
  .section-body td {
    padding: 3px 6px;
    border-bottom: 1px solid var(--border);
    font-size: 8.5pt;
  }
  .section-body tr:nth-child(even) td { background: var(--bg-alt); }

  .financial-summary {
    page-break-inside: avoid;
    margin-top: 6mm;
  }

  .financial-summary .section-heading {
    margin-bottom: 0;
  }

  .fin-table { width: 100%; border-collapse: collapse; }
  .fin-table td {
    padding: 4px 10px;
    font-size: 9pt;
    border-bottom: 1px solid var(--border);
  }
  .fin-table td:last-child { text-align: right; font-weight: 600; }
  .fin-table tr:nth-child(even) td { background: var(--bg-alt); }
  .fin-table tr.total-row td {
    background: var(--accent);
    color: #fff;
    font-size: 10pt;
    font-weight: 700;
    border: none;
  }

  .disclaimer {
    margin-top: 8mm;
    padding: 4mm;
    border-top: 1px solid var(--border);
    font-size: 7pt;
    color: var(--muted);
    line-height: 1.4;
  }

  .footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 7pt;
    color: #C0C0C0;
    padding: 3mm 0;
  }
</style>
</head>
<body>

<div class="header">
  <div class="header-left">
    ${logoHtml}
  </div>
  <div class="header-right">
    <div class="org-name">${escapeHtml(orgName)}</div>
  </div>
</div>

<div class="title-bar">ASSESSMENT REPORT</div>

<div class="meta-grid">
  <div class="meta-item">
    <span class="meta-label">Case No:</span>
    <span class="meta-value">${escapeHtml(caseNumber)}</span>
  </div>
  <div class="meta-item">
    <span class="meta-label">Date:</span>
    <span class="meta-value">${escapeHtml(caseDate)}</span>
  </div>
  <div class="meta-item">
    <span class="meta-label">Assessor:</span>
    <span class="meta-value">${escapeHtml(assessorName)}</span>
  </div>
  <div class="meta-item">
    <span class="meta-label">Client:</span>
    <span class="meta-value">${escapeHtml(clientName)}</span>
  </div>
</div>

${sectionsHtml}

${financialHtml}

${disclaimerBlock}

<div class="footer">Powered by Refrag · refrag.app</div>

</body>
</html>`
}

function buildFinancialTable(summary: Record<string, unknown>): string {
  const entries = Object.entries(summary)
  if (entries.length === 0) return ''

  const rows = entries
    .map(([key, value], i) => {
      const isTotal = key.toLowerCase().includes('total') || key.toLowerCase().includes('grand')
      const cls = isTotal ? ' class="total-row"' : ''
      const label = key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
      const displayVal = typeof value === 'number' ? formatAmount(value) : String(value ?? '—')
      return `<tr${cls}><td>${escapeHtml(label)}</td><td>${escapeHtml(displayVal)}</td></tr>`
    })
    .join('\n')

  return `
  <div class="financial-summary">
    <div class="section-heading">Financial Summary</div>
    <table class="fin-table">
      ${rows}
    </table>
  </div>`
}

function formatAmount(n: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
  }).format(n)
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
