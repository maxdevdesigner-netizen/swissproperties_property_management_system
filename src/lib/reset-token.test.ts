import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createResetToken, parseResetToken, verifyResetToken } from "@/lib/reset-token";

const secret = "test-secret";
const user = { id: "cmvl7w1zo0003ai7d1j3pgnl5", password: "$2b$12$hash-one" };
const now = Date.UTC(2026, 9, 23, 12);
const token = createResetToken(secret, user, now);
const parsed = parseResetToken(token)!;

describe("password reset tokens", () => {
  it("parse back to the user they were made for", () => {
    assert.equal(parsed.userId, user.id);
    assert.equal(parsed.expires, now + 60 * 60 * 1000);
  });

  it("are valid within the hour", () => {
    assert.equal(verifyResetToken(secret, parsed, user.password, now + 59 * 60 * 1000), true);
  });

  it("expire after an hour", () => {
    assert.equal(verifyResetToken(secret, parsed, user.password, now + 61 * 60 * 1000), false);
  });

  it("stop working once the password has changed", () => {
    assert.equal(verifyResetToken(secret, parsed, "$2b$12$hash-two", now), false);
  });

  it("can't be forged without the secret or by editing them", () => {
    assert.equal(verifyResetToken("other-secret", parsed, user.password, now), false);
    assert.equal(verifyResetToken(secret, { ...parsed, userId: "cotheruser000000000000000" }, user.password, now), false);
    assert.equal(verifyResetToken(secret, { ...parsed, expires: parsed.expires + 86_400_000 }, user.password, now), false);
  });

  it("reject malformed input", () => {
    for (const bad of [undefined, "", "abc", `${user.id}.${now}`, `${user.id}.123.${parsed.signature}`, `../x.${parsed.expires}.${parsed.signature}`]) {
      assert.equal(parseResetToken(bad), null, String(bad));
    }
  });
});
