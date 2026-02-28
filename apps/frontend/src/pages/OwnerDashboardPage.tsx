import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Restaurant, RestaurantImage } from "../types";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ??
  import.meta.env.VITE_API_URL ??
  "http://localhost:8000";

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
    return <div>Missing restaurant ID</div>;
  }

  if (loading) {
    return <div>Loading restaurant…</div>;
  }

  if (error) {
    return (
      <div>
        <p>Error: {error}</p>
        <button type="button" onClick={fetchRestaurant}>
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
    <div style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
      {/* 5.3 Restaurant header */}
      <header
        style={{
          marginBottom: 24,
          paddingBottom: 16,
          borderBottom: "1px solid #ccc",
        }}
      >
        <h1 style={{ margin: "0 0 8px 0" }}>{restaurant.name}</h1>
        <p style={{ margin: 0, color: "#555" }}>{restaurant.address}</p>
        <p style={{ margin: "4px 0 0 0" }}>
          Rating: {restaurant.rating} · Cuisine:{" "}
          {(restaurant.cuisine_type ?? []).join(", ") || "—"}
        </p>
      </header>

      {/* Actions: Import, Auto-Tag, Add Image */}
      <section style={{ marginBottom: 24 }}>
        <h2 style={{ margin: "0 0 12px 0", fontSize: 18 }}>Actions</h2>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            alignItems: "flex-end",
          }}
        >
          <div>
            <label style={{ display: "block", marginBottom: 4, fontSize: 12 }}>
              Import from Google (place_id)
            </label>
            <input
              type="text"
              value={importPlaceId}
              onChange={(e) => setImportPlaceId(e.target.value)}
              placeholder="ChIJ..."
              style={{ marginRight: 8, padding: "6px 10px", width: 220 }}
            />
            <button type="button" onClick={handleImport} disabled={importing}>
              {importing ? "Importing…" : "Import from Google"}
            </button>
            {importError && (
              <p style={{ color: "red", margin: "4px 0 0 0", fontSize: 12 }}>
                {importError}
              </p>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={handleTagAll}
              disabled={tagAllLoading}
            >
              {tagAllLoading ? "Tagging…" : "Auto-Tag All"}
            </button>
          </div>
          <form
            onSubmit={handleAddImage}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <input
              type="url"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              placeholder="Image URL"
              style={{ padding: "6px 10px", width: 240 }}
            />
            <button type="submit">Add Image</button>
            {addImageError && (
              <span style={{ color: "red", fontSize: 12 }}>
                {addImageError}
              </span>
            )}
          </form>
        </div>
      </section>

      {/* 5.4 Image grid */}
      <h2 style={{ margin: "0 0 12px 0", fontSize: 18 }}>Images</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
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

      {/* Story template builder (bottom) */}
      <section style={{ marginTop: 24, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => navigate(`/restaurant/${restaurantId}?preview=true`)}
          style={{
            padding: "8px 16px",
            background: "#f0f0f0",
            border: "1px solid #ccc",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 14,
          }}
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

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 8,
        overflow: "hidden",
        padding: 12,
        background: "#fafafa",
      }}
    >
      <div style={{ position: "relative", marginBottom: 8 }}>
        <img
          src={image.image_url}
          alt=""
          style={{
            width: "100%",
            height: 140,
            objectFit: "cover",
            display: "block",
          }}
        />
        <span
          style={{
            position: "absolute",
            top: 6,
            left: 6,
            background: "#333",
            color: "#fff",
            padding: "2px 8px",
            borderRadius: 4,
            fontSize: 11,
          }}
        >
          {image.slot_type}
        </span>
        <button
          type="button"
          onClick={onDelete}
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            background: "#c00",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            padding: "4px 8px",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          Delete
        </button>
      </div>
      <div
        style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}
      >
        <button
          type="button"
          onClick={onSetAsIntro}
          style={{
            padding: "4px 8px",
            fontSize: 11,
            background: "#2a7",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Set as Intro
        </button>
        <button
          type="button"
          onClick={onSetAsOutro}
          style={{
            padding: "4px 8px",
            fontSize: 11,
            background: "#27a",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Set as Outro
        </button>
      </div>
      <label style={{ display: "block", marginBottom: 4, fontSize: 12 }}>
        Slot
      </label>
      <select
        value={image.slot_type}
        onChange={(e) =>
          onSlotChange(e.target.value as RestaurantImage["slot_type"])
        }
        style={{ width: "100%", marginBottom: 8, padding: "4px 8px" }}
      >
        {SLOT_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <div style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 12, marginBottom: 4, display: "block" }}>
          Tags
        </span>
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}
        >
          {tags.map((t) => (
            <span
              key={t}
              onClick={() => onRemoveTag(t)}
              style={{
                background: "#e0e0e0",
                padding: "2px 8px",
                borderRadius: 4,
                fontSize: 12,
                cursor: "pointer",
              }}
              title="Click to remove"
            >
              {t} ×
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
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
            style={{ flex: 1, padding: "4px 8px", fontSize: 12 }}
          />
          <button
            type="button"
            onClick={() => {
              onAddTag(newTag);
              setNewTag("");
            }}
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
      <section
        style={{ marginTop: 24, paddingTop: 24, borderTop: "1px solid #ccc" }}
      >
        <h2 style={{ margin: "0 0 12px 0", fontSize: 18 }}>Story template</h2>
        <p>Loading…</p>
      </section>
    );
  }

  return (
    <section
      style={{ marginTop: 24, paddingTop: 24, borderTop: "1px solid #ccc" }}
    >
      <h2 style={{ margin: "0 0 12px 0", fontSize: 18 }}>Story template</h2>
      {/* 3-slot visual layout: [Intro] → [Personalized pool] → [Outro + CTA + Save] */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 24,
          alignItems: "start",
          marginBottom: 24,
          maxWidth: 720,
        }}
      >
        {/* Left: Intro slot with thumbnail */}
        <div
          style={{
            border: "2px solid #ddd",
            borderRadius: 12,
            padding: 16,
            background: "#f9f9f9",
            minHeight: 180,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 8,
              color: "#333",
            }}
          >
            Intro image
          </div>
          {introImage ? (
            <img
              src={introImage.image_url}
              alt="Intro"
              style={{
                width: "100%",
                height: 120,
                objectFit: "cover",
                borderRadius: 8,
                display: "block",
                marginBottom: 8,
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: 120,
                background: "#e8e8e8",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#888",
                fontSize: 12,
                marginBottom: 8,
              }}
            >
              No intro selected
            </div>
          )}
          <select
            value={introId}
            onChange={(e) => setIntroId(e.target.value)}
            style={{ width: "100%", padding: "6px 8px", fontSize: 12 }}
          >
            <option value="">— Select intro —</option>
            {images.map((img) => (
              <option key={img.id} value={img.id}>
                {img.slot_type} – {img.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </div>

        {/* Center: Personalized pool count */}
        <div
          style={{
            border: "2px solid #ddd",
            borderRadius: 12,
            padding: 16,
            background: "#f9f9f9",
            minHeight: 180,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 8,
              color: "#333",
            }}
          >
            Personalized pool
          </div>
          <p style={{ margin: "0 0 16px 0", fontSize: 14, color: "#555" }}>
            {personalizedCount} image{personalizedCount !== 1 ? "s" : ""} in
            personalized pool
          </p>
          <div style={{ fontSize: 12, color: "#888" }}>
            Use &quot;Set as Intro&quot; / &quot;Set as Outro&quot; on image
            cards or the slot dropdown.
          </div>
        </div>

        {/* Right: Outro slot with thumbnail + CTA + Save */}
        <div
          style={{
            border: "2px solid #ddd",
            borderRadius: 12,
            padding: 16,
            background: "#f9f9f9",
            minHeight: 180,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 8,
              color: "#333",
            }}
          >
            Outro image
          </div>
          {outroImage ? (
            <img
              src={outroImage.image_url}
              alt="Outro"
              style={{
                width: "100%",
                height: 120,
                objectFit: "cover",
                borderRadius: 8,
                display: "block",
                marginBottom: 8,
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: 120,
                background: "#e8e8e8",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#888",
                fontSize: 12,
                marginBottom: 8,
              }}
            >
              No outro selected
            </div>
          )}
          <select
            value={outroId}
            onChange={(e) => setOutroId(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 8px",
              fontSize: 12,
              marginBottom: 12,
            }}
          >
            <option value="">— Select outro —</option>
            {images.map((img) => (
              <option key={img.id} value={img.id}>
                {img.slot_type} – {img.id.slice(0, 8)}
              </option>
            ))}
          </select>
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: "block", marginBottom: 4, fontSize: 12 }}>
              CTA text
            </label>
            <input
              type="text"
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              style={{ width: "100%", padding: "6px 8px" }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 4, fontSize: 12 }}>
              CTA URL (optional)
            </label>
            <input
              type="url"
              value={ctaUrl}
              onChange={(e) => setCtaUrl(e.target.value)}
              style={{ width: "100%", padding: "6px 8px" }}
            />
          </div>
          <button
            type="button"
            onClick={onSave}
            disabled={templateSaving || !introId || !outroId}
            style={{
              width: "100%",
              padding: "8px 12px",
              background: "#333",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor:
                templateSaving || !introId || !outroId
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {templateSaving ? "Saving…" : "Save Template"}
          </button>
        </div>
      </div>
    </section>
  );
}
