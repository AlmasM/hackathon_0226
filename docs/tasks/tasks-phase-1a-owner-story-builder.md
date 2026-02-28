# Phase 1A: Owner Story Builder + Backend (Dev A, ~2.5 hours)

## Project Overview

This is the **most important piece** of TasteTales — the content creation pipeline. Without owner content, there's nothing to show consumers. Dev A builds everything needed for a restaurant owner to:

1. Import their restaurant from Google Places (auto-populating photos, name, address)
2. Manage their photo library (add/remove/tag images)
3. Build a story template: `[Fixed Intro] → [AI Personalized Pool] → [Fixed CTA Outro]`
4. Auto-tag images with Gemini Vision so the AI personalization engine (Dev B) knows what each photo contains

The tags on images are the **critical link** between owner content and consumer personalization. A photo tagged `['steak', 'romantic']` gets shown to the carnivore persona; a photo tagged `['salad', 'vegan']` gets shown to the vegan persona.

## Current State (After Phase 0)

When you start, the following already exists:

- **Frontend:** `apps/frontend/` — React 18 + Vite + TypeScript + React Router
- **Backend:** `apps/backend/` — Python Flask on Vercel serverless + flask-cors
- **Data Layer:** JSON files in `apps/backend/data/` (`restaurants.json`, `restaurant_images.json`, `story_templates.json`, `user_profiles.json`)
- **Env vars configured:** `GOOGLE_PLACES_API_KEY`, `GEMINI_API_KEY`
- **Frontend routes:** `/`, `/restaurant/:id`, `/owner/:restaurantId`
- **Shared types:** defined in `src/types/index.ts`
- **Seed data:** 3 user personas + 5 mock restaurants in JSON data files

### Data File Structure

Data is stored as JSON files in `apps/backend/data/`. The backend reads/writes these via `apps/backend/api/data_store.py` (functions like `load_restaurants()`, `save_restaurants(data)`, etc.).

| File | Description |
|------|-------------|
| `apps/backend/data/restaurants.json` | Array of `Restaurant` objects |
| `apps/backend/data/restaurant_images.json` | Array of `RestaurantImage` objects |
| `apps/backend/data/story_templates.json` | Array of `StoryTemplate` objects |
| `apps/backend/data/user_profiles.json` | Array of `UserProfile` objects |

See the TypeScript types below for the shape of each object.

### Shared TypeScript Types (`src/types/index.ts`)

```typescript
interface Restaurant { id: string; google_place_id: string; name: string; address: string; lat: number; lng: number; rating: number; cuisine_type: string[]; phone?: string; website?: string; }
interface RestaurantImage { id: string; restaurant_id: string; image_url: string; source: 'google' | 'owner_upload'; tags: string[]; slot_type: 'intro' | 'personalized' | 'outro'; display_order: number; }
interface StoryTemplate { id: string; restaurant_id: string; intro_image_id: string; outro_image_id: string; cta_text: string; cta_url?: string; }
interface UserProfile { id: string; name: string; avatar_url?: string; persona_type: 'vegan' | 'carnivore' | 'cocktail_lover'; preferences: { tags: string[]; avoid_tags: string[]; }; }
```

## What Dev B is Building in Parallel

Dev B is building the **consumer-facing Story Viewer** — the Instagram-style reel at `/restaurant/:id`. They consume the data Dev A creates:
- Fetch the story template + images via Flask API endpoints
- Personalize which "pool" images to show based on the active user persona
- Ken Burns animations, swipe navigation, persona switcher

**Dev B depends on Dev A's endpoints being functional.** Prioritize backend work so endpoints are available for Dev B to integrate against.

## Key Dependencies & Gotchas

