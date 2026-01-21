import type { Request, Response, NextFunction } from "express";
import { pool } from "../db/db.js";

const make_key = (success: boolean, path: string): string => `${success}:${path}`;

const log_map: Map<string, string> = new Map([
    [make_key(true, "/auth/register"), "User registered successfully"],
    [make_key(false, "/auth/register"), "Registration failed"],
    [make_key(true, "/auth/login"), "User logged in"],
    [make_key(false, "/auth/login"), "Login failed"],
    [make_key(true, "/auth/logout"), "User logged out"],
    [make_key(false, "/auth/logout"), "Logout failed"],
    [make_key(true, "/auth/update-password"), "Password updated"],
    [make_key(false, "/auth/update-password"), "Password update failed"],
    [make_key(true, "/auth/google/redirect"), "Redirected to Google OAuth"],
    [make_key(false, "/auth/google/redirect"), "Google redirect failed"],
    [make_key(true, "/auth/google/callback"), "Google OAuth callback succeeded"],
    [make_key(false, "/auth/google/callback"), "Google OAuth callback failed"],
    [make_key(true, "/auth/github/redirect"), "Redirected to GitHub OAuth"],
    [make_key(false, "/auth/github/redirect"), "GitHub redirect failed"],
    [make_key(true, "/auth/github/callback"), "GitHub OAuth callback succeeded"],
    [make_key(false, "/auth/github/callback"), "GitHub OAuth callback failed"],
    [make_key(true, "/auth/2fa/request-setup"), "2FA setup requested"],
    [make_key(false, "/auth/2fa/request-setup"), "2FA setup request failed"],
    [make_key(true, "/auth/2fa/verify-setup"), "2FA setup verified"],
    [make_key(false, "/auth/2fa/verify-setup"), "2FA setup verification failed"],
    [make_key(true, "/auth/2fa/disable"), "2FA disabled"],
    [make_key(false, "/auth/2fa/disable"), "2FA disable failed"],
    [make_key(true, "/auth/2fa/status"), "2FA status fetched"],
    [make_key(false, "/auth/2fa/status"), "2FA status fetch failed"],
    [make_key(true, "/auth/2fa/verify-token"), "2FA token verified"],
    [make_key(false, "/auth/2fa/verify-token"), "2FA token verification failed"],

    [make_key(true, "/profile/me"), "Own profile fetched"],
    [make_key(false, "/profile/me"), "Own profile fetch failed"],
    [make_key(true, "/profile/:id"), "User profile fetched"],
    [make_key(false, "/profile/:id"), "User profile fetch failed"],

    [make_key(true, "/recipe/popular"), "Popular recipes fetched"],
    [make_key(false, "/recipe/popular"), "Popular recipes fetch failed"],
    [make_key(true, "/recipe/get/:recipe_id"), "Recipe fetched"],
    [make_key(false, "/recipe/get/:recipe_id"), "Recipe fetch failed"],
    [make_key(true, "/recipe/create"), "Recipe created"],
    [make_key(false, "/recipe/create"), "Recipe creation failed"],

    [make_key(true, "/admin/audit_log"), "Audit log fetched"],
    [make_key(false, "/admin/audit_log"), "Audit log fetch failed"],
]);

export default async function log(req: Request, res: Response, next: NextFunction) {
    if (req.context.user !== undefined) {
        const user = req.context.user!;
        const route_path = req.route?.path || req.path;
        res.on("finish", async () => {
            let success = res.statusCode < 400;
            let log: string;

            if (log_map.has(make_key(success, route_path))) {
                log = log_map.get(make_key(success, route_path))!;
            } else {
                log = `${success ? "Successful" : "Failed"} ${req.method} on ${route_path}`;
            }

            try {
                await pool.query(
                    "INSERT INTO AuditLogs (user_id, action) VALUES ($1, $2)",
                    [user.user_id, log]
                );
            } catch (error) {
                console.error("Audit log failed: ", error);
            }
        });
    }
    next();
}
