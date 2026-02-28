# Scripts

## Dev servers (workaround for EPERM uv_cwd)

If `npx nx run frontend:serve` or `npm run dev:frontend` fails with **EPERM: operation not permitted, uv_cwd**, use these instead. They set the project root from the script path so the shell’s current directory is not used:

- **Frontend:** `node scripts/serve-frontend.js` or `npm run start:frontend`
- **Backend:** `node scripts/serve-backend.js` or `npm run start:backend`

---

## JSON only (no SQL)

Phase 0 uses **only JSON** for schema and seed data. No SQL, no Supabase project/table creation in this repo.

- **`schema.json`** — Canonical schema for the four tables: `restaurants`, `restaurant_images`, `story_templates`, `user_profiles`. TypeScript types in `apps/frontend/src/types/index.ts` mirror this schema.

- **`seed.json`** — Seed data: 3 user personas and 5 restaurants (NYC). When you connect Supabase, use this JSON (e.g. Table Editor paste, or insert via client) to populate `user_profiles` and `restaurants`.
