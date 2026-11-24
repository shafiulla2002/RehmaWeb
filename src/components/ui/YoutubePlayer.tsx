'use client';

interface Props {
  videoId: string;
  title?: string;
  className?: string;
}

export function YoutubePlayer({ videoId, title = 'Video', className = '' }: Props) {
  if (!videoId) return null;
  return (
    <div
      className={`relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-sm ${className}`}
    >
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full border-0"
      />
    </div>
  );
}
