# Phase 1B: Consumer Discovery + Story Player (Dev B, ~2.5 hours)

## Project Overview

This phase builds the **consumer-facing** side of TasteTales — the discovery map and the Instagram-style Story Player. This is the demo showpiece: judges will see a map with restaurant pins, tap one, watch a full-screen animated story, then toggle between user personas ("Vegan" → "Carnivore") and see the story instantly change to show different dishes. The persona-switching on the same restaurant is the killer demo moment.

**TasteTales** is a hackathon PoC for AI-personalized restaurant "Stories." Think Google Maps discovery, but tapping a restaurant launches an Instagram-style Story reel that blends owner content with AI-personalized segments tailored to the viewer's taste profile.

## Current State (After Phase 0)

- **Frontend scaffolded:** `apps/frontend/` — React 18 + Vite + TypeScript + React Router + `@vis.gl/react-google-maps`
- **Routes exist:** `/` (discovery), `/restaurant/:id` (detail/story), `/owner/:restaurantId` (Dev A)
- **Shared types defined** in `src/types/index.ts` (`Restaurant`, `RestaurantImage`, `StoryTemplate`, `UserProfile`, `StorySegment`, `CompiledStory`)
- **Google Maps configured** with `VITE_GOOGLE_MAPS_API_KEY`
- **Seed data loaded:** 5 mock restaurants with lat/lng, images with tags, 3 user personas ("The Vegan", "The Carnivore", "The Cocktail Lover")

## What Dev A is Building in Parallel

Dev A is building the **Owner Dashboard** (`/owner/:restaurantId`) and the Flask backend API endpoints (`/api/restaurants`, `/api/restaurants/<id>/story/personalize`, etc.). Dev B should **not block** on Dev A's full API — start with the basic GET endpoints that Dev A will deliver first, or use local mock data as a temporary fallback.

## Key Dependencies & Gotchas

- **Google Maps API key** must have "Maps JavaScript API" enabled in Google Cloud Console.
- `@vis.gl/react-google-maps` requires `<APIProvider apiKey={...}>` wrapper at the app root or around the map page.
- **Google Places images may have CORS issues.** If images fail to load, you may need to proxy them through the backend.
- Ken Burns CSS animations require `overflow: hidden` on the container and the image to be slightly larger than its container.
- Mobile-first: design for phone viewport (100vw × 100vh story player), but it should also work on desktop.
- The persona switcher must trigger an **instant** story recompile — no page reload.

## Relevant Files

- `apps/frontend/src/types/index.ts` — Shared TypeScript interfaces
- `apps/frontend/src/App.tsx` — Router setup, APIProvider wrapper
- `apps/frontend/src/pages/DiscoveryPage.tsx` — Discovery map page (map + card list)
- `apps/frontend/src/contexts/UserProfileContext.tsx` — User persona context and provider
- `apps/frontend/src/components/StoryLoadingSkeleton.tsx` — Loading skeleton for story fetch
- `apps/frontend/src/components/RestaurantDetailBar.tsx` — Restaurant name/rating/cuisine bar in story
- `apps/frontend/src/hooks/useCompiledStory.ts` — Fetch + compile story by persona
- `apps/frontend/src/pages/RestaurantStoryPage.tsx` — Story page (useCompiledStory + StoryPlayer)
- `apps/frontend/src/components/StoryPlayer.tsx` — Full-screen story reel (segments, progress, tap nav)
- `apps/frontend/src/components/PersonaSwitcher.tsx` — Floating persona pill bar
- `apps/frontend/src/components/RestaurantCard.tsx` — Restaurant card (name, rating, cuisine pills, thumbnail)
- `apps/frontend/src/style.css` — Global and discovery page layout styles
- `apps/frontend/src/components/` — Reusable UI components
- `apps/frontend/.env` — Environment variables (VITE_GOOGLE_MAPS_API_KEY, VITE_API_BASE_URL)

### Notes

- This is the DEMO showpiece — polish and smoothness matter more than feature completeness.
- The tag-based image filtering is a simpler precursor to Gemini-powered personalization in Phase 2.
- Default to "The Vegan" persona on first load — it filters the most aggressively, making the persona switch to "Carnivore" the most dramatic.
- Every task below has a concrete "done" definition.

