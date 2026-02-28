import { useCallback, useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Map, Marker, useMap } from "@vis.gl/react-google-maps";
import { useHasMapsKey, useMapsKeyContext } from "../contexts/MapsKeyContext";
import type { Restaurant, RestaurantListItem } from "../types";
import type { PlaceReview } from "../types";
import RestaurantCard from "../components/RestaurantCard";
import DiscoverySearch from "../components/DiscoverySearch";

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

/** Fits the map to show all restaurant markers when they load or when returning to discovery. */
function FitMapToPins({
  restaurants,
}: {
  restaurants: RestaurantListItem[];
}) {
  const map = useMap();
  const points = useMemo(
    () =>
      restaurants.filter(
        (r) =>
          typeof r.lat === "number" &&
          typeof r.lng === "number" &&
          Number.isFinite(r.lat) &&
          Number.isFinite(r.lng),
      ) as Array<{ lat: number; lng: number }>,
    [restaurants],
  );

  useEffect(() => {
    if (!map || points.length < 2) return;
    const bounds = new google.maps.LatLngBounds();
    points.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
  }, [map, points]);

  return null;
}

export default function DiscoveryPage() {
  const navigate = useNavigate();
  const hasMapsKey = useHasMapsKey();
  const { mapAuthFailed } = useMapsKeyContext();
  const [restaurants, setRestaurants] = useState<RestaurantListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewsById, setReviewsById] = useState<
    Record<string, { reviewCount: number; reviews: PlaceReview[] }>
  >({});

  const mapCenter = useMemo(
    () => centerFromRestaurants(restaurants),
    [restaurants],
  );

  const handlePlaceSelect = useCallback(
    (placeId: string) => {
      navigate(`/place/${encodeURIComponent(placeId)}`);
    },
    [navigate],
  );

  function firstImageUrl(r: RestaurantListItem): string | null {
    return r.thumbnail_url ?? null;
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    async function fetchRestaurants() {
      try {
        const res = await fetch(`${API_BASE}/api/restaurants`);
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setRestaurants(Array.isArray(data) ? data : (data.restaurants ?? []));
        } else {
          setRestaurants([]);
        }
      } catch {
        if (!cancelled) setRestaurants([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchRestaurants();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!restaurants.length) return;
    let cancelled = false;
    const acc: Record<string, { reviewCount: number; reviews: PlaceReview[] }> =
      {};
    Promise.all(
      restaurants.map(async (r) => {
        try {
          const res = await fetch(
            `${API_BASE}/api/restaurants/${r.id}/google-reviews`,
          );
          if (!res.ok || cancelled) return;
          const data = await res.json();
          if (cancelled) return;
          acc[r.id] = {
            reviewCount: data.reviewCount ?? 0,
            reviews: Array.isArray(data.reviews) ? data.reviews : [],
          };
        } catch {
          acc[r.id] = { reviewCount: 0, reviews: [] };
        }
      }),
    ).then(() => {
      if (!cancelled) setReviewsById((prev) => ({ ...prev, ...acc }));
    });
    return () => {
      cancelled = true;
    };
  }, [restaurants]);

  return (
    <div className="discovery-page">
      <section className="discovery-map-container" aria-label="Discovery Map">
        {hasMapsKey ? (
          <Map
            key="discovery-map"
            defaultCenter={mapCenter}
            defaultZoom={13}
            gestureHandling="greedy"
            disableDefaultUI={false}
            style={{ width: "100%", height: "100%", minHeight: "200px" }}
          >
            <FitMapToPins restaurants={restaurants} />
            {restaurants
              .filter(
                (r) =>
                  typeof r.lat === "number" &&
                  typeof r.lng === "number" &&
                  Number.isFinite(r.lat) &&
                  Number.isFinite(r.lng),
              )
              .map((restaurant) => (
                <Marker
                  key={restaurant.id}
                  position={{ lat: restaurant.lat, lng: restaurant.lng }}
                  onClick={() => navigate(`/restaurant/${restaurant.id}`)}
                  title={restaurant.name}
                />
              ))}
          </Map>
        ) : (
          <div className="discovery-map-placeholder">
            <div className="discovery-map-placeholder__inner">
              {mapAuthFailed ? (
                <p className="discovery-map-placeholder__text">
                  Map couldn’t load. Check your API key and console for details.
                </p>
              ) : (
                <p className="discovery-map-placeholder__text">
                  Map and search need a valid Google Maps API key. Add it in your
                  environment to explore places here.
                </p>
              )}
            </div>
          </div>
        )}
        {hasMapsKey && (
          <div className="discovery-search-float" aria-label="Search places">
            <div className="discovery-search-float__inner">
              <DiscoverySearch onPlaceSelect={handlePlaceSelect} />
            </div>
          </div>
        )}
      </section>
      <a
        href="/owner"
        className="discovery-fab"
        onClick={(e) => {
          e.preventDefault();
          navigate("/owner");
        }}
        aria-label="Owner management"
      >
        <span className="discovery-fab__label">Owner</span>
      </a>
      <section
        className="discovery-cards-container"
        aria-label="Restaurant Cards"
        aria-busy={loading}
      >
        {loading ? (
          <p className="discovery-cards-loading">Loading places…</p>
        ) : restaurants.length === 0 ? (
          <div className="discovery-cards-empty">
            <p className="discovery-cards-empty__text">No places to show yet.</p>
            <p className="discovery-cards-empty__hint">
              {hasMapsKey ? "Try searching above or add a place as an owner." : "Add a Maps API key to search, or go to Owner management to add a place."}
            </p>
          </div>
        ) : (
          <ul className="discovery-cards-list">
            {[...restaurants]
              .sort((a, b) =>
                (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
              )
              .map((restaurant) => {
              const reviews = reviewsById[restaurant.id];
              return (
                <li key={restaurant.id}>
                  <RestaurantCard
                    restaurant={restaurant}
                    thumbnailUrl={firstImageUrl(restaurant)}
                    reviewCount={reviews?.reviewCount ?? null}
                    firstReview={reviews?.reviews?.[0] ?? null}
                    onClick={() => navigate(`/restaurant/${restaurant.id}`)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
