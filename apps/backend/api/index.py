import os
import uuid

import requests
from dotenv import load_dotenv
from flask import Flask, request
from flask_cors import CORS

from api.cache import get_cache_status, set_cached_story, update_restaurant_ids
from api.data_store import load_restaurants, save_restaurants, load_images, save_images, load_templates, save_templates, load_user_profiles
from api.health import get_health_payload
from api.image_tagging import tag_image_from_url
from api.personalize import handle_personalize, personalize_story
from api.places import (
    fetch_place_details,
    fetch_place_photo_urls,
    fetch_place_reviews,
    map_place_to_restaurant,
    resolve_photo_url,
    resolve_photos_from_details,
)

load_dotenv()

app = Flask(__name__)
CORS(app)


@app.errorhandler(404)
def not_found(_e):
    return {"error": "Not Found", "message": "The requested URL was not found on the server."}, 404


@app.errorhandler(500)
def server_error(_e):
    return {"error": "Internal Server Error", "message": "An unexpected error occurred."}, 500


@app.get("/health")
@app.get("/api/health")
def health():
    return get_health_payload(), 200


@app.get("/")
@app.get("/api")
def index():
    return {
        "message": "Hello from Python backend on Vercel",
        "status": "ok",
    }, 200


# --- Restaurant import from Google Places (Task 1.0) ---


@app.post("/api/restaurants/import")
def import_restaurant():
    """
    1.0 Import restaurant from Google Places API (New).
    Body: {"place_id": "ChIJ..."}.
    Returns restaurant object with images array. Upserts on duplicate google_place_id.
    """
    body = request.get_json(silent=True) or {}
    place_id = (body.get("place_id") or "").strip()
    if not place_id:
        return {"error": "place_id is required"}, 400

    api_key = os.getenv("GOOGLE_PLACES_API_KEY")
    if not api_key:
        return {"error": "GOOGLE_PLACES_API_KEY is not set"}, 503

    try:
        details = fetch_place_details(place_id, api_key)
    except requests.exceptions.HTTPError as e:
        if e.response is not None:
            status = e.response.status_code
            try:
                body = e.response.json()
                msg = body.get("error", {}).get("message") or body.get("message") or e.response.text[:200]
            except Exception:
                msg = e.response.text[:200] if e.response.text else str(e)
            if status == 404:
                return {"error": "Place not found. Use a current Place ID from Place ID Finder or try ChIJj61dQgK6j4AR4GeTYWZsKWw (Googleplex). Ensure Places API (New) is enabled for your key."}, 404
            return {"error": f"Google Places API error ({status}): {msg}"}, 502
        return {"error": f"Google Places API error: {e}"}, 502
    except requests.exceptions.RequestException as e:
        return {"error": f"Request failed: {e}"}, 502

    restaurants = load_restaurants()
    images = load_images()
    existing = next((r for r in restaurants if r.get("google_place_id") == place_id), None)

    if existing:
        restaurant_id = existing["id"]
        restaurant = map_place_to_restaurant(place_id, details, restaurant_id)
        # Update in place
        for i, r in enumerate(restaurants):
            if r.get("id") == restaurant_id:
                restaurants[i] = restaurant
                break
        # Remove existing google-sourced images for this restaurant
        images = [img for img in images if not (img.get("restaurant_id") == restaurant_id and img.get("source") == "google")]
    else:
        # Use Google Place ID as restaurant id so we never create template IDs like "r1" or "rc51fdefa"
        restaurant_id = place_id
        restaurant = map_place_to_restaurant(place_id, details, restaurant_id)
        restaurants.append(restaurant)

    # Resolve photo URLs and build image records
    photos = details.get("photos") or []
    new_images = []
    for idx, photo in enumerate(photos):
        photo_name = photo.get("name") if isinstance(photo, dict) else None
        if not photo_name:
            continue
        image_url = resolve_photo_url(photo_name, api_key)
        if not image_url:
            continue
        new_images.append({
            "id": str(uuid.uuid4()),
            "restaurant_id": restaurant_id,
            "image_url": image_url,
            "source": "google",
            "tags": [],
            "slot_type": "personalized",
            "display_order": idx,
        })
    images.extend(new_images)
    save_restaurants(restaurants)
    save_images(images)

    restaurant_images = [img for img in images if img.get("restaurant_id") == restaurant_id]
    out = {**restaurant, "images": restaurant_images}
    return out, 201


