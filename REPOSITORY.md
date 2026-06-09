# Separate repository

This app is intended to live in its own GitHub repository, e.g. `processing-facility-field-app`, following the same pattern as `processing-facility-driver-app`.

To publish:

```bash
cd field-app
git init
git remote add origin git@github.com:audiarmadhani/processing-facility-field-app.git
git add .
git commit -m "Initial BTM Field PWA"
git push -u origin main
```

Then import the repository root on Vercel.
