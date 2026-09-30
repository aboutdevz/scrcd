import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { api } from '@/services/api';
import { Logo } from '@/components/common/Logo';
import { APP_VERSION } from '@/config/version';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(15);
  const [statusText, setStatusText] = useState('Initializing application runtime...');
  const [isFadingOut, setIsFadingOut] = useState(false);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    let isMounted = true;
    const startTime = Date.now();

    const initializeApp = async () => {
      try {
        // Step 1: Storage & Folder Hydration
        if (!isMounted) return;
        setStatusText('Connecting local storage and folders...');
        setProgress(35);
        await useStore.getState().loadFolders();

        await new Promise((r) => setTimeout(r, 120));

        // Step 2: Native Bridge & Capture Sources Verification
        if (!isMounted) return;
        setStatusText('Verifying desktop capture engine...');
        setProgress(65);
        try {
          await api.getCaptureSources();
        } catch (e) {
          console.warn('Capture sources check warning:', e);
        }

        await new Promise((r) => setTimeout(r, 120));

        // Step 3: Load Guides & Projects
        if (!isMounted) return;
        setStatusText('Loading guides and procedures...');
        setProgress(90);
        await useStore.getState().loadProjects();

        // Step 4: Ready
        if (!isMounted) return;
        setStatusText('Workspace ready');
        setProgress(100);

        // Smooth minimum visible duration (~750ms) to ensure readable progress without screen flicker
        const elapsed = Date.now() - startTime;
        const remainingDelay = Math.max(0, 750 - elapsed);
        await new Promise((r) => setTimeout(r, remainingDelay));

        if (!isMounted) return;
        setIsFadingOut(true);

        setTimeout(() => {
          if (isMounted) {
            onCompleteRef.current();
          }
        }, 350);
      } catch (err) {
        console.warn('Initialization error in splash screen:', err);
        if (isMounted) {
          setIsFadingOut(true);
          setTimeout(() => onCompleteRef.current(), 200);
        }
      }
    };

    initializeApp();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background select-none transition-opacity duration-350 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="w-full max-w-sm px-6 flex flex-col items-center text-center space-y-6">
        {/* Brand Logo with ambient glow */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-20 h-20 bg-primary/20 rounded-full blur-xl animate-pulse" />
          <div className="relative z-10 p-3 rounded-2xl bg-card border border-border shadow-md">
            <Logo size="lg" />
          </div>
        </div>

        {/* Title & Version */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">SCRCD</h1>
          <p className="text-xs font-medium text-muted-foreground">
            Step-by-Step SOP & Guide Creator
          </p>
          <div className="pt-1">
            <span className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
              v{APP_VERSION} • Desktop Edition
            </span>
          </div>
        </div>

        {/* Functional Progress Loader */}
        <div className="w-full space-y-2 pt-4">
          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden border border-border/50">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground px-0.5">
            <span className="truncate">{statusText}</span>
            <span className="font-mono text-[10px] font-medium ml-2">{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
