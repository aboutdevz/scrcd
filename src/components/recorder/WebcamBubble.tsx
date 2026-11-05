import React, { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';

interface WebcamBubbleProps {
  isStandalone?: boolean;
  deviceId?: string;
}

export const WebcamBubble: React.FC<WebcamBubbleProps> = ({
  isStandalone = false,
  deviceId,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hasStream, setHasStream] = useState(false);

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
            width: { ideal: 320 },
            height: { ideal: 320 },
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

  const wrapperClasses = isStandalone
    ? 'w-full h-full flex items-center justify-center p-1 select-none overflow-hidden'
    : 'fixed bottom-6 left-6 z-50 w-36 h-36 flex items-center justify-center select-none';

  return (
    <div
      style={{ WebkitAppRegion: isStandalone ? 'drag' : undefined } as React.CSSProperties}
      className={wrapperClasses}
      title="Drag to reposition webcam bubble"
    >
      <div className="relative w-36 h-36 rounded-full overflow-hidden border-[3px] border-primary shadow-2xl bg-slate-900 flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover -scale-x-100 ${hasStream ? 'opacity-100' : 'opacity-0'}`}
        />
        {!hasStream && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 bg-slate-900/95">
            <Camera className="w-8 h-8 text-primary mb-1" />
            <span className="text-[10px] font-medium">Camera</span>
          </div>
        )}
      </div>
    </div>
  );
};
