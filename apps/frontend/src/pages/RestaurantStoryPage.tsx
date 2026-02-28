import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import StoryLoadingSkeleton from "../components/StoryLoadingSkeleton";
import StoryPlayer from "../components/StoryPlayer";
import { useCompiledStory } from "../hooks/useCompiledStory";

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
  const navigate = useNavigate();
  const { story, loading, error } = useCompiledStory(id ?? "");
  const [imagesReady, setImagesReady] = useState(false);

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
    <StoryPlayer
      segments={story.segments}
      restaurant={story.restaurant}
      onClose={() => navigate("/")}
    />
  );
}
