# SCRCD

**Automated Step-by-Step SOP, Technical Documentation & Video Guide Creator for Windows**

[![Latest Release](https://img.shields.io/github/v/release/aboutdevz/scrcd?label=Release&color=2563eb)](https://github.com/aboutdevz/scrcd/releases)
[![Build & Release](https://img.shields.io/github/actions/workflow/status/aboutdevz/scrcd/release.yml?label=CI%20%2F%20Release)](https://github.com/aboutdevz/scrcd/actions)
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%2F%2011%20(x64)-0f172a)](https://github.com/aboutdevz/scrcd/releases)
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20Local%20%26%20Offline-059669)](#privacy--security-architecture)
[![License: MIT](https://img.shields.io/badge/License-MIT-475569)](LICENSE)

**SCRCD** is a local-first desktop application for Windows that turns any desktop or web workflow into publication-ready Standard Operating Procedures (SOPs), training manuals, and interactive video walkthroughs.

As you click, type, and navigate across applications, SCRCD captures DPI-accurate screenshots, queries Windows UI Automation for exact control metadata, and assembles structured documentation that can be annotated, refined with a Bring-Your-Own-Key (BYOK) AI assistant, and exported to **PDF, Word (DOCX), PowerPoint (PPTX), Interactive HTML, Markdown ZIP, Animated GIF, WebM Video, and multi-project Master Binders**.

---

## Table of Contents

- [Capabilities at a Glance](#capabilities-at-a-glance)
- [Core Features](#core-features)
  - [1. Intelligent Workflow Capture](#1-intelligent-workflow-capture)
  - [2. Loom-Style Video Guide Studio](#2-loom-style-video-guide-studio)
  - [3. Non-Destructive Canvas & Privacy Redaction](#3-non-destructive-canvas--privacy-redaction)
  - [4. Rich-Text Documentation & Versioning](#4-rich-text-documentation--versioning)
  - [5. Bring-Your-Own-Key (BYOK) AI Harness](#5-bring-your-own-key-byok-ai-harness)
  - [6. Publication-Grade Exporters & Master Binder](#6-publication-grade-exporters--master-binder)
- [System Architecture](#system-architecture)
- [Installation & Quick Start](#installation--quick-start)
- [Development & Build Commands](#development--build-commands)
- [Automated Test Suite](#automated-test-suite)
- [Releases & CI/CD](#releases--cicd)
- [Windows 11 Smart App Control & SmartScreen](#windows-11-smart-app-control--smartscreen)
- [Privacy & Security Architecture](#privacy--security-architecture)
- [License](#license)

---

## Capabilities at a Glance

| Domain | Capability | Implementation Highlights |
| :--- | :--- | :--- |
| **Workflow Capture** | Step-by-Step SOP Recording | Global Win32 mouse/keyboard/window hooks (`WH_MOUSE_LL`, `WH_KEYBOARD_LL`, `EVENT_SYSTEM_FOREGROUND`) with automatic double-click merging and duplicate click suppression |
| **UI Intelligence** | Control Metadata Extraction | Native Windows UI Automation (`IUIAutomation` / `AutomationElement.FromPoint`) extracts control names, types (`Button`, `MenuItem`, `Edit`, `TabItem`), and process owners |
| **Capture Scopes** | Multi-Monitor & Smart Focus | Active Window, Smart Focus Near Cursor (`1200x750` viewport), Specific Monitor, Full Desktop, and target App-Lock |
| **Video Walkthroughs** | Screen + Webcam + Audio | WebRTC + Web Audio mixer with hardware-composited circular webcam bubble, timeline trimmer, and auto-generated click chapters |
| **Visual Editor** | Non-Destructive Canvas | `react-konva` layer with numbered hotspots, spotlight halos, arrows, callouts, crop, step merging, and full undo/redo history |
| **Privacy & Redaction** | Irreversible Image Baking | Mosaic pixelation with frosted tint and solid blackout redaction burned directly into output images via `bakeStepsForExport` |
| **AI Assistant** | Local BYOK AI Harness | Supports OpenAI, Google Gemini, Anthropic Claude, and custom/local endpoints (Ollama) with English & Indonesian output and mandatory diff review guardrails |
| **Export Formats** | 8+ Publication Formats | PDF, Word (`.docx`), PowerPoint (`.pptx`), Interactive HTML, Video HTML Player, Markdown + PNG (`.zip`), Animated GIF, WebM, Master Binder, and Project JSON |

---

## Core Features

### 1. Intelligent Workflow Capture
- **Low-Level Win32 Hook Engine**: Captures left-clicks, right-clicks, double-clicks, `Enter` form submissions, synthesized typing steps, and application window switches across any desktop or web application.
- **Automatic UI Automation Inspection**: Queries the Windows accessibility tree at the exact click coordinate to generate semantic step titles (for example, *"Click Save Changes Button in Settings"*) instead of generic window titles.
- **Sensitive Input Protection**: Automatically detects password inputs and masks keystrokes with `••••••••`.
- **Configurable Capture Scope**:
  - **Active Window**: Captures only the foreground application window.
  - **Smart Focus Near Cursor**: Crops a focused `1200x750` region centered around the cursor, ideal for ultrawide and multi-monitor setups.
  - **Specific Monitor / All Monitors**: Full native-resolution capture with per-monitor DPI scaling.
  - **App-Lock Mode**: Restricts recording strictly to a designated target application.
- **Stealth Floating Controller**: A compact floating control bar provides Pause, Resume, Manual Snapshot, Audio/Webcam toggles, and Finish controls while remaining invisible to screenshots via `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)`.

### 2. Loom-Style Video Guide Studio
- **Synchronized Screen, Webcam & Audio Recording**: Record narrated video walkthroughs alongside automatic click timestamp tracking.
- **Hardware-Composited Circular Webcam Bubble**: Renders a movable circular camera overlay with center-crop aspect ratio preservation, while excluding the floating preview window from screen capture to prevent visual recursion.
- **Web Audio Mixer**: Combines system desktop audio and microphone narration into a single unified audio track with live mute toggles.
- **Built-In Video Guide Studio**:
  - Interactive start/end timeline trimming.
  - Automatic chapter markers generated from recorded mouse clicks and actions.
  - Fullscreen playback and custom thumbnail generation.
  - Direct export to **WebM Video** or a self-contained **Interactive Video HTML Player**.

### 3. Non-Destructive Canvas & Privacy Redaction
- **Interactive Annotation Layer (`react-konva`)**: Select, move, resize (`Transformer`), rotate, delete, and undo/redo (`Ctrl+Z` / `Ctrl+Y`) annotations at any time without degrading the underlying raw screenshot.
- **Technical Annotation Toolkit**:
  - Draggable numbered click hotspot badges.
  - Spotlight halos that dim surrounding UI clutter to emphasize the target control.
  - Straight and curved directional arrows, highlight rectangles, ovals, freehand highlighter strokes, pointer icons, and text callout pills.
  - Interactive region cropping and multi-step merging (`MergeStepsModal`) to combine sequential clicks onto a single composite screenshot.
- **Guaranteed Privacy Redaction**:
  - **Mosaic Pixelation Blur**: Uses multi-pass downscale/upscale pixelation with smoothing disabled plus a frosted tint so sensitive text is 100% illegible.
  - **Solid Blackout Redaction**: Opaque redaction blocks for credentials, PII, and financial data.
  - **Mandatory Export Baking**: All annotations and redactions are permanently flattened into exported bitmaps prior to document generation.

### 4. Rich-Text Documentation & Versioning
- **Tiptap WYSIWYG Editor**: Author rich step descriptions with headings, bulleted and numbered lists, tables, inline code, links, blockquotes, and structured callout blocks (**Tip**, **Warning**, **Note**).
- **Editable Step Metadata**: Customize step titles, action badges (`click`, `double_click`, `right_click`, `keypress`, `navigation`, `snapshot`), chapter headings, and target application labels inline or from the Inspector sidebar.
- **Document Version History**: Save named project snapshots (`SaveVersionModal`) and restore previous revisions from the version drawer (`VersionHistoryDrawer`).
- **Full Light & Dark Mode**: High-contrast interface and preview themes engineered for both dark and light workspaces.

### 5. Bring-Your-Own-Key (BYOK) AI Harness
- **Provider-Agnostic & Local-First**: Connect your own API key stored strictly in client-side `localStorage`. Supports **OpenAI**, **Google Gemini**, **Anthropic Claude**, and **Custom OpenAI-Compatible Endpoints** (including local **Ollama** and **LM Studio** servers).
- **Procedural Flow Synthesis**: Transforms raw click logs into cohesive, imperative SOP instructions with optional automatic chapter and section grouping.
- **Inline WYSIWYG AI Rewrite**: Refine individual step instructions directly from the rich-text editor toolbar.
- **Multi-Language Output**: Generate and translate SOP documentation in **English** or **Bahasa Indonesia**.
- **Mandatory Diff Review Guardrail**: AI generations never overwrite user content silently. A side-by-side comparison modal lets you inspect, accept, or reject proposed edits step by step.

### 6. Publication-Grade Exporters & Master Binder
- **PDF Document**: Native Electron `printToPDF` engine producing crisp, borderless publication layouts with WCAG AAA text contrast and a classic single-column Table of Contents with dotted leaders.
- **Microsoft Word (`DOCX`)**: Native Word documents with hierarchical headings, formatted tables, custom branding logos, and high-resolution embedded PNG figures.
- **Microsoft PowerPoint (`PPTX`)**: True 16:9 widescreen slide decks (`13.33" x 7.5"`) with structured instruction layouts and scaled screenshots.
- **Single-File Interactive HTML**: Self-contained offline web guide featuring a sticky Table of Contents, light/dark theme switcher, interactive step completion checkboxes, and zoomable figures.
- **Markdown + Images (`ZIP`)**: Clean CommonMark `.md` documentation bundled with an organized `images/` asset folder.
- **Animated GIF Walkthrough**: Fast, quantized looping GIFs (`gifenc`) with letterbox scaling and click indicators for quick embedding in GitHub PRs, Jira tickets, or wikis.
- **Master Binder**: Combine multiple standalone SOP projects into a unified, multi-chapter operations manual (`PDF`, `DOCX`, or `HTML`) with a master cover page and consolidated Table of Contents.
- **Project JSON Backup**: Full lossless project serialization for archiving, sharing, and restoring workspaces.

---

## System Architecture

SCRCD combines an Electron desktop runtime, lightweight native C# Win32/UIA helper binaries, and a React + TypeScript frontend connected via an adaptive IPC bridge.

```text
scrcd/
├── electron/
│   └── main.cjs                     # Electron main process, native IPC handlers, PDF printer & window manager
├── tools/                           # Native Windows C# helper source & build scripts
│   ├── CaptureScreen.cs             # GDI multi-monitor screenshot capture + Windows UI Automation (UIA) client
│   ├── MouseHook.cs                 # Win32 WH_MOUSE_LL, WH_KEYBOARD_LL & EVENT_SYSTEM_FOREGROUND hooks
│   ├── AssemblyInfo.cs              # Assembly metadata synchronized by release pipeline
│   ├── build-tools.ps1              # Compiles helpers via built-in .NET csc.exe into <20 KB binaries
│   └── winget/                      # Windows Package Manager (Winget) manifests
├── bin/
│   ├── capture.exe                  # Compiled native screenshot & UIA extractor (<15 KB, UTF-8 JSON stdout)
│   └── hook.exe                     # Compiled low-level input & window hook daemon (<15 KB, UTF-8 JSON stdout)
├── src/
│   ├── components/
│   │   ├── common/                  # CommandPalette, SimulatedCaptureModal, SplashScreen, AboutModal, Logo
│   │   ├── dashboard/               # ProjectDashboard (search, tags, folders, batch actions)
│   │   ├── editor/                  # EditorView, CanvasStage, WysiwygEditor, VideoGuideStudio,
│   │   │                            # AiHarnessModal, DocumentPreviewModal, MergeStepsModal, VersionHistoryDrawer
│   │   ├── export/                  # ExportModal, MasterBinderModal
│   │   ├── layout/                  # Header, workspace navigation & theme controls
│   │   ├── recorder/                # CaptureSetupModal, FloatingPill, WebcamBubble
│   │   └── settings/                # SettingsView (capture defaults, branding, BYOK AI configuration)
│   ├── services/
│   │   ├── api.ts                   # Adaptive IPC bridge (Electron / Tauri / Browser Dev-Bridge fallback)
│   │   ├── aiHarness.ts             # Multi-provider BYOK AI client & localized prompt engine
│   │   ├── imageBaker.ts            # Offscreen canvas compositor for annotations & mosaic privacy blur
│   │   ├── videoRecorder.ts         # WebRTC screen + webcam compositor & Web Audio mixer engine
│   │   ├── videoStorage.ts          # Disk & IndexedDB media persistence
│   │   └── exporters/               # DOCX, PPTX, HTML, Video HTML, Markdown ZIP, GIF, Master Binder, JSON
│   ├── store/
│   │   └── useStore.ts              # Zustand state management with persistent local storage
│   └── types/
│       └── index.ts                 # TypeScript data models for projects, steps, annotations & video guides
├── tests/                           # Automated verification suites (exports, binder, rich text, canvas, video, AI)
├── scripts/
│   └── release.cjs                  # Automated version synchronization, test runner & git tag generator
└── src-tauri/                       # Optional Rust / Tauri v2 backend crate
```

---

## Installation & Quick Start

### Option 1: Download Prebuilt Windows Binaries (Recommended)
1. Navigate to the [**GitHub Releases**](https://github.com/aboutdevz/scrcd/releases) page.
2. Download the installer or portable executable for the latest release:
   - **Standard Installer (Recommended)**: `SCRCD-Setup-<version>.exe` — Installs SCRCD with Start Menu and Desktop shortcuts.
   - **Standalone Portable**: `SCRCD-<version>.exe` — Single-file executable requiring no installation.

### Option 2: Build from Source

#### Prerequisites
- **OS**: Windows 10 or Windows 11 (x64)
- **Runtime**: [Node.js](https://nodejs.org/) v18+ (Node.js 22 LTS recommended)
- **Native Compiler**: Built-in Windows .NET Framework C# compiler (`csc.exe`, pre-installed on Windows 10/11)

#### Setup & Launch
```bash
# 1. Clone the repository
git clone https://github.com/aboutdevz/scrcd.git
cd scrcd

# 2. Install dependencies
npm install

# 3. Compile native Windows helper binaries (bin/capture.exe & bin/hook.exe)
npm run build:tools

# 4. Build the frontend bundle and launch the Electron desktop app
npm run build
npm run electron:dev
```

#### Browser Dev-Bridge Mode (UI Development)
For rapid frontend iteration without native Win32 hooks, launch the Vite development server:
```bash
npm run dev
```
Open `http://localhost:1420` in your browser to test the dashboard, sample SOP projects, interactive **Simulate Click** recorder, `react-konva` canvas tools, and all client-side document exporters.

---

## Development & Build Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start Vite frontend development server with Browser Dev-Bridge mode |
| `npm run electron:dev` | Launch the full Electron desktop application locally |
| `npm run build:tools` | Compile `tools/CaptureScreen.cs` and `tools/MouseHook.cs` into `bin/capture.exe` and `bin/hook.exe` |
| `npm run build` | Type-check with TypeScript (`tsc`) and bundle production assets via Vite |
| `npm test` | Run all 7 automated verification suites |
| `npm run build:exe` | Package standalone Windows portable executable into `release/` |
| `npm run build:installer` | Package Windows NSIS Setup installer into `release/` |
| `npm run build:all` | Build both portable executable and NSIS Setup installer into `release/` |
| `npm run release <patch\|minor\|major>` | Run tests, verify builds, sync versions across all manifests, commit, and create an annotated git tag |

---

## Automated Test Suite

SCRCD includes an end-to-end Node verification suite (`npm test`) that validates binary document headers, rich-text AST conversion, annotation baking, video guide trimming, and AI localization:

| Test Suite | File | Verification Scope |
| :--- | :--- | :--- |
| **Document Exporters** | `tests/exportTest.js` | Binary ZIP/OOXML signature checks and schema validation for DOCX, PPTX, Markdown ZIP, HTML, and JSON |
| **Master Binder** | `tests/masterBinderTest.js` | Multi-project compilation, chapter hierarchy ordering, and dotted-leader Table of Contents generation |
| **Rich-Text Engine** | `tests/richTextTest.js` | HTML-to-structured-block parsing for headings, lists, tables, inline code, and callouts |
| **Synthesized Typing** | `tests/typingStepTest.js` | Keystroke buffering, password masking, and typing step consolidation |
| **Canvas & Step Merge** | `tests/canvasAndMergeTest.js` | Coordinate scaling, step merging, hotspot re-indexing, and mosaic privacy redaction baking |
| **Video Guide Studio** | `tests/videoGuideTest.js` | Video timeline trimming math, click-to-chapter timestamp mapping, and Video HTML player generation |
| **AI Localization** | `tests/aiLanguageTest.js` | English and Indonesian prompt construction, fallback templates, and store persistence |

---

## Releases & CI/CD

SCRCD uses an automated GitHub Actions release pipeline (`.github/workflows/release.yml`):

1. **Prepare a Release Locally**:
   ```bash
   npm run release patch   # or: minor | major | x.y.z
   ```
   This script verifies a clean git tree, runs `npm test` and `npm run build`, updates version metadata across `package.json`, `src/config/version.ts`, `index.html`, `tools/AssemblyInfo.cs`, `tools/app.manifest`, and `src-tauri/`, recompiles `bin/capture.exe` and `bin/hook.exe`, creates a release commit, and tags `v<version>`.
2. **Push to Trigger Publication**:
   ```bash
   git push origin main --tags
   ```
3. **Automated GitHub Release**:
   GitHub Actions builds the native C# tools, packages the portable `.exe` and NSIS Setup installer via `electron-builder`, computes `SHA256SUMS.txt`, and publishes the release assets.

For detailed release procedures, see [RELEASING.md](RELEASING.md) and [CHANGELOG.md](CHANGELOG.md).

---

## Windows 11 Smart App Control & SmartScreen

- **Recommended**: Download and run the **NSIS Setup Installer (`SCRCD-Setup-*.exe`)**, which installs cleanly into your local user programs directory.
- If running the standalone portable executable (`SCRCD-*.exe`) on a system with Windows 11 Smart App Control or SmartScreen warnings:
  1. Right-click the `.exe` file in File Explorer and select **Properties**.
  2. On the **General** tab, check **Unblock** at the bottom under **Security**.
  3. Click **Apply** and launch SCRCD (or run `tools/Unblock-SCRCD.bat`).

For PowerShell commands and troubleshooting, see [docs/SMART_APP_CONTROL.md](docs/SMART_APP_CONTROL.md).

---

## Privacy & Security Architecture

- **100% Offline Core**: All workflow recording, UI Automation inspection, canvas annotation, and document compilation execute locally on your machine with zero telemetry or analytics.
- **Client-Side BYOK Credentials**: Optional AI features only communicate with your configured provider when explicitly invoked, using API keys stored locally on your device.
- **Irreversible Redaction**: Blurred and redacted areas are permanently rasterized into output images before any document leaves the application.

---

## License

This project is licensed under the [MIT License](LICENSE). See the [LICENSE](LICENSE) file for full details.
