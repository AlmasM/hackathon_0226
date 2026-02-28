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
}

/** Restaurant as returned by API when images are included inline */
export interface RestaurantWithImages extends Restaurant {
  restaurant_images?: RestaurantImage[];
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
