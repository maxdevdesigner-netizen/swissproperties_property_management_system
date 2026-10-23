import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace";
import { OtherWorkspace } from "@/components/other-workspace";
import { PageHeader } from "@/components/ui";
import { createUnit } from "@/app/actions/properties";
import { UnitForm } from "../../../unit-form";

export default async function NewUnitPage({ params }: PageProps<"/properties/[id]/units/new">) {
  const brand = await requireWorkspace();
  const { id } = await params;
  const property = await db.property.findUnique({ where: { id }, select: { name: true, brand: true } });
  if (!property) notFound();
  if (property.brand !== brand) return <OtherWorkspace brand={property.brand} next={`/properties/${id}/units/new`} />;

  return (
    <>
      <PageHeader title="Add Unit" subtitle={property.name} />
      <UnitForm action={createUnit.bind(null, id)} submitLabel="Create Unit" />
    </>
  );
}
