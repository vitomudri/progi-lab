import Router from "express";
import require_auth from "../../middleware/require_auth.js";
import { Recipe } from "../../models/Recipe.js";

const router = Router();

router.get("/popular", async (req, res) => {
    const recipes = await Recipe.get_popular();
    res.status(200).json({ popular: recipes });
});

export default router;
