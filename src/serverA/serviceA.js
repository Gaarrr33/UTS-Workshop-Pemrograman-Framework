const crypto = require('node:crypto');
const config = require('../config');
const { getSourceData } = require('../database/dbA');
const { encryptPayload } = require('../crypto/hybridCrypto');
const { getServerBPublicKey } = require('../crypto/keyManager');

/**
 * Service untuk Server A:
 * Membaca data DB A, membungkus payload, mengenkripsi dengan AES-256-GCM + RSA-OAEP,
 * dan mengirimkannya ke Server B melalui HTTP POST.
 */
async function initiateEncryptedTransfer(options = {}) {
  // 1. Baca data kategori dan produk dari DB A
  const sourceData = await getSourceData();

  if (!sourceData.categories.length && !sourceData.products.length) {
    throw new Error('Database A kosong. Silakan lakukan seed data terlebih dahulu.');
  }

  // 2. Bentuk payload JSON terstruktur
  const transferUuid = options.transferUuid || crypto.randomUUID();
  const payloadToEncrypt = {
    source: 'Server-A',
    transferUuid,
    timestamp: new Date().toISOString(),
    categories: sourceData.categories,
    products: sourceData.products
  };

  // 3. Ambil Public Key Server B
  const serverBPublicKey = options.recipientPublicKey || getServerBPublicKey();

  // 4. Enkripsi payload menggunakan AES-256-GCM dan bungkus AES key dengan RSA-OAEP SHA-256
  const encryptedPackage = encryptPayload(payloadToEncrypt, serverBPublicKey, {
    transferUuid,
    sourceHost: `localhost:${config.PORT_SERVER_A}`,
    targetHost: `localhost:${config.PORT_SERVER_B}`,
    recordCounts: {
      categories: sourceData.categories.length,
      products: sourceData.products.length
    }
  });

  // 5. Kirim ke Server B melalui HTTP POST
  const targetUrl = options.targetUrl || `${config.SERVER_B_URL}/api/receiver/transfers`;
  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(encryptedPackage)
  });

  const responseJson = await response.json();

  if (!response.ok) {
    const error = new Error(responseJson.message || 'Gagal mengirim paket terenkripsi ke Server B');
    error.status = response.status;
    error.details = responseJson;
    throw error;
  }

  return {
    success: true,
    message: 'Transfer terenkripsi berhasil dikirim dari Server A ke Server B',
    transferUuid,
    encryptedPackageSent: {
      encryptedKeySnippet: encryptedPackage.encryptedKey.substring(0, 32) + '...',
      iv: encryptedPackage.iv,
      authTag: encryptedPackage.authTag,
      ciphertextSizeChars: encryptedPackage.ciphertext.length,
      algorithm: encryptedPackage.algorithm
    },
    serverBResponse: responseJson
  };
}

module.exports = {
  initiateEncryptedTransfer
};