---

## Data Model Reference

See shared TypeScript types in `src/types/index.ts` for the full data model. Data is served by the backend API from JSON files.

---

## Tasks

### [x] 1.0 Restaurant Discovery Map Page

`description`: Build the main discovery page at route `/`. A Google Map showing restaurant pins with a scrollable card list below. Clicking a pin or card navigates to the story player.

`priority`: HIGH

`dependencies`: Phase 0 complete (frontend scaffolded, JSON data seeded, Google Maps key configured)

`details`:

- Use `@vis.gl/react-google-maps` to render a Google Map centered on the seeded restaurant cluster.
- Wrap the map (or the entire app) with `<APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>`.
- Fetch all restaurants from the backend API: `fetch('/api/restaurants')`.
- Place `<AdvancedMarker>` (or `<Marker>`) pins on the map for each restaurant using `lat`/`lng`.
- Below the map, render a scrollable list of restaurant cards showing: name, rating (stars), cuisine type pills, and a small thumbnail image (first image from `restaurant_images`).
- Clicking a card or a map pin navigates to `/restaurant/:id` using React Router's `useNavigate`.
- Mobile-first layout: map takes the top ~50% of the viewport, cards scroll in the bottom half.
- On desktop, consider a side-by-side layout (map left, cards right) or keep the stacked layout.

`testStrategy`: Page loads without errors. Map renders with 5 pins. Cards render below map with restaurant info. Clicking a card navigates to `/restaurant/:id`. Works on mobile viewport.

- [x] 1.1 Create `DiscoveryPage` component at `apps/frontend/src/pages/DiscoveryPage.tsx`
  - Set up the page layout: map container (top) + card list container (bottom).
  - Add a `useEffect` to fetch restaurants from the API on mount.
  - Store restaurants in local state.
  - **Done when:** Component renders with placeholder text "Discovery Map" and "Restaurant Cards" sections.

- [x] 1.2 Integrate Google Map with `@vis.gl/react-google-maps`
  - Wrap the app (or this page) with `<APIProvider apiKey={...}>`.
  - Render a `<Map>` component inside the map container.
  - Set default center to the average lat/lng of seeded restaurants, zoom level ~13.
  - GOTCHA: Ensure "Maps JavaScript API" is enabled in Google Cloud Console. If you see a grey box, check the API key restrictions.
  - **Done when:** Map renders and is interactive (pan/zoom).

- [x] 1.3 Add restaurant markers to the map
  - For each restaurant, render an `<AdvancedMarker>` (or `<Marker>`) at its `lat`/`lng`.
  - Optionally show a small label or custom pin icon.
  - On marker click, navigate to `/restaurant/:id`.
  - **Done when:** 5 pins visible on the map, clicking one navigates to the story route.

- [x] 1.4 Build restaurant card list below the map
  - Create a `RestaurantCard` component: shows name, rating (e.g., "⭐ 4.5"), cuisine type tags, and a thumbnail image.
  - Fetch the first image from the API response (`GET /api/restaurants` returns images inline).
  - Render cards in a vertical scrollable list.
  - On card click, navigate to `/restaurant/:id`.
  - **Done when:** Cards render for all 5 restaurants with real data, clicking navigates correctly.

- [x] 1.5 Mobile-first responsive layout
  - Map container: `height: 50vh`, `width: 100%` on mobile.
  - Card list: fills remaining space, scrollable via `overflow-y: auto`.
  - Add basic CSS/Tailwind styling for a clean look.
  - **Done when:** Looks good on a 375px-wide mobile viewport and acceptable on desktop.

---

### [x] 2.0 User Persona Switcher Component

`description`: Build a persistent floating UI element that lets the demo user switch between the 3 seeded personas. This is what makes the demo magic — switching persona should instantly re-compile the story.

`priority`: HIGH

`dependencies`: Phase 0 complete (user_profiles.json seeded)

`details`:

