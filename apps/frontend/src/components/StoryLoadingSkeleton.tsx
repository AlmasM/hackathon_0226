export default function StoryLoadingSkeleton() {
  return (
    <div
      className="story-player story-player--skeleton"
      role="status"
      aria-busy
      aria-label="Loading story"
    >
      <div className="story-player__backdrop" />
      <div className="story-player__progress-row story-player__skeleton-bars">
        <div className="story-player__skeleton-bar" />
        <div className="story-player__skeleton-bar" />
        <div className="story-player__skeleton-bar" />
      </div>
      <div className="story-player__skeleton-image" />
    </div>
  );
}
