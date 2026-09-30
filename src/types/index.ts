export type ActionType = 'click' | 'double_click' | 'right_click' | 'navigation' | 'keypress' | 'snapshot';

export type CategoryType = 'SOP' | 'Tutorial' | 'Troubleshooting' | 'Onboarding' | 'General';

export interface Project {
  id: string;
  title: string;
  version: string;
  description: string;
  category: CategoryType;
  tags: string[];
  author: string;
  companyName: string;
  accentColor: string;
  logoUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Section {
  id: string;
  projectId: string;
  title: string;
  orderIndex: number;
}

export type AnnotationTool =
  | 'select'
  | 'hotspot'
  | 'arrow'
  | 'rect'
  | 'oval'
  | 'text'
  | 'highlighter'
  | 'blur'
  | 'redact'
  | 'crop';

export interface BaseShape {
  id: string;
  type: AnnotationTool;
}

export interface HotspotShape extends BaseShape {
  type: 'hotspot';
  x: number;
  y: number;
  number: number;
  color: string;
  label?: string;
  variant?: 'spotlight' | 'badge';
  radius?: number;
}

export interface ArrowShape extends BaseShape {
  type: 'arrow';
  points: [number, number, number, number]; // [x1, y1, x2, y2]
  color: string;
  strokeWidth: number;
  curved?: boolean;
}

export interface RectShape extends BaseShape {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  strokeWidth: number;
  fillColor?: string;
}

export interface OvalShape extends BaseShape {
  type: 'oval';
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  strokeColor: string;
  strokeWidth: number;
  fillColor?: string;
}

export interface TextShape extends BaseShape {
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
  backgroundColor?: string;
}

export interface HighlighterShape extends BaseShape {
  type: 'highlighter';
  points: number[];
  color: string;
  strokeWidth: number;
}

export interface BlurShape extends BaseShape {
  type: 'blur';
  x: number;
  y: number;
  width: number;
  height: number;
  intensity: number; // 5 - 25
}

export interface RedactShape extends BaseShape {
  type: 'redact';
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor: string; // usually #000000
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type AnnotationShape =
  | HotspotShape
  | ArrowShape
  | RectShape
  | OvalShape
  | TextShape
  | HighlighterShape
  | BlurShape
  | RedactShape;

export interface Step {
  id: string;
  projectId: string;
  sectionId?: string;
  sectionTitle?: string;
  stepNumber: number;
  title: string;
  richInstructions: string;
  actionType: ActionType;
  screenshotPath: string; // File URL or base64 data URI
  originalWidth: number;
  originalHeight: number;
  clickX: number;
  clickY: number;
  uiaName: string;
  uiaControlType: string;
  uiaAppName: string;
  annotations: AnnotationShape[];
  crop?: CropRect;
  isPassword: boolean;
  createdAt: number;
}

export interface BrandingProfile {
  companyName: string;
  author: string;
  logoUrl?: string;
  accentColor: string;
  footerText: string;
}

export interface ExportSettings {
  format: 'pdf' | 'docx' | 'pptx' | 'html' | 'md' | 'json' | 'gif';
  includeTableOfContents: boolean;
  includeCoverPage: boolean;
  gifDurationSeconds: number; // default 1.5s
  quality: number; // 0.85
  branding: BrandingProfile;
}

export interface DisplaySource {
  id: number;
  index: number;
  isPrimary: boolean;
  bounds: { x: number; y: number; width: number; height: number };
  label: string;
}

export type CaptureScope = 'cursor' | 'window' | 'monitor' | 'all';

export interface CaptureConfig {
  scope: CaptureScope;
  displayId?: number;
  monitorBounds?: { x: number; y: number; width: number; height: number };
  hotspotVariant: 'spotlight' | 'badge';
}

export type AiProvider = 'openai' | 'gemini' | 'anthropic' | 'custom';

export interface AiConfig {
  provider: AiProvider;
  apiKey: string;
  model: string;
  customBaseUrl?: string;
  systemPrompt?: string;
}


