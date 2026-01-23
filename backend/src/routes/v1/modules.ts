import { Router } from "express";
import { z } from "zod";
import { maybe_auth, require_auth, require_user_roles } from "../../middleware/auth.js";
import { Course } from "../../models/Course.js";
import { Module } from "../../models/Module.js";
import { Lesson } from "../../models/Lesson.js";

const router = Router();

async function getCourseForModule(module_id: number) {
    const mod = await Module.from_db({ module_id });
    if (!mod) return { ok: false as const, status: 404, error: "Module not found" };

    const course = await Course.from_db({ course_id: mod.course_id });
    if (!course) return { ok: false as const, status: 404, error: "Course not found" };

    return { ok: true as const, module: mod, course };
}

const UpdateModuleSchema = z.object({
    title: z.string().min(1).optional(),
    order_index: z.number().int().positive().optional()
});

const CreateLessonSchema = z.object({
    title: z.string().min(1),
    type: z.enum(["video", "text", "recipe"]),
    content: z.string().optional(),
    video_url: z.string().optional()
});

/**
 * PATCH /v1/modules/:module_id
 * owner/admin
 */
router.patch("/:module_id", require_auth, require_user_roles("instructor", "admin"), async (req, res) => {
    const module_id = Number(req.params.module_id);
    if (!Number.isInteger(module_id) || module_id <= 0) return res.status(400).json({ error: "Invalid module_id" });

    const user = req.context.user!;
    const data = await getCourseForModule(module_id);
    if (!data.ok) return res.status(data.status).json({ error: data.error });

    if (user.role !== "admin" && data.course.instructor_id !== (user.user_id as any)) {
        return res.status(403).json({ error: "Forbidden" });
    }

    const body = UpdateModuleSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Invalid body", details: body.error.flatten() });

    if (body.data.title !== undefined) data.module.title = body.data.title;
    if (body.data.order_index !== undefined) data.module.order_index = body.data.order_index;

    await data.module.save();
    return res.json({ module: data.module });
});

/**
 * GET /v1/modules/:module_id/lessons
 * - guest/student: samo ako course published
 * - instructor/admin: owner/admin
 */
router.get("/:module_id/lessons", maybe_auth, async (req, res) => {
    const module_id = Number(req.params.module_id);
    if (!Number.isInteger(module_id) || module_id <= 0) return res.status(400).json({ error: "Invalid module_id" });

    const data = await getCourseForModule(module_id);
    if (!data.ok) return res.status(data.status).json({ error: data.error });

    const user = req.context.user;

    if (!user || user.role === "student") {
        if (!data.course.is_published) return res.status(404).json({ error: "Module not found" });
        const lessons = await Lesson.list_by_module(module_id);
        return res.json({ lessons });
    }

    if (user.role === "admin" || data.course.instructor_id === (user.user_id as any)) {
        const lessons = await Lesson.list_by_module(module_id);
        return res.json({ lessons });
    }

    return res.status(403).json({ error: "Forbidden" });
});

/**
 * POST /v1/modules/:module_id/lessons
 * owner/admin
 */
router.post(
    "/:module_id/lessons",
    require_auth,
    require_user_roles("instructor", "admin"),
    async (req, res) => {
        const module_id = Number(req.params.module_id);
        if (!Number.isInteger(module_id) || module_id <= 0) return res.status(400).json({ error: "Invalid module_id" });

        const user = req.context.user!;
        const data = await getCourseForModule(module_id);
        if (!data.ok) return res.status(data.status).json({ error: data.error });

        if (user.role !== "admin" && data.course.instructor_id !== (user.user_id as any)) {
            return res.status(403).json({ error: "Forbidden" });
        }

        const body = CreateLessonSchema.safeParse(req.body);
        if (!body.success) return res.status(400).json({ error: "Invalid body", details: body.error.flatten() });

        const order_index = await Lesson.next_order_index(module_id);

        // Lesson.new() već radi minimalne checkove (video treba video_url, text treba content)
        const lesson = Lesson.new({
            module_id,
            title: body.data.title,
            order_index,
            type: body.data.type,
            content: body.data.content,
            video_url: body.data.video_url
        });

        await lesson.save();
        return res.status(201).json({ lesson });
    }
);

export default router;
