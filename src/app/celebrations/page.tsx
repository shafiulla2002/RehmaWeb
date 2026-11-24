'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  PartyPopper,
  Heart,
  Sparkles,
  Cake,
  Gift,
  Home,
  Send,
  CheckCircle2,
  X,
  BookOpen,
  Calendar,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { getLiveCelebrations, LiveCelebrant } from '@/lib/firestoreService';
import { auth, db } from '@/lib/firebase';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';

export interface BlessingMessage {
  id: string;
  celebrantName: string;
  senderName: string;
  message: string;
  verse?: string;
  timestamp: string;
}

const INITIAL_MESSAGES: BlessingMessage[] = [
  {
    id: 'bless-1',
    celebrantName: 'Church Family',
    senderName: 'Pastor Gabriel',
    message:
      'May the Lord establish your steps in divine wisdom and fill your new year with unspeakable joy and supernatural favor!',
    verse: 'Psalm 20:4',
    timestamp: 'Today',
  },
  {
    id: 'bless-2',
    celebrantName: 'Rhema Couple',
    senderName: 'Care Cell Ministry',
    message:
      'Happy wedding anniversary! May your home continue to be an altar of worship and a beacon of Christ\'s love in our city.',
    verse: 'Ecclesiastes 4:12',
    timestamp: 'Today',
  },
];

const PRESET_BLESSINGS = [
  '🎉 Wishing you a joyful and Spirit-filled blessed birthday!',
  '🙏 May the Lord crown your year with His goodness and bountiful harvest!',
  '💍 May Christ always be the threefold cord binding your holy marriage!',
  '🕊️ Grace, peace, and divine health upon your life and household!',
];

