"""
Gemini Vision image tagging for restaurant photos.
Uses google-generativeai (genai) with model gemini-2.0-flash.
Sends the image URL to Gemini (Gemini can fetch it).
"""
import json
import os
import re

import google.generativeai as genai

TAGGING_PROMPT = (
    "Analyze this restaurant photo. Return a JSON array of relevant tags from these categories: "
    "food items (e.g., 'steak', 'salad', 'cocktail', 'sushi'), "
    "dietary (e.g., 'vegan', 'vegetarian', 'gluten_free'), "
    "ambiance (e.g., 'outdoor', 'romantic', 'loud', 'bar'), "
    "cuisine (e.g., 'italian', 'mexican', 'japanese'). "
    "Return ONLY the JSON array, no markdown formatting."
)


def _strip_markdown_fences(text: str) -> str:
    """Remove ```json ... ``` or ``` ... ``` wrappers from model output."""
    if not text or not isinstance(text, str):
        return text or ""
    text = text.strip()
    # Match ```json ... ``` or ``` ... ```
    match = re.match(r"^```(?:json)?\s*\n?(.*?)\n?```\s*$", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text


def _parse_tags_response(response_text: str) -> list[str]:
    """Parse JSON array from Gemini response; strip markdown fences if present."""
    cleaned = _strip_markdown_fences(response_text)
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed, list):
        return []
    return [str(t).strip() for t in parsed if t]


def tag_image_from_url(image_url: str) -> list[str]:
    """
    Send image URL to Gemini Vision; Gemini fetches the image.
    Returns list of tags.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.0-flash")

    prompt = f"{TAGGING_PROMPT}\n\nImage URL: {image_url}"
    response = model.generate_content(prompt)
    text = getattr(response, "text", None) or ""
    return _parse_tags_response(text)
