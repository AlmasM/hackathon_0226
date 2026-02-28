import type { Restaurant } from "../types";

export interface RestaurantCardProps {
  restaurant: Restaurant;
  thumbnailUrl?: string | null;
  onClick: () => void;
}

export default function RestaurantCard({
  restaurant,
  thumbnailUrl,
  onClick,
}: RestaurantCardProps) {
  const firstImageUrl = thumbnailUrl ?? null;

  return (
    <button
      type="button"
      className="restaurant-card"
      onClick={onClick}
      aria-label={`View story for ${restaurant.name}`}
    >
      {firstImageUrl && (
        <div className="restaurant-card__thumbnail">
          <img src={firstImageUrl} alt="" />
        </div>
      )}
      <div className="restaurant-card__body">
        <h3 className="restaurant-card__name">{restaurant.name}</h3>
        <p className="restaurant-card__rating">
          ⭐ {restaurant.rating.toFixed(1)}
        </p>
        {restaurant.cuisine_type?.length > 0 && (
          <div className="restaurant-card__cuisine">
            {restaurant.cuisine_type.map((c) => (
              <span key={c} className="restaurant-card__pill">
                {c}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
