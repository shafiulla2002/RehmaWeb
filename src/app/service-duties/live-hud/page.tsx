'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { db } from '@/lib/firebase';
import { collection, getDocs, onSnapshot, query, limit } from 'firebase/firestore';
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  Clock,
  Music,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  ChevronRight,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface ServiceSegment {
  id: string;
  name: string;
  durationMinutes: number;
  leader: string;
  notes?: string;
}

const DEFAULT_SEGMENTS: ServiceSegment[] = [
  { id: 's1', name: 'Opening Prayer & Prelude', durationMinutes: 5, leader: 'Bro. David' },
  { id: 's2', name: 'Praise & Worship Set (4 Songs)', durationMinutes: 25, leader: 'Worship Team & Choir' },
  { id: 's3', name: 'Pastoral Welcome & Tithes Offering', durationMinutes: 10, leader: 'Pastor Sarah' },
  { id: 's4', name: 'Scripture Reading (Romans 8:28-39)', durationMinutes: 5, leader: 'Sis. Rachel' },
  { id: 's5', name: 'Sermon: Unshakeable Kingdom', durationMinutes: 40, leader: 'Senior Pastor John' },
  { id: 's6', name: 'Altar Call & Benediction', durationMinutes: 15, leader: 'Pastoral Team' },
];

export default function LiveStageHUDPage() {
  const [segments, setSegments] = useState<ServiceSegment[]>(DEFAULT_SEGMENTS);
  const [currentSegmentIdx, setCurrentSegmentIdx] = useState(0);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [secondsRemaining, setSecondsRemaining] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fontSizeLevel, setFontSizeLevel] = useState(2); // 1: normal, 2: large, 3: extra-large
  const [planTitle, setPlanTitle] = useState('Rhema Sanctuary Service');

  // Real-time listener for active service plan in canonical path: Rhema Church/rhema/servicePlans
  useEffect(() => {
    const colRef = collection(db, 'Rhema Church', 'rhema', 'servicePlans');
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const docData = snapshot.docs[0].data();
          setPlanTitle(docData.serviceTitle || 'Rhema Sanctuary Service');

          if (Array.isArray(docData.runSheet) && docData.runSheet.length > 0) {
            const parsed: ServiceSegment[] = docData.runSheet.map((item: any, idx: number) => ({
              id: `seg-${idx}`,
              name: item.program || `Segment ${idx + 1}`,
              durationMinutes: item.durationMinutes || 10,
              leader: item.responsiblePerson || 'Minister on Duty',
              notes: item.notes,
            }));
            setSegments(parsed);
            setSecondsRemaining((parsed[0]?.durationMinutes || 15) * 60);
          }
        }
      },
      (err) => {
        console.warn('Live HUD Firestore subscription notice:', err);
      }
    );

    return () => unsubscribe();
  }, []);

  // Live Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Countdown Timer
  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const currentSeg = segments[currentSegmentIdx] || segments[0];
  const nextSeg = segments[currentSegmentIdx + 1] || null;

  const fontClasses = [
    'text-xl sm:text-2xl',
    'text-2xl sm:text-4xl',
    'text-3xl sm:text-5xl font-black',
  ][fontSizeLevel - 1];

  return (
    <ProtectedRoute allowedRoles={['member', 'admin', 'superadmin']}>
      <div className="min-h-screen bg-black text-white font-mono select-none flex flex-col justify-between p-4 sm:p-8">
        {/* TOP HEADER CONTROLS */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/service-duties"
              className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-sans font-bold flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Exit HUD</span>
            </Link>
            <div className="hidden sm:block">
              <span className="text-[10px] text-zinc-500 font-sans uppercase tracking-widest block">
                Active Service
              </span>
              <span className="text-xs text-amber-400 font-bold truncate max-w-[200px] block">
                {planTitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Live Clock */}
            <div className="text-xl sm:text-2xl font-black tracking-widest text-zinc-200">
              {currentTimeStr}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFontSizeLevel((prev) => (prev % 3) + 1)}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 font-sans"
              >
                Text Size ({fontSizeLevel})
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* CENTER STAGE FOCUS AREA */}
        <div className="my-auto py-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-sans uppercase tracking-widest font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>CURRENT PROGRAM &bull; SEGMENT {currentSegmentIdx + 1} OF {segments.length}</span>
          </div>

          <h2 className={`${fontClasses} tracking-tight text-white max-w-4xl mx-auto leading-tight transition-all`}>
            {currentSeg?.name}
          </h2>

          <div className="text-zinc-400 text-base sm:text-xl font-sans">
            Leader on Platform: <span className="text-amber-400 font-bold">{currentSeg?.leader}</span>
          </div>

          {/* MASSIVE COUNTDOWN DISPLAY */}
          <div className="pt-4">
            <div
              className={`text-6xl sm:text-8xl md:text-9xl font-black tracking-widest font-mono ${
                secondsRemaining <= 120
                  ? 'text-red-500 animate-pulse'
                  : secondsRemaining <= 300
                  ? 'text-amber-400'
                  : 'text-zinc-100'
              }`}
            >
              {formatTimer(secondsRemaining)}
            </div>
            <div className="text-xs text-zinc-500 font-sans uppercase tracking-widest mt-2">
              Time Remaining in Segment
            </div>
          </div>

          {/* Quick HUD Play/Pause & Reset */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 font-sans font-bold flex items-center gap-1.5"
            >
              {isTimerRunning ? <Pause size={14} /> : <Play size={14} />}
              <span>{isTimerRunning ? 'Pause Clock' : 'Resume Clock'}</span>
            </button>
            <button
              onClick={() => {
                setSecondsRemaining((currentSeg?.durationMinutes || 15) * 60);
              }}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 font-sans flex items-center gap-1.5"
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* BOTTOM HUD FOOTER: NEXT UP & CUES */}
        <div className="border-t border-zinc-800 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans">
          <div className="space-y-0.5">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest block font-bold">
              UP NEXT
            </span>
            <div className="text-sm font-bold text-zinc-300 flex items-center gap-2">
              <span>{nextSeg ? nextSeg.name : 'Service Benediction / Dismissal'}</span>
              {nextSeg && (
                <span className="text-xs text-zinc-500 font-mono">
                  ({nextSeg.durationMinutes} mins &bull; {nextSeg.leader})
                </span>
              )}
            </div>
          </div>

          {/* Navigation through segments */}
          <div className="flex items-center gap-2">
            <button
              disabled={currentSegmentIdx === 0}
              onClick={() => {
                const prevIdx = currentSegmentIdx - 1;
                setCurrentSegmentIdx(prevIdx);
                setSecondsRemaining((segments[prevIdx]?.durationMinutes || 10) * 60);
              }}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none text-xs text-zinc-300 font-bold"
            >
              Prev Segment
            </button>
            <button
              disabled={currentSegmentIdx >= segments.length - 1}
              onClick={() => {
                const nextIdx = currentSegmentIdx + 1;
                setCurrentSegmentIdx(nextIdx);
                setSecondsRemaining((segments[nextIdx]?.durationMinutes || 10) * 60);
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:pointer-events-none text-xs text-zinc-950 font-bold flex items-center gap-1"
            >
              <span>Next Segment</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
