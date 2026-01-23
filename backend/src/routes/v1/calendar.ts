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

    //Basic validation
    if (typeof calendar_key !== "string") {
        return res.status(404).send("Not found");
    }

    //Validate user + calendar key
    let role;
    let user;
    try {
        const user_id_converted: UUID = z.uuidv4().parse(user_id) as UUID;
        user = await User.from_db({ user_id: user_id_converted });
            
        if (user) {
            role = user.role;
        } else {
            return res.status(400).json({ error: "Invalid user ID" });
        }
    } catch(err) {
        return res.status(400).json({ error: "Invalid user ID" });
    }

    if(user.calendar_key !== calendar_key) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        //Load user's events
        let eventsResult;

        if (role === "student") {
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
                AND r.status = 'potvrđeno'
                ORDER BY lw.date_time
                `,
                [user_id]
            );
        } else if (role === "instructor") {
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
        } else if (role === "admin") {
            return res.status(403).json({ error: "Admins do not have calendars" });
        } else {
            return res.status(500).json({ error: "Unknown user role" });
        }

        if (!eventsResult) {
            return res.status(500).json({ error: "Failed to load events" });
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
        return res.status(500).json({ error: "Failed to generate calendar" });
    }

    
});

export default router;
