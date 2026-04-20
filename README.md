# ISE Sales Dashboard

Arabic (RTL) sales operations dashboard: daily funnel reports parsed with **Google Gemini**, analytics on **Firebase**, and role-based access for sales reps and admins.

**Documentation:** [Architecture](./docs/ARCHITECTURE.md) · [Database](./docs/DATABASE.md) · [API](./docs/API.md) · [Components](./docs/COMPONENTS.md) · [Business logic](./docs/BUSINESS_LOGIC.md) · [Deployment](./docs/DEPLOYMENT.md)

---

## Prerequisites

- **Node.js** 18, 20, or ≥22 (see Vite `engines`; `react-router-dom` 7 resolves with Node ≥20 recommended)
- **npm** (or pnpm/yarn)
- A **Firebase** project with **Authentication** (Email/Password + Google) and **Cloud Firestore** enabled
- A **Google AI (Gemini) API key** for report parsing and AI insights (see [API](./docs/API.md))

---

## Quick start

```bash
# Clone and enter the project
cd "ise-sales-dashboard"

# Install dependencies
npm install

# Environment variables (copy and fill from Firebase + Gemini)
cp .env.example .env
```

Edit `.env` and set:

| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket (required in config) |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID |
| `VITE_FIREBASE_APP_ID` | App ID |
| `VITE_GEMINI_API_KEY` | Primary Gemini API key |
| `VITE_GEMINI_API_KEY_1`, `VITE_GEMINI_API_KEY_2`, … | Optional rotation keys |

```bash
# Development server (http://localhost:5173 by default)
npm run dev

# Production build
npm run build

# Preview production build locally
npm run preview
```

---

## Firebase setup (summary)

1. Create a Firebase project; enable **Firestore** and **Authentication** (Email/Password + Google).
2. Deploy **`firestore.rules`** from this repo (Firebase Console → Firestore → Rules, or Firebase CLI).
3. Create at least one user document in `users` (or use the documented Google bootstrap flow in development—see [Technical audit](./docs/TECHNICAL_AUDIT.md) for security notes).
4. For **production**, restrict Gemini usage and consider moving AI calls server-side; **never** commit real `.env` files.

---

## Scripts

| Script | Command |
|--------|---------|
| Dev server | `npm run dev` |
| Typecheck + build | `npm run build` |
| Preview build | `npm run preview` |

---

## Project structure (overview)

```
src/
  App.tsx              # Routes and role guards
  main.tsx             # React root, AuthProvider, Router
  pages/               # Screen-level pages
  components/          # UI (layout, dashboard, team, ads, insights, …)
  lib/
    firebase.ts        # Firebase init
    auth-context.tsx   # Auth + Firestore profile
    services/          # Firestore + Gemini services
    hooks/             # Data hooks
    utils/             # Aggregations, dates, filters
```

---

## License / ownership

Private project (`"private": true` in `package.json`). Adjust as needed for your organization.

---

## Contributing

- TypeScript is strict-enabled; prefer explicit types over `any` for new code.
- Run `npm run build` before committing to ensure the project compiles.

For business rules and metrics definitions, see **[docs/BUSINESS_LOGIC.md](./docs/BUSINESS_LOGIC.md)**.
