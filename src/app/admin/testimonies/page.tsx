'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminNavigationShell } from '@/components/layout/AdminNavigationShell';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  limit,
} from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import {
  Sparkles,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Lock,
  Globe,
  Play,
  Pause,
  RotateCcw,
  FileText,
  Image as ImageIcon,
  Download,
  User,
  Phone,
  PhoneCall,
  Calendar,
  Trash2,
  Eye,
  EyeOff,
  X,
  Plus,
  Star,
  ThumbsUp,
  Tag,
  Edit3,
  Video,
  RefreshCw,
  Share2,
  BookOpen,
  MessageSquareQuote,
  ShieldAlert,
} from 'lucide-react';

export type TestimonyPrivacy = 'Private' | 'Public';
export type TestimonyStatus =
  | 'Pending Review'
  | 'Private'
  | 'Approved'
  | 'Published'
  | 'Rejected';

export type TestimonyCategory =
  | 'Healing'
  | 'Salvation'
  | 'Provision'
  | 'Family & Marriage'
  | 'Deliverance'
  | 'Answered Prayer'
  | 'Career & Education'
  | 'Miraculous Healing'
  | 'Financial & Job Breakthrough'
  | 'Family Deliverance'
  | 'Salvation Experience'
  | 'Academic Success'
  | 'General Thanksgiving'
  | 'Other';

export interface TestimonyAttachment {
  path: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
}

