'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  serverTimestamp,
} from 'firebase/firestore';
import { THUMBNAIL_PALETTES } from '@/lib/adminWave7aData';
import { ENGLISH_NAMES, TELUGU_NAMES, getChapterCount, getVerseCount } from '@/lib/bible-metadata';
import {
  Sparkles,
  Plus,
  Search,
  Calendar,
  Palette,
  Edit3,
  Trash2,
  Eye,
  Download,
  CheckCircle2,
  AlertTriangle,
  X,
  BookOpen,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  Video,
  Languages,
  Upload,
  Play,
  User,
  Send,
  Clock,
  FileText,
  Check,
  ChevronDown,
  ArrowLeft,
  Image as ImageIcon,
} from 'lucide-react';

export interface FirebasePromiseItem {
  id: string;
  verse: string;
  verseTelugu?: string;
  verseReferenceEn: string;
  verseReferenceTe?: string;
  status: 'published' | 'draft' | 'scheduled' | 'Published' | 'Scheduled' | 'Draft';
  scheduledDate?: string;
  date?: string;
  devotionalNote?: string;
  devotionalNoteTe?: string;
  pastor?: string;
  youtubeId?: string;
  videoTitle?: string;
  duration?: string;
  imageUrl?: string;
  theme?: string;
  thumbnailStyle?: any;
  createdAt?: any;
  updatedAt?: any;
}

const getTodayDateStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function AdminPromisesPage() {
  const [promises, setPromises] = useState<FirebasePromiseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'library' | 'schedule' | 'thumbnail'>('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [toast, setToast] = useState<string | null>(null);

  // Create/Edit Modal State matching mobile AdminPromiseEditor exactly
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form fields
  const [formDate, setFormDate] = useState<string>(getTodayDateStr());
  const [formVerseRefEn, setFormVerseRefEn] = useState('');
  const [formVerseEn, setFormVerseEn] = useState('');
  const [formDevotionalEn, setFormDevotionalEn] = useState('');
  const [formVerseRefTe, setFormVerseRefTe] = useState('');
  const [formVerseTe, setFormVerseTe] = useState('');
  const [formDevotionalTe, setFormDevotionalTe] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formVideoTitle, setFormVideoTitle] = useState('');
  const [formDuration, setFormDuration] = useState('');
  const [formYoutubeUrl, setFormYoutubeUrl] = useState('');
  const [formPastor, setFormPastor] = useState('');
  const [formStatus, setFormStatus] = useState<'Published' | 'Scheduled' | 'Draft'>('Scheduled');

  // Auto-populate Bible Verse state
  const [selectedBook, setSelectedBook] = useState<number | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [isFetchingVerse, setIsFetchingVerse] = useState(false);
  const [selectionModalType, setSelectionModalType] = useState<'book' | 'chapter' | 'verse' | null>(null);

  // Custom thumbnail file upload state
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Preview & Delete Confirmation State
  const [previewItem, setPreviewItem] = useState<FirebasePromiseItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FirebasePromiseItem | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Canvas Thumbnail Studio State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [studioPromiseId, setStudioPromiseId] = useState<string>('');
  const [studioPaletteIdx, setStudioPaletteIdx] = useState<number>(0);
  const [studioLang, setStudioLang] = useState<'en' | 'te' | 'bilingual'>('bilingual');
  const [studioFontScale, setStudioFontScale] = useState<number>(1);

  // Fetch live promises from canonical path: Rhema Church/rhema/promises
  const loadPromises = async () => {
    try {
      setLoading(true);
      setError(null);
      const colRef = collection(db, 'Rhema Church', 'rhema', 'promises');
      const snap = await getDocs(colRef);

      const items: FirebasePromiseItem[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        let normStatus = d.status || 'draft';
        if (normStatus === 'Published') normStatus = 'published';
        else if (normStatus === 'Scheduled') normStatus = 'scheduled';
        else if (normStatus === 'Draft') normStatus = 'draft';

        items.push({
          id: docSnap.id,
          verse: d.verse || '',
          verseTelugu: d.verseTelugu || '',
          verseReferenceEn: d.verseReferenceEn || d.reference || d.referenceEn || '',
          verseReferenceTe: d.verseReferenceTe || d.referenceTe || '',
          status: normStatus,
          scheduledDate: d.scheduledDate || d.date || '',
          date: d.date || d.scheduledDate || '',
          devotionalNote: d.devotionalNote || '',
          devotionalNoteTe: d.devotionalNoteTe || '',
          pastor: d.pastor || '',
          youtubeId: d.youtubeId || '',
          videoTitle: d.videoTitle || '',
          duration: d.duration || '',
          imageUrl: d.imageUrl || '',
          theme: d.theme || '',
          thumbnailStyle: d.thumbnailStyle || '',
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        });
      });

      // Sort by scheduledDate / createdAt desc
      items.sort((a, b) => (b.scheduledDate || b.date || '').localeCompare(a.scheduledDate || a.date || ''));
      setPromises(items);
      if (items.length > 0 && !studioPromiseId) {
        setStudioPromiseId(items[0].id);
      }
    } catch (err: unknown) {
      console.warn('Failed to load promises from Firestore:', err);
      setError('Unable to fetch live promises from church collection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPromises();
  }, []);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const extractYouTubeId = (url: string) => {
    if (!url) return '';
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|live\/|shorts\/))([\w-]{11})/);
    return match ? match[1] : url.trim();
  };

  const openCreateModal = (prefillDate?: string) => {
    const defaultDate = prefillDate || getTodayDateStr();
    setEditingId(null);
    setFormError(null);
    setFormDate(defaultDate);
    setFormVerseRefEn('');
    setFormVerseEn('');
    setFormDevotionalEn('');
    setFormVerseRefTe('');
    setFormVerseTe('');
    setFormDevotionalTe('');
    setFormImageUrl('');
    setFormVideoTitle('');
    setFormDuration('');
    setFormYoutubeUrl('');
    setFormPastor('Pastor Name');
    // If today is chosen, default to Published; otherwise Scheduled
    setFormStatus(defaultDate === getTodayDateStr() ? 'Published' : 'Scheduled');
    setSelectedBook(null);
    setSelectedChapter(null);
    setSelectedVerse(null);
    setEditorOpen(true);
  };

  const openEditModal = (item: FirebasePromiseItem) => {
    setEditingId(item.id);
    setFormError(null);
    const itemDate = item.scheduledDate || item.date || getTodayDateStr();
    setFormDate(itemDate);
    setFormVerseRefEn(item.verseReferenceEn || '');
    setFormVerseEn(item.verse || '');
    setFormDevotionalEn(item.devotionalNote || '');
    setFormVerseRefTe(item.verseReferenceTe || '');
    setFormVerseTe(item.verseTelugu || '');
    setFormDevotionalTe(item.devotionalNoteTe || '');
    setFormImageUrl(item.imageUrl || '');
    setFormVideoTitle(item.videoTitle || '');
    setFormDuration(item.duration || '');
    setFormYoutubeUrl(item.youtubeId ? (item.youtubeId.startsWith('http') ? item.youtubeId : `https://youtube.com/watch?v=${item.youtubeId}`) : '');
    setFormPastor(item.pastor || '');
    
    // Normalize status into Published, Scheduled, or Draft
    const rawSt = String(item.status || 'draft').toLowerCase();
    if (rawSt === 'published') {
      setFormStatus('Published');
    } else if (rawSt === 'scheduled') {
      setFormStatus('Scheduled');
    } else {
      setFormStatus('Draft');
    }

    setSelectedBook(null);
    setSelectedChapter(null);
    setSelectedVerse(null);
    setEditorOpen(true);
  };

  // Auto-populate Bible Verse fetch handler
  const handleAutoPopulateVerse = async (bookIdx: number, chapterNum: number, verseNum: number) => {
    setIsFetchingVerse(true);
    try {
      const resp = await fetch(`/api/bible?book=${bookIdx}&chapter=${chapterNum}&verse=${verseNum}`);
      if (resp.ok) {
        const data = await resp.json();
        const engBook = ENGLISH_NAMES[bookIdx];
        const telBook = TELUGU_NAMES[bookIdx];

        setFormVerseRefEn(`${engBook} ${chapterNum}:${verseNum}`);
        setFormVerseRefTe(`${telBook} ${chapterNum}:${verseNum}`);
        if (data.engText) {
          setFormVerseEn(data.engText);
        }
        if (data.telText) {
          setFormVerseTe(data.telText);
        }
      }
    } catch (e) {
      console.warn('Verse fetch failed:', e);
    } finally {
      setIsFetchingVerse(false);
    }
  };

  // Handle local 16:9 thumbnail upload
  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notify('Please select a valid image file');
      return;
    }

    setIsUploadingImage(true);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormImageUrl(reader.result);
        setIsUploadingImage(false);
        notify('Custom thumbnail loaded (16:9 format)');
      }
    };
    reader.onerror = () => {
      setIsUploadingImage(false);
      notify('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  const handleSavePromise = async (overrideStatus?: 'Published' | 'Scheduled' | 'Draft') => {
    setFormError(null);
    const finalStatus = overrideStatus || formStatus;

    if (!formDate) {
      setFormError('Please select a promise date.');
      return;
    }
    if (!formVerseEn.trim() && !formVerseTe.trim()) {
      setFormError('Please enter the Bible verse in English or Telugu.');
      return;
    }

    setFormSubmitting(true);
    const cleanYt = extractYouTubeId(formYoutubeUrl);

    // Save with exact mobile schema compatibility
    const payload: any = {
      date: formDate,
      scheduledDate: formDate,
      verse: formVerseEn.trim(),
      verseReferenceEn: formVerseRefEn.trim(),
      verseTelugu: formVerseTe.trim(),
      verseReferenceTe: formVerseRefTe.trim(),
      devotionalNote: formDevotionalEn.trim(),
      devotionalNoteTe: formDevotionalTe.trim(),
      imageUrl: formImageUrl.trim(),
      videoTitle: formVideoTitle.trim(),
      duration: formDuration.trim(),
      youtubeId: cleanYt,
      pastor: formPastor.trim(),
      status: finalStatus,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingId) {
        // Update existing promise document
        const docRef = doc(db, 'Rhema Church', 'rhema', 'promises', editingId);
        await updateDoc(docRef, payload);
        notify(`Updated promise: ${formVerseRefEn || formDate}`);
      } else {
        // Create new promise document
        const colRef = collection(db, 'Rhema Church', 'rhema', 'promises');
        await addDoc(colRef, {
          ...payload,
          createdAt: serverTimestamp(),
        });
        notify(`Created promise: ${formVerseRefEn || formDate}`);
      }

      setEditorOpen(false);
      await loadPromises();
    } catch (err: unknown) {
      console.error('Promise save error:', err);
      setFormError('Failed to save promise to database. Check administrator permissions.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async (item: FirebasePromiseItem, newStatus: 'published' | 'draft' | 'scheduled') => {
    try {
      const docRef = doc(db, 'Rhema Church', 'rhema', 'promises', item.id);
      await updateDoc(docRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      notify(`Promise status changed to ${newStatus.toUpperCase()}`);
      await loadPromises();
    } catch (err) {
      console.error('Status update error:', err);
      notify('Failed to update promise status.');
    }
  };

  const handleDeletePromise = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      const docRef = doc(db, 'Rhema Church', 'rhema', 'promises', deleteTarget.id);
      await deleteDoc(docRef);
      notify(`Permanently deleted promise: ${deleteTarget.verseReferenceEn}`);
      setDeleteTarget(null);
      await loadPromises();
    } catch (err) {
      console.error('Delete error:', err);
      notify('Failed to delete promise document.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Canvas Studio Renderer
  useEffect(() => {
    if (activeTab !== 'thumbnail') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const p = promises.find((x) => x.id === studioPromiseId) || promises[0];
    const palette = THUMBNAIL_PALETTES[studioPaletteIdx] || THUMBNAIL_PALETTES[0];

    // Background Gradient
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, palette.bg1);
    grad.addColorStop(1, palette.bg2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Decorative Border
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 12;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    if (p) {
      // Header badge: RHEMA MINISTRIES - DAILY PROMISE
      ctx.fillStyle = palette.accent;
      ctx.font = `bold ${Math.round(24 * studioFontScale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('RHEMA CHURCH — DAILY PROMISE', canvas.width / 2, 90);

      // Date
      ctx.fillStyle = '#CBD5E1';
      ctx.font = `${Math.round(20 * studioFontScale)}px sans-serif`;
      ctx.fillText(p.scheduledDate || p.date || 'Today', canvas.width / 2, 125);

      // Verse Text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `italic ${Math.round(36 * studioFontScale)}px serif`;
      const verseText = studioLang === 'te' ? (p.verseTelugu || p.verse) : p.verse;
      const words = (verseText || 'Thy word is a lamp unto my feet, and a light unto my path.').split(' ');
      let line = '';
      let y = 240;
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > canvas.width - 160 && n > 0) {
          ctx.fillText(`“${line.trim()}”`, canvas.width / 2, y);
          line = words[n] + ' ';
          y += Math.round(50 * studioFontScale);
        } else {
          line = testLine;
        }
      }
      ctx.fillText(`“${line.trim()}”`, canvas.width / 2, y);

      // Scripture Reference
      ctx.fillStyle = palette.accent;
      ctx.font = `bold ${Math.round(32 * studioFontScale)}px sans-serif`;
      const refText = studioLang === 'te' ? (p.verseReferenceTe || p.verseReferenceEn) : p.verseReferenceEn;
      ctx.fillText(`— ${refText || 'Psalm 119:105'}`, canvas.width / 2, y + 65);
    }
  }, [studioPromiseId, studioPaletteIdx, studioLang, studioFontScale, promises, activeTab]);

  const handleDownloadThumbnail = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `rhema-daily-promise-16x9-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    notify('Downloaded 16:9 promise thumbnail graphic!');
  };

  const filteredPromises = promises.filter((p) => {
    const matchesSearch =
      (p.verseReferenceEn || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.verse || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.verseTelugu || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.pastor || '').toLowerCase().includes(searchQuery.toLowerCase());

    const pStatus = (p.status || 'draft').toLowerCase();
    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Published' && pStatus === 'published') ||
      (statusFilter === 'Scheduled' && pStatus === 'scheduled') ||
      (statusFilter === 'Draft' && pStatus === 'draft');

    return matchesSearch && matchesStatus;
  });

  const isTodayDate = formDate === getTodayDateStr();

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

          {/* HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <BookOpen size={20} />
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Daily Promise & Schedule
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Curate daily promise verses, devotional notes, bilingual scriptures & graphic thumbnails
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadPromises}
                disabled={loading}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                title="Refresh from Firestore"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>

              <button
                type="button"
                onClick={() => openCreateModal()}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
              >
                <Plus size={16} />
                <span>New Daily Promise</span>
              </button>
            </div>
          </div>

          {/* TABS */}
          <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('library')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'library'
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <BookOpen size={14} />
              <span>Promises Catalog ({promises.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('schedule')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'schedule'
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Calendar size={14} />
              <span>Schedule</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('thumbnail')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'thumbnail'
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Palette size={14} />
              <span>Artwork Thumbnail Studio</span>
            </button>
          </div>

          {/* TAB 1: LIBRARY */}
          {activeTab === 'library' && (
            <div className="space-y-4">
              {/* FILTERS */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    placeholder="Search scripture reference, promise text, or author..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Published">Published</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
              </div>

              {/* LIST OF PROMISES */}
              {loading && promises.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                  <RefreshCw size={24} className="animate-spin text-amber-500" />
                  <span>Loading live promises from Firestore...</span>
                </div>
              ) : filteredPromises.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <BookOpen size={32} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    No daily promises found
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Try adjusting your search criteria or create a new daily promise.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPromises.map((p) => {
                    const normSt = (p.status || 'draft').toLowerCase();
                    return (
                      <div
                        key={p.id}
                        className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-amber-500/40 transition-all shadow-sm"
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                normSt === 'published'
                                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                  : normSt === 'scheduled'
                                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                  : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                              }`}
                            >
                              {normSt}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                              <Calendar size={12} />
                              {p.scheduledDate || p.date || 'Unscheduled'}
                            </span>
                            {p.pastor && (
                              <span className="text-[11px] text-slate-400">
                                • {p.pastor}
                              </span>
                            )}
                            {p.youtubeId && (
                              <span className="text-[10px] text-red-500 flex items-center gap-1">
                                <Play size={10} /> Video
                              </span>
                            )}
                          </div>

                          <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {p.verseReferenceEn} {p.verseReferenceTe ? `(${p.verseReferenceTe})` : ''}
                          </h3>

                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 font-serif italic">
                            &ldquo;{p.verse}&rdquo;
                          </p>

                          {p.verseTelugu && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 font-serif">
                              {p.verseTelugu}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
                          {normSt === 'draft' && (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(p, 'published')}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                            >
                              Publish
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setPreviewItem(p)}
                            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Quick Preview"
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            className="p-2 rounded-lg text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                            title="Edit Promise"
                          >
                            <Edit3 size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteTarget(p)}
                            className="p-2 rounded-lg text-red-500 hover:text-red-400 hover:bg-red-500/10"
                            title="Delete Promise"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SCHEDULE (Promise Calendar — matching mobile AdminPromiseCalendar) */}
          {activeTab === 'schedule' && (() => {
            const now = new Date();
            const calYear = now.getFullYear();
            const calMonth = now.getMonth();
            const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
            const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
            const todayDate = now.getDate();
            const calDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
            const totalGridCells = firstDayOfWeek + daysInMonth;
            const trailingEmpty = totalGridCells % 7 === 0 ? 0 : 7 - (totalGridCells % 7);
            const weekDayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

            const getMonthName = (m: number) => new Date(2000, m).toLocaleString('en-US', { month: 'long' });

            return (
              <div className="space-y-5">
                {/* Calendar Header Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white font-serif">
                        Promise Calendar
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {getMonthName(calMonth)} {calYear} — Tap any date to edit
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={loadPromises}
                        disabled={loading}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                        title="Refresh calendar data"
                      >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                      </button>
                    </div>
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1.5">
                    {/* Week Day Headers */}
                    {weekDayLabels.map((d) => (
                      <div key={d} className="text-center py-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {d}
                        </span>
                      </div>
                    ))}

                    {/* Empty cells for start of month */}
                    {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                      <div key={`empty-${i}`} className="aspect-square" />
                    ))}

                    {/* Day Cells */}
                    {calDays.map((day) => {
                      const isToday = day === todayDate;
                      const dStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const promise = promises.find((p) => (p.scheduledDate || p.date) === dStr);
                      const normStatus = promise ? String(promise.status || '').toLowerCase() : '';

                      const isMissing = !promise;
                      const isDraft = normStatus === 'draft';
                      const isPublished = normStatus === 'published';
                      const isScheduled = normStatus === 'scheduled';

                      let cellBg = 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60';
                      let numColor = 'text-rose-800 dark:text-rose-300';
                      let statusText = 'Missing';
                      let statusColor = 'text-rose-600 dark:text-rose-400';

                      if (isPublished || isScheduled) {
                        cellBg = 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60';
                        numColor = 'text-emerald-800 dark:text-emerald-300';
                        statusText = isScheduled ? 'Sched.' : 'OK';
                        statusColor = 'text-emerald-600 dark:text-emerald-400';
                      } else if (isDraft) {
                        cellBg = 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60';
                        numColor = 'text-amber-800 dark:text-amber-300';
                        statusText = 'Draft';
                        statusColor = 'text-amber-600 dark:text-amber-400';
                      }

                      if (isToday) {
                        cellBg = 'bg-amber-100 dark:bg-amber-900/40 border-amber-400 dark:border-amber-600 border-2 shadow-md shadow-amber-500/20';
                      }

                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            if (promise) {
                              openEditModal(promise);
                            } else {
                              openCreateModal(dStr);
                            }
                          }}
                          className={`aspect-square rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all hover:scale-105 hover:shadow-sm cursor-pointer ${cellBg}`}
                          title={`${dStr} — ${statusText}`}
                        >
                          <span className={`text-sm font-bold ${isToday ? 'text-amber-900 dark:text-amber-200' : numColor}`}>
                            {day}
                          </span>
                          <span className={`text-[7px] font-bold uppercase tracking-wider ${isToday ? 'text-amber-700 dark:text-amber-300' : statusColor}`}>
                            {isToday ? 'Today' : statusText}
                          </span>
                        </button>
                      );
                    })}

                    {/* Trailing empty cells */}
                    {Array.from({ length: trailingEmpty }).map((_, i) => (
                      <div key={`trail-${i}`} className="aspect-square" />
                    ))}
                  </div>
                </div>

                {/* Legend */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border bg-emerald-50 border-emerald-200" />
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Published / Scheduled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border bg-amber-50 border-amber-200" />
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Draft</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border bg-rose-50 border-rose-200" />
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Missing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border-2 bg-amber-100 border-amber-400" />
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Today</span>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-black text-emerald-600">{promises.filter(p => String(p.status || '').toLowerCase() === 'published').length}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">Published</div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-black text-blue-600">{promises.filter(p => String(p.status || '').toLowerCase() === 'scheduled').length}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">Scheduled</div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-black text-amber-600">{promises.filter(p => String(p.status || '').toLowerCase() === 'draft').length}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">Drafts</div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-black text-rose-600">
                      {(() => {
                        const existingDates = new Set(promises.map(p => p.scheduledDate || p.date));
                        let missing = 0;
                        for (let d = 1; d <= daysInMonth; d++) {
                          const ds = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                          if (!existingDates.has(ds)) missing++;
                        }
                        return missing;
                      })()}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">Missing</div>
                  </div>
                </div>

                {/* Today's Promise Card */}
                {(() => {
                  const todayStr = getTodayDateStr();
                  const todayPromise = promises.find(p => (p.scheduledDate || p.date) === todayStr);
                  if (todayPromise) {
                    return (
                      <div className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-2xl p-5 space-y-2 shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase tracking-wider">
                            Today&apos;s Promise
                          </span>
                          <span className="text-[11px] text-slate-400">{todayStr}</span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {todayPromise.verseReferenceEn} {todayPromise.verseReferenceTe ? `(${todayPromise.verseReferenceTe})` : ''}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-serif italic line-clamp-2">
                          &ldquo;{todayPromise.verse}&rdquo;
                        </p>
                        {todayPromise.verseTelugu && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-serif line-clamp-1">
                            {todayPromise.verseTelugu}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditModal(todayPromise)}
                          className="mt-2 px-4 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                        >
                          <Edit3 size={12} />
                          <span>Edit Today&apos;s Promise</span>
                        </button>
                      </div>
                    );
                  } else {
                    return (
                      <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 rounded-2xl p-5 space-y-2 shadow-sm text-center">
                        <div className="inline-flex p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 border border-rose-200 dark:border-rose-800">
                          <AlertCircle size={20} />
                        </div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">No Promise Scheduled</div>
                        <p className="text-xs text-slate-500">
                          Today ({todayStr}) has no daily promise. Tap below to schedule one.
                        </p>
                        <button
                          type="button"
                          onClick={() => openCreateModal(todayStr)}
                          className="mt-2 px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                        >
                          <Plus size={14} />
                          <span>Schedule today&apos;s promise</span>
                        </button>
                      </div>
                    );
                  }
                })()}
              </div>
            );
          })()}

          {/* TAB 3: THUMBNAIL STUDIO */}
          {activeTab === 'thumbnail' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Controls */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500">
                  Thumbnail Controls
                </h3>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Select Promise
                  </label>
                  <select
                    value={studioPromiseId}
                    onChange={(e) => setStudioPromiseId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  >
                    {promises.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.verseReferenceEn} ({p.scheduledDate || p.date || 'No Date'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Color Palette
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {THUMBNAIL_PALETTES.map((pal, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setStudioPaletteIdx(idx)}
                        className={`p-2 rounded-xl text-left border text-xs flex items-center gap-2 ${
                          studioPaletteIdx === idx
                            ? 'border-amber-500 bg-amber-500/10 font-bold'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <span
                          className="w-4 h-4 rounded-full shrink-0"
                          style={{ backgroundColor: pal.accent }}
                        />
                        <span className="truncate">{pal.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Language
                  </label>
                  <div className="flex gap-2">
                    {(['en', 'te', 'bilingual'] as const).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setStudioLang(lang)}
                        className={`flex-1 py-1.5 rounded-xl border text-xs capitalize ${
                          studioLang === lang
                            ? 'bg-amber-500 text-slate-950 font-bold border-amber-500'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Font Scale ({studioFontScale}x)
                  </label>
                  <input
                    type="range"
                    min="0.8"
                    max="1.3"
                    step="0.05"
                    value={studioFontScale}
                    onChange={(e) => setStudioFontScale(parseFloat(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleDownloadThumbnail}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 shadow-md"
                >
                  <Download size={16} />
                  <span>Download Full-Res PNG (1200x675)</span>
                </button>
              </div>

              {/* Canvas Preview */}
              <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center space-y-3">
                <canvas
                  ref={canvasRef}
                  width={1200}
                  height={675}
                  className="w-full max-w-xl rounded-xl shadow-2xl border border-slate-800"
                />
                <span className="text-[11px] text-slate-500 font-mono">
                  16:9 Standard Social Media Thumbnail Preview
                </span>
              </div>
            </div>
          )}

          {/* CREATE / EDIT PROMISE MODAL — 100% Mobile Parity */}
          {editorOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full p-5 sm:p-8 space-y-6 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto">
                {/* Header with back icon and close */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setEditorOpen(false)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        {editingId ? 'Edit Promise' : 'Create Promise'}
                      </h2>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditorOpen(false)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
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
                    handleSavePromise();
                  }}
                  className="space-y-6"
                >
                  {/* SECTION 1: SCHEDULE */}
                  <div className="bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <Calendar size={16} />
                      </div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                        SCHEDULE
                      </h3>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        PROMISE DATE <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formDate}
                        onChange={(e) => {
                          const newD = e.target.value;
                          setFormDate(newD);
                          if (newD === getTodayDateStr()) {
                            setFormStatus('Published');
                          }
                        }}
                        required
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500/50"
                      />
                    </div>
                  </div>

                  {/* SECTION 2: ENGLISH PROMISE */}
                  <div className="bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                        <BookOpen size={16} />
                      </div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                        ENGLISH PROMISE
                      </h3>
                    </div>

                    {/* Auto-Populate Bible Verse Card */}
                    <div className="bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/40 rounded-xl p-3.5 space-y-3">
                      <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                        <Sparkles size={14} className="text-amber-500" />
                        <span>✨ Auto-Populate Bible Verse</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {/* Select Book Dropdown */}
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                            Select Book
                          </label>
                          <select
                            value={selectedBook !== null ? selectedBook : ''}
                            onChange={(e) => {
                              const val = e.target.value ? parseInt(e.target.value, 10) : null;
                              setSelectedBook(val);
                              setSelectedChapter(null);
                              setSelectedVerse(null);
                            }}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-900 dark:text-white font-medium"
                          >
                            <option value="">Select Book</option>
                            {ENGLISH_NAMES.map((name, idx) => (
                              <option key={idx} value={idx}>
                                {name} - {TELUGU_NAMES[idx]}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Select Chapter Dropdown */}
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                            Select Chapter
                          </label>
                          <select
                            disabled={selectedBook === null}
                            value={selectedChapter !== null ? selectedChapter : ''}
                            onChange={(e) => {
                              const val = e.target.value ? parseInt(e.target.value, 10) : null;
                              setSelectedChapter(val);
                              setSelectedVerse(null);
                            }}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-900 dark:text-white font-medium disabled:opacity-50"
                          >
                            <option value="">Select Chapter</option>
                            {selectedBook !== null &&
                              Array.from({ length: getChapterCount(selectedBook) }).map((_, i) => (
                                <option key={i + 1} value={i + 1}>
                                  Chapter {i + 1}
                                </option>
                              ))}
                          </select>
                        </div>

                        {/* Select Verse Dropdown */}
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                            Select Verse
                          </label>
                          <select
                            disabled={selectedBook === null || selectedChapter === null}
                            value={selectedVerse !== null ? selectedVerse : ''}
                            onChange={(e) => {
                              const val = e.target.value ? parseInt(e.target.value, 10) : null;
                              setSelectedVerse(val);
                              if (selectedBook !== null && selectedChapter !== null && val !== null) {
                                handleAutoPopulateVerse(selectedBook, selectedChapter, val);
                              }
                            }}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-900 dark:text-white font-medium disabled:opacity-50"
                          >
                            <option value="">Select Verse</option>
                            {selectedBook !== null &&
                              selectedChapter !== null &&
                              Array.from({ length: getVerseCount(selectedBook, selectedChapter) }).map((_, i) => (
                                <option key={i + 1} value={i + 1}>
                                  Verse {i + 1}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>

                      {isFetchingVerse && (
                        <div className="flex items-center gap-2 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                          <RefreshCw size={12} className="animate-spin" />
                          <span>Fetching verse scripture from Bible repository...</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          VERSE REFERENCE <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[10px] text-slate-400 font-mono">e.g. John 3:16</span>
                      </div>
                      <input
                        type="text"
                        value={formVerseRefEn}
                        onChange={(e) => setFormVerseRefEn(e.target.value)}
                        placeholder="e.g. John 3:16"
                        required
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500/50"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        VERSE TEXT — ENGLISH <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={3}
                        value={formVerseEn}
                        onChange={(e) => setFormVerseEn(e.target.value)}
                        placeholder="Type or paste the Bible verse in English…"
                        required
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500/50"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          DEVOTIONAL NOTE — ENGLISH
                        </label>
                        <span className="text-[10px] text-slate-400">Optional</span>
                      </div>
                      <textarea
                        rows={2}
                        value={formDevotionalEn}
                        onChange={(e) => setFormDevotionalEn(e.target.value)}
                        placeholder="Pastor's reflection in English…"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500/50"
                      />
                    </div>
                  </div>

                  {/* SECTION 3: TELUGU PROMISE */}
                  <div className="bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <Languages size={16} />
                      </div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                        TELUGU PROMISE - తెలుగు వాగ్దానం
                      </h3>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          VERSE REFERENCE — TELUGU
                        </label>
                        <span className="text-[10px] text-slate-400">e.g. యోహాను 3:16</span>
                      </div>
                      <input
                        type="text"
                        value={formVerseRefTe}
                        onChange={(e) => setFormVerseRefTe(e.target.value)}
                        placeholder="పుస్తకం అధ్యాయం:వచనం"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500/50"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        VERSE TEXT — TELUGU <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={3}
                        value={formVerseTe}
                        onChange={(e) => setFormVerseTe(e.target.value)}
                        placeholder="తెలుగులో బైబిల్ వచనం ఇక్కడ టైప్ చేయండి…"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500/50"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          DEVOTIONAL NOTE — TELUGU
                        </label>
                        <span className="text-[10px] text-slate-400">ఐచ్ఛికం</span>
                      </div>
                      <textarea
                        rows={2}
                        value={formDevotionalTe}
                        onChange={(e) => setFormDevotionalTe(e.target.value)}
                        placeholder="పాస్టర్ గారి వ్యాఖ్యానం తెలుగులో…"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500/50"
                      />
                    </div>
                  </div>

                  {/* SECTION 4: DAILY PROMISE THUMBNAIL */}
                  <div className="bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                          <Upload size={16} />
                        </div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                          DAILY PROMISE THUMBNAIL
                        </h3>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        16:9 Landscape
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                        CUSTOM THUMBNAIL <span className="text-slate-400 font-normal">(16:9 Landscape format)</span>
                      </label>

                      {/* Hidden File Input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailUpload}
                        className="hidden"
                      />

                      {formImageUrl ? (
                        <div className="space-y-3">
                          <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={formImageUrl}
                              alt="Promise Thumbnail"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="flex-1 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-2"
                            >
                              <Upload size={14} />
                              <span>Replace Image</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormImageUrl('')}
                              className="flex-1 py-2 px-3 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-500/10 text-xs font-semibold flex items-center justify-center gap-2"
                            >
                              <X size={14} />
                              <span>Remove Thumbnail</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingImage}
                          className="w-full py-8 border-2 border-dashed border-purple-300 dark:border-purple-800/60 hover:border-purple-500 dark:hover:border-purple-400 bg-purple-50/40 dark:bg-purple-950/10 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          {isUploadingImage ? (
                            <RefreshCw size={24} className="animate-spin text-purple-600" />
                          ) : (
                            <Upload size={24} className="text-purple-600 dark:text-purple-400" />
                          )}
                          <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                            {isUploadingImage ? 'Uploading Image...' : 'Upload Custom Thumbnail'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            JPG, PNG or WebP in 16:9 ratio
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* SECTION 5: YOUTUBE LINK */}
                  <div className="bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
                        <Play size={16} />
                      </div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                        YOUTUBE LINK
                      </h3>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        VIDEO TITLE
                      </label>
                      <input
                        type="text"
                        value={formVideoTitle}
                        onChange={(e) => setFormVideoTitle(e.target.value)}
                        placeholder="Devotional Video Title"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500/50"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          DURATION
                        </label>
                        <span className="text-[10px] text-slate-400 font-mono">e.g. 1:20</span>
                      </div>
                      <input
                        type="text"
                        value={formDuration}
                        onChange={(e) => setFormDuration(e.target.value)}
                        placeholder="Video duration"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500/50"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        YOUTUBE VIDEO URL
                      </label>
                      <input
                        type="text"
                        value={formYoutubeUrl}
                        onChange={(e) => setFormYoutubeUrl(e.target.value)}
                        placeholder="https://youtube.com/watch?v=…"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500/50"
                      />
                    </div>
                  </div>

                  {/* SECTION 6: PASTOR & STATUS */}
                  <div className="bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                        <User size={16} />
                      </div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                        PASTOR & STATUS
                      </h3>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        PASTOR NAME
                      </label>
                      <input
                        type="text"
                        value={formPastor}
                        onChange={(e) => setFormPastor(e.target.value)}
                        placeholder="Pastor Name"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500/50"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                        PUBLISH STATUS
                      </label>

                      {isTodayDate && (
                        <div className="p-2.5 mb-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
                          <Clock size={14} className="shrink-0" />
                          <span>Today&apos;s date selected — Publish Now is recommended.</span>
                        </div>
                      )}

                      <div className="space-y-2.5">
                        {/* Option 1: Publish Now */}
                        <div
                          onClick={() => setFormStatus('Published')}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            formStatus === 'Published'
                              ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/20'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-xl ${
                                formStatus === 'Published'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                              }`}
                            >
                              <Send size={16} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                  Publish Now
                                </span>
                                {formStatus === 'Published' && (
                                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500">
                                Live immediately on Member Home View
                              </p>
                            </div>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                              formStatus === 'Published'
                                ? 'border-emerald-600 bg-emerald-600 text-white'
                                : 'border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            {formStatus === 'Published' && <Check size={12} strokeWidth={3} />}
                          </div>
                        </div>

                        {/* Option 2: Scheduled */}
                        <div
                          onClick={() => {
                            if (!isTodayDate) setFormStatus('Scheduled');
                          }}
                          className={`p-3.5 rounded-xl border transition-all ${
                            isTodayDate
                              ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-800'
                              : 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-700'
                          } ${
                            formStatus === 'Scheduled'
                              ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/20'
                              : 'border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className={`p-2 rounded-xl ${
                                  formStatus === 'Scheduled'
                                    ? 'bg-amber-500 text-slate-950'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                }`}
                              >
                                <Clock size={16} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                                    Scheduled
                                  </span>
                                  {formStatus === 'Scheduled' && (
                                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500">
                                  {isTodayDate
                                    ? 'Not available for today’s date'
                                    : `Auto-publishes on ${formDate}`}
                                </p>
                              </div>
                            </div>

                            <div
                              className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                formStatus === 'Scheduled'
                                  ? 'border-amber-500 bg-amber-500 text-slate-950'
                                  : 'border-slate-300 dark:border-slate-700'
                              }`}
                            >
                              {formStatus === 'Scheduled' && <Check size={12} strokeWidth={3} />}
                            </div>
                          </div>
                        </div>

                        {/* Option 3: Save as Draft */}
                        <div
                          onClick={() => {
                            if (!isTodayDate) setFormStatus('Draft');
                          }}
                          className={`p-3.5 rounded-xl border transition-all ${
                            isTodayDate
                              ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-800'
                              : 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-700'
                          } ${
                            formStatus === 'Draft'
                              ? 'border-slate-400 bg-slate-100/70 dark:bg-slate-800/50'
                              : 'border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className={`p-2 rounded-xl ${
                                  formStatus === 'Draft'
                                    ? 'bg-slate-700 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                }`}
                              >
                                <FileText size={16} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                                    Save as Draft
                                  </span>
                                  {formStatus === 'Draft' && (
                                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500">
                                  {isTodayDate
                                    ? 'Not available for today’s date'
                                    : 'Saved privately, hidden from members'}
                                </p>
                              </div>
                            </div>

                            <div
                              className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                formStatus === 'Draft'
                                  ? 'border-slate-700 bg-slate-700 text-white'
                                  : 'border-slate-300 dark:border-slate-700'
                              }`}
                            >
                              {formStatus === 'Draft' && <Check size={12} strokeWidth={3} />}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ACTION BUTTONS (Exact mobile buttons) */}
                  <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      disabled={formSubmitting}
                      onClick={() => handleSavePromise('Published')}
                      className="w-full py-3.5 px-4 rounded-2xl bg-black dark:bg-white text-white dark:text-black hover:opacity-90 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
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
                      disabled={formSubmitting || isTodayDate}
                      onClick={() => handleSavePromise('Draft')}
                      className="w-full py-3 px-4 rounded-2xl bg-slate-800 dark:bg-slate-800 text-slate-200 hover:bg-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
                        ← Back to list
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* DELETE CONFIRMATION MODAL */}
          {deleteTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
                  <AlertTriangle size={24} />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Daily Promise?</h3>
                  <p className="text-xs text-slate-500">
                    Are you sure you want to delete <span className="font-bold text-slate-700 dark:text-slate-300">{deleteTarget.verseReferenceEn}</span>? This action removes the document from Firestore.
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleteSubmitting}
                    onClick={handleDeletePromise}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
                  >
                    {deleteSubmitting ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PREVIEW MODAL */}
          {previewItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
                >
                  <X size={18} />
                </button>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                    {previewItem.scheduledDate || 'Unscheduled'}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {previewItem.verseReferenceEn}
                  </h3>
                </div>
                {previewItem.imageUrl && (
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewItem.imageUrl}
                      alt="Thumbnail Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <p className="text-slate-800 dark:text-slate-200 font-serif italic text-sm">
                    &ldquo;{previewItem.verse}&rdquo;
                  </p>
                  {previewItem.verseTelugu && (
                    <p className="text-slate-600 dark:text-slate-400 font-serif text-sm border-t border-slate-200 dark:border-slate-800/80 pt-2">
                      {previewItem.verseTelugu}
                    </p>
                  )}
                  {previewItem.devotionalNote && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
                      <span className="font-bold block text-slate-700 dark:text-slate-300">Pastoral Devotional:</span>
                      {previewItem.devotionalNote}
                    </div>
                  )}
                  {previewItem.devotionalNoteTe && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
                      <span className="font-bold block text-slate-700 dark:text-slate-300">తెలుగు వ్యాఖ్యానం:</span>
                      {previewItem.devotionalNoteTe}
                    </div>
                  )}
                  {previewItem.pastor && (
                    <div className="pt-2 text-[11px] text-slate-400">
                      Pastor: <span className="font-medium text-slate-300">{previewItem.pastor}</span>
                    </div>
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
