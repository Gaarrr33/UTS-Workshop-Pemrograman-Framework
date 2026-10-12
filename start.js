const config = require('./src/config');
const { initServerBKeys } = require('./src/crypto/keyManager');
const { initDbA } = require('./src/database/dbA');
const { initDbB } = require('./src/database/dbB');
const { seedDatabaseA } = require('./src/database/seeder');
const { createServerAApp } = require('./src/serverA/serverA');
const { createServerBApp } = require('./src/serverB/serverB');
const { createGatewayApp } = require('./src/gateway/gatewayServer');

async function startSystem() {
  console.log('================================================================');
  console.log(' SIKLUS ENKRIPSI & DEKRIPSI ANTAR DATABASE (UTS FRAMEWORK)');
  console.log(' MENGGUNAKAN XAMPP MYSQL/MARIADB (db_a & db_b)');
  console.log('================================================================');

  // 1. Inisialisasi Kunci RSA Server B
  console.log('[1/4] Memeriksa / Menyiapkan Kunci RSA 2048-bit Server B...');
  initServerBKeys();
  console.log('      ✓ Public & Private Key RSA siap.');

  // 2. Inisialisasi Database MySQL (db_a & db_b)
  console.log('[2/4] Menghubungkan ke MySQL XAMPP & Inisialisasi db_a & db_b...');
  try {
    await initDbA();
    await initDbB();
    const seedResult = await seedDatabaseA();
    console.log(`      ✓ Database db_a & db_b siap di MySQL localhost:3306.`);
    console.log(`      ✓ ${seedResult.message} (${seedResult.categoriesCount} kategori, ${seedResult.productsCount} produk)`);
  } catch (err) {
    console.error('❌ Gagal terhubung ke MySQL XAMPP:', err.message);
    console.error('   Pastikan Apache & MySQL di XAMPP Control Panel sudah dalam status START.');
    process.exit(1);
  }

  // 3. Jalankan Server A & Server B
  console.log('[3/4] Menjalankan Server A & Server B...');
  const appA = createServerAApp();
  const serverA = appA.listen(config.PORT_SERVER_A, () => {
    console.log(`      ✓ Server A aktif di: http://localhost:${config.PORT_SERVER_A}`);
  });

  const appB = createServerBApp();
  const serverB = appB.listen(config.PORT_SERVER_B, () => {
    console.log(`      ✓ Server B aktif di: http://localhost:${config.PORT_SERVER_B}`);
  });

  // 4. Jalankan Gateway & Dashboard UI
  console.log('[4/4] Menjalankan API Gateway & Dashboard Monitoring...');
  const appGateway = createGatewayApp();
  const serverGateway = appGateway.listen(config.PORT_GATEWAY, () => {
    console.log(`      ✓ Web Dashboard aktif di: http://localhost:${config.PORT_GATEWAY}`);
    console.log('================================================================');
    console.log(' SEMUA LAYANAN BERHASIL AKTIF & SIAP DIUJI!');
    console.log(` - Dashboard & Verifikasi UI : http://localhost:${config.PORT_GATEWAY}`);
    console.log(` - Server A (Source API)     : http://localhost:${config.PORT_SERVER_A}`);
    console.log(` - Server B (Receiver API)   : http://localhost:${config.PORT_SERVER_B}`);
    console.log(' - MySQL XAMPP Host          : localhost:3306 (db_a & db_b)');
    console.log('================================================================');
  });

  // Penanganan Graceful Shutdown
  function handleShutdown() {
    console.log('\n[Shutdown] Menutup seluruh server dengan aman...');
    serverA.close();
    serverB.close();
    serverGateway.close();
    process.exit(0);
  }

  process.on('SIGINT', handleShutdown);
  process.on('SIGTERM', handleShutdown);
}

startSystem();
