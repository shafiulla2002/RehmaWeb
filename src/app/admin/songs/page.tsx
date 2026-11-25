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
  getDoc,
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
  Layers,
  Calendar,
  Clock,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  List,
  Sparkles,
  Sliders,
  Check,
  Play,
  Mic,
  FolderPlus,
  Radio,
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
  'Acoustic Solo',
  'Elec Lead',
  'Full Band Dynamics',
  'None',
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

interface SetlistSongItem {
  id: string;
  title: string;
  titleTe?: string;
  key: string;
  tempo?: string | number;
  timeSignature?: string;
  ledBy?: string;
  prelude?: string;
  interlude?: string;
  notes?: string;
  verses?: string;
}

interface WorshipService {
  id: string;
  name: string;
  date?: string;
  time?: string;
  songs: SetlistSongItem[];
}

export default function AdminSongsPage() {
  const [songs, setSongs] = useState<FirebaseSongItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs: 'all' | 'theme' | 'setlists'
  const [activeTab, setActiveTab] = useState<'all' | 'theme' | 'setlists'>('all');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [keyFilter, setKeyFilter] = useState<string>('All');
  const [toast, setToast] = useState<string | null>(null);

  // Setlists State
  const [services, setServices] = useState<WorshipService[]>([]);
  const [activeServiceId, setActiveServiceId] = useState<string>('service_1');
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceTime, setNewServiceTime] = useState('08:30 AM');
  const [newServiceDate, setNewServiceDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Add Song to Setlist Picker Modal
  const [showAddSongToSetlistModal, setShowAddSongToSetlistModal] = useState(false);
  const [setlistSearchQuery, setSetlistSearchQuery] = useState('');

  // Edit Setlist Song Item Modal
  const [editingSetlistSong, setEditingSetlistSong] = useState<{ index: number; song: SetlistSongItem } | null>(null);

  // Chord & Lyrics Detail Modal with Transposition
  const [chordModalSong, setChordModalSong] = useState<FirebaseSongItem | null>(null);
  const [transposeShift, setTransposeShift] = useState(0);
  const [chordModalTab, setChordModalTab] = useState<'chords' | 'telugu' | 'english'>('chords');

  // Create / Edit Song Modal State
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formTitleTe, setFormTitleTe] = useState('');
  const [formArtist, setFormArtist] = useState('Worship Team');
  const [formLedBy, setFormLedBy] = useState('');
  const [formCategories, setFormCategories] = useState<string[]>(['Stuthi Songs']);
  const [formKey, setFormKey] = useState('G');
  const [formTimeSig, setFormTimeSig] = useState('4/4');
  const [formTempo, setFormTempo] = useState<string>('72');
  const [formVerses, setFormVerses] = useState('4V');
  const [formPrelude, setFormPrelude] = useState('Acoustic + Drum');
  const [formInterlude, setFormInterlude] = useState('Keys + Elec (Alt)');
  const [formNotes, setFormNotes] = useState('');
  const [formYoutubeUrl, setFormYoutubeUrl] = useState('');
  const [formLyricsEn, setFormLyricsEn] = useState('');
  const [formLyricsTe, setFormLyricsTe] = useState('');
  const [formLyricsHi, setFormLyricsHi] = useState('');
  const [formIsThemeSong, setFormIsThemeSong] = useState(false);
  const [editorLyricTab, setEditorLyricTab] = useState<'en' | 'te' | 'hi'>('en');

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<FirebaseSongItem | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const extractYouTubeId = (url: string) => {
    if (!url) return '';
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|live\/|shorts\/))([\w-]{11})/);
    return match ? match[1] : url.trim();
  };

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
        items.push({
          id: docSnap.id,
          title: d.title || d.titleEn || 'Untitled Song',
          titleTe: d.titleTe || '',
          titleEn: d.titleEn || d.title || '',
          artist: d.artist || d.ledBy || 'Worship Team',
          ledBy: d.ledBy || d.artist || 'Worship Team',
          key: d.key || 'G',
          timeSignature: d.timeSignature || '4/4',
          tempo: d.tempo || '72',
          category: d.category || 'Stuthi Songs',
          lyrics: d.lyrics || d.lyricsEn || '',
          lyricsEn: d.lyricsEn || d.lyrics || (typeof d.verses === 'string' ? d.verses : ''),
          lyricsTe: d.lyricsTe || '',
          lyricsHi: d.lyricsHi || '',
          verses: d.verses || '4V',
          prelude: d.prelude || '',
          interlude: d.interlude || '',
          notes: d.notes || '',
          youtubeId: d.youtubeId || '',
          isThemeSong: Boolean(d.isThemeSong),
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

  // Load Setlists from Firestore: Rhema Church/rhema/setlists/all_services
  const loadSetlists = async () => {
    try {
      const docRef = doc(db, 'Rhema Church', 'rhema', 'setlists', 'all_services');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data()?.services) {
        const raw = docSnap.data().services;
        if (Array.isArray(raw) && raw.length > 0) {
          setServices(raw);
          setActiveServiceId(raw[0].id);
          return;
        }
      }

      // Initialize default services if none exist
      const defaultServices: WorshipService[] = [
        {
          id: 'service_1',
          name: 'Sunday 1st Service (8:30 AM)',
          date: new Date().toISOString().slice(0, 10),
          time: '08:30 AM',
          songs: [],
        },
        {
          id: 'service_2',
          name: 'Sunday 2nd Service (10:30 AM)',
          date: new Date().toISOString().slice(0, 10),
          time: '10:30 AM',
          songs: [],
        },
        {
          id: 'service_3',
          name: 'Midweek Fellowship Service',
          date: new Date().toISOString().slice(0, 10),
          time: '07:00 PM',
          songs: [],
        },
      ];
      setServices(defaultServices);
      setActiveServiceId('service_1');
    } catch (e) {
      console.warn('Error loading setlists:', e);
    }
  };

  // Save Services to Firestore
  const saveServicesToFirestore = async (newServices: WorshipService[]) => {
    setServices(newServices);
    try {
      const docRef = doc(db, 'Rhema Church', 'rhema', 'setlists', 'all_services');
      await setDoc(docRef, {
        services: newServices,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Sync legacy 1S and 2S setlists
      const s1 = newServices.find((s) => s.id === 'service_1' || s.name.includes('1st'));
      if (s1) {
        await setDoc(doc(db, 'Rhema Church', 'rhema', 'setlists', '1S'), {
          service: '1S',
          items: s1.songs,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
    } catch (e) {
      console.warn('Error saving setlists to Firestore:', e);
    }
  };

  useEffect(() => {
    loadSongs();
    loadSetlists();
  }, []);

  // Summary Metrics for Dashboard
  const stats = useMemo(() => {
    const total = songs.length;
    const theme = songs.filter((s) => s.isThemeSong).length;
    const published = songs.filter((s) => s.status === 'published').length;
    const setlistCount = services.length;
    return { total, theme, published, setlistCount };
  }, [songs, services]);

  // Active Service Object
  const currentService = useMemo(() => {
    return services.find((s) => s.id === activeServiceId) || services[0];
  }, [services, activeServiceId]);

  // Filtered Songs
  const filteredSongs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return songs.filter((s) => {
      // Tab filter
      if (activeTab === 'theme' && !s.isThemeSong) return false;

      // Category filter
      if (categoryFilter !== 'All') {
        if (categoryFilter === 'Theme Songs') {
          if (!s.isThemeSong) return false;
        } else {
          const cats = s.category ? s.category.split(';').map((c) => c.trim().toLowerCase()) : [];
          if (!cats.includes(categoryFilter.toLowerCase())) return false;
        }
      }

      // Key filter
      if (keyFilter !== 'All') {
        if ((s.key || '').toLowerCase() !== keyFilter.toLowerCase()) return false;
      }

      // Search query
      if (q) {
        const tEn = (s.title || s.titleEn || '').toLowerCase();
        const tTe = (s.titleTe || '').toLowerCase();
        const artist = (s.artist || s.ledBy || '').toLowerCase();
        const lyrics = (s.lyrics || s.lyricsEn || s.lyricsTe || '').toLowerCase();
        if (!tEn.includes(q) && !tTe.includes(q) && !artist.includes(q) && !lyrics.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [songs, activeTab, categoryFilter, keyFilter, searchQuery]);

  // Toggle Theme Song directly on card (Matching mobile screenshot ☆ MAKE THEME)
  const handleToggleThemeSong = async (song: FirebaseSongItem) => {
    const newStatus = !song.isThemeSong;
    try {
      const docRef = doc(db, 'Rhema Church', 'rhema', 'worshipSongs', song.id);
      await updateDoc(docRef, {
        isThemeSong: newStatus,
        updatedAt: serverTimestamp(),
      });

      setSongs((prev) =>
        prev.map((s) => (s.id === song.id ? { ...s, isThemeSong: newStatus } : s))
      );
      notify(
        newStatus
          ? `⭐ Marked "${song.title}" as Church Theme Song`
          : `Removed "${song.title}" from Theme Songs`
      );
    } catch (err) {
      console.error('Error updating theme song status:', err);
      notify('Failed to update theme song status');
    }
  };

  // Open Create Song Modal
  const openCreateModal = () => {
    setEditingSongId(null);
    setFormError(null);
    setFormTitle('');
    setFormTitleTe('');
    setFormArtist('Worship Team');
    setFormLedBy('Worship Team');
    setFormCategories(['Stuthi Songs']);
    setFormKey('G');
    setFormTimeSig('4/4');
    setFormTempo('72');
    setFormVerses('4V');
    setFormPrelude('Acoustic + Drum');
    setFormInterlude('Keys + Elec (Alt)');
    setFormNotes('');
    setFormYoutubeUrl('');
    setFormLyricsEn('');
    setFormLyricsTe('');
    setFormLyricsHi('');
    setFormIsThemeSong(false);
    setEditorLyricTab('en');
    setEditorOpen(true);
  };

  // Open Edit Song Modal
  const openEditModal = (song: FirebaseSongItem) => {
    setEditingSongId(song.id);
    setFormError(null);
    setFormTitle(song.title || song.titleEn || '');
    setFormTitleTe(song.titleTe || '');
    setFormArtist(song.artist || song.ledBy || 'Worship Team');
    setFormLedBy(song.ledBy || song.artist || 'Worship Team');

    const cats = song.category
      ? song.category.split(';').map((c) => c.trim()).filter(Boolean)
      : ['Stuthi Songs'];
    setFormCategories(cats);

    setFormKey(song.key || 'G');
    setFormTimeSig(song.timeSignature || '4/4');
    setFormTempo(String(song.tempo || '72'));
    setFormVerses(song.verses || '4V');
    setFormPrelude(song.prelude || 'Acoustic + Drum');
    setFormInterlude(song.interlude || 'Keys + Elec (Alt)');
    setFormNotes(song.notes || '');
    setFormYoutubeUrl(song.youtubeId ? `https://youtu.be/${song.youtubeId}` : '');
    setFormLyricsEn(song.lyricsEn || song.lyrics || '');
    setFormLyricsTe(song.lyricsTe || '');
    setFormLyricsHi(song.lyricsHi || '');
    setFormIsThemeSong(Boolean(song.isThemeSong));
    setEditorLyricTab('en');
    setEditorOpen(true);
  };

  // Toggle Category selection in form
  const toggleFormCategory = (cat: string) => {
    setFormCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  // Save Song (Create or Update)
  const handleSaveSong = async () => {
    setFormError(null);

    if (!formTitle.trim()) {
      setFormError('Song Title (English) is required.');
      return;
    }
    if (formCategories.length === 0) {
      setFormError('Please select at least one song category.');
      return;
    }

    setFormSubmitting(true);
    const cleanYt = extractYouTubeId(formYoutubeUrl);

    const payload: any = {
      title: formTitle.trim(),
      titleEn: formTitle.trim(),
      titleTe: formTitleTe.trim(),
      artist: formArtist.trim(),
      ledBy: formLedBy.trim() || formArtist.trim(),
      key: formKey,
      timeSignature: formTimeSig,
      tempo: formTempo.trim() || '72',
      verses: formVerses.trim() || '4V',
      category: formCategories.join(';'),
      prelude: formPrelude.trim(),
      interlude: formInterlude.trim(),
      notes: formNotes.trim(),
      youtubeId: cleanYt,
      lyrics: formLyricsEn.trim(),
      lyricsEn: formLyricsEn.trim(),
      lyricsTe: formLyricsTe.trim(),
      lyricsHi: formLyricsHi.trim(),
      isThemeSong: formIsThemeSong,
      status: 'published',
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingSongId) {
        const docRef = doc(db, 'Rhema Church', 'rhema', 'worshipSongs', editingSongId);
        await updateDoc(docRef, payload);
        notify(`Updated song: ${formTitle}`);
      } else {
        const colRef = collection(db, 'Rhema Church', 'rhema', 'worshipSongs');
        await addDoc(colRef, {
          ...payload,
          createdAt: serverTimestamp(),
        });
        notify(`Added new song: ${formTitle}`);
      }

      setEditorOpen(false);
      await loadSongs();
    } catch (err: any) {
      console.error('Song save error:', err);
      setFormError(err?.message || 'Failed to save song document.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Song Permanently
  const handleDeleteSong = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      const docRef = doc(db, 'Rhema Church', 'rhema', 'worshipSongs', deleteTarget.id);
      await deleteDoc(docRef);
      notify(`Deleted song: ${deleteTarget.title}`);
      setDeleteTarget(null);
      await loadSongs();
    } catch (err: any) {
      console.error('Delete error:', err);
      notify(err?.message || 'Failed to delete song.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Open Chord & Lyrics Modal with Transposition
  const openChordModal = (song: FirebaseSongItem) => {
    setChordModalSong(song);
    setTransposeShift(0);
    setChordModalTab(song.lyricsEn ? 'chords' : song.lyricsTe ? 'telugu' : 'chords');
  };

  // Transposed Key calculation
  const currentTransposedKey = useMemo(() => {
    if (!chordModalSong) return 'G';
    return transposeKey(chordModalSong.key || 'G', transposeShift);
  }, [chordModalSong, transposeShift]);

  // Transposed Chord Sheet text
  const currentTransposedChords = useMemo(() => {
    if (!chordModalSong) return '';
    const raw = chordModalSong.lyricsEn || chordModalSong.lyrics || '';
    return transposeChordSheet(raw, transposeShift);
  }, [chordModalSong, transposeShift]);

  // ─── Setlist Builder Operations ───
  const handleAddSongToSetlist = (song: FirebaseSongItem) => {
    if (!currentService) return;
    const exists = (currentService.songs || []).some((s) => s.id === song.id);
    if (exists) {
      notify(`"${song.title}" is already in ${currentService.name}`);
      return;
    }

    const newItem: SetlistSongItem = {
      id: song.id,
      title: song.title,
      titleTe: song.titleTe,
      key: song.key || 'G',
      tempo: song.tempo || '72',
      timeSignature: song.timeSignature || '4/4',
      ledBy: song.ledBy || song.artist || 'Worship Leader',
      prelude: song.prelude || 'Acoustic + Drum',
      interlude: song.interlude || 'Keys + Elec (Alt)',
      notes: song.notes || '',
      verses: song.verses || '4V',
    };

    const updated = services.map((s) => {
      if (s.id === currentService.id) {
        return {
          ...s,
          songs: [...(s.songs || []), newItem],
        };
      }
      return s;
    });

    saveServicesToFirestore(updated);
    setShowAddSongToSetlistModal(false);
    notify(`Added "${song.title}" to ${currentService.name}`);
  };

  const handleRemoveSongFromSetlist = (index: number) => {
    if (!currentService) return;
    const songName = currentService.songs[index]?.title || 'Song';
    const updatedSongs = currentService.songs.filter((_, idx) => idx !== index);
    const updated = services.map((s) => (s.id === currentService.id ? { ...s, songs: updatedSongs } : s));
    saveServicesToFirestore(updated);
    notify(`Removed "${songName}" from setlist`);
  };

  const handleMoveSetlistSong = (index: number, direction: 'up' | 'down') => {
    if (!currentService) return;
    const list = [...currentService.songs];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    const updated = services.map((s) => (s.id === currentService.id ? { ...s, songs: list } : s));
    saveServicesToFirestore(updated);
  };

  const handleSaveSetlistSongEdit = () => {
    if (!editingSetlistSong || !currentService) return;
    const list = [...currentService.songs];
    list[editingSetlistSong.index] = editingSetlistSong.song;

    const updated = services.map((s) => (s.id === currentService.id ? { ...s, songs: list } : s));
    saveServicesToFirestore(updated);
    setEditingSetlistSong(null);
    notify('Updated song chart details for service');
  };

  const handleCreateService = () => {
    if (!newServiceName.trim()) return;
    const newService: WorshipService = {
      id: `service_${Date.now()}`,
      name: newServiceName.trim(),
      date: newServiceDate,
      time: newServiceTime,
      songs: [],
    };
    const updated = [...services, newService];
    saveServicesToFirestore(updated);
    setActiveServiceId(newService.id);
    setShowAddServiceModal(false);
    setNewServiceName('');
    notify(`Created new service setlist: ${newService.name}`);
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
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <Music size={22} />
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Admin Worship Songbook
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Curate bilingual church song catalog, interactive chord sheets, transposition &amp; service setlists
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

          {/* 1. TOP SUMMARY CARDS (Equal Width, Fill 100% Available Content Area) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            {/* Card 1: TOTAL SONGS */}
            <div
              onClick={() => setActiveTab('all')}
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
              onClick={() => setActiveTab('theme')}
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

            {/* Card 3: SERVICE SETLISTS */}
            <div
              onClick={() => setActiveTab('setlists')}
              className={`p-5 rounded-3xl border transition-all cursor-pointer shadow-sm relative overflow-hidden flex flex-col justify-between h-32 ${
                activeTab === 'setlists'
                  ? 'border-purple-500 bg-purple-50/70 dark:bg-purple-950/20 ring-2 ring-purple-500/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-purple-400/50'
              }`}
            >
              <div className="w-8 h-1.5 rounded-full bg-purple-500" />
              <div>
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white block tracking-tight">
                  {stats.setlistCount}
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mt-1 block">
                  SERVICE SETLISTS
                </span>
                <span className="text-[11px] text-slate-400 font-medium">Live Sunday builder</span>
              </div>
            </div>

            {/* Card 4: SONG CATEGORIES */}
            <div className="p-5 rounded-3xl border border-emerald-200/80 dark:border-emerald-900/40 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden flex flex-col justify-between h-32">
              <div className="w-8 h-1.5 rounded-full bg-emerald-500" />
              <div>
                <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 block tracking-tight">
                  {CANONICAL_SONG_CATEGORIES.length - 1}
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

          {/* 2. MAIN SEGMENTED CONTROLS (All Songs / Theme Songs / Setlists) */}
          <div className="flex items-center justify-between gap-4 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
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
                className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'theme'
                    ? 'bg-black dark:bg-white text-white dark:text-black shadow'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Star size={14} className={activeTab === 'theme' ? 'fill-amber-400 text-amber-400' : ''} />
                <span>Theme Songs ({stats.theme})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('setlists')}
                className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'setlists'
                    ? 'bg-black dark:bg-white text-white dark:text-black shadow'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layers size={14} />
                <span>Service Setlists ({services.length})</span>
              </button>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 1 & 2: SONG LIBRARY (ALL SONGS / THEME SONGS) */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab !== 'setlists' && (
            <div className="space-y-6">
              {/* Category Filter Pills (Exact Mobile Parity) */}
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
                        ? songs.filter((s) => s.isThemeSong).length
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

              {/* Search & Musical Key Filter Row */}
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

              {/* Songs Listing (Responsive 2 or 3-column Grid Layout) */}
              {loading && songs.length === 0 ? (
                <div className="p-16 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                  <RefreshCw size={24} className="animate-spin text-amber-500" />
                  <span>Loading worship song catalog from Firestore...</span>
                </div>
              ) : filteredSongs.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                  <Music size={32} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    No worship songs found
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Try adjusting your search query, key filter, or create a new song.
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
                        {/* Header Row: Index Number & Badges */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              {/* Song Index Number matching mobile card */}
                              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-extrabold text-xs flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm">
                                {idx + 1}
                              </div>

                              {/* Musical Key Badge */}
                              <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 text-[11px] font-black tracking-wider">
                                Key {song.key || 'G'}
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
                              <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                <Star size={10} className="fill-amber-500 text-amber-500" />
                                <span>Theme</span>
                              </span>
                            )}
                          </div>

                          {/* Song Titles */}
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
                          <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                            <p className="flex items-center gap-1.5 text-[11px]">
                              <Mic size={12} className="text-slate-400 shrink-0" />
                              <span className="text-slate-700 dark:text-slate-300 font-medium truncate">
                                Led by: {song.ledBy || song.artist || 'Worship Team'}
                              </span>
                            </p>

                            <div className="flex flex-wrap gap-1 pt-1">
                              {(song.category ? song.category.split(';') : ['Stuthi Songs']).map((c, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold"
                                >
                                  {c.trim()}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Bottom Actions Row (Exact Mobile Parity) */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                          {/* Toggle Theme Button matching mobile screenshot */}
                          <button
                            type="button"
                            onClick={() => handleToggleThemeSong(song)}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                              song.isThemeSong
                                ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'
                                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-amber-400 hover:text-amber-600'
                            }`}
                          >
                            <Star
                              size={12}
                              className={song.isThemeSong ? 'fill-amber-500 text-amber-500' : ''}
                            />
                            <span>{song.isThemeSong ? 'THEME SONG' : 'MAKE THEME'}</span>
                          </button>

                          <div className="flex items-center gap-1.5">
                            {/* Chords & Transpose Preview */}
                            <button
                              type="button"
                              onClick={() => openChordModal(song)}
                              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="View Chords, Lyrics & Transpose"
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
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 3: SERVICE SETLISTS & SETLIST BUILDER */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === 'setlists' && (
            <div className="space-y-6">
              {/* Services Selector & Add Service Row */}
              <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 overflow-x-auto pb-1 sm:pb-0">
                  {services.map((svc) => {
                    const isSelected = svc.id === activeServiceId;
                    return (
                      <button
                        key={svc.id}
                        type="button"
                        onClick={() => setActiveServiceId(svc.id)}
                        className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-2 ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-600 shadow'
                            : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <Calendar size={13} />
                        <span>{svc.name}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800'
                          }`}
                        >
                          {(svc.songs || []).length}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddServiceModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs flex items-center gap-1.5 shadow-sm hover:opacity-90 transition-all"
                  >
                    <FolderPlus size={14} />
                    <span>+ New Service</span>
                  </button>
                </div>
              </div>

              {/* Active Service Setlist Header & Actions */}
              {currentService && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600">
                          <Layers size={18} />
                        </span>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                          {currentService.name}
                        </h2>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                        <span>🗓 {currentService.date || 'Sunday Service'}</span>
                        <span>•</span>
                        <span>⏰ {currentService.time || '08:30 AM'}</span>
                        <span>•</span>
                        <span className="font-semibold text-purple-600">
                          {(currentService.songs || []).length} songs in flow
                        </span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddSongToSetlistModal(true)}
                      className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow transition-all self-start sm:self-auto"
                    >
                      <Plus size={16} />
                      <span>+ Add Song to Setlist</span>
                    </button>
                  </div>

                  {/* Setlist Songs Table/List */}
                  {(!currentService.songs || currentService.songs.length === 0) ? (
                    <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                      <Music size={32} className="mx-auto text-slate-400 mb-2" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Setlist is currently empty
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Tap &quot;+ Add Song to Setlist&quot; to pick worship songs from your library.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {currentService.songs.map((item, idx) => (
                        <div
                          key={item.id + idx}
                          className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-purple-400/50 transition-all shadow-sm"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Order Number Badge */}
                            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-sm">
                              {idx + 1}
                            </div>

                            <div className="space-y-1 min-w-0">
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                {item.title}
                              </h4>
                              {item.titleTe && (
                                <p className="text-xs text-amber-700 dark:text-amber-400 font-serif font-medium truncate">
                                  {item.titleTe}
                                </p>
                              )}

                              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                                <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold">
                                  Key {item.key}
                                </span>
                                {item.tempo && (
                                  <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-semibold">
                                    {item.tempo} BPM
                                  </span>
                                )}
                                {item.ledBy && (
                                  <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-medium">
                                    🎤 {item.ledBy}
                                  </span>
                                )}
                                {item.prelude && (
                                  <span className="text-slate-500">
                                    Intro: <b className="text-slate-700 dark:text-slate-300">{item.prelude}</b>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Reordering & Edit Controls */}
                          <div className="flex items-center justify-end gap-1.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200 dark:border-slate-800">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveSetlistSong(idx, 'up')}
                              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-200 transition-colors"
                              title="Move Up"
                            >
                              <ArrowUp size={13} />
                            </button>

                            <button
                              type="button"
                              disabled={idx === currentService.songs.length - 1}
                              onClick={() => handleMoveSetlistSong(idx, 'down')}
                              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-200 transition-colors"
                              title="Move Down"
                            >
                              <ArrowDown size={13} />
                            </button>

                            <button
                              type="button"
                              onClick={() => setEditingSetlistSong({ index: idx, song: { ...item } })}
                              className="px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center gap-1 hover:bg-purple-100 transition-colors"
                            >
                              <Sliders size={12} />
                              <span>Arrangement</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveSongFromSetlist(idx)}
                              className="p-2 rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                              title="Remove from Setlist"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* MODAL 1: CHORD SHEET, LYRICS & REAL-TIME TRANSPOSITION */}
          {/* ───────────────────────────────────────────────────────────── */}
          {chordModalSong && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full p-5 sm:p-8 space-y-6 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-black text-xs">
                        Original Key: {chordModalSong.key || 'G'}
                      </span>
                      {chordModalSong.timeSignature && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold">
                          {chordModalSong.timeSignature}
                        </span>
                      )}
                      {chordModalSong.tempo && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-bold">
                          {chordModalSong.tempo} BPM
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1.5">
                      {chordModalSong.title}
                    </h2>
                    {chordModalSong.titleTe && (
                      <p className="text-sm text-amber-700 dark:text-amber-400 font-serif font-medium mt-0.5">
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

                {/* Real-Time Transpose Control Bar */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Transposed Key:
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-purple-600 text-white font-extrabold text-sm shadow">
                      {currentTransposedKey}
                    </span>
                    {transposeShift !== 0 && (
                      <span className="text-xs text-purple-600 dark:text-purple-400 font-bold">
                        ({transposeShift > 0 ? `+${transposeShift}` : transposeShift} semitones)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTransposeShift((prev) => prev - 1)}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold shadow-sm hover:bg-slate-100"
                    >
                      ♭ -1 Half Step
                    </button>

                    <button
                      type="button"
                      onClick={() => setTransposeShift(0)}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold shadow-sm hover:bg-slate-100"
                    >
                      Reset Key
                    </button>

                    <button
                      type="button"
                      onClick={() => setTransposeShift((prev) => prev + 1)}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold shadow-sm hover:bg-slate-100"
                    >
                      ♯ +1 Half Step
                    </button>
                  </div>
                </div>

                {/* Lyrics & Chords Tabs */}
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <button
                    type="button"
                    onClick={() => setChordModalTab('chords')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      chordModalTab === 'chords'
                        ? 'bg-black dark:bg-white text-white dark:text-black shadow'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Chords &amp; English Lyrics
                  </button>

                  <button
                    type="button"
                    onClick={() => setChordModalTab('telugu')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      chordModalTab === 'telugu'
                        ? 'bg-black dark:bg-white text-white dark:text-black shadow'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Telugu Lyrics (తెలుగు)
                  </button>
                </div>

                {/* Content Box */}
                <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 max-h-96 overflow-y-auto">
                  {chordModalTab === 'chords' ? (
                    currentTransposedChords ? (
                      <pre className="font-mono text-xs whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-200">
                        {currentTransposedChords}
                      </pre>
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        No chord sheet attached. You can edit this song to paste chords with lyrics (e.g. [G], [Em], [C], [D]).
                      </p>
                    )
                  ) : (
                    chordModalSong.lyricsTe ? (
                      <p className="text-sm font-serif leading-loose whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                        {chordModalSong.lyricsTe}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        No Telugu lyrics available for this song.
                      </p>
                    )
                  )}
                </div>

                {/* Band Chart Info Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Prelude</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{chordModalSong.prelude || 'Acoustic'}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Interlude</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{chordModalSong.interlude || 'Keys + Elec'}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Worship Leader</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{chordModalSong.ledBy || chordModalSong.artist || 'Worship Team'}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Verses</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{chordModalSong.verses || '4V'}</span>
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
          {/* MODAL 2: ADD / EDIT WORSHIP SONG (FULL MOBILE PARITY) */}
          {/* ───────────────────────────────────────────────────────────── */}
          {editorOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-5 sm:p-8 space-y-6 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
                      {editingSongId ? 'Edit Worship Song' : 'Add New Worship Song'}
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                      {editingSongId ? 'Update Song Details & Arrangement' : 'Publish New Song to Library'}
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
                    handleSaveSong();
                  }}
                  className="space-y-4"
                >
                  {/* Titles */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        SONG TITLE (ENGLISH) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="e.g. Sreemanthudaa Yesayya"
                        required
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        SONG TITLE (TELUGU)
                      </label>
                      <input
                        type="text"
                        value={formTitleTe}
                        onChange={(e) => setFormTitleTe(e.target.value)}
                        placeholder="e.g. శ్రీమంతుడా యేసయ్యా"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                  </div>

                  {/* Worship Leader & Musical Key */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        WORSHIP LEADER / ARTIST
                      </label>
                      <input
                        type="text"
                        value={formLedBy}
                        onChange={(e) => {
                          setFormLedBy(e.target.value);
                          setFormArtist(e.target.value);
                        }}
                        placeholder="e.g. Dr.Blessy / Worship Team"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        ORIGINAL MUSICAL KEY <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formKey}
                        onChange={(e) => setFormKey(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium"
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
                  </div>

                  {/* Tempo, Time Signature & Verses */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                        TEMPO (BPM)
                      </label>
                      <input
                        type="text"
                        value={formTempo}
                        onChange={(e) => setFormTempo(e.target.value)}
                        placeholder="72"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                        TIME SIGNATURE
                      </label>
                      <input
                        type="text"
                        value={formTimeSig}
                        onChange={(e) => setFormTimeSig(e.target.value)}
                        placeholder="4/4"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                        VERSES COUNT
                      </label>
                      <input
                        type="text"
                        value={formVerses}
                        onChange={(e) => setFormVerses(e.target.value)}
                        placeholder="4V"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs"
                      />
                    </div>
                  </div>

                  {/* Categories Multi-Select Chips */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      SONG CATEGORIES <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                      {CANONICAL_SONG_CATEGORIES.filter((c) => c !== 'All' && c !== 'Theme Songs').map((cat) => {
                        const isChecked = formCategories.includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => toggleFormCategory(cat)}
                            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all flex items-center gap-1 ${
                              isChecked
                                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <span>{cat}</span>
                            {isChecked && <Check size={11} strokeWidth={3} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Prelude & Interlude Arrangements */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        PRELUDE / INTRO ARRANGEMENT
                      </label>
                      <input
                        type="text"
                        value={formPrelude}
                        onChange={(e) => setFormPrelude(e.target.value)}
                        placeholder="e.g. Acoustic + Drum"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        INTERLUDE ARRANGEMENT
                      </label>
                      <input
                        type="text"
                        value={formInterlude}
                        onChange={(e) => setFormInterlude(e.target.value)}
                        placeholder="e.g. Keys + Elec (Alt)"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs"
                      />
                    </div>
                  </div>

                  {/* YouTube Link */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      YOUTUBE VIDEO OR AUDIO TRACK URL
                    </label>
                    <input
                      type="text"
                      value={formYoutubeUrl}
                      onChange={(e) => setFormYoutubeUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-medium"
                    />
                  </div>

                  {/* Theme Song Checkbox */}
                  <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl flex items-center justify-between cursor-pointer"
                    onClick={() => setFormIsThemeSong(!formIsThemeSong)}
                  >
                    <div className="flex items-center gap-3">
                      <Star size={18} className={formIsThemeSong ? 'fill-amber-500 text-amber-500' : 'text-amber-500'} />
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          Mark as Church Theme Song
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Highlights this song in the mobile app Theme Songs tab
                        </span>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${formIsThemeSong ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-300'}`}>
                      {formIsThemeSong && <Check size={12} strokeWidth={3} />}
                    </div>
                  </div>

                  {/* Lyrics & Chords Tabs */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
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
                      </div>

                      {editorLyricTab === 'en' && (
                        <span className="text-[10px] text-slate-400">
                          Format inline chords with brackets e.g. [G], [Em], [C], [D]
                        </span>
                      )}
                    </div>

                    {editorLyricTab === 'en' ? (
                      <textarea
                        rows={7}
                        value={formLyricsEn}
                        onChange={(e) => setFormLyricsEn(e.target.value)}
                        placeholder="[G]Arhatha lekunna [Em]preminchavu&#10;[C]Naa sthuthi paathruda [D]Yesayya..."
                        className="w-full font-mono text-xs p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl"
                      />
                    ) : (
                      <textarea
                        rows={7}
                        value={formLyricsTe}
                        onChange={(e) => setFormLyricsTe(e.target.value)}
                        placeholder="అర్హత లేకున్నా ప్రేమించావు...&#10;నా స్తుతి పాత్రుడా యేసయ్యా..."
                        className="w-full font-serif text-sm p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl leading-relaxed"
                      />
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      disabled={formSubmitting}
                      onClick={handleSaveSong}
                      className="w-full py-3.5 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
                    >
                      {formSubmitting ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                      <span>{editingSongId ? 'Update Song Details' : 'Publish Song to Library'}</span>
                    </button>

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => setEditorOpen(false)}
                        className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 font-semibold"
                      >
                        ← Cancel
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* MODAL 3: ADD SONG TO SETLIST PICKER */}
          {/* ───────────────────────────────────────────────────────────── */}
          {showAddSongToSetlistModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Add Song to {currentService?.name}
                    </h3>
                    <p className="text-[11px] text-slate-400">Select any song from your Church Song Library</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddSongToSetlistModal(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filter songs by title..."
                    value={setlistSearchQuery}
                    onChange={(e) => setSetlistSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
                  />
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2">
                  {songs
                    .filter((s) => {
                      if (!setlistSearchQuery) return true;
                      const q = setlistSearchQuery.toLowerCase();
                      return (
                        s.title.toLowerCase().includes(q) ||
                        (s.titleTe || '').toLowerCase().includes(q)
                      );
                    })
                    .map((s) => (
                      <div
                        key={s.id}
                        onClick={() => handleAddSongToSetlist(s)}
                        className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-purple-500/60 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-purple-50/50 cursor-pointer transition-all flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{s.title}</p>
                          {s.titleTe && <p className="text-[11px] text-amber-700 font-serif">{s.titleTe}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                            Key {s.key}
                          </span>
                          <Plus size={14} className="text-purple-600" />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* MODAL 4: EDIT SETLIST SONG ARRANGEMENT */}
          {/* ───────────────────────────────────────────────────────────── */}
          {editingSetlistSong && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Service Arrangement
                    </h3>
                    <p className="text-xs font-semibold text-purple-600">{editingSetlistSong.song.title}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingSetlistSong(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Service Key</label>
                    <select
                      value={editingSetlistSong.song.key}
                      onChange={(e) =>
                        setEditingSetlistSong({
                          ...editingSetlistSong,
                          song: { ...editingSetlistSong.song, key: e.target.value },
                        })
                      }
                      className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
                    >
                      {ALL_MUSICAL_KEYS.map((k) => (
                        <option key={k} value={k}>
                          Key {k}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tempo (BPM)</label>
                      <input
                        type="text"
                        value={editingSetlistSong.song.tempo || ''}
                        onChange={(e) =>
                          setEditingSetlistSong({
                            ...editingSetlistSong,
                            song: { ...editingSetlistSong.song, tempo: e.target.value },
                          })
                        }
                        className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Vocalist / Led By</label>
                      <input
                        type="text"
                        value={editingSetlistSong.song.ledBy || ''}
                        onChange={(e) =>
                          setEditingSetlistSong({
                            ...editingSetlistSong,
                            song: { ...editingSetlistSong.song, ledBy: e.target.value },
                          })
                        }
                        className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Intro / Prelude</label>
                    <input
                      type="text"
                      value={editingSetlistSong.song.prelude || ''}
                      onChange={(e) =>
                        setEditingSetlistSong({
                          ...editingSetlistSong,
                          song: { ...editingSetlistSong.song, prelude: e.target.value },
                        })
                      }
                      className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Band Notes</label>
                    <textarea
                      rows={2}
                      value={editingSetlistSong.song.notes || ''}
                      onChange={(e) =>
                        setEditingSetlistSong({
                          ...editingSetlistSong,
                          song: { ...editingSetlistSong.song, notes: e.target.value },
                        })
                      }
                      placeholder="e.g. Acoustic solo first, full band drops on chorus 2"
                      className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingSetlistSong(null)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSetlistSongEdit}
                    className="px-4 py-1.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 shadow"
                  >
                    Save Arrangement
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* MODAL 5: NEW SERVICE SETLIST MODAL */}
          {/* ───────────────────────────────────────────────────────────── */}
          {showAddServiceModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Create New Service Setlist
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddServiceModal(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Service Name
                    </label>
                    <input
                      type="text"
                      value={newServiceName}
                      onChange={(e) => setNewServiceName(e.target.value)}
                      placeholder="e.g. Sunday Evening Service"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={newServiceDate}
                        onChange={(e) => setNewServiceDate(e.target.value)}
                        className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Time
                      </label>
                      <input
                        type="text"
                        value={newServiceTime}
                        onChange={(e) => setNewServiceTime(e.target.value)}
                        placeholder="08:30 AM"
                        className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddServiceModal(false)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateService}
                    className="px-4 py-1.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 shadow"
                  >
                    Create Service
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* MODAL 6: DELETE CONFIRMATION */}
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

                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Are you sure you want to delete{' '}
                  <span className="font-bold text-slate-900 dark:text-white">
                    &quot;{deleteTarget.title}&quot;
                  </span>
                  ? This will remove it from the church songbook.
                </p>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    disabled={deleteSubmitting}
                    onClick={() => setDeleteTarget(null)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleteSubmitting}
                    onClick={handleDeleteSong}
                    className="px-4 py-1.5 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 shadow-sm flex items-center gap-1.5"
                  >
                    {deleteSubmitting ? <RefreshCw size={14} className="animate-spin" /> : null}
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
