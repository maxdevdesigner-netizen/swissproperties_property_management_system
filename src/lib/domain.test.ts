import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  addMonths,
  arrearsSummary,
  effectiveStatus,
  isExpiringSoon,
  leaseProgress,
  outstanding,
  riskLevel,
  scheduleDates,
} from "@/lib/domain";

// Local-time dates, the way the app builds them.
const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);
const today = day(2026, 6, 15);

describe("addMonths", () => {
  it("moves to the same day of a later month", () => {
    assert.deepEqual(addMonths(day(2026, 1, 10), 1), day(2026, 2, 10));
    assert.deepEqual(addMonths(day(2026, 11, 10), 3), day(2027, 2, 10));
  });

  it("clamps to the last day of shorter months", () => {
    assert.deepEqual(addMonths(day(2026, 1, 31), 1), day(2026, 2, 28));
    assert.deepEqual(addMonths(day(2028, 1, 31), 1), day(2028, 2, 29));
    assert.deepEqual(addMonths(day(2026, 3, 31), 1), day(2026, 4, 30));
  });

  it("doesn't drift when chained from the original start date", () => {
    const start = day(2026, 1, 31);
    assert.deepEqual(addMonths(start, 2), day(2026, 3, 31));
  });

  it("leaves the input untouched", () => {
    const start = day(2026, 1, 31);
    addMonths(start, 1);
    assert.deepEqual(start, day(2026, 1, 31));
  });
});

describe("scheduleDates", () => {
  it("gives an open-ended lease just its first installment", () => {
    assert.deepEqual(scheduleDates(day(2026, 1, 1), undefined), [day(2026, 1, 1)]);
  });

  it("gives a 12-month lease twelve monthly installments, excluding the end date", () => {
    const dates = scheduleDates(day(2026, 1, 1), day(2027, 1, 1));
    assert.equal(dates.length, 12);
    assert.deepEqual(dates[0], day(2026, 1, 1));
    assert.deepEqual(dates[11], day(2026, 12, 1));
  });

  it("keeps month-end leases on the month end", () => {
    const dates = scheduleDates(day(2026, 1, 31), day(2026, 5, 1));
    assert.deepEqual(dates, [day(2026, 1, 31), day(2026, 2, 28), day(2026, 3, 31), day(2026, 4, 30)]);
  });

  it("counts a partial last month as an installment", () => {
    assert.equal(scheduleDates(day(2026, 1, 1), day(2026, 3, 15)).length, 3);
  });

  it("caps very long leases at 120 installments", () => {
    assert.equal(scheduleDates(day(2026, 1, 1), day(2046, 1, 1)).length, 120);
  });
});

describe("effectiveStatus", () => {
  const payment = (status: "PENDING" | "PARTIAL" | "PAID" | "OVERDUE", due: Date) => ({ status, dueDate: due, amount: 100, amountPaid: 0 });

  it("treats anything unpaid past its due date as overdue", () => {
    assert.equal(effectiveStatus(payment("PENDING", day(2026, 6, 14)), today), "OVERDUE");
    assert.equal(effectiveStatus(payment("PARTIAL", day(2026, 6, 1)), today), "OVERDUE");
  });

  it("keeps the stored status on or before the due date", () => {
    assert.equal(effectiveStatus(payment("PENDING", today), today), "PENDING");
    assert.equal(effectiveStatus(payment("PARTIAL", day(2026, 7, 1)), today), "PARTIAL");
  });

  it("never marks a paid payment overdue", () => {
    assert.equal(effectiveStatus(payment("PAID", day(2025, 1, 1)), today), "PAID");
  });
});

describe("outstanding", () => {
  it("is what's left to pay, never negative", () => {
    assert.equal(outstanding({ status: "PARTIAL", dueDate: today, amount: "1800.00", amountPaid: "500.00" }), 1300);
    assert.equal(outstanding({ status: "PAID", dueDate: today, amount: 100, amountPaid: 120 }), 0);
  });
});

