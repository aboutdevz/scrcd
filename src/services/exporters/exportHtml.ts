import { Project, Step, BrandingProfile } from '@/types';

export function generateHtml(
  project: Project,
  steps: Step[],
  branding: BrandingProfile
): string {
  const accent = branding.accentColor || '#2563eb';
  const logo = project.logoUrl || branding.logoUrl;
  const version = project.version || '1.0.0';

  // Group steps by chapter/section
  interface ChapterGroup {
    title: string;
    steps: Step[];
  }
  const chapters: ChapterGroup[] = [];
  let currentChapter: ChapterGroup = { title: '', steps: [] };

  for (const step of steps) {
    if (step.sectionTitle && step.sectionTitle !== currentChapter.title) {
      if (currentChapter.steps.length > 0) {
        chapters.push(currentChapter);
      }
      currentChapter = { title: step.sectionTitle, steps: [step] };
    } else {
      currentChapter.steps.push(step);
    }
  }
  if (currentChapter.steps.length > 0) {
    chapters.push(currentChapter);
  }

  // Render Table of Contents (Classic Dotted Leader Style)
  const hasChapters = chapters.some((c) => c.title);
  const tocHtml = steps.length > 1
    ? `
    <nav class="toc-container">
      <div class="toc-header">
        <h2 class="toc-heading">Table of Contents</h2>
      </div>
      <div class="toc-list">
        ${
          hasChapters
            ? chapters
                .map(
                  (ch) => `
              <div class="toc-group">
                ${
                  ch.title
                    ? `<a href="#step-${ch.steps[0].stepNumber}" class="toc-row toc-row-chapter">
                        <span class="toc-title">${escapeHtml(ch.title)}</span>
                        <span class="toc-leader"></span>
                        <span class="toc-num">${ch.steps[0].stepNumber}</span>
                      </a>`
                    : ''
                }
                <div class="${ch.title ? 'toc-sub-steps' : ''}">
                  ${ch.steps
                    .map(
                      (s) => `
                    <a href="#step-${s.stepNumber}" class="toc-row">
                      <span class="toc-title">${escapeHtml(s.title)}</span>
                      <span class="toc-leader"></span>
                      <span class="toc-num">${s.stepNumber}</span>
                    </a>`
                    )
                    .join('\n')}
                </div>
              </div>`
                )
                .join('\n')
            : steps
                .map(
                  (s) => `
              <a href="#step-${s.stepNumber}" class="toc-row">
                <span class="toc-title">${escapeHtml(s.title)}</span>
                <span class="toc-leader"></span>
                <span class="toc-num">${s.stepNumber}</span>
              </a>`
                )
                .join('\n')
        }
      </div>
    </nav>`
    : '';

  const stepsHtml = steps
    .map(
      (step) => `
    <div class="step-card" id="step-${step.stepNumber}">
      ${
        step.sectionTitle
          ? `<div class="step-section-header">${escapeHtml(step.sectionTitle)}</div>`
          : ''
      }
      <div class="step-header">
        <label class="step-checkbox-label">
          <input type="checkbox" class="step-checkbox" onchange="toggleStep(this)">
          <span class="step-badge" style="background-color: ${accent};">Step ${step.stepNumber}</span>
        </label>
        <div class="step-meta">
          <h2 class="step-title">${escapeHtml(step.title)}</h2>
          <div class="step-tags">
            <span class="tag app-tag">${escapeHtml(step.uiaAppName || 'Application')}</span>
            <span class="tag action-tag">${escapeHtml(step.actionType.toUpperCase())}</span>
          </div>
        </div>
      </div>
      <div class="step-body">
        <div class="step-instructions">
          ${step.richInstructions || `<p>${escapeHtml(step.title)}</p>`}
        </div>
        ${
          step.screenshotPath
            ? `
        <div class="step-image-wrapper">
          <img src="${step.screenshotPath}" alt="Step ${step.stepNumber}" class="step-image" loading="eager" decoding="sync" />
        </div>`
            : ''
        }
      </div>
    </div>
  `
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(project.title)} - SOP Guide</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --border: #334155;
      --accent: ${accent};
    }
    body.light {
      --bg: #ffffff;
      --card-bg: #ffffff;
      --text: #0f172a;
      --text-muted: #334155;
      --border: #e2e8f0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 40px 20px;
      transition: background-color 0.2s, color 0.2s;
    }
    .container {
      max-width: 980px;
      margin: 0 auto;
    }
    .top-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-bottom: 24px;
    }
    .btn {
      padding: 8px 16px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      color: var(--text);
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 13px;
    }
    .btn:hover {
      border-color: var(--accent);
    }
    .guide-header {
      background: transparent;
      padding: 0 0 32px 0;
      margin-bottom: 32px;
      border-bottom: 2px solid var(--border);
    }
    .guide-title {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 10px;
      line-height: 1.3;
    }
    .guide-desc {
      color: var(--text-muted);
      font-size: 15px;
      margin-bottom: 18px;
    }
    .guide-logo {
      max-height: 60px;
      max-width: 200px;
      object-fit: contain;
      border-radius: 6px;
    }
    .guide-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 24px;
      font-size: 13px;
      color: var(--text-muted);
      padding-top: 4px;
    }
    .guide-meta strong {
      color: var(--text);
    }

    /* Table of Contents (Classic Dotted Leader Style) */
    .toc-container {
      padding: 24px 0 32px 0;
      margin-bottom: 36px;
      border-bottom: 1px solid var(--border);
    }
    .toc-header {
      text-align: center;
      margin-bottom: 24px;
    }
    .toc-heading {
      font-size: 22px;
      font-weight: 700;
      color: var(--text);
      letter-spacing: -0.01em;
    }
    .toc-list {
      max-width: 680px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .toc-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding-top: 8px;
    }
    .toc-group:first-child {
      padding-top: 0;
    }
    .toc-sub-steps {
      padding-left: 20px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .toc-row {
      display: flex;
      align-items: baseline;
      gap: 8px;
      text-decoration: none;
      color: var(--text);
      padding: 3px 6px;
      border-radius: 4px;
      font-size: 14px;
      transition: background 0.15s, color 0.15s;
    }
    .toc-row:hover {
      background: rgba(148, 163, 184, 0.12);
      color: var(--accent);
    }
    .toc-row-chapter {
      font-weight: 700;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--accent);
    }
    .toc-title {
      flex-shrink: 0;
      max-width: 78%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .toc-leader {
      flex: 1;
      border-bottom: 1px dotted var(--border);
      margin-bottom: 4px;
      min-width: 16px;
      transition: border-color 0.15s;
    }
    .toc-row:hover .toc-leader {
      border-bottom-color: var(--accent);
    }
    .toc-row-chapter .toc-leader {
      border-bottom: 2px dotted var(--accent);
      opacity: 0.6;
    }
    .toc-num {
      flex-shrink: 0;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--text-muted);
    }
    .toc-row:hover .toc-num {
      color: var(--accent);
    }
    .toc-row-chapter .toc-num {
      color: var(--accent);
      font-weight: 700;
    }

    /* Steps */
    .step-section-header {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--accent);
      padding-bottom: 8px;
      margin-bottom: 16px;
      border-bottom: 1px dashed var(--border);
    }
    .step-card {
      background: transparent;
      padding: 0 0 36px 0;
      margin-bottom: 36px;
      border-bottom: 1px solid var(--border);
      transition: opacity 0.2s;
    }
    .step-card:last-child {
      border-bottom: none;
    }
    .step-card.completed {
      opacity: 0.6;
    }
    .step-card.completed .step-title {
      text-decoration: line-through;
    }
    .step-header {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 16px;
    }
    .step-checkbox-label {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
    }
    .step-checkbox {
      width: 20px;
      height: 20px;
      accent-color: var(--accent);
      cursor: pointer;
    }
    .step-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      color: #ffffff;
      white-space: nowrap;
    }
    .step-meta {
      flex: 1;
    }
    .step-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .step-tags {
      display: flex;
      gap: 8px;
    }
    .tag {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(148, 163, 184, 0.15);
      color: var(--text-muted);
      font-weight: 600;
    }
    .step-body {
      margin-top: 12px;
    }
    .step-instructions {
      font-size: 15px;
      color: var(--text);
      margin-bottom: 16px;
      padding-left: 4px;
    }
    .step-instructions p {
      margin-bottom: 8px;
    }
    .step-instructions code {
      background: rgba(148, 163, 184, 0.2);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 13px;
    }
    .step-image-wrapper {
      border-radius: 8px;
      overflow: hidden;
      border: none;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      background: transparent;
      margin-top: 16px;
    }
    .step-image {
      width: 100%;
      height: auto;
      display: block;
    }

    /* Print Styles (Strict High Contrast WCAG AAA) */
    @media print {
      body {
        background: #ffffff !important;
        color: #0f172a !important;
        padding: 0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .top-actions, .step-checkbox { display: none !important; }
      .guide-header {
        border: none !important;
        border-bottom: 2px solid #cbd5e1 !important;
        background: transparent !important;
        color: #0f172a !important;
        page-break-after: avoid;
      }
      .guide-title { color: #0f172a !important; }
      .guide-desc { color: #334155 !important; }
      .guide-meta { color: #334155 !important; }
      .guide-meta strong { color: #0f172a !important; }
      .toc-container {
        border-bottom: 1px solid #cbd5e1 !important;
        page-break-after: auto;
      }
      .toc-heading {
        color: #0f172a !important;
        text-align: center !important;
      }
      .toc-row {
        color: #0f172a !important;
        padding: 2px 0 !important;
      }
      .toc-row-chapter {
        color: #1e3a8a !important;
      }
      .toc-leader {
        border-bottom: 1px dotted #94a3b8 !important;
      }
      .toc-row-chapter .toc-leader {
        border-bottom: 2px dotted #1e3a8a !important;
      }
      .toc-num {
        color: #334155 !important;
      }
      .toc-row-chapter .toc-num {
        color: #1e3a8a !important;
      }
      .step-section-header {
        color: #1e3a8a !important;
        border-bottom: 1px solid #cbd5e1 !important;
      }
      .step-card {
        border: none !important;
        border-bottom: 1px solid #e2e8f0 !important;
        background: transparent !important;
        color: #0f172a !important;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .step-card:last-child { border-bottom: none !important; }
      .step-title { color: #0f172a !important; }
      .tag {
        color: #0f172a !important;
        background: #f1f5f9 !important;
        border: 1px solid #94a3b8 !important;
        font-weight: 600 !important;
      }
      .step-instructions {
        color: #000000 !important;
      }
      .step-instructions p {
        color: #000000 !important;
      }
      .step-badge {
        color: #ffffff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .step-image-wrapper {
        border: none !important;
        box-shadow: none !important;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .step-image {
        max-width: 100% !important;
        height: auto !important;
        display: block !important;
      }
    }
  </style>
</head>
<body class="light">
  <div class="container">
    <div class="top-actions">
      <button class="btn" onclick="document.body.classList.toggle('light')">Toggle Theme</button>
      <button class="btn" onclick="window.print()">Print / Save as PDF</button>
    </div>

    <header class="guide-header">
      <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 20px;">
        <div style="flex: 1;">
          <h1 class="guide-title">${escapeHtml(project.title)}</h1>
          ${project.description ? `<p class="guide-desc">${escapeHtml(project.description)}</p>` : ''}
        </div>
        ${logo ? `<img src="${logo}" alt="Logo" class="guide-logo" />` : ''}
      </div>
      <div class="guide-meta">
        <div>Version: <strong>${escapeHtml(version)}</strong></div>
        <div>Author: <strong>${escapeHtml(project.author || branding.author)}</strong></div>
        <div>Organization: <strong>${escapeHtml(project.companyName || branding.companyName)}</strong></div>
        <div>Total Steps: <strong>${steps.length}</strong></div>
        <div>Last Updated: <strong>${new Date(project.updatedAt).toLocaleDateString()}</strong></div>
      </div>
    </header>

    ${tocHtml}

    <main class="steps-container">
      ${stepsHtml}
    </main>
  </div>

  <script>
    function toggleStep(checkbox) {
      const card = checkbox.closest('.step-card');
      if (checkbox.checked) {
        card.classList.add('completed');
      } else {
        card.classList.remove('completed');
      }
    }

    // Pre-decode all images
    window.__imagesReady = new Promise((resolve) => {
      const imgs = Array.from(document.images);
      if (imgs.length === 0) return resolve();
      let loaded = 0;
      const check = () => {
        loaded++;
        if (loaded >= imgs.length) resolve();
      };
      imgs.forEach((img) => {
        if (img.complete) check();
        else {
          img.addEventListener('load', check);
          img.addEventListener('error', check);
        }
      });
    });
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
