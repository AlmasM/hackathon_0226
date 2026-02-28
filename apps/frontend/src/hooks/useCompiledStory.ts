import { useEffect, useMemo, useState } from "react";
import { useUserProfile } from "../contexts/UserProfileContext";
import type {
  CompiledStory,
  KenBurnsAnimation,
  RestaurantImage,
  RestaurantWithImages,
  StorySegment,
  StoryTemplate,
  UserProfile,
} from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";
const KEN_BURNS: KenBurnsAnimation[] = [
  "ken_burns_zoom_in",
  "ken_burns_zoom_out",
  "ken_burns_pan_left",
  "ken_burns_pan_right",
];

export function filterImagesByPersona(
  images: RestaurantImage[],
  profile: UserProfile,
): RestaurantImage[] {
  const { tags, avoid_tags } = profile.preferences;
  const includeSet = new Set(tags);
  const avoidSet = new Set(avoid_tags);
  const personalized = images.filter((i) => i.slot_type === "personalized");
  const scored = personalized
    .filter((img) => {
      const hasInclude = img.tags.some((t) => includeSet.has(t));
      const hasAvoid = img.tags.some((t) => avoidSet.has(t));
      return hasInclude && !hasAvoid;
    })
    .map((img) => ({
      img,
      score: img.tags.filter((t) => includeSet.has(t)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .map((s) => s.img);
  if (scored.length > 0) return scored.slice(0, 3);
  return personalized.slice(0, 3);
}

function compileStory(
  restaurant: RestaurantWithImages,
  template: StoryTemplate | null,
  activeProfile: UserProfile | null,
): StorySegment[] {
  const images = restaurant.restaurant_images ?? [];
  const byId = Object.fromEntries(images.map((i) => [i.id, i]));
  const introImage =
    (template && byId[template.intro_image_id]) ??
    images.find((i) => i.slot_type === "intro") ??
    images[0];
  const outroImage =
    (template && byId[template.outro_image_id]) ??
    images.find((i) => i.slot_type === "outro") ??
    images[images.length - 1] ??
    introImage;
  const personalized = activeProfile
    ? filterImagesByPersona(images, activeProfile)
    : images.filter((i) => i.slot_type === "personalized").slice(0, 3);
  const segments: StorySegment[] = [];
  let animIndex = 0;
  if (introImage) {
    segments.push({
      type: "intro",
      image: introImage,
      duration_ms: 4000,
      animation: KEN_BURNS[animIndex++ % 4],
    });
  }
  for (const img of personalized) {
    segments.push({
      type: "personalized",
      image: img,
      duration_ms: 4000,
      animation: KEN_BURNS[animIndex++ % 4],
    });
  }
  if (outroImage && outroImage.id !== introImage?.id) {
    segments.push({
      type: "outro",
      image: outroImage,
      duration_ms: 4000,
      animation: KEN_BURNS[animIndex % 4],
      cta: template
        ? { text: template.cta_text, url: template.cta_url ?? "" }
        : undefined,
    });
  } else if (outroImage && segments.length > 0) {
    const last = segments[segments.length - 1];
    last.cta = template
      ? { text: template.cta_text, url: template.cta_url ?? "" }
      : undefined;
  }
  return segments;
}

export interface UseCompiledStoryResult {
  story: CompiledStory | null;
  loading: boolean;
  error: string | null;
}

export function useCompiledStory(restaurantId: string): UseCompiledStoryResult {
  const { activeProfile } = useUserProfile();
  const [rawRestaurant, setRawRestaurant] =
    useState<RestaurantWithImages | null>(null);
  const [rawTemplate, setRawTemplate] = useState<StoryTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      setRawRestaurant(null);
      setRawTemplate(null);
      setError(null);
      return;
    }

    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [restaurantRes, templateRes] = await Promise.all([
          fetch(`${API_BASE}/api/restaurants/${restaurantId}`),
          fetch(`${API_BASE}/api/restaurants/${restaurantId}/story-template`),
        ]);

        if (cancelled) return;

        if (!restaurantRes.ok) {
          setError(
            restaurantRes.status === 404
              ? "Restaurant not found"
              : "Failed to load restaurant",
          );
          setRawRestaurant(null);
          setRawTemplate(null);
          return;
        }

        const restaurant: RestaurantWithImages = await restaurantRes.json();
        let storyTemplate: StoryTemplate | null = null;
        if (templateRes.ok) {
          storyTemplate = await templateRes.json();
        }

        setRawRestaurant(restaurant);
        setRawTemplate(storyTemplate);
        setError(null);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load story");
          setRawRestaurant(null);
          setRawTemplate(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  const story = useMemo((): CompiledStory | null => {
    if (!rawRestaurant) return null;
    const segments = compileStory(rawRestaurant, rawTemplate, activeProfile);
    if (segments.length === 0) return null;
    return { restaurant: rawRestaurant, segments };
  }, [rawRestaurant, rawTemplate, activeProfile]);

  return { story, loading, error };
}
