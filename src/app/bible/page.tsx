'use client';

import React, { useEffect, useState, useRef } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { BibleNavigator } from '@/components/bible/BibleNavigator';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  fetchChapter,
  BIBLE_BOOKS,
  CHAPTER_COUNTS,
  TRANSLATIONS,
  EN_VERSIONS,
  BibleVerse,
} from '@/lib/bible-api';
import { getBibleProgress, saveBibleProgress, type BibleProgress } from '@/lib/local-state';
import { useAuth } from '@/contexts/AuthContext';

const READING_PLANS = [
  { id: 'plan_nt_30', name: '30-Day New Testament Challenge', days: 30, desc: 'Read through the New Testament in 30 days.' },
  { id: 'plan_psalms_90', name: '90-Day Psalms & Wisdom Journey', days: 90, desc: 'Daily prayer, praise, and proverb devotionals.' },
  { id: 'plan_gospels_180', name: '6-Month Gospels & Acts Fellowship', days: 180, desc: 'Walk alongside Jesus and the early Church.' },
  { id: 'plan_full_365', name: '1-Year Chronological Holy Bible', days: 365, desc: 'Complete Scripture reading from Genesis to Revelation.' },
];

export default function BiblePage() {
  const { user } = useAuth();

  // Navigation
  const [bookIndex, setBookIndex] = useState(0); // Genesis default
  const [chapter, setChapter] = useState(1);
  const [activeTab, setActiveTab] = useState<'reader' | 'parallel' | 'plans'>('reader');

  // Translation Selection
  const [primaryLang, setPrimaryLang] = useState('te'); // Telugu default for church
  const [primaryVersion, setPrimaryVersion] = useState('te-IRV');
  const [parallelVersion, setParallelVersion] = useState('KJV');

  // Verses Data
  const [primaryVerses, setPrimaryVerses] = useState<BibleVerse[]>([]);
  const [parallelVerses, setParallelVerses] = useState<BibleVerse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verse Interaction
  const [highlightedVerses, setHighlightedVerses] = useState<number[]>([]);
  const [copiedVerseNum, setCopiedVerseNum] = useState<number | null>(null);
  const [fontSize, setFontSize] = useState(18);

  // Audio Speech TTS
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioSpeed, setAudioSpeed] = useState(1.0);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string>('');
  const [speakingVerseIndex, setSpeakingVerseIndex] = useState<number | null>(null);

  // Reading Plans
  const [selectedPlanId, setSelectedPlanId] = useState<string>(READING_PLANS[0].id);
  const [planProgress, setPlanProgress] = useState<BibleProgress | null>(null);

  useEffect(() => {
    const saved = getBibleProgress(user?.uid);
    if (saved) {
      setPlanProgress(saved);
      setSelectedPlanId(saved.planId);
    }
  }, [user]);

  // Load available speech synthesis voices for audio Bible
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const updateVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
        if (voices.length > 0 && !selectedVoiceUri) {
          const langCode = primaryVersion.split('-')[0];
          const match = voices.find((v) => v.lang.startsWith(langCode)) || voices[0];
          setSelectedVoiceUri(match?.voiceURI || voices[0].voiceURI);
        }
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
      return () => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.onvoiceschanged = null;
        }
      };
    }
  }, [primaryVersion, selectedVoiceUri]);

  // Load Primary & Parallel Scripture
  useEffect(() => {
    let isCancelled = false;

    async function loadScripture() {
      setIsLoading(true);
      setError(null);
      try {
        const bookNum = bookIndex + 1;
        const pVerses = await fetchChapter(primaryVersion, bookNum, chapter);

        let sVerses: BibleVerse[] = [];
        if (activeTab === 'parallel') {
          sVerses = await fetchChapter(parallelVersion, bookNum, chapter);
        }

        if (!isCancelled) {
          setPrimaryVerses(pVerses);
          setParallelVerses(sVerses);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Failed to load Bible chapter:', err);
          setError('Unable to load scripture chapter from API. Please verify network access.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadScripture();

    return () => {
      isCancelled = true;
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingAudio(false);
      setSpeakingVerseIndex(null);
    };
  }, [bookIndex, chapter, primaryVersion, parallelVersion, activeTab]);

  // Audio TTS Engine
  function toggleSpeech() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      setSpeakingVerseIndex(null);
      return;
    }

    if (primaryVerses.length === 0) return;

    window.speechSynthesis.cancel();
    setIsPlayingAudio(true);

    const fullText = primaryVerses.map((v) => `Verse ${v.verse}. ${v.text}`).join(' ');
    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.rate = audioSpeed;
    if (selectedVoiceUri && availableVoices.length > 0) {
      const matched = availableVoices.find((v) => v.voiceURI === selectedVoiceUri);
      if (matched) utterance.voice = matched;
    }

    utterance.onend = () => {
      setIsPlayingAudio(false);
      setSpeakingVerseIndex(null);
    };

    utterance.onerror = () => {
      setIsPlayingAudio(false);
      setSpeakingVerseIndex(null);
    };

    window.speechSynthesis.speak(utterance);
  }

  function handleCopyVerse(v: BibleVerse) {
    const bookName = BIBLE_BOOKS[bookIndex];
    const textToCopy = `"${v.text}" — ${bookName} ${chapter}:${v.verse}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedVerseNum(v.verse);
    setTimeout(() => setCopiedVerseNum(null), 2000);
  }

  // Feature 22: Multi-Verse Formatted Copy Bar
  function handleCopySelectedVerses() {
    const sorted = [...highlightedVerses].sort((a, b) => a - b);
    const selected = primaryVerses.filter((v) => sorted.includes(v.verse));
    if (selected.length === 0) return;
    const bookName = BIBLE_BOOKS[bookIndex];
    const verseRange = sorted.length === 1 ? `${sorted[0]}` : `${sorted[0]}-${sorted[sorted.length - 1]}`;
    const text = selected.map((v) => `${v.verse}. ${v.text}`).join(' ');
    const citation = `"${text}" — ${bookName} ${chapter}:${verseRange} (${primaryVersion})`;
    navigator.clipboard.writeText(citation);
    setCopiedVerseNum(sorted[0]);
    setTimeout(() => setCopiedVerseNum(null), 2000);
  }

  function toggleHighlight(verseNum: number) {
    setHighlightedVerses((prev) =>
      prev.includes(verseNum) ? prev.filter((n) => n !== verseNum) : [...prev, verseNum]
    );
  }

  function handleCompletePlanDay(day: number) {
    const currentCompleted = planProgress?.completedDays || [];
    const nextCompleted = currentCompleted.includes(day)
      ? currentCompleted.filter((d) => d !== day)
      : [...currentCompleted, day];

    const updated: BibleProgress = {
      planId: selectedPlanId,
      currentDay: day,
      completedDays: nextCompleted,
    };
    saveBibleProgress(updated, user?.uid);
    setPlanProgress(updated);
  }

  const bookName = BIBLE_BOOKS[bookIndex];
  const maxChapters = CHAPTER_COUNTS[bookIndex] || 1;

  return (
    <AppShell allowedRoles={['member', 'admin', 'superadmin', 'guest']}>
      <div className="space-y-6">
        {/* Header Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Holy Bible &amp; Audio Devotionals
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Read and listen to the Holy Word in multiple languages with parallel comparative study
            </p>
          </div>

          {/* View Mode Switcher */}
          <div className="inline-flex rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] p-1 bg-white dark:bg-[#131C27] shadow-xs self-start sm:self-auto">
            {[
              { id: 'reader', label: '📖 Reader' },
              { id: 'parallel', label: '⚖️ Parallel' },
              { id: 'plans', label: '📋 Reading Plans' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#1E6F43] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {error && <ErrorBanner message={error} />}

        {/* READING PLANS TAB */}
        {activeTab === 'plans' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {READING_PLANS.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                const completedCount =
                  planProgress?.planId === plan.id ? planProgress.completedDays.length : 0;
                const pct = Math.round((completedCount / plan.days) * 100);

                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`p-5 rounded-3xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#1E6F43] bg-emerald-50/50 dark:bg-emerald-950/30 ring-1 ring-[#1E6F43] shadow-xs'
                        : 'border-[#EBE6DC] dark:border-[#222F3E] bg-white dark:bg-[#131C27] hover:border-slate-300'
                    }`}
                  >
                    <p className="font-bold text-sm text-[#18221B] dark:text-white mb-1">{plan.name}</p>
                    <p className="text-xs text-[#5C665F] dark:text-slate-400 mb-4">{plan.desc}</p>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[#5C665F] dark:text-slate-400">
                        <span>{completedCount} / {plan.days} Days</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#1E6F43] h-full rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Checklist Days for Selected Plan */}
            <div className="bg-white dark:bg-[#131C27] rounded-3xl border border-[#EBE6DC] dark:border-[#222F3E] p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#18221B] dark:text-white">
                    {READING_PLANS.find((p) => p.id === selectedPlanId)?.name}
                  </h3>
                  <p className="text-xs text-[#5C665F] dark:text-slate-400">
                    Mark each day complete as you finish daily scripture reading
                  </p>
                </div>
                <span className="text-xs font-semibold text-[#1E6F43] bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                  {planProgress?.completedDays.length || 0} Days Completed
                </span>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-10 gap-2 pt-2">
                {Array.from(
                  { length: READING_PLANS.find((p) => p.id === selectedPlanId)?.days || 30 },
                  (_, i) => i + 1
                ).map((day) => {
                  const isDone = planProgress?.completedDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleCompletePlanDay(day)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                        isDone
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      Day {day} {isDone ? '✓' : ''}
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] text-gray-400 italic text-center pt-2">
                💾 Reading plan progress saved locally (Firebase write pending separate approval)
              </p>
            </div>
          </div>
        )}

        {/* READER & PARALLEL TAB */}
        {(activeTab === 'reader' || activeTab === 'parallel') && (
          <div className="space-y-6">
            {/* Book & Chapter Navigator */}
            <BibleNavigator
              selectedBookIndex={bookIndex}
              selectedChapter={chapter}
              onSelect={(bIdx, ch) => {
                setBookIndex(bIdx);
                setChapter(ch);
              }}
            />

            {/* Translation & Reading Controls Bar */}
            <div className="bg-white dark:bg-[#131C27] rounded-3xl border border-[#EBE6DC] dark:border-[#222F3E] p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                {/* Primary Language */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">
                    Primary Version
                  </label>
                  <select
                    value={primaryVersion}
                    onChange={(e) => setPrimaryVersion(e.target.value)}
                    className="bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EBE6DC] dark:border-[#222F3E] text-xs font-semibold rounded-xl px-2.5 py-1.5 text-[#18221B] dark:text-white"
                  >
                    <option value="te-IRV">తెలుగు (Telugu IRV)</option>
                    <option value="KJV">English (KJV)</option>
                    <option value="NKJV">English (NKJV)</option>
                    <option value="ESV">English (ESV)</option>
                    <option value="NIV">English (NIV)</option>
                    <option value="hi-IRV">हिंदी (Hindi IRV)</option>
                    <option value="ta-IRV">தமிழ் (Tamil IRV)</option>
                    <option value="kn-IRV">ಕನ್ನಡ (Kannada IRV)</option>
                    <option value="ml-IRV">മലയാളം (Malayalam IRV)</option>
                    <option value="mr-IRV">मराठी (Marathi IRV)</option>
                  </select>
                </div>

                {/* Parallel Version if active */}
                {activeTab === 'parallel' && (
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">
                      Parallel Version
                    </label>
                    <select
                      value={parallelVersion}
                      onChange={(e) => setParallelVersion(e.target.value)}
                      className="bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EBE6DC] dark:border-[#222F3E] text-xs font-semibold rounded-xl px-2.5 py-1.5 text-[#18221B] dark:text-white"
                    >
                      {EN_VERSIONS.map((v) => (
                        <option key={v} value={v}>
                          {v} (English)
                        </option>
                      ))}
                      <option value="te-IRV">Telugu (IRV)</option>
                      <option value="hi-IRV">Hindi (IRV)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Audio Speech Controls with Speed & Voice Selector + Font Size */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={toggleSpeech}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isPlayingAudio
                      ? 'bg-rose-600 text-white shadow-xs animate-pulse'
                      : 'bg-[#1E6F43] text-white hover:bg-[#175835] shadow-xs'
                  }`}
                >
                  <span>{isPlayingAudio ? '⏹️ Stop' : '🔊 Listen Audio'}</span>
                </button>

                {/* Speed Selector */}
                <select
                  value={audioSpeed}
                  onChange={(e) => setAudioSpeed(Number(e.target.value))}
                  title="Audio Playback Speed"
                  className="bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EBE6DC] dark:border-[#222F3E] text-xs font-semibold rounded-xl px-2 py-1 text-slate-700 dark:text-slate-300"
                >
                  <option value={0.75}>0.75x</option>
                  <option value={1.0}>1.0x (Normal)</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                </select>

                {/* Voice Selector (if available) */}
                {availableVoices.length > 0 && (
                  <select
                    value={selectedVoiceUri}
                    onChange={(e) => setSelectedVoiceUri(e.target.value)}
                    title="Audio Narrator Voice"
                    className="max-w-[130px] truncate bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EBE6DC] dark:border-[#222F3E] text-[11px] font-semibold rounded-xl px-2 py-1 text-slate-700 dark:text-slate-300"
                  >
                    {availableVoices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                )}

                <div className="flex items-center gap-1 text-xs text-gray-500 bg-[#FBF9F4] dark:bg-[#0E1520] px-2 py-1 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E]">
                  <span className="text-[11px]">A-</span>
                  <input
                    type="range"
                    min={14}
                    max={26}
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-16 accent-[#1E6F43]"
                  />
                  <span className="text-sm font-bold">A+</span>
                </div>
              </div>
            </div>

            {/* Scripture Reader Body */}
            {isLoading ? (
              <CardSkeleton lines={10} />
            ) : primaryVerses.length === 0 ? (
              <EmptyState
                icon="📕"
                title="Chapter text currently synchronising"
                subtitle="Scripture text is connecting from Bible services. Try re-selecting the chapter."
              />
            ) : activeTab === 'parallel' ? (
              /* Parallel Side-by-Side View */
              <div className="bg-white dark:bg-[#131C27] rounded-3xl border border-[#EBE6DC] dark:border-[#222F3E] p-6 sm:p-8 shadow-xs space-y-6">
                <div className="grid grid-cols-2 gap-4 pb-3 border-b border-[#EBE6DC] dark:border-[#222F3E] text-xs font-bold text-[#5C665F] dark:text-slate-400 uppercase tracking-wider">
                  <div>{primaryVersion}</div>
                  <div>{parallelVersion}</div>
                </div>

                <div className="space-y-4">
                  {primaryVerses.map((pVerse, i) => {
                    const sVerse = parallelVerses[i];
                    const isHighlighted = highlightedVerses.includes(pVerse.verse);
                    return (
                      <div
                        key={pVerse.verse}
                        onClick={() => toggleHighlight(pVerse.verse)}
                        className={`grid grid-cols-2 gap-4 p-3 rounded-2xl transition-colors cursor-pointer ${
                          isHighlighted ? 'bg-amber-100/60 dark:bg-amber-950/40' : 'hover:bg-[#FBF9F4] dark:hover:bg-[#0E1520]'
                        }`}
                        style={{ fontSize: `${fontSize}px` }}
                      >
                        <div className="text-[#18221B] dark:text-white leading-relaxed font-sans">
                          <span className="font-bold text-[#1E6F43] dark:text-emerald-400 mr-2 text-xs select-none">
                            {pVerse.verse}
                          </span>
                          {pVerse.text}
                        </div>
                        <div className="text-gray-700 dark:text-slate-300 leading-relaxed font-sans border-l border-[#EBE6DC] dark:border-[#222F3E] pl-4">
                          <span className="font-bold text-gray-400 mr-2 text-xs select-none">
                            {pVerse.verse}
                          </span>
                          {sVerse ? sVerse.text : '—'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Single Reader View */
              <div className="bg-white dark:bg-[#131C27] rounded-3xl border border-[#EBE6DC] dark:border-[#222F3E] p-6 sm:p-10 shadow-xs space-y-4">
                <div className="border-b border-[#EBE6DC] dark:border-[#222F3E] pb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-[#18221B] dark:text-white font-serif">
                    {bookName} — Chapter {chapter}
                  </h2>
                  <span className="text-xs text-gray-400">{primaryVerses.length} Verses</span>
                </div>

                <div className="space-y-3 leading-relaxed text-[#18221B] dark:text-slate-200" style={{ fontSize: `${fontSize}px` }}>
                  {primaryVerses.map((v) => {
                    const isHighlighted = highlightedVerses.includes(v.verse);
                    const isCopied = copiedVerseNum === v.verse;
                    return (
                      <div
                        key={v.verse}
                        className={`group p-2.5 rounded-2xl transition-all flex items-start gap-3 ${
                          isHighlighted ? 'bg-amber-100/60 dark:bg-amber-950/40' : 'hover:bg-[#FBF9F4] dark:hover:bg-[#0E1520]'
                        }`}
                      >
                        <span className="font-bold text-[#1E6F43] dark:text-emerald-400 text-xs min-w-[20px] pt-1 select-none">
                          {v.verse}
                        </span>
                        <p className="flex-1 font-sans">{v.text}</p>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 flex-shrink-0 pt-0.5">
                          <button
                            type="button"
                            onClick={() => toggleHighlight(v.verse)}
                            title="Highlight Verse"
                            className="text-xs p-1 rounded-md hover:bg-gray-200 text-gray-500"
                          >
                            🖍️
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyVerse(v)}
                            title="Copy Verse"
                            className="text-xs p-1 rounded-md hover:bg-gray-200 text-gray-500"
                          >
                            {isCopied ? '✓' : '📋'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Chapter Navigation Footer Buttons */}
                <div className="pt-6 border-t border-[#EBE6DC] dark:border-[#222F3E] flex items-center justify-between">
                  <button
                    type="button"
                    disabled={chapter <= 1}
                    onClick={() => setChapter((c) => Math.max(1, c - 1))}
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-[#1E6F43] dark:hover:text-emerald-400 disabled:opacity-40"
                  >
                    ← Previous Chapter
                  </button>

                  <span className="text-xs font-semibold text-slate-400">
                    Chapter {chapter} of {maxChapters}
                  </span>

                  <button
                    type="button"
                    disabled={chapter >= maxChapters}
                    onClick={() => setChapter((c) => Math.min(maxChapters, c + 1))}
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-[#1E6F43] dark:hover:text-emerald-400 disabled:opacity-40"
                  >
                    Next Chapter →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Feature 22: Floating Multi-Verse Selection & Copy Bar */}
        {highlightedVerses.length > 0 && (
          <div className="fixed bottom-6 inset-x-4 max-w-md mx-auto bg-[#0B192C] text-white rounded-3xl p-4 shadow-2xl border border-slate-700 flex items-center justify-between gap-3 z-40 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center">
                {highlightedVerses.length}
              </span>
              <span className="text-xs font-semibold">Verses Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopySelectedVerses}
                className="px-3.5 py-1.5 rounded-xl bg-[#1E6F43] hover:bg-[#175835] text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <span>📋</span>
                <span>Copy Formatted</span>
              </button>
              <button
                type="button"
                onClick={() => setHighlightedVerses([])}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
