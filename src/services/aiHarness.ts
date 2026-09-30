import { Step, AiConfig } from '@/types';

export interface StepUpdateItem {
  id: string;
  title: string;
  richInstructions: string;
  sectionTitle?: string;
}

export interface AiGeneratedResult {
  projectTitle?: string;
  steps: StepUpdateItem[];
  supplementedCount?: number;
}

/**
 * Default chunk size for processing large workflows without token exhaustion
 */
export const BATCH_SIZE = 12;

/**
 * Standard default models per provider
 */
export const AI_PROVIDER_DEFAULTS = {
  openai: {
    name: 'OpenAI',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'o1-mini'],
    endpoint: 'https://api.openai.com/v1',
  },
  gemini: {
    name: 'Google Gemini',
    defaultModel: 'gemini-1.5-flash',
    models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'],
    endpoint: 'https://generativelanguage.googleapis.com/v1beta',
  },
  anthropic: {
    name: 'Anthropic Claude',
    defaultModel: 'claude-3-5-haiku-20241022',
    models: ['claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022'],
    endpoint: 'https://api.anthropic.com/v1',
  },
  custom: {
    name: 'Custom / OpenAI-Compatible (Ollama, OpenRouter)',
    defaultModel: 'llama3.2',
    models: ['llama3.2', 'mistral', 'deepseek-chat'],
    endpoint: 'http://localhost:11434/v1',
  },
};

/**
 * Test connectivity with user's configured BYOK credentials
 */
export async function testAiConnection(config: AiConfig): Promise<{ success: boolean; message: string }> {
  if (!config.apiKey && config.provider !== 'custom') {
    return { success: false, message: 'API Key cannot be empty.' };
  }

  const timeoutMs = 12000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (config.provider === 'openai' || config.provider === 'custom') {
      const baseUrl = (config.customBaseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      }

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model: config.model || (config.provider === 'openai' ? 'gpt-4o-mini' : 'llama3'),
          messages: [{ role: 'user', content: 'Say "Connection successful"' }],
          max_tokens: 25,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, message: `API returned ${res.status}: ${errText.slice(0, 140)}` };
      }
      return { success: true, message: 'Connection to endpoint verified successfully!' };
    }

    if (config.provider === 'gemini') {
      const model = config.model || 'gemini-1.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hello, respond with OK.' }] }],
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, message: `Gemini API returned ${res.status}: ${errText.slice(0, 140)}` };
      }
      return { success: true, message: 'Connection to Google Gemini verified successfully!' };
    }

    if (config.provider === 'anthropic') {
      const url = 'https://api.anthropic.com/v1/messages';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: config.model || 'claude-3-5-haiku-20241022',
          max_tokens: 15,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, message: `Anthropic API returned ${res.status}: ${errText.slice(0, 140)}` };
      }
      return { success: true, message: 'Connection to Anthropic Claude verified successfully!' };
    }

    return { success: false, message: 'Unsupported AI provider.' };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { success: false, message: 'Request timed out after 12 seconds.' };
    }
    return { success: false, message: err.message || 'Network connection failed.' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Creates smart, metadata-derived fallback titles and rich instructions
 * if an AI model omits steps or returns an empty payload.
 */
function createFallbackStepItem(step: Step, stepIndex: number): StepUpdateItem {
  const target = step.uiaName || step.title || `Element ${stepIndex}`;
  const app = step.uiaAppName || 'Application';
  const isSnapshot = step.actionType === 'snapshot' || step.actionType === 'navigation';
  const verb = isSnapshot ? 'View' : 'Click on';

  return {
    id: step.id,
    title: `${verb} ${target}`,
    richInstructions: isSnapshot
      ? `<p>Review <strong>${target}</strong> in <em>${app}</em>.</p>`
      : `<p>Click on the <strong>${target}</strong> control in <em>${app}</em> to proceed with the procedure.</p>`,
    sectionTitle: step.sectionTitle,
  };
}

/**
 * Attempts to repair truncated JSON (unclosed quotes, arrays, and curly braces)
 */
function repairTruncatedJson(json: string): string {
  let s = json.trim();
  let inString = false;
  let escape = false;
  const stack: string[] = [];

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (ch === '{' || ch === '[') {
        stack.push(ch);
      } else if (ch === '}') {
        if (stack.length > 0 && stack[stack.length - 1] === '{') stack.pop();
      } else if (ch === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === '[') stack.pop();
      }
    }
  }

  if (inString) {
    s += '"';
  }

  s = s.replace(/,\s*$/, '');

  while (stack.length > 0) {
    const opener = stack.pop();
    if (opener === '{') s += '}';
    else if (opener === '[') s += ']';
  }

  return s;
}

