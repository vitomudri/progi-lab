import { Router } from "express";
import authRouter from "./auth.js";

const router = Router();

router.use("/auth", authRouter);

router.get("/", (req, res) => {
    res.status(200).send("Hello World from v1");
});

export default router;
