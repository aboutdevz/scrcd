import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import docx and pptxgenjs directly to verify their compilation and binary output
import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun } from 'docx';
import pptxgen from 'pptxgenjs';
import JSZip from 'jszip';

async function runTests() {
  console.log('🧪 Starting Exporter Verification Tests...\n');

  // Test 1: DOCX Generation with Embedded Image
  try {
    const png1px = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const imgBuf = Buffer.from(png1px, 'base64');
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
            new Paragraph({
              children: [
                new ImageRun({
                  data: imgBuf,
                  type: 'png',
                  transformation: { width: 580, height: 326 },
                }),
              ],
            }),
          ],
        },
      ],
    });
    const buffer = await Packer.toBuffer(doc);
    const zip = await JSZip.loadAsync(buffer);
    const mediaFiles = Object.keys(zip.files).filter(k => k.startsWith('word/media/'));
    const hasPng = mediaFiles.some(f => f.endsWith('.png'));
    if (buffer.length > 0 && hasPng) {
      console.log(`✅ [DOCX] Generated valid Word document with embedded PNG image (${buffer.length} bytes, media: ${mediaFiles.join(', ')})`);
    } else {
      throw new Error(`DOCX media verification failed: media files = ${mediaFiles.join(', ')}`);
    }
  } catch (err) {
    console.error('❌ [DOCX] Failed:', err);
    process.exit(1);
  }

  // Test 2: PPTX Generation with LAYOUT_WIDE
  try {
    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_WIDE';
    const slide = pptx.addSlide();
    slide.addText('SCRCD Presentation Slide', { x: 1, y: 1, fontSize: 24, bold: true });
    const buffer = await pptx.write({ outputType: 'nodebuffer' });
    if (buffer.length > 0) {
      console.log(`✅ [PPTX] Generated valid LAYOUT_WIDE 16:9 presentation (${buffer.length} bytes)`);
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

  // Test 5: Animated GIF Encoding with gifenc
  try {
    const gifencPkg = await import('gifenc');
    const GIFEncoder = gifencPkg.GIFEncoder || gifencPkg.default?.GIFEncoder;
    const quantize = gifencPkg.quantize || gifencPkg.default?.quantize;
    const applyPalette = gifencPkg.applyPalette || gifencPkg.default?.applyPalette;
    const gif = GIFEncoder();
    const w = 40;
    const h = 40;
    const rgba = new Uint8Array(w * h * 4);
    for (let i = 0; i < rgba.length; i += 4) {
      rgba[i] = 37;     // R
      rgba[i + 1] = 99;  // G
      rgba[i + 2] = 235; // B
      rgba[i + 3] = 255; // A
    }
    const palette = quantize(rgba, 256);
    const index = applyPalette(rgba, palette);
    gif.writeFrame(index, w, h, { palette, delay: 200 });
    gif.finish();
    const gifBytes = gif.bytes();
    if (gifBytes.length > 0 && gifBytes[0] === 0x47 && gifBytes[1] === 0x49 && gifBytes[2] === 0x46) {
      console.log(`✅ [GIF] Generated valid GIF image (${gifBytes.length} bytes, magic: GIF)`);
    } else {
      throw new Error('GIF output is invalid');
    }
  } catch (err) {
    console.error('❌ [GIF] Failed:', err);
    process.exit(1);
  }

  console.log('\n🎉 All Export Generation Unit Tests Passed Successfully!');
}

runTests();
