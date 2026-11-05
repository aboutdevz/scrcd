import { Project, BrandingProfile } from '@/types';
import { formatVideoTimestamp } from '@/services/videoStorage';

function escapeHtml(str?: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function generateVideoGuideHtml(
  project: Project,
  branding: BrandingProfile,
  videoDataUrl?: string
): string {
  const accent = branding.accentColor || project.accentColor || '#2563eb';
  const logo = branding.logoUrl || project.logoUrl;
  const author = branding.author || project.author || 'Author';
  const companyName = branding.companyName || project.companyName || 'Organization';
  const version = project.version || '1.0.0';
  const videoSrc = videoDataUrl || project.videoPath || '';
  const duration = project.videoDuration || 0;
  const trimStart = project.videoTrimStart ?? 0;
  const trimEnd = project.videoTrimEnd ?? duration;
  const chapters = Array.isArray(project.videoChapters) ? project.videoChapters : [];

  const tocHtml =
    chapters.length > 0
      ? `
    <nav class="toc-container">
      <div class="toc-header">
        <h2 class="toc-heading">Table of Contents</h2>
      </div>
      <div class="toc-list">
        ${chapters
          .map(
            (ch) => `
          <a href="#chapter-${escapeHtml(ch.id)}" class="toc-row" data-seek="${ch.timestamp}">
            <span class="toc-title">${escapeHtml(ch.title)}</span>
            <span class="toc-leader"></span>
            <span class="toc-num">${formatVideoTimestamp(ch.timestamp)}</span>
          </a>`
          )
          .join('\n')}
      </div>
    </nav>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(project.title)} - Video Guide</title>
  <style>
    :root {
      --bg: #ffffff;
      --fg: #0f172a;
      --muted: #64748b;
      --border: #e2e8f0;
      --surface: #f8fafc;
      --accent: ${escapeHtml(accent)};
    }
    html.dark {
      --bg: #090d16;
      --fg: #f8fafc;
      --muted: #94a3b8;
      --border: #1e293b;
      --surface: #0f172a;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--fg);
      line-height: 1.6;
      padding: 40px 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    .doc-header {
      border-bottom: 2px solid var(--accent);
      padding-bottom: 20px;
      margin-bottom: 28px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }
    .doc-title {
      font-size: 28px;
      font-weight: 800;
      margin: 0 0 8px 0;
    }
    .doc-meta {
      font-size: 13px;
      color: var(--muted);
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
    }
    .theme-btn {
      background: var(--surface);
      color: var(--fg);
      border: 1px solid var(--border);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .video-stage {
      width: 100%;
      background: #000;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 28px;
    }
    video {
      width: 100%;
      display: block;
      max-height: 540px;
    }
    .toc-container {
      margin: 28px 0;
      padding: 20px 0;
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
    }
    .toc-heading {
      text-align: center;
      font-size: 15px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin: 0 0 16px 0;
    }
    .toc-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .toc-row {
      display: flex;
      align-items: baseline;
      text-decoration: none;
      color: var(--fg);
      font-size: 14px;
      cursor: pointer;
    }
    .toc-row:hover .toc-title {
      color: var(--accent);
    }
    .toc-title {
      font-weight: 600;
    }
    .toc-leader {
      flex: 1;
      border-bottom: 1px dotted var(--muted);
      margin: 0 10px;
    }
    .toc-num {
      font-variant-numeric: tabular-nums;
      font-family: monospace;
      font-size: 13px;
      color: var(--muted);
    }
    .notes-section {
      margin-top: 24px;
      font-size: 15px;
    }
    .doc-footer {
      margin-top: 48px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
      font-size: 12px;
      color: var(--muted);
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="doc-header">
      <div>
        ${logo ? `<img src="${escapeHtml(logo)}" alt="Logo" style="max-height:36px;margin-bottom:10px;" />` : ''}
        <h1 class="doc-title">${escapeHtml(project.title)}</h1>
        <div class="doc-meta">
          <span><strong>Organization:</strong> ${escapeHtml(companyName)}</span>
          <span><strong>Author:</strong> ${escapeHtml(author)}</span>
          <span><strong>Version:</strong> v${escapeHtml(version)}</span>
          <span><strong>Duration:</strong> ${formatVideoTimestamp(Math.max(0, trimEnd - trimStart))}</span>
        </div>
      </div>
      <button class="theme-btn" id="themeToggle">Toggle Theme</button>
    </header>

    <div class="video-stage">
      <video
        id="guideVideo"
        controls
        preload="metadata"
        src="${escapeHtml(videoSrc)}"
        poster="${escapeHtml(project.videoThumbnailUrl || '')}"
        data-trim-start="${trimStart}"
        data-trim-end="${trimEnd}"
      ></video>
    </div>

    ${tocHtml}

    ${
      project.description
        ? `<section class="notes-section">
            <h2>Guide Notes</h2>
            <div>${project.description}</div>
          </section>`
        : ''
    }

    <footer class="doc-footer">
      <span>${escapeHtml(branding.footerText || companyName)}</span>
      <span>Generated by SCRCD</span>
    </footer>
  </div>

  <script>
    (function() {
      const btn = document.getElementById('themeToggle');
      if (btn) {
        btn.addEventListener('click', function() {
          document.documentElement.classList.toggle('dark');
        });
      }
      const video = document.getElementById('guideVideo');
      if (video) {
        const start = parseFloat(video.getAttribute('data-trim-start') || '0');
        const end = parseFloat(video.getAttribute('data-trim-end') || '0');
        video.addEventListener('loadedmetadata', function() {
          if (start > 0 && video.currentTime < start) {
            video.currentTime = start;
          }
        });
        video.addEventListener('timeupdate', function() {
          if (end > start && video.currentTime >= end) {
            video.pause();
            video.currentTime = start;
          }
        });
      }
      document.querySelectorAll('[data-seek]').forEach(function(el) {
        el.addEventListener('click', function(e) {
          e.preventDefault();
          const ts = parseFloat(el.getAttribute('data-seek') || '0');
          if (video) {
            video.currentTime = ts;
            video.play().catch(function() {});
          }
        });
      });
    })();
  </script>
</body>
</html>`;
}
