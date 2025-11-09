import { Router } from "express";
import createError from "http-errors";
import v1 from "./v1/v1.js";

const router = Router();

router.use("/v1", v1);

router.use("/healthcheck", (req, res) => {
    res.status(200).send("OK");
});

router.use((req, res, next) => {
    next(createError(404, `Not Found`));
});

export default router;
