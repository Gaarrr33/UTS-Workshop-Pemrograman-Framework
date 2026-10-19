const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3100;

app.use(cors());
app.use(express.json());

// Log setiap request yang masuk
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] [Server Cadangan :3100] ${req.method} ${req.url}`);
  next();
});

// Endpoint data kategori cadangan (fallback) sesuai Modul 11
app.get(['/apiserverb/kategori', '/apiserverb/kategori/'], (req, res) => {
  res.json({
    status: true,
    message: 'Data kategori berhasil diambil dari Server Cadangan (Port 3100)',
    server: 'Server Cadangan (Fallback)',
    data: [
      {
        id: 135,
        id_kategori: 135,
        nama: 'data kategori server b',
        nama_kategori: 'data kategori server b'
      },
      {
        id: 134,
        id_kategori: 134,
        nama: 'Kursi kayu',
        nama_kategori: 'Kursi kayu'
      }
    ]
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'UP', server: 'Server Cadangan (Server B / Fallback)', port: PORT });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` SERVER CADANGAN (SERVER B) BERJALAN PADA PORT ${PORT}`);
  console.log(` Endpoint: http://localhost:${PORT}/apiserverb/kategori/`);
  console.log(`=======================================================`);
});
