# AniXo

AniXo is a free anime streaming web app that lets users search, browse, and watch anime online with sub/dub support in HD quality.

## Run & Operate

- `pnpm --filter @workspace/anixo run dev` — run the frontend (Vite dev server)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port assigned by workflow)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + Tailwind CSS v4 + React Router v7
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (for future auth backend)
- Video: ArtPlayer + HLS.js + Plyr
- Data: AniList GraphQL API, Jikan REST API, Miruro stream proxy

## Where things live

- `artifacts/anixo/` — React + Vite frontend (served at `/`)
- `artifacts/anixo/src/pages/` — all page-level route components
- `artifacts/anixo/src/components/` — UI components (auth, common, home, layout, user, watch)
- `artifacts/anixo/src/services/api.js` — AniList/Jikan/Miruro API clients + backend axios instance
- `artifacts/anixo/src/store/authStore.jsx` — global auth state (JWT + localStorage)
- `artifacts/anixo/src/context/` — language, loading, user list contexts
- `artifacts/api-server/` — Express backend scaffold

## Architecture decisions

- Frontend is fully client-rendered (CSR) — no SSR, data fetched via useEffect/react-query from external anime APIs
- Auth backend (`backend-core`) uses MongoDB + JWT; default `VITE_BACKEND_API` points to `https://anixo-254s.onrender.com`
- AniList GraphQL proxied through `VITE_PYTHON_API` (Hugging Face Space) to avoid CORS
- Stream sources: Miruro (Cloudflare Worker), custom HLS/iframe sources
- Tailwind v4 uses `@import "tailwindcss"` with `@tailwindcss/vite` plugin (no postcss.config.js)

## Product

- Browse/search anime by genre, format, season, score
- Watch episodes with HLS video player (ArtPlayer/Plyr), skip OP/ED, subtitle support
- User accounts: watchlist, watch progress, notifications, settings, AniList sync
- Schedule page for airing anime, character/staff detail pages

## User preferences

- Keep all original JSX files as `.jsx` — use `// @ts-ignore` to suppress TypeScript errors on imports

## Gotchas

- `VITE_BACKEND_API` env var controls the auth backend URL (defaults to Render-hosted instance)
- `VITE_PYTHON_API` env var controls the AniList proxy URL (defaults to HF Space)
- The `postcss.config.js` from the original project must NOT be used — it conflicts with `@tailwindcss/vite`
- Service Worker (`sw.js`) is in `public/` and registers on load
