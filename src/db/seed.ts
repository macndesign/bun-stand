import { sql } from "drizzle-orm";
import { db } from "./index";
import * as schema from "./schema";
import { hashPassword } from "better-auth/crypto";

async function seed() {
  console.log("Seeding database...");

  // Remove existing demo data (cascade handles account, session, counter)
  await db
    .delete(schema.user)
    .where(sql`${schema.user.email} = 'demo@example.com'`);

  const now = new Date();

  const user = (
    await db
      .insert(schema.user)
      .values({
        id: crypto.randomUUID(),
        name: "Demo User",
        email: "demo@example.com",
        emailVerified: true,
        image: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
  )[0];

  if (!user) throw new Error("Failed to create user");

  console.log(`Created user: ${user.email} (${user.id})`);

  const password = await hashPassword("password123");

  await db.insert(schema.account).values({
    id: crypto.randomUUID(),
    accountId: user.id,
    providerId: "credential",
    issuer: "local:credential",
    userId: user.id,
    password,
    createdAt: now,
    updatedAt: now,
  });

  console.log("Created credential account (password: password123)");

  await db.insert(schema.counter).values({
    userId: user.id,
    count: 0,
  });

  console.log("Created counter for user");
  console.log("Seed completed!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
