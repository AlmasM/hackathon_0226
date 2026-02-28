"""
AI-powered story personalization.
POST /api/restaurants/<id>/story/personalize returns a CompiledStory
tailored to the user profile (Gemini ranking with tag-matching fallback).
"""
import json
import logging
import os
import re

import google.generativeai as genai

from api.cache import get_cached_story, set_cached_story
from api.data_store import load_restaurants, load_images, load_templates, load_user_profiles

logger = logging.getLogger(__name__)

ANIMATIONS = [
    "ken_burns_zoom_in",
    "ken_burns_pan_right",
    "ken_burns_zoom_out",
    "ken_burns_pan_left",
]
SEGMENT_DURATION_MS = 5000
TOP_PERSONALIZED = 3


def _strip_markdown_fences(text: str) -> str:
    """Remove ```json ... ``` or ``` ... ``` from model output."""
    if not text or not isinstance(text, str):
        return text or ""
    text = text.strip()
    match = re.match(r"^```(?:json)?\s*\n?(.*?)\n?```\s*$", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text


def _parse_ranked_ids(response_text: str) -> list[str]:
    """Parse JSON array of image IDs from Gemini response."""
    cleaned = _strip_markdown_fences(response_text)
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning("Gemini response not valid JSON: %s", response_text[:200])
        return []
    if not isinstance(parsed, list):
        return []
    return [str(x).strip() for x in parsed if x]


def _rank_by_gemini(images_with_tags: list[dict], tags: list[str], avoid_tags: list[str]) -> list[str]:
    """Call Gemini to rank image IDs by relevance. Returns ordered list of image IDs or empty on failure."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return []

    image_list = [{"id": img["id"], "tags": img.get("tags") or []} for img in images_with_tags]
    if not image_list:
        return []

    prompt = (
        "Given a user who prefers [%s] and avoids [%s], rank these restaurant images by relevance. "
        "Images: %s. "
        "Return ONLY a JSON array of image IDs ordered by relevance, most relevant first. "
        "No explanation, no markdown, just the JSON array."
    ) % (
        ", ".join(tags or ["food"]),
        ", ".join(avoid_tags or []),
        json.dumps(image_list),
    )

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")
        response = model.generate_content(prompt)
        text = getattr(response, "text", None) or ""
        return _parse_ranked_ids(text)
    except Exception as e:
        logger.warning("Gemini personalization failed: %s", e)
        return []


def _rank_by_tags(images: list[dict], tags: list[str], avoid_tags: list[str]) -> list[dict]:
    """Fallback: score by +1 per tag match, -2 per avoid_tags match; sort descending; return top 2-3."""
    tag_set = set(tags or [])
    avoid_set = set(avoid_tags or [])
    scored = []
    for img in images:
        score = 0
        for t in img.get("tags") or []:
            if t in tag_set:
                score += 1
            if t in avoid_set:
                score -= 2
        scored.append((score, img))
    scored.sort(key=lambda x: -x[0])
    return [img for _, img in scored[:TOP_PERSONALIZED]]


def build_compiled_story(
    restaurant: dict,
    intro_image: dict,
    outro_image: dict,
    personalized_images: list[dict],
    template: dict | None,
) -> dict:
    """Build CompiledStory dict: { restaurant, segments } matching frontend TypeScript."""
    # Restaurant without images key (CompiledStory.restaurant is Restaurant)
    rest_out = {k: v for k, v in restaurant.items() if k != "images" and k != "restaurant_images"}
    segments = []
    anim_idx = 0
    # Intro
    segments.append({
        "type": "intro",
        "image": intro_image,
        "duration_ms": SEGMENT_DURATION_MS,
        "animation": ANIMATIONS[anim_idx % len(ANIMATIONS)],
    })
    anim_idx += 1
    # Personalized
    for img in personalized_images:
        segments.append({
            "type": "personalized",
            "image": img,
            "duration_ms": SEGMENT_DURATION_MS,
            "animation": ANIMATIONS[anim_idx % len(ANIMATIONS)],
        })
        anim_idx += 1
    # Outro with CTA
    cta = None
    if template:
        cta = {
            "text": (template.get("cta_text") or "Visit us!").strip(),
            "url": (template.get("cta_url") or "").strip() or "",
        }
    segments.append({
        "type": "outro",
        "image": outro_image,
        "duration_ms": SEGMENT_DURATION_MS,
        "animation": ANIMATIONS[anim_idx % len(ANIMATIONS)],
        "cta": cta,
    })
    return {"restaurant": rest_out, "segments": segments}


def personalize_story(restaurant_id: str, user_profile_id: str) -> dict | None:
    """
    Generate or retrieve cached CompiledStory for (restaurant_id, user_profile_id).
    Returns None if restaurant or user profile not found.
    """
    restaurants = load_restaurants()
    restaurant = next((r for r in restaurants if r.get("id") == restaurant_id), None)
    if not restaurant:
        return None

    images = load_images()
    rest_images = [img for img in images if img.get("restaurant_id") == restaurant_id]
    intro_images = [img for img in rest_images if img.get("slot_type") == "intro"]
    outro_images = [img for img in rest_images if img.get("slot_type") == "outro"]
    personalized_images = [img for img in rest_images if img.get("slot_type") == "personalized"]

    profiles = load_user_profiles()
    profile = next((p for p in profiles if p.get("id") == user_profile_id), None)
    if not profile:
        return None

    tags = (profile.get("preferences") or {}).get("tags") or []
    avoid_tags = (profile.get("preferences") or {}).get("avoid_tags") or []

    templates = load_templates()
    template = next((t for t in templates if t.get("restaurant_id") == restaurant_id), None)
    if not template:
        intro_image = intro_images[0] if intro_images else (rest_images[0] if rest_images else None)
        outro_image = outro_images[0] if outro_images else (rest_images[-1] if rest_images else intro_image)
        template = {
            "intro_image_id": intro_image.get("id") if intro_image else "",
            "outro_image_id": outro_image.get("id") if outro_image else "",
            "cta_text": "Visit us!",
            "cta_url": "",
        }
    else:
        by_id = {img["id"]: img for img in rest_images}
        intro_image = by_id.get(template.get("intro_image_id") or "") or intro_images[0] or rest_images[0]
        outro_image = by_id.get(template.get("outro_image_id") or "") or outro_images[0] or rest_images[-1] or intro_image

    if not intro_image or not outro_image:
        return None

    # Rank personalized images: Gemini first, then fallback
    ranked_ids = _rank_by_gemini(personalized_images, tags, avoid_tags)
    if ranked_ids:
        by_id = {img["id"]: img for img in personalized_images}
        ordered = [by_id[i] for i in ranked_ids if i in by_id][:TOP_PERSONALIZED]
    else:
        ordered = _rank_by_tags(personalized_images, tags, avoid_tags)
    if not ordered:
        ordered = personalized_images[:TOP_PERSONALIZED]

    story = build_compiled_story(restaurant, intro_image, outro_image, ordered, template)
    return story


def handle_personalize(restaurant_id: str, body: dict) -> tuple[dict, int]:
    """
    Handle POST /api/restaurants/<id>/story/personalize.
    Body: { "user_profile_id": "uuid" }.
    Returns (response_dict, status_code).
    """
    user_profile_id = (body.get("user_profile_id") or "").strip()
    if not user_profile_id:
        return {"error": "user_profile_id is required"}, 400

    # Cache check first (Task 1.12 / 6.2)
    cached = get_cached_story(restaurant_id, user_profile_id)
    if cached is not None:
        return cached, 200

    # Validate restaurant exists
    restaurants = load_restaurants()
    if not any(r.get("id") == restaurant_id for r in restaurants):
        return {"error": "Restaurant not found"}, 404

    # Validate user profile exists
    profiles = load_user_profiles()
    if not any(p.get("id") == user_profile_id for p in profiles):
        return {"error": "User profile not found"}, 404

    story = personalize_story(restaurant_id, user_profile_id)
    if story is None:
        return {"error": "Could not build story"}, 500

    set_cached_story(restaurant_id, user_profile_id, story)
    return story, 200
