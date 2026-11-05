import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { DisplaySource, CaptureConfig, CaptureScope, VideoSourceItem } from '@/types';
import {
  Monitor,
  AppWindow,
  Crosshair,
  MousePointer,
  Layers,
  Video,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Camera,
  CameraOff,
} from 'lucide-react';

interface CaptureSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (config: CaptureConfig) => void;
}

export const CaptureSetupModal: React.FC<CaptureSetupModalProps> = ({
  isOpen,
  onClose,
  onStart,
}) => {
  const [recordingMode, setRecordingMode] = useState<'steps' | 'video'>('steps');
  const [displays, setDisplays] = useState<DisplaySource[]>([]);
  const [isMultiMonitor, setIsMultiMonitor] = useState(false);
  const [scope, setScope] = useState<CaptureScope>('window');
  const [videoScope, setVideoScope] = useState<'monitor' | 'window'>('monitor');
  const [selectedDisplayId, setSelectedDisplayId] = useState<number | undefined>(undefined);
  const [hotspotVariant, setHotspotVariant] = useState<'spotlight' | 'badge'>('spotlight');

  // Video Guide options
  const [windowSources, setWindowSources] = useState<VideoSourceItem[]>([]);
  const [selectedWindowId, setSelectedWindowId] = useState<string>('');
  const [recordMic, setRecordMic] = useState<boolean>(true);
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [micDeviceId, setMicDeviceId] = useState<string>('');
  const [micLevel, setMicLevel] = useState<number>(0);
  const [recordSystemAudio, setRecordSystemAudio] = useState<boolean>(true);
  const [recordWebcam, setRecordWebcam] = useState<boolean>(false);
  const [webcamDevices, setWebcamDevices] = useState<MediaDeviceInfo[]>([]);
  const [webcamDeviceId, setWebcamDeviceId] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    const loadSources = async () => {
      try {
        const res = await api.getCaptureSources();
        setDisplays(res.displays || []);
        setIsMultiMonitor(res.isMultiMonitor || false);
        if (res.displays && res.displays.length > 0) {
          setSelectedDisplayId(res.displays[0].id);
        }

        const vSources = await api.getVideoSources();
        const winList = vSources.filter((s) => s.type === 'window');
        setWindowSources(winList);
        if (winList.length > 0) {
          setSelectedWindowId(winList[0].id);
        }

        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const mics = devices.filter((d) => d.kind === 'audioinput');
          const cams = devices.filter((d) => d.kind === 'videoinput');
          setMicDevices(mics);
          setWebcamDevices(cams);
          if (mics.length > 0 && !micDeviceId) setMicDeviceId(mics[0].deviceId);
          if (cams.length > 0 && !webcamDeviceId) setWebcamDeviceId(cams[0].deviceId);
        }
      } catch (e) {
        console.error('Failed to load capture sources', e);
      }
    };
    loadSources();
  }, [isOpen]);

  // Live microphone input level meter when Video Guide mode + recordMic is active
  useEffect(() => {
    if (!isOpen || recordingMode !== 'video' || !recordMic) {
      setMicLevel(0);
      return;
    }
    let audioCtx: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let animId = 0;
    let cancelled = false;

    const startMeter = async () => {
      if (!navigator.mediaDevices?.getUserMedia || typeof AudioContext === 'undefined') return;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: micDeviceId ? { deviceId: { exact: micDeviceId } } : true,
          video: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          if (cancelled) return;
          analyser.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i];
          const avg = sum / data.length;
          setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
          animId = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setMicLevel(0);
      }
    };

    startMeter();

    return () => {
      cancelled = true;
      if (animId) cancelAnimationFrame(animId);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (audioCtx) audioCtx.close().catch(() => {});
    };
  }, [isOpen, recordingMode, recordMic, micDeviceId]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const effectiveScope: CaptureScope =
      recordingMode === 'video' ? (videoScope === 'window' ? 'window' : 'monitor') : scope;

    let monitorBounds: { x: number; y: number; width: number; height: number } | undefined;
    if (effectiveScope === 'monitor' && selectedDisplayId !== undefined) {
      const d = displays.find((item) => item.id === selectedDisplayId);
      if (d) monitorBounds = d.bounds;
    }

    onStart({
      scope: effectiveScope,
      displayId: selectedDisplayId,
      monitorBounds,
      hotspotVariant,
      recordingMode,
      recordMic,
      micDeviceId: micDeviceId || undefined,
      recordSystemAudio,
      recordWebcam,
      webcamDeviceId: webcamDeviceId || undefined,
      windowSourceId: videoScope === 'window' ? selectedWindowId : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-card border border-border rounded-xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div>
          <h2 className="text-base font-bold text-foreground">Recording Configuration</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choose between a step-by-step written guide or a narrated Loom-style video guide.
          </p>
        </div>

        {/* Recording Mode Selector */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-secondary/60 border border-border">
          <button
            type="button"
            onClick={() => setRecordingMode('steps')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
              recordingMode === 'steps'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Step-by-Step Guide</span>
          </button>
          <button
            type="button"
            onClick={() => setRecordingMode('video')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
              recordingMode === 'video'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Video Guide (Loom Mode)</span>
          </button>
        </div>

        {recordingMode === 'steps' ? (
          <>
            {/* Step-by-Step Capture Scope Selection */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-foreground">Capture Scope</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. Active Window */}
                <div
                  onClick={() => setScope('window')}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                    scope === 'window'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-secondary/40 hover:bg-secondary/70 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <AppWindow className="w-4 h-4" />
                    <span className="text-xs font-semibold">Active Window</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">
                    Snaps only the application window being clicked (Chrome, VS Code, etc.).
                  </p>
                </div>

                {/* 2. Cursor Area */}
                <div
                  onClick={() => setScope('cursor')}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                    scope === 'cursor'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-secondary/40 hover:bg-secondary/70 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Crosshair className="w-4 h-4" />
                    <span className="text-xs font-semibold">Area Near Cursor</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">
                    Snaps a focused 1200×750 viewport centered directly around your click.
                  </p>
                </div>

                {/* 3. Specific Monitor */}
                <div
                  onClick={() => setScope('monitor')}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                    scope === 'monitor'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-secondary/40 hover:bg-secondary/70 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    <span className="text-xs font-semibold">
                      {isMultiMonitor ? 'Specific Monitor' : 'Full Screen'}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">
                    {isMultiMonitor
                      ? 'Capture a single selected monitor instead of spanning all screens.'
                      : 'Capture the full primary display.'}
                  </p>
                </div>

                {/* 4. All Monitors */}
                {isMultiMonitor && (
                  <div
                    onClick={() => setScope('all')}
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                      scope === 'all'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-secondary/40 hover:bg-secondary/70 text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4" />
                      <span className="text-xs font-semibold">All Monitors</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">
                      Span entire multi-monitor desktop.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Monitor Dropdown when Scope === 'monitor' */}
            {scope === 'monitor' && displays.length > 1 && (
              <div className="space-y-1.5 animate-in fade-in duration-150">
                <label className="text-xs font-semibold text-foreground">Select Display</label>
                <select
                  value={selectedDisplayId}
                  onChange={(e) => setSelectedDisplayId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-secondary/60 border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {displays.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Hotspot Style Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Click Hotspot Style</label>
              <div className="grid grid-cols-2 gap-2.5">
                <div
                  onClick={() => setHotspotVariant('spotlight')}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center gap-2.5 ${
                    hotspotVariant === 'spotlight'
                      ? 'border-amber-500/80 bg-amber-500/10 text-foreground'
                      : 'border-border bg-secondary/40 hover:bg-secondary/70 text-muted-foreground'
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-amber-500/30 border border-amber-500 flex items-center justify-center text-amber-500">
                    <MousePointer className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold">Glowing Spotlight</div>
                    <div className="text-[10px] text-muted-foreground">Translucent halo with pointer</div>
                  </div>
                </div>

                <div
                  onClick={() => setHotspotVariant('badge')}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center gap-2.5 ${
                    hotspotVariant === 'badge'
                      ? 'border-primary/80 bg-primary/10 text-foreground'
                      : 'border-border bg-secondary/40 hover:bg-secondary/70 text-muted-foreground'
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-[11px] font-bold">
                    1
                  </div>
                  <div>
                    <div className="text-xs font-semibold">Numbered Badge</div>
                    <div className="text-[10px] text-muted-foreground">Sequential numbered circle</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Video Guide (Loom Mode) Configuration */
          <div className="space-y-4">
            {/* Video Capture Area */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Video Capture Surface</label>
              <div className="grid grid-cols-2 gap-2.5">
                <div
                  onClick={() => setVideoScope('monitor')}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    videoScope === 'monitor'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-secondary/40 hover:bg-secondary/70 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    <span className="text-xs font-semibold">Full Display</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                    Record entire screen with draggable webcam bubble.
                  </p>
                </div>

                <div
                  onClick={() => setVideoScope('window')}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    videoScope === 'window'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-secondary/40 hover:bg-secondary/70 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <AppWindow className="w-4 h-4" />
                    <span className="text-xs font-semibold">Application Window</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                    Record a single selected application window.
                  </p>
                </div>
              </div>

              {videoScope === 'monitor' && displays.length > 1 && (
                <div className="pt-1">
                  <select
                    value={selectedDisplayId}
                    onChange={(e) => setSelectedDisplayId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/60 border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {displays.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {videoScope === 'window' && windowSources.length > 0 && (
                <div className="pt-1">
                  <select
                    value={selectedWindowId}
                    onChange={(e) => setSelectedWindowId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/60 border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {windowSources.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Audio & Webcam Controls */}
            <div className="space-y-2.5">
              <label className="text-xs font-semibold text-foreground">Audio & Camera Sources</label>

              {/* 1. Microphone Voice Narration */}
              <div className="p-3 rounded-lg border border-border bg-secondary/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        recordMic ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      {recordMic ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground">Microphone Narration</div>
                      <div className="text-[10px] text-muted-foreground">
                        Record your voice commentary while demonstrating
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRecordMic((v) => !v)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                      recordMic
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {recordMic ? 'Enabled' : 'Muted'}
                  </button>
                </div>

                {recordMic && (
                  <div className="space-y-1.5 pt-1">
                    {micDevices.length > 0 && (
                      <select
                        value={micDeviceId}
                        onChange={(e) => setMicDeviceId(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-md bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {micDevices.map((d, idx) => (
                          <option key={d.deviceId || idx} value={d.deviceId}>
                            {d.label || `Microphone ${idx + 1}`}
                          </option>
                        ))}
                      </select>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-14">Input level</span>
                      <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-75"
                          style={{ width: `${Math.max(4, micLevel)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. System Audio */}
              <div className="p-3 rounded-lg border border-border bg-secondary/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      recordSystemAudio ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {recordSystemAudio ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground">System Audio</div>
                    <div className="text-[10px] text-muted-foreground">
                      Capture desktop & application sound alongside your voice
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRecordSystemAudio((v) => !v)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    recordSystemAudio
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {recordSystemAudio ? 'Enabled' : 'Off'}
                </button>
              </div>

              {/* 3. Floating Webcam Bubble */}
              <div className="p-3 rounded-lg border border-border bg-secondary/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        recordWebcam ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      {recordWebcam ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground">Floating Webcam Bubble</div>
                      <div className="text-[10px] text-muted-foreground">
                        Show a circular draggable camera overlay on screen
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRecordWebcam((v) => !v)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                      recordWebcam
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {recordWebcam ? 'Enabled' : 'Off'}
                  </button>
                </div>

                {recordWebcam && webcamDevices.length > 0 && (
                  <div className="pt-1">
                    <select
                      value={webcamDeviceId}
                      onChange={(e) => setWebcamDeviceId(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {webcamDevices.map((d, idx) => (
                        <option key={d.deviceId || idx} value={d.deviceId}>
                          {d.label || `Camera ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors shadow-sm"
          >
            {recordingMode === 'video' ? (
              <>
                <Video className="w-3.5 h-3.5" />
                <span>Start Video Recording</span>
              </>
            ) : (
              <span>Start Recording</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
