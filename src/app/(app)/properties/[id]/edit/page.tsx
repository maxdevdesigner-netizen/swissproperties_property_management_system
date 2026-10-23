import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace";
import { OtherWorkspace } from "@/components/other-workspace";
import { PageHeader } from "@/components/ui";
import { updateProperty } from "@/app/actions/properties";
import { PropertyForm } from "../../property-form";

export default async function EditPropertyPage({ params }: PageProps<"/properties/[id]/edit">) {
  const brand = await requireWorkspace();
  const { id } = await params;
  const property = await db.property.findUnique({ where: { id } });
  if (!property) notFound();
  if (property.brand !== brand) return <OtherWorkspace brand={property.brand} next={`/properties/${id}/edit`} />;

  return (
    <>
      <PageHeader title={`Edit ${property.name}`} />
      <PropertyForm action={updateProperty.bind(null, id)} property={property} defaultBrand={property.brand} submitLabel="Save Changes" />
    </>
  );
}
