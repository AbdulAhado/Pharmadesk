/**
 * Standalone Ed25519 Keypair Generator Utility
 * Run: node scripts/generateKeys.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function generateKeys() {
  console.log('Generating secure Ed25519 keypair for PharmaDesk...');

  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const outDir = path.join(__dirname, '../keys');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(path.join(outDir, 'ed25519_private.pem'), privateKey, 'utf8');
  fs.writeFileSync(path.join(outDir, 'ed25519_public.pem'), publicKey, 'utf8');

  console.log('\nKeys saved in licensing-server/keys/');
  console.log('====================================');
  console.log('PUBLIC KEY (for desktop verification):\n', publicKey);
  console.log('PRIVATE KEY (KEEP SECRET on server):\n', privateKey);
}

generateKeys();