- **Google Places API (New)** uses `https://places.googleapis.com/v1/places/{place_id}` with header `X-Goog-Api-Key` and `X-Goog-FieldMask`. This is NOT the legacy `maps.googleapis.com/maps/api/place` API.
- **Google Places photo URLs are temporary.** The photo reference from the API must be resolved via `https://places.googleapis.com/v1/{photo_name}/media?maxWidthPx=800&key=API_KEY`. Consider storing the resolved URL or proxying.
- **Gemini Vision API** can analyze images by URL directly — no need to download the image first. Use model `gemini-2.0-flash`.
- **This is a hackathon.** Skip input validation, auth, and error edge cases. Get the happy path working first.
- **Tags are king.** The entire personalization engine hinges on images being tagged correctly. Make sure tagging works end-to-end.

## Relevant Files

- `apps/backend/api/index.py` — Flask app entry point (add all routes here or in blueprints)
- `apps/frontend/src/pages/` — Frontend page components
- `apps/frontend/src/types/index.ts` — Shared TypeScript types
- `apps/frontend/src/App.tsx` — Router config (routes already declared)
- `apps/backend/requirements.txt` — Python dependencies (add `google-generativeai` if needed)
- `apps/backend/api/data_store.py` — JSON file read/write utilities

**Files created or modified (Phase 1A implementation):**

| File | Purpose |
|------|---------|
| `apps/backend/api/data_store.py` | JSON data layer: load/save restaurants, images, templates, user_profiles |
| `apps/backend/data/restaurants.json` | Seed restaurant data (5 restaurants) |
| `apps/backend/data/restaurant_images.json` | Restaurant images (initially empty) |
| `apps/backend/data/story_templates.json` | Story templates (initially empty) |
| `apps/backend/data/user_profiles.json` | User personas (3 profiles) |
| `apps/backend/api/places.py` | Google Places API (New) helpers: fetch place, resolve photo URL, map to restaurant |
| `apps/backend/api/image_tagging.py` | Gemini Vision tagging: prompt, parse response, tag_image_from_url |
| `apps/backend/api/index.py` | All Flask routes: restaurants CRUD, import, images CRUD, tag/tag-all, story-template, user-profiles |
| `apps/frontend/src/pages/OwnerDashboardPage.tsx` | Owner dashboard: header, image grid, actions (Import/Auto-Tag/Add), story template 3-slot builder |

### Notes

- Test backend endpoints with `curl` before wiring up the frontend — much faster iteration.
- Dev B will start calling your endpoints within ~1 hour. Get `GET /api/restaurants` and `GET /api/restaurants/<id>` working first.
- The owner dashboard UI just needs to be functional — no design polish needed for the hackathon.

---

## Tasks

### [x] 1.0 Google Places API Integration (Backend)

`description`: Build `POST /api/restaurants/import` — the critical data pipeline that imports a restaurant from Google Places API (New), fetches its photos, and saves everything to JSON data files.

`priority`: **P0 — Critical Path** (nothing else works without restaurant data)

`dependencies`: Phase 0 complete (Flask app running, data files exist, env vars set)

`details`:
The Google Places API (New) is different from the legacy API. Key details:
- **Endpoint:** `GET https://places.googleapis.com/v1/places/{place_id}`
- **Headers:** `X-Goog-Api-Key: {API_KEY}`, `X-Goog-FieldMask: displayName,formattedAddress,location,rating,photos,nationalPhoneNumber,websiteUri,types`
- **Photo resolution:** Each photo in the response has a `name` field (e.g., `places/PLACE_ID/photos/PHOTO_REF`). Resolve to a URL via `https://places.googleapis.com/v1/{photo_name}/media?maxWidthPx=800&key={API_KEY}`. This returns a redirect — follow it or store the final URL.
- **Save to JSON:** Append to `restaurants.json` and `restaurant_images.json` via `data_store`. Each photo gets `source='google'`, `slot_type='personalized'`, and sequential `display_order`.

`testStrategy`: `curl -X POST http://localhost:5000/api/restaurants/import -H "Content-Type: application/json" -d '{"place_id": "ChIJ..."}'` → should return the created restaurant JSON with images.

