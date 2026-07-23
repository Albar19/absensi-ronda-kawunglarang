import 'dotenv/config';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const DAFTAR_WARGA = [
  { id: 'rt01-001', nama: 'Ahmad Suryadi', rt: 'RT 01' },
  { id: 'rt01-002', nama: 'Budi Santoso', rt: 'RT 01' },
  { id: 'rt01-003', nama: 'Dede Rahmat', rt: 'RT 01' },
  { id: 'rt01-004', nama: 'Edi Suherman', rt: 'RT 01' },
  { id: 'rt01-005', nama: 'Fauzi Hidayat', rt: 'RT 01' },
  { id: 'rt01-006', nama: 'Gunawan Saputra', rt: 'RT 01' },
  { id: 'rt01-007', nama: 'Hendra Wijaya', rt: 'RT 01' },
  { id: 'rt01-008', nama: 'Iwan Setiawan', rt: 'RT 01' },
  { id: 'rt01-009', nama: 'Jajang Nurdin', rt: 'RT 01' },
  { id: 'rt01-010', nama: 'Karto Suwandi', rt: 'RT 01' },
  { id: 'rt02-001', nama: 'Lukman Hakim', rt: 'RT 02' },
  { id: 'rt02-002', nama: 'Mamang Kusnadi', rt: 'RT 02' },
  { id: 'rt02-003', nama: 'Nana Suryana', rt: 'RT 02' },
  { id: 'rt02-004', nama: 'Opik Maulana', rt: 'RT 02' },
  { id: 'rt02-005', nama: 'Pipit Ruhimat', rt: 'RT 02' },
  { id: 'rt02-006', nama: 'Qodir Abdulloh', rt: 'RT 02' },
  { id: 'rt02-007', nama: 'Ridwan Effendi', rt: 'RT 02' },
  { id: 'rt02-008', nama: 'Sandi Priatna', rt: 'RT 02' },
  { id: 'rt02-009', nama: 'Tatang Mulyana', rt: 'RT 02' },
  { id: 'rt02-010', nama: 'Ujang Hermawan', rt: 'RT 02' },
  { id: 'rt03-001', nama: 'Wahyu Purnama', rt: 'RT 03' },
  { id: 'rt03-002', nama: 'Xandy Surya', rt: 'RT 03' },
  { id: 'rt03-003', nama: 'Yayan Darsono', rt: 'RT 03' },
  { id: 'rt03-004', nama: 'Zaenal Abidin', rt: 'RT 03' },
  { id: 'rt03-005', nama: 'Asep Komarudin', rt: 'RT 03' },
  { id: 'rt03-006', nama: 'Barep Sulaeman', rt: 'RT 03' },
  { id: 'rt03-007', nama: 'Cecep Rustandi', rt: 'RT 03' },
  { id: 'rt03-008', nama: 'Dadang Sujana', rt: 'RT 03' },
  { id: 'rt03-009', nama: 'Ending Sopandi', rt: 'RT 03' },
  { id: 'rt03-010', nama: 'Firman Nugraha', rt: 'RT 03' },
  { id: 'rt04-001', nama: 'Ganda Permana', rt: 'RT 04' },
  { id: 'rt04-002', nama: 'Hadi Kusuma', rt: 'RT 04' },
  { id: 'rt04-003', nama: 'Ijal Miftahudin', rt: 'RT 04' },
  { id: 'rt04-004', nama: 'Jamal Usman', rt: 'RT 04' },
  { id: 'rt04-005', nama: 'Karman Suherlan', rt: 'RT 04' },
  { id: 'rt04-006', nama: 'Lili Supriatna', rt: 'RT 04' },
  { id: 'rt04-007', nama: 'Maman Suherman', rt: 'RT 04' },
  { id: 'rt04-008', nama: 'Nanang Hidayat', rt: 'RT 04' },
  { id: 'rt04-009', nama: 'Oman Suhanda', rt: 'RT 04' },
  { id: 'rt04-010', nama: 'Parman Saepudin', rt: 'RT 04' },
];

async function main() {
  console.log('Memulai seed database...');
  console.log('');

  const dbUrl = process.env.SUPABASE_DATABASE_URL;
  if (!dbUrl) {
    console.error('SUPABASE_DATABASE_URL tidak ditemukan di environment variables');
    console.error('Tambahkan ke .env.local:');
    console.error('  SUPABASE_DATABASE_URL=postgresql://postgres:...@db.xxxxx.supabase.co:5432/postgres');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // ================================================
    // 1. BUAT TABEL
    // ================================================
    console.log('Membuat tabel...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        username text UNIQUE NOT NULL,
        password_hash text NOT NULL,
        created_at timestamptz DEFAULT now()
      );
    `);
    console.log('  ✓ admin_users');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS warga (
        id text PRIMARY KEY,
        nama text NOT NULL,
        rt text NOT NULL,
        created_at timestamptz DEFAULT now()
      );
    `);
    console.log('  ✓ warga');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS absen_records (
        id text PRIMARY KEY,
        warga_id text REFERENCES warga(id),
        nama text NOT NULL,
        rt text NOT NULL,
        tanggal date NOT NULL,
        jam_absen time NOT NULL,
        jarak_meter int NOT NULL,
        koordinat_lat float NOT NULL,
        koordinat_lng float NOT NULL,
        status text DEFAULT 'hadir',
        created_at timestamptz DEFAULT now()
      );
    `);
    console.log('  ✓ absen_records');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_absen_tanggal ON absen_records(tanggal);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_absen_warga ON absen_records(warga_id);
    `);
    console.log('  ✓ indexes');

    console.log('');

    // ================================================
    // 2. INSERT ADMIN USER
    // ================================================
    console.log('Membuat admin user...');

    const adminPassword = process.env.ADMIN_PASSWORD || 'kawunglarang2026';
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    await pool.query(
      `INSERT INTO admin_users (username, password_hash)
       VALUES ('admin', $1)
       ON CONFLICT (username) DO UPDATE SET password_hash = $1`,
      [passwordHash]
    );
    console.log('  ✓ Username: admin');
    console.log('  ✓ Password: kawunglarang2026');

    console.log('');

    // ================================================
    // 3. INSERT WARGA
    // ================================================
    console.log(`Memasukkan ${DAFTAR_WARGA.length} warga...`);

    for (const w of DAFTAR_WARGA) {
      await pool.query(
        `INSERT INTO warga (id, nama, rt)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO NOTHING`,
        [w.id, w.nama, w.rt]
      );
    }
    console.log('  ✓ Semua warga berhasil dimasukkan');

    console.log('');
    console.log('====================================');
    console.log('  SEED DATABASE SELESAI!');
    console.log('  Admin: admin / kawunglarang2026');
    console.log('====================================');
  } catch (err) {
    console.error('Gagal:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();