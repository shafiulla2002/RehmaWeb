'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  increment,
  arrayUnion,
  query,
  limit,
} from 'firebase/firestore';
import {
  Heart,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Megaphone,
  BookOpen,
  Share2,
  MessageCircle,
  ChevronDown,
  Search,
  X,
  Phone,
  PhoneCall,
  User,
  Plus,
  RefreshCw,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Copy,
  ExternalLink,
  MessageSquare,
  Sparkles,
  HeartHandshake,
} from 'lucide-react';
import { ENGLISH_NAMES, TELUGU_NAMES, getChapterCount, getVerseCount } from '@/lib/bible-metadata';
import { fetchChapter } from '@/lib/bible-api';

export type PrayerCategory =
  | 'Pray for me'
  | 'Pray for my family'
  | 'Pray for healing'
  | 'Pray for peace and strength'
  | 'Other (if necessary)'
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
  isClosed?: boolean;
  status?: 'pending' | 'approved' | 'answered' | 'rejected' | 'closed' | string;
  lastAdminResponse?: string;
  pastoralNote?: string;
  lastAdminName?: string;
  bibleVerse?: string;
  verseReference?: string;
  verseReferenceTe?: string;
  verseText?: string;
  verseTextTe?: string;
  intercessorName?: string;
  intercessorId?: string;
  rejectionReason?: string;
  prayCount?: number;
  prayedBy?: string[];
  prayedByNames?: string[];
  replies?: Array<{
    id: string;
    author: string;
    body: string;
    date: any;
  }>;
  createdAt?: any;
  updatedAt?: any;
}

const PRAYER_CATEGORIES: PrayerCategory[] = [
  'Pray for me',
  'Pray for my family',
  'Pray for healing',
  'Pray for peace and strength',
  'Other (if necessary)',
];

const ALL_FILTER_CATEGORIES: string[] = [
  'All',
  'Pray for me',
  'Pray for my family',
  'Pray for healing',
  'Pray for peace and strength',
  'Other (if necessary)',
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
  'danger',
  'heart attack',
];

// Helper: relative time
function getTimeAgo(ts: any): string {
  if (!ts) return 'recently';
  try {
    let date: Date;
    if (typeof ts.toDate === 'function') {
      date = ts.toDate();
    } else if (typeof ts.seconds === 'number') {
      date = new Date(ts.seconds * 1000);
    } else if (ts instanceof Date) {
      date = ts;
    } else {
      date = new Date(ts);
    }
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 172800) return 'Yesterday';
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'recently';
  }
}

