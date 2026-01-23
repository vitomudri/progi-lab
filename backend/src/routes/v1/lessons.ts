import { Router } from "express";
import { z } from "zod";
import { maybe_auth, require_auth, require_user_roles } from "../../middleware/auth.js";
import { Lesson } from "../../models/Lesson.js";
import { Module } from "../../models/Module.js";
import { Course } from "../../models/Course.js";
import { pool } from "../../db/db.js";

const router = Router();

async function getCourseForLesson(lesson_id: number) {
    const lesson = await Lesson.from_db({ lesson_id });
    if (!lesson) return { ok: false as const, status: 404, error: "Lesson not found" };

    const mod = await Module.from_db({ module_id: lesson.module_id });
    if (!mod) return { ok: false as const, status: 404, error: "Module not found" };

    const course = await Course.from_db({ course_id: mod.course_id });
    if (!course) return { ok: false as const, status: 404, error: "Course not found" };

    return { ok: true as const, lesson, module: mod, course };
}

export const NutritionSchema = z.record(z.string(), z.any());


const UpdateLessonSchema = z.object({
    title: z.string().min(1).optional(),
    order_index: z.number().int().positive().optional(),
    type: z.enum(["video", "text", "recipe"]).optional(),
    content: z.string().nullable().optional(),
    video_url: z.string().nullable().optional(),

    // NOVO:
    steps_text: z.string().nullable().optional(),
    ingredients_text: z.string().nullable().optional(),

    prep_time_min: z.number().int().min(0).nullable().optional(),
    cook_time_min: z.number().int().min(0).nullable().optional(),
    difficulty: z.enum(["easy", "medium", "hard"]).nullable().optional(),

    shopping_list: z.string().nullable().optional(),
    allergens: z.string().nullable().optional(),
    nutrition: NutritionSchema.nullable().optional()
});
function sanitizeActivityForStudent(activity: any) {
  if (activity.type !== "quiz") return activity;

  const p = activity.payload ?? {};
  if (!p || typeof p !== "object") return activity;

  // očekujemo: payload.questions = [{..., correct: ...}]
  if (Array.isArray(p.questions)) {
    const safeQuestions = p.questions.map((q: any) => {
      if (!q || typeof q !== "object") return q;
      const { correct, correct_answers, ...rest } = q;
      return rest;
    });
    return { ...activity, payload: { ...p, questions: safeQuestions } };
  }

  return activity;
}

const ActivityTypeSchema = z.enum(["quiz", "photo_upload"]);

const CreateActivitySchema = z.object({
  type: ActivityTypeSchema,
  title: z.string().min(1),
  payload: z.any().optional(),         // JSONB, za quiz pitanja ili upload postavke
  is_required: z.boolean().optional(),
});

const UpdateActivitySchema = z.object({
  type: ActivityTypeSchema.optional(),
  title: z.string().min(1).optional(),
  payload: z.any().optional(),
  is_required: z.boolean().optional(),
});

const SubmitSchema = z.object({
  answer: z.any().optional(),          // JSONB (npr. odgovori na kviz)
  file_id: z.string().uuid().optional() // UUID StoredFiles.file_id
});
/**
 * GET /v1/lessons/:lesson_id/activities
 * - student/guest: samo ako course published (i bez correct odgovora)
 * - instructor/admin: owner/admin (vraća full payload)
 */

