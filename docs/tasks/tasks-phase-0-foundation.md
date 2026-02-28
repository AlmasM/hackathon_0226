# Phase 0: Foundation (Both Devs Together, ~30 min)

## Project Overview

**TasteTales** is a hackathon PoC web app for AI-personalized restaurant "Stories." Think Google Maps restaurant discovery, but when you tap a restaurant, instead of static photos, you see an Instagram-style Story reel that blends owner-uploaded content with AI-personalized segments tailored to the viewer's taste preferences.

**Why this matters:** Restaurant discovery platforms show generic content — a vegan sees steaks, a cocktail lover sees kids' menus. By dynamically personalizing the visual story per user, we increase engagement and conversion. This PoC proves the concept for pitching to Google Maps, Yelp, or OpenTable as a native integration.

**Why Phase 0 matters:** This phase builds the shared foundation that both devs depend on. If the schema is wrong, API contracts are misaligned, or env vars are missing — all parallel work in Phase 1A and 1B will stall. Both devs work together for 30 minutes to get this right, then split.

## Current State of Architecture

**What exists today:**
- **Monorepo** with `apps/frontend/` and `apps/backend/`
- **Frontend:** React 18 + Vite 7 + TypeScript. Has a bare `App.tsx` component, `main.tsx` entry point, and basic CSS. Already configured with `@vitejs/plugin-react` and JSX support (`tsconfig.json` has `"jsx": "react-jsx"`).
- **Backend:** Python Flask on Vercel serverless. `api/index.py` has two routes: `/api/health` and `/api`. Dev server at `dev_server.py` runs on port 8000.
- **Deployment:** Vercel configured (`vercel.json`) — routes `/api/*` to Python backend, serves frontend from `apps/frontend/dist/`.
- **Package manager:** npm workspaces (root `package.json` has `workspaces: ["apps/frontend"]`).

**What's MISSING (this phase delivers it all):**
- No React Router (no page routing)
- No Supabase (no database, no client)
- No Google Maps SDK
- No environment variables configured
- No shared TypeScript types
- No seed data (no restaurants, no user personas)
- No CORS configuration on the backend
- No backend dependencies beyond Flask

## Key Dependencies & Setup Gotchas

1. **Supabase RLS (Row Level Security):** Supabase enables RLS by default on new tables. For this PoC, **disable RLS** on all tables or create permissive policies. If you skip this, all frontend Supabase queries will return empty arrays with no error — very confusing to debug.
2. **Google Cloud Console API Enablement:** The Google Maps API key must have these APIs enabled: **Maps JavaScript API**, **Places API (New)**, and **Generative Language API** (for Gemini). A single key can cover all three, but each must be explicitly enabled.
3. **Vite env vars:** Vite only exposes env vars prefixed with `VITE_`. Backend vars (no prefix) won't be available in the frontend.
4. **CORS:** The Vite dev server runs on `localhost:5173`, the Flask dev server on `localhost:8000`. Without CORS configuration, frontend-to-backend API calls will fail silently.
5. **Python virtual environment:** The backend uses a venv at `apps/backend/.venv/`. Run `python3 -m venv .venv && .venv/bin/pip install -r requirements.txt` to set up.
6. **Google Places photo URLs:** These are not direct image URLs — they require API key authentication. Plan for this in the schema (store the photo reference, resolve to URL on demand).

## Relevant Files

- `apps/frontend/package.json` — Add React Router, Supabase JS client, Google Maps package
- `apps/frontend/src/App.tsx` — Set up React Router and layout shell
- `apps/frontend/src/main.tsx` — Entry point (already renders `<App />`)
- `apps/frontend/src/types/index.ts` — **New file**: Shared TypeScript interfaces
- `apps/frontend/src/lib/supabase.ts` — **New file**: Supabase client initialization
- `apps/frontend/.env` — **New file**: Frontend environment variables
- `apps/frontend/.env.example` — **New file**: Template for frontend env vars
- `apps/backend/requirements.txt` — Add Python dependencies
- `apps/backend/api/index.py` — Add CORS, import route blueprints
- `apps/backend/.env` — **New file**: Backend environment variables
- `apps/backend/.env.example` — **New file**: Template for backend env vars
- `.gitignore` — Add `.env` files
- `scripts/schema.json` — **New file**: Canonical JSON schema (single source of truth for tables; no live Supabase implementation)
- `scripts/seed.json` — **New file**: Seed data (3 personas, 5 restaurants) in JSON; use when populating Supabase

