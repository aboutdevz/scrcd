import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import { api } from '@/services/api';
import {
  clampVideoTrim,
  formatVideoTimestamp,
  resolveVideoUrl,
} from '@/services/videoStorage';
import { WysiwygEditor } from './WysiwygEditor';
import {
  Video,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Scissors,
  Clock,
  Plus,
  Trash2,
  Download,
  Mic,
  Camera,
  RotateCcw,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';

export const VideoGuideStudio: React.FC = () => {
  const {
    activeProject,
    updateProject,
    updateVideoTrim,
    addVideoChapter,
    updateVideoChapter,
    deleteVideoChapter,
    startRecording,
  } = useStore();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(activeProject?.videoDuration || 0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);

  const [trimStart, setTrimStart] = useState<number>(activeProject?.videoTrimStart ?? 0);
  const [trimEnd, setTrimEnd] = useState<number>(
    activeProject?.videoTrimEnd ?? (activeProject?.videoDuration || 60)
  );

  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [titleInput, setTitleInput] = useState(activeProject?.title || '');

  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);

  useEffect(() => {
    let active = true;
    const loadVideo = async () => {
      if (!activeProject?.videoPath) {
        setResolvedUrl(null);
        return;
      }
      const url = await resolveVideoUrl(activeProject.videoPath);
      if (active) {
        setResolvedUrl(url);
      }
    };
    loadVideo();
    return () => {
      active = false;
    };
  }, [activeProject?.videoPath]);

  useEffect(() => {
    if (!activeProject) return;
    setTitleInput(activeProject.title || '');
    const dur = activeProject.videoDuration || duration || 60;
    setDuration(dur);
    setTrimStart(activeProject.videoTrimStart ?? 0);
    setTrimEnd(activeProject.videoTrimEnd ?? dur);
  }, [
    activeProject?.id,
    activeProject?.title,
    activeProject?.videoDuration,
    activeProject?.videoTrimStart,
    activeProject?.videoTrimEnd,
  ]);

  if (!activeProject) return null;

  const chapters = activeProject.videoChapters || [];

  const handleTogglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      if (v.currentTime < trimStart || (trimEnd > trimStart && v.currentTime >= trimEnd)) {
        v.currentTime = trimStart;
      }
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    if (trimEnd > trimStart && v.currentTime >= trimEnd) {
      v.pause();
      v.currentTime = trimStart;
      setIsPlaying(false);
    }
  };

  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    if (Number.isFinite(v.duration) && v.duration > 0) {
      const actualDur = Math.round(v.duration * 10) / 10;
      setDuration(actualDur);
      if (!activeProject.videoDuration) {
        updateProject({
          ...activeProject,
          videoDuration: actualDur,
          videoTrimEnd: actualDur,
        });
      }
    }
    if (trimStart > 0) {
      v.currentTime = trimStart;
    }
  };

  const handleSeek = (timeSec: number) => {
    const v = videoRef.current;
    const clampedTime = Math.max(0, Math.min(duration || 60, timeSec));
    setCurrentTime(clampedTime);
    if (v) {
      v.currentTime = clampedTime;
    }
  };

  const handleChangeSpeed = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const handleTrimCommit = async (nextStart: number, nextEnd: number) => {
    const clamped = clampVideoTrim(nextStart, nextEnd, duration || 60);
    setTrimStart(clamped.trimStart);
    setTrimEnd(clamped.trimEnd);
    await updateVideoTrim(clamped.trimStart, clamped.trimEnd);
    if (videoRef.current && videoRef.current.currentTime < clamped.trimStart) {
      videoRef.current.currentTime = clamped.trimStart;
    }
  };

  const handleAddChapterAtCurrent = async (e: React.FormEvent) => {
    e.preventDefault();
    const label = newChapterTitle.trim() || `Chapter ${chapters.length + 1}`;
    await addVideoChapter(currentTime, label);
    setNewChapterTitle('');
  };

  const handleDownloadWebm = async () => {
    if (!activeProject.videoPath) return;
    await api.exportVideoFile(activeProject.videoPath, activeProject.title || 'video_guide');
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-background">
      {/* 1. Left Sidebar: Video Chapters & Timestamps */}
      {!isLeftCollapsed ? (
        <aside className="w-72 border-r border-border bg-card flex flex-col z-10 select-none flex-shrink-0">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span className="font-semibold text-xs text-foreground">Video Chapters</span>
              <span className="px-1.5 py-0.2 rounded-full bg-secondary text-[11px] text-muted-foreground">
                {chapters.length}
              </span>
            </div>
            <button
              onClick={() => setIsLeftCollapsed(true)}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Collapse Chapters Sidebar"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add Chapter Form */}
          <form onSubmit={handleAddChapterAtCurrent} className="p-3 border-b border-border space-y-2">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Current Position</span>
              <span className="font-mono font-semibold text-primary tabular-nums">
                {formatVideoTimestamp(currentTime)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={newChapterTitle}
                onChange={(e) => setNewChapterTitle(e.target.value)}
                placeholder="Chapter title..."
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-secondary/60 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                title="Add Chapter at Current Timestamp"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </form>

          {/* Chapters List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {chapters.length === 0 ? (
              <div className="text-center py-8 px-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">No chapters yet</p>
                <p className="text-[11px]">
                  Scrub the video and add timestamped markers so viewers can jump to key moments.
                </p>
              </div>
            ) : (
              chapters.map((ch) => (
                <div
                  key={ch.id}
                  onClick={() => handleSeek(ch.timestamp)}
                  className="group flex items-center justify-between gap-2 p-2 rounded-lg border border-border/60 bg-secondary/30 hover:bg-secondary/70 hover:border-primary/40 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary font-mono text-[10px] font-semibold tabular-nums">
                      {formatVideoTimestamp(ch.timestamp)}
                    </span>
                    <input
                      type="text"
                      value={ch.title}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        updateVideoChapter({ ...ch, title: e.target.value })
                      }
                      className="bg-transparent text-xs font-medium text-foreground truncate focus:outline-none focus:bg-background focus:px-1 rounded flex-1 min-w-0"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteVideoChapter(ch.id);
                    }}
                    className="p-1 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete chapter"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>
      ) : (
        <div className="w-10 border-r border-border bg-card flex flex-col items-center py-3 z-10 flex-shrink-0 select-none">
          <button
            onClick={() => setIsLeftCollapsed(false)}
            className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
            title="Expand Chapters Sidebar"
          >
            <PanelLeftOpen className="w-4 h-4 text-primary" />
          </button>
        </div>
      )}

      {/* 2. Center Video Stage & Trim Controls */}
      <main className="flex-1 flex flex-col overflow-hidden bg-secondary/20">
        {/* Top Studio Toolbar */}
        <div className="h-12 border-b border-border bg-card px-4 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              <Video className="w-3.5 h-3.5" />
              <span>Video Guide Studio</span>
            </span>
            {activeProject.recordedMic && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-muted-foreground text-[11px]">
                <Mic className="w-3 h-3 text-emerald-500" />
                <span>Mic</span>
              </span>
            )}
            {activeProject.recordedSystemAudio && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-muted-foreground text-[11px]">
                <Volume2 className="w-3 h-3 text-primary" />
                <span>System Audio</span>
              </span>
            )}
            {activeProject.recordedWebcam && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-muted-foreground text-[11px]">
                <Camera className="w-3 h-3 text-amber-500" />
                <span>Webcam Bubble</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                startRecording({
                  scope: 'monitor',
                  hotspotVariant: 'spotlight',
                  recordingMode: 'video',
                  recordMic: activeProject.recordedMic !== false,
                  recordSystemAudio: Boolean(activeProject.recordedSystemAudio),
                  recordWebcam: Boolean(activeProject.recordedWebcam),
                })
              }
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-xs font-medium text-foreground transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Record New Video</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadWebm}
              disabled={!resolvedUrl}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-40 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save .webm</span>
            </button>
          </div>
        </div>

        {/* Video Viewport */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-hidden">
          {resolvedUrl ? (
            <div className="w-full max-w-4xl flex flex-col gap-4">
              <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-border shadow-2xl aspect-video flex items-center justify-center">
                <video
                  ref={videoRef}
                  src={resolvedUrl}
                  poster={activeProject.videoThumbnailUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  onClick={handleTogglePlay}
                  className="w-full h-full object-contain cursor-pointer"
                />
              </div>

              {/* Custom Transport & Trim Bar */}
              <div className="p-4 rounded-xl bg-card border border-border shadow-sm space-y-3 select-none">
                {/* Transport Row */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleTogglePlay}
                      className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
                      title={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4 fill-current" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const next = !isMuted;
                        setIsMuted(next);
                        if (videoRef.current) videoRef.current.muted = next;
                      }}
                      className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                      title={isMuted ? 'Unmute Player' : 'Mute Player'}
                    >
                      {isMuted ? (
                        <VolumeX className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>

                    <span className="text-xs font-mono font-semibold text-foreground tabular-nums">
                      {formatVideoTimestamp(currentTime)} / {formatVideoTimestamp(duration)}
                    </span>
                  </div>

                  {/* Scrubber */}
                  <input
                    type="range"
                    min={0}
                    max={Math.max(1, duration)}
                    step={0.1}
                    value={Math.min(currentTime, Math.max(1, duration))}
                    onChange={(e) => handleSeek(Number(e.target.value))}
                    className="flex-1 accent-primary cursor-pointer"
                  />

                  {/* Playback Speed */}
                  <div className="flex items-center gap-1">
                    {[1, 1.25, 1.5, 2].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => handleChangeSpeed(rate)}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                          playbackRate === rate
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Non-Destructive Trim Controls */}
                <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                    <Scissors className="w-3.5 h-3.5 text-primary" />
                    <span>Trim Clip Range:</span>
                  </div>

                  <div className="flex items-center gap-3 flex-1 max-w-md">
                    <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span>Start</span>
                      <input
                        type="number"
                        min={0}
                        max={Math.max(0, trimEnd - 0.5)}
                        step={0.5}
                        value={trimStart}
                        onChange={(e) => handleTrimCommit(Number(e.target.value), trimEnd)}
                        className="w-16 px-2 py-0.5 rounded bg-secondary border border-border text-foreground font-mono text-xs"
                      />
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span>End</span>
                      <input
                        type="number"
                        min={trimStart + 0.5}
                        max={Math.max(1, duration)}
                        step={0.5}
                        value={trimEnd}
                        onChange={(e) => handleTrimCommit(trimStart, Number(e.target.value))}
                        className="w-16 px-2 py-0.5 rounded bg-secondary border border-border text-foreground font-mono text-xs"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => handleTrimCommit(0, duration || 60)}
                      className="text-[11px] text-muted-foreground hover:text-foreground underline"
                    >
                      Reset Trim
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-3 max-w-sm">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
                <Video className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">No video recording loaded</h3>
              <p className="text-xs text-muted-foreground">
                Start a Video Guide recording to capture your screen, microphone narration, system audio, and webcam bubble.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* 3. Right Inspector: Guide Title & Notes */}
      {!isRightCollapsed ? (
        <aside className="w-80 border-l border-border bg-card flex flex-col z-10 flex-shrink-0">
          <div className="p-3 border-b border-border flex items-center justify-between select-none">
            <span className="font-semibold text-xs text-foreground">Video Guide Details</span>
            <button
              onClick={() => setIsRightCollapsed(true)}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Collapse Inspector"
            >
              <PanelRightClose className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Guide Title
              </label>
              <input
                type="text"
                value={titleInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setTitleInput(val);
                  updateProject({ ...activeProject, title: val, updatedAt: Date.now() });
                }}
                className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Summary & Written Notes
              </label>
              <WysiwygEditor
                content={activeProject.description || ''}
                onChange={(html) => {
                  updateProject({ ...activeProject, description: html, updatedAt: Date.now() });
                }}
              />
            </div>
          </div>
        </aside>
      ) : (
        <div className="w-10 border-l border-border bg-card flex flex-col items-center py-3 z-10 flex-shrink-0 select-none">
          <button
            onClick={() => setIsRightCollapsed(false)}
            className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
            title="Expand Inspector"
          >
            <PanelRightOpen className="w-4 h-4 text-primary" />
          </button>
        </div>
      )}
    </div>
  );
};
