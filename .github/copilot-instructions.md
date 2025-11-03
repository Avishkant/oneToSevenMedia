## Purpose

Project-specific guidance for AI coding agents working in this workspace. The goal: make the frontend productive (already present in `client/`) and provide clear, actionable guidance for the backend under `server/` (server code and tests are present).

## Big picture (what you'll see)

- Frontend: `client/` — React + Vite (JSX), Tailwind plugin, ESM. Key files: `client/package.json`, `client/vite.config.js`, `client/eslint.config.js`, `client/src/*`.

  - Important files to inspect: `client/src/main.jsx`, `client/src/App.jsx`, `client/src/context/AuthContext.jsx`, `client/src/components/PrivateRoute.jsx`, and commonly used UI components in `client/src/components/`.

- Backend: `server/` — Node + Express code (CommonJS) with models, controllers, middleware and tests already present. Key dirs: `server/src/routes/`, `server/src/controllers/`, `server/src/models/`, `server/src/middleware/`, and `server/test/`.
  - The server uses `dotenv`, `mongoose`, `jsonwebtoken`, `cloudinary`, `multer`. Tests use `jest`, `supertest` and `mongodb-memory-server` so many tests run without a running MongoDB instance.

## Quick dev commands

Client (PowerShell):

```
cd client;
npm install;
npm run dev    # starts Vite dev server (HMR)
```

Build / preview / lint (client):

```
cd client;
npm run build;
npm run preview;
npm run lint;
```

Server (PowerShell):

```
cd server;
npm install;
npm run dev     # nodemon src/index.js
npm start       # node src/index.js
npm test        # run Jest tests (uses mongodb-memory-server)
```

## Conventions & patterns to follow

- Client is ESM (see `client/package.json` "type": "module"). Use modern JS and JSX; follow Tailwind utility-first styling. The Vite setup includes `@tailwindcss/vite` and React plugin.
- Server is implemented as classic Node/Express (no `type: module` in `server/package.json`), so expect CommonJS-style requires/exports in many server files.
- Auth & RBAC patterns: look at `server/src/middleware/auth.js`, `permissions.js`, `rbac.js` and `server/src/controllers/authController.js` for how JWTs and role checks are wired.
- Tests: server tests live in `server/test/*.test.js`. They use `mongodb-memory-server` so unit/integration tests do not require an external MongoDB instance.

## Integration & backend expectations (actionable)

- Vite proxy: if you run the API on another port, add a dev proxy to `client/vite.config.js` that forwards `/api` to the server (example: `/api` -> `http://localhost:4000`). This keeps calls from the frontend to `/api/*` in dev.
- Server layout (already present):

  - `server/src/index.js` — server bootstrap (starts the app using `src/app.js`).
  - `server/src/app.js` — Express app wiring (middleware, routes).
  - `server/src/routes/*` — route definitions wired to controllers.
  - `server/src/controllers/*` — controller functions (business logic entrypoints).
  - `server/src/models/*` — Mongoose schemas.
  - `server/src/middleware/*` — auth, RBAC and permission checks.

- Environment & secrets: the server uses `dotenv` — look for `.env` usage in `server/src/index.js`/`app.js`. Typical keys you may need to define: `MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CLOUDINARY_*`.

- Tests: run `cd server; npm test`. Tests spin up an in-memory MongoDB using `mongodb-memory-server` so they run in CI without a real DB.

## Where to look for examples and patterns

- Frontend boot & routing: `client/src/main.jsx`, `client/src/App.jsx`, `client/src/pages/`.
- Auth, contexts and toast UI: `client/src/context/AuthContext.jsx`, `client/src/context/ToastContext.jsx`, `client/src/components/PrivateRoute.jsx`.
- Server wiring: `server/src/index.js`, `server/src/app.js`.
- Auth and RBAC: `server/src/middleware/auth.js`, `server/src/middleware/permissions.js`, `server/src/middleware/rbac.js`, and `server/src/controllers/authController.js`.
- Tests and examples: `server/test/*.test.js` demonstrates how to write request-level tests using Jest + Supertest + mongodb-memory-server.

## First tasks for an AI agent (concrete, small wins)

1. Start the frontend and confirm it loads: `cd client; npm install; npm run dev`.
2. Start the server (separate terminal): `cd server; npm install; npm run dev` and open `http://localhost:<client-port>` (Vite default 5173) to confirm frontend can reach backend endpoints.
3. Run server tests locally: `cd server; npm test` — tests use an in-memory MongoDB.
4. If you need to develop the backend API and call it from the client during dev, add a Vite proxy in `client/vite.config.js` to forward `/api` to the server port.
5. When adding endpoints, add controller + route + model + tests and wire RBAC in `server/src/middleware/`.

## Notes & restrictions

- Document only what exists; this repo contains both `client/` and `server/` code. Do not change client build scripts without verifying locally.
- When editing server code, check `server/test/` for existing test patterns (Jest + Supertest). Add tests when changing public routes or auth logic.

If anything here is unclear or you want a small runnable snippet (Vite proxy example, Express bootstrap snippet, or a minimal `.env.example`), tell me which and I will add it.
