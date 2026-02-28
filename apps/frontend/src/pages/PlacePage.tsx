import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { PlaceByGoogleIdResponse, PlaceFromGoogle } from "../types";
import PlaceReviews from "../components/PlaceReviews";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ??
  import.meta.env.VITE_API_URL ??
  "http://localhost:8000";

export default function PlacePage() {
  const { placeId } = useParams<{ placeId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<PlaceByGoogleIdResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!placeId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const encoded = encodeURIComponent(placeId);
    fetch(`${API_BASE}/api/place-by-google-id/${encoded}`)
      .then(async (res) => {
        const text = await res.text();
        if (!res.ok) {
          let message = `HTTP ${res.status}`;
          try {
            const body = JSON.parse(text);
            message = body?.error ?? body?.message ?? message;
          } catch {
            if (text.length < 80) message = `${message}: ${text}`;
          }
          throw new Error(message);
        }
        return JSON.parse(text) as PlaceByGoogleIdResponse;
      })
      .then((body: PlaceByGoogleIdResponse) => {
        if (!cancelled) setData(body);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [placeId]);

  async function handleClaim() {
    if (!placeId || claiming) return;
    setClaiming(true);
    try {
      const res = await fetch(`${API_BASE}/api/restaurants/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place_id: placeId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      if (body.id) navigate(`/owner/${body.id}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Claim failed");
    } finally {
      setClaiming(false);
    }
  }

  if (loading) {
    return (
      <div className="restaurant-detail-page restaurant-detail-page--loading">
        <button
          type="button"
          className="restaurant-detail-page__back-btn"
          onClick={() => navigate("/")}
        >
          ← Back
        </button>
        <p className="restaurant-detail-page__loading-text">Loading…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="restaurant-detail-page restaurant-detail-page--error">
        <button
          type="button"
          className="restaurant-detail-page__back-btn"
          onClick={() => navigate("/")}
        >
          ← Back to map
        </button>
        <p className="restaurant-detail-page__error-text">{error ?? "Failed to load place"}</p>
      </div>
    );
  }

  if (data.claimed && data.restaurant) {
    navigate(`/restaurant/${data.restaurant.id}`, { replace: true });
    return null;
  }

  if (!("place" in data)) return null;
  const place: PlaceFromGoogle = data.place;
  return (
    <div className="restaurant-detail-page place-page--unclaimed">
      <button
        type="button"
        className="restaurant-detail-page__back-btn"
        onClick={() => navigate("/")}
        aria-label="Back to map"
      >
        ← Back
      </button>

      <div className="restaurant-detail-page__hero">
        {(place.photos?.[0]?.image_url ?? place.thumbnail_url) ? (
          <img
            src={place.photos?.[0]?.image_url ?? place.thumbnail_url ?? ""}
            alt=""
            className="restaurant-detail-page__hero-img"
          />
        ) : (
          <div className="restaurant-detail-page__hero-placeholder" />
        )}
        <div className="restaurant-detail-page__hero-overlay" />
      </div>

      <div className="restaurant-detail-page__content">
        <h1 className="restaurant-detail-page__name">{place.name}</h1>
        {place.rating != null && place.rating > 0 && (
          <div className="restaurant-detail-page__rating">
            ⭐ {place.rating.toFixed(1)}
          </div>
        )}
        {place.address && (
          <p className="restaurant-detail-page__address">{place.address}</p>
        )}

        {(place.photos?.length ?? 0) > 0 && (
          <section className="restaurant-detail-page__photos" aria-label="Photos">
            <h2 className="restaurant-detail-page__section-title">Photos</h2>
            <div className="restaurant-detail-page__photo-grid">
              {place.photos?.map((photo, i) => (
                <div key={i} className="restaurant-detail-page__photo-wrap">
                  <img
                    src={photo.image_url}
                    alt=""
                    className="restaurant-detail-page__photo"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        <PlaceReviews
          reviewCount={place.reviewCount ?? 0}
          reviews={place.reviews ?? []}
        />

        <div className="place-page__placeholder" aria-live="polite">
          <p className="place-page__placeholder-text">
            Story from the owner will appear here. Be the first to add your story.
          </p>
        </div>

        <div className="restaurant-detail-page__actions">
          <button
            type="button"
            className="restaurant-detail-page__watch-story"
            onClick={handleClaim}
            disabled={claiming}
          >
            {claiming ? "Claiming…" : "Claim this place"}
          </button>
        </div>
      </div>
    </div>
  );
}
