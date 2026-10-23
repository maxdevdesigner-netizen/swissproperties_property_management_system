import "server-only";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { Brand } from "@/generated/prisma/enums";

export const WORKSPACE_COOKIE = "workspace";

export const WORKSPACES: Record<Brand, { name: string; tagline: string }> = {
  SWISS_PROPERTIES: {
    name: "Swiss Properties",
    tagline: "Long-term residential & commercial leasing portfolio.",
  },
  SWISS_HOMES: {
    name: "Swiss Homes",
    tagline: "Short-stay & holiday home portfolio.",
  },
};

export function isBrand(value: unknown): value is Brand {
  return typeof value === "string" && value in WORKSPACES;
}

/** The active workspace, or null when the user hasn't picked one yet. */
export async function getWorkspace(): Promise<Brand | null> {
  const value = (await cookies()).get(WORKSPACE_COOKIE)?.value;
  return isBrand(value) ? value : null;
}

/**
 * For pages: the active workspace, or a redirect to the picker. Pages must call this
 * themselves, since a layout's redirect doesn't stop its pages from rendering.
 */
export async function requireWorkspace(): Promise<Brand> {
  const brand = await getWorkspace();
  if (!brand) redirect("/workspace");
  return brand;
}

// The workspace a record belongs to. Leases and payments follow their unit's property, as the lists do.
const recordBrand = {
  tenant: (id: string) => db.tenant.findUnique({ where: { id }, select: { brand: true } }).then((r) => r?.brand),
  property: (id: string) => db.property.findUnique({ where: { id }, select: { brand: true } }).then((r) => r?.brand),
  unit: (id: string) =>
    db.unit.findUnique({ where: { id }, select: { property: { select: { brand: true } } } }).then((r) => r?.property.brand),
  lease: (id: string) =>
    db.lease
      .findUnique({ where: { id }, select: { unit: { select: { property: { select: { brand: true } } } } } })
      .then((r) => r?.unit.property.brand),
  payment: (id: string) =>
    db.payment
      .findUnique({ where: { id }, select: { lease: { select: { unit: { select: { property: { select: { brand: true } } } } } } } })
      .then((r) => r?.lease.unit.property.brand),
};

/**
 * For server actions that take a record id: a record outside the active workspace is
 * treated as not found, so nothing can be changed in the workspace you aren't in.
 */
export async function requireInWorkspace(kind: keyof typeof recordBrand, id: string): Promise<Brand> {
  const brand = await requireWorkspace();
  if ((await recordBrand[kind](id)) !== brand) notFound();
  return brand;
}
