export interface PhotoPdfOptions {
  orgName: string
  orgLogo?: string
  caseNumber: string
  photos: Array<{
    url: string
    caption?: string
    classification?: string
    sectionLabel?: string
    timestamp?: string
  }>
}

export function buildPhotoPdfHtml(options: PhotoPdfOptions): string {
  const { orgName, orgLogo, caseNumber, photos } = options

  const logoHtml = orgLogo
    ? `<img src="${orgLogo}" class="org-logo" alt="${escapeHtml(orgName)}" />`
    : ''

  const pagesHtml = photos
    .map(
      (photo, i) => `
      <div class="photo-page${i > 0 ? ' page-break' : ''}">
        <div class="photo-container">
          <img src="${photo.url}" class="photo-img" alt="${escapeHtml(photo.caption || `Photo ${i + 1}`)}" />
        </div>
        <div class="photo-meta">
          ${photo.caption ? `<div class="photo-caption">${escapeHtml(photo.caption)}</div>` : ''}
          <div class="photo-tags">
            ${photo.classification ? `<span class="tag tag-classification">${escapeHtml(photo.classification)}</span>` : ''}
            ${photo.sectionLabel ? `<span class="tag tag-section">${escapeHtml(photo.sectionLabel)}</span>` : ''}
          </div>
          ${photo.timestamp ? `<div class="photo-timestamp">${escapeHtml(photo.timestamp)}</div>` : ''}
          <div class="photo-index">Photo ${i + 1} of ${photos.length}</div>
        </div>
      </div>`,
    )
    .join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(caseNumber)} – Photo Evidence</title>
<style>
  @page {
    size: A4;
    margin: 15mm 15mm 20mm 15mm;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
      'Helvetica Neue', Arial, sans-serif;
    font-size: 10pt;
    color: #1F2933;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .cover-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 4mm;
    border-bottom: 2px solid #1F2933;
    margin-bottom: 3mm;
  }

  .org-logo {
    max-width: 100px;
    max-height: 50px;
    object-fit: contain;
  }

  .cover-title {
    text-align: right;
  }

  .cover-title h1 {
    font-size: 13pt;
    font-weight: 700;
    color: #1F2933;
  }

  .cover-title .case-ref {
    font-size: 9pt;
    color: #6B6B7E;
  }

  .page-break { page-break-before: always; }

  .photo-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  .photo-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    max-height: 60%;
    margin: 4mm 0;
  }

  .photo-img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border: 1px solid #E5E7EB;
    border-radius: 2px;
  }

  .photo-meta {
    padding: 4mm 0;
    border-top: 1px solid #E5E7EB;
  }

  .photo-caption {
    font-size: 10pt;
    font-weight: 600;
    margin-bottom: 2mm;
  }

  .photo-tags {
    display: flex;
    gap: 2mm;
    margin-bottom: 2mm;
    flex-wrap: wrap;
  }

  .tag {
    display: inline-block;
    padding: 1px 8px;
    border-radius: 3px;
    font-size: 7.5pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .tag-classification {
    background: #EFF6FF;
    color: #1D4ED8;
    border: 1px solid #BFDBFE;
  }

  .tag-section {
    background: #F0FDF4;
    color: #15803D;
    border: 1px solid #BBF7D0;
  }

  .photo-timestamp {
    font-size: 8pt;
    color: #6B6B7E;
    margin-bottom: 1mm;
  }

  .photo-index {
    font-size: 7.5pt;
    color: #9CA3AF;
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

<div class="cover-header">
  <div>${logoHtml}</div>
  <div class="cover-title">
    <h1>Photo Evidence</h1>
    <div class="case-ref">${escapeHtml(caseNumber)} · ${escapeHtml(orgName)}</div>
  </div>
</div>

${pagesHtml}

<div class="footer">Powered by Refrag · refrag.app</div>

</body>
</html>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
