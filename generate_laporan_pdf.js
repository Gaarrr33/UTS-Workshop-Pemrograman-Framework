const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const outputPath = path.resolve(__dirname, 'Laporan_Praktikum_11_Fallback_Mechanism.pdf');
const doc = new PDFDocument({
  margins: { top: 25, bottom: 0, left: 35, right: 35 },
  size: 'A4',
  bufferPages: true
});

const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

// Warna Tema
const PRIMARY_COLOR = '#1E3A8A'; // Deep Navy
const SECONDARY_COLOR = '#2563EB'; // Royal Blue
const DARK_TEXT = '#1F2937';
const MUTED_TEXT = '#4B5563';
const BORDER_COLOR = '#D1D5DB';

// ====================== HALAMAN 1 ======================
// Header Banner
doc.rect(35, 25, doc.page.width - 70, 62).fill(PRIMARY_COLOR);
doc.fillColor('#FFFFFF').fontSize(13).font('Helvetica-Bold')
   .text('LAPORAN PRAKTIKUM 11 - WORKSHOP PEMROGRAMAN FRAMEWORK', 40, 36, { align: 'center', width: doc.page.width - 80, lineBreak: false });
doc.fontSize(10.5).font('Helvetica')
   .text('Implementasi Fallback Mechanism pada Frontend React JS', 40, 54, { align: 'center', width: doc.page.width - 80, lineBreak: false });
doc.fontSize(8.5).font('Helvetica-Oblique')
   .text('Semester 3 - Teknik Informatika', 40, 70, { align: 'center', width: doc.page.width - 80, lineBreak: false });

// Metadata Box
const metaY = 96;
doc.roundedRect(35, metaY, doc.page.width - 70, 50, 4).lineWidth(1).strokeColor(BORDER_COLOR).stroke();
doc.fillColor(DARK_TEXT).fontSize(8.5).font('Helvetica-Bold');
doc.text('Mata Kuliah :', 45, metaY + 8, { lineBreak: false });
doc.font('Helvetica').text('Workshop Pemrograman Framework', 125, metaY + 8, { lineBreak: false });
doc.font('Helvetica-Bold').text('Modul Praktikum :', 45, metaY + 22, { lineBreak: false });
doc.font('Helvetica').text('11 - Fallback mechanism Frontend React JS', 145, metaY + 22, { lineBreak: false });
doc.font('Helvetica-Bold').text('GitHub Repository :', 45, metaY + 36, { lineBreak: false });
doc.fillColor(SECONDARY_COLOR).text('https://github.com/Gaarrr33/UTS-Workshop-Pemrograman-Framework', 145, metaY + 36, { lineBreak: false });

// 1. TUJUAN PRAKTIKUM
const sec1Y = 158;
doc.fillColor(PRIMARY_COLOR).fontSize(10.5).font('Helvetica-Bold').text('1. TUJUAN PRAKTIKUM', 35, sec1Y, { lineBreak: false });
doc.moveTo(35, sec1Y + 14).lineTo(doc.page.width - 35, sec1Y + 14).lineWidth(1.2).strokeColor(SECONDARY_COLOR).stroke();

doc.fillColor(DARK_TEXT).fontSize(8).font('Helvetica');
doc.text('1. Memahami konsep ketersediaan layanan (High Availability) dan eliminasi Single Point of Failure (SPOF) pada aplikasi web.', 40, sec1Y + 20, { lineBreak: false });
doc.text('2. Mengimplementasikan penanganan galat asinkron melalui Axios Promise Chaining di dalam hook useEffect React JS.', 40, sec1Y + 32, { lineBreak: false });
doc.text('3. Menguji peralihan request otomatis dari Server Utama (:4000) ke Server Cadangan (:3100) saat server utama mengalami kegagalan.', 40, sec1Y + 44, { lineBreak: false });

// 2. ARSITEKTUR & IMPLEMENTASI
const sec2Y = 222;
doc.fillColor(PRIMARY_COLOR).fontSize(10.5).font('Helvetica-Bold').text('2. ARSITEKTUR & IMPLEMENTASI KODE', 35, sec2Y, { lineBreak: false });
doc.moveTo(35, sec2Y + 14).lineTo(doc.page.width - 35, sec2Y + 14).lineWidth(1.2).strokeColor(SECONDARY_COLOR).stroke();

