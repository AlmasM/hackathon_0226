"""
Image-to-video generation using Google's Veo model via the Gemini API.
Each story segment is a video (not a static image): we generate a short video
from each image and save it locally; the story player plays these videos.
Uses the google-genai SDK (generate_videos with GenerateVideosSource image).
"""
import logging
import os
import shutil
import time
import uuid

import requests

logger = logging.getLogger(__name__)

# Default prompt: tell a coherent story (walk in, food, vibe), not random pictures.
DEFAULT_VIDEO_PROMPT = (
    "Tell a short story: walking into the restaurant, the foods offered, and the vibe. "
    "Smooth, cinematic motion. The scene comes gently to life: subtle camera movement, "
    "soft lighting, appetizing atmosphere. Coherent narrative—not just random pictures—"
    "show the experience of being there. Keep it elegant and inviting."
)


def build_story_segment_prompt(
    segment_index: int,
    total_segments: int,
    base_prompt: str | None = None,
) -> str:
    """
    Build a continuity-aware prompt for one segment of a multi-segment story.
    Each segment centers on one image; the prompt makes this clip feel like
    one progressive story line (intro → middle → outro).
    """
    part = segment_index + 1
    total = max(1, total_segments)
    base = (base_prompt or "").strip() or DEFAULT_VIDEO_PROMPT

    if total == 1:
        return (
            "One continuous story moment. This image is the heart of the scene. "
            "Smooth, cinematic motion; the scene comes gently to life. " + base
        )

    if segment_index == 0:
        role = (
            f"Part {part} of {total} — Opening of the story. "
            "This image is the core of the first moment: the first impression, arriving at the place. "
            "Smooth, cinematic motion. The same style and mood will continue in the next segments. "
        )
    elif segment_index == total - 1:
        role = (
            f"Part {part} of {total} — Conclusion of the story. "
            "This image is the core of the final moment: the closing impression, inviting and memorable. "
            "Same cinematic style as the previous parts. Satisfying, coherent ending. "
        )
    else:
        role = (
            f"Part {part} of {total} — Continuation of the story. "
            "This image is the core of this moment; the narrative flows from the previous segment. "
            "Same lighting, mood, and cinematic style. Natural progression—one story line. "
        )

    return role + base


# Model: Veo 3.1 Fast. Use preview name for Gemini API (v1beta); override with VEO_MODEL env.
# Gemini API: veo-3.1-fast-generate-preview. Vertex AI may use veo-3.1-fast-generate-001.
VEO_MODEL = os.getenv("VEO_MODEL", "veo-3.1-fast-generate-preview")

# Output directory for generated videos (relative to backend root).
# All generated videos are saved here and kept; they are never deleted so past stories remain available.
GENERATED_VIDEOS_DIR = "generated_videos"


def _fetch_image_bytes(image_url: str) -> tuple[bytes, str]:
    """Fetch image from URL; return (bytes, mime_type)."""
    resp = requests.get(image_url, timeout=30)
    resp.raise_for_status()
    content_type = (resp.headers.get("Content-Type") or "").split(";")[0].strip().lower()
    if not content_type or content_type == "application/octet-stream":
        content_type = "image/jpeg"
    if content_type == "image/jpg":
        content_type = "image/jpeg"
    return resp.content, content_type


def _ensure_output_dir() -> str:
    """Return absolute path to generated_videos dir, creating if needed."""
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_dir = os.path.join(base, GENERATED_VIDEOS_DIR)
    os.makedirs(out_dir, exist_ok=True)
    return out_dir


