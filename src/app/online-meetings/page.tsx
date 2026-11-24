'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import {
  Video,
  Tv,
  Calendar,
  Clock,
  ExternalLink,
  Copy,
  CheckCircle2,
  Users,
  Shield,
  Sparkles,
  Play,
  Share2,
  X,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { getLiveOnlineMeetings, LiveOnlineMeeting } from '@/lib/firestoreService';

export default function OnlineMeetingsPage() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<LiveOnlineMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'meetings' | 'livestream'>('meetings');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const colRef = collection(db, 'Rhema Church', 'rhema', 'online_meetings');
    const unsub = onSnapshot(
      colRef,
      (snap) => {
        if (!snap.empty) {
          const loaded: LiveOnlineMeeting[] = snap.docs.map((d) => {
            const data = d.data();
            const rawPlatform = data.provider || data.platform || data.meetingType || 'Google Meet';
            let cleanPlatform: LiveOnlineMeeting['platform'] = 'Google Meet';
            const pLower = String(rawPlatform).toLowerCase();
            if (pLower.includes('zoom')) cleanPlatform = 'Zoom';
            else if (pLower.includes('youtube') || pLower.includes('live')) cleanPlatform = 'YouTube Live';
            else if (pLower.includes('meet')) cleanPlatform = 'Google Meet';

            const timeLabel = data.startTimeLabel
              ? `${data.startTimeLabel}${data.endTimeLabel ? ' – ' + data.endTimeLabel : ''}`
              : data.time || 'Schedule announced';

            return {
              id: d.id,
              title: data.title || data.topic || 'Church Online Meeting',
              topic: data.topic || data.title || '',
              platform: cleanPlatform,
              meetingUrl: data.meetingUrl || data.link || '',
              link: data.link || data.meetingUrl || '',
              meetingId: data.meetingId || '',
              passcode: data.passcode || '',
              status: (data.status === 'live' || data.status === 'Live (Simulated)' ? 'live' : 'upcoming') as any,
              date: data.date || data.meetingDate || 'Upcoming',
              time: timeLabel,
              startTimeLabel: data.startTimeLabel || '',
              endTimeLabel: data.endTimeLabel || '',
              description: data.description || '',
              isFeatured: Boolean(data.isFeatured),
              attendeeCount: data.attendeeCount || 0,
            };
          });
          setMeetings(loaded);
          setLoading(false);
        } else {
          // Fallback to initial service fetch
          getLiveOnlineMeetings('rhema')
            .then((res) => {
              setMeetings(res);
              setLoading(false);
            })
            .catch(() => {
              setMeetings([]);
              setLoading(false);
            });
        }
      },
      (err) => {
        console.error('[OnlineMeetingsPage] onSnapshot error:', err);
        setError('Unable to load online meetings in real time.');
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const handleJoinMeeting = async (meet: LiveOnlineMeeting) => {
    if (user?.uid) {
      try {
        await setDoc(
          doc(db, 'Rhema Church', 'rhema', 'online_meetings', meet.id, 'attendees', user.uid),
          {
            memberId: user.uid,
            name: user.displayName || 'Member',
            joinedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (err) {
        // Attendance logging silent fallback
      }
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    if (navigator.clipboard && text) {
      await navigator.clipboard.writeText(text);
      setCopiedId(text);
      setNotification(`${label} copied to clipboard!`);
      setTimeout(() => {
        setCopiedId(null);
        setNotification(null);
      }, 3000);
    }
  };

  const liveMeetings = meetings.filter((m) => m.status === 'live');
  const scheduledMeetings = meetings.filter((m) => m.status !== 'live');

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Banner with Matthew 18:20 */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B192C] via-[#132A4A] to-[#1E6F43] text-white p-6 md:p-8 shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-semibold backdrop-blur-xs border border-amber-400/30">
                <Video size={14} />
                <span>Online Sanctuary &amp; Fellowship</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-serif font-extrabold tracking-tight">
                Connect Virtually Where Two or Three Gather
              </h1>
              <p className="text-slate-200 text-xs md:text-sm leading-relaxed">
                &ldquo;For where two or three gather in my name, there am I with them.&rdquo;
                — <span className="text-amber-300 font-semibold">Matthew 18:20</span>
              </p>
              <div className="pt-1 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/10 text-[11px] text-amber-200 border border-white/15">
                  <Shield size={12} className="text-amber-300" />
                  <span>Rhema Official Live Broadcasts &amp; Fellowship Sanctuary</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('livestream')}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold text-sm shadow-lg flex items-center gap-2 transition-all cursor-pointer"
              >
                <Tv size={16} />
                <span>YouTube Live Stream</span>
              </button>
            </div>
          </div>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{notification}</span>
            </div>
            <button type="button" onClick={() => setNotification(null)}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* ERROR STATE */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 flex items-center justify-between gap-3 text-red-700 dark:text-red-300 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900 hover:bg-red-200 text-red-800 dark:text-red-200 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw size={12} />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex items-center gap-3 border-b border-[#EBE6DC] dark:border-[#222F3E] pb-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('meetings')}
            className={`pb-2 px-1 border-b-2 transition-all cursor-pointer ${
              activeTab === 'meetings'
                ? 'border-[#1E6F43] text-[#1E6F43] dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Virtual Rooms &amp; Gatherings ({meetings.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('livestream')}
            className={`pb-2 px-1 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'livestream'
                ? 'border-[#1E6F43] text-[#1E6F43] dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span>Sunday YouTube Live Stream</span>
          </button>
        </div>

        {/* Tab 1: Virtual Meetings List */}
        {activeTab === 'meetings' && (
          <div className="space-y-6">
            {/* SKELETON LOADER */}
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="bg-white dark:bg-[#131C27] rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] p-5 animate-pulse space-y-4"
                  >
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-1/3" />
                    <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4" />
                    <div className="space-y-2">
                      <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded-md w-1/2" />
                      <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded-md w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* EMPTY STATE */}
            {!loading && meetings.length === 0 && (
              <div className="p-8 rounded-3xl bg-white dark:bg-[#131C27] border border-[#EBE6DC] dark:border-[#222F3E] text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Video size={24} />
                </div>
                <h4 className="font-bold text-sm text-[#18221B] dark:text-white">
                  No Active Online Meetings Scheduled
                </h4>
                <p className="text-xs text-[#5C665F] dark:text-slate-400 max-w-sm mx-auto">
                  Live broadcasts and online fellowship meetings will appear here as they are published by church pastoral leadership.
                </p>
              </div>
            )}

            {/* LIVE MEETINGS FIRST */}
            {!loading && meetings.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {meetings.map((meet) => {
                  const isLive = meet.status === 'live';
                  const hasUrl = Boolean(meet.link || meet.meetingUrl);
                  const validUrl = meet.link || meet.meetingUrl || '#';

                  return (
                    <div
                      key={meet.id}
                      className={`bg-white dark:bg-[#131C27] rounded-2xl border ${
                        isLive
                          ? 'border-red-500/60 dark:border-red-500/60 shadow-red-500/10'
                          : 'border-[#EBE6DC] dark:border-[#222F3E]'
                      } p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              meet.platform === 'Google Meet'
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                : meet.platform === 'Zoom'
                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                                : 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                            }`}
                          >
                            {meet.platform}
                          </span>

                          {isLive ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 text-[10px] font-extrabold uppercase tracking-wider animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                              <span>Live Now</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 capitalize">
                              {meet.status || 'Scheduled'}
                            </span>
                          )}
                        </div>

                        <h3 className="font-serif font-bold text-base text-slate-900 dark:text-white">
                          {meet.title}
                        </h3>

                        <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Clock size={13} className="text-[#1E6F43] shrink-0" />
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {meet.time}
                            </span>
                          </div>
                          {(meet.host || meet.teacherName) && (
                            <div className="flex items-center gap-1.5">
                              <Users size={13} className="text-[#1E6F43] shrink-0" />
                              <span>Minister: {meet.teacherName || meet.host}</span>
                            </div>
                          )}
                        </div>

                        {meet.description ? (
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                            {meet.description}
                          </p>
                        ) : null}
                      </div>

                      <div className="pt-4 mt-4 border-t border-[#F0EBE0] dark:border-[#1E2C3D] flex items-center gap-2">
                        {hasUrl ? (
                          <a
                            href={validUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => handleJoinMeeting(meet)}
                            className={`flex-1 py-2.5 rounded-xl ${
                              isLive
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-[#1E6F43] hover:bg-[#165634] text-white'
                            } text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5`}
                          >
                            <span>{isLive ? 'Join Live Now' : `Join on ${meet.platform}`}</span>
                            <ExternalLink size={14} />
                          </a>
                        ) : (
                          <div className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-semibold text-center">
                            Link will be provided before meeting
                          </div>
                        )}

                        {hasUrl && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(validUrl, 'Meeting Link')}
                            title="Copy Meeting Link"
                            className="p-2.5 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                          >
                            <Share2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: YouTube Live Stream View */}
        {activeTab === 'livestream' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#131C27] rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] overflow-hidden shadow-md">
              <div className="relative aspect-video bg-gradient-to-br from-[#0B192C] via-[#132A4A] to-[#0D2F23] w-full flex flex-col items-center justify-center p-6 text-center text-white">
                <div className="w-16 h-16 rounded-2xl bg-amber-400/15 border border-amber-300/30 flex items-center justify-center text-amber-300 mb-4 shadow-lg">
                  <Play size={30} />
                </div>
                <span className="px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-200 text-[11px] font-bold uppercase tracking-wider mb-2">
                  Rhema Church Live Stream Stage
                </span>
                <h3 className="font-serif font-bold text-lg sm:text-2xl text-white max-w-xl">
                  Rhema Christian Church YouTube Live Sanctuary
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-lg mt-2 leading-relaxed">
                  Join our weekly Sunday worship service, special night vigils, and revival conventions streamed directly to your family.
                </p>
              </div>

              {/* Service Info Under Player */}
              <div className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold mb-1">
                      <Tv size={13} />
                      <span>Official Church Broadcast Stage</span>
                    </div>
                    <h2 className="font-serif font-bold text-xl text-slate-900 dark:text-white">
                      Sunday Prophetic Worship &amp; Word Service
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Live from Rhema Church Sanctuary • Koilakuntla
                    </p>
                  </div>
                </div>

                {/* Broadcast Schedule Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-[#F0EBE0] dark:border-[#1E2C3D]">
                  <div className="p-3 rounded-xl bg-[#F7F5EE]/60 dark:bg-[#0D141D] border border-[#EBE6DC] dark:border-[#222F3E] text-xs">
                    <span className="text-[11px] font-bold text-[#1E6F43] dark:text-emerald-400 block">
                      First Worship Service
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">08:30 AM – 10:15 AM</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#F7F5EE]/60 dark:bg-[#0D141D] border border-[#EBE6DC] dark:border-[#222F3E] text-xs">
                    <span className="text-[11px] font-bold text-[#1E6F43] dark:text-emerald-400 block">
                      Second Worship Service
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">10:45 AM – 12:45 PM</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#F7F5EE]/60 dark:bg-[#0D141D] border border-[#EBE6DC] dark:border-[#222F3E] text-xs">
                    <span className="text-[11px] font-bold text-[#1E6F43] dark:text-emerald-400 block">
                      Evening Revival &amp; Healing
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">06:00 PM – 07:45 PM</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
