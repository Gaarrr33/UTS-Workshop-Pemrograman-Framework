const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

// Log setiap request yang masuk
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] [Server Utama :4000] ${req.method} ${req.url}`);
  next();
});

// Endpoint data kategori sesuai Modul 11
app.get(['/api/kategori', '/api/kategori/'], (req, res) => {
  res.json({
    status: true,
    message: 'Data kategori berhasil diambil dari Server Utama (Port 4000)',
    server: 'Server Utama',
    data: [
      {
        id: 134,
        id_kategori: 134,
        nama: 'Kursi kayu dari server A',
        nama_kategori: 'Kursi kayu dari server A'
      },
      {
        id: 133,
        id_kategori: 133,
        nama: 'Kursi kayu',
        nama_kategori: 'Kursi kayu'
      }
    ]
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'UP', server: 'Server Utama (Server A)', port: PORT });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` SERVER UTAMA (SERVER A) BERJALAN PADA PORT ${PORT}`);
  console.log(` Endpoint: http://localhost:${PORT}/api/kategori/`);
  console.log(`=======================================================`);
});
