import { PageHeader } from "@/components/ui";

/** Stand-in for live features that aren't rebuilt yet. Lists what the live page does. */
export function PhaseTwo({ title, summary, features }: { title: string; summary: string; features: string[] }) {
  return (
    <>
      <PageHeader title={title} subtitle={summary} />
      <div className="max-w-2xl rounded-2xl border border-dashed border-border bg-surface p-6">
        <p className="text-sm font-semibold">Not rebuilt yet (phase 2). On the live site this page has:</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
          {features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </div>
    </>
  );
}
