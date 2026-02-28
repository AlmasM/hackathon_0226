# Phase 2: Integration, AI Personalization & Demo Prep (Both Devs, ~2 hours)

## Project Overview

TasteTales is a hackathon PoC web app for AI-personalized restaurant "Stories."
Think Google Maps restaurant discovery, but when you tap a restaurant, instead of
static photos, you see an Instagram-style Story reel. The story blends
owner-uploaded content with AI-personalized segments tailored to the user's taste
preferences via Gemini.

**Phase 2 is where the magic comes together.** Dev A's backend (API endpoints,
Gemini image tagging, owner dashboard) and Dev B's frontend (map, story player,
Ken Burns animations, persona switcher) now need to be wired together, enhanced
with Gemini-powered personalization, and polished for a 3-minute demo.

The single most important demo moment: a user views a restaurant story as a
**vegan**, then switches to **carnivore** — and the story visibly changes to show
different images. This must work flawlessly.

## Current State (After Phase 1A + 1B)

### Phase 0 delivered:
- JSON data files (`restaurants.json`, `restaurant_images.json`, `story_templates.json`, `user_profiles.json`)
- Environment variables configured (Google API keys, Gemini key)
- React Router setup, Flask API structure
- Seed data: 3 personas (vegan, carnivore, cocktail_lover) + 5 restaurants
- Shared TypeScript types in `apps/frontend/src/`

### Phase 1A (Dev A) delivered:
- **Backend API endpoints** (`apps/backend/api/index.py`):
  - `GET /api/restaurants`, `GET /api/restaurants/<id>`
  - `POST /api/restaurants/import` (Google Places)
  - `PUT /api/restaurants/<id>/images/<image_id>` (tag editing)
  - `DELETE /api/restaurants/<id>/images/<image_id>`
  - `GET /api/restaurants/<id>/story-template`
  - `PUT /api/restaurants/<id>/story-template`
  - `POST /api/images/tag` (Gemini Vision tagging)
  - `GET /api/user-profiles`
- **Owner dashboard UI**: image grid, tag editing, slot assignment, story template builder
- Restaurants imported from Google Places with photos
- Images tagged by Gemini Vision API with food/ambiance/dietary tags

### Phase 1B (Dev B) delivered:
- **Discovery map page** with Google Maps + restaurant pins + card list
- **User persona switcher** (React Context, 3 personas: vegan, carnivore, cocktail_lover)
- **Instagram-style Story Player** with progress bars, tap navigation, auto-advance, close button
- **Ken Burns animation engine** (4 animation types, crossfade transitions)
- **Client-side story compilation** with basic tag-based filtering (via backend API)
- Loading skeletons, error fallbacks, image preloading

### Data Model Reference

Data stored in `apps/backend/data/` as JSON files. See shared TypeScript types in `apps/frontend/src/types/index.ts` for the full data model.

- **`restaurants.json`** — Array of restaurant objects (id, name, address, lat/lng, rating, cuisine_type, etc.)
- **`restaurant_images.json`** — Array of image objects (id, restaurant_id, image_url, tags, slot_type, display_order, etc.)
- **`story_templates.json`** — Array of story template objects (id, restaurant_id, intro_image_id, outro_image_id, cta_text, cta_url)
- **`user_profiles.json`** — Array of user profile objects (id, name, persona_type, preferences with tags/avoid_tags)

