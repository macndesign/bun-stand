import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as schema from "./db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    // Keep it low for a local demo; raise this for anything real.
    minPasswordLength: 6,
  },
  // In production, set BETTER_AUTH_SECRET and BETTER_AUTH_URL in your
  // environment (see .env.example). better-auth reads them automatically.
});
