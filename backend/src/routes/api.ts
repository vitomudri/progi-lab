import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
    res.send("Hello, World!").status(200);
});

export default router;
