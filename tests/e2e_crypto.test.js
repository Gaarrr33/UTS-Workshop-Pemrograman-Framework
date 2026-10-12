const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const crypto = require('node:crypto');

const { initServerBKeys, getServerBPublicKey, getServerBPrivateKey, generateRsaKeyPair } = require('../src/crypto/keyManager');
const { encryptPayload, decryptPayload } = require('../src/crypto/hybridCrypto');
const { initDbA, getSourceData } = require('../src/database/dbA');
const { initDbB, getTransferById } = require('../src/database/dbB');
const { getPoolA, getPoolB, getRootPool } = require('../src/database/mysqlClient');
const { seedDatabaseA } = require('../src/database/seeder');
const { createServerAApp } = require('../src/serverA/serverA');
const { createServerBApp } = require('../src/serverB/serverB');

let appA;
let appB;

test.before(async () => {
  initServerBKeys();
  await initDbA();
  await initDbB();
  await seedDatabaseA();
  appA = createServerAApp();
  appB = createServerBApp();
});

test.after(async () => {
  // Tutup seluruh pool koneksi MySQL agar test runner keluar dengan bersih
  try {
    await getPoolA().end();
    await getPoolB().end();
    await getRootPool().end();
  } catch (_) {}
});

test('1. Enkripsi dan dekripsi menghasilkan kembali payload JSON yang identik secara semantik', () => {
  const sampleData = {
    test: 'UTS Workshop Framework MySQL',
    items: [
      { id: 1, name: 'Barang A', price: 50000 },
      { id: 2, name: 'Barang B', price: 120000 }
    ],
    metadata: { created: new Date().toISOString() }
  };

  const publicKey = getServerBPublicKey();
  const privateKey = getServerBPrivateKey();

  const encryptedPkg = encryptPayload(sampleData, publicKey, { tag: 'unit-test' });
  
  assert.ok(encryptedPkg.encryptedKey, 'Encrypted key harus ada');
  assert.ok(encryptedPkg.iv, 'IV harus ada');
  assert.ok(encryptedPkg.authTag, 'Auth tag harus ada');
  assert.ok(encryptedPkg.ciphertext, 'Ciphertext harus ada');

  const decryptedData = decryptPayload(encryptedPkg, privateKey);
  assert.deepStrictEqual(decryptedData, sampleData, 'Data hasil dekripsi harus identik dengan data asli');
});

test('2. Transfer dari DB A menuju Server B (Tahap 1 & 2) berhasil dan tersimpan di DB B', async () => {
  const source = await getSourceData();
  const publicKey = getServerBPublicKey();

  // Simulasi enkripsi paket oleh Server A
  const encryptedPkg = encryptPayload(source, publicKey, { transferUuid: crypto.randomUUID() });

  // Kirim ke Server B (Tahap 2)
  const res = await request(appB)
    .post('/api/receiver/transfers')
    .send(encryptedPkg)
    .expect(201);

  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.status, 'STORED_ENCRYPTED');
  assert.ok(res.body.transferId, 'Harus mengembalikan transferId');

  // Verifikasi tersimpan di DB B
  const inDb = await getTransferById(res.body.transferId);
  assert.ok(inDb, 'Record harus tersimpan di DB B');
  assert.strictEqual(inDb.ciphertext, encryptedPkg.ciphertext);
});

test('3. Body POST transfer tidak mengandung plaintext produk sama sekali', async () => {
  const source = await getSourceData();
  const publicKey = getServerBPublicKey();

  const encryptedPkg = encryptPayload(source, publicKey);
  const serializedBody = JSON.stringify(encryptedPkg);

  // Pastikan nama produk atau harga dari DB A tidak muncul sebagai teks biasa di body
  for (const prod of source.products) {
    assert.strictEqual(
      serializedBody.includes(prod.nama_produk),
      false,
      `Plaintext nama produk "${prod.nama_produk}" tidak boleh bocor di dalam payload paket terenkripsi!`
    );
  }
});

