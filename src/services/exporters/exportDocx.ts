import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun } from 'docx';
import { Project, Step, BrandingProfile } from '@/types';

/**
 * Strips XML 1.0 illegal control characters that cause Word to report
 * "Word found unreadable content in ...docx" and corrupt OpenXML parsing.
 */
function cleanXmlText(text: string | undefined | null): string {
  if (!text) return '';
  return text
    // Replace XML 1.0 invalid control characters: \x00-\x08, \x0B, \x0C, \x0E-\x1F, \x7F
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize newlines and whitespace
    .replace(/\r\n/g, '\n')
    .trim();
}

/**
 * Converts rich HTML instructions into clean plain text for Word runs,
 * unescaping common HTML entities.
 */
function htmlToPlainText(html: string | undefined | null): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Safely converts an image URL (data URI, file URL, or http) into a clean,
 * dedicated Uint8Array with byteOffset === 0 (avoiding Node Buffer pool slice corruption).
 */
async function urlToUint8Array(url: string): Promise<Uint8Array | null> {
  try {
    if (url.startsWith('data:')) {
      const commaIdx = url.indexOf(',');
      const base64 = commaIdx >= 0 ? url.slice(commaIdx + 1) : url;
      const binaryStr = atob(base64);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      return bytes;
    }

    if (url.startsWith('file://')) {
      const filePath = decodeURIComponent(url.replace(/^file:\/\/\/?/, ''));
      if (typeof window !== 'undefined' && (window as any).require) {
        try {
          const fs = (window as any).require('fs');
          const buf = fs.readFileSync(filePath);
          const bytes = new Uint8Array(buf.length);
          for (let i = 0; i < buf.length; i++) {
            bytes[i] = buf[i];
          }
          return bytes;
        } catch (e) {}
      }
    }

    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (err) {
    console.warn('Failed to convert image url to bytes:', err);
    return null;
  }
}

/**
 * Validates and formats 6-character hex color for OpenXML tags (e.g. "2563eb")
 */
function sanitizeHexColor(hex: string | undefined): string {
  if (!hex) return '2563eb';
  const clean = hex.replace('#', '').trim();
  return /^[0-9a-fA-F]{6}$/.test(clean) ? clean : '2563eb';
}

export async function generateDocx(
  project: Project,
  steps: Step[],
  branding: BrandingProfile
): Promise<Blob> {
  const sectionsContent: any[] = [];
  const primaryColor = sanitizeHexColor(branding.accentColor);
  const logoUrl = project.logoUrl || branding.logoUrl;

  // Custom Logo Embedding in Header
  if (logoUrl) {
    try {
      const logoBytes = await urlToUint8Array(logoUrl);
      if (logoBytes && logoBytes.length > 0) {
        sectionsContent.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: logoBytes,
                type: 'png',
                transformation: {
                  width: 140,
                  height: 45,
                },
              }),
            ],
            spacing: { after: 200 },
          })
        );
      }
    } catch (err) {
      console.warn('Failed to embed logo in docx:', err);
    }
  }

  // Title & Metadata
  sectionsContent.push(
    new Paragraph({
      text: cleanXmlText(project.title) || 'Standard Operating Procedure',
      heading: HeadingLevel.TITLE,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Version: ', bold: true }),
        new TextRun({ text: `${cleanXmlText(project.version || '1.0.0')}   |   ` }),
        new TextRun({ text: 'Author: ', bold: true }),
        new TextRun({ text: `${cleanXmlText(project.author || branding.author || 'Author')}   |   ` }),
        new TextRun({ text: 'Organization: ', bold: true }),
        new TextRun({ text: `${cleanXmlText(project.companyName || branding.companyName || 'Organization')}   |   ` }),
        new TextRun({ text: 'Date: ', bold: true }),
        new TextRun({ text: new Date(project.updatedAt || Date.now()).toLocaleDateString() }),
      ],
      spacing: { after: 300 },
    })
  );

  const cleanDesc = cleanXmlText(project.description);
  if (cleanDesc) {
    sectionsContent.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Overview: ', bold: true, italics: true }),
          new TextRun({ text: cleanDesc, italics: true }),
        ],
        spacing: { after: 300 },
      })
    );
  }

  // Chapter-based Table of Contents
  if (steps.length > 2) {
    sectionsContent.push(
      new Paragraph({
        text: 'Table of Contents',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 150 },
      })
    );

    let lastSection = '';
    for (const step of steps) {
      if (step.sectionTitle && step.sectionTitle !== lastSection) {
        lastSection = step.sectionTitle;
        sectionsContent.push(
          new Paragraph({
            children: [
              new TextRun({
                text: cleanXmlText(lastSection),
                bold: true,
                color: primaryColor,
                size: 22,
              }),
            ],
            spacing: { before: 140, after: 60 },
          })
        );
      }
      sectionsContent.push(
        new Paragraph({
          children: [
            new TextRun({ text: `    Step ${step.stepNumber}: `, bold: true, size: 20 }),
            new TextRun({ text: `${cleanXmlText(step.title || 'Untitled Step')}`, size: 20 }),
          ],
          spacing: { after: 50 },
        })
      );
    }

    sectionsContent.push(
      new Paragraph({
        text: '',
        spacing: { after: 300 },
      })
    );
  }

  // Procedure Heading
  sectionsContent.push(
    new Paragraph({
      text: 'Step-by-Step Procedure',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 200 },
    })
  );

  // Steps Loop
  for (const step of steps) {
    const cleanStepTitle = cleanXmlText(step.title) || `Step ${step.stepNumber}`;

    if (step.sectionTitle) {
      sectionsContent.push(
        new Paragraph({
          children: [
            new TextRun({
              text: cleanXmlText(step.sectionTitle),
              bold: true,
              size: 22,
              color: primaryColor,
            }),
          ],
          spacing: { before: 240, after: 100 },
        })
      );
    }

    // Step Heading
    sectionsContent.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Step ${step.stepNumber}: ${cleanStepTitle}`,
            bold: true,
            size: 26,
            color: primaryColor,
          }),
        ],
        spacing: { before: 200, after: 120 },
      })
    );

    // App & Action Info
    if (step.uiaAppName || step.actionType) {
      sectionsContent.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Action: ', bold: true, size: 18 }),
            new TextRun({ text: `${cleanXmlText(step.actionType.toUpperCase())} `, size: 18 }),
            new TextRun({ text: '  |  Target App: ', bold: true, size: 18 }),
            new TextRun({ text: `${cleanXmlText(step.uiaAppName || 'Application')}`, size: 18 }),
          ],
          spacing: { after: 140 },
        })
      );
    }

    // Step Instructions
    const plainInstructions = htmlToPlainText(step.richInstructions);
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

    // Embed Screenshot Image if valid
    if (step.screenshotPath) {
      try {
        const imageBytes = await urlToUint8Array(step.screenshotPath);
        if (imageBytes && imageBytes.length > 0) {
          sectionsContent.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: imageBytes,
                  type: 'png',
                  transformation: {
                    width: 580,
                    height: 326,
                  },
                }),
              ],
              spacing: { after: 400 },
            })
          );
        }
      } catch (err) {
        console.warn(`Failed to embed image for step ${step.stepNumber}:`, err);
      }
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Arial',
          },
        },
      },
    },
    sections: [
      {
        properties: {},
        children: sectionsContent,
      },
    ],
  });

  return await Packer.toBlob(doc);
}
