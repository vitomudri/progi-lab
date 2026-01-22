import express from "express";
import { require_auth } from "../../middleware/auth.js";
import { User } from "../../models/User.js";
import { z } from "zod";
import type { UUID } from "crypto";

const profile_router = express.Router();

profile_router.get("/me", require_auth, async (req, res) => {
    const user = req.context.user!;
    return res.json({
        id: user.user_id,
        ime: user.first_name,
        prezime: user.last_name,
        email: user.email,
        role: user.role,
        skillLevel: "Početnik",
        allergens: [],
        favoriteCuisines: [],
        courseHistory: [],
        notes: ""
    });
});

profile_router.get("/:id", require_auth, async (req, res) => {
    const user = req.context.user!;
    const maybe_requested_id = req.params.id;

    try {
        const requested_id: UUID = z.uuidv4().parse(maybe_requested_id) as UUID;
        const requested_user = await User.from_db({ user_id: requested_id });
        if (requested_user) {
            return res.json({
                user_id: requested_user.user_id,
                first_name: requested_user.first_name,
                last_name: requested_user.last_name,
                registration_date: requested_user.registration_date,
                status: requested_user.status,
                role: requested_user.role,
            });
        } else {
            return res.status(400).json({ error: "Invalid user ID" });
        }
    } catch(err) {
        return res.status(400).json({ error: "Invalid user ID" });
    }
});

export default profile_router;
