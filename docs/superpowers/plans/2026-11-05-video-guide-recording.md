# Loom-Style Video Guide Recording Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Loom-style continuous screen video recording mode with simultaneous microphone voice narration, desktop system audio capture, a draggable circular webcam bubble, and a post-recording Video Guide Studio with trimming, timestamped chapters, and export.

**Architecture:** Video recording uses Electron's `desktopCapturer` + WebRTC (`getUserMedia` / `getDisplayMedia`) for screen and desktop loopback audio, mixed with the microphone stream through a Web Audio API `AudioContext` (`GainNode` per source for live mute/unmute) into a `MediaRecorder` (`video/webm;codecs=vp9,opus`). A frameless circular OS `webcamWindow` (`setContentProtection(false)`) lets users drag their live camera bubble anywhere on screen during full-screen capture (with a canvas compositor fallback for single-window or browser mode), while `pillWindow` (`setContentProtection(true)`) provides live timer, mic, camera, pause, and finish controls. Completed recordings are persisted to disk (`userData/videos/`) or IndexedDB and edited in `VideoGuideStudio`.

**Tech Stack:** Electron 44, React 18, TypeScript 5.7, Zustand 5, WebRTC / MediaRecorder / Web Audio API, IndexedDB, Tailwind CSS, Lucide React.

**Spec:** `docs/superpowers/specs/2026-11-05-video-guide-recording-design.md`

## Global Constraints

- **100% Offline Privacy:** All video/audio streams, mixing, and file persistence happen locally on the user's machine.
- **Zero Emojis & Lucide Icons Only:** Do not use Unicode emojis anywhere in the UI or exported HTML; use semantic Lucide icons (`Video`, `Mic`, `MicOff`, `Volume2`, `VolumeX`, `Camera`, `CameraOff`, `Scissors`, `Clock`, `Play`, `Pause`, `Download`).
- **Light & Dark Mode Support:** All new modals, pills, and the Video Studio must support both light and dark themes with explicit high-contrast typography.
- **Disk-Backed Storage with Browser Fallback:** Never store raw video blobs in `localStorage`. Save `.webm` files to `userData/videos/` in Electron (stored as `file:///` in `Project.videoPath`) and IndexedDB (`scrcd_videos_db`) in browser mode (stored as `idb://video_<projectId>`).
- **Classic Dotted-Leader TOC in Exported HTML:** Any chapter index in exported HTML Video Guides must use the classic publication dotted leader layout (`border-b border-dotted` + right-aligned `tabular-nums` timestamps).

## Review Focus

1. **System audio unavailable on specific window capture or permission denied:** When `recordSystemAudio: true` fails in `getUserMedia` (e.g., Windows loopback not supported on an individual HWND or denied in browser), the recorder must automatically fall back to capturing the video stream without throwing an unhandled error so recording still succeeds.
2. **Invalid or inverted trim bounds (`videoTrimStart >= videoTrimEnd` or negative values):** `clampVideoTrim(start, end, duration)` must enforce `0 <= trimStart < trimEnd <= duration` with at least a `0.5s` minimum clip window.
3. **Unsorted or out-of-range video chapters:** Adding or updating a `VideoChapter` must clamp `timestamp` to `[0, duration]` and keep `videoChapters` sorted ascending by `timestamp`.
4. **Live microphone mute while recording with system audio active:** Calling `setMicMuted(true)` during recording must set `micGainNode.gain.value = 0` while leaving `systemGainNode.gain.value = 1` and keeping the `MediaRecorder` audio track active.
5. **Project deletion cleanup:** Deleting a video project via `api.deleteProject(id)` must also delete the underlying video file on disk (`delete-video-file` IPC) or IndexedDB entry (`deleteVideoBlob`) so orphaned video files do not accumulate.

---

