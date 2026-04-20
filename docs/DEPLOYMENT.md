# Deployment Guide

This project is a **static SPA** (Vite `dist/`) served by **Firebase Hosting** (config in `firebase.json`). There is **no** Cloud Functions or server in-repo; **Gemini** and **Firestore** are called from the **browser**.

**Prerequisites:** [README.md](../README.md) · [API.md](./API.md)

---

## 1. Pre-deployment checklist

1. **Firebase project** with Firestore and Authentication configured.
2. **`firestore.rules`** deployed and tested (staging first).
3. **Environment variables** set for the **production** build (see §3).
4. **Remove or disable** development-only behaviors (e.g. Google sign-in **superadmin bootstrap** in `auth-context.tsx`) for production—see [TECHNICAL_AUDIT.md](./TECHNICAL_AUDIT.md).
5. **Gemini keys:** Prefer **server-side proxy** + restricted keys; client-side keys are visible in the bundle.

---

## 2. Build the application

```bash
npm ci
cp .env.example .env.production.local
# Edit .env.production.local with production Firebase + Gemini keys

npm run build
```

Output directory: **`dist/`** (Vite default).

- `npm run build` runs **`tsc -b`** then **`vite build`** — fix TypeScript errors before deploying.

---

## 3. Environment variables (production)

Set the same **`VITE_*`** variables as local development. For CI/CD, inject them in the build step (GitHub Actions secrets, Firebase App Hosting env, etc.).

| Variable | Required |
|----------|----------|
| `VITE_FIREBASE_API_KEY` | Yes |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes |
| `VITE_FIREBASE_PROJECT_ID` | Yes |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes |
| `VITE_FIREBASE_APP_ID` | Yes |
| `VITE_GEMINI_API_KEY` | Yes (if using client-side AI) |
| `VITE_GEMINI_API_KEY_N` | Optional rotation |

**Important:** Any value prefixed with `VITE_` is **public** in the built JS. Do not put secrets that must stay server-only unless you use a backend.

---

## 4. Firebase Hosting

### 4.1 `firebase.json` (this repo)

The project uses Hosting with **frameworks** backend region:

```json
{
  "hosting": {
    "source": ".",
    "frameworksBackend": { "region": "europe-west1" }
  }
}
```

Deploy flows depend on whether you use **Firebase’s Vite integration** (`firebase deploy` with framework detection) or **static-only** deploy:

### 4.2 Static deploy (manual)

If you treat the app as pure static files:

1. Build: `npm run build`
2. Point Hosting **`public`** to `dist` (adjust `firebase.json` if needed—current file uses `"source": "."` for framework builds; verify against your Firebase CLI version and docs).

Example **static** `firebase.json` pattern (illustrative—align with your setup):

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

**SPA fallback:** Add a rewrite so client-side routes (`/dashboard`, etc.) load `index.html`.

### 4.3 CLI commands

```bash
npm install -g firebase-tools
firebase login
firebase use <your-project-id>
firebase deploy --only hosting
```

Also deploy rules:

```bash
firebase deploy --only firestore:rules
```

---

## 5. Authorized domains

In **Firebase Console → Authentication → Settings → Authorized domains**, add:

- Your Hosting domain (e.g. `yourapp.web.app`, custom domain).
- `localhost` for local dev (often present by default).

---

## 6. Firestore indexes

If queries fail in production with “index required”, open the **link** from the error in Firebase Console to create the composite index, or add **`firestore.indexes.json`** to the repo and deploy:

```bash
firebase deploy --only firestore:indexes
```

---

## 7. Post-deploy verification

- [ ] Login (email + Google) works on production domain.
- [ ] Role-based routes match expectations.
- [ ] Submit report → document appears in Firestore.
- [ ] Admin dashboard loads reports (listener + rules).
- [ ] Gemini parsing/insights (if enabled) returns without CORS/key errors.

---

## 8. Rollback

- Keep previous Hosting releases in Firebase; use **Hosting rollback** in console or redeploy a known-good `dist/` artifact from version control tags.

---

## 9. Scaling and hardening (recommended)

- **App Check** for Firebase.
- Move **Gemini** to **Cloud Functions** or **Cloud Run**; store API keys in **Secret Manager**.
- **Rate limiting** on AI endpoints.
- **Monitoring:** Firebase Performance, Error Reporting, or third-party APM.

For multi-tenant / SaaS, see architecture notes in [TECHNICAL_AUDIT.md](./TECHNICAL_AUDIT.md).
