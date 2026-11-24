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
} from 'lucide-react';

export interface FirebasePromiseItem {
  id: string;
  verse: string;
  verseTelugu?: string;
  verseReferenceEn: string;
  verseReferenceTe?: string;
  status: 'published' | 'draft' | 'scheduled';
  scheduledDate?: string;
  date?: string;
  devotionalNote?: string;
  devotionalNoteTe?: string;
  pastor?: string;
  youtubeId?: string;
  thumbnailStyle?: string;
  createdAt?: any;
  updatedAt?: any;
}

export default function AdminPromisesPage() {
  const [promises, setPromises] = useState<FirebasePromiseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'library' | 'calendar' | 'thumbnail'>('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [toast, setToast] = useState<string | null>(null);

  // Create/Edit Modal State
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formDate, setFormDate] = useState('2026-11-24');
  const [formVerseRefEn, setFormVerseRefEn] = useState('');
  const [formVerseRefTe, setFormVerseRefTe] = useState('');
  const [formVerseEn, setFormVerseEn] = useState('');
  const [formVerseTe, setFormVerseTe] = useState('');
  const [formDevotional, setFormDevotional] = useState('');
  const [formDevotionalTe, setFormDevotionalTe] = useState('');
  const [formPastor, setFormPastor] = useState('Senior Pastor');
  const [formYoutube, setFormYoutube] = useState('');
  const [formStatus, setFormStatus] = useState<FirebasePromiseItem['status']>('draft');
  const [formPalette, setFormPalette] = useState<number>(0);

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
        items.push({
          id: docSnap.id,
          verse: d.verse || '',
          verseTelugu: d.verseTelugu || '',
          verseReferenceEn: d.verseReferenceEn || d.reference || d.referenceEn || '',
          verseReferenceTe: d.verseReferenceTe || d.referenceTe || '',
          status: (d.status === 'published' || d.status === 'scheduled') ? d.status : 'draft',
          scheduledDate: d.scheduledDate || d.date || '',
          date: d.date || d.scheduledDate || '',
          devotionalNote: d.devotionalNote || '',
          devotionalNoteTe: d.devotionalNoteTe || '',
          pastor: d.pastor || '',
          youtubeId: d.youtubeId || '',
          thumbnailStyle: d.thumbnailStyle || '',
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        });
      });

      // Sort by scheduledDate / createdAt desc
      items.sort((a, b) => (b.scheduledDate || '').localeCompare(a.scheduledDate || ''));
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
    setEditingId(null);
    setFormError(null);
    setFormDate(prefillDate || new Date().toISOString().slice(0, 10));
    setFormVerseRefEn('');
    setFormVerseRefTe('');
    setFormVerseEn('');
    setFormVerseTe('');
    setFormDevotional('');
    setFormDevotionalTe('');
    setFormPastor('Senior Pastor');
    setFormYoutube('');
    setFormStatus('draft');
    setFormPalette(0);
    setEditorOpen(true);
  };

  const openEditModal = (item: FirebasePromiseItem) => {
    setEditingId(item.id);
    setFormError(null);
    setFormDate(item.scheduledDate || item.date || new Date().toISOString().slice(0, 10));
    setFormVerseRefEn(item.verseReferenceEn);
    setFormVerseRefTe(item.verseReferenceTe || '');
    setFormVerseEn(item.verse);
    setFormVerseTe(item.verseTelugu || '');
    setFormDevotional(item.devotionalNote || '');
    setFormDevotionalTe(item.devotionalNoteTe || '');
    setFormPastor(item.pastor || 'Senior Pastor');
    setFormYoutube(item.youtubeId || '');
    setFormStatus(item.status);
    setFormPalette(0);
    setEditorOpen(true);
  };

  const handleSavePromise = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formVerseEn.trim()) {
      setFormError('Please provide English scripture text.');
      return;
    }
    if (!formVerseRefEn.trim()) {
      setFormError('Please provide English scripture reference.');
      return;
    }

    setFormSubmitting(true);
    const cleanYt = extractYouTubeId(formYoutube);

    const payload = {
      verse: formVerseEn.trim(),
      verseTelugu: formVerseTe.trim(),
      verseReferenceEn: formVerseRefEn.trim(),
      verseReferenceTe: formVerseRefTe.trim(),
      status: formStatus,
      scheduledDate: formDate,
      date: formDate,
      devotionalNote: formDevotional.trim(),
      devotionalNoteTe: formDevotionalTe.trim(),
      pastor: formPastor.trim(),
      youtubeId: cleanYt,
      thumbnailStyle: THUMBNAIL_PALETTES[formPalette]?.name || 'Crimson Red',
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingId) {
        // Update existing promise
        const docRef = doc(db, 'Rhema Church', 'rhema', 'promises', editingId);
        await updateDoc(docRef, payload);
        notify(`Updated promise: ${formVerseRefEn}`);
      } else {
        // Create new promise
        const colRef = collection(db, 'Rhema Church', 'rhema', 'promises');
        await addDoc(colRef, {
          ...payload,
          createdAt: serverTimestamp(),
        });
        notify(`Published new promise: ${formVerseRefEn}`);
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

    // Header badge
    ctx.fillStyle = palette.accent;
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('RHEMA CHURCH • DAILY PROMISE', canvas.width / 2, 90);

    // Date
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '24px monospace';
    ctx.fillText(p?.scheduledDate || p?.date || 'Today', canvas.width / 2, 130);

    // Scripture Text
    ctx.fillStyle = '#FFFFFF';
    const textToRender = studioLang === 'te' && p?.verseTelugu ? p.verseTelugu : p?.verse || 'No verse selected';
    ctx.font = `${Math.round(36 * studioFontScale)}px serif`;

    const words = textToRender.split(' ');
    let line = '';
    let y = 260;
    const maxWidth = canvas.width - 160;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, canvas.width / 2, y);
        line = words[n] + ' ';
        y += Math.round(52 * studioFontScale);
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, canvas.width / 2, y);

    // Reference
    ctx.fillStyle = palette.accent;
    ctx.font = 'bold 38px sans-serif';
    ctx.fillText(`— ${p?.verseReferenceEn || ''}`, canvas.width / 2, canvas.height - 90);
  }, [activeTab, studioPromiseId, studioPaletteIdx, studioLang, studioFontScale, promises]);

  const handleDownloadThumbnail = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `rhema-promise-thumbnail-${studioPromiseId}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    notify('Artwork thumbnail downloaded!');
  };

  const filteredPromises = promises.filter((p) => {
    const matchesSearch =
      searchQuery === '' ||
      p.verseReferenceEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.verse.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.pastor && p.pastor.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'All' || p.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  return (
    <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
      <AdminNavigationShell>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <Sparkles size={24} />
              </span>
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                  Admin Promises Studio
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Curate daily promise verses, devotional notes, bilingual scriptures &amp; graphic thumbnails
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => loadPromises()}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => openCreateModal()}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md transition-transform active:scale-95"
              >
                <Plus size={16} />
                <span>New Daily Promise</span>
              </button>
            </div>
          </div>

          {/* Toast Notification */}
          {toast && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2 shadow-sm animate-in fade-in">
              <CheckCircle2 size={16} />
              <span>{toast}</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('library')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'library'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpen size={16} />
              <span>Promises Catalog ({promises.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('thumbnail')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'thumbnail'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Palette size={16} />
              <span>Artwork Thumbnail Studio</span>
            </button>
          </div>

          {/* TAB 1: LIBRARY */}
          {activeTab === 'library' && (
            <div className="space-y-4">
              {/* Search & Filters */}
              <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl">
                <div className="relative flex-1 w-full">
                  <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search scripture reference, promise text, or author..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
                  >
                    <option value="All">All Statuses</option>
                    <option value="published">Published</option>
                    <option value="draft">Drafts</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                </div>
              </div>

              {/* Promises Table / Cards */}
              {loading ? (
                <div className="py-16 text-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <RefreshCw size={24} className="animate-spin text-amber-500 mx-auto" />
                  <p className="text-xs text-slate-500">Loading promises from Firestore...</p>
                </div>
              ) : filteredPromises.length === 0 ? (
                <div className="py-16 text-center space-y-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <BookOpen size={32} className="text-slate-400 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Promises Found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    No promises match the current filter. Click &ldquo;New Daily Promise&rdquo; to publish one.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredPromises.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl p-4 sm:p-5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              item.status === 'published'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : item.status === 'scheduled'
                                ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20'
                                : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                            }`}
                          >
                            {item.status}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                            <Calendar size={12} /> {item.scheduledDate || item.date || 'Unscheduled'}
                          </span>
                          {item.youtubeId && (
                            <span className="text-[11px] text-amber-500 flex items-center gap-1">
                              <Video size={12} /> Video
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {item.verseReferenceEn} {item.verseReferenceTe ? `(${item.verseReferenceTe})` : ''}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 italic">
                          &ldquo;{item.verse}&rdquo;
                        </p>
                        {item.verseTelugu && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                            {item.verseTelugu}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                        {item.status !== 'published' ? (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(item, 'published')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold"
                          >
                            Publish
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(item, 'draft')}
                            className="px-3 py-1.5 rounded-lg bg-slate-500/10 hover:bg-slate-500/20 text-slate-600 dark:text-slate-400 text-xs font-semibold"
                          >
                            Unpublish
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setPreviewItem(item)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Preview"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Edit"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          className="p-1.5 rounded-lg border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50"
                          title="Delete Draft"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: THUMBNAIL STUDIO */}
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

          {/* CREATE / EDIT PROMISE MODAL */}
          {editorOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
                >
                  <X size={20} />
                </button>

                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
                    {editingId ? 'Edit Daily Promise' : 'Create Daily Promise'}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {editingId ? 'Update Scripture & Devotional' : 'Publish Daily Scripture Promise'}
                  </h3>
                </div>

                {formError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleSavePromise} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Scheduled Date *
                      </label>
                      <input
                        type="date"
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                        required
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Publication Status
                      </label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as any)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="scheduled">Scheduled</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Scripture Reference (English) *
                      </label>
                      <input
                        type="text"
                        value={formVerseRefEn}
                        onChange={(e) => setFormVerseRefEn(e.target.value)}
                        placeholder="e.g. Isaiah 41:10"
                        required
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Scripture Reference (Telugu)
                      </label>
                      <input
                        type="text"
                        value={formVerseRefTe}
                        onChange={(e) => setFormVerseRefTe(e.target.value)}
                        placeholder="e.g. యెషయా 41:10"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Scripture Text (English) *
                    </label>
                    <textarea
                      rows={2}
                      value={formVerseEn}
                      onChange={(e) => setFormVerseEn(e.target.value)}
                      placeholder="Fear not, for I am with you; be not dismayed, for I am your God..."
                      required
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Scripture Text (Telugu)
                    </label>
                    <textarea
                      rows={2}
                      value={formVerseTe}
                      onChange={(e) => setFormVerseTe(e.target.value)}
                      placeholder="నీవు భయపడకుము నేను నీకు తోడైయున్నాను..."
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Pastoral Devotional Note
                    </label>
                    <textarea
                      rows={3}
                      value={formDevotional}
                      onChange={(e) => setFormDevotional(e.target.value)}
                      placeholder="Daily encouragement thought from the pastoral team..."
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Preacher / Author
                      </label>
                      <input
                        type="text"
                        value={formPastor}
                        onChange={(e) => setFormPastor(e.target.value)}
                        placeholder="e.g. Senior Pastor John"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        YouTube Sermon / Clip Link
                      </label>
                      <input
                        type="text"
                        value={formYoutube}
                        onChange={(e) => setFormYoutube(e.target.value)}
                        placeholder="https://youtu.be/..."
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setEditorOpen(false)}
                      className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formSubmitting}
                      className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md"
                    >
                      {formSubmitting && <RefreshCw size={14} className="animate-spin" />}
                      <span>{editingId ? 'Update Promise' : 'Save & Publish Promise'}</span>
                    </button>
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
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminNavigationShell>
    </ProtectedRoute>
  );
}
