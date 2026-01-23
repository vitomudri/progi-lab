import { Router } from "express";
import { z } from "zod";
import { maybe_auth, require_auth, require_user_roles } from "../../middleware/auth.js"; // prilagodi path ako ti je drugačiji
import { pool } from "../../db/db.js";

const router = Router();

const ObjectType = z.enum(["lesson", "course", "instructor"]);

const CreateReviewSchema = z.object({
  object_type: ObjectType,
  object_id: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(5000).optional().nullable(),
  photo_file_id: z.string().uuid().optional().nullable()
});

/**
 * GET /api/v1/reviews?object_type=course&object_id=12
 * Vraća:
 * - summary (prosjek + count) samo iz approved
 * - reviews listu: samo approved (guest), a admin vidi sve (ako želiš kasnije)
 * Sort: najviše helpful pa najnovije
 */
router.get("/", maybe_auth, async (req, res) => {
  const parsed = z.object({
    object_type: ObjectType,
    object_id: z.string().min(1)
  }).safeParse(req.query);

  if (!parsed.success) return res.status(400).json({ error: "Invalid query" });

  const { object_type, object_id } = parsed.data;
  const user = req.context.user;

  // summary samo approved
  const summaryR = await pool.query(
    `SELECT
        COUNT(*)::int AS count,
        COALESCE(AVG(rating), 0)::numeric(3,2) AS average
     FROM Reviews
     WHERE object_type=$1 AND object_id=$2 AND status='approved'`,
    [object_type, object_id]
  );

  // lista: samo approved (removed se ne prikazuje)
  const reviewsR = await pool.query(
    `SELECT
        r.review_id,
        r.user_id,
        u.first_name,
        u.last_name,
        r.rating,
        r.comment,
        r.photo_file_id,
        r.status,
        r.created_at,
        COALESCE(v.helpful_count, 0)::int AS helpful_count,
        CASE WHEN $3::varchar IS NULL THEN false
             ELSE EXISTS (SELECT 1 FROM ReviewVotes vv WHERE vv.review_id = r.review_id AND vv.user_id = $3)
        END AS i_marked_helpful
     FROM Reviews r
     JOIN Users u ON u.user_id = r.user_id
     LEFT JOIN (
        SELECT review_id, COUNT(*) FILTER (WHERE is_helpful=true) AS helpful_count
        FROM ReviewVotes
        GROUP BY review_id
     ) v ON v.review_id = r.review_id
     WHERE r.object_type=$1 AND r.object_id=$2
       AND r.status='approved'
     ORDER BY helpful_count DESC, r.created_at DESC
     LIMIT 50`,
    [object_type, object_id, user?.user_id ?? null]
  );

  return res.json({
    summary: summaryR.rows[0],
    reviews: reviewsR.rows
  });
});

/**
 * POST /api/v1/reviews
 * Student stvara recenziju - ODMAH approved (Opcija A)
 */
router.post("/", require_auth, require_user_roles("student"), async (req, res) => {
  const user = req.context.user!;
  const body = CreateReviewSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid body", details: body.error.flatten() });

  try {
    const r = await pool.query(
      `INSERT INTO Reviews (user_id, object_type, object_id, rating, comment, photo_file_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,'approved')
       RETURNING review_id, user_id, object_type, object_id, rating, comment, photo_file_id, status, created_at`,
      [
        user.user_id,
        body.data.object_type,
        body.data.object_id,
        body.data.rating,
        body.data.comment ?? null,
        body.data.photo_file_id ?? null
      ]
    );

    return res.status(201).json({ review: r.rows[0] });
  } catch (err: any) {
    if (String(err?.code) === "23505") {
      return res.status(409).json({ error: "You already reviewed this item." });
    }
    console.error(err);
    return res.status(500).json({ error: "Failed to create review" });
  }
});

/**
 * POST /api/v1/reviews/:id/helpful
 * Toggle helpful
 */
router.post("/:id/helpful", require_auth, async (req, res) => {
  const user = req.context.user!;
  const review_id = Number(req.params.id);
  if (!Number.isInteger(review_id) || review_id <= 0) return res.status(400).json({ error: "Invalid review id" });

  try {
    const existing = await pool.query(
      `SELECT 1 FROM ReviewVotes WHERE review_id=$1 AND user_id=$2`,
      [review_id, user.user_id]
    );

    if ((existing.rowCount ?? 0) > 0) {
      await pool.query(`DELETE FROM ReviewVotes WHERE review_id=$1 AND user_id=$2`, [review_id, user.user_id]);
      return res.json({ helpful: false });
    } else {
      await pool.query(
        `INSERT INTO ReviewVotes (review_id, user_id, is_helpful) VALUES ($1,$2,true)`,
        [review_id, user.user_id]
      );
      return res.json({ helpful: true });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to toggle helpful" });
  }
});

/**
 * DELETE /api/v1/reviews/:id
 * Admin "briše" recenziju = soft delete (status -> removed)
 */
router.delete("/:id", require_auth, require_user_roles("admin"), async (req, res) => {
  const admin = req.context.user!;
  const review_id = Number(req.params.id);
  if (!Number.isInteger(review_id) || review_id <= 0) return res.status(400).json({ error: "Invalid review id" });

  const reason = typeof req.body?.reason === "string" ? req.body.reason : null;

  try {
    const r = await pool.query(
      `UPDATE Reviews
       SET status='removed',
           moderated_at=CURRENT_TIMESTAMP,
           moderated_by=$1,
           moderation_reason=$2
       WHERE review_id=$3
       RETURNING review_id, status, moderated_at, moderated_by, moderation_reason`,
      [admin.user_id, reason, review_id]
    );

    if (r.rowCount === 0) return res.status(404).json({ error: "Review not found" });
    return res.json({ review: r.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to remove review" });
  }
});

export default router;
