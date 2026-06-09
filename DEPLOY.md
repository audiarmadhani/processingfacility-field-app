# Deploy BTM Field PWA

## Vercel

1. Create a new GitHub repository from `field-app/` (see [REPOSITORY.md](REPOSITORY.md)).
2. Import the repo in Vercel with the **repository root** as the project root.
3. Set environment variables:
   - `NEXT_PUBLIC_API_BASE_URL` = `https://processing-facility-backend.onrender.com`
   - `AUTH_SECRET` = strong random string
   - `AUTH_TRUST_HOST` = `true`
   - Do **not** set `AUTH_URL` to localhost on Vercel.
4. Deploy.

## Render (backend CORS)

On the platform backend service, add:

```
FIELD_APP_ORIGIN=https://your-field-app.vercel.app
```

Redeploy the backend after saving.

## Verify on mobile

1. Open the production URL in Safari (iOS) or Chrome (Android).
2. Sign in with a platform account.
3. Use **Add to Home Screen** / **Install app**.
4. Test fermentation check-in (camera permission) and QC roast/cupping save.

## Local smoke test

```bash
cd field-app
cp .env.example .env.local
# Set AUTH_SECRET in .env.local
npm run dev
```

Open http://localhost:3002 and ensure the backend is running with CORS for `http://localhost:3002`.
