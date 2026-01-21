import express from "express";
import { require_auth, require_user_role } from "../../middleware/auth.js";
import { pool } from "../../db/db.js";

const admin_router = express.Router();

admin_router.get("/audit_log", require_auth, require_user_role("admin"), async (req, res) => {
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

    let query = "SELECT * FROM AuditLogs";
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

export default admin_router;
