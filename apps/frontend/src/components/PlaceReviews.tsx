import type { PlaceReview } from "../types";

export interface PlaceReviewsProps {
  reviewCount: number;
  reviews: PlaceReview[];
  loading?: boolean;
  /** Section title (e.g. "Reviews"). Default: "Reviews" */
  title?: string;
}

export default function PlaceReviews({
  reviewCount,
  reviews,
  loading = false,
  title = "Reviews",
}: PlaceReviewsProps) {
  if (loading) {
    return (
      <section className="place-reviews" aria-label={title}>
        <h2 className="restaurant-detail-page__section-title">{title}</h2>
        <p className="restaurant-detail-page__reviews-placeholder">Loading reviews…</p>
      </section>
    );
  }

  if (reviewCount === 0 && (!reviews || reviews.length === 0)) {
    return (
      <section className="place-reviews" aria-label={title}>
        <h2 className="restaurant-detail-page__section-title">{title}</h2>
        <p className="restaurant-detail-page__reviews-placeholder">No reviews yet.</p>
      </section>
    );
  }

  const displayReviews = reviews?.slice(0, 5) ?? [];
  const moreCount = Math.max(0, reviewCount - displayReviews.length);

  return (
    <section className="place-reviews" aria-label={title}>
      <h2 className="restaurant-detail-page__section-title">
        {title}
        {reviewCount > 0 && (
          <span className="place-reviews__count">
            {" "}({reviewCount} review{reviewCount !== 1 ? "s" : ""})
          </span>
        )}
      </h2>
      <ul className="place-reviews__list">
        {displayReviews.map((review, i) => (
          <li key={i} className="place-reviews__item">
            <div className="place-reviews__item-header">
              <span className="place-reviews__author">{review.author}</span>
              {review.rating != null && (
                <span className="place-reviews__rating">⭐ {review.rating}</span>
              )}
              {review.relativeTime && (
                <span className="place-reviews__time">{review.relativeTime}</span>
              )}
            </div>
            {review.text && <p className="place-reviews__text">{review.text}</p>}
          </li>
        ))}
      </ul>
      {moreCount > 0 && (
        <p className="place-reviews__more">{moreCount} more review{moreCount !== 1 ? "s" : ""}</p>
      )}
    </section>
  );
}
