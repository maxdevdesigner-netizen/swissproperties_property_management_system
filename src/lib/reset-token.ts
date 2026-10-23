import { createHmac, timingSafeEqual } from "node:crypto";

// Password-reset links carry a signed token instead of a database row. The signature covers the
// user's current password hash, so a link stops working once it has been used (or the password
// changes another way), and it expires after an hour.
const TTL_MS = 60 * 60 * 1000;

function sign(secret: string, userId: string, expires: number, passwordHash: string) {
  return createHmac("sha256", secret).update(`password-reset:${userId}:${expires}:${passwordHash}`).digest("base64url");
}

export function createResetToken(secret: string, user: { id: string; password: string }, now = Date.now()): string {
  const expires = now + TTL_MS;
  return `${user.id}.${expires}.${sign(secret, user.id, expires, user.password)}`;
}

/** The parts of a well-formed token. Load the user by `userId`, then check it with `verifyResetToken`. */
export function parseResetToken(token: unknown): { userId: string; expires: number; signature: string } | null {
  if (typeof token !== "string") return null;
  const match = /^([a-z0-9]+)\.(\d{13})\.([\w-]{43})$/.exec(token);
  return match ? { userId: match[1], expires: Number(match[2]), signature: match[3] } : null;
}

export function verifyResetToken(
  secret: string,
  token: { userId: string; expires: number; signature: string },
  passwordHash: string,
  now = Date.now(),
): boolean {
  if (token.expires < now) return false;
  const expected = Buffer.from(sign(secret, token.userId, token.expires, passwordHash));
  const given = Buffer.from(token.signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
