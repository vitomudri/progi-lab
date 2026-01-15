import type { Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { User } from "../models/User.js";
import { env } from "../env.js";

declare global {
    namespace Express {
        interface Request {
            user?: User;
        }
    }
}

export async function maybe_auth(req: Request, res: Response, next: NextFunction) {
    if (req.user === undefined) {
        try {
            const token = req.cookies.token;
            if (token) {
                const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
                const user = await User.from_db({ user_id: decoded.id });
                if (user && (!user.totp_secret || decoded.totp_verified)) {
                    req.user = user;
                }
            }
        } catch (err) {}
        next();
    } else {
        next();
    }
}

export async function require_nototp_auth(req: Request, res: Response, next: NextFunction) {
    if (req.user === undefined) {
        try {
            const token = req.cookies.token;
            if (!token) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

            const user = await User.from_db({ user_id: decoded.id });
            if (!user) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            req.user = user;

            next();
        } catch (err) {
            return res.status(401).json({ error: "Unauthorized" });
        }
    } else {
        next();
    }
}

export async function require_auth(req: Request, res: Response, next: NextFunction) {
    if (req.user === undefined) {
        try {
            const token = req.cookies.token;
            if (!token) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

            const user = await User.from_db({ user_id: decoded.id });
            if (!user) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            if (user.totp_secret !== null && !decoded.totp_verified) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            req.user = user;

            next();
        } catch (err) {
            return res.status(401).json({ error: "Unauthorized" });
        }
    } else {
        next();
    }
}
