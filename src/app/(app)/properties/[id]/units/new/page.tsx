import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { createUnit } from "@/app/actions/properties";
import { UnitForm } from "../../../unit-form";

export default async function NewUnitPage({ params }: PageProps<"/properties/[id]/units/new">) {
  const { id } = await params;
  const property = await db.property.findUnique({ where: { id }, select: { name: true } });
  if (!property) notFound();

  return (
    <>
      <PageHeader title="Add Unit" subtitle={property.name} />
      <UnitForm action={createUnit.bind(null, id)} submitLabel="Create Unit" />
    </>
  );
}
