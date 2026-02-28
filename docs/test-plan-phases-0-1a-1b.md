# TasteTales Test Plan — Phases 0, 1A, 1B

This test plan covers all functionality delivered in **Phase 0 (Foundation)**, **Phase 1A (Owner Story Builder)**, and **Phase 1B (Consumer Story Player)**. Use it for smoke testing, regression, and demo verification.

---

## Prerequisites

- **Backend:** From repo root: `cd apps/backend && .venv/bin/python dev_server.py` (or `npx nx serve backend` if configured). Backend runs on port **8000** (or port in `dev_server.py`).
- **Frontend:** From repo root: `npx nx serve frontend`. Frontend runs on port **5173**.
- **Environment:** `apps/frontend/.env` has `VITE_GOOGLE_MAPS_API_KEY` and `VITE_API_BASE_URL` (e.g. `http://localhost:8000`). `apps/backend/.env` has `GOOGLE_PLACES_API_KEY` and `GEMINI_API_KEY`.
- **Browser:** Test on a mobile viewport (e.g. 375×667) and desktop; use React DevTools to inspect context/state if needed.

---

## 1. Phase 0 — Foundation

### 1.1 Frontend bootstrap

| #     | Test                | Steps                                              | Expected                                                |
| ----- | ------------------- | -------------------------------------------------- | ------------------------------------------------------- |
| 0.1.1 | Dev server starts   | Run `npx nx serve frontend` from repo root         | No compile errors; app loads at `http://localhost:5173` |
| 0.1.2 | TypeScript compiles | Run `npx tsc --noEmit` from `apps/frontend`        | 0 errors                                                |
| 0.1.3 | Routes resolve      | Open `/`, `/restaurant/ChIJV7QQ6kdZwokRax4615zpSGU`, `/owner/ChIJV7QQ6kdZwokRax4615zpSGU` in browser | Each route shows the correct page (no 404)              |

### 1.2 Backend bootstrap

| #     | Test           | Steps                                                                                     | Expected                                 |
| ----- | -------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------- |
| 0.2.1 | Backend starts | Run backend dev server from `apps/backend`                                                | Server listens; no import/runtime errors |
| 0.2.2 | Health check   | `curl http://localhost:8000/api/health`                                                   | 200 with health payload                  |
| 0.2.3 | Python deps    | In backend venv: `python -c "import google.generativeai; import flask_cors; print('OK')"` | Prints "OK"                              |

### 1.3 Data layer & seed data

| #     | Test              | Steps                                          | Expected                                                                                                                                                           |
| ----- | ----------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0.3.1 | Restaurants API   | `curl http://localhost:8000/api/restaurants`   | 200; JSON with array of restaurants; each has `id` (Google Place ID), `name`, `address`, `lat`, `lng`, `rating`, `cuisine_type`                                |
| 0.3.2 | User profiles API | `curl http://localhost:8000/api/user-profiles` | 200; JSON with `data` array of 3 profiles (vegan, carnivore, cocktail_lover), each with `id`, `name`, `persona_type`, `preferences.tags`, `preferences.avoid_tags` |
| 0.3.3 | JSON files exist  | List `apps/backend/data/`                      | `restaurants.json`, `restaurant_images.json`, `story_templates.json`, `user_profiles.json` present and valid JSON                                                  |

### 1.4 CORS & frontend–backend

| #     | Test                | Steps                                                                               | Expected                                                      |
| ----- | ------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 0.4.1 | Fetch from frontend | Open app at 5173; open DevTools Network; trigger any API call (e.g. open Discovery) | Request to backend (8000) succeeds; no CORS errors in console |

---

## 2. Phase 1A — Owner Story Builder (Backend)

### 2.1 Restaurant CRUD

| #      | Test                  | Steps                                                    | Expected                                                                       |
| ------ | --------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1A.1.1 | List restaurants      | `curl http://localhost:8000/api/restaurants`             | 200; `data` array of restaurants                                               |
| 1A.1.2 | Get single restaurant | `curl http://localhost:8000/api/restaurants/ChIJV7QQ6kdZwokRax4615zpSGU`          | 200; single restaurant object; response includes `images` array (may be empty) |
| 1A.1.3 | 404 for unknown id    | `curl http://localhost:8000/api/restaurants/nonexistent` | 404                                                                            |

### 2.2 Google Places import

