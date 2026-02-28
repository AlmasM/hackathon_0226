import type { Restaurant } from "../types";

export interface RestaurantDetailBarProps {
  restaurant: Restaurant;
}

export default function RestaurantDetailBar({
  restaurant,
}: RestaurantDetailBarProps) {
  const cuisineLabel =
    restaurant.cuisine_type?.length > 0
      ? restaurant.cuisine_type.join(" • ")
      : "";

  return (
    <div className="restaurant-detail-bar" aria-label="Restaurant info">
      <span className="restaurant-detail-bar__name">{restaurant.name}</span>
      <span className="restaurant-detail-bar__meta">
        ⭐ {restaurant.rating.toFixed(1)}
        {cuisineLabel && ` · ${cuisineLabel}`}
      </span>
    </div>
  );
}
