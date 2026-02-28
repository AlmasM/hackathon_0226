import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import StoryPlayer from "../components/StoryPlayer";
import type {
  KenBurnsAnimation,
  Restaurant,
  RestaurantImage,
  StorySegment,
} from "../types";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ??
  import.meta.env.VITE_API_URL ??
  "http://localhost:8000";

/** Treat empty, example.com, or placeholder-like URLs as "no image" — show placeholder UI instead. */
function isPlaceholderOrInvalidImageUrl(url: string | undefined): boolean {
  if (!url || !url.trim()) return true;
  const u = url.trim().toLowerCase();
  if (u.includes("example.com") || u.includes("example.org")) return true;
  if (u.startsWith("data:") && u.length < 100) return true; // tiny data URL placeholder
  return false;
}

type RestaurantWithImages = Restaurant & { images: RestaurantImage[] };

const SLOT_OPTIONS: Array<RestaurantImage["slot_type"]> = [
  "intro",
  "personalized",
  "outro",
];

const KEN_BURNS: KenBurnsAnimation[] = [
  "ken_burns_zoom_in",
  "ken_burns_zoom_out",
  "ken_burns_pan_left",
  "ken_burns_pan_right",
];

/** Build story segments for owner preview from current template and images. */
function buildPreviewSegments(
  images: RestaurantImage[],
  introId: string,
  outroId: string,
  ctaText: string,
  ctaUrl: string,
  orderedIds?: string[],
): StorySegment[] {
  const byId = Object.fromEntries(images.map((i) => [i.id, i]));
  let ids: string[];
  if (orderedIds && orderedIds.length > 0) {
    ids = orderedIds.filter((id) => id in byId);
  } else {
    const intro = introId && introId in byId ? introId : null;
    const outro =
      outroId && outroId in byId && outroId !== intro ? outroId : null;
    const mid = images
      .filter(
        (i) =>
          i.slot_type === "personalized" && i.id !== intro && i.id !== outro,
      )
      .slice(0, 3)
      .map((i) => i.id);
    ids = [...(intro ? [intro] : []), ...mid, ...(outro ? [outro] : [])];
  }
  if (ids.length === 0) return [];
  const segments: StorySegment[] = [];
  let animIndex = 0;
  for (let i = 0; i < ids.length; i++) {
    const img = byId[ids[i]];
    if (!img) continue;
    const isFirst = i === 0;
    const isLast = i === ids.length - 1;
    const type = isFirst ? "intro" : isLast ? "outro" : "personalized";
    segments.push({
      type,
      image: img,
      duration_ms: 4000,
      animation: KEN_BURNS[animIndex++ % 4],
      cta:
        isLast && (ctaText || ctaUrl)
          ? { text: ctaText || "Book a Table", url: ctaUrl ?? "" }
          : undefined,
      video_id: img.generated_video_id,
    });
  }
  return segments;
}