### Shared TypeScript Types
```typescript
interface Restaurant {
  id: string; google_place_id: string; name: string; address: string;
  lat: number; lng: number; rating: number; cuisine_type: string[];
}
interface RestaurantImage {
  id: string; restaurant_id: string; image_url: string;
  source: 'google' | 'owner_upload'; tags: string[];
  slot_type: 'intro' | 'personalized' | 'outro'; display_order: number;
}
interface StoryTemplate {
  id: string; restaurant_id: string; intro_image_id: string;
  outro_image_id: string; cta_text: string; cta_url?: string;
}
interface UserProfile {
  id: string; name: string; avatar_url?: string;
  persona_type: 'vegan' | 'carnivore' | 'cocktail_lover';
  preferences: { tags: string[]; avoid_tags: string[] };
}
interface StorySegment {
  type: 'intro' | 'personalized' | 'outro';
  image: RestaurantImage; duration_ms: number;
  animation: 'ken_burns_zoom_in' | 'ken_burns_zoom_out' | 'ken_burns_pan_left' | 'ken_burns_pan_right';
  cta?: { text: string; url: string };
}
interface CompiledStory {
  restaurant: Restaurant; segments: StorySegment[];
}
```

### API Endpoints Reference
Existing (from Phase 1A): `GET /api/restaurants`, `GET /api/restaurants/<id>`,
`POST /api/restaurants/import`, `PUT/DELETE /api/restaurants/<id>/images/<image_id>`,
`GET/PUT /api/restaurants/<id>/story-template`, `POST /api/images/tag`,
`GET /api/user-profiles`.

**New for Phase 2:** `POST /api/restaurants/<id>/story/personalize` — the key endpoint.

## Key Dependencies & Gotchas

- **Gemini API latency**: Gemini calls can take 2-5 seconds. Pre-warming the cache
  (Task 6.0) is critical so the demo loads instantly.
- **Gemini response parsing**: Gemini may return invalid JSON or wrap the response in
  markdown code fences. Always wrap parsing in try/catch and strip markdown fences
  before `json.loads()`.
- **CORS**: The Flask backend must allow requests from the Vite dev server
  (`localhost:5173`) and the deployed Vercel frontend domain.
- **Integration risk**: Phase 2 has the most integration surface — both devs should
  communicate constantly. Test the `/story/personalize` endpoint manually with
  `curl` before wiring the frontend.
- **Time management**: Last 30 minutes should be ONLY testing and fixing, no new
  features. If something works, move on.
- **Env vars on Vercel**: All keys (Google Maps API key, Google Places API key,
  Gemini API key) must be set in Vercel project settings before deploy.

## Relevant Files

- `apps/backend/api/index.py` - Flask app entry point; add the `/story/personalize` route here
- `apps/backend/api/personalize.py` - **New file**: Gemini personalization logic and endpoint handler
- `apps/backend/api/cache.py` - **New file**: Cache layer for pre-generated stories (in-memory or JSON file)
- `apps/backend/api/warmup.py` - **New file**: Script to pre-generate 15 story combinations
- `apps/backend/requirements.txt` - May need `google-generativeai` if not already present
- `apps/frontend/src/App.tsx` - Root component with routing
- `apps/frontend/src/pages/DiscoveryPage.tsx` - Map + restaurant list (exists from Phase 1B)
- `apps/frontend/src/pages/StoryPage.tsx` - Story player page (exists from Phase 1B); needs API integration
- `apps/frontend/src/components/StoryPlayer.tsx` - Story player component (exists from Phase 1B)
- `apps/frontend/src/components/PersonaSwitcher.tsx` - Persona switcher (exists from Phase 1B)
- `apps/frontend/src/components/OwnerDashboard.tsx` - Owner dashboard (exists from Phase 1A); needs preview button
- `apps/frontend/src/hooks/usePersonalizedStory.ts` - **New file**: Hook to call personalize API
- `apps/frontend/src/services/api.ts` - API client functions (may exist or need creation)
- `docs/demo-script.md` - **New file**: 3-minute demo script
- `vercel.json` - Verify API rewrites and env config

### Notes

- Both devs are working together on this phase. Dev A focuses on backend tasks
  (1.0, 4.0, 6.0) while Dev B focuses on frontend tasks (2.0, 3.0, 7.0). Tasks
  5.0, 8.0, and 9.0 are joint tasks.
- The client-side story compilation from Phase 1B should be preserved as a
  fallback — never delete it, just add the API call path alongside it.