/**
 * Robust JSON extractor that strips reasoning tags (<think>...</think>),
 * extracts fenced markdown code blocks, and applies repair if truncated.
 */
function extractAndParseJson(rawText: string): any {
  if (!rawText || !rawText.trim()) {
    return null;
  }

  let cleaned = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  const markdownMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (markdownMatch && markdownMatch[1]) {
    cleaned = markdownMatch[1].trim();
  } else {
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    let startIdx = -1;
    if (firstBrace !== -1 && firstBracket !== -1) {
      startIdx = Math.min(firstBrace, firstBracket);
    } else if (firstBrace !== -1) {
      startIdx = firstBrace;
    } else if (firstBracket !== -1) {
      startIdx = firstBracket;
    }

    if (startIdx !== -1) {
      const isObject = cleaned[startIdx] === '{';
      const lastClose = isObject ? cleaned.lastIndexOf('}') : cleaned.lastIndexOf(']');
      if (lastClose > startIdx) {
        cleaned = cleaned.slice(startIdx, lastClose + 1).trim();
      } else {
        cleaned = cleaned.slice(startIdx).trim();
      }
    }
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    try {
      const repaired = repairTruncatedJson(cleaned);
      return JSON.parse(repaired);
    } catch {
      return null;
    }
  }
}

/**
 * Normalizes any parsed JSON structure into a standard StepUpdateItem list.
 */
function normalizeParsedSteps(parsed: any, originalSteps: Step[]): { steps: StepUpdateItem[]; projectTitle?: string } {
  if (!parsed) {
    return { steps: [] };
  }

  let projectTitle: string | undefined = parsed.projectTitle ? String(parsed.projectTitle).trim() : undefined;
  let rawList: any[] = [];

  if (Array.isArray(parsed)) {
    rawList = parsed;
  } else if (Array.isArray(parsed.steps)) {
    rawList = parsed.steps;
  } else if (Array.isArray(parsed.items)) {
    rawList = parsed.items;
  } else if (Array.isArray(parsed.workflow)) {
    rawList = parsed.workflow;
  } else if (Array.isArray(parsed.data)) {
    rawList = parsed.data;
  } else {
    for (const key of Object.keys(parsed)) {
      if (Array.isArray(parsed[key]) && parsed[key].length > 0) {
        rawList = parsed[key];
        break;
      }
    }
  }

  const result: StepUpdateItem[] = [];
  const originalIds = new Set(originalSteps.map((s) => s.id));

  for (let i = 0; i < rawList.length; i++) {
    const item = rawList[i];
    if (!item) continue;

    let matchedId = '';
    if (item.id && originalIds.has(String(item.id))) {
      matchedId = String(item.id);
    } else if (originalSteps[i]) {
      matchedId = originalSteps[i].id;
    }

    if (matchedId) {
      result.push({
        id: matchedId,
        title: item.title ? String(item.title).trim() : '',
        richInstructions: item.richInstructions
          ? String(item.richInstructions).trim()
          : item.title
          ? `<p>${item.title}</p>`
          : '',
        sectionTitle: item.sectionTitle ? String(item.sectionTitle).trim() : undefined,
      });
    }
  }

  return { steps: result, projectTitle };
}

/**
 * Universal completion request runner for any configured AI provider
 */