### Task 1: Video Guide Data Model, Storage Helpers & Chapter/Trim Utilities

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/services/videoStorage.ts`
- Modify: `src/services/api.ts`
- Modify: `src/store/useStore.ts`
- Create: `tests/videoGuideTest.js`
- Modify: `package.json`

**Interfaces:**
- Produces in `src/types/index.ts`:
  - `export type GuideType = 'steps' | 'video';`
  - `export interface VideoChapter { id: string; timestamp: number; title: string; description?: string; }`
  - `export interface VideoSourceItem { id: string; name: string; displayId?: string; thumbnailDataUrl?: string; type: 'screen' | 'window'; }`
  - `Project` fields: `guideType?: GuideType; videoPath?: string; videoDuration?: number; videoTrimStart?: number; videoTrimEnd?: number; videoChapters?: VideoChapter[]; videoThumbnailUrl?: string; recordedMic?: boolean; recordedSystemAudio?: boolean; recordedWebcam?: boolean;`
  - `CaptureConfig` fields: `recordingMode?: 'steps' | 'video'; recordMic?: boolean; micDeviceId?: string; recordSystemAudio?: boolean; recordWebcam?: boolean; webcamDeviceId?: string; windowSourceId?: string;`
- Produces in `src/services/videoStorage.ts`:
  - `clampVideoTrim(trimStart: number, trimEnd: number, duration: number): { trimStart: number; trimEnd: number }`
  - `normalizeVideoChapters(chapters: VideoChapter[], duration?: number): VideoChapter[]`
  - `formatVideoTimestamp(seconds: number): string` (returns `MM:SS` or `HH:MM:SS`)
  - `saveVideoToStorage(projectId: string, blob: Blob): Promise<string>` (uses Electron `save-video-file` IPC returning `file:///...` or IndexedDB `scrcd_videos_db` returning `idb://video_${projectId}`)
  - `resolveVideoUrl(videoPath?: string): Promise<string | null>` (resolves `idb://...` to object URL or returns `file:///...` / `blob:...` / `data:...` directly)
  - `deleteVideoFromStorage(projectId: string, videoPath?: string): Promise<void>`
- Produces in `src/services/api.ts`:
  - `getVideoSources(): Promise<VideoSourceItem[]>`
  - `exportVideoFile(sourcePathOrUrl: string, defaultFilename: string): Promise<{ success: boolean; filePath?: string; canceled?: boolean }>`

- [ ] **Step 1: Write the failing test in `tests/videoGuideTest.js` and register in `package.json`**

Create `tests/videoGuideTest.js` testing `clampVideoTrim`, `normalizeVideoChapters`, `formatVideoTimestamp`, and video project schema defaults:
```javascript
import assert from 'assert';
import {
  clampVideoTrim,
  normalizeVideoChapters,
  formatVideoTimestamp,
} from '../src/services/videoStorage.js';

console.log('Starting Video Guide Verification Tests...\n');

// 1. Trim clamping (Review Focus #2)
{
  const res1 = clampVideoTrim(-5, 120, 60);
  assert.strictEqual(res1.trimStart, 0);
  assert.strictEqual(res1.trimEnd, 60);

  const res2 = clampVideoTrim(45, 20, 60);
  assert(res2.trimStart < res2.trimEnd, 'Inverted trim bounds must be corrected');
  assert(res2.trimEnd - res2.trimStart >= 0.5, 'Minimum 0.5s window enforced');
  console.log('[Trim Clamping] Passed');
}

// 2. Chapter sorting & clamping (Review Focus #3)
{
  const chapters = [
    { id: 'c2', timestamp: 95, title: 'Outro' },
    { id: 'c1', timestamp: -4, title: 'Intro' },
    { id: 'c3', timestamp: 15.4, title: 'Setup' },
  ];
  const norm = normalizeVideoChapters(chapters, 60);
  assert.strictEqual(norm[0].id, 'c1');
  assert.strictEqual(norm[0].timestamp, 0);
  assert.strictEqual(norm[1].id, 'c3');
  assert.strictEqual(norm[2].id, 'c2');
  assert.strictEqual(norm[2].timestamp, 60);
  console.log('[Chapter Normalization] Passed');
}

// 3. Timestamp formatting
{
  assert.strictEqual(formatVideoTimestamp(0), '00:00');
  assert.strictEqual(formatVideoTimestamp(65.8), '01:05');
  assert.strictEqual(formatVideoTimestamp(3661), '01:01:01');
  console.log('[Timestamp Formatting] Passed');
}
```
Note: Since `src/` uses `.ts`, structure `tests/videoGuideTest.js` to follow the exact pattern in `tests/canvasAndMergeTest.js` and `tests/exportTest.js` (testing the pure logic & verifying file exports/schemas directly in Node ESM).

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/videoGuideTest.js`
Expected: FAIL

- [ ] **Step 3: Implement types in `src/types/index.ts`, storage/utilities in `src/services/videoStorage.ts`, API methods in `src/services/api.ts`, and Zustand actions in `src/store/useStore.ts`**

In `src/store/useStore.ts`, add:
- `updateVideoTrim: (trimStart: number, trimEnd: number) => Promise<void>`
- `addVideoChapter: (timestamp: number, title: string, description?: string) => Promise<void>`
- `updateVideoChapter: (chapter: VideoChapter) => Promise<void>`
- `deleteVideoChapter: (chapterId: string) => Promise<void>`
- Update `api.deleteProject(id)` in `src/services/api.ts` to call `deleteVideoFromStorage(id, project?.videoPath)` (Review Focus #5).

- [ ] **Step 4: Run tests and TypeScript check**

Run: `npm test` and `npx tsc --noEmit`
Expected: PASS with zero TypeScript errors.

- [ ] **Step 5: Commit**

```powershell
git add src/types/index.ts src/services/videoStorage.ts src/services/api.ts src/store/useStore.ts tests/videoGuideTest.js package.json; git commit -m "feat: add video guide data model, disk/IndexedDB storage, and trim/chapter utilities"
```

---

### Task 2: Electron Main Process Video IPC, Desktop Sources & Floating Webcam Window (`#webcam`)

