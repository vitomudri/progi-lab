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
  const user = req.user!;
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
    const existing = await pool.query(
      `SELECT verified FROM instructors WHERE instructor_id = $1`,
      [user.user_id]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Instructor request already exists" });
    }

    // 4) provjeri da svi file_id postoje u storedfiles
    const filesCheck = await pool.query(
      `SELECT file_id FROM storedfiles WHERE file_id = ANY($1::uuid[])`,
      [uniqueFileIds]
    );

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
  const user = req.user!;

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

export default router;
