import { Router } from "express";
import { require_auth } from "../../middleware/auth.js";
import { require_role } from "../../middleware/role.js";
import { pool } from "../../db/db.js";
import { env } from "../../env.js";
import { FileService, S3StorageService } from "../../models/File.js";

const router = Router();

// za signed url (admin preview dokumenata)
const storage = new S3StorageService(env.S3_BUCKET_NAME);
const fileService = new FileService(storage);

/**
 * GET /api/v1/admin/instructors/pending
 * Vrati listu svih zahtjeva gdje verified=false
 */
router.get("/instructors/pending", require_auth, require_role("admin"), async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT u.user_id, u.first_name, u.last_name, u.email,
              i.biography, i.specialization, i.verification_file_ids
       FROM users u
       JOIN instructors i ON i.instructor_id = u.user_id
       WHERE i.verified = false
       ORDER BY u.registration_date DESC`
    );

    return res.json({ items: r.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch pending instructors" });
  }
});

/**
 * POST /api/v1/admin/instructors/:id/approve
 * Odobri instruktora:
 * - instructors.verified = true
 * - users.role = 'instructor'
 */
router.post("/instructors/:id/approve", require_auth, require_role("admin"), async (req, res) => {
  const userId = req.params.id;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1) mora postojati pending request
    const check = await client.query(
      `SELECT verified FROM instructors WHERE instructor_id = $1 FOR UPDATE`,
      [userId]
    );

    if (check.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Instructor request not found" });
    }

    if (check.rows[0].verified === true) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Already verified" });
    }

    // 2) approve
    await client.query(
      `UPDATE instructors SET verified = true WHERE instructor_id = $1`,
      [userId]
    );

    // 3) promote user role
    await client.query(
      `UPDATE users SET role = 'instructor' WHERE user_id = $1`,
      [userId]
    );

    await client.query("COMMIT");
    return res.json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return res.status(500).json({ error: "Failed to approve instructor" });
  } finally {
    client.release();
  }
});

/**
 * POST /api/v1/admin/instructors/:id/reject
 * Odbij zahtjev (bez nove tablice: najjednostavnije je obrisati red)
 */
router.post("/instructors/:id/reject", require_auth, require_role("admin"), async (req, res) => {
  const userId = req.params.id;

  try {
    const del = await pool.query(
      `DELETE FROM instructors WHERE instructor_id = $1 AND verified = false`,
      [userId]
    );

    if (del.rowCount === 0) {
      return res.status(404).json({ error: "Pending request not found" });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to reject instructor" });
  }
});

/**
 * GET /api/v1/admin/files/:file_id/url
 * Admin dobije signed URL za dokument (preview/download)
 */
router.get("/files/:file_id/url", require_auth, require_role("admin"), async (req, res) => {
  const fileId = req.params.file_id;

  try {
    const r = await pool.query(
      `SELECT file_id, bucket, key, original_name, mime_type, size, created_at
       FROM storedfiles
       WHERE file_id = $1`,
      [fileId]
    );

    if (r.rows.length === 0) {
      return res.status(404).json({ error: "File not found" });
    }

    const row = r.rows[0];

    const fakeStoredFile: any = {
      id: row.file_id,
      bucket: row.bucket,
      key: row.key,
      originalName: row.original_name,
      mimeType: row.mime_type,
      size: Number(row.size),
      createdAt: new Date(row.created_at)
    };

    const url = await fileService.getDownloadUrl(fakeStoredFile);
    return res.json({ url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create download url" });
  }
});

export default router;
