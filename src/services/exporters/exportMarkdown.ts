import JSZip from 'jszip';
import { Project, Step, BrandingProfile } from '@/types';

async function urlToBlob(url: string): Promise<Blob> {
  if (url.startsWith('data:')) {
    const parts = url.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const binary = atob(parts[1]);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return new Blob([array], { type: mime });
  }
  const res = await fetch(url);
  return await res.blob();
}

export function generateMarkdownText(
  project: Project,
  steps: Step[],
  branding: BrandingProfile
): string {
  const logoUrl = project.logoUrl || branding.logoUrl;
  let md = '';

  if (logoUrl) {
    md += `![Organization Logo](./images/logo.png)\n\n`;
  }

  md += `# ${project.title}\n\n`;

  if (project.description) {
    md += `> ${project.description}\n\n`;
  }

  md += `**Version**: ${project.version || '1.0.0'}  \n`;
  md += `**Author**: ${project.author || branding.author}  \n`;
  md += `**Organization**: ${project.companyName || branding.companyName}  \n`;
  md += `**Date**: ${new Date(project.updatedAt).toLocaleDateString()}  \n\n`;
  md += `---\n\n`;

  // Chapter-based Table of Contents
  if (steps.length > 2) {
    md += `## Table of Contents\n\n`;
    let lastSection = '';
    for (const step of steps) {
      if (step.sectionTitle && step.sectionTitle !== lastSection) {
        lastSection = step.sectionTitle;
        md += `- **${lastSection}**\n`;
      }
      const indent = lastSection ? '  ' : '';
      md += `${indent}- [Step ${step.stepNumber}: ${step.title}](#step-${step.stepNumber})\n`;
    }
    md += `\n---\n\n`;
  }

  md += `## Step-by-Step Instructions\n\n`;

  for (const step of steps) {
    if (step.sectionTitle) {
      md += `### ${step.sectionTitle}\n\n`;
    }

    md += `<a id="step-${step.stepNumber}"></a>\n`;
    md += `#### Step ${step.stepNumber}: ${step.title}\n\n`;
    md += `- **Application**: ${step.uiaAppName || 'Application'}\n`;
    md += `- **Action**: \`${step.actionType.toUpperCase()}\`\n\n`;

    const plainInstructions = step.richInstructions
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (plainInstructions) {
      md += `${plainInstructions}\n\n`;
    }

    if (step.screenshotPath) {
      md += `![Step ${step.stepNumber}](./images/step-${step.stepNumber}.png)\n\n`;
    }

    md += `---\n\n`;
  }

  return md;
}

export async function generateMarkdownZip(
  project: Project,
  steps: Step[],
  branding: BrandingProfile
): Promise<Blob> {
  const zip = new JSZip();

  // 1. Add README.md
  const mdContent = generateMarkdownText(project, steps, branding);
  zip.file('README.md', mdContent);

  // 2. Add images folder
  const imgFolder = zip.folder('images');
  if (imgFolder) {
    const logoUrl = project.logoUrl || branding.logoUrl;
    if (logoUrl) {
      try {
        const logoBlob = await urlToBlob(logoUrl);
        imgFolder.file('logo.png', logoBlob);
      } catch (err) {
        console.warn('Failed to embed logo in markdown zip:', err);
      }
    }

    for (const step of steps) {
      if (step.screenshotPath) {
        try {
          const blob = await urlToBlob(step.screenshotPath);
          imgFolder.file(`step-${step.stepNumber}.png`, blob);
        } catch (err) {
          console.warn(`Failed to package image for step ${step.stepNumber}:`, err);
        }
      }
    }
  }

  return await zip.generateAsync({ type: 'blob' });
}
