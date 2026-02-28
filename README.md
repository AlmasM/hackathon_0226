# Hackathon 0226

Nx monorepo with a React + TypeScript frontend and a Python backend, configured for Vercel deployment.

## Project layout

```txt
apps/
  frontend/   # Vite + React + TypeScript app
  backend/    # Python serverless API
```

- Frontend entry: `apps/frontend/src/main.tsx`
- Backend function: `apps/backend/api/index.py`
- Vercel config: `vercel.json`
- Nx workspace config: `nx.json`

## Prerequisites

- Node.js 18+ (recommended: latest LTS)
- npm 9+

## Local development

Install dependencies from the repo root:

```bash
npm install
```

Run frontend with Nx:

```bash
nx serve frontend
```

Run backend with Nx:

```bash
nx serve backend
```

Run frontend and backend together:

```bash
npm run dev
```

Equivalent Nx command:

```bash
nx run-many -t serve --projects=frontend,backend --parallel=2
```

You can still run directly inside frontend app:

```bash
cd apps/frontend
npm run dev
```

## Build

From repo root:

```bash
nx build frontend
```

## Backend API

The backend is a Python serverless function intended for Vercel.

- Function file: `apps/backend/api/index.py`
- Public route: `/api`

For local backend-only development with Nx:

```bash
nx serve backend
```

Then test:

```bash
curl http://localhost:8000
```

For local Vercel route parity (`/api` rewrites + static frontend), use:

```bash
npx vercel dev
```

After deployment, test with:

```bash
curl https://<your-deployment-domain>/api
```

## Deploy to Vercel

1. Import this repository into Vercel.
2. Keep the project root as the repository root.
3. Deploy.

Vercel uses `vercel.json` to:

- build frontend via root command `npm install && nx build frontend`
- publish static frontend from `apps/frontend/dist`
- route `/api` to Python function at `apps/backend/api/index.py`
