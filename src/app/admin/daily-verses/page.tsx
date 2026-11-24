'use client';

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminNavigationShell } from '@/components/layout/AdminNavigationShell';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
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
} from 'lucide-react';

export interface FirebaseDailyVerse {
  id: string;
  index: number;
  slot?: 'morning' | 'noon' | 'evening' | 'night' | string;
  verseEn: string;
  verseTe?: string;
  referenceEn: string;
  referenceTe?: string;
  createdAt?: any;
}

export interface FirebaseDailyVersesMeta {
  totalVerses?: number;
  scheduleStartDate?: string;
  updatedAt?: any;
}

const SLOT_META = [
  { name: 'Morning', time: '06:00 AM', icon: Sunrise },
  { name: 'Noon', time: '12:00 PM', icon: Sun },
  { name: 'Evening', time: '05:00 PM', icon: Sunset },
  { name: 'Night', time: '09:00 PM', icon: Moon },
];

export default function SuperAdminDailyVersesPage() {
  const [verses, setVerses] = useState<FirebaseDailyVerse[]>([]);
  const [metadata, setMetadata] = useState<FirebaseDailyVersesMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'catalog' | 'slots'>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [slotFilter, setSlotFilter] = useState<string>('All');
  const [previewVerse, setPreviewVerse] = useState<FirebaseDailyVerse | null>(null);

  // Fetch live daily verses and metadata from root collections:
  // daily_verses
  // daily_verses_meta/metadata
  const loadDailyVerses = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch metadata
      try {
        const metaDocRef = doc(db, 'daily_verses_meta', 'metadata');
        const metaSnap = await getDoc(metaDocRef);
        if (metaSnap.exists()) {
          setMetadata(metaSnap.data() as FirebaseDailyVersesMeta);
        }
      } catch (mErr) {
        console.warn('Metadata query error:', mErr);
      }

      // 2. Fetch verses
      const colRef = collection(db, 'daily_verses');
      const snap = await getDocs(colRef);

      const items: FirebaseDailyVerse[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        items.push({
          id: docSnap.id,
          index: d.index || 0,
          slot: d.slot || 'morning',
          verseEn: d.verseEn || d.verse || '',
          verseTe: d.verseTe || d.verseTelugu || '',
          referenceEn: d.referenceEn || d.reference || '',
          referenceTe: d.referenceTe || '',
          createdAt: d.createdAt,
        });
      });

      items.sort((a, b) => a.index - b.index);
      setVerses(items);
    } catch (err: unknown) {
      console.warn('Failed to fetch daily verses from Firestore:', err);
      setError('Unable to load progressive daily verses from global collection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDailyVerses();
  }, []);

  const filteredVerses = verses.filter((v) => {
    const matchesSearch =
      searchQuery === '' ||
      v.referenceEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.verseEn.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSlot =
      slotFilter === 'All' || v.slot?.toLowerCase() === slotFilter.toLowerCase();

    return matchesSearch && matchesSlot;
  });

  return (
    <ProtectedRoute allowedRoles={['superadmin']}>
      <AdminNavigationShell>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <Crown size={24} />
              </span>
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                  Super Admin Daily Verses
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Progressive 4-slot Scripture cycle &bull; Morning, Noon, Evening &amp; Night slots
                </p>
              </div>
            </div>

            <button
              onClick={() => loadDailyVerses()}
              className="self-start sm:self-auto px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Security Architecture Banner */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-xs text-amber-800 dark:text-amber-200">
            <ShieldAlert size={20} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block uppercase tracking-wider text-[11px]">
                Restricted Read-Only Access &bull; Production Security Protection
              </span>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                Live Scripture verses and metadata are loaded from top-level collections. In accordance with Phase 2C security instructions, write mutations, batch imports, and cycle resets remain disabled until server-side security rules for top-level collections are hardened and deployed.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Metadata Card */}
          {metadata && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Total Progressive Verses
                </span>
                <span className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1 block">
                  {metadata.totalVerses || verses.length} Verses
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Schedule Start Epoch
                </span>
                <span className="text-xl font-bold font-mono text-amber-500 mt-1 block">
                  {metadata.scheduleStartDate || '2026-11-19'}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Active Security State
                </span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> Live Firestore Read-Only
                </span>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'catalog'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpen size={16} />
              <span>Verses Catalog ({verses.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('slots')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'slots'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar size={16} />
              <span>4-Slot Progression Overview</span>
            </button>
          </div>

          {/* TAB 1: CATALOG */}
          {activeTab === 'catalog' && (
            <div className="space-y-4">
              {/* Search & Slot Filter */}
              <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl">
                <div className="relative flex-1 w-full">
                  <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search scripture reference or verse citation..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={slotFilter}
                    onChange={(e) => setSlotFilter(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
                  >
                    <option value="All">All Slots</option>
                    <option value="morning">Morning</option>
                    <option value="noon">Noon</option>
                    <option value="evening">Evening</option>
                    <option value="night">Night</option>
                  </select>
                </div>
              </div>

              {/* Verses Grid */}
              {loading ? (
                <div className="py-16 text-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <RefreshCw size={24} className="animate-spin text-amber-500 mx-auto" />
                  <p className="text-xs text-slate-500">Loading daily verses from Firestore...</p>
                </div>
              ) : filteredVerses.length === 0 ? (
                <div className="py-16 text-center space-y-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <BookOpen size={32} className="text-slate-400 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Daily Verses Found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    No verses recorded in top-level collection.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredVerses.map((v) => (
                    <div
                      key={v.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 transition-all space-y-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-xs font-bold flex items-center justify-center">
                            #{v.index}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {v.slot || 'Morning'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPreviewVerse(v)}
                          className="p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        >
                          <Eye size={14} />
                        </button>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {v.referenceEn} {v.referenceTe ? `(${v.referenceTe})` : ''}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 italic mt-1">
                          &ldquo;{v.verseEn}&rdquo;
                        </p>
                        {v.verseTe && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-1">
                            {v.verseTe}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: 4-SLOT PROGRESSION OVERVIEW */}
          {activeTab === 'slots' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {SLOT_META.map((slot, idx) => {
                const Icon = slot.icon;
                const slotVerses = verses.filter(
                  (v) => (v.slot || 'morning').toLowerCase() === slot.name.toLowerCase()
                );

                return (
                  <div
                    key={idx}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                        <Icon size={20} />
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">{slot.time}</span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">{slot.name} Slot</h3>
                      <p className="text-xs text-slate-500">{slotVerses.length} Verses in Rotation</p>
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400">
                      Advances automatically based on schedule start epoch.
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* PREVIEW MODAL */}
          {previewVerse && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
                <button
                  type="button"
                  onClick={() => setPreviewVerse(null)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
                >
                  <X size={18} />
                </button>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                    Cycle #{previewVerse.index} &bull; {previewVerse.slot || 'Morning'}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {previewVerse.referenceEn}
                  </h3>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <p className="text-slate-800 dark:text-slate-200 font-serif italic text-sm">
                    &ldquo;{previewVerse.verseEn}&rdquo;
                  </p>
                  {previewVerse.verseTe && (
                    <p className="text-slate-600 dark:text-slate-400 font-serif text-sm border-t border-slate-200 dark:border-slate-800/80 pt-2">
                      {previewVerse.verseTe}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminNavigationShell>
    </ProtectedRoute>
  );
}
