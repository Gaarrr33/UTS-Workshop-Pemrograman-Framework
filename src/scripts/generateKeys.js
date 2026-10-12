const { initServerBKeys } = require('../crypto/keyManager');

console.log('--- Generating / Verifying RSA 2048-bit Key Pair ---');
const keys = initServerBKeys(process.argv.includes('--force'));
console.log('✓ Public Key siap: ./keys/server_b_public.pem');
console.log('✓ Private Key siap: ./keys/server_b_private.pem (Tersimpan aman)');
