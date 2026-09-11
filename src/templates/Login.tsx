import { Html } from "@elysiajs/html";

type LoginFormProps = { error?: string };

// This is the reusable partial: the same markup is used for the initial
// full-page load AND as the fragment htmx swaps back in on a failed login
// (see index.tsx, POST /login).
export function LoginForm({ error }: LoginFormProps) {
  return (
    <article id="login-card" class="auth-card">
      <hgroup>
        <h1>Sign in</h1>
        <h2>Access your dashboard</h2>
      </hgroup>

      {error && <p class="form-error">{error}</p>}

      <form hx-post="/login" hx-target="#login-card" hx-swap="outerHTML">
        <label>
          Email
          <input
            type="email"
            name="email"
            required
            autocomplete="email"
            placeholder="you@example.com"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            required
            autocomplete="current-password"
            placeholder="••••••••"
          />
        </label>
        <button type="submit">Sign in</button>
      </form>

      <footer>
        <small>
          No account yet? <a href="/register">Create one</a>
        </small>
      </footer>
    </article>
  );
}

export function LoginPage(props: LoginFormProps) {
  return (
    <main class="container">
      <LoginForm {...props} />
    </main>
  );
}
