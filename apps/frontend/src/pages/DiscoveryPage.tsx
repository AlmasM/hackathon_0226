import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Map, Marker } from "@vis.gl/react-google-maps";
import { useHasMapsKey, useMapsKeyContext } from "../contexts/MapsKeyContext";
import type { Restaurant, RestaurantWithImages } from "../types";
import RestaurantCard from "../components/RestaurantCard";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ??
  import.meta.env.VITE_API_URL ??
  "http://localhost:8000";

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
  const hasMapsKey = useHasMapsKey();
  const { mapAuthFailed } = useMapsKeyContext();
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
        {hasMapsKey ? (
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
        ) : (
          <div
            className="discovery-map-placeholder"
            style={{
              height: "100%",
              minHeight: 280,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#e8e8e8",
              color: "#555",
              padding: 24,
              textAlign: "center",
              borderRadius: 8,
            }}
          >
            <div>
              {mapAuthFailed ? (
                <p style={{ margin: 0 }}>
                  Map authentication failed. Open the browser console (F12 →
                  Console) and look for <strong>[Maps] AuthFailure</strong> for
                  a checklist to fix the API key.
                </p>
              ) : (
                <>
                  <p style={{ margin: "0 0 8px 0" }}>
                    Set <code>VITE_GOOGLE_MAPS_API_KEY</code> in{" "}
                    <code>apps/frontend/.env</code> and enable{" "}
                    <strong>Maps JavaScript API</strong> in Google Cloud Console
                    to see the map.
                  </p>
                  <p style={{ margin: 0, fontSize: 14, color: "#666" }}>
                    If you see <strong>AuthFailure</strong> with a key set:
                    enable Maps JavaScript API, add{" "}
                    <code>http://localhost:5173</code> to allowed referrers if
                    restricted, and ensure billing is enabled for the project.
                  </p>
                </>
              )}
            </div>
          </div>
        )}
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
