# New Company Setup

## 1) Firebase Project
- Create a new Firebase project.
- Enable Authentication (Email/Password + Google).
- Create Firestore in production mode.
- Download service account JSON.

## 2) Environment
- Copy `.env.template` to `.env.<company>`.
- Fill all Firebase values.

## 3) Rules & Hosting
- Deploy rules:
  - `firebase deploy --only firestore:rules`
- Deploy app:
  - `firebase deploy --only hosting`

## 4) Seed Initial Data
- Run:
  - `npm run seed:company -- --company=\"Your Company\" --adminEmail=\"admin@company.com\" --serviceAccount=\"./serviceAccount.json\"`
- This creates:
  - `app_config/settings`
  - first `superadmin` user document

## 5) Verification Checklist
- Login with admin account works.
- Non-registered account is blocked.
- Disabled account is blocked.
- Dashboard and filters load.
- Settings page shows AI usage.

## 6) Troubleshooting
- If you see `ERR_BLOCKED_BY_CLIENT` for Firestore `Listen/Write` requests:
  - Disable ad/privacy blocker for the app domain (localhost or hosting URL), or whitelist Firebase domains.
  - Open DevTools in an Incognito window without extensions and retry.
- If you see `Missing or insufficient permissions`:
  - Confirm latest rules are deployed: `firebase deploy --only firestore`.
  - Sign out and sign in again to refresh auth state.
