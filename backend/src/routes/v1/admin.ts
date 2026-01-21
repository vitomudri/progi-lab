import { Router } from "express";
import { require_auth, require_user_roles } from "../../middleware/auth.js";
import { pool } from "../../db/db.js";
import { env } from "../../env.js";
import { FileService, S3StorageService } from "../../models/File.js";

const storage = new S3StorageService(env.S3_BUCKET_NAME);
const fileService = new FileService(storage);

const admin_router = Router();

admin_router.get("/audit_log", require_auth, require_user_roles("admin"), async (req, res) => {
    const current_page: number = parseInt(req.query.current_page as string);
    if (isNaN(current_page) || current_page < 1) {
        return res.status(400).json({ error: "Invalid query parameters" });
    }

    const items_per_page: number = parseInt(req.query.items_per_page as string);
    if (isNaN(items_per_page) || items_per_page < 5 || items_per_page > 100) {
        return res.status(400).json({ error: "Invalid query parameters" });
    }

    const user_ids: Array<string> | null = ((user_id) => {
        if (Array.isArray(user_id)) {
            return user_id.filter((item): item is string => typeof item === "string");
        } else if (typeof user_id === "string") {
            return [user_id];
        } else {
            return null;
        }
    })(req.query.user_id);

    const offset = (current_page - 1) * items_per_page;

    let query = `SELECT al.log_id, al.user_id, u.first_name, u.last_name, al.action, al.date_time
                 FROM AuditLogs al
                 LEFT JOIN Users u ON al.user_id = u.user_id`;
    let count_query = "SELECT COUNT(*) FROM AuditLogs";
    const params: any[] = [];
    let idx = 1;

    if (user_ids) {
        const placeholders = user_ids.map(() => `$${idx++}`).join(",");
        const where = ` WHERE user_id IN (${placeholders})`;

        query += where;
        count_query += where;
        params.push(...user_ids);
    }

    query += ` ORDER BY date_time DESC LIMIT $${idx} OFFSET $${idx + 1}`;

    const countResult = await pool.query(count_query, user_ids && user_ids.length > 0 ? user_ids : []);
    const items_count = parseInt(countResult.rows[0].count);

    const result = await pool.query(query, [...(user_ids || []), items_per_page, offset]);

    const pages_count = Math.ceil(items_count / items_per_page);

    res.json({
        result: result.rows,
        current_page,
        items_per_page,
        items_count,
        pages_count
    });
});

/**
 * GET /api/v1/admin/instructors/pending
 * Vrati listu svih zahtjeva gdje verified=false
 */
admin_router.get("/instructors/pending", require_auth, require_user_roles("admin"), async (req, res) => {
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
admin_router.post("/instructors/:id/approve", require_auth, require_user_roles("admin"), async (req, res) => {
    const userId = req.params.id;

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // 1) mora postojati pending request
        const check = await client.query(`SELECT verified FROM instructors WHERE instructor_id = $1 FOR UPDATE`, [userId]);

        if (check.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Instructor request not found" });
        }

        if (check.rows[0].verified === true) {
            await client.query("ROLLBACK");
            return res.status(409).json({ error: "Already verified" });
        }

        // 2) approve
        await client.query(`UPDATE instructors SET verified = true WHERE instructor_id = $1`, [userId]);

        // 3) promote user role
        await client.query(`UPDATE users SET role = 'instructor' WHERE user_id = $1`, [userId]);

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
admin_router.post("/instructors/:id/reject", require_auth, require_user_roles("admin"), async (req, res) => {
    const userId = req.params.id;

    try {
        const del = await pool.query(`DELETE FROM instructors WHERE instructor_id = $1 AND verified = false`, [userId]);

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
admin_router.get("/files/:file_id/url", require_auth, require_user_roles("admin"), async (req, res) => {
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

export default admin_router;
