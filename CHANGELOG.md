# Changelog

All notable changes to **SCRCD** (Standard Operating Procedure & Guide Creator) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-09-30

### Added
- **UI Automation (UIA) Control Detection**:
  - Recompiled native helper `tools/CaptureScreen.cs` and `bin/capture.exe` to integrate Microsoft UI Automation COM interfaces.
  - Automatically queries `AutomationElement.FromPoint` to extract genuine control names (`elementTitle`), control types (`Button`, `MenuItem`, `Edit`, `TabItem`), and owning process names (`processName`), with parent container fallback for unlabeled controls.
  - Generates human-friendly step titles (e.g., `"Click Save Changes Button"`) instead of falling back to raw window titles.
- **Low-Level Navigation & Keystroke Recording**:
  - Upgraded native helper `tools/MouseHook.cs` and `bin/hook.exe` with a low-level keyboard hook (`WH_KEYBOARD_LL`) to capture Enter key navigation events and a WinEvent foreground hook (`EVENT_SYSTEM_FOREGROUND`) to capture application switching.
  - Seamlessly records navigation steps when opening apps, switching windows, or submitting forms.
- **Intelligent Duplicate Click Suppression & Double-Click Merging**:
  - Consecutive mouse clicks within 500ms and 15px radius are merged into a single `double_click` action.
  - Repetitive rapid clicks (<1500ms, <15px) on the exact same coordinate are suppressed to eliminate step clutter.
- **Interactive AI Rewrite on WYSIWYG Editor**:
  - Added an "AI Rewrite" button to the rich-text editor toolbar in the Inspector sidebar.
  - Connects to the BYOK AI harness to rewrite instructional text into crisp, imperative, professional SOP documentation.
- **BYOK AI Review Guardrail Modal**:
  - In strict compliance with project invariants (Rule 7), AI modifications are never applied silently.
  - A side-by-side comparison modal presents original text alongside the AI-proposed instructions, allowing authors to inspect, apply, or discard changes.
- **Editable Metadata Badges in Inspector & Document Preview**:
  - Target Application and Action Type (`click`, `double_click`, `right_click`, `navigation`, `keypress`, `snapshot`) are now fully editable in both the Inspector sidebar and inline within Document Preview.
- **Hierarchical Table of Contents (TOC)**:
  - Added structured Table of Contents support grouped by chapters and sections across Document Preview, interactive HTML, print PDF, Word (DOCX), and Markdown exports.
- **Custom Branding Logo Support**:
  - Added offline image upload (PNG/JPG stored as base64 Data URI) and URL logo configuration in Global Settings, Project Settings, and the Export Dialog.
  - Custom logos automatically render on the cover and headers of HTML, PDF, Word (DOCX), PowerPoint (PPTX), and Markdown exports.
- **Dual-Layer Versioning**:
  - **Guide Document Versioning**: Track document revisions with an editable `version` field (e.g. `1.0.0`), visible on dashboard cards, editor header, and exported documentation.
  - **SCRCD Application Versioning**: Bumped application release to `v1.1.0`.

### Changed & Fixed
- **WCAG AAA PDF Text Contrast**:
  - Completely revamped the PDF and HTML print stylesheet.
  - Replaced faint low-contrast gray text (`#94a3b8`) with deep high-contrast charcoal and slate (`#0f172a`, `#1e293b`, `#334155`) for crisp, legible readability when printing or viewing PDFs.
- **Standardized Typography to Arial**:
  - Standardized default font stack to `Arial, Helvetica, sans-serif` across HTML, PDF, Word (DOCX), and PowerPoint (PPTX) exporters and Document Preview.
- **Procedural AI Flow Prompting**:
  - Revamped AI system prompts to synthesize procedural flow across sequential steps rather than repeating isolated window titles.
  - Added an optional toggle for chapter and section grouping in the AI Content Writer modal.
- **Native Helper Utilities**:
  - Recompiled Windows utilities `bin/capture.exe` (9.7 KB) and `bin/hook.exe` (8.1 KB), keeping them well under the 20 KB invariant in `GEMINI.md`.

---

## [1.0.0] - 2026-09-30

### Initial Release
- Automated step-by-step SOP and guide creation for Windows.
- Global low-level mouse hooking and automatic screenshot capture.
- Interactive canvas annotation tools (hotspots, arrows, spotlight halo, blur, redact, highlighter).
- Multi-format exporters: PDF, Word (DOCX), PowerPoint (PPTX), Interactive HTML, Markdown ZIP, Animated GIF walkthroughs, and JSON backup.
- Local-first architecture: 100% offline privacy, BYOK AI harness (OpenAI, Anthropic, Gemini, Ollama/Custom).
