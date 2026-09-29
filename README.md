# SCRCD - Automated Step-by-Step SOP & Guide Creator for Windows

A local, offline desktop application for Windows that automatically records your workflows across any desktop or web application, snapping high-resolution screenshots on every mouse click and keystroke, extracting element metadata via Windows UI Automation, and exporting guides into **PDF, Word (DOCX), PowerPoint (PPTX), HTML, Markdown, JSON, and animated GIFs**.

---

## 🌟 Key Features

1. **Automatic Workflow Capture**:
   - Listens to mouse clicks (`WM_LBUTTONDOWN`), double-clicks, right-clicks, and keyboard commits across any running desktop application.
   - Snaps screenshots with native per-monitor DPI scaling.
   - Auto-extracts target element names and control types (Buttons, Text Inputs, Menu Items, Dropdowns) via Windows UI Automation COM API (`IUIAutomation::ElementFromPoint`).
   - Automatically masks password fields with `••••••••`.
   - **Floating Controller Bar**: Docked on your screen with Pause, Resume, Done, Discard, and Manual Snapshot buttons, automatically excluded from screenshots via `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)`.
   - **Hybrid Scope**: Global desktop recording by default, with an **App-Lock** toggle to lock capture strictly to a specific target window.

2. **Built-in Non-Destructive Canvas Editor (`react-konva`)**:
   - **Click Hotspot Badges**: Numbered badges placed at the exact click coordinate with drag-and-drop repositioning.
   - **Comprehensive Annotation Tools**: Straight & curved arrows, highlight boxes, ovals, text callout pills, freehand highlighter pen.
   - **Privacy Redaction**: Manual blur/pixelate box tool with adjustable intensity, plus solid black-out redaction.
   - **Image Cropping**: Interactive crop tool to focus on specific UI regions.
   - **Step Composition**: 1-click step merging, multiple hotspots on a single screenshot, screenshot retaking/replacing, and drag-and-drop reordering.

3. **WYSIWYG Rich-Text Step Documentation**:
   - Powered by Tiptap: Headings, bulleted & numbered lists, inline code, blockquotes, and preset callouts (💡 Tip, ⚠️ Warning, ℹ️ Note).

4. **100% Offline Privacy Guarantee**:
   - Zero telemetry, zero external network requests.
   - Local SQLite database stored securely in user AppData.

5. **Multi-Format Document Exporters**:
   - 📄 **PDF**: Print-ready single-column SOP layout with Table of Contents and step badges.
   - 📝 **Word (DOCX)**: Formatted Word document with embedded high-res screenshots and heading hierarchies (via `docx`).
   - 📊 **PowerPoint (PPTX)**: 16:9 widescreen presentation with instruction cards and screenshots (via `pptxgenjs`).
   - 🌐 **Single-File Interactive HTML**: Self-contained offline tutorial with dark/light mode toggle and interactive step checklist.
   - 📦 **Markdown (.md) + Images ZIP**: Clean CommonMark documentation packaged with high-res PNG images (via `jszip`).
   - 💾 **Project JSON**: Complete schema backup and restore.
   - 🎬 **Animated GIF / Video**: Looping walkthrough slideshow with click ripple animations.

---

## 🏗️ Architecture & Dev-Bridge

```
scrcd/
├── src-tauri/             # Native Rust core (Tauri v2)
│   ├── src/
│   │   ├── capture.rs     # GDI / DXGI active monitor capture
│   │   ├── hooks.rs       # WH_MOUSE_LL low-level Windows hooks with debouncing
│   │   ├── uia.rs         # Windows UI Automation COM API client
│   │   ├── db.rs          # Local SQLite store (rusqlite)
│   │   ├── pill.rs        # WDA_EXCLUDEFROMCAPTURE floating controller
│   │   ├── lib.rs         # Tauri IPC commands & event dispatcher
│   │   └── main.rs        # Application entry point
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── src/                   # React 19 + TypeScript + Vite frontend
│   ├── components/
│   │   ├── layout/Header.tsx
│   │   ├── dashboard/ProjectDashboard.tsx
│   │   ├── editor/EditorView.tsx
│   │   ├── editor/CanvasStage.tsx
│   │   ├── editor/WysiwygEditor.tsx
│   │   ├── recorder/FloatingPill.tsx
│   │   ├── export/ExportModal.tsx
│   │   ├── settings/SettingsView.tsx
│   │   └── common/SimulatedCaptureModal.tsx
│   ├── services/
│   │   ├── api.ts         # Dev-Bridge adapter (Tauri IPC <-> Browser simulation)
│   │   ├── mockData.ts    # Dynamic canvas screenshot generator
│   │   └── exporters/     # Client-side document generators (DOCX, PPTX, HTML, ZIP, GIF)
│   ├── store/useStore.ts  # Zustand reactive state store
│   └── types/index.ts     # TypeScript data schemas
└── tests/
    └── exportTest.js      # Automated unit test suite for document exports
```

---

## 🚀 Getting Started

### 1. Run Development Server (Browser Dev-Bridge)
```bash
npm run dev
```
Open [http://localhost:1420](http://localhost:1420) in your browser. You can immediately use the visual dashboard, explore sample SOP guides, test canvas annotations (arrows, hotspots, blurs, redactions), run the interactive **Simulate Click** tool, and export into all 7 document formats!

### 2. Run Export Tests
```bash
node tests/exportTest.js
```
Runs automated verification verifying binary validity for Word DOCX, PowerPoint PPTX, ZIP/Markdown, and JSON.

### 3. Compile Native Windows App (`tauri dev` / `tauri build`)
Once the Microsoft Visual C++ Build Tools (`link.exe`) are installed:
```bash
npm run tauri dev
```
This launches the native desktop window with low-level Windows mouse hooks and floating pill affinity active.

### 4. Package Windows Executables (Electron)
```bash
# Build portable standalone .exe
npm run build:exe

# Build standard Windows NSIS installer
npm run build:installer

# Build both portable & installer
npm run build:all
```
Generated executables will be output to the `release/` directory.

---

## 📦 Releases & CI/CD

SCRCD includes an automated release workflow powered by GitHub Actions:

- **Automated Builds**: Pushing a tag like `v1.0.0` or triggering the **Release** workflow from GitHub Actions automatically runs tests, packages the Windows portable executable and installer, computes SHA-256 checksums, and publishes the release on GitHub.
- **Release Automation**: Run `npm run release <patch|minor|major>` to run tests, bump versions, commit, and create an annotated git tag.
- For complete details, see [RELEASING.md](file:///c:/Users/PTRE/Documents/scrcd/RELEASING.md).

---

## 📄 License

This project is licensed under the [MIT License](file:///c:/Users/PTRE/Documents/scrcd/LICENSE) - see the [LICENSE](file:///c:/Users/PTRE/Documents/scrcd/LICENSE) file for details.
