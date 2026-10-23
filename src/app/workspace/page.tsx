import { Home } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { WORKSPACES } from "@/lib/workspace";
import { switchWorkspace } from "@/app/actions/workspace";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Brand } from "@/generated/prisma/enums";

async function workspaceStats(brand: Brand) {
  const [properties, units, occupied] = await Promise.all([
    db.property.count({ where: { brand } }),
    db.unit.count({ where: { property: { brand } } }),
    db.unit.count({ where: { property: { brand }, status: "OCCUPIED" } }),
  ]);
  return { properties, units, occupancy: units ? Math.round((occupied / units) * 100) : 0 };
}

export default async function WorkspacePage() {
  await requireUser();
  const brands = Object.keys(WORKSPACES) as Brand[];
  const stats = await Promise.all(brands.map(workspaceStats));

  return (
    <div className="min-h-screen">
      <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-6">
        <Logo />
        <ThemeToggle />
      </header>
      <main className="mx-auto max-w-4xl px-4 py-14 text-center">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase">One login, two portfolios</p>
        <h1 className="mt-3 text-3xl font-bold">Which workspace would you like to open?</h1>
        <p className="mx-auto mt-3 max-w-md text-muted">
          Pick a workspace to continue — everything inside will be scoped to it. You can switch anytime from the top bar.
        </p>
        <div className="mt-10 grid gap-6 text-left sm:grid-cols-2">
          {brands.map((brand, i) => (
            <form key={brand} action={switchWorkspace} className="flex flex-col rounded-2xl border border-border bg-surface p-6 shadow-sm">
              <input type="hidden" name="brand" value={brand} />
              <span className="flex size-10 items-center justify-center rounded-lg bg-warning-soft text-accent-strong">
                <Home className="size-5" />
              </span>
              <h2 className="mt-4 text-lg font-bold">{WORKSPACES[brand].name}</h2>
              <p className="mt-1 text-sm text-muted">{WORKSPACES[brand].tagline}</p>
              <dl className="mt-5 mb-6 flex gap-6 border-t border-border pt-4">
                {[
                  [stats[i].properties, "Properties"],
                  [stats[i].units, "Units"],
                  [`${stats[i].occupancy}%`, "Occupied"],
                ].map(([value, label]) => (
                  <div key={label as string}>
                    <dt className="text-xl font-bold">{value}</dt>
                    <dd className="text-[11px] tracking-wider text-muted uppercase">{label}</dd>
                  </div>
                ))}
              </dl>
              <button className="mt-auto rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Continue</button>
            </form>
          ))}
        </div>
      </main>
    </div>
  );
}
