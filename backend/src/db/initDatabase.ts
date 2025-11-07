import pg from "pg";
import { env } from "../env.js";
import pkg from '../../package.json' with { type: 'json' };

export const pool = new pg.Pool({
    user: env.PG_USER,
    host: env.PG_HOST,
    database: env.PG_DATABASE,
    password: env.PG_PASS,
    port: env.PG_PORT
});

export async function initDatabase() {
    const client = await pool.connect();

    await client.query(`
        CREATE TABLE IF NOT EXISTS metadata (
            key TEXT PRIMARY KEY,
            value TEXT
        );
    `);
    const result = await client.query(`SELECT value FROM metadata WHERE key = 'version';`);

    if (result.rowCount === 0) {
        // Database does not yet exist; The database schema should created here.
        await client.query(`
            INSERT INTO metadata (key, value)
            VALUES ('version', '${pkg.version}');
        `);
    } else {
        /** @todo Database exists, but might be for an older version of the app? Extra checks need to be made; If need be, upgrade logic should be implemented here. */
    }

    client.release();
    console.log("Database init finished.");
};
