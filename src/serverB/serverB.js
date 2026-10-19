const express = require('express');
const cors = require('cors');
const config = require('../config');
const { initDbB } = require('../database/dbB');
const { getServerBPublicKey } = require('../crypto/keyManager');
const {
  handleReceiveTransfer,
  handleGetTransfer,
  handleDecryptTransfer,
  listTransfers,
  getDestinationData
} = require('./serviceB');

function createServerBApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Inisialisasi skema DB B
  initDbB();

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'UP',
      service: 'Server B (Receiver & Decryption Server)',
      timestamp: new Date().toISOString(),
      database: 'db_b (MySQL XAMPP)',
      port: config.PORT_SERVER_B
    });
  });

  // Endpoint data kategori cadangan (fallback Modul 11)
  app.get(['/apiserverb/kategori', '/apiserverb/kategori/'], async (req, res) => {
    try {
      res.json({
        status: true,
        message: 'Data kategori dari Server B (Fallback)',
        server: 'Server B',
        data: [
          { id: 135, id_kategori: 135, nama: 'data kategori server b', nama_kategori: 'data kategori server b' },
          { id: 134, id_kategori: 134, nama: 'Kursi kayu', nama_kategori: 'Kursi kayu' }
        ]
      });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  });

  // Menyediakan Public Key Server B untuk enkripsi (RSA-OAEP)
  app.get('/api/receiver/public-key', (req, res) => {
    try {
      const publicKey = getServerBPublicKey();
      res.json({
        success: true,
        algorithm: 'RSA-OAEP (SHA-256)',
        keySize: config.RSA_KEY_SIZE,
        publicKey
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // TAHAP 2: Menerima dan menyimpan paket terenkripsi ke DB B
  app.post('/api/receiver/transfers', async (req, res) => {
    try {
      const result = await handleReceiveTransfer(req.body);
      res.status(201).json(result);
    } catch (err) {
      const statusCode = err.status || 500;
      res.status(statusCode).json({
        success: false,
        message: err.message,
        code: err.code || 'ERR_RECEIVE_TRANSFER'
      });
    }
  });

  // TAHAP 3: Menampilkan daftar riwayat transfer terenkripsi
  app.get('/api/receiver/transfers', async (req, res) => {
    try {
      const list = await listTransfers();
      res.json({ success: true, count: list.length, data: list });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // TAHAP 3: Mengambil paket terenkripsi dari DB B berdasarkan ID
  app.get('/api/receiver/transfers/:id', async (req, res) => {
    try {
      const result = await handleGetTransfer(req.params.id);
      res.json(result);
    } catch (err) {
      const statusCode = err.status || 500;
      res.status(statusCode).json({
        success: false,
        message: err.message
      });
    }
  });

  // TAHAP 4: Mendekripsi paket terenkripsi menggunakan Private Key Server B
  // Mendukung endpoint /api/transfers/:id/decrypt dan /api/receiver/transfers/:id/decrypt
  const decryptHandler = async (req, res) => {
    try {
      const result = await handleDecryptTransfer(req.params.id, req.body || {});
      res.json(result);
    } catch (err) {
      const statusCode = err.status || 500;
      res.status(statusCode).json({
        success: false,
        message: err.message,
        code: err.code || 'ERR_DECRYPT_FAILED',
        details: err.details || null
      });
    }
  };

  app.post('/api/transfers/:id/decrypt', decryptHandler);
  app.post('/api/receiver/transfers/:id/decrypt', decryptHandler);

  // Melihat data kategori & produk yang tersinkronisasi di DB B
  app.get('/api/receiver/data', async (req, res) => {
    try {
      const data = await getDestinationData();
      res.json({
        success: true,
        categoriesCount: data.categories.length,
        productsCount: data.products.length,
        data
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Error handler terpusat
  app.use((err, req, res, next) => {
    console.error('[Server B Error]', err);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan internal pada Server B',
      error: err.message
    });
  });

  return app;
}

module.exports = {
  createServerBApp
};
