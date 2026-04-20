# Technical Audit Report — ISE Sales Dashboard

**Scope:** Full-stack review of the repository as implemented (React/Vite SPA + Firebase + client-side Gemini).  
**Method:** Static analysis of `src/`, configuration, `firestore.rules`, and `package-lock.json` (resolved versions).  
**Limitations:** No production runtime profiling, penetration test, or dependency vulnerability scan (e.g. `npm audit`) was executed in this pass—recommend running those in CI.

---

## Executive summary

The codebase is a **single-tenant** sales operations dashboard with **heavy use of Firestore real-time listeners** and **Gemini in the browser**. TypeScript `strict` mode is enabled, but **`any` is used widely**, there are **no automated tests**, and **several security and scalability risks** stem from exposing API keys and lacking tenant isolation. Overall engineering is **adequate for a small internal tool** but would require structural changes before **multi-company (100+) SaaS** deployment.

| Area | Rating (1–5) | Notes |
|------|--------------|--------|
| Code quality | **3/5** | Clear feature folders; weak typing and inconsistent data access patterns. |
| Architecture / patterns | **3/5** | Sensible separation of services/utils; missing repository layer and tests. |
| Error handling | **2.5/5** | Mostly `try/catch` + `console.error` / toasts; no global boundary. |
| Performance | **3/5** | Risk of full-collection reads and unbounded listeners at scale. |
| Security | **2/5** | Client Gemini keys, superadmin bootstrap, route-only auth for UI. |
| Scalability / multi-tenant | **2/5** | No `organizationId`; single Firestore namespace. |

---

## 1. Code quality

### Strengths

- **TypeScript with `strict: true`** (`tsconfig.json`)—good baseline.
- **Logical layout:** `pages/`, `components/`, `lib/services`, `lib/utils`, `lib/hooks` are easy to navigate.
- **Feature grouping:** Dashboard analytics, deals, insights, and ads are separated into modules.
- **Path alias `@/`** reduces deep relative imports.

### Issues

1. **Pervasive `any`**  
   Heavy use of `any` for reports, users, and Firestore payloads (`useDataFetching`, dashboard utils, modals) reduces compile-time safety and makes refactors risky.

2. **No ESLint / Prettier in `package.json`**  
   No enforced style, import order, or React hooks lint rules—consistency relies on convention.

3. **Dead or unused abstractions**  
   Examples: `customDateFrom` / `customDateTo` on filter state are not wired into `filterReports()`; `getDashboardPreviousPeriodReports()` appears unused in `src/` (helpers without consumers).

4. **Inconsistent field names**  
   Firestore `users` may use `addedAt` vs `createdAt`/`orderBy("createdAt")` in `useTeamMembers`—risk of empty queries or missing indexes depending on actual documents.

5. **Duplicate business logic**  
   Funnel aggregation and interaction counting appear in multiple places (`dashboard-aggregations`, `AdsAggregator`, `useAdsAnalysis`, AI insights service)—drift risk if one path is updated and others are not.

6. **Orphan UI**  
   `ExcusesTab` and `AdvancedMetricsPage` exist but are not integrated into the main route tree (maintenance burden).

7. **No automated tests**  
   No `*.test.ts` / `*.spec.tsx` files were found—regressions in financial or analytics logic would not be caught automatically.

---

## 2. Design patterns

### Patterns in use

| Pattern | Where | Assessment |
|---------|--------|------------|
| **React Context** | `AuthProvider`, `FilterProvider` | Appropriate for auth and global filters; could cause unnecessary re-renders if context grows. |
| **Custom hooks** | `useReports`, `useAttendance`, `useCourses`, etc. | Good encapsulation of Firestore + derived state. |
| **Service modules** | `deals-service`, `customers-service`, `gemini-parser`, `ai-insights-service` | Thin wrappers over Firestore/Gemini—good separation. |
| **Presentational vs container** | Partially | Many pages mix data loading, effects, and layout in one file. |
| **Protected routes** | `App.tsx` `ProtectedRoute` | Role checks in UI only—must be duplicated by Firestore rules (they are, but see security). |

### Patterns recommended (not yet present)

- **Repository / data access layer** with typed Firestore DTOs and mappers (single place for `any` → domain types).
- **Error boundary** React component for async/Firestore failures in subtrees.
- **Query layer** for Firestore: pagination, `limit()`, and explicit composite indexes documented in `firebase.indexes.json` (if missing, runtime failures).
- **Feature flags / config service** for thresholds and dates instead of constants scattered in code.
- **Testing pyramid:** unit tests for pure functions in `lib/utils`, integration tests for critical flows (auth, submit report).

