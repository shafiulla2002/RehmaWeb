'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminNavigationShell } from '@/components/layout/AdminNavigationShell';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import {
  Video,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  FileText,
  CheckCircle2,
  AlertTriangle,
  X,
  Calendar,
  Clock,
  BookOpen,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Play,
  FolderPlus,
  Send,
  Upload,
  User,
  Paperclip,
  Check,
  Megaphone,
  Radio,
  Layers,
} from 'lucide-react';

export interface FirebaseSermonItem {
  id: string;
  title: string;
  titleEn?: string;
  titleTelugu?: string;
  titleTe?: string;
  pastor: string;
  speaker?: string;
  categories?: string;
  category?: string;
  date: string;
  duration?: string;
  youtubeId?: string;
  status: 'Published' | 'Scheduled' | 'Draft' | string;
  scripture?: string;
  description?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  audioUrl?: string;
  notesUrl?: string;
  notesFileName?: string;
  notesFileType?: string;
  notesFileSize?: number;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  scheduledPublishAt?: string | null;
  publishedAt?: string | null;
  notifyMembers?: boolean;
  autoSend?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

const DEFAULT_SERMON_CATEGORIES = [
  'Sunday Service',
  'Special Messages',
  'Bible Study',
  "Women's Fasting Prayer",
  'Second Saturday Prayer',
  'All-Night Prayer',
  'Youth Meeting',
  'Revival Meeting',
  'Shorts',
  'Testimonies',
];

const extractYoutubeId = (url: string) => {
  if (!url || typeof url !== 'string') return '';
  const cleanUrl = url.trim();
  const match = cleanUrl.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]+)/
  );
  return match ? match[1] : cleanUrl;
};