// Clean Indian 10-digit phone
function getPhoneDigits(phone?: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

// Mobile-matched motivational encouragement message
function buildMotivationalMessage(
  memberName: string,
  prayerText: string,
  verse: { reference: string; referenceTe?: string; text?: string; textTe?: string },
  pastoralText?: string,
  churchName = 'Rhema Global Ministries'
): string {
  const cleanName = (memberName || 'Beloved Member').trim();
  const excerpt = prayerText
    ? prayerText.length > 90
      ? `${prayerText.substring(0, 90)}...`
      : prayerText
    : '';

  let msg = `🙏 *Greetings in Christ, ${cleanName}!* \n\n`;
  msg += `Our pastoral team at *${churchName}* has received and prayed over your request`;
  if (excerpt) {
    msg += `: _"${excerpt.trim()}"_`;
  }
  msg += `.\n\n`;

  if (verse && verse.reference) {
    msg += `📖 *Holy Scripture:*\n`;
    if (verse.text && verse.text.trim()) {
      msg += `_"${verse.text.trim()}"_\n`;
    }
    if (verse.textTe && verse.textTe.trim() && verse.textTe.trim() !== (verse.text || '').trim()) {
      msg += `_"${verse.textTe.trim()}"_\n`;
    }
    msg += `— *${verse.reference}*`;
    if (verse.referenceTe && verse.referenceTe !== verse.reference) {
      msg += ` (${verse.referenceTe})`;
    }
    msg += `\n\n`;
  }

  if (pastoralText && pastoralText.trim()) {
    msg += `💬 *Pastoral Message:*\n${pastoralText.trim()}\n\n`;
  }

  msg += `_We continue to stand in faith and agreement with you in prayer. May God's peace, grace, and blessings surround you._`;
  return msg;
}

export default function PrayerModerationAdminPage() {
  const { user, profile } = useAuth();
  const adminName = profile?.fullName || user?.displayName || 'Pastor Gabriel';

  const [prayers, setPrayers] = useState<FirebasePrayerRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Tabs
  const [activeStatFilter, setActiveStatFilter] = useState<'all' | 'pending' | 'answered' | 'urgent'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedPrivacy, setSelectedPrivacy] = useState<'all' | 'public' | 'confidential'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Moderation Workflow Modal State (Detail & Action Modal)
  const [reviewItem, setReviewItem] = useState<FirebasePrayerRecord | null>(null);
  const [isSubmittingModeration, setIsSubmittingModeration] = useState(false);

  // Step 1: Bible Scripture Selection State
  const [selectedBookIdx, setSelectedBookIdx] = useState<number>(49); // default Philippians (idx 49)
  const [selectedChapter, setSelectedChapter] = useState<number>(4);
  const [selectedVerseInput, setSelectedVerseInput] = useState<string>('6-7');
  const [scriptureEnText, setScriptureEnText] = useState<string>('');
  const [scriptureTeText, setScriptureTeText] = useState<string>('');
  const [scriptureRefEn, setScriptureRefEn] = useState<string>('');
  const [scriptureRefTe, setScriptureRefTe] = useState<string>('');
  const [isLoadingScripture, setIsLoadingScripture] = useState<boolean>(false);

  // Step 2: Personal Prayer Response State
  const [personalReply, setPersonalReply] = useState<string>('');

  // Step 3 / Decision mode inside modal
  const [modalActionType, setModalActionType] = useState<'approve' | 'respond' | 'reject'>('approve');
  const [rejectionReason, setRejectionReason] = useState<string>('');

  // Delete State
  const [deletingPrayer, setDeletingPrayer] = useState<FirebasePrayerRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // + New Prayer Request Modal State
  const [showNewPrayerModal, setShowNewPrayerModal] = useState(false);
  const [newPrayerAuthor, setNewPrayerAuthor] = useState('');
  const [newPrayerPhone, setNewPrayerPhone] = useState('');
  const [newPrayerCategory, setNewPrayerCategory] = useState<PrayerCategory>('Pray for me');
  const [newPrayerTextEn, setNewPrayerTextEn] = useState('');
  const [newPrayerTextTe, setNewPrayerTextTe] = useState('');
  const [newPrayerPrivacy, setNewPrayerPrivacy] = useState<'public' | 'private'>('public');
  const [newPrayerPostAs, setNewPrayerPostAs] = useState(adminName);
  const [isSubmittingNewPrayer, setIsSubmittingNewPrayer] = useState(false);

  // Member Quick Search for New Prayer Request
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState<any[]>([]);
  const [isSearchingMembers, setIsSearchingMembers] = useState(false);

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
          name: data.name || data.authorName || data.memberName || 'Church Member',
          phone: data.phone || data.contactPhone || '',
          title: data.title || data.request || data.text || 'Prayer Petition',
          request: data.request || data.text || data.description || '',
          text: data.text || data.request || data.description || '',
          description: data.description || data.text || '',
          textTe: data.textTe || data.requestTe || '',
          category: data.category || 'Pray for me',
          isPublic: data.isPublic ?? (data.type === 'public'),
          type: data.type || (data.isPublic ? 'public' : 'private'),
          isAnswered: Boolean(data.isAnswered),
          isClosed: Boolean(data.isClosed),
          status: data.status || (data.isAnswered ? 'answered' : 'pending'),
          lastAdminResponse: data.lastAdminResponse || data.pastoralNote || '',
          pastoralNote: data.pastoralNote || data.lastAdminResponse || '',
          lastAdminName: data.lastAdminName || '',
          bibleVerse: data.bibleVerse || data.verseReference || '',
          verseReference: data.verseReference || data.bibleVerse || '',
          verseReferenceTe: data.verseReferenceTe || '',
          verseText: data.verseText || '',
          verseTextTe: data.verseTextTe || '',
          intercessorName: data.intercessorName || '',
          intercessorId: data.intercessorId || '',
          rejectionReason: data.rejectionReason || '',
          prayCount: typeof data.prayCount === 'number' ? data.prayCount : 0,
          prayedBy: Array.isArray(data.prayedBy) ? data.prayedBy : [],
          prayedByNames: Array.isArray(data.prayedByNames) ? data.prayedByNames : [],
          replies: Array.isArray(data.replies) ? data.replies : [],
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });

      // Sort by latest creation
      list.sort((a, b) => {
        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
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

  // Search Members for New Prayer Modal
  const handleSearchMembers = async (q: string) => {
    setMemberSearchQuery(q);
    if (!q.trim() || q.trim().length < 2) {
      setMemberSearchResults([]);
      return;
    }
    try {
      setIsSearchingMembers(true);
      const membersRef = collection(db, 'Rhema Church', 'rhema', 'members');
      const snap = await getDocs(query(membersRef, limit(20)));
      const lower = q.toLowerCase();
      const results: any[] = [];
      snap.forEach((d) => {
        const m = d.data();
        const name = m.name || m.fullName || '';
        const phone = m.phone || m.contactPhone || '';
        if (name.toLowerCase().includes(lower) || phone.includes(q)) {
          results.push({ id: d.id, name, phone, photoURL: m.photoURL || m.profilePhotoUrl });
        }
      });
      setMemberSearchResults(results.slice(0, 6));
    } catch (err) {
      console.error('Member search error:', err);
    } finally {
      setIsSearchingMembers(false);
    }
  };

  // Emergency Priority Detection
  const hasEmergencyKeywords = (text: string) => {
    const lower = (text || '').toLowerCase();
    return EMERGENCY_KEYWORDS.some((kw) => lower.includes(kw));
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = prayers.length;
    const pending = prayers.filter((p) => !p.isAnswered && p.status !== 'rejected' && !p.isClosed).length;
    const answered = prayers.filter((p) => p.isAnswered).length;
    const urgent = prayers.filter((p) => !p.isAnswered && hasEmergencyKeywords(p.text || '')).length;
    return { total, pending, answered, urgent };
  }, [prayers]);

  // Filtered Prayers
  const filteredPrayers = useMemo(() => {
    return prayers.filter((p) => {
      // 1. Stat Card Tab Filter
      if (activeStatFilter === 'pending') {
        if (p.isAnswered || p.status === 'rejected' || p.isClosed) return false;
      } else if (activeStatFilter === 'answered') {
        if (!p.isAnswered) return false;
      } else if (activeStatFilter === 'urgent') {
        if (p.isAnswered || !hasEmergencyKeywords(p.text || '')) return false;
      }

      // 2. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesAuthor = (p.authorName || p.name || '').toLowerCase().includes(q);
        const matchesPhone = (p.phone || '').includes(q);
        const matchesText = (p.text || p.request || '').toLowerCase().includes(q);
        const matchesTextTe = (p.textTe || '').toLowerCase().includes(q);
        const matchesCategory = (p.category || '').toLowerCase().includes(q);
        const matchesVerse = (p.bibleVerse || p.verseReference || '').toLowerCase().includes(q);
        if (!matchesAuthor && !matchesPhone && !matchesText && !matchesTextTe && !matchesCategory && !matchesVerse) {
          return false;
        }
      }

      // 3. Category Filter
      if (selectedCategory !== 'All' && p.category !== selectedCategory) {
        return false;
      }

      // 4. Privacy Filter
      if (selectedPrivacy === 'public' && !p.isPublic) return false;
      if (selectedPrivacy === 'confidential' && p.isPublic) return false;

      return true;
    });
  }, [prayers, activeStatFilter, searchQuery, selectedCategory, selectedPrivacy]);

  // Scripture automatic lookup on selection change
  const handleLookupScripture = async (bookIdx: number, chapter: number, verseRange: string) => {
    try {
      setIsLoadingScripture(true);
      const enBookName = ENGLISH_NAMES[bookIdx] || 'Book';
      const teBookName = TELUGU_NAMES[bookIdx] || enBookName;
      const refEn = `${enBookName} ${chapter}:${verseRange}`;
      const refTe = `${teBookName} ${chapter}:${verseRange}`;
      setScriptureRefEn(refEn);
      setScriptureRefTe(refTe);

      // Parse verse range (e.g. "6" or "6-7")
      let startV = 1;
      let endV = 1;
      if (verseRange.includes('-')) {
        const pts = verseRange.split('-').map((x) => parseInt(x.trim(), 10)).filter((n) => !isNaN(n));
        startV = pts[0] || 1;
        endV = pts[1] || startV;
      } else {
        startV = parseInt(verseRange.trim(), 10) || 1;
        endV = startV;
      }

      // Fetch English KJV & Telugu IRV
      const [enVerses, teVerses] = await Promise.all([
        fetchChapter('KJV', bookIdx + 1, chapter),
        fetchChapter('te-IRV', bookIdx + 1, chapter),
      ]);

      const enTextFiltered = enVerses
        .filter((v) => v.verse >= startV && v.verse <= endV)
        .map((v) => v.text)
        .join(' ');
      const teTextFiltered = teVerses
        .filter((v) => v.verse >= startV && v.verse <= endV)
        .map((v) => v.text)
        .join(' ');

      setScriptureEnText(enTextFiltered || `Trust in the Lord with all thine heart; and lean not unto thine own understanding.`);
      setScriptureTeText(teTextFiltered || '');
    } catch (e) {
      console.warn('Scripture lookup failed:', e);
    } finally {
      setIsLoadingScripture(false);
    }
  };

  // Open Moderation Modal
  const openModerationModal = (item: FirebasePrayerRecord) => {
    setReviewItem(item);
    setPersonalReply(item.lastAdminResponse || '');
    setModalActionType(item.isPublic ? 'approve' : 'respond');
    setRejectionReason(item.rejectionReason || '');

    // Parse existing verse if already attached
    if (item.bibleVerse || item.verseReference) {
      setScriptureRefEn(item.bibleVerse || item.verseReference || '');
      setScriptureRefTe(item.verseReferenceTe || '');
      setScriptureEnText(item.verseText || '');
      setScriptureTeText(item.verseTextTe || '');
    } else {
      // Default to Philippians 4:6-7
      setSelectedBookIdx(49);
      setSelectedChapter(4);
      setSelectedVerseInput('6-7');
      handleLookupScripture(49, 4, '6-7');
    }
  };

  // 1-Click Pray ({count})
  const handleAdminPray = async (item: FirebasePrayerRecord) => {
    const currentUid = user?.uid || 'admin_user';
    const isAlreadyPrayed = item.prayedBy?.includes(currentUid);
    if (isAlreadyPrayed) {
      showToast('You have already recorded your prayer for this request. 🙏');
      return;
    }

    try {
      const docRef = doc(db, 'Rhema Church', 'rhema', 'prayerRequests', item.id);
      await updateDoc(docRef, {
        prayCount: increment(1),
        prayedBy: arrayUnion(currentUid),
        prayedByNames: arrayUnion(adminName),
        updatedAt: serverTimestamp(),
      });

      setPrayers((prev) =>
        prev.map((p) =>
          p.id === item.id
            ? {
                ...p,
                prayCount: (p.prayCount || 0) + 1,
                prayedBy: [...(p.prayedBy || []), currentUid],
                prayedByNames: [...(p.prayedByNames || []), adminName],
              }
            : p
        )
      );
      showToast('Amen! Your prayer was recorded. 🙏');
    } catch (e: any) {
      console.error('Pray error:', e);
      showToast('Failed to record prayer: ' + (e.message || 'Permission denied'));
    }
  };

  // Close Request
  const handleCloseRequest = async (item: FirebasePrayerRecord) => {
    try {
      const docRef = doc(db, 'Rhema Church', 'rhema', 'prayerRequests', item.id);
      await updateDoc(docRef, {
        isClosed: true,
        status: 'closed',
        updatedAt: serverTimestamp(),
      });
      setPrayers((prev) => prev.map((p) => (p.id === item.id ? { ...p, isClosed: true, status: 'closed' } : p)));
      showToast('Prayer petition marked as closed.');
    } catch (e: any) {
      showToast('Error closing request: ' + (e.message || 'Error'));
    }
  };

  // Submit Moderation Action
  const handleSaveModeration = async () => {
    if (!reviewItem) return;
    try {
      setIsSubmittingModeration(true);
      const docRef = doc(db, 'Rhema Church', 'rhema', 'prayerRequests', reviewItem.id);

      if (modalActionType === 'approve') {
        // Approve & Make Public (Public Wall)
        await updateDoc(docRef, {
          isPublic: true,
          isAnswered: true,
          status: 'approved',
          bibleVerse: scriptureRefEn.trim() || null,
          verseReference: scriptureRefEn.trim() || null,
          verseReferenceTe: scriptureRefTe.trim() || null,
          verseText: scriptureEnText.trim() || null,
          verseTextTe: scriptureTeText.trim() || null,
          lastAdminResponse: personalReply.trim() || 'Prayed over and approved for church prayer wall.',
          lastAdminName: adminName,
          updatedAt: serverTimestamp(),
        });
        showToast('Approved & published to Public Prayer Wall! 🕊️');
      } else if (modalActionType === 'respond') {
        // Send Private Pastoral Encouragement
        await updateDoc(docRef, {
          isPublic: false,
          isAnswered: true,
          status: 'answered',
          bibleVerse: scriptureRefEn.trim() || null,
          verseReference: scriptureRefEn.trim() || null,
          verseReferenceTe: scriptureRefTe.trim() || null,
          verseText: scriptureEnText.trim() || null,
          verseTextTe: scriptureTeText.trim() || null,
          lastAdminResponse: personalReply.trim() || 'Pastoral team has received and prayed over your request.',
          lastAdminName: adminName,
          updatedAt: serverTimestamp(),
        });
        showToast('Pastoral response & scripture recorded privately. ✨');
      } else if (modalActionType === 'reject') {
        // Reject
        await updateDoc(docRef, {
          status: 'rejected',
          isPublic: false,
          rejectionReason: rejectionReason.trim() || 'Did not meet church prayer guidelines.',
          lastAdminName: adminName,
          updatedAt: serverTimestamp(),
        });
        showToast('Prayer request rejected.');
      }

      setReviewItem(null);
      loadPrayers();
    } catch (err: any) {
      console.error('Moderation error:', err);
      showToast('Error saving moderation: ' + (err.message || 'Error'));
    } finally {
      setIsSubmittingModeration(false);
    }
  };

  // WhatsApp Share
  const handleShareWhatsApp = (item: FirebasePrayerRecord) => {
    const rawPhone = item.phone || item.contactPhone;
    const phoneDigits = getPhoneDigits(rawPhone);
    const verse = {
      reference: item.bibleVerse || item.verseReference || scriptureRefEn || 'Philippians 4:6-7',
      referenceTe: item.verseReferenceTe || scriptureRefTe,
      text: item.verseText || scriptureEnText,
      textTe: item.verseTextTe || scriptureTeText,
    };
    const pastoralMsg = item.lastAdminResponse || personalReply || '';
    const formatted = buildMotivationalMessage(
      item.authorName || item.name || 'Beloved Member',
      item.text || item.request || '',
      verse,
      pastoralMsg
    );

    const encoded = encodeURIComponent(formatted);
    const targetUrl = phoneDigits
      ? `https://wa.me/91${phoneDigits}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(targetUrl, '_blank');
  };

  // Copy / Native Share Encouragement
  const handleShareEncouragement = (item: FirebasePrayerRecord) => {
    const verse = {
      reference: item.bibleVerse || item.verseReference || scriptureRefEn || 'Philippians 4:6-7',
      referenceTe: item.verseReferenceTe || scriptureRefTe,
      text: item.verseText || scriptureEnText,
      textTe: item.verseTextTe || scriptureTeText,
    };
    const pastoralMsg = item.lastAdminResponse || personalReply || '';
    const formatted = buildMotivationalMessage(
      item.authorName || item.name || 'Beloved Member',
      item.text || item.request || '',
      verse,
      pastoralMsg
    );

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(formatted);
      showToast('Encouragement blessing copied to clipboard! 📋');
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingPrayer) return;
    try {
      setIsDeleting(true);
      const docRef = doc(db, 'Rhema Church', 'rhema', 'prayerRequests', deletingPrayer.id);
      await deleteDoc(docRef);
      setPrayers((prev) => prev.filter((p) => p.id !== deletingPrayer.id));
      showToast('Prayer petition deleted from church database.');
      setDeletingPrayer(null);
    } catch (e: any) {
      showToast('Error deleting prayer: ' + (e.message || 'Error'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Submit New Prayer Request (Pastor Request Workflow)
  const handleCreateNewPrayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrayerTextEn.trim()) {
      showToast('Please type the prayer request message.');
      return;
    }
    try {
      setIsSubmittingNewPrayer(true);
      const colRef = collection(db, 'Rhema Church', 'rhema', 'prayerRequests');
      const author = newPrayerAuthor.trim() || newPrayerPostAs || adminName;

      await addDoc(colRef, {
        authorName: author,
        name: author,
        phone: newPrayerPhone.trim() || null,
        category: newPrayerCategory,
        text: newPrayerTextEn.trim(),
        request: newPrayerTextEn.trim(),
        textTe: newPrayerTextTe.trim() || null,
        isPublic: newPrayerPrivacy === 'public',
        type: newPrayerPrivacy,
        isAnswered: false,
        isClosed: false,
        status: 'pending',
        prayCount: 0,
        prayedBy: [],
        prayedByNames: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      showToast('New prayer petition recorded successfully! ✨');
      setShowNewPrayerModal(false);
      setNewPrayerTextEn('');
      setNewPrayerTextTe('');
      setNewPrayerAuthor('');
      setNewPrayerPhone('');
      loadPrayers();
    } catch (err: any) {
      console.error('Error creating prayer request:', err);
      showToast('Failed to create prayer request: ' + (err.message || 'Error'));
    } finally {
      setIsSubmittingNewPrayer(false);
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
                onClick={() => setShowNewPrayerModal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/20 flex items-center gap-1.5 transition-all"
              >
                <Plus size={15} />
                <span>+ New Prayer Request</span>
              </button>

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

          {/* Interactive KPI Summary Cards (Matching Mobile Stats Row with Filter Clicks) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* 1. Total Requests Card */}
            <button
              type="button"
              onClick={() => setActiveStatFilter('all')}
              className={`p-4 rounded-2xl text-left transition-all border ${
                activeStatFilter === 'all'
                  ? 'bg-slate-900 text-white border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                  : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${activeStatFilter === 'all' ? 'text-blue-300' : 'text-slate-500'}`}>
                  Total Requests
                </span>
                {activeStatFilter === 'all' && <span className="w-2 h-2 rounded-full bg-blue-400" />}
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black">{stats.total}</span>
                <span className={`text-[11px] font-medium ${activeStatFilter === 'all' ? 'text-blue-200' : 'text-slate-400'}`}>
                  {activeStatFilter === 'all' ? 'Active ✓' : 'In Church Database'}
                </span>
              </div>
            </button>

            {/* 2. New Requests Card (Mobile Clay / Amber Red) */}
            <button
              type="button"
              onClick={() => setActiveStatFilter(activeStatFilter === 'pending' ? 'all' : 'pending')}
              className={`p-4 rounded-2xl text-left transition-all border ${
                activeStatFilter === 'pending'
                  ? 'bg-gradient-to-br from-red-950/40 to-slate-900 text-white border-red-500 ring-2 ring-red-500/20 shadow-md'
                  : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-red-400/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 dark:text-red-400 flex items-center gap-1.5">
                  <span>New Requests</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-red-500/10 text-red-500 text-[9px] font-black">
                    Needs Review
                  </span>
                </span>
                {activeStatFilter === 'pending' && <span className="w-2 h-2 rounded-full bg-red-400" />}
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-red-500 dark:text-red-400">{stats.pending}</span>
                <span className="text-[11px] font-bold text-red-400/80">
                  {activeStatFilter === 'pending' ? 'Active ✓' : 'Tap to filter'}
                </span>
              </div>
            </button>

            {/* 3. Processed Card (Mobile Moss / Green) */}
            <button
              type="button"
              onClick={() => setActiveStatFilter(activeStatFilter === 'answered' ? 'all' : 'answered')}
              className={`p-4 rounded-2xl text-left transition-all border ${
                activeStatFilter === 'answered'
                  ? 'bg-gradient-to-br from-emerald-950/40 to-slate-900 text-white border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                  : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-emerald-400/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                  <span>Processed</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-500 text-[9px] font-black">
                    Answered
                  </span>
                </span>
                {activeStatFilter === 'answered' && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-emerald-500">{stats.answered}</span>
                <span className="text-[11px] font-bold text-emerald-400">
                  {activeStatFilter === 'answered' ? 'Active ✓' : 'Tap to filter'}
                </span>
              </div>
            </button>

            {/* 4. Urgent Petitions Card */}
            <button
              type="button"
              onClick={() => setActiveStatFilter(activeStatFilter === 'urgent' ? 'all' : 'urgent')}
              className={`p-4 rounded-2xl text-left transition-all border ${
                activeStatFilter === 'urgent'
                  ? 'bg-gradient-to-br from-amber-950/40 to-slate-900 text-white border-amber-500 ring-2 ring-amber-500/20 shadow-md'
                  : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-amber-400/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                  Urgent Petitions
                </span>
                <AlertTriangle size={14} className="text-amber-500" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-amber-500">{stats.urgent}</span>
                <span className="text-[11px] font-bold text-amber-400">
                  {activeStatFilter === 'urgent' ? 'Active ✓' : 'Keywords'}
                </span>
              </div>
            </button>
          </div>

          {/* Status Tabs & Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800">
            {/* Quick Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setActiveStatFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeStatFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                All Requests ({stats.total})
              </button>
              <button
                type="button"
                onClick={() => setActiveStatFilter('pending')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeStatFilter === 'pending'
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'
                }`}
              >
                <Clock size={12} />
                <span>New Requests ({stats.pending})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveStatFilter('answered')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeStatFilter === 'answered'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                }`}
              >
                <CheckCircle2 size={12} />
                <span>Processed ({stats.answered})</span>
              </button>
            </div>

            {/* Search and Dropdowns */}
            <div className="flex items-center gap-2 flex-1 sm:justify-end">
              <div className="relative flex-1 sm:max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search petitioner, text, phone..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                {ALL_FILTER_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'All' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>

              <select
                value={selectedPrivacy}
                onChange={(e) => setSelectedPrivacy(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="all">All Privacy</option>
                <option value="public">Wall (Public)</option>
                <option value="confidential">Confidential</option>
              </select>
            </div>
          </div>

          {/* Prayer Request Cards Grid */}
          {isLoading ? (
            <div className="p-16 text-center text-slate-500 flex flex-col items-center gap-3">
              <RefreshCw size={26} className="animate-spin text-emerald-500" />
              <span className="text-xs font-medium">Synchronizing prayer requests with church database...</span>
            </div>
          ) : filteredPrayers.length === 0 ? (
            <div className="p-16 text-center rounded-3xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
              <HeartHandshake size={36} className="mx-auto text-slate-400" />
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                No prayer petitions found
              </div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery || selectedCategory !== 'All' || activeStatFilter !== 'all'
                  ? 'No petitions match the selected filters. Try switching tabs or clearing search.'
                  : 'No member prayer requests have been submitted yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredPrayers.map((item) => {
                const isEmergency = hasEmergencyKeywords(item.text || '');
                const authorInitial = (item.authorName || item.name || 'M').charAt(0).toUpperCase();
                const isAnswered = Boolean(item.isAnswered);
                const hasTelugu = Boolean(item.textTe && item.textTe.trim() && item.textTe.trim() !== (item.text || '').trim());
                const phoneDigits = getPhoneDigits(item.phone || item.contactPhone);

                return (
                  <div
                    key={item.id}
                    className={`rounded-3xl p-5 border transition-all flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md ${
                      isEmergency && !isAnswered
                        ? 'bg-red-500/5 dark:bg-red-950/20 border-red-500/30'
                        : isAnswered
                        ? 'bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/25'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="space-y-3.5">
                      {/* Top Badges Row */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Category Badge */}
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            {item.category || 'Pray for me'}
                          </span>

                          {/* Privacy Badge */}
                          {item.isPublic ? (
                            <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 text-[10px] font-bold flex items-center gap-1">
                              <Megaphone size={11} />
                              <span>Wall (Public)</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-bold flex items-center gap-1">
                              <ShieldCheck size={11} />
                              <span>Confidential</span>
                            </span>
                          )}

                          {/* Urgent Emergency Badge */}
                          {isEmergency && !isAnswered && (
                            <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 border border-red-500/30 text-[10px] font-bold flex items-center gap-1 animate-pulse">
                              <AlertTriangle size={11} />
                              <span>URGENT</span>
                            </span>
                          )}
                        </div>

                        {/* Status Badge (Exact Mobile Color Palette) */}
                        <div className="flex items-center gap-1.5">
                          {isAnswered ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                              <CheckCircle2 size={11} />
                              <span>PROCESSED</span>
                            </span>
                          ) : item.status === 'rejected' ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/30 text-[10px] font-black uppercase tracking-wider">
                              REJECTED
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                              <Clock size={11} />
                              <span>PENDING</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Requester Profile Row */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-sm shadow-sm ${
                              isAnswered ? 'bg-emerald-600' : 'bg-purple-600'
                            }`}
                          >
                            {authorInitial}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                              <span>{item.authorName || item.name}</span>
                              {item.isClosed && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                                  Closed
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span>{getTimeAgo(item.createdAt)}</span>
                              {item.phone && (
                                <>
                                  <span>&bull;</span>
                                  <span className="font-mono">{item.phone}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {phoneDigits && (
                          <a
                            href={`tel:${phoneDigits}`}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                            title={`Call ${item.authorName || 'Member'}`}
                          >
                            <PhoneCall size={14} />
                          </a>
                        )}
                      </div>

                      {/* Prayer Request Text Block */}
                      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 space-y-2">
                        <p className="font-serif leading-relaxed text-[13px]">
                          &ldquo;{item.text || item.request || item.title}&rdquo;
                        </p>

                        {/* Telugu Request Translation */}
                        {hasTelugu && (
                          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                              TELUGU PETITION
                            </span>
                            <p className="italic font-serif text-[12px] text-slate-600 dark:text-slate-300">
                              {item.textTe}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Attached Bible Verse for Processed Petitions */}
                      {isAnswered && (item.bibleVerse || item.verseReference) && (
                        <div className="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/25 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 font-bold text-xs text-amber-800 dark:text-amber-300">
                              <BookOpen size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
                              <span>{item.bibleVerse || item.verseReference}</span>
                              {item.verseReferenceTe && (
                                <span className="font-normal text-amber-700/80 dark:text-amber-400/80">
                                  &bull; {item.verseReferenceTe}
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleShareWhatsApp(item)}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 text-[11px] font-bold flex items-center gap-1 transition-colors"
                            >
                              <Share2 size={11} />
                              <span>Share Verse</span>
                            </button>
                          </div>

                          {item.verseText && (
                            <p className="italic text-[11.5px] font-serif text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
                              &ldquo;{item.verseText}&rdquo;
                            </p>
                          )}
                          {item.verseTextTe && item.verseTextTe.trim() !== (item.verseText || '').trim() && (
                            <p className="italic text-[11px] font-serif text-amber-800/80 dark:text-amber-300/80">
                              &ldquo;{item.verseTextTe}&rdquo;
                            </p>
                          )}
                        </div>
                      )}

                      {/* Pastoral Encouragement Note */}
                      {item.lastAdminResponse && (
                        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-300">
                          <span className="font-bold block text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-0.5">
                            Pastor Note &bull; {item.lastAdminName || 'Pastoral Care'}
                          </span>
                          <p className="text-[11.5px] leading-relaxed">{item.lastAdminResponse}</p>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions (Matching Mobile Card Footer) */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {/* 1-Click Pray Button with Live Counter */}
                        <button
                          type="button"
                          onClick={() => handleAdminPray(item)}
                          className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/25 text-xs font-bold transition-all flex items-center gap-1.5"
                          title="Record prayer for this petition"
                        >
                          <Heart size={14} className="fill-blue-500/20" />
                          <span>Pray ({item.prayCount || 0})</span>
                        </button>

                        {/* Moderate / Pray Trigger Button */}
                        <button
                          type="button"
                          onClick={() => openModerationModal(item)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                        >
                          <HeartHandshake size={14} />
                          <span>{isAnswered ? 'Edit Blessing' : 'Moderate / Pray'}</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Close Button */}
                        {!item.isClosed && (
                          <button
                            type="button"
                            onClick={() => handleCloseRequest(item)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors"
                          >
                            Close
                          </button>
                        )}

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => setDeletingPrayer(item)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                          title="Delete prayer petition"
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

          {/* ── MODERATION & BLESSING MODAL (100% Exact Mobile Parity) ── */}
          {reviewItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative max-h-[92vh] overflow-y-auto">
                {/* Modal Close */}
                <button
                  type="button"
                  onClick={() => setReviewItem(null)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
                >
                  <X size={20} />
                </button>

                {/* Submitting Member Header */}
                <div className="flex items-center gap-3 pr-8">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-white text-base shadow-sm ${
                      reviewItem.isAnswered ? 'bg-emerald-600' : 'bg-purple-600'
                    }`}
                  >
                    {(reviewItem.authorName || reviewItem.name || 'M').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{reviewItem.authorName || reviewItem.name}</span>
                      {reviewItem.isPublic ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 border border-teal-500/20">
                          Public Request
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
                          Confidential
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Submitted {getTimeAgo(reviewItem.createdAt)} &bull; Category:{' '}
                      <span className="font-semibold">{reviewItem.category || 'General'}</span>
                    </p>
                  </div>

                  {reviewItem.phone && (
                    <a
                      href={`tel:${getPhoneDigits(reviewItem.phone)}`}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <PhoneCall size={13} />
                      <span>Call Member</span>
                    </a>
                  )}
                </div>

                {/* Original Prayer Request Text Box */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    PRAYER PETITION DETAILS
                  </span>
                  <p className="font-serif text-sm text-slate-800 dark:text-slate-100 leading-relaxed">
                    &ldquo;{reviewItem.text || reviewItem.request}&rdquo;
                  </p>
                  {reviewItem.textTe && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                        TELUGU TRANSLATION
                      </span>
                      <p className="font-serif italic text-xs text-slate-600 dark:text-slate-300">
                        {reviewItem.textTe}
                      </p>
                    </div>
                  )}
                </div>

                {/* ── STEP 1: Bible Scripture Selection ── */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen size={16} className="text-emerald-500" />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                        1. Bible Scripture Selection
                      </span>
                    </div>

                    {scriptureRefEn && (
                      <button
                        type="button"
                        onClick={() => {
                          setScriptureRefEn('');
                          setScriptureRefTe('');
                          setScriptureEnText('');
                          setScriptureTeText('');
                        }}
                        className="text-[11px] font-bold text-red-500 hover:underline"
                      >
                        Clear Verse
                      </button>
                    )}
                  </div>

                  {/* BCV Selectors */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Book */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Holy Book (66 Books)
                      </label>
                      <select
                        value={selectedBookIdx}
                        onChange={(e) => {
                          const idx = parseInt(e.target.value, 10);
                          setSelectedBookIdx(idx);
                          setSelectedChapter(1);
                          handleLookupScripture(idx, 1, selectedVerseInput);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                      >
                        {ENGLISH_NAMES.map((book, idx) => (
                          <option key={book} value={idx}>
                            {idx + 1}. {book} ({TELUGU_NAMES[idx] || book})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Chapter */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Chapter
                      </label>
                      <select
                        value={selectedChapter}
                        onChange={(e) => {
                          const ch = parseInt(e.target.value, 10);
                          setSelectedChapter(ch);
                          handleLookupScripture(selectedBookIdx, ch, selectedVerseInput);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                      >
                        {Array.from({ length: getChapterCount(selectedBookIdx) || 20 }, (_, i) => i + 1).map((ch) => (
                          <option key={ch} value={ch}>
                            Chapter {ch}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Verse / Verse Range */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Verse (e.g. 6 or 6-7)
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={selectedVerseInput}
                          onChange={(e) => setSelectedVerseInput(e.target.value)}
                          placeholder="e.g. 6-7"
                          className="flex-1 px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleLookupScripture(selectedBookIdx, selectedChapter, selectedVerseInput)}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500"
                        >
                          Lookup
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Auto-Fetched Scripture Inputs */}
                  {isLoadingScripture ? (
                    <div className="p-3 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                      <RefreshCw size={13} className="animate-spin text-emerald-500" />
                      <span>Fetching scripture in English &amp; Telugu...</span>
                    </div>
                  ) : scriptureRefEn ? (
                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          <span>English (Holy Bible): {scriptureRefEn}</span>
                        </div>
                        <textarea
                          rows={2}
                          value={scriptureEnText}
                          onChange={(e) => setScriptureEnText(e.target.value)}
                          placeholder="English scripture text..."
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-serif text-slate-900 dark:text-white focus:outline-none resize-none"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          <span>Telugu (పరిశుద్ధ గ్రంథము): {scriptureRefTe}</span>
                        </div>
                        <textarea
                          rows={2}
                          value={scriptureTeText}
                          onChange={(e) => setScriptureTeText(e.target.value)}
                          placeholder="Telugu scripture text..."
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-serif italic text-slate-900 dark:text-white focus:outline-none resize-none"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* ── STEP 2: Personal Prayer Response ── */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={16} className="text-blue-500" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      2. Personal Prayer Response
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Enter your personal pastoral message, prayer, or encouragement for this member:
                  </p>
                  <textarea
                    rows={3}
                    value={personalReply}
                    onChange={(e) => setPersonalReply(e.target.value)}
                    placeholder="Type your personal prayer response to encourage this church member..."
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none resize-none"
                  />
                </div>

                {/* ── STEP 3: Sharing & Decision Actions ── */}
                <div className="space-y-3">
                  {/* Outreach Share Row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleShareWhatsApp(reviewItem)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <MessageCircle size={15} />
                      <span>WhatsApp Motivational Verse</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleShareEncouragement(reviewItem)}
                      className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
                    >
                      <Copy size={13} />
                      <span>Copy Encouragement</span>
                    </button>
                  </div>

                  {/* Decision Type Buttons */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setModalActionType('approve')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                        modalActionType === 'approve'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Megaphone size={16} />
                      <span>Approve (Wall)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalActionType('respond')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                        modalActionType === 'respond'
                          ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <ShieldCheck size={16} />
                      <span>Send Private</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalActionType('reject')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                        modalActionType === 'reject'
                          ? 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <XCircle size={16} />
                      <span>Reject</span>
                    </button>
                  </div>

                  {modalActionType === 'reject' && (
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Rejection Reason
                      </label>
                      <textarea
                        rows={2}
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Explain why this petition cannot be approved..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none resize-none"
                      />
                    </div>
                  )}

                  {/* Modal Footer Submit */}
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
                      {isSubmittingModeration ? (
                        <RefreshCw size={13} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={14} />
                      )}
                      <span>
                        {modalActionType === 'approve'
                          ? 'Approve & Post to Prayer Wall'
                          : modalActionType === 'respond'
                          ? 'Save & Send Private Encouragement'
                          : 'Reject Petition'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── + NEW PRAYER REQUEST MODAL (Mobile Pastor Request Workflow) ── */}
          {showNewPrayerModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative max-h-[92vh] overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setShowNewPrayerModal(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
                >
                  <X size={18} />
                </button>

                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Plus size={18} className="text-emerald-500" />
                    <span>Create New Prayer Request</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Submit a congregation prayer petition on behalf of a member or corporate gathering.
                  </p>
                </div>

                <form onSubmit={handleCreateNewPrayer} className="space-y-3.5">
                  {/* Member Quick Search or Manual Input */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Church Member / Author
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={newPrayerAuthor}
                        onChange={(e) => {
                          setNewPrayerAuthor(e.target.value);
                          handleSearchMembers(e.target.value);
                        }}
                        placeholder="Search congregation roster or type name..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none"
                      />
                      {isSearchingMembers && (
                        <RefreshCw size={13} className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      )}
                    </div>

                    {/* Member search dropdown autocomplete */}
                    {memberSearchResults.length > 0 && (
                      <div className="p-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg space-y-0.5">
                        {memberSearchResults.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setNewPrayerAuthor(m.name);
                              setNewPrayerPhone(m.phone || '');
                              setMemberSearchResults([]);
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between text-xs"
                          >
                            <span className="font-bold text-slate-900 dark:text-white">{m.name}</span>
                            <span className="text-[11px] text-slate-400 font-mono">{m.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Contact Phone (WhatsApp)
                    </label>
                    <input
                      type="text"
                      value={newPrayerPhone}
                      onChange={(e) => setNewPrayerPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none font-mono"
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Prayer Category
                    </label>
                    <select
                      value={newPrayerCategory}
                      onChange={(e) => setNewPrayerCategory(e.target.value as PrayerCategory)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
                    >
                      {PRAYER_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* English Prayer Request */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Prayer Request (English) *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={newPrayerTextEn}
                      onChange={(e) => setNewPrayerTextEn(e.target.value)}
                      placeholder="Please pray for healing and God's peace..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none resize-none"
                    />
                  </div>

                  {/* Optional Telugu Prayer Request */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Telugu Translation (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={newPrayerTextTe}
                      onChange={(e) => setNewPrayerTextTe(e.target.value)}
                      placeholder="దయచేసి ప్రార్థించండి..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none resize-none font-serif"
                    />
                  </div>

                  {/* Post As & Privacy */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Post As
                      </label>
                      <select
                        value={newPrayerPostAs}
                        onChange={(e) => setNewPrayerPostAs(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
                      >
                        <option value={adminName}>{adminName} (Pastor)</option>
                        <option value="Church — Corporate">Church — Corporate</option>
                        <option value="Anonymous">Anonymous</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Privacy Mode
                      </label>
                      <select
                        value={newPrayerPrivacy}
                        onChange={(e) => setNewPrayerPrivacy(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
                      >
                        <option value="public">Wall (Public)</option>
                        <option value="private">Confidential (Private)</option>
                      </select>
                    </div>
                  </div>

                  {/* Form Footer */}
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowNewPrayerModal(false)}
                      className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingNewPrayer}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-950/20 flex items-center gap-1.5"
                    >
                      {isSubmittingNewPrayer ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={14} />}
                      <span>Save Prayer Petition</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ── DELETE CONFIRMATION MODAL ── */}
          {deletingPrayer && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative text-center">
                <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
                  <Trash2 size={24} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Delete Prayer Request?
                  </h4>
                  <p className="text-xs text-slate-500">
                    Are you sure you want to permanently remove this prayer request from church records?
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeletingPrayer(null)}
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
