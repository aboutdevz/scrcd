import React, { useEffect, useRef, useState } from 'react';
import { isElectron, getElectron } from '@/services/api';
import {
  Camera,
  Maximize2,
  Minimize2,
  CircleDot,
  Circle,
  FlipHorizontal,
  X,
} from 'lucide-react';

interface WebcamBubbleProps {
  isStandalone?: boolean;
  deviceId?: string;
}

export type WebcamSizeMode = 'small' | 'large' | 'fullscreen';

export const WebcamBubble: React.FC<WebcamBubbleProps> = ({
  isStandalone = false,
  deviceId,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hasStream, setHasStream] = useState(false);
  const [sizeMode, setSizeMode] = useState<WebcamSizeMode>('small');
  const [isMirrored, setIsMirrored] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let cancelled = false;

    const hashQuery = window.location.hash.includes('?')
      ? new URLSearchParams(window.location.hash.split('?')[1])
      : null;
    const resolvedDeviceId = deviceId || hashQuery?.get('deviceId') || undefined;

    const startCamera = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: resolvedDeviceId ? { exact: resolvedDeviceId } : undefined,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        activeStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setHasStream(true);
      } catch (err) {
        console.warn('WebcamBubble failed to acquire camera stream:', err);
        setHasStream(false);
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [deviceId]);

  const handleSetMode = async (nextMode: WebcamSizeMode) => {
    setSizeMode(nextMode);
    if (isElectron()) {
      const electron = getElectron();
      if (electron?.ipcRenderer) {
        await electron.ipcRenderer.invoke('set-webcam-window-mode', nextMode);
      }
    }
  };

  const handleClose = async () => {
    if (isElectron()) {
      const electron = getElectron();
      if (electron?.ipcRenderer) {
        await electron.ipcRenderer.invoke('close-webcam-window');
      }
    }
  };

  // Fullscreen Presenter Mode
  if (sizeMode === 'fullscreen') {
    return (
      <div
        style={{ WebkitAppRegion: isStandalone ? 'drag' : undefined } as React.CSSProperties}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="w-screen h-screen bg-slate-950 flex items-center justify-center relative select-none overflow-hidden"
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-transform duration-300 ${
            isMirrored ? '-scale-x-100' : 'scale-x-100'
          } ${hasStream ? 'opacity-100' : 'opacity-0'}`}
        />

        {!hasStream && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 bg-slate-950">
            <Camera className="w-12 h-12 text-primary mb-2" />
            <span className="text-sm font-medium">Connecting Camera...</span>
          </div>
        )}

        {/* Floating Presenter Controls Bar */}
        <div
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          className={`absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-2xl text-white transition-opacity duration-200 ${
            isHovered ? 'opacity-100' : 'opacity-70 hover:opacity-100'
          }`}
        >
          <button
            type="button"
            onClick={() => handleSetMode('small')}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Switch to Small Circular Bubble"
          >
            <CircleDot className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleSetMode('large')}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Switch to Large Circular Bubble"
          >
            <Circle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleSetMode('small')}
            className="p-1.5 rounded-full bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
            title="Exit Fullscreen Presenter Mode"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />
          <button
            type="button"
            onClick={() => setIsMirrored(!isMirrored)}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title={isMirrored ? 'Disable Mirror' : 'Enable Mirror'}
          >
            <FlipHorizontal className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-full hover:bg-red-500/20 text-slate-300 hover:text-red-400 transition-colors"
            title="Close Webcam"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Circular Bubble Modes (Small: 164x164, Large: 280x280)
  const wrapperClasses = isStandalone
    ? 'w-full h-full flex items-center justify-center p-1.5 select-none overflow-hidden bg-transparent'
    : sizeMode === 'large'
      ? 'fixed bottom-6 left-6 z-50 w-64 h-64 flex items-center justify-center select-none bg-transparent'
      : 'fixed bottom-6 left-6 z-50 w-36 h-36 flex items-center justify-center select-none bg-transparent';

  return (
    <div
      style={{ WebkitAppRegion: isStandalone ? 'drag' : undefined } as React.CSSProperties}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={wrapperClasses}
      title="Drag to reposition webcam bubble"
    >
      <div className="relative w-full h-full rounded-full overflow-hidden border-[3px] border-primary ring-2 ring-primary/30 shadow-2xl bg-slate-950 flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-transform duration-200 ${
            isMirrored ? '-scale-x-100' : 'scale-x-100'
          } ${hasStream ? 'opacity-100' : 'opacity-0'}`}
        />
        {!hasStream && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 bg-slate-900/95">
            <Camera className="w-8 h-8 text-primary mb-1" />
            <span className="text-[10px] font-medium">Camera</span>
          </div>
        )}

        {/* Hover Action Controls Overlay */}
        {isHovered && (
          <div
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-1 z-20 animate-in fade-in duration-150"
          >
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-lg text-white">
              <button
                type="button"
                onClick={() => handleSetMode(sizeMode === 'small' ? 'large' : 'small')}
                className="p-1 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                title={sizeMode === 'small' ? 'Enlarge Bubble' : 'Shrink Bubble'}
              >
                {sizeMode === 'small' ? (
                  <Circle className="w-3.5 h-3.5" />
                ) : (
                  <CircleDot className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => handleSetMode('fullscreen')}
                className="p-1 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                title="Fullscreen Presenter View"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsMirrored(!isMirrored)}
                className="p-1 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                title={isMirrored ? 'Disable Mirror' : 'Enable Mirror'}
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="p-1 rounded-full hover:bg-red-500/20 text-slate-300 hover:text-red-400 transition-colors"
                title="Close Webcam"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
