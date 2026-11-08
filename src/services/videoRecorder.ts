import { CaptureConfig } from '@/types';
import { api, isElectron, getElectron } from '@/services/api';
import { saveVideoToStorage } from '@/services/videoStorage';
import { broadcastWebcamStream, stopWebcamBroadcast } from '@/services/webcamBridge';

export interface VideoRecordingResult {
  videoPath: string;
  duration: number;
  thumbnailUrl: string;
  recordedMic: boolean;
  recordedSystemAudio: boolean;
  recordedWebcam: boolean;
}

export function createAudioMixerGainState(recordMic: boolean, recordSystemAudio: boolean) {
  const state = {
    micMuted: !recordMic,
    micGain: recordMic ? 1 : 0,
    systemGain: recordSystemAudio ? 1 : 0,
    setMicMuted(muted: boolean): number {
      state.micMuted = Boolean(muted);
      state.micGain = state.micMuted ? 0 : 1;
      return state.micGain;
    },
  };
  return state;
}

function createSyntheticScreenStream(): { stream: MediaStream; stop: () => void } {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  let frame = 0;

  const drawFrame = () => {
    if (!ctx) return;
    frame++;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(60, 60, canvas.width - 120, canvas.height - 120);

    ctx.fillStyle = '#2563eb';
    ctx.fillRect(60, 60, canvas.width - 120, 48);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('SCRCD Video Guide Recording', 84, 91);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '15px sans-serif';
    ctx.fillText(`Elapsed Frame: ${frame}`, 84, 150);

    const pulseX = 320 + Math.sin(frame / 15) * 180;
    const pulseY = 360 + Math.cos(frame / 20) * 90;
    ctx.beginPath();
    ctx.arc(pulseX, pulseY, 18, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(245, 158, 11, 0.45)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();
  };

  drawFrame();
  const intervalId = window.setInterval(drawFrame, 33);
  const stream = canvas.captureStream ? canvas.captureStream(30) : new MediaStream();
  return {
    stream,
    stop: () => window.clearInterval(intervalId),
  };
}

export class VideoRecorderEngine {
  private projectId: string | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private screenStream: MediaStream | null = null;
  private micStream: MediaStream | null = null;
  private webcamStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private micGainNode: GainNode | null = null;
  private systemGainNode: GainNode | null = null;
  private compositorStop: (() => void) | null = null;
  private syntheticStop: (() => void) | null = null;
  private startTime = 0;
  private pausedDurationMs = 0;
  private pauseStartedAt = 0;
  private thumbnailUrl = '';
  private recordedMic = false;
  private recordedSystemAudio = false;
  private recordedWebcam = false;
  private webcamOverlayEnabled = false;
  private webcamMode: 'small' | 'large' | 'fullscreen' = 'small';
  private webcamPos: { relX: number; relY: number } | null = null;
  private removeIpcListeners: (() => void) | null = null;
  private gainState = createAudioMixerGainState(true, true);

  async start(projectId: string, config: CaptureConfig): Promise<void> {
    this.cleanup();
    this.projectId = projectId;
    this.chunks = [];
    this.thumbnailUrl = '';
    this.recordedMic = config.recordMic !== false;
    this.recordedSystemAudio = Boolean(config.recordSystemAudio);
    this.recordedWebcam = Boolean(config.recordWebcam);
    this.webcamOverlayEnabled = Boolean(config.recordWebcam);
    this.webcamMode = 'small';
    this.webcamPos = null;
    this.gainState = createAudioMixerGainState(this.recordedMic, this.recordedSystemAudio);

    if (isElectron()) {
      const electron = getElectron();
      if (electron?.ipcRenderer) {
        const onBounds = (_e: any, bounds: { relX: number; relY: number }) => {
          this.webcamPos = bounds;
        };
        const onMode = (_e: any, mode: 'small' | 'large' | 'fullscreen') => {
          this.webcamMode = mode;
        };
        electron.ipcRenderer.on('webcam-window-bounds', onBounds);
        electron.ipcRenderer.on('webcam-mode-changed', onMode);
        this.removeIpcListeners = () => {
          electron.ipcRenderer?.removeListener('webcam-window-bounds', onBounds);
          electron.ipcRenderer?.removeListener('webcam-mode-changed', onMode);
        };
      }
    }

    // 1. Acquire Screen + Desktop System Audio stream
    this.screenStream = await this.acquireScreenStream(config);

    // 2. Acquire Microphone stream if enabled
    if (this.recordedMic && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        this.micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: config.micDeviceId ? { exact: config.micDeviceId } : undefined,
            echoCancellation: true,
            noiseSuppression: true,
          },
          video: false,
        });
      } catch (err) {
        console.warn('Microphone stream unavailable, continuing without mic:', err);
        this.recordedMic = false;
      }
    }

    // 3. Canvas Webcam Compositor burns the circular webcam bubble directly into the video
    // (Bypasses Windows DWM transparent window capture bugs, ensuring 100% circular bubble output)
    let videoTrackToRecord: MediaStreamTrack | undefined = this.screenStream?.getVideoTracks()[0];
    const needsCanvasWebcam = this.recordedWebcam;

    if (needsCanvasWebcam && videoTrackToRecord && navigator.mediaDevices?.getUserMedia) {
      try {
        this.webcamStream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: config.webcamDeviceId ? { exact: config.webcamDeviceId } : undefined,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        // Broadcast to floating webcamWindow via local WebRTC bridge
        broadcastWebcamStream(this.webcamStream);

        const comp = await this.createCanvasCompositor(this.screenStream!, this.webcamStream);
        if (comp) {
          videoTrackToRecord = comp.track;
          this.compositorStop = comp.stop;
        }
      } catch (err) {
        console.warn('Canvas webcam compositor fallback skipped:', err);
      }
    }

    // 4. Mix System Audio + Microphone Audio via Web Audio API GainNodes
    const combinedTracks: MediaStreamTrack[] = [];
    if (videoTrackToRecord) {
      combinedTracks.push(videoTrackToRecord);
    }

    const sysAudioTracks = this.screenStream ? this.screenStream.getAudioTracks() : [];
    const micAudioTracks = this.micStream ? this.micStream.getAudioTracks() : [];
    this.recordedSystemAudio = sysAudioTracks.length > 0;

    if ((sysAudioTracks.length > 0 || micAudioTracks.length > 0) && typeof AudioContext !== 'undefined') {
      try {
        this.audioCtx = new AudioContext();
        const dest = this.audioCtx.createMediaStreamDestination();

        if (sysAudioTracks.length > 0) {
          const sysSource = this.audioCtx.createMediaStreamSource(new MediaStream([sysAudioTracks[0]]));
          this.systemGainNode = this.audioCtx.createGain();
          this.systemGainNode.gain.value = this.gainState.systemGain;
          sysSource.connect(this.systemGainNode);
          this.systemGainNode.connect(dest);
        }

        if (micAudioTracks.length > 0) {
          const micSource = this.audioCtx.createMediaStreamSource(new MediaStream([micAudioTracks[0]]));
          this.micGainNode = this.audioCtx.createGain();
          this.micGainNode.gain.value = this.gainState.micGain;
          micSource.connect(this.micGainNode);
          this.micGainNode.connect(dest);
        }

        const mixedTrack = dest.stream.getAudioTracks()[0];
        if (mixedTrack) {
          combinedTracks.push(mixedTrack);
        }
      } catch (err) {
        console.warn('Web Audio API mixer fallback to raw track:', err);
        if (micAudioTracks[0]) combinedTracks.push(micAudioTracks[0]);
        else if (sysAudioTracks[0]) combinedTracks.push(sysAudioTracks[0]);
      }
    }

    const finalStream = new MediaStream(combinedTracks);

    // Capture a poster thumbnail after 500ms
    window.setTimeout(() => {
      this.capturePosterFrame();
    }, 500);

    // 5. Start MediaRecorder
    const mimeCandidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ];
    const supportedMime =
      typeof MediaRecorder !== 'undefined'
        ? mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || ''
        : '';

    this.startTime = Date.now();
    this.pausedDurationMs = 0;
    this.pauseStartedAt = 0;

    if (typeof MediaRecorder !== 'undefined' && finalStream.getTracks().length > 0) {
      // 1.2 Mbps video + 96 kbps audio: yields ~8-9 MB per minute (down from ~25 MB) with crystal-clear 1080p text
      this.mediaRecorder = supportedMime
        ? new MediaRecorder(finalStream, {
            mimeType: supportedMime,
            videoBitsPerSecond: 1200000,
            audioBitsPerSecond: 96000,
          })
        : new MediaRecorder(finalStream);

      this.mediaRecorder.ondataavailable = (evt) => {
        if (evt.data && evt.data.size > 0) {
          this.chunks.push(evt.data);
        }
      };

      this.mediaRecorder.start(500);
    }
  }

  private async acquireScreenStream(config: CaptureConfig): Promise<MediaStream> {
    if (isElectron() && navigator.mediaDevices?.getUserMedia) {
      const sources = await api.getVideoSources();
      let sourceId = config.windowSourceId;

      if (!sourceId || config.scope !== 'window') {
        const displayMatch = config.displayId
          ? sources.find((s) => s.type === 'screen' && s.displayId === String(config.displayId))
          : null;
        const firstScreen = sources.find((s) => s.type === 'screen');
        sourceId = (displayMatch || firstScreen || sources[0])?.id || 'screen:0:0';
      }

      const videoMandatory = {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: sourceId,
        maxWidth: 2560,
        maxHeight: 1440,
        maxFrameRate: 30,
      };

      // Review Focus #1: Try with desktop loopback audio if requested, and gracefully fall back if HWND loopback fails
      if (config.recordSystemAudio) {
        try {
          return await navigator.mediaDevices.getUserMedia({
            audio: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: sourceId,
              },
            } as any,
            video: {
              mandatory: videoMandatory,
            } as any,
          });
        } catch (err) {
          console.warn('Desktop loopback audio on source failed, trying screen-level audio + source video:', err);
          try {
            const videoOnly = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: { mandatory: videoMandatory } as any,
            });
            const primaryScreen = sources.find((s) => s.type === 'screen')?.id || 'screen:0:0';
            const sysAudioStream = await navigator.mediaDevices.getUserMedia({
              audio: {
                mandatory: {
                  chromeMediaSource: 'desktop',
                  chromeMediaSourceId: primaryScreen,
                },
              } as any,
              video: {
                mandatory: {
                  chromeMediaSource: 'desktop',
                  chromeMediaSourceId: primaryScreen,
                  maxWidth: 16,
                  maxHeight: 16,
                  maxFrameRate: 1,
                },
              } as any,
            });
            sysAudioStream.getVideoTracks().forEach((t) => t.stop());
            const audioTrack = sysAudioStream.getAudioTracks()[0];
            if (audioTrack) {
              videoOnly.addTrack(audioTrack);
            }
            return videoOnly;
          } catch {
            // Fall through to video-only desktop capture
          }
        }
      }

      try {
        return await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { mandatory: videoMandatory } as any,
        });
      } catch (err) {
        console.warn('Electron desktop getUserMedia fallback to synthetic stream:', err);
      }
    }

    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
      try {
        return await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: Boolean(config.recordSystemAudio),
        });
      } catch (err) {
        if (config.recordSystemAudio) {
          try {
            return await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
          } catch {}
        }
        console.warn('getDisplayMedia declined or unavailable, using synthetic video stream:', err);
      }
    }

    const syn = createSyntheticScreenStream();
    this.syntheticStop = syn.stop;
    return syn.stream;
  }

  private async createCanvasCompositor(
    screenStream: MediaStream,
    webcamStream: MediaStream
  ): Promise<{ track: MediaStreamTrack; stop: () => void } | null> {
    const screenVideo = document.createElement('video');
    screenVideo.srcObject = screenStream;
    screenVideo.muted = true;
    screenVideo.playsInline = true;
    await screenVideo.play().catch(() => {});

    const camVideo = document.createElement('video');
    camVideo.srcObject = webcamStream;
    camVideo.muted = true;
    camVideo.playsInline = true;
    await camVideo.play().catch(() => {});

    // Ensure metadata is loaded
    if (!screenVideo.videoWidth) {
      await new Promise<void>((res) => {
        screenVideo.onloadedmetadata = () => res();
        setTimeout(res, 300);
      });
    }
    if (!camVideo.videoWidth) {
      await new Promise<void>((res) => {
        camVideo.onloadedmetadata = () => res();
        setTimeout(res, 300);
      });
    }

    const width = screenVideo.videoWidth || 1920;
    const height = screenVideo.videoHeight || 1080;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const draw = () => {
      ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
      if (this.webcamOverlayEnabled && camVideo.readyState >= 2) {
        const camW = camVideo.videoWidth || 1280;
        const camH = camVideo.videoHeight || 720;

        if (this.webcamMode === 'fullscreen') {
          // Object-fit: cover for fullscreen camera view to avoid distortion
          const scale = Math.max(canvas.width / camW, canvas.height / camH);
          const scaledW = camW * scale;
          const scaledH = camH * scale;
          const offsetX = (canvas.width - scaledW) / 2;
          const offsetY = (canvas.height - scaledH) / 2;

          ctx.save();
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(camVideo, 0, 0, camW, camH, offsetX, offsetY, scaledW, scaledH);
          ctx.restore();
          return;
        }

        // Compact & sleek circular bubble (small: ~7% of screen height / ~150px on 1080p)
        const radius = this.webcamMode === 'large'
          ? Math.round(Math.min(canvas.width, canvas.height) * 0.115)
          : Math.round(Math.min(canvas.width, canvas.height) * 0.07);

        const margin = 28;
        let cx = margin + radius;
        let cy = canvas.height - margin - radius;

        if (this.webcamPos) {
          cx = Math.round(Math.max(radius + 10, Math.min(canvas.width - radius - 10, this.webcamPos.relX * canvas.width + radius)));
          cy = Math.round(Math.max(radius + 10, Math.min(canvas.height - radius - 10, this.webcamPos.relY * canvas.height + radius)));
        }

        // Center-crop 1:1 square from 16:9 camera feed (Object-fit: cover) to eliminate any stretching
        const cropSize = Math.min(camW, camH);
        const cropX = (camW - cropSize) / 2;
        const cropY = (camH - cropSize) / 2;

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        // Translate to circle center, mirror horizontally, and draw 1:1 square
        ctx.translate(cx, cy);
        ctx.scale(-1, 1);
        ctx.drawImage(
          camVideo,
          cropX, cropY, cropSize, cropSize, // 1:1 square source crop from center of camera frame
          -radius, -radius, radius * 2, radius * 2 // exact 1:1 square destination
        );
        ctx.restore();

        // High quality compact border ring
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#2563eb';
        ctx.stroke();

        // Subtle outer glow/halo ring
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 1.5, 0, Math.PI * 2);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(37, 99, 235, 0.35)';
        ctx.stroke();
      }
    };

    draw();
    const timer = window.setInterval(draw, 33);
    const outStream = canvas.captureStream(30);
    const track = outStream.getVideoTracks()[0];
    if (!track) {
      window.clearInterval(timer);
      return null;
    }

    return {
      track,
      stop: () => {
        window.clearInterval(timer);
        screenVideo.pause();
        camVideo.pause();
        screenVideo.srcObject = null;
        camVideo.srcObject = null;
      },
    };
  }

  private capturePosterFrame(): void {
    if (!this.screenStream) return;
    try {
      const video = document.createElement('video');
      video.srcObject = this.screenStream;
      video.muted = true;
      video.playsInline = true;
      video
        .play()
        .then(() => {
          const canvas = document.createElement('canvas');
          canvas.width = 640;
          canvas.height = 360;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            this.thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
          }
          video.pause();
          video.srcObject = null;
        })
        .catch(() => {});
    } catch {}
  }

  pause(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      this.pauseStartedAt = Date.now();
    }
  }

  resume(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      if (this.pauseStartedAt > 0) {
        this.pausedDurationMs += Date.now() - this.pauseStartedAt;
        this.pauseStartedAt = 0;
      }
    }
  }

  setMicMuted(muted: boolean): boolean {
    const nextGain = this.gainState.setMicMuted(muted);
    if (this.micGainNode) {
      this.micGainNode.gain.value = nextGain;
    }
    if (this.micStream) {
      this.micStream.getAudioTracks().forEach((t) => {
        t.enabled = !muted;
      });
    }
    return this.gainState.micMuted;
  }

  setWebcamEnabled(enabled: boolean): boolean {
    this.webcamOverlayEnabled = Boolean(enabled);
    return this.webcamOverlayEnabled;
  }

  async stop(): Promise<VideoRecordingResult | null> {
    if (!this.projectId) {
      this.cleanup();
      return null;
    }

    if (!this.thumbnailUrl) {
      this.capturePosterFrame();
    }

    if (this.pauseStartedAt > 0) {
      this.pausedDurationMs += Date.now() - this.pauseStartedAt;
      this.pauseStartedAt = 0;
    }

    const activeElapsedMs = Math.max(1000, Date.now() - this.startTime - this.pausedDurationMs);
    const durationSec = Math.max(1, Math.round((activeElapsedMs / 1000) * 10) / 10);

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        if (!this.mediaRecorder) return resolve();
        this.mediaRecorder.onstop = () => resolve();
        try {
          this.mediaRecorder.stop();
        } catch {
          resolve();
        }
      });
    }

    const mimeType = this.mediaRecorder?.mimeType || 'video/webm';
    const blob = new Blob(this.chunks, { type: mimeType });
    const pid = this.projectId;
    const videoPath = await saveVideoToStorage(pid, blob);

    const result: VideoRecordingResult = {
      videoPath,
      duration: durationSec,
      thumbnailUrl: this.thumbnailUrl,
      recordedMic: this.recordedMic,
      recordedSystemAudio: this.recordedSystemAudio,
      recordedWebcam: this.recordedWebcam,
    };

    this.cleanup();
    return result;
  }

  cancel(): void {
    this.cleanup();
  }

  private cleanup(): void {
    stopWebcamBroadcast();
    if (this.removeIpcListeners) {
      try {
        this.removeIpcListeners();
      } catch {}
      this.removeIpcListeners = null;
    }
    if (this.compositorStop) {
      try {
        this.compositorStop();
      } catch {}
      this.compositorStop = null;
    }
    if (this.syntheticStop) {
      try {
        this.syntheticStop();
      } catch {}
      this.syntheticStop = null;
    }
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => t.stop());
      this.screenStream = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
    if (this.webcamStream) {
      this.webcamStream.getTracks().forEach((t) => t.stop());
      this.webcamStream = null;
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {}
      this.audioCtx = null;
    }
    this.micGainNode = null;
    this.systemGainNode = null;
    this.mediaRecorder = null;
    this.chunks = [];
    this.projectId = null;
  }
}

export const videoRecorder = new VideoRecorderEngine();
