import type { Request, Response, NextFunction } from "express";
import { pool } from "../db/db.js";

export default async function log(req: Request, res: Response, next: NextFunction) {
    if (req.user !== undefined) {
        try {
            await pool.query(
                "INSERT INTO AuditLogs (user_id, action) VALUES ($1, $2)",
                [req.user.user_id, `${req.method} ${req.path}`]
            );
        } catch (error) {
            console.error("Audit log failed: ", error);
        }
    }
    next();
}
