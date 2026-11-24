'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore';
import {
  Bell,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Video,
  HeartHandshake,
  Users,
  ChevronRight,
  Filter,
  CheckCheck,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Info,
} from 'lucide-react';
import { getLiveNotifications, LiveNotification } from '@/lib/firestoreService';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'All' | 'Unread' | 'Broadcasts'>('All');

  // Member-specific local storage key for fallback read status
  const storageKey = user?.uid
    ? `@rhema_read_notifications_${user.uid}`
    : '@rhema_read_notifications_guest';

  useEffect(() => {
    setLoading(true);
    setError(null);

    const colRef = collection(db, 'Rhema Church', 'rhema', 'notifications');
    const unsub = onSnapshot(
      colRef,
      (snap) => {
        if (!snap.empty) {
          let readIds: string[] = [];
          try {
            const stored = localStorage.getItem(storageKey);
            if (stored) readIds = JSON.parse(stored);
          } catch {}

          const loaded: LiveNotification[] = snap.docs
            .map((d) => {
              const data = d.data();
              // Check targeting
              const targetMemberId = data.targetMemberId || data.memberId || '';
              const isRelevant =
                !targetMemberId ||
                targetMemberId === 'all' ||
                targetMemberId === 'all_members' ||
                (user?.uid && targetMemberId === user.uid);

              if (!isRelevant) return null;

              const readByArray = Array.isArray(data.readBy) ? data.readBy : [];
              const isRead =
                Boolean(data.isRead && targetMemberId === user?.uid) ||
                (user?.uid ? readByArray.includes(user.uid) : false) ||
                readIds.includes(d.id);

              return {
                id: d.id,
                title: data.title || 'Church Notification',
                message: data.body || data.message || '',
                date: data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'Today',
                createdAt: data.createdAt || new Date().toISOString(),
                category: (data.category || 'Church Broadcast') as LiveNotification['category'],
                isRead,
                actionUrl: data.actionUrl || '',
                actionLabel: data.actionLabel || '',
              };
            })
            .filter(Boolean) as LiveNotification[];

          setNotifications(loaded);
          setLoading(false);
        } else {
          getLiveNotifications(user?.uid, 'rhema')
            .then((res) => {
              setNotifications(res);
              setLoading(false);
            })
            .catch(() => {
              setNotifications([]);
              setLoading(false);
            });
        }
      },
      (err) => {
        console.error('[NotificationsPage] onSnapshot error:', err);
        // Fallback to fetch helper
        getLiveNotifications(user?.uid, 'rhema')
          .then((res) => {
            setNotifications(res);
            setLoading(false);
          })
          .catch(() => {
            setError('Unable to load church notifications.');
            setLoading(false);
          });
      }
    );

    return () => unsub();
  }, [user?.uid, storageKey]);

  const markAsRead = async (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    setNotifications(updated);
    try {
      const readIds = updated.filter((n) => n.isRead).map((n) => n.id);
      localStorage.setItem(storageKey, JSON.stringify(readIds));
    } catch {}

    if (user?.uid) {
      try {
        await updateDoc(doc(db, 'Rhema Church', 'rhema', 'notifications', id), {
          isRead: true,
          readBy: arrayUnion(user.uid),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        // Fallback stored locally
      }
    }
  };

  const markAllAsRead = async () => {
    const updated = notifications.map((n) => ({ ...n, isRead: true }));
    setNotifications(updated);
    try {
      const readIds = updated.map((n) => n.id);
      localStorage.setItem(storageKey, JSON.stringify(readIds));
    } catch {}

    if (user?.uid) {
      try {
        for (const n of notifications) {
          if (!n.isRead) {
            await updateDoc(doc(db, 'Rhema Church', 'rhema', 'notifications', n.id), {
              isRead: true,
              readBy: arrayUnion(user.uid),
              updatedAt: serverTimestamp(),
            });
          }
        }
      } catch (err) {
        // Fallback stored locally
      }
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'Unread') return !n.isRead;
    if (activeTab === 'Broadcasts') return n.category === 'Church Broadcast';
    return true;
  });

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Banner with 1 Thessalonians 5:11 */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B192C] via-[#132A4A] to-[#1E6F43] text-white p-6 md:p-8 shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-semibold backdrop-blur-xs border border-amber-400/30">
                <Bell size={14} />
                <span>Updates &amp; Notifications Center</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-serif font-extrabold tracking-tight">
                Church Broadcasts &amp; Ministry Alerts
              </h1>
              <p className="text-slate-200 text-xs md:text-sm leading-relaxed">
                &ldquo;Therefore encourage one another and build each other up, just as in fact you are doing.&rdquo;
                — <span className="text-amber-300 font-semibold">1 Thessalonians 5:11</span>
              </p>
              <div className="pt-1 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/10 text-[11px] text-amber-200 border border-white/15">
                  <ShieldCheck size={12} className="text-amber-300" />
                  <span>Rhema Church Official Notifications • Device-specific read tracking</span>
                </span>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <CheckCheck size={16} className="text-emerald-300" />
                <span>Mark All as Read</span>
              </button>
            )}
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
              onClick={() => window.location.reload()}
              className="px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900 hover:bg-red-200 text-red-800 dark:text-red-200 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw size={12} />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Tab Controls */}
        <div className="flex items-center justify-between border-b border-[#EBE6DC] dark:border-[#222F3E] pb-2 text-xs font-semibold">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('All')}
              className={`pb-2 px-1 border-b-2 transition-all cursor-pointer ${
                activeTab === 'All'
                  ? 'border-[#1E6F43] text-[#1E6F43] dark:text-emerald-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              All Notifications ({notifications.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('Unread')}
              className={`pb-2 px-1 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'Unread'
                  ? 'border-[#1E6F43] text-[#1E6F43] dark:text-emerald-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('Broadcasts')}
              className={`pb-2 px-1 border-b-2 transition-all cursor-pointer ${
                activeTab === 'Broadcasts'
                  ? 'border-[#1E6F43] text-[#1E6F43] dark:text-emerald-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Broadcasts Only
            </button>
          </div>

          <span className="text-xs text-slate-400 hidden sm:inline">
            {unreadCount} Unread alerts
          </span>
        </div>

        {/* SKELETON LOADER */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="p-5 rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] bg-white dark:bg-[#131C27] animate-pulse space-y-3"
              >
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-1/4" />
                <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4" />
                <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded-md w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Notifications List */}
        {!loading && (
          <div className="space-y-3">
            {filteredNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => markAsRead(n.id)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                  n.isRead
                    ? 'bg-white dark:bg-[#131C27] border-[#EBE6DC] dark:border-[#222F3E] opacity-90'
                    : 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-[#1E6F43] dark:bg-emerald-400" />
                      )}
                      <span className="px-2.5 py-0.5 rounded-full bg-[#F7F5EE] dark:bg-[#0D141D] text-[#1E6F43] dark:text-emerald-300 font-bold text-[10px] border border-[#EBE6DC] dark:border-[#222F3E]">
                        {n.category}
                      </span>
                      <span className="text-[11px] text-slate-400">{n.createdAt}</span>
                    </div>

                    <h3 className="font-serif font-bold text-base text-slate-900 dark:text-white">
                      {n.title}
                    </h3>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
                      {n.message}
                    </p>

                    {n.actionLabel && n.actionUrl && (
                      <div className="pt-2">
                        <Link
                          href={n.actionUrl}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E6F43] dark:text-emerald-400 hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(n.id);
                          }}
                        >
                          <span>{n.actionLabel}</span>
                          <ChevronRight size={14} />
                        </Link>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 pt-1">
                    {n.isRead ? (
                      <span className="text-[10px] text-slate-400 font-medium">Read</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold">
                        New
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredNotifications.length === 0 && (
              <div className="p-12 text-center bg-white dark:bg-[#131C27] rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E]">
                <Bell size={36} className="mx-auto text-slate-400 mb-2" />
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                  No notifications
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  You are all caught up with the latest church updates.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
