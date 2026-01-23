import express from "express";
import { require_auth } from "../../middleware/auth.js";
import { Admin, Instructor, Student, User } from "../../models/User.js";
import { z } from "zod";
import type { UUID } from "crypto";

const profile_router = express.Router();

profile_router.get("/me", require_auth, async (req, res) => {
    const user = req.context.user!;

    const base_info = {
        user_id: user.user_id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        registration_date: user.registration_date,
        status: user.status,
        role: user.role,
        calendar_key: user.calendar_key
    };

    if (user.role === "student") {
        const student = req.context.user_as.student!;
        return res.json({
            ...base_info,
            skill_level: student.skill_level,
            dietary_preferences: student.dietary_preferences,
            favorite_cuisines: student.favorite_cuisines,
            allergens: student.allergens
        });
    } else if (user.role === "instructor") {
        const instructor = req.context.user_as.instructor!;
        return res.json({
            ...base_info,
            biography: instructor.biography,
            specialization: instructor.specialization,
            rating: instructor.rating,
            verified: instructor.verified
        });
    } else if (user.role === "admin") {
        const admin = req.context.user_as.admin!;
        return res.json({
            ...base_info,
            access_level: admin.access_level
        });
    }
});

profile_router.get("/:id", require_auth, async (req, res) => {
    const maybe_requested_id = req.params.id;

    try {
        const requested_id: UUID = z.uuidv4().parse(maybe_requested_id) as UUID;
        const requested_user = await User.from_db({ user_id: requested_id });
        if (requested_user) {
            const base_info = {
                user_id: requested_user.user_id,
                first_name: requested_user.first_name,
                last_name: requested_user.last_name,
                registration_date: requested_user.registration_date,
                role: requested_user.role,
            }

            if (requested_user.role == "student") {
                const student = (await Student.from_user(requested_user))!;
                return res.json({
                    ...base_info,
                    skill_level: student.skill_level,
                    dietary_preferences: student.dietary_preferences,
                    favorite_cuisines: student.favorite_cuisines,
                    allergens: student.allergens
                });
            } else if (requested_user.role == "instructor") {
                const instructor = (await Instructor.from_user(requested_user))!;
                return res.json({
                    ...base_info,
                    biography: instructor.biography,
                    specialization: instructor.specialization,
                    rating: instructor.rating,
                });
            } else if (requested_user.role == "admin") {
                const admin = (await Admin.from_user(requested_user))!;
                return res.json({
                    ...base_info,
                });
            }
        } else {
            return res.status(400).json({ error: "Invalid user ID" });
        }
    } catch(err) {
        return res.status(400).json({ error: "Invalid user ID" });
    }
});

export default profile_router;
