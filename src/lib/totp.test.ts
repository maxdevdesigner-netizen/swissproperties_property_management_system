import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { base32Decode, base32Encode, generateSecret, hotp, otpauthUrl, totp, verifyTotp } from "@/lib/totp";

const rfcKey = Buffer.from("12345678901234567890");

describe("base32", () => {
  it("round-trips and matches the RFC 4648 examples", () => {
    assert.equal(base32Encode(Buffer.from("foobar")), "MZXW6YTBOI");
    assert.equal(base32Decode("MZXW6YTBOI").toString(), "foobar");
    assert.equal(base32Decode("mzxw 6ytb oi======").toString(), "foobar");
    assert.deepEqual(base32Decode(base32Encode(rfcKey)), rfcKey);
  });

  it("rejects characters outside the alphabet", () => {
    assert.throws(() => base32Decode("MZXW1"));
  });

  it("generates 32-character secrets", () => {
    const secret = generateSecret();
    assert.match(secret, /^[A-Z2-7]{32}$/);
    assert.notEqual(secret, generateSecret());
  });
});

describe("hotp", () => {
  it("matches the RFC 4226 test values", () => {
    const expected = ["755224", "287082", "359152", "969429", "338314", "254676", "287922", "162583", "399871", "520489"];
    expected.forEach((code, counter) => assert.equal(hotp(rfcKey, counter), code));
  });

  it("matches the RFC 6238 SHA-1 test values (8 digits)", () => {
    const vectors: [number, string][] = [
      [59, "94287082"],
      [1111111109, "07081804"],
      [1111111111, "14050471"],
      [1234567890, "89005924"],
      [2000000000, "69279037"],
      [20000000000, "65353130"],
    ];
    for (const [seconds, code] of vectors) assert.equal(hotp(rfcKey, Math.floor(seconds / 30), 8), code);
  });
});

describe("verifyTotp", () => {
  const secret = base32Encode(rfcKey);
  const now = 1_700_000_000_000;

  it("accepts the current code and the ones either side", () => {
    assert.equal(verifyTotp(secret, totp(secret, now), now), true);
    assert.equal(verifyTotp(secret, totp(secret, now - 30_000), now), true);
    assert.equal(verifyTotp(secret, totp(secret, now + 30_000), now), true);
  });

  it("rejects older codes, wrong codes and junk", () => {
    assert.equal(verifyTotp(secret, totp(secret, now - 90_000), now), false);
    const wrong = String((Number(totp(secret, now)) + 1) % 1_000_000).padStart(6, "0");
    assert.equal(verifyTotp(secret, wrong, now), false);
    for (const junk of ["", "12345", "1234567", "abcdef"]) assert.equal(verifyTotp(secret, junk, now), false);
  });

  it("ignores spaces in the typed code", () => {
    const code = totp(secret, now);
    assert.equal(verifyTotp(secret, `${code.slice(0, 3)} ${code.slice(3)}`, now), true);
  });
});

describe("otpauthUrl", () => {
  it("names the issuer and account for the authenticator app", () => {
    assert.equal(
      otpauthUrl("JBSWY3DPEHPK3PXP", "admin@example.test"),
      "otpauth://totp/Swiss%20Properties%3Aadmin%40example.test?secret=JBSWY3DPEHPK3PXP&issuer=Swiss+Properties&algorithm=SHA1&digits=6&period=30",
    );
  });
});
