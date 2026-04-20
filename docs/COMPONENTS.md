# Frontend Components Reference

This document lists **React components** under `src/components/` with **props** and typical **usage**. Page-level files live in `src/pages/` and are summarized at the end.

**Related:** [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md) · [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## Layout (`src/components/layout/`)

### `AppLayout`

Wraps authenticated pages with sidebar, top nav, optional filter bar, and `FilterProvider`.

| Prop | Type | Description |
|------|------|-------------|
| `children` | `React.ReactNode` | Page content |

---

### `Sidebar`

| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | `boolean` | Mobile drawer open |
| `onClose` | `() => void` | Close drawer |
| `isCollapsed` | `boolean` | Narrow rail mode |
| `onToggleCollapse` | `() => void` | Toggle collapse |

Renders role-based links (admin vs sales).

---

### `TopNav`

| Prop | Type | Description |
|------|------|-------------|
| `onToggleSidebar` | `() => void` | Open mobile sidebar |
| `isSidebarCollapsed` | `boolean` | Adjust layout |

---

### `FilterBar`

Admin-only global filters (date range, platform, rep, ad). Hidden on non-admin routes.

| Prop | Type | Description |
|------|------|-------------|
| `isSidebarCollapsed` | `boolean` | Optional; adjusts fixed positioning width |

Uses `useFilter()` internally.

---

### `NotificationBell`

No props. Subscribes to `notifications` for current user; mark read; navigate on click.

---

## Dashboard (`src/components/dashboard/`)

### `KPICards`

| Prop | Type | Description |
|------|------|-------------|
| `reports` | `any[]` | Filtered reports for KPI aggregation |

---

### `ChartsGrid`

| Prop | Type | Description |
|------|------|-------------|
| `reports` | `any[]` | Filtered reports; builds funnel, daily, platform, rep charts |

---

### `DashboardChartCard`

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Card title |
| `subtitle` | `string` | Optional |
| `children` | `ReactNode` | Chart body |
| `fullWidth` | `boolean` | Optional; spans 2 columns on large screens |

---

### `DailyConversionChart`

| Prop | Type | Description |
|------|------|-------------|
| `data` | `DailyBucket[]` | From `buildDailyBuckets` (`dashboard-analytics.ts`) |

---

### `SalesRepComparisonChart`

| Prop | Type | Description |
|------|------|-------------|
| `data` | `SalesRepBucket[]` | From `buildSalesRepBuckets` |

---

### `LeakCausesPieChart`

| Prop | Type | Description |
|------|------|-------------|
| `data` | `LeakPieSlice[]` | From `buildLeakCausesPieData` |

---

### `TeamStatusSummary`

| Prop | Type | Description |
|------|------|-------------|
| `allReports` | `any[]` | Unfiltered or full list for “who filed today” |

---

### `RecentActivity`

| Prop | Type | Description |
|------|------|-------------|
| `reports` | `any[]` | Recent rows for activity list |

---

### `SmartInsightsSection`

| Prop | Type | Description |
|------|------|-------------|
| `reports` | `any[]` | Heuristic insights (not Gemini) |

---

### `RecommendationsSection`

| Prop | Type | Description |
|------|------|-------------|
| `reports` | `any[]` | Rule-based recommendation cards |

---

### `RejectionAnalyticsSection`

| Prop | Type | Description |
|------|------|-------------|
| `reports` | `any[]` | Aggregates `rejectionReasons` for charts + word cloud |

---

### `DealCycleSection`

No props. Loads **all** deals via `getAllDeals()` and shows company + per-team cycle stats (`computeDealCycleStats`).

---

## Team (`src/components/team/`)

### `PerformanceTab`

| Prop | Type | Description |
|------|------|-------------|
| `users` | `any[]` | Active team members |
| `reports` | `any[]` | **Filtered** reports for stats |
| `allReports` | `any[]` | Unfiltered for “last report” timestamp |
| `onEdit` | `(user: any) => void` | Open edit modal |

---

### `AttendanceTab`

| Prop | Type | Description |
|------|------|-------------|
| `users` | `any[]` | Team members |
| `reports` | `any[]` | Reports for grid |

---

### `AddMemberModal`

| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | `boolean` | |
| `onClose` | `() => void` | |

Adds Firestore `users` row (no Auth user creation).

---

### `EditMemberModal`

| Prop | Type | Description |
|------|------|-------------|
| `user` | `any` | Member to edit |
| `isOpen` | `boolean` | |
| `onClose` | `() => void` | |

---

### `ExcusesTab`

| Prop | Type | Description |
|------|------|-------------|
| `excuses` | `any[]` | Excuse documents |
| `users` | `any[]` | For name lookup |

**Note:** Not currently wired in `TeamPage` routes.

---

## Ads (`src/components/ads/`)

### `AdMatrixChart`

| Prop | Type | Description |
|------|------|-------------|
| `ads` | `any[]` | Processed ad stats |

---

### `AdCardsList`

| Prop | Type | Description |
|------|------|-------------|
| `ads` | `any[]` | Same |

---

### `AdsSummaryRow`

| Prop | Type | Description |
|------|------|-------------|
| `ads` | `any[]` | Summary strip |

---

### `AdsAggregator.ts`

Not a React component — **pure functions** (`getAdsDeepStats(reports)`).

---

## Insights (`src/components/insights/`)

### `InsightResultPanel`

| Prop | Type | Description |
|------|------|-------------|
| `result` | `AIInsightsResult` | Gemini output bundle |
| `reportName` | `string` | Editable save title |
| `onReportNameChange` | `(name: string) => void` | |
| `onSave` | `() => void` | Persist to Firestore |
| `isSaving` | `boolean` | |
| `showSave` | `boolean` | Optional; default true |

---

### `SavedInsightsList`

| Prop | Type | Description |
|------|------|-------------|
| `reports` | `SavedInsightReport[]` | Saved rows |
| `onOpen` | `(report: SavedInsightReport) => void` | |
| `onDelete` | `(id: string) => void` | |

---

### `InsightItem`

| Prop | Type | Description |
|------|------|-------------|
| `item` | `AIInsightItem` | Single insight |
| `variant` | `"critical"` \| `"positive"` | Styling |

---

### `RecommendationCard`

| Prop | Type | Description |
|------|------|-------------|
| `rec` | `AIRecommendation` | |

---

### `Pill`

| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | |
| `value` | `string \| number` | |

---

## Reports (`src/components/reports/`)

### `ReportDetailModal`

| Prop | Type | Description |
|------|------|-------------|
| `report` | `any` | Report document |
| `isOpen` | `boolean` | |
| `onClose` | `() => void` | |

---

## Sales (`src/components/sales/`)

### `AccountabilitySystem`

Blocks UX until missing daily report is addressed (sales).

| Prop | Type | Description |
|------|------|-------------|
| `onClear` | `() => void` | Dismiss when resolved |
| `onSetForcedDate` | `(dateStr: string) => void` | Pre-fill submit date |

---

## UI (`src/components/ui/`)

### `Button`

Extends `ButtonHTMLAttributes<HTMLButtonElement>`.

| Prop | Type | Description |
|------|------|-------------|
| `variant` | `"primary"` \| `"gradient"` \| `"outline"` \| `"ghost"` | Default `primary` |
| `children` | `ReactNode` | Label |
| `icon` | `string` | Material symbol name |
| `iconPosition` | `"left"` \| `"right"` | Default `right` |
| `className` | `string` | Extra classes |

---

### `EmptyState`

No props. Generic empty dashboard placeholder.

---

### `KpiCard`

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | |
| `value` | `string \| number` | |
| `trend` | `string` | Optional |
| `trendDirection` | `"up"` \| `"down"` \| `"neutral"` | Optional |
| `iconName` | `string` | |
| `colorType` | string | Default `"primary"` |

---

## Root components

### `ProductPicker`

| Prop | Type | Description |
|------|------|-------------|
| `selected` | `string[]` | Selected product IDs |
| `onChange` | `(ids: string[]) => void` | |
| `allowedIds` | `string[]` | Optional filter list |

---

## Pages (`src/pages/`)

Route components (not under `components/`):

| File | Route(s) | Role | Purpose |
|------|----------|------|---------|
| `LoginPage` | `/login` | Public | Email + Google login |
| `DashboardPage` | `/dashboard` | Admin+ | Main analytics |
| `TeamPage` | `/team` | Admin+ | Performance + attendance |
| `ReportsPage` | `/reports` | Admin+ | All reports list |
| `AdsAnalysisPage` | `/ads` | Admin+ | Deep ad analysis |
| `InsightsPage` | `/insights` | Admin+ | Gemini insights + saved |
| `SettingsPage` | `/settings` | Superadmin | Users, courses, cleanup |
| `AccessPage` | `/access` | Admin+ | Create Auth users |
| `DealsAnalyticsPage` | `/deals-analytics` | Admin+ | Deal KPIs and charts |
| `SubmitReportPage` | `/submit-report` | Sales | Parse + save report |
| `MyReportsPage` | `/my-reports` | Sales | Own history |
| `DealsPage` | `/deals` | Sales | Enter deals |
| `MyDealsPage` | `/my-deals` | Sales | Own deals |
| `AdvancedMetricsPage` | *(not in `App.tsx`)* | — | Orphan / unused |

---

## Hooks (related, `src/lib/hooks/`)

| Hook | Role |
|------|------|
| `useReports` | Firestore reports + filters |
| `useDashboardStats` | Derived KPIs |
| `useAdsAnalysis` | Per-ad analytics |
| `useAttendance` | Missing days for sales |
| `useCourses` | Live `courses` collection |

---

## Context (`src/lib/`)

| Context | Provides |
|---------|----------|
| `AuthProvider` | `user`, `loading`, `signInWithGoogle`, `signInWithEmail`, `signOut` |
| `FilterProvider` | `filter`, `updateFilter`, `resetFilter` (used inside `AppLayout`) |
