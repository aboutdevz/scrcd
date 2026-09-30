import { Project, Step } from '@/types';

export interface GuideProjectPackage {
  version: '1.0';
  exportedAt: number;
  project: Project;
  steps: Step[];
}

export function exportProjectToJson(project: Project, steps: Step[]): string {
  const pkg: GuideProjectPackage = {
    version: '1.0',
    exportedAt: Date.now(),
    project,
    steps,
  };
  return JSON.stringify(pkg, null, 2);
}

export function parseProjectFromJson(jsonStr: string): GuideProjectPackage {
  const parsed = JSON.parse(jsonStr);
  if (!parsed.project || !Array.isArray(parsed.steps)) {
    throw new Error('Invalid project JSON structure');
  }
  if (!Array.isArray(parsed.project.tags)) {
    parsed.project.tags = parsed.project.category ? [parsed.project.category] : ['SOP'];
  }
  return parsed as GuideProjectPackage;
}