**Files:**
- Modify: `electron/main.cjs`
- Create: `src/components/recorder/WebcamBubble.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `CaptureConfig`, `VideoSourceItem` from `src/types/index.ts`
- Produces in `electron/main.cjs`:
  - IPC handler `get-video-sources`: returns `VideoSourceItem[]` from `desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 320, height: 180 } })`
  - IPC handler `save-video-file`: accepts `{ projectId: string, buffer: ArrayBuffer | Uint8Array }`, writes to `path.join(app.getPath('userData'), 'videos', `video_${projectId}_${Date.now()}.webm`)`, returns `{ success: true, videoPath: 'file:///...' }`
  - IPC handler `delete-video-file`: accepts `{ videoPath: string }`, unlinks file if inside `userData/videos`
  - IPC handler `export-video-file`: accepts `{ sourcePath: string, defaultFilename: string }`, opens `dialog.showSaveDialog` with `.webm` filter and copies file
  - IPC handlers `video-toggle-mic` and `video-toggle-webcam`: relays toggle state between `pillWindow`, `mainWindow`, and `webcamWindow`
  - `createWebcamWindow(deviceId?: string)`: creates `164×164` frameless transparent `BrowserWindow` at bottom-left of primary display with `alwaysOnTop: true`, `skipTaskbar: true`, `setContentProtection(false)`, loading `#webcam`
  - Updates `start-recording`, `pause-recording`, `finish-recording`, `cancel-recording` in `electron/main.cjs`: when `currentCaptureConfig.recordingMode === 'video'`, skips `startGlobalHook()` (no click screenshots), sets `mainWindow.webContents.setBackgroundThrottling(false)`, opens `pillWindow` in video mode (`pill-recording-mode`, `'video'`), opens `webcamWindow` if `recordWebcam` is true, and notifies `mainWindow` via `video-session-command` (`start` / `pause` / `finish` / `cancel`).
- Produces in `src/components/recorder/WebcamBubble.tsx`:
  - `export const WebcamBubble: React.FC<{ isStandalone?: boolean; deviceId?: string }>`

- [ ] **Step 1: Add Electron IPC handlers and `webcamWindow` lifecycle in `electron/main.cjs`**

Implement `createWebcamWindow`, `get-video-sources`, `save-video-file`, `delete-video-file`, `export-video-file`, `video-toggle-mic`, `video-toggle-webcam`, and branch `start-recording` / `pause-recording` / `finish-recording` / `cancel-recording` when `currentCaptureConfig.recordingMode === 'video'`. Ensure `stopRecordingSession()` closes `webcamWindow` and restores `mainWindow.webContents.setBackgroundThrottling(true)`.

- [ ] **Step 2: Create `src/components/recorder/WebcamBubble.tsx` and wire `#webcam` hash route in `src/App.tsx`**

In `WebcamBubble.tsx`:
- Requests `navigator.mediaDevices.getUserMedia({ video: { deviceId: deviceId ? { exact: deviceId } : undefined, width: 320, height: 320 } })` and renders a mirrored circular `<video autoPlay playsInline muted>` inside a draggable circular frame with an accent ring.
- Cleans up media tracks on unmount.
In `src/App.tsx`:
- Detect `const isWebcamMode = window.location.hash.startsWith('#webcam');` and render `<WebcamBubble isStandalone={true} />` on a transparent background just like `isPillMode`.

- [ ] **Step 3: Verify build & syntax**

Run: `node -c electron/main.cjs` and `npx tsc --noEmit`
Expected: PASS with zero syntax or type errors.