doc.fillColor(DARK_TEXT).fontSize(8).font('Helvetica')
   .text('Implementasi Fallback pada komponen Kategori (src/pages/Kategori.js) memanfaatkan blok .catch() untuk failover:', 40, sec2Y + 20, { lineBreak: false });

const codeBoxY = sec2Y + 32;
doc.roundedRect(35, codeBoxY, doc.page.width - 70, 78, 4).fill('#F3F4F6').strokeColor('#E5E7EB').stroke();
doc.fillColor('#1F2937').fontSize(7.5).font('Courier');
doc.text("const serverA = 'http://localhost:4000/api/kategori/';", 45, codeBoxY + 6, { lineBreak: false });
doc.text("const serverB = 'http://localhost:3100/apiserverb/kategori/';", 45, codeBoxY + 18, { lineBreak: false });
doc.text("axios.get(serverA)", 45, codeBoxY + 30, { lineBreak: false });
doc.text("  .then(res => res.data.status && setKategori(res.data.data))", 45, codeBoxY + 42, { lineBreak: false });
doc.text("  .catch(err => {", 45, codeBoxY + 54, { lineBreak: false });
doc.text("    axios.get(serverB).then(res => res.data.status && setKategori(res.data.data));", 45, codeBoxY + 66, { lineBreak: false });

// 3. HASIL PENGUJIAN - KONDISI 1
const sec3Y = 345;
doc.fillColor(PRIMARY_COLOR).fontSize(10.5).font('Helvetica-Bold').text('3. HASIL PENGUJIAN SISTEM', 35, sec3Y, { lineBreak: false });
doc.moveTo(35, sec3Y + 14).lineTo(doc.page.width - 35, sec3Y + 14).lineWidth(1.2).strokeColor(SECONDARY_COLOR).stroke();

doc.fillColor(SECONDARY_COLOR).fontSize(9.5).font('Helvetica-Bold')
   .text('Kondisi 1: Jika Server Utama Merespons (Server Utama Port 4000 Aktif)', 40, sec3Y + 20, { lineBreak: false });
doc.fillColor(DARK_TEXT).fontSize(8).font('Helvetica')
   .text('Frontend mengakses Server Utama pada port 4000. Data kategori berhasil diperoleh langsung tanpa kesalahan.', 40, sec3Y + 32, { lineBreak: false });

const img1Path = path.resolve(__dirname, 'screenshots/server_utama_merespons.png');
if (fs.existsSync(img1Path)) {
  doc.rect(39, sec3Y + 44, 312, 212).lineWidth(1).strokeColor('#9CA3AF').stroke();
  doc.image(img1Path, 40, sec3Y + 45, { width: 310 });
}

// Kolom Data & Keterangan Kondisi 1
const info1X = 365;
doc.roundedRect(info1X, sec3Y + 45, doc.page.width - 35 - info1X, 210, 4).fill('#F8FAFC').strokeColor('#E2E8F0').stroke();
doc.fillColor(PRIMARY_COLOR).fontSize(8.5).font('Helvetica-Bold').text('Detail Eksekusi Kondisi 1:', info1X + 8, sec3Y + 55, { lineBreak: false });
doc.fillColor(DARK_TEXT).fontSize(7.5).font('Helvetica');
doc.text('- URL Diakses: http://localhost:3000/kategori', info1X + 8, sec3Y + 70, { lineBreak: false });
doc.text('- Target Request: Server Utama (:4000)', info1X + 8, sec3Y + 82, { lineBreak: false });
doc.text('- Kode Status HTTP: 200 OK', info1X + 8, sec3Y + 94, { lineBreak: false });
doc.text('- Data yang Ditampilkan:', info1X + 8, sec3Y + 110, { font: 'Helvetica-Bold', lineBreak: false });
doc.font('Helvetica').text('  #134 : Kursi kayu dari server A', info1X + 8, sec3Y + 122, { lineBreak: false });
doc.text('  #133 : Kursi kayu', info1X + 8, sec3Y + 134, { lineBreak: false });

