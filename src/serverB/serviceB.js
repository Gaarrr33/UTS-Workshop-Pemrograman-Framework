const {
  saveEncryptedTransfer,
  getTransferById,
  listTransfers,
  persistDecryptedData,
  getDestinationData
} = require('../database/dbB');
const { decryptPayload } = require('../crypto/hybridCrypto');
const { getServerBPrivateKey } = require('../crypto/keyManager');

/**
 * TAHAP 2: Menerima dan menyimpan paket terenkripsi ke DB B.
 * Validasi ketat format kriptografi sebelum menyimpan.
 * Paket disimpan langsung dalam bentuk terenkripsi (tidak didekripsi untuk penyimpanan).
 */
async function handleReceiveTransfer(encryptedPackage) {
  if (!encryptedPackage || typeof encryptedPackage !== 'object') {
    const error = new Error('Body request kosong atau format JSON tidak valid.');
    error.status = 400;
    throw error;
  }

  const { encryptedKey, iv, authTag, ciphertext } = encryptedPackage;

  // Validasi keberadaan atribut wajib
  if (!encryptedKey || !iv || !authTag || !ciphertext) {
    const error = new Error('Paket tidak valid: atribut encryptedKey, iv, authTag, dan ciphertext wajib diisi.');
    error.status = 422;
    throw error;
  }

  // Validasi format string Base64
  const base64Regex = /^[A-Za-z0-9+/=]+$/;
  if (
    !base64Regex.test(encryptedKey) ||
    !base64Regex.test(iv) ||
    !base64Regex.test(authTag) ||
    !base64Regex.test(ciphertext)
  ) {
    const error = new Error('Field kriptografi harus berupa representasi string Base64 yang valid.');
    error.status = 422;
    throw error;
  }

  // Simpan ke DB B secara atomik
  const savedRecord = await saveEncryptedTransfer(encryptedPackage);

  return {
    success: true,
    message: 'Paket terenkripsi berhasil divalidasi dan disimpan ke DB B tanpa dekripsi.',
    stage: 'TAHAP 2 — SIMPAN KE DB B SELESAI',
    transferId: savedRecord.id,
    transferUuid: savedRecord.transferUuid,
    status: savedRecord.status,
    timestamp: savedRecord.createdAt,
    storedMetadata: {
      algorithm: encryptedPackage.algorithm,
      ivLength: Buffer.from(iv, 'base64').length,
      authTagLength: Buffer.from(authTag, 'base64').length,
      ciphertextSizeChars: ciphertext.length
    }
  };
}

/**
 * TAHAP 3: Mengambil paket terenkripsi dari DB B berdasarkan ID.
 * Mengembalikan paket terenkripsi murni dan metadata tanpa plaintext.
 */
async function handleGetTransfer(id) {
  const record = await getTransferById(id);

  if (!record) {
    const error = new Error(`Data transfer dengan ID '${id}' tidak ditemukan di DB B.`);
    error.status = 404;
    throw error;
  }

  return {
    success: true,
    message: 'Paket terenkripsi berhasil diambil dari DB B.',
    stage: 'TAHAP 3 — GET DARI DB B SELESAI',
    transferId: record.id,
    transferUuid: record.transferUuid,
    status: record.status,
    createdAt: record.createdAt,
    encryptedPackage: {
      encryptedKey: record.encryptedKey,
      iv: record.iv,
      authTag: record.authTag,
      ciphertext: record.ciphertext,
      algorithm: record.algorithm,
      metadata: record.metadata
    }
  };
}

/**
 * TAHAP 4: Mendekripsi paket terenkripsi menggunakan Private Key Server B.
 * Memverifikasi integritas payload melalui authentication tag AES-256-GCM.
 */
async function handleDecryptTransfer(id, options = {}) {
  const record = await getTransferById(id);

  if (!record) {
    const error = new Error(`Data transfer dengan ID '${id}' tidak ditemukan di DB B.`);
    error.status = 404;
    throw error;
  }

  // Siapkan paket terenkripsi
  const encryptedPackage = {
    encryptedKey: options.tamperEncryptedKey || record.encryptedKey,
    iv: options.tamperIv || record.iv,
    authTag: options.tamperAuthTag || record.authTag,
    ciphertext: options.tamperCiphertext || record.ciphertext,
    algorithm: record.algorithm,
    metadata: record.metadata
  };

  // Ambil private key (bisa di-override untuk pengujian kegagalan kunci salah)
  const privateKey = options.overridePrivateKey || getServerBPrivateKey();

  // Jalankan dekripsi & verifikasi integritas
  let decryptedData;
  try {
    decryptedData = decryptPayload(encryptedPackage, privateKey);
  } catch (err) {
    const error = new Error(`Dekripsi ditolak: ${err.message}`);
    error.status = 422;
    error.code = err.code || 'ERR_DECRYPTION_FAILED';
    error.details = err.originalMessage || err.message;
    throw error;
  }

  // Opsional: sinkronkan data hasil dekripsi ke tabel tujuan DB B (kategori & produk)
  let syncResult = null;
  if (options.persistToDbB !== false) {
    syncResult = await persistDecryptedData(decryptedData);
  }

  return {
    success: true,
    message: 'Dekripsi berhasil dan integritas data terverifikasi (authentication tag valid).',
    stage: 'TAHAP 4 — DEKRIPSI & VERIFIKASI SELESAI',
    transferId: record.id,
    transferUuid: record.transferUuid,
    verification: {
      integrityVerified: true,
      symmetricAlgorithm: 'AES-256-GCM',
      asymmetricAlgorithm: 'RSA-OAEP (SHA-256)',
      privateKeyLocation: 'Server B (Authorized Decryption Component)'
    },
    syncResult,
    decryptedData
  };
}

module.exports = {
  handleReceiveTransfer,
  handleGetTransfer,
  handleDecryptTransfer,
  listTransfers,
  getDestinationData
};
