const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const targetFilename = process.argv[2] || 'screenshot.png';
const url = process.argv[3] || 'http://localhost:3000/kategori';

const outputDir = path.resolve(__dirname, 'screenshots');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.resolve(outputDir, targetFilename);

const args = [
  '--headless',
  '--disable-gpu',
  '--hide-scrollbars',
  '--virtual-time-budget=4000',
  '--window-size=1000,680',
  `--screenshot=${outputPath}`,
  url
];

console.log(`Mengambil screenshot ke: ${outputPath}`);
console.log(`URL: ${url}`);

execFile(edgePath, args, (err, stdout, stderr) => {
  if (err) {
    console.error('Gagal mengambil screenshot:', err.message);
    process.exit(1);
  }
  if (fs.existsSync(outputPath)) {
    const stats = fs.statSync(outputPath);
    console.log(`✓ Screenshot BERHASIL disimpan: ${outputPath} (${stats.size} bytes)`);
  } else {
    console.error('Screenshot tidak ditemukan setelah proses selesai.');
    process.exit(1);
  }
});
