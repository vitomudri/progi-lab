import { Router } from "express";
import { env } from "../../env.js";
import { pool } from "../../db/db.js";
import { require_auth } from "../../middleware/auth.js";

const notifications_router = Router();

notifications_router.get("/public-key", async (req, res) => {
    res.json({ vapid_public_key: env.VAPID_PUBLIC_KEY });
});

interface PushSubscriptionData {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}

notifications_router.post("/subscribe", require_auth, async (req, res) => {
    const user = req.context.user!;
    try {
        const { endpoint, keys } = req.body as PushSubscriptionData;

        if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
            return res.status(400).json({ error: "Bad Request" });
        }

        const result = await pool.query(
            `INSERT INTO PushSubscriptions (user_id, endpoint, p256dh, auth)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, endpoint)
             DO UPDATE SET updated_at = CURRENT_TIMESTAMP
             RETURNING subscription_id`,
            [user.user_id, endpoint, keys.p256dh, keys.auth]
        );

        res.json({
            success: true,
            subscription_id: result.rows[0].subscription_id
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

notifications_router.post("/unsubscribe", require_auth, async (req, res) => {
    const user = req.context.user!;
    try {
        const { endpoint } = req.body as { endpoint: string };

        if (!endpoint) {
            return res.status(400).json({ error: "Bad Request" });
        }

        await pool.query(
            `DELETE FROM PushSubscriptions
             WHERE user_id = $1 AND endpoint = $2`,
            [user.user_id, endpoint]
        );

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default notifications_router;
