## ADDED Requirements

### Requirement: Live-reloading development mode shares the database volume

A Docker development mode SHALL exist that runs the app from source with live-reloading and shares the same persistent SQLite database as the compiled containerized deployment.

#### Scenario: Dev mode uses the shared data volume

- **WHEN** a development container is started via the compose override with `DATABASE_PATH=/data/app.db` and the shared `data` volume
- **THEN** the dev server writes to the same database the compiled app uses

#### Scenario: Code changes restart the dev server

- **WHEN** a source file is edited while the dev container is running
- **THEN** the dev server restarts automatically and serves the updated code on the next request