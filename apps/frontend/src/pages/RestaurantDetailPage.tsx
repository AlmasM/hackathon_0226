import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Restaurant, RestaurantImage } from "../types";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ??
  import.meta.env.VITE_API_URL ??
  "http://localhost:8000";

type RestaurantWithImages = Restaurant & { images?: RestaurantImage[] };

export default function RestaurantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<RestaurantWithImages | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/api/restaurants/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Restaurant not found");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setRestaurant(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

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

  if (error || !restaurant) {
    return (
      <div className="restaurant-detail-page restaurant-detail-page--error">
        <button
          type="button"
          className="restaurant-detail-page__back-btn"
          onClick={() => navigate("/")}
        >
          ← Back to map
        </button>
        <p className="restaurant-detail-page__error-text">{error ?? "Restaurant not found"}</p>
      </div>
    );
  }

  const images = restaurant.images ?? [];
  const sortedImages = [...images].sort((a, b) => a.display_order - b.display_order);
  const heroUrl = sortedImages[0]?.image_url ?? null;

  return (
    <div className="restaurant-detail-page">
      <button
        type="button"
        className="restaurant-detail-page__back-btn"
        onClick={() => navigate("/")}
        aria-label="Back to map"
      >
        ← Back
      </button>

      <div className="restaurant-detail-page__hero">
        {heroUrl ? (
          <img src={heroUrl} alt="" className="restaurant-detail-page__hero-img" />
        ) : (
          <div className="restaurant-detail-page__hero-placeholder" />
        )}
        <div className="restaurant-detail-page__hero-overlay" />
      </div>

      <div className="restaurant-detail-page__content">
        <h1 className="restaurant-detail-page__name">{restaurant.name}</h1>
        <div className="restaurant-detail-page__rating">
          ⭐ {restaurant.rating.toFixed(1)}
        </div>
        {restaurant.address && (
          <p className="restaurant-detail-page__address">{restaurant.address}</p>
        )}
        {restaurant.cuisine_type?.length > 0 && (
          <div className="restaurant-detail-page__cuisine">
            {restaurant.cuisine_type.map((c) => (
              <span key={c} className="restaurant-detail-page__pill">
                {c.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        )}

        <div className="restaurant-detail-page__links">
          {restaurant.phone && (
            <a
              href={`tel:${restaurant.phone.replace(/\D/g, "")}`}
              className="restaurant-detail-page__link"
            >
              📞 {restaurant.phone}
            </a>
          )}
          {restaurant.website && (
            <a
              href={restaurant.website}
              target="_blank"
              rel="noopener noreferrer"
              className="restaurant-detail-page__link"
            >
              🌐 Website
            </a>
          )}
        </div>

        {sortedImages.length > 0 && (
          <section className="restaurant-detail-page__photos" aria-label="Photos">
            <h2 className="restaurant-detail-page__section-title">Photos</h2>
            <div className="restaurant-detail-page__photo-grid">
              {sortedImages.map((img) => (
                <div key={img.id} className="restaurant-detail-page__photo-wrap">
                  <img
                    src={img.image_url}
                    alt=""
                    className="restaurant-detail-page__photo"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="restaurant-detail-page__reviews" aria-label="Reviews">
          <h2 className="restaurant-detail-page__section-title">Reviews</h2>
          <p className="restaurant-detail-page__reviews-placeholder">
            Reviews from Google can be shown here when integrated with Places API.
          </p>
        </section>

        <div className="restaurant-detail-page__actions">
          <button
            type="button"
            className="restaurant-detail-page__watch-story"
            onClick={() => navigate(`/restaurant/${id}/story`)}
          >
            Watch Story
          </button>
        </div>
      </div>
    </div>
  );
}