- Create a `UserProfileContext` using React Context to store the active user persona.
- Fetch all user profiles from the backend API on app load.
- Render a floating bar (bottom of screen or top-right corner) visible on all pages.
- Show 3 persona pills/avatars: 🥬 Vegan, 🥩 Carnivore, 🍸 Cocktail Lover.
- Clicking a persona sets it as active (highlighted/selected state).
- Default to "The Vegan" on first load.
- The context provides `activeProfile` and `setActiveProfile` to any consumer component.

`testStrategy`: Persona bar visible on all pages. Clicking a persona highlights it. Switching personas updates the context value (verify in React DevTools or by rendering the active persona name somewhere). Default is "The Vegan".

- [x] 2.1 Create `UserProfileContext` and provider
  - Create `apps/frontend/src/contexts/UserProfileContext.tsx`.
  - Define context with `activeProfile: UserProfile | null`, `setActiveProfile`, `profiles: UserProfile[]`, `loading: boolean`.
  - In the provider, fetch profiles from the API on mount: `fetch('/api/user-profiles')`.
  - Default `activeProfile` to the profile where `persona_type === 'vegan'`.
  - **Done when:** Context is created and provider wraps the app in `App.tsx`.

- [x] 2.2 Build `PersonaSwitcher` UI component
  - Create `apps/frontend/src/components/PersonaSwitcher.tsx`.
  - Render a floating bar with 3 persona pills.
  - Each pill shows an emoji + short name: 🥬 Vegan, 🥩 Carnivore, 🍸 Cocktail.
  - Active persona pill is highlighted (e.g., solid background vs outline).
  - Use `position: fixed` with `bottom: 16px` or `top: 16px; right: 16px` and a high `z-index`.
  - Rounded corners, semi-transparent dark background, white text — should look sleek over the story player.
  - **Done when:** Floating bar visible on all pages, clicking a pill switches the active persona, active pill is visually distinct.

- [x] 2.3 Integrate persona switcher into App layout
  - Add `<UserProfileProvider>` wrapping the Router in `App.tsx`.
  - Render `<PersonaSwitcher />` inside the provider so it appears on every page.
  - **Done when:** Persona bar persists across route navigation.

---

### [x] 3.0 Instagram-Style Story Player Component

`description`: THE most important UI component. A full-screen overlay that plays a sequence of story segments with progress bars, tap navigation, and auto-advance. This must feel like an Instagram/TikTok story.

`priority`: CRITICAL

`dependencies`: Task 4.0 (Ken Burns animations) — can build structure first, add animations after.

`details`:

- Full-screen overlay: `position: fixed`, `inset: 0`, dark background, `z-index: 50`.
- Accepts `segments: StorySegment[]` as props.
- Shows one segment at a time (current image fills the screen).
- Progress bars at the top: one thin bar per segment, active segment fills left-to-right over its `duration_ms`.
- Tap right half of screen → advance to next segment. Tap left half → go back.
- Auto-advance: after `duration_ms` (default 4000ms), move to next segment.
- On last segment, auto-advance closes the story (navigate back to `/`).
- Close button (X) in top-right corner.
- CTA button on the outro segment: "Book a Table" floating at the bottom.
- Report Issue icon (subtle, bottom-right) — logs to console for PoC.

`testStrategy`: Story player opens full-screen. Progress bars animate correctly. Tapping advances/reverses. Auto-advance works at 4s intervals. Close button works. CTA shows on last segment.

- [x] 3.1 Create `StoryPlayer` component shell
  - Create `apps/frontend/src/components/StoryPlayer.tsx`.
  - Props: `segments: StorySegment[]`, `restaurant: Restaurant`, `onClose: () => void`.
  - Render a fixed full-screen container with dark background.
  - Track `currentIndex` in state.
  - Render the current segment's image as a full-screen background (`object-fit: cover`).
  - **Done when:** Component renders full-screen with a single image displayed.

- [x] 3.2 Add progress bars
  - Render a row of thin horizontal bars at the top (one per segment).
  - Completed segments: fully filled (white).
  - Current segment: animated fill from 0% to 100% over `duration_ms` (use CSS animation or a `requestAnimationFrame` timer).
  - Future segments: grey/transparent.
  - Use a `div` with `width` transitioning from `0%` to `100%` for the active bar.
  - **Done when:** Progress bars show correct state for each segment, active bar animates smoothly.

