## 1. Reproducible container build

- [x] 1.1 Add `.dockerignore` excluding `node_modules/`, `sqlite.db*`, `.env`, the local `app` binary, and `.DS_Store`; verify `docker build` context output shows only source + lockfile
- [x] 1.2 Add `Dockerfile` with a multi-stage build (`oven/bun:1` install with `--frozen-lockfile`, `bun build src/index.tsx --compile --outfile app`, runtime from `gcr.io/distroless/static-debian12:nonroot`); verify `docker build` completes and `docker run --rm <image> id` reports a non-root user
- [x] 1.3 Smoke-test the built image: run it with `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and a writable `DATABASE_PATH`, then verify `GET /login` on port 3000 returns 200 HTML; confirm the binary can self-extract by verifying the container logs the listening line

## 2. Compose deployment

- [x] 2.1 Add `docker-compose.yml` with an app service on host port 3000, a named volume mounted at `DATABASE_PATH`, and `BETTER_AUTH_SECRET`/`BETTER_AUTH_URL` sourced from `.env`; verify `docker compose up --build` starts the app and it responds on port 3000
- [x] 2.2 Add a one-off migration service in compose that applies `drizzle/*.sql` (`bun run db:migrate`) and seeds the demo user (`bun run db:seed`) against the volume before the app starts; verify on a wiped volume that `docker compose up` yields working tables and sign-in with `demo@example.com`/`password123`
- [x] 2.3 Verify persistence across restart: increment the counter, run `docker compose down`, then `docker compose up`, and confirm the counter value remains

## 3. Documentation

- [x] 3.1 Document build and run instructions (build, compose up, env vars, volume reset) in README or equivalent; verify the doc matches the actual commands and the seeded demo credentials