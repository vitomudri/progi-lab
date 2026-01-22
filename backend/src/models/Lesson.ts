// src/models/Lesson.ts
import { z } from "zod";
import { pool } from "../db/db.js";

export const LessonTypeSchema = z.enum(["video", "text", "recipe"]);
export type LessonType = z.infer<typeof LessonTypeSchema>;

export const LessonDifficultySchema = z.enum(["easy", "medium", "hard"]);
export type LessonDifficulty = z.infer<typeof LessonDifficultySchema>;

export const NutritionSchema = z.record(z.string(), z.any());
 // JSONB (minimalno)
export type Nutrition = z.infer<typeof NutritionSchema>;

console.log("LESSONS ROUTER LOADED");


export const NewLessonOptionsSchema = z.object({
    module_id: z.number().int().positive(),
    title: z.string().min(1),
    order_index: z.number().int().positive(),
    type: LessonTypeSchema,
    content: z.string().optional(),
    video_url: z.string().optional(),

    // nova polja (optional na kreiranju, kasnije se uređuje PATCH-om)
    steps_text: z.string().optional(),
    ingredients_text: z.string().optional(),
    prep_time_min: z.number().int().min(0).optional(),
    cook_time_min: z.number().int().min(0).optional(),
    difficulty: LessonDifficultySchema.optional(),
    shopping_list: z.string().optional(),
    allergens: z.string().optional(),
    nutrition: NutritionSchema.optional()
});
export type NewLessonOptions = z.infer<typeof NewLessonOptionsSchema>;

export const ExistingLessonOptionsSchema = z.object({
    lesson_id: z.number().int().positive()
});
export type ExistingLessonOptions = z.infer<typeof ExistingLessonOptionsSchema>;

export const LessonSummarySchema = z.object({
    lesson_id: z.number().int().positive(),
    module_id: z.number().int().positive(),
    title: z.string(),
    order_index: z.number().int().positive(),
    type: LessonTypeSchema
});
export type LessonSummary = z.infer<typeof LessonSummarySchema>;

export class Lesson {
    private is_new: boolean = false;

    lesson_id: number;
    module_id: number;
    title: string;
    order_index: number;
    type: LessonType;

    content: string | null;
    video_url: string | null;

    // NOVO (CMS cooking fields)
    steps_text: string | null;
    ingredients_text: string | null;

    prep_time_min: number | null;
    cook_time_min: number | null;
    difficulty: LessonDifficulty | null;

    shopping_list: string | null;
    allergens: string | null;
    nutrition: Nutrition | null;

    private constructor(
        is_new: boolean,
        lesson_id: number,
        module_id: number,
        title: string,
        order_index: number,
        type: LessonType,
        content: string | null,
        video_url: string | null,

        steps_text: string | null,
        ingredients_text: string | null,

        prep_time_min: number | null,
        cook_time_min: number | null,
        difficulty: LessonDifficulty | null,

        shopping_list: string | null,
        allergens: string | null,
        nutrition: Nutrition | null
    ) {
        this.is_new = is_new;

        this.lesson_id = lesson_id;
        this.module_id = module_id;
        this.title = title;
        this.order_index = order_index;
        this.type = type;

        this.content = content;
        this.video_url = video_url;

        this.steps_text = steps_text;
        this.ingredients_text = ingredients_text;

        this.prep_time_min = prep_time_min;
        this.cook_time_min = cook_time_min;
        this.difficulty = difficulty;

        this.shopping_list = shopping_list;
        this.allergens = allergens;
        this.nutrition = nutrition;
    }

    static new(options: NewLessonOptions): Lesson {
        const parsed = NewLessonOptionsSchema.parse(options);

        // minimal safety
        if (parsed.type === "video" && !parsed.video_url) {
            throw new Error("Lesson of type 'video' requires video_url");
        }
        if (parsed.type === "text" && !parsed.content) {
            throw new Error("Lesson of type 'text' requires content");
        }

        return new Lesson(
            true,
            0,
            parsed.module_id,
            parsed.title,
            parsed.order_index,
            parsed.type,
            parsed.content ?? null,
            parsed.video_url ?? null,

            parsed.steps_text ?? null,
            parsed.ingredients_text ?? null,

            parsed.prep_time_min ?? null,
            parsed.cook_time_min ?? null,
            parsed.difficulty ?? null,

            parsed.shopping_list ?? null,
            parsed.allergens ?? null,
            parsed.nutrition ?? null
        );
    }

