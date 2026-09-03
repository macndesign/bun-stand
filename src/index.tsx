import { Elysia, t } from "elysia";
import { html, Html } from "@elysiajs/html";
import { eq, sql } from "drizzle-orm";

import { auth } from "./auth";
import { db, counter as counterTable } from "./db";

import { Layout } from "./templates/Layout";
import { LoginPage, LoginForm } from "./templates/Login";
import { RegisterPage, RegisterForm } from "./templates/Register";
import { DashboardPage } from "./templates/Dashboard";
import { Counter } from "./templates/Counter";

async function getCount(userId: string): Promise<number> {
  const row = db
    .select()
    .from(counterTable)
    .where(eq(counterTable.userId, userId))
    .get();
  return row?.count ?? 0;
}

// Reusable macro: any route with { auth: true } gets `user`/`session`
// injected, or is short-circuited with a 401. Good for API-ish endpoints
// (like our htmx fragment routes) that don't need a nice redirect on failure.
const authPlugin = new Elysia({ name: "better-auth" })
  .mount(auth.handler) // exposes the full /api/auth/* surface
  .macro({
    auth: {
      async resolve({ status, request: { headers } }) {
        const session = await auth.api.getSession({ headers });
        if (!session) return status(401);
        return { user: session.user, session: session.session };
      },
    },
  });

const app = new Elysia()
  .use(html())
  .use(authPlugin)

  // ---------------------------------------------------------------------
  // Public routes
  // ---------------------------------------------------------------------
  .get("/", ({ redirect }) => {
    return redirect("/login");
  })

  .get("/login", () => (
    <Layout title="Sign in">
      <LoginPage />
    </Layout>
  ))

  .get("/register", () => (
    <Layout title="Create account">
      <RegisterPage />
    </Layout>
  ))

  .post(
    "/login",
    async ({ body }) => {
      try {
        const res = await auth.api.signInEmail({
          body: { email: body.email, password: body.password },
          asResponse: true,
        });

        // better-auth's server API can return a full Response (with the
        // session Set-Cookie header) when asResponse: true is passed.
        // We forward that header and tell htmx to do a full navigation
        // to the protected page via the HX-Redirect response header.
        return new Response(null, {
          headers: {
            "set-cookie": res.headers.get("set-cookie") ?? "",
            "HX-Redirect": "/dashboard",
          },
        });
      } catch {
        // Swap just the form back in with an inline error — no full
        // page reload, this is the htmx fragment path.
        return <LoginForm error="Invalid email or password" />;
      }
    },
    { body: t.Object({ email: t.String(), password: t.String() }) },
  )

  .post(
    "/register",
    async ({ body }) => {
      try {
        const res = await auth.api.signUpEmail({
          body: { email: body.email, password: body.password, name: body.name },
          asResponse: true,
        });

        return new Response(null, {
          headers: {
            "set-cookie": res.headers.get("set-cookie") ?? "",
            "HX-Redirect": "/dashboard",
          },
        });
      } catch {
        return (
          <RegisterForm error="Could not create that account — the email may already be in use" />
        );
      }
    },
    {
      body: t.Object({
        name: t.String(),
        email: t.String(),
        password: t.String({ minLength: 6 }),
      }),
    },
  )

  .post("/logout", async ({ request }) => {
    const res = await auth.api.signOut({
      headers: request.headers,
      asResponse: true,
    });

    return new Response(null, {
      headers: {
        "set-cookie": res.headers.get("set-cookie") ?? "",
        "HX-Redirect": "/login",
      },
    });
  })

  // ---------------------------------------------------------------------
  // Protected routes
  // ---------------------------------------------------------------------
  // Handled manually (not via the `auth` macro) so an unauthenticated
  // visitor gets redirected to /login instead of a bare 401 — nicer for
  // a page a human navigates to directly.
  .get("/dashboard", async ({ request, set, redirect }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return redirect("/login");
    }

    const count = await getCount(session.user.id);
    return (
      <Layout title="Dashboard">
        <DashboardPage name={session.user.name} count={count} />
      </Layout>
    );
  })

  // These two are pure htmx fragment endpoints, so the 401-on-macro
  // behavior is fine — there's no page to redirect, just a button click.
  .post(
    "/counter/increment",
    ({ user }) => {
      db.insert(counterTable)
        .values({ userId: user.id, count: 1 })
        .onConflictDoUpdate({
          target: counterTable.userId,
          set: { count: sql`${counterTable.count} + 1` },
        })
        .run();

      const row = db
        .select()
        .from(counterTable)
        .where(eq(counterTable.userId, user.id))
        .get();

      return <Counter count={row?.count ?? 0} />;
    },
    { auth: true },
  )

  .post(
    "/counter/reset",
    ({ user }) => {
      db.insert(counterTable)
        .values({ userId: user.id, count: 0 })
        .onConflictDoUpdate({ target: counterTable.userId, set: { count: 0 } })
        .run();

      return <Counter count={0} />;
    },
    { auth: true },
  )

  .listen(3000);

console.log(`🦊 Running at http://localhost:${app.server?.port}`);