test('4. Data di DB B tersimpan sebagai paket terenkripsi murni', async () => {
  const source = await getSourceData();
  const publicKey = getServerBPublicKey();
  const encryptedPkg = encryptPayload(source, publicKey);

  const res = await request(appB)
    .post('/api/receiver/transfers')
    .send(encryptedPkg)
    .expect(201);

  const transferId = res.body.transferId;
  const stored = await getTransferById(transferId);

  // Periksa bahwa kolom ciphertext di DB B adalah string acak terenkripsi
  assert.strictEqual(typeof stored.ciphertext, 'string');
  assert.notStrictEqual(stored.ciphertext.length, 0);

  // Ciphertext TIDAK boleh dapat diparse sebagai JSON secara langsung
  assert.throws(() => {
    JSON.parse(stored.ciphertext);
  }, /SyntaxError/, 'Ciphertext yang tersimpan di DB B tidak boleh berbentuk JSON plaintext!');
});

test('5. GET /api/receiver/transfers/:id mengembalikan paket terenkripsi yang benar tanpa plaintext', async () => {
  const source = await getSourceData();
  const publicKey = getServerBPublicKey();
  const encryptedPkg = encryptPayload(source, publicKey);

  const postRes = await request(appB)
    .post('/api/receiver/transfers')
    .send(encryptedPkg)
    .expect(201);

  const transferId = postRes.body.transferId;

  // GET dari DB B
  const getRes = await request(appB)
    .get(`/api/receiver/transfers/${transferId}`)
    .expect(200);

  assert.strictEqual(getRes.body.success, true);
  assert.strictEqual(getRes.body.transferId, transferId);
  assert.strictEqual(getRes.body.encryptedPackage.ciphertext, encryptedPkg.ciphertext);
  assert.strictEqual(getRes.body.encryptedPackage.authTag, encryptedPkg.authTag);

  // Pastikan response GET tidak membocorkan plaintext produk
  const rawGetResponse = JSON.stringify(getRes.body);
  for (const prod of source.products) {
    assert.strictEqual(
      rawGetResponse.includes(prod.nama_produk),
      false,
      'Respons GET tidak boleh mengandung data produk plaintext'
    );
  }
});

test('6. Endpoint dekripsi POST /api/transfers/:id/decrypt menghasilkan data sumber yang benar', async () => {
  const source = await getSourceData();
  const publicKey = getServerBPublicKey();
  const encryptedPkg = encryptPayload(source, publicKey);

  const postRes = await request(appB)
    .post('/api/receiver/transfers')
    .send(encryptedPkg)
    .expect(201);

  const transferId = postRes.body.transferId;

  // Panggil endpoint dekripsi (Tahap 4)
  const decryptRes = await request(appB)
    .post(`/api/transfers/${transferId}/decrypt`)
    .send({ persistToDbB: true })
    .expect(200);

  assert.strictEqual(decryptRes.body.success, true);
  assert.strictEqual(decryptRes.body.verification.integrityVerified, true);
  assert.strictEqual(decryptRes.body.decryptedData.categories.length, source.categories.length);
  assert.strictEqual(decryptRes.body.decryptedData.products.length, source.products.length);

  // Pastikan nilai spesifik produk cocok
  assert.strictEqual(
    decryptRes.body.decryptedData.products[0].nama_produk,
    source.products[0].nama_produk
  );
});

test('7. Ciphertext yang dimodifikasi (tampered) wajib ditolak oleh verifikasi integritas', async () => {
  const source = await getSourceData();
  const publicKey = getServerBPublicKey();
  const encryptedPkg = encryptPayload(source, publicKey);

  const postRes = await request(appB)
    .post('/api/receiver/transfers')
    .send(encryptedPkg)
    .expect(201);

  const transferId = postRes.body.transferId;

  // Lakukan modifikasi pada ciphertext (pemalsuan bit data)
  const originalCiphertext = encryptedPkg.ciphertext;
  const tamperedCiphertext =
    originalCiphertext.slice(0, -6) + 'XYZ123' + originalCiphertext.slice(-2);

  const tamperRes = await request(appB)
    .post(`/api/transfers/${transferId}/decrypt`)
    .send({ tamperCiphertext: tamperedCiphertext })
    .expect(422);

  assert.strictEqual(tamperRes.body.success, false);
  assert.strictEqual(tamperRes.body.code, 'ERR_INTEGRITY_CHECK_FAILED');
  assert.match(tamperRes.body.message, /Integritas data gagal diverifikasi/);
});

