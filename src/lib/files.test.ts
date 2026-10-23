import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { fileUrl, inlineContentType, isSafeFileName } from "@/lib/files";

describe("isSafeFileName", () => {
  it("accepts plain file names", () => {
    for (const name of ["photo.jpg", "Emirates ID - Ahmed (1).pdf", "1729-abc_DEF.png"]) assert.equal(isSafeFileName(name), true, name);
  });

  it("rejects folders, parent references, hidden files and empty names", () => {
    for (const name of ["", "..", ".env", "../secret.pdf", "a/b.jpg", "a\\b.jpg", "x\0.jpg", "a".repeat(256)]) {
      assert.equal(isSafeFileName(name), false, name);
    }
  });
});

describe("inlineContentType", () => {
  it("shows pictures and PDFs inline, case-insensitively", () => {
    assert.equal(inlineContentType("a.JPG"), "image/jpeg");
    assert.equal(inlineContentType("scan.pdf"), "application/pdf");
  });

  it("downloads anything else, including SVG", () => {
    assert.equal(inlineContentType("logo.svg"), null);
    assert.equal(inlineContentType("page.html"), null);
    assert.equal(inlineContentType("noextension"), null);
  });
});

describe("fileUrl", () => {
  it("keeps stored URLs and paths as they are", () => {
    assert.equal(fileUrl("/api/documents/serve/a.jpg"), "/api/documents/serve/a.jpg");
    assert.equal(fileUrl("https://cdn.example/a.jpg"), "https://cdn.example/a.jpg");
  });

  it("serves bare file names through the documents route", () => {
    assert.equal(fileUrl("ID copy.pdf"), "/api/documents/serve/ID%20copy.pdf");
  });
});
