import { Router } from "express";
import auth_router from "./auth.js";
import recipe_router from "./recipe.js";
import profile_router from "./profile.js";
import admin_router from "./admin.js";

const router = Router();

router.use("/auth", auth_router);
router.use("/recipe", recipe_router);
router.use("/profile", profile_router);
router.use("/admin", admin_router);

export default router;
