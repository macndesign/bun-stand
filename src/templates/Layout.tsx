import { Html } from "@elysiajs/html";

type LayoutProps = {
  title: string;
  children: JSX.Element | JSX.Element[] | string;
};

// Pico.css is a classless-first CSS library: plain semantic HTML (<article>,
// <nav>, <form>, <button>...) already looks good, so our server-rendered
// fragments don't need a utility class soup to look decent.
export function Layout({ title, children }: LayoutProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title} · Counter App</title>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css"
        />
        <script src="https://unpkg.com/htmx.org@1.9.12"></script>
        <style>{`
          .counter-card {
            text-align: center;
            padding: 2.5rem 1rem;
          }
          .counter-value {
            font-size: 4.5rem;
            font-weight: 700;
            line-height: 1;
            margin-bottom: 1.5rem;
            font-variant-numeric: tabular-nums;
          }
          .counter-actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
          }
          .auth-card {
            max-width: 420px;
            margin: 10vh auto 0;
          }
          .form-error {
            color: var(--pico-del-color);
            margin-bottom: 1rem;
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
