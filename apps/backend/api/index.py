import os
import uuid

import requests
from dotenv import load_dotenv
from flask import Flask, request
from flask_cors import CORS

from api.cache import get_cache_status, set_cached_story
from api.data_store import load_restaurants, save_restaurants, load_images, save_images, load_templates, save_templates, load_user_profiles
from api.health import get_health_payload
from api.image_tagging import tag_image_from_url
from api.personalize import handle_personalize, personalize_story
from api.places import fetch_place_details, resolve_photo_url, map_place_to_restaurant

load_dotenv()

app = Flask(__name__)
CORS(app)


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
        if e.response is not None and e.response.status_code == 404:
            return {"error": "Place not found"}, 404
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
        restaurant_id = "r" + uuid.uuid4().hex[:8]
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


# --- User profiles (Task 7.0) ---


@app.get("/api/user-profiles")
def get_user_profiles():
    """7.0 Return all seeded user personas (UserProfile[]). Dev B's persona switcher consumes this."""
    profiles = load_user_profiles()
    return profiles, 200


# --- Restaurant CRUD (Task 3.0) ---


@app.get("/api/restaurants")
def get_restaurants():
    """3.1 List all restaurants. Returns JSON array (Restaurant[])."""
    restaurants = load_restaurants()
    return restaurants, 200


@app.get("/api/restaurants/<restaurant_id>")
def get_restaurant(restaurant_id):
    """3.2 Single restaurant with its images. Combined JSON: Restaurant + images array."""
    restaurants = load_restaurants()
    restaurant = next((r for r in restaurants if r["id"] == restaurant_id), None)
    if not restaurant:
        return {"error": "Restaurant not found"}, 404
    images = load_images()
    restaurant_images = [img for img in images if img["restaurant_id"] == restaurant_id]
    out = {**restaurant, "images": restaurant_images}
    return out, 200


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
