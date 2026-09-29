import * as gifencModule from 'gifenc';
import { Step } from '@/types';

const GIFEncoder = (gifencModule as any).GIFEncoder || (gifencModule as any).default?.GIFEncoder;
const quantize = (gifencModule as any).quantize || (gifencModule as any).default?.quantize;
const applyPalette = (gifencModule as any).applyPalette || (gifencModule as any).default?.applyPalette;

export interface GifExportOptions {
  durationPerStepSec?: number;
  width?: number;
  height?: number;
  onProgress?: (percent: number) => void;
}

/**
 * Preload all step screenshot images into HTMLImageElements
 */
async function preloadImages(steps: Step[]): Promise<HTMLImageElement[]> {
  const loaded: HTMLImageElement[] = [];
  for (const step of steps) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    if (step.screenshotPath) {
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = step.screenshotPath;
      });
    }
    loaded.push(img);
  }
  return loaded;
}

/**
 * Generates an authentic animated GIF (.gif) using gifenc with click ripple animations
 * and progress tracking.
 */
export async function generateAnimatedGif(
  steps: Step[],
  options: GifExportOptions = {}
): Promise<Blob> {
  const {
    durationPerStepSec = 1.5,
    width = 800,
    height = 450,
    onProgress,
  } = options;

  if (steps.length === 0) {
    throw new Error('No steps to generate animated GIF');
  }

  const loadedImages = await preloadImages(steps);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get 2D canvas context');

  const gif = GIFEncoder();

  // Frames per step for GIF (5 fps is sweet spot for smooth ripple + compact file size)
  const fps = 5;
  const framesPerStep = Math.max(3, Math.round(durationPerStepSec * fps));
  const delayMs = Math.round(1000 / fps);
  const totalFrames = steps.length * framesPerStep;

  let frameCount = 0;

  for (let s = 0; s < steps.length; s++) {
    const step = steps[s];
    const img = loadedImages[s];

    // Compute letterboxed contain coordinates for screenshot
    let drawX = 0;
    let drawY = 0;
    let drawW = width;
    let drawH = height;

    if (img && img.width > 0 && img.height > 0) {
      const scale = Math.min(width / img.width, height / img.height);
      drawW = Math.round(img.width * scale);
      drawH = Math.round(img.height * scale);
      drawX = Math.round((width - drawW) / 2);
      drawY = Math.round((height - drawH) / 2);
    }

    for (let f = 0; f < framesPerStep; f++) {
      // 1. Background slate fill
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      // 2. Draw Screenshot (contain)
      if (img && img.width > 0) {
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
      }

      // 3. Top Translucent Header Banner
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, width, 44);

      // Step Number Pill
      ctx.fillStyle = '#2563eb';
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(14, 10, 68, 24, 6);
        ctx.fill();
      } else {
        ctx.fillRect(14, 10, 68, 24);
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`STEP ${step.stepNumber}`, 48, 22);

      // Step Title Text
      ctx.textAlign = 'start';
      ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const maxTitleWidth = width - 180;
      let displayTitle = step.title;
      if (ctx.measureText(displayTitle).width > maxTitleWidth) {
        while (displayTitle.length > 5 && ctx.measureText(displayTitle + '...').width > maxTitleWidth) {
          displayTitle = displayTitle.slice(0, -1);
        }
        displayTitle += '...';
      }
      ctx.fillText(displayTitle, 92, 22);

      // Step counter on right
      ctx.textAlign = 'right';
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`${step.stepNumber} / ${steps.length}`, width - 16, 22);

      // 4. Click Hotspot Ripple Animation
      if (step.clickX > 0 && step.clickY > 0 && step.originalWidth > 0 && step.originalHeight > 0) {
        const normX = drawX + (step.clickX / step.originalWidth) * drawW;
        const normY = drawY + (step.clickY / step.originalHeight) * drawH;

        const progress = f / framesPerStep;
        const rippleRadius = 12 + progress * 24;
        const rippleAlpha = Math.max(0, 1 - progress);

        // Outer expanding pulsating halo
        ctx.save();
        ctx.strokeStyle = `rgba(37, 99, 235, ${rippleAlpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(normX, normY, rippleRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Glowing center badge
        ctx.shadowColor = '#2563eb';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#2563eb';
        ctx.beginPath();
        ctx.arc(normX, normY, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        // Badge number
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${step.stepNumber}`, normX, normY + 0.5);
      }

      // 5. Extract frame pixels and write to GIF
      const imageData = ctx.getImageData(0, 0, width, height);
      const rgba = imageData.data;
      const palette = quantize(rgba, 256);
      const index = applyPalette(rgba, palette);
      gif.writeFrame(index, width, height, { palette, delay: delayMs });

      frameCount++;
      if (onProgress) {
        onProgress(Math.round((frameCount / totalFrames) * 100));
      }

      // Yield event loop slightly every 3 frames to avoid freezing the UI
      if (frameCount % 3 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }
  }

  gif.finish();
  const bytes = gif.bytes();
  return new Blob([bytes], { type: 'image/gif' });
}

/**
 * Client-side video slideshow recorder using MediaRecorder (WebM)
 */
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

  const loadedImages = await preloadImages(steps);

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

  const fps = 30;
  const totalFramesPerStep = Math.round(durationPerStepSec * fps);

  for (let s = 0; s < steps.length; s++) {
    const step = steps[s];
    const img = loadedImages[s];

    let drawX = 0;
    let drawY = 0;
    let drawW = width;
    let drawH = height;

    if (img && img.width > 0 && img.height > 0) {
      const scale = Math.min(width / img.width, height / img.height);
      drawW = Math.round(img.width * scale);
      drawH = Math.round(img.height * scale);
      drawX = Math.round((width - drawW) / 2);
      drawY = Math.round((height - drawH) / 2);
    }

    for (let f = 0; f < totalFramesPerStep; f++) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      if (img && img.width > 0) {
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
      }

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, width, 50);

      ctx.fillStyle = '#ffffff';
      ctx.font = '600 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`Step ${step.stepNumber}: ${step.title}`, 20, 32);

      if (step.clickX && step.clickY && step.originalWidth && step.originalHeight) {
        const normX = drawX + (step.clickX / step.originalWidth) * drawW;
        const normY = drawY + (step.clickY / step.originalHeight) * drawH;

        const progress = f / totalFramesPerStep;
        const radius = 10 + progress * 25;
        const alpha = Math.max(0, 1 - progress);

        ctx.strokeStyle = `rgba(37, 99, 235, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(normX, normY, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#2563eb';
        ctx.beginPath();
        ctx.arc(normX, normY, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
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
