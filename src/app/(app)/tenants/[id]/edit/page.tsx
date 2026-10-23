import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { updateTenant } from "@/app/actions/tenants";
import { TenantForm } from "../../tenant-form";

export default async function EditTenantPage({ params }: PageProps<"/tenants/[id]/edit">) {
  const { id } = await params;
  const tenant = await db.tenant.findUnique({ where: { id } });
  if (!tenant) notFound();

  return (
    <>
      <PageHeader title={`Edit ${tenant.firstName} ${tenant.lastName}`} />
      <TenantForm action={updateTenant.bind(null, id)} tenant={tenant} submitLabel="Save Changes" />
    </>
  );
}
