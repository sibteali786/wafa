import { createHash, randomBytes } from "node:crypto";

export function generateInviteToken() {
  return randomBytes(24).toString("base64url");
}

export function hashInviteToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

