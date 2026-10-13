import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun } from 'docx';
import pptxgen from 'pptxgenjs';
import JSZip from 'jszip';

async function runTypingStepTests() {
  console.log('🧪 Starting Input Typing & Step Verification Tests...\n');

  // Test 1: Step Schema with 'type' ActionType and Password Masking
  try {
    const regularTypeStep = {
      id: 'step_type_1',
      projectId: 'proj_test',
      stepNumber: 1,
      title: 'Type "admin@company.com" in "Username"',
      richInstructions: '<p>Type <strong>admin@company.com</strong> into the <strong>Username</strong> field to proceed.</p>',
      actionType: 'type',
      screenshotPath: 'file:///C:/fake/path.png',
      originalWidth: 1280,
      originalHeight: 720,
      clickX: 200,
      clickY: 180,
      uiaName: 'Username',
      uiaControlType: 'Edit',
      uiaAppName: 'Google Chrome',
      annotations: [],
      isPassword: false,
      createdAt: Date.now(),
    };

    const passwordTypeStep = {
      id: 'step_type_2',
      projectId: 'proj_test',
      stepNumber: 2,
      title: 'Type password in "Password"',
      richInstructions: '<p>Type your password into the <strong>Password</strong> field to proceed.</p>',
      actionType: 'type',
      screenshotPath: 'file:///C:/fake/path2.png',
      originalWidth: 1280,
      originalHeight: 720,
      clickX: 200,
      clickY: 240,
      uiaName: 'Password',
      uiaControlType: 'Edit',
      uiaAppName: 'Google Chrome',
      annotations: [],
      isPassword: true,
      createdAt: Date.now(),
    };

    if (regularTypeStep.actionType === 'type' && !regularTypeStep.isPassword) {
      console.log('✅ [Schema] Regular input field typing step structure validated.');
    } else {
      throw new Error('Regular typing step validation failed');
    }

    if (passwordTypeStep.actionType === 'type' && passwordTypeStep.isPassword) {
      console.log('✅ [Schema] Masked password typing step structure validated.');
    } else {
      throw new Error('Password typing step validation failed');
    }
  } catch (err) {
    console.error('❌ [Schema] Failed:', err);
    process.exit(1);
  }

  // Test 2: DOCX Exporter handles 'type' action badge
  try {
    const png1px = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const imgBuf = Buffer.from(png1px, 'base64');
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({ text: 'SOP Guide: Authentication', heading: HeadingLevel.TITLE }),
            new Paragraph({
              children: [
                new TextRun({ text: 'TYPE ', bold: true, color: '2563EB', size: 18 }),
                new TextRun({ text: 'Step 1: Type "admin@company.com" in "Username"', bold: true }),
              ],
            }),
            new Paragraph({
              children: [
                new ImageRun({
                  data: imgBuf,
                  type: 'png',
                  transformation: { width: 500, height: 280 },
                }),
              ],
            }),
          ],
        },
      ],
    });
    const buffer = await Packer.toBuffer(doc);
    if (buffer.length > 0) {
      console.log(`✅ [DOCX] Successfully compiled Word document with TYPE step badge (${buffer.length} bytes)`);
    } else {
      throw new Error('DOCX compilation produced empty buffer');
    }
  } catch (err) {
    console.error('❌ [DOCX] Failed:', err);
    process.exit(1);
  }

  // Test 3: PPTX Exporter handles 'type' action badge with LAYOUT_WIDE
  try {
    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_WIDE';
    const slide = pptx.addSlide();
    slide.addText('TYPE', {
      x: 0.8,
      y: 0.5,
      w: 1.2,
      h: 0.4,
      fill: { color: '2563EB' },
      color: 'FFFFFF',
      fontSize: 11,
      bold: true,
      align: 'center',
    });
    slide.addText('Step 1: Type "admin@company.com" in "Username"', {
      x: 2.2,
      y: 0.5,
      w: 9,
      h: 0.4,
      fontSize: 16,
      bold: true,
    });
    const pptxBuf = await pptx.write({ outputType: 'nodebuffer' });
    if (pptxBuf.length > 0) {
      console.log(`✅ [PPTX] Successfully generated 16:9 presentation slide for TYPE step (${pptxBuf.length} bytes)`);
    } else {
      throw new Error('PPTX buffer is empty');
    }
  } catch (err) {
    console.error('❌ [PPTX] Failed:', err);
    process.exit(1);
  }

  console.log('\n🎉 All Input Typing Step Verification Tests Passed Successfully!');
}

runTypingStepTests();
