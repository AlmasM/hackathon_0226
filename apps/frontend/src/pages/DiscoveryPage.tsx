import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Map, Marker } from "@vis.gl/react-google-maps";
import type { Restaurant, RestaurantWithImages } from "../types";
import RestaurantCard from "../components/RestaurantCard";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

// Fallback center when no restaurants (e.g. SF)
const DEFAULT_CENTER = { lat: 37.7749, lng: -122.4194 };

function centerFromRestaurants(restaurants: Restaurant[]): {
  lat: number;
  lng: number;
} {
  if (!restaurants.length) return DEFAULT_CENTER;
  const sum = restaurants.reduce(
    (acc, r) => ({ lat: acc.lat + r.lat, lng: acc.lng + r.lng }),
    { lat: 0, lng: 0 },
  );
  return {
    lat: sum.lat / restaurants.length,
    lng: sum.lng / restaurants.length,
  };
}

export default function DiscoveryPage() {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<RestaurantWithImages[]>([]);

  const mapCenter = useMemo(
    () => centerFromRestaurants(restaurants),
    [restaurants],
  );

  function firstImageUrl(r: RestaurantWithImages): string | null {
    const imgs = r.restaurant_images;
    if (!imgs?.length) return null;
    const sorted = [...imgs].sort((a, b) => a.display_order - b.display_order);
    return sorted[0].image_url ?? null;
  }

  useEffect(() => {
    async function fetchRestaurants() {
      try {
        const res = await fetch(`${API_BASE}/api/restaurants`);
        if (res.ok) {
          const data = await res.json();
          setRestaurants(Array.isArray(data) ? data : (data.restaurants ?? []));
        }
      } catch {
        setRestaurants([]);
      }
    }
    fetchRestaurants();
  }, []);

  return (
    <div className="discovery-page">
      <section className="discovery-map-container" aria-label="Discovery Map">
        <Map
          defaultCenter={mapCenter}
          defaultZoom={13}
          gestureHandling="greedy"
          disableDefaultUI={false}
        >
          {restaurants.map((restaurant) => (
            <Marker
              key={restaurant.id}
              position={{ lat: restaurant.lat, lng: restaurant.lng }}
              onClick={() => navigate(`/restaurant/${restaurant.id}`)}
              title={restaurant.name}
            />
          ))}
        </Map>
      </section>
      <section
        className="discovery-cards-container"
        aria-label="Restaurant Cards"
      >
        <ul className="discovery-cards-list">
          {restaurants.map((restaurant) => (
            <li key={restaurant.id}>
              <RestaurantCard
                restaurant={restaurant}
                thumbnailUrl={firstImageUrl(restaurant)}
                onClick={() => navigate(`/restaurant/${restaurant.id}`)}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
