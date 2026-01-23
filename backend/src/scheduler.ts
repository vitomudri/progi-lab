import type { UUID } from "crypto";
import { pool } from "./db/db.js";
import { EmailBuilder } from "./email/email.js";
import { User } from "./models/User.js";
import webpush, { WebPushError } from "web-push";
import { env } from "./env.js";

let processed: Set<{workshop_id: UUID, user_id: UUID, threshold: string}> = new Set();

export default function init_scheduler() {
    webpush.setVapidDetails(
        'https://kuhari.app/',
        env.VAPID_PUBLIC_KEY,
        env.VAPID_PRIVATE_KEY
    );

    const checkUpcomingWorkshops = async () => {
        try {
            const result = await pool.query(`
                SELECT
                    lw.workshop_id,
                    lw.title,
                    lw.description,
                    lw.date_time,
                    u.user_id
                FROM LiveWorkshops lw
                JOIN Reservations r ON lw.workshop_id = r.workshop_id
                JOIN Users u ON r.user_id = u.user_id
                WHERE lw.date_time IS NOT NULL
                AND r.status = 'confirmed'
                AND lw.date_time > NOW()
                AND lw.date_time <= NOW() + INTERVAL '24 hours'
                ORDER BY lw.date_time ASC
            `);

            for (const row of result.rows) {
                const timeUntilWorkshop = new Date(row.date_time).getTime() - Date.now();
                const minutesUntil = Math.round(timeUntilWorkshop / (1000 * 60));

                const thresholds = [
                    { minutes: 24 * 60, label: "24 hours" },
                    { minutes: 60, label: "1 hour" },
                    { minutes: 10, label: "10 minutes" }
                ];

                for (const threshold of thresholds) {
                    const this_event = { workshop_id: row.workshop_id, user_id: row.user_id, threshold: threshold.label }
                    if (Math.abs(minutesUntil - threshold.minutes) <= 5 && !processed.has(this_event)) {
                        const user = (await User.from_db({ user_id: row.user_id }))!;

                        await new EmailBuilder()
                            .add_recipient(user)
                            .with_subject(`Reminder: Upcoming Workshop "${row.title}" in ${threshold.label}`)
                            .with_html_body(`<p>This is a reminder that you have an upcoming workshop "<strong>${row.title}</strong>" scheduled for <strong>${new Date(row.date_time).toISOString()}</strong>.</p>`)
                            .build_and_send();

                        try {
                            const res = await pool.query(
                                `SELECT subscription_id, endpoint, p256dh, auth FROM PushSubscriptions WHERE user_id = $1`,
                                [row.user_id]
                            );

                            const subscriptions = res.rows;

                            for (const subscription of subscriptions) {
                                const subscription_obj = {
                                    endpoint: subscription.endpoint,
                                    keys: {
                                        p256dh: subscription.p256dh,
                                        auth: subscription.auth
                                    }
                                };

                                try {
                                    await webpush.sendNotification(
                                        subscription_obj,
                                        JSON.stringify({
                                            title: "Reminder: Upcoming Workshop",
                                            body: `Your workshop "${row.title}" starts in ${threshold.label}`,
                                            tag: `workshop-${row.workshop_id}`,
                                            data: {
                                                workshop_id: row.workshop_id,
                                                title: row.title
                                            }
                                        })
                                    );
                                } catch (error: WebPushError | any) {
                                    if (error instanceof WebPushError && error.statusCode === 410) {
                                        await pool.query(
                                            `DELETE FROM PushSubscriptions WHERE subscription_id = $1`,
                                            [subscription.subscription_id]
                                        );
                                    } else {
                                        console.error(error);
                                    }
                                }
                            }
                        } catch (error) {
                            console.error(error);
                        }

                        processed.add(this_event);
                    }
                }
            }
        } catch (error) {
            console.error(error);
        }
    };
    setInterval(checkUpcomingWorkshops, 120 * 1000);
    checkUpcomingWorkshops();
}


