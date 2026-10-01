import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { Logo } from '@/components/common/Logo';
import { APP_VERSION } from '@/config/version';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(30);
  const [statusText, setStatusText] = useState('Initializing application...');
  const [isFadingOut, setIsFadingOut] = useState(false);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    let isMounted = true;

    const initializeApp = async () => {
      try {
        if (!isMounted) return;
        setStatusText('Loading workspace...');
        setProgress(70);

        // Fast parallel hydration from local storage
        await Promise.all([
          useStore.getState().loadFolders(),
          useStore.getState().loadCategories(),
          useStore.getState().loadProjects(),
        ]);

        if (!isMounted) return;
        setProgress(100);
        setStatusText('Workspace ready');

        // Snappy fadeout transition
        setIsFadingOut(true);
        setTimeout(() => {
          if (isMounted) {
            onCompleteRef.current();
          }
        }, 150);
      } catch (err) {
        console.warn('Initialization error in splash screen:', err);
        if (isMounted) {
          setIsFadingOut(true);
          setTimeout(() => onCompleteRef.current(), 100);
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
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background select-none transition-opacity duration-150 ease-out ${
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
