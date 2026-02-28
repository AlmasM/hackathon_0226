# TasteTales — 3-Minute Demo Script

**Total: ~3 minutes.** Rehearse once on the deployed version. Use cached stories for instant persona switching.

---

## 1. Open (15s)

Open the app on mobile or projector.

> "This is **TasteTales** — AI-personalized restaurant stories. Instead of static photos, you get a story experience tailored to who you are."

---

## 2. Discover (15s)

Show the discovery map with restaurant pins and the card list.

> "You see restaurants near you, like Google Maps — pins and cards you can tap."

---

## 3. Play Story (30s)

Tap a restaurant. Let the story play with Ken Burns animations and progress bars.

> "When you tap a restaurant, you don’t get a static gallery. You get an **Instagram-style story** — curated, animated, and ready to watch."

---

## 4. Personalization Reveal (30s)

Before switching personas, call out what they’re seeing.

> "This story was personalized for a **vegan**. Notice it highlights plant-based dishes, salads, and the garden patio — not the steak or the bar."

---

## 5. Persona Switch — Carnivore (30s)

Switch to **Carnivore** in the persona bar. Same restaurant, new story.

> "Same restaurant — but watch what happens when I switch to **Carnivore**. The story changes. Now it’s steaks, BBQ, and the grill. One place, different stories for different people."

---

## 6. Second Switch — Cocktail Lover (15s)

Switch to **Cocktail Lover**.

> "For a **cocktail lover** — the bar, signature drinks, happy hour. One template, AI does the rest."

---

## 7. CTA (15s)

Advance to the last slide. Tap **"Book a Table"** (or the CTA button). Toast appears.

> "Every story ends with a **call-to-action** — book a table, order delivery — driving real outcomes for the business."

---

## 8. Owner Side (15s)

Quick transition to the owner dashboard (e.g. **Preview Story** or direct URL).

> "On the **owner side**, they just upload photos and set a template. Our AI tags the images and personalizes the story per viewer. No video editing, no A/B tests — it’s automatic."

---

## 9. Close (15s)

> "**TasteTales**: personalized restaurant discovery through stories. Thank you."

---

## Backup Plan

- **Slow or failing Gemini:** Use restaurants and personas that were **pre-warmed**. Run `POST /api/warmup` (or the warmup script) before the demo so cached stories load instantly.
- **API down:** The app falls back to **client-side story compilation** (tag-based). You’ll see a console message: "Using offline story compilation." Stories still play; they’re just not Gemini-personalized.
- **Best for demo:** Pre-warm all 15 combinations (5 restaurants × 3 personas), then use the persona switcher without waiting on the network.