### Notes

- Both devs should be on a call or side-by-side during Phase 0 — decisions here affect everything downstream.
- Split the work: one dev handles frontend setup (Tasks 1, 5, 8), the other handles backend + Supabase (Tasks 2, 3, 4, 7). Task 6 is done together.
- Verify the foundation works before splitting: both devs should confirm they can query Supabase from both frontend and backend.

---

## Tasks

### [ ] 1.0 Install Frontend Dependencies

`description`: Add all required npm packages to the frontend workspace so both devs have the libraries they need for Phase 1.

`priority`: P0 — Critical (blocks all frontend work)

`dependencies`: None

`details`:
The frontend currently has only `react`, `react-dom`, `@vitejs/plugin-react`, `typescript`, and `vite`. We need routing, database access, Google Maps rendering, and optionally the Gemini JS client. Install all at once to avoid repeated `npm install` cycles.

`testStrategy`: Run `npm run dev:frontend` from the repo root. App should start without errors. Import each package in a test file to confirm resolution.

- [ ] 1.1 From the repo root, run: `npm install react-router-dom @supabase/supabase-js @vis.gl/react-google-maps --workspace @hackathon/frontend`
  - **Done when:** `package.json` in `apps/frontend/` lists all three as dependencies and `node_modules` contains them.
- [ ] 1.2 Optionally install `@google/generative-ai` if Gemini will be called from the frontend: `npm install @google/generative-ai --workspace @hackathon/frontend`
  - **Done when:** Package resolves in imports. Skip if all Gemini calls go through the backend.
- [ ] 1.3 Verify the dev server still starts: `npm run dev:frontend` — should compile without errors.
  - **Done when:** Browser shows the existing "React + TypeScript Frontend" page.

---

### [ ] 2.0 Install Backend Dependencies

`description`: Add all required Python packages to the backend so Dev A can build API endpoints in Phase 1A.

`priority`: P0 — Critical (blocks all backend work)

`dependencies`: None

`details`:
The backend `requirements.txt` is currently empty (just a comment). We need the Supabase Python client, Google Generative AI SDK, HTTP request library, env var management, and CORS support. The venv may need to be recreated.

`testStrategy`: Activate the venv, run `python -c "import supabase; import google.generativeai; import flask_cors; print('OK')"`. All imports should succeed.

- [ ] 2.1 Update `apps/backend/requirements.txt` with:
  ```
  flask
  flask-cors
  supabase
  google-generativeai
  requests
  python-dotenv
  ```
  - **Done when:** File contains all dependencies.
- [ ] 2.2 Set up the virtual environment and install: `cd apps/backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`
  - **Done when:** All packages install without errors.
  - **GOTCHA:** If you get `error: externally-managed-environment`, you MUST use the venv. Don't use `--break-system-packages`.
- [ ] 2.3 Verify imports work: `.venv/bin/python -c "import supabase; import google.generativeai; import flask_cors; print('All imports OK')"`
  - **Done when:** Prints "All imports OK" with no errors.
- [ ] 2.4 Add CORS to Flask app in `apps/backend/api/index.py`:
  ```python
  from flask_cors import CORS
  CORS(app)
  ```
  - **Done when:** Frontend at `localhost:5173` can call backend at `localhost:8000` without CORS errors.

---

### [ ] 3.0 Define Schema (JSON Only — No Supabase Implementation)

`description`: Define the shared data contract as a canonical JSON schema. No live Supabase project or table creation is part of this phase; only the schema is implemented.

`priority`: P0 — Critical (schema is the contract for all data)

