import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { Avatar, Card, Field, PageHeader } from "@/components/ui";
import { ActionForm, ConfirmButton } from "@/components/action-form";
import { createUser, deleteUser, updateUserRole } from "@/app/actions/users";
import { date, humanize } from "@/lib/format";
import { Role } from "@/generated/prisma/enums";

export default async function UsersPage() {
  const me = await requireAdmin();
  const users = await db.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <>
      <PageHeader title="User Management" subtitle={`${users.length} user${users.length === 1 ? "" : "s"}`} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {users.map((u) => (
            <Card key={u.id} className="flex flex-wrap items-center gap-4">
              <Avatar text={(u.name ?? u.email)[0].toUpperCase()} />
              <div className="min-w-48 flex-1">
                <p className="font-semibold">
                  {u.name ?? "—"} {u.id === me.id && <span className="ml-1 rounded bg-primary-soft px-1.5 text-xs text-primary">You</span>}
                </p>
                <p className="text-sm text-muted">{u.email} · Joined {date(u.createdAt)}</p>
              </div>
              <form action={updateUserRole.bind(null, u.id)} className="flex gap-2">
                <select name="role" defaultValue={u.role} className="input w-32" disabled={u.id === me.id}>
                  {Object.values(Role).map((r) => (
                    <option key={r} value={r}>{humanize(r)}</option>
                  ))}
                </select>
                {u.id !== me.id && <button className="rounded-lg border border-border px-3 text-sm font-semibold hover:bg-surface-2">Save</button>}
              </form>
              {u.id !== me.id && <ConfirmButton action={deleteUser.bind(null, u.id)} label="Remove" confirm={`Remove ${u.email}?`} />}
            </Card>
          ))}
        </div>
        <Card className="h-fit">
          <h2 className="mb-4 font-bold">Add User</h2>
          <ActionForm action={createUser} submitLabel="Add User" showCancel={false}>
            <Field label="Name" required><input name="name" required className="input" /></Field>
            <Field label="Email" required><input name="email" type="email" required className="input" /></Field>
            <Field label="Role">
              <select name="role" defaultValue="STAFF" className="input">
                {Object.values(Role).map((r) => (
                  <option key={r} value={r}>{humanize(r)}</option>
                ))}
              </select>
            </Field>
            <Field label="Temporary password" required hint="At least 10 characters. Ask them to change it after signing in.">
              <input name="password" type="password" required minLength={10} autoComplete="new-password" className="input" />
            </Field>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
