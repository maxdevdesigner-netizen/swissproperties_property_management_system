import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace";
import { OtherWorkspace } from "@/components/other-workspace";
import { Logo } from "@/components/logo";
import { PrintButton } from "@/components/print-button";
import { date, humanize, money } from "@/lib/format";

export default async function ReceiptPage({ params }: PageProps<"/billing/receipts/[id]">) {
  await requireUser();
  const brand = await requireWorkspace();
  const { id } = await params;
  const p = await db.payment.findUnique({
    where: { id },
    include: {
      lease: {
        select: {
          tenant: { select: { firstName: true, lastName: true } },
          unit: { select: { unitNumber: true, property: { select: { name: true, street: true, city: true, brand: true } } } },
        },
      },
    },
  });
  if (!p || !p.receiptNumber) notFound();
  if (p.lease.unit.property.brand !== brand) {
    return (
      <div className="mx-auto max-w-xl p-10">
        <OtherWorkspace brand={p.lease.unit.property.brand} next={`/billing/receipts/${id}`} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl bg-white p-10 text-slate-900 print:p-0">
      <div className="flex items-start justify-between">
        <Logo />
        <div className="text-right text-sm">
          <p className="text-xl font-bold">RECEIPT</p>
          <p>{p.receiptNumber}</p>
          <p>{date(p.receiptGeneratedAt ?? p.paidDate)}</p>
        </div>
      </div>
      <div className="mt-10 grid grid-cols-2 gap-6 text-sm">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase">Received from</p>
          <p className="font-semibold">{p.lease.tenant.firstName} {p.lease.tenant.lastName}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase">Property</p>
          <p className="font-semibold">{p.lease.unit.property.name} · Unit {p.lease.unit.unitNumber}</p>
          <p>{p.lease.unit.property.street}, {p.lease.unit.property.city}</p>
        </div>
      </div>
      <table className="mt-10 w-full text-sm">
        <tbody className="divide-y divide-slate-200 border-y border-slate-200">
          <tr><td className="py-2">Rent due {date(p.dueDate)}</td><td className="py-2 text-right">{money(p.amount)}</td></tr>
          <tr><td className="py-2">Payment method</td><td className="py-2 text-right">{p.method ? humanize(p.method) : "—"}</td></tr>
          <tr className="font-bold"><td className="py-2">Amount received</td><td className="py-2 text-right">{money(p.amountPaid)}</td></tr>
        </tbody>
      </table>
      {p.notes && <p className="mt-4 text-sm">Notes: {p.notes}</p>}
      <p className="mt-16 text-center text-xs text-slate-500">Thank you. This receipt was generated electronically.</p>
      <div className="mt-6 text-center print:hidden">
        <PrintButton />
      </div>
    </div>
  );
}
