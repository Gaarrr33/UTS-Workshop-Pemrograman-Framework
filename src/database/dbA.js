const { ensureDatabasesExist, getPoolA } = require('./mysqlClient');

/**
 * Inisialisasi skema tabel DB A di MySQL/MariaDB
 * Sangat aman: Menggunakan CREATE TABLE IF NOT EXISTS (tanpa DROP TABLE atau TRUNCATE)
 */
async function initDbA() {
  await ensureDatabasesExist();
  const pool = getPoolA();

  // Tabel Kategori
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`kategori\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`nama_kategori\` VARCHAR(255) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Tabel Produk dengan Foreign Key ke Kategori
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`produk\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`nama_produk\` VARCHAR(255) NOT NULL,
      \`harga_produk\` DECIMAL(15,2) NOT NULL,
      \`foto_produk\` TEXT NOT NULL,
      \`id_kategori\` INT NOT NULL,
      INDEX \`idx_produk_kategori\` (\`id_kategori\`),
      CONSTRAINT \`fk_produk_kategori\` FOREIGN KEY (\`id_kategori\`)
        REFERENCES \`kategori\` (\`id\`)
        ON DELETE RESTRICT ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  return pool;
}

async function getAllCategories() {
  const pool = getPoolA();
  const [rows] = await pool.query('SELECT id, nama_kategori FROM kategori ORDER BY id ASC');
  return rows;
}

async function getAllProducts() {
  const pool = getPoolA();
  const [rows] = await pool.query(`
    SELECT 
      p.id, 
      p.nama_produk, 
      CAST(p.harga_produk AS DOUBLE) as harga_produk, 
      p.foto_produk, 
      p.id_kategori,
      k.nama_kategori
    FROM produk p
    JOIN kategori k ON p.id_kategori = k.id
    ORDER BY p.id ASC
  `);
  return rows;
}

async function getSourceData() {
  const categories = await getAllCategories();
  const products = await getAllProducts();
  return {
    categories,
    products,
    timestamp: new Date().toISOString()
  };
}

async function insertCategory(nama_kategori) {
  const pool = getPoolA();
  const [result] = await pool.query('INSERT INTO kategori (nama_kategori) VALUES (?)', [nama_kategori]);
  return result.insertId;
}

async function insertProduct(nama_produk, harga_produk, foto_produk, id_kategori) {
  const pool = getPoolA();
  const [result] = await pool.query(`
    INSERT INTO produk (nama_produk, harga_produk, foto_produk, id_kategori)
    VALUES (?, ?, ?, ?)
  `, [nama_produk, harga_produk, foto_produk, id_kategori]);
  return result.insertId;
}

module.exports = {
  initDbA,
  getAllCategories,
  getAllProducts,
  getSourceData,
  insertCategory,
  insertProduct
};
