"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { firstError, formObject, type ActionState } from "@/lib/forms";
import { addMonths, scheduleDates } from "@/lib/domain";
import { toNumber } from "@/lib/format";

const leaseSchema = z
  .object({
    tenantId: z.string().min(1, "required"),
    unitId: z.string().min(1, "required"),
    basis: z.enum(["monthly", "yearly"]),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    rentAmount: z.coerce.number().positive(),
    depositAmount: z.coerce.number().nonnegative().optional(),
    vatRate: z.coerce.number().min(0).max(1).default(0),
    depositPaid: z.literal("on").optional(),
  })
  .refine((v) => !v.endDate || v.endDate > v.startDate, { message: "End date must be after start date", path: ["endDate"] });

/** Whether the unit is let under any active lease other than `leaseId`. A unit has one tenant at a time. */
async function unitTaken(unitId: string, leaseId?: string) {
  const count = await db.lease.count({ where: { unitId, status: "ACTIVE", ...(leaseId ? { id: { not: leaseId } } : {}) } });
  return count > 0;
}

export async function createLease(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = leaseSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const v = parsed.data;

  const endDate = v.basis === "yearly" && !v.endDate ? addMonths(v.startDate, 12) : v.endDate;
  const unit = await db.unit.findUnique({ where: { id: v.unitId } });
  if (!unit) return { error: "Unit not found" };
  if (await unitTaken(v.unitId)) return { error: "That unit already has an active lease." };

  const installment = v.rentAmount * (1 + v.vatRate);
  const lease = await db.$transaction(async (tx) => {
    const lease = await tx.lease.create({
      data: {
        tenantId: v.tenantId,
        unitId: v.unitId,
        startDate: v.startDate,
        endDate: endDate ?? null,
        rentAmount: v.rentAmount,
        depositAmount: v.depositAmount ?? null,
        depositPaid: v.depositPaid === "on",
        vatRate: v.vatRate,
        installmentsPerYear: 12,
      },
    });
    await tx.payment.createMany({
      data: scheduleDates(v.startDate, endDate).map((dueDate) => ({ leaseId: lease.id, amount: installment, dueDate })),
    });
    await tx.unit.update({ where: { id: v.unitId }, data: { status: "OCCUPIED", vacantSince: null } });
    return lease;
  });

  await audit({ action: "CREATE", entity: "Lease", entityId: lease.id, userId: user.id });
  redirect(`/leases/${lease.id}`);
}

const termsSchema = z.object({
  endDate: z.coerce.date().optional(),
  rentAmount: z.coerce.number().positive(),
  depositAmount: z.coerce.number().nonnegative().optional(),
  vatRate: z.coerce.number().min(0).max(1),
  lateFeeGraceDays: z.coerce.number().int().min(0),
  lateFeePercent: z.coerce.number().min(0).max(100).optional(),
  agentName: z.string().optional(),
  agentContact: z.string().optional(),
  commissionRate: z.coerce.number().min(0).max(100).optional(),
  commissionAmount: z.coerce.number().nonnegative().optional(),
  depositPaid: z.literal("on").optional(),
  commissionPaid: z.literal("on").optional(),
});

export async function updateLeaseTerms(id: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = termsSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const v = parsed.data;

  const before = await db.lease.findUniqueOrThrow({ where: { id } });
  const commissionPaid = v.commissionPaid === "on";
  await db.lease.update({
    where: { id },
    data: {
      endDate: v.endDate ?? null,
      rentAmount: v.rentAmount,
      depositAmount: v.depositAmount ?? null,
      vatRate: v.vatRate,
      lateFeeGraceDays: v.lateFeeGraceDays,
      lateFeePercent: v.lateFeePercent ?? null,
      agentName: v.agentName ?? null,
      agentContact: v.agentContact ?? null,
      commissionRate: v.commissionRate ?? null,
      commissionAmount: v.commissionAmount ?? null,
      depositPaid: v.depositPaid === "on",
      commissionPaid,
      commissionPaidDate: commissionPaid ? (before.commissionPaidDate ?? new Date()) : null,
    },
  });
  await audit({ action: "UPDATE", entity: "Lease", entityId: id, userId: user.id });
  revalidatePath(`/leases/${id}`);
  redirect(`/leases/${id}`);
}

