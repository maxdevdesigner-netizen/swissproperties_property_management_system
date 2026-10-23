import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { updateTenant } from "@/app/actions/tenants";
import { requireWorkspace } from "@/lib/workspace";
import { OtherWorkspace } from "@/components/other-workspace";
import { TenantForm } from "../../tenant-form";

export default async function EditTenantPage({ params }: PageProps<"/tenants/[id]/edit">) {
  const brand = await requireWorkspace();
  const { id } = await params;
  const tenant = await db.tenant.findUnique({ where: { id } });
  if (!tenant) notFound();
  if (tenant.brand !== brand) return <OtherWorkspace brand={tenant.brand} next={`/tenants/${id}/edit`} />;

  return (
    <>
      <PageHeader title={`Edit ${tenant.firstName} ${tenant.lastName}`} />
      <TenantForm action={updateTenant.bind(null, id)} tenant={tenant} submitLabel="Save Changes" />
    </>
  );
}
