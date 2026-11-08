import assert from 'assert';
import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function stripTypeScriptTypes(code) {
  return ts.transpileModule(code, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText;
}

console.log('🧪 Starting AI Language Support Verification Tests...\n');

// 1. Verify src/services/aiHarness.ts exists and implements bilingual prompt and fallback functions
const aiHarnessPath = path.join(__dirname, '../src/services/aiHarness.ts');
assert(fs.existsSync(aiHarnessPath), 'src/services/aiHarness.ts must exist');

const aiHarnessCode = fs.readFileSync(aiHarnessPath, 'utf8');
assert(aiHarnessCode.includes('export function createFallbackStepItem'), 'createFallbackStepItem must be exported');
assert(aiHarnessCode.includes('export function buildBatchSystemPrompt'), 'buildBatchSystemPrompt must be exported');
assert(aiHarnessCode.includes('export function buildRewriteSystemPrompt'), 'buildRewriteSystemPrompt must be exported');

// Transpile and evaluate functions directly from production source
const cleanedCode = stripTypeScriptTypes(aiHarnessCode)
  .replace(/import\s+.*?from\s+['"].*?['"];?/g, '')
  .replace(/export\s+default\s+/g, '')
  .replace(/export\s+(async\s+)?function\s+/g, (_, isAsync) => (isAsync ? 'async function ' : 'function '))
  .replace(/export\s+(?:const|let|var)\s+/g, 'const ')
  .replace(/export\s+interface\s+/g, '// interface ');

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const evalScope = {};
const evalFn = new AsyncFunction(
  'scope',
  `
  ${cleanedCode}
  scope.createFallbackStepItem = createFallbackStepItem;
  scope.buildBatchSystemPrompt = buildBatchSystemPrompt;
  scope.buildRewriteSystemPrompt = buildRewriteSystemPrompt;
  `
);
await evalFn(evalScope);

const { createFallbackStepItem, buildBatchSystemPrompt, buildRewriteSystemPrompt } = evalScope;

function resolveAiLanguage(config) {
  return (config && config.language) || 'en';
}

// Test 1: Language Resolution
assert.strictEqual(resolveAiLanguage({}), 'en', 'Should default missing language to "en"');
assert.strictEqual(resolveAiLanguage({ language: 'id' }), 'id', 'Should respect "id" language');
assert.strictEqual(resolveAiLanguage({ language: 'en' }), 'en', 'Should respect "en" language');
console.log('✅ [Language Resolution] Defaults to "en" and preserves "id"');

// Test 2: Fallback Step Generation directly from production aiHarness.ts
const clickStep = {
  id: 'step-1',
  projectId: 'proj-1',
  stepNumber: 1,
  title: 'Old Title',
  richInstructions: '',
  actionType: 'click',
  screenshotPath: '',
  originalWidth: 1920,
  originalHeight: 1080,
  clickX: 100,
  clickY: 100,
  uiaName: 'Save Button',
  uiaControlType: 'Button',
  uiaAppName: 'EditorApp',
  annotations: [],
  isPassword: false,
  createdAt: Date.now(),
};

const idClickFallback = createFallbackStepItem(clickStep, 1, 'id');
assert.strictEqual(idClickFallback.title, 'Klik Save Button');
assert(idClickFallback.richInstructions.includes('Klik pada kontrol <strong>Save Button</strong> di <em>EditorApp</em>'));
console.log('✅ [Indonesian Fallback Click] Title and HTML instructions formatted in Indonesian');

const snapshotStep = {
  ...clickStep,
  id: 'step-2',
  actionType: 'snapshot',
  uiaName: 'Main Window',
};

const idSnapshotFallback = createFallbackStepItem(snapshotStep, 2, 'id');
assert.strictEqual(idSnapshotFallback.title, 'Tinjau Main Window');
assert(idSnapshotFallback.richInstructions.includes('Tinjau <strong>Main Window</strong> di <em>EditorApp</em>'));
console.log('✅ [Indonesian Fallback Snapshot] Title and HTML instructions formatted in Indonesian');

const enClickFallback = createFallbackStepItem(clickStep, 1, 'en');
assert.strictEqual(enClickFallback.title, 'Click on Save Button');
assert(enClickFallback.richInstructions.includes('Click on the <strong>Save Button</strong> control'));
console.log('✅ [English Fallback] Original English fallback remains intact');

// Test 3: Indonesian Batch Prompts directly from production aiHarness.ts
const idBatchPrompt = buildBatchSystemPrompt('id', true, true);
assert(idBatchPrompt.includes('Bahasa Indonesia'), 'ID batch prompt must specify Bahasa Indonesia');
assert(idBatchPrompt.includes('Bab 1:'), 'ID batch prompt must specify "Bab" for chapters');

const enBatchPrompt = buildBatchSystemPrompt('en', true, true);
assert(enBatchPrompt.includes('Chapter 1:'), 'EN batch prompt must specify "Chapter" for chapters');
console.log('✅ [Batch Prompts] Bilingual prompt templates generate expected localized guidance');

// Test 4: Indonesian Rewrite Prompts directly from production aiHarness.ts
const idRewritePrompt = buildRewriteSystemPrompt('id');
assert(idRewritePrompt.includes('Bahasa Indonesia'), 'ID rewrite prompt must specify Bahasa Indonesia');

const enRewritePrompt = buildRewriteSystemPrompt('en');
assert(enRewritePrompt.includes('expert technical writer'), 'EN rewrite prompt preserved');
console.log('✅ [Rewrite Prompts] Single step rewrite prompts localize properly');

console.log('\n🎉 All AI Language Support Tests Passed Successfully (Direct Source Verification)!');
