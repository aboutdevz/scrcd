import { Project, Step, BrandingProfile } from '@/types';

export function generateHtml(
  project: Project,
  steps: Step[],
  branding: BrandingProfile
): string {
  const accent = branding.accentColor || '#2563eb';

  const stepsHtml = steps
    .map(
      (step) => `
    <div class="step-card" id="step-${step.stepNumber}">
      <div class="step-header">
        <label class="step-checkbox-label">
          <input type="checkbox" class="step-checkbox" onchange="toggleStep(this)">
          <span class="step-badge" style="background-color: ${accent};">Step ${step.stepNumber}</span>
        </label>
        <div class="step-meta">
          <h2 class="step-title">${escapeHtml(step.title)}</h2>
          <div class="step-tags">
            <span class="tag app-tag">${escapeHtml(step.uiaAppName || 'Desktop')}</span>
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
          <img src="${step.screenshotPath}" alt="Step ${step.stepNumber}" class="step-image" loading="lazy" />
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
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --text: #0f172a;
      --text-muted: #64748b;
      --border: #e2e8f0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
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
      font-weight: 500;
      font-size: 13px;
    }
    .btn:hover {
      border-color: var(--accent);
    }
    .guide-header {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 32px;
      margin-bottom: 32px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .guide-title {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 12px;
      line-height: 1.3;
    }
    .guide-desc {
      color: var(--text-muted);
      font-size: 16px;
      margin-bottom: 20px;
    }
    .guide-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 24px;
      font-size: 14px;
      color: var(--text-muted);
      border-top: 1px solid var(--border);
      padding-top: 16px;
    }
    .guide-meta strong {
      color: var(--text);
    }
    .step-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      transition: opacity 0.2s;
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
      font-weight: 500;
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
      border: 1px solid var(--border);
      background: #000000;
    }
    .step-image {
      width: 100%;
      height: auto;
      display: block;
    }
    @media print {
      body { background: #fff !important; color: #000 !important; padding: 0 !important; }
      .top-actions, .step-checkbox { display: none !important; }
      .guide-header, .step-card { border: 1px solid #ccc !important; background: #fff !important; color: #000 !important; page-break-inside: avoid; }
      .step-badge { color: #fff !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .step-image-wrapper { border: 1px solid #ddd !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="top-actions">
      <button class="btn" onclick="document.body.classList.toggle('light')">🌓 Toggle Light/Dark</button>
      <button class="btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
    </div>

    <header class="guide-header">
      <h1 class="guide-title">${escapeHtml(project.title)}</h1>
      ${project.description ? `<p class="guide-desc">${escapeHtml(project.description)}</p>` : ''}
      <div class="guide-meta">
        <div>Author: <strong>${escapeHtml(project.author || branding.author)}</strong></div>
        <div>Organization: <strong>${escapeHtml(project.companyName || branding.companyName)}</strong></div>
        <div>Total Steps: <strong>${steps.length}</strong></div>
        <div>Last Updated: <strong>${new Date(project.updatedAt).toLocaleDateString()}</strong></div>
      </div>
    </header>

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
