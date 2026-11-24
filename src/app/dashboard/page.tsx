'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { useAuth } from '@/contexts/AuthContext';
import {
  getLivePromises,
  getLiveDailyVerses,
  getLiveEvents,
  getLiveSermons,
  formatFriendlyDate,
} from '@/lib/firestoreService';
import {
  getCurrentSlot,
  getIndicesForDate,
} from '@/lib/verse-slot';
import {
  Calendar as CalendarIcon,
  PlayCircle,
  HeartHandshake,
  Users,
  BookOpen,
  Music,
  Heart,
  ChevronRight,
  MoreVertical,
  Clock,
  MapPin,
  CheckCircle2,
} from 'lucide-react';

interface PromiseDoc {
  id: string;
  title?: string;
  content?: string;
  reference?: string;
  devotionalNote?: string;
  scheduledDate?: string;
}

interface EventDoc {
  id: string;
  title: string;
  date?: string;
  time?: string;
  location?: string;
  coverImageUrl?: string;
}

interface SermonDoc {
  id: string;
  title: string;
  speaker?: string;
  date?: string;
  duration?: string;
  coverUrl?: string;
  youtubeId?: string;
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [greeting, setGreeting] = useState('Good morning');
  const [todayPromise, setTodayPromise] = useState<PromiseDoc | null>(null);
  const [currentVerse, setCurrentVerse] = useState<{ text: string; ref: string } | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<EventDoc[]>([]);
  const [latestSermons, setLatestSermons] = useState<SermonDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Interactive UI states
  const [celebrationModalOpen, setCelebrationModalOpen] = useState(false);
  const [givingModalOpen, setGivingModalOpen] = useState(false);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [prayedForAnita, setPrayedForAnita] = useState(false);
  const [prayerCount, setPrayerCount] = useState(18);

  const memberFirstName = profile?.fullName ? profile.fullName.split(' ')[0] : 'Shafi';

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    let isCancelled = false;

