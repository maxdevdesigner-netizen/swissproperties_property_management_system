import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Card, Field, PageHeader } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { changePassword, updateProfile } from "@/app/actions/users";
import { humanize } from "@/lib/format";

export default async function AccountPage() {
  const session = await requireUser();
  const user = await db.user.findUniqueOrThrow({ where: { id: session.id } });

  return (
    <>
      <PageHeader title="Account Settings" />
      <div className="grid max-w-4xl gap-6 md:grid-cols-2">
        <Card>
          <h2 className="font-bold">Profile</h2>
          <p className="mb-4 text-sm text-muted">Your name and sign-in details</p>
          <ActionForm action={updateProfile} submitLabel="Save Name" showCancel={false}>
            <Field label="Display Name">
              <input name="name" defaultValue={user.name ?? ""} placeholder="Full Name" className="input" />
            </Field>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-muted">Email</dt><dd>{user.email}</dd></div>
              <div><dt className="text-muted">Role</dt><dd>{humanize(user.role)}</dd></div>
            </dl>
          </ActionForm>
        </Card>
        <Card>
          <h2 className="font-bold">Change Password</h2>
          <p className="mb-4 text-sm text-muted">At least 10 characters.</p>
          <ActionForm action={changePassword} submitLabel="Change Password" showCancel={false}>
            <Field label="Current Password"><input name="currentPassword" type="password" required autoComplete="current-password" className="input" /></Field>
            <Field label="New Password"><input name="newPassword" type="password" required minLength={10} autoComplete="new-password" className="input" /></Field>
            <Field label="Confirm New Password"><input name="confirmPassword" type="password" required minLength={10} autoComplete="new-password" className="input" /></Field>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
