# Manual Test Plan — Phase 1A (ELI5)

Use this like a checklist. Do each step, then tick ✅ when it works.

---

## Before you start

1. **Backend .env** has:
   - `GOOGLE_PLACES_API_KEY=...` (for Import from Google)
   - `GEMINI_API_KEY=...` (for Auto-Tag)
2. **Two terminals** open at the project root: `.../hackathon_0226`

---

## Part 1: Turn everything on

### Step 1.1 — Start the backend

- In **Terminal 1** run: `npm run dev:backend`
- **You should see:** something like “Backend dev server running at http://localhost:8000”
- If it says “port in use”, something else is on 8000; stop that or change the port in `apps/backend/dev_server.py`

✅ Backend is running

### Step 1.2 — Start the frontend

- In **Terminal 2** run: `npm run dev:frontend`
- **You should see:** Vite starting and a URL like http://localhost:5173
- Open that URL in your browser

✅ Frontend is running

---

## Part 2: Quick API check (backend only)

These prove the server is talking and the data is there. Run in a **third terminal** (or use a tool like Postman).

### Step 2.1 — Health

```bash
curl http://localhost:8000/api/health
```

- **You should see:** JSON with something like `"status":"ok"` or similar (not an error page).

✅ Health works

### Step 2.2 — List restaurants

```bash
curl http://localhost:8000/api/restaurants
```

- **You should see:** A JSON **array** of restaurants (e.g. 5 from seed). Each has `id`, `name`, `address`, `rating`, `cuisine_type`, etc.

✅ List restaurants works

### Step 2.3 — One restaurant (with images)

```bash
curl http://localhost:8000/api/restaurants/r1
```

- **You should see:** One restaurant object **plus** an `"images"` array (can be empty `[]`). No 404.

✅ Single restaurant + images works

### Step 2.4 — User profiles (for personas)

```bash
curl http://localhost:8000/api/user-profiles
```

- **You should see:** A JSON array of 3 profiles (e.g. vegan, carnivore, cocktail_lover) with `name`, `persona_type`, `preferences`.

✅ User profiles work

---

## Part 3: Owner dashboard in the browser

Go to: **http://localhost:5173/owner/r1**  
(Use the port Vite gave you if it’s not 5173.)

### Step 3.1 — Page loads

- **You should see:**
  - A header with a restaurant name, address, rating, and cuisine types (for r1 it’s one of the seed restaurants).
  - An “Actions” section with: Import from Google (place_id input), Auto-Tag All, and Add Image (URL input).
  - An “Images” section (can be empty).
  - At the bottom, a “Story template” section with three boxes: Intro image, Personalized pool, Outro image + CTA.

✅ Owner dashboard loads and shows restaurant info

### Step 3.2 — Add an image (URL)

1. In “Add Image”, paste a **public image URL** (e.g. a food photo from the web).
2. Click the button to add it (or press Enter if the form submits that way).
- **You should see:** A new card in the image grid with that image, “personalized” slot, and empty tags.

✅ Add image works

### Step 3.3 — Change slot (intro / personalized / outro)

1. On one of the image cards, find the **Slot** dropdown.
2. Change it to **intro** (or **outro**).
- **You should see:** The card’s badge/label updates to “intro” or “outro” (and the story template section may update if you already set intro/outro there).

✅ Slot dropdown works

### Step 3.4 — Edit tags (add and remove)

1. **Add tag:** In a card, type a word in the “Add tag” box and click Add (or Enter). Example: `pizza`.
- **You should see:** A small pill/chip appear (e.g. “pizza ×”).
2. **Remove tag:** Click that pill.
- **You should see:** The tag disappears.

✅ Tag add/remove works

### Step 3.5 — Set as Intro / Set as Outro (buttons on the card)

1. On an image card, click **“Set as Intro”**.
- **You should see:** That image appears in the **Intro** box in the Story template section (with thumbnail).
2. On another image card, click **“Set as Outro”**.
- **You should see:** That image appears in the **Outro** box in the Story template section.

✅ Set as Intro / Set as Outro work