    static async from_db(options: ExistingLessonOptions): Promise<Lesson | null> {
        try {
            const parsed = ExistingLessonOptionsSchema.parse(options);
            const result = await pool.query(`SELECT * FROM "lessons" WHERE "lesson_id" = $1`, [parsed.lesson_id]);
            const row = result.rows.length !== 0 ? result.rows[0] : null;

            if (row) {
                return new Lesson(
                    false,
                    row.lesson_id,
                    row.module_id,
                    row.title,
                    row.order_index,
                    row.type,
                    row.content ?? null,
                    row.video_url ?? null,

                    row.steps_text ?? null,
                    row.ingredients_text ?? null,

                    row.prep_time_min ?? null,
                    row.cook_time_min ?? null,
                    row.difficulty ?? null,

                    row.shopping_list ?? null,
                    row.allergens ?? null,
                    row.nutrition ?? null
                );
            }
        } catch (ignored) {}

        return null;
    }

    static async exists(options: ExistingLessonOptions): Promise<boolean> {
        const parsed = ExistingLessonOptionsSchema.parse(options);
        const result = await pool.query(`SELECT 1 FROM "lessons" WHERE "lesson_id" = $1`, [parsed.lesson_id]);
        return result.rows.length !== 0;
    }

    async save() {
        if (this.is_new) {
            const result = await pool.query(
                `
                INSERT INTO "lessons" (
                  "module_id", "title", "order_index", "type",
                  "content", "video_url",
                  "steps_text", "ingredients_text",
                  "prep_time_min", "cook_time_min", "difficulty",
                  "shopping_list", "allergens", "nutrition"
                )
                VALUES (
                  $1, $2, $3, $4,
                  $5, $6,
                  $7, $8,
                  $9, $10, $11,
                  $12, $13, $14
                )
                RETURNING "lesson_id"
                `,
                [
                    this.module_id,
                    this.title,
                    this.order_index,
                    this.type,

                    this.content,
                    this.video_url,

                    this.steps_text,
                    this.ingredients_text,

                    this.prep_time_min,
                    this.cook_time_min,
                    this.difficulty,

                    this.shopping_list,
                    this.allergens,
                    this.nutrition
                ]
            );

            this.lesson_id = result.rows[0].lesson_id;
            this.is_new = false;
        } else {
            await pool.query(
                `
                UPDATE "lessons"
                SET
                  "module_id" = $2,
                  "title" = $3,
                  "order_index" = $4,
                  "type" = $5,
                  "content" = $6,
                  "video_url" = $7,

                  "steps_text" = $8,
                  "ingredients_text" = $9,

                  "prep_time_min" = $10,
                  "cook_time_min" = $11,
                  "difficulty" = $12,

                  "shopping_list" = $13,
                  "allergens" = $14,
                  "nutrition" = $15
                WHERE "lesson_id" = $1
                `,
                [
                    this.lesson_id,
                    this.module_id,
                    this.title,
                    this.order_index,
                    this.type,
                    this.content,
                    this.video_url,

                    this.steps_text,
                    this.ingredients_text,

                    this.prep_time_min,
                    this.cook_time_min,
                    this.difficulty,

                    this.shopping_list,
                    this.allergens,
                    this.nutrition
                ]
            );
        }
    }

    static async list_by_module(module_id: number): Promise<LessonSummary[]> {
        const result = await pool.query(
            `
            SELECT "lesson_id", "module_id", "title", "order_index", "type"
            FROM "lessons"
            WHERE "module_id" = $1
            ORDER BY "order_index" ASC
            `,
            [module_id]
        );
        return result.rows.map((r) => ({
            lesson_id: r.lesson_id,
            module_id: r.module_id,
            title: r.title,
            order_index: r.order_index,
            type: r.type
        }));
    }

    static async next_order_index(module_id: number): Promise<number> {
        const result = await pool.query(
            `
            SELECT COALESCE(MAX("order_index"), 0) + 1 AS next
            FROM "lessons"
            WHERE "module_id" = $1
            `,
            [module_id]
        );
        return Number(result.rows[0]?.next ?? 1);
    }
}