- [x] 1.1 Create the `/api/restaurants/import` route in Flask
- [x] 1.2 Call Google Places API (New) to fetch restaurant details (`displayName`, `formattedAddress`, `location`, `rating`, `types`, `nationalPhoneNumber`, `websiteUri`, `photos`)
- [x] 1.3 Parse the response and map to `restaurants` table fields (`types` → `cuisine_type`, `displayName.text` → `name`, `location.latitude` → `lat`, etc.)
- [x] 1.4 Resolve each photo reference to a usable image URL via the Places Photo Media endpoint
- [x] 1.5 Append restaurant object to `restaurants.json` via `data_store.save_restaurants()` (handle duplicate `google_place_id` gracefully — upsert or return existing)
- [x] 1.6 Append image objects to `restaurant_images.json` with `source='google'`, `slot_type='personalized'`, sequential `display_order`
- [x] 1.7 Return the full restaurant object with its images array in the response
- [x] 1.8 Test with a real Google Place ID and verify data appears in JSON files and `GET /api/restaurants/<id>` returns it

### [x] 2.0 Gemini Vision Image Tagging (Backend)

`description`: Build `POST /api/images/tag` — sends an image to Gemini Vision API and saves AI-generated tags. Also build a batch variant to tag all images for a restaurant.

`priority`: **P0 — Critical Path** (tags drive the entire personalization engine)

`dependencies`: Task 1.0 (need images in the data files to tag)

`details`:
- Use the `google-generativeai` Python SDK with model `gemini-2.0-flash`
- Send the image URL directly (Gemini can fetch it)
- Prompt: `"Analyze this restaurant photo. Return a JSON array of relevant tags from these categories: food items (e.g., 'steak', 'salad', 'cocktail', 'sushi'), dietary (e.g., 'vegan', 'vegetarian', 'gluten_free'), ambiance (e.g., 'outdoor', 'romantic', 'loud', 'bar'), cuisine (e.g., 'italian', 'mexican', 'japanese'). Return ONLY the JSON array, no markdown formatting."`
- Parse the JSON array from the response (strip markdown code fences if present)
- Update the `tags` field in `restaurant_images.json` via `data_store`

`testStrategy`: `curl -X POST http://localhost:5000/api/images/tag -H "Content-Type: application/json" -d '{"image_id": "uuid-here"}'` → should return `{"tags": ["steak", "romantic", "italian"]}` and update `restaurant_images.json`.

- [x] 2.1 Add `google-generativeai` to `requirements.txt` if not already present
- [x] 2.2 Create `POST /api/images/tag` route — accepts `{"image_id": "..."}`, fetches the image URL from `restaurant_images.json`, sends to Gemini
- [x] 2.3 Build the Gemini Vision prompt and parse the JSON array response (handle markdown code fences in response)
- [x] 2.4 Update the `tags` field in `restaurant_images.json` via `data_store` with the parsed tags
- [x] 2.5 Create `POST /api/restaurants/<id>/images/tag-all` — batch endpoint that tags all untagged images for a restaurant (loop through images, call Gemini for each)
- [x] 2.6 Test with a real image URL and verify tags are reasonable and saved to `restaurant_images.json`

### [x] 3.0 Restaurant CRUD Endpoints (Backend)

`description`: Build standard REST endpoints for listing/reading restaurants and managing images. These are consumed by both the owner dashboard (Dev A) and the story viewer (Dev B).

`priority`: **P0 — Critical Path** (Dev B needs `GET /api/restaurants` and `GET /api/restaurants/<id>` ASAP)

`dependencies`: Phase 0 complete

`details`:
- Keep it simple — read from JSON data files, return as API response
- `GET /api/restaurants/<id>` should include the restaurant's images in the response (filter `restaurant_images.json` by `restaurant_id`)
- Image update endpoint should allow changing `tags`, `slot_type`, and `display_order`
- No auth needed for the hackathon

`testStrategy`: Test each endpoint with `curl`. Verify response shape matches the TypeScript interfaces.