- [ ] **Step 4: Commit**

```powershell
git add electron/main.cjs src/components/recorder/WebcamBubble.tsx src/App.tsx; git commit -m "feat: add Electron video IPC handlers and floating webcam bubble window"
```

---

### Task 3: WebRTC & Web Audio Mixer Recording Engine (`videoRecorder.ts`)

**Files:**
- Create: `src/services/videoRecorder.ts`
- Modify: `src/App.tsx`
- Modify: `tests/videoGuideTest.js`

**Interfaces:**
- Consumes: `CaptureConfig` from `src/types/index.ts`, `saveVideoToStorage` from `src/services/videoStorage.ts`
- Produces in `src/services/videoRecorder.ts`:
  - `export interface VideoRecordingResult { videoPath: string; duration: number; thumbnailUrl: string; recordedMic: boolean; recordedSystemAudio: boolean; recordedWebcam: boolean; }`
  - `export function createAudioMixerGainState(recordMic: boolean, recordSystemAudio: boolean): { micMuted: boolean; micGain: number; systemGain: number; setMicMuted: (muted: boolean) => number }`
  - `export class VideoRecorderEngine`:
    - `start(projectId: string, config: CaptureConfig): Promise<void>`
    - `pause(): void`
    - `resume(): void`
    - `setMicMuted(muted: boolean): boolean`
    - `setWebcamEnabled(enabled: boolean): boolean`
    - `stop(): Promise<VideoRecordingResult | null>`
    - `cancel(): void`
  - `export const videoRecorder: VideoRecorderEngine`

- [ ] **Step 1: Add audio mixer & fallback tests to `tests/videoGuideTest.js`**

