import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, PageBreak, AlignmentType } from 'docx';
import { Folder, Project, Step, BrandingProfile } from '@/types';
import { bakeStepsForExport } from '@/services/imageBaker';
import { api, isElectron, getElectron } from '@/services/api';

export interface MasterBinderOptions {
  title: string;
  subtitle?: string;
  author?: string;
  companyName?: string;
  accentColor?: string;
  includeCoverPage: boolean;
  includeTableOfContents: boolean;
  format: 'pdf' | 'html' | 'docx';
  versionSelections?: Record<string, string>;
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function htmlToPlainText(html: string | undefined | null): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

async function urlToUint8Array(url: string): Promise<Uint8Array | null> {
  try {
    if (url.startsWith('data:')) {
      const commaIdx = url.indexOf(',');
      const base64 = commaIdx >= 0 ? url.slice(commaIdx + 1) : url;
      const binaryStr = atob(base64);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      return bytes;
    }

    if (url.startsWith('file://')) {
      const filePath = decodeURIComponent(url.replace(/^file:\/\/\/?/, ''));
      if (typeof window !== 'undefined' && (window as any).require) {
        try {
          const fs = (window as any).require('fs');
          const buf = fs.readFileSync(filePath);
          return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
        } catch {}
      }
    }

    const res = await fetch(url);
    const ab = await res.arrayBuffer();
    return new Uint8Array(ab);
  } catch (err) {
    console.warn('Failed to load image for master binder docx:', err);
    return null;
  }
}

/**
 * Generates unified standalone Master Binder HTML with classic publication styling.
 */
export function generateMasterBinderHtml(
  folder: Folder | null,
  guides: { project: Project; steps: Step[] }[],
  branding: BrandingProfile,
  options: MasterBinderOptions
): string {
  const accent = options.accentColor || branding.accentColor || '#2563eb';
  const docTitle = options.title || (folder ? `${folder.name} Handbook` : 'Operations Master Handbook');
  const docSubtitle = options.subtitle || folder?.description || 'Standard Operating Procedures & Execution Guides';
  const author = options.author || branding.author || 'System Operations Team';
  const companyName = options.companyName || branding.companyName || 'Acme Corporation';

  const totalSteps = guides.reduce((acc, g) => acc + g.steps.length, 0);

  // Table of contents rows with dotted leader
  const tocEntriesHtml = guides
    .map((g, gIdx) => {
      const gNum = gIdx + 1;
      return `
      <div class="toc-guide-block">
        <a href="#guide-${g.project.id}" class="toc-row toc-row-guide">
          <span class="toc-guide-label">Guide ${gNum}: ${escapeHtml(g.project.title)}</span>
          <span class="toc-leader"></span>
          <span class="toc-guide-meta">${g.steps.length} steps</span>
        </a>
        <div class="toc-step-list">
          ${g.steps
            .map(
              (s) => `
            <a href="#step-${s.id}" class="toc-row toc-row-step">
              <span class="toc-step-title"><span class="toc-step-num">${s.stepNumber}.</span> ${escapeHtml(s.title)}</span>
              <span class="toc-leader"></span>
              <span class="toc-step-action">${s.actionType}</span>
            </a>
          `
            )
            .join('')}
        </div>
      </div>
      `;
    })
    .join('\n');

  // Guides Content
  const guidesContentHtml = guides
    .map((g, gIdx) => {
      const gNum = gIdx + 1;
      return `
      <section id="guide-${g.project.id}" class="guide-section">
        <div class="guide-header">
          <div class="guide-eyebrow">
            <span class="guide-badge">Guide ${gNum} of ${guides.length}</span>
            <span class="guide-category">${escapeHtml(g.project.category || 'SOP')}</span>
            <span class="guide-version">v${escapeHtml(g.project.version || '1.0.0')}</span>
          </div>
          <h2 class="guide-title">${escapeHtml(g.project.title)}</h2>
          ${g.project.description ? `<p class="guide-desc">${escapeHtml(g.project.description)}</p>` : ''}
          ${
            g.project.tags && g.project.tags.length > 0
              ? `<div class="guide-tags">
                  ${g.project.tags.map((t) => `<span class="guide-tag">#${escapeHtml(t)}</span>`).join('')}
                </div>`
              : ''
          }
        </div>

        <div class="steps-flow">
          ${g.steps
            .map((s) => {
              return `
            <div id="step-${s.id}" class="step-entry">
              <div class="step-meta">
                <span class="step-num-pill">${s.stepNumber}</span>
                <h3 class="step-heading">${escapeHtml(s.title)}</h3>
              </div>

              ${
                s.richInstructions
                  ? `<div class="step-instructions">${s.richInstructions}</div>`
                  : ''
              }

              ${
                s.screenshotPath
                  ? `<div class="step-media">
                      <img src="${s.screenshotPath}" alt="Step ${s.stepNumber}" class="step-screenshot" loading="eager" decoding="sync" />
                    </div>`
                  : ''
              }
            </div>
            `;
            })
            .join('\n')}
        </div>
      </section>
      `;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(docTitle)}</title>
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background-color: #ffffff;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    .master-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 32px 80px;
    }

    /* Cover Page */
    .cover-page {
      min-height: 80vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 60px 0;
      border-bottom: 2px solid #e2e8f0;
      margin-bottom: 60px;
      page-break-after: always;
    }
    .cover-top {
      border-top: 4px solid ${accent};
      padding-top: 24px;
    }
    .cover-company {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: ${accent};
      margin-bottom: 16px;
    }
    .cover-title {
      font-size: 34px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.025em;
      line-height: 1.2;
      margin-bottom: 16px;
    }
    .cover-subtitle {
      font-size: 16px;
      color: #475569;
      max-width: 640px;
      line-height: 1.5;
    }
    .cover-stats {
      display: flex;
      gap: 24px;
      margin-top: 32px;
    }
    .stat-badge {
      background-color: #f1f5f9;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #334155;
    }
    .cover-footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 20px;
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #64748b;
    }

