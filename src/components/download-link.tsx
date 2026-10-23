import type { ReactNode } from "react";

// A plain <a>: file downloads from route handlers must not go through client-side navigation.
export function DownloadLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} download className="ml-auto flex items-center gap-1 rounded-lg border border-border px-3 py-1 hover:bg-surface-2">
      {children}
    </a>
  );
}
