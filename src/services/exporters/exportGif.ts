import { Step } from '@/types';

// Client-side animated slideshow recorder using HTML5 Canvas & MediaRecorder
export async function generateAnimatedWalkthrough(
  steps: Step[],
  durationPerStepSec = 1.5,
  width = 960,
  height = 540
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Preload images
  const loadedImages: HTMLImageElement[] = [];
  for (const step of steps) {
    if (step.screenshotPath) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = step.screenshotPath;
      });
      loadedImages.push(img);
    }
  }

  if (loadedImages.length === 0) {
    throw new Error('No valid step images found to animate');
  }

  // Use MediaRecorder on canvas stream
  const stream = canvas.captureStream(30);
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm',
  });

  const chunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const recordingPromise = new Promise<Blob>((resolve) => {
    mediaRecorder.onstop = () => {
      resolve(new Blob(chunks, { type: 'video/webm' }));
    };
  });

  mediaRecorder.start();

  // Play animation loop
  const fps = 30;
  const totalFramesPerStep = Math.round(durationPerStepSec * fps);

  for (let s = 0; s < steps.length; s++) {
    const step = steps[s];
    const img = loadedImages[s];

    for (let f = 0; f < totalFramesPerStep; f++) {
      // Clear
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      // Draw Screenshot
      if (img && img.width > 0) {
        ctx.drawImage(img, 0, 0, width, height);
      }

      // Step Banner Overlay
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, width, 54);

      ctx.fillStyle = '#ffffff';
      ctx.font = '600 16px Inter, sans-serif';
      ctx.fillText(`Step ${step.stepNumber}: ${step.title}`, 20, 34);

      // Click ripple animation
      if (step.clickX && step.clickY) {
        const normX = (step.clickX / step.originalWidth) * width;
        const normY = (step.clickY / step.originalHeight) * height;

        const progress = f / totalFramesPerStep;
        const radius = 10 + progress * 25;
        const alpha = Math.max(0, 1 - progress);

        // Ripple ring
        ctx.strokeStyle = `rgba(37, 99, 235, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(normX, normY, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Hotspot badge center
        ctx.fillStyle = '#2563eb';
        ctx.beginPath();
        ctx.arc(normX, normY, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${step.stepNumber}`, normX, normY);
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
      }

      await new Promise((r) => setTimeout(r, 1000 / fps));
    }
  }

  mediaRecorder.stop();
  return await recordingPromise;
}
