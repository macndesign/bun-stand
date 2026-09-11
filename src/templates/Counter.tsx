import { Html } from "@elysiajs/html";

type CounterProps = { count: number };

// This partial is returned in two contexts:
//  1. Embedded inside DashboardPage on the initial GET /dashboard (full page)
//  2. Standalone from POST /counter/increment and /counter/reset,
//     where htmx swaps it in by matching the #counter-card id.
export function Counter({ count }: CounterProps) {
  return (
    <div id="counter-card" class="counter-card">
      <div class="counter-value">{count}</div>
      <div class="counter-actions">
        <button
          hx-post="/counter/increment"
          hx-target="#counter-card"
          hx-swap="outerHTML"
        >
          + Increment
        </button>
        <button
          hx-post="/counter/reset"
          hx-target="#counter-card"
          hx-swap="outerHTML"
          class="secondary"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
