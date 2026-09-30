# SCRCD Project Guidelines & Invariants

## 1. Electron WebContents Focus & Dialogs
- **No Synchronous Native Dialogs**: Never use `window.confirm()`, `window.alert()`, or `window.prompt()`. In Electron on Windows, native synchronous dialogs detach/corrupt the webContents input focus upon dismissal, preventing users from typing into form fields.
- **In-App Modals**: Always use custom in-app React modals (e.g. `ConfirmModal`) or asynchronous IPC calls with explicit window focus restoration for user confirmations.

## 2. Document Generation & PDF Export
- **No Lazy Loading on Export Templates**: Never use `loading="lazy"` on `<img>` tags in templates intended for print or PDF export (`exportHtml.ts`, `DocumentPreviewModal.tsx`). In Chromium print preview, off-screen lazy images are not fetched or decoded, leaving multi-page exports blank past page 1.
- **Explicit Image Decoding**: Always use `loading="eager"` and `decoding="sync"`, and wait for `Promise.all(images.map(img => img.decode ? img.decode() : ...))` before triggering `window.print()`.

## 3. Workflow Recording & Step Management
- **Preserve Existing Steps on Continuation**: When starting or resuming a recording session on an existing project, pass `existingStepsCount` as an offset. Newly captured steps must be appended ($N+1$, $N+2$, ...) rather than resetting arrays or overwriting storage with only the latest batch.
- **Dual Undo/Redo Architecture**:
  - **Step-Level Undo/Redo**: Track step additions, deletions, merges, and reorders in the Steps sidebar (`stepHistoryPast`, `stepHistoryFuture`, shortcuts `Ctrl+Alt+Z` / `Ctrl+Alt+Y`).
  - **Canvas-Level Undo/Redo**: Keep annotation modifications on the active step isolated in canvas history (`Ctrl+Z` / `Ctrl+Y`). Do not conflate step lifecycle with shape drawing history.

## 4. Electron Window & Packaging Configuration
- **Application Icon**: Always configure `icon: path.join(__dirname, '../public/favicon.ico')` in `BrowserWindow` options and specify `"win": { "icon": "public/favicon.ico" }` under `build` in `package.json` to ensure taskbar, window titlebar, and portable executables have the official logo.
