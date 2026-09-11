import { Html } from "@elysiajs/html";
import { Counter } from "./Counter";

type DashboardPageProps = { name: string; count: number };

export function DashboardPage({ name, count }: DashboardPageProps) {
  return (
    <main class="container">
      <nav>
        <ul>
          <li>
            <strong>Counter App</strong>
          </li>
        </ul>
        <ul>
          <li>Hi, {name}</li>
          <li>
            <button
              hx-post="/logout"
              hx-target="body"
              class="secondary outline"
            >
              Sign out
            </button>
          </li>
        </ul>
      </nav>

      <article>
        <h1>Counter</h1>
        <p>
          This is a protected route — the server checked your session cookie
          before rendering it. Each click below hits the server and swaps in the
          returned fragment; nothing here is client-side state.
        </p>
        <Counter count={count} />
      </article>
    </main>
  );
}
