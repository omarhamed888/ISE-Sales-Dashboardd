# Tech stack

This is a **Vite + React 18 + TypeScript** SPA — NOT Next.js.

- **Bundler / dev server**: Vite (`vite.config.ts`)
- **Routing**: `react-router-dom` — see `src/App.tsx` for all routes
- **Backend**: Firebase (Firestore, Auth, Storage, Cloud Functions v2 Node 20, Hosting)
- **UI**: Tailwind CSS, Material Symbols icons, `dir="rtl"` Arabic throughout
- **Charts**: Recharts
- **AI**: Gemini API via `VITE_GEMINI_API_KEY` (client-side, report parsing only)

There are no Next.js pages, server components, or `app/` router conventions. Do not reference `node_modules/next/`.

Read `src/App.tsx` before adding routes. Read `src/lib/filter-context.tsx` before touching filter state. Read `src/lib/types/index.ts` for shared types.
