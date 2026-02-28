import { useEffect, useRef, useState } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";

const SUGGESTIONS = [
  "Italian restaurant",
  "Coffee shop",
  "Sushi bar",
  "Wine bar",
  "Brunch spot",
];

interface DiscoverySearchProps {
  onPlaceSelect: (placeId: string) => void;
}

export default function DiscoverySearch({ onPlaceSelect }: DiscoverySearchProps) {
  const places = useMapsLibrary("places");
  const inputRef = useRef<HTMLInputElement>(null);
  const onSelectRef = useRef(onPlaceSelect);
  onSelectRef.current = onPlaceSelect;
  const [isFocused, setIsFocused] = useState(false);
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!places || !inputRef.current) return;

    const autocomplete = new places.Autocomplete(inputRef.current, {
      types: ["establishment", "geocode"],
    });

    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const placeId = place.place_id;
      if (placeId) onSelectRef.current(placeId);
    });

    return () => {
      if (listener && typeof google !== "undefined" && google.maps?.event) {
        google.maps.event.removeListener(listener);
      }
    };
  }, [places]);

  const showSuggestions = isFocused && !value.trim();

  return (
    <div className="discovery-search">
      {/* Floating suggestions panel – appears above input on focus when empty */}
      {showSuggestions && (
        <div
          className="discovery-search__suggestions"
          role="listbox"
          aria-label="Search suggestions"
        >
          <div className="discovery-search__suggestions-inner">
            <span className="discovery-search__suggestions-label">
              Try searching for
            </span>
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="discovery-search__suggestion-item"
                role="option"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setValue(suggestion);
                  if (inputRef.current) {
                    inputRef.current.value = suggestion;
                    inputRef.current.focus();
                  }
                }}
              >
                <span className="discovery-search__suggestion-dot" aria-hidden />
                <span>{suggestion}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="discovery-search__input-wrap">
        <input
          id="discovery-search-input"
          ref={inputRef}
          type="text"
          placeholder="Search for a restaurant or address..."
          className="discovery-search__input"
          autoComplete="off"
          aria-describedby="discovery-search-hint"
          aria-expanded={showSuggestions}
          aria-autocomplete="list"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
      <p id="discovery-search-hint" className="discovery-search__hint">
        Select a result to view the place or claim it as owner.
      </p>
    </div>
  );
}
