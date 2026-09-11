## 1. Dev compose override

- [x] 1.1 Create `docker-compose.dev.yml` overriding the `app` service to use `oven/bun:1`, bind-mount `.` at `/app` with an anonymous `/app/node_modules` volume, keep the shared `data:/data` volume, and run `sh -c "bun install --frozen-lockfile --ignore-scripts && bun run dev"`; verify the effective config with `docker compose -f docker-compose.yml -f docker-compose.dev.yml config` (service shows `oven/bun:1`, source bind, `data:/data`, and the dev command)
- [x] 1.2 Confirm the base `docker-compose.yml` and `Dockerfile` are unchanged (diff clean) and that `build: !reset null` plus `image: oven/bun:1` prevent the compiled image from building

## 2. Verification

- [x] 2.1 Start dev mode on a free host port (`APP_PORT=3100 docker compose -f docker-compose.yml -f docker-compose.dev.yml up`), confirm `GET /login` returns 200 and migrate/seed created/used `/data/app.db` on the shared `data` volume
- [x] 2.2 Confirm live reload: edit a template, confirm the `bun run dev` log line is re-printed and the change appears on the next request, then revert the edit
- [x] 2.3 Confirm the database is shared with the compiled app: stop dev, run `docker compose up`, sign in as `demo@example.com`, and verify data (e.g. counter) created in dev mode is still present; then tear down

## 3. Documentation

- [x] 3.1 Update `README.md` with the dev-mode command (`docker compose -f docker-compose.yml -f docker-compose.dev.yml up`), the host-port/`BETTER_AUTH_URL` note, and the "run dev or the compiled app, not both" guidance
- [x] 3.2 Run `openspec validate` and confirm the change's specs/tasks are valid