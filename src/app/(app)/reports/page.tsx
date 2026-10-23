import { PhaseTwo } from "@/components/phase-two";

export default function ReportsPage() {
  return (
    <PhaseTwo
      title="Reports"
      summary="Monthly property performance reports."
      features={[
        "Standard Reports: property + month + year → Load Report → export as PDF",
        "Report Builder for custom reports",
        "Arrears and risk reports (the Collections page already covers these on screen)",
      ]}
    />
  );
}