export interface FirebaseTestimonyRecord {
  id: string;
  testimonyId: string;
  memberId: string;
  memberName?: string;
  memberPhone?: string;
  memberPhotoUrl?: string | null;
  title: string;
  description?: string;
  writtenContent?: string;
  category: TestimonyCategory | string;
  testimonyType?: 'Written' | 'Video' | 'Document' | 'Mixed';
  videoStoragePath?: string | null;
  videoDurationMs?: number | null;
  videoSizeBytes?: number | null;
  attachmentStoragePaths?: TestimonyAttachment[];
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

// 5 Mobile Required Categories
const ADMIN_STATUS_TABS: TestimonyStatus[] = [
  'Pending Review',
  'Private',
  'Approved',
  'Published',
  'Rejected',
];

const TESTIMONY_CATEGORIES: TestimonyCategory[] = [
  'Healing',
  'Salvation',
  'Provision',
  'Family & Marriage',
  'Deliverance',
  'Answered Prayer',
  'Career & Education',
  'Other',
];

const ALL_FILTER_CATEGORIES: string[] = [
  'All',
  'Healing',
  'Salvation',
  'Provision',
  'Family & Marriage',
  'Deliverance',
  'Answered Prayer',
  'Career & Education',
  'Miraculous Healing',
  'Financial & Job Breakthrough',
  'Family Deliverance',
  'General Thanksgiving',
  'Other',
];

function formatDate(ts: any): string {
  if (!ts) return '—';
  try {
    const date =
      typeof ts.toDate === 'function'
        ? ts.toDate()
        : typeof ts.seconds === 'number'
        ? new Date(ts.seconds * 1000)
        : new Date(ts);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function formatDuration(ms?: number | null): string {
  if (!ms || ms <= 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function getInitials(name?: string): string {
  if (!name) return 'M';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getPhoneDigits(phone?: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export default function TestimonyModerationAdminPage() {
  const { user, profile } = useAuth();
  const adminName = profile?.fullName || user?.displayName || 'Pastor Gabriel';

  const [testimonies, setTestimonies] = useState<FirebaseTestimonyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedTab, setSelectedTab] = useState<TestimonyStatus | 'All'>('Pending Review');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Cached member records to resolve live profile photos for all testimonies
  const [memberProfilesMap, setMemberProfilesMap] = useState<
    Record<string, { photoURL: string; name: string }>
  >({});

  // Inspection & Review Modal State
  const [selectedTestimony, setSelectedTestimony] = useState<FirebaseTestimonyRecord | null>(null);
  const [processingAction, setProcessingAction] = useState(false);

  // Reject Reason Modal State
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  // Video State inside modal
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Delete State
  const [deletingTestimony, setDeletingTestimony] = useState<FirebaseTestimonyRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
          memberPhotoUrl: data.memberPhotoUrl || null,
          title: data.title || 'Thanksgiving Testimony',
          description: data.description || data.writtenContent || '',
          writtenContent: data.writtenContent || data.description || '',
          category: data.category || 'Healing',
          testimonyType: data.testimonyType || (data.videoStoragePath ? 'Video' : 'Written'),
          videoStoragePath: data.videoStoragePath || null,
          videoDurationMs: data.videoDurationMs || null,
          videoSizeBytes: data.videoSizeBytes || null,
          attachmentStoragePaths: Array.isArray(data.attachmentStoragePaths) ? data.attachmentStoragePaths : [],
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
        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
        return tB - tA;
      });

      setTestimonies(list);

      // Fetch member photos (loading all church members to resolve live profile photos)
      try {
        const membersRef = collection(db, 'Rhema Church', 'rhema', 'members');
        const mSnap = await getDocs(membersRef);
        const map: Record<string, { photoURL: string; name: string }> = {};
        mSnap.forEach((mDoc) => {
          const mData = mDoc.data();
          const pUrl =
            mData.profilePhoto ||
            mData.ProfilePhoto ||
            mData.photoURL ||
            mData.photoUrl ||
            mData.Photo ||
            mData.PhotoUrl ||
            mData.profileImage ||
            mData.profileImageUrl ||
            mData.avatar ||
            mData.avatarUrl ||
            mData.photo ||
            mData.image ||
            mData.picture ||
            mData.profilePhotoUrl ||
            '';
          const name = mData.name || mData.fullName || mData.displayName || '';
          if (pUrl) {
            const entry = { photoURL: pUrl, name };
            map[mDoc.id] = entry;
            if (mData.uid) map[mData.uid] = entry;
            if (mData.id) map[mData.id] = entry;
            if (mData.memberId) map[mData.memberId] = entry;
            if (mData.phone) {
              map[mData.phone] = entry;
              const clean = String(mData.phone).replace(/\D/g, '').slice(-10);
              if (clean) map[clean] = entry;
            }
            if (name) {
              map[name.trim().toLowerCase()] = entry;
            }
          }
        });
        setMemberProfilesMap(map);
      } catch (e) {
        console.warn('Member photos load error:', e);
      }
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

  // Resolves the member profile info
  const getMemberProfile = (item: FirebaseTestimonyRecord) => {
    const digits = getPhoneDigits(item.memberPhone);
    const byId = item.memberId ? memberProfilesMap[item.memberId] : undefined;
    const byPhone = digits ? memberProfilesMap[digits] : undefined;
    const byRawPhone = item.memberPhone ? memberProfilesMap[item.memberPhone] : undefined;
    const byName = item.memberName ? memberProfilesMap[item.memberName.trim().toLowerCase()] : undefined;
    const profileData = byId || byPhone || byRawPhone || byName;

    const photoURL = profileData?.photoURL || item.memberPhotoUrl || null;
    const name = profileData?.name || item.memberName || 'Church Member';
    return { photoURL, name };
  };

  // 5 Category Tab Counts (Matching Mobile `countsByCategory`)
  const countsByCategory = useMemo(() => {
    const counts: Record<TestimonyStatus, number> = {
      'Pending Review': 0,
      Private: 0,
      Approved: 0,
      Published: 0,
      Rejected: 0,
    };
    for (const item of testimonies) {
      if (item.privacy === 'Private' || item.status === 'Private') {
        counts.Private += 1;
      } else if (counts[item.status] !== undefined) {
        counts[item.status] += 1;
      }
    }
    return counts;
  }, [testimonies]);

  // KPIs
  const stats = useMemo(() => {
    const total = testimonies.length;
    const pending = countsByCategory['Pending Review'];
    const published = countsByCategory['Published'];
    const videoCount = testimonies.filter((t) => t.testimonyType === 'Video' || Boolean(t.videoStoragePath)).length;
    return { total, pending, published, videoCount };
  }, [testimonies, countsByCategory]);

  // Filtered Testimonies
  const filteredTestimonies = useMemo(() => {
    return testimonies.filter((item) => {
      // 1. Tab Status Filter
      if (selectedTab !== 'All') {
        const effectiveCategory: TestimonyStatus =
          item.privacy === 'Private' ? 'Private' : item.status;
        if (effectiveCategory !== selectedTab) return false;
      }

      // 2. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (item.title || '').toLowerCase().includes(q);
        const matchMember = (item.memberName || '').toLowerCase().includes(q);
        const matchDesc = (item.description || item.writtenContent || '').toLowerCase().includes(q);
        const matchCategory = (item.category || '').toLowerCase().includes(q);
        const matchPhone = (item.memberPhone || '').includes(q);
        if (!matchTitle && !matchMember && !matchDesc && !matchCategory && !matchPhone) {
          return false;
        }
      }

      // 3. Category Filter
      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false;
      }

      return true;
    });
  }, [testimonies, selectedTab, searchQuery, selectedCategory]);

  // Resolve Video URL from Firebase Storage when inspecting
  const handleOpenReviewModal = async (item: FirebaseTestimonyRecord) => {
    setSelectedTestimony(item);
    setResolvedVideoUrl(null);
    setVideoError(null);

    if (item.videoStoragePath) {
      try {
        setVideoLoading(true);
        const storageRef = ref(storage, item.videoStoragePath);
        const downloadUrl = await getDownloadURL(storageRef);
        setResolvedVideoUrl(downloadUrl);
      } catch (err: any) {
        console.warn('Could not resolve video download URL:', err);
        setVideoError('Video preview could not be loaded from storage.');
      } finally {
        setVideoLoading(false);
      }
    }
  };

  // Status Badge Colors (Matching Mobile `getBadgeStyle`)
  const getBadgeStyle = (status: TestimonyStatus, isPriv: boolean) => {
    if (isPriv || status === 'Private') {
      return {
        bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25',
        dot: 'bg-purple-500',
        label: 'Private',
        icon: Lock,
      };
    }
    switch (status) {
      case 'Published':
        return {
          bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
          dot: 'bg-emerald-500',
          label: 'Published',
          icon: CheckCircle2,
        };
      case 'Approved':
        return {
          bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25',
          dot: 'bg-blue-500',
          label: 'Approved',
          icon: CheckCircle2,
        };
      case 'Pending Review':
        return {
          bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
          dot: 'bg-amber-500',
          label: 'Pending Review',
          icon: Clock,
        };
      case 'Rejected':
      default:
        return {
          bg: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25',
          dot: 'bg-red-500',
          label: 'Rejected',
          icon: XCircle,
        };
    }
  };

  // Admin Moderation: Approve Testimony
  const handleApprove = async (item: FirebaseTestimonyRecord) => {
    if (item.privacy === 'Private') {
      showToast('Private testimonies must remain private unless the member updates it to public.');
      return;
    }

    try {
      setProcessingAction(true);
      const docRef = doc(db, 'Rhema Church', 'rhema', 'testimonies', item.id);
      await updateDoc(docRef, {
        status: 'Approved',
        reviewedAt: serverTimestamp(),
        reviewedBy: user?.uid || 'admin',
        reviewedByName: adminName,
        rejectionReason: null,
        updatedAt: serverTimestamp(),
      });
      showToast(`"${item.title}" approved! You can now publish it to the live feed.`);
      loadTestimonies();
      if (selectedTestimony?.id === item.id) {
        setSelectedTestimony((prev) => (prev ? { ...prev, status: 'Approved' } : null));
      }
    } catch (err: any) {
      console.error('Approval error:', err);
      showToast('Error approving testimony: ' + (err.message || 'Permission denied'));
    } finally {
      setProcessingAction(false);
    }
  };

  // Admin Moderation: Publish Approved Testimony
  const handlePublish = async (item: FirebaseTestimonyRecord) => {
    if (item.privacy === 'Private') {
      showToast('Action Blocked: Private testimonies can never be published to the public feed.');
      return;
    }

    try {
      setProcessingAction(true);
      const docRef = doc(db, 'Rhema Church', 'rhema', 'testimonies', item.id);
      await updateDoc(docRef, {
        status: 'Published',
        publishedAt: serverTimestamp(),
        reviewedAt: serverTimestamp(),
        reviewedBy: user?.uid || 'admin',
        reviewedByName: adminName,
        rejectionReason: null,
        updatedAt: serverTimestamp(),
      });
      showToast(`"${item.title}" is now live in the church testimony feed! 🌟`);
      loadTestimonies();
      if (selectedTestimony?.id === item.id) {
        setSelectedTestimony((prev) => (prev ? { ...prev, status: 'Published' } : null));
      }
    } catch (err: any) {
      console.error('Publish error:', err);
      showToast('Error publishing: ' + (err.message || 'Permission denied'));
    } finally {
      setProcessingAction(false);
    }
  };

  // Admin Moderation: Unpublish Testimony
  const handleUnpublish = async (item: FirebaseTestimonyRecord) => {
    try {
      setProcessingAction(true);
      const docRef = doc(db, 'Rhema Church', 'rhema', 'testimonies', item.id);
      await updateDoc(docRef, {
        status: 'Approved',
        publishedAt: null,
        reviewedBy: user?.uid || 'admin',
        reviewedByName: adminName,
        updatedAt: serverTimestamp(),
      });
      showToast(`Testimony unpublished and moved back to Approved.`);
      loadTestimonies();
      if (selectedTestimony?.id === item.id) {
        setSelectedTestimony((prev) => (prev ? { ...prev, status: 'Approved' } : null));
      }
    } catch (err: any) {
      console.error('Unpublish error:', err);
      showToast('Error unpublishing: ' + (err.message || 'Permission denied'));
    } finally {
      setProcessingAction(false);
    }
  };

  // Admin Moderation: Keep Private & Mark Reviewed
  const handleKeepPrivateReviewed = async (item: FirebaseTestimonyRecord) => {
    try {
      setProcessingAction(true);
      const docRef = doc(db, 'Rhema Church', 'rhema', 'testimonies', item.id);
      await updateDoc(docRef, {
        privacy: 'Private',
        status: 'Private',
        publishedAt: null,
        reviewedAt: serverTimestamp(),
        reviewedBy: user?.uid || 'admin',
        reviewedByName: adminName,
        updatedAt: serverTimestamp(),
      });
      showToast(`Marked as Reviewed (Kept Private). 🔒`);
      loadTestimonies();
      if (selectedTestimony?.id === item.id) {
        setSelectedTestimony((prev) => (prev ? { ...prev, status: 'Private', privacy: 'Private' } : null));
      }
    } catch (err: any) {
      showToast('Error: ' + (err.message || 'Error'));
    } finally {
      setProcessingAction(false);
    }
  };

  // Admin Moderation: Confirm Reject
  const handleConfirmReject = async () => {
    if (!selectedTestimony) return;
    try {
      setProcessingAction(true);
      const docRef = doc(db, 'Rhema Church', 'rhema', 'testimonies', selectedTestimony.id);
      await updateDoc(docRef, {
        status: 'Rejected',
        rejectionReason: rejectionReasonInput.trim() || 'Submission did not meet publication standards.',
        publishedAt: null,
        reviewedAt: serverTimestamp(),
        reviewedBy: user?.uid || 'admin',
        reviewedByName: adminName,
        updatedAt: serverTimestamp(),
      });
      showToast(`Testimony moved to Rejected.`);
      setRejectModalVisible(false);
      setRejectionReasonInput('');
      loadTestimonies();
      if (selectedTestimony) {
        setSelectedTestimony((prev) => (prev ? { ...prev, status: 'Rejected' } : null));
      }
    } catch (err: any) {
      console.error('Reject error:', err);
      showToast('Error rejecting: ' + (err.message || 'Error'));
    } finally {
      setProcessingAction(false);
    }
  };

  // Delete Testimony
  const handleConfirmDelete = async () => {
    if (!deletingTestimony) return;
    try {
      setIsDeleting(true);
      const docRef = doc(db, 'Rhema Church', 'rhema', 'testimonies', deletingTestimony.id);
      await deleteDoc(docRef);
      showToast(`Testimony deleted from church database.`);
      setDeletingTestimony(null);
      if (selectedTestimony?.id === deletingTestimony.id) {
        setSelectedTestimony(null);
      }
      loadTestimonies();
    } catch (err: any) {
      showToast('Error deleting: ' + (err.message || 'Error'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
      <AdminNavigationShell>
        <div className="space-y-6">
          {/* Toast Notification */}
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

          {/* Summary KPI Cards (Interactive Filters) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Total Testimonies */}
            <button
              type="button"
              onClick={() => setSelectedTab('All')}
              className={`p-4 rounded-2xl text-left transition-all border ${
                selectedTab === 'All'
                  ? 'bg-slate-900 text-white border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                  : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${selectedTab === 'All' ? 'text-blue-300' : 'text-slate-500'}`}>
                Total Testimonies
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black">{stats.total}</span>
                <span className={`text-[11px] font-medium ${selectedTab === 'All' ? 'text-blue-200' : 'text-slate-400'}`}>
                  In Church Database
                </span>
              </div>
            </button>

            {/* Pending Review */}
            <button
              type="button"
              onClick={() => setSelectedTab('Pending Review')}
              className={`p-4 rounded-2xl text-left transition-all border ${
                selectedTab === 'Pending Review'
                  ? 'bg-gradient-to-br from-amber-950/40 to-slate-900 text-white border-amber-500 ring-2 ring-amber-500/20 shadow-md'
                  : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-amber-400/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                  Pending Review
                </span>
                {selectedTab === 'Pending Review' && <span className="w-2 h-2 rounded-full bg-amber-400" />}
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-amber-500">{stats.pending}</span>
                <span className="text-[11px] font-bold text-amber-400">
                  {selectedTab === 'Pending Review' ? 'Active Tab ✓' : 'Needs Moderation'}
                </span>
              </div>
            </button>

            {/* Published Feed */}
            <button
              type="button"
              onClick={() => setSelectedTab('Published')}
              className={`p-4 rounded-2xl text-left transition-all border ${
                selectedTab === 'Published'
                  ? 'bg-gradient-to-br from-emerald-950/40 to-slate-900 text-white border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                  : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-emerald-400/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                  Published Feed
                </span>
                <Globe size={14} className="text-emerald-500" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-emerald-500">{stats.published}</span>
                <span className="text-[11px] font-bold text-emerald-400">
                  {selectedTab === 'Published' ? 'Active Tab ✓' : 'Live Congregation'}
                </span>
              </div>
            </button>

            {/* Video Testimonies */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-500">
                  Video Testimonies
                </span>
                <Video size={14} className="text-teal-500" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-teal-500">{stats.videoCount}</span>
                <span className="text-[11px] font-medium text-slate-400">Video Submissions</span>
              </div>
            </div>
          </div>

          {/* ── 5 REQUIRED CATEGORY FILTER TABS (Exact Mobile Parity) ── */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setSelectedTab('All')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                selectedTab === 'All'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>All Testimonies</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                selectedTab === 'All' ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}>
                {stats.total}
              </span>
            </button>

            {ADMIN_STATUS_TABS.map((tab) => {
              const count = countsByCategory[tab] || 0;
              const isActive = selectedTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSelectedTab(tab)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap border ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{tab}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      isActive
                        ? 'bg-white/25 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Category Filter Dropdown */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search testimonies by author, title, healing or breakthrough..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                {ALL_FILTER_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c === 'All' ? 'All Categories' : c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Submissions List */}
          {isLoading ? (
            <div className="p-16 text-center text-slate-500 flex flex-col items-center gap-3">
              <RefreshCw size={26} className="animate-spin text-blue-500" />
              <span className="text-xs font-medium">Loading testimonies from church cloud records...</span>
            </div>
          ) : filteredTestimonies.length === 0 ? (
            <div className="p-16 text-center rounded-3xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
              <Sparkles size={36} className="mx-auto text-blue-500" />
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                No {selectedTab === 'All' ? '' : selectedTab} Testimonies
              </div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery || selectedCategory !== 'All'
                  ? 'No submissions match your active filter search. Try clearing query.'
                  : `There are currently no submissions in the "${selectedTab}" category.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredTestimonies.map((item) => {
                const isPriv = item.privacy === 'Private';
                const badge = getBadgeStyle(item.status, isPriv);
                const BadgeIcon = badge.icon;
                const profile = getMemberProfile(item);
                const hasVideo = Boolean(item.videoStoragePath);
                const hasAttachments = Boolean(item.attachmentStoragePaths && item.attachmentStoragePaths.length > 0);
                const phoneDigits = getPhoneDigits(item.memberPhone);

                return (
                  <div
                    key={item.id}
                    className="rounded-3xl p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3.5">
                      {/* Top Badges Row */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        {/* Member Details */}
                        <div className="flex items-center gap-3">
                          {profile.photoURL ? (
                            <img
                              src={profile.photoURL}
                              alt={profile.name}
                              className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-sm"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                if (fallback) fallback.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div
                            className={`w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm ${
                              profile.photoURL ? 'hidden' : ''
                            }`}
                          >
                            {getInitials(profile.name)}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                              <span>{profile.name}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span>{formatDate(item.createdAt)}</span>
                              {item.memberPhone && (
                                <>
                                  <span>&bull;</span>
                                  <span className="font-mono">{item.memberPhone}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status Badge (Exact Mobile Color Palette) */}
                        <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border ${badge.bg}`}>
                          <BadgeIcon size={11} />
                          <span>{isPriv ? 'Private' : item.status}</span>
                        </div>
                      </div>

                      {/* Title & Preview Text */}
                      <div className="space-y-1">
                        <h3 className="font-black text-base text-slate-900 dark:text-white leading-snug">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-serif line-clamp-2">
                          &ldquo;{item.writtenContent || item.description || 'Tap to inspect submission'}&rdquo;
                        </p>
                      </div>

                      {/* Video Indicator Box if attached */}
                      {hasVideo && (
                        <div
                          onClick={() => handleOpenReviewModal(item)}
                          className="p-3 rounded-2xl bg-teal-500/10 dark:bg-teal-950/20 border border-teal-500/25 flex items-center justify-between gap-2 cursor-pointer hover:bg-teal-500/15 transition-colors"
                        >
                          <div className="flex items-center gap-2 text-xs font-bold text-teal-700 dark:text-teal-300">
                            <Video size={15} className="text-teal-600 dark:text-teal-400" />
                            <span>Video Testimony Attached</span>
                          </div>
                          <span className="text-[11px] font-mono text-teal-600 dark:text-teal-400 font-bold flex items-center gap-1">
                            <Play size={10} className="fill-teal-600" />
                            <span>{formatDuration(item.videoDurationMs)}</span>
                          </span>
                        </div>
                      )}

                      {/* Media Badges Footer Row */}
                      <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                        {/* Category */}
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[9px] tracking-wider">
                          {item.category || 'Healing'}
                        </span>

                        {/* Privacy */}
                        {isPriv ? (
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20 font-bold text-[9px] flex items-center gap-1">
                            <Lock size={10} />
                            <span>Private</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 border border-teal-500/20 font-bold text-[9px] flex items-center gap-1">
                            <Globe size={10} />
                            <span>Public</span>
                          </span>
                        )}

                        {/* Media indicators */}
                        {hasVideo && (
                          <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 border border-teal-500/20 font-bold text-[9px] flex items-center gap-1">
                            <Video size={10} />
                            <span>Video</span>
                          </span>
                        )}

                        {hasAttachments && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 font-bold text-[9px] flex items-center gap-1">
                            <FileText size={10} />
                            <span>{item.attachmentStoragePaths?.length} Attachments</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Direct Card Actions */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Inspect Modal Trigger */}
                        <button
                          type="button"
                          onClick={() => handleOpenReviewModal(item)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <Eye size={13} />
                          <span>Inspect</span>
                        </button>

                        {/* Status Dependent Actions */}
                        {item.status === 'Pending Review' && !isPriv && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprove(item)}
                              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePublish(item)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm"
                            >
                              Publish Live
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTestimony(item);
                                setRejectModalVisible(true);
                              }}
                              className="px-2.5 py-1.5 rounded-xl border border-red-300 dark:border-red-800/60 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {item.status === 'Approved' && !isPriv && (
                          <>
                            <button
                              type="button"
                              onClick={() => handlePublish(item)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                            >
                              <Globe size={12} />
                              <span>Publish Live</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTestimony(item);
                                setRejectModalVisible(true);
                              }}
                              className="px-2.5 py-1.5 rounded-xl border border-red-300 dark:border-red-800/60 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {item.status === 'Published' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleUnpublish(item)}
                              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-sm"
                            >
                              Unpublish
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTestimony(item);
                                setRejectModalVisible(true);
                              }}
                              className="px-2.5 py-1.5 rounded-xl border border-red-300 dark:border-red-800/60 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {isPriv && (
                          <button
                            type="button"
                            onClick={() => handleKeepPrivateReviewed(item)}
                            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                          >
                            <Lock size={12} />
                            <span>Mark Reviewed (Private)</span>
                          </button>
                        )}

                        {item.status === 'Rejected' && (
                          <button
                            type="button"
                            onClick={() => handleApprove(item)}
                            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm"
                          >
                            Re-evaluate / Approve
                          </button>
                        )}
                      </div>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => setDeletingTestimony(item)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                        title="Delete testimony"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── INSPECTION & REVIEW MODAL (100% Mobile Parity) ── */}
          {selectedTestimony && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative max-h-[92vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <MessageSquareQuote size={20} className="text-blue-500" />
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      Review Submission
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTestimony(null)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Submitting Member Details Card */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    SUBMITTING MEMBER DETAILS
                  </span>
                  {(() => {
                    const prof = getMemberProfile(selectedTestimony);
                    const phoneDigits = getPhoneDigits(selectedTestimony.memberPhone);
                    return (
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                          {prof.photoURL ? (
                            <img
                              src={prof.photoURL}
                              alt={prof.name}
                              className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-sm"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                if (fallback) fallback.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div
                            className={`w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-sm ${
                              prof.photoURL ? 'hidden' : ''
                            }`}
                          >
                            {getInitials(prof.name)}
                          </div>
                          <div>
                            <div className="font-bold text-base text-slate-900 dark:text-white">
                              {prof.name}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                              {selectedTestimony.memberPhone && (
                                <span className="font-mono">{selectedTestimony.memberPhone}</span>
                              )}
                              <span>&bull;</span>
                              <span>Category: {selectedTestimony.category}</span>
                            </div>
                          </div>
                        </div>

                        {phoneDigits && (
                          <a
                            href={`tel:${phoneDigits}`}
                            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                          >
                            <PhoneCall size={13} />
                            <span>Call Member</span>
                          </a>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Full Written Testimony Content */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      WRITTEN TESTIMONY
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {formatDate(selectedTestimony.createdAt)}
                    </span>
                  </div>
                  <h4 className="font-black text-lg text-slate-900 dark:text-white">
                    {selectedTestimony.title}
                  </h4>
                  <p className="font-serif text-sm text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-line">
                    {selectedTestimony.writtenContent || selectedTestimony.description || 'No written text provided.'}
                  </p>
                </div>

                {/* Video Playback Section (if attached) */}
                {selectedTestimony.videoStoragePath && (
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                        <Video size={16} className="text-teal-500" />
                        <span>Video Recording Preview</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">
                        {formatDuration(selectedTestimony.videoDurationMs)}
                      </span>
                    </div>

                    {videoLoading ? (
                      <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                        <RefreshCw size={20} className="animate-spin text-teal-500" />
                        <span>Resolving secure video URL from storage...</span>
                      </div>
                    ) : resolvedVideoUrl ? (
                      <div className="rounded-2xl overflow-hidden bg-black shadow-lg">
                        <video
                          controls
                          src={resolvedVideoUrl}
                          className="w-full max-h-72 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                        {videoError || 'Video path stored: ' + selectedTestimony.videoStoragePath}
                      </div>
                    )}
                  </div>
                )}

                {/* Attachments List */}
                {selectedTestimony.attachmentStoragePaths && selectedTestimony.attachmentStoragePaths.length > 0 && (
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      ATTACHMENTS ({selectedTestimony.attachmentStoragePaths.length})
                    </span>
                    <div className="space-y-1.5">
                      {selectedTestimony.attachmentStoragePaths.map((att, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileText size={15} className="text-blue-500 shrink-0" />
                            <span className="font-semibold text-slate-900 dark:text-white truncate">
                              {att.name || `Attachment ${idx + 1}`}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {att.sizeBytes ? `${Math.round(att.sizeBytes / 1024)} KB` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rejection Note Banner if rejected */}
                {selectedTestimony.rejectionReason && (
                  <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-700 dark:text-red-300 space-y-1">
                    <span className="font-bold uppercase tracking-wider text-[10px] block">
                      REJECTION REASON (NOTIFIED TO MEMBER)
                    </span>
                    <p>{selectedTestimony.rejectionReason}</p>
                  </div>
                )}

                {/* Moderation Actions Footer */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 flex-wrap">
                  {selectedTestimony.privacy !== 'Private' && (
                    <>
                      {selectedTestimony.status !== 'Approved' && selectedTestimony.status !== 'Published' && (
                        <button
                          type="button"
                          onClick={() => handleApprove(selectedTestimony)}
                          disabled={processingAction}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-sm"
                        >
                          Approve Testimony
                        </button>
                      )}

                      {selectedTestimony.status !== 'Published' && (
                        <button
                          type="button"
                          onClick={() => handlePublish(selectedTestimony)}
                          disabled={processingAction}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
                        >
                          <Globe size={13} />
                          <span>Publish to Church Feed</span>
                        </button>
                      )}

                      {selectedTestimony.status === 'Published' && (
                        <button
                          type="button"
                          onClick={() => handleUnpublish(selectedTestimony)}
                          disabled={processingAction}
                          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold shadow-sm"
                        >
                          Unpublish
                        </button>
                      )}

                      {selectedTestimony.status !== 'Rejected' && (
                        <button
                          type="button"
                          onClick={() => setRejectModalVisible(true)}
                          disabled={processingAction}
                          className="px-4 py-2 rounded-xl border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-950/20"
                        >
                          Reject Submission
                        </button>
                      )}
                    </>
                  )}

                  {selectedTestimony.privacy === 'Private' && (
                    <button
                      type="button"
                      onClick={() => handleKeepPrivateReviewed(selectedTestimony)}
                      disabled={processingAction}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
                    >
                      <Lock size={13} />
                      <span>Keep Private &amp; Mark Reviewed</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── REJECT REASON MODAL (Mobile Parity) ── */}
          {rejectModalVisible && selectedTestimony && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
                <button
                  type="button"
                  onClick={() => setRejectModalVisible(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
                >
                  <X size={18} />
                </button>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <XCircle size={18} className="text-red-500" />
                    <span>Reject Testimony Submission</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Please provide pastoral guidance or explanation. The submitting member will see this in their app under My Testimonies.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Rejection Reason / Pastoral Guidance
                  </label>
                  <textarea
                    rows={4}
                    value={rejectionReasonInput}
                    onChange={(e) => setRejectionReasonInput(e.target.value)}
                    placeholder="e.g. Please redact personal medical details or revise audio clarity before resubmitting..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setRejectModalVisible(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmReject}
                    disabled={processingAction}
                    className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-red-950/20"
                  >
                    {processingAction ? 'Processing...' : 'Confirm Rejection'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── DELETE CONFIRMATION MODAL ── */}
          {deletingTestimony && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative text-center">
                <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
                  <Trash2 size={24} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Delete Testimony?
                  </h4>
                  <p className="text-xs text-slate-500">
                    Are you sure you want to permanently remove &ldquo;{deletingTestimony.title}&rdquo; from church records?
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeletingTestimony(null)}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-950/20"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Permanently'}
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
