"""
Google Places API (New) integration for restaurant import.
Uses places.googleapis.com/v1/places/{place_id} with X-Goog-Api-Key and X-Goog-FieldMask.
"""
import requests

PLACES_BASE = "https://places.googleapis.com/v1"
FIELD_MASK = "displayName,formattedAddress,location,rating,photos,nationalPhoneNumber,websiteUri,types"


def fetch_place_details(place_id: str, api_key: str) -> dict:
    """Fetch place details from Google Places API (New). Returns raw response or raises."""
    url = f"{PLACES_BASE}/places/{place_id}"
    headers = {
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": FIELD_MASK,
    }
    resp = requests.get(url, headers=headers, timeout=15)
    resp.raise_for_status()
    return resp.json()


def resolve_photo_url(photo_name: str, api_key: str) -> str | None:
    """
    Resolve a photo name to a usable image URL via Places Photo Media endpoint.
    Follows redirect and returns the final URL, or None on failure.
    """
    # photo_name is e.g. "places/ChIJ.../photos/..."
    url = f"{PLACES_BASE}/{photo_name}/media"
    params = {"maxWidthPx": 800, "key": api_key}
    try:
        resp = requests.get(url, params=params, allow_redirects=True, timeout=10)
        resp.raise_for_status()
        return resp.url
    except Exception:
        return None


def map_place_to_restaurant(place_id: str, details: dict, restaurant_id: str) -> dict:
    """
    Map Google Places API (New) response to our Restaurant shape.
    details: raw API response. restaurant_id: id to use (for new or existing).
    """
    display_name = details.get("displayName") or {}
    name = display_name.get("text") or ""
    location = details.get("location") or {}
    lat = location.get("latitude")
    lng = location.get("longitude")
    if lat is None:
        lat = 0.0
    if lng is None:
        lng = 0.0
    rating = details.get("rating")
    if rating is None:
        rating = 0.0
    types = details.get("types") or []
    cuisine_type = [t for t in types if isinstance(t, str)]
    return {
        "id": restaurant_id,
        "google_place_id": place_id,
        "name": name,
        "address": details.get("formattedAddress") or "",
        "lat": float(lat),
        "lng": float(lng),
        "rating": float(rating),
        "cuisine_type": cuisine_type,
        "phone": details.get("nationalPhoneNumber"),
        "website": details.get("websiteUri"),
    }
