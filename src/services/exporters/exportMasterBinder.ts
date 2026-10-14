import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, PageBreak, AlignmentType } from 'docx';
import { Folder, Project, Step, BrandingProfile } from '@/types';
import { bakeStepsForExport } from '@/services/imageBaker';
import { formatCalloutHtml } from '@/services/richText';
import { api, isElectron, getElectron } from '@/services/api';

export interface MasterBinderOptions {
  title: string;
  subtitle?: string;
  author?: string;
  companyName?: string;
  logoUrl?: string;
  accentColor?: string;
  targetRoles?: string[];
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

interface ChapterGroup {
  title: string;
  steps: Step[];
}

function groupStepsByChapter(steps: Step[]): ChapterGroup[] {
  const chapters: ChapterGroup[] = [];
  let currentChapter: ChapterGroup = { title: '', steps: [] };

  for (const step of steps) {
    const secTitle = (step.sectionTitle || '').trim();
    if (secTitle && secTitle !== currentChapter.title) {
      if (currentChapter.steps.length > 0) {
        chapters.push(currentChapter);
      }
      currentChapter = { title: secTitle, steps: [step] };
    } else {
      currentChapter.steps.push(step);
    }
  }
  if (currentChapter.steps.length > 0) {
    chapters.push(currentChapter);
  }
  return chapters;
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
  const logo = options.logoUrl || branding.logoUrl || guides.find((g) => g.project.logoUrl)?.project.logoUrl || '';
  const author = options.author || branding.author || guides.find((g) => g.project.author)?.project.author || 'System Operations Team';
  const companyName = options.companyName || branding.companyName || guides.find((g) => g.project.companyName)?.project.companyName || 'Acme Corporation';
  const targetRoles = (options.targetRoles && options.targetRoles.length > 0
    ? options.targetRoles
    : folder?.targetRoles || []).filter(Boolean);

  const totalSteps = guides.reduce((acc, g) => acc + g.steps.length, 0);

  // Table of contents rows with dotted leader and chapter grouping
  const tocEntriesHtml = guides
    .map((g, gIdx) => {
      const gNum = gIdx + 1;
      const chapters = groupStepsByChapter(g.steps);
      const hasChapters = chapters.some((c) => c.title);

      const renderStepsTOC = (stepList: Step[], isSubStep = false) => {
        return stepList
          .filter((s) => s.title && s.title.trim().length > 0)
          .map(
            (s) => `
            <a href="#step-${s.id}" class="toc-row toc-row-step ${isSubStep ? 'toc-sub-step' : ''}">
              <span class="toc-step-title"><span class="toc-step-num">${s.stepNumber}.</span> ${escapeHtml(s.title)}</span>
              <span class="toc-leader"></span>
              <span class="toc-step-num-pill">Step ${s.stepNumber}</span>
            </a>
          `
          )
          .join('\n');
      };

      return `
      <div class="toc-guide-block">
        <a href="#guide-${g.project.id}" class="toc-row toc-row-guide">
          <span class="toc-guide-label">Guide ${gNum}: ${escapeHtml(g.project.title)}</span>
          <span class="toc-leader"></span>
          <span class="toc-guide-meta">${g.steps.length} steps</span>
        </a>
        <div class="toc-step-list">
          ${
            hasChapters
              ? chapters
                  .map((ch) => {
                    return `
                  <div class="toc-chapter-block">
                    ${
                      ch.title
                        ? `<div class="toc-row toc-row-chapter">
                            <span class="toc-chapter-title"><span class="toc-chapter-label">Chapter:</span> ${escapeHtml(ch.title)}</span>
                            <span class="toc-leader"></span>
                            <span class="toc-chapter-count">${ch.steps.length} steps</span>
                          </div>`
                        : ''
                    }
                    <div class="${ch.title ? 'toc-chapter-steps' : ''}">
                      ${renderStepsTOC(ch.steps, Boolean(ch.title))}
                    </div>
                  </div>
                `;
                  })
                  .join('\n')
              : renderStepsTOC(g.steps, false)
          }
        </div>
      </div>
      `;
    })
    .join('\n');

  // Guides Content
  const guidesContentHtml = guides
    .map((g, gIdx) => {
      const gNum = gIdx + 1;
      let lastRenderedChapter = '';

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
          
          <div class="guide-author-bar">
            <span>Author: <strong>${escapeHtml(g.project.author || author)}</strong></span>
            <span class="author-bar-dot">&bull;</span>
            <span>Organization: <strong>${escapeHtml(g.project.companyName || companyName)}</strong></span>
          </div>

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
              const stepChapter = (s.sectionTitle || '').trim();
              let chapterBannerHtml = '';
              if (stepChapter && stepChapter !== lastRenderedChapter) {
                lastRenderedChapter = stepChapter;
                chapterBannerHtml = `
                <div class="step-chapter-banner">
                  <span class="chapter-badge">Chapter</span>
                  <h4 class="chapter-title">${escapeHtml(stepChapter)}</h4>
                </div>
                `;
              }

              return `
            ${chapterBannerHtml}
            <div id="step-${s.id}" class="step-entry">
              <div class="step-meta">
                <span class="step-num-pill">${s.stepNumber}</span>
                <h3 class="step-heading">${escapeHtml(s.title)}</h3>
              </div>

              ${
                s.richInstructions
                  ? `<div class="step-instructions">${formatCalloutHtml(s.richInstructions)}</div>`
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
    .cover-brand-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 20px;
    }
    .cover-logo {
      max-height: 64px;
      max-width: 220px;
      object-fit: contain;
    }
    .cover-company {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: ${accent};
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
    .cover-roles-container {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 24px;
      flex-wrap: wrap;
    }
    .cover-roles-label {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
    }
    .cover-roles-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .cover-role-chip {
      font-size: 11px;
      font-weight: 600;
      color: ${accent};
      background: rgba(37, 99, 235, 0.08);
      border: 1px solid rgba(37, 99, 235, 0.25);
      padding: 3px 10px;
      border-radius: 9999px;
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

    /* Top Master Header (when Cover Page is disabled) */
    .master-header {
      margin-bottom: 48px;
      padding-bottom: 28px;
      border-bottom: 2px solid #e2e8f0;
    }
    .master-header-brand {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
    }
    .master-company {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: ${accent};
      margin-bottom: 6px;
    }
    .master-title {
      font-size: 28px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
      line-height: 1.25;
      margin-bottom: 8px;
    }
    .master-subtitle {
      font-size: 14px;
      color: #64748b;
      max-width: 640px;
      line-height: 1.5;
    }
    .master-header-logo {
      max-height: 52px;
      max-width: 180px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .master-meta-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-top: 18px;
      padding-top: 14px;
      border-top: 1px solid #f1f5f9;
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
      letter-spacing: 0.05em;
      color: #0f172a;
      text-transform: uppercase;
    }
    .toc-guide-block {
      margin-bottom: 24px;
    }
    .toc-chapter-block {
      margin: 8px 0 6px 14px;
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
    .toc-row-chapter {
      font-size: 13px;
      font-weight: 700;
      color: #1e293b;
      padding: 3px 0;
    }
    .toc-chapter-title {
      display: flex;
      align-items: baseline;
      gap: 6px;
    }
    .toc-chapter-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: ${accent};
      background: rgba(37, 99, 235, 0.08);
      padding: 1px 6px;
      border-radius: 4px;
    }
    .toc-chapter-count {
      font-size: 11px;
      font-weight: 600;
      color: #94a3b8;
      font-variant-numeric: tabular-nums;
    }
    .toc-chapter-steps {
      padding-left: 10px;
    }
    .toc-row-step {
      font-size: 13px;
      color: #475569;
      padding-left: 20px;
    }
    .toc-sub-step {
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
    .toc-step-num-pill {
      font-size: 11px;
      font-weight: 600;
      color: #94a3b8;
      font-variant-numeric: tabular-nums;
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
    .guide-author-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 10px;
      font-size: 12px;
      color: #64748b;
    }
    .author-bar-dot {
      color: #cbd5e1;
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

    /* Chapter Banner in Steps */
    .step-chapter-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 36px;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1.5px solid #e2e8f0;
    }
    .chapter-badge {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #ffffff;
      background-color: ${accent};
      padding: 2px 8px;
      border-radius: 4px;
    }
    .chapter-title {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
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
    .step-instructions h1 {
      font-size: 1.2rem;
      font-weight: 700;
      color: #0f172a;
      margin: 12px 0 6px;
    }
    .step-instructions h2 {
      font-size: 1.05rem;
      font-weight: 700;
      color: #0f172a;
      margin: 10px 0 4px;
    }
    .step-instructions h3 {
      font-size: 0.95rem;
      font-weight: 600;
      color: #1e293b;
      margin: 8px 0 4px;
    }
    .step-instructions p {
      margin-bottom: 8px;
    }
    .step-instructions ul {
      list-style-type: disc !important;
      padding-left: 20px !important;
      margin: 6px 0 10px 0 !important;
    }
    .step-instructions ol {
      list-style-type: decimal !important;
      padding-left: 20px !important;
      margin: 6px 0 10px 0 !important;
    }
    .step-instructions li {
      margin: 3px 0 !important;
    }
    .step-instructions li > p {
      margin: 0 !important;
      display: inline !important;
    }
    .step-instructions blockquote {
      border-left: 3.5px solid ${accent};
      background: #f1f5f9;
      padding: 8px 12px;
      margin: 8px 0;
      border-radius: 0 6px 6px 0;
    }
    .step-instructions blockquote.callout-tip {
      border-left-color: #10b981;
      background: rgba(16, 185, 129, 0.08);
      color: #064e3b;
    }
    .step-instructions blockquote.callout-tip strong {
      color: #047857;
    }
    .step-instructions blockquote.callout-warning {
      border-left-color: #f59e0b;
      background: rgba(245, 158, 11, 0.08);
      color: #78350f;
    }
    .step-instructions blockquote.callout-warning strong {
      color: #b45309;
    }
    .step-instructions blockquote.callout-note {
      border-left-color: #3b82f6;
      background: rgba(59, 130, 246, 0.08);
      color: #1e3a8a;
    }
    .step-instructions blockquote.callout-note strong {
      color: #1d4ed8;
    }
    .step-instructions code {
      background: #f1f5f9;
      color: #1e40af;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 13px;
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
          <div class="cover-brand-header">
            ${logo ? `<img src="${logo}" alt="${escapeHtml(companyName)} Logo" class="cover-logo" />` : ''}
            <div class="cover-company">${escapeHtml(companyName)}</div>
          </div>
          <h1 class="cover-title">${escapeHtml(docTitle)}</h1>
          ${docSubtitle ? `<p class="cover-subtitle">${escapeHtml(docSubtitle)}</p>` : ''}
          ${
            targetRoles.length > 0
              ? `
            <div class="cover-roles-container">
              <span class="cover-roles-label">Designated Roles:</span>
              <div class="cover-roles-chips">
                ${targetRoles.map((r) => `<span class="cover-role-chip">${escapeHtml(r)}</span>`).join('')}
              </div>
            </div>
            `
              : ''
          }
          <div class="cover-stats">
            <span class="stat-badge">${guides.length} Standard Guides</span>
            <span class="stat-badge">${totalSteps} Total Steps</span>
          </div>
        </div>
        <div class="cover-footer">
          <span>Author: <strong>${escapeHtml(author)}</strong></span>
          <span>Organization: <strong>${escapeHtml(companyName)}</strong></span>
          <span>Generated on ${new Date().toLocaleDateString()}</span>
        </div>
      </div>
      `
        : `
      <header class="master-header">
        <div class="master-header-brand">
          <div>
            <div class="master-company">${escapeHtml(companyName)}</div>
            <h1 class="master-title">${escapeHtml(docTitle)}</h1>
            ${docSubtitle ? `<p class="master-subtitle">${escapeHtml(docSubtitle)}</p>` : ''}
          </div>
          ${logo ? `<img src="${logo}" alt="${escapeHtml(companyName)} Logo" class="master-header-logo" />` : ''}
        </div>
        <div class="master-meta-bar">
          <div>Author: <strong>${escapeHtml(author)}</strong></div>
          <div>Organization: <strong>${escapeHtml(companyName)}</strong></div>
          <div>Date: <strong>${new Date().toLocaleDateString()}</strong></div>
          ${
            targetRoles.length > 0
              ? `<div>Designated Roles: <strong>${escapeHtml(targetRoles.join(', '))}</strong></div>`
              : ''
          }
          <div>Guides: <strong>${guides.length}</strong></div>
          <div>Total Steps: <strong>${totalSteps}</strong></div>
        </div>
      </header>
      `
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
  const logo = options.logoUrl || branding.logoUrl || guides.find((g) => g.project.logoUrl)?.project.logoUrl || '';
  const author = options.author || branding.author || guides.find((g) => g.project.author)?.project.author || 'System Operations Team';
  const companyName = options.companyName || branding.companyName || guides.find((g) => g.project.companyName)?.project.companyName || 'Acme Corporation';
  const targetRoles = (options.targetRoles && options.targetRoles.length > 0
    ? options.targetRoles
    : folder?.targetRoles || []).filter(Boolean);

  const docChildren: any[] = [];

  // Cover Page
  if (options.includeCoverPage) {
    if (logo) {
      const logoBytes = await urlToUint8Array(logo);
      if (logoBytes && logoBytes.length > 0) {
        try {
          docChildren.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: logoBytes,
                  type: 'png',
                  transformation: {
                    width: 180,
                    height: 54,
                  },
                }),
              ],
              spacing: { before: 100, after: 300 },
            })
          );
        } catch (e) {
          console.warn('Could not attach logo to master binder docx cover:', e);
        }
      }
    }

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
        spacing: { before: 150, after: 300 },
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
          spacing: { after: 300 },
        })
      );
    }

    if (targetRoles.length > 0) {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Designated Roles: ',
              bold: true,
              color: '64748B',
              size: 20,
            }),
            new TextRun({
              text: targetRoles.join(', '),
              bold: true,
              color: '2563EB',
              size: 20,
            }),
          ],
          spacing: { after: 300 },
        })
      );
    }

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Author: ${author}  |  Organization: ${companyName}  |  Guides: ${guides.length}  |  Date: ${new Date().toLocaleDateString()}`,
            color: '64748B',
            size: 20,
          }),
        ],
        spacing: { before: 600, after: 400 },
      }),
      new Paragraph({ children: [new PageBreak()] })
    );
  } else {
    // Header banner when cover page is not included
    if (logo) {
      const logoBytes = await urlToUint8Array(logo);
      if (logoBytes && logoBytes.length > 0) {
        try {
          docChildren.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: logoBytes,
                  type: 'png',
                  transformation: {
                    width: 140,
                    height: 42,
                  },
                }),
              ],
              spacing: { before: 100, after: 200 },
            })
          );
        } catch {}
      }
    }

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: companyName.toUpperCase(),
            bold: true,
            color: '2563EB',
            size: 20,
          }),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: docTitle,
        heading: HeadingLevel.TITLE,
        spacing: { after: 150 },
      })
    );

    if (docSubtitle) {
      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: docSubtitle, italics: true, color: '64748B', size: 22 })],
          spacing: { after: 150 },
        })
      );
    }

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Author: ${author}  |  Organization: ${companyName}  |  Date: ${new Date().toLocaleDateString()}${targetRoles.length > 0 ? `  |  Roles: ${targetRoles.join(', ')}` : ''}`,
            color: '64748B',
            size: 18,
          }),
        ],
        spacing: { after: 300 },
      })
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
          spacing: { after: 80 },
        })
      );

      const chapters = groupStepsByChapter(g.steps);
      const hasChapters = chapters.some((c) => c.title);
      if (hasChapters) {
        chapters.forEach((ch) => {
          if (!ch.title) return;
          docChildren.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `    Chapter: ${ch.title}`,
                  bold: true,
                  color: '2563EB',
                  size: 20,
                }),
                new TextRun({
                  text: ` . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . `,
                  color: 'CBD5E1',
                }),
                new TextRun({
                  text: `${ch.steps.length} steps`,
                  color: '64748B',
                  size: 18,
                }),
              ],
              spacing: { after: 60 },
            })
          );
        });
      }
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
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Author: ${g.project.author || author}  |  Organization: ${g.project.companyName || companyName}`,
            color: '64748B',
            size: 18,
          }),
        ],
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

    // Process steps with baked images and chapters
    let lastChapter = '';
    for (const step of g.steps) {
      const stepChapter = (step.sectionTitle || '').trim();
      if (stepChapter && stepChapter !== lastChapter) {
        lastChapter = stepChapter;
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `CHAPTER: ${stepChapter.toUpperCase()}`,
                bold: true,
                color: '2563EB',
                size: 22,
              }),
            ],
            spacing: { before: 320, after: 120 },
          })
        );
      }

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
