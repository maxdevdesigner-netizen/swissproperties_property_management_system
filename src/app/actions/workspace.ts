"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { WORKSPACE_COOKIE, isBrand } from "@/lib/workspace";

export async function switchWorkspace(formData: FormData) {
  await requireUser();
  const brand = formData.get("brand");
  if (!isBrand(brand)) throw new Error("Unknown workspace");

  (await cookies()).set(WORKSPACE_COOKIE, brand, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  const next = formData.get("next");
  redirect(typeof next === "string" && next.startsWith("/") ? next : "/");
}
