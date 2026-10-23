import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace";
import { OtherWorkspace } from "@/components/other-workspace";
import { Badge, PageHeader, Table } from "@/components/ui";
import { ConfirmButton } from "@/components/action-form";
import { deleteUnit, updateUnit } from "@/app/actions/properties";
import { date, money } from "@/lib/format";
import { UnitForm } from "../../properties/unit-form";

export default async function UnitPage({ params }: PageProps<"/units/[id]">) {
  const brand = await requireWorkspace();
  const { id } = await params;
  const unit = await db.unit.findUnique({
    where: { id },
    include: {
      property: { select: { id: true, name: true, brand: true } },
      leases: { orderBy: { startDate: "desc" }, include: { tenant: { select: { id: true, firstName: true, lastName: true } } } },
    },
  });
  if (!unit) notFound();
  if (unit.property.brand !== brand) return <OtherWorkspace brand={unit.property.brand} next={`/units/${id}`} />;

  return (
    <>
      <PageHeader
        title={`Unit ${unit.unitNumber}`}
        subtitle={<Link href={`/properties/${unit.property.id}`} className="hover:text-text">{unit.property.name}</Link>}
        actions={
          unit.leases.length === 0 && (
            <ConfirmButton action={deleteUnit.bind(null, id)} label="Delete Unit" confirm={`Delete unit ${unit.unitNumber}?`} />
          )
        }
      />
      <UnitForm action={updateUnit.bind(null, id)} unit={unit} submitLabel="Save Unit" />

      <h2 className="mt-8 mb-3 text-lg font-bold">Lease history</h2>
      <Table head={["Tenant", "Start", "End", "Rent", "Status"]}>
        {unit.leases.map((l) => (
          <tr key={l.id}>
            <td className="px-4 py-3">
              <Link href={`/leases/${l.id}`} className="font-medium hover:text-primary">{l.tenant.firstName} {l.tenant.lastName}</Link>
            </td>
            <td className="px-4 py-3">{date(l.startDate)}</td>
            <td className="px-4 py-3">{l.endDate ? date(l.endDate) : "Open-ended"}</td>
            <td className="px-4 py-3">{money(l.rentAmount)}</td>
            <td className="px-4 py-3"><Badge value={l.status} /></td>
          </tr>
        ))}
      </Table>
    </>
  );
}
