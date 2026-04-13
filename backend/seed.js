import pg from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  try {
    const result = await pool.query(`SELECT id FROM usuario WHERE correo = 'admin@rueda.com'`);
    if (result.rows.length === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      const res = await pool.query(`
        INSERT INTO usuario (nombres, "apellidoPaterno", correo, contrasenia, telefono, "urlFotoPerfil", "rolEvento", "estaActivo")
        VALUES ('Administrador', 'Sistema', 'admin@rueda.com', $1, '12345678', 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png', 'Administrador', 1)
      `, [hash]);
      console.log('Seeded Admin successfully.');
    } else {
      console.log('Admin already exists.');
    }
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
seed();