- [x] 3.1 `GET /api/restaurants` — read `restaurants.json` via `data_store`, return JSON array
- [x] 3.2 `GET /api/restaurants/<id>` — read single restaurant + its images from `restaurant_images.json`, return combined JSON
- [x] 3.3 `PUT /api/restaurants/<id>/images/<image_id>` — accept JSON body with `tags`, `slot_type`, `display_order` (any subset), update in `restaurant_images.json` via `data_store`
- [x] 3.4 `DELETE /api/restaurants/<id>/images/<image_id>` — remove from `restaurant_images.json`, return 204
- [x] 3.5 `POST /api/restaurants/<id>/images` — accept `{"image_url": "...", "source": "owner_upload"}`, append to `restaurant_images.json`, return created image
- [x] 3.6 Verify all endpoints return data matching the TypeScript `Restaurant` and `RestaurantImage` interfaces

### [x] 4.0 Story Template Endpoints (Backend)

`description`: Build CRUD for story templates — the structure that defines which images are intro/outro and what the CTA says.

`priority`: **P1 — High** (needed for story compilation but can be built after CRUD)

`dependencies`: Task 3.0 (need restaurant + image endpoints working)

`details`:
- `GET` returns the template for a restaurant (or 404 if none exists)
- `PUT` does an upsert — create if not exists, update if exists
- Template references `intro_image_id` and `outro_image_id` from `restaurant_images`
- Default CTA text is "Book a Table"

`testStrategy`: `curl -X PUT http://localhost:5000/api/restaurants/{id}/story-template -H "Content-Type: application/json" -d '{"intro_image_id": "...", "outro_image_id": "...", "cta_text": "Reserve Now", "cta_url": "https://..."}'` → should return the saved template.

- [x] 4.1 `GET /api/restaurants/<id>/story-template` — query `story_templates` by `restaurant_id`, return JSON (or 404)
- [x] 4.2 `PUT /api/restaurants/<id>/story-template` — upsert logic: check if template exists for this restaurant, insert or update accordingly
- [x] 4.3 Validate that `intro_image_id` and `outro_image_id` reference real images belonging to this restaurant (light validation — just check they exist)
- [x] 4.4 Test the full create → read → update cycle with `curl`

### [x] 5.0 Owner Dashboard Page (Frontend)

`description`: Build the owner-facing UI at `/owner/:restaurantId` — a functional dashboard for managing restaurant images and building the story template.