- [x] 3.3 Implement tap navigation
  - Divide the screen into left half and right half tap zones.
  - Right half click/tap → `currentIndex + 1` (if not last, else close).
  - Left half click/tap → `currentIndex - 1` (if not first, else stay).
  - Reset the progress bar animation when segment changes.
  - **Done when:** Tapping left/right navigates segments correctly.

- [x] 3.4 Implement auto-advance timer
  - Use `useEffect` + `setTimeout` keyed on `currentIndex`.
  - After `segment.duration_ms` (default 4000), advance to next segment.
  - Clear timeout on segment change or unmount.
  - On last segment auto-advance, call `onClose()`.
  - **Done when:** Segments auto-advance every 4 seconds, story closes after the last segment.

- [x] 3.5 Add close button and CTA overlay
  - Close button (X icon): `position: absolute`, top-right, `z-index: 60`. Calls `onClose()`.
  - CTA button: shown only on the last segment (outro). "Book a Table" button centered at the bottom of the screen. Styled as a prominent button. Links to `cta_url` or logs click for PoC.
  - **Done when:** X closes the player, CTA shows only on last segment.

- [x] 3.6 Add swipe support (nice-to-have)
  - Listen for touch events (`touchstart`, `touchend`) to detect horizontal swipes.
  - Swipe left → next segment, swipe right → previous segment.
  - Use a minimum swipe distance threshold (~50px) to avoid accidental triggers.
  - **Done when:** Swiping navigates segments on mobile.

- [x] 3.7 Add Report Issue button
  - Small, subtle icon (e.g., flag or ⚠️) in the bottom-right corner.
  - On click, `console.log('Report issue for segment:', currentIndex, segment)`.
  - Placeholder for future AI artifact reporting.
  - **Done when:** Icon visible, click logs to console.

---

### [x] 4.0 Ken Burns Animation Engine

`description`: CSS/JS animations that make still images look cinematic. Each story segment gets a slow zoom or pan effect, creating a video-like experience from static images.

`priority`: HIGH

`dependencies`: Task 3.0 (Story Player component exists to apply animations to)

`details`:

- Four animation types matching the `StorySegment.animation` type:
  - `ken_burns_zoom_in`: scale 1 → 1.15 over the segment duration
  - `ken_burns_zoom_out`: scale 1.15 → 1 over the segment duration
  - `ken_burns_pan_left`: translateX(0) → translateX(-3%) over duration
  - `ken_burns_pan_right`: translateX(0) → translateX(3%) over duration
- Use CSS `transform` + `transition` for hardware-accelerated 60fps animation.
- Image container must have `overflow: hidden`.
- Image must be slightly larger than the container (e.g., `width: 110%`, `height: 110%`) to allow panning without showing edges.
- Crossfade between segments: outgoing image fades out (opacity 1 → 0 over ~300ms) while incoming image fades in.

`testStrategy`: Each animation type visibly moves/zooms the image. Animations are smooth (no jank). Crossfade transitions between segments are visible. No white/empty space visible during pans.

- [x] 4.1 Create Ken Burns CSS animations/classes
  - Create CSS keyframes or utility classes for the 4 animation types.
  - Can be in a CSS file (`StoryPlayer.css`) or use inline styles with `transition`.
  - Each animation should run for the segment's `duration_ms`.
  - **Done when:** 4 distinct animation classes exist and can be applied to an image element.

- [x] 4.2 Apply animations to story segments in `StoryPlayer`
  - When a segment becomes active, apply its `animation` type to the image.
  - Reset the animation when segment changes (remove and re-add the class, or key the element on `currentIndex`).
  - Use `overflow: hidden` on the image container.
  - Size the image at ~110% of the container to give room for pan effects.
  - **Done when:** Each segment's image visibly animates with its assigned Ken Burns effect.

- [x] 4.3 Add crossfade transitions between segments
  - When advancing segments, crossfade: outgoing image fades to opacity 0 while incoming image fades from opacity 0 to 1.
  - Duration: 200-300ms.
  - Can use two overlapping image elements and toggle their opacity.
  - **Done when:** Segment transitions have a smooth crossfade instead of a hard cut.

