const crypto = require('node:crypto');

/**
 * Enkripsi payload JSON menggunakan enkripsi hibrida:
 * 1. Generate session key AES-256 acak (32 byte).
 * 2. Generate IV/nonce acak (12 byte untuk GCM).
 * 3. Enkripsi data JSON dengan AES-256-GCM dan ambil authentication tag (16 byte).
 * 4. Bungkus (wrap) AES key menggunakan Public Key RSA-OAEP dengan hash SHA-256.
 *
 * @param {object|string} data - Payload yang akan dienkripsi
 * @param {string} recipientPublicKeyPem - Public key RSA penerima (Server B)
 * @param {object} customMetadata - Metadata tambahan transfer
 * @returns {object} Paket payload terenkripsi
 */
function encryptPayload(data, recipientPublicKeyPem, customMetadata = {}) {
  if (!recipientPublicKeyPem) {
    throw new Error('Public key penerima diperlukan untuk enkripsi.');
  }

  const plaintextString = typeof data === 'string' ? data : JSON.stringify(data);

  // 1. Generate random AES-256 session key (32 bytes = 256 bits)
  const sessionKey = crypto.randomBytes(32);

  // 2. Generate random IV/nonce (12 bytes recommended for AES-GCM)
  const iv = crypto.randomBytes(12);

  // 3. Enkripsi plaintext dengan AES-256-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', sessionKey, iv);
  const ciphertextBuffer = Buffer.concat([
    cipher.update(plaintextString, 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();

  // 4. Bungkus AES key dengan RSA-OAEP (SHA-256) menggunakan Public Key Server B
  const encryptedKeyBuffer = crypto.publicEncrypt(
    {
      key: recipientPublicKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    sessionKey
  );

  return {
    encryptedKey: encryptedKeyBuffer.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    ciphertext: ciphertextBuffer.toString('base64'),
    algorithm: {
      symmetric: 'AES-256-GCM',
      asymmetric: 'RSA-OAEP',
      hash: 'SHA-256'
    },
    metadata: {
      timestamp: new Date().toISOString(),
      ...customMetadata
    }
  };
}

/**
 * Dekripsi paket terenkripsi:
 * 1. Buka (unwrap) AES session key menggunakan Private Key Server B (RSA-OAEP SHA-256).
 * 2. Dekripsi ciphertext dengan AES-256-GCM menggunakan AES key, IV, dan verifikasi authTag.
 * 3. Jika authentication tag tidak cocok (data diubah/tampered), dekripsi gagal.
 *
 * @param {object} encryptedPackage - Objek paket hasil enkripsi
 * @param {string} recipientPrivateKeyPem - Private key RSA milik Server B
 * @returns {object} Payload JSON asli hasil dekripsi
 */
function decryptPayload(encryptedPackage, recipientPrivateKeyPem) {
  if (!recipientPrivateKeyPem) {
    throw new Error('Private key penerima diperlukan untuk dekripsi.');
  }

  if (!encryptedPackage || typeof encryptedPackage !== 'object') {
    throw new Error('Paket data terenkripsi tidak valid.');
  }

  const { encryptedKey, iv, authTag, ciphertext } = encryptedPackage;

  if (!encryptedKey || !iv || !authTag || !ciphertext) {
    throw new Error('Format paket kriptografi tidak lengkap: encryptedKey, iv, authTag, dan ciphertext wajib ada.');
  }

  const encryptedKeyBuffer = Buffer.from(encryptedKey, 'base64');
  const ivBuffer = Buffer.from(iv, 'base64');
  const authTagBuffer = Buffer.from(authTag, 'base64');
  const ciphertextBuffer = Buffer.from(ciphertext, 'base64');

  // Validasi panjang komponen kriptografi
  if (ivBuffer.length !== 12) {
    throw new Error(`Panjang IV tidak valid (${ivBuffer.length} bytes, seharusnya 12 bytes).`);
  }
  if (authTagBuffer.length !== 16) {
    throw new Error(`Panjang Auth Tag tidak valid (${authTagBuffer.length} bytes, seharusnya 16 bytes).`);
  }

  // 1. Unwrap AES key dengan RSA-OAEP SHA-256 menggunakan Private Key
  let sessionKey;
  try {
    sessionKey = crypto.privateDecrypt(
      {
        key: recipientPrivateKeyPem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      encryptedKeyBuffer
    );
  } catch (err) {
    const error = new Error('Gagal membuka kunci AES dengan Private Key (kunci privat salah atau data kunci rusak).');
    error.code = 'ERR_KEY_UNWRAP_FAILED';
    error.originalMessage = err.message;
    throw error;
  }

  if (sessionKey.length !== 32) {
    throw new Error('Panjang kunci simetrik tidak valid untuk AES-256.');
  }

  // 2. Dekripsi ciphertext dengan AES-256-GCM dan verifikasi authentication tag
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', sessionKey, ivBuffer);
    decipher.setAuthTag(authTagBuffer);

    const decryptedBuffer = Buffer.concat([
      decipher.update(ciphertextBuffer),
      decipher.final()
    ]);

    const plaintext = decryptedBuffer.toString('utf8');
    return JSON.parse(plaintext);
  } catch (err) {
    const error = new Error('Integritas data gagal diverifikasi atau ciphertext telah dimodifikasi (tampering detected).');
    error.code = 'ERR_INTEGRITY_CHECK_FAILED';
    error.originalMessage = err.message;
    throw error;
  }
}

module.exports = {
  encryptPayload,
  decryptPayload
};
