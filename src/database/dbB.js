const crypto = require('node:crypto');
const { ensureDatabasesExist, getPoolB } = require('./mysqlClient');

/**
 * Inisialisasi skema tabel DB B di MySQL/MariaDB
 * Sangat aman: Menggunakan CREATE TABLE IF NOT EXISTS (tanpa DROP TABLE atau TRUNCATE)
 */
async function initDbB() {
  await ensureDatabasesExist();
  const pool = getPoolB();

  // Tabel Transfers untuk menyimpan paket terenkripsi (ciphertext murni)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`transfers\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`transfer_uuid\` VARCHAR(64) NOT NULL UNIQUE,
      \`encrypted_key\` TEXT NOT NULL,
      \`iv\` VARCHAR(64) NOT NULL,
      \`auth_tag\` VARCHAR(64) NOT NULL,
      \`ciphertext\` LONGTEXT NOT NULL,
      \`algorithm_info\` TEXT NOT NULL,
      \`metadata\` TEXT,
      \`status\` VARCHAR(50) NOT NULL DEFAULT 'STORED_ENCRYPTED',
      \`created_at\` DATETIME NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Tabel Kategori tujuan di DB B (untuk data hasil dekripsi terverifikasi)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`kategori\` (
      \`id\` INT PRIMARY KEY,
      \`nama_kategori\` VARCHAR(255) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Tabel Produk tujuan di DB B
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`produk\` (
      \`id\` INT PRIMARY KEY,
      \`nama_produk\` VARCHAR(255) NOT NULL,
      \`harga_produk\` DECIMAL(15,2) NOT NULL,
      \`foto_produk\` TEXT NOT NULL,
      \`id_kategori\` INT NOT NULL,
      INDEX \`idx_produk_kategori_b\` (\`id_kategori\`),
      CONSTRAINT \`fk_produk_kategori_b\` FOREIGN KEY (\`id_kategori\`)
        REFERENCES \`kategori\` (\`id\`)
        ON DELETE RESTRICT ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  return pool;
}

/**
 * Menyimpan paket terenkripsi ke DB B secara atomik menggunakan transaksi.
 * Data disimpan dalam bentuk terenkripsi murni (tanpa didekripsi terlebih dahulu).
 */
async function saveEncryptedTransfer(encryptedPkg) {
  const pool = getPoolB();

  if (!encryptedPkg || typeof encryptedPkg !== 'object') {
    throw new Error('Paket terenkripsi tidak valid.');
  }

  const { encryptedKey, iv, authTag, ciphertext, algorithm, metadata } = encryptedPkg;

  if (!encryptedKey || !iv || !authTag || !ciphertext) {
    throw new Error('Field kriptografi wajib tidak lengkap (encryptedKey, iv, authTag, ciphertext).');
  }

  const transferUuid = (metadata && metadata.transferUuid) || crypto.randomUUID();
  const createdAt = (metadata && metadata.timestamp) ? new Date(metadata.timestamp) : new Date();
  const algoJson = JSON.stringify(algorithm || { symmetric: 'AES-256-GCM', asymmetric: 'RSA-OAEP', hash: 'SHA-256' });
  const metaJson = JSON.stringify(metadata || {});

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(`
      INSERT INTO transfers (
        transfer_uuid, encrypted_key, iv, auth_tag, ciphertext, algorithm_info, metadata, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'STORED_ENCRYPTED', ?)
    `, [transferUuid, encryptedKey, iv, authTag, ciphertext, algoJson, metaJson, createdAt]);

    await conn.commit();

    return {
      id: result.insertId,
      transferUuid,
      status: 'STORED_ENCRYPTED',
      createdAt: createdAt.toISOString()
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Mengambil paket terenkripsi dari DB B berdasarkan ID atau UUID
 */
async function getTransferById(idOrUuid) {
  const pool = getPoolB();
  let rows;

  if (typeof idOrUuid === 'number' || (!isNaN(Number(idOrUuid)) && String(idOrUuid).indexOf('-') === -1)) {
    [rows] = await pool.query('SELECT * FROM transfers WHERE id = ?', [Number(idOrUuid)]);
  } else {
    [rows] = await pool.query('SELECT * FROM transfers WHERE transfer_uuid = ?', [String(idOrUuid)]);
  }

  if (!rows || rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    id: row.id,
    transferUuid: row.transfer_uuid,
    encryptedKey: row.encrypted_key,
    iv: row.iv,
    authTag: row.auth_tag,
    ciphertext: row.ciphertext,
    algorithm: JSON.parse(row.algorithm_info || '{}'),
    metadata: JSON.parse(row.metadata || '{}'),
    status: row.status,
    createdAt: row.created_at
  };
}

/**
 * Mengambil daftar ringkasan transfer terenkripsi
 */
async function listTransfers() {
  const pool = getPoolB();
  const [rows] = await pool.query(`
    SELECT id, transfer_uuid, algorithm_info, metadata, status, created_at,
           CHAR_LENGTH(ciphertext) as ciphertext_size_chars
    FROM transfers 
    ORDER BY id DESC
  `);

  return rows.map((r) => ({
    id: r.id,
    transferUuid: r.transfer_uuid,
    algorithm: JSON.parse(r.algorithm_info || '{}'),
    metadata: JSON.parse(r.metadata || '{}'),
    status: r.status,
    createdAt: r.created_at,
    ciphertextSizeChars: r.ciphertext_size_chars
  }));
}

/**
 * Menyimpan data hasil dekripsi terverifikasi ke tabel tujuan DB B (kategori & produk)
 */
async function persistDecryptedData(data) {
  const pool = getPoolB();
  const categories = data.categories || [];
  const products = data.products || [];

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Upsert kategori ke DB B
    for (const cat of categories) {
      await conn.query(`
        INSERT INTO kategori (id, nama_kategori)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE nama_kategori = VALUES(nama_kategori)
      `, [cat.id, cat.nama_kategori]);
    }

    // Upsert produk ke DB B
    for (const prod of products) {
      await conn.query(`
        INSERT INTO produk (id, nama_produk, harga_produk, foto_produk, id_kategori)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          nama_produk = VALUES(nama_produk),
          harga_produk = VALUES(harga_produk),
          foto_produk = VALUES(foto_produk),
          id_kategori = VALUES(id_kategori)
      `, [prod.id, prod.nama_produk, prod.harga_produk, prod.foto_produk, prod.id_kategori]);
    }

    await conn.commit();
    return {
      categoriesCount: categories.length,
      productsCount: products.length
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function getDestinationData() {
  const pool = getPoolB();
  const [categories] = await pool.query('SELECT id, nama_kategori FROM kategori ORDER BY id ASC');
  const [products] = await pool.query(`
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
  return { categories, products };
}

module.exports = {
  initDbB,
  saveEncryptedTransfer,
  getTransferById,
  listTransfers,
  persistDecryptedData,
  getDestinationData
};
