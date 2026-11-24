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
  serverTimestamp,
} from 'firebase/firestore';
import {
  MessageSquareQuote,
  Shield,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  Heart,
  Sparkles,
  Archive,
  HelpCircle,
  Clock,
  User,
  Phone,
  Eye,
  EyeOff,
  X,
  Plus,
  Star,
  ThumbsUp,
  Calendar,
  Tag,
  AlertCircle,
  Edit3,
  Video,
  FileText,
  Trash2,
  RefreshCw,
  Lock,
  Globe,
  Share2,
} from 'lucide-react';

export type TestimonyPrivacy = 'Private' | 'Public';
export type TestimonyStatus =
  | 'Pending Review'
  | 'Private'
  | 'Approved'
  | 'Published'
  | 'Rejected';

export type TestimonyCategory =
  | 'Miraculous Healing'
  | 'Financial & Job Breakthrough'
  | 'Family Deliverance'
  | 'Salvation Experience'
  | 'Academic Success'
  | 'General Thanksgiving'
  | 'Other';

export interface FirebaseTestimonyRecord {
  id: string;
  testimonyId?: string;
  memberId: string;
  memberName?: string;
  memberPhone?: string;
  memberPhotoUrl?: string;
  title: string;
  description?: string;
  writtenContent?: string;
  category: TestimonyCategory | string;
  testimonyType?: 'Written' | 'Video' | 'Document' | 'Mixed';
  videoStoragePath?: string | null;
  videoDurationMs?: number | null;
  privacy: TestimonyPrivacy;
  status: TestimonyStatus;
  reviewedAt?: any;
  reviewedBy?: string | null;
  reviewedByName?: string | null;
  publishedAt?: any;
  rejectionReason?: string | null;
  createdAt?: any;
  updatedAt?: any;
}

const TESTIMONY_CATEGORIES: TestimonyCategory[] = [
  'Miraculous Healing',
  'Financial & Job Breakthrough',
  'Family Deliverance',
  'Salvation Experience',
  'Academic Success',
  'General Thanksgiving',
  'Other',
];

