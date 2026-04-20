# Sales Dashboard — Business Logic & Rules

This document describes how the ISE Sales Dashboard interprets data, computes metrics, applies filters, and enforces role-based behavior. It is derived from the application source code (`src/`) and Firestore security rules.

**Documentation suite:** [README.md](../README.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) · [DATABASE.md](./DATABASE.md) · [API.md](./API.md) · [COMPONENTS.md](./COMPONENTS.md) · [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 1. Sales metrics tracked

### 1.1 Daily sales reports (parsed funnel data)

Reports are the primary input. Each report carries **parsed** structured data (`parsedData`) produced by Gemini from free-text (or form) input.

| Metric / concept | Meaning in code |
|------------------|-----------------|
| **Total messages** (`totalMessages`) | Count of leads/messages for the business day (from parser; may also appear under `summary.totalMessages`). Reports with `totalMessages === 0` are excluded from most aggregates. |
| **Interactions (“تفاعل فعلي”)** | **Not** all funnel counts. By default: **sum of `count` on `repliedAfterPrice` only** (people who reached “reply after price”). Falls back to `parsedData.interactions` or `summary.interactions` if funnel shape differs. |
| **Conversion / closure rate (“معدل الإغلاق”)** | `interactions / totalMessages × 100`, rounded to **one decimal**, **capped at 100%**. |
| **Response rate (“معدل الرد”)** | `(totalMessages − funnel.greeting) / totalMessages × 100`, where `freeting` is aggregated **no-reply after greeting** counts. |
| **Funnel stage volumes** | Sums of per-ad counts in: `noReplyAfterGreeting`, `noReplyAfterDetails`, `noReplyAfterPrice`, `repliedAfterPrice` (with legacy aliases `noReplyGreeting`, etc.). |
| **Biggest drop stage** | Among greeting / details / price leak counts, the **stage with the maximum count** (dashboard hook `useDashboardStats`). |
| **Job confusion** (`jobConfusionCount`) | Count of people who confused the ad with a job posting; also expressed as **% of total messages** (“خلط وظيفي”). |
| **Rejection reasons** | `rejectionReasons[]`: `rawText`, `count`, `category` (Arabic categories like سعر، خلط وظيفي، …). Aggregated for analytics and word cloud. |
| **Per-ad performance** | Funnel counts **by `adName`** into `adsData`; rows with ignored names are excluded (see §7). |

### 1.2 Closed deals (`deals` collection)

Separate from daily funnel reports; used for **revenue** and **cycle time**.

| Metric | Definition |
|--------|------------|
| **Deal value** | `dealValue` (currency shown as “جنيه” in UI). |
| **Closing cycle (days)** | On create: `closeDate` (submission day) minus `firstContactDate`, in whole days, **≥ 0**. On edit: recomputed from patched `firstContactDate` and `closeDate`. |
| **Program count** | `programCount` (minimum 1 when normalized). |
| **Products** | List of product IDs from catalog (`lib/constants/products.ts`). |
| **Closure type** | `call` (sales call) vs `self` (self-booking). |

### 1.3 Targets and quotas

The codebase does **not** define numeric sales **targets** or **quotas** (e.g. “100k EGP/month”). Performance is relative: **team average conversion**, **best ad by conversion**, **rep vs team** on cards, etc.

---

## 2. Calculations and formulas

### 2.1 Core formulas (`dashboard-aggregations.ts`)

```
interactions = Σ (repliedAfterPrice[].count)   // primary definition

conversionRate = min(100, round1( (interactions / totalMessages) × 100 ))

globalConfusionPct = min(100, round1( (jobConfusionCount / totalMessages) × 100 ))
```

- **Biggest leak (funnel):** Among stages “بعد التحية”, “بعد التفاصيل”, “بعد السعر”, pick the stage with the **largest count**; `biggestLeakPct = (that count / totalMessages) × 100` (capped at 100%).

### 2.2 KPI card coloring (`KPICards.tsx`)

“معدل الإغلاق” text color:

- **Green** if conversion rate **≥ 15%**
- **Amber** if **≥ 5%** and **&lt; 15%**
- **Red** if **&lt; 5%**

### 2.3 Conversion funnel bars (`buildConversionFunnelBars` in `dashboard-analytics.ts`)

A **derived** sequence (not raw sums only):

- Start from `totalMessages`.
- **After greeting:** if greeting leak &gt; 0, `afterGreeting = max(0, totalMessages − greeting)`; else keep `totalMessages`.
- **After details:** `max(0, afterGreeting − details)`.
- **After price (remaining):** set to **interactions** (same as `repliedAfterPrice` aggregate).
- **“تفاعل فعلي”** bar: count = **interactions**.

The **largest step-down** between consecutive bars is highlighted (red) as the biggest drop.

### 2.4 Leak pie chart (`buildLeakCausesPieData`)

Slices: greeting leak (if &gt; 0), details leak, price leak, **real interactions**. **Percentages** are **shares of the sum of slice values** (not of total messages).

### 2.5 Platform split (`getPlatformStats`)

Platform is inferred from report `platform` string:

- WhatsApp: contains `واتساب` or `whatsapp`
- TikTok: contains `تيك توك` or `tiktok`
- Else: **Messenger** (includes Instagram strings in filter, see §3)

Per platform: sum of messages and of **interactions** (same interaction definition).

### 2.6 Daily buckets (`buildDailyBuckets`)

Group by **business date** (`normalizeReportDateKey`). For each day: sum messages and interactions; then `conversionRate = calcConversionRate(interactions, msgs)`.

### 2.7 Sales rep buckets (`buildSalesRepBuckets`)

Group by `salesRepName`. Sort reps by **total messages** descending. Conversion per rep: standard formula.

### 2.8 Best ad by conversion (`findBestAdByConversion`)

For each ad with funnel data: `total = greeting + details + price + success`; **ignore** if `total < minTotal` (default **5**).  
`rate = (success / total) × 100`. Pick ad with **maximum rate**.

### 2.9 Ads deep stats (`AdsAggregator.ts`)

Per ad name:

- Sums across funnel stages; `conv = (success / total) × 100`.
- **Confusion rate** per ad: `confusion / total × 100` where confusion is rolled into a fallback ad **"عام"** from `jobConfusionCount`.
- **Biggest drop** stage: same logic as funnel—compare greeting vs details vs price counts.
- **Team average conversion:** mean of `conv` over ads with `total > 0`.
- **State:** `خلط` if confusion &gt; **15%**; else `ضعيف` if `conv < 0.5 × teamConv`; else `قوي` if `conv > teamConv`; else `متوسط`.

### 2.10 Ads analysis page (`useAdsAnalysis` in `useDataFetching.ts`)

Per ad: `totalHits` sums all stage counts; `conversionRate = (stageDrops[3] / totalHits) × 100` where index 3 is **repliedAfterPrice** volume.

### 2.11 Deal analytics page (`DealsAnalyticsPage.tsx`)

On filtered deals:

- `totalRevenue = Σ dealValue`
- `avgCycle` = mean of `closingCycleDays` over deals where it is a number
- `totalPrograms = Σ programCount` (defaults to 1 if missing in aggregation loop)
- Per-rep: `avgCycleDays = round(Σ closingCycleDays / deal count)`
- **Suspicious reps:** `avgCycleDays > 365` flagged
- Program distribution: top **7** programs + **"أخرى"** bucket

### 2.12 Company deal cycle (`computeDealCycleStats` in `deals-service.ts`)

- **Average / min / max** cycle days use only deals where `closingCycleDays` is a **number**.
- **Total revenue** = sum of `dealValue`.

### 2.13 Smart insights & recommendations (heuristic thresholds)

Examples from `SmartInsightsSection` / `RecommendationsSection`:

- **Messenger failure:** messenger messages &gt; 0 **and** messenger interactions **=== 0** → critical (stop spend).
- **Price leak:** `(funnel.price / totalMessages) × 100 > 60` → critical.
- **Details leak:** `(funnel.details / totalMessages) × 100 > 50` → critical / short-term rec.
- **Weak conversion:** conversion **&lt; 5%** with data → info.
- **Job confusion:** any confusion &gt; 0 triggers messaging; **&gt; 3** in recommendations for ad copy fix.

WhatsApp vs Messenger: compare **interactions/messages** per platform with **0.1** percentage point tolerance.

### 2.14 Previous-period comparison (helpers only)

`getPreviousPeriodYmdRange` in `report-dates.ts` defines windows for **“previous”** ranges:

- **اليوم:** previous period is **the same single day** as “yesterday” window (see §3—effectively one day).
- **الأسبوع:** days **−13 to −7** relative to today.
- **الشهر:** **full previous calendar month** (first day to last day).

`filterReportsByYmdRange` + `getDashboardPreviousPeriodReports` exist in `dashboard-filters.ts` but **no component was found calling them**—trend KPIs may be incomplete unless wired elsewhere.

---

## 3. Filters and date ranges

### 3.1 Global filter model (`filter-context.tsx`)

| Dimension | Values |
|-----------|--------|
| **Date range** | `اليوم` \| `الأسبوع` \| `الشهر` \| `الإجمالي` |
| **Platform** | `all` \| `whatsapp` \| `messenger` \| `tiktok` |
| **Sales rep** | `all` or a rep **UID** |
| **Ad name** | `all` or exact `adName` from funnel |
| **Custom dates** | `customDateFrom` / `customDateTo` exist on state **but are not applied** in `filterReports()`—reserved/unused for dashboard filtering. |

**Filter bar UI:** The pill labeled **"أمس"** maps to internal **`اليوم`** (`FilterBar.tsx`)—see §3.2.

### 3.2 Business date vs submission time

- Filtering uses **`normalizeReportDateKey(report)`**: prefer `report.date` (ISO `YYYY-MM-DD` or `DD/MM/YYYY`), else **calendar day of `createdAt`**.
- **`DASHBOARD_DATA_QUALITY_FROM_DATE`** (`config.ts`, currently `2026-04-03`): reports with business date **before** this are **excluded** from dashboard aggregates (quality cutoff).

### 3.3 Date range semantics (`isReportDateInDashboardRange`)

Let `todayKey` = local calendar **today** (`YYYY-MM-DD`).

| Range | Includes reports whose business date `key` … |
|-------|-----------------------------------------------|
| **الإجمالي** | `key >= DASHBOARD_DATA_QUALITY_FROM_DATE` |
| **اليوم** | `key === todayKey − 1 day` (**yesterday only**) **and** passes quality cutoff |
| **الأسبوع** | from `todayKey − 6` through `todayKey` (inclusive), and ≥ quality cutoff |
| **الشهر** | from **first day of current month** through `todayKey`, and ≥ quality cutoff |

**Important:** The UI label “أمس” reflects that **“today” in dashboard language means yesterday’s business date** (operational convention: report reflects completed day).

### 3.4 Platform matching (`dashboard-filters.ts`)

- **WhatsApp:** substring `whatsapp` or `واتساب`
- **Messenger:** `messenger`, `ماسنجر`, `انستقرام`, `إنستغرام`
- **TikTok:** `tiktok` or `تيك توك`

### 3.5 Ad name filter

If not `all`, the report must have **at least one** funnel stage entry with `adName ===` selected value (`parsedData.funnel` object values traversed).

### 3.6 Insights page periods (`InsightPeriod`)

Mapped through `useInsightsReports` to the **same** date logic as §3.3 via `mapInsightPeriodToDateRange` (`today` → `today` string in filters → **`اليوم`** behavior = **yesterday’s** business date).

`getDateFromYmd` for labels uses **calendar today** as end for “today”—**label range may not match** the strict filter if interpreted literally; the **data** still follows `passesHookDateAndQuality`.

### 3.7 Deals analytics filters

Separate from global filter: **rep**, **team**, **closeDate** range (`dateFrom` / `dateTo` string compare on `d.closeDate`).

---

## 4. Chart types and visualizations

| Visualization | Library / type | Typical data |
|---------------|----------------|--------------|
| KPI cards | Custom | Aggregates from `calculateAggregates` |
| Funnel bars | Recharts `BarChart` | `buildConversionFunnelBars` |
| Daily trend | Custom `DailyConversionChart` | `buildDailyBuckets` |
| Leak causes | `LeakCausesPieChart` | Pie (`PieChart` / `Pie`) |
| Sales rep comparison | `SalesRepComparisonChart` | `buildSalesRepBuckets` |
| Platform donut | Recharts `PieChart` | `getPlatformStats` |
| Stacked ad drop-off | `BarChart` (stacked) | Top 8 ads by total funnel volume |
| Area chart | `AreaChart` | Platform or time-based (see `ChartsGrid`) |
| Rejection analytics | `BarChart` + word cloud styling | `rejectionReasons` categories |
| Deal cycle | `BarChart` | `computeDealCycleStats` by team |
| Ads page | `AdMatrixChart`, `AdCardsList`, `AdsSummaryRow` | `getAdsDeepStats` |

---

## 5. Data aggregation methods

### 5.1 Grain

- **Reports:** Aggregated by **business date** for daily charts; by **sales rep name** for rep charts; by **ad name** within funnel arrays.
- **Deals:** Aggregated by **close date** (filters) and by **rep** / **team** / **program** / **ad source**.

### 5.2 Calendar vs rolling

- **Month** on dashboard = **current calendar month to date** (not rolling 30 days).
- **Week** = **last 7 days** including today (`todayKey − 6` … `todayKey`).

### 5.3 AI insights context (`buildInsightsContext`)

Builds text summaries for Gemini: totals, funnel sums, per-platform lines, per-rep lines, per-ad lines, daily lines—**aligned** to the same interaction and message definitions where possible.

---

## 6. Reports that can be “generated”

| Output | Description |
|--------|-------------|
| **Daily sales report** | Sales users submit text (or structured form); Gemini parses → user confirms → stored in Firestore `reports` with `parsedData`, `date`, `platform`, `salesRepId`, etc. **`closedDeals` cleared on save** (deals captured elsewhere). |
| **AI insights report** | Admin runs **Insights** page: Gemini returns JSON (summary, critical issues, positives, recommendations). Can be **saved** to `insights` with metadata and snapshot stats. |
| **Saved insights list** | Loads last N saved insight documents from Firestore. |
| **Export** | No generic “export to CSV/PDF” pipeline was found in `src/`. **Superadmin** can run **destructive bulk delete** of collections in Settings (not an export). |

---

## 7. User roles and permissions

Roles: **`sales`**, **`admin`**, **`superadmin`**.

### 7.1 Route access (`App.tsx`)

| Route | Allowed roles |
|-------|----------------|
| `/submit-report`, `/my-reports`, `/deals`, `/my-deals` | **sales** |
| `/dashboard`, `/team`, `/reports`, `/ads`, `/insights`, `/access`, `/deals-analytics` | **admin**, **superadmin** |
| `/settings` | **superadmin** only |

Unauthenticated users go to `/login`. `/` redirects by role (sales → submit-report; others → dashboard).

### 7.2 Firestore rules (summary)

- **`users`:** Read if authenticated; create/update **admin+**; delete **superadmin only**.
- **`reports`:** Read own **or** admin; create authenticated; **no update**; delete **superadmin**.
- **`deals`:** Read own **or** admin; create authenticated; update admin **or** owner; delete superadmin **or** owner (including legacy name-only match).
- **`insights`:** Admin read/write; delete **superadmin**.
- **`customers`, `courses`:** As per rules (e.g. customers create by auth users; course write admin).
- **`notifications`:** Read/update own.
- **`excuses` / `attendance`:** See `firestore.rules` (sales see own where `salesRepId` matches in rules—ensure field names match documents).

### 7.3 Operational behaviors

- **Access page:** Creates **Firebase Auth** user + `users/{uid}` (email/password).
- **Team modals:** `AddMemberModal` adds Firestore-only user rows (`addDoc`)—**may not create Auth login** unless reconciled via Access page.
- **Accountability (`AccountabilitySystem`):** If sales user has **missing past working days** (no report and no excuse for that date), a blocking modal can force submit for that **business date** (Friday skipped in attendance loop).

---

## 8. Data import and export flow

### 8.1 Import

- **Primary:** Manual entry on **Submit report** (paste template **or** form). **No file upload** import pipeline in repo.
- **Parsing:** **Gemini** converts Arabic narrative into structured `parsedData` (funnel, rejections, etc.).
- **Deals:** Entered on **Deals** / **My deals** flows; may tie to **customer** resolution via `getOrCreateCustomerId` (normalized name).

### 8.2 Export

- **No** built-in CSV/Excel/PDF export for reports or deals in the reviewed UI.
- **Insights:** Persisted to Firestore (`insights`); can be viewed and deleted (superadmin delete per rules).
- **Settings (superadmin):** “Cleanup” **deletes** data in batches from selected collections—**not** an export.

### 8.3 External services

- **Firebase** Auth + Firestore: all persistent data.
- **Gemini API:** Keys via `VITE_GEMINI_API_KEY` / `VITE_GEMINI_API_KEY_N`; called from **browser** (see security implications in deployment).

---

## 9. Catalog of notable business rules

1. **Quality cutoff:** Reports before `DASHBOARD_DATA_QUALITY_FROM_DATE` are excluded from dashboard-style aggregates.
2. **Ignored ad names:** `عام` and `طموح` are **excluded** from ad-level charts in `calculateAggregates` (legacy noise). **Exception:** `getAdsDeepStats` still uses **"عام"** as a bucket for confusion/special cases.
3. **“Today” = yesterday:** Dashboard filter **`اليوم`** matches **yesterday’s** business date (label shown as “أمس”).
4. **Interactions definition:** Prefer **sum of `repliedAfterPrice` counts**; do not use `noReplyAfterPrice` as interaction.
5. **Conversion is capped** at 100%.
6. **Team status summary** (`TeamStatusSummary`) uses **calendar today** for “who submitted today”—may **differ** from the dashboard “اليوم” window (yesterday).
7. **Performance tab:** “Submitted today” uses `createdAt` or `date` with a **4pm** rule: before 16:00, non-submitters show amber **if** no report today.
8. **Deals cycle on create:** `closeDate` is **today** at save time; cycle length vs first contact is computed in days.
9. **AI insights:** Gemini instructions forbid inventing numbers; JSON-only response; Arabic output.
10. **Duplicate rejection lines:** `RejectionAnalyticsSection` merges reasons by **trimmed `rawText`** and sums `count`.

---

## 10. Code reference map

| Topic | Main files |
|-------|------------|
| Aggregations | `src/lib/utils/dashboard-aggregations.ts` |
| Analytics helpers | `src/lib/utils/dashboard-analytics.ts` |
| Filters | `src/lib/utils/dashboard-filters.ts`, `src/lib/filter-context.tsx` |
| Dates | `src/lib/utils/report-dates.ts`, `src/lib/utils/insights-period.ts` |
| Config | `src/lib/config.ts` |
| Hooks | `src/lib/hooks/useDataFetching.ts`, `useAttendance.ts` |
| Deals | `src/lib/services/deals-service.ts` |
| AI | `src/lib/services/gemini-parser.ts`, `ai-insights-service.ts` |
| Ads deep | `src/components/ads/AdsAggregator.ts` |
| Rules | `firestore.rules` |

---

## Related documentation

- [README.md](../README.md) — setup and scripts  
- [ARCHITECTURE.md](./ARCHITECTURE.md) — system architecture  
- [DATABASE.md](./DATABASE.md) — Firestore collections and fields  
- [API.md](./API.md) — Firebase and Gemini usage  
- [COMPONENTS.md](./COMPONENTS.md) — UI components and props  
- [DEPLOYMENT.md](./DEPLOYMENT.md) — hosting and production  

---

*Document generated from codebase analysis. If behavior and product intent diverge, treat this as “as implemented” documentation.*
