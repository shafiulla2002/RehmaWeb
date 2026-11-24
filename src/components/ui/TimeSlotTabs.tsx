'use client';

import { SlotLabel, SLOTS, isSlotUnlocked } from '@/lib/verse-slot';

interface Props {
  active: SlotLabel;
  date: Date;
  onChange: (slot: SlotLabel) => void;
}

const icons: Record<SlotLabel, string> = {
  Morning: '🌅',
  Afternoon: '☀️',
  Evening: '🌆',
  Night: '🌙',
};

export function TimeSlotTabs({ active, date, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 my-2">
      {SLOTS.map((slot) => {
        const unlocked = isSlotUnlocked(slot, date);
        const isActive = active === slot;
        return (
          <button
            key={slot}
            type="button"
            onClick={() => unlocked && onChange(slot)}
            disabled={!unlocked}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
              isActive
                ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400'
                : unlocked
                ? 'bg-white border border-gray-200 text-gray-700 hover:border-blue-400 hover:text-blue-600'
                : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60'
            }`}
          >
            <span>{icons[slot]}</span>
            <span>{slot}</span>
            {!unlocked && <span className="text-[10px] ml-0.5">🔒</span>}
          </button>
        );
      })}
    </div>
  );
}
