import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { dataDir } from "./db";

// Mailbox tokens are encrypted at rest with AES-256-GCM. The key comes from LINCOLN_SECRET, or is
// generated once and kept on the data disk, never in the repository.

let key: Buffer | null = null;
function getKey() {
  if (key) return key;
  const env = process.env.LINCOLN_SECRET;
  if (env) return (key = crypto.createHash("sha256").update(env).digest());
  const file = path.join(dataDir(), "secret.key");
  if (!fs.existsSync(file)) {
    fs.mkdirSync(dataDir(), { recursive: true });
    fs.writeFileSync(file, crypto.randomBytes(32).toString("hex"), { mode: 0o600 });
  }
  return (key = Buffer.from(fs.readFileSync(file, "utf8").trim(), "hex"));
}

export function seal(text: string) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const body = Buffer.concat([c.update(text, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), body].map((b) => b.toString("base64url")).join(".");
}

export function open(sealed: string) {
  const [iv, tag, body] = sealed.split(".").map((p) => Buffer.from(p, "base64url"));
  const d = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(body), d.final()]).toString("utf8");
}

/** HMAC for OAuth state values. */
export const sign = (v: string) => crypto.createHmac("sha256", getKey()).update(v).digest("base64url");