async function callAiCompletion(
  config: AiConfig,
  systemPrompt: string,
  userPrompt: string,
  isJson: boolean = true
): Promise<string> {
  if (config.provider === 'openai' || config.provider === 'custom') {
    const baseUrl = (config.customBaseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.model || (config.provider === 'openai' ? 'gpt-4o-mini' : 'llama3'),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 4096,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`AI Provider error (${res.status}): ${err.slice(0, 180)}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  if (config.provider === 'gemini') {
    const model = config.model || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;

    const generationConfig: Record<string, any> = {
      temperature: 0.3,
      maxOutputTokens: 4096,
    };
    if (isJson) {
      generationConfig.responseMimeType = 'application/json';
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google Gemini error (${res.status}): ${err.slice(0, 180)}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  if (config.provider === 'anthropic') {
    const url = 'https://api.anthropic.com/v1/messages';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: config.model || 'claude-3-5-haiku-20241022',
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        max_tokens: 4096,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic error (${res.status}): ${err.slice(0, 180)}`);
    }

    const data = await res.json();
    return data.content?.[0]?.text || '';
  }

  throw new Error(`Unsupported AI provider: ${config.provider}`);
}

/**
 * Rewrites a single step's instructions with flow awareness and formatting.
 */
export async function rewriteStepInstructions(
  step: Step,
  config: AiConfig,
  context: { projectTitle: string; prevStepTitle?: string; nextStepTitle?: string; currentContent?: string }
): Promise<{ title: string; richInstructions: string }> {
  const systemInstructions =
    `You are an expert technical writer and standard operating procedure (SOP) author.
Your task is to rewrite and polish the following step's instructions to be professional, clear, and action-oriented.

Guidelines:
1. "title": Concise, imperative action title describing the user action (e.g. "Select Profile Tab", "Open Account Settings", "Submit Form"). NEVER simply repeat the raw application or window title.
2. "richInstructions": 1-3 clear sentences formatted in HTML using <p>, <strong>, and <em> tags highlighting clicked elements or buttons.
3. Return strictly valid JSON:
{
  "title": "Action Title",
  "richInstructions": "<p>Instructions with <strong>elements</strong> highlighted.</p>"
}
Important: Do not output conversational commentary. Return the JSON object directly.`;

  const userPrompt = `Guide Title: "${context.projectTitle}"
Previous Step: ${context.prevStepTitle || 'None (First step)'}
Next Step: ${context.nextStepTitle || 'None (Last step)'}
Action Type: ${step.actionType}
Application: "${step.uiaAppName || ''}"
Target Element: "${step.uiaName || ''}"
Control Type: "${step.uiaControlType || ''}"
Current Title: "${step.title}"
Current Instructions: "${context.currentContent || step.richInstructions || ''}"`;

  const rawJson = await callAiCompletion(config, systemInstructions, userPrompt);
  const parsed = extractAndParseJson(rawJson);

  if (parsed && (parsed.title || parsed.richInstructions)) {
    return {
      title: parsed.title ? String(parsed.title).trim() : step.title,
      richInstructions: parsed.richInstructions
        ? String(parsed.richInstructions).trim()
        : `<p>${parsed.title || step.title}</p>`,
    };
  }

  throw new Error('AI returned an empty or unparseable response.');
}

/**
 * Executes a single AI batch request (10-12 steps)
 */
async function executeAiBatch(
  batch: Step[],
  config: AiConfig,
  projectContext: { title: string; description?: string },
  isFirstBatch: boolean,
  batchOffset: number,
  groupByChapters: boolean = false
): Promise<{ steps: StepUpdateItem[]; projectTitle?: string }> {
  const sequenceSummary = batch.map((s, idx) => ({
    id: s.id,
    stepIndex: batchOffset + idx + 1,
    action: s.actionType,
    application: s.uiaAppName || 'Application',
    element: s.uiaName || s.title,
    controlType: s.uiaControlType || 'UIElement',
    currentTitle: s.title,
  }));

  const systemInstructions =
    config.systemPrompt ||
    `You are an expert technical writer and standard operating procedure (SOP) author.
Your task is to analyze user-recorded workflow sequences and write clear, action-oriented, professional guide titles and formatted instructions describing the user's flow.

Guidelines:
1. "title": Must be concise, professional, imperative describing the user action (e.g. "Select Profile Tab", "Open Account Settings", "Submit Form", "Download Installer"). NEVER simply repeat the raw application or window title.
2. "richInstructions": Write 1-2 clear, polished procedural sentences formatted in HTML with <p>, <strong>, and <em> tags highlighting clicked elements or buttons (e.g. "<p>Click on the <strong>CV Experience</strong> tab in <em>READY</em> to view work records.</p>").
${groupByChapters ? '3. "sectionTitle": Group related sequential steps into logical workflow chapters (e.g. "Chapter 1: User Login", "Chapter 2: Profile Setup", "Chapter 3: Verification").' : ''}
4. Preserve the exact "id" for each step in your response.
${isFirstBatch ? '5. Provide an updated overall "projectTitle" summarizing the complete guide.' : ''}
6. Return strictly valid JSON:
{
  ${isFirstBatch ? '"projectTitle": "Polished Guide Title",' : ''}
  "steps": [
    {
      "id": "step_id",
      "title": "Action Title",
      "richInstructions": "<p>Instruction text with <strong>Elements</strong> highlighted.</p>"${groupByChapters ? ',\n      "sectionTitle": "Chapter / Section Name"' : ''}
    }
  ]
}
Important: Do not output conversational commentary. Return the JSON object directly.`;

  const userPrompt = `Guide Topic: "${projectContext.title}"\n${
    projectContext.description ? `Description: "${projectContext.description}"\n` : ''
  }\nRecorded Steps (${batch.length} steps):\n${JSON.stringify(sequenceSummary, null, 2)}`;

  const rawJsonText = await callAiCompletion(config, systemInstructions, userPrompt);
  const parsed = extractAndParseJson(rawJsonText);
  return normalizeParsedSteps(parsed, batch);
}

