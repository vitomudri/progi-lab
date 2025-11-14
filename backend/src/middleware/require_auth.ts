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

export default async function require_auth(req: Request, res: Response, next: NextFunction) {
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
}
