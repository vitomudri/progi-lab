import type { Request, Response, NextFunction } from "express";
import { User, Student, Instructor, Admin } from "../models/User.js";

export interface RequestContext {
    user?: User
    user_as: {
        student?: Student
        instructor?: Instructor
        admin?: Admin
    }
};

declare global {
    namespace Express {
        interface Request {
            context: RequestContext;
        }
    }
}

export async function init_context(req: Request, res: Response, next: NextFunction) {
    req.context = {
        user_as: {}
    };
    next();
}