/**
 * Executes the AI harness agent to write concise, professional SOP step titles
 * and rich instructional text, automatically batching large sequences and providing
 * resilient metadata fallbacks.
 */
export async function autoWriteGuideContent(
  steps: Step[],
  config: AiConfig,
  projectContext: { title: string; description?: string },
  onProgress?: (processed: number, total: number, message: string) => void,
  options?: { groupByChapters?: boolean }
): Promise<AiGeneratedResult> {
  if (steps.length === 0) {
    return { steps: [] };
  }

  const allResultSteps: StepUpdateItem[] = [];
  let detectedProjectTitle: string | undefined = undefined;
  let supplementedCount = 0;
  const groupByChapters = Boolean(options?.groupByChapters);

  // Split steps into manageable batches (10-12 steps per batch)
  const batches: Step[][] = [];
  for (let i = 0; i < steps.length; i += BATCH_SIZE) {
    batches.push(steps.slice(i, i + BATCH_SIZE));
  }

  for (let bIdx = 0; bIdx < batches.length; bIdx++) {
    const batch = batches[bIdx];
    const startIndex = bIdx * BATCH_SIZE;
    const endIndex = Math.min(startIndex + batch.length, steps.length);

    if (onProgress) {
      onProgress(
        startIndex,
        steps.length,
        batches.length > 1
          ? `Writing steps ${startIndex + 1}–${endIndex} of ${steps.length}...`
          : `Writing procedural flow for ${steps.length} steps...`
      );
    }

    try {
      const batchResult = await executeAiBatch(
        batch,
        config,
        projectContext,
        bIdx === 0,
        startIndex,
        groupByChapters
      );

      if (bIdx === 0 && batchResult.projectTitle) {
        detectedProjectTitle = batchResult.projectTitle;
      }

      for (let i = 0; i < batch.length; i++) {
        const originalStep = batch[i];
        const generated =
          batchResult.steps.find((s) => s.id === originalStep.id) ||
          batchResult.steps[i];

        if (generated && (generated.title || generated.richInstructions)) {
          allResultSteps.push({
            id: originalStep.id,
            title: generated.title || originalStep.title,
            richInstructions:
              generated.richInstructions ||
              `<p>${generated.title || originalStep.title}</p>`,
            sectionTitle: generated.sectionTitle || originalStep.sectionTitle,
          });
        } else {
          allResultSteps.push(createFallbackStepItem(originalStep, startIndex + i + 1));
          supplementedCount++;
        }
      }
    } catch (err: any) {
      console.warn(`AI batch ${bIdx + 1} encountered an error:`, err);
      for (let i = 0; i < batch.length; i++) {
        allResultSteps.push(createFallbackStepItem(batch[i], startIndex + i + 1));
        supplementedCount++;
      }
    }
  }

  if (onProgress) {
    onProgress(steps.length, steps.length, `Completed processing ${steps.length} steps!`);
  }

  return {
    projectTitle: detectedProjectTitle,
    steps: allResultSteps,
    supplementedCount: supplementedCount > 0 ? supplementedCount : undefined,
  };
}

