## Purpose

Brief, project-specific guidance for AI coding agents working in this workspace. Focus: make the frontend productive (already present in `client/`) and kickstart the backend in `server/` (currently empty).

## Big picture (what you'll see)

- Frontend: `client/` — React + Vite (JSX), Tailwind plugin, ESM. Key files: `client/package.json`, `client/vite.config.js`, `client/eslint.config.js`, `client/src/*`.
- Backend: `server/` — empty placeholder. Project brief expects a Node.js + TypeScript backend (Express), MongoDB, Redis, Cloudinary, JWT auth, and RBAC, but the implementation is not yet in the repo.

## Quick dev commands (client)

- Install dependencies (run from `client/`):
  - PowerShell: `npm install`
- Start dev server (HMR): `npm run dev` (runs `vite` as defined in `client/package.json`).
- Build: `npm run build`.
- Lint: `npm run lint` (ESLint configured in `client/eslint.config.js`).

## Conventions & patterns to follow

- JavaScript + JSX (not full TypeScript in client yet). Files use ESM imports/exports.
- Tailwind classes are used inside JSX; the Vite config loads `@tailwindcss/vite` plugin (`client/vite.config.js`).
- ESLint uses an ESM config (`client/eslint.config.js`) and expects modern ECMAScript features and JSX.

## Integration & backend expectations (actionable)

- There is no API or proxy configured in `client/vite.config.js` — if you add a backend on a different port, add a Vite dev proxy to forward `/api` (example: add `server` running on port 4000 then proxy `/api` -> `http://localhost:4000`).
- Backend should be created under `server/` using a clear structure, e.g.:
  - `server/package.json`
  - `server/src/index.ts` (Express app bootstrap)
  - `server/src/routes/*`, `server/src/controllers/*`, `server/src/services/*`, `server/src/models/*`
- Follow the project brief for auth (JWT access + refresh), RBAC, and payment/audit flows — these are design goals but not yet implemented in code.

## Where to look for examples and patterns

- UI example and HMR flow: `client/src/App.jsx` (shows Vite + React patterns).
- Build/lint scripts: `client/package.json`.
- Vite plugin usage: `client/vite.config.js`.

## First tasks for an AI agent (concrete, small wins)

1. Run client locally and confirm dev server: `cd client; npm install; npm run dev`.
2. Create a backend skeleton in `server/` with `package.json` and a minimal Express app listening on port 4000.
3. Add a Vite proxy entry in `client/vite.config.js` to forward `/api` to the backend during development.
4. Commit small, well-scoped changes with clear commit messages and update this file if you add new developer commands.

## Notes & restrictions

- Document only what exists; this file points out that backend code is intentionally missing. Do not remove or change client build scripts unless you run and verify locally.
- Keep changes minimal and runnable: after any backend scaffold, verify the client can proxy and load assets.

If any of these sections are unclear or you'd like more precise examples (proxy snippet, Express bootstrap, or an initial git-committable backend scaffold), say which part and I will add it.
