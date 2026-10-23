import { createHmac, randomBytes } from "node:crypto";

// Time-based one-time codes (RFC 6238), the 6-digit codes from Google Authenticator,
// Microsoft Authenticator, 1Password and similar apps.

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;

export function base32Encode(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text: string): Buffer {
  const clean = text.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of clean) {
    const index = ALPHABET.indexOf(char);
    if (index === -1) throw new Error("Invalid base32 secret");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** A new random secret (160 bits, as RFC 4226 recommends), base32 encoded for authenticator apps. */
export function generateSecret(): string {
  return base32Encode(randomBytes(20));
}

/** RFC 4226 HOTP code for one counter value. */
export function hotp(key: Buffer, counter: number, digits = 6): string {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const hash = createHmac("sha1", key).update(message).digest();
  const offset = hash[hash.length - 1] & 15;
  const number = hash.readUInt32BE(offset) & 0x7fffffff;
  return String(number % 10 ** digits).padStart(digits, "0");
}

export function totp(secret: string, time = Date.now()): string {
  return hotp(base32Decode(secret), Math.floor(time / 1000 / STEP_SECONDS));
}

/** Accepts the code for now or one step either side, to allow for clock drift and typing time. */
export function verifyTotp(secret: string, code: string, time = Date.now()): boolean {
  const clean = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  const key = base32Decode(secret);
  const step = Math.floor(time / 1000 / STEP_SECONDS);
  return [-1, 0, 1].some((d) => hotp(key, step + d) === clean);
}

/** The link an authenticator app reads from the setup QR code. */
export function otpauthUrl(secret: string, account: string, issuer = "Swiss Properties"): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?${new URLSearchParams({ secret, issuer, algorithm: "SHA1", digits: "6", period: String(STEP_SECONDS) })}`;
}
