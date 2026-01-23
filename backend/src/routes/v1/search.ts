import { Router } from "express";
import { pool } from "../../db/db.js";
import { require_auth } from "../../middleware/auth.js";

const search_router = Router();

search_router.get("/users", require_auth, async (req, res) => {
    try {
        const query = (req.query.q as string) || "";
        const autocomplete = req.query.autocomplete === "true";

        if (!query.trim()) {
            return res.json([]);
        }

        const limitClause = autocomplete ? "LIMIT 5" : "";

        const result = await pool.query(`
            SELECT user_id, first_name, last_name
            FROM Users
            WHERE first_name % $1
               OR last_name % $1
               OR user_id % $1
            ORDER BY
                CASE
                    WHEN first_name = $1 THEN 0
                    WHEN last_name = $1 THEN 1
                    WHEN user_id = $1 THEN 2
                    ELSE 3
                END,
                GREATEST(
                    similarity(first_name, $1),
                    similarity(last_name, $1),
                    similarity(user_id, $1)
                ) DESC
            ${limitClause};
        `, [query]);

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

search_router.get("/courses", async (req, res) => {
    try {
        const query = (req.query.q as string) || "";
        const autocomplete = req.query.autocomplete === "true";

        if (!query.trim()) {
            return res.json([]);
        }

        const limitClause = autocomplete ? "LIMIT 5" : "";

        const result = await pool.query(`
            SELECT course_id, title, description
            FROM Courses
            WHERE title % $1
               OR description % $1
            ORDER BY
                CASE
                    WHEN title = $1 THEN 0
                    WHEN description = $1 THEN 1
                    ELSE 2
                END,
                GREATEST(
                    similarity(title, $1),
                    similarity(description, $1)
                ) DESC
            ${limitClause};
        `, [query]);

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

search_router.get("/modules", async (req, res) => {
    try {
        const query = (req.query.q as string) || "";
        const autocomplete = req.query.autocomplete === "true";

        if (!query.trim()) {
            return res.json([]);
        }

        const limitClause = autocomplete ? "LIMIT 5" : "";

        const result = await pool.query(`
            SELECT module_id, title
            FROM Modules
            WHERE title % $1
            ORDER BY
                CASE
                    WHEN title = $1 THEN 0
                    ELSE 1
                END,
                similarity(title, $1) DESC
            ${limitClause};
        `, [query]);

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

search_router.get("/lessons", async (req, res) => {
    try {
        const query = (req.query.q as string) || "";
        const autocomplete = req.query.autocomplete === "true";

        if (!query.trim()) {
            return res.json([]);
        }

        const limitClause = autocomplete ? "LIMIT 5" : "";

        const result = await pool.query(`
            SELECT lesson_id, title
            FROM Lessons
            WHERE title % $1
            ORDER BY
                CASE
                    WHEN title = $1 THEN 0
                    ELSE 1
                END,
                similarity(title, $1) DESC
            ${limitClause};
        `, [query]);

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

search_router.get("/recipes", async (req, res) => {
    try {
        const query = (req.query.q as string) || "";
        const autocomplete = req.query.autocomplete === "true";
        const tags: Array<string> = ((tag) => {
            if (Array.isArray(tag)) {
                return tag.filter((item): item is string => typeof item === "string");
            } else if (typeof tag === "string") {
                return [tag];
            } else {
                return [];
            }
        })(req.query.tag);

        if (!query.trim()) {
            return res.json([]);
        }

        const limitClause = autocomplete ? "LIMIT 5" : "";

        let sql_query = `
            SELECT Recipes.recipe_id, Recipes.name, Recipes.description
            FROM Recipes
        `;

        if (tags.length > 0) {
            sql_query += `
                INNER JOIN RecipesTags ON Recipes.recipe_id = RecipesTags.recipe_id
                INNER JOIN Tags ON RecipesTags.tag_id = Tags.tag_id
            `;
        }

        sql_query += `
            WHERE (Recipes.name % $1 OR Recipes.description % $1)
        `;

        if (tags.length > 0) {
            sql_query += ` AND Tags.name = ANY($2::text[])`;
        }

        sql_query += `
            ORDER BY
                CASE
                    WHEN Recipes.name = $1 THEN 0
                    WHEN Recipes.description = $1 THEN 1
                    ELSE 2
                END,
                GREATEST(
                    similarity(Recipes.name, $1),
                    similarity(Recipes.description, $1)
                ) DESC
            ${limitClause};
        `;

        const params = tags.length > 0 ? [query, tags] : [query];

        const result = await pool.query(sql_query, params);

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

search_router.get("/tags", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT tag_id, name
            FROM Tags
            ORDER BY name ASC;
        `);

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default search_router;
