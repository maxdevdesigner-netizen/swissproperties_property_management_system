"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { firstError, formObject, type ActionState } from "@/lib/forms";
import { Brand, PropertyType, UnitStatus, UnitType } from "@/generated/prisma/enums";

const propertySchema = z.object({
  name: z.string().min(1, "required"),
  type: z.enum(PropertyType),
  brand: z.enum(Brand),
  street: z.string().min(1, "required"),
  zip: z.string().min(1, "required"),
  city: z.string().min(1, "required"),
  emirate: z.string().min(1, "required"),
  country: z.string().default("United Arab Emirates"),
  description: z.string().optional(),
  images: z.string().optional(),
});

function parseProperty(formData: FormData) {
  const parsed = propertySchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) } as const;
  const { images, ...rest } = parsed.data;
  const imageList = (images ?? "")
    .split(/\s+/)
    .map((s) => s.trim())
    .filter((s) => /^(https:\/\/|\/)/.test(s));
  return { data: { ...rest, images: imageList } } as const;
}

export async function createProperty(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseProperty(formData);
  if ("error" in parsed) return { error: parsed.error };

  const property = await db.property.create({ data: parsed.data });
  await audit({ action: "CREATE", entity: "Property", entityId: property.id, userId: user.id, details: { name: property.name } });
  redirect(`/properties/${property.id}`);
}

export async function updateProperty(id: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseProperty(formData);
  if ("error" in parsed) return { error: parsed.error };

  await db.property.update({ where: { id }, data: parsed.data });
  await audit({ action: "UPDATE", entity: "Property", entityId: id, userId: user.id });
  revalidatePath(`/properties/${id}`);
  redirect(`/properties/${id}`);
}

export async function deleteProperty(id: string) {
  const user = await requireUser();
  const leases = await db.lease.count({ where: { unit: { propertyId: id } } });
  if (leases > 0) throw new Error("This property has leases. Terminate or delete them before deleting the property.");
  await db.property.delete({ where: { id } });
  await audit({ action: "DELETE", entity: "Property", entityId: id, userId: user.id });
  redirect("/properties");
}

const unitSchema = z.object({
  unitNumber: z.string().min(1, "required"),
  floor: z.coerce.number().int().optional(),
  type: z.enum(UnitType),
  sizeSqm: z.coerce.number().positive().optional(),
  rentAmount: z.coerce.number().nonnegative(),
  status: z.enum(UnitStatus).default("VACANT"),
  description: z.string().optional(),
  listingNotes: z.string().optional(),
  listingPrice: z.coerce.number().nonnegative().optional(),
});

export async function createUnit(propertyId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = unitSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const exists = await db.unit.findFirst({ where: { propertyId, unitNumber: parsed.data.unitNumber } });
  if (exists) return { error: `Unit ${parsed.data.unitNumber} already exists in this property.` };

  const unit = await db.unit.create({
    data: { ...parsed.data, propertyId, vacantSince: parsed.data.status === "VACANT" ? new Date() : null },
  });
  await audit({ action: "CREATE", entity: "Unit", entityId: unit.id, userId: user.id, details: { unitNumber: unit.unitNumber } });
  redirect(`/properties/${propertyId}`);
}

export async function updateUnit(id: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = unitSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const before = await db.unit.findUniqueOrThrow({ where: { id } });
  const becameVacant = before.status !== "VACANT" && parsed.data.status === "VACANT";
  const unit = await db.unit.update({
    where: { id },
    data: {
      ...parsed.data,
      vacantSince: becameVacant ? new Date() : parsed.data.status === "VACANT" ? before.vacantSince : null,
    },
  });
  await audit({ action: "UPDATE", entity: "Unit", entityId: id, userId: user.id });
  redirect(`/properties/${unit.propertyId}`);
}

export async function deleteUnit(id: string) {
  const user = await requireUser();
  const unit = await db.unit.findUniqueOrThrow({ where: { id }, include: { _count: { select: { leases: true } } } });
  if (unit._count.leases > 0) throw new Error("This unit has leases and can't be deleted.");
  await db.unit.delete({ where: { id } });
  await audit({ action: "DELETE", entity: "Unit", entityId: id, userId: user.id });
  redirect(`/properties/${unit.propertyId}`);
}
