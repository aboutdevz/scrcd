# Loom-Style Screen & Audio Video Guide Recording — Design Spec

## 1. Intent & Why
SCRCD currently captures step-by-step screenshot guides on mouse clicks and keystrokes. Users also want to record continuous, narrated **Video Guides** (like Loom) that capture the screen, microphone voiceover, desktop system audio, and an optional draggable circular webcam bubble—saved as a standalone Video Guide mode alongside their written SOP projects.

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- **Separate Video-Only Recording Mode:** Users can choose between **Step-by-Step Guide** (click-based screenshots) and **Video Guide (Loom Mode)** inside [`CaptureSetupModal`](file:///c:/Users/PTRE/Documents/scrcd/src/components/recorder/CaptureSetupModal.tsx).
- **Microphone + System Audio Mixing:** Record microphone voice narration and system desktop loopback audio simultaneously, mixed via a Web Audio API `AudioContext` with independent `GainNode`s so users can mute/unmute the microphone live during recording without breaking the audio track or interrupting system sound.
- **Draggable Circular Webcam Bubble:** Provide a circular, draggable always-on-top webcam overlay (`webcamWindow` in Electron; floating circular overlay/canvas composite in browser/window mode) that is recorded into the video stream.
- **Live Recording Controls ([`FloatingPill`](file:///c:/Users/PTRE/Documents/scrcd/src/components/recorder/FloatingPill.tsx)):** In Video Guide mode, [`FloatingPill`](file:///c:/Users/PTRE/Documents/scrcd/src/components/recorder/FloatingPill.tsx) displays a live elapsed timer (`MM:SS`), recording state dot, live microphone mute/unmute toggle, webcam bubble show/hide toggle, pause/resume, finish, and cancel.
- **Video Guide Studio ([`VideoGuideStudio`](file:///c:/Users/PTRE/Documents/scrcd/src/components/editor/VideoGuideStudio.tsx)):** When a Video Guide recording finishes, it creates/updates a project with `guideType: 'video'` in [`ProjectDashboard`](file:///c:/Users/PTRE/Documents/scrcd/src/components/dashboard/ProjectDashboard.tsx) and opens [`VideoGuideStudio`](file:///c:/Users/PTRE/Documents/scrcd/src/components/editor/VideoGuideStudio.tsx) inside [`EditorView`](file:///c:/Users/PTRE/Documents/scrcd/src/components/editor/EditorView.tsx) with:
  - HTML5 Video Player with playback speed controls (`1x`, `1.25x`, `1.5x`, `2x`), custom timeline scrubber, and non-destructive start/end trim handles (`trimStart`, `trimEnd`).
  - Timestamped Chapters / Guide Notes sidebar + rich summary editor so viewers can jump to key moments in the video.
  - Direct Video Export (`.webm` download / save via Electron or browser, and self-contained Interactive HTML Video Guide export with embedded chapters and player).

### Non-Goals
- Multi-track non-linear video editing (color grading, transitions, multi-clip splicing).
- Cloud hosting or external telemetry (must strictly preserve SCRCD's 100% offline privacy invariant).
- Simultaneous step-screenshot capture during video-only recording (kept strictly separate as requested).

### Anti-Goals
- Storing multi-megabyte raw video blobs inside `localStorage` JSON strings (which would immediately throw `QuotaExceededError`).
- Using Unicode emojis in any UI controls, badges, or exported HTML (must strictly use Lucide icons per SCRCD guidelines).
- Calling `backgroundThrottling: true` on the active video recording renderer or letting `pillWindow` appear inside the recorded video.

## 3. Constraints & Project Invariants
- **100% Offline Privacy:** All video/audio streams, mixing, and file persistence happen locally on the user's machine.
- **Zero Emojis & Lucide Icons Only:** Use semantic Lucide icons (`Video`, `Mic`, `MicOff`, `Volume2`, `VolumeX`, `Camera`, `CameraOff`, `Scissors`, `Clock`, `Play`, `Pause`, `Download`).
- **Light & Dark Mode Support:** All new modals, pills, and the Video Studio must support both light and dark themes with explicit high-contrast typography.
- **Disk-Backed Storage with Browser Fallback:**
  - In Electron: Save recorded `.webm` files to `path.join(app.getPath('userData'), 'videos', `video_${projectId}_${timestamp}.webm`)` via IPC (`save-video-file`, `delete-video-file`) and return a `file:///` URI stored on `Project.videoPath`.
  - In Browser/Dev mode: Store video `Blob`s in an IndexedDB store (`scrcd_videos_db`) and resolve to an object URL (`URL.createObjectURL`) or simulated sample video stream when `getDisplayMedia` is unavailable/declined in automated tests.

## 4. Approaches Considered

### Approach 1: Hardware Screen Stream + OS Webcam Overlay Window + Web Audio Mixer (Selected)
- **Screen & Webcam:**
  - In Electron, [`electron/main.cjs`](file:///c:/Users/PTRE/Documents/scrcd/electron/main.cjs) spawns a frameless, transparent, always-on-top circular `webcamWindow` (`160×160` px, `resizable: false`, `skipTaskbar: true`, `setContentProtection(false)`). Because `setContentProtection` is `false` on `webcamWindow` (unlike `pillWindow` where `setContentProtection(true)` hides the control bar), `desktopCapturer` records the screen hardware stream with the draggable webcam bubble naturally visible wherever the user drags it on their desktop.
  - When recording a single application window (`scope === 'window'`) or in browser fallback mode, an offscreen `<canvas>` composites the window stream + circular webcam video stream in the bottom-left/bottom-right corner at 30fps (`backgroundThrottling` disabled during recording) so the camera bubble is still included in the recorded video.
- **Audio Pipeline:**
  - System Audio: Captured via `navigator.mediaDevices.getUserMedia` with Electron's `chromeMediaSource: 'desktop'` (or `getDisplayMedia({ video: true, audio: true })` in browser).
  - Microphone Audio: Captured via `navigator.mediaDevices.getUserMedia({ audio: { deviceId, echoCancellation: true, noiseSuppression: true } })`.
  - Mixing: Both streams connect into a Web Audio `AudioContext` → `MediaStreamAudioSourceNode` → `GainNode` → `MediaStreamAudioDestinationNode`. Toggling mic mute in [`FloatingPill`](file:///c:/Users/PTRE/Documents/scrcd/src/components/recorder/FloatingPill.tsx) adjusts `micGainNode.gain.value` (`0` or `1`) via IPC (`video-toggle-mic`) without stopping the `MediaRecorder`.
- **Why chosen:** Hardware-accelerated video encoding for full-screen recordings, zero frame drops, and true Loom-style drag-anywhere webcam bubble on the desktop.

### Approach 2: Pure Offscreen Canvas Compositor for All Modes (Rejected)
- Draws both the display stream and webcam stream onto a 2D `<canvas>` on every frame in all modes. Rejected because redrawing 1080p/4K frames in a minimized renderer consumes far more CPU than direct `MediaStream` capture and risks timer throttling.

## 5. Detailed Architecture & Data Model

### 5.1 Data Model Changes ([`src/types/index.ts`](file:///c:/Users/PTRE/Documents/scrcd/src/types/index.ts))
- **`GuideType`:** `'steps' | 'video'` (defaults to `'steps'` for backward compatibility).
- **`VideoChapter`:**
  ```ts
  export interface VideoChapter {
    id: string;
    timestamp: number; // seconds from start
    title: string;
    description?: string;
  }
  ```
- **`Project` interface additions:**
  ```ts
  guideType?: 'steps' | 'video';
  videoPath?: string;          // file:/// path in Electron or idb:// / blob: URL in browser
  videoDuration?: number;      // total duration in seconds
  videoTrimStart?: number;     // non-destructive trim start in seconds (default 0)
  videoTrimEnd?: number;       // non-destructive trim end in seconds (default videoDuration)
  videoChapters?: VideoChapter[];
  videoThumbnailUrl?: string;  // poster frame data URL
  ```
- **`CaptureConfig` interface additions:**
  ```ts
  recordingMode?: 'steps' | 'video';
  recordMic?: boolean;
  micDeviceId?: string;
  recordSystemAudio?: boolean;
  recordWebcam?: boolean;
  webcamDeviceId?: string;
  windowSourceId?: string; // specific window source ID from desktopCapturer when scope === 'window' in video mode
  ```

### 5.2 Electron Main Process & IPC ([`electron/main.cjs`](file:///c:/Users/PTRE/Documents/scrcd/electron/main.cjs))
1. **Desktop Capturer Sources (`get-video-sources`):**
   - Calls `desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 320, height: 180 } })` and maps each screen/window with its `id`, `name`, `display_id`, and base64 thumbnail so the renderer can acquire the exact `chromeMediaSourceId` for video + desktop loopback audio.
2. **Floating Webcam Bubble Window (`webcamWindow`):**
   - Created when `config.recordingMode === 'video' && config.recordWebcam` is true.
   - Positioned in the bottom-left of the primary work area (`x: 32, y: height - 196, width: 164, height: 164`), frameless, transparent, `alwaysOnTop: true` (`'screen-saver'` level), `setContentProtection(false)` so it is captured in screen recordings.
   - Loads `#webcam` hash route (`WebcamBubble` component) which renders the circular camera stream with a clean border ring and drag region (`-webkit-app-region: drag`).
3. **Floating Pill Enhancements (`pillWindow`):**
   - In video mode (`recordingMode === 'video'`), `pillWindow` receives `pill-recording-mode` (`'video' | 'steps'`) and initial state (`micEnabled`, `webcamEnabled`).
   - IPC channels between `pillWindow`, `mainWindow`, and `webcamWindow`:
     - `video-toggle-mic`: Toggles mic mute state, notifies `mainWindow` recorder engine and updates `pillWindow` icon.
     - `video-toggle-webcam`: Shows/hides `webcamWindow`, notifies `mainWindow` recorder engine, and updates `pillWindow` icon.
     - `save-video-file`: Writes the recorded `ArrayBuffer` / `Uint8Array` to `userData/videos/video_${projectId}_${Date.now()}.webm` and returns `{ success: true, videoPath: 'file:///...' }`.
     - `export-video-file`: Opens native `dialog.showSaveDialog` to save/copy the `.webm` video guide to the user's chosen path.
   - While video recording is active, `mainWindow.webContents.setBackgroundThrottling(false)` is enabled so `MediaRecorder` and `AudioContext` never stall while `mainWindow` is minimized, then restored to `true` when recording ends.

### 5.3 Renderer Video Recording Service ([`src/services/videoRecorder.ts`](file:///c:/Users/PTRE/Documents/scrcd/src/services/videoRecorder.ts))
- Manages the active `MediaRecorder`, `AudioContext`, screen `MediaStream`, mic `MediaStream`, optional webcam `MediaStream` (for window/browser canvas compositing), and chunk buffer:
  - **Screen + System Audio Acquisition:**
    - In Electron: Uses `navigator.mediaDevices.getUserMedia` with `mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId }`. If `recordSystemAudio` is true, requests `audio: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId } }`; if audio capture fails on a specific window source, automatically falls back to screen-level audio or video-only desktop capture so recording never fails.
    - In Browser: Uses `navigator.mediaDevices.getDisplayMedia({ video: true, audio: recordSystemAudio })`, with a clean synthetic canvas stream fallback for headless/simulated environments.
  - **Microphone Acquisition & Mixing:**
    - If `recordMic` is enabled, acquires `getUserMedia({ audio: { deviceId: micDeviceId ? { exact: micDeviceId } : undefined, echoCancellation: true, noiseSuppression: true } })`.
    - Connects available audio tracks (system audio + mic audio) into `AudioContext` via `GainNode`s to a single `MediaStreamAudioDestinationNode`.
  - **Poster Thumbnail Extraction:**
    - Captures a 16:9 poster frame (`videoThumbnailUrl`) from the video stream during recording so the project card in [`ProjectDashboard`](file:///c:/Users/PTRE/Documents/scrcd/src/components/dashboard/ProjectDashboard.tsx) shows a preview thumbnail.
  - **Stop & Persist:**
    - On finish, assembles the `Blob` (`video/webm;codecs=vp9,opus` or `video/webm`), computes duration, persists to disk via Electron IPC (or IndexedDB in browser), and returns `{ videoPath, duration, thumbnailUrl }`.

### 5.4 UI Components
1. **[`CaptureSetupModal.tsx`](file:///c:/Users/PTRE/Documents/scrcd/src/components/recorder/CaptureSetupModal.tsx):**
   - Adds a top segmented mode switcher: **Step-by-Step Guide** vs **Video Guide (Loom Mode)**.
   - When **Video Guide** is selected:
     - **Capture Source:** Full Screen (with monitor selector) or Application Window (with window picker from `get-video-sources`).
     - **Audio & Camera Controls:**
       - **Microphone:** Toggle switch + device dropdown (`navigator.mediaDevices.enumerateDevices()`) + live input level bar.
       - **System Audio:** Toggle switch ("Record desktop & application sound").
       - **Webcam Bubble:** Toggle switch + camera device dropdown + circular live camera preview.
2. **[`FloatingPill.tsx`](file:///c:/Users/PTRE/Documents/scrcd/src/components/recorder/FloatingPill.tsx) & [`WebcamBubble.tsx`](file:///c:/Users/PTRE/Documents/scrcd/src/components/recorder/WebcamBubble.tsx):**
   - When `recordingMode === 'video'`, [`FloatingPill`](file:///c:/Users/PTRE/Documents/scrcd/src/components/recorder/FloatingPill.tsx) renders:
     - Pulsing red recording indicator + live `MM:SS` timer (pauses when recording is paused).
     - Mic Mute/Unmute button (`Mic` / `MicOff`).
     - Webcam Bubble Toggle button (`Camera` / `CameraOff`).
     - Pause/Resume, Finish, and Cancel buttons.
   - [`WebcamBubble.tsx`](file:///c:/Users/PTRE/Documents/scrcd/src/components/recorder/WebcamBubble.tsx) renders the `#webcam` window route in Electron (and floating draggable bubble in browser mode) with a circular video feed, subtle ring border, and size toggle (`S` / `M` / `L`).
3. **[`VideoGuideStudio.tsx`](file:///c:/Users/PTRE/Documents/scrcd/src/components/editor/VideoGuideStudio.tsx):**
   - Rendered by [`EditorView.tsx`](file:///c:/Users/PTRE/Documents/scrcd/src/components/editor/EditorView.tsx) when `activeProject.guideType === 'video'`.
   - **Left Sidebar:** Timestamped Chapters list ("Add Chapter at Current Time", click chapter to seek video, edit chapter title/timestamp, delete chapter).
   - **Center Stage:** Video Player with play/pause, current time / duration, playback speed selector (`1x`, `1.25x`, `1.5x`, `2x`), volume/mute, fullscreen, and non-destructive Start/End Trim sliders (`videoTrimStart`, `videoTrimEnd`) that constrain playback and export metadata.
   - **Right Inspector:** Video Guide Title, Summary/Notes (`WysiwygEditor`), Recording metadata (duration, audio/camera badges), and quick Export Video button.
4. **[`ProjectDashboard.tsx`](file:///c:/Users/PTRE/Documents/scrcd/src/components/dashboard/ProjectDashboard.tsx) & [`ExportModal.tsx`](file:///c:/Users/PTRE/Documents/scrcd/src/components/export/ExportModal.tsx):**
   - Video guide project cards display a `Video Guide` badge (with `Video` Lucide icon), formatted duration (`MM:SS`), and `videoThumbnailUrl` preview.
   - [`ExportModal.tsx`](file:///c:/Users/PTRE/Documents/scrcd/src/components/export/ExportModal.tsx) supports exporting Video Guides as a standalone `.webm` video file, an Interactive HTML Video Guide (with embedded video, chapter navigation, and notes), or JSON project backup.

## 6. What's Left to the Builder
- Exact CSS spacing, transitions, and responsive breakpoints within [`VideoGuideStudio`](file:///c:/Users/PTRE/Documents/scrcd/src/components/editor/VideoGuideStudio.tsx) and [`CaptureSetupModal`](file:///c:/Users/PTRE/Documents/scrcd/src/components/recorder/CaptureSetupModal.tsx).
- IndexedDB helper implementation details in [`src/services/videoStorage.ts`](file:///c:/Users/PTRE/Documents/scrcd/src/services/videoStorage.ts) for browser fallback storage.
- Unit and integration tests in `tests/videoGuideTest.js` verifying data models, chapter management, trim state, and export formatting.
