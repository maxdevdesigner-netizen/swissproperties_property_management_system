type Numeric = number | string | { toString(): string } | null | undefined;

export function toNumber(value: Numeric): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value.toString());
}

const aed = new Intl.NumberFormat("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "AED 1,234.00", matching the live app. */
export function money(value: Numeric): string {
  const n = toNumber(value);
  return `${n < 0 ? "−" : ""}AED ${aed.format(Math.abs(n))}`;
}

/** "AED 66K" for KPI cards. */
export function moneyShort(value: Numeric): string {
  const n = toNumber(value);
  if (Math.abs(n) >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (Math.abs(n) >= 1_000) return `AED ${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `AED ${Math.round(n)}`;
}

/** dd/mm/yyyy, matching the live app. */
export function date(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function inputDate(value: Date | string | null | undefined): string {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export function monthLabel(d: Date): string {
  return d.toLocaleString("en-GB", { month: "long", year: "numeric" });
}

export function initials(first: string, last?: string | null): string {
  return `${first.trim()[0] ?? ""}${last?.trim()[0] ?? ""}`.toUpperCase();
}

export function humanize(value: string): string {
  const special: Record<string, string> = { ONE_BR: "1 BHK", TWO_BR: "2 BHK", THREE_BR: "3 BHK", FOUR_BR: "4 BHK" };
  if (special[value]) return special[value];
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}