- Test with `curl` before connecting frontend:
  ```bash
  curl -X POST http://localhost:5000/api/restaurants/<RESTAURANT_UUID>/story/personalize \
    -H "Content-Type: application/json" \
    -d '{"user_profile_id": "<VEGAN_USER_UUID>"}'
  ```
- Run the pre-warm script before the demo, not during.

## Tasks

### [ ] 1.0 AI Personalization API Endpoint (Dev A — Backend)

`description`: Build the `POST /api/restaurants/<id>/story/personalize` endpoint —
the core of TasteTales. This endpoint takes a user profile ID, fetches the
restaurant's images + story template + user preferences, sends them to Gemini for
ranking, and returns a fully assembled `CompiledStory` JSON object ready for the
story player to render.
`priority`: Critical — everything else depends on this
`dependencies`: Phase 1A endpoints must be working (restaurant CRUD, image tagging)
`details`: The endpoint must handle Gemini failures gracefully by falling back to
simple tag-matching. Response must conform to the `CompiledStory` TypeScript
interface exactly so Dev B's frontend can consume it without transformation.
`testStrategy`: Test with `curl` for all 3 persona types against at least 2
restaurants. Verify the returned JSON matches the `CompiledStory` shape. Verify
that different personas produce different image selections. Test Gemini failure
fallback by temporarily using a bad API key.

- [ ] 1.1 Create `apps/backend/api/personalize.py` with the route handler function for `POST /api/restaurants/<id>/story/personalize`. Accept JSON body `{ "user_profile_id": "uuid" }`. Return 400 if `user_profile_id` is missing.
- [ ] 1.2 In the handler, read from `restaurant_images.json` via `data_store` for the restaurant's images where `slot_type = 'personalized'`, including their `tags`. Also fetch the images with `slot_type = 'intro'` and `slot_type = 'outro'`. Return 404 if restaurant not found.
- [ ] 1.3 Read from `user_profiles.json` via `data_store` for the row matching the provided `user_profile_id`. Extract `preferences.tags` and `preferences.avoid_tags`. Return 404 if user not found.
- [ ] 1.4 Read from `story_templates.json` via `data_store` for this restaurant. If none exists, use sensible defaults (first image as intro, last as outro, CTA text "Visit us!").
- [ ] 1.5 Build the Gemini prompt: `"Given a user who prefers [tags] and avoids [avoid_tags], rank these restaurant images by relevance. Images: [list of {id, tags}]. Return ONLY a JSON array of image IDs ordered by relevance, most relevant first. No explanation, no markdown, just the JSON array."` Call `google.generativeai` with this prompt.
- [ ] 1.6 Parse Gemini's response. Strip any markdown code fences (` ```json ... ``` `). Attempt `json.loads()`. If parsing fails, log the raw response and fall through to the fallback.
- [ ] 1.7 Implement the tag-matching fallback: score each personalized image by counting matching `tags` (+1 per match) and `avoid_tags` (-2 per match). Sort by score descending. This mirrors Dev B's client-side logic.
- [ ] 1.8 Select the top 2–3 personalized images from the ranked list (Gemini or fallback). Combine with the intro image (first segment) and outro image (last segment) to build the `segments` array.
- [ ] 1.9 Assign animation types: cycle through `ken_burns_zoom_in`, `ken_burns_pan_right`, `ken_burns_zoom_out`, `ken_burns_pan_left` for variety. Set `duration_ms` to 5000 per segment. Attach the CTA (from `story_template`) to the last segment only.
- [ ] 1.10 Assemble the full `CompiledStory` response: `{ "restaurant": {...}, "segments": [...] }`. Return as JSON with `Content-Type: application/json`.
- [ ] 1.11 Register the route in `apps/backend/api/index.py` by importing the handler from `personalize.py` and adding the route to the Flask app.
- [ ] 1.12 Add cache check at the top of the handler: before calling Gemini, check if a cached result exists for this `(restaurant_id, user_profile_id)` pair. If found, return it immediately. Cache storage is implemented in Task 6.0.
- [ ] 1.13 Test manually with `curl` for all 3 personas against 2 restaurants (6 calls total). Verify different personas get different image selections. Verify response shape matches `CompiledStory`.

