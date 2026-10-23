import { PageHeader } from "@/components/ui";
import { createTenant } from "@/app/actions/tenants";
import { TenantForm } from "../tenant-form";

export default function NewTenantPage() {
  return (
    <>
      <PageHeader title="Add Tenant" />
      <TenantForm action={createTenant} submitLabel="Create Tenant" />
    </>
  );
}
