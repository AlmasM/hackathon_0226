import { useEffect, useRef, useState } from "react";
import type { Restaurant, StorySegment } from "../types";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ??
  import.meta.env.VITE_API_URL ??
  "http://localhost:8000";

export interface StoryPlayerProps {
  segments: StorySegment[];
  restaurant: Restaurant;
  onClose: () => void;
  onCtaClick?: (cta: { text: string; url: string }) => void;
  /** Persona name for overlay e.g. "The Vegan" */
  personaLabel?: string;
  /** Base URL for API (for generated video src). Defaults to env or localhost:8000 */
  apiBaseUrl?: string;
}

export default function StoryPlayer({
  segments,
  restaurant,
  onClose,
  onCtaClick,
  personaLabel,
  apiBaseUrl = API_BASE,
}: StoryPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [outgoingUrl, setOutgoingUrl] = useState<string | null>(null);
  const [effectiveDurationMs, setEffectiveDurationMs] = useState(4000);
  const touchStartX = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const segment = segments[currentIndex];
  const imageUrl = segment?.image?.image_url;
  const durationMs = segment?.duration_ms ?? 4000;
  const hasVideo = Boolean(segment?.video_id);
  const videoSrc = segment?.video_id
    ? `${apiBaseUrl}/api/generated-videos/${segment.video_id}`
    : null;
  const animationClass =
    segment?.animation != null
      ? `story-player__ken-burns-${segment.animation.replace("ken_burns_", "").replace(/_/g, "-")}`
      : "";

  useEffect(() => {
    if (outgoingUrl === null) return;
    const id = setTimeout(() => setOutgoingUrl(null), 300);
    return () => clearTimeout(id);
  }, [outgoingUrl]);

  // Reset effective duration when segment changes
  useEffect(() => {
    setEffectiveDurationMs(segment?.duration_ms ?? 4000);
  }, [currentIndex, segment?.duration_ms]);

  // Auto-advance: for image segments use timer; for video segments advance is handled by video onEnded
  useEffect(() => {
    if (segments.length === 0 || hasVideo) return;
    const id = setTimeout(() => {
      if (currentIndex < segments.length - 1) {
        setCurrentIndex((i) => i + 1);
      } else {
        onClose();
      }
    }, effectiveDurationMs);
    return () => clearTimeout(id);
  }, [currentIndex, segments.length, hasVideo, effectiveDurationMs, onClose]);

  // When segment has video, play it
  useEffect(() => {
    if (!hasVideo || !videoRef.current) return;
    const v = videoRef.current;
    v.currentTime = 0;
    v.play().catch(() => {});
    return () => {
      v.pause();
    };
  }, [currentIndex, hasVideo]);

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

  function handleVideoEnded() {
    goNext();
  }

  function handleVideoLoadedMetadata(
    e: React.SyntheticEvent<HTMLVideoElement>,
  ) {
    const v = e.currentTarget;
    if (v.duration && isFinite(v.duration)) {
      setEffectiveDurationMs(Math.round(v.duration * 1000));
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
      aria-label={`Story: ${restaurant.name}${hasVideo ? " — video" : ""}`}
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
                    ? { animationDuration: `${effectiveDurationMs}ms` }
                    : undefined
                }
              />
            </div>
          ))}
        </div>
      )}
      <div className="story-player__backdrop" />
      {personaLabel && (
        <div
          className="story-player__persona-overlay"
          style={{
            position: "absolute",
            top: 28,
            left: 16,
            zIndex: 59,
            color: "#fff",
            textShadow: "0 1px 2px rgba(0,0,0,0.8)",
            fontSize: 13,
          }}
        >
          Personalized for you, {personaLabel}
        </div>
      )}
      <div className="story-player__image-wrap">
        {outgoingUrl && (
          <img
            src={outgoingUrl}
            alt=""
            className="story-player__image story-player__image-outgoing"
            aria-hidden
          />
        )}
        {hasVideo && videoSrc ? (
          <div
            className="story-player__image-incoming-wrap story-player__video-wrap"
            role="img"
            aria-label="Video segment"
          >
            <video
              ref={videoRef}
              src={videoSrc}
              className="story-player__video"
              playsInline
              muted
              onEnded={handleVideoEnded}
              onLoadedMetadata={handleVideoLoadedMetadata}
            />
          </div>
        ) : (
          imageUrl && (
            <div className="story-player__image-incoming-wrap">
              <img
                key={currentIndex}
                src={imageUrl}
                alt=""
                className={`story-player__image ${animationClass}`}
                style={
                  animationClass
                    ? { animationDuration: `${effectiveDurationMs}ms` }
                    : undefined
                }
                onError={goNext}
              />
            </div>
          )
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
              onClick={(e) => {
                e.stopPropagation();
                onCtaClick?.(segment.cta!);
              }}
            >
              {segment.cta.text}
            </a>
          ) : (
            <button
              type="button"
              className="story-player__cta"
              onClick={(e) => {
                e.stopPropagation();
                onCtaClick?.(segment.cta!);
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