| #      | Test               | Steps                                                                                                                                           | Expected                                                                                                                                                              |
| ------ | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1A.2.1 | Import by place_id | `curl -X POST http://localhost:8000/api/restaurants/import -H "Content-Type: application/json" -d '{"place_id":"ChIJV7QQ6kdZwokRax4615zpSGU"}'` | 200; response has restaurant object with `id`, `name`, `address`, etc.; `restaurant_images.json` has new entries with `source: "google"`, `slot_type: "personalized"` |
| 1A.2.2 | Import idempotency | Run same import again (same place_id)                                                                                                           | Either same restaurant returned or existing one (no duplicate restaurants with same `google_place_id`)                                                                |

### 2.3 Images CRUD

| #      | Test         | Steps                                                                                                                                                                         | Expected                                                                                                          |
| ------ | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1A.3.1 | Add image    | `curl -X POST http://localhost:8000/api/restaurants/ChIJV7QQ6kdZwokRax4615zpSGU/images -H "Content-Type: application/json" -d '{"image_url":"https://example.com/photo.jpg","source":"owner_upload"}'` | 201; created image object with `id`, `restaurant_id`, `image_url`, `source`, `tags`, `slot_type`, `display_order` |
| 1A.3.2 | Update image | `curl -X PUT http://localhost:8000/api/restaurants/ChIJV7QQ6kdZwokRax4615zpSGU/images/<image_id> -H "Content-Type: application/json" -d '{"slot_type":"intro","tags":["cozy"]}'`                       | 200; updated image returned                                                                                       |
| 1A.3.3 | Delete image | `curl -X DELETE http://localhost:8000/api/restaurants/ChIJV7QQ6kdZwokRax4615zpSGU/images/<image_id>`                                                                                                   | 204; image removed from list on next GET                                                                          |

### 2.4 Image tagging (Gemini)

| #      | Test                          | Steps                                                                                                                        | Expected                                                                                        |
| ------ | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1A.4.1 | Tag single image              | `curl -X POST http://localhost:8000/api/images/tag -H "Content-Type: application/json" -d '{"image_id":"<valid_image_id>"}'` | 200; response includes `tags` array; `restaurant_images.json` has updated `tags` for that image |
| 1A.4.2 | Tag all images for restaurant | `curl -X POST http://localhost:8000/api/restaurants/ChIJV7QQ6kdZwokRax4615zpSGU/images/tag-all`                                                       | 200; all images for that restaurant get tags updated (may take several seconds)                              |

### 2.5 Story template

| #      | Test                   | Steps                                                                                                                                                                                                                      | Expected                                                                     |
| ------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1A.5.1 | Get template (none)    | `curl http://localhost:8000/api/restaurants/ChIJV7QQ6kdZwokRax4615zpSGU/story-template`                                                                                                                                                             | 404 if no template                                                           |
| 1A.5.2 | Create/update template | `curl -X PUT http://localhost:8000/api/restaurants/ChIJV7QQ6kdZwokRax4615zpSGU/story-template -H "Content-Type: application/json" -d '{"intro_image_id":"<id>","outro_image_id":"<id>","cta_text":"Book a Table","cta_url":"https://example.com"}'` | 200; saved template returned                                                 |
| 1A.5.3 | Get template (exists)  | `curl http://localhost:8000/api/restaurants/ChIJV7QQ6kdZwokRax4615zpSGU/story-template`                                                                                                                                                             | 200; template with `intro_image_id`, `outro_image_id`, `cta_text`, `cta_url` |

### 2.6 User profiles

| #      | Test              | Steps                                          | Expected                                                       |
| ------ | ----------------- | ---------------------------------------------- | -------------------------------------------------------------- |
| 1A.6.1 | Get user profiles | `curl http://localhost:8000/api/user-profiles` | 200; 3 profiles with distinct `persona_type` and `preferences` |

---

## 3. Phase 1A — Owner Dashboard (Frontend)

Use a real restaurant id from `GET /api/restaurants` (e.g. `ChIJV7QQ6kdZwokRax4615zpSGU` for Le Bernardin) that has at least one image for full flow.

### 3.1 Page load & data

| #      | Test             | Steps                   | Expected                                                                                                         |
| ------ | ---------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1A.7.1 | Owner page loads | Navigate to `/owner/ChIJV7QQ6kdZwokRax4615zpSGU` | Page loads; restaurant header shows name, address, rating, cuisine types                                         |
| 1A.7.2 | Images displayed | Same page               | Image grid shows all images for that restaurant; each card has thumbnail, tags (pills), slot badge (intro/personalized/outro) |

