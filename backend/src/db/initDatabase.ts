import pg from 'pg';

const pool = new pg.Pool({
  user: 'zoroja',
  host: 'kuhari.app',     
  database: 'kuhari_dev', 
  password: 'VOZKfJibKzBXLOcxKWkmFrju5naTp4yvyaWzlCwmA6D2ZqIfTc',            
  port: 5432,
});

export async function initDatabase() {
  try {
    console.log('Povezivanje na bazu...');
    const client = await pool.connect();
    console.log('Spojeno!');

    await client.query(`
      CREATE TABLE IF NOT EXISTS version_info (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
    console.log('Tablica version_info provjerena/stvorena.');

    const result = await client.query(
      `SELECT value FROM version_info WHERE key = 'db_version';`
    );
    console.log('Upit izvršen.');

    if (result.rowCount === 0) {
      await client.query(`
        INSERT INTO version_info (key, value)
        VALUES ('db_version', '1.0');
      `);
      console.log('Baza inicijalizirana. Verzija 1.0');
    } else {
      console.log(`Baza već postoji. Verzija: ${result.rows[0].value}`);
    }

    client.release();
    console.log('Veza zatvorena.');
  } catch (err) {
    console.error('Greška pri inicijalizaciji baze:', err);
  }
}
initDatabase();