export async function setLeaseStatus(id: string, status: "ACTIVE" | "EXPIRED" | "TERMINATED") {
  const user = await requireUser();
  const lease = await db.lease.findUniqueOrThrow({ where: { id } });
  if (status === "ACTIVE" && (await unitTaken(lease.unitId, id))) {
    throw new Error("The unit has been let under another active lease. End that lease before reactivating this one.");
  }

  await db.$transaction(async (tx) => {
    await tx.lease.update({ where: { id }, data: { status } });
    if (status !== "ACTIVE") {
      // Unpaid future installments no longer apply once the lease ends.
      await tx.payment.deleteMany({ where: { leaseId: id, status: { in: ["PENDING"] }, amountPaid: 0, dueDate: { gt: new Date() } } });
      await tx.unit.update({ where: { id: lease.unitId }, data: { status: "VACANT", vacantSince: new Date() } });
    } else {
      await tx.unit.update({ where: { id: lease.unitId }, data: { status: "OCCUPIED", vacantSince: null } });
    }
  });
  await audit({ action: "UPDATE", entity: "Lease", entityId: id, userId: user.id, details: { status } });
  revalidatePath(`/leases/${id}`);
}

export async function generateNextPayment(id: string) {
  const user = await requireUser();
  const lease = await db.lease.findUniqueOrThrow({
    where: { id },
    include: { payments: { orderBy: { dueDate: "desc" }, take: 1 } },
  });
  const last = lease.payments[0];
  const dueDate = last ? addMonths(last.dueDate, 1) : lease.startDate;
  if (lease.endDate && dueDate >= lease.endDate) throw new Error("The next installment would fall after the lease end date.");

  const amount = toNumber(lease.rentAmount) * (1 + toNumber(lease.vatRate));
  const payment = await db.payment.create({ data: { leaseId: id, amount, dueDate } });
  await audit({ action: "CREATE", entity: "Payment", entityId: payment.id, userId: user.id, details: { leaseId: id } });
  revalidatePath(`/leases/${id}`);
}

const renewSchema = z.object({ months: z.coerce.number().int().min(1).max(60), rentAmount: z.coerce.number().positive() });

export async function renewLease(id: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = renewSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const lease = await db.lease.findUniqueOrThrow({ where: { id } });
  if (await unitTaken(lease.unitId, id)) {
    return { error: "The unit has been let under another active lease, so this one can't be renewed." };
  }
  const from = lease.endDate ?? new Date();
  const newEnd = addMonths(from, parsed.data.months);
  const amount = parsed.data.rentAmount * (1 + toNumber(lease.vatRate));

  await db.$transaction(async (tx) => {
    await tx.lease.update({ where: { id }, data: { endDate: newEnd, rentAmount: parsed.data.rentAmount, status: "ACTIVE" } });
    await tx.payment.createMany({
      data: Array.from({ length: parsed.data.months }, (_, i) => ({ leaseId: id, amount, dueDate: addMonths(from, i) })),
    });
    await tx.unit.update({ where: { id: lease.unitId }, data: { status: "OCCUPIED", vacantSince: null } });
  });
  await audit({ action: "UPDATE", entity: "Lease", entityId: id, userId: user.id, details: { renewedMonths: parsed.data.months } });
  revalidatePath(`/leases/${id}`);
  redirect(`/leases/${id}`);
}

export async function deleteLease(id: string) {
  const user = await requireUser();
  const lease = await db.lease.findUniqueOrThrow({ where: { id }, include: { payments: { where: { amountPaid: { gt: 0 } }, take: 1 } } });
  if (lease.payments.length) throw new Error("This lease has recorded payments. Terminate it instead of deleting.");

  await db.$transaction(async (tx) => {
    await tx.lease.delete({ where: { id } });
    if (lease.status === "ACTIVE") await tx.unit.update({ where: { id: lease.unitId }, data: { status: "VACANT", vacantSince: new Date() } });
  });
  await audit({ action: "DELETE", entity: "Lease", entityId: id, userId: user.id });
  redirect("/leases");
}