`priority`: **P0 — Critical Path** (primary deliverable for Dev A's frontend work)

`dependencies`: Tasks 1.0, 2.0, 3.0 (backend endpoints must be functional)

`details`:
- This page does NOT need to be pretty. Functional and clear is the goal.
- Fetch from the Flask API
- Layout suggestion: restaurant info header → image grid → story template builder (bottom)
- Each image card: thumbnail, tag pills, slot dropdown (intro/personalized/outro), delete button
- Buttons: "Import from Google" (calls POST /api/restaurants/import), "Auto-Tag All" (calls POST /api/restaurants/<id>/images/tag-all), "Add Image" (paste URL form)

`testStrategy`: Navigate to `/owner/{restaurant_id}` with a real restaurant ID. Verify: images display, tags show, slot assignment works, import and tagging buttons function.

- [x] 5.1 Create the `OwnerDashboard` page component at the existing `/owner/:restaurantId` route
- [x] 5.2 Fetch restaurant data + images from `GET /api/restaurants/<id>` on mount
- [x] 5.3 Display restaurant header: name, address, rating, cuisine types
- [x] 5.4 Build the image grid — each card shows thumbnail, tags as pills/chips, slot type badge
- [x] 5.5 Add slot assignment dropdown/buttons on each image card (intro / personalized / outro) — calls `PUT /api/restaurants/<id>/images/<image_id>` on change
- [x] 5.6 Add "Import from Google Places" button + place_id input — calls `POST /api/restaurants/import`, refreshes image list on success
- [x] 5.7 Add "Auto-Tag All Images" button — calls `POST /api/restaurants/<id>/images/tag-all`, refreshes tags on completion (show loading state)
- [x] 5.8 Add "Add Image" form (URL input) — calls `POST /api/restaurants/<id>/images`, adds new card to grid
- [x] 5.9 Add delete button on each image card — calls `DELETE`, removes card from grid
- [x] 5.10 Show tag editing: click a tag to remove it, or type to add new tags — calls `PUT` to update

### [x] 6.0 Story Template Builder UI (Frontend)

`description`: Build the template builder section within the owner dashboard — a visual 3-slot layout where the owner defines the story structure.

`priority`: **P1 — High** (needed for the full demo but can be minimal)

`dependencies`: Tasks 4.0, 5.0

`details`:
- Visual layout: `[Intro Image] → [Personalized Pool (N images)] → [Outro Image + CTA]`
- Owner clicks an image in the grid to assign it as Intro or Outro
- All non-intro, non-outro images are automatically in the Personalized Pool
- CTA: text input + optional URL input
- Save button calls `PUT /api/restaurants/<id>/story-template`
- Optional: mini preview showing the 3 segments in order

`testStrategy`: Assign an intro image, an outro image, type CTA text, click save. Verify the template is saved via `GET /api/restaurants/<id>/story-template`.

- [x] 6.1 Build the 3-slot visual layout below the image grid (Intro → Pool → Outro+CTA)
- [x] 6.2 Show the currently assigned intro image (from story template) and outro image with thumbnails
- [x] 6.3 Add "Set as Intro" / "Set as Outro" buttons on image cards (updates `slot_type` and the template)
- [x] 6.4 Show the personalized pool count: "X images in personalized pool"
- [x] 6.5 Add CTA text input and optional CTA URL input
- [x] 6.6 Add "Save Template" button — calls `PUT /api/restaurants/<id>/story-template` with current selections
- [x] 6.7 Load existing template on page mount and pre-fill the UI

### [x] 7.0 User Profiles Endpoint (Backend)

`description`: Build `GET /api/user-profiles` — returns all seeded user personas. Dev B's persona switcher consumes this.

`priority`: **P1 — High** (Dev B needs this, but it's a simple endpoint)

`dependencies`: Phase 0 complete (personas in `user_profiles.json`)

`details`:
- Read from `user_profiles.json` via `data_store.load_user_profiles()`
- Return as JSON array
- Should return the 3 seeded personas: vegan, carnivore, cocktail_lover

`testStrategy`: `curl http://localhost:5000/api/user-profiles` → should return JSON array with 3 profiles matching the `UserProfile` interface.

- [x] 7.1 Create `GET /api/user-profiles` route
- [x] 7.2 Read `user_profiles.json` via `data_store`, return all entries as JSON
- [x] 7.3 Verify response shape matches the TypeScript `UserProfile` interface

---

## Suggested Execution Order

| Time | Task | Why This Order |
|------|------|---------------|
| 0:00–0:20 | **3.0** Restaurant CRUD | Dev B needs `GET /api/restaurants` and `GET /api/restaurants/<id>` ASAP |
| 0:00–0:10 | **7.0** User Profiles Endpoint | Trivial, unblocks Dev B's persona switcher |
| 0:20–0:50 | **1.0** Google Places Import | Core data pipeline — everything flows from this |
| 0:50–1:10 | **2.0** Gemini Vision Tagging | Tags are essential for personalization |
| 1:10–1:20 | **4.0** Story Template Endpoints | Quick CRUD, needed for template builder UI |
| 1:20–2:00 | **5.0** Owner Dashboard Page | Wire up all the backend work into a usable UI |
| 2:00–2:30 | **6.0** Story Template Builder UI | Final polish — the visual template builder |

> **Rule of thumb:** If something unblocks Dev B, do it first. Backend before frontend. Happy path before edge cases.

## Definition of Done (Phase 1A)

- [x] A restaurant can be imported from Google Places with photos auto-populated
- [x] All images can be auto-tagged via Gemini Vision API
- [x] Owner can assign images to intro/personalized/outro slots
- [x] Owner can set CTA text and URL
- [x] Story template is saved and retrievable via API
- [x] All API endpoints return data matching the shared TypeScript interfaces
- [x] Dev B can call `GET /api/restaurants/<id>` and get restaurant + images + tags
- [x] Dev B can call `GET /api/restaurants/<id>/story-template` and get the template
- [x] Dev B can call `GET /api/user-profiles` and get all 3 personas
