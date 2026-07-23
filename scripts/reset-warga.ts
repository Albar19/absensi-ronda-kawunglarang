import { config } from 'dotenv';
config({ path: '.env.local' });
import { Pool } from 'pg';

async function main() {
  const dbUrl = process.env.SUPABASE_DATABASE_URL;
  if (!dbUrl) {
    console.error('SUPABASE_DATABASE_URL tidak ditemukan');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('Menghapus data dummy...');

    const r1 = await pool.query('DELETE FROM absen_records');
    console.log(`  ✓ absen_records: ${r1.rowCount} baris dihapus`);

    const r2 = await pool.query('DELETE FROM jadwal_ronda');
    console.log(`  ✓ jadwal_ronda: ${r2.rowCount} baris dihapus`);

    const r3 = await pool.query('DELETE FROM warga');
    console.log(`  ✓ warga: ${r3.rowCount} baris dihapus`);

    console.log('');
    console.log('Selesai! Semua data dummy berhasil dihapus.');
    console.log('Sekarang Anda bisa input warga asli lewat /admin/warga');
  } catch (err) {
    console.error('Gagal:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();