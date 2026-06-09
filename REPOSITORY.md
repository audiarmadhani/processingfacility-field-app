# Separate repository

This app lives in its own GitHub repository:

**https://github.com/audiarmadhani/processingfacility-field-app**

Clone and develop from that repo (not from `field-app/` in the platform monorepo unless syncing changes).

```bash
git clone https://github.com/audiarmadhani/processingfacility-field-app.git
cd processingfacility-field-app
cp .env.example .env.local
npm install && npm run dev
```

Import the repository root on Vercel for deployment.
