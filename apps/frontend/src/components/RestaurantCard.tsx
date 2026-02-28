import type { Restaurant, PlaceReview } from "../types";

export interface RestaurantCardProps {
  restaurant: Restaurant;
  /** Thumbnail from Google/owner (from list API thumbnail_url or first image). */
  thumbnailUrl?: string | null;
  /** Number of reviews from Google (optional). */
  reviewCount?: number | null;
  /** First review from Google for snippet (optional). */
  firstReview?: PlaceReview | null;
  onClick: () => void;
}

export default function RestaurantCard({
  restaurant,
  thumbnailUrl,
  reviewCount,
  firstReview,
  onClick,
}: RestaurantCardProps) {
  const thumb = thumbnailUrl ?? null;
  const snippet = firstReview?.text
    ? firstReview.text.slice(0, 80) + (firstReview.text.length > 80 ? "…" : "")
    : null;

  return (
    <button
      type="button"
      className="restaurant-card"
      onClick={onClick}
      aria-label={`View ${restaurant.name}`}
    >
      {thumb && (
        <div className="restaurant-card__thumbnail">
          <img src={thumb} alt="" />
        </div>
      )}
      <div className="restaurant-card__body">
        <h3 className="restaurant-card__name">{restaurant.name}</h3>
        <p className="restaurant-card__rating">
          ⭐ {restaurant.rating.toFixed(1)}
          {reviewCount != null && reviewCount > 0 && (
            <span className="restaurant-card__review-count">
              {" "}
              ({reviewCount} review{reviewCount !== 1 ? "s" : ""})
            </span>
          )}
        </p>
        {snippet && (
          <p className="restaurant-card__review-snippet">{snippet}</p>
        )}
        {restaurant.cuisine_type?.length > 0 && (
          <div className="restaurant-card__cuisine">
            {restaurant.cuisine_type.map((c) => (
              <span key={c} className="restaurant-card__pill">
                {c.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