### [ ] 2.0 Wire Story Player to Backend API (Dev B — Frontend)

`description`: Replace the client-side story compilation (API reads +
tag matching) with calls to the new `POST /api/restaurants/<id>/story/personalize`
endpoint. The Story Player should receive a `CompiledStory` from the API and render
it directly.
`priority`: Critical — this is the integration point
`dependencies`: Task 1.0 must be functional (at least returning valid JSON)
`details`: Keep the existing client-side compilation as a fallback. The API call
should happen when the user navigates to a restaurant story AND when the user
switches personas. Show a loading skeleton while the API responds.
`testStrategy`: Open the story for a restaurant, verify it loads via API (check
Network tab). Switch personas, verify the story re-fetches and shows different
images. Kill the backend, verify the fallback kicks in and the story still loads
(with client-side compilation).

- [ ] 2.1 Create `apps/frontend/src/hooks/usePersonalizedStory.ts`. This custom hook takes `restaurantId: string` and `userProfileId: string` as arguments. It calls `POST /api/restaurants/${restaurantId}/story/personalize` with `{ user_profile_id: userProfileId }` and returns `{ story: CompiledStory | null, loading: boolean, error: Error | null }`.
- [ ] 2.2 In the hook, add error handling: if the API returns a non-200 status or the network request fails, set the `error` state and return `null` for `story`. The consuming component will use this to trigger the fallback.
- [ ] 2.3 In the hook, re-fetch when `userProfileId` changes (persona switch). Use `userProfileId` in the `useEffect` dependency array. Cancel any in-flight request when a new one starts (use `AbortController`).
- [ ] 2.4 Update the Story page/component (e.g., `StoryPage.tsx`) to use `usePersonalizedStory` instead of the existing API query + client-side compilation. Pass the active persona's `id` from the persona context.
- [ ] 2.5 Add fallback logic in the Story page: if `usePersonalizedStory` returns an error, fall back to the existing client-side story compilation function. Show a brief toast or console warning: "Using offline story compilation."
- [ ] 2.6 Show the existing loading skeleton while `loading` is `true`. Ensure it matches the story player dimensions so there's no layout shift.
- [ ] 2.7 Test the full flow: discovery map → click restaurant → loading skeleton → story plays with API data. Switch persona → loading skeleton → story replays with different images.

### [ ] 3.0 Navigation Flow Polish (Dev B — Frontend)

`description`: Ensure smooth, intuitive navigation between the discovery map and
the story player. Handle edge cases like deep links and back navigation.
`priority`: High — bad navigation breaks the demo flow
`dependencies`: Task 2.0 (story player must be wired to API)
`details`: The demo flow is: open app → see map → tap restaurant → story plays →
close story → back to map. This must feel instant and natural. Deep links to
`/restaurant/:id` must also work for sharing.
`testStrategy`: Test the full navigation loop 3 times. Test deep linking by
directly visiting `/restaurant/<id>` in the browser. Test that the map scroll
position is preserved after closing a story.

- [ ] 3.1 Ensure clicking a restaurant pin or card on the discovery map navigates to `/restaurant/:id` using React Router's `navigate()`. Add a brief transition animation if not already present (e.g., fade or slide-up).
- [ ] 3.2 Ensure the Story Player close button calls `navigate(-1)` to go back to the discovery page. Verify the map scroll position is preserved (React Router should handle this, but test it).
- [ ] 3.3 Add deep link support: when `/restaurant/:id` is loaded directly (no prior navigation), fetch the restaurant data on mount via `GET /api/restaurants/<id>` before calling the personalize endpoint. Handle 404 with a "Restaurant not found" message.
- [ ] 3.4 Ensure the persona switcher component is visible and functional on the discovery page (not just the story page). It should be in a fixed header or floating position.
- [ ] 3.5 Test on mobile viewport (Chrome DevTools device mode): verify the story player fills the screen, the close button is reachable, and the persona switcher doesn't overlap critical UI.