describe("arrearsSummary", () => {
  const tenant = (id: string) => ({ id, firstName: `First${id}`, lastName: `Last${id}` });
  const payment = (tenantId: string, due: Date, amount: number, amountPaid = 0, status: "PENDING" | "PARTIAL" | "PAID" = "PENDING") => ({
    status,
    dueDate: due,
    amount,
    amountPaid,
    lease: { tenant: tenant(tenantId) },
  });

  const summary = arrearsSummary(
    [
      payment("a", day(2026, 6, 5), 1000), // 10 days late
      payment("a", day(2026, 4, 1), 1000, 400, "PARTIAL"), // 75 days late, 600 owed
      payment("b", day(2026, 5, 1), 2000), // 45 days late
      payment("b", day(2026, 1, 1), 500, 500, "PAID"), // paid, ignored
      payment("c", day(2026, 7, 1), 3000), // not due yet, ignored
    ],
    today,
  );

  it("totals only overdue, unpaid amounts", () => {
    assert.equal(summary.totalOutstanding, 3600);
    assert.equal(summary.totalCount, 3);
  });

  it("sorts payments into aging buckets", () => {
    const byKey = Object.fromEntries(summary.buckets.map((b) => [b.key, b.amount]));
    assert.deepEqual(byKey, { current: 0, "1-30": 1000, "31-60": 2000, "61-90": 600, "90+": 0 });
  });

  it("groups by tenant, largest debt first", () => {
    assert.deepEqual(
      summary.tenants.map((t) => [t.tenantId, t.amount, t.count, t.oldestDaysOverdue]),
      [
        ["b", 2000, 1, 45],
        ["a", 1600, 2, 75],
      ],
    );
    assert.equal(summary.tenants[0].tenantName, "Firstb Lastb");
  });
});

describe("riskLevel", () => {
  const row = (count: number, oldestDaysOverdue: number) => ({ tenantId: "t", tenantName: "T", amount: 1, count, oldestDaysOverdue });

  it("is high for three or more missed payments or anything 60+ days late", () => {
    assert.equal(riskLevel(row(3, 5)), "HIGH");
    assert.equal(riskLevel(row(1, 61)), "HIGH");
  });

  it("is medium for two missed payments or 31-60 days late", () => {
    assert.equal(riskLevel(row(2, 5)), "MEDIUM");
    assert.equal(riskLevel(row(1, 31)), "MEDIUM");
  });

  it("is low otherwise", () => {
    assert.equal(riskLevel(row(1, 30)), "LOW");
  });
});

describe("leaseProgress", () => {
  it("is null for open-ended leases", () => {
    assert.equal(leaseProgress(day(2026, 1, 1), null, today), null);
  });

  it("is the share of the term elapsed, clamped to 0-100", () => {
    assert.equal(leaseProgress(day(2026, 1, 1), day(2026, 1, 11), day(2026, 1, 6)), 50);
    assert.equal(leaseProgress(day(2026, 1, 1), day(2026, 2, 1), day(2025, 1, 1)), 0);
    assert.equal(leaseProgress(day(2026, 1, 1), day(2026, 2, 1), day(2027, 1, 1)), 100);
  });
});

describe("isExpiringSoon", () => {
  it("flags active leases ending within the window", () => {
    assert.equal(isExpiringSoon({ status: "ACTIVE", endDate: day(2026, 7, 10) }, 30, today), true);
    assert.equal(isExpiringSoon({ status: "ACTIVE", endDate: today }, 30, today), true);
  });

  it("ignores leases ending later, already ended, open-ended or not active", () => {
    assert.equal(isExpiringSoon({ status: "ACTIVE", endDate: day(2026, 8, 30) }, 30, today), false);
    assert.equal(isExpiringSoon({ status: "ACTIVE", endDate: day(2026, 6, 1) }, 30, today), false);
    assert.equal(isExpiringSoon({ status: "ACTIVE", endDate: null }, 30, today), false);
    assert.equal(isExpiringSoon({ status: "TERMINATED", endDate: day(2026, 7, 1) }, 30, today), false);
  });
});
