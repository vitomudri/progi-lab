// src/models/Module.ts
import { z } from "zod";
import { pool } from "../db/db.js";

export const NewModuleOptionsSchema = z.object({
    course_id: z.number().int().positive(),
    title: z.string().min(1),
    order_index: z.number().int().positive()
});
export type NewModuleOptions = z.infer<typeof NewModuleOptionsSchema>;

export const ExistingModuleOptionsSchema = z.object({
    module_id: z.number().int().positive()
});
export type ExistingModuleOptions = z.infer<typeof ExistingModuleOptionsSchema>;

export const ModuleSummarySchema = z.object({
    module_id: z.number().int().positive(),
    course_id: z.number().int().positive(),
    title: z.string(),
    order_index: z.number().int().positive()
});
export type ModuleSummary = z.infer<typeof ModuleSummarySchema>;

export class Module {
    private is_new: boolean = false;

    module_id: number;
    course_id: number;
    title: string;
    order_index: number;

    private constructor(is_new: boolean, module_id: number, course_id: number, title: string, order_index: number) {
        this.is_new = is_new;
        this.module_id = module_id;
        this.course_id = course_id;
        this.title = title;
        this.order_index = order_index;
    }

    static new(options: NewModuleOptions): Module {
        const parsed = NewModuleOptionsSchema.parse(options);
        return new Module(true, 0, parsed.course_id, parsed.title, parsed.order_index);
    }

    static async from_db(options: ExistingModuleOptions): Promise<Module | null> {
        try {
            const parsed = ExistingModuleOptionsSchema.parse(options);
            const result = await pool.query(`SELECT * FROM "modules" WHERE "module_id" = $1`, [parsed.module_id]);
            const row = result.rows.length !== 0 ? result.rows[0] : null;

            if (row) {
                return new Module(false, row.module_id, row.course_id, row.title, row.order_index);
            }
        } catch (ignored) {}

        return null;
    }

    static async exists(options: ExistingModuleOptions): Promise<boolean> {
        const parsed = ExistingModuleOptionsSchema.parse(options);
        const result = await pool.query(`SELECT 1 FROM "modules" WHERE "module_id" = $1`, [parsed.module_id]);
        return result.rows.length !== 0;
    }

    async save() {
        if (this.is_new) {
            const result = await pool.query(
                `INSERT INTO "modules" ("course_id", "title", "order_index")
                 VALUES ($1, $2, $3)
                 RETURNING "module_id"`,
                [this.course_id, this.title, this.order_index]
            );

            this.module_id = result.rows[0].module_id;
            this.is_new = false;
        } else {
            await pool.query(
                `UPDATE "modules"
                 SET "course_id" = $2, "title" = $3, "order_index" = $4
                 WHERE "module_id" = $1`,
                [this.module_id, this.course_id, this.title, this.order_index]
            );
        }
    }

    static async list_by_course(course_id: number): Promise<ModuleSummary[]> {
        const result = await pool.query(
            `SELECT "module_id", "course_id", "title", "order_index"
             FROM "modules"
             WHERE "course_id" = $1
             ORDER BY "order_index" ASC`,
            [course_id]
        );
        return result.rows.map((r) => ({ module_id: r.module_id, course_id: r.course_id, title: r.title, order_index: r.order_index }));
    }

    static async next_order_index(course_id: number): Promise<number> {
        const result = await pool.query(
            `SELECT COALESCE(MAX("order_index"), 0) + 1 AS next
             FROM "modules"
             WHERE "course_id" = $1`,
            [course_id]
        );
        return Number(result.rows[0]?.next ?? 1);
    }
}
