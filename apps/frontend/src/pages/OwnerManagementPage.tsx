import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { RestaurantListItem } from "../types";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ??
  import.meta.env.VITE_API_URL ??
  "http://localhost:8000";

export default function OwnerManagementPage() {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<RestaurantListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [placeId, setPlaceId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/restaurants`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setRestaurants(Array.isArray(data) ? data : data.restaurants ?? []);
      })
      .catch(() => {
        if (!cancelled) setRestaurants([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreateProfile(e: React.FormEvent) {
    e.preventDefault();
    const id = placeId.trim();
    if (!id || creating) return;
    setCreateError(null);
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/api/restaurants/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place_id: id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      if (data.id) {
        setPlaceId("");
        navigate(`/owner/${data.id}`, { replace: true });
      }
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="owner-management">
      <header className="owner-management__header">
        <h1 className="owner-management__title">Owner management</h1>
        <p className="owner-management__subtitle">
          All claimed places. Open one to manage it or create a new profile with a Google place ID.
        </p>
      </header>

      <section className="owner-management__create">
        <h2 className="owner-management__section-title">Create a profile</h2>
        <form onSubmit={handleCreateProfile} className="owner-management__form">
          <label htmlFor="owner-management-place-id" className="owner-management__label">
            Google place ID
          </label>
          <div className="owner-management__input-row">
            <input
              id="owner-management-place-id"
              type="text"
              value={placeId}
              onChange={(e) => setPlaceId(e.target.value)}
              placeholder="ChIJ..."
              className="owner-management__input"
              disabled={creating}
            />
            <button
              type="submit"
              disabled={creating || !placeId.trim()}
              className="owner-management__btn owner-management__btn--primary"
            >
              {creating ? "Creating…" : "Create a profile"}
            </button>
          </div>
          {createError && (
            <p className="owner-management__error" role="alert">
              {createError}
            </p>
          )}
        </form>
      </section>

      <section className="owner-management__list">
        <h2 className="owner-management__section-title">Claimed places</h2>
        {loading ? (
          <p className="owner-management__loading">Loading…</p>
        ) : restaurants.length === 0 ? (
          <p className="owner-management__empty">No claimed places yet. Create a profile above.</p>
        ) : (
          <ul className="owner-management__places">
            {restaurants.map((r) => (
              <li key={r.id} className="owner-management__place-card">
                <div className="owner-management__place-info">
                  <span className="owner-management__place-name">{r.name}</span>
                  {r.address && (
                    <span className="owner-management__place-address">{r.address}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/owner/${r.id}`)}
                  className="owner-management__btn owner-management__btn--secondary"
                >
                  Manage
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="owner-management__back">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="owner-management__back-btn"
        >
          ← Back to map
        </button>
      </div>
    </div>
  );
}
