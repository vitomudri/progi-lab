import Router from "express";
import type { UUID } from "crypto";
import require_auth from "../../middleware/require_auth.js";
import { Recipe, type ExistingRecipeOptions, type NewRecipeOptions, type RecipeSummary } from "../../models/Recipe.js";

const router = Router();

router.get("/popular", async (req, res) => {
    const recipes: RecipeSummary[] = await Recipe.get_popular();
    res.status(200).json({ content: recipes });
});

router.get("/get/:recipe_id", async (req, res) => {
    try {
        const options: ExistingRecipeOptions = { recipe_id: req.params.recipe_id as UUID };

        const recipe = await Recipe.from_db(options);
        if (!recipe) {
            return res.status(404).json({ error: "Not Found" });
        }

        res.status(200).json(recipe);
    } catch(ignored) {
        return res.status(400).json({ error: "Bad Request" });
    }
});

router.post("/create", require_auth, async (req, res) => {
    try {
        const options: NewRecipeOptions = req.body;

        const recipe = Recipe.new(options);
        await recipe.save();

        res.status(201).json({ content: recipe });
    } catch(ignored) {
        return res.status(400).json({ error: "Bad Request" });
    }
});

export default router;
