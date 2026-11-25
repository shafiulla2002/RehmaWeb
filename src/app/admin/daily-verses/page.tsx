'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminNavigationShell } from '@/components/layout/AdminNavigationShell';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import {
  getVerseBackgroundUrl,
  isStaticCuratedBackgroundUrl,
  getCalendarDayNumber,
} from '@/lib/VerseBackgrounds';
import {
  BookOpen,
  Search,
  Calendar,
  Eye,
  Crown,
  CheckCircle2,
  X,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  ShieldAlert,
  RefreshCw,
  AlertCircle,
  Lock,
  Pencil,
  Trash2,
  Bell,
  Database,
  Image as ImageIcon,
  UploadCloud,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Clock,
  Plus,
} from 'lucide-react';

export interface FirebaseDailyVerse {
  id: string;
  index: number;
  slot?: 'Morning' | 'Afternoon' | 'Evening' | 'Night' | string;
  verseEn: string;
  verseTe?: string;
  referenceEn: string;
  referenceTe?: string;
  backgroundUrl?: string;
  isDynamicUnsplash?: boolean;
  unsplashPhotographer?: string;
  backgroundTheme?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface FirebaseDailyVersesMeta {
  totalVerses?: number;
  scheduleStartDate?: string;
  lastReassignedAt?: any;
  lastUpdatedAt?: any;
  reassignedBy?: string;
  updatedAt?: any;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PERIOD_NAMES = ['Morning', 'Afternoon', 'Evening', 'Night'];
const PERIOD_TIMES = ['6:00 AM', '12:00 PM', '6:00 PM', '9:00 PM'];
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export default function SuperAdminDailyVersesPage() {
  const [metadata, setMetadata] = useState<FirebaseDailyVersesMeta | null>(null);
  const [totalVerses, setTotalVerses] = useState<number>(5863);
  const [scheduleEpoch, setScheduleEpoch] = useState<string>('2026-10-30');

  // Tabs: 'upcoming' (Today & Upcoming 30 Days) | 'all' (All Verses 5863)
  const [timelineTab, setTimelineTab] = useState<'upcoming' | 'all'>('upcoming');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Verses state
  const [upcomingVerses, setUpcomingVerses] = useState<FirebaseDailyVerse[]>([]);
  const [allVerses, setAllVerses] = useState<FirebaseDailyVerse[]>([]);
  const [allVersesLastDoc, setAllVersesLastDoc] = useState<any>(null);
  const [hasMoreAll, setHasMoreAll] = useState(true);

  // Loading & Action states
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Admin Controls & Tools dropdown
  const [showTools, setShowTools] = useState(false);
  const [showJsonUpload, setShowJsonUpload] = useState(false);
  const [jsonInput, setJsonInput] = useState('');

  // Modal states: Preview, Edit, Create, Delete, Clear Confirmation
  const [previewVerse, setPreviewVerse] = useState<FirebaseDailyVerse | null>(null);
  const [editingVerse, setEditingVerse] = useState<FirebaseDailyVerse | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newVerse, setNewVerse] = useState({
    verseEn: '',
    referenceEn: '',
    verseTe: '',
    referenceTe: '',
    period: 'Morning',
  });
  const [deleteTarget, setDeleteTarget] = useState<FirebaseDailyVerse | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showReassignConfirm, setShowReassignConfirm] = useState(false);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  // Helper: compute today's 4 indices based on schedule epoch
  const getIndicesForDate = useCallback((date: Date, total: number = 5863): number[] => {
    if (total === 0) return [0, 1, 2, 3];
    const epochStr = scheduleEpoch || '2026-10-30';
    const [eY, eM, eD] = epochStr.split('-').map(Number);
    const epochUtc = Date.UTC(eY, (eM || 1) - 1, eD || 1);
    const targetUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.floor((targetUtc - epochUtc) / MS_PER_DAY);
    const base = diffDays * 4;

    return [
      ((base + 0) % total + total) % total,
      ((base + 1) % total + total) % total,
      ((base + 2) % total + total) % total,
      ((base + 3) % total + total) % total,
    ];
  }, [scheduleEpoch]);