`dependencies`: None (can be done in parallel with Tasks 1.0 and 2.0)

`details`:
Use a **JSON schema only** as the source of truth. Create `scripts/schema.json` with the 4 table definitions. TypeScript types and any future SQL DDL should be derived from this file. Supabase project creation, table creation in the dashboard, and RLS configuration are **out of scope** — do them manually when connecting Supabase.

`testStrategy`: `scripts/schema.json` exists and defines all 4 tables with correct column types. No Supabase dashboard or API calls required.

- [ ] 3.1 **Skipped for implementation.** Create a Supabase project only when you connect Supabase later. Note the Project URL and anon key then.
- [ ] 3.2 Define all 4 tables in **`scripts/schema.json`** using the following JSON schema definitions (single source of truth):

  **`restaurants`** — Restaurants pulled from Google Places
  ```json
  {
    "table": "restaurants",
    "columns": {
      "id":               { "type": "uuid", "primaryKey": true, "default": "gen_random_uuid()" },
      "google_place_id":  { "type": "text", "unique": true, "required": true },
      "name":             { "type": "text", "required": true },
      "address":          { "type": "text" },
      "lat":              { "type": "float" },
      "lng":              { "type": "float" },
      "rating":           { "type": "float" },
      "cuisine_type":     { "type": "text[]" },
      "phone":            { "type": "text" },
      "website":          { "type": "text" },
      "created_at":       { "type": "timestamptz", "default": "now()" }
    }
  }
  ```

  **`restaurant_images`** — Images for each restaurant
  ```json
  {
    "table": "restaurant_images",
    "columns": {
      "id":               { "type": "uuid", "primaryKey": true, "default": "gen_random_uuid()" },
      "restaurant_id":    { "type": "uuid", "foreignKey": { "table": "restaurants", "column": "id", "onDelete": "cascade" }, "required": true },
      "image_url":        { "type": "text", "required": true },
      "source":           { "type": "text", "default": "google", "enum": ["google", "owner_upload"] },
      "tags":             { "type": "text[]", "description": "AI-generated tags, e.g. ['vegan', 'cocktail', 'steak']" },
      "slot_type":        { "type": "text", "default": "personalized", "enum": ["intro", "personalized", "outro"] },
      "display_order":    { "type": "int" },
      "created_at":       { "type": "timestamptz", "default": "now()" }
    }
  }
  ```

  **`story_templates`** — Story templates defined by owners
  ```json
  {
    "table": "story_templates",
    "columns": {
      "id":               { "type": "uuid", "primaryKey": true, "default": "gen_random_uuid()" },
      "restaurant_id":    { "type": "uuid", "foreignKey": { "table": "restaurants", "column": "id", "onDelete": "cascade" }, "required": true },
      "intro_image_id":   { "type": "uuid", "foreignKey": { "table": "restaurant_images", "column": "id" } },
      "outro_image_id":   { "type": "uuid", "foreignKey": { "table": "restaurant_images", "column": "id" } },
      "cta_text":         { "type": "text", "default": "Book a Table" },
      "cta_url":          { "type": "text" },
      "created_at":       { "type": "timestamptz", "default": "now()" }
    }
  }
  ```

  **`user_profiles`** — Simulated user profiles
  ```json
  {
    "table": "user_profiles",
    "columns": {
      "id":               { "type": "uuid", "primaryKey": true, "default": "gen_random_uuid()" },
      "name":             { "type": "text", "required": true },
      "avatar_url":       { "type": "text" },
      "persona_type":     { "type": "text", "required": true, "enum": ["vegan", "carnivore", "cocktail_lover"] },
      "preferences":      { "type": "jsonb", "required": true, "schema": { "tags": "string[]", "avoid_tags": "string[]" } },
      "created_at":       { "type": "timestamptz", "default": "now()" }
    }
  }
  ```
  - **Done when:** `scripts/schema.json` exists with all 4 tables and columns as above. No Supabase Table Editor usage.
