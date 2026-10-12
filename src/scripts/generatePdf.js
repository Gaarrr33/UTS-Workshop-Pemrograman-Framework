const fs = require('node:fs');
const path = require('node:path');
const PDFDocument = require('pdfkit');

const ROOT_DIR = path.resolve(__dirname, '../..');
const MD_PATH = path.resolve(ROOT_DIR, 'laporan_uts.md');
const PDF_PATH = path.resolve(ROOT_DIR, 'laporan_uts.pdf');

function generatePdfReport() {
  console.log('--- Mengonversi laporan_uts.md ke format PDF ---');

  if (!fs.existsSync(MD_PATH)) {
    throw new Error('Berkas laporan_uts.md tidak ditemukan!');
  }

  const markdownContent = fs.readFileSync(MD_PATH, 'utf8');
  const lines = markdownContent.split('\n');

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    bufferPages: true
  });

  const writeStream = fs.createWriteStream(PDF_PATH);
  doc.pipe(writeStream);

  let inCodeBlock = false;
  let codeBuffer = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trimEnd();

    // Check code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        inCodeBlock = false;
        doc
          .font('Courier')
          .fontSize(7.5)
          .fillColor('#1e293b');

        const codeText = codeBuffer.join('\n');
        
        // Draw background box for code
        const currentY = doc.y;
        doc
          .rect(50, currentY, 495, doc.heightOfString(codeText) + 12)
          .fill('#f1f5f9');

        doc
          .fillColor('#0f172a')
          .text(codeText, 56, currentY + 6, { width: 483 });

        doc.y += 10;
        codeBuffer = [];
      } else {
        // Start code block
        inCodeBlock = true;
        codeBuffer = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    // Title & Headings
    if (line.startsWith('# ')) {
      doc
        .font('Helvetica-Bold')
        .fontSize(16)
        .fillColor('#1e3a8a')
        .text(line.replace('# ', ''), { align: 'center' });
      doc.moveDown(0.4);
    } else if (line.startsWith('## ')) {
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor('#3b82f6')
        .text(line.replace('## ', ''), { align: 'center' });
      doc.moveDown(0.4);
    } else if (line.startsWith('### ')) {
      doc
        .font('Helvetica-Bold')
        .fontSize(10.5)
        .fillColor('#1f2937')
        .text(line.replace('### ', ''), { align: 'center' });
      doc.moveDown(0.6);
    } else if (line.startsWith('---')) {
      doc
        .strokeColor('#cbd5e1')
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke();
      doc.moveDown(0.8);
    } else if (/^\d+\.\s/.test(line)) {
      // Main Section Header e.g. "1. ABSTRAK"
      doc.moveDown(0.6);
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor('#0f172a')
        .text(line);
      doc.moveDown(0.4);
    } else if (/^\d+\.\d+/.test(line)) {
      // Sub Section Header e.g. "5.1 Kriptografi Simetris"
      doc.moveDown(0.4);
      doc
        .font('Helvetica-Bold')
        .fontSize(10.5)
        .fillColor('#1e40af')
        .text(line);
      doc.moveDown(0.3);
    } else if (line.startsWith('|') && line.includes('---')) {
      // Table separator row - skip
      continue;
    } else if (line.startsWith('|')) {
      // Table row formatting
      const cells = line
        .split('|')
        .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
        .map(c => c.trim().replace(/\*\*/g, ''));
      
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#334155');

      const colWidth = 495 / (cells.length || 1);
      const rowY = doc.y;

      // Table cell background row
      doc.rect(50, rowY - 2, 495, 14).fill('#f8fafc');
      doc.fillColor('#1e293b');

      cells.forEach((cell, idx) => {
        doc.text(cell.substring(0, 45), 52 + (idx * colWidth), rowY, {
          width: colWidth - 4,
          ellipsis: true
        });
      });
      doc.y = rowY + 14;
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      // Bullet items
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#334155')
        .text(`•  ${line.substring(2).replace(/\*\*/g, '')}`, {
          indent: 12,
          lineGap: 2
        });
    } else if (line.trim() === '') {
      doc.moveDown(0.3);
    } else {
      // Regular text / paragraph
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#1e293b')
        .text(line.replace(/\*\*/g, ''), {
          align: 'justify',
          lineGap: 2.5
        });
    }
  }

  // Footer with Page Numbers
  const totalPages = doc.bufferedPageRange().count;
  for (let p = 0; p < totalPages; p++) {
    doc.switchToPage(p);
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#94a3b8')
      .text(
        `Laporan UTS Workshop Pemrograman Framework — Halaman ${p + 1} dari ${totalPages}`,
        50,
        800,
        { align: 'center', width: 495 }
      );
  }

  doc.end();

  writeStream.on('finish', () => {
    console.log(`✓ PDF berhasil dibuat di: ${PDF_PATH}`);
  });
}

generatePdfReport();