---

### [x] 5.0 Story Compilation Logic (Client-Side)

`description`: Logic that fetches restaurant data from the backend API and compiles a `CompiledStory` — selecting and ordering images based on the active user persona's tag preferences. This is a temporary client-side version; Phase 2 will enhance it with Gemini AI personalization.

`priority`: HIGH

`dependencies`: Task 2.0 (UserProfileContext provides active persona), JSON data files seeded

`details`:

- Create a `useCompiledStory(restaurantId: string)` custom hook.
- Fetches from the API: restaurant with its images and story template.
- Compiles the story using the active persona from `UserProfileContext`.
- Story structure:
  1. **Intro segment:** Image referenced by `story_template.intro_image_id`, or the first image with `slot_type = 'intro'`, or the first image overall as fallback.
  2. **Personalized segments (2-3):** Images with `slot_type = 'personalized'`, filtered by persona tags.
  3. **Outro segment:** Image referenced by `story_template.outro_image_id`, or first image with `slot_type = 'outro'`, with CTA overlay.
- Tag-based filtering:
  - Get `activeProfile.preferences.tags` (include) and `activeProfile.preferences.avoid_tags` (exclude).
  - Filter: include images where ANY image tag is in `preferences.tags` AND NO image tag is in `preferences.avoid_tags`.
  - Sort by number of matching tags (most relevant first).
  - Take top 2-3 images.
- Fallback: if no images match, use all `slot_type = 'personalized'` images unfiltered.
- Assign Ken Burns animation types by cycling through the 4 types.
- Set `duration_ms = 4000` for each segment.
- **Re-compile when `activeProfile` changes** — this is the persona-switching magic.

`testStrategy`: Hook returns a `CompiledStory` with intro + personalized + outro segments. Switching persona changes the personalized segments. Fallback works when no tags match. Story always has at least 2 segments (intro + outro).

- [x] 5.1 Create `useCompiledStory` hook
  - Create `apps/frontend/src/hooks/useCompiledStory.ts`.
  - Accept `restaurantId: string` parameter.
  - Fetch restaurant with images: `fetch('/api/restaurants/${restaurantId}')` (images are included in the response).
  - Fetch story template: `fetch('/api/restaurants/${restaurantId}/story-template')`.
  - Return `{ story: CompiledStory | null, loading: boolean, error: string | null }`.
  - **Done when:** Hook fetches data from the backend API and returns raw data (compilation logic comes next).

- [x] 5.2 Implement tag-based image filtering
  - Create a helper function: `filterImagesByPersona(images: RestaurantImage[], profile: UserProfile): RestaurantImage[]`.
  - Filter logic: include images where at least one tag is in `profile.preferences.tags` AND zero tags are in `profile.preferences.avoid_tags`.
  - Sort by number of matching tags (descending).
  - Return top 3 images.
  - Fallback: if result is empty, return all `slot_type === 'personalized'` images (up to 3).
  - **Done when:** Function correctly filters images for each persona. Unit-testable pure function.

- [x] 5.3 Implement story compilation
  - In the hook, compile the `CompiledStory`:
    - Find intro image: `story_template.intro_image_id` → lookup in images, or first `slot_type === 'intro'` image, or first image overall.
    - Find outro image: `story_template.outro_image_id` → lookup in images, or first `slot_type === 'outro'` image.
    - Get personalized images using the filter function from 5.2.
    - Build `StorySegment[]` array: [intro, ...personalized, outro].
    - Assign animation types by cycling: `['ken_burns_zoom_in', 'ken_burns_zoom_out', 'ken_burns_pan_left', 'ken_burns_pan_right'][index % 4]`.
    - Set `duration_ms = 4000` for all segments.
    - Attach CTA to the outro segment from the story template.
  - **Done when:** Hook returns a valid `CompiledStory` with correct segment order and types.

