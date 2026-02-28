"""
Google Places API (New) integration for restaurant import.

References (official docs):
- Place Details (New): https://developers.google.com/maps/documentation/places/web-service/place-details
- Place Data Fields:   https://developers.google.com/maps/documentation/places/web-service/data-fields
- Place Photos (New):  https://developers.google.com/maps/documentation/places/web-service/place-photos
- getMedia:            https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places.photos/getMedia

Uses GET places.googleapis.com/v1/places/{place_id} with X-Goog-Api-Key and X-Goog-FieldMask.
Photo URLs: GET places.googleapis.com/v1/{photo.name}/media with maxWidthPx and key (or X-Goog-Api-Key).
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


REVIEWS_FIELD_MASK = "reviews,userRatingCount"


def resolve_photos_from_details(details: dict, api_key: str, max_photos: int = 15) -> list[dict]:
    """
    Resolve photo names from place details to image URLs.
    Returns [{"image_url": str}, ...]. Use when details are already fetched.
    """
    photos = details.get("photos") or []
    result = []
    for photo in photos[:max_photos]:
        if not isinstance(photo, dict):
            continue
        photo_name = photo.get("name")
        if not photo_name:
            continue
        url = resolve_photo_url(photo_name, api_key)
        if url:
            result.append({"image_url": url})
    return result


def fetch_place_photo_urls(place_id: str, api_key: str, max_photos: int = 15) -> list[dict]:
    """
    Fetch place details and return resolved photo URLs.
    Returns [{"image_url": str}, ...] for use when details are not already available.
    """
    details = fetch_place_details(place_id, api_key)
    return resolve_photos_from_details(details, api_key, max_photos)


def fetch_place_reviews(place_id: str, api_key: str) -> dict:
    """
    Fetch reviews and user rating count from Google Places API (New).
    Returns {"reviewCount": int, "reviews": [{"author": str, "text": str, "rating": float, "relativeTime": str}]}.
    """
    url = f"{PLACES_BASE}/places/{place_id}"
    headers = {
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": REVIEWS_FIELD_MASK,
    }
    resp = requests.get(url, headers=headers, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    raw_reviews = data.get("reviews") or []
    reviews = []
    for r in raw_reviews:
        if not isinstance(r, dict):
            continue
        author = (r.get("authorAttribution") or {}).get("displayName") or "A Google user"
        text = (r.get("text") or {}).get("text") if isinstance(r.get("text"), dict) else (r.get("text") or "")
        rating = r.get("rating")
        if rating is not None:
            rating = float(rating)
        rel = (r.get("relativePublishTimeDescription") or "").strip()
        reviews.append({
            "author": author,
            "text": text if isinstance(text, str) else str(text or ""),
            "rating": rating,
            "relativeTime": rel,
        })
    return {
        "reviewCount": data.get("userRatingCount") or 0,
        "reviews": reviews,
    }
