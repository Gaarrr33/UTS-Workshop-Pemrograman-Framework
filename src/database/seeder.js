const { initDbA } = require('./dbA');
const { getPoolA } = require('./mysqlClient');

const DEFAULT_CATEGORIES = [
  { id: 1, nama_kategori: 'Elektronik & Gadget' },
  { id: 2, nama_kategori: 'Aksesoris Komputer' },
  { id: 3, nama_kategori: 'Audio & Musik' }
];

const DEFAULT_PRODUCTS = [
  {
    id: 1,
    nama_produk: 'Laptop Pro 16 Inch M3 Max',
    harga_produk: 35999000.0,
    foto_produk: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500',
    id_kategori: 1
  },
  {
    id: 2,
    nama_produk: 'Smartphone Ultra 5G 256GB',
    harga_produk: 14499000.0,
    foto_produk: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500',
    id_kategori: 1
  },
  {
    id: 3,
    nama_produk: 'Mechanical Keyboard RGB Wireless',
    harga_produk: 1850000.0,
    foto_produk: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500',
    id_kategori: 2
  },
  {
    id: 4,
    nama_produk: 'Ergonomic Vertical Mouse Silent',
    harga_produk: 620000.0,
    foto_produk: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500',
    id_kategori: 2
  },
  {
    id: 5,
    nama_produk: 'Active Noise Cancelling Wireless Headphones',
    harga_produk: 3200000.0,
    foto_produk: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
    id_kategori: 3
  }
];

/**
 * Seed Database A di MySQL XAMPP.
 * SANGAT AMAN:
 * - Hanya mengisi data CONTOH jika tabel sumber masih KOSONG (count === 0).
 * - Tidak menggandakan data ketika dijalankan berulang kali.
 * - TIDAK PERNAH menjalankan DROP DATABASE, DROP TABLE, atau TRUNCATE.
 */
async function seedDatabaseA() {
  await initDbA();
  const pool = getPoolA();

  // 1. Periksa apakah tabel kategori sudah memiliki data
  const [catCountRows] = await pool.query('SELECT COUNT(*) as cnt FROM kategori');
  const existingCount = catCountRows[0].cnt;

  if (existingCount > 0) {
    const [prodCountRows] = await pool.query('SELECT COUNT(*) as cnt FROM produk');
    return {
      success: true,
      message: 'Tabel sumber sudah berisi data. Pengisian data contoh dilewati agar tidak menggandakan data.',
      skipped: true,
      categoriesCount: existingCount,
      productsCount: prodCountRows[0].cnt
    };
  }

  // 2. Jika tabel masih kosong, lakukan pengisian data awal
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (const cat of DEFAULT_CATEGORIES) {
      await conn.query(`
        INSERT INTO kategori (id, nama_kategori)
        VALUES (?, ?)
      `, [cat.id, cat.nama_kategori]);
    }

    for (const prod of DEFAULT_PRODUCTS) {
      await conn.query(`
        INSERT INTO produk (id, nama_produk, harga_produk, foto_produk, id_kategori)
        VALUES (?, ?, ?, ?, ?)
      `, [prod.id, prod.nama_produk, prod.harga_produk, prod.foto_produk, prod.id_kategori]);
    }

    await conn.commit();

    return {
      success: true,
      message: 'Data contoh berhasil dimasukkan karena tabel sumber sebelumnya kosong.',
      skipped: false,
      categoriesCount: DEFAULT_CATEGORIES.length,
      productsCount: DEFAULT_PRODUCTS.length
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  DEFAULT_CATEGORIES,
  DEFAULT_PRODUCTS,
  seedDatabaseA
};
