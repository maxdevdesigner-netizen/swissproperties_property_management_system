import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { localPath } from "@/lib/safe-redirect";

describe("localPath", () => {
  it("keeps paths on this site, with their query and hash", () => {
    assert.equal(localPath("/"), "/");
    assert.equal(localPath("/tenants/abc?tab=leases#top"), "/tenants/abc?tab=leases#top");
  });

  it("rejects links to other sites", () => {
    for (const value of ["//evil.example", "/\\evil.example", "/\t/evil.example", "https://evil.example", "javascript:alert(1)", "evil.example"]) {
      assert.equal(localPath(value, "/fallback"), "/fallback", value);
    }
  });

  it("falls back when there's no value", () => {
    assert.equal(localPath(null), "/");
    assert.equal(localPath(undefined, "/workspace"), "/workspace");
    assert.equal(localPath(new File([], "x")), "/");
  });
});
