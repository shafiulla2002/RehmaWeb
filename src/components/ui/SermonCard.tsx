'use client';

import Link from 'next/link';

const COLORS = [
  'bg-emerald-800',
  'bg-[#0B2516]',
  'bg-amber-800',
  'bg-[#1E6F43]',
  'bg-teal-800',
  'bg-slate-800',
];

function colorFor(cat: string) {
  let h = 0;
  for (let i = 0; i < cat.length; i++) {
    h = (h * 31 + cat.charCodeAt(i)) % COLORS.length;
  }
  return COLORS[h];
}

interface Props {
  id: string;
  title: string;
  speaker?: string;
  category?: string;
  date?: string;
  thumbnailUrl?: string;
}

export function SermonCard({ id, title, speaker, category, date, thumbnailUrl }: Props) {
  return (
    <Link
      href={`/sermons/${id}`}
      className="group block rounded-3xl overflow-hidden shadow-xs border border-[#EBE6DC] dark:border-[#222F3E] hover:border-[#1E6F43] hover:shadow-md transition-all bg-white dark:bg-[#131C27] flex flex-col"
    >
      <div
        className={`h-40 flex items-center justify-center text-white text-xs font-bold uppercase tracking-wider ${colorFor(
          category ?? 'general'
        )} relative overflow-hidden`}
      >
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex flex-col items-center gap-1.5 px-4 text-center">
            <span className="text-2xl">🎙️</span>
            <span className="text-xs font-bold text-amber-200">{category ?? 'Holy Scripture'}</span>
          </div>
        )}
        {thumbnailUrl && <div className="absolute inset-0 bg-black/40" />}
        {thumbnailUrl && (
          <span className="relative z-10 bg-black/50 backdrop-blur-xs border border-white/20 px-3 py-1 rounded-full text-[11px] font-semibold text-white">
            {category ?? 'Sermon'}
          </span>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <p className="font-bold text-[#18221B] dark:text-white text-sm line-clamp-2 group-hover:text-[#1E6F43] dark:group-hover:text-emerald-400 transition-colors">
            {title}
          </p>
          {speaker && (
            <p className="text-xs text-[#5C665F] dark:text-slate-400 mt-1.5 flex items-center gap-1">
              <span>🎙️</span>
              <span>{speaker}</span>
            </p>
          )}
        </div>
        {date && (
          <p className="text-xs text-[#5C665F] dark:text-slate-400 mt-3 flex items-center gap-1">
            <span>📅</span>
            <span>{new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </p>
        )}
      </div>
    </Link>
  );
}
