import {
  Step,
  HotspotShape,
  ArrowShape,
  RectShape,
  OvalShape,
  TextShape,
  HighlighterShape,
  BlurShape,
  RedactShape,
} from '@/types';

/**
 * Draws a Folge/CleanShot-style hotspot onto a 2D canvas context.
 */
function drawHotspot(ctx: CanvasRenderingContext2D, shape: HotspotShape, fallbackNumber: number) {
  const x = shape.x;
  const y = shape.y;
  const color = shape.color || '#f59e0b';
  const radius = shape.radius || 34;
  const isBadge = shape.variant === 'badge';

  ctx.save();

  // 1. Outer Glowing Spotlight Halo
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.fillStyle = `${color}44`; // ~27% translucent halo
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  if (isBadge) {
    // Numbered Badge Circle
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Badge Number Text
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${shape.number ?? fallbackNumber}`, x, y + 1);
    ctx.restore();
  } else {
    // Folge-style Crisp Pointer Cursor Icon pointing at (x, y)
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1.3, 1.3);

    // Drop shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    const shadowPath = new Path2D('M1.5 1.5 L1.5 17.5 L5.5 13.5 L8.5 20.5 L11 19.5 L8 12.5 L13 12.5 Z');
    ctx.fill(shadowPath);
    ctx.restore();

    // Main white cursor with dark slate outline
    const pointerPath = new Path2D('M0 0 L0 16 L4 12 L7 19 L9.5 18 L6.5 11 L11.5 11 Z');
    ctx.fillStyle = '#ffffff';
    ctx.fill(pointerPath);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.3;
    ctx.lineJoin = 'round';
    ctx.stroke(pointerPath);

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Draws arrow annotation with arrowhead.
 */
function drawArrow(ctx: CanvasRenderingContext2D, shape: ArrowShape) {
  const [x1, y1, x2, y2] = shape.points;
  const color = shape.color || '#2563eb';
  const strokeWidth = shape.strokeWidth || 3;
  const headLength = 16;
  const angle = Math.atan2(y2 - y1, x2 - x1);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2 - headLength * Math.cos(angle) * 0.5, y2 - headLength * Math.sin(angle) * 0.5);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headLength * Math.cos(angle - Math.PI / 6),
    y2 - headLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    x2 - headLength * Math.cos(angle + Math.PI / 6),
    y2 - headLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Draws rectangle annotation.
 */
function drawRect(ctx: CanvasRenderingContext2D, shape: RectShape) {
  ctx.save();
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(shape.x, shape.y, shape.width, shape.height, 4);
  } else {
    ctx.rect(shape.x, shape.y, shape.width, shape.height);
  }
  if (shape.fillColor && shape.fillColor !== 'transparent') {
    ctx.fillStyle = shape.fillColor;
    ctx.fill();
  }
  ctx.strokeStyle = shape.strokeColor || '#2563eb';
  ctx.lineWidth = shape.strokeWidth || 3;
  ctx.stroke();
  ctx.restore();
}

/**
 * Draws oval annotation.
 */
function drawOval(ctx: CanvasRenderingContext2D, shape: OvalShape) {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(shape.x, shape.y, Math.abs(shape.radiusX), Math.abs(shape.radiusY), 0, 0, Math.PI * 2);
  if (shape.fillColor && shape.fillColor !== 'transparent') {
    ctx.fillStyle = shape.fillColor;
    ctx.fill();
  }
  ctx.strokeStyle = shape.strokeColor || '#2563eb';
  ctx.lineWidth = shape.strokeWidth || 3;
  ctx.stroke();
  ctx.restore();
}

/**
 * Draws text annotation with background pill.
 */
function drawText(ctx: CanvasRenderingContext2D, shape: TextShape) {
  ctx.save();
  const fontSize = shape.fontSize || 14;
  ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  const metrics = ctx.measureText(shape.text);
  const paddingX = 10;
  const paddingY = 8;
  const w = metrics.width + paddingX * 2;
  const h = fontSize + paddingY * 2;

  // Background pill
  ctx.fillStyle = shape.backgroundColor || 'rgba(15, 23, 42, 0.9)';
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(shape.x, shape.y, w, h, 6);
  } else {
    ctx.rect(shape.x, shape.y, w, h);
  }
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Text
  ctx.fillStyle = shape.color || '#ffffff';
  ctx.textBaseline = 'top';
  ctx.fillText(shape.text, shape.x + paddingX, shape.y + paddingY);
  ctx.restore();
}

/**
 * Draws highlighter stroke.
 */
function drawHighlighter(ctx: CanvasRenderingContext2D, shape: HighlighterShape) {
  if (!shape.points || shape.points.length < 4) return;
  ctx.save();
  ctx.beginPath();
  ctx.strokeStyle = shape.color || '#facc15';
  ctx.lineWidth = shape.strokeWidth || 14;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = 0.45;
  ctx.moveTo(shape.points[0], shape.points[1]);
  for (let i = 2; i < shape.points.length; i += 2) {
    ctx.lineTo(shape.points[i], shape.points[i + 1]);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * Heavy privacy blur: authentic pixelated mosaic + frosted tint.
 * Converts text into completely illegible pixel blocks.
 */
function drawBlur(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, shape: BlurShape) {
  const x = Math.max(0, Math.min(shape.x, canvas.width - 1));
  const y = Math.max(0, Math.min(shape.y, canvas.height - 1));
  const w = Math.max(1, Math.min(shape.width, canvas.width - x));
  const h = Math.max(1, Math.min(shape.height, canvas.height - y));

  // Mosaic block size: heavy pixelation (12-18px)
  const blockSize = Math.max(12, Math.round(Math.min(w, h) / 5));
  const tw = Math.max(2, Math.floor(w / blockSize));
  const th = Math.max(2, Math.floor(h / blockSize));

  const tiny = document.createElement('canvas');
  tiny.width = tw;
  tiny.height = th;
  const tctx = tiny.getContext('2d');
  if (!tctx) return;

  tctx.drawImage(canvas, x, y, w, h, 0, 0, tw, th);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tiny, 0, 0, tw, th, x, y, w, h);

  // Frosted privacy overlay
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/**
 * Solid black redact.
 */
function drawRedact(ctx: CanvasRenderingContext2D, shape: RedactShape) {
  ctx.save();
  ctx.fillStyle = shape.fillColor || '#000000';
  ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
  ctx.restore();
}

/**
 * Composites the base screenshot and all annotations (hotspots, arrows, blurs, etc.)
 * into a single flattened base64 PNG data URL.
 */
export async function bakeStepImage(step: Step): Promise<string> {
  if (!step.screenshotPath) return '';

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(step.screenshotPath);
        }

        // 1. Draw base screenshot
        ctx.drawImage(img, 0, 0);

        // 2. Blurs and Redactions (applied directly to screenshot pixels)
        const blursAndRedacts = (step.annotations || []).filter(
          (a) => a.type === 'blur' || a.type === 'redact'
        );
        for (const shape of blursAndRedacts) {
          if (shape.type === 'blur') drawBlur(ctx, canvas, shape as BlurShape);
          else if (shape.type === 'redact') drawRedact(ctx, shape as RedactShape);
        }

        // 3. Markings & Shapes: highlighters, rects, ovals, arrows, text
        const otherShapes = (step.annotations || []).filter(
          (a) => a.type !== 'blur' && a.type !== 'redact' && a.type !== 'hotspot'
        );
        for (const shape of otherShapes) {
          if (shape.type === 'highlighter') drawHighlighter(ctx, shape as HighlighterShape);
          else if (shape.type === 'rect') drawRect(ctx, shape as RectShape);
          else if (shape.type === 'oval') drawOval(ctx, shape as OvalShape);
          else if (shape.type === 'arrow') drawArrow(ctx, shape as ArrowShape);
          else if (shape.type === 'text') drawText(ctx, shape as TextShape);
        }

        // 4. Hotspots (Click indicator with spotlight halo & pointer cursor or badge)
        const hotspots = (step.annotations || []).filter((a) => a.type === 'hotspot') as HotspotShape[];
        if (hotspots.length > 0) {
          for (const hs of hotspots) {
            drawHotspot(ctx, hs, step.stepNumber);
          }
        } else if (step.clickX > 0 || step.clickY > 0) {
          // Fallback if step recorded a click but annotations array didn't have hotspot
          drawHotspot(
            ctx,
            {
              id: `hs_${step.id}`,
              type: 'hotspot',
              x: step.clickX,
              y: step.clickY,
              number: step.stepNumber,
              color: '#f59e0b',
              variant: 'spotlight',
              radius: 34,
            },
            step.stepNumber
          );
        }

        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        console.warn('Failed to composite step image:', err);
        resolve(step.screenshotPath);
      }
    };
    img.onerror = () => {
      resolve(step.screenshotPath);
    };
    img.src = step.screenshotPath;
  });
}

/**
 * Bakes an array of steps concurrently, returning a new array of steps with baked screenshotPaths.
 */
export async function bakeStepsForExport(steps: Step[]): Promise<Step[]> {
  return await Promise.all(
    steps.map(async (step) => {
      try {
        const bakedScreenshot = await bakeStepImage(step);
        return {
          ...step,
          screenshotPath: bakedScreenshot,
        };
      } catch (err) {
        console.warn(`Failed to bake image for step ${step.stepNumber}:`, err);
        return step;
      }
    })
  );
}
