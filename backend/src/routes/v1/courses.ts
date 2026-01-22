import { Router } from "express";
import { z } from "zod";
import { maybe_auth, require_auth, require_user_roles } from "../../middleware/auth.js";
import { Course } from "../../models/Course.js";
import { Module } from "../../models/Module.js";
import { pool } from "../../db/db.js";

const router = Router();

/**
 * Helper: owner/admin check za course
 */
async function requireCourseOwnerOrAdmin(course_id: number, user: { user_id: string; role: string }) {
    const course = await Course.from_db({ course_id });
    if (!course) return { ok: false as const, status: 404, error: "Course not found" };

    if (user.role === "admin") return { ok: true as const, course };

    if (!course.instructor_id || course.instructor_id !== (user.user_id as any)) {
        return { ok: false as const, status: 403, error: "Forbidden" };
    }

    return { ok: true as const, course };
}

/**
 * Schema
 */
const CreateCourseSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional()
});

const UpdateCourseSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().nullable().optional()
});

const CreateModuleSchema = z.object({
    title: z.string().min(1)
});

/**
 * GET /v1/courses
 * - guest/student: samo published
 * - instructor: samo svoje (draft+published)
 * - admin: sve
 */
router.get("/", maybe_auth, async (req, res) => {
    const user = req.context.user;

    // guest ili student -> published
    if (!user || user.role === "student") {
        const courses = await Course.list_published(100);
        return res.json({ courses });
    }

    // instructor -> svoje
    if (user.role === "instructor") {
        const courses = await Course.list_by_instructor(user.user_id as any, 100);
        return res.json({ courses });
    }

    // admin -> sve (direktno iz baze, jer Course nema list_all())
    const result = await pool.query(
        `SELECT "course_id", "title", "is_published"
         FROM "courses"
         ORDER BY "course_id" DESC
         LIMIT 200`
    );
    return res.json({
        courses: result.rows.map((r) => ({
            course_id: r.course_id,
            title: r.title,
            is_published: !!r.is_published
        }))
    });
});

/**
 * POST /v1/courses
 * instructor/admin
 */
router.post("/", require_auth, require_user_roles("instructor", "admin"), async (req, res) => {
    const user = req.context.user!;
    const body = CreateCourseSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Invalid body", details: body.error.flatten() });

    const course = Course.new({
        title: body.data.title,
        description: body.data.description,
        instructor_id: user.role === "instructor" ? (user.user_id as any) : undefined,
        is_published: false
    });

    await course.save();
    return res.status(201).json({ course });
});

/**
 * GET /v1/courses/:course_id
 * - guest/student: samo ako published
 * - instructor: ako je njegov
 * - admin: sve
 */
router.get("/:course_id", maybe_auth, async (req, res) => {
    const course_id = Number(req.params.course_id);
    if (!Number.isInteger(course_id) || course_id <= 0) return res.status(400).json({ error: "Invalid course_id" });

    const course = await Course.from_db({ course_id });
    if (!course) return res.status(404).json({ error: "Course not found" });

    const user = req.context.user;

    // guest/student
    if (!user || user.role === "student") {
        if (!course.is_published) return res.status(404).json({ error: "Course not found" }); // ne otkrivaj draft
        return res.json({ course });
    }

    // admin
    if (user.role === "admin") return res.json({ course });

    // instructor
    if (course.instructor_id !== (user.user_id as any)) {
        return res.status(403).json({ error: "Forbidden" });
    }

    return res.json({ course });
});

/**
 * PATCH /v1/courses/:course_id
 * owner/admin
 */
router.patch("/:course_id", require_auth, require_user_roles("instructor", "admin"), async (req, res) => {
    const course_id = Number(req.params.course_id);
    if (!Number.isInteger(course_id) || course_id <= 0) return res.status(400).json({ error: "Invalid course_id" });

    const user = req.context.user!;
    const guard = await requireCourseOwnerOrAdmin(course_id, user);
    if (!guard.ok) return res.status(guard.status).json({ error: guard.error });

    const body = UpdateCourseSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Invalid body", details: body.error.flatten() });

    if (body.data.title !== undefined) guard.course.title = body.data.title;
    if (body.data.description !== undefined) guard.course.description = body.data.description;

    await guard.course.save();
    return res.json({ course: guard.course });
});

/**
 * POST /v1/courses/:course_id/publish
 * owner/admin
 */
router.post("/:course_id/publish", require_auth, require_user_roles("instructor", "admin"), async (req, res) => {
    const course_id = Number(req.params.course_id);
    if (!Number.isInteger(course_id) || course_id <= 0) return res.status(400).json({ error: "Invalid course_id" });

    const user = req.context.user!;
    const guard = await requireCourseOwnerOrAdmin(course_id, user);
    if (!guard.ok) return res.status(guard.status).json({ error: guard.error });

    guard.course.is_published = true;
    await guard.course.save();

    return res.json({ course: guard.course });
});

/**
 * POST /v1/courses/:course_id/unpublish
 * owner/admin
 */
router.post("/:course_id/unpublish", require_auth, require_user_roles("instructor", "admin"), async (req, res) => {
    const course_id = Number(req.params.course_id);
    if (!Number.isInteger(course_id) || course_id <= 0) return res.status(400).json({ error: "Invalid course_id" });

    const user = req.context.user!;
    const guard = await requireCourseOwnerOrAdmin(course_id, user);
    if (!guard.ok) return res.status(guard.status).json({ error: guard.error });

    guard.course.is_published = false;
    await guard.course.save();

    return res.json({ course: guard.course });
});

/**
 * GET /v1/courses/:course_id/modules
 * - guest/student: samo ako course published
 * - instructor/admin: owner/admin
 */
router.get("/:course_id/modules", maybe_auth, async (req, res) => {
    const course_id = Number(req.params.course_id);
    if (!Number.isInteger(course_id) || course_id <= 0) return res.status(400).json({ error: "Invalid course_id" });

    const course = await Course.from_db({ course_id });
    if (!course) return res.status(404).json({ error: "Course not found" });

    const user = req.context.user;

    if (!user || user.role === "student") {
        if (!course.is_published) return res.status(404).json({ error: "Course not found" });
        const modules = await Module.list_by_course(course_id);
        return res.json({ modules });
    }

    if (user.role === "admin" || course.instructor_id === (user.user_id as any)) {
        const modules = await Module.list_by_course(course_id);
        return res.json({ modules });
    }

    return res.status(403).json({ error: "Forbidden" });
});

/**
 * POST /v1/courses/:course_id/modules
 * owner/admin
 */
router.post(
    "/:course_id/modules",
    require_auth,
    require_user_roles("instructor", "admin"),
    async (req, res) => {
        const course_id = Number(req.params.course_id);
        if (!Number.isInteger(course_id) || course_id <= 0) return res.status(400).json({ error: "Invalid course_id" });

        const user = req.context.user!;
        const guard = await requireCourseOwnerOrAdmin(course_id, user);
        if (!guard.ok) return res.status(guard.status).json({ error: guard.error });

        const body = CreateModuleSchema.safeParse(req.body);
        if (!body.success) return res.status(400).json({ error: "Invalid body", details: body.error.flatten() });

        const order_index = await Module.next_order_index(course_id);
        const mod = Module.new({ course_id, title: body.data.title, order_index });
        await mod.save();

        return res.status(201).json({ module: mod });
    }
);

export default router;
