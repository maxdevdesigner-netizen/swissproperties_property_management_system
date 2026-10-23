// Local development data only. Every name, number and address here is made up.
// Never run this against the production database.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

function addMonths(d: Date, n: number) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed in production");

  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@example.test").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) throw new Error("Set SEED_ADMIN_PASSWORD in .env first");

  await db.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Admin", role: "ADMIN", password: await bcrypt.hash(password, 12) },
  });

  if (await db.property.count()) {
    console.log("Properties already exist, skipping sample data.");
    return;
  }

  const tower = await db.property.create({
    data: {
      name: "Sample Tower A",
      type: "APARTMENT",
      brand: "SWISS_HOMES",
      street: "1 Example Street, Al Rashidiya 1",
      zip: "00000",
      city: "Ajman",
      emirate: "Ajman",
      description: "Demo building for local development.",
    },
  });
  await db.property.create({
    data: { name: "Sample Villa 1", type: "VILLA", brand: "SWISS_PROPERTIES", street: "Example Road", zip: "00000", city: "Ajman", emirate: "Ajman" },
  });

  const unitSpecs = [
    ["101", 1, "STUDIO", 3000],
    ["102", 1, "ONE_BR", 4000],
    ["201", 2, "TWO_BR", 5500],
    ["202", 2, "STUDIO", 3200],
    ["301", 3, "ONE_BR", 4200],
  ] as const;
  const units = [];
  for (const [unitNumber, floor, type, rent] of unitSpecs) {
    units.push(await db.unit.create({ data: { propertyId: tower.id, unitNumber, floor, type, rentAmount: rent, vacantSince: new Date() } }));
  }

  const people = [
    ["Test", "Tenant One"],
    ["Test", "Tenant Two"],
    ["Test", "Tenant Three"],
  ];
  const today = new Date();
  for (let i = 0; i < people.length; i++) {
    const [firstName, lastName] = people[i];
    const tenant = await db.tenant.create({
      data: { firstName, lastName, brand: "SWISS_HOMES", phone: `+971 50 000 000${i}`, email: `tenant${i + 1}@example.test` },
    });
    const unit = units[i];
    const start = addMonths(today, -(4 - i));
    const lease = await db.lease.create({
      data: { tenantId: tenant.id, unitId: unit.id, startDate: start, endDate: addMonths(start, 12), rentAmount: unit.rentAmount, depositAmount: 500, depositPaid: true },
    });
    await db.unit.update({ where: { id: unit.id }, data: { status: "OCCUPIED", vacantSince: null } });
    for (let m = 0; m < 12; m++) {
      const dueDate = addMonths(start, m);
      // First tenant is fully up to date; the others have fallen behind.
      const paid = dueDate < today && (i === 0 || m < 2);
      await db.payment.create({
        data: {
          leaseId: lease.id,
          amount: unit.rentAmount,
          amountPaid: paid ? unit.rentAmount : 0,
          dueDate,
          status: paid ? "PAID" : "PENDING",
          paidDate: paid ? dueDate : null,
          method: paid ? "BANK_TRANSFER" : null,
        },
      });
    }
  }
  console.log(`Seeded admin ${email} and sample data.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