### [ ] 4.0 Owner-to-Consumer Preview Link (Dev A — Frontend)

`description`: Add a "Preview Story" button to the owner dashboard that navigates
to the consumer story view for that restaurant, so owners can see how their story
template looks to end users.
`priority`: Medium — nice for demo but not critical path
`dependencies`: Task 2.0 (consumer story must be working)
`details`: The preview should show the story exactly as a consumer would see it,
with the persona switcher active so the owner can toggle between different audience
segments. Use a URL parameter or route to distinguish preview mode if needed.
`testStrategy`: From the owner dashboard, click "Preview Story" and verify the story
plays. Switch personas in the preview and verify different images appear.

- [ ] 4.1 In the owner dashboard component (`apps/frontend/src/components/OwnerDashboard.tsx` or equivalent), add a "Preview Story" button. Style it as a secondary action button near the story template section.
- [ ] 4.2 On click, navigate to `/restaurant/:id` (the same consumer story route). Pass a query parameter `?preview=true` to indicate preview mode.
- [ ] 4.3 In the Story page, detect the `?preview=true` parameter. When in preview mode, show a small banner at the top: "Owner Preview Mode — switch personas to see different versions." The banner should be dismissible.
- [ ] 4.4 Ensure the persona switcher is fully functional in preview mode (it already should be from Task 3.4, but verify).

### [ ] 5.0 CTA Integration (Both Devs)

`description`: Make the Call-to-Action button on the last story segment functional
and visually prominent. In the PoC, clicking CTA shows a toast; we also log clicks
per persona for demo metrics.
`priority`: High — the CTA is the business value proof point in the demo
`dependencies`: Task 2.0 (stories must be rendering from API with CTA data)
`details`: The `CompiledStory` response includes a `cta` field on the last segment
with `text` and `url`. The frontend should render a large, tappable button. On
click, show a toast notification ("Booking requested!") and log the event.
`testStrategy`: Play a story to the last segment. Verify the CTA button appears
with the correct text from the story template. Click it and verify the toast
appears. Check the console or network tab for the logged click event.

- [ ] 5.1 **(Dev B — Frontend)** In the Story Player component, detect when the current segment has a `cta` field. When present, render a large button at the bottom of the screen with the `cta.text` value (e.g., "Book a Table"). Style it as a prominent, semi-transparent overlay button that doesn't obscure the story image.
- [ ] 5.2 **(Dev B — Frontend)** On CTA button click, show a toast notification: "Booking requested! 🎉" Use a simple toast component or CSS animation (no need for a toast library — keep it lightweight).
- [ ] 5.3 **(Dev B — Frontend)** Log the CTA click event: `console.log('CTA_CLICK', { restaurant_id, persona_type, cta_text, timestamp })`. In a real product this would be an analytics event; for the PoC, console logging is sufficient.
- [ ] 5.4 **(Dev A — Backend, optional)** If time allows, add a `POST /api/analytics/cta-click` endpoint that stores clicks in a JSON file or logs them. This can power a "CTA clicks by persona" metric for the demo. Skip if time is tight.

### [ ] 6.0 Pre-warm Cache / Pre-generate Stories (Dev A — Backend)

`description`: Create a script that pre-generates personalized stories for all 15
restaurant × persona combinations (5 restaurants × 3 personas) and caches the
results. This ensures instant story loading during the demo — no waiting for Gemini.
`priority`: Critical for demo — Gemini latency will kill the persona-switching moment
`dependencies`: Task 1.0 must be fully working
`details`: The cache can be a JSON file (`apps/backend/data/cached_stories.json`) or a simple
in-memory Python dictionary. The personalize endpoint (Task 1.0) should check this
cache first. The warmup script calls the personalize endpoint 15 times and stores
each result.
`testStrategy`: Run the warmup script. Verify 15 cached entries exist. Call the
personalize endpoint and verify it returns instantly (< 200ms) with cached data.
Clear the cache and verify it falls back to live Gemini calls.

