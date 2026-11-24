'use client';

import React, { useState, useEffect } from 'react';
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
import { INITIAL_SERMON_CATEGORIES } from '@/lib/adminWave7aData';
import {
  Video,
  Plus,
  Search,
  Edit3,
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
} from 'lucide-react';

export interface FirebaseSermonItem {
  id: string;
  title: string;
  titleTe?: string;
  pastor: string;
  category?: string;
  date: string;
  duration?: string;
  youtubeId?: string;
  status: 'published' | 'draft';
  scripture?: string;
  description?: string;
  notesUrl?: string;
  notesFileName?: string;
  notesFileSize?: number;
  notifyMembers?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export default function AdminSermonsPage() {
  const [sermons, setSermons] = useState<FirebaseSermonItem[]>([]);
  const [categories, setCategories] = useState<string[]>(INITIAL_SERMON_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [toast, setToast] = useState<string | null>(null);

  // Create / Edit Modal State
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formTitleTe, setFormTitleTe] = useState('');
  const [formPastor, setFormPastor] = useState('');
  const [formCategory, setFormCategory] = useState(INITIAL_SERMON_CATEGORIES[0]);
  const [formDate, setFormDate] = useState('2026-11-24');
  const [formDuration, setFormDuration] = useState('45:00');
  const [formYoutubeUrl, setFormYoutubeUrl] = useState('');
  const [formStatus, setFormStatus] = useState<'published' | 'draft'>('published');
  const [formScripture, setFormScripture] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formNotesUrl, setFormNotesUrl] = useState('');

