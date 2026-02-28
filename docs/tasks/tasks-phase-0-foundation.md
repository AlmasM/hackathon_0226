# Phase 0: Foundation (Both Devs Together, ~30 min)

## Project Overview

**TasteTales** is a hackathon PoC web app for AI-personalized restaurant "Stories." Think Google Maps restaurant discovery, but when you tap a restaurant, instead of static photos, you see an Instagram-style Story reel that blends owner-uploaded content with AI-personalized segments tailored to the viewer's taste preferences.

**Why this matters:** Restaurant discovery platforms show generic content — a vegan sees steaks, a cocktail lover sees kids' menus. By dynamically personalizing the visual story per user, we increase engagement and conversion. This PoC proves the concept for pitching to Google Maps, Yelp, or OpenTable as a native integration.

**Why Phase 0 matters:** This phase builds the shared foundation that both devs depend on. If the data files are wrong, API contracts are misaligned, or env vars are missing — all parallel work in Phase 1A and 1B will stall. Both devs work together for 30 minutes to get this right, then split.

## Current State of Architecture

**What exists today:**
- **Monorepo** with `apps/frontend/` and `apps/backend/`
- **Frontend:** React 18 + Vite 7 + TypeScript. Has a bare `App.tsx` component, `main.tsx` entry point, and basic CSS. Already configured with `@vitejs/plugin-react` and JSX support (`tsconfig.json` has `"jsx": "react-jsx"`).
- **Backend:** Python Flask on Vercel serverless. `api/index.py` has two routes: `/api/health` and `/api`. Dev server at `dev_server.py` runs on port 8000.
- **Deployment:** Vercel configured (`vercel.json`) — routes `/api/*` to Python backend, serves frontend from `apps/frontend/dist/`.
- **Package manager:** npm workspaces (root `package.json` has `workspaces: ["apps/frontend"]`).

**What's MISSING (this phase delivers it all):**
- No React Router (no page routing)
- No data files (no seed data)
- No Google Maps SDK
- No environment variables configured
- No shared TypeScript types
- No seed data (no restaurants, no user personas)
- No CORS configuration on the backend
- No backend dependencies beyond Flask

## Key Dependencies & Setup Gotchas

1. **Google Cloud Console API Enablement:** The Google Maps API key must have these APIs enabled: **Maps JavaScript API**, **Places API (New)**, and **Generative Language API** (for Gemini). A single key can cover all three, but each must be explicitly enabled.
2. **Vite env vars:** Vite only exposes env vars prefixed with `VITE_`. Backend vars (no prefix) won't be available in the frontend.
3. **CORS:** The Vite dev server runs on `localhost:5173`, the Flask dev server on `localhost:8000`. Without CORS configuration, frontend-to-backend API calls will fail silently.
4. **Python virtual environment:** The backend uses a venv at `apps/backend/.venv/`. Run `python3 -m venv .venv && .venv/bin/pip install -r requirements.txt` to set up.
5. **Google Places photo URLs:** These are not direct image URLs — they require API key authentication. Plan for this in the data model (store the photo reference, resolve to URL on demand).

## Relevant Files

- `apps/frontend/package.json` — Add React Router, Google Maps package
- `apps/frontend/src/App.tsx` — Set up React Router and layout shell
- `apps/frontend/src/main.tsx` — Entry point (already renders `<App />`)
- `apps/frontend/src/types/index.ts` — **New file**: Shared TypeScript interfaces
- `apps/frontend/.env` — **New file**: Frontend environment variables
- `apps/frontend/.env.example` — **New file**: Template for frontend env vars
- `apps/backend/requirements.txt` — Add Python dependencies
- `apps/backend/api/index.py` — Add CORS, import route blueprints
- `apps/backend/api/data_store.py` — **New file**: JSON data layer module
- `apps/backend/data/restaurants.json` — **New file**: Seed restaurant data
- `apps/backend/data/restaurant_images.json` — **New file**: Seed image data
- `apps/backend/data/story_templates.json` — **New file**: Story template data
- `apps/backend/data/user_profiles.json` — **New file**: User persona data
- `apps/backend/.env` — **New file**: Backend environment variables
- `apps/backend/.env.example` — **New file**: Template for backend env vars
- `.gitignore` — Add `.env` files

### Notes

- Both devs should be on a call or side-by-side during Phase 0 — decisions here affect everything downstream.
- Split the work: one dev handles frontend setup (Tasks 1, 5, 8), the other handles backend + JSON data files (Tasks 2, 3, 4, 7). Task 6 is done together.
- Verify the foundation works before splitting: both devs should confirm they can fetch data from the backend API.

---