- [x] 5.4 Re-compile on persona change
  - Add `activeProfile` from `UserProfileContext` as a dependency of the compilation `useEffect` / `useMemo`.
  - When `activeProfile` changes, re-run the filtering and compilation (but don't re-fetch from the API — cache the raw data).
  - **Done when:** Switching persona in the UI instantly changes the story segments (different images appear).

---

### [x] 6.0 Loading & Error States

`description`: Build graceful loading and error handling for the story player to ensure a smooth demo experience even when data is loading or missing.

`priority`: MEDIUM

`dependencies`: Task 3.0 (Story Player), Task 5.0 (Story compilation)

`details`:

- Loading skeleton: dark full-screen with pulsing skeleton bars mimicking the story UI.
- Image preloading: before starting playback, preload all segment images using `new Image()` in JavaScript.
- Error fallback: if a restaurant has no images, show "No story available yet" with the restaurant name.
- Image load error: if an individual image fails to load, skip that segment.
- Show a subtle loading indicator while images preload.

`testStrategy`: Loading skeleton appears during data fetch. Story starts only after images are preloaded. No story shows a friendly message. Broken image URLs don't crash the player.

- [x] 6.1 Build loading skeleton for story player
  - Create a `StoryLoadingSkeleton` component.
  - Full-screen dark background with animated pulsing bars at the top (mimicking progress bars) and a pulsing rectangle in the center (mimicking the image area).
  - Use CSS animation (`@keyframes pulse`) for the shimmer effect.
  - Show this while `useCompiledStory` is loading.
  - **Done when:** A skeleton screen appears while story data loads, matching the story player layout.

- [x] 6.2 Implement image preloading
  - Before showing the story player, preload all segment images.
  - Use `Promise.all(segments.map(s => new Promise((resolve, reject) => { const img = new Image(); img.onload = resolve; img.onerror = resolve; img.src = s.image.image_url; })))`.
  - Note: `onerror` also resolves to avoid blocking on broken images.
  - Optionally show a progress indicator (e.g., "Loading 3/5 images...").
  - **Done when:** Story playback starts only after all images are loaded (or attempted). No flash of empty screen.

- [x] 6.3 Build error fallback for no-story state
  - If the compiled story has 0 segments, or the restaurant has no images, show a full-screen message: restaurant name + "No story available yet" + a back button.
  - Styled to match the dark story player aesthetic.
  - **Done when:** Navigating to a restaurant with no images shows the fallback instead of crashing.

- [x] 6.4 Handle individual image load failures
  - In the `StoryPlayer`, if an image fails to render (e.g., `onError` on the `<img>` tag), skip that segment and advance to the next.
  - If all images fail, show the no-story fallback.
  - **Done when:** A broken image URL in one segment doesn't crash the player — it skips to the next segment.

---

### [x] 7.0 Restaurant Detail Bar

`description`: A subtle info overlay within the story player showing restaurant name, rating, and cuisine type — similar to how Instagram shows the username on stories.

`priority`: MEDIUM

`dependencies`: Task 3.0 (Story Player component)

`details`:

- Semi-transparent bar at the top of the story, positioned below the progress bars.
- Shows: restaurant name (bold), rating (e.g., "⭐ 4.5"), cuisine type tags (e.g., "Italian • Pizza").
- Subtle styling: semi-transparent dark background, white text, small font.
- Should not distract from the story content.

`testStrategy`: Bar shows correct restaurant info. Text is readable but unobtrusive. Bar doesn't overlap progress bars.

- [x] 7.1 Create `RestaurantDetailBar` component
  - Create `apps/frontend/src/components/RestaurantDetailBar.tsx`.
  - Props: `restaurant: Restaurant`.
  - Render: name (bold, left-aligned), rating with star emoji, cuisine types joined by " • ".
  - Style: `position: absolute`, top area (below progress bars, e.g., `top: 28px`), full width, `padding: 8px 16px`, semi-transparent dark background (`rgba(0,0,0,0.5)`), white text, small font size.
  - **Done when:** Bar displays restaurant info within the story player without obstructing content.

- [x] 7.2 Integrate into `StoryPlayer`
  - Render `<RestaurantDetailBar restaurant={restaurant} />` inside the story player container.
  - Position it below the progress bar row.
  - Ensure z-index layers correctly: progress bars > detail bar > image.
  - **Done when:** Restaurant info visible during story playback, positioned correctly.
