import { Router } from "express";
import auth_router from "./auth.js";
import recipe_router from "./recipe.js";

const router = Router();

router.use("/auth", auth_router);
router.use("/recipe", recipe_router);

export default router;