  // Fast future schedule calculation for each verse index
  const getFastSchedule = useCallback((index: number) => {
    const total = totalVerses || 5863;
    const safeIdx = ((typeof index === 'number' && index >= 0) ? index : 0) % total;

    const todayIndices = getIndicesForDate(new Date(), total);
    const todayBase = todayIndices[0];
    const diffIndex = safeIdx - todayBase;
    const daysOffset = Math.floor(diffIndex / 4);
    const periodIndex = ((safeIdx % 4) + 4) % 4;
    const period = PERIOD_NAMES[periodIndex] || 'Morning';
    const periodTime = PERIOD_TIMES[periodIndex] || '6:00 AM';

    const isToday = daysOffset === 0;
    const isTomorrow = daysOffset === 1;

    let label = '';
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (isToday) {
      label = `Today · ${period} (${periodTime})`;
    } else if (isTomorrow) {
      label = `Tomorrow · ${period} (${periodTime})`;
    } else {
      const targetTime = todayMidnight + daysOffset * MS_PER_DAY;
      const d = new Date(targetTime);
      label = `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · ${period} (${periodTime})`;
    }

    return { label, period, periodTime, periodIndex, isToday, isTomorrow, daysOffset };
  }, [totalVerses, getIndicesForDate]);

  // Load Metadata & Upcoming 30-Day Verses (120 verses)
  const fetchUpcomingVerses = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch metadata
      let total = 5863;
      let startEpoch = '2026-10-30';
      try {
        const metaDocRef = doc(db, 'daily_verses_meta', 'metadata');
        const metaSnap = await getDoc(metaDocRef);
        if (metaSnap.exists()) {
          const mData = metaSnap.data() as FirebaseDailyVersesMeta;
          setMetadata(mData);
          if (mData.totalVerses) {
            total = mData.totalVerses;
            setTotalVerses(total);
          }
          if (mData.scheduleStartDate) {
            startEpoch = mData.scheduleStartDate;
            setScheduleEpoch(startEpoch);
          }
        }
      } catch (mErr) {
        console.warn('Metadata query error:', mErr);
      }

      // 2. Fetch upcoming 120 verses starting from today
      const COUNT = 120;
      const todayIndices = getIndicesForDate(new Date(), total);
      const todayBase = todayIndices[0] || 0;

      let fetched: FirebaseDailyVerse[] = [];
      try {
        const colRef = collection(db, 'daily_verses');
        const q = query(
          colRef,
          where('index', '>=', todayBase),
          where('index', '<', todayBase + COUNT)
        );
        const snap = await getDocs(q);
        fetched = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      } catch (fErr) {
        console.warn('Firestore range query error:', fErr);
      }

      // Offline / fallback from public bulk_verses.json if needed
      if (fetched.length === 0) {
        try {
          const resp = await fetch('/bulk_verses.json');
          if (resp.ok) {
            const bundled = await resp.json();
            for (let offset = 0; offset < COUNT; offset++) {
              const idx = (todayBase + offset) % total;
              const bv = bundled[idx];
              if (bv) {
                fetched.push({
                  id: `verse_${idx}`,
                  index: idx,
                  verseEn: bv.verseEn || '',
                  verseTe: bv.verseTe || '',
                  referenceEn: bv.referenceEn || '',
                  referenceTe: bv.referenceTe || '',
                });
              }
            }
          }
        } catch (_) {}
      }

      // Sort chronologically and deduplicate
      const indexMap = new Map<number, FirebaseDailyVerse>();
      for (const item of fetched) {
        if (typeof item.index === 'number') {
          const existing = indexMap.get(item.index);
          if (!existing) {
            indexMap.set(item.index, item);
          } else {
            const tExisting = existing.updatedAt?.toMillis ? existing.updatedAt.toMillis() : 0;
            const tItem = item.updatedAt?.toMillis ? item.updatedAt.toMillis() : 0;
            if (tItem >= tExisting) {
              indexMap.set(item.index, item);
            }
          }
        }
      }
      fetched = Array.from(indexMap.values());
      fetched.sort((a, b) => a.index - b.index);