Add test cases for `createAudioMixerGainState` (Review Focus #1 & #4): verifying that muting the microphone sets `micGain` to `0` while keeping `systemGain` at `1`, and unmuting restores `micGain` to `1`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/videoGuideTest.js`
Expected: FAIL

- [ ] **Step 3: Implement `src/services/videoRecorder.ts` and connect session listeners in `src/App.tsx`**

In `src/services/videoRecorder.ts`:
- **Screen + System Audio stream:**
  - In Electron: find matching `chromeMediaSourceId` from `api.getVideoSources()` (using `config.windowSourceId` when `config.scope === 'window'`, or matching display `id` / primary screen). Request `getUserMedia` with `video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId, maxWidth: 1920, maxHeight: 1080, maxFrameRate: 30 } }` and if `config.recordSystemAudio` is true, `audio: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId } }`. Wrap in `try/catch` so if desktop audio fails on a window source, it retries video-only desktop capture + screen-level audio or video-only (Review Focus #1).
  - In Browser: call `navigator.mediaDevices.getDisplayMedia({ video: true, audio: Boolean(config.recordSystemAudio) })`, falling back to a synthetic animated canvas stream if `getDisplayMedia` is unavailable/rejected in headless environments.
- **Microphone stream & Web Audio API Mixer:**
  - If `config.recordMic` is true, call `navigator.mediaDevices.getUserMedia({ audio: { deviceId: config.micDeviceId ? { exact: config.micDeviceId } : undefined, echoCancellation: true, noiseSuppression: true } })`.
  - Create `AudioContext` and `MediaStreamAudioDestinationNode`. Connect system audio track (if present) via `systemGainNode` (`gain = 1`) and mic audio track (if present) via `micGainNode` (`gain = 1`) into the destination node.
- **Window / Browser Webcam Compositor:**
  - When `config.recordWebcam` is true and (`config.scope === 'window'` or `!isElectron()`), composite the screen video and circular webcam feed onto an offscreen `<canvas>` at 30fps (`setInterval` 33ms) and use `canvas.captureStream(30)` as the video track.
- **Poster Thumbnail & MediaRecorder:**
  - Capture a `640×360` JPEG data URL poster thumbnail from the video stream 600ms after start (or on stop if shorter).
  - Record combined video track + mixed audio track using `MediaRecorder` (`video/webm;codecs=vp9,opus` with fallback to `video/webm`), collecting chunks every `500ms`.
  - On `stop()`, assemble `Blob`, compute elapsed active duration in seconds, call `saveVideoToStorage(projectId, blob)`, stop all media tracks and close `AudioContext`, and return `VideoRecordingResult`.
In `src/App.tsx`:
- Subscribe to Electron IPC `video-session-command` (`pause`, `finish`, `cancel`), `video-mic-state`, and `video-webcam-state` to drive `videoRecorder` and update the active [`Project`](file:///c:/Users/PTRE/Documents/scrcd/src/types/index.ts#L25-L39) (`guideType: 'video'`, `videoPath`, `videoDuration`, `videoTrimStart: 0`, `videoTrimEnd: duration`, `videoThumbnailUrl`) before navigating to `currentView: 'editor'`.

- [ ] **Step 4: Run tests and TypeScript check**

Run: `npm test` and `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/services/videoRecorder.ts src/App.tsx tests/videoGuideTest.js; git commit -m "feat: implement WebRTC screen, system audio, and microphone Web Audio mixer engine"
```

---

### Task 4: Capture Setup Modal (Step vs Video Mode, Audio/Camera Pickers) & Floating Pill Video Controls

**Files:**
- Modify: `src/components/recorder/CaptureSetupModal.tsx`
- Modify: `src/components/recorder/FloatingPill.tsx`

**Interfaces:**
- Consumes: `CaptureConfig`, `VideoSourceItem` from `src/types/index.ts`, `api.getVideoSources()` from `src/services/api.ts`, `videoRecorder` from `src/services/videoRecorder.ts`
- Updates `CaptureSetupModalProps.onStart(config: CaptureConfig)` to pass `recordingMode: 'steps' | 'video'` and audio/webcam settings.

- [ ] **Step 1: Update `src/components/recorder/CaptureSetupModal.tsx` with Step-by-Step vs Video Guide mode selector and audio/webcam configuration**

In `CaptureSetupModal.tsx`:
- Add top mode toggle tabs:
  - **Step-by-Step Guide** (`Layers` icon): existing click-capture scopes and hotspot style selector.
  - **Video Guide (Loom Mode)** (`Video` icon):
    - Capture Scope: **Full Screen** (with monitor selector) or **Application Window** (with window selector populated from `api.getVideoSources()`).
    - **Microphone Narration** (`Mic` / `MicOff` icon): toggle switch + audio input device `<select>` populated via `navigator.mediaDevices.enumerateDevices()` + live input level meter bar.
    - **System Audio** (`Volume2` / `VolumeX` icon): toggle switch ("Capture desktop & application sound").
    - **Floating Webcam Bubble** (`Camera` / `CameraOff` icon): toggle switch + video input device `<select>` + live circular mini preview when enabled.
- When `recordingMode === 'video'`, clicking **Start Video Recording** passes the full `CaptureConfig` (`recordingMode: 'video'`, `recordMic`, `micDeviceId`, `recordSystemAudio`, `recordWebcam`, `webcamDeviceId`, `windowSourceId`) to `onStart`.

- [ ] **Step 2: Update `src/components/recorder/FloatingPill.tsx` to support Video Recording Mode controls**

In `FloatingPill.tsx`:
- Listen for `pill-recording-mode` (`'steps' | 'video'`), `pill-mic-state`, and `pill-webcam-state` over Electron IPC (and read from `useStore` in browser mode).
- When in `'video'` mode:
  - Replace the `{stepCount} Steps` badge and `Full / Cursor` toggle with:
    - Live elapsed timer (`formatVideoTimestamp(elapsedSeconds)`) with pulsing red dot (amber when paused).
    - **Mic Mute/Unmute** button (`Mic` / `MicOff` icon) invoking `video-toggle-mic`.
    - **Webcam Bubble Show/Hide** button (`Camera` / `CameraOff` icon) invoking `video-toggle-webcam`.
    - **Pause / Resume**, **Finish**, and **Cancel** buttons.
- In browser fallback mode (`!isStandalone`), render `<WebcamBubble isStandalone={false} />` when `isRecording && recordingMode === 'video' && webcamEnabled`.

- [ ] **Step 3: Verify TypeScript compilation and Vite bundle build**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```powershell
git add src/components/recorder/CaptureSetupModal.tsx src/components/recorder/FloatingPill.tsx; git commit -m "feat: add Loom video mode to CaptureSetupModal and live audio/webcam controls to FloatingPill"
```

---

### Task 5: Video Guide Studio (`VideoGuideStudio.tsx`), Dashboard Video Badges & Video Exporters

**Files:**
- Create: `src/components/editor/VideoGuideStudio.tsx`
- Create: `src/services/exporters/exportVideoHtml.ts`
- Modify: `src/components/editor/EditorView.tsx`
- Modify: `src/components/dashboard/ProjectDashboard.tsx`
- Modify: `src/components/export/ExportModal.tsx`
- Modify: `tests/videoGuideTest.js`

**Interfaces:**
- Consumes: `Project`, `VideoChapter`, `BrandingProfile` from `src/types/index.ts`, `resolveVideoUrl`, `clampVideoTrim`, `formatVideoTimestamp` from `src/services/videoStorage.ts`
- Produces in `src/services/exporters/exportVideoHtml.ts`:
  - `export function generateVideoGuideHtml(project: Project, branding: BrandingProfile, videoDataUrl?: string): string`
- Produces in `src/components/editor/VideoGuideStudio.tsx`:
  - `export const VideoGuideStudio: React.FC`

- [ ] **Step 1: Add HTML Video Guide export tests to `tests/videoGuideTest.js`**

Add tests in `tests/videoGuideTest.js` verifying `generateVideoGuideHtml`:
- Includes project title, author, company, formatted duration, and classic dotted-leader Table of Contents (`toc-leader`, `toc-num`) for `videoChapters`.
- Contains zero Unicode emojis (verifying the SCRCD UI & export invariant).
- Respects `videoTrimStart` and `videoTrimEnd` attributes in the embedded player script.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/videoGuideTest.js`
Expected: FAIL

- [ ] **Step 3: Implement `src/services/exporters/exportVideoHtml.ts` and `src/components/editor/VideoGuideStudio.tsx`**

In `src/services/exporters/exportVideoHtml.ts`:
- Generate a self-contained, responsive HTML document (supporting light & dark mode toggle) with header metadata, classic dotted-leader Chapters TOC (clicking a row seeks the `<video>` element to `chapter.timestamp`), embedded HTML5 `<video controls>` enforcing `videoTrimStart` / `videoTrimEnd`, and rich guide notes (`project.description`).
In `src/components/editor/VideoGuideStudio.tsx`:
- **Left Resizable/Collapsible Sidebar (Chapters & Timestamps):**
  - Button to **Add Chapter at Current Time** (`Plus` + `Clock` icon), listing all `project.videoChapters` sorted by timestamp.
  - Clicking a chapter seeks the video player; inline inputs allow editing chapter title and timestamp or deleting a chapter.
- **Center Video Stage:**
  - Resolves `project.videoPath` via `resolveVideoUrl`.
  - HTML5 `<video>` player with custom transport bar: Play/Pause, current timestamp / trimmed duration, playback rate selector (`1x`, `1.25x`, `1.5x`, `2x`), audio mute/volume, and **Trim Range Bar** (`videoTrimStart` and `videoTrimEnd` range inputs with `Scissors` icon and reset button).
- **Right Resizable/Collapsible Inspector (Video Guide Notes & Details):**
  - Editable Guide Title, Audio/Webcam badges (`Mic`, `Volume2`, `Camera`), Guide Summary & Notes (`WysiwygEditor` bound to `project.description`), and quick **Download Video (.webm)** button (`api.exportVideoFile`).

- [ ] **Step 4: Wire `VideoGuideStudio` into `EditorView.tsx`, add Video Guide badges to `ProjectDashboard.tsx`, and add Video Guide export options to `ExportModal.tsx`**

- In `src/components/editor/EditorView.tsx`: if `activeProject?.guideType === 'video'`, render `<VideoGuideStudio />`.
- In `src/components/dashboard/ProjectDashboard.tsx`: display a `Video Guide` badge (`Video` Lucide icon) and formatted duration (`formatVideoTimestamp(project.videoDuration)`) on video project cards, using `project.videoThumbnailUrl` as the card preview image.
- In `src/components/export/ExportModal.tsx`: when `activeProject.guideType === 'video'`, highlight **WebM Video File (`.webm`)**, **Interactive HTML Video Guide (`.html`)**, and **Project JSON Backup (`.json`)**, and execute `api.exportVideoFile` or `generateVideoGuideHtml` accordingly.

- [ ] **Step 5: Run full test suite and production build verification**

Run: `npm test` and `npm run build`
Expected: All test suites PASS and `tsc && vite build` succeeds cleanly.

- [ ] **Step 6: Commit**

```powershell
git add src/components/editor/VideoGuideStudio.tsx src/services/exporters/exportVideoHtml.ts src/components/editor/EditorView.tsx src/components/dashboard/ProjectDashboard.tsx src/components/export/ExportModal.tsx tests/videoGuideTest.js; git commit -m "feat: add VideoGuideStudio player, trimmer, chapters, dashboard badges, and HTML/WebM exporters"
```
