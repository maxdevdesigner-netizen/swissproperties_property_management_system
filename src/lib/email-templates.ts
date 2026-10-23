import { date, money } from "@/lib/format";

export function passwordResetEmail(name: string | null, link: string) {
  return {
    subject: "Reset your Swiss Properties password",
    text: [
      `Hello${name ? ` ${name}` : ""},`,
      "",
      "Someone asked to reset the password for your Swiss Properties account. To choose a new password, open this link within the next hour:",
      "",
      link,
      "",
      "If you didn't ask for this, you can ignore this email. Your password stays the same.",
    ].join("\n"),
  };
}

export type ReminderItem = { unitNumber: string; propertyName: string; dueDate: Date; amount: number; outstanding: number };

export function paymentReminderEmail(tenantName: string, workspaceName: string, items: ReminderItem[]) {
  const total = items.reduce((s, i) => s + i.outstanding, 0);
  return {
    subject: `Payment reminder from ${workspaceName}`,
    text: [
      `Dear ${tenantName},`,
      "",
      `Our records show the following rent ${items.length === 1 ? "payment is" : "payments are"} overdue:`,
      "",
      ...items.map(
        (i) =>
          `  - Unit ${i.unitNumber}, ${i.propertyName}: ${money(i.amount)} due ${date(i.dueDate)}` +
          (i.outstanding < i.amount ? ` (${money(i.outstanding)} still to pay)` : ""),
      ),
      "",
      `Total outstanding: ${money(total)}`,
      "",
      "If you have already paid, please reply with your payment receipt and we'll update our records. Otherwise, please settle the amount as soon as possible.",
      "",
      "Kind regards,",
      workspaceName,
    ].join("\n"),
  };
}
