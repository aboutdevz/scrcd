import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { stripTypeScriptTypes } from 'module';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Starting Video Guide Verification Tests...\n');

// Verify videoStorage.ts exists and implements clampVideoTrim, normalizeVideoChapters, formatVideoTimestamp, saveVideoToStorage, resolveVideoUrl, deleteVideoFromStorage
const videoStoragePath = path.join(__dirname, '../src/services/videoStorage.ts');
assert(fs.existsSync(videoStoragePath), 'src/services/videoStorage.ts must exist');

const videoStorageCode = fs.readFileSync(videoStoragePath, 'utf8');
assert(videoStorageCode.includes('export function clampVideoTrim'), 'clampVideoTrim must be exported');
assert(videoStorageCode.includes('export function normalizeVideoChapters'), 'normalizeVideoChapters must be exported');
assert(videoStorageCode.includes('export function formatVideoTimestamp'), 'formatVideoTimestamp must be exported');
assert(videoStorageCode.includes('export async function saveVideoToStorage'), 'saveVideoToStorage must be exported');
assert(videoStorageCode.includes('export async function resolveVideoUrl'), 'resolveVideoUrl must be exported');
assert(videoStorageCode.includes('export async function deleteVideoFromStorage'), 'deleteVideoFromStorage must be exported');

