import { useEffect, useRef, useState } from "react";
import type { Restaurant, StorySegment } from "../types";
import RestaurantDetailBar from "./RestaurantDetailBar";

export interface StoryPlayerProps {
  segments: StorySegment[];
  restaurant: Restaurant;
  onClose: () => void;
}

export default function StoryPlayer({
  segments,
  restaurant,
  onClose,
}: StoryPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [outgoingUrl, setOutgoingUrl] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);

  const segment = segments[currentIndex];
  const imageUrl = segment?.image?.image_url;
  const durationMs = segment?.duration_ms ?? 4000;
  const animationClass =
    segment?.animation != null
      ? `story-player__ken-burns-${segment.animation.replace("ken_burns_", "").replace(/_/g, "-")}`
      : "";

  useEffect(() => {
    if (outgoingUrl === null) return;
    const id = setTimeout(() => setOutgoingUrl(null), 300);
    return () => clearTimeout(id);
  }, [outgoingUrl]);

  useEffect(() => {
    if (segments.length === 0) return;
    const id = setTimeout(() => {
      if (currentIndex < segments.length - 1) {
        setCurrentIndex((i) => i + 1);
      } else {
        onClose();
      }
    }, durationMs);
    return () => clearTimeout(id);
  }, [currentIndex, segments.length, durationMs, onClose]);

  function handleTap(e: React.MouseEvent<HTMLDivElement>) {
    const width = e.currentTarget.offsetWidth;
    const x = e.clientX - e.currentTarget.getBoundingClientRect().left;
    if (x < width / 2) {
      if (currentIndex > 0) {
        const prevUrl = segments[currentIndex].image?.image_url ?? null;
        if (prevUrl) setOutgoingUrl(prevUrl);
        setCurrentIndex((i) => i - 1);
      }
    } else {
      if (currentIndex < segments.length - 1) {
        const prevUrl = segments[currentIndex].image?.image_url ?? null;
        if (prevUrl) setOutgoingUrl(prevUrl);
        setCurrentIndex((i) => i + 1);
      } else {
        onClose();
      }
    }
  }

  function goNext() {
    if (currentIndex < segments.length - 1) {
      const prevUrl = segments[currentIndex].image?.image_url ?? null;
      if (prevUrl) setOutgoingUrl(prevUrl);
      setCurrentIndex((i) => i + 1);
    } else {
      onClose();
    }
  }

  function goPrev() {
    if (currentIndex > 0) {
      const prevUrl = segments[currentIndex].image?.image_url ?? null;
      if (prevUrl) setOutgoingUrl(prevUrl);
      setCurrentIndex((i) => i - 1);
    }
  }

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
    if (touchStartX.current === null) return;
    const endX = e.changedTouches[0].clientX;
    const deltaX = endX - touchStartX.current;
    touchStartX.current = null;
    const threshold = 50;
    if (deltaX < -threshold) goNext();
    else if (deltaX > threshold) goPrev();
  }

  return (
    <div
      className="story-player"
      role="dialog"
      aria-label={`Story: ${restaurant.name}`}
    >
      {segments.length > 0 && (
        <div className="story-player__progress-row" aria-hidden>
          {segments.map((_, i) => (
            <div key={i} className="story-player__progress-track">
              <div
                className={`story-player__progress-fill ${
                  i < currentIndex
                    ? "story-player__progress-fill--complete"
                    : i === currentIndex
                      ? "story-player__progress-fill--active"
                      : ""
                }`}
                style={
                  i === currentIndex
                    ? { animationDuration: `${durationMs}ms` }
                    : undefined
                }
              />
            </div>
          ))}
        </div>
      )}
      <RestaurantDetailBar restaurant={restaurant} />
      <div className="story-player__backdrop" />
      <div className="story-player__image-wrap">
        {outgoingUrl && (
          <img
            src={outgoingUrl}
            alt=""
            className="story-player__image story-player__image-outgoing"
            aria-hidden
          />
        )}
        {imageUrl && (
          <div className="story-player__image-incoming-wrap">
            <img
              key={currentIndex}
              src={imageUrl}
              alt=""
              className={`story-player__image ${animationClass}`}
              style={
                animationClass
                  ? { animationDuration: `${durationMs}ms` }
                  : undefined
              }
              onError={goNext}
            />
          </div>
        )}
      </div>
      <div
        className="story-player__tap-layer"
        onClick={handleTap}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        aria-hidden
      />
      <button
        type="button"
        className="story-player__close"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close story"
      >
        ×
      </button>
      <button
        type="button"
        className="story-player__report"
        onClick={(e) => {
          e.stopPropagation();
          console.log("Report issue for segment:", currentIndex, segment);
        }}
        aria-label="Report issue"
      >
        ⚠️
      </button>
      {currentIndex === segments.length - 1 && segment?.cta && (
        <div className="story-player__cta-wrap">
          {segment.cta.url ? (
            <a
              href={segment.cta.url}
              target="_blank"
              rel="noopener noreferrer"
              className="story-player__cta"
              onClick={(e) => e.stopPropagation()}
            >
              {segment.cta.text}
            </a>
          ) : (
            <button
              type="button"
              className="story-player__cta"
              onClick={(e) => {
                e.stopPropagation();
                console.log("CTA click:", segment.cta?.text);
              }}
            >
              {segment.cta.text}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
