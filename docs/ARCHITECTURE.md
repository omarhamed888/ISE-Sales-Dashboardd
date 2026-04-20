# System Architecture

ISE Sales Dashboard is a **single-page application (SPA)** built with **Vite + React 19**. There is **no dedicated backend repository** in this project: persistence and auth use **Firebase** (Auth + Firestore), and **Google Gemini** is called from the **browser** for NLP parsing and insights.

**Related:** [README.md](../README.md) · [DATABASE.md](./DATABASE.md) · [API.md](./API.md)

---

## High-level architecture

```mermaid
flowchart TB
  subgraph client [Browser — React SPA]
    UI[Pages and components]
    CTX[AuthContext / FilterContext]
    SVC[lib/services — Firestore + Gemini SDK]
    UI --> CTX
    UI --> SVC
  end

  subgraph Firebase [Google Firebase]
    AUTH[Firebase Authentication]
    FS[Cloud Firestore]
    HOST[Firebase Hosting]
  end

  subgraph GoogleAI [Google AI]
    GEM[Gemini API]
  end

  SVC --> AUTH
  SVC --> FS
  SVC --> GEM
  HOST -.-> client
```

---

## Layered view

```mermaid
flowchart LR
  subgraph presentation [Presentation]
    P[pages/*]
    C[components/*]
  end

  subgraph application [Application state]
    AC[auth-context]
    FC[filter-context]
    H[hooks — useReports, useCourses, …]
  end

  subgraph domain [Domain / logic]
    U[utils — aggregations, filters, dates]
    SV[services — deals, customers, parsers, insights]
  end

  subgraph infrastructure [Infrastructure]
    FB[firebase.ts]
  end

  P --> C
  P --> H
  C --> H
  H --> SV
  H --> FB
  SV --> FB
  SV --> U
  AC --> FB
```

---

## Routing and access control

```mermaid
flowchart TD
  A[User visits URL] --> B{Authenticated?}
  B -->|No| L[/login]
  B -->|Yes| C{ProtectedRoute}
  C --> D{Role matches allowedRoles?}
  D -->|No| R[Redirect to role home]
  D -->|Yes| E[AppLayout + page]
```

- **Route guards** live in `src/App.tsx` (`ProtectedRoute`); **authorization** for data is enforced by **Firestore security rules** (`firestore.rules`).
- **Sales** users are routed toward `/submit-report` at `/`; **admin/superadmin** toward `/dashboard`.

---

## Data flow (reports)

```mermaid
sequenceDiagram
  participant U as Sales user
  participant SP as SubmitReportPage
  participant G as Gemini parser
  participant FS as Firestore

  U->>SP: Paste text / form
  SP->>G: parseReport(text)
  G-->>SP: ParsedReportData JSON
  U->>SP: Confirm + save
  SP->>FS: addDoc(reports)
  Note over FS: Admin dashboards subscribe to reports
```

---

## Data flow (deals)

```mermaid
sequenceDiagram
  participant U as User
  participant P as DealsPage / MyDealsPage
  participant DS as deals-service
  participant CS as customers-service
  participant FS as Firestore

  U->>P: Enter deal
  P->>DS: saveDeals / updateDeal
  DS->>CS: getOrCreateCustomerId(name)
  CS->>FS: customers query + optional addDoc
  DS->>FS: batch writes deals
```

---

## Build and deployment

```mermaid
flowchart LR
  SRC[Source TS/TSX] --> VITE[Vite build]
  VITE --> OUT[dist/ static assets]
  OUT --> FH[Firebase Hosting]
```

- `firebase.json` configures **Firebase Hosting** with optional **frameworks backend** region (`europe-west1`). There is **no** Cloud Functions code in this repo.

---

## Key design decisions

| Decision | Rationale |
|----------|-----------|
| **Client-only API calls to Gemini** | Simplicity; **trade-off:** API keys exposed in browser (mitigate with server proxy + App Check in production). |
| **Firestore as single source of truth** | Real-time updates via `onSnapshot` for dashboards. |
| **Parsed funnel in `reports.parsedData`** | Flexible JSON from Gemini; aggregations in `lib/utils`. |
| **Separate `deals` collection** | Closed-won revenue and cycle metrics independent of daily funnel reports. |

---

## External dependencies (conceptual)

- **Firebase Auth:** identity; **Firestore:** documents and security rules.
- **Gemini:** structured extraction and AI insight JSON.
- **Recharts:** charts; **date-fns:** formatting in insights UI.

---

## Files and modules map

| Area | Path |
|------|------|
| Entry | `src/main.tsx`, `src/App.tsx` |
| Firebase | `src/lib/firebase.ts` |
| Auth | `src/lib/auth-context.tsx` |
| Global filters | `src/lib/filter-context.tsx` |
| Aggregations | `src/lib/utils/dashboard-aggregations.ts`, `dashboard-analytics.ts`, `dashboard-filters.ts` |
| Firestore services | `src/lib/services/deals-service.ts`, `customers-service.ts`, `insights-firestore.ts` |
| AI | `src/lib/services/gemini-parser.ts`, `ai-insights-service.ts` |