- [ ] 3.3 **Out of scope (Supabase implementation).** When you connect Supabase later, disable RLS on all 4 tables (dashboard or run the `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` SQL).
- [ ] 3.4 **Out of scope (Supabase implementation).** When you connect Supabase, note the service_role key for the backend; never expose it in frontend code.

---

### [ ] 4.0 Configure Environment Variables

`description`: Set up `.env` files for both frontend and backend with all API keys and database credentials. Create `.env.example` templates for the team.

`priority`: P0 — Critical (nothing connects without credentials)

`dependencies`: Task 3.0 (need Supabase URL and keys)

`details`:
Vite requires `VITE_` prefix for frontend env vars. Backend uses `python-dotenv` to load from `.env`. Never commit `.env` files — only `.env.example` with placeholder values.

`testStrategy`: Frontend: `console.log(import.meta.env.VITE_SUPABASE_URL)` shows the URL. Backend: `os.getenv('SUPABASE_URL')` returns the URL.

- [ ] 4.1 Create `apps/frontend/.env`:
  ```
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-key
  VITE_GOOGLE_MAPS_API_KEY=your-google-maps-key
  ```
  - **Done when:** File exists with real values (not placeholders).
- [ ] 4.2 Create `apps/frontend/.env.example`:
  ```
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-key-here
  VITE_GOOGLE_MAPS_API_KEY=your-google-maps-key-here
  ```
  - **Done when:** File exists with placeholder values.
- [ ] 4.3 Create `apps/backend/.env`:
  ```
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_SERVICE_KEY=your-service-role-key
  GOOGLE_PLACES_API_KEY=your-google-api-key
  GEMINI_API_KEY=your-gemini-api-key
  ```
  - **Done when:** File exists with real values.
- [ ] 4.4 Create `apps/backend/.env.example`:
  ```
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_SERVICE_KEY=your-service-role-key-here
  GOOGLE_PLACES_API_KEY=your-google-api-key-here
  GEMINI_API_KEY=your-gemini-api-key-here
  ```
  - **Done when:** File exists with placeholder values.
- [ ] 4.5 Add `.env` to `.gitignore` (ensure the pattern covers both `apps/frontend/.env` and `apps/backend/.env`):
  ```
  .env
  .env.local
  ```
  - **Done when:** `git status` does not show `.env` files as untracked.
- [ ] 4.6 Load env vars in the backend. In `apps/backend/api/index.py`, add at the top:
  ```python
  from dotenv import load_dotenv
  load_dotenv()
  ```
  - **Done when:** `os.getenv('SUPABASE_URL')` returns the correct value in backend code.

---

### [ ] 5.0 Set Up Frontend Routing & Layout Shell

`description`: Configure React Router with all page routes and create a basic mobile-first layout shell. This gives both devs a skeleton to build their pages into.

`priority`: P0 — Critical (both devs need routes to build pages)

`dependencies`: Task 1.0 (React Router must be installed)

`details`:
Three routes:
- `/` → Discovery page (Dev B builds in Phase 1B)
- `/restaurant/:id` → Restaurant story page (Dev B builds in Phase 1B)
- `/owner/:restaurantId` → Owner dashboard (Dev A builds in Phase 1A)

Create placeholder page components that both devs will flesh out. Wrap the app with any needed providers.

`testStrategy`: Navigate to each route in the browser. Each should render its placeholder text. Browser back/forward should work.

- [ ] 5.1 Create page placeholder components:
  - `apps/frontend/src/pages/DiscoveryPage.tsx` — returns `<div>Discovery Page</div>`
  - `apps/frontend/src/pages/RestaurantStoryPage.tsx` — returns `<div>Restaurant Story: {id}</div>` (use `useParams()`)
  - `apps/frontend/src/pages/OwnerDashboardPage.tsx` — returns `<div>Owner Dashboard: {restaurantId}</div>` (use `useParams()`)
  - **Done when:** All 3 files exist with basic components.