### Step 3.6 — Story template: CTA and Save

1. In the **Outro** box (right side of the story template), fill in:
   - **CTA text:** e.g. “Book a Table”
   - **CTA URL (optional):** e.g. `https://example.com/book`
2. Click **“Save Template”**.
- **You should see:** Button might show “Saving…” then back to “Save Template”; no error. If you refresh the page, the same intro/outro and CTA should still be there.

✅ Save story template works

### Step 3.7 — Delete an image

1. On any image card, click **Delete** (usually top-right on the card).
- **You should see:** That card disappears from the grid.

✅ Delete image works

---

## Part 4: Import from Google (needs GOOGLE_PLACES_API_KEY)

### Step 4.1 — Import a restaurant by Place ID

1. Stay on **/owner/r1** (or go to the owner dashboard).
2. In “Import from Google”, paste a **real Google Place ID**.  
   Example (Le Bernardin): `ChIJAQBEylJYwokRlNgMJJHxNiA`  
   (You can find more at [Place ID Finder](https://developers.google.com/maps/documentation/places/web-service/place-id).)
3. Click **“Import from Google”**.
- **You should see:**  
  - If the place is **new**: a new restaurant is created and you might get redirected or see new data; if you’re on that restaurant’s owner page, the image list may refresh with photos from Google.  
  - If the place **already exists** (same `google_place_id`): the existing restaurant is updated and its Google photos are replaced; again, the image list should refresh.
- **If you see an error:** Check that `GOOGLE_PLACES_API_KEY` is set in `apps/backend/.env` and that **Places API (New)** is enabled in Google Cloud.

✅ Import from Google works

---

## Part 5: Auto-Tag images (needs GEMINI_API_KEY)

### Step 5.1 — Tag all images for the restaurant

1. Make sure the restaurant has at least one image (you added one by URL or from Google import).
2. Click **“Auto-Tag All”**.
- **You should see:** Button shows something like “Tagging…” for a few seconds, then the image cards get **tags** (e.g. food, ambiance, cuisine words). No error.
- **If you see an error:** Check that `GEMINI_API_KEY` is set in `apps/backend/.env`.

✅ Auto-Tag All works

---

## Part 6: Quick “full flow” check

Do this once to tie everything together:

1. Open **/owner/r1**.
2. Add **one image** via URL.
3. Click **“Set as Intro”** on that image.
4. Add **another image** via URL.
5. Click **“Set as Outro”** on the second image.
6. Click **“Auto-Tag All”** and wait until tags appear.
7. Set **CTA text** to “Reserve Now” and click **“Save Template”**.
8. **Refresh the page.**

- **You should see:** Same restaurant, same two images (intro + outro), tags still there, story template still showing intro/outro and “Reserve Now”. Nothing is lost.

✅ Full flow works and data persists

---

## If something breaks

| Problem | What to check |
|--------|----------------|
| “Cannot GET /api/…” or connection refused | Backend running? Correct URL (e.g. http://localhost:8000)? |
| Blank page or “Restaurant not found” | Did you use a real restaurant id from seed? Try `r1`, `r2`, … `r5`. |
| Import from Google fails | `GOOGLE_PLACES_API_KEY` in `apps/backend/.env`, Places API (New) enabled. |
| Auto-Tag fails or no tags | `GEMINI_API_KEY` in `apps/backend/.env`. |
| Frontend can’t reach backend | CORS is on; frontend uses same host/port as backend (e.g. `VITE_API_URL` or default http://localhost:8000). |

---

## Checklist summary

- [ ] Part 1: Backend and frontend start
- [ ] Part 2: Health, restaurants list, one restaurant, user profiles (APIs)
- [ ] Part 3: Dashboard loads, add image, slot, tags, Set Intro/Outro, save template, delete image
- [ ] Part 4: Import from Google (optional, needs key)
- [ ] Part 5: Auto-Tag All (optional, needs key)
- [ ] Part 6: Full flow + refresh (data persists)

When all boxes are ticked, Phase 1A is manually tested.
