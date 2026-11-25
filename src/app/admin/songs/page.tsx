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
  serverTimestamp,
} from 'firebase/firestore';
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
  Star,
  Sliders,
  Check,
  Play,
  Mic,
  Users,
  ChevronDown,
} from 'lucide-react';

const CHROMATIC_KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

const MINOR_KEYS = [
  'Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'Abm', 'Am', 'Bbm', 'Bm'
];

const ALL_MUSICAL_KEYS = [...CHROMATIC_KEYS, ...MINOR_KEYS];

const CANONICAL_SONG_CATEGORIES = [
  'All',
  'Stuthi Songs',
  'Aradhana Songs',
  'Offering Songs',
  'Special Songs',
  'Gospel Songs',
  'Youth Songs',
  'Christmas Songs',
  'Easter Songs',
  'Marriage Songs',
  'Thanksgiving Songs',
  'Theme Songs',
  'Other',
];

const TEMPO_SUGGESTIONS = [
  { val: '72', label: 'Slow (72 BPM)' },
  { val: '96', label: 'Mid (96 BPM)' },
  { val: '124', label: 'Fast (124 BPM)' },
  { val: '138', label: 'Upbeat (138 BPM)' },
];

const PRELUDE_SUGGESTIONS = [
  'Acoustic + Drum',
  'Keys',
  'Elec',
  'Acoustic',
  'Keys + Acoustic',
  'Full Band',
  'Pads',
  'Drums Only',
  'None',
];

const INTERLUDE_SUGGESTIONS = [
  'Keys + Elec (Alt)',
  'Keys/ Elec Alt',
  'Elec + Keys (Alt)',
  '(Elec + Keys)',
  'Acoustic Solo',
  'Elec Lead',
  'Full Band Dynamics',
  'None',
];

const NOTES_SUGGESTIONS = [
  "Celebrate God's power, strength, and salvation",
  'Prep for 2nd Coming',
  'God just wants our heart',
  'You washed us clean with your Blood',
  'Call to Worship & Praise',
  'Intimate Surrender & Holy Spirit',
  'Maintain purity and be Holy',
  'Giving our best to God (Offertory)',
];

const normalizeRoot = (note: string): string => {
  const map: Record<string, string> = {
    Db: 'C#',
    'D#': 'Eb',
    Gb: 'F#',
    'G#': 'Ab',
    'A#': 'Bb',
  };
  return map[note] || note;
};

const transposeKey = (key: string, semitones: number): string => {
  if (!key || key === '—') return key;
  const isMinor = key.endsWith('m') && !key.endsWith('maj') && !key.endsWith('dim');
  const root = isMinor ? key.slice(0, -1) : key;
  const norm = normalizeRoot(root);
  const idx = CHROMATIC_KEYS.indexOf(norm);
  if (idx === -1) return key;
  const newIdx = ((idx + semitones) % 12 + 12) % 12;
  const newRoot = CHROMATIC_KEYS[newIdx];
  return isMinor ? `${newRoot}m` : newRoot;
};