- [ ] 6.1 Create `apps/backend/api/cache.py` with a cache interface. Implement two functions: `get_cached_story(restaurant_id: str, user_profile_id: str) -> dict | None` and `set_cached_story(restaurant_id: str, user_profile_id: str, story: dict) -> None`. Use a JSON file `apps/backend/data/cached_stories.json` or a module-level Python dictionary for simplicity.
- [ ] 6.2 Integrate the cache into the personalize endpoint (Task 1.12): at the top of the handler, call `get_cached_story()`. If it returns a result, return it immediately. After generating a new story (via Gemini or fallback), call `set_cached_story()` to save it.
- [ ] 6.3 Create `apps/backend/api/warmup.py` — a script or endpoint (`POST /api/warmup`) that reads all restaurants and all user profiles from the JSON data files, then calls the personalize logic for each combination (5 × 3 = 15). Store results via `set_cached_story()`.
- [ ] 6.4 Add a `GET /api/cache/status` endpoint that returns the number of cached stories and lists which combinations are cached. Useful for verifying the warmup ran correctly.
- [ ] 6.5 Run the warmup script and verify all 15 combinations are cached. Test that the personalize endpoint returns cached results instantly.

### [ ] 7.0 Demo Polish & Visual Tweaks (Dev B — Frontend)

`description`: Final UI polish to maximize demo impact. The story player should
feel like a real product — smooth animations, clear persona indication, and
professional visual quality.
`priority`: High — visual quality makes or breaks the demo impression
`dependencies`: Tasks 2.0, 3.0, 5.0 (core functionality must work first)
`details`: Focus on details that are visible in a 3-minute demo: persona label
overlay, progress bar styling, transition smoothness, mobile layout. Don't
over-engineer — if it looks good, move on.
`testStrategy`: Test every visual change with all 3 personas on at least 2
restaurants. Test on mobile viewport (Chrome DevTools or actual phone). Record a
screen capture of the full demo flow and review it.

- [ ] 7.1 Add a "Personalized for you, [Persona Name]" text overlay on the story player. Position it at the top-left or bottom-left, below the progress bars. Style: white text with a subtle text shadow for readability over images. Include the restaurant name above it.
- [ ] 7.2 Style the progress bars: thin (3px height), white, semi-transparent background track, solid white fill for the active segment. Match the Instagram Stories look.
- [ ] 7.3 Ensure crossfade transitions between story segments are smooth (300–500ms). If the current implementation uses hard cuts, add a CSS transition or animation.
- [ ] 7.4 Add a subtle animation to the persona switcher when the active persona changes: a brief glow, scale pulse, or border highlight on the selected persona avatar. This draws attention to the switch during the demo.
- [ ] 7.5 Verify the story player fills the mobile viewport correctly: full-width, full-height, no scrollbars, no address bar interference. Test with Chrome DevTools device mode (iPhone 14 Pro, Pixel 7).
- [ ] 7.6 Ensure images are displayed with `object-fit: cover` so they fill the story frame without letterboxing or distortion, regardless of aspect ratio.
- [ ] 7.7 Run through the complete demo flow (map → story → persona switch → CTA → close → repeat with different restaurant) 3 times. Fix any visual glitches, layout jumps, or timing issues found.

### [ ] 8.0 Deploy to Vercel & Smoke Test (Both Devs)

`description`: Deploy the complete app to Vercel and run a full smoke test on the
deployed version. Fix any deployment-specific issues (CORS, env vars, API routing).
`priority`: Critical — the demo runs on the deployed version
`dependencies`: Tasks 1.0–7.0 should be substantially complete
`details`: Vercel deployment is already configured (`vercel.json` exists). The main
risks are missing env vars, CORS misconfiguration, and API route mapping. Test on
an actual mobile phone if possible.
`testStrategy`: Run through the full demo flow on the deployed URL. Test on both
desktop and mobile. Verify all 5 restaurants load, stories play, persona switching
works, CTA appears. Check browser console for errors.

