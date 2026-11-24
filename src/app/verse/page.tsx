'use client';

import React, { useEffect, useState, useRef } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { VerseCard } from '@/components/ui/VerseCard';
import { TimeSlotTabs } from '@/components/ui/TimeSlotTabs';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  SlotLabel,
  SLOTS,
  getIndicesForDate,
  getCurrentSlot,
  isSlotUnlocked,
  getLast7Days,
  formatDateStrip,
} from '@/lib/verse-slot';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, limit } from 'firebase/firestore';
import { toPng } from 'html-to-image';

interface VerseData {
  id?: string;
  index?: number;
  verseEn: string;
  referenceEn: string;
  verseTe?: string;
  referenceTe?: string;
  verseHi?: string;
  referenceHi?: string;
  verseTa?: string;
  referenceTa?: string;
  verseKn?: string;
  referenceKn?: string;
  verseMl?: string;
  referenceMl?: string;
  verseMr?: string;
  referenceMr?: string;
  backgroundUrl?: string;
}

export default function VerseOfTheDayPage() {
  const days = getLast7Days();
  const [selectedDate, setSelectedDate] = useState<Date>(days[days.length - 1]);
  const [activeSlot, setActiveSlot] = useState<SlotLabel>(() => getCurrentSlot());
  const [versesBySlot, setVersesBySlot] = useState<Record<SlotLabel, VerseData | null>>({
    Morning: null,
    Afternoon: null,
    Evening: null,
    Night: null,
  });
  const [language, setLanguage] = useState<'en' | 'te' | 'hi' | 'ta' | 'mr' | 'ml' | 'kn'>('en');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadVerses() {
      setIsLoading(true);
      setError(null);
      try {
        const indices = getIndicesForDate(selectedDate);
        const versesRef = collection(db, 'daily_verses');
        
        // Fetch by query using index field
        const q = query(versesRef, where('index', 'in', indices));
        const snapshot = await getDocs(q);

        const fetchedMap = new Map<number, VerseData>();
        snapshot.forEach((d) => {
          const data = d.data() as VerseData;
          if (data.index !== undefined) {
            fetchedMap.set(data.index, { ...data, id: d.id });
          }
        });

        // If some indices not found by index query, try fetching by doc ID
        for (const idx of indices) {
          if (!fetchedMap.has(idx)) {
            try {
              const singleDoc = await getDoc(doc(db, 'daily_verses', String(idx)));
              if (singleDoc.exists()) {
                fetchedMap.set(idx, { ...(singleDoc.data() as VerseData), id: singleDoc.id, index: idx });
              }
            } catch {
              // Ignore single lookup failure
            }
          }
        }

        // Graceful fallback to any available verses in collection if date indices missed
        if (fetchedMap.size === 0) {
          const fallbackSnap = await getDocs(query(versesRef, limit(4)));
          let fIdx = 0;
          fallbackSnap.forEach((d) => {
            if (fIdx < indices.length) {
              fetchedMap.set(indices[fIdx], { ...(d.data() as VerseData), id: d.id, index: indices[fIdx] });
              fIdx++;
            }
          });
        }

        if (!isCancelled) {
          const mapped: Record<SlotLabel, VerseData | null> = {
            Morning: fetchedMap.get(indices[0]) || null,
            Afternoon: fetchedMap.get(indices[1]) || null,
            Evening: fetchedMap.get(indices[2]) || null,
            Night: fetchedMap.get(indices[3]) || null,
          };
          setVersesBySlot(mapped);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Failed to load verses:', err);
          setError('Unable to load verses from database. Please check your connection.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadVerses();

    return () => {
      isCancelled = true;
    };
  }, [selectedDate]);

  const activeVerse = versesBySlot[activeSlot];
  const unlocked = isSlotUnlocked(activeSlot, selectedDate);

  async function downloadCard() {
    if (!cardRef.current) return;
    setIsDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `rhema_verse_${activeSlot}_${selectedDate.toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export card image:', err);
    } finally {
      setIsDownloading(false);
    }
  }

  function getLocalizedText(verse: VerseData | null) {
    if (!verse) return { text: '', ref: '' };
    switch (language) {
      case 'te':
        return { text: verse.verseTe || verse.verseEn, ref: verse.referenceTe || verse.referenceEn };
      case 'hi':
        return { text: verse.verseHi || verse.verseEn, ref: verse.referenceHi || verse.referenceEn };
      case 'ta':
        return { text: verse.verseTa || verse.verseEn, ref: verse.referenceTa || verse.referenceEn };
      case 'kn':
        return { text: verse.verseKn || verse.verseEn, ref: verse.referenceKn || verse.referenceEn };
      case 'ml':
        return { text: verse.verseMl || verse.verseEn, ref: verse.referenceMl || verse.referenceEn };
      case 'mr':
        return { text: verse.verseMr || verse.verseEn, ref: verse.referenceMr || verse.referenceEn };
      case 'en':
      default:
        return { text: verse.verseEn, ref: verse.referenceEn };
    }
  }

  const localized = getLocalizedText(activeVerse);

  return (
    <AppShell allowedRoles={['member', 'admin', 'superadmin', 'guest']}>
      <div className="space-y-6">
        {/* Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Verse of the Day
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Deterministic 4-slot scripture synchronised across Rhema Church worldwide
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex flex-col items-end">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="bg-white border border-gray-200 text-xs font-semibold rounded-lg px-3 py-2 text-gray-700 hover:border-gray-300 shadow-xs"
              >
                <optgroup label="Bundled Offline (Native)">
                  <option value="en">English (KJV) • Offline</option>
                  <option value="te">తెలుగు (Telugu) • Offline</option>
                </optgroup>
                <optgroup label="Online API (with English Fallback)">
                  <option value="hi">हिंदी (Hindi) • Online</option>
                  <option value="ta">தமிழ் (Tamil) • Online</option>
                  <option value="kn">ಕನ್ನಡ (Kannada) • Online</option>
                  <option value="ml">മലയാളം (Malayalam) • Online</option>
                  <option value="mr">मराठी (Marathi) • Online</option>
                </optgroup>
              </select>
              {language !== 'en' && language !== 'te' && (
                <span className="text-[10px] text-amber-600 mt-1 font-medium">
                  Online translation; falls back to English if unavailable
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={downloadCard}
              disabled={isDownloading || !activeVerse || !unlocked}
              className="bg-[#1E6F43] hover:bg-[#175835] disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-2xl transition-colors flex items-center gap-1.5 shadow-xs shrink-0"
            >
              <span>{isDownloading ? '⏳' : '📥'}</span>
              <span>Download Card</span>
            </button>
          </div>
        </div>

        {/* 7-Day Date Strip & Monthly Archive Picker (Feature 14) */}
        <div className="bg-white dark:bg-[#131C27] rounded-3xl border border-[#EBE6DC] dark:border-[#222F3E] p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold text-[#5C665F] dark:text-slate-400 uppercase tracking-wider">
              Select Calendar Day
            </p>
            <button
              type="button"
              onClick={() => setShowMonthPicker(!showMonthPicker)}
              className="text-xs font-semibold text-[#1E6F43] dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>📅</span>
              <span>{showMonthPicker ? 'Close Picker' : 'Pick Any Date'}</span>
            </button>
          </div>

          {/* Optional Month Date Picker */}
          {showMonthPicker && (
            <div className="p-3 mb-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 rounded-2xl flex items-center gap-3 flex-wrap text-xs">
              <span className="font-semibold text-emerald-950 dark:text-emerald-200">Jump to Calendar Date:</span>
              <input
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                value={selectedDate.toISOString().slice(0, 10)}
                onChange={(e) => {
                  if (e.target.value) {
                    const parsed = new Date(e.target.value);
                    if (!isNaN(parsed.getTime())) {
                      setSelectedDate(parsed);
                    }
                  }
                }}
                className="bg-white dark:bg-[#131C27] border border-emerald-300 dark:border-emerald-700 rounded-xl px-2.5 py-1 text-xs font-medium text-gray-800 dark:text-white"
              />
              <span className="text-[11px] text-emerald-700 dark:text-emerald-300">
                (Calculates deterministic 4-slots from 5,863 verses for any day)
              </span>
            </div>
          )}

          <div className="flex gap-2 overflow-x-auto pb-1">
            {days.map((d, i) => {
              const isSelected = d.toDateString() === selectedDate.toDateString();
              const isToday = d.toDateString() === new Date().toDateString();
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedDate(d)}
                  className={`flex flex-col items-center min-w-[76px] px-3 py-2 rounded-2xl text-xs font-medium border transition-all ${
                    isSelected
                      ? 'bg-[#1E6F43] text-white border-[#1E6F43] shadow-sm'
                      : 'bg-[#FBF9F4] dark:bg-[#0E1520] text-slate-700 dark:text-slate-300 border-[#EBE6DC] dark:border-[#222F3E] hover:bg-[#E8F3EC]'
                  }`}
                >
                  <span className="text-[10px] opacity-80 uppercase">
                    {d.toLocaleDateString('en-IN', { weekday: 'short' })}
                  </span>
                  <span className="text-base font-bold my-0.5">
                    {d.getDate()}
                  </span>
                  <span className="text-[10px] opacity-90">
                    {isToday ? 'Today' : d.toLocaleDateString('en-IN', { month: 'short' })}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4 Time Slot Tabs */}
        <TimeSlotTabs
          active={activeSlot}
          date={selectedDate}
          onChange={(slot) => setActiveSlot(slot)}
        />

        {/* Main Verse Content */}
        {error && <ErrorBanner message={error} />}

        {isLoading ? (
          <CardSkeleton lines={6} />
        ) : !unlocked ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-xs">
            <span className="text-4xl mb-3 block">🔒</span>
            <h3 className="text-base font-bold text-gray-800">
              {activeSlot} Verse is Locked
            </h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              This slot will automatically unlock according to local time (Morning 5 AM, Afternoon 12 PM, Evening 5 PM, Night 9 PM).
            </p>
          </div>
        ) : !activeVerse ? (
          <EmptyState
            icon="📖"
            title="Verse data currently syncing"
            subtitle="The church verse database is connecting. Check back shortly."
          />
        ) : (
          <div ref={cardRef}>
            <VerseCard
              slot={activeSlot}
              reference={localized.ref}
              textEn={localized.text}
              textTe={language !== 'te' ? activeVerse.verseTe : undefined}
              backgroundUrl={activeVerse.backgroundUrl}
            />
          </div>
        )}

        {/* 4 Slots Preview Strip */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
            Today&apos;s 4 Daily Scriptures
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SLOTS.map((slot) => {
              const v = versesBySlot[slot];
              const isSlotOpen = isSlotUnlocked(slot, selectedDate);
              const isSelected = activeSlot === slot;
              return (
                <div
                  key={slot}
                  onClick={() => isSlotOpen && setActiveSlot(slot)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    !isSlotOpen
                      ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                      : isSelected
                      ? 'bg-blue-50/50 border-blue-500 ring-1 ring-blue-500 cursor-pointer'
                      : 'bg-white border-gray-200 hover:border-gray-300 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-700 mb-1">
                    <span>{slot}</span>
                    <span>{!isSlotOpen ? '🔒' : '✓'}</span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {isSlotOpen && v ? v.verseEn : 'Locked until designated hour'}
                  </p>
                  {isSlotOpen && v && (
                    <p className="text-[11px] font-bold text-blue-700 mt-2">
                      {v.referenceEn}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
