'use client';

import React, { useEffect, useState, useRef } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { YoutubePlayer } from '@/components/ui/YoutubePlayer';
import { CardSkeleton, GridSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { getLivePromises, LivePromise } from '@/lib/firestoreService';
import { toPng } from 'html-to-image';

interface PromiseItem {
  id: string;
  title?: string;
  titleTe?: string;
  content: string;
  contentTe?: string;
  reference: string;
  referenceTe?: string;
  devotionalNote?: string;
  youtubeId?: string;
  thumbnailUrl?: string;
  scheduledDate: string;
  status: string;
}

export default function PromisesPage() {
  const [promises, setPromises] = useState<PromiseItem[]>([]);
  const [selectedPromise, setSelectedPromise] = useState<PromiseItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const heroCardRef = useRef<HTMLDivElement>(null);

  function toggleAudioNarration() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Speech audio narration is not supported in this browser.');
      return;
    }
    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }
    if (!selectedPromise) return;

    window.speechSynthesis.cancel();
    const textToRead = `${selectedPromise.title ? selectedPromise.title + '. ' : ''}${selectedPromise.content}. Reference: ${selectedPromise.reference}.${selectedPromise.devotionalNote ? ' Pastoral reflection: ' + selectedPromise.devotionalNote : ''}`;
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = 0.95;
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);
    window.speechSynthesis.speak(utterance);
    setIsPlayingAudio(true);
  }

  useEffect(() => {
    let isCancelled = false;

    async function loadPromises() {
      setIsLoading(true);
      setError(null);
      try {
        const raw = await getLivePromises(50);
        const list: PromiseItem[] = raw.map((p) => ({
          id: p.id,
          title: p.pastor || '',
          content: p.verse || '',
          contentTe: p.verseTelugu || '',
          reference: p.reference || '',
          referenceTe: p.referenceTe || '',
          devotionalNote: p.devotionalNote || '',
          youtubeId: p.youtubeId || '',
          thumbnailUrl: p.imageUrl || '',
          scheduledDate: p.date || '',
          status: p.status || 'Published',
        }));

        if (!isCancelled) {
          setPromises(list);
          const todayStr = new Date().toISOString().slice(0, 10);
          const todayMatch = list.find((p) => p.scheduledDate === todayStr);
          setSelectedPromise(todayMatch || list[0] || null);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Failed to load promises:', err);
          setError('Unable to load promises. Please verify your connection.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadPromises();

    return () => {
      isCancelled = true;
    };
  }, []);

  async function downloadCard() {
    if (!heroCardRef.current || !selectedPromise) return;
    setIsDownloading(true);
    try {
      const dataUrl = await toPng(heroCardRef.current, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `rhema_promise_${selectedPromise.scheduledDate || 'today'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate promise card PNG:', err);
    } finally {
      setIsDownloading(false);
    }
  }

  const filteredPromises = promises.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      (p.title && p.title.toLowerCase().includes(term)) ||
      (p.content && p.content.toLowerCase().includes(term)) ||
      (p.reference && p.reference.toLowerCase().includes(term)) ||
      (p.scheduledDate && p.scheduledDate.includes(term))
    );
  });

  return (
    <AppShell allowedRoles={['member', 'admin', 'superadmin', 'guest']}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Daily Promises &amp; Video Devotionals
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              God&apos;s unfailing promises for your life, delivered daily from the altar
            </p>
          </div>

          {selectedPromise && (
            <div className="flex items-center gap-2 self-start flex-wrap">
              <button
                type="button"
                onClick={toggleAudioNarration}
                className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-xs font-semibold px-4 py-2.5 rounded-2xl transition-colors flex items-center gap-1.5 shadow-xs"
                title="Listen to promise narration aloud"
              >
                <span>{isPlayingAudio ? '⏹️' : '🔊'}</span>
                <span>{isPlayingAudio ? 'Stop Reading' : 'Listen Aloud'}</span>
              </button>
              <button
                type="button"
                onClick={downloadCard}
                disabled={isDownloading}
                className="bg-[#1E6F43] hover:bg-[#175835] disabled:opacity-50 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl transition-colors flex items-center gap-2 shadow-xs"
              >
                <span>{isDownloading ? '⏳' : '📥'}</span>
                <span>Download Promise Card</span>
              </button>
            </div>
          )}
        </div>

        {error && <ErrorBanner message={error} />}

        {isLoading ? (
          <div className="space-y-6">
            <CardSkeleton lines={6} />
            <GridSkeleton count={4} />
          </div>
        ) : !selectedPromise ? (
          <EmptyState
            icon="✨"
            title="No daily promises found"
            subtitle="Published daily promises will appear here once scheduled by pastoral administration."
          />
        ) : (
          <div className="space-y-8">
            {/* Featured Hero: Split Layout (Scripture Card & YouTube Player) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              {/* Left: Scripture Card with Export Ref */}
              <div
                ref={heroCardRef}
                className="rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-amber-500 via-orange-500 to-amber-700 text-white shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="text-xs uppercase font-bold tracking-wider bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                      Daily Promise · {selectedPromise.scheduledDate}
                    </span>
                    <span className="text-xl">✨</span>
                  </div>

                  <p className="text-lg sm:text-xl font-bold leading-relaxed mb-3">
                    &ldquo;{selectedPromise.content}&rdquo;
                  </p>

                  {selectedPromise.contentTe && (
                    <p className="text-sm sm:text-base opacity-90 font-medium leading-relaxed mb-4">
                      &ldquo;{selectedPromise.contentTe}&rdquo;
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-white/20 mt-4 flex items-center justify-between">
                  <p className="text-sm font-bold tracking-wide">
                    — {selectedPromise.reference}
                  </p>
                  {selectedPromise.referenceTe && (
                    <p className="text-xs opacity-90">
                      ({selectedPromise.referenceTe})
                    </p>
                  )}
                </div>
              </div>

              {/* Right: 1-Minute Devotional Video or Devotional Note */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">🎥</span>
                    <h3 className="text-sm font-bold text-gray-900">
                      1-Minute Video Devotional
                    </h3>
                  </div>

                  {selectedPromise.youtubeId ? (
                    <YoutubePlayer
                      videoId={selectedPromise.youtubeId}
                      title={selectedPromise.title || 'Devotional Video'}
                      className="mb-4"
                    />
                  ) : (
                    <div className="bg-gray-50 rounded-xl p-8 text-center text-xs text-gray-500 mb-4 border border-gray-100">
                      No video attached for this devotional date.
                    </div>
                  )}

                  {selectedPromise.devotionalNote && (
                    <div>
                      <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Pastor&apos;s Devotional Note
                      </h4>
                      <p className="text-xs text-gray-600 leading-relaxed bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                        {selectedPromise.devotionalNote}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Archive Section */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📚</span>
                  <h3 className="text-base font-bold text-gray-900">
                    Promise Archive ({filteredPromises.length})
                  </h3>
                </div>

                <input
                  type="text"
                  placeholder="Search by scripture, book, or date..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-xs rounded-xl px-3.5 py-2 w-full sm:w-72 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {filteredPromises.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-8">
                  No archived promises match your search.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                  {filteredPromises.map((p) => {
                    const isCurrent = selectedPromise.id === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPromise(p)}
                        className={`p-4 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                          isCurrent
                            ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-500 shadow-xs'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-xs'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500 mb-1.5">
                            <span>📅 {p.scheduledDate}</span>
                            {p.youtubeId && <span className="text-red-500">▶ Video</span>}
                          </div>
                          <p className="text-xs text-gray-800 line-clamp-3 leading-relaxed">
                            &ldquo;{p.content}&rdquo;
                          </p>
                        </div>
                        <p className="text-xs font-bold text-blue-700 mt-3 pt-2 border-t border-gray-100">
                          {p.reference}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
