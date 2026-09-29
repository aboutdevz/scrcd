import pptxgen from 'pptxgenjs';
import { Project, Step, BrandingProfile } from '@/types';

export async function generatePptx(
  project: Project,
  steps: Step[],
  branding: BrandingProfile
): Promise<Blob> {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';

  const accent = branding.accentColor.replace('#', '') || '2563EB';

  // 1. Title Slide
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: '0F172A' }; // Dark theme slide

  // Accent bar
  titleSlide.addShape(pptx.ShapeType.rect, {
    x: 0.8,
    y: 1.5,
    w: 0.15,
    h: 3.5,
    fill: { color: accent },
  });

  // Title & Subtitle
  titleSlide.addText(project.title, {
    x: 1.2,
    y: 1.5,
    w: 11.5,
    h: 1.8,
    fontSize: 34,
    bold: true,
    color: 'FFFFFF',
    fontFace: 'Arial',
  });

  if (project.description) {
    titleSlide.addText(project.description, {
      x: 1.2,
      y: 3.2,
      w: 11.5,
      h: 1.0,
      fontSize: 16,
      color: '94A3B8',
      fontFace: 'Arial',
    });
  }

  // Footer Metadata
  titleSlide.addText(
    `${project.companyName || branding.companyName}  |  ${project.author || branding.author}  |  ${new Date(project.updatedAt).toLocaleDateString()}`,
    {
      x: 1.2,
      y: 5.5,
      w: 11.0,
      h: 0.5,
      fontSize: 13,
      color: '64748B',
      fontFace: 'Arial',
    }
  );

  // 2. Step Slides (16:9 Split layout)
  for (const step of steps) {
    const slide = pptx.addSlide();
    slide.background = { color: 'F8FAFC' };

    // Header bar
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.33,
      h: 0.8,
      fill: { color: '0F172A' },
    });

    slide.addText(`Step ${step.stepNumber} of ${steps.length}: ${step.title}`, {
      x: 0.8,
      y: 0.15,
      w: 11.5,
      h: 0.5,
      fontSize: 18,
      bold: true,
      color: 'FFFFFF',
      fontFace: 'Arial',
    });

    // Left Column: Instructions Card
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8,
      y: 1.2,
      w: 4.8,
      h: 5.5,
      fill: { color: 'FFFFFF' },
      line: { color: 'E2E8F0', width: 1 },
    });

    // Step Badge
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 1.1,
      y: 1.5,
      w: 1.4,
      h: 0.35,
      fill: { color: accent },
    });
    slide.addText(`STEP ${step.stepNumber}`, {
      x: 1.1,
      y: 1.5,
      w: 1.4,
      h: 0.35,
      fontSize: 11,
      bold: true,
      color: 'FFFFFF',
      align: 'center',
    });

    // App & Action Info
    slide.addText(
      `App: ${step.uiaAppName || 'Desktop'}\nAction: ${step.actionType.toUpperCase()}`,
      {
        x: 1.1,
        y: 2.1,
        w: 4.2,
        h: 0.8,
        fontSize: 13,
        bold: true,
        color: '334155',
      }
    );

    // Instructions
    const plainText = step.richInstructions
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    slide.addText(plainText || step.title, {
      x: 1.1,
      y: 3.0,
      w: 4.2,
      h: 3.2,
      fontSize: 14,
      color: '475569',
      valign: 'top',
    });

    // Right Column: Screenshot Image
    if (step.screenshotPath) {
      slide.addImage({
        data: step.screenshotPath,
        x: 5.8,
        y: 1.2,
        w: 6.8,
        h: 5.5,
        sizing: { type: 'contain', w: 6.8, h: 5.5 },
      });
    }
  }

  // Export to Blob
  const buffer = await pptx.write({ outputType: 'blob' });
  return buffer as Blob;
}
