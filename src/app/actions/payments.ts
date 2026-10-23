"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { requireInWorkspace, requireWorkspace } from "@/lib/workspace";
import { firstError, formObject, type ActionState } from "@/lib/forms";
import { toNumber } from "@/lib/format";
import { PaymentMethod } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

async function nextReceiptNumber(tx: Prisma.TransactionClient) {
  const year = new Date().getFullYear();
  const count = await tx.payment.count({ where: { receiptNumber: { startsWith: `RCPT-${year}-` } } });
  return `RCPT-${year}-${String(count + 1).padStart(5, "0")}`;
}

function refresh(leaseId?: string) {
  revalidatePath("/payments");
  revalidatePath("/");
  if (leaseId) revalidatePath(`/leases/${leaseId}`);
}

/** Records money received against a payment; full amount marks it PAID and issues a receipt. */
async function applyPayment(id: string, received: number, method: PaymentMethod, paidDate: Date, notes?: string) {
  return db.$transaction(async (tx) => {
    const p = await tx.payment.findUniqueOrThrow({ where: { id } });
    const amountPaid = Math.min(toNumber(p.amount), toNumber(p.amountPaid) + received);
    const full = amountPaid >= toNumber(p.amount);
    return tx.payment.update({
      where: { id },
      data: {
        amountPaid,
        status: full ? "PAID" : "PARTIAL",
        paidDate,
        method,
        notes: notes ?? p.notes,
        ...(full && !p.receiptNumber ? { receiptNumber: await nextReceiptNumber(tx), receiptGeneratedAt: new Date() } : {}),
      },
    });
  });
}

export async function markPaid(id: string) {
  const user = await requireUser();
  await requireInWorkspace("payment", id);
  const p = await db.payment.findUniqueOrThrow({ where: { id } });
  const updated = await applyPayment(id, toNumber(p.amount) - toNumber(p.amountPaid), "CASH", new Date());
  await audit({ action: "UPDATE", entity: "Payment", entityId: id, userId: user.id, details: { status: "PAID" } });
  refresh(updated.leaseId);
}

const recordSchema = z.object({
  amount: z.coerce.number().positive(),
  method: z.enum(PaymentMethod),
  paidDate: z.coerce.date(),
  notes: z.string().optional(),
});

export async function recordPayment(id: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  await requireInWorkspace("payment", id);
  const parsed = recordSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const v = parsed.data;

  const updated = await applyPayment(id, v.amount, v.method, v.paidDate, v.notes);
  await audit({ action: "UPDATE", entity: "Payment", entityId: id, userId: user.id, details: { status: updated.status, received: v.amount } });
  refresh(updated.leaseId);
  redirect(`/payments/${id}`);
}

const addSchema = z.object({
  amount: z.coerce.number().positive(),
  dueDate: z.coerce.date(),
  notes: z.string().optional(),
});

export async function addPayment(leaseId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  await requireInWorkspace("lease", leaseId);
  const parsed = addSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const payment = await db.payment.create({ data: { leaseId, ...parsed.data } });
  await audit({ action: "CREATE", entity: "Payment", entityId: payment.id, userId: user.id, details: { leaseId } });
  refresh(leaseId);
  redirect(`/leases/${leaseId}`);
}

export async function bulkMarkPaid(formData: FormData) {
  const user = await requireUser();
  const brand = await requireWorkspace();
  const ids = formData.getAll("ids").filter((v): v is string => typeof v === "string");
  let count = 0;
  for (const id of ids) {
    // Payments from the other workspace are skipped.
    const p = await db.payment.findFirst({ where: { id, lease: { unit: { property: { brand } } } } });
    if (!p || p.status === "PAID") continue;
    await applyPayment(id, toNumber(p.amount) - toNumber(p.amountPaid), "CASH", new Date());
    count++;
  }
  await audit({ action: "UPDATE", entity: "Payment", userId: user.id, details: { bulk: "PAID", count } });
  refresh();
}

export async function deletePayment(id: string) {
  const user = await requireUser();
  await requireInWorkspace("payment", id);
  const p = await db.payment.findUniqueOrThrow({ where: { id } });
  if (toNumber(p.amountPaid) > 0) throw new Error("Payments with money recorded against them can't be deleted.");
  await db.payment.delete({ where: { id } });
  await audit({ action: "DELETE", entity: "Payment", entityId: id, userId: user.id });
  refresh(p.leaseId);
  redirect(`/leases/${p.leaseId}`);
}
