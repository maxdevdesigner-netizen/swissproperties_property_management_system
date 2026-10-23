import { PageHeader } from "@/components/ui";
import { requireWorkspace } from "@/lib/workspace";
import { createProperty } from "@/app/actions/properties";
import { PropertyForm } from "../property-form";

export default async function NewPropertyPage() {
  const brand = await requireWorkspace();
  return (
    <>
      <PageHeader title="Add Property" />
      <PropertyForm action={createProperty} defaultBrand={brand} submitLabel="Create Property" />
    </>
  );
}