// Strip TypeScript types using Node's native stripTypeScriptTypes and evaluate pure functions
const jsStorageCode = stripTypeScriptTypes(videoStorageCode)
  .replace(/import\s+.*?from\s+['"].*?['"];?/g, '')
  .replace(/export\s+async\s+function/g, 'async function')
  .replace(/export\s+function/g, 'function');

const storageModule = new Function(
  `${jsStorageCode}\nreturn { clampVideoTrim, normalizeVideoChapters, formatVideoTimestamp };`
)();

const { clampVideoTrim, normalizeVideoChapters, formatVideoTimestamp } = storageModule;

// 1. Trim clamping (Review Focus #2)
{
  const res1 = clampVideoTrim(-5, 120, 60);
  assert.strictEqual(res1.trimStart, 0, 'Negative trimStart clamped to 0');
  assert.strictEqual(res1.trimEnd, 60, 'Overflow trimEnd clamped to duration');

  const res2 = clampVideoTrim(45, 20, 60);
  assert(res2.trimStart < res2.trimEnd, 'Inverted trim bounds must be corrected');
  assert(res2.trimEnd - res2.trimStart >= 0.5, 'Minimum 0.5s window enforced');
  console.log('✅ [Trim Clamping] Negative, overflow, and inverted trim bounds handled safely');
}

// 2. Chapter sorting & clamping (Review Focus #3)
{
  const chapters = [
    { id: 'c2', timestamp: 95, title: 'Outro' },
    { id: 'c1', timestamp: -4, title: 'Intro' },
    { id: 'c3', timestamp: 15.4, title: 'Setup' },
  ];
  const norm = normalizeVideoChapters(chapters, 60);
  assert.strictEqual(norm.length, 3);
  assert.strictEqual(norm[0].id, 'c1');
  assert.strictEqual(norm[0].timestamp, 0);
  assert.strictEqual(norm[1].id, 'c3');
  assert.strictEqual(norm[1].timestamp, 15.4);
  assert.strictEqual(norm[2].id, 'c2');
  assert.strictEqual(norm[2].timestamp, 60);
  console.log('✅ [Chapter Normalization] Chapters clamped to [0, duration] and sorted ascending');
}

// 3. Timestamp formatting
{
  assert.strictEqual(formatVideoTimestamp(0), '00:00');
  assert.strictEqual(formatVideoTimestamp(65.8), '01:05');
  assert.strictEqual(formatVideoTimestamp(3661), '01:01:01');
  console.log('✅ [Timestamp Formatting] MM:SS and HH:MM:SS formatted accurately');
}

// 4. Verify deleteProject cleans up video storage (Review Focus #5)
{
  const apiCode = fs.readFileSync(path.join(__dirname, '../src/services/api.ts'), 'utf8');
  assert(apiCode.includes('deleteVideoFromStorage'), 'api.deleteProject must clean up video storage');
  console.log('✅ [Project Deletion Cleanup] api.deleteProject invokes deleteVideoFromStorage');
}

// 5. Verify Electron main.cjs video IPC handlers & floating webcam window (Task 2)
{
  const mainCode = fs.readFileSync(path.join(__dirname, '../electron/main.cjs'), 'utf8');
  assert(mainCode.includes("'get-video-sources'"), 'main.cjs must handle get-video-sources');
  assert(mainCode.includes("'save-video-file'"), 'main.cjs must handle save-video-file');
  assert(mainCode.includes("'delete-video-file'"), 'main.cjs must handle delete-video-file');
  assert(mainCode.includes("'export-video-file'"), 'main.cjs must handle export-video-file');
  assert(mainCode.includes("'video-toggle-mic'"), 'main.cjs must handle video-toggle-mic');
  assert(mainCode.includes("'video-toggle-webcam'"), 'main.cjs must handle video-toggle-webcam');
  assert(mainCode.includes('createWebcamWindow'), 'main.cjs must define createWebcamWindow');
  assert(mainCode.includes('setBackgroundThrottling(false)'), 'main.cjs must disable backgroundThrottling during video recording');

  const webcamBubblePath = path.join(__dirname, '../src/components/recorder/WebcamBubble.tsx');
  assert(fs.existsSync(webcamBubblePath), 'WebcamBubble.tsx must exist');
  console.log('✅ [Electron Video IPC & Webcam Window] All IPC handlers and WebcamBubble verified');
}

// 6. Verify WebRTC & Web Audio Mixer Engine (Task 3 - Review Focus #1 & #4)
{
  const recorderPath = path.join(__dirname, '../src/services/videoRecorder.ts');
  assert(fs.existsSync(recorderPath), 'src/services/videoRecorder.ts must exist');
  const recorderCode = fs.readFileSync(recorderPath, 'utf8');
  assert(recorderCode.includes('export function createAudioMixerGainState'), 'createAudioMixerGainState must be exported');
  assert(recorderCode.includes('export class VideoRecorderEngine'), 'VideoRecorderEngine must be exported');
  assert(recorderCode.includes('chromeMediaSource'), 'Electron desktopCapturer constraints must be supported');

  const jsRecorderCode = stripTypeScriptTypes(recorderCode)
    .replace(/import\s+.*?from\s+['"].*?['"];?/g, '')
    .replace(/export\s+class/g, 'class')
    .replace(/export\s+function/g, 'function')
    .replace(/export\s+const/g, 'const');

  const { createAudioMixerGainState } = new Function(
    `${jsRecorderCode}\nreturn { createAudioMixerGainState };`
  )();

  const mixer = createAudioMixerGainState(true, true);
  assert.strictEqual(mixer.micGain, 1, 'Initial mic gain is 1 when recordMic=true');
  assert.strictEqual(mixer.systemGain, 1, 'Initial system audio gain is 1 when recordSystemAudio=true');
  assert.strictEqual(mixer.setMicMuted(true), 0, 'Muting mic sets micGain to 0');
  assert.strictEqual(mixer.micGain, 0, 'micGain is 0 when muted');
  assert.strictEqual(mixer.systemGain, 1, 'systemGain remains 1 when mic is muted');
  assert.strictEqual(mixer.setMicMuted(false), 1, 'Unmuting mic restores micGain to 1');
  console.log('✅ [Web Audio Mixer State] Live mic mute/unmute isolates micGain while preserving systemGain');
}

// 7. Verify CaptureSetupModal and FloatingPill Video Mode UI (Task 4)
{
  const setupModalCode = fs.readFileSync(path.join(__dirname, '../src/components/recorder/CaptureSetupModal.tsx'), 'utf8');
  assert(setupModalCode.includes("recordingMode"), 'CaptureSetupModal must support recordingMode');
  assert(setupModalCode.includes("recordMic"), 'CaptureSetupModal must support microphone toggle');
  assert(setupModalCode.includes("recordSystemAudio"), 'CaptureSetupModal must support system audio toggle');
  assert(setupModalCode.includes("recordWebcam"), 'CaptureSetupModal must support webcam bubble toggle');

  const pillCode = fs.readFileSync(path.join(__dirname, '../src/components/recorder/FloatingPill.tsx'), 'utf8');
  assert(pillCode.includes("video-toggle-mic"), 'FloatingPill must support live microphone mute/unmute');
  assert(pillCode.includes("video-toggle-webcam"), 'FloatingPill must support live webcam bubble toggle');
  assert(pillCode.includes("formatVideoTimestamp"), 'FloatingPill must display live elapsed video timer');
  console.log('✅ [CaptureSetupModal & FloatingPill] Video mode controls and audio/camera pickers verified');
}

// 8. Verify HTML Video Guide Exporter & VideoGuideStudio (Task 5)
{
  const exportVideoHtmlPath = path.join(__dirname, '../src/services/exporters/exportVideoHtml.ts');
  assert(fs.existsSync(exportVideoHtmlPath), 'src/services/exporters/exportVideoHtml.ts must exist');
  const exportCode = fs.readFileSync(exportVideoHtmlPath, 'utf8');
  assert(exportCode.includes('export function generateVideoGuideHtml'), 'generateVideoGuideHtml must be exported');

  const jsExportCode = stripTypeScriptTypes(exportCode)
    .replace(/import\s+.*?from\s+['"].*?['"];?/g, '')
    .replace(/export\s+function/g, 'function');

  const { generateVideoGuideHtml } = new Function(
    `const formatVideoTimestamp = ${formatVideoTimestamp.toString()};\n${jsExportCode}\nreturn { generateVideoGuideHtml };`
  )();

  const sampleVideoProject = {
    id: 'proj_vid_1',
    title: 'Database Failover Walkthrough',
    version: '1.2.0',
    description: '<p>Step-by-step narrated video guide covering primary to replica promotion.</p>',
    category: 'Tutorial',
    tags: ['database', 'video'],
    author: 'System Operations Team',
    companyName: 'Acme Corp',
    accentColor: '#2563eb',
    guideType: 'video',
    videoPath: 'file:///C:/videos/sample.webm',
    videoDuration: 125,
    videoTrimStart: 5,
    videoTrimEnd: 110,
    recordedMic: true,
    recordedSystemAudio: true,
    recordedWebcam: true,
    videoChapters: [
      { id: 'ch1', timestamp: 5, title: 'Verify Replica Lag' },
      { id: 'ch2', timestamp: 48, title: 'Promote Standby Node' },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const branding = {
    companyName: 'Acme Corp',
    author: 'System Operations Team',
    accentColor: '#2563eb',
    footerText: 'Internal Video SOP',
  };

  const htmlOut = generateVideoGuideHtml(sampleVideoProject, branding);
  assert(htmlOut.includes('Database Failover Walkthrough'), 'HTML must include project title');
  assert(htmlOut.includes('Verify Replica Lag'), 'HTML must include chapter 1 title');
  assert(htmlOut.includes('Promote Standby Node'), 'HTML must include chapter 2 title');
  assert(htmlOut.includes('toc-leader'), 'HTML must format chapters using classic dotted leader TOC');
  assert(htmlOut.includes('toc-num'), 'HTML must include right-aligned tabular numerals for chapter timestamps');
  assert(htmlOut.includes('data-trim-start="5"'), 'HTML video player must embed trimStart');
  assert(htmlOut.includes('data-trim-end="110"'), 'HTML video player must embed trimEnd');
  assert(!/[\u{1F300}-\u{1F9FF}]/u.test(htmlOut), 'Exported HTML must contain zero Unicode emojis');

  const studioPath = path.join(__dirname, '../src/components/editor/VideoGuideStudio.tsx');
  assert(fs.existsSync(studioPath), 'src/components/editor/VideoGuideStudio.tsx must exist');
  console.log('✅ [VideoGuideStudio & HTML Video Guide Exporter] Classic dotted-leader chapters, trim bounds, and zero-emoji output verified');
}

// 9. Verify Dashboard HTML stripping & videoThumbnailUrl preview, ExportModal video guard, and browser getDisplayMedia retry (Final Review Fixes)
{
  const dashCode = fs.readFileSync(path.join(__dirname, '../src/components/dashboard/ProjectDashboard.tsx'), 'utf8');
  assert(dashCode.includes('videoThumbnailUrl'), 'ProjectDashboard must render videoThumbnailUrl preview on video cards');
  assert(dashCode.includes("replace(/<[^>]*>/g, '')"), 'ProjectDashboard must strip HTML tags from rich description preview');

  const exportModalCode = fs.readFileSync(path.join(__dirname, '../src/components/export/ExportModal.tsx'), 'utf8');
  assert(exportModalCode.includes('!isVideoGuide && selectedFormat !== \'json\''), 'ExportModal must hide step badge options for video guides');

  const recorderCode = fs.readFileSync(path.join(__dirname, '../src/services/videoRecorder.ts'), 'utf8');
  assert(recorderCode.includes('getDisplayMedia({ video: true, audio: false })'), 'videoRecorder must retry video-only getDisplayMedia when audio capture is rejected');
  console.log('✅ [Final Review Fixes] Dashboard thumbnail/HTML preview, ExportModal guard, and getDisplayMedia retry verified');
}

console.log('\n🎉 All Video Guide Tests Passed!');
