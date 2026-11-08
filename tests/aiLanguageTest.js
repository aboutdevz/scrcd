import assert from 'assert';

function testAiLanguage() {
  console.log('🧪 Starting AI Language Support Verification Tests...\n');

  // Test 1: Default language resolution when missing
  function resolveAiLanguage(config) {
    return (config && config.language) || 'en';
  }

  assert.strictEqual(resolveAiLanguage({}), 'en', 'Should default missing language to "en"');
  assert.strictEqual(resolveAiLanguage({ language: 'id' }), 'id', 'Should respect "id" language');
  assert.strictEqual(resolveAiLanguage({ language: 'en' }), 'en', 'Should respect "en" language');
  console.log('✅ [Language Resolution] Defaults to "en" and preserves "id"');
}

testAiLanguage();
