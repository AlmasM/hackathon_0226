"""
Cache layer for pre-generated personalized stories.
Uses a JSON file for persistence so warmup results survive server restarts.
"""
import json
import os
from typing import Optional

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
CACHE_FILE = os.path.join(DATA_DIR, "cached_stories.json")

# In-memory fallback if file is missing or empty
_memory_cache: dict[str, dict] = {}


def _cache_key(restaurant_id: str, user_profile_id: str) -> str:
    return f"{restaurant_id}:{user_profile_id}"


def _load_cache() -> dict:
    """Load cache from JSON file or return in-memory dict."""
    if not os.path.exists(CACHE_FILE):
        return _memory_cache.copy()
    try:
        with open(CACHE_FILE, "r") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except (json.JSONDecodeError, OSError):
        return _memory_cache.copy()


def _save_cache(cache: dict) -> None:
    """Persist cache to JSON file."""
    os.makedirs(DATA_DIR, exist_ok=True)
    try:
        with open(CACHE_FILE, "w") as f:
            json.dump(cache, f, indent=2)
    except OSError:
        pass
    # Keep in-memory in sync
    _memory_cache.clear()
    _memory_cache.update(cache)


def get_cached_story(restaurant_id: str, user_profile_id: str) -> Optional[dict]:
    """Return cached CompiledStory dict if present, else None."""
    cache = _load_cache()
    key = _cache_key(restaurant_id, user_profile_id)
    return cache.get(key)


def set_cached_story(restaurant_id: str, user_profile_id: str, story: dict) -> None:
    """Store a CompiledStory in the cache."""
    cache = _load_cache()
    key = _cache_key(restaurant_id, user_profile_id)
    cache[key] = story
    _save_cache(cache)


def get_cache_status() -> dict:
    """Return count and list of cached (restaurant_id, user_profile_id) for GET /api/cache/status."""
    cache = _load_cache()
    keys = list(cache.keys())
    pairs = [k.split(":", 1) for k in keys if ":" in k]
    return {"count": len(keys), "cached": [{"restaurant_id": r, "user_profile_id": u} for r, u in pairs]}


def update_restaurant_ids(mapping: dict[str, str]) -> None:
    """
    Remap cache keys and nested restaurant.id when restaurant ids change (e.g. after sync normalization).
    mapping: old_id -> new_id. Keys that remap to the same id are merged (one entry kept).
    """
    if not mapping:
        return
    cache = _load_cache()
    new_cache = {}
    for key, val in list(cache.items()):
        if ":" not in key:
            new_cache[key] = val
            continue
        old_rid, up_id = key.split(":", 1)
        new_rid = mapping.get(old_rid, old_rid)
        new_key = f"{new_rid}:{up_id}"
        if isinstance(val, dict) and "restaurant" in val and isinstance(val["restaurant"], dict):
            val = {**val, "restaurant": {**val["restaurant"], "id": new_rid}}
        new_cache[new_key] = val
    _save_cache(new_cache)