export default function CelebrationsPage() {
  const [celebrants, setCelebrants] = useState<LiveCelebrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [messages, setMessages] = useState<BlessingMessage[]>(INITIAL_MESSAGES);
  const [selectedCelebrant, setSelectedCelebrant] = useState<LiveCelebrant | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [senderName, setSenderName] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  const [blessedIds, setBlessedIds] = useState<Set<string>>(new Set());

  const fetchCelebrations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getLiveCelebrations('rhema');
      setCelebrants(data);
      if (data.length > 0) {
        setSelectedCelebrant(data[0]);
      }
    } catch (err: any) {
      console.error('[CelebrationsPage] Error fetching celebrations:', err);
      setError('Unable to load celebrations. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCelebrations();
  }, []);

  // Real-time blessings subscription from Firestore
  useEffect(() => {
    const wishesCol = collection(db, 'Rhema Church', 'rhema', 'celebration_wishes');
    const q = query(wishesCol, orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: BlessingMessage[] = snapshot.docs.map((d) => {
            const data = d.data();
            let timeStr = 'Today';
            if (data.createdAt?.toDate) {
              timeStr = data.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            return {
              id: d.id,
              celebrantName: data.celebrantName || 'Church Family',
              senderName: data.senderName || 'Church Member',
              message: data.message || '',
              verse: data.verse || 'Numbers 6:24-26',
              timestamp: timeStr,
            };
          });
          setMessages(loaded);
        }
      },
      (err) => {
        console.error('[CelebrationsPage] Wishes subscription error:', err);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleSendQuickBlessing = async (celebrantId: string, text: string) => {
    const cel = celebrants.find((c) => c.id === celebrantId);
    if (!cel) return;

    setBlessedIds((prev) => new Set(prev).add(celebrantId));

    try {
      const user = auth.currentUser;
      await addDoc(collection(db, 'Rhema Church', 'rhema', 'celebration_wishes'), {
        celebrantId,
        celebrantName: cel.name,
        senderId: user ? user.uid : 'guest_member',
        senderName: user?.displayName || 'Church Member',
        message: text,
        verse: 'Numbers 6:24-26',
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('[CelebrationsPage] Quick blessing write error:', err);
    }

    setNotification(`Sent blessing to ${cel.name}!`);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMessage.trim() || !selectedCelebrant) return;

    try {
      const user = auth.currentUser;
      await addDoc(collection(db, 'Rhema Church', 'rhema', 'celebration_wishes'), {
        celebrantId: selectedCelebrant.id,
        celebrantName: selectedCelebrant.name,
        senderId: user ? user.uid : 'guest_member',
        senderName: senderName.trim() || user?.displayName || 'Church Family Member',
        message: customMessage.trim(),
        verse: 'Numbers 6:24-26',
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('[CelebrationsPage] Custom blessing write error:', err);
    }

    setBlessedIds((prev) => new Set(prev).add(selectedCelebrant.id));
    setCustomMessage('');
    setNotification(`Your blessing has been posted for ${selectedCelebrant.name}!`);
    setTimeout(() => setNotification(null), 4000);
  };

  const getCelebrationIcon = (type: LiveCelebrant['type']) => {
    switch (type) {
      case 'Birthday':
        return <Cake size={16} className="text-amber-500" />;
      case 'Wedding Anniversary':
        return <Heart size={16} className="text-rose-500" />;
      default:
        return <PartyPopper size={16} className="text-indigo-500" />;
    }
  };

  const todayCelebrants = celebrants.filter((c) => c.isToday);
  const upcomingCelebrants = celebrants.filter((c) => !c.isToday);

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Banner with Numbers 6:24-26 */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B192C] via-[#132A4A] to-[#1E6F43] text-white p-6 md:p-8 shadow-xl">
          <div className="relative z-10 space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-semibold backdrop-blur-xs border border-amber-400/30">
              <PartyPopper size={14} />
              <span>Celebrations &amp; Benedictions Wall</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-serif font-extrabold tracking-tight">
              Rejoice With Those Who Rejoice
            </h1>
            <p className="text-slate-200 text-xs md:text-sm leading-relaxed">
              &ldquo;The Lord bless you and keep you; the Lord make his face shine on you and be gracious to you; the Lord turn his face toward you and give you peace.&rdquo;
              — <span className="text-amber-300 font-semibold">Numbers 6:24-26</span>
            </p>
            <div className="pt-1 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/10 text-[11px] text-amber-200 border border-white/15">
                <ShieldCheck size={12} className="text-amber-300" />
                <span>Privacy Protected: Member contact details &amp; birth years are strictly shielded</span>
              </span>
            </div>
          </div>
        </div>

        {/* ERROR STATE */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 flex items-center justify-between gap-3 text-red-700 dark:text-red-300 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={fetchCelebrations}
              className="px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900 hover:bg-red-200 text-red-800 dark:text-red-200 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw size={12} />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Notification Toast */}
        {notification && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{notification}</span>
            </div>
            <button type="button" onClick={() => setNotification(null)} className="cursor-pointer">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Celebrants Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles size={18} className="text-[#C89D35]" />
              <span>Member Birthdays &amp; Anniversaries ({celebrants.length})</span>
            </h2>
            <span className="text-xs text-slate-500">
              {todayCelebrants.length} Today • {upcomingCelebrants.length} Upcoming (30 Days)
            </span>
          </div>

          {/* SKELETON LOADER */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="bg-white dark:bg-[#131C27] rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] p-5 animate-pulse space-y-3"
                >
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-1/2" />
                  <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4" />
                  <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded-md w-1/3" />
                </div>
              ))}
            </div>
          )}

          {/* EMPTY STATE */}
          {!loading && celebrants.length === 0 && (
            <div className="p-8 rounded-3xl bg-white dark:bg-[#131C27] border border-[#EBE6DC] dark:border-[#222F3E] text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <PartyPopper size={24} />
              </div>
              <h4 className="font-bold text-sm text-[#18221B] dark:text-white">
                No Milestones in the Next 30 Days
              </h4>
              <p className="text-xs text-[#5C665F] dark:text-slate-400 max-w-sm mx-auto">
                Church member birthdays and wedding anniversaries occurring within the next 30 days will appear here.
              </p>
            </div>
          )}

          {/* CELEBRANTS CARDS */}
          {!loading && celebrants.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {celebrants.map((cel) => {
                const isBlessed = blessedIds.has(cel.id);

                return (
                  <div
                    key={cel.id}
                    className="bg-white dark:bg-[#131C27] rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold text-[11px] border border-amber-200/50">
                          {getCelebrationIcon(cel.type)}
                          <span>{cel.type}</span>
                        </span>
                        <span
                          className={`text-[11px] font-bold ${
                            cel.isToday
                              ? 'text-red-600 dark:text-red-400 animate-pulse'
                              : 'text-slate-400'
                          }`}
                        >
                          {cel.dateLabel}
                        </span>
                      </div>

                      <h3 className="font-serif font-bold text-base text-slate-900 dark:text-white pt-1">
                        {cel.name}
                      </h3>

                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {cel.careCell || 'Rhema Church'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#F0EBE0] dark:border-[#1E2C3D] flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSendQuickBlessing(cel.id, PRESET_BLESSINGS[0])}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          isBlessed
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-[#1E6F43] hover:bg-[#165634] text-white'
                        }`}
                      >
                        <span>{isBlessed ? '✓ Blessed' : '🙏 Send Blessing'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedCelebrant(cel)}
                        className="p-2 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] text-slate-500 hover:text-slate-800 dark:hover:text-white text-xs font-semibold cursor-pointer"
                        title="Write personal benediction"
                      >
                        Write
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Benediction Studio & Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Post Custom Blessing Form */}
          <div className="bg-white dark:bg-[#131C27] rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] p-6 shadow-xs space-y-4">
            <h3 className="font-serif font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Send size={16} className="text-[#1E6F43]" />
              <span>Write a Scriptural Blessing</span>
            </h3>

            {/* Quick Preset Buttons */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-500">Quick Presets:</span>
              <div className="space-y-1.5">
                {PRESET_BLESSINGS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCustomMessage(p)}
                    className="w-full text-left p-2 rounded-xl bg-[#F7F5EE]/60 dark:bg-[#0D141D] border border-[#EBE6DC] dark:border-[#222F3E] text-slate-700 dark:text-slate-300 text-[11px] hover:border-[#1E6F43] transition-colors cursor-pointer"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <form
              onSubmit={handleCustomSubmit}
              className="space-y-3 pt-2 border-t border-[#EBE6DC] dark:border-[#222F3E]"
            >
              {celebrants.length > 0 && selectedCelebrant ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Recipient Celebrant
                  </label>
                  <select
                    value={selectedCelebrant.id}
                    onChange={(e) => {
                      const c = celebrants.find((item) => item.id === e.target.value);
                      if (c) setSelectedCelebrant(c);
                    }}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] bg-[#F7F5EE]/50 dark:bg-[#0D141D] text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#1E6F43]"
                  >
                    {celebrants.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type}) — {c.dateLabel}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Your Name (or Household)
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. Bro. Philip & Family"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] bg-[#F7F5EE]/50 dark:bg-[#0D141D] text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#1E6F43]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Benediction Message *
                </label>
                <textarea
                  required
                  rows={3}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Write your prayers, encouragement, or biblical declaration..."
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] bg-[#F7F5EE]/50 dark:bg-[#0D141D] text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#1E6F43]"
                />
              </div>

              <button
                type="submit"
                disabled={!selectedCelebrant && celebrants.length > 0}
                className="w-full py-2.5 rounded-xl bg-[#1E6F43] hover:bg-[#165634] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send size={14} />
                <span>Post Benediction</span>
              </button>
            </form>
          </div>

          {/* Congregation Blessings Feed */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="font-serif font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Heart size={16} className="text-rose-500" />
              <span>Congregation Blessings &amp; Prayers Wall</span>
            </h3>

            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className="bg-white dark:bg-[#131C27] rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] p-4 shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      <span className="text-[#1E6F43] dark:text-emerald-400 font-bold">
                        {msg.senderName}
                      </span>{' '}
                      blessed{' '}
                      <span className="font-serif font-bold text-slate-900 dark:text-white">
                        {msg.celebrantName}
                      </span>
                    </span>
                    <span className="text-slate-400 text-[11px]">{msg.timestamp}</span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
                    &ldquo;{msg.message}&rdquo;
                  </p>

                  {msg.verse && (
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] font-semibold border border-amber-200/50">
                      <BookOpen size={11} />
                      <span>{msg.verse}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
