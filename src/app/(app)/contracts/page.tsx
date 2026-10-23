import { PhaseTwo } from "@/components/phase-two";

export default function ContractsPage() {
  return (
    <PhaseTwo
      title="Contract Generator"
      summary="Select a lease to generate a Monthly Hosting Contract or a Tasdeeq / Ejari certificate."
      features={[
        "Lease picker filtered by All / Active / Expired / Terminated",
        "Monthly Hosting Contract PDF filled from the lease, tenant and unit",
        "Tasdeeq / Ejari certificate PDF",
        "Needs the exact contract wording from the live site or your lawyer before it can be rebuilt",
      ]}
    />
  );
}
