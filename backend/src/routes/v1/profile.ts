import express from "express";
import { require_auth } from "../../middleware/auth.js";

const profile_router = express.Router();

profile_router.get("/me", require_auth, async (req, res) => {
    const user = req.user!;
    return res.json({
        id: user.user_id,
        ime: user.first_name,
        prezime: user.last_name,
        email: user.email,
        skillLevel: "Početnik",
        allergens: [],
        favoriteCuisines: [],
        courseHistory: [],
        notes: ""
    });
});

profile_router.get("/:id", async (req, res) => {
    const requested_id = req.params.id;
    if (req.user) {
        const user = req.user!;

    } else {

    }
});

export default profile_router;
