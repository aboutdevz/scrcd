# Project Guidelines & Invariants for SCRCD

## 1. Git & Binary File Invariants
- **Never Commit Build Artifacts**: Never track or commit compiled application executables, installers, or unpackaged bundles (`release/`, `dist/`, `build/`, `target/`).
- **Pre-Push File Size Verification**: Always ensure no single file exceeds 50 MB (GitHub warning threshold) or 100 MB (GitHub hard rejection limit).
- **History Pruning**: If large binaries are accidentally committed locally before pushing to remote, prune them from history (`git reset`, followed by `git reflog expire` and `git gc`) rather than simply adding a subsequent removal commit.

## 2. Remote Synchronization & Unrelated Histories
- When connecting to a newly created GitHub remote initialized with a web `LICENSE` or `README`, reconcile unrelated histories cleanly using:
  ```bash
  git pull origin main --allow-unrelated-histories --no-rebase
  ```
- Always preserve the repository owner's license and attribution from GitHub.

## 3. Native Helper Binaries & Release Pipelines
- Windows helper utilities in `bin/` (`capture.exe`, `hook.exe`) must stay lean (<20 KB).
- Source code in `tools/` must always have corresponding compilation scripts (`tools/build-tools.ps1` and `tools/build-tools.bat`) that utilize the built-in Windows .NET C# compiler (`csc.exe`).
- Production releases must be triggered through the automated GitHub Actions release workflow (`.github/workflows/release.yml`) or via `npm run release <patch|minor|major>`.

## 4. UI & Icon Standards
- **No Emojis in UI**: Do NOT use Unicode emojis (e.g., ✨, 📄, 💻, 🌿, ▶️) or sparkle icons for buttons, toolbars, badges, or simulated capture workflows.
- **Lucide Icons**: Always import and use clean, semantic Lucide icons (e.g., `Download`, `Bot`, `Workflow`, `FileCode`, `Terminal`, `GitBranch`, `Play`, `FileText`).
- **Collapsible & Resizable Panels**: Workspace sidebars (e.g., Steps list, Inspector) should maintain responsive layout balance using draggable splitters with min/max clamps and compact toggle rails.

## 5. Electron & Windows Packaging
- **Taskbar & App User Model ID**: Always register `app.setAppUserModelId('com.scrcd.app')` in `electron/main.cjs` so Windows properly pins and displays the application icon.
- **Asset Packaging**: Always ensure `package.json` includes `"public/**/*"` in `"build.files"` so runtime icons (`favicon.ico`, `icon.png`) are bundled into packaged executables.
- **Icon Paths**: Resolve icons across both development and packaged paths (`process.resourcesPath` and root).

## 6. Document & Media Exporters
- **DOCX (`docx` package)**:
  - When embedding images in `docx`, ALWAYS specify `type: 'png'` (or `'jpg'`) in `new ImageRun(...)`. Omitting `type` creates invalid relationship schemas that cause Microsoft Word unreadable content errors.
- **PPTX (`pptxgenjs` package)**:
  - ALWAYS set `pptx.layout = 'LAYOUT_WIDE'` (13.33" × 7.5") for 16:9 presentations. The default `LAYOUT_16x9` is only 10" × 5.625" and will clip or misalign coordinates authored for widescreen templates.
- **PDF Export**:
  - Do NOT rely on `window.print()` inside Electron. Use native Electron IPC `webContents.printToPDF({ printBackground: true })` with `dialog.showSaveDialog`.
- **Animated Walkthroughs**:
  - Prefer fast, quantized animated GIFs via `gifenc` with frame progress callbacks and letterbox canvas scaling over heavy WebM screen recordings.

## 7. BYOK AI Harness
- **Privacy & Storage**: API keys are Bring-Your-Own-Key (BYOK) and must be stored client-side in `localStorage`.
- **Provider Support**: Maintain agnostic provider support (`openai`, `gemini`, `anthropic`, `custom`).
- **User Review Guardrail**: Never mutate user steps silently. AI generations must present a diff/review modal allowing users to inspect proposed changes before applying.

## 8. UI Visual Guidelines & Aesthetics
- **Zero Emojis**: Do not use emojis anywhere in the app UI, toolbars, buttons, dialogs, or exported documents. Use Lucide icons or clear text labels.
- **No Extraneous Badges or Placeholder Icons**: Avoid decorative badges, custom app logo placeholders, or artificial marketing stickers. Keep the interface clean, technical, and purposeful.
- **Full Light Mode Support**: All UI components and export templates must support a clean, accessible light mode alongside dark mode.

## 9. Document & Export Styling Standards
- **Borderless Document Styling**: In exported HTML, PDF, DOCX, and PPTX documents, do NOT wrap steps in card border boxes. Content should flow cleanly down the page separated by natural whitespace or subtle divider lines.
- **Mandatory Annotation Baking**: Screenshots passed to exporters (HTML, PDF, DOCX, PPTX, Markdown, GIF) must ALWAYS have annotations (click hotspots, spotlight halos, pointer icons, badges, arrows, blurs) burned directly into the image via `bakeStepsForExport` before document generation. Raw screenshots must never be exported without annotations.

## 10. Privacy & Redaction Standards
- **Guaranteed Privacy**: Blur and redaction elements must render 100% illegible.
- **Mosaic Pixelation**: Blur tools must use heavy mosaic pixelation (downscale/upscale with smoothing disabled) plus frosted tint. Never use semi-transparent translucent overlays that allow high-contrast text underneath to be read.

## 11. Capture & Canvas Architecture
- **Multi-Monitor Scope**: Always detect multi-monitor environments and allow the user to select capture scope (Active Window, Smart Focus Near Cursor, Specific Monitor, or All Monitors).
- **Smart Focus Cropping**: When capturing area near cursor, crop to a 1200×750 viewport centered at the cursor rather than capturing the full ultra-wide multi-screen desktop.
- **Full Canvas Manipulation**: Maintain complete interactive canvas controls: select, move, resize (Transformer), delete (Backspace/Delete), and undo/redo (Ctrl+Z / Ctrl+Y).
- **100% Offline Privacy**: Zero external telemetry, tracking, or network calls.

