import fs from "fs";
import { env } from "../env.js";

export function loadPrivateKey(): string {
    const p = env.JITSI_PRIVATE_KEY_PATH;
    if (!fs.existsSync(p)) throw new Error(`Private key file not found: ${p}`);
    return fs.readFileSync(p, "utf8");
}