  // Preview & Delete Confirmation
  const [previewItem, setPreviewItem] = useState<FirebaseSermonItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FirebaseSermonItem | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Fetch live sermons from canonical path: Rhema Church/rhema/sermons
  const loadSermons = async () => {
    try {
      setLoading(true);
      setError(null);
      const colRef = collection(db, 'Rhema Church', 'rhema', 'sermons');
      const snap = await getDocs(colRef);

      const items: FirebaseSermonItem[] = [];
      const catSet = new Set<string>(INITIAL_SERMON_CATEGORIES);

      snap.forEach((docSnap) => {
        const d = docSnap.data();
        const cat = d.category || d.categories || 'Sunday Service';
        catSet.add(cat);

        items.push({
          id: docSnap.id,
          title: d.title || 'Untitled Sermon',
          titleTe: d.titleTe || '',
          pastor: d.pastor || d.speaker || 'Pastor',
          category: cat,
          date: d.date || d.deliveredDate || '2026-11-24',
          duration: d.duration || '40:00',
          youtubeId: d.youtubeId || '',
          status: d.status === 'draft' ? 'draft' : 'published',
          scripture: d.scripture || '',
          description: d.description || '',
          notesUrl: d.notesUrl || '',
          notesFileName: d.notesFileName || '',
          notesFileSize: d.notesFileSize,
          notifyMembers: d.notifyMembers,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        });
      });

      items.sort((a, b) => b.date.localeCompare(a.date));
      setSermons(items);
      setCategories(Array.from(catSet));
    } catch (err: unknown) {
      console.warn('Failed to fetch sermons from Firestore:', err);
      setError('Unable to load sermons from church collection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSermons();
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

  const openCreateModal = () => {
    setEditingId(null);
    setFormError(null);
    setFormTitle('');
    setFormTitleTe('');
    setFormPastor('Senior Pastor');
    setFormCategory(categories[0] || 'Sunday Service');
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormDuration('45:00');
    setFormYoutubeUrl('');
    setFormStatus('published');
    setFormScripture('');
    setFormDescription('');
    setFormNotesUrl('');
    setEditorOpen(true);
  };

  const openEditModal = (item: FirebaseSermonItem) => {
    setEditingId(item.id);
    setFormError(null);
    setFormTitle(item.title);
    setFormTitleTe(item.titleTe || '');
    setFormPastor(item.pastor);
    setFormCategory(item.category || categories[0]);
    setFormDate(item.date);
    setFormDuration(item.duration || '40:00');
    setFormYoutubeUrl(item.youtubeId ? `https://youtu.be/${item.youtubeId}` : '');
    setFormStatus(item.status);
    setFormScripture(item.scripture || '');
    setFormDescription(item.description || '');
    setFormNotesUrl(item.notesUrl || '');
    setEditorOpen(true);
  };

  const handleSaveSermon = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formTitle.trim()) {
      setFormError('Please provide sermon title.');
      return;
    }
    if (!formPastor.trim()) {
      setFormError('Please specify the preacher or speaker.');
      return;
    }

    setFormSubmitting(true);
    const cleanYt = extractYouTubeId(formYoutubeUrl);

    const payload = {
      title: formTitle.trim(),
      titleTe: formTitleTe.trim(),
      pastor: formPastor.trim(),
      speaker: formPastor.trim(),
      category: formCategory,
      date: formDate,
      duration: formDuration.trim() || '40:00',
      youtubeId: cleanYt,
      status: formStatus,
      scripture: formScripture.trim(),
      description: formDescription.trim(),
      notesUrl: formNotesUrl.trim(),
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingId) {
        // Update existing sermon
        const docRef = doc(db, 'Rhema Church', 'rhema', 'sermons', editingId);
        await updateDoc(docRef, payload);
        notify(`Updated sermon: ${formTitle}`);
      } else {
        // Add new sermon
        const colRef = collection(db, 'Rhema Church', 'rhema', 'sermons');
        await addDoc(colRef, {
          ...payload,
          createdAt: serverTimestamp(),
        });
        notify(`Added new sermon: ${formTitle}`);
      }

      setEditorOpen(false);
      await loadSermons();
    } catch (err) {
      console.error('Sermon save error:', err);
      setFormError('Failed to save sermon to database. Check administrator permissions.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async (item: FirebaseSermonItem, newStatus: 'published' | 'draft') => {
    try {
      const docRef = doc(db, 'Rhema Church', 'rhema', 'sermons', item.id);
      await updateDoc(docRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      notify(`Sermon changed to ${newStatus.toUpperCase()}`);
      await loadSermons();
    } catch (err) {
      console.error('Status update error:', err);
      notify('Failed to update sermon status.');
    }
  };

  const handleDeleteSermon = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      const docRef = doc(db, 'Rhema Church', 'rhema', 'sermons', deleteTarget.id);
      await deleteDoc(docRef);
      notify(`Deleted sermon: ${deleteTarget.title}`);
      setDeleteTarget(null);
      await loadSermons();
    } catch (err) {
      console.error('Delete error:', err);
      notify('Failed to delete sermon.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const filteredSermons = sermons.filter((s) => {
    const matchesSearch =
      searchQuery === '' ||
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.pastor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.scripture && s.scripture.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'All' || s.status.toLowerCase() === statusFilter.toLowerCase();

    const matchesCategory =
      categoryFilter === 'All' || s.category?.toLowerCase() === categoryFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
      <AdminNavigationShell>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <Video size={24} />
              </span>
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                  Admin Sermons Manager
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage preaching video archive, YouTube streaming links, transcript notes &amp; categories
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => loadSermons()}
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
                <span>Publish New Sermon</span>
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

          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl">
            <div className="relative flex-1 w-full">
              <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sermon title, preacher, scripture reference..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="All">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Drafts</option>
              </select>
            </div>
          </div>

          {/* Sermons List */}
          {loading ? (
            <div className="py-16 text-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <RefreshCw size={24} className="animate-spin text-amber-500 mx-auto" />
              <p className="text-xs text-slate-500">Loading sermons from church database...</p>
            </div>
          ) : filteredSermons.length === 0 ? (
            <div className="py-16 text-center space-y-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <Video size={32} className="text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Sermons Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No sermons match the current search or filters. Click &ldquo;Publish New Sermon&rdquo; to add one.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredSermons.map((item) => (
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
                            : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                        }`}
                      >
                        {item.status}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {item.category}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                        <Calendar size={12} /> {item.date}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                        <Clock size={12} /> {item.duration}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {item.title} {item.titleTe ? `(${item.titleTe})` : ''}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-2">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{item.pastor}</span>
                      {item.scripture && (
                        <>
                          <span>&bull;</span>
                          <span className="text-amber-600 dark:text-amber-400 font-mono text-[11px] flex items-center gap-1">
                            <BookOpen size={12} /> {item.scripture}
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    {item.youtubeId && (
                      <a
                        href={`https://youtube.com/watch?v=${item.youtubeId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-red-500"
                        title="Watch on YouTube"
                      >
                        <ExternalLink size={15} />
                      </a>
                    )}
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
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CREATE / EDIT SERMON MODAL */}
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
                    {editingId ? 'Edit Sermon Details' : 'Publish New Sermon'}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {editingId ? 'Update Preaching Video Archive' : 'Add Sermon to Church Theater'}
                  </h3>
                </div>

                {formError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleSaveSermon} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Sermon Title (English) *
                      </label>
                      <input
                        type="text"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="e.g. Walking in Resurrection Power"
                        required
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Sermon Title (Telugu)
                      </label>
                      <input
                        type="text"
                        value={formTitleTe}
                        onChange={(e) => setFormTitleTe(e.target.value)}
                        placeholder="e.g. పునరుత్థాన శక్తిలో నడచుట"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Preacher / Speaker *
                      </label>
                      <input
                        type="text"
                        value={formPastor}
                        onChange={(e) => setFormPastor(e.target.value)}
                        placeholder="e.g. Senior Pastor"
                        required
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Category
                      </label>
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                      >
                        {categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Status
                      </label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as any)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                      >
                        <option value="published">Published</option>
                        <option value="draft">Draft</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Delivered Date *
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
                        Duration (MM:SS)
                      </label>
                      <input
                        type="text"
                        value={formDuration}
                        onChange={(e) => setFormDuration(e.target.value)}
                        placeholder="e.g. 45:00"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Scripture Reference
                      </label>
                      <input
                        type="text"
                        value={formScripture}
                        onChange={(e) => setFormScripture(e.target.value)}
                        placeholder="e.g. Romans 8:28-39"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        YouTube URL or Video ID
                      </label>
                      <input
                        type="text"
                        value={formYoutubeUrl}
                        onChange={(e) => setFormYoutubeUrl(e.target.value)}
                        placeholder="https://youtu.be/6vyPmzlgPr4 or 11-char ID"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        PDF Sermon Notes URL
                      </label>
                      <input
                        type="text"
                        value={formNotesUrl}
                        onChange={(e) => setFormNotesUrl(e.target.value)}
                        placeholder="https://firebasestorage.../notes.pdf"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Sermon Outline / Description
                    </label>
                    <textarea
                      rows={3}
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Outline points and key preaching takeaways..."
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                    />
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
                      <span>{editingId ? 'Update Sermon' : 'Save & Publish Sermon'}</span>
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
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Sermon?</h3>
                  <p className="text-xs text-slate-500">
                    Are you sure you want to delete <span className="font-bold text-slate-700 dark:text-slate-300">{deleteTarget.title}</span>? This removes the message record from Firestore.
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
                    onClick={handleDeleteSermon}
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
                    {previewItem.category} &bull; {previewItem.date}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {previewItem.title}
                  </h3>
                  <p className="text-xs text-slate-500">{previewItem.pastor}</p>
                </div>

                {previewItem.youtubeId && (
                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-black shadow-md">
                    <iframe
                      src={`https://www.youtube.com/embed/${previewItem.youtubeId}`}
                      title={previewItem.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}

                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  {previewItem.scripture && (
                    <div className="font-mono text-amber-600 dark:text-amber-400">
                      Scripture: {previewItem.scripture}
                    </div>
                  )}
                  {previewItem.description && (
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {previewItem.description}
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