- [ ] 8.1 Verify all required environment variables are set in the Vercel project settings: `GOOGLE_MAPS_API_KEY`, `GOOGLE_PLACES_API_KEY`, `GEMINI_API_KEY`. Add any missing ones.
- [ ] 8.2 Review `vercel.json` to ensure API routes are correctly mapped: `/api/*` should proxy to the Flask backend. Verify the frontend build output serves from `/`.
- [ ] 8.3 Deploy: either `vercel deploy --prod` from the CLI or push to the `main` branch (if Vercel auto-deploy is configured via GitHub integration).
- [ ] 8.4 Run the warmup script against the **production** API URL to pre-generate cached stories on the deployed instance.
- [ ] 8.5 Smoke test on desktop: open the deployed URL → verify map loads with 5 restaurants → click a restaurant → story plays → switch persona → story changes → CTA button works → close → back to map.
- [ ] 8.6 Smoke test on mobile: open the deployed URL on a phone → repeat the same flow. Verify touch targets are large enough, story fills the screen, and the persona switcher is usable.
- [ ] 8.7 Check the browser console for any errors (CORS, 404s, uncaught exceptions). Fix any issues found.
- [ ] 8.8 If CORS issues arise, add the deployed frontend domain to the Flask CORS allowed origins in `apps/backend/api/index.py`.

### [ ] 9.0 Demo Script Preparation (Both Devs)

`description`: Write a concise 3-minute demo script that showcases the key value
propositions of TasteTales: AI-personalized restaurant stories, persona-driven
content selection, and the owner-to-consumer workflow.
`priority`: High — a good script makes the demo compelling
`dependencies`: Tasks 1.0–8.0 (the app must be deployed and working)
`details`: The script should be rehearsed at least once. It should highlight the
"aha moment" — switching personas and seeing the story change. Save the script as
`docs/demo-script.md` for reference during the presentation.
`testStrategy`: Read the script aloud while performing the actions. Time it — must
be under 3 minutes. Verify every action in the script actually works on the
deployed version.

- [ ] 9.1 Write the demo script in `docs/demo-script.md` with the following flow:
  1. **Open** (15s): Open the app on mobile/projector. "This is TasteTales — AI-personalized restaurant stories."
  2. **Discover** (15s): Show the map with 5 restaurants. "You see restaurants near you, like Google Maps."
  3. **Play Story** (30s): Tap a restaurant. Story plays with Ken Burns animations. "Instead of static photos, you get an Instagram-style story — curated and animated."
  4. **Personalization Reveal** (30s): "But here's the magic — this story was personalized for a **vegan**. Notice it shows plant-based dishes, salads, and the garden patio."
  5. **Persona Switch** (30s): Switch to **Carnivore**. Same restaurant, different story. "Same restaurant, but now the story highlights steaks, BBQ, and the grill section."
  6. **Second Switch** (15s): Switch to **Cocktail Lover**. "For a cocktail lover — the bar, signature drinks, and happy hour."
  7. **CTA** (15s): On the last slide, click "Book a Table." Toast appears. "Every story ends with a call-to-action — driving real business outcomes."
  8. **Owner Side** (15s): Quick flash of owner dashboard. "Owners just upload photos and set a template — AI does the rest."
  9. **Close** (15s): "TasteTales: personalized restaurant discovery through stories. Thank you!"
- [ ] 9.2 Rehearse the demo flow once on the deployed version. Note any timing issues or actions that take too long.
- [ ] 9.3 Identify a backup plan: if Gemini is slow or the API is down during the demo, note which restaurants have cached stories and use those. If all else fails, the client-side fallback should still produce a working (non-personalized) story.
