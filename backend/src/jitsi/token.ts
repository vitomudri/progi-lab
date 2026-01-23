import jwt from "jsonwebtoken";
import { loadPrivateKey } from "./keys.js";
import { randomUUID, type UUID } from "crypto";

export function generateJitsiToken(opts: {
  userId: UUID;
  name: string;
  email?: string | null;
  room: string;
  isModerator: boolean;
}) {
  const appId = process.env.JITSI_APP_ID;
  if (!appId) throw new Error("Missing env: JITSI_APP_ID");

  const now = Math.floor(Date.now() / 1000);

  return jwt.sign(
    {
      aud: "jitsi",
      iss: "chat",
      sub: appId,         // kod vpaas je to appId
      room: opts.room,    // može biti "*" ili konkretan room (bolje konkretan)
      nbf: now - 10,      // mali clock skew
      exp: now + 60 * 60, // 1h
      context: {
        user: {
          id: String(opts.userId),
          name: opts.name,
          email: opts.email ?? undefined,
          moderator: opts.isModerator
        }
      }
    },
    loadPrivateKey(),
    { algorithm: "RS256" }
  );
}
