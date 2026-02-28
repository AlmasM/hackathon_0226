import { useUserProfile } from "../contexts/UserProfileContext";
import type { UserProfile } from "../types";

const PERSONA_LABELS: Record<
  UserProfile["persona_type"],
  { emoji: string; label: string }
> = {
  vegan: { emoji: "🥬", label: "Vegan" },
  carnivore: { emoji: "🥩", label: "Carnivore" },
  cocktail_lover: { emoji: "🍸", label: "Cocktail" },
};

export default function PersonaSwitcher() {
  const { activeProfile, setActiveProfile, profiles, loading } =
    useUserProfile();

  if (loading || profiles.length === 0) return null;

  return (
    <div className="persona-switcher" role="group" aria-label="Switch persona">
      {profiles.map((profile) => {
        const { emoji, label } = PERSONA_LABELS[profile.persona_type];
        const isActive = activeProfile?.id === profile.id;
        return (
          <button
            key={profile.id}
            type="button"
            className={`persona-switcher__pill ${isActive ? "persona-switcher__pill--active" : ""}`}
            onClick={() => setActiveProfile(profile)}
            aria-pressed={isActive}
            aria-label={`${label} persona`}
          >
            <span className="persona-switcher__emoji">{emoji}</span>
            <span className="persona-switcher__label">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