const formatDateTimeDisplay = (val: any): string => {
  if (!val) return '';
  try {
    const d = typeof val === 'string' ? new Date(val) : val.toDate ? val.toDate() : new Date(val);
    if (isNaN(d.getTime())) return String(val);

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    return `${day}-${month}-${year} at ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  } catch (_) {
    return '';
  }
};

export default function AdminSermonsPage() {
  const [sermons, setSermons] = useState<FirebaseSermonItem[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>(DEFAULT_SERMON_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // Create / Edit Modal State
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields matching mobile AdminSermonEditor exactly
  const [formTitleEn, setFormTitleEn] = useState('');
  const [formTitleTe, setFormTitleTe] = useState('');
  const [formPastor, setFormPastor] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formRef, setFormRef] = useState('');
  const [formDuration, setFormDuration] = useState('45 min');
  const [formYoutubeId, setFormYoutubeId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formThumbnailUrl, setFormThumbnailUrl] = useState('');
  const [formStatus, setFormStatus] = useState<'Published' | 'Scheduled' | 'Draft'>('Published');
  const [formScheduledDate, setFormScheduledDate] = useState(() => {
    const now = new Date();
    if (now.getHours() >= 20) now.setDate(now.getDate() + 1);
    return now.toISOString().slice(0, 10);
  });
  const [formScheduledTime, setFormScheduledTime] = useState(() => {
    const now = new Date();
    return now.getHours() >= 20 ? '09:00 AM' : '08:00 PM';
  });
  const [formNotifyMembers, setFormNotifyMembers] = useState(true);
  const [formAutoSend, setFormAutoSend] = useState(false);
  const [formCategories, setFormCategories] = useState<string[]>(['Sunday Service']);

  // Custom Category Creation Modal
  const [showNewCatModal, setShowNewCatModal] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');

  // Preview & Delete Confirmation
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FirebaseSermonItem | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // File Upload Reference for Custom Thumbnail
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingThumb, setIsUploadingThumb] = useState(false);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  // Load Sermons from canonical church collection: Rhema Church/rhema/sermons
  const loadSermons = async () => {
    try {
      setLoading(true);
      setError(null);
      const colRef = collection(db, 'Rhema Church', 'rhema', 'sermons');
      const snap = await getDocs(colRef);

      const items: FirebaseSermonItem[] = [];
      const catCollector = new Set<string>(DEFAULT_SERMON_CATEGORIES);

      snap.forEach((docSnap) => {
        const d = docSnap.data();
        const catStr = d.categories || d.category || '';
        if (catStr) {
          catStr.split(';').forEach((c: string) => {
            const trimmed = c.trim();
            if (trimmed) catCollector.add(trimmed);
          });
        }

        // Normalize status
        let st: 'Published' | 'Scheduled' | 'Draft' = 'Published';
        const rawSt = String(d.status || '').toLowerCase();
        if (rawSt === 'draft') st = 'Draft';
        else if (rawSt === 'scheduled') st = 'Scheduled';

        items.push({
          id: docSnap.id,
          title: d.title || d.titleEn || 'Untitled Sermon',
          titleEn: d.titleEn || d.title || '',
          titleTelugu: d.titleTelugu || d.titleTe || '',
          titleTe: d.titleTe || d.titleTelugu || '',
          pastor: d.pastor || d.speaker || 'Pastor',
          categories: catStr || 'Sunday Service',
          category: catStr.split(';')[0] || 'Sunday Service',
          date: d.date || '2026-10-25',
          duration: d.duration || '45 min',
          youtubeId: d.youtubeId || '',
          status: st,
          scripture: d.scripture || d.ref || '',
          description: d.description || '',
          thumbnailUrl: d.thumbnailUrl || d.imageUrl || '',
          imageUrl: d.imageUrl || d.thumbnailUrl || '',
          audioUrl: d.audioUrl || '',
          notesUrl: d.notesUrl || '',
          notesFileName: d.notesFileName || '',
          notesFileType: d.notesFileType || '',
          notesFileSize: d.notesFileSize,
          scheduledDate: d.scheduledDate,
          scheduledTime: d.scheduledTime,
          scheduledPublishAt: d.scheduledPublishAt,
          publishedAt: d.publishedAt,
          notifyMembers: d.notifyMembers !== false,
          autoSend: !!d.autoSend,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        });
      });

      // Sort by preaching date descending
      items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setSermons(items);
      setCustomCategories(Array.from(catCollector));
    } catch (err: unknown) {
      console.warn('Failed to load sermons from Firestore:', err);
      setError('Unable to load sermons from church collection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSermons();
  }, []);

  // Compute unique series/categories from real sermons
  const allSeriesCategories = useMemo(() => {
    const set = new Set<string>();
    sermons.forEach((s) => {
      const cats = s.categories ? s.categories.split(';') : [s.category || 'Sunday Service'];
      cats.forEach((c) => {
        const trimmed = c.trim();
        if (trimmed) set.add(trimmed);
      });
    });
    return Array.from(set);
  }, [sermons]);

  // Statistics calculation for Top Summary Cards
  const stats = useMemo(() => {
    const published = sermons.filter((s) => s.status === 'Published').length;
    const drafts = sermons.filter((s) => s.status === 'Draft').length;
    const scheduled = sermons.filter((s) => s.status === 'Scheduled').length;
    const seriesCount = allSeriesCategories.length;
    return { published, drafts, scheduled, seriesCount };
  }, [sermons, allSeriesCategories]);

  // Combined Category List for Chips Filter
  const categoryChips = useMemo(() => {
    return ['All', ...customCategories];
  }, [customCategories]);

  // Filtered sermons based on search and active category / status chip
  const filteredSermons = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return sermons.filter((s) => {
      // 1. Status or Category chip filter
      if (activeFilter === 'Published') {
        if (s.status !== 'Published') return false;
      } else if (activeFilter === 'Drafts') {
        if (s.status !== 'Draft') return false;
      } else if (activeFilter === 'Scheduled') {
        if (s.status !== 'Scheduled') return false;
      } else if (activeFilter !== 'All') {
        const cats = s.categories ? s.categories.split(';') : [s.category || ''];
        if (!cats.some((c) => c.trim().toLowerCase() === activeFilter.toLowerCase())) {
          return false;
        }
      }

      // 2. Search query filter
      if (q) {
        const tEn = (s.titleEn || s.title || '').toLowerCase();
        const tTe = (s.titleTelugu || s.titleTe || '').toLowerCase();
        const pastor = (s.pastor || '').toLowerCase();
        const desc = (s.description || '').toLowerCase();
        const cats = (s.categories || '').toLowerCase();
        if (
          !tEn.includes(q) &&
          !tTe.includes(q) &&
          !pastor.includes(q) &&
          !desc.includes(q) &&
          !cats.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [sermons, activeFilter, searchQuery]);

  // Open Create Sermon Modal
  const openCreateModal = () => {
    setEditingId(null);
    setFormError(null);
    setFormTitleEn('');
    setFormTitleTe('');
    setFormPastor('Dr.Blessy');
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormRef('');
    setFormDuration('45 min');
    setFormYoutubeId('');
    setFormDescription('');
    setFormThumbnailUrl('');
    setFormStatus('Published');
    setFormScheduledDate(new Date().toISOString().slice(0, 10));
    setFormScheduledTime('08:00 PM');
    setFormNotifyMembers(true);
    setFormAutoSend(false);
    setFormCategories(['Sunday Service']);
    setEditorOpen(true);
  };

  // Open Edit Sermon Modal
  const openEditModal = (item: FirebaseSermonItem) => {
    setEditingId(item.id);
    setFormError(null);
    setFormTitleEn(item.titleEn || item.title || '');
    setFormTitleTe(item.titleTelugu || item.titleTe || '');
    setFormPastor(item.pastor || 'Pastor');
    setFormDate(item.date || new Date().toISOString().slice(0, 10));
    setFormRef(item.scripture || '');
    setFormDuration(item.duration || '45 min');
    setFormYoutubeId(item.youtubeId ? (item.youtubeId.startsWith('http') ? item.youtubeId : `https://youtube.com/watch?v=${item.youtubeId}`) : '');
    setFormDescription(item.description || '');
    setFormThumbnailUrl(item.thumbnailUrl || item.imageUrl || '');
    setFormStatus((item.status as any) || 'Published');
    setFormScheduledDate(item.scheduledDate || new Date().toISOString().slice(0, 10));
    setFormScheduledTime(item.scheduledTime || '08:00 PM');
    setFormNotifyMembers(item.notifyMembers !== false);
    setFormAutoSend(!!item.autoSend);

    const cats = item.categories
      ? item.categories.split(';').map((c) => c.trim()).filter(Boolean)
      : [item.category || 'Sunday Service'];
    setFormCategories(cats);
    setEditorOpen(true);
  };

  // Category Toggle inside editor form
  const toggleFormCategory = (cat: string) => {
    setFormCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  // Handle local 16:9 thumbnail upload
  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notify('Please select a valid image file');
      return;
    }

    setIsUploadingThumb(true);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormThumbnailUrl(reader.result);
        setIsUploadingThumb(false);
        notify('Custom thumbnail loaded');
      }
    };
    reader.onerror = () => {
      setIsUploadingThumb(false);
      notify('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  // Save Sermon (Create or Update)
  const handleSaveSermon = async (statusOverride?: 'Published' | 'Scheduled' | 'Draft') => {
    const finalStatus = statusOverride || formStatus;
    setFormError(null);

    if (!formTitleEn.trim()) {
      setFormError('Sermon Title in English is required.');
      return;
    }
    if (!formPastor.trim()) {
      setFormError('Pastor / Preacher name is required.');
      return;
    }
    if (formCategories.length === 0) {
      setFormError('Please select at least one sermon category.');
      return;
    }

    setFormSubmitting(true);
    const cleanYt = extractYoutubeId(formYoutubeId);

    const payload: any = {
      title: formTitleEn.trim(),
      titleEn: formTitleEn.trim(),
      titleTelugu: formTitleTe.trim(),
      titleTe: formTitleTe.trim(),
      pastor: formPastor.trim(),
      speaker: formPastor.trim(),
      date: formDate,
      duration: formDuration.trim(),
      youtubeId: cleanYt,
      description: formDescription.trim(),
      scripture: formRef.trim(),
      categories: formCategories.join(';'),
      category: formCategories[0] || 'Sunday Service',
      thumbnailUrl: formThumbnailUrl.trim(),
      imageUrl: formThumbnailUrl.trim(),
      status: finalStatus,
      scheduledDate: finalStatus === 'Scheduled' ? formScheduledDate : null,
      scheduledTime: finalStatus === 'Scheduled' ? formScheduledTime : null,
      scheduledPublishAt: finalStatus === 'Scheduled' ? `${formScheduledDate}T${formScheduledTime}:00Z` : null,
      publishedAt: finalStatus === 'Published' ? new Date().toISOString() : null,
      notifyMembers: formNotifyMembers,
      autoSend: formAutoSend,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingId) {
        const docRef = doc(db, 'Rhema Church', 'rhema', 'sermons', editingId);
        await updateDoc(docRef, payload);
        notify(`Updated sermon: ${formTitleEn}`);
      } else {
        const colRef = collection(db, 'Rhema Church', 'rhema', 'sermons');
        await addDoc(colRef, {
          ...payload,
          createdAt: serverTimestamp(),
        });
        notify(`Created sermon: ${formTitleEn}`);
      }

      setEditorOpen(false);
      await loadSermons();
    } catch (err: any) {
      console.error('Sermon save error:', err);
      setFormError(err?.message || 'Failed to save sermon document.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Sermon
  const handleDeleteSermon = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      const docRef = doc(db, 'Rhema Church', 'rhema', 'sermons', deleteTarget.id);
      await deleteDoc(docRef);
      notify(`Permanently deleted sermon: ${deleteTarget.title}`);
      setDeleteTarget(null);
      await loadSermons();
    } catch (err: any) {
      console.error('Delete error:', err);
      notify(err?.message || 'Failed to delete sermon.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Add new Custom Category
  const handleAddNewCategory = () => {
    const trimmed = newCatInput.trim();
    if (!trimmed) return;
    if (!customCategories.includes(trimmed)) {
      setCustomCategories((prev) => [...prev, trimmed]);
    }
    if (!formCategories.includes(trimmed)) {
      setFormCategories((prev) => [...prev, trimmed]);
    }
    setNewCatInput('');
    setShowNewCatModal(false);
    notify(`Added new category: ${trimmed}`);
  };

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
                <span className="p-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
                  <Video size={22} />
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Sermons
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Curate ministry sermons, video messages, sermon series &amp; broadcast notes
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadSermons}
                disabled={loading}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                title="Refresh from Firestore"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>

              <button
                type="button"
                onClick={openCreateModal}
                className="px-4 py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold text-xs flex items-center gap-2 shadow-md hover:opacity-90 transition-all"
              >
                <Plus size={16} />
                <span>+ New Sermon</span>
              </button>
            </div>
          </div>

          {/* 1. TOP SUMMARY CARDS (Matching Mobile Exact Cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: PUBLISHED */}
            <div
              onClick={() => setActiveFilter('Published')}
              className={`p-5 rounded-3xl border transition-all cursor-pointer shadow-sm relative overflow-hidden flex flex-col justify-between ${
                activeFilter === 'Published'
                  ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400/50'
              }`}
            >
              <div className="w-8 h-1 rounded-full bg-emerald-500 mb-2" />
              <div>
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white block">
                  {stats.published}
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mt-1 block">
                  PUBLISHED
                </span>
                <span className="text-[11px] text-slate-400 font-medium">Tap to filter</span>
              </div>
            </div>

            {/* Card 2: DRAFTS */}
            <div
              onClick={() => setActiveFilter('Drafts')}
              className={`p-5 rounded-3xl border transition-all cursor-pointer shadow-sm relative overflow-hidden flex flex-col justify-between ${
                activeFilter === 'Drafts'
                  ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/20 ring-2 ring-amber-500/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-400/50'
              }`}
            >
              <div className="w-8 h-1 rounded-full bg-amber-500 mb-2" />
              <div>
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white block">
                  {stats.drafts}
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mt-1 block">
                  DRAFTS
                </span>
                <span className="text-[11px] text-slate-400 font-medium">Tap to filter</span>
              </div>
            </div>

            {/* Card 3: SCHEDULED (if any) */}
            {stats.scheduled > 0 && (
              <div
                onClick={() => setActiveFilter('Scheduled')}
                className={`p-5 rounded-3xl border transition-all cursor-pointer shadow-sm relative overflow-hidden flex flex-col justify-between ${
                  activeFilter === 'Scheduled'
                    ? 'border-purple-500 bg-purple-50/70 dark:bg-purple-950/20 ring-2 ring-purple-500/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-purple-400/50'
                }`}
              >
                <div className="w-8 h-1 rounded-full bg-purple-500 mb-2" />
                <div>
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white block">
                    {stats.scheduled}
                  </span>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mt-1 block">
                    SCHEDULED
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">Tap to filter</span>
                </div>
              </div>
            )}

            {/* Card 4: SERIES */}
            <div
              onClick={() => setActiveFilter('All')}
              className="p-5 rounded-3xl border border-blue-200/80 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 shadow-sm relative overflow-hidden flex flex-col justify-between cursor-pointer"
            >
              <div className="w-8 h-1 rounded-full bg-blue-600 mb-2" />
              <div>
                <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 block">
                  {stats.seriesCount}
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xs font-black uppercase tracking-wider text-blue-950 dark:text-blue-200">
                    SERIES
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                </div>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
                  Active &bull;
                </span>
              </div>
            </div>
          </div>

          {/* 2. CATEGORY FILTER CHIPS */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
            {categoryChips.map((cat) => {
              const isSelected = activeFilter === cat;
              const count =
                cat === 'All'
                  ? sermons.length
                  : sermons.filter((s) => {
                      const cArr = s.categories ? s.categories.split(';') : [s.category || ''];
                      return cArr.some((c) => c.trim().toLowerCase() === cat.toLowerCase());
                    }).length;

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveFilter(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-2 ${
                    isSelected
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isSelected
                        ? 'bg-white/20 text-white dark:bg-slate-800 dark:text-slate-200'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 3. SEARCH BAR */}
          <div className="relative">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search sermons by English/Telugu title, pastor, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 shadow-sm"
            />
          </div>

          {/* 4. SERMONS LISTING (Grouped by Category or Filter) */}
          {loading && sermons.length === 0 ? (
            <div className="p-16 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
              <RefreshCw size={24} className="animate-spin text-red-500" />
              <span>Loading sermons from church repository...</span>
            </div>
          ) : filteredSermons.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
              <Video size={32} className="mx-auto text-slate-400 mb-2" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                No sermons found
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Try switching the category filter or create a new sermon.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Grouping by Category when 'All' is selected, or direct card list */}
              {allSeriesCategories
                .filter((cat) => {
                  if (activeFilter === 'All') return true;
                  if (activeFilter === 'Published' || activeFilter === 'Drafts' || activeFilter === 'Scheduled') {
                    return true;
                  }
                  return cat.toLowerCase() === activeFilter.toLowerCase();
                })
                .map((categoryName) => {
                  const catSermons = filteredSermons.filter((s) => {
                    const cArr = s.categories ? s.categories.split(';') : [s.category || ''];
                    return cArr.some((c) => c.trim().toLowerCase() === categoryName.toLowerCase());
                  });

                  if (catSermons.length === 0) return null;

                  return (
                    <div key={categoryName} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                          {categoryName}
                        </h3>
                        <span className="text-[11px] text-slate-400 font-bold">
                          ({catSermons.length})
                        </span>
                      </div>

                      <div className="space-y-3">
                        {catSermons.map((sermon) => {
                          const cleanYt = extractYoutubeId(sermon.youtubeId || '');
                          const thumbUri =
                            sermon.thumbnailUrl ||
                            sermon.imageUrl ||
                            (cleanYt && cleanYt.length === 11
                              ? `https://img.youtube.com/vi/${cleanYt}/hqdefault.jpg`
                              : null);

                          const publishedDateText = formatDateTimeDisplay(
                            sermon.publishedAt || sermon.createdAt
                          );

                          return (
                            <div
                              key={sermon.id}
                              className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-red-500/40 transition-all shadow-sm"
                            >
                              <div className="flex items-start gap-4 flex-1 min-w-0">
                                {/* Thumbnail Frame with Play Button */}
                                <div
                                  onClick={() => {
                                    if (cleanYt) {
                                      setPreviewVideoUrl(
                                        `https://www.youtube.com/embed/${cleanYt}?autoplay=1`
                                      );
                                    }
                                  }}
                                  className="w-24 h-16 sm:w-28 sm:h-20 rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 shrink-0 relative cursor-pointer group"
                                >
                                  {thumbUri ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                      src={thumbUri}
                                      alt={sermon.title}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                                      <Video size={24} />
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 flex items-center justify-center transition-colors">
                                    <div className="w-7 h-7 rounded-full bg-white/90 text-black flex items-center justify-center shadow-lg">
                                      <Play size={12} className="ml-0.5 fill-black" />
                                    </div>
                                  </div>
                                </div>

                                {/* Sermon Metadata */}
                                <div className="space-y-1 flex-1 min-w-0">
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                    {sermon.titleEn || sermon.title}
                                  </h4>

                                  {(sermon.titleTelugu || sermon.titleTe) && (
                                    <p className="text-xs text-amber-700 dark:text-amber-400 font-serif font-medium truncate">
                                      {sermon.titleTelugu || sermon.titleTe}
                                    </p>
                                  )}

                                  <div className="text-[11px] text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-1.5 pt-0.5">
                                    <span className="font-semibold text-slate-900 dark:text-white">
                                      {sermon.pastor}
                                    </span>
                                    <span>&bull;</span>
                                    <span>{sermon.date}</span>
                                    <span>&bull;</span>
                                    <span>{sermon.duration}</span>
                                  </div>

                                  {publishedDateText && (
                                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 pt-0.5">
                                      <span>📢 Published: {publishedDateText}</span>
                                    </div>
                                  )}

                                  <div className="pt-1.5">
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                      {categoryName}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Actions: Edit & Delete Divider Row matching mobile */}
                              <div className="flex sm:flex-col items-center justify-end gap-3 sm:gap-2 sm:pl-4 sm:border-l border-slate-200 dark:border-slate-800 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0">
                                <button
                                  type="button"
                                  onClick={() => openEditModal(sermon)}
                                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1 py-1.5 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                                >
                                  <Edit2 size={14} />
                                  <span className="text-[10px] uppercase font-black tracking-wider">
                                    EDIT
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget(sermon)}
                                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1 py-1.5 px-3 rounded-xl hover:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold"
                                >
                                  <Trash2 size={14} />
                                  <span className="text-[10px] uppercase font-black tracking-wider">
                                    DEL
                                  </span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* CREATE / EDIT SERMON MODAL */}
          {editorOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-5 sm:p-8 space-y-6 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-red-500">
                      {editingId ? 'Edit Sermon' : 'New Sermon'}
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                      {editingId ? 'Update Sermon Details' : 'Publish New Ministry Sermon'}
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditorOpen(false)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>

                {formError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveSermon();
                  }}
                  className="space-y-4"
                >
                  {/* Title English & Telugu */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        SERMON TITLE (ENGLISH) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formTitleEn}
                        onChange={(e) => setFormTitleEn(e.target.value)}
                        placeholder="e.g. ENGLISH SERVICE"
                        required
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        SERMON TITLE (TELUGU)
                      </label>
                      <input
                        type="text"
                        value={formTitleTe}
                        onChange={(e) => setFormTitleTe(e.target.value)}
                        placeholder="e.g. ఇంగ్లీష్ సేవ"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                  </div>

                  {/* Preacher & Service Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        PASTOR / PREACHER <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formPastor}
                        onChange={(e) => setFormPastor(e.target.value)}
                        placeholder="e.g. Dr.Blessy"
                        required
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        SERVICE / PREACHED DATE <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                        required
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                  </div>

                  {/* Duration & YouTube URL */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        DURATION (e.g. 45 min, 2 hours)
                      </label>
                      <input
                        type="text"
                        value={formDuration}
                        onChange={(e) => setFormDuration(e.target.value)}
                        placeholder="e.g. 45 min"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        YOUTUBE VIDEO LINK OR ID
                      </label>
                      <input
                        type="text"
                        value={formYoutubeId}
                        onChange={(e) => setFormYoutubeId(e.target.value)}
                        placeholder="https://youtube.com/watch?v=..."
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                  </div>

                  {/* Categories Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        SERMON CATEGORIES / SERIES <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowNewCatModal(true)}
                        className="text-[10px] font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
                      >
                        <FolderPlus size={12} />
                        <span>+ Add New Series</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                      {customCategories.map((cat) => {
                        const isChecked = formCategories.includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => toggleFormCategory(cat)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                              isChecked
                                ? 'bg-red-500 text-white border-red-500 shadow-sm'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <span>{cat}</span>
                            {isChecked && <Check size={12} strokeWidth={3} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Thumbnail Image */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      CUSTOM THUMBNAIL (16:9 FORMAT)
                    </label>

                    <input
                      ref={thumbnailInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailUpload}
                      className="hidden"
                    />

                    {formThumbnailUrl ? (
                      <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={formThumbnailUrl}
                          alt="Thumbnail preview"
                          className="w-24 h-14 rounded-xl object-cover border border-slate-200 dark:border-slate-800"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => thumbnailInputRef.current?.click()}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormThumbnailUrl('')}
                            className="px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-500/10 text-xs font-semibold"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => thumbnailInputRef.current?.click()}
                        disabled={isUploadingThumb}
                        className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-red-500 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Upload size={16} />
                        <span>Upload 16:9 Custom Thumbnail</span>
                      </button>
                    )}
                  </div>

                  {/* Scripture & Description */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      SCRIPTURE REFERENCE
                    </label>
                    <input
                      type="text"
                      value={formRef}
                      onChange={(e) => setFormRef(e.target.value)}
                      placeholder="e.g. John 3:16, Romans 8:28"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      SERMON DESCRIPTION / SUMMARY
                    </label>
                    <textarea
                      rows={3}
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Devotional message key takeaways and pastoral notes..."
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium"
                    />
                  </div>

                  {/* Publication Status Selector */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                      PUBLISH STATUS
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* Option 1: Publish Now */}
                      <div
                        onClick={() => setFormStatus('Published')}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                          formStatus === 'Published'
                            ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/20'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white block">
                            Publish Now
                          </span>
                          <span className="text-[10px] text-slate-400">Live immediately</span>
                        </div>
                        {formStatus === 'Published' && (
                          <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                            <Check size={10} strokeWidth={3} />
                          </div>
                        )}
                      </div>

                      {/* Option 2: Scheduled */}
                      <div
                        onClick={() => setFormStatus('Scheduled')}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                          formStatus === 'Scheduled'
                            ? 'border-purple-500 bg-purple-50/70 dark:bg-purple-950/20'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white block">
                            Scheduled
                          </span>
                          <span className="text-[10px] text-slate-400">Auto-publish later</span>
                        </div>
                        {formStatus === 'Scheduled' && (
                          <div className="w-4 h-4 rounded-full bg-purple-500 text-white flex items-center justify-center">
                            <Check size={10} strokeWidth={3} />
                          </div>
                        )}
                      </div>

                      {/* Option 3: Save as Draft */}
                      <div
                        onClick={() => setFormStatus('Draft')}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                          formStatus === 'Draft'
                            ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/20'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white block">
                            Save as Draft
                          </span>
                          <span className="text-[10px] text-slate-400">Private draft</span>
                        </div>
                        {formStatus === 'Draft' && (
                          <div className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center">
                            <Check size={10} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Scheduled Date/Time Inputs if Scheduled is active */}
                  {formStatus === 'Scheduled' && (
                    <div className="p-3 bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/40 rounded-2xl grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-purple-950 dark:text-purple-200 uppercase mb-1">
                          Scheduled Date
                        </label>
                        <input
                          type="date"
                          value={formScheduledDate}
                          onChange={(e) => setFormScheduledDate(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-800 rounded-xl px-2.5 py-1.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-purple-950 dark:text-purple-200 uppercase mb-1">
                          Scheduled Time
                        </label>
                        <input
                          type="text"
                          value={formScheduledTime}
                          onChange={(e) => setFormScheduledTime(e.target.value)}
                          placeholder="08:00 PM"
                          className="w-full bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-800 rounded-xl px-2.5 py-1.5 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* Action Buttons matching Mobile */}
                  <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      disabled={formSubmitting}
                      onClick={() => handleSaveSermon('Published')}
                      className="w-full py-3.5 px-4 rounded-2xl bg-black dark:bg-white text-white dark:text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition-all"
                    >
                      {formSubmitting ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <Send size={16} />
                      )}
                      <span>🚀 Save &amp; Publish Now</span>
                    </button>

                    <button
                      type="button"
                      disabled={formSubmitting}
                      onClick={() => handleSaveSermon('Draft')}
                      className="w-full py-3 px-4 rounded-2xl bg-slate-800 dark:bg-slate-800 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-700 transition-all"
                    >
                      <FileText size={16} />
                      <span>📄 Save as Draft</span>
                    </button>

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => setEditorOpen(false)}
                        className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 font-semibold"
                      >
                        &larr; Back to list
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* NEW CATEGORY / SERIES MODAL */}
          {showNewCatModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative">
                <div className="flex items-center gap-2">
                  <FolderPlus size={20} className="text-red-500" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    New Sermon Series
                  </h3>
                </div>

                <p className="text-xs text-slate-500">
                  Enter a name for the new sermon category or series.
                </p>

                <input
                  type="text"
                  placeholder="e.g. Healing Revival, Faith Unshakable..."
                  value={newCatInput}
                  onChange={(e) => setNewCatInput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs"
                />

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewCatModal(false)}
                    className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddNewCategory}
                    className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
                  >
                    Add Series
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIDEO PREVIEW MODAL */}
          {previewVideoUrl && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
              <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-2xl w-full p-4 space-y-3 relative shadow-2xl">
                <button
                  type="button"
                  onClick={() => setPreviewVideoUrl(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 text-white hover:bg-white/30"
                >
                  <X size={18} />
                </button>
                <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black">
                  <iframe
                    src={previewVideoUrl}
                    title="Sermon Video Preview"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>
              </div>
            </div>
          )}

          {/* DELETE CONFIRMATION MODAL */}
          {deleteTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
                  <Trash2 size={24} />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Delete Sermon?
                  </h3>
                  <p className="text-xs text-slate-500">
                    Are you sure you want to delete &ldquo;{deleteTarget.title}&rdquo;? This will remove the sermon from the church repository.
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
                    disabled={deleteSubmitting}
                    onClick={handleDeleteSermon}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
                  >
                    {deleteSubmitting ? 'Deleting...' : 'Confirm Delete'}
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
