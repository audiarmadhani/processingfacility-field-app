# BTM Field App (PWA)

Mobile-first field app for fermentation daily check-ins and GB QC roast/cupping capture (BTM HEQA platform).

**Repository:** [github.com/audiarmadhani/processingfacility-field-app](https://github.com/audiarmadhani/processingfacility-field-app)

## How it connects to data

This app does **not** use the Supabase JavaScript client directly (unlike the driver app for some features).

```
BTM Field PWA  →  Express API (Render)  →  PostgreSQL (Supabase)
```

- **Auth:** `POST /api/login` on the platform backend (users table in Postgres)
- **Data:** fermentation, roast, cupping endpoints on the same backend
- **Env:** only `NEXT_PUBLIC_API_BASE_URL` is required — point it at Render, not Supabase

## Features

- Home screen with pending/overdue fermentation check-ins
- Full-screen fermentation check-in with camera or photo upload
- GB QC pipeline lists for roast and cupping
- Bottom navigation, large touch targets, installable PWA

## Local development

```bash
cd field-app
cp .env.example .env.local
# Set AUTH_SECRET in .env.local
npm install
npm run dev
```

Runs at [http://localhost:3002](http://localhost:3002).

Ensure the platform backend allows `http://localhost:3002` in CORS (configured in `backend/server.js`).

## Deploy on Vercel

1. Push this folder as its own repository (recommended) or deploy `field-app/` as the project root.
2. Set environment variables from `.env.example`.
3. **Do not use `AUTH_URL=http://localhost:3002` on Vercel.** Either omit `AUTH_URL` or set it to your production URL.
4. Set `AUTH_TRUST_HOST=true` and a strong `AUTH_SECRET`.
5. Add `FIELD_APP_ORIGIN=https://your-field-app.vercel.app` on the **platform backend** (Render) and redeploy backend for CORS.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | Yes | Express API base URL |
| `AUTH_SECRET` | Yes | NextAuth secret |
| `AUTH_TRUST_HOST` | Yes (Vercel) | `true` |
| `AUTH_URL` | Local only | e.g. `http://localhost:3002` |

## Roles

- Fermentation: `admin`, `manager`, `staff`
- GB QC roast/cupping: `admin`, `manager`, `postprocessing`

Uses the same `/api/login` credentials as the main platform.
