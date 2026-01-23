import fs from "fs";

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export function loadPrivateKey(): string {
  const p = mustEnv("JITSI_PRIVATE_KEY_PATH");
  if (!fs.existsSync(p)) throw new Error(`Private key file not found: ${p}`);
  return fs.readFileSync(p, "utf8");
}