const transposeSingleChord = (chord: string, semitones: number): string => {
  if (!chord) return chord;
  if (chord.includes('/')) {
    const [top, bass] = chord.split('/');
    return `${transposeSingleChord(top, semitones)}/${transposeRootOnly(bass, semitones)}`;
  }
  const match = chord.match(/^([A-G][b#]?)(.*)$/);
  if (!match) return chord;
  const [_, root, quality] = match;
  const norm = normalizeRoot(root);
  const idx = CHROMATIC_KEYS.indexOf(norm);
  if (idx === -1) return chord;
  const newIdx = ((idx + semitones) % 12 + 12) % 12;
  return `${CHROMATIC_KEYS[newIdx]}${quality}`;
};

const transposeRootOnly = (note: string, semitones: number): string => {
  const norm = normalizeRoot(note);
  const idx = CHROMATIC_KEYS.indexOf(norm);
  if (idx === -1) return note;
  const newIdx = ((idx + semitones) % 12 + 12) % 12;
  return CHROMATIC_KEYS[newIdx];
};

const transposeChordSheet = (text: string, semitones: number): string => {
  if (!text || semitones === 0) return text;
  return text.replace(/\[([A-G][b#]?[^\]]*)\]/g, (_, chord) => {
    return `[${transposeSingleChord(chord, semitones)}]`;
  });
};

interface FirebaseSongItem {
  id: string;
  title: string;
  titleTe?: string;
  titleEn?: string;
  artist?: string;
  ledBy?: string;
  key: string;
  timeSignature?: string;
  tempo?: string | number;
  category: string;
  lyrics?: string;
  lyricsEn?: string;
  lyricsTe?: string;
  lyricsHi?: string;
  verses?: string;
  prelude?: string;
  interlude?: string;
  notes?: string;
  youtubeId?: string;
  isThemeSong?: boolean;
  status: 'published' | 'draft';
  isChurchOwn?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

interface ChurchMemberItem {
  id: string;
  name: string;
  phone?: string;
}

export default function AdminSongsPage() {
  const [songs, setSongs] = useState<FirebaseSongItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs: ONLY 'all' | 'theme' matching mobile application
  const [activeTab, setActiveTab] = useState<'all' | 'theme'>('all');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [keyFilter, setKeyFilter] = useState('All');
  const [toast, setToast] = useState<string | null>(null);

  // Church Members Directory for Designated Leader Search
  const [churchMembers, setChurchMembers] = useState<ChurchMemberItem[]>([]);
  const [showMemberPickerModal, setShowMemberPickerModal] = useState(false);
  const [memberDirectorySearch, setMemberDirectorySearch] = useState('');

  // Chord & Lyrics Detail Modal with Transposition
  const [chordModalSong, setChordModalSong] = useState<FirebaseSongItem | null>(null);
  const [transposeShift, setTransposeShift] = useState(0);
  const [chordModalTab, setChordModalTab] = useState<'chords' | 'telugu' | 'english'>('chords');

  // Create / Edit Song Modal State
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields matching Mobile AdminSongEditor.tsx exactly
  const [titleEn, setTitleEn] = useState('');
  const [titleTe, setTitleTe] = useState('');
  const [youtubeId, setYoutubeId] = useState('');
  const [artist, setArtist] = useState('');
  const [postLedBy, setPostLedBy] = useState('');
  const [postLeaderSearch, setPostLeaderSearch] = useState('');

  // Card 2: Musical Arrangement
  const [songKey, setSongKey] = useState('C');
  const [timeSignature, setTimeSignature] = useState('4/4');
  const [tempo, setTempo] = useState('100');
  const [verses, setVerses] = useState('4V');
  const [prelude, setPrelude] = useState('');
  const [interlude, setInterlude] = useState('');
  const [notes, setNotes] = useState('');

  // Card 3: Categories & Lyrics
  const [categories, setCategories] = useState<string[]>(['Stuthi Songs']);
  const [lyrics, setLyrics] = useState('');
  const [lyricsTe, setLyricsTe] = useState('');
  const [lyricsHi, setLyricsHi] = useState('');
  const [status, setStatus] = useState<'published' | 'draft'>('published');
  const [editorLyricTab, setEditorLyricTab] = useState<'en' | 'te' | 'hi'>('en');

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<FirebaseSongItem | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Toast Auto-Dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load songs from church collection: Rhema Church/rhema/worshipSongs
  const loadSongs = async () => {
    try {
      setLoading(true);
      setError(null);
      const colRef = collection(db, 'Rhema Church', 'rhema', 'worshipSongs');
      const snap = await getDocs(colRef);

      const items: FirebaseSongItem[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        const rawCategory = d.category || '';
        const catArray = rawCategory
          .split(';')
          .map((c: string) => c.trim())
          .filter(Boolean);

        // Mobile Parity: A song is a theme song if isThemeSong is true OR category contains 'Theme Songs'
        const isTheme =
          Boolean(d.isThemeSong) ||
          catArray.some((c: string) => c.toLowerCase() === 'theme songs');

        items.push({
          id: docSnap.id,
          title: d.title || d.titleEn || 'Untitled Song',
          titleTe: d.titleTe || '',
          titleEn: d.titleEn || d.title || '',
          artist: d.artist || d.ledBy || '',
          ledBy: d.ledBy || d.artist || '',
          key: d.key || 'C',
          timeSignature: d.timeSignature || '4/4',
          tempo: d.tempo || '100',
          category: rawCategory || 'Stuthi Songs',
          lyrics: d.lyrics || d.lyricsEn || '',
          lyricsEn: d.lyricsEn || d.lyrics || '',
          lyricsTe: d.lyricsTe || '',
          lyricsHi: d.lyricsHi || '',
          verses: d.verses || '4V',
          prelude: d.prelude || '',
          interlude: d.interlude || '',
          notes: d.notes || '',
          youtubeId: d.youtubeId || '',
          isThemeSong: isTheme,
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

  // Load church members for leading person search
  const loadChurchMembers = async () => {
    try {
      const memSnap = await getDocs(collection(db, 'Rhema Church', 'rhema', 'members'));
      const memList: ChurchMemberItem[] = [];
      memSnap.forEach((docSnap) => {
        const d = docSnap.data();
        const name = d.name || d.fullName || `${d.firstName || ''} ${d.lastName || ''}`.trim();
        if (name) {
          memList.push({
            id: docSnap.id,
            name,
            phone: d.phone || d.phoneNumber || '',
          });
        }
      });
      setChurchMembers(memList);
    } catch (err) {
      console.warn('Error loading church members:', err);
    }
  };

  useEffect(() => {
    loadSongs();
    loadChurchMembers();
  }, []);

  // Summary Metrics for Dashboard (3 Equal Width Cards matching mobile overview)
  const stats = useMemo(() => {
    const total = songs.length;
    // Real-time count of theme songs (checking isThemeSong OR category 'Theme Songs')
    const theme = songs.filter(
      (s) =>
        s.isThemeSong ||
        (s.category &&
          s.category
            .split(';')
            .map((c) => c.trim().toLowerCase())
            .includes('theme songs'))
    ).length;
    return { total, theme, activeGenres: CANONICAL_SONG_CATEGORIES.length - 1 };
  }, [songs]);

  // Filtered Songs for Active Tab & Search
  const filteredSongs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return songs.filter((s) => {
      // Tab filter: 'all' vs 'theme'
      const isTheme =
        Boolean(s.isThemeSong) ||
        (s.category &&
          s.category
            .split(';')
            .map((c) => c.trim().toLowerCase())
            .includes('theme songs'));

      if (activeTab === 'theme' && !isTheme) return false;

      // Category filter
      if (categoryFilter !== 'All') {
        if (categoryFilter === 'Theme Songs') {
          if (!isTheme) return false;
        } else {
          const cats = s.category
            ? s.category.split(';').map((c) => c.trim().toLowerCase())
            : [];
          if (!cats.includes(categoryFilter.toLowerCase())) return false;
        }
      }

      // Musical Key filter
      if (keyFilter !== 'All') {
        if ((s.key || '').toLowerCase() !== keyFilter.toLowerCase()) return false;
      }

      // Search query filter (titles, artist, leader, lyrics)
      if (q) {
        const tEn = (s.title || s.titleEn || '').toLowerCase();
        const tTe = (s.titleTe || '').toLowerCase();
        const art = (s.artist || s.ledBy || '').toLowerCase();
        const lyr = (s.lyrics || s.lyricsEn || s.lyricsTe || '').toLowerCase();
        if (!tEn.includes(q) && !tTe.includes(q) && !art.includes(q) && !lyr.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [songs, activeTab, categoryFilter, keyFilter, searchQuery]);

  // Toggle Theme Song directly on card (Matching mobile screenshot & Firestore logic exactly)
  const handleToggleThemeSong = async (song: FirebaseSongItem) => {
    const willBeTheme = !song.isThemeSong;
    const currentCats = (song.category || 'Stuthi Songs')
      .split(';')
      .map((c) => c.trim())
      .filter(Boolean);

    let newCats: string[];
    if (willBeTheme) {
      if (!currentCats.some((c) => c.toLowerCase() === 'theme songs')) {
        newCats = [...currentCats, 'Theme Songs'];
      } else {
        newCats = currentCats;
      }
    } else {
      newCats = currentCats.filter((c) => c.toLowerCase() !== 'theme songs');
      if (newCats.length === 0) newCats = ['Stuthi Songs'];
    }
    const newCatStr = newCats.join(';');

    // Optimistic local update
    setSongs((prev) =>
      prev.map((s) =>
        s.id === song.id ? { ...s, isThemeSong: willBeTheme, category: newCatStr } : s
      )
    );
    setToast(
      willBeTheme
        ? `Marked "${song.title}" as Church Theme Song`
        : `Removed Theme status from "${song.title}"`
    );

    try {
      const docRef = doc(db, 'Rhema Church', 'rhema', 'worshipSongs', song.id);
      await updateDoc(docRef, {
        isThemeSong: willBeTheme,
        category: newCatStr,
        updatedAt: serverTimestamp(),
      });
      // Also sync to masterSongs if present
      try {
        await updateDoc(doc(db, 'masterSongs', song.id), {
          isThemeSong: willBeTheme,
          category: newCatStr,
          updatedAt: serverTimestamp(),
        });
      } catch {}
    } catch (err) {
      console.error('Failed to update theme status in Firestore:', err);
      loadSongs();
    }
  };

  // Open Create Song Modal
  const openCreateModal = () => {
    setEditingSongId(null);
    setFormError(null);
    setTitleEn('');
    setTitleTe('');
    setYoutubeId('');
    setArtist('');
    setPostLedBy('');
    setPostLeaderSearch('');
    setSongKey('C');
    setTimeSignature('4/4');
    setTempo('100');
    setVerses('4V');
    setPrelude('');
    setInterlude('');
    setNotes('');
    setCategories(['Stuthi Songs']);
    setLyrics('');
    setLyricsTe('');
    setLyricsHi('');
    setStatus('published');
    setEditorLyricTab('en');
    setEditorOpen(true);
  };

  // Open Edit Song Modal
  const openEditModal = (song: FirebaseSongItem) => {
    setEditingSongId(song.id);
    setFormError(null);
    setTitleEn(song.title || song.titleEn || '');
    setTitleTe(song.titleTe || '');
    setYoutubeId(song.youtubeId || '');
    setArtist(song.artist || '');
    setPostLedBy(song.ledBy || song.artist || '');
    setPostLeaderSearch('');
    setSongKey(song.key || 'C');
    setTimeSignature(song.timeSignature || '4/4');
    setTempo(String(song.tempo || '100'));
    setVerses(song.verses || '4V');
    setPrelude(song.prelude || '');
    setInterlude(song.interlude || '');
    setNotes(song.notes || '');

    const catArray = (song.category || '')
      .split(';')
      .map((c) => c.trim())
      .filter(Boolean);
    setCategories(catArray.length > 0 ? catArray : ['Stuthi Songs']);

    setLyrics(song.lyricsEn || song.lyrics || '');
    setLyricsTe(song.lyricsTe || '');
    setLyricsHi(song.lyricsHi || '');
    setStatus(song.status || 'published');
    setEditorLyricTab('en');
    setEditorOpen(true);
  };

  // Toggle Category Chip in Modal Form
  const toggleCategory = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  // Save Song to Firestore
  const handleSaveSong = async () => {
    if (!titleEn.trim()) {
      setFormError('Song Title (English) is required.');
      return;
    }

    if (categories.length === 0) {
      setFormError('Please select at least one song category.');
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError(null);

      const isTheme = categories.includes('Theme Songs');
      const categoryStr = categories.join(';');

      const payload = {
        title: titleEn.trim(),
        titleEn: titleEn.trim(),
        titleTe: titleTe.trim(),
        artist: artist.trim() || postLedBy.trim() || 'Worship Team',
        ledBy: postLedBy.trim() || artist.trim() || 'Worship Team',
        key: songKey,
        timeSignature: timeSignature.trim() || '4/4',
        tempo: tempo.trim() || '100',
        verses: verses.trim() || '4V',
        prelude: prelude.trim(),
        interlude: interlude.trim(),
        notes: notes.trim(),
        youtubeId: youtubeId.trim(),
        category: categoryStr,
        isThemeSong: isTheme,
        lyrics: lyrics.trim() || lyricsTe.trim() || '',
        lyricsEn: lyrics.trim(),
        lyricsTe: lyricsTe.trim(),
        lyricsHi: lyricsHi.trim(),
        status: status,
        updatedAt: serverTimestamp(),
      };

      if (editingSongId) {
        // Update existing song
        const docRef = doc(db, 'Rhema Church', 'rhema', 'worshipSongs', editingSongId);
        await updateDoc(docRef, payload);
        try {
          await updateDoc(doc(db, 'masterSongs', editingSongId), payload);
        } catch {}
        setToast(`Updated "${titleEn.trim()}" successfully.`);
      } else {
        // Create new song
        const colRef = collection(db, 'Rhema Church', 'rhema', 'worshipSongs');
        const docRef = await addDoc(colRef, {
          ...payload,
          createdAt: serverTimestamp(),
        });
        try {
          await updateDoc(doc(db, 'masterSongs', docRef.id), {
            ...payload,
            createdAt: serverTimestamp(),
          });
        } catch {}
        setToast(`Published "${titleEn.trim()}" to Church Library.`);
      }

      setEditorOpen(false);
      await loadSongs();
    } catch (err: any) {
      console.error('Error saving worship song:', err);
      setFormError(err.message || 'Failed to save worship song to Firestore.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Song from Firestore
  const handleDeleteSong = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteSubmitting(true);
      await deleteDoc(doc(db, 'Rhema Church', 'rhema', 'worshipSongs', deleteTarget.id));
      try {
        await deleteDoc(doc(db, 'masterSongs', deleteTarget.id));
      } catch {}
      setToast(`Deleted "${deleteTarget.title}" from library.`);
      setDeleteTarget(null);
      await loadSongs();
    } catch (err: any) {
      console.error('Error deleting song:', err);
      alert('Failed to delete song: ' + (err.message || 'Unknown error'));
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Open Chord Sheet & Transposition Viewer
  const openChordModal = (song: FirebaseSongItem) => {
    setChordModalSong(song);
    setTransposeShift(0);
    setChordModalTab('chords');
  };

  // Transposed Key for Chord Viewer
  const currentTransposedKey = useMemo(() => {
    if (!chordModalSong) return 'C';
    return transposeKey(chordModalSong.key || 'C', transposeShift);
  }, [chordModalSong, transposeShift]);

  // Transposed Chord Sheet Body
  const transposedBody = useMemo(() => {
    if (!chordModalSong) return '';
    const raw = chordModalSong.lyricsEn || chordModalSong.lyrics || '';
    return transposeChordSheet(raw, transposeShift);
  }, [chordModalSong, transposeShift]);

  // Extract clean YouTube embed ID
  const extractYouTubeId = (url: string) => {
    if (!url) return '';
    const clean = url.trim();
    const match = clean.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/
    );
    if (match) return match[1];
    if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
    return clean;
  };

  return (
    <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
      <AdminNavigationShell>
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto pb-24">
          {/* Toast Notification */}
          {toast && (
            <div className="fixed bottom-6 right-6 z-50 bg-slate-950 text-white border border-amber-500/40 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
              <CheckCircle2 size={18} className="text-amber-400 shrink-0" />
              <span className="text-xs font-semibold">{toast}</span>
            </div>
          )}

          {/* TOP APP HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <Music size={22} />
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Admin Worship Songbook
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Curate bilingual church song catalog, interactive chord sheets, transposition &amp; theme songs
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadSongs}
                disabled={loading}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                title="Refresh from Firestore"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>

              <button
                type="button"
                onClick={openCreateModal}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all"
              >
                <Plus size={16} />
                <span>+ Add Worship Song</span>
              </button>
            </div>
          </div>

          {/* 1. TOP SUMMARY CARDS (Equal Width, Matching Mobile Overview) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
            {/* Card 1: TOTAL SONGS */}
            <div
              onClick={() => {
                setActiveTab('all');
                setCategoryFilter('All');
              }}
              className={`p-5 rounded-3xl border transition-all cursor-pointer shadow-sm relative overflow-hidden flex flex-col justify-between h-32 ${
                activeTab === 'all'
                  ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/20 ring-2 ring-blue-500/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-400/50'
              }`}
            >
              <div className="w-8 h-1.5 rounded-full bg-blue-500" />
              <div>
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white block tracking-tight">
                  {stats.total}
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mt-1 block">
                  ALL WORSHIP SONGS
                </span>
                <span className="text-[11px] text-slate-400 font-medium">Catalog library</span>
              </div>
            </div>

            {/* Card 2: THEME SONGS */}
            <div
              onClick={() => {
                setActiveTab('theme');
                setCategoryFilter('All');
              }}
              className={`p-5 rounded-3xl border transition-all cursor-pointer shadow-sm relative overflow-hidden flex flex-col justify-between h-32 ${
                activeTab === 'theme'
                  ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/20 ring-2 ring-amber-500/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-400/50'
              }`}
            >
              <div className="w-8 h-1.5 rounded-full bg-amber-500" />
              <div>
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white block tracking-tight">
                  {stats.theme}
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mt-1 block">
                  THEME SONGS
                </span>
                <span className="text-[11px] text-slate-400 font-medium">Tap to view</span>
              </div>
            </div>

            {/* Card 3: SONG CATEGORIES */}
            <div className="p-5 rounded-3xl border border-emerald-200/80 dark:border-emerald-900/40 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden flex flex-col justify-between h-32">
              <div className="w-8 h-1.5 rounded-full bg-emerald-500" />
              <div>
                <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 block tracking-tight">
                  {stats.activeGenres}
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-950 dark:text-emerald-200 mt-1 block">
                  ACTIVE GENRES
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                  Bilingual curation
                </span>
              </div>
            </div>
          </div>

          {/* 2. MAIN SEGMENTED NAVIGATION: ONLY 'All Songs' and 'Theme Songs' MATCHING MOBILE APP */}
          <div className="flex items-center justify-between gap-4 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`flex-1 px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'all'
                  ? 'bg-black dark:bg-white text-white dark:text-black shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Music size={14} />
              <span>All Songs ({songs.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('theme')}
              className={`flex-1 px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'theme'
                  ? 'bg-[#FA6203] text-white shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Star size={14} className={activeTab === 'theme' ? 'fill-white text-white' : ''} />
              <span>Theme Songs ({stats.theme})</span>
            </button>
          </div>

          {/* 3. CATEGORIES & GENRES RIBBON */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
              <span>Categories &amp; Genres</span>
              <span>{filteredSongs.length} songs shown</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {CANONICAL_SONG_CATEGORIES.map((cat) => {
                const isSelected = categoryFilter === cat;
                const count =
                  cat === 'All'
                    ? songs.length
                    : cat === 'Theme Songs'
                    ? stats.theme
                    : songs.filter((s) => {
                        const cArr = s.category ? s.category.split(';') : [];
                        return cArr.some((c) => c.trim().toLowerCase() === cat.toLowerCase());
                      }).length;

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border flex items-center gap-2 ${
                      isSelected
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <span>{cat}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isSelected
                          ? 'bg-white/20 text-white dark:bg-slate-800 dark:text-slate-200'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. SEARCH & MUSICAL KEY FILTER */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 relative">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search songs by title (English/Telugu), worship leader, or lyrics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-sm"
              />
            </div>

            <div>
              <select
                value={keyFilter}
                onChange={(e) => setKeyFilter(e.target.value)}
                className="w-full py-3 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-sm font-semibold"
              >
                <option value="All">All Musical Keys</option>
                <optgroup label="Major Keys">
                  {CHROMATIC_KEYS.map((k) => (
                    <option key={k} value={k}>
                      Key {k}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Minor Keys">
                  {MINOR_KEYS.map((k) => (
                    <option key={k} value={k}>
                      Key {k}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          {/* 5. SONG CARDS LISTING (2/3-Column Grid Matching Mobile UI) */}
          {loading && songs.length === 0 ? (
            <div className="p-16 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
              <RefreshCw size={24} className="animate-spin text-amber-500" />
              <span>Loading worship song catalog from Firestore...</span>
            </div>
          ) : filteredSongs.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
              <Music size={32} className="mx-auto text-slate-400 mb-2" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {activeTab === 'theme' ? 'No Theme Songs Found' : 'No Worship Songs Found'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {activeTab === 'theme'
                  ? 'Click "MAKE THEME" on any song card to mark it as a Church Theme Song.'
                  : 'Try adjusting your search query, key filter, or create a new song.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredSongs.map((song, idx) => {
                const cleanYt = extractYouTubeId(song.youtubeId || '');

                return (
                  <div
                    key={song.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:border-amber-500/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                  >
                    {/* Header Row: Index Number, Key & Theme Indicator */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          {/* Song Index Number matching mobile card */}
                          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-extrabold text-xs flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm">
                            {idx + 1}
                          </div>

                          {/* Musical Key Badge */}
                          <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 text-[11px] font-black tracking-wider">
                            Key {song.key || 'C'}
                          </span>

                          {/* Time Signature */}
                          {song.timeSignature && (
                            <span className="px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 text-[10px] font-bold">
                              {song.timeSignature}
                            </span>
                          )}
                        </div>

                        {/* Theme Song Indicator */}
                        {song.isThemeSong && (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                            <Star size={10} className="fill-amber-500 text-amber-500" />
                            <span>Theme Song</span>
                          </span>
                        )}
                      </div>

                      {/* Song Titles (English & Telugu) */}
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1 leading-snug">
                          {song.title}
                        </h3>
                        {song.titleTe && (
                          <p className="text-xs text-amber-700 dark:text-amber-400 font-serif font-medium line-clamp-1 mt-0.5">
                            {song.titleTe}
                          </p>
                        )}
                      </div>

                      {/* Categories & Worship Leader */}
                      <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <p className="flex items-center gap-1.5 text-[11px]">
                          <Mic size={12} className="text-slate-400 shrink-0" />
                          <span className="text-slate-700 dark:text-slate-300 font-medium truncate">
                            Led by: {song.ledBy || song.artist || 'Worship Team'}
                          </span>
                        </p>

                        <div className="flex flex-wrap gap-1 pt-1">
                          {(song.category ? song.category.split(';') : ['Stuthi Songs']).map(
                            (c, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold"
                              >
                                {c.trim()}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions Row (Exact Mobile Parity: MAKE THEME / THEME SONG + Edit / Delete) */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      {/* Theme Song Toggle Button matching mobile screenshot exactly */}
                      <button
                        type="button"
                        onClick={() => handleToggleThemeSong(song)}
                        className={`px-3 py-1.5 rounded-full border text-xs font-black flex items-center gap-1.5 transition-all ${
                          song.isThemeSong
                            ? 'bg-amber-100 dark:bg-amber-950/40 border-amber-400 dark:border-amber-500 text-amber-800 dark:text-amber-300 shadow-sm'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-amber-400 hover:text-amber-600'
                        }`}
                      >
                        <Star
                          size={12}
                          className={song.isThemeSong ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}
                        />
                        <span>{song.isThemeSong ? 'THEME SONG' : 'MAKE THEME'}</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        {/* Chords & Transpose Preview */}
                        <button
                          type="button"
                          onClick={() => openChordModal(song)}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="View Chords, Lyrics & Transposition"
                        >
                          <Eye size={14} />
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => openEditModal(song)}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit Worship Song"
                        >
                          <Edit3 size={14} />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(song)}
                          className="p-2 rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                          title="Delete Song"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* MODAL 1: CHORDS & LYRICS VIEWER WITH TRANSPOSITION */}
          {/* ───────────────────────────────────────────────────────────── */}
          {chordModalSong && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {chordModalSong.title}
                    </h2>
                    {chordModalSong.titleTe && (
                      <p className="text-xs text-amber-700 dark:text-amber-400 font-serif">
                        {chordModalSong.titleTe}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setChordModalSong(null)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Transposition Controls Row */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Active Key (Transposed)
                    </span>
                    <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                      Key {currentTransposedKey}
                    </span>
                    {transposeShift !== 0 && (
                      <span className="ml-2 text-xs text-slate-400">
                        ({transposeShift > 0 ? `+${transposeShift}` : transposeShift} semitones)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTransposeShift((prev) => prev - 1)}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold shadow-sm"
                    >
                      -1 Semitone
                    </button>

                    <button
                      type="button"
                      onClick={() => setTransposeShift(0)}
                      disabled={transposeShift === 0}
                      className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold disabled:opacity-40"
                    >
                      Reset
                    </button>

                    <button
                      type="button"
                      onClick={() => setTransposeShift((prev) => prev + 1)}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold shadow-sm"
                    >
                      +1 Semitone
                    </button>
                  </div>
                </div>

                {/* Chord Sheet Viewer Tabs */}
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <button
                    type="button"
                    onClick={() => setChordModalTab('chords')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                      chordModalTab === 'chords'
                        ? 'bg-black dark:bg-white text-white dark:text-black'
                        : 'text-slate-500'
                    }`}
                  >
                    Chords &amp; English Lyrics
                  </button>
                  <button
                    type="button"
                    onClick={() => setChordModalTab('telugu')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                      chordModalTab === 'telugu'
                        ? 'bg-black dark:bg-white text-white dark:text-black'
                        : 'text-slate-500'
                    }`}
                  >
                    Telugu Lyrics (తెలుగు)
                  </button>
                </div>

                {/* Body Content */}
                <div className="p-4 bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl max-h-72 overflow-y-auto">
                  {chordModalTab === 'chords' ? (
                    transposedBody ? (
                      <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                        {transposedBody}
                      </pre>
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        No chord sheet attached. You can edit this song to paste chords with lyrics (e.g. [G], [Em], [C], [D]).
                      </p>
                    )
                  ) : chordModalSong.lyricsTe ? (
                    <p className="text-sm font-serif leading-loose whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                      {chordModalSong.lyricsTe}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      No Telugu lyrics available for this song.
                    </p>
                  )}
                </div>

                {/* Band Chart Info Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Prelude</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {chordModalSong.prelude || 'Acoustic'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Interlude</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {chordModalSong.interlude || 'Keys + Elec'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Worship Leader</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {chordModalSong.ledBy || chordModalSong.artist || 'Worship Team'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Verses</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {chordModalSong.verses || '4V'}
                    </span>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setChordModalSong(null)}
                    className="px-5 py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold text-xs"
                  >
                    Close Viewer
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* MODAL 2: ADD / EDIT WORSHIP SONG (EXACT MOBILE APP PARITY) */}
          {/* ───────────────────────────────────────────────────────────── */}
          {editorOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-5 sm:p-8 space-y-6 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto">
                {/* Modal Header matching mobile renderPostModal */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <button
                    type="button"
                    onClick={() => setEditorOpen(false)}
                    className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                  >
                    <X size={18} />
                  </button>

                  <div className="text-center">
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {editingSongId ? 'Edit Worship Song' : 'Publish New Song'}
                    </h2>
                    <p className="text-[11px] font-semibold text-slate-500">
                      {editingSongId
                        ? 'Update Song Details & Arrangement'
                        : 'Worship Library & Setlist Charts'}
                    </p>
                  </div>

                  <div className="w-9" />
                </div>

                {formError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-6">
                  {/* ── CARD 1: SONG IDENTITY & LEADER ── */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <Music size={16} className="text-blue-500" />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        SONG IDENTITY &amp; LEADER
                      </span>
                    </div>

                    {/* English Title */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                        SONG TITLE (ENGLISH) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={titleEn}
                        onChange={(e) => setTitleEn(e.target.value)}
                        placeholder="e.g. Amazing Grace, Way Maker..."
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-semibold"
                      />
                    </div>

                    {/* Telugu Title */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                        SONG TITLE (TELUGU)
                      </label>
                      <input
                        type="text"
                        value={titleTe}
                        onChange={(e) => setTitleTe(e.target.value)}
                        placeholder="ఉదాహరణ: అద్భుతమైన కృప..."
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-semibold font-serif"
                      />
                    </div>

                    {/* YouTube Video Link */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                        YOUTUBE VIDEO LINK
                      </label>
                      <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2">
                        <span className="text-[11px] font-extrabold text-red-600 mr-2 flex items-center gap-1">
                          ▶ YouTube
                        </span>
                        <input
                          type="text"
                          value={youtubeId}
                          onChange={(e) => setYoutubeId(e.target.value)}
                          placeholder="https://youtu.be/... or Video ID"
                          className="flex-1 bg-transparent text-xs text-slate-900 dark:text-white font-medium focus:outline-none"
                        />
                        {youtubeId.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setYoutubeId('')}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Artist / Band (Optional) */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                        ARTIST / BAND (Optional)
                      </label>
                      <input
                        type="text"
                        value={artist}
                        onChange={(e) => setArtist(e.target.value)}
                        placeholder="e.g. Hillsong, Bethel, Local Choir..."
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-semibold"
                      />
                    </div>

                    {/* Song Leading Person with Search & Autocomplete */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                          SONG LEADING PERSON
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowMemberPickerModal(true)}
                          className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 text-[10px] font-bold flex items-center gap-1 hover:bg-blue-100"
                        >
                          <Users size={11} />
                          <span>Browse Directory</span>
                        </button>
                      </div>

                      {postLedBy ? (
                        /* Selected Leader Card */
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                              {postLedBy.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block">
                                {postLedBy}
                              </span>
                              <span className="text-[10px] text-emerald-600 font-medium">
                                🎤 Designated Song Leader
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setPostLedBy('');
                              setPostLeaderSearch('');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-[11px] font-bold"
                          >
                            Change
                          </button>
                        </div>
                      ) : (
                        /* Search Leader Input */
                        <div className="relative">
                          <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5">
                            <Search size={14} className="text-blue-500 mr-2" />
                            <input
                              type="text"
                              value={postLeaderSearch}
                              onChange={(e) => setPostLeaderSearch(e.target.value)}
                              placeholder="Type member name or leader to search..."
                              className="flex-1 bg-transparent text-xs text-slate-900 dark:text-white font-medium focus:outline-none"
                            />
                            {postLeaderSearch.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setPostLeaderSearch('')}
                                className="text-slate-400 hover:text-slate-600"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>

                          {/* Autocomplete Dropdown */}
                          {postLeaderSearch.trim().length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-48 overflow-y-auto z-20 divide-y divide-slate-100 dark:divide-slate-800">
                              <button
                                type="button"
                                onClick={() => {
                                  setPostLedBy(postLeaderSearch.trim());
                                  setPostLeaderSearch('');
                                }}
                                className="w-full text-left p-2.5 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs font-bold text-blue-600 flex items-center justify-between"
                              >
                                <span>Use: &quot;{postLeaderSearch.trim()}&quot;</span>
                                <Check size={13} />
                              </button>

                              {churchMembers
                                .filter((m) =>
                                  m.name.toLowerCase().includes(postLeaderSearch.toLowerCase())
                                )
                                .slice(0, 5)
                                .map((m) => (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => {
                                      setPostLedBy(m.name);
                                      setPostLeaderSearch('');
                                    }}
                                    className="w-full text-left p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-xs flex items-center justify-between"
                                  >
                                    <div>
                                      <span className="font-semibold text-slate-900 dark:text-white block">
                                        {m.name}
                                      </span>
                                      {m.phone && (
                                        <span className="text-[10px] text-slate-400">{m.phone}</span>
                                      )}
                                    </div>
                                    <span className="text-[11px] font-bold text-blue-500">Select</span>
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── CARD 2: MUSICAL ARRANGEMENT & BAND FLOW ── */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <Sliders size={16} className="text-amber-500" />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        MUSICAL ARRANGEMENT &amp; BAND FLOW
                      </span>
                    </div>

                    {/* 4 Aligned Columns: KEY, TIME SIG, TEMPO, VERSES */}
                    <div className="grid grid-cols-4 gap-2.5">
                      {/* KEY */}
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          KEY
                        </label>
                        <select
                          value={songKey}
                          onChange={(e) => setSongKey(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2 text-xs font-extrabold text-blue-600 dark:text-blue-400 text-center"
                        >
                          <optgroup label="Major Keys">
                            {CHROMATIC_KEYS.map((k) => (
                              <option key={k} value={k}>
                                Key {k}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Minor Keys">
                            {MINOR_KEYS.map((k) => (
                              <option key={k} value={k}>
                                Key {k}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>

                      {/* TIME SIG */}
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          TIME SIG
                        </label>
                        <input
                          type="text"
                          value={timeSignature}
                          onChange={(e) => setTimeSignature(e.target.value)}
                          placeholder="4/4"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2 text-xs font-semibold text-center"
                        />
                      </div>

                      {/* TEMPO WITH BPM BADGE */}
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          TEMPO
                        </label>
                        <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2">
                          <input
                            type="text"
                            value={tempo}
                            onChange={(e) => setTempo(e.target.value)}
                            placeholder="100"
                            className="w-full bg-transparent text-xs font-bold text-center focus:outline-none"
                          />
                          <span className="text-[8px] font-black text-slate-400">BPM</span>
                        </div>
                      </div>

                      {/* VERSES */}
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          VERSES
                        </label>
                        <input
                          type="text"
                          value={verses}
                          onChange={(e) => setVerses(e.target.value)}
                          placeholder="4V"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2 text-xs font-semibold text-center"
                        />
                      </div>
                    </div>

                    {/* Quick Tempo Presets Ribbon */}
                    <div className="flex items-center gap-2 pt-1 overflow-x-auto">
                      <span className="text-[9px] font-black text-slate-400 uppercase shrink-0">
                        TEMPO:
                      </span>
                      {TEMPO_SUGGESTIONS.map((p) => {
                        const isSel = tempo === p.val;
                        return (
                          <button
                            key={p.val}
                            type="button"
                            onClick={() => setTempo(p.val)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all shrink-0 ${
                              isSel
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900'
                                : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Prelude Instruments */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        PRELUDE INSTRUMENTS
                      </label>
                      <input
                        type="text"
                        value={prelude}
                        onChange={(e) => setPrelude(e.target.value)}
                        placeholder="e.g. Acoustic + Drum"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-medium"
                      />
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {PRELUDE_SUGGESTIONS.map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => setPrelude(sug)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                              prelude === sug
                                ? 'bg-teal-600 text-white border-teal-600'
                                : 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-900'
                            }`}
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Interlude Arrangement */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        INTERLUDE ARRANGEMENT
                      </label>
                      <input
                        type="text"
                        value={interlude}
                        onChange={(e) => setInterlude(e.target.value)}
                        placeholder="e.g. Keys + Elec"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-medium"
                      />
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {INTERLUDE_SUGGESTIONS.map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => setInterlude(sug)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                              interlude === sug
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900'
                            }`}
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Worship & Thematic Notes */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                          WORSHIP &amp; THEMATIC NOTES
                        </label>
                        {notes && (
                          <button
                            type="button"
                            onClick={() => setNotes('')}
                            className="text-[10px] font-bold text-red-500 hover:text-red-600"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g. Celebrate God's power, grace and praise..."
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-medium"
                      />
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {NOTES_SUGGESTIONS.map((sug) => {
                          const isAdded = notes.includes(sug);
                          return (
                            <button
                              key={sug}
                              type="button"
                              onClick={() => {
                                if (!notes.trim()) setNotes(sug);
                                else if (!notes.includes(sug)) setNotes(`${notes} • ${sug}`);
                              }}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all ${
                                isAdded
                                  ? 'bg-amber-500 text-white border-amber-500'
                                  : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/40'
                              }`}
                            >
                              {isAdded ? '✓ ' : '+ '}
                              {sug}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* ── CARD 3: CATEGORIES, LYRICS & PUBLISH STATUS ── */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        CATEGORIES &amp; THEMES
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {categories.length} Selected
                      </span>
                    </div>

                    {/* Category Selection Chips matching mobile exactly */}
                    <div className="flex flex-wrap gap-2">
                      {CANONICAL_SONG_CATEGORIES.filter((c) => c !== 'All').map((cat) => {
                        const isSelected = categories.includes(cat);
                        const isThemeCat = cat === 'Theme Songs';

                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => toggleCategory(cat)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${
                              isSelected
                                ? isThemeCat
                                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                  : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
                                : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                            }`}
                          >
                            {isThemeCat && (
                              <Star
                                size={12}
                                className={isSelected ? 'fill-white text-white' : 'text-amber-500'}
                              />
                            )}
                            <span>{cat}</span>
                            {isSelected && !isThemeCat && <Check size={12} strokeWidth={3} />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Song Lyrics & Scripts */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                          SONG LYRICS &amp; SCRIPTS <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[10px] text-slate-400">
                          Format inline chords with brackets e.g. [G], [Em], [C], [D]
                        </span>
                      </div>

                      {/* Language Tabs */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditorLyricTab('en')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                            editorLyricTab === 'en'
                              ? 'bg-black dark:bg-white text-white dark:text-black'
                              : 'text-slate-500'
                          }`}
                        >
                          Chords &amp; English Lyrics
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditorLyricTab('te')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                            editorLyricTab === 'te'
                              ? 'bg-black dark:bg-white text-white dark:text-black'
                              : 'text-slate-500'
                          }`}
                        >
                          Telugu Lyrics (తెలుగు)
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditorLyricTab('hi')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                            editorLyricTab === 'hi'
                              ? 'bg-black dark:bg-white text-white dark:text-black'
                              : 'text-slate-500'
                          }`}
                        >
                          Hindi Lyrics
                        </button>
                      </div>

                      {editorLyricTab === 'en' && (
                        <textarea
                          rows={8}
                          value={lyrics}
                          onChange={(e) => setLyrics(e.target.value)}
                          placeholder={`Verse 1:\n[G]Amazing grace! How sweet the sound...\n\nChorus:\n[C]My chains are gone, I've been set free...`}
                          className="w-full font-mono text-xs p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 leading-relaxed"
                        />
                      )}

                      {editorLyricTab === 'te' && (
                        <textarea
                          rows={8}
                          value={lyricsTe}
                          onChange={(e) => setLyricsTe(e.target.value)}
                          placeholder="అర్హత లేకున్నా ప్రేమించావు...&#10;నా స్తుతి పాత్రుడా యేసయ్యా..."
                          className="w-full font-serif text-sm p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 leading-loose"
                        />
                      )}

                      {editorLyricTab === 'hi' && (
                        <textarea
                          rows={8}
                          value={lyricsHi}
                          onChange={(e) => setLyricsHi(e.target.value)}
                          placeholder="तू ही मेरी जिंदगी, तू ही मेरा आसरा..."
                          className="w-full text-sm p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 leading-loose"
                        />
                      )}
                    </div>

                    {/* Publish Status Toggle */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          Publish Status
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {status === 'published'
                            ? 'Visible in church library'
                            : 'Saved as private draft'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setStatus('published')}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                            status === 'published'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow'
                              : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          Published
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatus('draft')}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                            status === 'draft'
                              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow'
                              : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          Draft
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Save Action Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={formSubmitting}
                      onClick={handleSaveSong}
                      className="w-full py-3.5 rounded-full bg-black dark:bg-white text-white dark:text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl hover:opacity-95 transition-all disabled:opacity-50"
                    >
                      {formSubmitting ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <>
                          <Music size={16} />
                          <span>
                            {editingSongId
                              ? 'Save Changes to Worship Song'
                              : 'Publish Song to Church Library'}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* MODAL 3: BROWSE DIRECTORY MEMBER PICKER MODAL */}
          {/* ───────────────────────────────────────────────────────────── */}
          {showMemberPickerModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Users size={18} className="text-blue-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Church Members Directory
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMemberPickerModal(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={memberDirectorySearch}
                    onChange={(e) => setMemberDirectorySearch(e.target.value)}
                    placeholder="Search by member name or phone..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
                  />
                </div>

                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl">
                  {churchMembers
                    .filter((m) =>
                      m.name.toLowerCase().includes(memberDirectorySearch.toLowerCase())
                    )
                    .map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setPostLedBy(m.name);
                          setShowMemberPickerModal(false);
                        }}
                        className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-xs flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center">
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {m.name}
                            </span>
                            {m.phone && (
                              <span className="text-[10px] text-slate-400">{m.phone}</span>
                            )}
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-blue-600">Select</span>
                      </button>
                    ))}
                  {churchMembers.length === 0 && (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No members found in directory.
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowMemberPickerModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* MODAL 4: DELETE CONFIRMATION */}
          {/* ───────────────────────────────────────────────────────────── */}
          {deleteTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center gap-3 text-red-600">
                  <div className="p-2 rounded-xl bg-red-100 dark:bg-red-950/50">
                    <Trash2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Delete Worship Song?
                    </h3>
                    <p className="text-[11px] text-slate-500">Permanent removal from library</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Are you sure you want to delete{' '}
                  <span className="font-bold text-slate-900 dark:text-white">
                    &quot;{deleteTarget.title}&quot;
                  </span>
                  ? This action will remove the song from the church catalog and cannot be undone.
                </p>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleteSubmitting}
                    onClick={handleDeleteSong}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {deleteSubmitting ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                    <span>Delete Permanently</span>
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