    /* Table of Contents */
    .toc-section {
      margin-bottom: 60px;
      padding-bottom: 40px;
      border-bottom: 1px solid #e2e8f0;
      page-break-after: always;
    }
    .toc-header {
      text-align: center;
      margin-bottom: 32px;
    }
    .toc-title-heading {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .toc-guide-block {
      margin-bottom: 24px;
    }
    .toc-row {
      display: flex;
      align-items: baseline;
      text-decoration: none;
      color: inherit;
      padding: 4px 0;
      transition: color 0.15s;
    }
    .toc-row:hover {
      color: ${accent};
    }
    .toc-row-guide {
      font-weight: 700;
      font-size: 14px;
      color: #0f172a;
    }
    .toc-row-step {
      font-size: 13px;
      color: #475569;
      padding-left: 20px;
    }
    .toc-leader {
      flex: 1;
      border-bottom: 1.5px dotted #cbd5e1;
      margin: 0 12px;
      min-width: 24px;
    }
    .toc-guide-meta {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      font-variant-numeric: tabular-nums;
    }
    .toc-step-action {
      font-size: 11px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #64748b;
      text-transform: uppercase;
      background: #f1f5f9;
      padding: 1px 6px;
      border-radius: 4px;
    }
    .toc-step-num {
      font-weight: 600;
      color: #334155;
      margin-right: 4px;
    }

    /* Guide Section */
    .guide-section {
      margin-bottom: 70px;
      page-break-after: always;
    }
    .guide-header {
      padding-bottom: 20px;
      border-bottom: 2px solid #e2e8f0;
      margin-bottom: 32px;
    }
    .guide-eyebrow {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .guide-badge {
      background-color: ${accent};
      color: #ffffff;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .guide-category {
      background-color: #f1f5f9;
      color: #475569;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .guide-version {
      font-family: ui-monospace, SFMono-Regular, monospace;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      color: #64748b;
      padding: 1px 6px;
      border-radius: 4px;
    }
    .guide-title {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
    }
    .guide-desc {
      font-size: 14px;
      color: #64748b;
      line-height: 1.5;
    }
    .guide-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 12px;
    }
    .guide-tag {
      font-size: 11px;
      font-weight: 500;
      color: #475569;
      background: #f1f5f9;
      padding: 2px 8px;
      border-radius: 12px;
    }

    /* Steps Flow (Borderless, Clean) */
    .steps-flow {
      display: flex;
      flex-direction: column;
      gap: 40px;
    }
    .step-entry {
      page-break-inside: avoid;
    }
    .step-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .step-num-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background-color: ${accent};
      color: #ffffff;
      font-size: 13px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .step-heading {
      font-size: 16px;
      font-weight: 700;
      color: #1e293b;
    }
    .step-instructions {
      font-size: 14px;
      color: #334155;
      margin-left: 40px;
      margin-bottom: 16px;
      line-height: 1.6;
    }
    .step-instructions p {
      margin-bottom: 8px;
    }
    .step-instructions strong {
      font-weight: 700;
      color: #0f172a;
    }
    .step-media {
      margin-left: 40px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
    }
    .step-screenshot {
      display: block;
      width: 100%;
      height: auto;
    }

    /* Print Standards */
    @media print {
      body {
        background: transparent !important;
      }
      .master-container {
        max-width: 100% !important;
        padding: 0 !important;
      }
      .cover-page, .toc-section, .guide-section {
        page-break-after: always;
      }
      .step-entry {
        page-break-inside: avoid;
      }
      a {
        text-decoration: none;
        color: inherit;
      }
    }
  </style>
</head>
<body>
  <div class="master-container">
    ${
      options.includeCoverPage
        ? `
      <div class="cover-page">
        <div class="cover-top">
          <div class="cover-company">${escapeHtml(companyName)}</div>
          <h1 class="cover-title">${escapeHtml(docTitle)}</h1>
          ${docSubtitle ? `<p class="cover-subtitle">${escapeHtml(docSubtitle)}</p>` : ''}
          <div class="cover-stats">
            <span class="stat-badge">${guides.length} Standard Guides</span>
            <span class="stat-badge">${totalSteps} Total Steps</span>
          </div>
        </div>
        <div class="cover-footer">
          <span>Author: ${escapeHtml(author)}</span>
          <span>Generated on ${new Date().toLocaleDateString()}</span>
          <span>SCRCD Master Publication</span>
        </div>
      </div>
      `
        : ''
    }

    ${
      options.includeTableOfContents
        ? `
      <section class="toc-section">
        <div class="toc-header">
          <h2 class="toc-title-heading">Table of Contents</h2>
        </div>
        <div class="toc-content">
          ${tocEntriesHtml}
        </div>
      </section>
      `
        : ''
    }

    <main class="guides-content">
      ${guidesContentHtml}
    </main>
  </div>
</body>
</html>`;
}

/**
 * Compiles and exports an entire folder into a Word (.docx) Master Binder.
 */
export async function exportMasterBinderDocx(
  folder: Folder | null,
  guides: { project: Project; steps: Step[] }[],
  branding: BrandingProfile,
  options: MasterBinderOptions
): Promise<Blob> {
  const docTitle = options.title || (folder ? `${folder.name} Handbook` : 'Operations Master Handbook');
  const docSubtitle = options.subtitle || folder?.description || '';
  const author = options.author || branding.author || 'System Operations Team';
  const companyName = options.companyName || branding.companyName || 'Acme Corporation';

  const docChildren: any[] = [];

  // Cover Page
  if (options.includeCoverPage) {
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: companyName.toUpperCase(),
            bold: true,
            color: '2563EB',
            size: 24,
          }),
        ],
        spacing: { before: 200, after: 400 },
      }),
      new Paragraph({
        text: docTitle,
        heading: HeadingLevel.TITLE,
        spacing: { after: 200 },
      })
    );

    if (docSubtitle) {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: docSubtitle,
              italics: true,
              color: '64748B',
              size: 24,
            }),
          ],
          spacing: { after: 400 },
        })
      );
    }

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Author: ${author}  |  Guides: ${guides.length}  |  Date: ${new Date().toLocaleDateString()}`,
            color: '64748B',
            size: 20,
          }),
        ],
        spacing: { before: 800, after: 400 },
      }),
      new Paragraph({ children: [new PageBreak()] })
    );
  }

  // Table of Contents Header
  if (options.includeTableOfContents) {
    docChildren.push(
      new Paragraph({
        text: 'Table of Contents',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 400 },
      })
    );

    guides.forEach((g, idx) => {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Guide ${idx + 1}: ${g.project.title}`,
              bold: true,
              size: 22,
            }),
            new TextRun({
              text: ` . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . `,
              color: '94A3B8',
            }),
            new TextRun({
              text: `${g.steps.length} steps`,
              color: '64748B',
              bold: true,
            }),
          ],
          spacing: { after: 120 },
        })
      );
    });

    docChildren.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // Iterate over guides
  for (let gIdx = 0; gIdx < guides.length; gIdx++) {
    const g = guides[gIdx];
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `GUIDE ${gIdx + 1} OF ${guides.length}`,
            bold: true,
            color: '2563EB',
            size: 18,
          }),
        ],
        spacing: { before: 300, after: 100 },
      }),
      new Paragraph({
        text: g.project.title,
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 150 },
      })
    );

    if (g.project.description) {
      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: g.project.description, italics: true, color: '64748B' })],
          spacing: { after: 300 },
        })
      );
    }

    // Process steps with baked images
    for (const step of g.steps) {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Step ${step.stepNumber}: ${step.title}`,
              bold: true,
              size: 24,
            }),
          ],
          spacing: { before: 240, after: 120 },
        })
      );

      const plainText = htmlToPlainText(step.richInstructions);
      if (plainText) {
        docChildren.push(
          new Paragraph({
            children: [new TextRun({ text: plainText, size: 22 })],
            spacing: { after: 160 },
          })
        );
      }

      if (step.screenshotPath) {
        const imgBytes = await urlToUint8Array(step.screenshotPath);
        if (imgBytes && imgBytes.length > 0) {
          try {
            docChildren.push(
              new Paragraph({
                children: [
                  new ImageRun({
                    data: imgBytes,
                    type: 'png',
                    transformation: {
                      width: 580,
                      height: 326,
                    },
                  }),
                ],
                spacing: { after: 300 },
              })
            );
          } catch (e) {
            console.warn('Could not attach image to docx step:', e);
          }
        }
      }
    }

    if (gIdx < guides.length - 1) {
      docChildren.push(new Paragraph({ children: [new PageBreak()] }));
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docChildren,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * High-level Master Binder Compiler orchestrating annotation baking and export.
 */
export async function compileAndExportMasterBinder(
  folder: Folder | null,
  projects: Project[],
  branding: BrandingProfile,
  options: MasterBinderOptions,
  onProgress?: (progressText: string) => void
): Promise<{ success: boolean; canceled?: boolean; filePath?: string; error?: string }> {
  try {
    onProgress?.('Loading guide steps and screenshots...');
    const guidesWithSteps: { project: Project; steps: Step[] }[] = [];

    for (let i = 0; i < projects.length; i++) {
      const p = projects[i];
      const selectedVersionId = options.versionSelections?.[p.id];
      let projectToUse = p;
      let rawSteps: Step[] = [];

      if (selectedVersionId && selectedVersionId !== 'latest') {
        const versions = await api.listProjectVersions(p.id);
        const ver = versions.find((v) => v.id === selectedVersionId);
        if (ver) {
          projectToUse = {
            ...p,
            version: ver.version,
            title: ver.projectSnapshot?.title || p.title,
            description: ver.projectSnapshot?.description || p.description,
            category: ver.projectSnapshot?.category || p.category,
          };
          rawSteps = ver.stepsSnapshot || [];
        } else {
          rawSteps = await api.listSteps(p.id);
        }
      } else {
        rawSteps = await api.listSteps(p.id);
      }

      onProgress?.(`Baking annotations for "${projectToUse.title}" (${i + 1}/${projects.length})...`);
      const bakedSteps = await bakeStepsForExport(rawSteps);
      guidesWithSteps.push({ project: projectToUse, steps: bakedSteps });
    }

    const docTitle = options.title || (folder ? `${folder.name} Handbook` : 'Operations Master Handbook');
    const safeFilename = docTitle.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_');

    if (options.format === 'docx') {
      onProgress?.('Compiling Word document with embedded media...');
      const blob = await exportMasterBinderDocx(folder, guidesWithSteps, branding, options);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeFilename}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return { success: true };
    }

    onProgress?.('Generating Master Binder HTML layout...');
    const htmlContent = generateMasterBinderHtml(folder, guidesWithSteps, branding, options);

    if (options.format === 'html') {
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeFilename}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return { success: true };
    }

    // PDF Export
    if (options.format === 'pdf') {
      onProgress?.('Rendering native PDF with page breaks & table of contents...');
      if (isElectron()) {
        const electron = getElectron();
        if (electron && electron.ipcRenderer) {
          const res = await electron.ipcRenderer.invoke('export-pdf', {
            htmlContent,
            defaultFilename: `${safeFilename}.pdf`,
          });
          return res;
        }
      }

      // Browser fallback: Open print preview window
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.write(htmlContent);
        printWin.document.close();
        printWin.focus();
        setTimeout(() => printWin.print(), 500);
        return { success: true };
      }
    }

    return { success: true };
  } catch (err) {
    console.error('Master Binder Export Failed:', err);
    return { success: false, error: (err as Error).message };
  }
}