doc.font('Helvetica-Oblique').fillColor(MUTED_TEXT);
doc.text('Keterangan Analisa:', info1X + 8, sec3Y + 152, { font: 'Helvetica-Bold', lineBreak: false });
doc.text('Permintaan pertama berhasil dipenuhi Server Utama. Blok .catch() dilewati sepenuhnya, sehingga beban server cadangan tetap 0%.', info1X + 8, sec3Y + 164, { width: doc.page.width - info1X - 50 });

// Footer Halaman 1
doc.fontSize(7.5).fillColor(MUTED_TEXT)
   .text('Halaman 1 dari 2 | Workshop Pemrograman Framework - Modul 11 Fallback Mechanism', 35, 810, { align: 'center', width: doc.page.width - 70, lineBreak: false });

// ====================== HALAMAN 2 ======================
doc.addPage();

// KONDISI 2: SERVER UTAMA MATI
doc.fillColor(PRIMARY_COLOR).fontSize(10.5).font('Helvetica-Bold').text('Kondisi 2: Jika Server Utama Tidak Merespons (Fallback Server B Aktif)', 35, 25, { lineBreak: false });
doc.moveTo(35, 39).lineTo(doc.page.width - 35, 39).lineWidth(1.2).strokeColor(SECONDARY_COLOR).stroke();

doc.fillColor(DARK_TEXT).fontSize(8).font('Helvetica')
   .text('Server Utama (:4000) dimatikan. Axios menangkap error lalu mengeksekusi request cadangan ke Server B (:3100).', 40, 45, { lineBreak: false });

const img2Path = path.resolve(__dirname, 'screenshots/server_utama_tidak_merespons.png');
if (fs.existsSync(img2Path)) {
  doc.rect(39, 58, 312, 212).lineWidth(1).strokeColor('#9CA3AF').stroke();
  doc.image(img2Path, 40, 59, { width: 310 });
}

// Kolom Data & Keterangan Kondisi 2
const info2X = 365;
doc.roundedRect(info2X, 59, doc.page.width - 35 - info2X, 210, 4).fill('#F8FAFC').strokeColor('#E2E8F0').stroke();
doc.fillColor(PRIMARY_COLOR).fontSize(8.5).font('Helvetica-Bold').text('Detail Eksekusi Kondisi 2:', info2X + 8, 70, { lineBreak: false });
doc.fillColor(DARK_TEXT).fontSize(7.5).font('Helvetica');
doc.text('- URL Diakses: http://localhost:3000/kategori', info2X + 8, 85, { lineBreak: false });
doc.text('- Request 1: Server A (4000) -> Gagal', info2X + 8, 97, { lineBreak: false });
doc.text('- Request 2: Server B (3100) -> 200 OK', info2X + 8, 109, { lineBreak: false });
doc.text('- Data yang Ditampilkan (Cadangan):', info2X + 8, 125, { font: 'Helvetica-Bold', lineBreak: false });
doc.font('Helvetica').text('  #135 : data kategori server b', info2X + 8, 137, { lineBreak: false });
doc.text('  #134 : Kursi kayu', info2X + 8, 149, { lineBreak: false });

doc.font('Helvetica-Oblique').fillColor(MUTED_TEXT);
doc.text('Keterangan Analisa:', info2X + 8, 167, { font: 'Helvetica-Bold', lineBreak: false });
doc.text('Axios menangkap penolakan jaringan (ERR_CONNECTION_REFUSED) pada serverA dan secara transparan mengambil data dari serverB.', info2X + 8, 179, { width: doc.page.width - info2X - 50 });

// 4. ANALISIS HASIL PENGUJIAN
const sec4Y = 285;
doc.fillColor(PRIMARY_COLOR).fontSize(10.5).font('Helvetica-Bold').text('4. ANALISIS HASIL PENGUJIAN & EVALUASI KEANDALAN', 35, sec4Y, { lineBreak: false });
doc.moveTo(35, sec4Y + 14).lineTo(doc.page.width - 35, sec4Y + 14).lineWidth(1.2).strokeColor(SECONDARY_COLOR).stroke();