- [ ] 5.2 Update `App.tsx` to use React Router:
  ```tsx
  import { BrowserRouter, Routes, Route } from 'react-router-dom';
  import DiscoveryPage from './pages/DiscoveryPage';
  import RestaurantStoryPage from './pages/RestaurantStoryPage';
  import OwnerDashboardPage from './pages/OwnerDashboardPage';

  export default function App() {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DiscoveryPage />} />
          <Route path="/restaurant/:id" element={<RestaurantStoryPage />} />
          <Route path="/owner/:restaurantId" element={<OwnerDashboardPage />} />
        </Routes>
      </BrowserRouter>
    );
  }
  ```
  - **Done when:** All 3 routes render their placeholder pages when navigated to in the browser.
- [ ] 5.3 Create the Supabase client singleton at `apps/frontend/src/lib/supabase.ts`:
  ```tsx
  import { createClient } from '@supabase/supabase-js';

  export const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );
  ```
  - **Done when:** Importing `supabase` from this file works in any component.
- [ ] 5.4 Verify Supabase connection from the frontend: in `DiscoveryPage`, add a `useEffect` that runs `supabase.from('restaurants').select('*')` and logs the result. If RLS is disabled and env vars are correct, it should return an empty array (no data yet) — NOT an error.
  - **Done when:** Console shows `{ data: [], error: null }`.
  - **GOTCHA:** If you see `{ data: null, error: { message: "..." } }`, check your Supabase URL/key. If you see `{ data: [], error: null }` but expected data, it's correct — you haven't seeded yet.

---

### [ ] 6.0 Set Up Backend Supabase Client & API Structure

`description`: Initialize the Supabase Python client in the backend and scaffold the API route structure for Dev A to build on in Phase 1A.

`priority`: P0 — Critical (Dev A needs this to build endpoints)

`dependencies`: Tasks 2.0 (dependencies installed), 4.0 (env vars configured)

`details`:
Create a Supabase client helper and scaffold the Flask route structure. The backend needs to read from and write to Supabase for all API operations.

`testStrategy`: Run the backend dev server and call `GET /api/health`. Then add a test route that queries Supabase and verify it returns data.

- [ ] 6.1 Create `apps/backend/api/supabase_client.py`:
  ```python
  import os
  from supabase import create_client

  def get_supabase():
      url = os.getenv('SUPABASE_URL')
      key = os.getenv('SUPABASE_SERVICE_KEY')
      return create_client(url, key)
  ```
  - **Done when:** Importing `get_supabase` works and returns a client that can query tables.
- [ ] 6.2 Add a test route in `apps/backend/api/index.py` to verify Supabase connectivity:
  ```python
  @app.get("/api/test-db")
  def test_db():
      sb = get_supabase()
      result = sb.table('restaurants').select('*').execute()
      return {"count": len(result.data), "data": result.data}, 200
  ```
  - **Done when:** `curl http://localhost:8000/api/test-db` returns `{"count": 0, "data": []}`.
  - **GOTCHA:** The Supabase Python client uses `service_role` key, which bypasses RLS. If you get auth errors, check the key is the service role key, not the anon key.
- [ ] 6.3 Remove the test route after verification (it was just for confirming the connection).

---

### [ ] 7.0 Seed Initial Data

`description`: Populate Supabase with 3 user personas and 5 mock restaurants so both devs have real data to work with in Phase 1.

`priority`: P0 — Critical (no data = nothing to display or test)

`dependencies`: Task 3.0 (tables must exist)

`details`:
Seed 3 user personas with distinct preference profiles and 5 restaurants with real Google Place IDs from a major city (e.g., NYC or SF). Use real Place IDs so the Google Places import will work in Phase 1A. Restaurants should cover diverse cuisines to make the personalization demo impactful.

`testStrategy`: Query each table in the Supabase dashboard. `user_profiles` should have 3 rows. `restaurants` should have 5 rows. Each persona's preferences should have distinct `tags` and `avoid_tags`.

