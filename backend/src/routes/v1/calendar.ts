import {type UUID } from "crypto";
import { Router } from "express";
import { pool } from "../../db/db.js";
import { generateCalendar } from "../../util/ics.js";
import { User } from "../../models/User.js"
import { z } from "zod";


const router = Router();

/**
 * GET /calendar/:user_id?calendar_key=...
 */
router.get("/calendar/:user_id", async (req, res) => {
    const user_id = req.params.user_id;
    const calendar_key = req.query.calendar_key;

    if (typeof calendar_key !== "string") {
        return res.status(400).send("Bad Request");
    }

    let user = await User.from_db({ user_id: user_id as UUID });

    if (!user || user.calendar_key !== calendar_key) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        let eventsResult;
        if (user.role === "student") {
            eventsResult = await pool.query(
                `
                SELECT
                lw.workshop_id AS id,
                lw.title,
                lw.date_time AS start_time,
                lw.date_time + lw.duration * INTERVAL '1 minute' AS end_time
                FROM Reservations r
                JOIN LiveWorkshops lw
                ON lw.workshop_id = r.workshop_id
                WHERE r.user_id = $1
                AND r.status = 'confirmed'
                ORDER BY lw.date_time
                `,
                [user_id]
            );
        } else if (user.role === "instructor") {
            eventsResult = await pool.query(
                `
                SELECT
                workshop_id AS id,
                title,
                date_time AS start_time,
                date_time + duration * INTERVAL '1 minute' AS end_time
                FROM LiveWorkshops
                WHERE instructor_id = $1
                ORDER BY date_time
                `,
                [user_id]
            );
        } else if (user.role === "admin") {
            return res.status(404).json({ error: "Not Found" });
        } else {
            return res.status(500).json({ error: "???" });
        }

        //Generate ICS dynamically
        const ics = generateCalendar(
            eventsResult.rows.map(e => ({
                id: e.id,
                title: e.title,
                start: e.start_time,
                end: e.end_time
            }))
        );

        //Return calendar
        res.setHeader("Content-Type", "text/calendar; charset=utf-8");
        res.setHeader("Content-Disposition", "inline; filename=calendar.ics");

        res.send(ics);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
