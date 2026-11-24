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
import { CHROMATIC_KEYS, transposeKey } from '@/lib/adminWave7aData';
import {
  Music,
  Plus,
  Search,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  Eye,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  BookOpen,
} from 'lucide-react';

export interface FirebaseSongItem {
  id: string;
  title: string;
  titleTe?: string;
  titleHindi?: string;
  artist?: string;
  ledBy?: string;
  key: string;
  timeSignature?: string;
  tempo?: number;
  category: string;
  chords?: string;
  verses?: string[] | string;
  prelude?: string;
  interlude?: string;
  lyricsEn?: string;
  lyricsTe?: string;
  lyricsHi?: string;
  youtubeId?: string;
  status: 'published' | 'draft';
  isChurchOwn?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export default function AdminSongsPage() {
  const [songs, setSongs] = useState<FirebaseSongItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [keyFilter, setKeyFilter] = useState<string>('All');
  const [toast, setToast] = useState<string | null>(null);

  // Preview State
  const [previewSong, setPreviewSong] = useState<FirebaseSongItem | null>(null);
  const [previewLang, setPreviewLang] = useState<'en' | 'te' | 'hi'>('en');
  const [transposeShift, setTransposeShift] = useState(0);

  // Editor Modal State
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formTitleTe, setFormTitleTe] = useState('');
  const [formTitleHi, setFormTitleHi] = useState('');
  const [formArtist, setFormArtist] = useState('');
  const [formCategory, setFormCategory] = useState('Worship');
  const [formKey, setFormKey] = useState('G');
  const [formTimeSig, setFormTimeSig] = useState('4/4');
  const [formTempo, setFormTempo] = useState<number>(72);
  const [formStatus, setFormStatus] = useState<'published' | 'draft'>('published');
  const [formYoutubeUrl, setFormYoutubeUrl] = useState('');
  const [formChords, setFormChords] = useState('');
  const [formLyricsEn, setFormLyricsEn] = useState('');
  const [formLyricsTe, setFormLyricsTe] = useState('');
  const [formLyricsHi, setFormLyricsHi] = useState('');
  const [editorLyricTab, setEditorLyricTab] = useState<'en' | 'te' | 'hi'>('en');

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<FirebaseSongItem | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Fetch live worship songs from canonical path: Rhema Church/rhema/worshipSongs
  const loadSongs = async () => {
    try {
      setLoading(true);
      setError(null);
      const colRef = collection(db, 'Rhema Church', 'rhema', 'worshipSongs');
      const snap = await getDocs(colRef);

      const items: FirebaseSongItem[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        items.push({
          id: docSnap.id,
          title: d.title || 'Untitled Song',
          titleTe: d.titleTe || '',
          titleHindi: d.titleHindi || '',
          artist: d.artist || d.ledBy || 'Worship Team',
          ledBy: d.ledBy || d.artist || '',
          key: d.key || 'G',
          timeSignature: d.timeSignature || '4/4',
          tempo: d.tempo || 72,
          category: d.category || 'Worship',
          chords: d.chords || '',
          verses: d.verses || '',
          lyricsEn: d.lyricsEn || (typeof d.verses === 'string' ? d.verses : ''),
          lyricsTe: d.lyricsTe || '',
          lyricsHi: d.lyricsHi || '',
          youtubeId: d.youtubeId || '',
          status: d.status === 'draft' ? 'draft' : 'published',
          isChurchOwn: Boolean(d.isChurchOwn),
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        });
      });

      items.sort((a, b) => a.title.localeCompare(b.title));
      setSongs(items);
    } catch (err: unknown) {
      console.warn('Failed to load songs from Firestore:', err);
      setError('Unable to fetch worship songs from church collection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSongs();
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
    setEditingSongId(null);
    setFormError(null);
    setFormTitle('');
    setFormTitleTe('');
    setFormTitleHi('');
    setFormArtist('Worship Team');
    setFormCategory('Worship');
    setFormKey('G');
    setFormTimeSig('4/4');
    setFormTempo(72);
    setFormStatus('published');
    setFormYoutubeUrl('');
    setFormChords('');
    setFormLyricsEn('');
    setFormLyricsTe('');
    setFormLyricsHi('');
    setEditorLyricTab('en');
    setEditorOpen(true);
  };

  const openEditModal = (song: FirebaseSongItem) => {
    setEditingSongId(song.id);
    setFormError(null);
    setFormTitle(song.title);
    setFormTitleTe(song.titleTe || '');
    setFormTitleHi(song.titleHindi || '');
    setFormArtist(song.artist || song.ledBy || '');
    setFormCategory(song.category || 'Worship');
    setFormKey(song.key || 'G');
    setFormTimeSig(song.timeSignature || '4/4');
    setFormTempo(song.tempo || 72);
    setFormStatus(song.status);
    setFormYoutubeUrl(song.youtubeId ? `https://youtu.be/${song.youtubeId}` : '');
    setFormChords(song.chords || '');
    setFormLyricsEn(song.lyricsEn || '');
    setFormLyricsTe(song.lyricsTe || '');
    setFormLyricsHi(song.lyricsHi || '');
    setEditorLyricTab('en');
    setEditorOpen(true);
  };

  const handleSaveSong = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formTitle.trim()) {
      setFormError('Please enter a song title.');
      return;
    }

