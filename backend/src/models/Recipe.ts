import { randomUUID, type UUID } from "crypto";
import { pool } from "../db/initDatabase.js";

export type NewRecipeOptions = { name: string, description: string, prep_time: number, number_of_servings: number };

export type ExistingRecipeOptions = { recipe_id: UUID };

class Recipe {
    private is_new: boolean = false;
    recipe_id: UUID;
    name: string;
    description: string;
    prep_time: number;
    number_of_servings: number;
    //lesson_id: UUID; // unimplemented

    private constructor(is_new: boolean, recipe_id: UUID, name: string, description: string, prep_time: number, number_of_servings: number) {
        this.is_new = is_new;
        this.recipe_id = recipe_id;
        this.name = name;
        this.description = description;
        this.prep_time = prep_time;
        this.number_of_servings = number_of_servings;
    }

    static new(options: NewRecipeOptions): Recipe {
        return new Recipe(true, randomUUID(), options.name, options.description, options.prep_time, options.number_of_servings);
    }

    static async from_db(options: ExistingRecipeOptions): Promise<Recipe | null> {
        try {
            const result = await pool.query(`SELECT * FROM "recipes" WHERE "recipe_id" = $1`, [options.recipe_id]);
            const row = result.rows.length != 0 ? result.rows[0] : null;
            if (row) {
                return new Recipe(false, row.recipe_id, row.name, row.description, row.prep_time, row.number_of_servings);
            }
        } catch(ignored) {}

        return null;
    }

    static async exists(options: ExistingRecipeOptions): Promise<boolean> {
        const result = await pool.query(`SELECT 1 FROM "recipes" WHERE "recipe_id" = $1`, [options.recipe_id]);
        return result.rows.length != 0;
    }

    async save() {
        if (this.is_new) {
            await pool.query(
                `INSERT INTO "recipes" ("recipe_id", "name", "description", "prep_time", "number_of_servings")
                 VALUES ($1, $2, $3, $4, $5)`,
                [this.recipe_id, this.name, this.description, this.prep_time, this.number_of_servings]
            );
            this.is_new = false;
        } else {
            await pool.query(
                `UPDATE "recipes" SET "name" = $2, "description" = $3, "prep_time" = $4, "number_of_servings" = $5
                 WHERE "recipe_id" = $1`,
                [this.recipe_id, this.name, this.description, this.prep_time, this.number_of_servings]
            );
        }
    }
}