@app.post("/api/restaurants/sync-all")
def sync_all_restaurants():
    """
    Fetch Google Place details (name, address, rating, phone, website, photos) for every
    restaurant in the list that has a google_place_id. Updates restaurants and their
    Google-sourced images so all have the same "pulled" data as a single import.
    """
    api_key = os.getenv("GOOGLE_PLACES_API_KEY")
    if not api_key:
        return {"error": "GOOGLE_PLACES_API_KEY is not set"}, 503

    restaurants = load_restaurants()
    images = load_images()
    synced = []
    errors = []

    for r in restaurants:
        place_id = (r.get("google_place_id") or "").strip()
        if not place_id:
            continue
        restaurant_id = r["id"]
        try:
            details = fetch_place_details(place_id, api_key)
        except requests.exceptions.HTTPError as e:
            status = e.response.status_code if e.response is not None else 0
            errors.append({"id": restaurant_id, "name": r.get("name"), "error": f"HTTP {status}"})
            continue
        except requests.exceptions.RequestException as e:
            errors.append({"id": restaurant_id, "name": r.get("name"), "error": str(e)})
            continue

        restaurant = map_place_to_restaurant(place_id, details, restaurant_id)
        for i, existing in enumerate(restaurants):
            if existing.get("id") == restaurant_id:
                restaurants[i] = restaurant
                break

        images = [img for img in images if not (img.get("restaurant_id") == restaurant_id and img.get("source") == "google")]
        photos = details.get("photos") or []
        for idx, photo in enumerate(photos):
            photo_name = photo.get("name") if isinstance(photo, dict) else None
            if not photo_name:
                continue
            image_url = resolve_photo_url(photo_name, api_key)
            if not image_url:
                continue
            images.append({
                "id": str(uuid.uuid4()),
                "restaurant_id": restaurant_id,
                "image_url": image_url,
                "source": "google",
                "tags": [],
                "slot_type": "personalized",
                "display_order": idx,
            })
        synced.append({"id": restaurant_id, "name": restaurant.get("name")})

    # Normalize: make every restaurant id equal to google_place_id; merge duplicates (same place_id)
    id_mapping = {}  # old_id -> new_id (google_place_id)
    by_place_id = {}
    for r in restaurants:
        gpid = (r.get("google_place_id") or "").strip()
        if gpid:
            by_place_id.setdefault(gpid, []).append(r)
        else:
            by_place_id.setdefault(r["id"], []).append(r)

    new_restaurants = []
    for place_id, group in by_place_id.items():
        has_gpid = bool((group[0].get("google_place_id") or "").strip())
        canonical = next((x for x in group if x.get("id") == place_id), group[0])
        canonical_id = canonical["id"]
        if canonical_id != place_id:
            id_mapping[canonical_id] = place_id
        for r in group:
            if r["id"] != place_id:
                id_mapping[r["id"]] = place_id
        if has_gpid:
            new_restaurants.append({**canonical, "id": place_id, "google_place_id": place_id})
        else:
            new_restaurants.append(canonical)

    for img in images:
        rid = img.get("restaurant_id")
        if rid in id_mapping:
            img["restaurant_id"] = id_mapping[rid]
    templates = load_templates()
    for t in templates:
        rid = t.get("restaurant_id")
        if rid in id_mapping:
            t["restaurant_id"] = id_mapping[rid]
    # If multiple templates for same restaurant_id (after merge), keep first
    seen_rid = set()
    new_templates = []
    for t in templates:
        rid = t.get("restaurant_id")
        if rid in seen_rid:
            continue
        seen_rid.add(rid)
        new_templates.append(t)
    save_templates(new_templates)
    update_restaurant_ids(id_mapping)

    save_restaurants(new_restaurants)
    save_images(images)
    return {"synced": len(synced), "restaurants": synced, "errors": errors}, 200


