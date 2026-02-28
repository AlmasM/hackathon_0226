import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import StoryLoadingSkeleton from "../components/StoryLoadingSkeleton";
import StoryPlayer from "../components/StoryPlayer";
import { useUserProfile } from "../contexts/UserProfileContext";
import { useCompiledStory } from "../hooks/useCompiledStory";
import { usePersonalizedStory } from "../hooks/usePersonalizedStory";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ??
  import.meta.env.VITE_API_URL ??
  "http://localhost:8000";

function preloadSegmentImages(
  segments: { image: { image_url: string } }[],
): Promise<void> {
  return Promise.all(
    segments.map(
      (s) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = s.image.image_url;
        }),
    ),
  ).then(() => {});
}

export default function RestaurantStoryPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { activeProfile } = useUserProfile();
  const isPreview = searchParams.get("preview") === "true";
  const personalized = usePersonalizedStory(id ?? "", activeProfile?.id ?? "");
  const fallback = useCompiledStory(id ?? "");
  const [offlineBannerShown, setOfflineBannerShown] = useState(false);
  const [imagesReady, setImagesReady] = useState(false);
  const [previewBannerDismissed, setPreviewBannerDismissed] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    if (!toastVisible) return;
    const t = setTimeout(() => setToastVisible(false), 2500);
    return () => clearTimeout(t);
  }, [toastVisible]);

  function handleCtaClick(cta: { text: string; url: string }) {
    console.log("CTA_CLICK", {
      restaurant_id: story?.restaurant.id,
      persona_type: activeProfile?.persona_type,
      cta_text: cta.text,
      timestamp: new Date().toISOString(),
    });
    setToastVisible(true);
  }

  // Use API story when available; otherwise fall back to client-side compilation
  const story =
    personalized.story ?? (personalized.error ? fallback.story : null);
  // Show skeleton when personalized is loading, or when we have no story yet and fallback is still fetching (e.g. deep-link before profiles load)
  const loading = personalized.loading || (!story && fallback.loading);
  const error = personalized.error && !fallback.story ? fallback.error : null;

  useEffect(() => {
    if (personalized.error && fallback.story && !offlineBannerShown) {
      console.warn("Using offline story compilation.");
      setOfflineBannerShown(true);
    }
  }, [personalized.error, fallback.story, offlineBannerShown]);

  useEffect(() => {
    if (!story || story.segments.length === 0) {
      setImagesReady(false);
      return;
    }
    setImagesReady(false);
    preloadSegmentImages(story.segments).then(() => setImagesReady(true));
  }, [story]);

  if (loading) {
    return <StoryLoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="story-player story-player--error">
        <div className="story-player__backdrop" />
        <p className="story-player__error-text">{error}</p>
        <button
          type="button"
          className="story-player__back-btn"
          onClick={() => navigate("/")}
        >
          Back to map
        </button>
      </div>
    );
  }

  if (!story || story.segments.length === 0) {
    return (
      <div className="story-player story-player--empty">
        <div className="story-player__backdrop" />
        <p className="story-player__empty-text">
          {story?.restaurant.name ?? "This restaurant"} — No story available yet
        </p>
        <button
          type="button"
          className="story-player__back-btn"
          onClick={() => navigate("/")}
        >
          Back to map
        </button>
      </div>
    );
  }

  if (!imagesReady) {
    return (
      <div
        className="story-player story-player--loading"
        role="status"
        aria-busy
      >
        <div className="story-player__backdrop" />
        <p className="story-player__loading-text">Loading images…</p>
      </div>
    );
  }

  return (
    <>
      {toastVisible && (
        <div
          role="status"
          style={{
            position: "fixed",
            bottom: 80,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100,
            background: "rgba(0,0,0,0.9)",
            color: "#fff",
            padding: "12px 24px",
            borderRadius: 12,
            fontSize: 16,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          Booking requested! 🎉
        </div>
      )}
      {isPreview && !previewBannerDismissed ? (
        <div className="story-page-with-preview">
          <div className="story-preview-banner" role="banner">
            <span className="story-preview-banner__text">
              Owner Preview Mode — switch personas to see different versions.
            </span>
            <button
              type="button"
              onClick={() => setPreviewBannerDismissed(true)}
              className="story-preview-banner__dismiss"
              aria-label="Dismiss"
            >
              Dismiss
            </button>
          </div>
          <div className="story-page-with-preview__player">
            <StoryPlayer
              segments={story.segments}
              restaurant={story.restaurant}
              onClose={() => {
                if (isPreview) navigate(-1);
                else navigate(id ? `/restaurant/${id}` : "/");
              }}
              onCtaClick={handleCtaClick}
              personaLabel={activeProfile?.name}
              apiBaseUrl={API_BASE}
            />
          </div>
        </div>
      ) : (
        <StoryPlayer
          segments={story.segments}
          restaurant={story.restaurant}
          onClose={() => {
            if (isPreview) navigate(-1);
            else navigate(id ? `/restaurant/${id}` : "/");
          }}
          onCtaClick={handleCtaClick}
          personaLabel={activeProfile?.name}
          apiBaseUrl={API_BASE}
        />
      )}
    </>
  );
}
