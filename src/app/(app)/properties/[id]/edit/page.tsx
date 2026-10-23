import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { updateProperty } from "@/app/actions/properties";
import { PropertyForm } from "../../property-form";

export default async function EditPropertyPage({ params }: PageProps<"/properties/[id]/edit">) {
  const { id } = await params;
  const property = await db.property.findUnique({ where: { id } });
  if (!property) notFound();

  return (
    <>
      <PageHeader title={`Edit ${property.name}`} />
      <PropertyForm action={updateProperty.bind(null, id)} property={property} defaultBrand={property.brand} submitLabel="Save Changes" />
    </>
  );
}
