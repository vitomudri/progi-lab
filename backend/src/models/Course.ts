// src/models/Course.ts
import { type UUID } from "crypto";
import { z } from "zod";
import { pool } from "../db/db.js";

export const NewCourseOptionsSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    instructor_id: z.custom<UUID>().optional(),
    is_published: z.boolean().optional()
});
export type NewCourseOptions = z.infer<typeof NewCourseOptionsSchema>;

export const ExistingCourseOptionsSchema = z.object({
    course_id: z.number().int().positive()
});
export type ExistingCourseOptions = z.infer<typeof ExistingCourseOptionsSchema>;

export const CourseSummarySchema = z.object({
    course_id: z.number().int().positive(),
    title: z.string(),
    is_published: z.boolean()
});
export type CourseSummary = z.infer<typeof CourseSummarySchema>;

export class Course {
    private is_new: boolean = false;

    course_id: number;
    title: string;
    description: string | null;
    instructor_id: UUID | null;
    is_published: boolean;

    private constructor(is_new: boolean, course_id: number, title: string, description: string | null, instructor_id: UUID | null, is_published: boolean) {
        this.is_new = is_new;
        this.course_id = course_id;
        this.title = title;
        this.description = description;
        this.instructor_id = instructor_id;
        this.is_published = is_published;
    }

    static new(options: NewCourseOptions): Course {
        const parsed = NewCourseOptionsSchema.parse(options);
        return new Course(
            true,
            0, // SERIAL - will be set on insert
            parsed.title,
            parsed.description ?? null,
            parsed.instructor_id ?? null,
            parsed.is_published ?? false
        );
    }

    static async from_db(options: ExistingCourseOptions): Promise<Course | null> {
        try {
            const parsed = ExistingCourseOptionsSchema.parse(options);
            const result = await pool.query(`SELECT * FROM "courses" WHERE "course_id" = $1`, [parsed.course_id]);
            const row = result.rows.length !== 0 ? result.rows[0] : null;

            if (row) {
                return new Course(false, row.course_id, row.title, row.description ?? null, row.instructor_id ?? null, !!row.is_published);
            }
        } catch (ignored) {}

        return null;
    }

    static async exists(options: ExistingCourseOptions): Promise<boolean> {
        const parsed = ExistingCourseOptionsSchema.parse(options);
        const result = await pool.query(`SELECT 1 FROM "courses" WHERE "course_id" = $1`, [parsed.course_id]);
        return result.rows.length !== 0;
    }

    async save() {
        if (this.is_new) {
            const result = await pool.query(
                `INSERT INTO "courses" ("title", "description", "instructor_id", "is_published")
                 VALUES ($1, $2, $3, $4)
                 RETURNING "course_id"`,
                [this.title, this.description, this.instructor_id, this.is_published]
            );

            this.course_id = result.rows[0].course_id;
            this.is_new = false;
        } else {
            await pool.query(
                `UPDATE "courses"
                 SET "title" = $2, "description" = $3, "instructor_id" = $4, "is_published" = $5
                 WHERE "course_id" = $1`,
                [this.course_id, this.title, this.description, this.instructor_id, this.is_published]
            );
        }
    }

    static async list_published(limit: number = 50): Promise<CourseSummary[]> {
        const safeLimit = Math.max(1, Math.min(200, Math.trunc(limit)));
        const result = await pool.query(
            `SELECT "course_id", "title", "is_published"
             FROM "courses"
             WHERE "is_published" = true
             ORDER BY "course_id" DESC
             LIMIT $1`,
            [safeLimit]
        );
        return result.rows.map((r) => ({ course_id: r.course_id, title: r.title, is_published: !!r.is_published }));
    }

    static async list_by_instructor(instructor_id: UUID, limit: number = 50): Promise<CourseSummary[]> {
        const safeLimit = Math.max(1, Math.min(200, Math.trunc(limit)));
        const result = await pool.query(
            `SELECT "course_id", "title", "is_published"
             FROM "courses"
             WHERE "instructor_id" = $1
             ORDER BY "course_id" DESC
             LIMIT $2`,
            [instructor_id, safeLimit]
        );
        return result.rows.map((r) => ({ course_id: r.course_id, title: r.title, is_published: !!r.is_published }));
    }
}