- [ ] 7.1 Seed user personas. Insert the following JSON objects into the `user_profiles` table via the Supabase Table Editor (Insert Row) or a seed script:
  ```json
  [
    {
      "name": "The Vegan",
      "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=vegan",
      "persona_type": "vegan",
      "preferences": {
        "tags": ["vegan", "vegetarian", "salad", "organic", "plant_based", "smoothie", "avocado", "tofu", "garden", "healthy"],
        "avoid_tags": ["steak", "meat", "burger", "bbq", "bacon", "ribeye", "pork", "chicken_wings"]
      }
    },
    {
      "name": "The Carnivore",
      "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=carnivore",
      "persona_type": "carnivore",
      "preferences": {
        "tags": ["steak", "burger", "bbq", "meat", "ribeye", "smoked", "grill", "bacon", "wings", "prime_rib"],
        "avoid_tags": ["tofu", "vegan", "plant_based"]
      }
    },
    {
      "name": "The Cocktail Lover",
      "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=cocktail",
      "persona_type": "cocktail_lover",
      "preferences": {
        "tags": ["cocktail", "bar", "wine", "craft_beer", "mixology", "happy_hour", "drinks", "martini", "speakeasy", "rooftop"],
        "avoid_tags": []
      }
    }
  ]
  ```
  - **Done when:** Querying `user_profiles` returns 3 rows with distinct preferences.