# --- User profiles (Task 7.0) ---


@app.get("/api/user-profiles")
def get_user_profiles():
    """7.0 Return all seeded user personas (UserProfile[]). Dev B's persona switcher consumes this."""
    profiles = load_user_profiles()
    return profiles, 200


# --- Restaurant CRUD (Task 3.0) ---


@app.get("/api/restaurants")
def get_restaurants():
    """3.1 List all restaurants with thumbnail_url (first image from Google/owner images). Sorted by name so claimed places show in stable order on the right."""
    restaurants = load_restaurants()
    images = load_images()
    out = []
    for r in restaurants:
        rid = r.get("id")
        rest_images = [img for img in images if img.get("restaurant_id") == rid]
        sorted_images = sorted(rest_images, key=lambda x: x.get("display_order", 0))
        thumbnail_url = sorted_images[0].get("image_url") if sorted_images else None
        out.append({**r, "thumbnail_url": thumbnail_url})
    out.sort(key=lambda x: (x.get("name") or "").lower())
    return out, 200


def _restaurant_has_story(restaurant_id: str) -> bool:
    """True if a story template exists for this restaurant."""
    templates = load_templates()
    return any(t.get("restaurant_id") == restaurant_id for t in templates)


@app.get("/api/restaurants/<restaurant_id>")
def get_restaurant(restaurant_id):
    """3.2 Single restaurant with its images. Combined JSON: Restaurant + images array."""
    restaurants = load_restaurants()
    restaurant = next((r for r in restaurants if r["id"] == restaurant_id), None)
    if not restaurant:
        return {"error": "Restaurant not found"}, 404
    images = load_images()
    restaurant_images = [img for img in images if img["restaurant_id"] == restaurant_id]
    out = {**restaurant, "images": restaurant_images, "has_story": _restaurant_has_story(restaurant_id)}
    place_id = (restaurant.get("google_place_id") or "").strip()
    if place_id:
        api_key = os.getenv("GOOGLE_PLACES_API_KEY")
        if api_key:
            try:
                out["photos"] = fetch_place_photo_urls(place_id, api_key)
            except Exception:
                out["photos"] = []
        else:
            out["photos"] = []
    else:
        out["photos"] = []
    return out, 200


@app.get("/api/place-by-google-id/<path:place_id>")
def get_place_by_google_id(place_id):
    """
    Resolve a place by Google place ID. If we have it as a restaurant, return claimed + full data.
    Otherwise fetch from Google and return claimed: false with minimal place info (for placeholder + Claim).
    """
    place_id = (place_id or "").strip()
    if not place_id:
        return {"error": "place_id is required"}, 400

    api_key = os.getenv("GOOGLE_PLACES_API_KEY")
    restaurants = load_restaurants()
    existing = next((r for r in restaurants if (r.get("google_place_id") or "").strip() == place_id), None)

    if existing:
        images = load_images()
        restaurant_images = [img for img in images if img.get("restaurant_id") == existing["id"]]
        restaurant = {
            **existing,
            "images": restaurant_images,
            "has_story": _restaurant_has_story(existing["id"]),
        }
        api_key_photos = os.getenv("GOOGLE_PLACES_API_KEY")
        if api_key_photos:
            try:
                restaurant["photos"] = fetch_place_photo_urls(place_id, api_key_photos)
            except Exception:
                restaurant["photos"] = []
        else:
            restaurant["photos"] = []
        return {"claimed": True, "restaurant": restaurant}, 200

    if not api_key:
        return {"error": "GOOGLE_PLACES_API_KEY is not set"}, 503

    try:
        details = fetch_place_details(place_id, api_key)
    except requests.exceptions.HTTPError as e:
        if e.response is not None and e.response.status_code == 404:
            return {"error": "Place not found"}, 404
        return {"error": f"Google Places API error: {e}"}, 502
    except requests.exceptions.RequestException as e:
        return {"error": f"Request failed: {e}"}, 502

    display_name = details.get("displayName") or {}
    name = (display_name.get("text") or "").strip()
    location = details.get("location") or {}
    lat = location.get("latitude")
    lng = location.get("longitude")
    if lat is None:
        lat = 0.0
    if lng is None:
        lng = 0.0
    thumbnail_url = None
    photos = details.get("photos") or []
    if photos and isinstance(photos[0], dict) and photos[0].get("name"):
        thumbnail_url = resolve_photo_url(photos[0]["name"], api_key)
    rating = details.get("rating")
    if rating is None:
        rating = 0.0
    place = {
        "google_place_id": place_id,
        "name": name or "Unknown place",
        "address": details.get("formattedAddress") or "",
        "lat": float(lat),
        "lng": float(lng),
        "thumbnail_url": thumbnail_url,
        "rating": float(rating),
        "reviewCount": 0,
        "reviews": [],
    }
    try:
        reviews_data = fetch_place_reviews(place_id, api_key)
        place["reviewCount"] = reviews_data.get("reviewCount", 0)
        place["reviews"] = reviews_data.get("reviews", [])
    except Exception:
        pass
    try:
        place["photos"] = resolve_photos_from_details(details, api_key)
    except Exception:
        place["photos"] = []
    return {"claimed": False, "place": place}, 200


