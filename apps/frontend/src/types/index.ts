export interface Restaurant {
  id: string;
  google_place_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  cuisine_type: string[];
  phone?: string;
  website?: string;
  /** True if the restaurant has an owner story template (from API). */
  has_story?: boolean;
  /** Google Place photos (loaded by default, no import). */
  photos?: PlacePhoto[];
}

/** Restaurant as returned by API when images are included inline */
export interface RestaurantWithImages extends Restaurant {
  restaurant_images?: RestaurantImage[];
}

/** Restaurant as returned by list API with thumbnail from Google/owner images */
export interface RestaurantListItem extends Restaurant {
  thumbnail_url?: string | null;
}

/** Google-sourced photo (no import step). */
export interface PlacePhoto {
  image_url: string;
}

/** Unclaimed place from GET /api/place-by-google-id (Google place only). Enriched with rating, reviews, and photos when available. */
export interface PlaceFromGoogle {
  google_place_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  thumbnail_url?: string | null;
  rating?: number;
  reviewCount?: number;
  reviews?: PlaceReview[];
  /** Google Place photos (loaded by default, no import). */
  photos?: PlacePhoto[];
}

/** Response from GET /api/place-by-google-id */
export type PlaceByGoogleIdResponse =
  | { claimed: true; restaurant: Restaurant & { images?: RestaurantImage[] } }
  | { claimed: false; place: PlaceFromGoogle };

/** Google Place review snippet for cards */
export interface PlaceReview {
  author: string;
  text: string;
  rating?: number;
  relativeTime?: string;
}

export interface RestaurantImage {
  id: string;
  restaurant_id: string;
  image_url: string;
  source: "google" | "owner_upload";
  tags: string[];
  slot_type: "intro" | "personalized" | "outro";
  display_order: number;
}

export interface StoryTemplate {
  id: string;
  restaurant_id: string;
  intro_image_id: string;
  outro_image_id: string;
  cta_text: string;
  cta_url?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  avatar_url?: string;
  persona_type: "vegan" | "carnivore" | "cocktail_lover";
  preferences: {
    tags: string[];
    avoid_tags: string[];
  };
}

export type KenBurnsAnimation =
  | "ken_burns_zoom_in"
  | "ken_burns_zoom_out"
  | "ken_burns_pan_left"
  | "ken_burns_pan_right";

export interface StorySegment {
  type: "intro" | "personalized" | "outro";
  image: RestaurantImage;
  duration_ms: number;
  animation: KenBurnsAnimation;
  cta?: {
    text: string;
    url: string;
  };
}

export interface CompiledStory {
  restaurant: Restaurant;
  segments: StorySegment[];
}