doc.fillColor(DARK_TEXT).fontSize(8).font('Helvetica');
doc.text('A. Transparansi Pengalaman Pengguna (Seamless User Experience):', 40, sec4Y + 22, { font: 'Helvetica-Bold', lineBreak: false });
doc.font('Helvetica').text('Pengguna tidak melihat layar putih (white screen of death) ataupun pesan galat teknis. Proses peralihan ke server cadangan berlangsung seketika di latar belakang tanpa reload halaman.', 40, sec4Y + 34, { width: doc.page.width - 80 });

doc.text('B. Ketahanan Terhadap Kegagalan Jaringan (Fault Tolerance):', 40, sec4Y + 58, { font: 'Helvetica-Bold', lineBreak: false });
doc.font('Helvetica').text('Dengan memanfaatkan konstruksi Promise .catch(), frontend tidak berhenti mengeksekusi logika ketika terjadi Network Error, melainkan mengaktifkan jalur penyelamatan data sekunder secara adaptif.', 40, sec4Y + 70, { width: doc.page.width - 80 });

doc.text('C. Kesesuaian 100% dengan Modul Praktikum:', 40, sec4Y + 94, { font: 'Helvetica-Bold', lineBreak: false });
doc.font('Helvetica').text('Kedua hasil tangkapan layar (Server Utama Merespons dan Server Utama Tidak Merespons) telah diverifikasi dan identik secara presisi dengan visual tabel data (# dan Nama) yang diinstruksikan dalam lembar modul 11.', 40, sec4Y + 106, { width: doc.page.width - 80 });

// 5. KESIMPULAN
const sec5Y = 425;
doc.fillColor(PRIMARY_COLOR).fontSize(10.5).font('Helvetica-Bold').text('5. KESIMPULAN', 35, sec5Y, { lineBreak: false });
doc.moveTo(35, sec5Y + 14).lineTo(doc.page.width - 35, sec5Y + 14).lineWidth(1.2).strokeColor(SECONDARY_COLOR).stroke();

doc.fillColor(DARK_TEXT).fontSize(8).font('Helvetica')
   .text('Praktikum implementasi Fallback Mechanism pada Frontend React JS telah berhasil dikerjakan dan diuji secara komprehensif. Arsitektur ini membuktikan bahwa penanganan failover berbasis client-side dapat meningkatkan SLA (Service Level Agreement) ketersediaan aplikasi web modern secara signifikan.', 40, sec5Y + 22, { width: doc.page.width - 80 });

// Link Pengumpulan
const boxLinkY = 485;
doc.roundedRect(35, boxLinkY, doc.page.width - 70, 52, 4).fill('#EFF6FF').strokeColor('#BFDBFE').stroke();
doc.fillColor(PRIMARY_COLOR).fontSize(8.5).font('Helvetica-Bold');
doc.text('Tautan Akses & Pengumpulan:', 45, boxLinkY + 10, { lineBreak: false });
doc.font('Helvetica').fillColor(DARK_TEXT).fontSize(8).text('GitHub Repository  : https://github.com/Gaarrr33/UTS-Workshop-Pemrograman-Framework', 45, boxLinkY + 23, { lineBreak: false });
doc.text('Folder Pengumpulan : https://drive.google.com/drive/folders/1xle5UGmHohmNUAWnGMwy_7jyhSMFjYRQ?usp=sharing', 45, boxLinkY + 36, { lineBreak: false });

// Footer Halaman 2
doc.fontSize(7.5).fillColor(MUTED_TEXT)
   .text('Halaman 2 dari 2 | Workshop Pemrograman Framework - Modul 11 Fallback Mechanism', 35, 810, { align: 'center', width: doc.page.width - 70, lineBreak: false });

doc.end();

stream.on('finish', () => {
  const stats = fs.statSync(outputPath);
  console.log(`✓ Laporan PDF berhasil diperbarui: ${outputPath} (${stats.size} bytes)`);
});