### 3.2 Image management

| #      | Test              | Steps                                              | Expected                                                                |
| ------ | ----------------- | -------------------------------------------------- | ----------------------------------------------------------------------- |
| 1A.7.3 | Set slot on image | Change slot dropdown on an image to Intro or Outro | Card updates; GET restaurant shows updated `slot_type`       |
| 1A.7.4 | Add image         | Use "Add Image" with a valid image URL; submit     | New card appears in grid; POST to restaurant images occurred |
| 1A.7.5 | Delete image      | Click delete on an image card                      | Card disappears; image removed from API                                 |
| 1A.7.6 | Edit tags         | Add/remove tags on an image (per UI)               | Tags persist; PUT to images endpoint reflected                          |

### 3.3 Import & auto-tag

| #      | Test               | Steps                                                            | Expected                                                                  |
| ------ | ------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1A.7.7 | Import from Google | Enter a valid Google Place ID; click "Import from Google Places" | Loading state; then new restaurant or existing one; images appear in grid |
| 1A.7.8 | Auto-tag all       | Click "Auto-Tag All Images"                                      | Loading state; then tags appear/update on images (Gemini called)          |

### 3.4 Story template builder

| #       | Test             | Steps                                                    | Expected                                                                       |
| ------- | ---------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1A.7.9  | Set intro/outro  | Use "Set as Intro" / "Set as Outro" on image cards       | Template section shows selected intro and outro thumbnails; pool count updates |
| 1A.7.10 | Set CTA and save | Enter CTA text (and optional URL); click "Save Template" | Success; GET restaurant story-template returns saved template       |
| 1A.7.11 | Reload template  | Reload owner page for same restaurant                     | Intro/outro and CTA fields pre-filled from saved template                      |

---

## 4. Phase 1B — Discovery & Persona

### 4.1 Discovery page

| #      | Test             | Steps                 | Expected                                                                                     |
| ------ | ---------------- | --------------------- | -------------------------------------------------------------------------------------------- |
| 1B.1.1 | Discovery loads  | Navigate to `/`       | Map visible (no grey box if API key valid); restaurant cards below map                       |
| 1B.1.2 | Map markers      | Check map             | One marker per restaurant; click marker navigates to `/restaurant/:id`                       |
| 1B.1.3 | Restaurant cards | Scroll card list      | Each card shows name, rating, cuisine pills, thumbnail; click card goes to `/restaurant/:id` |
| 1B.1.4 | Responsive       | Resize to 375px width | Map ~50% height; cards scroll below; no horizontal overflow                                  |

### 4.2 Persona switcher

| #      | Test            | Steps                                 | Expected                                                                                                 |
| ------ | --------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1B.2.1 | Bar visible     | On any route (e.g. /, /restaurant/ChIJV7QQ6kdZwokRax4615zpSGU)      | Persona/story UI behaves as expected (or is absent if PersonaSwitcher removed) |
| 1B.2.2 | Default persona | Load app; open React DevTools context | Default active persona is Vegan (or first vegan profile)                                                 |
| 1B.2.3 | Switch persona  | Click another pill (e.g. Carnivore)   | Active pill updates; context updates; on story page, story re-compiles (different images)                |

---

## 5. Phase 1B — Story Player & Compilation

Use a restaurant that has a story template (intro + outro + at least one personalized image) and tagged images for best demo.

### 5.1 Navigation to story

| #      | Test                      | Steps                                        | Expected                                                                  |
| ------ | ------------------------- | -------------------------------------------- | ------------------------------------------------------------------------- |
| 1B.3.1 | Open story from discovery | From `/`, click a restaurant card or map pin | Navigate to `/restaurant/:id`; loading skeleton appears then story player |

### 5.2 Story player UI