## Tasks

### [ ] 1.0 Install Frontend Dependencies

`description`: Add all required npm packages to the frontend workspace so both devs have the libraries they need for Phase 1.

`priority`: P0 — Critical (blocks all frontend work)

`dependencies`: None

`details`:
The frontend currently has only `react`, `react-dom`, `@vitejs/plugin-react`, `typescript`, and `vite`. We need routing and Google Maps rendering. Install all at once to avoid repeated `npm install` cycles.

`testStrategy`: Run `npm run dev:frontend` from the repo root. App should start without errors. Import each package in a test file to confirm resolution.

- [ ] 1.1 From the repo root, run: `npm install react-router-dom @vis.gl/react-google-maps --workspace @hackathon/frontend`
  - **Done when:** `package.json` in `apps/frontend/` lists both as dependencies and `node_modules` contains them.
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
The backend `requirements.txt` is currently empty (just a comment). We need the Google Generative AI SDK, HTTP request library, env var management, and CORS support. The venv may need to be recreated.

`testStrategy`: Activate the venv, run `python -c "import google.generativeai; import flask_cors; print('OK')"`. All imports should succeed.

- [ ] 2.1 Update `apps/backend/requirements.txt` with:
  ```
  flask
  flask-cors
  google-generativeai
  requests
  python-dotenv
  ```
  - **Done when:** File contains all dependencies.
- [ ] 2.2 Set up the virtual environment and install: `cd apps/backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`
  - **Done when:** All packages install without errors.
  - **GOTCHA:** If you get `error: externally-managed-environment`, you MUST use the venv. Don't use `--break-system-packages`.
- [ ] 2.3 Verify imports work: `.venv/bin/python -c "import google.generativeai; import flask_cors; print('All imports OK')"`
  - **Done when:** Prints "All imports OK" with no errors.
- [ ] 2.4 Add CORS to Flask app in `apps/backend/api/index.py`:
  ```python
  from flask_cors import CORS
  CORS(app)
  ```
  - **Done when:** Frontend at `localhost:5173` can call backend at `localhost:8000` without CORS errors.

---

### [ ] 3.0 Create JSON Data Files

`description`: Create the seed data files in `apps/backend/data/` that serve as the application's data layer. No database — the backend reads and writes these JSON files directly.

`priority`: P0 — Critical (data files are the foundation for all data)

`dependencies`: None (can be done in parallel with Tasks 1.0 and 2.0)

`details`:
Create the `apps/backend/data/` directory and populate it with 4 JSON files. These files ARE the data layer. The backend will read from them to serve API responses and write to them when data is updated.

`testStrategy`: All 4 JSON files exist in `apps/backend/data/`, are valid JSON, and contain the correct seed data.

- [ ] 3.1 Create the `apps/backend/data/` directory.
  - **Done when:** Directory exists.
