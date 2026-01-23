// src/routes/live.ts
import { Router } from "express";
import { maybe_auth, require_auth, require_user_roles } from "../../middleware/auth.js";
import { generateJitsiToken } from "../../jitsi/token.js";
import { env } from "../../env.js";

const router = Router();

/**
 * JOIN LIVE SESSION
 * - mora biti logged in
 * - mora biti student ili instruktor
 * - token se generira tek ovdje
 */
router.get("/:lessonId/join", require_auth, async (req, res) => {
  const user = req.context.user!;
  const lessonId = Number(req.params.lessonId);

  // TODO: ovdje kasnije možeš:
  // - provjeriti da lesson postoji
  // - da je user upisan u course
  // - da je termin aktivan

  const room = `cc-lesson-${lessonId}`;

  const token = generateJitsiToken({
    userId: user.user_id,
    name: user.first_name ?? user.email,
    email: user.email,
    room,
    isModerator: user.role === "instructor"
  });

  res.json({
    room,
    jwt: token,
    appId: env.JITSI_APP_ID,
    domain: env.JITSI_DOMAIN
  });
});

export default router;
