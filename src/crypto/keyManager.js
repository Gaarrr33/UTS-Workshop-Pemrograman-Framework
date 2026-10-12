const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const config = require('../config');

/**
 * Memastikan direktori untuk file kunci tersedia
 */
function ensureKeyDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Generate pasangan kunci RSA (Public & Private Key)
 * Menggunakan format SPKI untuk Public Key dan PKCS#8 untuk Private Key
 */
function generateRsaKeyPair(modulusLength = config.RSA_KEY_SIZE) {
  return crypto.generateKeyPairSync('rsa', {
    modulusLength,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
}

/**
 * Inisialisasi atau load kunci RSA Server B dari disk.
 * Jika file belum ada, sistem akan membuat pasangan kunci baru secara otomatis.
 */
function initServerBKeys(forceRegenerate = false) {
  ensureKeyDir(config.PUBLIC_KEY_PATH);
  ensureKeyDir(config.PRIVATE_KEY_PATH);

  const publicExists = fs.existsSync(config.PUBLIC_KEY_PATH);
  const privateExists = fs.existsSync(config.PRIVATE_KEY_PATH);

  if (!forceRegenerate && publicExists && privateExists) {
    const publicKey = fs.readFileSync(config.PUBLIC_KEY_PATH, 'utf8');
    const privateKey = fs.readFileSync(config.PRIVATE_KEY_PATH, 'utf8');
    return { publicKey, privateKey };
  }

  const { publicKey, privateKey } = generateRsaKeyPair();
  fs.writeFileSync(config.PUBLIC_KEY_PATH, publicKey, { encoding: 'utf8', mode: 0o644 });
  fs.writeFileSync(config.PRIVATE_KEY_PATH, privateKey, { encoding: 'utf8', mode: 0o600 });

  return { publicKey, privateKey };
}

/**
 * Mengambil Public Key Server B (dapat diakses oleh Server A untuk mengenkripsi AES key)
 */
function getServerBPublicKey() {
  if (!fs.existsSync(config.PUBLIC_KEY_PATH)) {
    initServerBKeys();
  }
  return fs.readFileSync(config.PUBLIC_KEY_PATH, 'utf8');
}

/**
 * Mengambil Private Key Server B (hanya boleh diakses oleh Server B untuk dekripsi)
 */
function getServerBPrivateKey() {
  if (!fs.existsSync(config.PRIVATE_KEY_PATH)) {
    initServerBKeys();
  }
  return fs.readFileSync(config.PRIVATE_KEY_PATH, 'utf8');
}

module.exports = {
  generateRsaKeyPair,
  initServerBKeys,
  getServerBPublicKey,
  getServerBPrivateKey
};
