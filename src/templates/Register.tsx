import { Html } from "@elysiajs/html";

type RegisterFormProps = { error?: string };

export function RegisterForm({ error }: RegisterFormProps) {
  return (
    <article id="register-card" class="auth-card">
      <hgroup>
        <h1>Create account</h1>
        <h2>Takes about ten seconds</h2>
      </hgroup>

      {error && <p class="form-error">{error}</p>}

      <form hx-post="/register" hx-target="#register-card" hx-swap="outerHTML">
        <label>
          Name
          <input
            type="text"
            name="name"
            required
            autocomplete="name"
            placeholder="Ada Lovelace"
          />
        </label>
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
            minlength={6}
            autocomplete="new-password"
            placeholder="At least 6 characters"
          />
        </label>
        <button type="submit">Create account</button>
      </form>

      <footer>
        <small>
          Already have an account? <a href="/login">Sign in</a>
        </small>
      </footer>
    </article>
  );
}

export function RegisterPage(props: RegisterFormProps) {
  return (
    <main class="container">
      <RegisterForm {...props} />
    </main>
  );
}
