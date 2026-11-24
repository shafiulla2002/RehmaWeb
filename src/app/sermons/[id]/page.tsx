'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { YoutubePlayer } from '@/components/ui/YoutubePlayer';
import { PdfDocViewer } from '@/components/ui/PdfDocViewer';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { churchCol } from '@/lib/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { getSermonBell, toggleSermonBell } from '@/lib/local-state';
import { useAuth } from '@/contexts/AuthContext';

interface SermonDetail {
  id: string;
  title: string;
  speaker?: string;
  category?: string;
  date?: string;
  youtubeId?: string;
  thumbnailUrl?: string;
  notesUrl?: string;
  notesType?: string;
  description?: string;
}

export default function SermonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = React.use(params);
  const sermonId = resolvedParams.id;
  const { user } = useAuth();

  const [sermon, setSermon] = useState<SermonDetail | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsSubscribed(getSermonBell(sermonId, user?.uid));

    let isCancelled = false;

    async function fetchSermon() {
      setIsLoading(true);
      setError(null);
      try {
        const sermonRef = doc(churchCol('sermons'), sermonId);
        const sermonSnap = await getDoc(sermonRef);

        if (!sermonSnap.exists()) {
          throw new Error('Sermon not found.');
        }

        const data = sermonSnap.data() as any;
        if (!isCancelled) {
          setSermon({
            id: sermonSnap.id,
            title: data.title || 'Untitled Sermon',
            speaker: data.speaker || 'Rhema Ministry',
            category: data.category || 'Sunday Service',
            date: data.date ? (typeof data.date === 'string' ? data.date : data.date.toDate?.()?.toISOString()) : undefined,
            youtubeId: data.youtubeId,
            thumbnailUrl: data.thumbnailUrl,
            notesUrl: data.notesUrl,
            notesType: data.notesType,
            description: data.description,
          });
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Error fetching sermon detail:', err);
          setError(err.message || 'Unable to load sermon details.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchSermon();

    return () => {
      isCancelled = true;
    };
  }, [sermonId, user]);

  function handleToggleBell() {
    const nextState = toggleSermonBell(sermonId, user?.uid);
    setIsSubscribed(nextState);
  }

  function exportStudyNotes() {
    if (!sermon) return;
    const content = `================================================
RHEMA CHRISTIAN MINISTRIES - SERMON STUDY OUTLINE
================================================
Title:    ${sermon.title}
Speaker:  ${sermon.speaker || 'Rhema Pastoral Team'}
Category: ${sermon.category || 'Sunday Service'}
Date:     ${sermon.date ? new Date(sermon.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Archive'}
================================================

SERMON OVERVIEW & SCRIPTURE OUTLINE:
${sermon.description || 'Full audio/video study message available in church archives.'}

Attached Notes File: ${sermon.notesUrl || 'None attached'}
================================================
© Rhema Christian Ministries. For personal study only.`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sermon.title.replace(/[^a-zA-Z0-9]/g, '_')}_Study_Notes.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell allowedRoles={['member', 'admin', 'superadmin', 'guest']}>
      <div className="space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/sermons"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-blue-600 transition-colors"
          >
            <span>←</span>
            <span>Back to Sermons Library</span>
          </Link>

          <button
            type="button"
            onClick={handleToggleBell}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              isSubscribed
                ? 'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-400'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <span>{isSubscribed ? '🔔 Subscribed' : '🔕 Notify Updates'}</span>
          </button>
        </div>

        {error && <ErrorBanner message={error} />}

        {isLoading ? (
          <CardSkeleton lines={6} />
        ) : !sermon ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-sm text-gray-500">
            Sermon not found.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                  {sermon.category}
                </span>
                {sermon.date && (
                  <span className="text-xs text-gray-400">
                    📅 {new Date(sermon.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                {sermon.title}
              </h1>
              {sermon.speaker && (
                <p className="text-sm font-semibold text-gray-600 mt-2 flex items-center gap-1.5">
                  <span>🎙️</span>
                  <span>{sermon.speaker}</span>
                </p>
              )}
              {sermon.description && (
                <p className="text-xs text-gray-600 mt-4 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                  {sermon.description}
                </p>
              )}
            </div>

            {/* Split Theater View: YouTube Video & Study Notes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Left Column: Video */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span>📺</span>
                  <span>Sermon Video Player</span>
                </h3>
                {sermon.youtubeId ? (
                  <YoutubePlayer videoId={sermon.youtubeId} title={sermon.title} />
                ) : (
                  <div className="bg-gray-50 rounded-xl p-12 text-center text-xs text-gray-500 border border-gray-100">
                    No video link attached to this sermon document.
                  </div>
                )}
              </div>

              {/* Right Column: Study Notes */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <span>📑</span>
                    <span>Study Notes &amp; Outlines</span>
                  </h3>
                  <button
                    type="button"
                    onClick={exportStudyNotes}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors"
                  >
                    <span>📥</span>
                    <span>Export Text (.txt)</span>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Pastoral study outlines, scriptures, and sermon slides.
                </p>

                {sermon.notesUrl ? (
                  <PdfDocViewer url={sermon.notesUrl} filename={`${sermon.title} Study Notes`} />
                ) : (
                  <div className="bg-gray-50 rounded-xl p-12 text-center text-xs text-gray-500 border border-gray-100">
                    No downloadable notes or PDF outlines uploaded for this message.
                  </div>
                )}
              </div>
            </div>

            <p className="text-[11px] text-gray-400 italic text-center">
              🔔 Sermon subscription status saved locally (Firebase write pending separate approval)
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
