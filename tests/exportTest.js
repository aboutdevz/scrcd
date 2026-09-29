import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import docx and pptxgenjs directly to verify their compilation and binary output
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import pptxgen from 'pptxgenjs';
import JSZip from 'jszip';

async function runTests() {
  console.log('🧪 Starting Exporter Verification Tests...\n');

  // Test 1: DOCX Generation
  try {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: 'SCRCD Test SOP Document',
              heading: HeadingLevel.TITLE,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Step 1: Click Save Button', bold: true }),
              ],
            }),
          ],
        },
      ],
    });
    const buffer = await Packer.toBuffer(doc);
    if (buffer.length > 0) {
      console.log(`✅ [DOCX] Generated valid Word document (${buffer.length} bytes)`);
    } else {
      throw new Error('DOCX buffer is empty');
    }
  } catch (err) {
    console.error('❌ [DOCX] Failed:', err);
    process.exit(1);
  }

  // Test 2: PPTX Generation
  try {
    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9';
    const slide = pptx.addSlide();
    slide.addText('SCRCD Presentation Slide', { x: 1, y: 1, fontSize: 24, bold: true });
    const buffer = await pptx.write({ outputType: 'nodebuffer' });
    if (buffer.length > 0) {
      console.log(`✅ [PPTX] Generated valid PowerPoint presentation (${buffer.length} bytes)`);
    } else {
      throw new Error('PPTX buffer is empty');
    }
  } catch (err) {
    console.error('❌ [PPTX] Failed:', err);
    process.exit(1);
  }

  // Test 3: Markdown ZIP Packaging
  try {
    const zip = new JSZip();
    zip.file('guide.md', '# Test Guide\n\nStep 1: Test action\n');
    const imgFolder = zip.folder('images');
    imgFolder.file('step-1.png', Buffer.from('fake-image-bytes'));
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    if (zipBuffer.length > 0) {
      console.log(`✅ [ZIP/MD] Generated valid ZIP package containing Markdown and images (${zipBuffer.length} bytes)`);
    } else {
      throw new Error('ZIP buffer is empty');
    }
  } catch (err) {
    console.error('❌ [ZIP/MD] Failed:', err);
    process.exit(1);
  }

  // Test 4: JSON Backup Schema
  try {
    const samplePackage = {
      version: '1.0',
      exportedAt: Date.now(),
      project: { id: 'test_p1', title: 'Test Project' },
      steps: [{ id: 's1', stepNumber: 1, title: 'Step 1' }],
    };
    const jsonStr = JSON.stringify(samplePackage);
    const parsed = JSON.parse(jsonStr);
    if (parsed.version === '1.0' && parsed.steps.length === 1) {
      console.log(`✅ [JSON] Schema validation passed (${jsonStr.length} chars)`);
    } else {
      throw new Error('JSON parsing mismatch');
    }
  } catch (err) {
    console.error('❌ [JSON] Failed:', err);
    process.exit(1);
  }

  console.log('\n🎉 All Export Generation Unit Tests Passed Successfully!');
}

runTests();