- [ ] 3.2 Create `apps/backend/data/restaurants.json` with 5 seed restaurants:
  ```json
  [
    {
      "id": "r1",
      "google_place_id": "ChIJAQBEylJYwokRlNgMJJHxNiA",
      "name": "Le Bernardin",
      "address": "155 W 51st St, New York, NY",
      "lat": 40.7618,
      "lng": -73.9818,
      "rating": 4.7,
      "cuisine_type": ["french", "seafood", "fine_dining"],
      "phone": null,
      "website": null
    },
    {
      "id": "r2",
      "google_place_id": "ChIJ4WAmhqJZwokRIPEYdG2QROI",
      "name": "Peter Luger Steak House",
      "address": "178 Broadway, Brooklyn, NY",
      "lat": 40.7099,
      "lng": -73.9624,
      "rating": 4.4,
      "cuisine_type": ["steakhouse", "american", "classic"],
      "phone": null,
      "website": null
    },
    {
      "id": "r3",
      "google_place_id": "ChIJhUBe4WBZwokRnLGNGx5paQQ",
      "name": "Death & Co",
      "address": "433 E 6th St, New York, NY",
      "lat": 40.7265,
      "lng": -73.9878,
      "rating": 4.5,
      "cuisine_type": ["cocktail_bar", "speakeasy", "drinks"],
      "phone": null,
      "website": null
    },
    {
      "id": "r4",
      "google_place_id": "ChIJi3MwDPRYwokR7L20FGbVECU",
      "name": "By Chloe",
      "address": "185 Bleecker St, New York, NY",
      "lat": 40.7293,
      "lng": -73.9997,
      "rating": 4.3,
      "cuisine_type": ["vegan", "fast_casual", "healthy"],
      "phone": null,
      "website": null
    },
    {
      "id": "r5",
      "google_place_id": "ChIJK1Gm8RpZwokRn2p5Z3PjfVo",
      "name": "Gramercy Tavern",
      "address": "42 E 20th St, New York, NY",
      "lat": 40.7386,
      "lng": -73.9884,
      "rating": 4.6,
      "cuisine_type": ["american", "new_american", "fine_dining"],
      "phone": null,
      "website": null
    }
  ]
  ```
  - **Done when:** File exists with 5 restaurant objects, each with an `id` field.
  - **NOTE:** These Place IDs are approximate. If the Google Places import in Phase 1A fails with "Place not found," you may need to look up the correct Place IDs via the [Place ID Finder](https://developers.google.com/maps/documentation/places/web-service/place-id).
- [ ] 3.3 Create `apps/backend/data/restaurant_images.json` with an empty array:
  ```json
  []
  ```
  - **Done when:** File exists. Images will be populated by the Google Places import in Phase 1A.
- [ ] 3.4 Create `apps/backend/data/story_templates.json` with an empty array:
  ```json
  []
  ```
  - **Done when:** File exists. Templates will be created later.
- [ ] 3.5 Create `apps/backend/data/user_profiles.json` with 3 seed personas:
  ```json
  [
    {
      "id": "up1",
      "name": "The Vegan",
      "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=vegan",
      "persona_type": "vegan",
      "preferences": {
        "tags": ["vegan", "vegetarian", "salad", "organic", "plant_based", "smoothie", "avocado", "tofu", "garden", "healthy"],
        "avoid_tags": ["steak", "meat", "burger", "bbq", "bacon", "ribeye", "pork", "chicken_wings"]
      }
    },
    {
      "id": "up2",
      "name": "The Carnivore",
      "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=carnivore",
      "persona_type": "carnivore",
      "preferences": {
        "tags": ["steak", "burger", "bbq", "meat", "ribeye", "smoked", "grill", "bacon", "wings", "prime_rib"],
        "avoid_tags": ["tofu", "vegan", "plant_based"]
      }
    },
    {
      "id": "up3",
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
  - **Done when:** File exists with 3 user profile objects, each with an `id` field and distinct preferences.

---

### [ ] 4.0 Configure Environment Variables

`description`: Set up `.env` files for both frontend and backend with all API keys. Create `.env.example` templates for the team.

`priority`: P0 — Critical (nothing connects without credentials)

`dependencies`: None

`details`:
Vite requires `VITE_` prefix for frontend env vars. Backend uses `python-dotenv` to load from `.env`. Never commit `.env` files — only `.env.example` with placeholder values.

`testStrategy`: Frontend: `console.log(import.meta.env.VITE_GOOGLE_MAPS_API_KEY)` shows the key. Backend: `os.getenv('GEMINI_API_KEY')` returns the key.

- [ ] 4.1 Create `apps/frontend/.env`:
  ```
  VITE_GOOGLE_MAPS_API_KEY=your-google-maps-key
  ```
  - **Done when:** File exists with real values (not placeholders).
- [ ] 4.2 Create `apps/frontend/.env.example`:
  ```
  VITE_GOOGLE_MAPS_API_KEY=your-google-maps-key-here
  ```
  - **Done when:** File exists with placeholder values.
- [ ] 4.3 Create `apps/backend/.env`:
  ```
  GOOGLE_PLACES_API_KEY=your-google-api-key
  GEMINI_API_KEY=your-gemini-api-key
  ```
  - **Done when:** File exists with real values.
- [ ] 4.4 Create `apps/backend/.env.example`:
  ```
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
  - **Done when:** `os.getenv('GEMINI_API_KEY')` returns the correct value in backend code.

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

---

### [ ] 6.0 Set Up Backend JSON Data Layer

`description`: Create a Python module that reads and writes the JSON data files, and scaffold the Flask route structure for Dev A to build on in Phase 1A.

`priority`: P0 — Critical (Dev A needs this to build endpoints)

`dependencies`: Tasks 2.0 (dependencies installed), 3.0 (JSON data files created), 4.0 (env vars configured)

`details`:
Create a data store module that provides simple functions to load and save each JSON data file. The backend reads from and writes to these files for all API operations.

`testStrategy`: Run the backend dev server and call `GET /api/health`. Then call the test route to verify data loads from JSON files.

- [ ] 6.1 Create `apps/backend/api/data_store.py`:
  ```python
  import json
  import os

  DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')

  def _load(filename):
      filepath = os.path.join(DATA_DIR, filename)
      with open(filepath, 'r') as f:
          return json.load(f)

  def _save(filename, data):
      filepath = os.path.join(DATA_DIR, filename)
      with open(filepath, 'w') as f:
          json.dump(data, f, indent=2)

  def load_restaurants():
      return _load('restaurants.json')

  def save_restaurants(data):
      _save('restaurants.json', data)

  def load_images():
      return _load('restaurant_images.json')

  def save_images(data):
      _save('restaurant_images.json', data)

  def load_templates():
      return _load('story_templates.json')

  def save_templates(data):
      _save('story_templates.json', data)

  def load_user_profiles():
      return _load('user_profiles.json')
  ```
  - **Done when:** Importing `load_restaurants` works and returns a list of 5 restaurant dicts.
- [ ] 6.2 Add a test route in `apps/backend/api/index.py` to verify the data layer:
  ```python
  from api.data_store import load_restaurants

  @app.get("/api/test-data")
  def test_data():
      restaurants = load_restaurants()
      return {"count": len(restaurants), "data": restaurants}, 200
  ```
  - **Done when:** `curl http://localhost:8000/api/test-data` returns `{"count": 5, "data": [...]}`.
- [ ] 6.3 Remove the test route after verification (it was just for confirming the data layer works).

---

### [ ] 7.0 Verify Seed Data

`description`: Verify that the JSON data files created in Task 3.0 contain the correct seed data and are accessible via the backend API.

`priority`: P0 — Critical (no data = nothing to display or test)

`dependencies`: Tasks 3.0 (JSON data files must exist), 6.0 (data layer must be set up)

`details`:
The seed data IS the JSON files from Task 3.0. This task simply verifies the files exist, contain the right data, and are correctly served by the backend.

`testStrategy`: Call the backend API and confirm the correct data is returned.

- [ ] 7.1 Add API endpoints to serve the data:
  ```python
  from api.data_store import load_restaurants, load_user_profiles

  @app.get("/api/restaurants")
  def get_restaurants():
      return {"data": load_restaurants()}, 200

  @app.get("/api/user-profiles")
  def get_user_profiles():
      return {"data": load_user_profiles()}, 200
  ```
  - **Done when:** Endpoints exist and return data.
- [ ] 7.2 Verify restaurants: `curl http://localhost:8000/api/restaurants` — should return 5 restaurant objects covering diverse cuisines (french, steakhouse, cocktail bar, vegan, american).
  - **Done when:** Response contains 5 restaurant objects with correct fields.
- [ ] 7.3 Verify user profiles: `curl http://localhost:8000/api/user-profiles` — should return 3 persona objects with distinct preferences.
  - **Done when:** Response contains 3 user profile objects. Each persona's preferences have distinct `tags` and `avoid_tags`.

---

### [ ] 8.0 Define Shared TypeScript Types

`description`: Create a shared types file with all TypeScript interfaces that both Dev A and Dev B will use throughout the frontend. This is the contract that keeps both devs' code compatible.

`priority`: P0 — Critical (type mismatches cause integration failures)

`dependencies`: Task 3.0 (data shape must be finalized)

`details`:
These types define the shape of the JSON data files. Both devs import from this file. Any data shape change must be reflected here. Also define the `CompiledStory` and `StorySegment` types that the story player and personalization engine use.

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
| **Dev A** | 0:05–0:15 | **3.0** JSON data files | Data must exist before anything else |
| **Dev B** | 0:05–0:15 | **5.0** Frontend routing + layout | Routes must exist for page dev |
| **Dev A** | 0:15–0:20 | **4.0** Environment variables | Both sides need credentials |
| **Dev B** | 0:15–0:20 | **8.0** Shared TypeScript types | Contract for all frontend code |
| **Dev A** | 0:20–0:25 | **6.0** Backend data layer | Dev A needs this for Phase 1A |
| **Dev A** | 0:25–0:30 | **7.0** Verify seed data | Both devs need data to test against |
| **Both** | 0:25–0:30 | **Verify** | Both fetch data from backend API, confirm data flows |

## Definition of Done (Phase 0)

- [ ] Frontend starts with `npm run dev:frontend` — shows routes at `/`, `/restaurant/:id`, `/owner/:restaurantId`
- [ ] Backend starts with `.venv/bin/python dev_server.py` — responds at `localhost:8000/api/health`
- [ ] JSON data files exist in `apps/backend/data/` with seed data (5 restaurants, 3 user profiles)
- [ ] Backend can read and return data from JSON files via API endpoints
- [ ] Frontend can fetch from backend API (`/api/restaurants`, `/api/user-profiles`) and receive data
- [ ] All env vars are configured and loaded in both frontend and backend
- [ ] Shared TypeScript types compile without errors
- [ ] Both devs confirm they can independently work on their Phase 1 tasks