- [ ] 7.2 Seed 5 mock restaurants. Insert the following JSON objects into the `restaurants` table. Use real Google Place IDs from NYC (these will be used with the Google Places import in Phase 1A):
  ```json
  [
    {
      "google_place_id": "ChIJAQBEylJYwokRlNgMJJHxNiA",
      "name": "Le Bernardin",
      "address": "155 W 51st St, New York, NY",
      "lat": 40.7618, "lng": -73.9818,
      "rating": 4.7,
      "cuisine_type": ["french", "seafood", "fine_dining"]
    },
    {
      "google_place_id": "ChIJ4WAmhqJZwokRIPEYdG2QROI",
      "name": "Peter Luger Steak House",
      "address": "178 Broadway, Brooklyn, NY",
      "lat": 40.7099, "lng": -73.9624,
      "rating": 4.4,
      "cuisine_type": ["steakhouse", "american", "classic"]
    },
    {
      "google_place_id": "ChIJhUBe4WBZwokRnLGNGx5paQQ",
      "name": "Death & Co",
      "address": "433 E 6th St, New York, NY",
      "lat": 40.7265, "lng": -73.9878,
      "rating": 4.5,
      "cuisine_type": ["cocktail_bar", "speakeasy", "drinks"]
    },
    {
      "google_place_id": "ChIJi3MwDPRYwokR7L20FGbVECU",
      "name": "By Chloe",
      "address": "185 Bleecker St, New York, NY",
      "lat": 40.7293, "lng": -73.9997,
      "rating": 4.3,
      "cuisine_type": ["vegan", "fast_casual", "healthy"]
    },
    {
      "google_place_id": "ChIJK1Gm8RpZwokRn2p5Z3PjfVo",
      "name": "Gramercy Tavern",
      "address": "42 E 20th St, New York, NY",
      "lat": 40.7386, "lng": -73.9884,
      "rating": 4.6,
      "cuisine_type": ["american", "new_american", "fine_dining"]
    }
  ]
  ```
  - **Done when:** Querying `restaurants` returns 5 rows covering diverse cuisines.
  - **NOTE:** These Place IDs are approximate. If the Google Places import in Phase 1A fails with "Place not found," you may need to look up the correct Place IDs via the [Place ID Finder](https://developers.google.com/maps/documentation/places/web-service/place-id).
- [ ] 7.3 Verify seed data from the frontend: in the `DiscoveryPage` `useEffect`, the Supabase query should now return 5 restaurants and the `user_profiles` query should return 3 personas. Log both to console and confirm.
  - **Done when:** Console shows 5 restaurant objects and 3 user profile objects.

---

### [ ] 8.0 Define Shared TypeScript Types

`description`: Create a shared types file with all TypeScript interfaces that both Dev A and Dev B will use throughout the frontend. This is the contract that keeps both devs' code compatible.

`priority`: P0 — Critical (type mismatches cause integration failures)

`dependencies`: Task 3.0 (schema must be finalized)

`details`:
These types mirror the Supabase schema exactly. Both devs import from this file. Any schema change must be reflected here. Also define the `CompiledStory` and `StorySegment` types that the story player and personalization engine use.

`testStrategy`: Both devs import the types in their components. TypeScript compilation succeeds without errors.

- [ ] 8.1 Create `apps/frontend/src/types/index.ts` with all shared interfaces:
  ```typescript
  export interface Restaurant {
    id: string;
    google_place_id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    rating: number;
    cuisine_type: string[];
    phone?: string;
    website?: string;
  }

  export interface RestaurantImage {
    id: string;
    restaurant_id: string;
    image_url: string;
    source: 'google' | 'owner_upload';
    tags: string[];
    slot_type: 'intro' | 'personalized' | 'outro';
    display_order: number;
  }

  export interface StoryTemplate {
    id: string;
    restaurant_id: string;
    intro_image_id: string;
    outro_image_id: string;
    cta_text: string;
    cta_url?: string;
  }

  export interface UserProfile {
    id: string;
    name: string;
    avatar_url?: string;
    persona_type: 'vegan' | 'carnivore' | 'cocktail_lover';
    preferences: {
      tags: string[];
      avoid_tags: string[];
    };
  }

  export type KenBurnsAnimation =
    | 'ken_burns_zoom_in'
    | 'ken_burns_zoom_out'
    | 'ken_burns_pan_left'
    | 'ken_burns_pan_right';

  export interface StorySegment {
    type: 'intro' | 'personalized' | 'outro';
    image: RestaurantImage;
    duration_ms: number;
    animation: KenBurnsAnimation;
    cta?: {
      text: string;
      url: string;
    };
  }

  export interface CompiledStory {
    restaurant: Restaurant;
    segments: StorySegment[];
  }
  ```
  - **Done when:** File exists, `tsc` compiles without errors, both devs can `import { Restaurant } from '../types'` in their components.
- [ ] 8.2 Verify TypeScript compilation: run `npx tsc --noEmit` from `apps/frontend/`. Should complete with 0 errors.
  - **Done when:** No TypeScript errors related to the types file.

---

## Suggested Execution Order (Parallel Within Phase 0)

| Dev | Time | Task | Why This Order |
|-----|------|------|---------------|
| **Dev A** | 0:00–0:05 | **2.0** Backend dependencies | Unblocks all backend work |
| **Dev B** | 0:00–0:05 | **1.0** Frontend dependencies | Unblocks all frontend work |
| **Dev A** | 0:05–0:15 | **3.0** Supabase schema | Tables must exist before anything else |
| **Dev B** | 0:05–0:15 | **5.0** Frontend routing + layout | Routes must exist for page dev |
| **Dev A** | 0:15–0:20 | **4.0** Environment variables | Both sides need credentials |
| **Dev B** | 0:15–0:20 | **8.0** Shared TypeScript types | Contract for all frontend code |
| **Dev A** | 0:20–0:25 | **6.0** Backend Supabase client | Dev A needs this for Phase 1A |
| **Dev A** | 0:25–0:30 | **7.0** Seed data | Both devs need data to test against |
| **Both** | 0:25–0:30 | **Verify** | Both query Supabase from frontend + backend, confirm data flows |

## Definition of Done (Phase 0)

- [ ] Frontend starts with `npm run dev:frontend` — shows routes at `/`, `/restaurant/:id`, `/owner/:restaurantId`
- [ ] Backend starts with `.venv/bin/python dev_server.py` — responds at `localhost:8000/api/health`
- [ ] Supabase has 4 tables with correct schema and RLS disabled
- [ ] Frontend can query Supabase and get 5 restaurants + 3 user personas
- [ ] Backend can query Supabase and get 5 restaurants + 3 user personas
- [ ] All env vars are configured and loaded in both frontend and backend
- [ ] Shared TypeScript types compile without errors
- [ ] Both devs confirm they can independently work on their Phase 1 tasks
