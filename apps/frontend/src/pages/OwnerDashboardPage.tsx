import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Restaurant, RestaurantImage } from "../types";

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
  const [templateCtaText, setTemplateCtaText] = useState("Book a Table");
  const [templateCtaUrl, setTemplateCtaUrl] = useState("");
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
          setTemplateCtaText(data.cta_text ?? "Book a Table");
          setTemplateCtaUrl(data.cta_url ?? "");
        } else {
          // 404 or no template: clear so we don't send stale intro/outro from another restaurant
          setTemplateIntroId("");
          setTemplateOutroId("");
          setTemplateCtaText("Book a Table");
          setTemplateCtaUrl("");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTemplateIntroId("");
          setTemplateOutroId("");
          setTemplateCtaText("Book a Table");
          setTemplateCtaUrl("");
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
    cta_text?: string;
    cta_url?: string;
  }) {
    if (!restaurantId) return;
    const intro_image_id = overrides?.intro_image_id ?? templateIntroId;
    const outro_image_id = overrides?.outro_image_id ?? templateOutroId;
    const cta_text = overrides?.cta_text ?? templateCtaText;
    const cta_url = overrides?.cta_url ?? templateCtaUrl;
    if (!intro_image_id || !outro_image_id) return;
    setTemplateSaving(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/restaurants/${restaurantId}/story-template`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intro_image_id,
            outro_image_id,
            cta_text: cta_text || "Book a Table",
            cta_url: cta_url || undefined,
          }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Save failed");
      }
      if (overrides?.intro_image_id !== undefined)
        setTemplateIntroId(overrides.intro_image_id);
      if (overrides?.outro_image_id !== undefined)
        setTemplateOutroId(overrides.outro_image_id);
      if (overrides?.cta_text !== undefined)
        setTemplateCtaText(overrides.cta_text);
      if (overrides?.cta_url !== undefined)
        setTemplateCtaUrl(overrides.cta_url ?? "");
    } finally {
      setTemplateSaving(false);
    }
  }

  async function handleSetAsIntro(imageId: string) {
    await updateImage(imageId, { slot_type: "intro" });
    setTemplateIntroId(imageId);
    await putStoryTemplate({ intro_image_id: imageId });
  }

  async function handleSetAsOutro(imageId: string) {
    await updateImage(imageId, { slot_type: "outro" });
    setTemplateOutroId(imageId);
    await putStoryTemplate({ outro_image_id: imageId });
  }

  if (!restaurantId) {
    return (
      <div className="owner-dashboard owner-dashboard--error">
        <p>Missing restaurant ID</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="owner-dashboard owner-dashboard--loading">
        <p className="owner-dashboard__loading-text">Loading restaurant…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="owner-dashboard owner-dashboard--error">
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

  return (
    <div className="owner-dashboard">
      <header className="owner-dashboard__header">
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

      <section className="owner-dashboard__actions">
        <h2 className="owner-dashboard__section-title">Actions</h2>
        <div className="owner-dashboard__action-row">
          <div className="owner-dashboard__field">
            <label className="owner-dashboard__field-label">
              Import from Google (place_id)
            </label>
            <div className="owner-dashboard__input-group">
              <input
                type="text"
                value={importPlaceId}
                onChange={(e) => setImportPlaceId(e.target.value)}
                placeholder="ChIJ..."
                className="owner-dashboard__input"
              />
              <button
                type="button"
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
          <button
            type="button"
            onClick={handleTagAll}
            disabled={tagAllLoading}
            className="owner-dashboard__btn owner-dashboard__btn--secondary"
          >
            {tagAllLoading ? "Tagging…" : "Auto-Tag All"}
          </button>
          <button
            type="button"
            onClick={handleSyncAll}
            disabled={syncAllLoading}
            className="owner-dashboard__btn owner-dashboard__btn--secondary"
            title="Fetch name, address, rating, phone, website and photos from Google for every restaurant in the list"
          >
            {syncAllLoading ? "Syncing…" : "Sync all restaurants from Google"}
          </button>
          {syncAllResult && (
            <p className="owner-dashboard__field-hint" style={{ marginTop: 8 }}>
              Synced {syncAllResult.synced} restaurant(s).
              {syncAllResult.errors.length > 0 &&
                ` Errors: ${syncAllResult.errors.map((e) => e.name || e.id || e.error).join(", ")}`}
            </p>
          )}
          <form
            onSubmit={handleAddImage}
            className="owner-dashboard__field owner-dashboard__add-image-form"
          >
            <label className="owner-dashboard__field-label">
              Add image by URL
            </label>
            <div className="owner-dashboard__input-group">
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="https://..."
                className="owner-dashboard__input"
              />
              <button
                type="submit"
                className="owner-dashboard__btn owner-dashboard__btn--primary"
              >
                Add Image
              </button>
            </div>
            {addImageError && (
              <p className="owner-dashboard__field-error">{addImageError}</p>
            )}
          </form>
        </div>
      </section>

      <section className="owner-dashboard__images">
        <h2 className="owner-dashboard__section-title">Images</h2>
        <div className="owner-dashboard__image-grid">
          {images.map((img) => (
            <ImageCard
              key={img.id}
              image={img}
              onSlotChange={(slot_type) => updateImage(img.id, { slot_type })}
              onDelete={() => deleteImage(img.id)}
              onRemoveTag={(tag) => removeTag(img, tag)}
              onAddTag={(tag) => addTag(img, tag)}
              onSetAsIntro={() => handleSetAsIntro(img.id)}
              onSetAsOutro={() => handleSetAsOutro(img.id)}
            />
          ))}
        </div>
      </section>

      <section className="owner-dashboard__preview">
        <button
          type="button"
          onClick={() =>
            navigate(`/restaurant/${restaurantId}/story?preview=true`)
          }
          className="owner-dashboard__btn owner-dashboard__btn--preview"
        >
          Preview Story
        </button>
      </section>
      <StoryTemplateSection
        restaurantId={restaurantId}
        images={images}
        introId={templateIntroId}
        outroId={templateOutroId}
        ctaText={templateCtaText}
        ctaUrl={templateCtaUrl}
        setIntroId={setTemplateIntroId}
        setOutroId={setTemplateOutroId}
        setCtaText={setTemplateCtaText}
        setCtaUrl={setTemplateCtaUrl}
        templateLoading={templateLoading}
        templateSaving={templateSaving}
        onSave={() => putStoryTemplate()}
      />
    </div>
  );
}

// --- Image card: thumbnail, tags, slot badge, slot dropdown, delete, tag edit, Set as Intro/Outro ---
function ImageCard({
  image,
  onSlotChange,
  onDelete,
  onRemoveTag,
  onAddTag,
  onSetAsIntro,
  onSetAsOutro,
}: {
  image: RestaurantImage;
  onSlotChange: (slot: RestaurantImage["slot_type"]) => void;
  onDelete: () => void;
  onRemoveTag: (tag: string) => void;
  onAddTag: (tag: string) => void;
  onSetAsIntro: () => void;
  onSetAsOutro: () => void;
}) {
  const [newTag, setNewTag] = useState("");

  const tags = image.tags ?? [];
  const showImage = !isPlaceholderOrInvalidImageUrl(image.image_url);

  return (
    <div className="owner-image-card">
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
      <div className="owner-image-card__actions">
        <button
          type="button"
          onClick={onSetAsIntro}
          className="owner-image-card__btn owner-image-card__btn--intro"
        >
          Set as Intro
        </button>
        <button
          type="button"
          onClick={onSetAsOutro}
          className="owner-image-card__btn owner-image-card__btn--outro"
        >
          Set as Outro
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

// --- Story template section: 3-slot layout [Intro] → [Personalized pool] → [Outro + CTA + Save] ---
function StoryTemplateSection({
  restaurantId,
  images,
  introId,
  outroId,
  ctaText,
  ctaUrl,
  setIntroId,
  setOutroId,
  setCtaText,
  setCtaUrl,
  templateLoading,
  templateSaving,
  onSave,
}: {
  restaurantId: string;
  images: RestaurantImage[];
  introId: string;
  outroId: string;
  ctaText: string;
  ctaUrl: string;
  setIntroId: (id: string) => void;
  setOutroId: (id: string) => void;
  setCtaText: (v: string) => void;
  setCtaUrl: (v: string) => void;
  templateLoading: boolean;
  templateSaving: boolean;
  onSave: () => Promise<void>;
}) {
  const introImage = images.find((img) => img.id === introId);
  const outroImage = images.find((img) => img.id === outroId);
  const personalizedCount = images.filter(
    (img) => img.slot_type === "personalized",
  ).length;

  if (templateLoading) {
    return (
      <section className="story-template-section story-template-section--loading">
        <h2 className="story-template-section__title">Story template</h2>
        <p className="story-template-section__loading-text">Loading…</p>
      </section>
    );
  }

  return (
    <section className="story-template-section">
      <h2 className="story-template-section__title">Story template</h2>
      <p className="story-template-section__description">
        Define the order of your story: opening image, personalized middle, and
        closing with a call-to-action.
      </p>
      <div className="story-template-section__grid">
        <div className="story-template-card story-template-card--intro">
          <span className="story-template-card__step">1</span>
          <h3 className="story-template-card__label">Intro image</h3>
          {introImage &&
          !isPlaceholderOrInvalidImageUrl(introImage.image_url) ? (
            <img
              src={introImage.image_url}
              alt="Intro"
              className="story-template-card__thumb"
            />
          ) : (
            <div className="story-template-card__placeholder">
              {introImage ? "Your image here" : "No intro selected"}
            </div>
          )}
          <select
            value={introId}
            onChange={(e) => setIntroId(e.target.value)}
            className="story-template-card__select"
            aria-label="Choose intro image"
          >
            <option value="">— Select intro —</option>
            {images.map((img) => (
              <option key={img.id} value={img.id}>
                {img.slot_type} – {img.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </div>

        <div className="story-template-card story-template-card--pool">
          <span className="story-template-card__step">2</span>
          <h3 className="story-template-card__label">Personalized pool</h3>
          <p className="story-template-card__count">
            {personalizedCount} image{personalizedCount !== 1 ? "s" : ""}
          </p>
          <p className="story-template-card__hint">
            Use &quot;Set as Intro&quot; / &quot;Set as Outro&quot; on image
            cards above to assign the first and last frame.
          </p>
        </div>

        <div className="story-template-card story-template-card--outro">
          <span className="story-template-card__step">3</span>
          <h3 className="story-template-card__label">Outro & CTA</h3>
          {outroImage &&
          !isPlaceholderOrInvalidImageUrl(outroImage.image_url) ? (
            <img
              src={outroImage.image_url}
              alt="Outro"
              className="story-template-card__thumb"
            />
          ) : (
            <div className="story-template-card__placeholder">
              {outroImage ? "Your image here" : "No outro selected"}
            </div>
          )}
          <select
            value={outroId}
            onChange={(e) => setOutroId(e.target.value)}
            className="story-template-card__select"
            aria-label="Choose outro image"
          >
            <option value="">— Select outro —</option>
            {images.map((img) => (
              <option key={img.id} value={img.id}>
                {img.slot_type} – {img.id.slice(0, 8)}
              </option>
            ))}
          </select>
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
          <button
            type="button"
            onClick={onSave}
            disabled={templateSaving || !introId || !outroId}
            className="story-template-card__save"
          >
            {templateSaving ? "Saving…" : "Save template"}
          </button>
        </div>
      </div>
    </section>
  );
}
