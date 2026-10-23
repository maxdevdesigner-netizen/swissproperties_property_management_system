// Creates a login, or resets the password of an existing one.
//
//   npm run user:create -- --email you@example.com --name "Your Name" --role ADMIN
//
// The password is typed at a hidden prompt so it never lands in shell history.
// For scripts, pass --password-env NAME to read it from an environment variable instead.
// Add --reset-2fa to also turn off two-factor sign-in for someone who has lost their phone.
import "dotenv/config";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const ROLES = ["ADMIN", "MANAGER", "STAFF"] as const;

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const output = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
    output._writeToOutput = (s: string) => {
      if (s.includes(question)) output.output.write(s);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: "string" },
      name: { type: "string" },
      role: { type: "string", default: "ADMIN" },
      "password-env": { type: "string" },
      "reset-2fa": { type: "boolean", default: false },
    },
  });

  const email = values.email?.trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Pass --email with a valid email address");
  const role = values.role?.toUpperCase() as (typeof ROLES)[number];
  if (!ROLES.includes(role)) throw new Error(`--role must be one of ${ROLES.join(", ")}`);

  let password: string | undefined;
  if (values["password-env"]) {
    password = process.env[values["password-env"]];
    if (!password) throw new Error(`Environment variable ${values["password-env"]} is empty`);
  } else {
    password = await promptHidden("Password (min 10 characters): ");
    if ((await promptHidden("Confirm password: ")) !== password) throw new Error("Passwords don't match");
  }
  if (password.length < 10) throw new Error("Password must be at least 10 characters");

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const hash = await bcrypt.hash(password, 12);
    const existing = await db.user.findUnique({ where: { email } });
    await db.user.upsert({
      where: { email },
      update: { password: hash, role, ...(values.name ? { name: values.name } : {}), ...(values["reset-2fa"] ? { twoFactorSecret: null } : {}) },
      create: { email, name: values.name ?? email.split("@")[0], role, password: hash },
    });
    console.log(`${existing ? "Updated" : "Created"} ${role.toLowerCase()} login for ${email}${values["reset-2fa"] ? " (two-factor sign-in off)" : ""}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