| #      | Test                  | Steps                                 | Expected                                                                             |
| ------ | --------------------- | ------------------------------------- | ------------------------------------------------------------------------------------ |
| 1B.3.2 | Full-screen player    | Story page loaded                     | Full-screen dark overlay; one image visible; progress bars at top                    |
| 1B.3.3 | Progress bars         | Watch without interaction             | One bar per segment; active bar fills over ~4s; then next segment                    |
| 1B.3.4 | Tap right             | Tap right half of screen              | Advances to next segment; on last segment, closes and navigates back                 |
| 1B.3.5 | Tap left              | Tap left half                         | Goes to previous segment (or stays on first)                                         |
| 1B.3.6 | Close button          | Click X (top-right)                   | Story closes; back to discovery or previous route                                    |
| 1B.3.7 | CTA on outro          | Advance to last segment               | CTA button visible (e.g. "Book a Table"); click logs or navigates per implementation |
| 1B.3.8 | Restaurant detail bar | During playback                       | Bar below progress shows restaurant name, rating, cuisine                            |
| 1B.3.9 | Report issue          | Click report/flag icon (bottom-right) | Console log with segment info (no crash)                                             |

### 5.3 Swipe (mobile)

| #       | Test             | Steps                                               | Expected                                          |
| ------- | ---------------- | --------------------------------------------------- | ------------------------------------------------- |
| 1B.3.10 | Swipe left/right | On touch device or emulation, swipe left then right | Swipe left → next segment; swipe right → previous |

### 5.4 Ken Burns & crossfade

| #      | Test       | Steps                                | Expected                                                       |
| ------ | ---------- | ------------------------------------ | -------------------------------------------------------------- |
| 1B.4.1 | Animations | Let each segment play                | Slight zoom/pan on image (no white edges); smooth 4s animation |
| 1B.4.2 | Crossfade  | Advance segment manually or by timer | Short crossfade between segments (no hard cut)                 |

### 5.5 Story compilation & persona

| #      | Test           | Steps                                                                | Expected                                                                                    |
| ------ | -------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1B.5.1 | Segment order  | Play full story                                                      | Order: intro → personalized (2–3) → outro                                                   |
| 1B.5.2 | Persona change | On story page, switch persona (e.g. Vegan → Carnivore)               | Story re-compiles without full reload; personalized segments change (e.g. different dishes) |
| 1B.5.3 | Fallback       | Use restaurant with no tagged personalized images or mismatched tags | Story still shows intro + outro; personalized pool may be unfiltered or minimal             |

### 5.6 Loading & errors

| #      | Test         | Steps                                                                 | Expected                                                                   |
| ------ | ------------ | --------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1B.6.1 | Loading      | Navigate to a restaurant story (e.g. `/restaurant/ChIJV7QQ6kdZwokRax4615zpSGU/story`) (throttle network if needed)             | Skeleton visible until data + preload done; then player appears            |
| 1B.6.2 | No story     | Navigate to `/restaurant/<id>` for restaurant with no images/template | "No story available yet" (or similar) with restaurant name and back action |
| 1B.6.3 | Broken image | Use restaurant with one segment pointing to invalid URL               | Segment skipped or error handled; player does not crash                    |

---

## 6. End-to-end demo flow (recommended order)

1. **Backend up** — Health + `/api/restaurants` + `/api/user-profiles` return data.
2. **Discovery** — Open `/`; map and cards load; click a card → story page.
3. **Story** — Story plays (intro → personalized → outro); progress bars and tap nav work; CTA on last segment.
4. **Persona** — Switch to Carnivore (or Vegan); story content updates.
5. **Owner** — Open owner page for a restaurant (e.g. `/owner/ChIJV7QQ6kdZwokRax4615zpSGU`); confirm header and image grid; set intro/outro and CTA; save template.
6. **Re-check story** — Go back to that restaurant’s story page; story reflects new template (intro/outro/CTA).
7. **Import (optional)** — In owner dashboard, import one restaurant from Google Places; confirm images; run "Auto-Tag All"; confirm tags.
8. **Tag-based personalization** — With tagged images and two personas, verify different personas see different personalized segments.

---

## 7. Quick smoke checklist

- [ ] Frontend dev server starts and all three routes load.
- [ ] Backend dev server starts; `/api/health`, `/api/restaurants`, `/api/user-profiles` return 200.
- [ ] Discovery: map + 5 restaurant cards; click card → story.
- [ ] Story: progress bars, tap next/prev, auto-advance, close, CTA on last segment.
- [ ] Persona switcher: visible; switching changes story content on story page.
- [ ] Owner dashboard: load owner page for a restaurant (id from GET /api/restaurants); images and template section load; save template works.
- [ ] No console errors or CORS errors during above flows.

---

_Test plan version: 1.0 — Phases 0, 1A, 1B._
