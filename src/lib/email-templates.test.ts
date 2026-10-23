import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { passwordResetEmail, paymentReminderEmail } from "@/lib/email-templates";

describe("paymentReminderEmail", () => {
  const items = [
    { unitNumber: "101", propertyName: "Al Hamidiya Residences", dueDate: new Date(2026, 8, 1), amount: 1800, outstanding: 1800 },
    { unitNumber: "101", propertyName: "Al Hamidiya Residences", dueDate: new Date(2026, 9, 1), amount: 1800, outstanding: 600 },
  ];
  const email = paymentReminderEmail("Ahmed Al Mansoori", "Swiss Homes", items);

  it("is signed by the tenant's workspace", () => {
    assert.equal(email.subject, "Payment reminder from Swiss Homes");
    assert.match(email.text, /Kind regards,\nSwiss Homes$/);
  });

  it("lists each overdue payment, noting part-payments, and the total", () => {
    assert.match(email.text, /^Dear Ahmed Al Mansoori,/);
    assert.match(email.text, /payments are overdue/);
    assert.match(email.text, /Unit 101, Al Hamidiya Residences: AED 1,800\.00 due 01\/09\/2026\n/);
    assert.match(email.text, /due 01\/10\/2026 \(AED 600\.00 still to pay\)/);
    assert.match(email.text, /Total outstanding: AED 2,400\.00/);
  });

  it("uses the singular for one payment", () => {
    assert.match(paymentReminderEmail("A B", "Swiss Properties", items.slice(0, 1)).text, /payment is overdue/);
  });
});

describe("passwordResetEmail", () => {
  it("contains the link and greets by name when known", () => {
    const email = passwordResetEmail("Max", "https://example.test/reset-password?token=abc");
    assert.match(email.text, /^Hello Max,/);
    assert.match(email.text, /\nhttps:\/\/example\.test\/reset-password\?token=abc\n/);
    assert.match(passwordResetEmail(null, "x").text, /^Hello,/);
  });
});
