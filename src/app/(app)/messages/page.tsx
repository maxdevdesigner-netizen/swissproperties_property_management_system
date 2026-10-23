import { PhaseTwo } from "@/components/phase-two";

export default function MessagesPage() {
  return (
    <PhaseTwo
      title="Messages"
      summary="Tenant conversations and bulk email."
      features={[
        "Conversations: message threads with tenants, search, New Message",
        "Bulk Email: email campaigns to selected tenants",
        "Payment reminders and mass email from the Tenants page",
        "Needs SMTP (email provider) settings",
      ]}
    />
  );
}