export default function TestimonyModerationAdminPage() {
  const { user, profile } = useAuth();
  const [testimonies, setTestimonies] = useState<FirebaseTestimonyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Review Modal State
  const [reviewItem, setReviewItem] = useState<FirebaseTestimonyRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isSubmittingModeration, setIsSubmittingModeration] = useState(false);

  // Delete State
  const [deletingTestimony, setDeletingTestimony] = useState<FirebaseTestimonyRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Detail Modal State
  const [detailItem, setDetailItem] = useState<FirebaseTestimonyRecord | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Fetch live testimonies from Firestore
  const loadTestimonies = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      const colRef = collection(db, 'Rhema Church', 'rhema', 'testimonies');
      const snap = await getDocs(colRef);
      const list: FirebaseTestimonyRecord[] = [];

      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          testimonyId: d.id,
          memberId: data.memberId || '',
          memberName: data.memberName || 'Congregation Member',
          memberPhone: data.memberPhone || '',
          memberPhotoUrl: data.memberPhotoUrl || '',
          title: data.title || 'Thanksgiving Testimony',
          description: data.description || data.writtenContent || '',
          writtenContent: data.writtenContent || data.description || '',
          category: data.category || 'General Thanksgiving',
          testimonyType: data.testimonyType || (data.videoStoragePath ? 'Video' : 'Written'),
          videoStoragePath: data.videoStoragePath || null,
          videoDurationMs: data.videoDurationMs || null,
          privacy: (data.privacy as TestimonyPrivacy) || 'Public',
          status: (data.status as TestimonyStatus) || 'Pending Review',
          reviewedAt: data.reviewedAt,
          reviewedBy: data.reviewedBy || null,
          reviewedByName: data.reviewedByName || null,
          publishedAt: data.publishedAt,
          rejectionReason: data.rejectionReason || null,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });

      // Sort by creation date descending
      list.sort((a, b) => {
        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return tB - tA;
      });

      setTestimonies(list);
    } catch (err: any) {
      console.error('Failed to load testimonies:', err);
      setError('Unable to load testimonies from Firestore. Please verify permissions.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTestimonies();
  }, [loadTestimonies]);

  // Filtered Testimonies
  const filteredTestimonies = useMemo(() => {
    return testimonies.filter((t) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        t.title.toLowerCase().includes(q) ||
        (t.memberName && t.memberName.toLowerCase().includes(q)) ||
        (t.writtenContent && t.writtenContent.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q));

      const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
      const matchesStatus = selectedStatus === 'All' || t.status === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [testimonies, searchQuery, selectedCategory, selectedStatus]);

  // KPIs
  const stats = useMemo(() => {
    const total = testimonies.length;
    const pending = testimonies.filter((t) => t.status === 'Pending Review').length;
    const published = testimonies.filter((t) => t.status === 'Published').length;
    const videoCount = testimonies.filter((t) => t.testimonyType === 'Video' || Boolean(t.videoStoragePath)).length;

    return { total, pending, published, videoCount };
  }, [testimonies]);

  // Admin Moderation: Approve Testimony
  const handleApprove = async (item: FirebaseTestimonyRecord) => {
    try {
      const docRef = doc(db, 'Rhema Church', 'rhema', 'testimonies', item.id);
      const adminName = profile?.fullName || user?.displayName || 'Pastor Gabriel';

      await updateDoc(docRef, {
        status: 'Approved',
        reviewedAt: serverTimestamp(),
        reviewedBy: user?.uid || 'admin',
        reviewedByName: adminName,
        rejectionReason: null,
        updatedAt: serverTimestamp(),
      });
      showToast(`Testimony approved`);
      loadTestimonies();
    } catch (err: any) {
      console.error('Failed to approve testimony:', err);
      showToast('Error approving testimony: ' + (err.message || 'Permission denied'));
    }
  };

  // Admin Moderation: Publish Approved Testimony
  const handlePublish = async (item: FirebaseTestimonyRecord) => {
    // Critical Rule Invariant: !(resource.data.privacy == 'Private' && request.resource.data.status == 'Published')
    if (item.privacy === 'Private') {
      showToast('Security Alert: Private pastoral testimonies cannot be published publicly');
      return;
    }

    try {
      const docRef = doc(db, 'Rhema Church', 'rhema', 'testimonies', item.id);
      const adminName = profile?.fullName || user?.displayName || 'Pastor Gabriel';

      await updateDoc(docRef, {
        status: 'Published',
        publishedAt: serverTimestamp(),
        reviewedAt: serverTimestamp(),
        reviewedBy: user?.uid || 'admin',
        reviewedByName: adminName,
        rejectionReason: null,
        updatedAt: serverTimestamp(),
      });
      showToast(`Testimony published to Public Feed`);
      loadTestimonies();
    } catch (err: any) {
      console.error('Failed to publish testimony:', err);
      showToast('Error publishing testimony: ' + (err.message || 'Permission denied'));
    }
  };

  // Admin Moderation: Unpublish Testimony
  const handleUnpublish = async (item: FirebaseTestimonyRecord) => {
    try {
      const docRef = doc(db, 'Rhema Church', 'rhema', 'testimonies', item.id);
      const adminName = profile?.fullName || user?.displayName || 'Pastor Gabriel';

      await updateDoc(docRef, {
        status: 'Approved',
        publishedAt: null,
        reviewedBy: user?.uid || 'admin',
        reviewedByName: adminName,
        updatedAt: serverTimestamp(),
      });
      showToast(`Testimony unpublished from Public Feed`);
      loadTestimonies();
    } catch (err: any) {
      console.error('Failed to unpublish testimony:', err);
      showToast('Error unpublishing: ' + (err.message || 'Permission denied'));
    }
  };

  // Admin Moderation: Reject Testimony
  const handleReject = async () => {
    if (!reviewItem) return;

    if (reviewItem.privacy === 'Private') {
      showToast('Private testimonies are pastoral care records and cannot be rejected as public submissions.');
      setReviewItem(null);
      return;
    }

    try {
      setIsSubmittingModeration(true);
      const docRef = doc(db, 'Rhema Church', 'rhema', 'testimonies', reviewItem.id);
      const adminName = profile?.fullName || user?.displayName || 'Pastor Gabriel';

      await updateDoc(docRef, {
        status: 'Rejected',
        rejectionReason: rejectionReason.trim() || 'Submission did not meet publication standards.',
        publishedAt: null,
        reviewedAt: serverTimestamp(),
        reviewedBy: user?.uid || 'admin',
        reviewedByName: adminName,
        updatedAt: serverTimestamp(),
      });
      showToast(`Testimony marked as Rejected`);
      setReviewItem(null);
      setRejectionReason('');
      loadTestimonies();
    } catch (err: any) {
      console.error('Failed to reject testimony:', err);
      showToast('Error rejecting testimony: ' + (err.message || 'Permission denied'));
    } finally {
      setIsSubmittingModeration(false);
    }
  };

  // Delete Testimony
  const handleConfirmDelete = async () => {
    if (!deletingTestimony) return;

    try {
      setIsDeleting(true);
      const docRef = doc(db, 'Rhema Church', 'rhema', 'testimonies', deletingTestimony.id);
      await deleteDoc(docRef);
      showToast(`Testimony deleted`);
      setDeletingTestimony(null);
      loadTestimonies();
    } catch (err: any) {
      console.error('Failed to delete testimony:', err);
      showToast('Error deleting testimony: ' + (err.message || 'Permission denied'));
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
                <MessageSquareQuote size={26} />
              </span>
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Testimonies Moderation Studio</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Live Firestore
                  </span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Congregation Thanksgiving &bull; Public feed moderation, privacy safeguards &amp; video testimonies
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadTestimonies()}
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
                Total Testimonies
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900 dark:text-white">{stats.total}</span>
                <span className="text-xs text-slate-400 font-medium">In Church Database</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                Pending Review
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-amber-500">{stats.pending}</span>
                <span className="text-xs text-amber-400/80 font-bold">Needs Moderation</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                Published Feed
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-emerald-500">{stats.published}</span>
                <Globe size={16} className="text-emerald-500" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                Video Testimonies
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-teal-400">{stats.videoCount}</span>
                <Video size={16} className="text-teal-400" />
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
                placeholder="Search testimonies by author, title, healing or breakthrough..."
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
                {TESTIMONY_CATEGORIES.map((c) => (
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
                <option value="Pending Review">Pending Review</option>
                <option value="Approved">Approved</option>
                <option value="Published">Published (Live)</option>
                <option value="Rejected">Rejected</option>
                <option value="Private">Private Pastoral Care</option>
              </select>
            </div>
          </div>

          {/* Testimonies Grid */}
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
              <RefreshCw size={24} className="animate-spin text-emerald-500" />
              <span className="text-xs">Loading testimonies from Firestore...</span>
            </div>
          ) : filteredTestimonies.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
              <MessageSquareQuote size={32} className="mx-auto text-slate-400" />
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                No testimonies found
              </div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery || selectedCategory !== 'All' || selectedStatus !== 'All'
                  ? 'No testimonies match your active filters.'
                  : 'No member testimonies submitted yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTestimonies.map((item) => {
                const isPrivate = item.privacy === 'Private';

                return (
                  <div
                    key={item.id}
                    className={`rounded-3xl p-5 border shadow-sm transition-all flex flex-col justify-between space-y-4 ${
                      item.status === 'Published'
                        ? 'bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/30'
                        : item.status === 'Pending Review'
                        ? 'bg-amber-500/5 dark:bg-amber-950/20 border-amber-500/30'
                        : item.status === 'Rejected'
                        ? 'bg-red-500/5 dark:bg-red-950/20 border-red-500/20'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            {item.category}
                          </span>

                          {isPrivate ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-bold flex items-center gap-1">
                              <Lock size={11} />
                              <span>Private Pastoral</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 text-[10px] font-bold flex items-center gap-1">
                              <Globe size={11} />
                              <span>Public</span>
                            </span>
                          )}

                          {item.videoStoragePath && (
                            <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-[10px] font-bold flex items-center gap-1">
                              <Video size={11} />
                              <span>Video</span>
                            </span>
                          )}
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            item.status === 'Published'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : item.status === 'Approved'
                              ? 'bg-teal-500/10 text-teal-400 border-teal-500/30'
                              : item.status === 'Rejected'
                              ? 'bg-red-500/10 text-red-400 border-red-500/30'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>

                      {/* Title & Author */}
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                          {item.title}
                        </h3>
                        <div className="flex items-center gap-2 pt-1 text-xs text-slate-500">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {item.memberName}
                          </span>
                          {item.memberPhone && (
                            <span className="text-[10px] font-mono">
                              &bull; {item.memberPhone.slice(0, 4)}••••{item.memberPhone.slice(-3)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-serif line-clamp-3">
                        &ldquo;{item.writtenContent || item.description}&rdquo;
                      </p>

                      {/* Video Preview Link / Player if present */}
                      {item.videoStoragePath && (
                        <div className="p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between text-xs text-purple-700 dark:text-purple-300">
                          <div className="flex items-center gap-2 truncate">
                            <Video size={15} />
                            <span className="truncate font-medium">Video Testimony Attached</span>
                          </div>
                          {item.videoStoragePath.startsWith('http') && (
                            <a
                              href={item.videoStoragePath}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px]"
                            >
                              Watch
                            </a>
                          )}
                        </div>
                      )}

                      {/* Rejection Note */}
                      {item.rejectionReason && (
                        <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-300">
                          <span className="font-bold block text-[10px] uppercase tracking-wider mb-0.5">
                            Rejection Reason
                          </span>
                          <p className="text-[11px]">{item.rejectionReason}</p>
                        </div>
                      )}
                    </div>

                    {/* Moderation Actions */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.status !== 'Approved' && item.status !== 'Published' && (
                          <button
                            type="button"
                            onClick={() => handleApprove(item)}
                            className="px-2.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                          >
                            <CheckCircle2 size={13} />
                            <span>Approve</span>
                          </button>
                        )}

                        {item.status === 'Approved' && !isPrivate && (
                          <button
                            type="button"
                            onClick={() => handlePublish(item)}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                          >
                            <Globe size={13} />
                            <span>Publish to Feed</span>
                          </button>
                        )}

                        {item.status === 'Published' && (
                          <button
                            type="button"
                            onClick={() => handleUnpublish(item)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-600 hover:bg-slate-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                          >
                            <EyeOff size={13} />
                            <span>Unpublish</span>
                          </button>
                        )}

                        {item.status !== 'Rejected' && !isPrivate && (
                          <button
                            type="button"
                            onClick={() => {
                              setReviewItem(item);
                              setRejectionReason('');
                            }}
                            className="px-2.5 py-1.5 rounded-xl border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-500/10 text-xs font-bold transition-all"
                          >
                            Reject
                          </button>
                        )}

                        {isPrivate && (
                          <span className="text-[10px] text-amber-500 font-semibold italic">
                            Private Pastoral Record (Protected from Public Feed)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setDeletingTestimony(item)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Delete testimony"
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

          {/* REJECT MODAL */}
          {reviewItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
                <button
                  type="button"
                  onClick={() => setReviewItem(null)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
                >
                  <X size={18} />
                </button>

                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldAlert size={20} className="text-red-500" />
                    <span>Reject Testimony</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Rejecting testimony from{' '}
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {reviewItem.memberName}
                    </span>
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Rejection Reason
                  </label>
                  <textarea
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter reason for rejection (e.g. Needs theological clarification, inappropriate language, duplicate submission)..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewItem(null)}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={isSubmittingModeration}
                    className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-red-950/20 flex items-center gap-1.5"
                  >
                    {isSubmittingModeration && <RefreshCw size={13} className="animate-spin" />}
                    <span>Confirm Rejection</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CONFIRM DELETE MODAL */}
          {deletingTestimony && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-center">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto border border-red-500/20">
                  <Trash2 size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Testimony?</h3>
                  <p className="text-xs text-slate-500">
                    Are you sure you want to permanently delete{' '}
                    <span className="font-semibold text-slate-900 dark:text-white">
                      &ldquo;{deletingTestimony.title}&rdquo;
                    </span>
                    ?
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDeletingTestimony(null)}
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
