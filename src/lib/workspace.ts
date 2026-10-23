import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
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