test('8. Private key yang salah menyebabkan dekripsi gagal dan ditolak', async () => {
  const source = await getSourceData();
  const publicKey = getServerBPublicKey();
  const encryptedPkg = encryptPayload(source, publicKey);

  const postRes = await request(appB)
    .post('/api/receiver/transfers')
    .send(encryptedPkg)
    .expect(201);

  const transferId = postRes.body.transferId;

  // Generate pasangan kunci RSA acak lain (bukan milik Server B)
  const foreignKeyPair = generateRsaKeyPair(2048);

  const wrongKeyRes = await request(appB)
    .post(`/api/transfers/${transferId}/decrypt`)
    .send({ overridePrivateKey: foreignKeyPair.privateKey })
    .expect(422);

  assert.strictEqual(wrongKeyRes.body.success, false);
  assert.strictEqual(wrongKeyRes.body.code, 'ERR_KEY_UNWRAP_FAILED');
  assert.match(wrongKeyRes.body.message, /Gagal membuka kunci AES dengan Private Key/);
});

test('9. Payload tidak valid ditolak oleh Server B dengan kode status HTTP yang sesuai', async () => {
  // Request dengan field kosong
  const invalidRes1 = await request(appB)
    .post('/api/receiver/transfers')
    .send({})
    .expect(422);

  assert.strictEqual(invalidRes1.body.success, false);

  // Request dengan format non-base64
  const invalidRes2 = await request(appB)
    .post('/api/receiver/transfers')
    .send({
      encryptedKey: '!!!NotBase64@@@',
      iv: 'invalid',
      authTag: 'invalid',
      ciphertext: 'invalid'
    })
    .expect(422);

  assert.strictEqual(invalidRes2.body.success, false);
});

test('10. Transfer yang gagal tidak meninggalkan record setengah jadi di DB B (Atomic rollback)', async () => {
  const pool = getPoolB();
  const [countRowsBefore] = await pool.query('SELECT COUNT(*) as cnt FROM transfers');
  const countBefore = countRowsBefore[0].cnt;

  // Kirim payload cacat yang memicu error validasi
  await request(appB)
    .post('/api/receiver/transfers')
    .send({
      encryptedKey: 'testKey',
      // sengaja menghilangkan iv, authTag, ciphertext
    })
    .expect(422);

  const [countRowsAfter] = await pool.query('SELECT COUNT(*) as cnt FROM transfers');
  const countAfter = countRowsAfter[0].cnt;
  assert.strictEqual(
    countAfter,
    countBefore,
    'Jumlah record di DB B tidak boleh bertambah saat transfer gagal (harus rollback)'
  );
});

test('11. Relasi foreign key kategori dan produk tetap valid di database', async () => {
  const source = await getSourceData();
  const categoryIds = new Set(source.categories.map((c) => c.id));

  for (const prod of source.products) {
    assert.ok(
      categoryIds.has(prod.id_kategori),
      `Foreign key produk ID ${prod.id} (${prod.id_kategori}) harus mengacu ke kategori yang valid`
    );
  }
});

test('12. Endpoint health Server A dan Server B merespons status UP', async () => {
  const resA = await request(appA).get('/api/health').expect(200);
  assert.strictEqual(resA.body.status, 'UP');
  assert.strictEqual(resA.body.service, 'Server A (Source Server)');

  const resB = await request(appB).get('/api/health').expect(200);
  assert.strictEqual(resB.body.status, 'UP');
  assert.strictEqual(resB.body.service, 'Server B (Receiver & Decryption Server)');
});

test('13. Paket yang tersimpan di DB B tidak dapat dibaca sebagai payload JSON plaintext tanpa proses dekripsi', async () => {
  const source = await getSourceData();
  const publicKey = getServerBPublicKey();
  const encryptedPkg = encryptPayload(source, publicKey);

  const postRes = await request(appB)
    .post('/api/receiver/transfers')
    .send(encryptedPkg)
    .expect(201);

  const transferId = postRes.body.transferId;
  const rawDbRecord = await getTransferById(transferId);

  // Pastikan data biner/base64 ciphertext tidak mengandung kata kunci JSON seperti 'categories' atau 'nama_produk'
  assert.strictEqual(rawDbRecord.ciphertext.includes('categories'), false);
  assert.strictEqual(rawDbRecord.ciphertext.includes('nama_produk'), false);
  assert.strictEqual(rawDbRecord.ciphertext.includes('harga_produk'), false);
});
