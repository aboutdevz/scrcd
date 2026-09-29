import pptxgen from 'pptxgenjs';
import { Project, Step, BrandingProfile } from '@/types';

export async function generatePptx(
  project: Project,
  steps: Step[],
  branding: BrandingProfile
): Promise<Blob> {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 inches widescreen

  const accent = branding.accentColor ? branding.accentColor.replace('#', '') : '2563EB';

  // 1. Title Slide
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: '0F172A' }; // Dark slate

  // Left accent bar
  titleSlide.addShape(pptx.ShapeType.roundRect, {
    x: 1.0,
    y: 1.8,
    w: 0.16,
    h: 3.8,
    fill: { color: accent },
    line: { color: accent, width: 0 },
  });

  // Title
  titleSlide.addText(project.title, {
    x: 1.4,
    y: 1.8,
    w: 10.8,
    h: 1.6,
    fontSize: 34,
    bold: true,
    color: 'FFFFFF',
    fontFace: 'Segoe UI',
    valign: 'middle',
  });

  if (project.description) {
    titleSlide.addText(project.description, {
      x: 1.4,
      y: 3.5,
      w: 10.8,
      h: 1.2,
      fontSize: 16,
      color: '94A3B8',
      fontFace: 'Segoe UI',
    });
  }

  // Footer Metadata
  titleSlide.addText(
    `${project.companyName || branding.companyName}   |   ${project.author || branding.author}   |   ${new Date(project.updatedAt).toLocaleDateString()}`,
    {
      x: 1.4,
      y: 5.6,
      w: 10.8,
      h: 0.5,
      fontSize: 13,
      color: '64748B',
      fontFace: 'Segoe UI',
    }
  );

  // 2. Step Slides (Modern 16:9 Split layout)
  for (const step of steps) {
    const slide = pptx.addSlide();
    slide.background = { color: 'F1F5F9' }; // Clean neutral background

    // Sleek Dark Top Header Bar
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.33,
      h: 0.85,
      fill: { color: '0F172A' },
      line: { color: '0F172A', width: 0 },
    });

    // Step Number Badge on Header
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.6,
      y: 0.22,
      w: 1.5,
      h: 0.42,
      fill: { color: accent },
      line: { color: accent, width: 0 },
    });
    slide.addText(`STEP ${step.stepNumber}`, {
      x: 0.6,
      y: 0.22,
      w: 1.5,
      h: 0.42,
      fontSize: 11,
      bold: true,
      color: 'FFFFFF',
      fontFace: 'Segoe UI',
      align: 'center',
      valign: 'middle',
    });

    // Step Title in Header Bar
    slide.addText(step.title, {
      x: 2.3,
      y: 0.15,
      w: 9.0,
      h: 0.55,
      fontSize: 16,
      bold: true,
      color: 'FFFFFF',
      fontFace: 'Segoe UI',
      valign: 'middle',
    });

    // Progress counter in Header
    slide.addText(`${step.stepNumber} of ${steps.length}`, {
      x: 11.4,
      y: 0.15,
      w: 1.4,
      h: 0.55,
      fontSize: 12,
      color: '94A3B8',
      fontFace: 'Segoe UI',
      align: 'right',
      valign: 'middle',
    });

    // Left Column: Instructions Card Container
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.6,
      y: 1.15,
      w: 3.8,
      h: 5.9,
      fill: { color: 'FFFFFF' },
      line: { color: 'CBD5E1', width: 1 },
    });

    // App & Action Pill Badges inside card
    slide.addText(`Target App:`, {
      x: 0.85,
      y: 1.4,
      w: 1.1,
      h: 0.35,
      fontSize: 11,
      bold: true,
      color: '64748B',
      fontFace: 'Segoe UI',
    });
    slide.addText(`${step.uiaAppName || 'Application'}`, {
      x: 1.95,
      y: 1.4,
      w: 2.2,
      h: 0.35,
      fontSize: 11,
      bold: true,
      color: '0F172A',
      fontFace: 'Segoe UI',
    });

    slide.addText(`Action:`, {
      x: 0.85,
      y: 1.8,
      w: 1.1,
      h: 0.35,
      fontSize: 11,
      bold: true,
      color: '64748B',
      fontFace: 'Segoe UI',
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 1.95,
      y: 1.8,
      w: 1.2,
      h: 0.32,
      fill: { color: 'E2E8F0' },
      line: { color: 'CBD5E1', width: 0.5 },
    });
    slide.addText(`${step.actionType.toUpperCase()}`, {
      x: 1.95,
      y: 1.8,
      w: 1.2,
      h: 0.32,
      fontSize: 10,
      bold: true,
      color: '334155',
      fontFace: 'Segoe UI',
      align: 'center',
      valign: 'middle',
    });

    // Divider Line inside Card
    slide.addShape(pptx.ShapeType.line, {
      x: 0.85,
      y: 2.3,
      w: 3.3,
      h: 0,
      line: { color: 'E2E8F0', width: 1 },
    });

    // Instruction Text inside Card
    const plainText = step.richInstructions
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    slide.addText(plainText || step.title, {
      x: 0.85,
      y: 2.5,
      w: 3.3,
      h: 4.3,
      fontSize: 13,
      color: '334155',
      fontFace: 'Segoe UI',
      valign: 'top',
    });

    // Right Column: High-Resolution Screenshot Container
    if (step.screenshotPath) {
      // Dark border frame for screenshot
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 4.65,
        y: 1.15,
        w: 8.08,
        h: 5.9,
        fill: { color: '0F172A' },
        line: { color: 'CBD5E1', width: 1 },
      });

      slide.addImage({
        data: step.screenshotPath,
        x: 4.75,
        y: 1.25,
        w: 7.88,
        h: 5.7,
        sizing: { type: 'contain', w: 7.88, h: 5.7 },
      });
    }
  }

  // Export to Blob
  const buffer = await pptx.write({ outputType: 'blob' });
  return buffer as Blob;
}
