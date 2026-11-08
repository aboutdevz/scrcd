# AI Indonesian Language Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable Indonesian (Bahasa Indonesia) language output across all AI features (batch guide generation and single-step rewrite) with a configurable language selector.

**Architecture:** Extend `AiConfig` with `language: 'en' | 'id'`, persisted in `localStorage` through `useStore`. Update `aiHarness.ts` with prompt generation and localized fallback creation for both Indonesian and English. Add language selection controls in `SettingsView.tsx` and `AiHarnessModal.tsx`.

**Tech Stack:** TypeScript, React, Zustand, Lucide Icons, Node.js (test runner)

**Spec:** [`docs/superpowers/specs/2026-11-08-ai-indonesian-language-design.md`](file:///c:/Users/PTRE/Documents/scrcd/docs/superpowers/specs/2026-11-08-ai-indonesian-language-design.md)

## Global Constraints

- **BYOK Privacy:** API keys and language settings must be stored client-side in `localStorage` under `scrcd_ai_config` without external tracking.
- **Zero Emojis:** Do NOT use Unicode emojis in buttons, selectors, or prompt output schemas. Use Lucide icons (`Globe` or `Languages`) and clear text labels.
- **Full Light & Dark Mode Support:** All UI dropdowns and labels must have explicit contrast classes in both themes.
- **Resilient Fallbacks:** Fallback metadata step generation (`createFallbackStepItem`) must produce valid localized output matching the selected language if AI returns empty or fails.

## Review Focus

1. **Undefined language fallback:** When an existing user's `localStorage` has no `language` property in `scrcd_ai_config`, it must default cleanly to `'en'` without runtime exceptions.
2. **Fallback step localization:** When the AI call fails or omits steps under `language: 'id'`, `createFallbackStepItem` must output Indonesian verbs ("Klik", "Tinjau") and instruction text rather than English.
3. **Single step rewrite prompt localization:** Calling `rewriteStepInstructions` with `language: 'id'` must include Indonesian technical author guidelines ("Bahasa Indonesia yang baku, jelas, dan profesional") in the system prompt.
4. **Batch guide generation prompt localization:** Calling `executeAiBatch` with `language: 'id'` must require action titles, rich HTML sentences, and chapter names ("Bab 1: ...") in Indonesian.
5. **Modal language synchronization:** Changing language inside `AiHarnessModal` must immediately update store state so subsequent runs and single-step rewrites reflect the choice.

---

### Task 1: Type Definitions, Store Persistence & Unit Test Harness

**Files:**
- Modify: `src/types/index.ts:256-265`
- Modify: `src/store/useStore.ts:797-815`
- Create: `tests/aiLanguageTest.js`

**Interfaces:**
- Produces:
  ```ts
  export type AiLanguage = 'en' | 'id';
  export interface AiConfig {
    provider: AiProvider;
    apiKey: string;
    model: string;
    customBaseUrl?: string;
    systemPrompt?: string;
    language?: AiLanguage;
  }
  ```

- [ ] **Step 1: Write the failing test in `tests/aiLanguageTest.js`**

```javascript
import assert from 'assert';

function testAiLanguage() {
  console.log('🧪 Starting AI Language Support Verification Tests...\n');

  // Test 1: Default language resolution when missing
  function resolveAiLanguage(config) {
    return (config && config.language) || 'en';
  }

  assert.strictEqual(resolveAiLanguage({}), 'en', 'Should default missing language to "en"');
  assert.strictEqual(resolveAiLanguage({ language: 'id' }), 'id', 'Should respect "id" language');
  console.log('✅ [Language Resolution] Defaults to "en" and preserves "id"');
}

testAiLanguage();
```

- [ ] **Step 2: Run test to verify it executes**

Run: `node tests/aiLanguageTest.js`
Expected: PASS for basic resolution

- [ ] **Step 3: Update `src/types/index.ts` and `src/store/useStore.ts`**

Add `AiLanguage = 'en' | 'id'` and `language?: AiLanguage` to `AiConfig` in `src/types/index.ts`.
In `src/store/useStore.ts`, ensure `aiConfig` initial loader sets `language: raw.language || 'en'`.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/store/useStore.ts tests/aiLanguageTest.js
git commit -m "feat(ai): define AiLanguage type and store persistence"
```

---

### Task 2: Implement Bilingual AI Prompts and Localized Fallbacks

**Files:**
- Modify: `src/services/aiHarness.ts`
- Modify: `tests/aiLanguageTest.js`

**Interfaces:**
- Consumes: `AiConfig`, `AiLanguage`, `Step` from `src/types/index.ts`
- Produces:
  - `createFallbackStepItem(step: Step, stepIndex: number, language?: AiLanguage): StepUpdateItem`
  - `buildSystemPrompt(language: AiLanguage, groupByChapters?: boolean, isFirstBatch?: boolean): string`
  - `rewriteStepInstructions(step: Step, config: AiConfig, context: ...): Promise<{ title: string; richInstructions: string }>`
  - `executeAiBatch(batch: Step[], config: AiConfig, ...): Promise<{ steps: StepUpdateItem[]; projectTitle?: string }>`

- [ ] **Step 1: Expand tests in `tests/aiLanguageTest.js` with fallback and prompt verification**

Add tests asserting:
1. `createFallbackStepItem` outputs Indonesian strings when `language === 'id'`:
   - Click action: title starts with `"Klik"`, instructions contain `"Klik pada kontrol"` and `"untuk melanjutkan prosedur."`
   - Snapshot action: title starts with `"Tinjau"`, instructions contain `"Tinjau"`
2. Prompt generator outputs Indonesian guidance ("Bahasa Indonesia yang baku", "Bab 1:") when `language === 'id'`.

- [ ] **Step 2: Run test to verify it fails on Indonesian assertions**

Run: `node tests/aiLanguageTest.js`
Expected: FAIL due to missing Indonesian fallback/prompt logic

- [ ] **Step 3: Implement Indonesian prompt and fallback logic in `src/services/aiHarness.ts`**

- In `createFallbackStepItem(step: Step, stepIndex: number, language: AiLanguage = 'en')`:
  - If `language === 'id'`:
    - `verb = isSnapshot ? 'Tinjau' : 'Klik'`
    - `richInstructions = isSnapshot ? `<p>Tinjau <strong>${target}</strong> di <em>${app}</em>.</p>` : `<p>Klik pada kontrol <strong>${target}</strong> di <em>${app}</em> untuk melanjutkan prosedur.</p>``
  - If `language === 'en'`: keep current English text.
- In `rewriteStepInstructions`:
  - Check `config.language`. If `'id'`, configure system prompt in Indonesian instructing the model to rewrite the step title and instructions in fluent, professional Bahasa Indonesia using imperative verbs (e.g. "Pilih", "Buka", "Klik", "Masukkan").
- In `executeAiBatch`:
  - Check `config.language`. If `'id'` and `!config.systemPrompt`, configure the batch prompt in Indonesian:
    - Title: Imperative Indonesian verbs (e.g. "Pilih Tab Profil", "Buka Pengaturan Akun").
    - Instructions: Procedural sentences in HTML in Indonesian (e.g. `<p>Klik pada tab <strong>...</strong> di <em>...</em> untuk melihat catatan kerja.</p>`).
    - Chapter section titles: `"Bab 1: Judul Bab"`.
    - Project title: In Indonesian.
- In `autoWriteGuideContent`:
  - Pass `config.language` to `createFallbackStepItem(..., config.language || 'en')` for both batch failure and missing items.

- [ ] **Step 4: Run `node tests/aiLanguageTest.js` to verify it passes**

Run: `node tests/aiLanguageTest.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/aiHarness.ts tests/aiLanguageTest.js
git commit -m "feat(ai): add Indonesian prompts and localized fallback generation"
```

---

### Task 3: UI Controls in SettingsView and AiHarnessModal

**Files:**
- Modify: `src/components/settings/SettingsView.tsx`
- Modify: `src/components/editor/AiHarnessModal.tsx`

**Interfaces:**
- Consumes: `aiConfig.language` and `setAiConfig` from `src/store/useStore.ts`
- Uses: Lucide `Globe` icon

- [ ] **Step 1: Add Output Language selector to `SettingsView.tsx`**

- In `SettingsView.tsx`, add state `aiLanguage`:
  `const [aiLanguage, setAiLanguage] = useState<AiLanguage>(aiConfig.language || 'en');`
- In `handleSaveSettings`, include `language: aiLanguage` in `setAiConfig`.
- In the AI Harness Agent (BYOK) section, add an Output Language selector:
  - Label: "Output Language" / "Select target language for AI-generated guide titles and procedural instructions."
  - Dropdown options:
    - `'en'`: "English"
    - `'id'`: "Bahasa Indonesia"
  - Include `Globe` icon.

- [ ] **Step 2: Add quick Language selector in `AiHarnessModal.tsx`**

- In `AiHarnessModal.tsx`, add a language selector row or control near the chapter grouping toggle:
  - Shows current language (`aiConfig.language || 'en'`).
  - Allows switching between English and Bahasa Indonesia.
  - Calling onChange updates local state and updates store via `setAiConfig({ language: newLang })`.
  - Pass `language` into `effectiveConfig`.

- [ ] **Step 3: Commit**

```bash
git add src/components/settings/SettingsView.tsx src/components/editor/AiHarnessModal.tsx
git commit -m "feat(ui): add AI output language selector to settings and AI harness modal"
```

---

### Task 4: Test Suite Integration & Build Verification

**Files:**
- Modify: `package.json:14` (add `node tests/aiLanguageTest.js` to `npm test`)

- [ ] **Step 1: Update `package.json` test script**

Add `node tests/aiLanguageTest.js` to `"test"` in `package.json`.

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: All tests pass including `aiLanguageTest.js`.

- [ ] **Step 3: Run TypeScript & Vite build**

Run: `npm run build`
Expected: TypeScript check succeeds and Vite build completes without errors.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "test(ai): integrate aiLanguageTest into npm test"
```