router.get("/activities/:lesson_id", maybe_auth, async (req, res) => {
  const lesson_id = Number(req.params.lesson_id);
  if (!Number.isInteger(lesson_id) || lesson_id <= 0) return res.status(400).json({ error: "Invalid lesson_id" });
  const data = await getCourseForLesson(lesson_id);
  if (!data.ok) return res.status(data.status).json({ error: data.error });

  const user = req.context.user;

  // student/guest: samo ako published
    if (!user || user.role === "student") {
    if (!data.course.is_published) return res.status(404).json({ error: "Lesson not found" });

    // guest (nije ulogiran) -> nema has_submitted (ili uvijek false)
    if (!user) {
      const r = await pool.query(
        `SELECT activity_id, lesson_id, type, title, payload, is_required
         FROM LessonActivities
         WHERE lesson_id = $1
         ORDER BY activity_id ASC`,
        [lesson_id]
      );

      const activities = r.rows.map(sanitizeActivityForStudent);
      return res.json({ activities });
    }

    // ✅ ulogiran student -> dodaj has_submitted
    const r = await pool.query(
      `SELECT 
          a.activity_id, a.lesson_id, a.type, a.title, a.payload, a.is_required,
          EXISTS (
            SELECT 1
            FROM LessonActivitySubmissions s
            WHERE s.activity_id = a.activity_id
              AND s.student_id = $2
          ) AS has_submitted
       FROM LessonActivities a
       WHERE a.lesson_id = $1
       ORDER BY a.activity_id ASC`,
      [lesson_id, user.user_id]
    );

    // sanitize quiz payload + zadrži has_submitted
    const activities = r.rows.map((row: any) => {
      const safe = sanitizeActivityForStudent(row);
      return { ...safe, has_submitted: !!row.has_submitted };
    });

    return res.json({ activities });
  }

  // instructor/admin: provjera owner/admin
  if (user.role !== "admin" && data.course.instructor_id !== (user.user_id as any)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const r = await pool.query(
    `SELECT activity_id, lesson_id, type, title, payload, is_required
     FROM LessonActivities
     WHERE lesson_id = $1
     ORDER BY activity_id ASC`,
    [lesson_id]
  );

  return res.json({ activities: r.rows });
});

router.post("/activities/:lesson_id", require_auth, require_user_roles("instructor", "admin"), async (req, res) => {
  const lesson_id = Number(req.params.lesson_id);
  if (!Number.isInteger(lesson_id) || lesson_id <= 0) return res.status(400).json({ error: "Invalid lesson_id" });

  const user = req.context.user!;
  const data = await getCourseForLesson(lesson_id);
  if (!data.ok) return res.status(data.status).json({ error: data.error });

  if (user.role !== "admin" && data.course.instructor_id !== (user.user_id as any)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const body = CreateActivitySchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid body", details: body.error.flatten() });

  const { type, title, payload, is_required } = body.data;

  const r = await pool.query(
    `INSERT INTO LessonActivities (lesson_id, type, title, payload, is_required)
     VALUES ($1, $2, $3, $4::jsonb, $5)
     RETURNING activity_id, lesson_id, type, title, payload, is_required`,
    [lesson_id, type, title, JSON.stringify(payload ?? {}), is_required ?? false]
  );

  return res.status(201).json({ activity: r.rows[0] });
});

/**
 * GET /v1/lessons/:lesson_id
 * - guest/student: samo ako course published
 * - instructor/admin: owner/admin
 */
router.get("/:lesson_id", maybe_auth, async (req, res) => {
    const lesson_id = Number(req.params.lesson_id);
    if (!Number.isInteger(lesson_id) || lesson_id <= 0) return res.status(400).json({ error: "Invalid lesson_id" });

    const data = await getCourseForLesson(lesson_id);
    if (!data.ok) return res.status(data.status).json({ error: data.error });

    const user = req.context.user;

    if (!user || user.role === "student") {
        if (!data.course.is_published) return res.status(404).json({ error: "Lesson not found" });
        return res.json({ lesson: data.lesson });
    }

    if (user.role === "admin" || data.course.instructor_id === (user.user_id as any)) {
        return res.json({ lesson: data.lesson });
    }

    return res.status(403).json({ error: "Forbidden" });
});

/**
 * PATCH /v1/lessons/:lesson_id
 * owner/admin
 */
router.patch("/:lesson_id", require_auth, require_user_roles("instructor", "admin"), async (req, res) => {

    const lesson_id = Number(req.params.lesson_id);
    if (!Number.isInteger(lesson_id) || lesson_id <= 0) return res.status(400).json({ error: "Invalid lesson_id" });

    const user = req.context.user!;
    const data = await getCourseForLesson(lesson_id);
    if (!data.ok) return res.status(data.status).json({ error: data.error });

    if (user.role !== "admin" && data.course.instructor_id !== (user.user_id as any)) {
        return res.status(403).json({ error: "Forbidden" });
    }

    const body = UpdateLessonSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Invalid body", details: body.error.flatten() });

    // stara polja
    if (body.data.title !== undefined) data.lesson.title = body.data.title;
    if (body.data.order_index !== undefined) data.lesson.order_index = body.data.order_index;
    if (body.data.type !== undefined) data.lesson.type = body.data.type;

    if (body.data.content !== undefined) data.lesson.content = body.data.content ?? null;
    if (body.data.video_url !== undefined) data.lesson.video_url = body.data.video_url ?? null;

    // NOVA polja (text blokovi)
    if (body.data.steps_text !== undefined) data.lesson.steps_text = body.data.steps_text ?? null;
    if (body.data.ingredients_text !== undefined) data.lesson.ingredients_text = body.data.ingredients_text ?? null;

    // metadata
    if (body.data.prep_time_min !== undefined) data.lesson.prep_time_min = body.data.prep_time_min ?? null;
    if (body.data.cook_time_min !== undefined) data.lesson.cook_time_min = body.data.cook_time_min ?? null;
    if (body.data.difficulty !== undefined) data.lesson.difficulty = body.data.difficulty ?? null;

    if (body.data.shopping_list !== undefined) data.lesson.shopping_list = body.data.shopping_list ?? null;
    if (body.data.allergens !== undefined) data.lesson.allergens = body.data.allergens ?? null;
    if (body.data.nutrition !== undefined) data.lesson.nutrition = body.data.nutrition ?? null;

    // minimalna logika konzistentnosti
    if (data.lesson.type === "video" && !data.lesson.video_url) {
        return res.status(400).json({ error: "Lesson of type 'video' requires video_url" });
    }
    if (data.lesson.type === "text" && !data.lesson.content) {
        return res.status(400).json({ error: "Lesson of type 'text' requires content" });
    }

    await data.lesson.save();
    return res.json({ lesson: data.lesson });
});


/**
 * POST /v1/lessons/:lesson_id/activities
 * owner/admin
 */
/**
 * PATCH /v1/lessons/activities/:activity_id
 * owner/admin
 */
router.patch("/activities/:activity_id", require_auth, require_user_roles("instructor", "admin"), async (req, res) => {
  const activity_id = Number(req.params.activity_id);
  if (!Number.isInteger(activity_id) || activity_id <= 0) return res.status(400).json({ error: "Invalid activity_id" });

  const user = req.context.user!;
  const body = UpdateActivitySchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid body", details: body.error.flatten() });

  // dohvat activity -> lesson -> course radi provjere owner
  const a = await pool.query(
    `SELECT a.*, l.lesson_id, l.module_id
     FROM LessonActivities a
     JOIN Lessons l ON l.lesson_id = a.lesson_id
     WHERE a.activity_id = $1`,
    [activity_id]
  );
  if (a.rowCount === 0) return res.status(404).json({ error: "Activity not found" });

  const lesson_id = a.rows[0].lesson_id;
  const data = await getCourseForLesson(lesson_id);
  if (!data.ok) return res.status(data.status).json({ error: data.error });

  if (user.role !== "admin" && data.course.instructor_id !== (user.user_id as any)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const patch = body.data;

  const r = await pool.query(
    `UPDATE LessonActivities
     SET
       type = COALESCE($2, type),
       title = COALESCE($3, title),
       payload = COALESCE($4::jsonb, payload),
       is_required = COALESCE($5, is_required)
     WHERE activity_id = $1
     RETURNING activity_id, lesson_id, type, title, payload, is_required`,
    [
      activity_id,
      patch.type ?? null,
      patch.title ?? null,
      patch.payload !== undefined ? JSON.stringify(patch.payload) : null,
      patch.is_required ?? null,
    ]
  );

  return res.json({ activity: r.rows[0] });
});
/**
 * POST /v1/lessons/activities/:activity_id/submit
 * student (ili auth user) - samo ako course published
 */
router.post("/activities/:activity_id/submit", require_auth, async (req, res) => {
  const activity_id = Number(req.params.activity_id);
  if (!Number.isInteger(activity_id) || activity_id <= 0) {
    return res.status(400).json({ error: "Invalid activity_id" });
  }

  const user = req.context.user!;
  if (user.role !== "student") return res.status(403).json({ error: "Only students can submit" });

  const body = SubmitSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid body", details: body.error.flatten() });

  // activity + course published check
  const a = await pool.query(
    `SELECT a.activity_id, a.lesson_id, a.type
     FROM LessonActivities a
     WHERE a.activity_id = $1`,
    [activity_id]
  );
  if (a.rowCount === 0) return res.status(404).json({ error: "Activity not found" });

  const lesson_id = a.rows[0].lesson_id;
  const data = await getCourseForLesson(lesson_id);
  if (!data.ok) return res.status(data.status).json({ error: data.error });

  if (!data.course.is_published) return res.status(404).json({ error: "Not found" });

  const { answer, file_id } = body.data;

  // minimalna validacija po tipu
  if (a.rows[0].type === "quiz" && answer === undefined) {
    return res.status(400).json({ error: "Quiz submission requires answer" });
  }
  if (a.rows[0].type === "photo_upload" && !file_id) {
    return res.status(400).json({ error: "Upload submission requires file_id" });
  }

  // ✅ NE DOZVOLI ponovno slanje
  // Ako već postoji submission za (activity_id, student_id) -> 409
  const r = await pool.query(
    `INSERT INTO LessonActivitySubmissions (activity_id, student_id, answer, file_id, status)
     VALUES ($1, $2, $3::jsonb, $4::uuid, 'submitted')
     ON CONFLICT (activity_id, student_id)
     DO NOTHING
     RETURNING submission_id, activity_id, student_id, answer, file_id, status, created_at`,
    [activity_id, user.user_id, JSON.stringify(answer ?? null), file_id ?? null]
  );

  if (r.rowCount === 0) {
    return res.status(409).json({ error: "Already submitted" });
  }

  return res.status(201).json({ submission: r.rows[0] });
});

/**
 * GET /v1/lessons/activities/:activity_id/submissions
 * owner/admin
 */
router.get("/activities/:activity_id/submissions", require_auth, require_user_roles("instructor", "admin"), async (req, res) => {
  const activity_id = Number(req.params.activity_id);
  if (!Number.isInteger(activity_id) || activity_id <= 0) return res.status(400).json({ error: "Invalid activity_id" });

  const user = req.context.user!;

  const a = await pool.query(
    `SELECT a.activity_id, a.lesson_id
     FROM LessonActivities a
     WHERE a.activity_id = $1`,
    [activity_id]
  );
  if (a.rowCount === 0) return res.status(404).json({ error: "Activity not found" });

  const lesson_id = a.rows[0].lesson_id;
  const data = await getCourseForLesson(lesson_id);
  if (!data.ok) return res.status(data.status).json({ error: data.error });

  if (user.role !== "admin" && data.course.instructor_id !== (user.user_id as any)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const r = await pool.query(
    `SELECT s.submission_id, s.activity_id, s.student_id, s.answer, s.file_id, s.status, s.created_at
     FROM LessonActivitySubmissions s
     WHERE s.activity_id = $1
     ORDER BY s.created_at DESC`,
    [activity_id]
  );

  return res.json({ submissions: r.rows });
});
const ReviewSubmissionSchema = z.object({
  status: z.enum(["approved", "rejected"])
});

/**
 * PATCH /v1/lessons/submissions/:submission_id
 * owner/admin
 */
router.patch("/submissions/:submission_id", require_auth, require_user_roles("instructor", "admin"), async (req, res) => {
  const submission_id = Number(req.params.submission_id);
  if (!Number.isInteger(submission_id) || submission_id <= 0) return res.status(400).json({ error: "Invalid submission_id" });

  const user = req.context.user!;
  const body = ReviewSubmissionSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid body", details: body.error.flatten() });

  // submission -> activity -> lesson -> course owner
  const s = await pool.query(
    `SELECT s.submission_id, s.activity_id, a.lesson_id
     FROM LessonActivitySubmissions s
     JOIN LessonActivities a ON a.activity_id = s.activity_id
     WHERE s.submission_id = $1`,
    [submission_id]
  );
  if (s.rowCount === 0) return res.status(404).json({ error: "Submission not found" });

  const lesson_id = s.rows[0].lesson_id;
  const data = await getCourseForLesson(lesson_id);
  if (!data.ok) return res.status(data.status).json({ error: data.error });

  if (user.role !== "admin" && data.course.instructor_id !== (user.user_id as any)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const r = await pool.query(
    `UPDATE LessonActivitySubmissions
     SET status = $2
     WHERE submission_id = $1
     RETURNING submission_id, activity_id, student_id, answer, file_id, status, created_at`,
    [submission_id, body.data.status]
  );

  return res.json({ submission: r.rows[0] });
});




export default router;
