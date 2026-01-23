import type { Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { Admin, Instructor, Student, User, type UserRole } from "../models/User.js";
import { env } from "../env.js";

export async function maybe_auth(req: Request, res: Response, next: NextFunction) {
    if (req.context.user === undefined) {
        try {
            const token = req.cookies.token;
            if (token) {
                const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
                const user = await User.from_db({ user_id: decoded.id });
                if (user && (!user.totp_secret || decoded.totp_verified)) {
                    req.context.user = user;

                    if (user.role === "student") {
                        req.context.user_as.student = (await Student.from_user(user))!;
                    } else if (user.role === "instructor") {
                        req.context.user_as.instructor = (await Instructor.from_user(user))!;
                    } else if (user.role === "admin") {
                        req.context.user_as.admin = (await Admin.from_user(user))!;
                    }
                }
            }
        } catch (err) {}
        next();
    } else {
        next();
    }
}

export async function require_nototp_auth(req: Request, res: Response, next: NextFunction) {
    if (req.context.user === undefined) {
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

            req.context.user = user;

            next();
        } catch (err) {
            return res.status(401).json({ error: "Unauthorized" });
        }
    } else {
        next();
    }
}

export async function require_auth(req: Request, res: Response, next: NextFunction) {
    if (req.context.user === undefined) {
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

            req.context.user = user;

            if (user.role === "student") {
                req.context.user_as.student = (await Student.from_user(user))!;
            } else if (user.role === "instructor") {
                req.context.user_as.instructor = (await Instructor.from_user(user))!;
            } else if (user.role === "admin") {
                req.context.user_as.admin = (await Admin.from_user(user))!;
            }

            next();
        } catch (err) {
            return res.status(401).json({ error: "Unauthorized" });
        }
    } else {
        next();
    }
}

export function require_user_roles(...roles: UserRole[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.context.user) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        if (!roles.includes(req.context.user.role)) {
            return res.status(403).json({ error: "Forbidden" });
        }

        next();
    }
}
