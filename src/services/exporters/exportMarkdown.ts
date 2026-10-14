import JSZip from 'jszip';
import { Project, Step, BrandingProfile, DocumentExportOptions } from '@/types';
import { htmlToMarkdown } from '@/services/richText';

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
  branding: BrandingProfile,
  options?: DocumentExportOptions
): string {
  const logoUrl = branding.logoUrl || project.logoUrl;
  const author = branding.author || project.author || 'Author';
  const companyName = branding.companyName || project.companyName || 'Organization';
  let md = '';

  if (logoUrl) {
    md += `![Organization Logo](./images/logo.png)\n\n`;
  }

  md += `# ${project.title}\n\n`;

  if (project.description) {
    md += `> ${project.description}\n\n`;
  }

  md += `**Version**: ${project.version || '1.0.0'}  \n`;
  md += `**Author**: ${author}  \n`;
  md += `**Organization**: ${companyName}  \n`;
  md += `**Date**: ${new Date(project.updatedAt).toLocaleDateString()}  \n\n`;
  md += `---\n\n`;

  // Chapter-based Table of Contents (only include titled steps)
  const titledSteps = steps.filter((s) => s.title && s.title.trim().length > 0);
  if (titledSteps.length > 2) {
    md += `## Table of Contents\n\n`;
    let lastSection = '';
    for (const step of steps) {
      if (!step.title || !step.title.trim()) continue;
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

  const showApp = options?.includeAppBadges !== false;
  const showAction = options?.includeActionBadges !== false;

  for (const step of steps) {
    if (step.sectionTitle) {
      md += `### ${step.sectionTitle}\n\n`;
    }

    md += `<a id="step-${step.stepNumber}"></a>\n`;
    md += `#### Step ${step.stepNumber}: ${step.title}\n\n`;
    if (showApp) {
      md += `- **Application**: ${step.uiaAppName || 'Application'}\n`;
    }
    if (showAction) {
      md += `- **Action**: \`${step.actionType.toUpperCase()}\`\n`;
    }
    if (showApp || showAction) {
      md += `\n`;
    }

    const mdInstructions = htmlToMarkdown(step.richInstructions);
    if (mdInstructions) {
      md += `${mdInstructions}\n\n`;
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
  branding: BrandingProfile,
  options?: DocumentExportOptions
): Promise<Blob> {
  const zip = new JSZip();

  // 1. Add README.md
  const mdContent = generateMarkdownText(project, steps, branding, options);
  zip.file('README.md', mdContent);

  // 2. Add images folder
  const imgFolder = zip.folder('images');
  if (imgFolder) {
    const logoUrl = branding.logoUrl || project.logoUrl;
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
