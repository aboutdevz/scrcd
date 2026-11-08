# AI Indonesian Language Support — Design Spec

## 1. Intent & Why
SCRCD's AI features (Auto-Write Guide Content and AI Rewrite) currently generate standard operating procedure (SOP) step titles, rich HTML instructions, and chapter section titles exclusively in English. Users authoring guides and documentation for Indonesian-speaking teams or organizations require the AI harness to generate fluent, professional Indonesian (Bahasa Indonesia) content while retaining the option to generate English content when needed.

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- **Configurable AI Language Selection:** Allow users to choose between **English** (`en`) and **Bahasa Indonesia** (`id`) for AI-generated guide content.
- **Persistent Global Setting:** Add the language selector to **Settings → AI Harness Agent (BYOK)**, saved in `localStorage` alongside provider credentials.
- **Convenient In-Modal Selector:** Provide an inline language selector directly within [`AiHarnessModal`](file:///c:/Users/PTRE/Documents/scrcd/src/components/editor/AiHarnessModal.tsx) so users can change language on the fly before generating content.
- **Bilingual AI System Prompts:** Adapt system prompts in [`aiHarness.ts`](file:///c:/Users/PTRE/Documents/scrcd/src/services/aiHarness.ts) for:
  - Batch Guide Generation (`autoWriteGuideContent`): Action titles, HTML instructions (`<p>`, `<strong>`, `<em>`), chapter section titles ("Bab 1: ..."), and project title.
  - Step Instruction Rewrite (`rewriteStepInstructions`): Polished procedural instructions and action titles in Indonesian.
- **Localized Fallback Generation:** Update `createFallbackStepItem` in [`aiHarness.ts`](file:///c:/Users/PTRE/Documents/scrcd/src/services/aiHarness.ts) so that if the AI returns an incomplete payload or error, the generated fallback steps match the selected language (e.g., "Klik pada kontrol **...** di *...* untuk melanjutkan prosedur.").

### Non-Goals
- Full application UI localization (i18n of all SCRCD UI buttons, menus, and dialogs across the whole app); this feature is specifically focused on the AI-generated guide content output.
- Automatic language detection of existing step texts (explicit user configuration is more reliable and deterministic).

### Anti-Goals
- Hardcoding prompts in Indonesian such that English generation is permanently lost.
- Using decorative emojis in the language selector (must use semantic Lucide icons like `Languages` or `Globe` per project invariants).

## 3. Constraints & Invariants
- **BYOK Privacy:** Language preferences are stored locally in `localStorage` under `scrcd_ai_config` without external tracking.
- **Zero Emojis:** Use text labels ("English", "Bahasa Indonesia") and Lucide icons only.
- **Resilient Fallbacks:** Fallbacks must maintain 100% reliability regardless of AI provider rate limits or token exhaustion.
- **Light & Dark Mode Support:** Dropdown and input controls must fit SCRCD's existing theme styling.

## 4. Approaches Considered

### Approach 1: Configurable AI Output Language Dropdown (Selected)
- Add `language: 'en' | 'id'` to `AiConfig`.
- Expose the selector in both `SettingsView.tsx` and `AiHarnessModal.tsx`.
- Update prompt templates and fallback generators in `aiHarness.ts` to output in the chosen language.
- **Why chosen:** Maximum flexibility. Users can toggle between English and Indonesian effortlessly without losing English capabilities.

### Approach 2: Hardcoded Indonesian Output (Rejected)
- Permanently rewrite prompts in `aiHarness.ts` to Bahasa Indonesia.
- **Why rejected:** Breaks existing workflows for users needing English guides and removes bilingual flexibility.

## 5. Detailed Architecture & Technical Implementation

### 5.1 Type Definitions ([`src/types/index.ts`](file:///c:/Users/PTRE/Documents/scrcd/src/types/index.ts))
```ts
export type AiLanguage = 'en' | 'id';

export interface AiConfig {
  provider: AiProvider;
  apiKey: string;
  model: string;
  customBaseUrl?: string;
  systemPrompt?: string;
  language?: AiLanguage; // defaults to 'en'
}
```

### 5.2 Store Management ([`src/store/useStore.ts`](file:///c:/Users/PTRE/Documents/scrcd/src/store/useStore.ts))
- Default `language: 'en'` in initial state if not present in `localStorage`.
- `setAiConfig` preserves and persists `language` to `localStorage` under `'scrcd_ai_config'`.

### 5.3 AI Prompt & Fallback Localization ([`src/services/aiHarness.ts`](file:///c:/Users/PTRE/Documents/scrcd/src/services/aiHarness.ts))
- **`createFallbackStepItem(step, stepIndex, language = 'en')`**:
  - `en`: `"Click on " + target`, `<p>Click on the <strong>${target}</strong> control in <em>${app}</em> to proceed with the procedure.</p>`
  - `id`: `"Klik " + target`, `<p>Klik pada kontrol <strong>${target}</strong> di <em>${app}</em> untuk melanjutkan prosedur.</p>` (or `"Tinjau ${target} di ${app}."` for snapshot/view).
- **`rewriteStepInstructions(step, config, context)`**:
  - Injects target language instructions:
    - `id`: Instructs AI to act as a professional Indonesian technical writer ("Anda adalah seorang penulis teknis profesional dan penyusun SOP (Standar Operasional Prosedur)... Seluruh judul tindakan, instruksi langkah, dan teks HARUS ditulis dalam Bahasa Indonesia yang baku, jelas, dan profesional.").
    - `en`: Existing English instructions.
- **`executeAiBatch(...)` & `autoWriteGuideContent(...)`**:
  - Injects target language instructions:
    - `id`: Titles ("Pilih Tab Profil", "Buka Pengaturan Akun"), rich instructions (`<p>Klik pada tab <strong>...</strong> di <em>...</em> untuk melihat catatan kerja.</p>`), section titles (`"Bab 1: Autentikasi Pengguna"`, `"Bab 2: Konfigurasi"`), and project title in Bahasa Indonesia.
    - `en`: English instructions.

### 5.4 UI Components

#### 5.4.1 Settings View ([`src/components/settings/SettingsView.tsx`](file:///c:/Users/PTRE/Documents/scrcd/src/components/settings/SettingsView.tsx))
- Add an "Output Language" form field in the **AI Harness Agent (BYOK)** section.
- Options:
  - `English` (`en`)
  - `Bahasa Indonesia` (`id`)
- Saves with the other AI config fields on Save Settings.

#### 5.4.2 AI Harness Modal ([`src/components/editor/AiHarnessModal.tsx`](file:///c:/Users/PTRE/Documents/scrcd/src/components/editor/AiHarnessModal.tsx))
- Add a language dropdown next to the provider / chapter grouping controls with a `Globe` or `Languages` Lucide icon.
- Allows user to change language right before clicking **Auto-Write Guide Content**.
- Updates `aiConfig.language` in the store immediately so subsequent runs and AI rewrites use the selected language.

## 6. Verification Plan
- Unit tests verifying that:
  - `createFallbackStepItem` outputs Indonesian strings when `language === 'id'`.
  - Batch and rewrite prompts contain the Indonesian language directives when `language === 'id'`.
  - Language configuration properly serializes to and deserializes from `AiConfig`.
- Build verification (`npm run build`).