    async function loadDashboardData() {
      setIsLoading(true);
      setError(null);
      try {
        // 1. Fetch Today's Promise (Live Firestore)
        let fetchedPromise: PromiseDoc | null = null;
        try {
          const rawPromises = await getLivePromises(5);
          if (rawPromises.length > 0) {
            const todayStr = new Date().toISOString().slice(0, 10);
            const found = rawPromises.find((p) => p.date === todayStr);
            const target = found || rawPromises[0];
            fetchedPromise = {
              id: target.id,
              title: target.pastor || '',
              content: target.verse || '',
              reference: target.reference || '',
              devotionalNote: target.devotionalNote || '',
              scheduledDate: target.date || '',
            };
          }
        } catch (e) {
          console.warn('Promises fetch skipped/empty:', e);
        }

        // 2. Fetch Daily Verse (Live Firestore)
        let fetchedVerse: { text: string; ref: string } | null = null;
        try {
          const rawVerses = await getLiveDailyVerses(4);
          if (rawVerses.length > 0) {
            fetchedVerse = {
              text: rawVerses[0].verseEn,
              ref: rawVerses[0].referenceEn,
            };
          }
        } catch (e) {
          console.warn('Verse fetch skipped/empty:', e);
        }

        // 3. Fetch Upcoming Events (Live Firestore)
        let eventsList: EventDoc[] = [];
        try {
          const rawEvents = await getLiveEvents(4);
          eventsList = rawEvents.map((e) => ({
            id: e.id,
            title: e.title || 'Church Gathering',
            date: e.date,
            time: e.time,
            location: e.location,
            coverImageUrl: e.bannerUrl,
          }));
        } catch (e) {
          console.warn('Events fetch skipped/empty:', e);
        }

        // 4. Fetch Latest Sermons (Live Firestore)
        let sermonsList: SermonDoc[] = [];
        try {
          const rawSermons = await getLiveSermons(2);
          sermonsList = rawSermons.map((s) => ({
            id: s.id,
            title: s.title || 'Sunday Worship Service',
            speaker: s.pastor,
            date: s.date,
            duration: s.duration || '45m',
            coverUrl: s.thumbnailUrl,
            youtubeId: s.youtubeId,
          }));
        } catch (e) {
          console.warn('Sermons fetch skipped/empty:', e);
        }

        if (!isCancelled) {
          setTodayPromise(fetchedPromise);
          setCurrentVerse(fetchedVerse);
          setUpcomingEvents(eventsList);
          setLatestSermons(sermonsList);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Error loading dashboard data:', err);
          setError('Unable to load some live updates. Local devotionals remain active.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadDashboardData();

    return () => {
      isCancelled = true;
    };
  }, []);

  const handlePrayToggle = () => {
    if (prayedForAnita) {
      setPrayerCount((c) => c - 1);
      setPrayedForAnita(false);
    } else {
      setPrayerCount((c) => c + 1);
      setPrayedForAnita(true);
    }
  };

  return (
    <AppShell allowedRoles={['member', 'admin', 'superadmin', 'guest']}>
      <div className="space-y-6">
        {/* SECTION 1: PERSONALIZED WELCOME */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="border-l-4 border-[#C89D35] pl-3.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#18221B] dark:text-white tracking-tight flex items-center gap-2">
              <span>👋</span>
              <span>
                {greeting}, <span className="text-[#1E6F43] dark:text-emerald-400">{memberFirstName}</span>
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-[#5C665F] dark:text-slate-400 mt-0.5">
              Stay connected with your church community.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setCelebrationModalOpen(true)}
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-900 dark:text-amber-200 border border-amber-300/40 text-xs font-bold transition-all flex items-center gap-2 shadow-xs"
          >
            <span>🎉</span>
            <span>Spiritual Blessings</span>
          </button>
        </div>

        {error && <ErrorBanner message={error} />}

        {/* SECTION 2: CHRISTIAN-THEMED HERO BANNER */}
        <div className="relative overflow-hidden rounded-3xl bg-[#092817] dark:bg-[#061C10] text-white shadow-md border border-emerald-900/60 min-h-[175px] flex items-center">
          {/* Background Stained Glass & Texture Pattern */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#082414] via-[#0E3B21]/90 to-transparent z-10" />

          {/* Stained Glass Window with Glowing Christian Cross Graphic on Right */}
          <div className="absolute right-0 top-0 bottom-0 w-2/5 sm:w-1/2 flex items-center justify-end overflow-hidden pointer-events-none opacity-90">
            <svg
              className="h-full w-auto max-w-none transform translate-x-4 scale-110"
              viewBox="0 0 400 240"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Window arch outline */}
              <path
                d="M100 240V120C100 50 160 10 220 10C280 10 340 50 340 120V240H100Z"
                fill="url(#stainedGlass)"
                stroke="#C89D35"
                strokeWidth="4"
              />
              {/* Cathedral radiant beams */}
              <circle cx="220" cy="110" r="80" fill="url(#sunGlow)" opacity="0.6" />
              {/* Center Holy Cross in stained glass */}
              <rect x="214" y="40" width="12" height="130" rx="3" fill="#FFE8A3" filter="drop-shadow(0 0 10px #FFD700)" />
              <rect x="180" y="75" width="80" height="12" rx="3" fill="#FFE8A3" filter="drop-shadow(0 0 10px #FFD700)" />
              {/* Stained glass leadlines */}
              <line x1="100" y1="120" x2="340" y2="120" stroke="#C89D35" strokeWidth="2" opacity="0.5" />
              <line x1="160" y1="10" x2="160" y2="240" stroke="#C89D35" strokeWidth="2" opacity="0.4" />
              <line x1="280" y1="10" x2="280" y2="240" stroke="#C89D35" strokeWidth="2" opacity="0.4" />
              {/* Foliage leaves on branch */}
              <path d="M50 180 C80 150 120 170 140 140 C110 170 80 190 50 180 Z" fill="#4ADE80" opacity="0.7" />
              <path d="M70 140 C100 110 130 130 150 100 C120 130 90 150 70 140 Z" fill="#22C55E" opacity="0.7" />
              <defs>
                <linearGradient id="stainedGlass" x1="100" y1="10" x2="340" y2="240" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#F59E0B" stopOpacity="0.4" />
                  <stop offset="0.5" stopColor="#10B981" stopOpacity="0.3" />
                  <stop offset="1" stopColor="#3B82F6" stopOpacity="0.4" />
                </linearGradient>
                <radialGradient id="sunGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(220 110) rotate(90) scale(80)">
                  <stop stopColor="#FEF08A" stopOpacity="0.8" />
                  <stop offset="1" stopColor="#F59E0B" stopOpacity="0" />
                </radialGradient>
              </defs>
            </svg>
          </div>

          {/* Banner Text Content */}
          <div className="relative z-20 px-6 sm:px-10 py-7 max-w-xl">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug">
              Grow in faith. Stay connected.
            </h2>
            <p className="font-serif italic text-xs sm:text-sm text-[#F7E7B4] mt-2.5 leading-relaxed opacity-95">
              &ldquo;Let all that you do be done in love.&rdquo; <span className="not-italic font-sans text-xs opacity-90">— 1 Corinthians 16:14</span>
            </p>
          </div>
        </div>

        {/* SECTION 3: TOP 4 METRIC SUMMARY CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Card 1: Upcoming Events */}
          <Link
            href="/events"
            className="p-4 rounded-2xl bg-white dark:bg-[#131C27] border border-[#EBE6DC] dark:border-[#222F3E] hover:border-[#1E6F43] transition-all flex items-center justify-between group shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900 text-[#1E6F43] flex items-center justify-center shrink-0">
                <CalendarIcon size={19} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#5C665F] dark:text-slate-400 leading-tight">
                  Upcoming Events
                </p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-extrabold text-[#18221B] dark:text-white">
                    {String(upcomingEvents.length).padStart(2, '0')}
                  </span>
                </div>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-400 group-hover:text-[#1E6F43] group-hover:translate-x-0.5 transition-all" />
          </Link>

          {/* Card 2: New Sermons */}
          <Link
            href="/sermons"
            className="p-4 rounded-2xl bg-white dark:bg-[#131C27] border border-[#EBE6DC] dark:border-[#222F3E] hover:border-[#C89D35] transition-all flex items-center justify-between group shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900 text-amber-600 flex items-center justify-center shrink-0">
                <PlayCircle size={19} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#5C665F] dark:text-slate-400 leading-tight">
                  New Sermons
                </p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-extrabold text-[#18221B] dark:text-white">
                    {String(latestSermons.length).padStart(2, '0')}
                  </span>
                </div>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
          </Link>

          {/* Card 3: Prayer Requests */}
          <Link
            href="/prayer"
            className="p-4 rounded-2xl bg-white dark:bg-[#131C27] border border-[#EBE6DC] dark:border-[#222F3E] hover:border-[#1E6F43] transition-all flex items-center justify-between group shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900 text-[#1E6F43] flex items-center justify-center shrink-0">
                <HeartHandshake size={19} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#5C665F] dark:text-slate-400 leading-tight">
                  Prayer Requests
                </p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-extrabold text-[#18221B] dark:text-white">
                    00
                  </span>
                </div>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-400 group-hover:text-[#1E6F43] group-hover:translate-x-0.5 transition-all" />
          </Link>

          {/* Card 4: Attendance */}
          <Link
            href="/attendance"
            className="p-4 rounded-2xl bg-white dark:bg-[#131C27] border border-[#EBE6DC] dark:border-[#222F3E] hover:border-[#C89D35] transition-all flex items-center justify-between group shadow-xs cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900 text-amber-600 flex items-center justify-center shrink-0">
                <Users size={19} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#5C665F] dark:text-slate-400 leading-tight">
                  Attendance
                </p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-extrabold text-[#18221B] dark:text-white">
                    86%
                  </span>
                </div>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>

        {/* SECTION 4: MIDDLE SECTION (2 COLUMNS) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT 6 COLS: UPCOMING EVENTS */}
          <div className="lg:col-span-6 bg-white dark:bg-[#131C27] rounded-3xl p-5 sm:p-6 border border-[#EBE6DC] dark:border-[#222F3E] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <CalendarIcon size={18} className="text-[#1E6F43]" />
                <h3 className="font-bold text-sm sm:text-base text-[#18221B] dark:text-white">
                  Upcoming Events
                </h3>
              </div>
              <Link
                href="/events"
                className="text-xs font-bold text-[#1E6F43] dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>View all</span>
                <span>→</span>
              </Link>
            </div>

            {/* Event Cards List */}
            <div className="space-y-3">
              {upcomingEvents.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] text-center text-xs text-[#5C665F] dark:text-slate-400">
                  No upcoming events scheduled at this time.
                </div>
              ) : (
                upcomingEvents.slice(0, 2).map((ev) => {
                  const evDate = ev.date ? new Date(ev.date) : new Date();
                  const dayName = isNaN(evDate.getTime()) ? 'SUN' : evDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                  const dayNum = isNaN(evDate.getTime()) ? '01' : String(evDate.getDate()).padStart(2, '0');
                  const monthName = isNaN(evDate.getTime()) ? 'Nov' : evDate.toLocaleDateString('en-US', { month: 'short' });

                  return (
                    <div key={ev.id} className="p-3.5 rounded-2xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] flex items-center justify-between gap-3 hover:border-[#1E6F43]/40 transition-colors">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-14 h-14 rounded-2xl bg-[#E8F3EC] dark:bg-[#142B1E] border border-emerald-200 dark:border-emerald-800/80 flex flex-col items-center justify-center shrink-0 leading-tight">
                          <span className="text-[10px] font-extrabold text-[#1E6F43] uppercase tracking-wider">{dayName}</span>
                          <span className="text-lg font-black text-[#18221B] dark:text-white">{dayNum}</span>
                          <span className="text-[10px] font-bold text-[#5C665F] dark:text-slate-400">{monthName}</span>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs sm:text-sm text-[#18221B] dark:text-white truncate">
                            {ev.title || 'Church Gathering'}
                          </h4>
                          <div className="flex items-center gap-1 text-[11px] text-[#5C665F] dark:text-slate-400 mt-1">
                            <Clock size={12} className="shrink-0" />
                            <span>{ev.time || '10:00 AM - 12:00 PM'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-[#5C665F] dark:text-slate-400 mt-0.5">
                            <MapPin size={12} className="shrink-0" />
                            <span className="truncate">{ev.location || 'Rhema Church Main Hall'}</span>
                          </div>
                        </div>
                      </div>
                      <Link
                        href={`/events/${ev.id}`}
                        className="px-3.5 py-1.5 rounded-full bg-[#E8F3EC] dark:bg-[#142B1E] text-[#1E6F43] dark:text-emerald-300 hover:bg-[#1E6F43] hover:text-white text-xs font-bold transition-all shrink-0"
                      >
                        View Details
                      </Link>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT 6 COLS: LATEST SERMONS */}
          <div className="lg:col-span-6 bg-white dark:bg-[#131C27] rounded-3xl p-5 sm:p-6 border border-[#EBE6DC] dark:border-[#222F3E] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <PlayCircle size={18} className="text-[#1E6F43]" />
                <h3 className="font-bold text-sm sm:text-base text-[#18221B] dark:text-white">
                  Latest Sermons
                </h3>
              </div>
              <Link
                href="/sermons"
                className="text-xs font-bold text-[#1E6F43] dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>View all</span>
                <span>→</span>
              </Link>
            </div>

            {/* 2 Sermon Cards Side-by-Side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {latestSermons.length === 0 ? (
                <div className="col-span-1 sm:col-span-2 p-6 rounded-2xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] text-center text-xs text-[#5C665F] dark:text-slate-400">
                  No sermons published yet.
                </div>
              ) : (
                latestSermons.slice(0, 2).map((sermon) => {
                  const formattedDate = sermon.date ? formatFriendlyDate(sermon.date) : 'Recent';
                  const bgImage = sermon.coverUrl || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80';
                  return (
                    <Link
                      key={sermon.id}
                      href="/sermons"
                      className="group rounded-2xl overflow-hidden border border-[#EBE6DC] dark:border-[#222F3E] bg-[#FBF9F4] dark:bg-[#0E1520] hover:shadow-md transition-all block"
                    >
                      <div className="relative h-32 bg-gradient-to-t from-slate-900 to-amber-900 overflow-hidden flex items-center justify-center">
                        <div className="absolute inset-0 bg-cover bg-center opacity-60 group-hover:scale-105 transition-transform duration-300" style={{ backgroundImage: `url('${bgImage}')` }} />
                        <div className="relative z-10 w-9 h-9 rounded-full bg-black/50 backdrop-blur-xs text-white flex items-center justify-center group-hover:bg-[#1E6F43] transition-colors shadow-md">
                          <PlayCircle size={20} />
                        </div>
                        <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                          {sermon.duration || '45m'}
                        </span>
                      </div>
                      <div className="p-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-xs text-[#18221B] dark:text-white group-hover:text-[#1E6F43] transition-colors truncate">
                            {sermon.title || 'Sunday Worship Service'}
                          </h4>
                          <MoreVertical size={14} className="text-slate-400" />
                        </div>
                        <p className="text-[11px] text-[#5C665F] dark:text-slate-400 mt-1">
                          {formattedDate} {sermon.speaker ? `· ${sermon.speaker}` : ''}
                        </p>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* SECTION 5: BOTTOM SECTION (3 COLUMNS) */}
        <div id="prayer-wall" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 items-stretch">
          {/* COLUMN 1 (5 COLS): PRAYER WALL */}
          <div className="lg:col-span-5 bg-white dark:bg-[#131C27] rounded-3xl p-5 sm:p-6 border border-[#EBE6DC] dark:border-[#222F3E] shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <HeartHandshake size={18} className="text-[#1E6F43]" />
                  <h3 className="font-bold text-sm sm:text-base text-[#18221B] dark:text-white">
                    Prayer Wall
                  </h3>
                </div>
                <Link
                  href="/prayer"
                  className="text-xs font-bold text-[#1E6F43] dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <span>View all</span>
                  <span>→</span>
                </Link>
              </div>

              {/* Prayer Card */}
              <div className="p-3.5 rounded-2xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center justify-center">
                      AM
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h5 className="font-bold text-xs text-[#18221B] dark:text-white">Anita Mary</h5>
                        <span className="text-[9px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/80 px-1 rounded">
                          Sample
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">2 hours ago</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[#18221B] dark:text-slate-200 leading-relaxed font-sans">
                  Please pray for my father&apos;s health. He is undergoing treatment and needs God&apos;s healing and strength. 🙏
                </p>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-[#5C665F] dark:text-slate-400 font-medium flex items-center gap-1">
                    <span>❤️</span>
                    <span>{prayerCount} Prayers</span>
                  </span>

                  <button
                    type="button"
                    onClick={handlePrayToggle}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                      prayedForAnita
                        ? 'bg-[#1E6F43] text-white shadow-xs'
                        : 'bg-[#E8F3EC] dark:bg-[#142B1E] text-[#1E6F43] dark:text-emerald-300 hover:bg-[#1E6F43] hover:text-white'
                    }`}
                  >
                    <span>🙏</span>
                    <span>{prayedForAnita ? 'Prayed' : 'Pray for this'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMN 2 (3 COLS): QUICK ACCESS */}
          <div className="lg:col-span-3 bg-white dark:bg-[#131C27] rounded-3xl p-5 sm:p-6 border border-[#EBE6DC] dark:border-[#222F3E] shadow-xs flex flex-col justify-between">
            <div className="flex items-center gap-2 pb-3">
              <BookOpen size={18} className="text-[#1E6F43]" />
              <h3 className="font-bold text-sm sm:text-base text-[#18221B] dark:text-white">
                Quick Access
              </h3>
            </div>

            {/* 4 Square Tiles Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/bible"
                className="p-3.5 rounded-2xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] hover:border-[#1E6F43] hover:shadow-xs transition-all flex flex-col items-center justify-center text-center group"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#1E6F43] flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  <BookOpen size={17} />
                </div>
                <span className="text-xs font-bold text-[#18221B] dark:text-white">Bible</span>
              </Link>

              <Link
                href="/songs"
                className="p-3.5 rounded-2xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] hover:border-[#1E6F43] hover:shadow-xs transition-all flex flex-col items-center justify-center text-center group"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#1E6F43] flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  <Music size={17} />
                </div>
                <span className="text-xs font-bold text-[#18221B] dark:text-white">Songs</span>
              </Link>

              <Link
                href="/giving"
                className="p-3.5 rounded-2xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] hover:border-[#1E6F43] hover:shadow-xs transition-all flex flex-col items-center justify-center text-center group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#1E6F43] flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  <Heart size={17} />
                </div>
                <span className="text-xs font-bold text-[#18221B] dark:text-white">Online Giving</span>
              </Link>

              <Link
                href="/attendance"
                className="p-3.5 rounded-2xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] hover:border-[#1E6F43] hover:shadow-xs transition-all flex flex-col items-center justify-center text-center group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#1E6F43] flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  <CalendarIcon size={17} />
                </div>
                <span className="text-xs font-bold text-[#18221B] dark:text-white">Attendance</span>
              </Link>
            </div>
          </div>

          {/* COLUMN 3 (4 COLS): DAILY SCRIPTURE */}
          <div className="lg:col-span-4 rounded-3xl p-5 sm:p-6 bg-[#EBF4EE] dark:bg-[#122419] border border-[#D5E8DC] dark:border-[#1E3B29] shadow-xs flex flex-col justify-between relative overflow-hidden">
            {/* Background Olive Leaf Branch Artwork */}
            <div className="absolute right-0 bottom-0 pointer-events-none opacity-40">
              <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                <path d="M120 120 C90 80 80 40 100 0 C70 40 80 80 120 120 Z" fill="#1E6F43" />
                <path d="M110 90 C80 60 70 30 85 5 C65 30 75 60 110 90 Z" fill="#2E8B57" />
                <path d="M90 110 C60 80 50 50 65 25 C45 50 55 80 90 110 Z" fill="#1E6F43" />
              </svg>
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-2 pb-3">
                <BookOpen size={18} className="text-[#1E6F43]" />
                <h3 className="font-bold text-sm sm:text-base text-[#18221B] dark:text-white">
                  Daily Scripture
                </h3>
              </div>

              <div className="pt-2">
                <p className="font-serif italic text-sm sm:text-base text-[#18221B] dark:text-white leading-relaxed">
                  &ldquo;{currentVerse?.text || todayPromise?.content || 'The Lord is my shepherd; I lack nothing.'}&rdquo;
                </p>
                <p className="font-sans font-bold text-xs text-[#1E6F43] dark:text-emerald-400 mt-3 flex items-center gap-1.5">
                  <span className="w-5 h-[1.5px] bg-[#C89D35]" />
                  <span>{currentVerse?.ref || todayPromise?.reference || 'Psalm 23:1'}</span>
                </p>
              </div>
            </div>

            <div className="pt-4 relative z-10">
              <Link
                href="/verse"
                className="text-xs font-bold text-[#1E6F43] dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
              >
                <span>Read Full Chapter</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* CELEBRANT CONFETTI MODAL (Retained & Elevated) */}
        {celebrationModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-[#131C27] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl text-center space-y-4 border border-[#EBE6DC] dark:border-[#222F3E]">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
                🎂
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-900">
                  Church Celebrations &bull; Grace &amp; Peace
                </span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white pt-2">
                  Heavenly Blessings on Your Journey!
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed max-w-sm mx-auto">
                  &ldquo;The LORD bless you and keep you; The LORD make His face shine upon you, And be gracious to you.&rdquo;
                  <span className="block font-semibold text-gray-800 dark:text-gray-100 mt-1">— Numbers 6:24-25</span>
                </p>
              </div>

              <div className="p-3 bg-[#FBF9F4] dark:bg-[#0E1520] rounded-2xl border border-[#EFECE6] dark:border-[#1E2B3A] text-xs text-gray-600 dark:text-gray-300 text-left space-y-1">
                <span className="font-semibold text-gray-800 dark:text-gray-200 block">Congregational Blessing:</span>
                <span>
                  May the peace of Christ rule in your heart this season. Our pastoral team and church family hold you in earnest prayer.
                </span>
                <span className="block text-[10px] text-gray-400 pt-1 italic">
                  🔒 Liturgical Devotional Mode: Member DOBs and private birthday records are never queried from Firestore under church privacy policy.
                </span>
              </div>

              <button
                type="button"
                onClick={() => setCelebrationModalOpen(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#1E6F43] hover:bg-[#175835] text-white text-xs font-bold transition-colors shadow-xs"
              >
                Amen &bull; Close Blessing
              </button>
            </div>
          </div>
        )}

        {/* ONLINE GIVING MODAL */}
        {givingModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-[#131C27] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#EBE6DC] dark:border-[#222F3E] space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-[#1E6F43] flex items-center justify-center">
                  <Heart size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900 dark:text-white">Kingdom Stewardship</h3>
                  <p className="text-xs text-gray-500">Tithe, Missions &amp; Church Offerings</p>
                </div>
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                &ldquo;Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver.&rdquo;
                <span className="block font-semibold text-gray-800 dark:text-gray-200 mt-1">— 2 Corinthians 9:7</span>
              </p>

              <div className="p-4 rounded-2xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] space-y-2 text-xs">
                <div className="flex justify-between font-semibold">
                  <span>Church Bank Transfer (NEFT/IMPS):</span>
                  <span className="text-[#1E6F43]">Active</span>
                </div>
                <p className="font-mono text-[11px] text-gray-700 dark:text-gray-300">
                  Account: Rhema Christian Ministry<br />
                  A/C No: 987654321098<br />
                  IFSC: HDFC0001234 (Main Branch)
                </p>
              </div>

              <button
                type="button"
                onClick={() => setGivingModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-[#1E6F43] hover:bg-[#175835] text-white font-bold text-xs transition-colors shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* ATTENDANCE CHECK-IN MODAL */}
        {attendanceModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-[#131C27] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#EBE6DC] dark:border-[#222F3E] space-y-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto">
                <Users size={28} />
              </div>

              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Congregation Attendance</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Sunday Service &amp; Fellowship Gatherings
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-left space-y-1.5 text-xs text-emerald-900 dark:text-emerald-200">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>Sunday Service Verified</span>
                </div>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                  Current Attendance Rate: <strong className="text-emerald-700 dark:text-emerald-100">86%</strong> (18 / 21 Gatherings Attended)
                </p>
              </div>

              <button
                type="button"
                onClick={() => setAttendanceModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-[#1E6F43] hover:bg-[#175835] text-white font-bold text-xs transition-colors shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