---

## 3. Error handling

### Current behavior

- **Auth:** `signInWithGoogle` bootstrap failure → sign out + `throw new Error("unregistered")`; login page maps Firebase error codes to UI states.
- **Firestore:** Many `try/catch` blocks log with `console.error` or show `alert` / toast (e.g. `ExcusesTab`, `AccessPage`, `SettingsPage`).
- **Gemini:** `ai-insights-service` / `gemini-parser` return structured failure codes (`no_api_key`, `gemini_failed`, etc.)—good for UX messaging.
- **Hooks:** `useReports` passes snapshot errors to `error` state; not all consumers may surface them.

### Gaps

- **No global error handler** (e.g. `react-error-boundary` or Sentry) for render failures.
- **Inconsistent user feedback:** mix of `alert`, inline text, toasts, and silent `console.error`.
- **No retry/backoff** for transient Firestore or Gemini network failures (except key rotation hints in AI service).
- **Batch operations** (Settings cleanup) can fail mid-way—partial deletes possible.

---

## 4. Performance

### Likely bottlenecks (as code grows)

| Issue | Location / pattern | Impact |
|-------|-------------------|--------|
| **Full collection reads** | `FilterBar`: `getDocs(collection(db, "reports"))` to build ad names | O(n) documents per mount; costly with large `reports`. |
| **Multiple full listeners** | `DashboardPage`, `AdsAnalysisPage`, `ReportsPage` each `onSnapshot` entire `reports` (admin) | Duplicate bandwidth and client CPU; same data fetched multiple times. |
| **Broad snapshots** | `TeamPage`: `onSnapshot(collection(db, "users"))` | All user docs in real time. |
| **Client-side filtering** | `useReports` loads all matching query then filters by date in JS | Does not scale with document count; should use Firestore date range queries + indexes. |
| **Charts** | Recharts on large datasets | Re-renders on every snapshot update; memoization helps but not a substitute for server-side aggregation. |
| **AI context size** | Large `buildInsightsContext` strings | Approaches model token limits with many reports. |

### Positive notes

- **Memoization** (`useMemo`) used in analytics and chart data pipelines.
- `insights-firestore` uses `limit()` + `orderBy` for saved insights.

---

## 5. Security

### High severity

1. **Gemini API key in the client (`VITE_GEMINI_*`)**  
   Keys are bundled into the browser bundle. Anyone can extract and abuse them. **Mitigation:** proxy calls through Cloud Functions / Cloud Run with secret manager; add App Check; rate limit.

2. **Superadmin auto-bootstrap on Google sign-in** (`auth-context.tsx`)  
   If a user is not in Firestore, the app attempts `setDoc(..., { role: "superadmin" })`. In production this is a **critical privilege escalation** if rules ever allow it or during misconfiguration. **Mitigation:** remove/disable in production; use only admin seed scripts.

### Medium severity

3. **Firebase Security Rules are the real enforcement**  
   UI route guards are not security. Ensure rules stay strict; any client-only check is bypassable.

4. **Secondary Firebase app for user creation** (`AccessPage`)  
   Creates Auth users with email/password; secondary app is deleted after use—good pattern, but errors must not leak credentials in logs.

5. **No App Check**  
   Firestore and Auth are callable from any origin with valid keys—**App Check** + API key restrictions recommended.

6. **XSS**  
   User-generated content (reports, notes) rendered in React generally escapes text; audit any `dangerouslySetInnerHTML` (none found in quick scan—still verify for rich text).

### Low / operational

7. **Secrets in `.env`**  
   Standard for Vite; ensure `.env` is never committed (already gitignored pattern).

---

## 6. Scalability — “100+ companies”

The project is **not** multi-tenant today. A single Firestore project holds all data; **no `organizationId` / `tenantId`** on documents.

### What breaks or becomes unsafe

| Concern | Why |
|--------|-----|
| **Data isolation** | Without tenant scoping, one company’s rules/queries must never leak another’s—**Firestore rules would need a complete rewrite** (e.g. `resource.data.orgId == getUserOrg()`). |
| **Auth model** | Firebase Auth is global per project; you’d need **custom claims** or a **users/{orgId}/...** mapping strategy. |
| **Billing & quotas** | Gemini and Firestore usage are per project; **per-tenant billing** requires metering and possibly separate projects or subaccounts. |
| **Indexes** | Firestore composite indexes explode with multi-field queries per tenant; **query patterns must be parameterized**. |
| **Admin UX** | Superadmin “delete all data” in Settings would wipe **all tenants** unless scoped. |
| **Cost** | Full `reports` listeners per admin page × N tenants = **unsustainable**; move to **aggregated** collections or BigQuery/Cloud Functions rollups. |

