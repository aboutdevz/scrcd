import JSZip from 'jszip';
import { Project, Step, BrandingProfile } from '@/types';

async function urlToBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  return await res.blob();
}

export function generateMarkdownText(
  project: Project,
  steps: Step[],
  branding: BrandingProfile
): string {
  let md = `# ${project.title}\n\n`;

  if (project.description) {
    md += `> ${project.description}\n\n`;
  }

  md += `**Author**: ${project.author || branding.author}  \n`;
  md += `**Organization**: ${project.companyName || branding.companyName}  \n`;
  md += `**Date**: ${new Date(project.updatedAt).toLocaleDateString()}  \n\n`;
  md += `---\n\n`;

  md += `## Step-by-Step Instructions\n\n`;

  for (const step of steps) {
    md += `### Step ${step.stepNumber}: ${step.title}\n\n`;
    md += `- **Application**: ${step.uiaAppName || 'Desktop'}\n`;
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
  zip.file('guide.md', mdContent);

  // 2. Add images folder
  const imgFolder = zip.folder('images');
  if (imgFolder) {
    for (const step of steps) {
      if (step.screenshotPath) {
        try {
          const blob = await urlToBlob(step.screenshotPath);
          imgFolder.file(`step-${step.stepNumber}.png`, blob);
        } catch (e) {
          console.warn(`Failed to package image for step ${step.stepNumber}:`, e);
        }
      }
    }
  }

  return await zip.generateAsync({ type: 'blob' });
}
