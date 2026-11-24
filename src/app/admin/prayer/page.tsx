'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminNavigationShell } from '@/components/layout/AdminNavigationShell';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  HeartHandshake,
  Shield,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  Lock,
  Sparkles,
  Archive,
  AlertTriangle,
  Clock,
  User,
  Phone,
  Eye,
  EyeOff,
  X,
  MessageSquare,
  Plus,
  Send,
  RefreshCw,
  Trash2,
  AlertCircle,
  BookOpen,
  Share2,
} from 'lucide-react';

export type PrayerCategory =
  | 'Healing & Health'
  | 'Family & Marriage'
  | 'Financial Provision'
  | 'Spiritual Growth'
  | 'Deliverance & Protection'
  | 'Academic & Career'
  | 'General Prayer';

export interface FirebasePrayerRecord {
  id: string;
  uid?: string;
  authorId?: string;
  authorName?: string;
  name?: string;
  memberName?: string;
  phone?: string;
  contactPhone?: string;
  title?: string;
  request?: string;
  text?: string;
  description?: string;
  requestEn?: string;
  textTe?: string;
  requestTe?: string;
  category?: PrayerCategory | string;
  isPublic?: boolean;
  type?: 'public' | 'private' | string;
  isAnswered?: boolean;
  status?: 'pending' | 'approved' | 'answered' | 'rejected' | string;
  lastAdminResponse?: string;
  pastoralNote?: string;
  lastAdminName?: string;
  bibleVerse?: string;
  verseReference?: string;
  verseText?: string;
  verseReferenceTe?: string;
  verseTextTe?: string;
  intercessorName?: string;
  intercessorId?: string;
  rejectionReason?: string;
  createdAt?: any;
  updatedAt?: any;
}

const CATEGORY_OPTIONS: PrayerCategory[] = [
  'Healing & Health',
  'Family & Marriage',
  'Financial Provision',
  'Spiritual Growth',
  'Deliverance & Protection',
  'Academic & Career',
  'General Prayer',
];

const EMERGENCY_KEYWORDS = [
  'icu',
  'hospital',
  'critical',
  'emergency',
  'accident',
  'oxygen',
  'surgery',
  'urgent',
  'cancer',
  'ventilator',
];

