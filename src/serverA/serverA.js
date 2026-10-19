const express = require('express');
const cors = require('cors');
const config = require('../config');
const { initDbA, getAllCategories, getAllProducts } = require('../database/dbA');
const { seedDatabaseA } = require('../database/seeder');
const { initiateEncryptedTransfer } = require('./serviceA');

function createServerAApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Inisialisasi skema DB A
  initDbA();

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'UP',
      service: 'Server A (Source Server)',
      timestamp: new Date().toISOString(),
      database: 'db_a (MySQL XAMPP)',
      port: config.PORT_SERVER_A
    });
  });

  // Ambil daftar kategori dari DB A (atau format fallback Modul 11)
  app.get(['/api/kategori', '/api/kategori/'], async (req, res) => {
    try {
      res.json({
        status: true,
        message: 'Data kategori dari Server A',
        server: 'Server A',
        data: [
          { id: 134, id_kategori: 134, nama: 'Kursi kayu dari server A', nama_kategori: 'Kursi kayu dari server A' },
          { id: 133, id_kategori: 133, nama: 'Kursi kayu', nama_kategori: 'Kursi kayu' }
        ]
      });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  });

  // Ambil daftar kategori dari DB A
  app.get('/api/source/categories', async (req, res) => {
    try {
      const categories = await getAllCategories();
      res.json({ success: true, count: categories.length, data: categories });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Ambil daftar produk dari DB A
  app.get('/api/source/products', async (req, res) => {
    try {
      const products = await getAllProducts();
      res.json({ success: true, count: products.length, data: products });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Seed data di DB A (Aman: hanya jika tabel kosong)
  app.post('/api/source/seed', async (req, res) => {
    try {
      const result = await seedDatabaseA();
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // TAHAP 1: Mulai transfer terenkripsi dari DB A ke Server B
  app.post('/api/transfers', async (req, res) => {
    try {
      const result = await initiateEncryptedTransfer(req.body);
      res.status(201).json(result);
    } catch (err) {
      const statusCode = err.status || 500;
      res.status(statusCode).json({
        success: false,
        message: err.message,
        details: err.details || null
      });
    }
  });

  // Error handler terpusat
  app.use((err, req, res, next) => {
    console.error('[Server A Error]', err);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan internal pada Server A',
      error: err.message
    });
  });

  return app;
}

module.exports = {
  createServerAApp
};
