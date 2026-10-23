"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button, FormError } from "@/components/ui";
import type { ActionState } from "@/lib/forms";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

export function ActionForm({
  action,
  submitLabel,
  children,
  className,
  showCancel = true,
}: {
  action: Action;
  submitLabel: string;
  children: ReactNode;
  className?: string;
  showCancel?: boolean;
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className ?? "space-y-5"}>
      <FormError message={state?.error} />
      {children}
      <div className="flex gap-3 pt-2">
        <SubmitButton label={submitLabel} />
        {showCancel && (
          <Button type="button" variant="outline" onClick={() => history.back()}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

export function SubmitButton({ label, variant = "accent" }: { label: string; variant?: "accent" | "primary" | "danger" | "outline" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

/** A one-button form for actions like delete; asks before submitting. */
export function ConfirmButton({
  action,
  label,
  confirm,
  variant = "danger",
}: {
  action: () => Promise<void>;
  label: string;
  confirm: string;
  variant?: "accent" | "primary" | "danger" | "outline";
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirm)) e.preventDefault();
      }}
    >
      <SubmitButton label={label} variant={variant} />
    </form>
  );
}
