'use client';

import Link from 'next/link';

interface Props {
  id: string;
  title: string;
  date?: string;
  time?: string;
  location?: string;
  coverImageUrl?: string;
  isLiveStream?: boolean;
}

export function EventCard({
  id,
  title,
  date,
  time,
  location,
  coverImageUrl,
  isLiveStream,
}: Props) {
  return (
    <Link
      href={`/events/${id}`}
      className="group block rounded-3xl overflow-hidden shadow-xs border border-[#EBE6DC] dark:border-[#222F3E] hover:border-[#1E6F43] hover:shadow-md transition-all bg-white dark:bg-[#131C27] flex flex-col"
    >
      <div className="h-44 bg-gradient-to-br from-[#0B2516] to-[#1E6F43] relative overflow-hidden flex items-center justify-center">
        {coverImageUrl ? (
          <img
            src={coverImageUrl}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <span className="text-white text-3xl">📅</span>
        )}
        {isLiveStream && (
          <span className="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm animate-pulse">
            🔴 LIVE BROADCAST
          </span>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <p className="font-bold text-[#18221B] dark:text-white text-sm line-clamp-2 group-hover:text-[#1E6F43] dark:group-hover:text-emerald-400 transition-colors">
            {title}
          </p>
          {date && (
            <p className="text-xs text-[#1E6F43] dark:text-emerald-400 font-semibold mt-2 flex items-center gap-1.5">
              <span>📅</span>
              <span>{date}</span>
              {time && <span>· {time}</span>}
            </p>
          )}
        </div>
        {location && (
          <p className="text-xs text-[#5C665F] dark:text-slate-400 mt-2.5 truncate flex items-center gap-1.5">
            <span>📍</span>
            <span>{location}</span>
          </p>
        )}
      </div>
    </Link>
  );
}
