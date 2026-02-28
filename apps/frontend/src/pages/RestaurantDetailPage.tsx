import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { PlaceReview, Restaurant, RestaurantImage } from "../types";
import PlaceReviews from "../components/PlaceReviews";

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
  const [reviews, setReviews] = useState<{ reviewCount: number; reviews: PlaceReview[] } | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);

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

  useEffect(() => {
    if (!id || !restaurant) return;
    let cancelled = false;
    setReviewsLoading(true);
    setReviews(null);
    fetch(`${API_BASE}/api/restaurants/${id}/google-reviews`)
      .then((res) => {
        if (!res.ok) return { reviewCount: 0, reviews: [] };
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setReviews({
            reviewCount: data.reviewCount ?? 0,
            reviews: data.reviews ?? [],
          });
        }
      })
      .catch(() => {
        if (!cancelled) setReviews({ reviewCount: 0, reviews: [] });
      })
      .finally(() => {
        if (!cancelled) setReviewsLoading(false);
      });
    return () => { cancelled = true; };
  }, [id, restaurant]);

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
  const googlePhotos = restaurant.photos ?? [];
  const heroUrl = sortedImages[0]?.image_url ?? googlePhotos[0]?.image_url ?? null;
  const hasAnyPhotos = sortedImages.length > 0 || googlePhotos.length > 0;

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
        {restaurant.has_story && (
          <section className="restaurant-detail-page__story-first" aria-label="Owner's story">
            <p className="restaurant-detail-page__story-first-label">Owner&apos;s story</p>
            <button
              type="button"
              className="restaurant-detail-page__watch-story restaurant-detail-page__watch-story--primary"
              onClick={() => navigate(`/restaurant/${id}/story`)}
            >
              Watch story
            </button>
          </section>
        )}

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

        {hasAnyPhotos && (
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
              {googlePhotos.map((photo, i) => (
                <div key={`g-${i}`} className="restaurant-detail-page__photo-wrap">
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
          reviewCount={reviews?.reviewCount ?? 0}
          reviews={reviews?.reviews ?? []}
          loading={reviewsLoading}
        />

        <div className="restaurant-detail-page__actions">
          {restaurant.has_story && (
            <button
              type="button"
              className="restaurant-detail-page__watch-story"
              onClick={() => navigate(`/restaurant/${id}/story`)}
            >
              Watch Story
            </button>
          )}
          <a
            href={`/owner/${id}`}
            className="restaurant-detail-page__manage-link"
            onClick={(e) => {
              e.preventDefault();
              navigate(`/owner/${id}`);
            }}
          >
            Manage this place
          </a>
        </div>
      </div>
    </div>
  );
}