    setFormSubmitting(true);
    const cleanYt = extractYouTubeId(formYoutubeUrl);

    const payload = {
      title: formTitle.trim(),
      titleTe: formTitleTe.trim(),
      titleHindi: formTitleHi.trim(),
      artist: formArtist.trim(),
      ledBy: formArtist.trim(),
      key: formKey,
      timeSignature: formTimeSig,
      tempo: Number(formTempo) || 72,
      category: formCategory,
      chords: formChords.trim(),
      lyricsEn: formLyricsEn.trim(),
      lyricsTe: formLyricsTe.trim(),
      lyricsHi: formLyricsHi.trim(),
      youtubeId: cleanYt,
      status: formStatus,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingSongId) {
        // Update existing song
        const docRef = doc(db, 'Rhema Church', 'rhema', 'worshipSongs', editingSongId);
        await updateDoc(docRef, payload);
        notify(`Updated song: ${formTitle}`);
      } else {
        // Add new song
        const colRef = collection(db, 'Rhema Church', 'rhema', 'worshipSongs');
        await addDoc(colRef, {
          ...payload,
          createdAt: serverTimestamp(),
        });
        notify(`Added new song: ${formTitle}`);
      }

      setEditorOpen(false);
      await loadSongs();
    } catch (err) {
      console.error('Song save error:', err);
      setFormError('Failed to save song to database. Check administrator permissions.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async (item: FirebaseSongItem, newStatus: 'published' | 'draft') => {
    try {
      const docRef = doc(db, 'Rhema Church', 'rhema', 'worshipSongs', item.id);
      await updateDoc(docRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      notify(`Song status changed to ${newStatus.toUpperCase()}`);
      await loadSongs();
    } catch (err) {
      console.error('Song status update error:', err);
      notify('Failed to update song status.');
    }
  };

  const handleDeleteSong = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      const docRef = doc(db, 'Rhema Church', 'rhema', 'worshipSongs', deleteTarget.id);
      await deleteDoc(docRef);
      notify(`Deleted song: ${deleteTarget.title}`);
      setDeleteTarget(null);
      await loadSongs();
    } catch (err) {
      console.error('Delete error:', err);
      notify('Failed to delete song.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const filteredSongs = songs.filter((s) => {
    const matchesSearch =
      searchQuery === '' ||
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.titleTe && s.titleTe.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.artist && s.artist.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = categoryFilter === 'All' || s.category === categoryFilter;
    const matchesKey = keyFilter === 'All' || s.key === keyFilter;

    return matchesSearch && matchesCategory && matchesKey;
  });

  return (
    <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
      <AdminNavigationShell>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <Music size={24} />
              </span>
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                  Admin Worship Songbook
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Curate bilingual church song catalog, interactive chord sheets, transposition &amp; service setlists
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => loadSongs()}
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
                <span>Add Worship Song</span>
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

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl">
            <div className="relative flex-1 w-full">
              <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search song title (English / Telugu), worship leader..."
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
                <option value="Worship">Worship</option>
                <option value="Praise">Praise</option>
                <option value="Revival">Revival</option>
                <option value="Communion">Communion</option>
              </select>

              <select
                value={keyFilter}
                onChange={(e) => setKeyFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none font-mono"
              >
                <option value="All">All Keys</option>
                {CHROMATIC_KEYS.map((k) => (
                  <option key={k} value={k}>
                    Key {k}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Songs List */}
          {loading ? (
            <div className="py-16 text-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <RefreshCw size={24} className="animate-spin text-amber-500 mx-auto" />
              <p className="text-xs text-slate-500">Loading worship songbook from Firestore...</p>
            </div>
          ) : filteredSongs.length === 0 ? (
            <div className="py-16 text-center space-y-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <Music size={32} className="text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Songs Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No songs match your criteria. Click &ldquo;Add Worship Song&rdquo; to publish one.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredSongs.map((song) => (
                <div
                  key={song.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl p-4 sm:p-5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          song.status === 'published'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                        }`}
                      >
                        {song.status}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono">
                        Key {song.key}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {song.category}
                      </span>
                      {song.timeSignature && (
                        <span className="text-[11px] font-mono text-slate-500">{song.timeSignature}</span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {song.title} {song.titleTe ? `(${song.titleTe})` : ''}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Led by <span className="font-semibold text-slate-700 dark:text-slate-300">{song.artist || 'Worship Team'}</span>
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    {song.youtubeId && (
                      <a
                        href={`https://youtube.com/watch?v=${song.youtubeId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-red-500"
                        title="Watch Recording"
                      >
                        <ExternalLink size={15} />
                      </a>
                    )}
                    {song.status !== 'published' ? (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(song, 'published')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold"
                      >
                        Publish
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(song, 'draft')}
                        className="px-3 py-1.5 rounded-lg bg-slate-500/10 hover:bg-slate-500/20 text-slate-600 dark:text-slate-400 text-xs font-semibold"
                      >
                        Unpublish
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setPreviewSong(song);
                        setTransposeShift(0);
                      }}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Preview Chords & Lyrics"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(song)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Edit Song"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(song)}
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

          {/* CREATE / EDIT SONG MODAL */}
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
                    {editingSongId ? 'Edit Worship Song' : 'Add New Worship Song'}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {editingSongId ? 'Update Musical Chords & Multilingual Lyrics' : 'Publish Song to Church Songbook'}
                  </h3>
                </div>

                {formError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleSaveSong} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Title (English) *
                      </label>
                      <input
                        type="text"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="e.g. Way Maker"
                        required
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Title (Telugu)
                      </label>
                      <input
                        type="text"
                        value={formTitleTe}
                        onChange={(e) => setFormTitleTe(e.target.value)}
                        placeholder="e.g. దారి చేయువాడా"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Title (Hindi)
                      </label>
                      <input
                        type="text"
                        value={formTitleHi}
                        onChange={(e) => setFormTitleHi(e.target.value)}
                        placeholder="e.g. मार्ग बनाने वाले"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Musical Key *
                      </label>
                      <select
                        value={formKey}
                        onChange={(e) => setFormKey(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono"
                      >
                        {CHROMATIC_KEYS.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Time Signature
                      </label>
                      <input
                        type="text"
                        value={formTimeSig}
                        onChange={(e) => setFormTimeSig(e.target.value)}
                        placeholder="4/4, 3/4, 6/8"
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
                        <option value="Worship">Worship</option>
                        <option value="Praise">Praise</option>
                        <option value="Revival">Revival</option>
                        <option value="Communion">Communion</option>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Worship Leader / Artist
                      </label>
                      <input
                        type="text"
                        value={formArtist}
                        onChange={(e) => setFormArtist(e.target.value)}
                        placeholder="e.g. Worship Team"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        YouTube Reference Video Link
                      </label>
                      <input
                        type="text"
                        value={formYoutubeUrl}
                        onChange={(e) => setFormYoutubeUrl(e.target.value)}
                        placeholder="https://youtu.be/..."
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Chord Sheet Progression (ChordPro / Monospace Format)
                    </label>
                    <textarea
                      rows={4}
                      value={formChords}
                      onChange={(e) => setFormChords(e.target.value)}
                      placeholder="[G] You are here, moving in our [D] midst..."
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  {/* Multilingual Lyrics Tabs */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Lyrics Languages:
                      </span>
                      {(['en', 'te', 'hi'] as const).map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => setEditorLyricTab(lang)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase ${
                            editorLyricTab === lang
                              ? 'bg-amber-500 text-slate-950'
                              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {lang === 'en' ? 'English' : lang === 'te' ? 'Telugu' : 'Hindi'}
                        </button>
                      ))}
                    </div>

                    {editorLyricTab === 'en' && (
                      <textarea
                        rows={4}
                        value={formLyricsEn}
                        onChange={(e) => setFormLyricsEn(e.target.value)}
                        placeholder="English lyrics and verse breakdown..."
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono"
                      />
                    )}
                    {editorLyricTab === 'te' && (
                      <textarea
                        rows={4}
                        value={formLyricsTe}
                        onChange={(e) => setFormLyricsTe(e.target.value)}
                        placeholder="తెలుగు సాహిత్యం..."
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono"
                      />
                    )}
                    {editorLyricTab === 'hi' && (
                      <textarea
                        rows={4}
                        value={formLyricsHi}
                        onChange={(e) => setFormLyricsHi(e.target.value)}
                        placeholder="हिंदी गीत के बोल..."
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono"
                      />
                    )}
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
                      <span>{editingSongId ? 'Update Song' : 'Save & Publish Song'}</span>
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
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Worship Song?</h3>
                  <p className="text-xs text-slate-500">
                    Are you sure you want to delete <span className="font-bold text-slate-700 dark:text-slate-300">{deleteTarget.title}</span>? This permanently deletes the lyrics and chord progression from Firestore.
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
                    onClick={handleDeleteSong}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
                  >
                    {deleteSubmitting ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PREVIEW SONG MODAL */}
          {previewSong && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setPreviewSong(null)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
                >
                  <X size={18} />
                </button>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                      {previewSong.category} &bull; {previewSong.artist}
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {previewSong.title} {previewSong.titleTe ? `(${previewSong.titleTe})` : ''}
                    </h3>
                  </div>

                  {/* Transpose Controls */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg">
                      Key {transposeKey(previewSong.key, transposeShift)}
                    </span>
                    <button
                      onClick={() => setTransposeShift((s) => s - 1)}
                      className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-mono"
                    >
                      -1
                    </button>
                    <button
                      onClick={() => setTransposeShift(0)}
                      className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs"
                    >
                      Orig
                    </button>
                    <button
                      onClick={() => setTransposeShift((s) => s + 1)}
                      className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-mono"
                    >
                      +1
                    </button>
                  </div>
                </div>

                {/* Lyrics / Chords Display */}
                <div className="space-y-4 text-xs font-mono bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 whitespace-pre-wrap leading-relaxed">
                  {previewSong.chords ? (
                    <div>
                      <span className="font-sans font-bold text-slate-500 uppercase tracking-wider text-[10px] block mb-2">
                        Chord Progression:
                      </span>
                      {previewSong.chords}
                    </div>
                  ) : null}

                  {previewSong.lyricsEn && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span className="font-sans font-bold text-slate-500 uppercase tracking-wider text-[10px] block mb-2">
                        English Lyrics:
                      </span>
                      {previewSong.lyricsEn}
                    </div>
                  )}

                  {previewSong.lyricsTe && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 font-sans">
                      <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block mb-2">
                        తెలుగు సాహిత్యం:
                      </span>
                      {previewSong.lyricsTe}
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