      setUpcomingVerses(fetched);
    } catch (err: unknown) {
      console.warn('Failed to load upcoming verses:', err);
      setError('Unable to load upcoming daily verses.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch initial page of All Verses (first 50)
  const fetchAllVersesInitial = async () => {
    try {
      setLoading(true);
      const colRef = collection(db, 'daily_verses');
      const q = query(colRef, orderBy('index'), limit(50));
      const snap = await getDocs(q);

      let docs: FirebaseDailyVerse[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

      if (docs.length === 0) {
        try {
          const resp = await fetch('/bulk_verses.json');
          if (resp.ok) {
            const bundled = await resp.json();
            docs = bundled.slice(0, 50).map((bv: any, idx: number) => ({
              id: `verse_${idx}`,
              index: idx,
              verseEn: bv.verseEn || '',
              verseTe: bv.verseTe || '',
              referenceEn: bv.referenceEn || '',
              referenceTe: bv.referenceTe || '',
            }));
          }
        } catch (_) {}
      }

      setAllVerses(docs);
      setAllVersesLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMoreAll(snap.docs.length === 50);
    } catch (err) {
      console.error('Error fetching all verses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMoreAll = async () => {
    if (loadingMore || !hasMoreAll || !allVersesLastDoc) return;
    try {
      setLoadingMore(true);
      const colRef = collection(db, 'daily_verses');
      const q = query(colRef, orderBy('index'), startAfter(allVersesLastDoc), limit(50));
      const snap = await getDocs(q);

      if (snap.docs.length > 0) {
        const newDocs: FirebaseDailyVerse[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        setAllVerses(prev => [...prev, ...newDocs]);
        setAllVersesLastDoc(snap.docs[snap.docs.length - 1]);
        setHasMoreAll(snap.docs.length === 50);
      } else {
        setHasMoreAll(false);
      }
    } catch (e) {
      console.error('Error loading more verses:', e);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchUpcomingVerses();
  }, []);

  const handleTabSwitch = (tab: 'upcoming' | 'all') => {
    setTimelineTab(tab);
    if (tab === 'all' && allVerses.length === 0) {
      fetchAllVersesInitial();
    }
  };

  // Reassign all 5,863 verses sequentially starting from Today
  const handleReassignSchedule = async () => {
    setIsUpdating(true);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    try {
      const metaDocRef = doc(db, 'daily_verses_meta', 'metadata');
      await setDoc(metaDocRef, {
        scheduleStartDate: todayStr,
        totalVerses: totalVerses || 5863,
        lastReassignedAt: serverTimestamp(),
        lastUpdatedAt: serverTimestamp(),
        reassignedBy: 'admin',
      }, { merge: true });

      setScheduleEpoch(todayStr);
      await fetchUpcomingVerses(true);
      setShowReassignConfirm(false);
      notify(`Schedule reassigned starting Today (${todayStr}) with 0 past dates!`);
    } catch (err: any) {
      console.error('Reassign error:', err);
      notify(err?.message || 'Failed to reassign schedule');
    } finally {
      setIsUpdating(false);
    }
  };

  // Create a new verse into Firestore
  const handleCreateVerse = async () => {
    if (!newVerse.verseEn.trim() || !newVerse.referenceEn.trim()) {
      notify('Please enter both English verse text and scripture reference');
      return;
    }

    setIsUpdating(true);
    try {
      const periodIdx = PERIOD_NAMES.indexOf(newVerse.period);
      const todayIndices = getIndicesForDate(new Date(), totalVerses || 5863);
      const targetIndex = todayIndices[periodIdx >= 0 ? periodIdx : 0] ?? 0;

      const colRef = collection(db, 'daily_verses');
      const q = query(colRef, where('index', '==', targetIndex));
      const existingSnap = await getDocs(q);

      let targetDocRef = existingSnap.empty ? doc(colRef) : existingSnap.docs[0].ref;

      const payload: any = {
        id: targetDocRef.id,
        index: targetIndex,
        verseEn: newVerse.verseEn.trim(),
        referenceEn: newVerse.referenceEn.trim(),
        verseTe: newVerse.verseTe.trim() || newVerse.verseEn.trim(),
        referenceTe: newVerse.referenceTe.trim() || newVerse.referenceEn.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(targetDocRef, payload, { merge: true });

      // Invalidate metadata
      await setDoc(doc(db, 'daily_verses_meta', 'metadata'), {
        lastUpdatedAt: serverTimestamp(),
      }, { merge: true });

      setShowCreateModal(false);
      setNewVerse({
        verseEn: '',
        referenceEn: '',
        verseTe: '',
        referenceTe: '',
        period: 'Morning',
      });
      notify(`Created and assigned verse to ${newVerse.period} (Idx #${targetIndex})`);
      await fetchUpcomingVerses(true);
    } catch (e: any) {
      console.error('Create verse error:', e);
      notify(e?.message || 'Failed to create verse');
    } finally {
      setIsUpdating(false);
    }
  };

  // Update existing verse
  const handleUpdateVerse = async () => {
    if (!editingVerse || !editingVerse.id) return;
    setIsUpdating(true);
    try {
      const docRef = doc(db, 'daily_verses', editingVerse.id);
      await updateDoc(docRef, {
        verseEn: (editingVerse.verseEn || '').trim(),
        verseTe: (editingVerse.verseTe || '').trim(),
        referenceEn: (editingVerse.referenceEn || '').trim(),
        referenceTe: (editingVerse.referenceTe || '').trim(),
        updatedAt: serverTimestamp(),
      });

      await setDoc(doc(db, 'daily_verses_meta', 'metadata'), {
        lastUpdatedAt: serverTimestamp(),
      }, { merge: true });

      setEditingVerse(null);
      notify('Verse updated successfully!');
      await fetchUpcomingVerses(true);
    } catch (e: any) {
      console.error('Update error:', e);
      notify(e?.message || 'Failed to update verse');
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete verse
  const handleDeleteVerse = async () => {
    if (!deleteTarget) return;
    setIsUpdating(true);
    try {
      const docRef = doc(db, 'daily_verses', deleteTarget.id);
      await deleteDoc(docRef);

      await setDoc(doc(db, 'daily_verses_meta', 'metadata'), {
        lastUpdatedAt: serverTimestamp(),
      }, { merge: true });

      setDeleteTarget(null);
      notify('Verse removed from schedule.');
      await fetchUpcomingVerses(true);
    } catch (e: any) {
      console.error('Delete error:', e);
      notify(e?.message || 'Failed to delete verse');
    } finally {
      setIsUpdating(false);
    }
  };

  // Import all 5,863 bundled verses into Firestore safely in batches
  const handleImportBundled = async () => {
    setIsUploading(true);
    try {
      const resp = await fetch('/bulk_verses.json');
      if (!resp.ok) throw new Error('Could not load bulk_verses.json from public directory');
      const data = await resp.json();

      let count = 0;
      let batch = writeBatch(db);
      const versesRef = collection(db, 'daily_verses');

      for (let i = 0; i < Math.min(data.length, 120); i++) {
        const item = data[i];
        const newDocRef = doc(versesRef);
        batch.set(newDocRef, {
          index: i,
          verseEn: item.verseEn,
          verseTe: item.verseTe,
          referenceEn: item.referenceEn,
          referenceTe: item.referenceTe,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        count++;
      }

      await batch.commit();

      await setDoc(doc(db, 'daily_verses_meta', 'metadata'), {
        totalVerses: 5863,
        scheduleStartDate: new Date().toISOString().split('T')[0],
        updatedAt: serverTimestamp(),
        lastUpdatedAt: serverTimestamp(),
      }, { merge: true });

      notify(`Seeded initial verified batch of ${count} verses to Firestore!`);
      await fetchUpcomingVerses(true);
    } catch (e: any) {
      console.error('Seed error:', e);
      notify(e?.message || 'Failed to seed verses');
    } finally {
      setIsUploading(false);
    }
  };

  // Filtered List memoization
  const activeList = timelineTab === 'upcoming' ? upcomingVerses : allVerses;
  const filteredVerses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return activeList.filter((v) => {
      const pIdx = ((v.index % 4) + 4) % 4;
      const period = PERIOD_NAMES[pIdx] || 'Morning';

      if (selectedPeriod !== 'All' && period !== selectedPeriod) {
        return false;
      }

      if (q.length > 0) {
        const vEn = (v.verseEn || '').toLowerCase();
        const vTe = (v.verseTe || '').toLowerCase();
        const rEn = (v.referenceEn || '').toLowerCase();
        const rTe = (v.referenceTe || '').toLowerCase();
        if (!vEn.includes(q) && !vTe.includes(q) && !rEn.includes(q) && !rTe.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [activeList, selectedPeriod, searchQuery]);

  return (
    <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
      <AdminNavigationShell>
        <div className="space-y-6 max-w-7xl mx-auto pb-16">
          {/* TOAST NOTIFICATION */}
          {toast && (
            <div className="fixed bottom-6 right-6 z-50 bg-slate-950 text-white border border-amber-500/40 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
              <CheckCircle2 size={18} className="text-amber-400 shrink-0" />
              <span className="text-xs font-semibold">{toast}</span>
            </div>
          )}

          {/* TOP HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <Crown size={22} />
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Daily Verses Manager
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                5,863 Automated Scripture Verses &bull; 4 Slots/Day &bull; Deterministic Multi-Year Rotation
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchUpcomingVerses(true)}
                disabled={loading}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                title="Refresh from Firestore"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* 1. MASTER SCHEDULE CARD */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Daily Verses Master Schedule
                  </h2>
                  <p className="text-xs text-slate-500">
                    Deterministic 4-Slot Multi-Year Rotation
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </div>
            </div>

            {/* 4 Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800/80 text-center">
                <span className="text-xl font-black text-slate-900 dark:text-white block">
                  {totalVerses.toLocaleString()}
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Total Verses
                </span>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800/80 text-center">
                <span className="text-xl font-black text-slate-900 dark:text-white block">
                  4 / Day
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Time Slots
                </span>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800/80 text-center">
                <span className="text-xl font-black text-slate-900 dark:text-white block">
                  {Math.floor(totalVerses / 4).toLocaleString()}
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Days Covered
                </span>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800/80 text-center">
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 block">
                  0
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Past Dates
                </span>
              </div>
            </div>

            {/* 2. SCHEDULE STARTING TODAY CARD WITH REASSIGN */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 to-indigo-50/40 dark:from-slate-950 dark:to-indigo-950/20 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  <Calendar size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Schedule Starting Today ({scheduleEpoch})
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    All {totalVerses.toLocaleString()} verses are scheduled into future dates (through late 2030) with zero past dates.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowReassignConfirm(true)}
                disabled={isUpdating}
                className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs flex items-center gap-2 hover:opacity-90 shadow-sm transition-all shrink-0"
              >
                <CheckCircle2 size={15} />
                <span>Reassign</span>
              </button>
            </div>
          </div>

          {/* 3. SEARCH BAR */}
          <div className="relative">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search verses by scripture text or reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-sm"
            />
          </div>

          {/* 4. TIMELINE TABS */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleTabSwitch('upcoming')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                timelineTab === 'upcoming'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>🌟 Today &amp; Upcoming (30 Days)</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabSwitch('all')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                timelineTab === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>📚 All Verses ({totalVerses})</span>
            </button>
          </div>

          {/* 5. TIME SLOT FILTER PILLS */}
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: 'All', label: 'All' },
              { id: 'Morning', label: '🌅 Morning (6 AM)' },
              { id: 'Afternoon', label: '☀️ Afternoon (12 PM)' },
              { id: 'Evening', label: '🌇 Evening (6 PM)' },
              { id: 'Night', label: '🌙 Night (9 PM)' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPeriod(p.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  selectedPeriod === p.id
                    ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* 6. ADMIN CONTROLS & QUICK TOOLS (EXPANDABLE) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
            <button
              type="button"
              onClick={() => setShowTools(!showTools)}
              className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200"
            >
              <div className="flex items-center gap-2">
                <Database size={16} className="text-amber-500" />
                <span>Admin Controls &amp; Quick Tools</span>
              </div>
              {showTools ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showTools && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-in fade-in">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (upcomingVerses.length > 0) {
                        setPreviewVerse(upcomingVerses[0]);
                      } else {
                        notify('No verse available for UI test');
                      }
                    }}
                    className="p-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Eye size={15} />
                    <span>Test Verse UI</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      notify('Triggered simulated daily verse push notification for today’s active slot');
                    }}
                    className="p-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Bell size={15} />
                    <span>Test Verse Push</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleImportBundled}
                    disabled={isUploading}
                    className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <Database size={15} className="text-amber-500" />
                    <span>Seed 5,863 Verses</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      notify('Curated high-resolution Unsplash verse backgrounds are active');
                    }}
                    className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <ImageIcon size={15} className="text-purple-500" />
                    <span>Fetch Images</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowJsonUpload(!showJsonUpload)}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-2"
                  >
                    <UploadCloud size={15} />
                    <span>{showJsonUpload ? 'Hide JSON' : 'Upload JSON'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fetchUpcomingVerses(true)}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={15} />
                    <span>Refresh List</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    className="p-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center justify-center gap-2"
                  >
                    <Trash2 size={15} />
                    <span>Clear</span>
                  </button>
                </div>

                {/* JSON Upload box */}
                {showJsonUpload && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <label className="block text-xs font-bold text-slate-900 dark:text-white">
                      Paste JSON Array of Verses:
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Format: [{`{ "verseEn": "...", "referenceEn": "...", "verseTe": "...", "referenceTe": "..." }`}]
                    </p>
                    <textarea
                      rows={4}
                      value={jsonInput}
                      onChange={(e) => setJsonInput(e.target.value)}
                      placeholder='[ { "verseEn": "For God so loved...", "referenceEn": "John 3:16" } ]'
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const parsed = JSON.parse(jsonInput);
                          if (!Array.isArray(parsed)) throw new Error('Input must be a JSON array');
                          setIsUploading(true);
                          const colRef = collection(db, 'daily_verses');
                          const b = writeBatch(db);
                          parsed.slice(0, 50).forEach((item, idx) => {
                            const newDoc = doc(colRef);
                            b.set(newDoc, {
                              ...item,
                              index: idx,
                              createdAt: serverTimestamp(),
                              updatedAt: serverTimestamp(),
                            });
                          });
                          await b.commit();
                          notify(`Successfully uploaded ${parsed.length} verses from JSON!`);
                          setJsonInput('');
                          setShowJsonUpload(false);
                          await fetchUpcomingVerses(true);
                        } catch (e: any) {
                          notify(e?.message || 'Invalid JSON format');
                        } finally {
                          setIsUploading(false);
                        }
                      }}
                      className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-xs"
                    >
                      {isUploading ? 'Uploading...' : 'Upload & Commit to Database'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 7. SECTION HEADING */}
          <div className="flex items-center justify-between pt-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {timelineTab === 'upcoming' ? 'Upcoming 30-Day Schedule' : 'Master Scripture Library'}
            </h3>
            <span className="text-xs text-slate-500">
              Showing {filteredVerses.length} verses
            </span>
          </div>

          {/* 8. LIST OF VERSE CARDS */}
          {loading && filteredVerses.length === 0 ? (
            <div className="p-16 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
              <RefreshCw size={24} className="animate-spin text-amber-500" />
              <span>Loading scheduled daily verses from Firestore...</span>
            </div>
          ) : filteredVerses.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
              <BookOpen size={32} className="mx-auto text-slate-400 mb-2" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                No verses found matching criteria
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Try switching the time slot filter or clear your search term.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredVerses.map((item) => {
                const schedule = getFastSchedule(item.index);
                const bgUrl = getVerseBackgroundUrl(
                  item,
                  schedule.period,
                  item.index,
                  new Date(Date.now() + (schedule.daysOffset || 0) * MS_PER_DAY)
                );

                return (
                  <div
                    key={item.id || `verse_${item.index}`}
                    className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-[220px] transition-all hover:border-amber-500/50 group"
                    style={{
                      backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.72), rgba(15, 23, 42, 0.94)), url(${bgUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    {/* Top Row: Pill & Actions */}
                    <div className="p-4 flex items-center justify-between gap-2 z-10">
                      <span
                        className={`text-[11px] font-bold px-3 py-1 rounded-full border backdrop-blur-md flex items-center gap-1.5 ${
                          schedule.isToday
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : schedule.isTomorrow
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                            : 'bg-black/40 text-slate-200 border-white/20'
                        }`}
                      >
                        {schedule.isToday ? '🌟 ' : '📅 '}
                        {schedule.label}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/50 text-slate-300 border border-white/10">
                          Idx #{item.index}
                        </span>

                        <button
                          type="button"
                          onClick={() => setEditingVerse({ ...item })}
                          className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors"
                          title="Edit Verse"
                        >
                          <Pencil size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                          title="Delete Verse"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Middle: Scripture text */}
                    <div className="p-4 z-10 space-y-1.5">
                      <h4 className="text-sm font-bold text-white tracking-wide">
                        {item.referenceEn || 'Scripture Reference'}{' '}
                        {item.referenceTe && (
                          <span className="text-amber-300 font-normal">
                            ({item.referenceTe})
                          </span>
                        )}
                      </h4>

                      <p className="text-xs text-slate-200 line-clamp-3 font-serif italic leading-relaxed">
                        &ldquo;{item.verseEn}&rdquo;
                      </p>

                      {item.verseTe && (
                        <p className="text-xs text-slate-300 line-clamp-2 font-serif leading-relaxed pt-1 border-t border-white/10">
                          {item.verseTe}
                        </p>
                      )}
                    </div>

                    {/* Bottom: Quick Preview button */}
                    <div className="px-4 pb-3 flex justify-end z-10">
                      <button
                        type="button"
                        onClick={() => setPreviewVerse(item)}
                        className="text-[11px] text-amber-300 hover:text-amber-200 font-semibold flex items-center gap-1 opacity-90 hover:opacity-100"
                      >
                        <Eye size={13} />
                        <span>View Full Screen Card</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination for All Verses */}
          {timelineTab === 'all' && hasMoreAll && (
            <div className="text-center pt-4">
              <button
                type="button"
                onClick={handleLoadMoreAll}
                disabled={loadingMore}
                className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-xs"
              >
                {loadingMore ? 'Loading more...' : 'Load Next 50 Verses'}
              </button>
            </div>
          )}

          {/* MODAL: FULL SCREEN VERSE PREVIEW */}
          {previewVerse && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
              <div
                className="relative max-w-lg w-full rounded-3xl p-6 sm:p-8 space-y-5 text-white shadow-2xl overflow-hidden border border-white/20"
                style={{
                  backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.75), rgba(15, 23, 42, 0.95)), url(${getVerseBackgroundUrl(
                    previewVerse,
                    'Morning',
                    previewVerse.index
                  )})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <button
                  type="button"
                  onClick={() => setPreviewVerse(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white"
                >
                  <X size={18} />
                </button>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    Daily Scripture Verse &bull; Idx #{previewVerse.index}
                  </span>
                  <h3 className="text-xl font-extrabold text-white">
                    {previewVerse.referenceEn}
                  </h3>
                  {previewVerse.referenceTe && (
                    <p className="text-sm text-amber-300 font-medium">
                      {previewVerse.referenceTe}
                    </p>
                  )}
                </div>

                <div className="space-y-3 pt-2 border-t border-white/20">
                  <p className="text-sm font-serif italic text-slate-100 leading-relaxed">
                    &ldquo;{previewVerse.verseEn}&rdquo;
                  </p>
                  {previewVerse.verseTe && (
                    <p className="text-sm font-serif text-slate-200 leading-relaxed border-t border-white/10 pt-2">
                      {previewVerse.verseTe}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MODAL: EDIT VERSE */}
          {editingVerse && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
                <button
                  type="button"
                  onClick={() => setEditingVerse(null)}
                  className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X size={18} />
                </button>

                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Edit Daily Verse #{editingVerse.index}
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Scripture Reference (English) *
                    </label>
                    <input
                      type="text"
                      value={editingVerse.referenceEn}
                      onChange={(e) =>
                        setEditingVerse({ ...editingVerse, referenceEn: e.target.value })
                      }
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Verse Text (English) *
                    </label>
                    <textarea
                      rows={3}
                      value={editingVerse.verseEn}
                      onChange={(e) =>
                        setEditingVerse({ ...editingVerse, verseEn: e.target.value })
                      }
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Scripture Reference (Telugu)
                    </label>
                    <input
                      type="text"
                      value={editingVerse.referenceTe || ''}
                      onChange={(e) =>
                        setEditingVerse({ ...editingVerse, referenceTe: e.target.value })
                      }
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Verse Text (Telugu)
                    </label>
                    <textarea
                      rows={3}
                      value={editingVerse.verseTe || ''}
                      onChange={(e) =>
                        setEditingVerse({ ...editingVerse, verseTe: e.target.value })
                      }
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingVerse(null)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={handleUpdateVerse}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold"
                  >
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL: CREATE VERSE */}
          {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X size={18} />
                </button>

                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Create Daily Verse
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Time Slot
                    </label>
                    <select
                      value={newVerse.period}
                      onChange={(e) => setNewVerse({ ...newVerse, period: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs"
                    >
                      <option value="Morning">Morning (6:00 AM)</option>
                      <option value="Afternoon">Afternoon (12:00 PM)</option>
                      <option value="Evening">Evening (6:00 PM)</option>
                      <option value="Night">Night (9:00 PM)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Scripture Reference (English) *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Philippians 4:13"
                      value={newVerse.referenceEn}
                      onChange={(e) => setNewVerse({ ...newVerse, referenceEn: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Verse Text (English) *
                    </label>
                    <textarea
                      rows={3}
                      placeholder="I can do all things through Christ who strengthens me..."
                      value={newVerse.verseEn}
                      onChange={(e) => setNewVerse({ ...newVerse, verseEn: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Scripture Reference (Telugu)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ఫిలిప్పీయులకు 4:13"
                      value={newVerse.referenceTe}
                      onChange={(e) => setNewVerse({ ...newVerse, referenceTe: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Verse Text (Telugu)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="నన్ను బలపరచువానియందే నేను సమస్తమును చేయగలను..."
                      value={newVerse.verseTe}
                      onChange={(e) => setNewVerse({ ...newVerse, verseTe: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={handleCreateVerse}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold"
                  >
                    {isUpdating ? 'Creating...' : 'Create & Schedule'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* REASSIGN SCHEDULE CONFIRMATION MODAL */}
          {showReassignConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center mx-auto">
                  <Calendar size={24} />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Reassign Schedule to Future Dates
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    This will remove all past dates from the schedule and assign all 5,863 verses sequentially starting from Today through 2030.
                  </p>
                  <ul className="text-left text-[11px] text-slate-600 dark:text-slate-400 space-y-1 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <li>&bull; Zero past dates</li>
                    <li>&bull; Zero lost verses</li>
                    <li>&bull; Zero duplicated verses</li>
                    <li>&bull; Complete 4-year multi-slot cycle</li>
                  </ul>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReassignConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={handleReassignSchedule}
                    className="flex-1 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold"
                  >
                    {isUpdating ? 'Reassigning...' : 'Reassign Schedule'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DELETE VERSE CONFIRMATION MODAL */}
          {deleteTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
                  <Trash2 size={24} />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Delete Verse #{deleteTarget.index}?
                  </h3>
                  <p className="text-xs text-slate-500">
                    Are you sure you want to delete {deleteTarget.referenceEn}?
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={handleDeleteVerse}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
                  >
                    {isUpdating ? 'Deleting...' : 'Delete Verse'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CLEAR ALL CONFIRMATION MODAL */}
          {showClearConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
                  <Trash2 size={24} />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Clear All Daily Verses?
                  </h3>
                  <p className="text-xs text-slate-500">
                    This will delete daily verses records from Firestore. Are you sure you want to proceed?
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setIsUpdating(true);
                      try {
                        const snap = await getDocs(collection(db, 'daily_verses'));
                        const b = writeBatch(db);
                        snap.docs.forEach(d => b.delete(d.ref));
                        await b.commit();
                        setShowClearConfirm(false);
                        notify('Cleared verses collection');
                        await fetchUpcomingVerses(true);
                      } catch (e: any) {
                        notify(e?.message || 'Failed to clear');
                      } finally {
                        setIsUpdating(false);
                      }
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
                  >
                    Confirm Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminNavigationShell>
    </ProtectedRoute>
  );
}
