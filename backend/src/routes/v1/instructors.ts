import { Router } from "express";
import { require_auth } from "../../middleware/auth.js";
import { pool } from "../../db/db.js";

const router = Router();

/**
 * POST /api/v1/instructors/request
 * Body:
 * {
 *   biography?: string,
 *   specialization?: string,
 *   file_ids: string[]
 * }
 */
router.post("/request", require_auth, async (req, res) => {
    const user = req.context.user!;
    const { biography, specialization, file_ids } = req.body ?? {};

    // 1) osnovne zabrane
    if (user.role === "admin") {
        return res.status(403).json({ error: "Admins cannot request instructor role" });
    }

    if (user.role === "instructor") {
        return res.status(409).json({ error: "Already an instructor" });
    }

    // 2) provjeri file_ids
    if (!Array.isArray(file_ids) || file_ids.length === 0) {
        return res.status(400).json({ error: "file_ids must be a non-empty array" });
    }

    // (opcionalno) ukloni duplikate
    const uniqueFileIds = [...new Set(file_ids.map(String))];

    try {
        // 3) već postoji instructors red?
        const existing = await pool.query(`SELECT verified FROM instructors WHERE instructor_id = $1`, [user.user_id]);

        if (existing.rows.length > 0) {
            return res.status(409).json({ error: "Instructor request already exists" });
        }

        // 4) provjeri da svi file_id postoje u storedfiles
        const filesCheck = await pool.query(`SELECT file_id FROM storedfiles WHERE file_id = ANY($1::uuid[])`, [uniqueFileIds]);

        if (filesCheck.rowCount !== uniqueFileIds.length) {
            return res.status(400).json({ error: "One or more file_ids do not exist" });
        }

        // 5) kreiraj request: instructors red s verified=false
        await pool.query(
            `INSERT INTO instructors
         (instructor_id, biography, specialization, rating, verified, verification_file_ids)
       VALUES
         ($1, $2, $3, NULL, false, $4::jsonb)`,
            [user.user_id, biography ?? null, specialization ?? null, JSON.stringify(uniqueFileIds)]
        );

        return res.status(201).json({ ok: true, status: "pending" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to create instructor request" });
    }
});

/**
 * GET /api/v1/instructors/me
 * Vrati info o trenutnom statusu instruktora za ovog usera
 */
router.get("/me", require_auth, async (req, res) => {
    const user = req.context.user!;

    try {
        const r = await pool.query(
            `SELECT verified, verification_file_ids, biography, specialization
       FROM instructors
       WHERE instructor_id = $1`,
            [user.user_id]
        );

        if (r.rowCount === 0) {
            return res.json({
                role: user.role,
                has_request: false
            });
        }

        const row = r.rows[0];

        return res.json({
            role: user.role,
            has_request: true,
            verified: row.verified,
            verification_file_ids: row.verification_file_ids ?? [],
            biography: row.biography,
            specialization: row.specialization
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to fetch instructor status" });
    }
});
router.get("/", async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT
         u.user_id as id,
         u.first_name,
         u.last_name,
         i.rating,
         i.biography,
         i.specialization
       FROM instructors i
       JOIN "users" u ON u.user_id = i.instructor_id
       WHERE i.verified = true
       ORDER BY i.rating DESC NULLS LAST, u.last_name ASC, u.first_name ASC`
    );

    return res.json({
      instructors: r.rows.map((x) => ({
        id: x.id, // UUID string
        name: `${x.first_name} ${x.last_name}`,
        rating: x.rating ?? null,
        biography: x.biography ?? null,
        specialization: x.specialization ?? null,
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch instructors" });
  }
});
/**
 * GET /v1/instructors/:instructor_id
 * Public profil instruktora
 */
router.get("/:instructor_id", async (req, res) => {
  const { instructor_id } = req.params;

  try {
    const r = await pool.query(
      `
      SELECT
        u.user_id,
        u.first_name,
        u.last_name,
        u.email,
        i.biography,
        i.specialization,
        i.rating
      FROM instructors i
      JOIN "users" u ON u.user_id = i.instructor_id
      WHERE u.user_id = $1 AND i.verified = true
      `,
      [instructor_id]
    );

    if (r.rowCount === 0) {
      return res.status(404).json({ error: "Instructor not found" });
    }

    const row = r.rows[0];

    return res.json({
      instructor: {
        id: row.user_id,
        ime: row.first_name,
        prezime: row.last_name,
        email: row.email,
        bio: row.biography,
        specializations: row.specialization ?? [],
        averageRating: row.rating,
        // ovo kasnije možeš puniti pravim queryjima
        recipes: [],
        lessons: [],
        workshopSchedule: []
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load instructor profile" });
  }
});


export default router;