@app.get("/api/places/<path:place_id>/reviews")
def get_place_reviews(place_id):
    """Fetch reviews and review count from Google Places for any place ID (claimed or unclaimed)."""
    place_id = (place_id or "").strip()
    if not place_id:
        return {"error": "place_id is required"}, 400
    api_key = os.getenv("GOOGLE_PLACES_API_KEY")
    if not api_key:
        return {"error": "GOOGLE_PLACES_API_KEY is not set"}, 503
    try:
        data = fetch_place_reviews(place_id, api_key)
        return data, 200
    except Exception as e:
        return {"error": str(e), "reviewCount": 0, "reviews": []}, 502


@app.get("/api/places/<path:place_id>/photos")
def get_place_photos(place_id):
    """Fetch photo URLs from Google Places for any place ID (claimed or unclaimed). Photos come by default; no import needed."""
    place_id = (place_id or "").strip()
    if not place_id:
        return {"error": "place_id is required"}, 400
    api_key = os.getenv("GOOGLE_PLACES_API_KEY")
    if not api_key:
        return {"error": "GOOGLE_PLACES_API_KEY is not set"}, 503
    try:
        photos = fetch_place_photo_urls(place_id, api_key)
        return {"photos": photos}, 200
    except Exception as e:
        return {"error": str(e), "photos": []}, 502


@app.get("/api/restaurants/<restaurant_id>/google-reviews")
def get_restaurant_google_reviews(restaurant_id):
    """Fetch reviews and review count from Google Places for this restaurant (by google_place_id)."""
    api_key = os.getenv("GOOGLE_PLACES_API_KEY")
    if not api_key:
        return {"error": "GOOGLE_PLACES_API_KEY is not set"}, 503
    restaurants = load_restaurants()
    restaurant = next((r for r in restaurants if r.get("id") == restaurant_id), None)
    if not restaurant:
        return {"error": "Restaurant not found"}, 404
    place_id = (restaurant.get("google_place_id") or "").strip()
    if not place_id:
        return {"reviewCount": 0, "reviews": []}, 200
    try:
        data = fetch_place_reviews(place_id, api_key)
        return data, 200
    except Exception as e:
        return {"error": str(e), "reviewCount": 0, "reviews": []}, 502


