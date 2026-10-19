# Frontend

React + TypeScript + Vite single-page app for the intraday backend.

## Scripts

- `npm run dev` – start the dev server on http://localhost:5173
- `npm test` – run unit tests (Vitest)
- `npm run build` – typecheck and build to `dist/`
- `npm run lint` – run ESLint

## Configuration

- `VITE_API_BASE_URL` – backend origin, defaults to `http://localhost:3000`. The backend must allow this app's origin via its `CORS_ORIGIN` setting (defaults to `http://localhost:5173`).
