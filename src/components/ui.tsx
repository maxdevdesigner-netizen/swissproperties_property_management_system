import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl border border-border bg-surface p-5 shadow-sm", className)}>{children}</div>;
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "success" | "danger" | "warning" | "primary";
}) {
  const tones = {
    default: "text-text",
    success: "text-success",
    danger: "text-danger",
    warning: "text-warning",
    primary: "text-primary",
  };
  return (
    <Card>
      <p className="text-xs font-semibold tracking-wider text-muted uppercase">{label}</p>
      <p className={cn("mt-2 text-2xl font-bold", tones[tone])}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

const badgeTones: Record<string, string> = {
  ACTIVE: "bg-success-soft text-success",
  PAID: "bg-success-soft text-success",
  OCCUPIED: "bg-success-soft text-success",
  PENDING: "bg-warning-soft text-warning",
  PARTIAL: "bg-warning-soft text-warning",
  RESERVED: "bg-warning-soft text-warning",
  MAINTENANCE: "bg-warning-soft text-warning",
  OVERDUE: "bg-danger-soft text-danger",
  HIGH: "bg-danger-soft text-danger",
  TERMINATED: "bg-danger-soft text-danger",
  EXPIRED: "bg-surface-2 text-muted",
  VACANT: "bg-primary-soft text-primary",
  MEDIUM: "bg-warning-soft text-warning",
  LOW: "bg-surface-2 text-muted",
};

export function Badge({ value, label }: { value: string; label?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", badgeTones[value] ?? "bg-surface-2 text-muted")}>
      {label ?? value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ")}
    </span>
  );
}

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";
const buttonVariants = {
  accent: "bg-accent-strong text-white hover:bg-accent",
  primary: "bg-primary text-white hover:opacity-90",
  outline: "border border-border bg-surface text-text hover:bg-surface-2",
  danger: "border border-danger/30 bg-danger-soft text-danger hover:opacity-90",
  ghost: "text-muted hover:bg-surface-2 hover:text-text",
};
type Variant = keyof typeof buttonVariants;

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={cn(buttonBase, buttonVariants[variant], className)} {...props} />;
}

export function ButtonLink({ variant = "primary", className, ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cn(buttonBase, buttonVariants[variant], className)} {...props} />;
}

export function Field({ label, required, children, hint }: { label: string; required?: boolean; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Avatar({ text }: { text: string }) {
  return (
    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
      {text}
    </span>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{message}</p>;
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
      <table className="w-full text-sm">
        <thead className="bg-surface-2 text-left text-xs tracking-wider text-muted uppercase">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}
