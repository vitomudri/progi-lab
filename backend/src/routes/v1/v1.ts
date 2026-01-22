import { Router } from "express";
import auth_router from "./auth.js";
import recipe_router from "./recipe.js";
import profile_router from "./profile.js";
import files_router from "./files.js";
import instructors_router from "./instructors.js";
import admin_router from "./admin.js";
import courses_router from "./courses.js";
import modules_router from "./modules.js";
import lessons_router from "./lessons.js";


const router = Router();

router.use("/auth", auth_router);
router.use("/recipe", recipe_router);
router.use("/profile", profile_router);
router.use("/files", files_router);
router.use("/instructors", instructors_router);
router.use("/admin", admin_router);
router.use("/courses", courses_router);
router.use("/modules", modules_router);
router.use("/lessons", lessons_router);

export default router;
