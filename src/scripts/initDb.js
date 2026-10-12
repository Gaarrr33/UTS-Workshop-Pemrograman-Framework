const { initDbA } = require('../database/dbA');
const { initDbB } = require('../database/dbB');
const { seedDatabaseA } = require('../database/seeder');

async function runInit() {
  console.log('================================================================');
  console.log(' INISIALISASI DATABASE MYSQL/MARIADB (XAMPP)');
  console.log('================================================================');

  try {
    console.log('[1/3] Menyiapkan database db_a & tabel (kategori, produk)...');
    await initDbA();
    console.log('      ✓ Sukses: db_a siap dengan skema relasi Foreign Key.');

    console.log('[2/3] Menyiapkan database db_b & tabel (transfers, kategori, produk)...');
    await initDbB();
    console.log('      ✓ Sukses: db_b siap untuk menyimpan ciphertext.');

    console.log('[3/3] Memeriksa data sumber db_a...');
    const seedResult = await seedDatabaseA();
    console.log(`      ✓ ${seedResult.message}`);
    console.log(`      ✓ Jumlah kategori: ${seedResult.categoriesCount}, produk: ${seedResult.productsCount}`);

    console.log('================================================================');
    console.log(' INISIALISASI DATABASE SELESAI DENGAN AMAN!');
    console.log(' (Tidak ada database lain yang diubah atau dihapus)');
    console.log('================================================================');
    process.exit(0);
  } catch (err) {
    console.error('❌ Gagal inisialisasi database:', err.message);
    process.exit(1);
  }
}

runInit();
