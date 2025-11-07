import { Pool } from 'pg';

// Spajanje na tvoju bazu
const pool = new Pool({
  user: 'zoroja',
  host: 'kuhari.app',
  database: 'kuhari_dev',
  password: 'VOZKfJibKzBXLOcxKWkmFrju5naTp4yvyaWzlCwmA6D2ZqIfTc',
  port: 5432,
});

export class User {
  id_korisnika: number;
  ime: string;
  prezime: string;
  email: string;
  lozinka: string;

  constructor(data: any) {
  this.id_korisnika = data.ID_korisnika;
  this.ime = data.Ime;
  this.prezime = data.Prezime;
  this.email = data.Email;
  this.lozinka = data.Lozinka;
}


  static async getByEmail(email: string): Promise<User | null> {
    const result = await pool.query(
      `SELECT * FROM "Korisnik" WHERE "Email" = $1`,
      [email]
    );
    return result.rows.length > 0 ? new User(result.rows[0]) : null;
  }

  static async existsByEmail(email: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT 1 FROM "Korisnik" WHERE "Email" = $1`,
      [email]
    );
    return result.rows.length > 0;
  }

  async save(): Promise<void> {
    await pool.query(
      `INSERT INTO "Korisnik" ("Ime", "Prezime", "Email", "Lozinka") 
       VALUES ($1, $2, $3, $4)`,
      [this.ime, this.prezime, this.email, this.lozinka]
    );
  }

  static async getById(id: number): Promise<User | null> {
    const result = await pool.query(
      `SELECT * FROM "Korisnik" WHERE "ID_korisnika" = $1`,
      [id]
    );
    return result.rows.length > 0 ? new User(result.rows[0]) : null;
  }
}
