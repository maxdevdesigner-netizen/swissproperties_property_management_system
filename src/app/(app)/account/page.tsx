import QRCode from "qrcode";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ButtonLink, Card, Field, PageHeader } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { changePassword, disableTwoFactor, enableTwoFactor, updateProfile } from "@/app/actions/users";
import { humanize } from "@/lib/format";
import { generateSecret, otpauthUrl } from "@/lib/totp";

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const session = await requireUser();
  const { setup } = (await searchParams) as Record<string, string | undefined>;
  const user = await db.user.findUniqueOrThrow({ where: { id: session.id } });
  const twoFactorOn = (await db.user.count({ where: { id: session.id, twoFactorSecret: { not: null } } })) > 0;
  // A fresh secret each time the setup screen opens; it's only saved once a code from it is confirmed.
  const newSecret = !twoFactorOn && setup === "2fa" ? generateSecret() : null;
  const qrCode = newSecret ? await QRCode.toDataURL(otpauthUrl(newSecret, user.email), { margin: 1, width: 200 }) : null;

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
        <Card className="md:col-span-2">
          <h2 className="font-bold">Two-Factor Authentication</h2>
          {twoFactorOn ? (
            <>
              <p className="mb-4 text-sm text-muted">On. Signing in asks for a code from your authenticator app.</p>
              <ActionForm action={disableTwoFactor} submitLabel="Turn Off" showCancel={false} className="max-w-xs space-y-4">
                <Field label="Current code" hint="Enter a code from your app to confirm.">
                  <input name="code" required inputMode="numeric" autoComplete="one-time-code" className="input" />
                </Field>
              </ActionForm>
            </>
          ) : newSecret && qrCode ? (
            <div className="mt-2 flex flex-wrap gap-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCode} alt="QR code for your authenticator app" width={200} height={200} className="rounded-lg bg-white" />
              <div className="max-w-sm flex-1">
                <p className="mb-2 text-sm">Scan the QR code with an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…), then enter the 6-digit code it shows.</p>
                <p className="mb-4 text-xs text-muted">
                  Can&apos;t scan it? Enter this key instead: <code className="font-mono break-all text-text">{newSecret.match(/.{4}/g)?.join(" ")}</code>
                </p>
                <ActionForm action={enableTwoFactor} submitLabel="Turn On" showCancel={false} className="space-y-4">
                  <input type="hidden" name="secret" value={newSecret} />
                  <Field label="Code from the app">
                    <input name="code" required inputMode="numeric" autoComplete="one-time-code" className="input" />
                  </Field>
                </ActionForm>
              </div>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted">Off. Add a code from your phone to every sign-in, so a stolen password isn&apos;t enough.</p>
              <ButtonLink href="/account?setup=2fa" variant="outline">Set Up</ButtonLink>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
