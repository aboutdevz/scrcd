import assert from 'assert';

/**
 * AI Language Resolution & Prompt Generation Logic
 */
export function resolveAiLanguage(config) {
  return (config && config.language) || 'en';
}

export function createFallbackStepItem(step, stepIndex, language = 'en') {
  const target = step.uiaName || step.title || (language === 'id' ? `Elemen ${stepIndex}` : `Element ${stepIndex}`);
  const app = step.uiaAppName || (language === 'id' ? 'Aplikasi' : 'Application');
  const isSnapshot = step.actionType === 'snapshot' || step.actionType === 'navigation';

  if (language === 'id') {
    const verb = isSnapshot ? 'Tinjau' : 'Klik';
    return {
      id: step.id,
      title: `${verb} ${target}`,
      richInstructions: isSnapshot
        ? `<p>Tinjau <strong>${target}</strong> di <em>${app}</em>.</p>`
        : `<p>Klik pada kontrol <strong>${target}</strong> di <em>${app}</em> untuk melanjutkan prosedur.</p>`,
      sectionTitle: step.sectionTitle,
    };
  }

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

export function buildBatchSystemPrompt(language = 'en', groupByChapters = false, isFirstBatch = false) {
  if (language === 'id') {
    return `Anda adalah seorang penulis teknis profesional dan penyusun SOP (Standar Operasional Prosedur) ahli.
Tugas Anda adalah menganalisis urutan rekaman alur kerja pengguna dan menulis judul panduan serta instruksi langkah prosedural yang jelas, profesional, dan berorientasi tindakan dalam Bahasa Indonesia yang baku.

Panduan:
1. "title": Judul tindakan imperatif yang ringkas dan profesional dalam Bahasa Indonesia (contoh: "Pilih Tab Profil", "Buka Pengaturan Akun", "Kirim Formulir", "Unduh Penginstal"). JANGAN hanya mengulang nama aplikasi atau judul jendela mentah.
2. "richInstructions": Tulis 1-2 kalimat prosedural yang jelas dan terstruktur dalam format HTML menggunakan tag <p>, <strong>, dan <em> yang menyorot kontrol, tombol, atau elemen yang diklik (contoh: "<p>Klik pada tab <strong>Pengalaman Kerja</strong> di <em>READY</em> untuk melihat riwayat kerja.</p>").
${groupByChapters ? '3. "sectionTitle": Kelompokkan langkah-langkah berurutan terkait ke dalam bab alur kerja logis (contoh: "Bab 1: Masuk Pengguna", "Bab 2: Konfigurasi Profil", "Bab 3: Verifikasi Sistem").' : ''}
4. Pertahankan nilai "id" yang tepat untuk setiap langkah dalam respon Anda.
${isFirstBatch ? '5. Berikan "projectTitle" ringkasan panduan yang profesional dalam Bahasa Indonesia.' : ''}
6. Kembalikan secara ketat dalam format JSON yang valid:
{
  ${isFirstBatch ? '"projectTitle": "Judul Panduan Lengkap",' : ''}
  "steps": [
    {
      "id": "step_id",
      "title": "Judul Tindakan",
      "richInstructions": "<p>Teks instruksi dengan <strong>Elemen</strong> yang disorot.</p>"${groupByChapters ? ',\n      "sectionTitle": "Nama Bab / Bagian"' : ''}
    }
  ]
}
Penting: Jangan memberikan komentar atau teks percakapan. Kembalikan objek JSON secara langsung.`;
  }

  return `You are an expert technical writer and standard operating procedure (SOP) author.
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
}

export function buildRewriteSystemPrompt(language = 'en') {
  if (language === 'id') {
    return `Anda adalah seorang penulis teknis profesional dan penyusun SOP (Standar Operasional Prosedur) ahli.
Tugas Anda adalah menulis ulang dan menyempurnakan instruksi langkah berikut agar lebih profesional, jelas, dan berorientasi tindakan dalam Bahasa Indonesia yang baku.

Panduan:
1. "title": Judul tindakan imperatif yang ringkas dalam Bahasa Indonesia yang menjelaskan tindakan pengguna (contoh: "Pilih Tab Profil", "Buka Pengaturan Akun", "Kirim Formulir"). JANGAN hanya mengulang nama aplikasi atau judul jendela mentah.
2. "richInstructions": 1-3 kalimat instruksi yang jelas dalam Bahasa Indonesia berformat HTML dengan tag <p>, <strong>, dan <em> yang menyorot tombol atau elemen yang diklik.
3. Kembalikan secara ketat dalam format JSON yang valid:
{
  "title": "Judul Tindakan",
  "richInstructions": "<p>Instruksi dengan <strong>elemen</strong> yang disorot.</p>"
}
Penting: Jangan memberikan komentar percakapan. Kembalikan objek JSON secara langsung.`;
  }

  return `You are an expert technical writer and standard operating procedure (SOP) author.
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
}

function runAiLanguageTests() {
  console.log('🧪 Starting AI Language Support Verification Tests...\n');

  // Test 1: Language Resolution
  assert.strictEqual(resolveAiLanguage({}), 'en', 'Should default missing language to "en"');
  assert.strictEqual(resolveAiLanguage({ language: 'id' }), 'id', 'Should respect "id" language');
  assert.strictEqual(resolveAiLanguage({ language: 'en' }), 'en', 'Should respect "en" language');
  console.log('✅ [Language Resolution] Defaults to "en" and preserves "id"');

  // Test 2: Fallback Step Generation
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

  // Test 3: Indonesian Batch Prompts
  const idBatchPrompt = buildBatchSystemPrompt('id', true, true);
  assert(idBatchPrompt.includes('Bahasa Indonesia'), 'ID batch prompt must specify Bahasa Indonesia');
  assert(idBatchPrompt.includes('Bab 1:'), 'ID batch prompt must specify "Bab" for chapters');

  const enBatchPrompt = buildBatchSystemPrompt('en', true, true);
  assert(enBatchPrompt.includes('Chapter 1:'), 'EN batch prompt must specify "Chapter" for chapters');
  console.log('✅ [Batch Prompts] Bilingual prompt templates generate expected localized guidance');

  // Test 4: Indonesian Rewrite Prompts
  const idRewritePrompt = buildRewriteSystemPrompt('id');
  assert(idRewritePrompt.includes('Bahasa Indonesia'), 'ID rewrite prompt must specify Bahasa Indonesia');

  const enRewritePrompt = buildRewriteSystemPrompt('en');
  assert(enRewritePrompt.includes('expert technical writer'), 'EN rewrite prompt preserved');
  console.log('✅ [Rewrite Prompts] Single step rewrite prompts localize properly');

  console.log('\n🎉 All AI Language Support Tests Passed Successfully!');
}

runAiLanguageTests();
