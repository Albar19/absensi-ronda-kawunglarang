import QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const OUT_DIR = path.resolve(__dirname, '..', 'public', 'qr-cards');
const URL = `${BASE_URL}/`;

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const filename = 'qr-bale-desa.png';
  const filepath = path.join(OUT_DIR, filename);

  await QRCode.toFile(filepath, URL, {
    width: 600,
    margin: 3,
    color: { dark: '#1e3a8a', light: '#ffffff' },
  });

  console.log(`  ✓ ${filename}`);
  console.log(`  URL: ${URL}`);
  console.log('');
  console.log(`Tersimpan di: ${filepath}`);
  console.log('');
  console.log('Tips: Untuk mengganti URL, gunakan:');
  console.log('  BASE_URL=https://domain-anda.com npm run generate-qr');
}

main().catch(console.error);