@app.put("/api/restaurants/<restaurant_id>/images/<image_id>")
def update_restaurant_image(restaurant_id, image_id):
    """3.3 Update image: tags, slot_type, display_order (any subset)."""
    images = load_images()
    target = next(
        (img for img in images if img["id"] == image_id and img["restaurant_id"] == restaurant_id),
        None,
    )
    if not target:
        return {"error": "Image not found"}, 404
    body = request.get_json(silent=True) or {}
    if "tags" in body:
        target["tags"] = body["tags"]
    if "slot_type" in body:
        target["slot_type"] = body["slot_type"]
    if "display_order" in body:
        target["display_order"] = body["display_order"]
    save_images(images)
    return target, 200


@app.delete("/api/restaurants/<restaurant_id>/images/<image_id>")
def delete_restaurant_image(restaurant_id, image_id):
    """3.4 Remove image from restaurant_images.json. Returns 204."""
    images = load_images()
    new_images = [img for img in images if not (img["id"] == image_id and img["restaurant_id"] == restaurant_id)]
    if len(new_images) == len(images):
        return {"error": "Image not found"}, 404
    save_images(new_images)
    return "", 204


@app.post("/api/restaurants/<restaurant_id>/images")
def create_restaurant_image(restaurant_id):
    """3.5 Add image. Body: { image_url, source: 'owner_upload' }. Returns created RestaurantImage."""
    restaurants = load_restaurants()
    if not any(r["id"] == restaurant_id for r in restaurants):
        return {"error": "Restaurant not found"}, 404
    body = request.get_json(silent=True) or {}
    image_url = body.get("image_url")
    source = body.get("source", "owner_upload")
    if not image_url:
        return {"error": "image_url is required"}, 400
    if source not in ("google", "owner_upload"):
        source = "owner_upload"
    images = load_images()
    max_order = max((img.get("display_order", 0) for img in images if img.get("restaurant_id") == restaurant_id), default=-1)
    new_id = str(uuid.uuid4())
    new_image = {
        "id": new_id,
        "restaurant_id": restaurant_id,
        "image_url": image_url,
        "source": source,
        "tags": [],
        "slot_type": "personalized",
        "display_order": max_order + 1,
    }
    images.append(new_image)
    save_images(images)
    return new_image, 201


# --- Story template CRUD (Task 4.0) ---


@app.get("/api/restaurants/<restaurant_id>/story-template")
def get_story_template(restaurant_id):
    """4.1 Get story template for a restaurant. Returns StoryTemplate or 404."""
    templates = load_templates()
    template = next((t for t in templates if t.get("restaurant_id") == restaurant_id), None)
    if not template:
        return {"error": "Story template not found"}, 404
    return template, 200


@app.put("/api/restaurants/<restaurant_id>/story-template")
def upsert_story_template(restaurant_id):
    """
    4.2 Upsert story template: create if not exists, update if exists.
    Body: intro_image_id, outro_image_id, cta_text (default "Book a Table"), cta_url (optional).
    Validates restaurant exists and intro/outro image ids belong to this restaurant.
    """
    restaurants = load_restaurants()
    if not any(r.get("id") == restaurant_id for r in restaurants):
        return {"error": "Restaurant not found"}, 404

    images = load_images()
    restaurant_image_ids = {img["id"] for img in images if img.get("restaurant_id") == restaurant_id and img.get("id")}

    body = request.get_json(silent=True) or {}
    intro_image_id = (body.get("intro_image_id") or "").strip()
    outro_image_id = (body.get("outro_image_id") or "").strip()
    cta_text = (body.get("cta_text") or "Book a Table").strip() or "Book a Table"
    cta_url = (body.get("cta_url") or "").strip() or None

    if not intro_image_id:
        return {"error": "intro_image_id is required"}, 400
    if not outro_image_id:
        return {"error": "outro_image_id is required"}, 400
    if intro_image_id not in restaurant_image_ids:
        return {"error": "intro_image_id does not exist or does not belong to this restaurant"}, 400
    if outro_image_id not in restaurant_image_ids:
        return {"error": "outro_image_id does not exist or does not belong to this restaurant"}, 400

    templates = load_templates()
    existing_idx = next((i for i, t in enumerate(templates) if t.get("restaurant_id") == restaurant_id), None)

    payload = {
        "restaurant_id": restaurant_id,
        "intro_image_id": intro_image_id,
        "outro_image_id": outro_image_id,
        "cta_text": cta_text,
        "cta_url": cta_url,
    }

    if existing_idx is not None:
        payload["id"] = templates[existing_idx].get("id") or ("st-" + uuid.uuid4().hex[:8])
        templates[existing_idx] = payload
    else:
        payload["id"] = "st-" + uuid.uuid4().hex[:8]
        templates.append(payload)

    save_templates(templates)
    return payload, 200


