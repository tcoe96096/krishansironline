import React from 'react';
import { PlayCircle, Video } from 'lucide-react';

interface StudyVideoPlayerProps {
  src: string;
  title: string;
}

const isYouTubeUrl = (value: string) => {
  try {
    const url = new URL(value);
    return ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtube-nocookie.com'].includes(url.hostname);
  } catch {
    return false;
  }
};

const getYouTubeEmbedUrl = (value: string) => {
  try {
    const url = new URL(value);
    const id = url.hostname.includes('youtu.be')
      ? url.pathname.slice(1)
      : url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).pop() || '';
    return /^[a-zA-Z0-9_-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : '';
  } catch {
    return '';
  }
};

export const StudyVideoPlayer: React.FC<StudyVideoPlayerProps> = ({ src, title }) => {
  const youtube = isYouTubeUrl(src);
  const embedUrl = youtube ? getYouTubeEmbedUrl(src) : '';

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-[#eef6fc] px-4 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sky-800 shadow-sm"><Video className="h-5 w-5" /></span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-sky-800">Video Lesson</p>
          <h3 className="truncate text-sm font-extrabold text-slate-900">{title}</h3>
        </div>
      </div>
      <div className="aspect-video w-full bg-slate-950">
        {youtube && embedUrl ? (
          <iframe
            src={embedUrl}
            title={title}
            className="h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : !youtube && /^https?:\/\//i.test(src) ? (
          <video className="h-full w-full" controls playsInline preload="metadata">
            <source src={src} />
            Your browser does not support HTML video.
          </video>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-5 text-center text-white">
            <PlayCircle className="h-10 w-10 text-sky-300" />
            <p className="text-sm font-semibold">Video link is not valid</p>
          </div>
        )}
      </div>
    </section>
  );
};
