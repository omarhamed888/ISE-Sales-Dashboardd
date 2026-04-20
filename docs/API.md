# API Documentation

This project **does not expose a custom HTTP REST API**. Integration happens through:

1. **Firebase Authentication** (client SDK)
2. **Cloud Firestore** (client SDK — reads/writes secured by `firestore.rules`)
3. **Google Gemini** (via `@google/generative-ai` in the browser)

Below: conceptual **operations**, **payload shapes**, and **examples**. For field definitions, see [DATABASE.md](./DATABASE.md).

---

## Environment

All Firebase and Gemini configuration uses **`VITE_*`** variables (see `.env.example`). Keys are embedded in the client bundle at build time.

---

## 1. Firebase Authentication

### Sign in with email and password

**SDK:** `signInWithEmailAndPassword(auth, email, password)`

| Aspect | Detail |
|--------|--------|
| **Success** | Firebase user session; app loads `users` doc by email + `isActive` |
| **Failure** | Firebase `auth/*` error codes; app maps to UI (`wrong-credentials`, etc.) |

**Example (conceptual):**

```ts
// Request: implicit — email + password
await signInWithEmailAndPassword(auth, "rep@example.com", "secret123");

// Response: UserCredential
// { user: { uid, email, ... }, ... }
```

### Sign in with Google

**SDK:** `signInWithPopup(auth, GoogleAuthProvider)`

After success, app queries Firestore `users` where `email == firebaseUser.email` and `isActive == true`. If empty, **development bootstrap** may write `users/{uid}` as `superadmin` (see security notes in [TECHNICAL_AUDIT.md](./TECHNICAL_AUDIT.md)).

### Sign out

**SDK:** `signOut(auth)`

---

## 2. Cloud Firestore (client API)

Access is via `collection`, `doc`, `query`, `where`, `orderBy`, `getDocs`, `onSnapshot`, `addDoc`, `setDoc`, `updateDoc`, `deleteDoc`, `writeBatch`.

### 2.1 Reports

**Create (sales submit)**

```ts
// Collection: reports
await addDoc(collection(db, "reports"), {
  date: "2026-04-18",
  platform: "واتساب",
  salesRepId: user.uid,
  salesRepName: user.name,
  rawText: "…" | null,
  entryMode: "template" | "form",
  parsedData: { /* ParsedReportData */ },
  confirmed: true,
  createdAt: serverTimestamp(),
});
```

**Read (admin dashboard)**

```ts
onSnapshot(
  query(collection(db, "reports"), orderBy("createdAt", "desc")),
  (snap) => { /* map docs */ }
);
```

**Read (sales — own only)**

```ts
query(
  collection(db, "reports"),
  where("salesRepId", "==", uid),
  orderBy("createdAt", "desc")
);
```

**Update:** Not allowed by security rules (`update: if false`).

**Delete:** Superadmin only (rules).

---

### 2.2 Deals

**Batch create (from parser output)**

```ts
// deals-service.saveDeals — multiple set in a batch
batch.set(dealRef, {
  salesRepId,
  salesRepName,
  teamName: teamName || null,
  date: "YYYY-MM-DD",
  customerId,
  customerName,
  adSource,
  programName,
  programCount,
  dealValue,
  firstContactDate,
  closeDate,
  closingCycleDays,
  products: [],
  closureType: "call" | "self",
  createdAt: serverTimestamp(),
});
```

**List all (admin analytics)**

```ts
query(collection(db, "deals"), orderBy("createdAt", "desc"));
```

---

### 2.3 Users

**Profile lookup after login**

```ts
query(
  collection(db, "users"),
  where("email", "==", email),
  where("isActive", "==", true),
  limit(1)
);
```

**Create (Access page)**

```ts
await setDoc(doc(db, "users", uidFromSecondaryAuth), {
  name,
  email,
  role: "sales" | "admin",
  isActive: true,
  addedAt: serverTimestamp(),
});
```

---

### 2.4 Customers

**Get or create by name** (`customers-service.ts`)

```ts
// Query: where normalizedKey == key, limit 1
// Else addDoc({ normalizedKey, displayName, createdAt })
```

---

### 2.5 Insights (saved AI reports)

```ts
await addDoc(collection(db, "insights"), {
  name, period, periodLabel, dateFrom, dateTo,
  summary, criticalIssues, positivePoints, recommendations,
  dataSnapshot: { /* … */ },
  savedBy, savedByName,
  savedAt: serverTimestamp(),
});
```

---

### 2.6 Notifications

```ts
query(
  collection(db, "notifications"),
  where("uid", "==", user.uid)
);
// Client sorts by createdAt
```

---

## 3. Google Gemini (Generative AI)

### 3.1 Report parsing

**Module:** `src/lib/services/gemini-parser.ts`  
**Typical flow:** `GoogleGenerativeAI.getGenerativeModel({ model: "…" })` → `generateContent` with system + user text → parse **JSON** into `ParsedReportData`.

**Conceptual request**

```http
POST https://generativelanguage.googleapis.com/...   # handled by SDK
```

**Conceptual response body (application logic)**

```json
{
  "totalMessages": 120,
  "funnel": {
    "noReplyAfterGreeting": [{ "adName": "…", "count": 5 }],
    "noReplyAfterDetails": [],
    "noReplyAfterPrice": [],
    "repliedAfterPrice": [{ "adName": "…", "count": 10 }]
  },
  "rejectionReasons": [],
  "jobConfusionCount": 0,
  "closedDeals": []
}
```

Errors may surface as thrown exceptions or parse failures; UI shows Arabic messages.

### 3.2 AI insights

**Module:** `src/lib/services/ai-insights-service.ts`  
Builds a **text context** from filtered reports (`buildInsightsContext`), then requests JSON with `summary`, `criticalIssues`, `positivePoints`, `recommendations`.

**Failure codes (typed)**

| Code | Meaning |
|------|---------|
| `no_api_key` | No Gemini key in env |
| `no_reports` | No data in period |
| `low_data` | Insufficient volume |
| `rate_limited` | API throttling |
| `gemini_failed` | API error |
| `bad_json` | Model returned non-JSON |

---

## 4. Error handling pattern

- Firestore: `onSnapshot` error callback; `try/catch` around `getDocs`/`addDoc`.
- Auth: Firebase error `code` (e.g. `auth/wrong-password`).
- Gemini: Wrapped errors + user-visible Arabic strings on Insights page.

---

## 5. No public OpenAPI

There is **no** OpenAPI/Swagger document for this repo. If you add **Cloud Functions** or a **REST** layer later, document it separately and **move Gemini off the client** for production.