def generate_video_from_image_url(
    image_url: str,
    prompt: str | None = None,
    duration_seconds: int = 4,
    aspect_ratio: str = "16:9",
    resolution: str = "720p",
    story_segment_index: int | None = None,
    story_total_segments: int | None = None,
) -> tuple[str, str]:
    """
    Generate a short video from a single image using Veo image-to-video.

    Args:
        image_url: Public URL of the source image.
        prompt: Text prompt describing desired motion/style; uses default if None.
        duration_seconds: 4, 6, or 8.
        aspect_ratio: "16:9" or "9:16".
        resolution: "720p", "1080p", etc.
        story_segment_index: 0-based index of this segment in a multi-segment story (optional).
        story_total_segments: Total number of segments in the story (optional).
            When both are set, the prompt is built for narrative continuity (one story line).

    Returns:
        (video_id, absolute_path) of the saved MP4 file.

    Raises:
        ValueError: If GEMINI_API_KEY is not set or image fetch fails.
        RuntimeError: If Veo API returns an error or video generation fails.
    """
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY (or GOOGLE_API_KEY) is not set")

    try:
        from google import genai
        from google.genai import types
    except ImportError as e:
        raise RuntimeError(
            "google-genai package is required for video generation. "
            "Install with: pip install google-genai"
        ) from e

    image_bytes, mime_type = _fetch_image_bytes(image_url)
    if len(image_bytes) > 20 * 1024 * 1024:  # 20 MB limit per docs
        raise ValueError("Image size exceeds 20 MB limit for image-to-video")

    if (
        story_segment_index is not None
        and story_total_segments is not None
        and story_total_segments >= 1
    ):
        text_prompt = build_story_segment_prompt(
            story_segment_index,
            story_total_segments,
            base_prompt=prompt,
        )
    else:
        text_prompt = (prompt or "").strip() or DEFAULT_VIDEO_PROMPT

    source = types.GenerateVideosSource(
        prompt=text_prompt,
        image=types.Image(
            image_bytes=image_bytes,
            mime_type=mime_type,
        ),
    )
    config = types.GenerateVideosConfig(
        duration_seconds=duration_seconds,
        aspect_ratio=aspect_ratio,
        resolution=resolution,
    )

    client = genai.Client(api_key=api_key)
    operation = client.models.generate_videos(
        model=VEO_MODEL,
        source=source,
        config=config,
    )

    # Poll until done (can take 1–3+ minutes)
    while not operation.done:
        logger.info("Video generation in progress...")
        time.sleep(10)
        operation = client.operations.get(operation)

    if not operation.response or not getattr(operation.response, "generated_videos", None):
        raise RuntimeError("Video generation failed: no video in response")

    generated_list = operation.response.generated_videos
    if not generated_list:
        raise RuntimeError("Video generation failed: empty generated_videos list")

    video_result = generated_list[0]
    video_file = getattr(video_result, "video", None)
    if not video_file:
        raise RuntimeError("Video generation failed: missing video object")

    # Download and save to disk
    client.files.download(file=video_file)
    video_id = str(uuid.uuid4())[:12]
    out_dir = _ensure_output_dir()
    save_path = os.path.join(out_dir, f"{video_id}.mp4")
    video_file.save(save_path)
    # SDK may write to cwd instead of save_path; move into our dir if needed
    if not os.path.isfile(save_path):
        cwd_save = os.path.join(os.getcwd(), f"{video_id}.mp4")
        if os.path.isfile(cwd_save):
            shutil.move(cwd_save, save_path)

    return video_id, save_path


def _generated_videos_base() -> str:
    """Absolute path to generated_videos directory (same logic as _ensure_output_dir)."""
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base, GENERATED_VIDEOS_DIR)


def get_video_path(video_id: str) -> str | None:
    """Return absolute path to a generated video file if it exists."""
    if not video_id or not isinstance(video_id, str):
        return None
    video_id = video_id.strip()
    # Sanitize: only allow alphanumeric and hyphen (IDs are uuid prefix like "9e0aac5a-421")
    if not all(c.isalnum() or c == "-" for c in video_id):
        return None
    filename = f"{video_id}.mp4"
    # 1) Primary: next to this module (apps/backend/generated_videos/)
    primary = os.path.join(_generated_videos_base(), filename)
    if os.path.isfile(primary):
        return primary
    # 2) Fallback: cwd (in case save() wrote to current working directory)
    cwd_path = os.path.join(os.getcwd(), filename)
    if os.path.isfile(cwd_path):
        return cwd_path
    # 3) Fallback: cwd/generated_videos/
    cwd_dir = os.path.join(os.getcwd(), GENERATED_VIDEOS_DIR, filename)
    if os.path.isfile(cwd_dir):
        return cwd_dir
    return None
