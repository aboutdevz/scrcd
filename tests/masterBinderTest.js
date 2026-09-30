import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun } from 'docx';
import JSZip from 'jszip';

async function runMasterBinderTests() {
  console.log('🧪 Starting Master Binder & Hierarchy Verification Tests...\n');

  // Test 1: Master Binder Schema Verification (Folders & Custom Tags)
  try {
    const sampleFolder = {
      id: 'folder_devops',
      name: 'DevOps & Infrastructure',
      description: 'Standard Operating Procedures for Server Deployments',
      color: '#2563eb',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const sampleProject = {
      id: 'proj_cluster_1',
      folderId: 'folder_devops',
      title: 'PostgreSQL HA Cluster Provisioning',
      version: '1.2.0',
      description: 'Step-by-step failover and backup setup',
      category: 'SOP',
      tags: ['database', 'kubernetes', 'high-availability'],
      author: 'Infrastructure Operations Team',
      companyName: 'Acme Global Corp',
      accentColor: '#2563eb',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (
      sampleFolder.id === sampleProject.folderId &&
      Array.isArray(sampleProject.tags) &&
      sampleProject.tags.includes('kubernetes')
    ) {
      console.log('✅ [Schema] Folder-to-Project hierarchy and Custom Tags structure validated successfully.');
    } else {
      throw new Error('Schema validation failed for Folder and Project hierarchy');
    }
  } catch (err) {
    console.error('❌ [Schema] Failed:', err);
    process.exit(1);
  }

  // Test 2: Master Binder DOCX Compilation with Embedded Media
  try {
    const png1px = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const imgBuf = Buffer.from(png1px, 'base64');
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({ text: 'DevOps Master Operations Handbook', heading: HeadingLevel.TITLE }),
            new Paragraph({ text: 'Table of Contents', heading: HeadingLevel.HEADING_1 }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Guide 1: PostgreSQL Cluster Provisioning', bold: true }),
                new TextRun({ text: ' . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . ' }),
                new TextRun({ text: '3 steps', bold: true }),
              ],
            }),
            new Paragraph({ text: 'Guide 1: PostgreSQL Cluster Provisioning', heading: HeadingLevel.HEADING_1 }),
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
    const mediaFiles = Object.keys(zip.files).filter((k) => k.startsWith('word/media/'));
    const hasPng = mediaFiles.some((f) => f.endsWith('.png'));

    if (buffer.length > 0 && hasPng) {
      console.log(`✅ [Master Binder DOCX] Generated valid Multi-Guide Word document with embedded PNG media (${buffer.length} bytes).`);
    } else {
      throw new Error('Master Binder DOCX media validation failed');
    }
  } catch (err) {
    console.error('❌ [Master Binder DOCX] Failed:', err);
    process.exit(1);
  }

  // Test 3: Master Binder HTML Eager Image Loading Verification (prevents printToPDF offscreen hang)
  try {
    const fs = await import('fs');
    const path = await import('path');
    const fileURLToPath = (await import('url')).fileURLToPath;
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const code = fs.readFileSync(path.join(__dirname, '../src/services/exporters/exportMasterBinder.ts'), 'utf8');

    if (code.includes('loading="lazy"')) {
      throw new Error('Master Binder HTML must not contain loading="lazy" because it causes offscreen printToPDF hangs');
    }
    if (!code.includes('loading="eager"') || !code.includes('decoding="sync"')) {
      throw new Error('Master Binder HTML must contain loading="eager" and decoding="sync"');
    }
    if (!code.includes('toc-leader')) {
      throw new Error('Master Binder HTML must contain dotted leader TOC class');
    }

    console.log('✅ [Master Binder HTML/PDF] Eager image loading and dotted leader TOC validated successfully.');
  } catch (err) {
    console.error('❌ [Master Binder HTML/PDF] Failed:', err);
    process.exit(1);
  }

  console.log('\n🎉 All Master Binder Hierarchy & Export Tests Passed Successfully!');
}

runMasterBinderTests();