# --- Gemini Vision Image Tagging (Task 2.0) ---


@app.post("/api/images/tag")
def tag_image():
    """
    2.0 Tag a single image via Gemini Vision.
    Body: {"image_id": "uuid"}.
    Returns {"tags": ["steak", "romantic", ...]} and updates restaurant_images.json.
    """
    body = request.get_json(silent=True) or {}
    image_id = (body.get("image_id") or "").strip()
    if not image_id:
        return {"error": "image_id is required"}, 400

    images = load_images()
    target = next((img for img in images if img.get("id") == image_id), None)
    if not target:
        return {"error": "Image not found"}, 404

    image_url = target.get("image_url")
    if not image_url:
        return {"error": "Image has no image_url"}, 400

    try:
        tags = tag_image_from_url(image_url)
    except ValueError as e:
        return {"error": str(e)}, 503

    for img in images:
        if img.get("id") == image_id:
            img["tags"] = tags
            break
    save_images(images)
    return {"tags": tags}, 200


@app.post("/api/restaurants/<restaurant_id>/images/tag-all")
def tag_all_restaurant_images(restaurant_id):
    """
    2.0 Batch tag all untagged images for a restaurant.
    Untagged = images where tags is empty or missing.
    Returns {"tagged": count, "images": [{"id", "tags"}, ...]}.
    """
    if not os.getenv("GEMINI_API_KEY"):
        return {"error": "GEMINI_API_KEY is not set"}, 503
    restaurants = load_restaurants()
    if not any(r.get("id") == restaurant_id for r in restaurants):
        return {"error": "Restaurant not found"}, 404

    images = load_images()
    restaurant_images = [img for img in images if img.get("restaurant_id") == restaurant_id]
    untagged = [img for img in restaurant_images if not (img.get("tags") or [])]

    if not untagged:
        return {"tagged": 0, "images": []}, 200

    results = []
    for img in untagged:
        image_url = img.get("image_url")
        image_id = img.get("id")
        if not image_url:
            continue
        try:
            tags = tag_image_from_url(image_url)
        except ValueError:
            continue
        for i, x in enumerate(images):
            if x.get("id") == image_id:
                images[i]["tags"] = tags
                break
        results.append({"id": image_id, "tags": tags})
    save_images(images)
    return {"tagged": len(results), "images": results}, 200


# --- Story personalization (Phase 2) ---


@app.post("/api/restaurants/<restaurant_id>/story/personalize")
def post_story_personalize(restaurant_id):
    """
    Phase 2: Return CompiledStory for this restaurant and user profile.
    Body: { "user_profile_id": "uuid" }. Cached results returned immediately.
    """
    body = request.get_json(silent=True) or {}
    return handle_personalize(restaurant_id, body)


@app.get("/api/cache/status")
def cache_status_route():
    """Return number of cached stories and list of (restaurant_id, user_profile_id)."""
    return get_cache_status(), 200


@app.post("/api/warmup")
def post_warmup():
    """
    Pre-generate personalized stories for all restaurant × profile combinations.
    Call before demo so /story/personalize returns cached results quickly.
    """
    restaurants = load_restaurants()
    profiles = load_user_profiles()
    count = 0
    for r in restaurants:
        rid = r.get("id")
        if not rid:
            continue
        for p in profiles:
            pid = p.get("id")
            if not pid:
                continue
            story = personalize_story(rid, pid)
            if story:
                set_cached_story(rid, pid, story)
                count += 1
    return {"warmed": count}, 200