export default function OwnerDashboardPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<RestaurantWithImages | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRestaurant = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/restaurants/${restaurantId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const data: RestaurantWithImages = await res.json();
      setRestaurant(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load restaurant");
      setRestaurant(null);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchRestaurant();
  }, [fetchRestaurant]);

  // --- Import from Google ---
  const [importPlaceId, setImportPlaceId] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // --- Sync all restaurants from Google ---
  const [syncAllLoading, setSyncAllLoading] = useState(false);
  const [syncAllResult, setSyncAllResult] = useState<{
    synced: number;
    errors: Array<{ id: string; name?: string; error: string }>;
  } | null>(null);

  async function handleSyncAll() {
    setSyncAllLoading(true);
    setSyncAllResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/restaurants/sync-all`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setSyncAllResult({
        synced: data.synced ?? 0,
        errors: Array.isArray(data.errors) ? data.errors : [],
      });
      if (
        restaurantId &&
        (data.restaurants ?? []).some(
          (r: { id: string }) => r.id === restaurantId,
        )
      ) {
        fetchRestaurant();
      }
    } catch (e) {
      setSyncAllResult({
        synced: 0,
        errors: [
          {
            id: "",
            name: "",
            error: e instanceof Error ? e.message : "Sync failed",
          },
        ],
      });
    } finally {
      setSyncAllLoading(false);
    }
  }

  async function handleImport() {
    const placeId = importPlaceId.trim();
    if (!placeId) return;
    setImporting(true);
    setImportError(null);
    try {
      const res = await fetch(`${API_BASE}/api/restaurants/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place_id: placeId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      // Import returns the restaurant with images
      if (data.id === restaurantId) {
        setRestaurant({ ...data, images: data.images ?? [] });
      } else {
        // New restaurant: navigate to its owner page so the user sees the imported place
        navigate(`/owner/${data.id}`, { replace: false });
        return; // navigation will mount the page for data.id
      }
      setImportPlaceId("");
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  // --- Auto-tag all ---
  const [tagAllLoading, setTagAllLoading] = useState(false);

  async function handleTagAll() {
    if (!restaurantId) return;
    setTagAllLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/restaurants/${restaurantId}/images/tag-all`,
        {
          method: "POST",
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      await fetchRestaurant();
    } catch {
      // could set error state
    } finally {
      setTagAllLoading(false);
    }
  }

  // --- Add image (URL) ---
  const [newImageUrl, setNewImageUrl] = useState("");
  const [addImageError, setAddImageError] = useState<string | null>(null);

  async function handleAddImage(e: React.FormEvent) {
    e.preventDefault();
    const url = newImageUrl.trim();
    if (!url || !restaurantId) return;
    setAddImageError(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/restaurants/${restaurantId}/images`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_url: url, source: "owner_upload" }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setRestaurant((prev) =>
        prev ? { ...prev, images: [...(prev.images ?? []), data] } : null,
      );
      setNewImageUrl("");
    } catch (e) {
      setAddImageError(e instanceof Error ? e.message : "Add image failed");
    }
  }

  // --- Update image (slot or tags) ---
  async function updateImage(
    imageId: string,
    patch: { slot_type?: RestaurantImage["slot_type"]; tags?: string[] },
  ) {
    if (!restaurantId || !restaurant) return;
    try {
      const res = await fetch(
        `${API_BASE}/api/restaurants/${restaurantId}/images/${imageId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const updated: RestaurantImage = await res.json();
      setRestaurant((prev) =>
        prev
          ? {
              ...prev,
              images: (prev.images ?? []).map((img) =>
                img.id === imageId ? { ...img, ...updated } : img,
              ),
            }
          : null,
      );
    } catch {
      // could toast
    }
  }

  // --- Delete image ---
  async function deleteImage(imageId: string) {
    if (!restaurantId || !restaurant) return;
    try {
      const res = await fetch(
        `${API_BASE}/api/restaurants/${restaurantId}/images/${imageId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setRestaurant((prev) =>
        prev
          ? {
              ...prev,
              images: (prev.images ?? []).filter((img) => img.id !== imageId),
            }
          : null,
      );
    } catch {
      // could toast
    }
  }

  // --- Tag editing: remove tag ---
  function removeTag(image: RestaurantImage, tagToRemove: string) {
    const next = (image.tags ?? []).filter((t) => t !== tagToRemove);
    updateImage(image.id, { tags: next });
  }

  // --- Tag editing: add tag ---
  function addTag(image: RestaurantImage, newTag: string) {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    const current = image.tags ?? [];
    if (current.includes(trimmed)) return;
    updateImage(image.id, { tags: [...current, trimmed] });
  }

  // --- Story template state (lifted for Set as Intro/Outro) ---
  const [templateIntroId, setTemplateIntroId] = useState("");
  const [templateOutroId, setTemplateOutroId] = useState("");
  const [templateStoryImageIds, setTemplateStoryImageIds] = useState<string[]>(
    [],
  );
  const [templateCtaText, setTemplateCtaText] = useState("Book a Table");
  const [templateCtaUrl, setTemplateCtaUrl] = useState("");
  const [templateVideoPrompt, setTemplateVideoPrompt] = useState("");
  const [templateLoading, setTemplateLoading] = useState(true);
  const [templateSaving, setTemplateSaving] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    let cancelled = false;
    setTemplateLoading(true);
    fetch(`${API_BASE}/api/restaurants/${restaurantId}/story-template`)
      .then((res) => {
        if (res.status === 404) return null;
        if (!res.ok) throw new Error("Failed to load template");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data) {
          setTemplateIntroId(data.intro_image_id ?? "");
          setTemplateOutroId(data.outro_image_id ?? "");
          setTemplateStoryImageIds(
            Array.isArray(data.story_image_ids) &&
              data.story_image_ids.length > 0
              ? data.story_image_ids
              : [
                  ...(data.intro_image_id ? [data.intro_image_id] : []),
                  ...(data.outro_image_id &&
                  data.outro_image_id !== data.intro_image_id
                    ? [data.outro_image_id]
                    : []),
                ],
          );
          setTemplateCtaText(data.cta_text ?? "Book a Table");
          setTemplateCtaUrl(data.cta_url ?? "");
          setTemplateVideoPrompt(data.video_prompt ?? "");
        } else {
          // 404 or no template: clear so we don't send stale intro/outro from another restaurant
          setTemplateIntroId("");
          setTemplateOutroId("");
          setTemplateStoryImageIds([]);
          setTemplateCtaText("Book a Table");
          setTemplateCtaUrl("");
          setTemplateVideoPrompt("");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTemplateIntroId("");
          setTemplateOutroId("");
          setTemplateStoryImageIds([]);
          setTemplateCtaText("Book a Table");
          setTemplateCtaUrl("");
          setTemplateVideoPrompt("");
        }
      })
      .finally(() => {
        if (!cancelled) setTemplateLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  async function putStoryTemplate(overrides?: {
    intro_image_id?: string;
    outro_image_id?: string;
    story_image_ids?: string[];
    cta_text?: string;
    cta_url?: string;
    video_prompt?: string;
  }) {
    if (!restaurantId) return;
    const story_image_ids =
      overrides?.story_image_ids !== undefined
        ? overrides.story_image_ids
        : templateStoryImageIds;
    const intro_image_id =
      overrides?.intro_image_id ??
      (story_image_ids.length > 0 ? story_image_ids[0] : templateIntroId);
    const outro_image_id =
      overrides?.outro_image_id ??
      (story_image_ids.length > 0
        ? story_image_ids[story_image_ids.length - 1]
        : templateOutroId);
    const cta_text = overrides?.cta_text ?? templateCtaText;
    const cta_url = overrides?.cta_url ?? templateCtaUrl;
    const video_prompt =
      overrides?.video_prompt !== undefined
        ? overrides.video_prompt
        : templateVideoPrompt;
    if (!intro_image_id || !outro_image_id) return;
    setTemplateSaving(true);
    try {
      const body: Record<string, unknown> = {
        intro_image_id,
        outro_image_id,
        cta_text: cta_text || "Book a Table",
        cta_url: cta_url || undefined,
        video_prompt: (video_prompt || "").trim() || undefined,
      };
      if (story_image_ids.length > 0) {
        body.story_image_ids = story_image_ids;
      }
      const res = await fetch(
        `${API_BASE}/api/restaurants/${restaurantId}/story-template`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Save failed");
      }
      if (overrides?.story_image_ids !== undefined)
        setTemplateStoryImageIds(overrides.story_image_ids);
      if (overrides?.intro_image_id !== undefined)
        setTemplateIntroId(overrides.intro_image_id);
      if (overrides?.outro_image_id !== undefined)
        setTemplateOutroId(overrides.outro_image_id);
      if (overrides?.cta_text !== undefined)
        setTemplateCtaText(overrides.cta_text);
      if (overrides?.cta_url !== undefined)
        setTemplateCtaUrl(overrides.cta_url ?? "");
      if (overrides?.video_prompt !== undefined)
        setTemplateVideoPrompt(overrides.video_prompt ?? "");
    } finally {
      setTemplateSaving(false);
    }
  }

  // --- Generate video from image (Veo) ---
  const [generatingVideoId, setGeneratingVideoId] = useState<string | null>(
    null,
  );
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(
    null,
  );
  const [generateVideoError, setGenerateVideoError] = useState<string | null>(
    null,
  );

  async function handleGenerateVideo(imageId: string) {
    if (!restaurantId) return;
    setGeneratingVideoId(imageId);
    setGeneratedVideoUrl(null);
    setGenerateVideoError(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5 min
      const res = await fetch(
        `${API_BASE}/api/restaurants/${restaurantId}/images/${imageId}/generate-video`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
          signal: controller.signal,
        },
      );
      clearTimeout(timeoutId);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      const videoUrl =
        data.video_url ?? `/api/generated-videos/${data.video_id}`;
      setGeneratedVideoUrl(
        videoUrl.startsWith("http") ? videoUrl : `${API_BASE}${videoUrl}`,
      );
      await fetchRestaurant();
    } catch (e) {
      setGenerateVideoError(
        e instanceof Error ? e.message : "Video generation failed",
      );
    } finally {
      setGeneratingVideoId(null);
    }
  }

  function closeVideoModal() {
    setGeneratedVideoUrl(null);
    setGenerateVideoError(null);
  }

  // --- Generate videos for entire story template (intro + outro + personalized) ---
  const [generatingStoryVideos, setGeneratingStoryVideos] = useState(false);
  const [generateStoryVideosError, setGenerateStoryVideosError] = useState<
    string | null
  >(null);
  // Show story preview only after user clicked "Generate story videos" or "Preview here" on a past story
  const [showStoryPreview, setShowStoryPreview] = useState(false);
  const [forceRegenerateVideos, setForceRegenerateVideos] = useState(false);

  async function handleGenerateStoryVideos() {
    if (!restaurantId) return;
    const hasOrder =
      templateStoryImageIds.length > 0 || (templateIntroId && templateOutroId);
    if (!hasOrder) return;
    setShowStoryPreview(true); // allow preview to show once generation completes
    setGeneratingStoryVideos(true);
    setGenerateStoryVideosError(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15 * 60 * 1000); // 15 min for multiple videos
      const res = await fetch(
        `${API_BASE}/api/restaurants/${restaurantId}/story/generate-videos`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            video_prompt: templateVideoPrompt.trim() || undefined,
            story_image_ids:
              templateStoryImageIds.length > 0
                ? templateStoryImageIds
                : undefined,
            force: forceRegenerateVideos,
          }),
          signal: controller.signal,
        },
      );
      clearTimeout(timeoutId);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      await fetchRestaurant();
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        setGenerateStoryVideosError(
          `${data.generated ?? 0} generated, ${data.errors.length} failed: ${data.errors.map((e: { error?: string }) => e.error).join("; ")}`,
        );
      }
      const generated = data.generated ?? 0;
      const skipped = data.skipped ?? 0;
      if (skipped > 0 && generated === 0 && !forceRegenerateVideos) {
        setGenerateStoryVideosError(
          `All ${skipped} segment(s) already have videos. Check "Force regenerate" to overwrite.`,
        );
      }
    } catch (e) {
      setGenerateStoryVideosError(
        e instanceof Error ? e.message : "Story video generation failed",
      );
    } finally {
      setGeneratingStoryVideos(false);
    }
  }

  if (!restaurantId) {
    return (
      <div
        className="owner-dashboard owner-dashboard--error"
        id="owner-dashboard"
      >
        <p>Missing restaurant ID</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className="owner-dashboard owner-dashboard--loading"
        id="owner-dashboard"
      >
        <p className="owner-dashboard__loading-text">Loading restaurant…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="owner-dashboard owner-dashboard--error"
        id="owner-dashboard"
      >
        <p className="owner-dashboard__error-text">Error: {error}</p>
        <button
          type="button"
          className="owner-dashboard__retry"
          onClick={fetchRestaurant}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!restaurant) {
    return null;
  }

  const images = restaurant.images ?? [];
  const orderedIds =
    templateStoryImageIds.length > 0
      ? templateStoryImageIds
      : [templateIntroId, templateOutroId].filter(Boolean);
  const firstId = orderedIds[0];
  const lastId = orderedIds[orderedIds.length - 1];
  const introImage = images.find((img) => img.id === firstId);
  const outroImage = images.find((img) => img.id === lastId);
  const canPreviewStory = Boolean(
    firstId &&
    lastId &&
    introImage?.generated_video_id &&
    outroImage?.generated_video_id,
  );

  return (
    <div className="owner-dashboard" id="owner-dashboard">
      <header className="owner-dashboard__header" id="owner-dashboard-header">
        <h1 className="owner-dashboard__title">{restaurant.name}</h1>
        <p className="owner-dashboard__address">{restaurant.address}</p>
        <p className="owner-dashboard__meta">
          ⭐ {restaurant.rating.toFixed(1)}
          {(restaurant.cuisine_type ?? []).length > 0 && (
            <>
              {" "}
              · {(restaurant.cuisine_type ?? []).join(", ").replace(/_/g, " ")}
            </>
          )}
        </p>
      </header>

      <section
        className="owner-dashboard__actions"
        id="owner-dashboard-actions"
        aria-labelledby="owner-dashboard-actions-title"
      >
        <h2
          id="owner-dashboard-actions-title"
          className="owner-dashboard__section-title"
        >
          1. Actions
        </h2>
        <div className="owner-dashboard__action-layout">
          <form
            onSubmit={handleAddImage}
            className="owner-dashboard__action-card owner-dashboard__add-image-form"
            id="owner-dashboard-actions-add-image"
          >
            <label className="owner-dashboard__field-label">
              Add image by URL
            </label>
            <div className="owner-dashboard__input-group">
              <input
                id="owner-dashboard-new-image-url"
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="https://..."
                className="owner-dashboard__input"
              />
              <button
                type="submit"
                id="owner-dashboard-btn-add-image"
                className="owner-dashboard__btn owner-dashboard__btn--primary"
              >
                Add Image
              </button>
            </div>
            {addImageError && (
              <p className="owner-dashboard__field-error">{addImageError}</p>
            )}
          </form>
          <div
            className="owner-dashboard__action-card"
            id="owner-dashboard-actions-import"
          >
            <label className="owner-dashboard__field-label">
              Import from Google (place_id)
            </label>
            <div className="owner-dashboard__input-group">
              <input
                id="owner-dashboard-import-place-id"
                type="text"
                value={importPlaceId}
                onChange={(e) => setImportPlaceId(e.target.value)}
                placeholder="ChIJ..."
                className="owner-dashboard__input"
              />
              <button
                type="button"
                id="owner-dashboard-btn-import"
                onClick={handleImport}
                disabled={importing}
                className="owner-dashboard__btn owner-dashboard__btn--primary"
              >
                {importing ? "Importing…" : "Import from Google"}
              </button>
            </div>
            {importError && (
              <p className="owner-dashboard__field-error">{importError}</p>
            )}
          </div>
          <div
            className="owner-dashboard__action-card owner-dashboard__action-card--buttons"
            id="owner-dashboard-actions-batch"
          >
            <button
              type="button"
              id="owner-dashboard-btn-tag-all"
              onClick={handleTagAll}
              disabled={tagAllLoading}
              className="owner-dashboard__btn owner-dashboard__btn--secondary"
            >
              {tagAllLoading ? "Tagging…" : "Auto-Tag All"}
            </button>
            <button
              type="button"
              id="owner-dashboard-btn-sync-all"
              onClick={handleSyncAll}
              disabled={syncAllLoading}
              className="owner-dashboard__btn owner-dashboard__btn--secondary"
              title="Fetch name, address, rating, phone, website and photos from Google for every restaurant in the list"
            >
              {syncAllLoading ? "Syncing…" : "Sync all restaurants from Google"}
            </button>
            {syncAllResult && (
              <p className="owner-dashboard__field-hint">
                Synced {syncAllResult.synced} restaurant(s).
                {syncAllResult.errors.length > 0 &&
                  ` Errors: ${syncAllResult.errors.map((e) => e.name || e.id || e.error).join(", ")}`}
              </p>
            )}
          </div>
        </div>
      </section>

      <section
        className="owner-dashboard__images"
        id="owner-dashboard-images"
        aria-labelledby="owner-dashboard-images-title"
      >
        <h2
          id="owner-dashboard-images-title"
          className="owner-dashboard__section-title"
        >
          2. Images
        </h2>
        <div
          className="owner-dashboard__image-grid"
          id="owner-dashboard-image-grid"
        >
          {images.map((img) => (
            <ImageCard
              key={img.id}
              id={`owner-dashboard-image-card-${img.id}`}
              image={img}
              onSlotChange={(slot_type) => updateImage(img.id, { slot_type })}
              onDelete={() => deleteImage(img.id)}
              onRemoveTag={(tag) => removeTag(img, tag)}
              onAddTag={(tag) => addTag(img, tag)}
            />
          ))}
        </div>
      </section>

      <StoryTemplateSection
        id="owner-dashboard-story-template"
        restaurantId={restaurantId}
        images={images}
        storyImageIds={templateStoryImageIds}
        setStoryImageIds={setTemplateStoryImageIds}
        introId={templateIntroId}
        outroId={templateOutroId}
        ctaText={templateCtaText}
        ctaUrl={templateCtaUrl}
        videoPrompt={templateVideoPrompt}
        setVideoPrompt={setTemplateVideoPrompt}
        setIntroId={setTemplateIntroId}
        setOutroId={setTemplateOutroId}
        setCtaText={setTemplateCtaText}
        setCtaUrl={setTemplateCtaUrl}
        templateLoading={templateLoading}
        templateSaving={templateSaving}
        onSave={() => putStoryTemplate()}
        onGenerateStoryVideos={handleGenerateStoryVideos}
        generatingStoryVideos={generatingStoryVideos}
        generateStoryVideosError={generateStoryVideosError}
        canPreviewStory={canPreviewStory}
        apiBaseUrl={API_BASE}
        onPastStoriesOpen={() => setShowStoryPreview(true)}
        forceRegenerateVideos={forceRegenerateVideos}
        onForceRegenerateVideosChange={setForceRegenerateVideos}
      />

      {/* Story preview: only after user clicked Generate story videos or "Preview here" on a past story */}
      {showStoryPreview &&
        !generatingStoryVideos &&
        canPreviewStory &&
        (() => {
          const segments = buildPreviewSegments(
            images,
            templateIntroId,
            templateOutroId,
            templateCtaText,
            templateCtaUrl,
            templateStoryImageIds.length > 0
              ? templateStoryImageIds
              : undefined,
          );
          if (segments.length === 0) return null;
          return (
            <OwnerStoryPreview
              segments={segments}
              restaurant={restaurant}
              apiBaseUrl={API_BASE}
            />
          );
        })()}

      {/* Video generation modal */}
      {(generatedVideoUrl || generateVideoError) && (
        <div
          id="owner-dashboard-video-modal"
          className="owner-dashboard__video-modal"
          role="dialog"
          aria-modal
          aria-labelledby="video-modal-title"
        >
          <div className="owner-dashboard__video-modal-backdrop" />
          <div
            className="owner-dashboard__video-modal-content"
            id="owner-dashboard-video-modal-content"
          >
            <h2
              id="video-modal-title"
              className="owner-dashboard__video-modal-title"
            >
              Generated video
            </h2>
            <button
              type="button"
              className="owner-dashboard__video-modal-close"
              onClick={closeVideoModal}
              aria-label="Close"
            >
              ×
            </button>
            {generateVideoError && (
              <p className="owner-dashboard__video-modal-error">
                {generateVideoError}
              </p>
            )}
            {generatedVideoUrl && (
              <>
                <video
                  src={generatedVideoUrl}
                  controls
                  autoPlay
                  playsInline
                  className="owner-dashboard__video-modal-video"
                />
                {canPreviewStory ? (
                  <button
                    type="button"
                    className="owner-dashboard__btn owner-dashboard__btn--primary"
                    style={{ marginTop: 16 }}
                    onClick={() => {
                      closeVideoModal();
                      navigate(
                        `/restaurant/${restaurantId}/story?preview=true`,
                      );
                    }}
                  >
                    Preview in story
                  </button>
                ) : (
                  <p className="owner-dashboard__video-modal-hint">
                    Save template and run &quot;Generate story videos&quot; to
                    enable Preview.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {generatingVideoId && (
        <div
          id="owner-dashboard-video-generating"
          className="owner-dashboard__video-generating"
          role="status"
          aria-live="polite"
        >
          <div className="owner-dashboard__video-generating-backdrop" />
          <div className="owner-dashboard__video-generating-content">
            <p>Generating video… This may take 1–3 minutes.</p>
          </div>
        </div>
      )}

      {generatingStoryVideos && (
        <div
          id="owner-dashboard-story-videos-generating"
          className="owner-dashboard__story-videos-generating"
          role="status"
          aria-live="polite"
        >
          <div className="owner-dashboard__story-videos-generating-backdrop" />
          <div className="owner-dashboard__story-videos-generating-content">
            <div className="owner-dashboard__loader" aria-hidden />
            <p>Loading story…</p>
            <p className="owner-dashboard__story-videos-generating-hint">
              Generating videos. The story will open when ready.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/** Story preview as its own component (always shown when story is ready). */
function OwnerStoryPreview({
  segments,
  restaurant,
  apiBaseUrl,
}: {
  segments: StorySegment[];
  restaurant: Restaurant;
  apiBaseUrl: string;
}) {
  return (
    <div
      className="owner-dashboard__story-preview-inline"
      id="owner-dashboard-story-preview-inline"
    >
      <p className="owner-dashboard__story-preview-inline-label">
        Story preview (video)
      </p>
      <div className="owner-dashboard__story-preview-inline-player">
        <StoryPlayer
          segments={segments}
          restaurant={restaurant}
          onClose={() => {}}
          apiBaseUrl={apiBaseUrl}
          personaLabel={undefined}
        />
      </div>
    </div>
  );
}

// --- Image card: thumbnail, tags, slot badge, slot dropdown, delete, tag edit ---
function ImageCard({
  id,
  image,
  onSlotChange,
  onDelete,
  onRemoveTag,
  onAddTag,
}: {
  id?: string;
  image: RestaurantImage;
  onSlotChange: (slot: RestaurantImage["slot_type"]) => void;
  onDelete: () => void;
  onRemoveTag: (tag: string) => void;
  onAddTag: (tag: string) => void;
}) {
  const [newTag, setNewTag] = useState("");

  const tags = image.tags ?? [];
  const showImage = !isPlaceholderOrInvalidImageUrl(image.image_url);

  return (
    <div className="owner-image-card" id={id}>
      <div className="owner-image-card__media">
        {showImage ? (
          <img
            src={image.image_url}
            alt=""
            className="owner-image-card__thumb"
          />
        ) : (
          <div className="owner-image-card__placeholder">No image</div>
        )}
        <span className="owner-image-card__slot-badge">{image.slot_type}</span>
        <button
          type="button"
          onClick={onDelete}
          className="owner-image-card__delete"
          aria-label="Delete image"
        >
          Delete
        </button>
      </div>
      <label className="owner-image-card__label">Slot</label>
      <select
        value={image.slot_type}
        onChange={(e) =>
          onSlotChange(e.target.value as RestaurantImage["slot_type"])
        }
        className="owner-image-card__select"
      >
        {SLOT_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <div className="owner-image-card__tags">
        <span className="owner-image-card__label">Tags</span>
        <div className="owner-image-card__tag-list">
          {tags.map((t) => (
            <span
              key={t}
              onClick={() => onRemoveTag(t)}
              className="owner-image-card__tag"
              title="Click to remove"
            >
              {t} ×
            </span>
          ))}
        </div>
        <div className="owner-image-card__tag-input-wrap">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onAddTag(newTag);
                setNewTag("");
              }
            }}
            placeholder="Add tag"
            className="owner-image-card__tag-input"
          />
          <button
            type="button"
            onClick={() => {
              onAddTag(newTag);
              setNewTag("");
            }}
            className="owner-image-card__btn owner-image-card__btn--add"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Story template section: drag-and-drop image grid for story order ---
function StoryTemplateSection({
  id: sectionId,
  restaurantId,
  images,
  storyImageIds,
  setStoryImageIds,
  introId,
  outroId,
  ctaText,
  ctaUrl,
  videoPrompt,
  setVideoPrompt,
  setIntroId,
  setOutroId,
  setCtaText,
  setCtaUrl,
  templateLoading,
  templateSaving,
  onSave,
  onGenerateStoryVideos,
  generatingStoryVideos,
  generateStoryVideosError,
  canPreviewStory,
  apiBaseUrl,
  onPastStoriesOpen,
  forceRegenerateVideos,
  onForceRegenerateVideosChange,
}: {
  id?: string;
  restaurantId: string;
  images: RestaurantImage[];
  storyImageIds: string[];
  setStoryImageIds: (ids: string[]) => void;
  introId: string;
  outroId: string;
  ctaText: string;
  ctaUrl: string;
  videoPrompt: string;
  setVideoPrompt: (v: string) => void;
  setIntroId: (id: string) => void;
  setOutroId: (id: string) => void;
  setCtaText: (v: string) => void;
  setCtaUrl: (v: string) => void;
  templateLoading: boolean;
  templateSaving: boolean;
  onSave: () => Promise<void>;
  onGenerateStoryVideos?: () => void;
  generatingStoryVideos?: boolean;
  generateStoryVideosError?: string | null;
  canPreviewStory?: boolean;
  apiBaseUrl: string;
  onPastStoriesOpen?: () => void;
  forceRegenerateVideos?: boolean;
  onForceRegenerateVideosChange?: (value: boolean) => void;
}) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showPastStories, setShowPastStories] = useState(false);
  const [allTemplates, setAllTemplates] = useState<
    Array<{
      id?: string;
      restaurant_id: string;
      restaurant_name?: string;
      intro_image_id?: string;
      outro_image_id?: string;
      story_image_ids?: string[];
      cta_text?: string;
      cta_url?: string;
      video_prompt?: string;
    }>
  >([]);
  const [allTemplatesLoading, setAllTemplatesLoading] = useState(false);
  const byId = Object.fromEntries(images.map((i) => [i.id, i]));
  const orderedImages = storyImageIds
    .map((id) => byId[id])
    .filter(Boolean) as RestaurantImage[];

  function handleDragStart(e: React.DragEvent, index: number) {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    setDraggedIndex(null);
    const fromIndex = Number(e.dataTransfer.getData("text/plain"));
    if (Number.isNaN(fromIndex) || fromIndex === dropIndex) return;
    const next = [...storyImageIds];
    const [removed] = next.splice(fromIndex, 1);
    next.splice(dropIndex, 0, removed);
    setStoryImageIds(next);
  }

  function handleRemoveFromStory(index: number) {
    const next = storyImageIds.filter((_, i) => i !== index);
    setStoryImageIds(next);
  }

  function handleAddToStory(imageId: string) {
    if (storyImageIds.includes(imageId)) return;
    setStoryImageIds([...storyImageIds, imageId]);
  }

  const availableToAdd = images.filter(
    (img) => !storyImageIds.includes(img.id),
  );
  const hasOrder = storyImageIds.length > 0 || (introId && outroId);

  useEffect(() => {
    if (!showTemplates || !apiBaseUrl) return;
    setAllTemplatesLoading(true);
    fetch(`${apiBaseUrl}/api/story-templates`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setAllTemplates(Array.isArray(data) ? data : []))
      .catch(() => setAllTemplates([]))
      .finally(() => setAllTemplatesLoading(false));
  }, [showTemplates, apiBaseUrl]);

  if (templateLoading) {
    return (
      <section
        className="story-template-section story-template-section--loading"
        id={sectionId ?? "story-template-section"}
      >
        <h2 className="story-template-section__title">3. Story template</h2>
        <p className="story-template-section__loading-text">Loading…</p>
      </section>
    );
  }

  return (
    <section
      className="story-template-section"
      id={sectionId ?? "story-template-section"}
      aria-labelledby="story-template-section-title"
    >
      <h2
        id="story-template-section-title"
        className="story-template-section__title"
      >
        3. Story template
      </h2>
      <p className="story-template-section__description">
        Drag images to set the story order. First = intro, last = outro.
      </p>
      <div
        className="story-template-section__video-prompt"
        id="story-template-video-prompt"
      >
        <label
          htmlFor="story-template-video-prompt-input"
          className="story-template-section__video-prompt-label"
        >
          Video prompt (Google Veo 3.1 Fast)
        </label>
        <p className="story-template-section__video-prompt-hint">
          This prompt is used with each image when generating story videos.
        </p>
        <textarea
          id="story-template-video-prompt-input"
          value={videoPrompt}
          onChange={(e) => setVideoPrompt(e.target.value)}
          placeholder="e.g. Smooth, cinematic motion. The scene comes gently to life with subtle movement and appetizing atmosphere."
          className="story-template-section__video-prompt-input"
          rows={3}
        />
      </div>

      <div
        className="story-template-section__order-grid"
        id="story-template-order-grid"
      >
        {orderedImages.map((img, index) => {
          const showImage = !isPlaceholderOrInvalidImageUrl(img.image_url);
          return (
            <div
              key={img.id}
              className={`story-template-order-card ${draggedIndex === index ? "story-template-order-card--dragging" : ""}`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={() => setDraggedIndex(null)}
            >
              <span className="story-template-order-card__handle" aria-hidden>
                ⋮⋮
              </span>
              {showImage ? (
                <img
                  src={img.image_url}
                  alt=""
                  className="story-template-order-card__thumb"
                />
              ) : (
                <div className="story-template-order-card__placeholder">
                  No image
                </div>
              )}
              <span className="story-template-order-card__position">
                {index + 1}
              </span>
              <button
                type="button"
                className="story-template-order-card__remove"
                onClick={() => handleRemoveFromStory(index)}
                aria-label="Remove from story"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {availableToAdd.length > 0 && (
        <div className="story-template-section__add">
          <label className="story-template-section__add-label">
            Add image to story
          </label>
          <select
            className="story-template-section__add-select"
            value=""
            onChange={(e) => {
              const id = e.target.value;
              if (id) handleAddToStory(id);
              e.target.value = "";
            }}
            aria-label="Add image to story"
          >
            <option value="">— Select —</option>
            {availableToAdd.map((img) => (
              <option key={img.id} value={img.id}>
                {img.slot_type} – {img.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="story-template-section__cta-fields">
        <div className="story-template-card__field">
          <label className="story-template-card__field-label">CTA text</label>
          <input
            type="text"
            value={ctaText}
            onChange={(e) => setCtaText(e.target.value)}
            className="story-template-card__input"
            placeholder="e.g. Book a Table"
          />
        </div>
        <div className="story-template-card__field">
          <label className="story-template-card__field-label">
            CTA URL (optional)
          </label>
          <input
            type="url"
            value={ctaUrl}
            onChange={(e) => setCtaUrl(e.target.value)}
            className="story-template-card__input"
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="story-template-section__save-actions">
        <button
          type="button"
          onClick={onSave}
          id="story-template-btn-save"
          disabled={templateSaving || storyImageIds.length === 0}
          className="story-template-card__save"
        >
          {templateSaving ? "Saving…" : "Save template"}
        </button>
        <button
          type="button"
          onClick={() => setShowTemplates(!showTemplates)}
          className="owner-dashboard__btn owner-dashboard__btn--secondary"
          id="story-template-btn-show-templates"
        >
          {showTemplates ? "Hide templates" : "Show templates"}
        </button>
      </div>
      {showTemplates && (
        <div
          className="story-template-section__template-summary"
          id="story-template-summary"
        >
          <p className="story-template-section__template-summary-label">
            All saved templates
          </p>
          {allTemplatesLoading ? (
            <p className="story-template-section__template-summary-meta">
              Loading…
            </p>
          ) : allTemplates.length === 0 ? (
            <p className="story-template-section__template-summary-meta">
              No saved templates yet.
            </p>
          ) : (
            <ul className="story-template-section__template-list">
              {allTemplates.map((t) => {
                const orderCount =
                  (t.story_image_ids ?? []).length ||
                  (t.intro_image_id && t.outro_image_id ? 2 : 0);
                return (
                  <li
                    key={t.id ?? t.restaurant_id}
                    className="story-template-section__template-item"
                  >
                    <span className="story-template-section__template-item-name">
                      {t.restaurant_name ?? t.restaurant_id ?? "—"}
                    </span>
                    <span className="story-template-section__template-item-meta">
                      Order: {orderCount} image{orderCount !== 1 ? "s" : ""}
                    </span>
                    <span className="story-template-section__template-item-cta">
                      CTA: {t.cta_text ?? "—"}
                    </span>
                    <span className="story-template-section__template-item-prompt">
                      Prompt: {(t.video_prompt || "—").slice(0, 60)}
                      {(t.video_prompt?.length ?? 0) > 60 ? "…" : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <div className="story-template-section__past-stories-wrap">
        <button
          type="button"
          onClick={() => setShowPastStories(!showPastStories)}
          className="owner-dashboard__btn owner-dashboard__btn--secondary"
          id="story-template-btn-past-stories"
        >
          {showPastStories ? "Hide past stories" : "Past stories"}
        </button>
        {showPastStories && (
          <div
            className="story-template-section__past-stories"
            id="story-template-past-stories"
          >
            <p className="story-template-section__past-stories-label">
              Generated videos (story segments)
            </p>
            {images.filter((img) => img.generated_video_id).length === 0 ? (
              <p className="story-template-section__past-stories-empty">
                No generated videos yet.
              </p>
            ) : (
              <ul className="story-template-section__past-stories-list">
                {images
                  .filter((img) => img.generated_video_id)
                  .map((img) => (
                    <li
                      key={img.id}
                      className="story-template-section__past-stories-item"
                    >
                      {!isPlaceholderOrInvalidImageUrl(img.image_url) ? (
                        <img
                          src={img.image_url}
                          alt=""
                          className="story-template-section__past-stories-thumb"
                        />
                      ) : (
                        <div className="story-template-section__past-stories-thumb story-template-section__past-stories-thumb--placeholder">
                          —
                        </div>
                      )}
                      <a
                        href={`${apiBaseUrl}/api/generated-videos/${img.generated_video_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="story-template-section__past-stories-play"
                      >
                        Play video
                      </a>
                      <button
                        type="button"
                        onClick={() => onPastStoriesOpen?.()}
                        className="story-template-section__past-stories-preview"
                      >
                        Preview here
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div
        className="story-template-section__generate"
        id="story-template-generate"
      >
        {generatingStoryVideos && (
          <p className="story-template-section__generate-loading" role="status">
            Loading story…
          </p>
        )}
        <p className="story-template-section__generate-hint">
          After saving the template, generate videos for each image in order.
          This may take several minutes.
        </p>
        {onForceRegenerateVideosChange && (
          <label className="story-template-section__force-regenerate">
            <input
              type="checkbox"
              checked={forceRegenerateVideos ?? false}
              onChange={(e) => onForceRegenerateVideosChange(e.target.checked)}
              aria-label="Force regenerate all videos (overwrite existing)"
            />
            Force regenerate (overwrite existing videos)
          </label>
        )}
        <button
          type="button"
          id="owner-dashboard-btn-generate-story-videos"
          onClick={onGenerateStoryVideos}
          disabled={
            !hasOrder ||
            templateSaving ||
            generatingStoryVideos ||
            !onGenerateStoryVideos
          }
          className="owner-dashboard__btn owner-dashboard__btn--generate-videos"
        >
          {generatingStoryVideos
            ? "Generating story videos…"
            : "Generate story videos"}
        </button>
        {generateStoryVideosError && (
          <p className="owner-dashboard__field-error">
            {generateStoryVideosError}
          </p>
        )}
      </div>
    </section>
  );
}
