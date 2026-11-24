'use client';

import { useState } from 'react';
import { getRsvp, setRsvp, type RsvpStatus } from '@/lib/local-state';

interface RsvpStats {
  going?: number;
  interested?: number;
  notGoing?: number;
}

interface Props {
  eventId: string;
  stats?: RsvpStats;
  uid?: string;
}

const OPTIONS: { status: RsvpStatus; label: string; emoji: string }[] = [
  { status: 'going', label: 'Going', emoji: '✅' },
  { status: 'interested', label: 'Interested', emoji: '🤔' },
  { status: 'not_going', label: "Can't Go", emoji: '❌' },
];

export function RsvpPollCard({ eventId, stats = {}, uid }: Props) {
  const [myRsvp, setMyRsvp] = useState<RsvpStatus>(() => getRsvp(eventId, uid));

  function handleRsvp(status: RsvpStatus) {
    const next = myRsvp === status ? null : status;
    setRsvp(eventId, next, uid);
    setMyRsvp(next);
  }

  // Adjust stats dynamically for local response
  const goingCount = (stats.going ?? 0) + (myRsvp === 'going' ? 1 : 0);
  const interestedCount = (stats.interested ?? 0) + (myRsvp === 'interested' ? 1 : 0);
  const notGoingCount = (stats.notGoing ?? 0) + (myRsvp === 'not_going' ? 1 : 0);
  const total = goingCount + interestedCount + notGoingCount;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-xs">
      <h4 className="text-sm font-semibold text-gray-800 mb-2">Are you attending?</h4>
      <p className="text-xs text-gray-500 mb-3">
        Select your attendance response to update church planners.
      </p>

      <div className="flex gap-2 mb-4 flex-wrap">
        {OPTIONS.map((opt) => {
          const isSelected = myRsvp === opt.status;
          return (
            <button
              key={opt.status}
              type="button"
              onClick={() => handleRsvp(opt.status)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all ${
                isSelected
                  ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-500 shadow-xs'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span>{opt.emoji}</span>
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-2 pt-2 border-t border-gray-100 text-xs text-gray-600">
        {[
          { label: 'Going', count: goingCount, color: 'bg-emerald-500' },
          { label: 'Interested', count: interestedCount, color: 'bg-amber-500' },
          { label: "Can't Go", count: notGoingCount, color: 'bg-rose-500' },
        ].map((item) => {
          const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
          return (
            <div key={item.label} className="flex items-center gap-2">
              <span className="w-16 text-gray-500">{item.label}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full ${item.color} rounded-full transition-all duration-300`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-12 text-right font-medium text-gray-700">
                {item.count} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-gray-400 mt-3 pt-2 border-t border-gray-100 italic">
        💾 Response saved locally (Firebase write pending separate approval)
      </p>
    </div>
  );
}
