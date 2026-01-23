import { pool } from "../db/db.js";

export class Reservation {
  static async create(params: {
    user_id: string;
    workshop_id: string;
  }): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Lock workshop row
      const workshopRes = await client.query(
        `
        SELECT seat_number
        FROM LiveWorkshops
        WHERE workshop_id = $1
        FOR UPDATE
        `,
        [params.workshop_id]
      );

      if (workshopRes.rowCount === 0) {
        throw new Error("Workshop not found");
      }

      const seatLimit: number | null = workshopRes.rows[0].seat_number;

      // Count current reservations
      const takenRes = await client.query(
        `
        SELECT COUNT(*)::int AS taken
        FROM Reservations
        WHERE workshop_id = $1
        `,
        [params.workshop_id]
      );

      const taken = takenRes.rows[0].taken;

      // Check capacity
      if (seatLimit !== null && taken >= seatLimit) {
        throw new Error("Workshop is full");
      }

      // Insert reservation
      await client.query(
        `
        INSERT INTO Reservations (user_id, workshop_id)
        VALUES ($1, $2)
        `,
        [params.user_id, params.workshop_id]
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}
