import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } from 'docx';
import { Project, Step, BrandingProfile } from '@/types';

async function urlToUint8Array(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

export async function generateDocx(
  project: Project,
  steps: Step[],
  branding: BrandingProfile
): Promise<Blob> {
  const sectionsContent: any[] = [];

  // Title & Metadata
  sectionsContent.push(
    new Paragraph({
      text: project.title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Author: `, bold: true }),
        new TextRun({ text: `${project.author || branding.author}  |  ` }),
        new TextRun({ text: `Organization: `, bold: true }),
        new TextRun({ text: `${project.companyName || branding.companyName}  |  ` }),
        new TextRun({ text: `Date: `, bold: true }),
        new TextRun({ text: new Date(project.updatedAt).toLocaleDateString() }),
      ],
      spacing: { after: 300 },
    })
  );

  if (project.description) {
    sectionsContent.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Overview: ', bold: true, italics: true }),
          new TextRun({ text: project.description, italics: true }),
        ],
        spacing: { after: 400 },
      })
    );
  }

  // Divider
  sectionsContent.push(
    new Paragraph({
      text: 'Step-by-Step Procedure',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 200 },
    })
  );

  // Steps
  for (const step of steps) {
    // Step Heading
    sectionsContent.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Step ${step.stepNumber}: ${step.title}`,
            bold: true,
            size: 26,
            color: branding.accentColor.replace('#', ''),
          }),
        ],
        spacing: { before: 300, after: 120 },
      })
    );

    // App & Action Info
    if (step.uiaAppName || step.actionType) {
      sectionsContent.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Action: `, bold: true, size: 18 }),
            new TextRun({ text: `${step.actionType.toUpperCase()} `, size: 18 }),
            new TextRun({ text: `  |  Target App: `, bold: true, size: 18 }),
            new TextRun({ text: `${step.uiaAppName || 'Desktop'}`, size: 18 }),
          ],
          spacing: { after: 140 },
        })
      );
    }

    // Step Instructions (strip HTML tags for DOCX paragraph)
    const plainInstructions = step.richInstructions
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (plainInstructions) {
      sectionsContent.push(
        new Paragraph({
          children: [
            new TextRun({
              text: plainInstructions,
              size: 22,
            }),
          ],
          spacing: { after: 200 },
        })
      );
    }

    // Embed Screenshot Image
    try {
      if (step.screenshotPath) {
        const imageBytes = await urlToUint8Array(step.screenshotPath);
        sectionsContent.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: imageBytes,
                transformation: {
                  width: 580,
                  height: 326,
                },
              } as any),
            ],
            spacing: { after: 400 },
          })
        );
      }
    } catch (err) {
      console.warn(`Failed to embed image for step ${step.stepNumber}:`, err);
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: sectionsContent,
      },
    ],
  });

  return await Packer.toBlob(doc);
}