**Minimum viable path to multi-tenant:** introduce `organizationId` on every document, Auth custom claims, rules that enforce org match, and a **backend** for Gemini + sensitive operations.

---

## 7. Hard-coded values that should be dynamic

| Value | Location / context | Suggestion |
|-------|-------------------|------------|
| `DASHBOARD_DATA_QUALITY_FROM_DATE` | `src/lib/config.ts` | Remote config / Firestore `settings` doc + admin UI. |
| `DASHBOARD_IGNORED_AD_NAMES` (`عام`, `طموح`) | `dashboard-aggregations.ts` | Configurable “ignored ad labels” list. |
| KPI color thresholds (`15%`, `5%`) | `KPICards.tsx` | Settings or constants module with documentation. |
| Smart insights thresholds (`60%`, `50%`, `5%`, `3`, `0.1`) | `SmartInsightsSection`, `RecommendationsSection` | Config-driven or env-based. |
| Ads aggregator (`15%` confusion, `0.5×` team avg) | `AdsAggregator.ts` | Same. |
| `minTotal = 5` (best ad) | `findBestAdByConversion` | Parameter from settings. |
| `RATE_LIMIT` / cache TTLs | `ai-insights-service` (if present) | Config. |
| Working week / attendance (Friday skip, 16:00) | `useAttendance`, `PerformanceTab` | Business calendar + timezone per org. |
| Default company name / ad presets | `SettingsPage` local state | Persisted settings (currently partially mock). |
| Arabic copy / labels | Throughout | i18n if product goes multi-language. |
| `COLLECTIONS` for cleanup | `SettingsPage` | Dangerous operation—confirm list + tenant scope. |

---

## 8. Dependencies and versions

### Direct dependencies (`package.json` range → **resolved** in `package-lock.json`)

| Package | `package.json` | Resolved (lockfile) |
|---------|----------------|---------------------|
| `@google/generative-ai` | ^0.24.1 | **0.24.1** |
| `date-fns` | ^4.1.0 | **4.1.0** |
| `firebase` | ^12.11.0 | **12.11.0** |
| `react` | ^19.0.0 | **19.2.4** |
| `react-dom` | ^19.0.0 | **19.2.4** |
| `react-router-dom` | ^7.5.0 | **7.14.0** |
| `recharts` | ^3.8.1 | **3.8.1** |

### Direct devDependencies

| Package | `package.json` | Resolved (lockfile) |
|---------|----------------|---------------------|
| `@tailwindcss/postcss` | ^4 | (see `@tailwindcss/*` nested) |
| `@tailwindcss/vite` | ^4 | (see `@tailwindcss/*` nested) |
| `@types/react` | ^19 | (types packages) |
| `@types/react-dom` | ^19 | (types packages) |
| `@vitejs/plugin-react` | ^4.4.1 | **4.7.0** |
| `tailwindcss` | ^4 | **4.2.2** |
| `typescript` | ^5.7.2 | **5.9.3** |
| `vite` | ^6.3.1 | **6.4.1** |

### Notable transitive dependencies (examples)

- `react-router` **7.14.0** (peer: Node `>=20`).
- Recharts pulls **Redux Toolkit**, **immer**, **d3-*** packages for charts.
- Firebase bundles multiple `@firebase/*` packages (see lockfile under `firebase`).

### Missing from tooling (recommended)

- **eslint** + **@typescript-eslint** + **eslint-plugin-react-hooks**
- **prettier**
- **vitest** or **jest** + **@testing-library/react**
- **husky** + **lint-staged** (optional CI gates)

---

## 9. Prioritized recommendations

1. **Remove or gate superadmin bootstrap** in production builds.  
2. **Move Gemini calls server-side** (Cloud Functions) and rotate keys; add **Firebase App Check**.  
3. **Introduce typed domain models** for `Report`, `Deal`, `User` and reduce `any`.  
4. **Replace full `getDocs(reports)`** in FilterBar with a bounded query, Cloud Function, or precomputed distinct ad names.  
5. **Centralize Firestore subscriptions** (e.g. one context provider for reports) to avoid duplicate listeners.  
6. **Add ESLint + tests** for `lib/utils` and critical auth/report flows.  
7. **For multi-tenant:** design `organizationId` + custom claims + rules **before** any customer data is migrated.

---

*End of technical audit report.*