export default function PrayerModerationAdminPage() {
  const { user, profile } = useAuth();
  const [prayers, setPrayers] = useState<FirebasePrayerRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Review Modal State
  const [reviewItem, setReviewItem] = useState<FirebasePrayerRecord | null>(null);
  const [decisionType, setDecisionType] = useState<'wall' | 'pastoral' | 'reject'>('wall');
  const [pastoralNote, setPastoralNote] = useState('');
  const [scriptureRef, setScriptureRef] = useState('');
  const [scriptureText, setScriptureText] = useState('');
  const [intercessorName, setIntercessorName] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmittingModeration, setIsSubmittingModeration] = useState(false);

  // Delete State
  const [deletingPrayer, setDeletingPrayer] = useState<FirebasePrayerRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Detail Modal
  const [detailItem, setDetailItem] = useState<FirebasePrayerRecord | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Fetch live prayer requests from Firestore
  const loadPrayers = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      const colRef = collection(db, 'Rhema Church', 'rhema', 'prayerRequests');
      const snap = await getDocs(colRef);
      const list: FirebasePrayerRecord[] = [];

      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          uid: data.uid || data.authorId || '',
          authorId: data.authorId || data.uid || '',
          authorName: data.authorName || data.name || data.memberName || 'Church Member',
          name: data.name || data.authorName || 'Church Member',
          phone: data.phone || data.contactPhone || '',
          title: data.title || data.request || data.text || 'Prayer Petition',
          request: data.request || data.text || data.description || '',
          text: data.text || data.request || data.description || '',
          description: data.description || data.text || '',
          textTe: data.textTe || data.requestTe || '',
          category: data.category || 'General Prayer',
          isPublic: data.isPublic ?? (data.type === 'public'),
          type: data.type || (data.isPublic ? 'public' : 'private'),
          isAnswered: Boolean(data.isAnswered),
          status: data.status || (data.isAnswered ? 'answered' : 'pending'),
          lastAdminResponse: data.lastAdminResponse || data.pastoralNote || '',
          pastoralNote: data.pastoralNote || data.lastAdminResponse || '',
          lastAdminName: data.lastAdminName || '',
          bibleVerse: data.bibleVerse || data.verseReference || '',
          verseReference: data.verseReference || data.bibleVerse || '',
          verseText: data.verseText || '',
          intercessorName: data.intercessorName || '',
          intercessorId: data.intercessorId || '',
          rejectionReason: data.rejectionReason || '',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });

      // Sort by creation date or ID descending
      list.sort((a, b) => {
        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return tB - tA;
      });

      setPrayers(list);
    } catch (err: any) {
      console.error('Failed to load prayer requests:', err);
      setError('Unable to load prayer requests from Firestore. Please verify permissions.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPrayers();
  }, [loadPrayers]);

  // Emergency Priority Detection
  const hasEmergencyKeywords = (text: string) => {
    const lower = text.toLowerCase();
    return EMERGENCY_KEYWORDS.some((kw) => lower.includes(kw));
  };

  // Filtered Prayers
  const filteredPrayers = useMemo(() => {
    return prayers.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        (p.authorName && p.authorName.toLowerCase().includes(q)) ||
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.text && p.text.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q));

      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;

      let matchesStatus = true;
      if (selectedStatus === 'Pending') {
        matchesStatus = !p.isAnswered && p.status !== 'rejected';
      } else if (selectedStatus === 'Answered') {
        matchesStatus = Boolean(p.isAnswered);
      } else if (selectedStatus === 'Rejected') {
        matchesStatus = p.status === 'rejected';
      } else if (selectedStatus === 'Public') {
        matchesStatus = Boolean(p.isPublic);
      } else if (selectedStatus === 'Confidential') {
        matchesStatus = !p.isPublic;
      }

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [prayers, searchQuery, selectedCategory, selectedStatus]);

  // KPIs
  const stats = useMemo(() => {
    const total = prayers.length;
    const pending = prayers.filter((p) => !p.isAnswered && p.status !== 'rejected').length;
    const answered = prayers.filter((p) => p.isAnswered).length;
    const urgent = prayers.filter((p) => !p.isAnswered && hasEmergencyKeywords(p.text || '')).length;

    return { total, pending, answered, urgent };
  }, [prayers]);

  // Open Review Modal
  const openReviewModal = (item: FirebasePrayerRecord) => {
    setReviewItem(item);
    setDecisionType(item.isPublic ? 'wall' : 'pastoral');
    setPastoralNote(item.lastAdminResponse || '');
    setScriptureRef(item.bibleVerse || '');
    setScriptureText(item.verseText || '');
    setIntercessorName(item.intercessorName || '');
    setRejectionReason(item.rejectionReason || '');
  };

  // Submit Moderation Action
  const handleSaveModeration = async () => {
    if (!reviewItem) return;

    try {
      setIsSubmittingModeration(true);
      const docRef = doc(db, 'Rhema Church', 'rhema', 'prayerRequests', reviewItem.id);
      const adminName = profile?.fullName || user?.displayName || 'Pastor Gabriel';

      if (decisionType === 'wall') {
        // Approve for Wall (Public)
        await updateDoc(docRef, {
          isPublic: true,
          isAnswered: true,
          status: 'approved',
          lastAdminResponse: pastoralNote.trim() || 'Prayed and approved for church wall.',
          lastAdminName: adminName,
          bibleVerse: scriptureRef.trim() || null,
          verseReference: scriptureRef.trim() || null,
          verseText: scriptureText.trim() || null,
          intercessorName: intercessorName.trim() || null,
          updatedAt: serverTimestamp(),
        });
        showToast(`Prayer request approved for Public Prayer Wall`);
      } else if (decisionType === 'pastoral') {
        // Answer Privately (Confidential)
        await updateDoc(docRef, {
          isPublic: false,
          isAnswered: true,
          status: 'answered',
          lastAdminResponse: pastoralNote.trim() || 'Pastoral team has prayed for your petition.',
          lastAdminName: adminName,
          bibleVerse: scriptureRef.trim() || null,
          verseReference: scriptureRef.trim() || null,
          verseText: scriptureText.trim() || null,
          intercessorName: intercessorName.trim() || null,
          updatedAt: serverTimestamp(),
        });
        showToast(`Pastoral response saved privately`);
      } else if (decisionType === 'reject') {
        // Reject
        await updateDoc(docRef, {
          status: 'rejected',
          isPublic: false,
          rejectionReason: rejectionReason.trim() || 'Did not meet church community guidelines.',
          lastAdminName: adminName,
          updatedAt: serverTimestamp(),
        });
        showToast(`Prayer request rejected`);
      }

      setReviewItem(null);
      loadPrayers();
    } catch (err: any) {
      console.error('Failed to update prayer request moderation:', err);
      showToast('Error updating prayer: ' + (err.message || 'Permission denied'));
    } finally {
      setIsSubmittingModeration(false);
    }
  };

  // Delete Prayer Request
  const handleConfirmDelete = async () => {
    if (!deletingPrayer) return;

    try {
      setIsDeleting(true);
      const docRef = doc(db, 'Rhema Church', 'rhema', 'prayerRequests', deletingPrayer.id);
      await deleteDoc(docRef);
      showToast(`Prayer request deleted`);
      setDeletingPrayer(null);
      loadPrayers();
    } catch (err: any) {
      console.error('Failed to delete prayer request:', err);
      showToast('Error deleting prayer request: ' + (err.message || 'Permission denied'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
      <AdminNavigationShell>
        <div className="space-y-6">
          {/* Toast */}
          {toastMessage && (
            <div className="fixed top-6 right-6 z-50 bg-slate-900 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 size={18} className="text-emerald-400" />
              <span className="text-xs font-semibold">{toastMessage}</span>
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <HeartHandshake size={26} />
              </span>
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Prayer Moderation Hub</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Live Firestore
                  </span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pastoral Intercession &bull; Public prayer wall curation, confidential care &amp; scripture replies
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadPrayers()}
                disabled={isRefreshing}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-slate-700 dark:text-slate-200"
              >
                <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 flex items-center gap-3 text-xs">
              <AlertCircle size={18} className="text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* KPI Analytics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Requests
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900 dark:text-white">{stats.total}</span>
                <span className="text-xs text-slate-400 font-medium">In Church Database</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                Pending Moderation
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-amber-500">{stats.pending}</span>
                <span className="text-xs text-amber-400/80 font-bold">Needs Review</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                Answered &amp; Prayed
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-emerald-500">{stats.answered}</span>
                <CheckCircle2 size={16} className="text-emerald-500" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                Urgent Petitions
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-red-400">{stats.urgent}</span>
                <AlertTriangle size={16} className="text-red-400" />
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search petitions by author, keywords, illness or category..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="All">All Categories</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending Review</option>
                <option value="Answered">Answered / Processed</option>
                <option value="Rejected">Rejected</option>
                <option value="Public">Public Only</option>
                <option value="Confidential">Confidential Only</option>
              </select>
            </div>
          </div>

          {/* Prayer Request Cards List */}
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
              <RefreshCw size={24} className="animate-spin text-emerald-500" />
              <span className="text-xs">Loading prayer requests from Firestore...</span>
            </div>
          ) : filteredPrayers.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
              <HeartHandshake size={32} className="mx-auto text-slate-400" />
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                No prayer petitions found
              </div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery || selectedCategory !== 'All' || selectedStatus !== 'All'
                  ? 'No petitions match your active filters. Try resetting the criteria.'
                  : 'No member prayer petitions submitted yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPrayers.map((item) => {
                const isEmergency = hasEmergencyKeywords(item.text || '');
                return (
                  <div
                    key={item.id}
                    className={`rounded-3xl p-5 border shadow-sm transition-all flex flex-col justify-between space-y-4 ${
                      isEmergency && !item.isAnswered
                        ? 'bg-red-500/5 dark:bg-red-950/20 border-red-500/30'
                        : item.isAnswered
                        ? 'bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/20'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            {item.category || 'General'}
                          </span>

                          {item.isPublic ? (
                            <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 text-[10px] font-bold flex items-center gap-1">
                              <Eye size={11} />
                              <span>Wall (Public)</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-bold flex items-center gap-1">
                              <Lock size={11} />
                              <span>Confidential</span>
                            </span>
                          )}

                          {isEmergency && !item.isAnswered && (
                            <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 border border-red-500/30 text-[10px] font-bold flex items-center gap-1 animate-pulse">
                              <AlertTriangle size={11} />
                              <span>URGENT</span>
                            </span>
                          )}
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            item.status === 'rejected'
                              ? 'bg-red-500/10 text-red-500 border-red-500/30'
                              : item.isAnswered
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                          }`}
                        >
                          {item.status === 'rejected'
                            ? 'Rejected'
                            : item.isAnswered
                            ? 'Processed'
                            : 'Pending'}
                        </span>
                      </div>

                      {/* Requester Info */}
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold text-[11px]">
                          {item.authorName ? item.authorName[0] : 'M'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {item.authorName}
                          </div>
                          {item.phone && (
                            <div className="text-[10px] font-mono text-slate-400">
                              {item.phone.slice(0, 4)}••••{item.phone.slice(-3)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Prayer Content */}
                      <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-serif">
                        &ldquo;{item.text || item.request || item.title}&rdquo;
                      </p>

                      {/* Attached Bible Verse if present */}
                      {(item.bibleVerse || item.verseReference) && (
                        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300">
                            <BookOpen size={13} />
                            <span>Scripture: {item.bibleVerse || item.verseReference}</span>
                          </div>
                          {item.verseText && (
                            <p className="italic text-[11px] font-serif">&ldquo;{item.verseText}&rdquo;</p>
                          )}
                        </div>
                      )}

                      {/* Admin Response Note */}
                      {item.lastAdminResponse && (
                        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                          <span className="font-bold block text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-0.5">
                            Pastor Note &bull; {item.lastAdminName || 'Pastor'}
                          </span>
                          <p className="text-[11px]">{item.lastAdminResponse}</p>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => openReviewModal(item)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                      >
                        <HeartHandshake size={14} />
                        <span>Moderate / Pray</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setDeletingPrayer(item)}
                          className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Delete prayer request"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* MODERATION MODAL */}
          {reviewItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setReviewItem(null)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
                >
                  <X size={18} />
                </button>

                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <HeartHandshake size={20} className="text-emerald-500" />
                    <span>Pastoral Moderation &amp; Prayer</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Petitioner:{' '}
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {reviewItem.authorName}
                    </span>{' '}
                    &bull; Category: {reviewItem.category}
                  </p>
                </div>

                {/* Original Prayer Text */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-serif italic text-slate-800 dark:text-slate-200">
                  &ldquo;{reviewItem.text || reviewItem.request}&rdquo;
                </div>

                {/* Moderation Decision */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Moderation Action
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setDecisionType('wall')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                        decisionType === 'wall'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Eye size={16} />
                      <span>Approve (Wall)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDecisionType('pastoral')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                        decisionType === 'pastoral'
                          ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Lock size={16} />
                      <span>Pastoral Care</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDecisionType('reject')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                        decisionType === 'reject'
                          ? 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <X size={16} />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>

                {decisionType !== 'reject' ? (
                  <>
                    {/* Pastoral Encouragement Note */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Pastoral Response Note
                      </label>
                      <textarea
                        rows={2}
                        value={pastoralNote}
                        onChange={(e) => setPastoralNote(e.target.value)}
                        placeholder="Encouragement message from Pastor..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none resize-none"
                      />
                    </div>

                    {/* Bible Verse Encouragement */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                          Scripture Reference
                        </label>
                        <input
                          type="text"
                          value={scriptureRef}
                          onChange={(e) => setScriptureRef(e.target.value)}
                          placeholder="e.g. Philippians 4:19"
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                          Intercessor Assigned
                        </label>
                        <input
                          type="text"
                          value={intercessorName}
                          onChange={(e) => setIntercessorName(e.target.value)}
                          placeholder="e.g. Prayer Team Alpha"
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Scripture Promise Text
                      </label>
                      <input
                        type="text"
                        value={scriptureText}
                        onChange={(e) => setScriptureText(e.target.value)}
                        placeholder="And my God will meet all your needs according to the riches of his glory..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Rejection Reason
                    </label>
                    <textarea
                      rows={2}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Explain why this petition cannot be published..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none resize-none"
                    />
                  </div>
                )}

                {/* Submit Action */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewItem(null)}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveModeration}
                    disabled={isSubmittingModeration}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-950/20 flex items-center gap-1.5"
                  >
                    {isSubmittingModeration && <RefreshCw size={13} className="animate-spin" />}
                    <span>Confirm Action</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CONFIRM DELETE MODAL */}
          {deletingPrayer && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-center">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto border border-red-500/20">
                  <Trash2 size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Prayer Petition?</h3>
                  <p className="text-xs text-slate-500">
                    Are you sure you want to permanently delete this prayer petition by{' '}
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {deletingPrayer.authorName}
                    </span>
                    ?
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDeletingPrayer(null)}
                    disabled={isDeleting}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                    className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-red-950/20 flex items-center gap-1.5"
                  >
                    {isDeleting && <RefreshCw size={13} className="animate-spin" />}
                    <span>Confirm Delete</span>
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
