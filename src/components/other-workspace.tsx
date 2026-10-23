import { Button, EmptyState } from "@/components/ui";
import { switchWorkspace } from "@/app/actions/workspace";
import { WORKSPACES } from "@/lib/workspace";
import type { Brand } from "@/generated/prisma/enums";

/**
 * Shown in place of a record from the other workspace, e.g. one opened from a notification
 * or a saved link. Switching brings you straight back to it.
 */
export function OtherWorkspace({ brand, next }: { brand: Brand; next: string }) {
  const { name } = WORKSPACES[brand];
  return (
    <EmptyState title={`This record is in ${name}`}>
      <p>Everything here is scoped to the workspace you have open. Switch to {name} to view it.</p>
      <form action={switchWorkspace} className="mt-4">
        <input type="hidden" name="brand" value={brand} />
        <input type="hidden" name="next" value={next} />
        <Button type="submit">Switch to {name}</Button>
      </form>
    </EmptyState>
  );
}
