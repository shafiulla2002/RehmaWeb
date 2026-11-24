'use client';

import React from 'react';
import { BIBLE_BOOKS, CHAPTER_COUNTS } from '@/lib/bible-api';

interface Props {
  selectedBookIndex: number;
  selectedChapter: number;
  onSelect: (bookIndex: number, chapter: number) => void;
}

export function BibleNavigator({
  selectedBookIndex,
  selectedChapter,
  onSelect,
}: Props) {
  const currentChapterCount = CHAPTER_COUNTS[selectedBookIndex] || 1;

  return (
    <div className="bg-white dark:bg-[#131C27] rounded-3xl border border-[#EBE6DC] dark:border-[#222F3E] p-5 shadow-xs space-y-4">
      {/* Book & Chapter Dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-bold text-[#5C665F] dark:text-slate-400 uppercase tracking-wider block mb-1">
            Book
          </label>
          <select
            value={selectedBookIndex}
            onChange={(e) => onSelect(Number(e.target.value), 1)}
            className="w-full bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EBE6DC] dark:border-[#222F3E] text-xs font-semibold rounded-xl px-3 py-2.5 text-[#18221B] dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#1E6F43]"
          >
            <optgroup label="Old Testament (39 Books)">
              {BIBLE_BOOKS.slice(0, 39).map((b, i) => (
                <option key={b} value={i}>
                  {b}
                </option>
              ))}
            </optgroup>
            <optgroup label="New Testament (27 Books)">
              {BIBLE_BOOKS.slice(39).map((b, i) => (
                <option key={b} value={i + 39}>
                  {b}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-[#5C665F] dark:text-slate-400 uppercase tracking-wider block mb-1">
            Chapter
          </label>
          <select
            value={selectedChapter}
            onChange={(e) => onSelect(selectedBookIndex, Number(e.target.value))}
            className="w-full bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EBE6DC] dark:border-[#222F3E] text-xs font-semibold rounded-xl px-3 py-2.5 text-[#18221B] dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#1E6F43]"
          >
            {Array.from({ length: currentChapterCount }, (_, i) => i + 1).map((ch) => (
              <option key={ch} value={ch}>
                Chapter {ch}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick Chapter Selector Pills */}
      <div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
          Jump to Chapter (1 - {currentChapterCount})
        </span>
        <div className="flex gap-1.5 overflow-x-auto pb-1 max-h-24 flex-wrap">
          {Array.from({ length: currentChapterCount }, (_, i) => i + 1).map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => onSelect(selectedBookIndex, ch)}
              className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                selectedChapter === ch
                  ? 'bg-[#1E6F43] text-white shadow-xs'
                  : 'bg-[#FBF9F4] dark:bg-[#0E1520] text-slate-700 dark:text-slate-300 hover:bg-[#E8F3EC] border border-[#EBE6DC] dark:border-[#222F3E]'
              }`}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
