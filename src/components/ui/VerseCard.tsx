'use client';

interface Props {
  reference: string;
  textEn: string;
  textTe?: string;
  backgroundUrl?: string;
  slot?: string;
  id?: string;
}

export function VerseCard({ reference, textEn, textTe, backgroundUrl, slot, id }: Props) {
  const slotColor: Record<string, string> = {
    Morning: 'from-amber-400 to-orange-500',
    Afternoon: 'from-sky-400 to-blue-500',
    Evening: 'from-violet-500 to-purple-600',
    Night: 'from-slate-700 to-gray-900',
  };
  const gradient = slot ? (slotColor[slot] ?? 'from-blue-600 to-indigo-700') : 'from-blue-600 to-indigo-700';

  return (
    <div
      id={id}
      className={`relative rounded-2xl overflow-hidden shadow-md bg-gradient-to-br ${gradient} text-white p-6 min-h-[200px] flex flex-col justify-between`}
      style={
        backgroundUrl
          ? {
              backgroundImage: `linear-gradient(rgba(0,0,0,0.5),rgba(0,0,0,0.65)), url(${backgroundUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : {}
      }
    >
      {slot && (
        <span className="text-xs font-semibold uppercase tracking-wider bg-white/20 backdrop-blur-sm self-start px-3 py-1 rounded-full mb-3">
          {slot}
        </span>
      )}
      <div className="space-y-2 flex-1 my-2">
        <p className="text-base sm:text-lg font-medium leading-relaxed">
          &ldquo;{textEn}&rdquo;
        </p>
        {textTe && (
          <p className="text-sm sm:text-base opacity-90 font-medium leading-relaxed">
            &ldquo;{textTe}&rdquo;
          </p>
        )}
      </div>
      <p className="text-sm font-bold text-right tracking-wide opacity-95 mt-3">
        — {reference}
      </p>
    </div>
  );
}
