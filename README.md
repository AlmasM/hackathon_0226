# Hackathon 0226

Monorepo with a TypeScript frontend and a Python backend, configured for Vercel deployment.

## Project layout

```txt
apps/
  frontend/   # Vite + TypeScript app
  backend/    # Python serverless API
```

- Frontend entry: `apps/frontend/src/main.ts`
- Backend function: `apps/backend/api/index.py`
- Vercel config: `vercel.json`

## Prerequisites

- Node.js 18+ (recommended: latest LTS)
- npm 9+

## Local development

Install dependencies from the repo root:

```bash
npm install
```

Run frontend dev server from the root:

```bash
npm run dev:frontend
```

Or run directly inside frontend app:

```bash
cd apps/frontend
npm run dev
```

## Build

From repo root:

```bash
npm run build:frontend
```

## Backend API

The backend is a Python serverless function intended for Vercel:

- Function file: `apps/backend/api/index.py`
- Public route: `/api`

After deployment, test with:

```bash
curl https://<your-deployment-domain>/api
```

## Deploy to Vercel

1. Import this repository into Vercel.
2. Keep the project root as the repository root.
3. Deploy.

Vercel uses `vercel.json` to:

- build frontend via root command `npm install && npm run build:frontend`
- publish static frontend from `apps/frontend/dist`
- route `/api` to Python function at `apps/backend/api/index.py`
