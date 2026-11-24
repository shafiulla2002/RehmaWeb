'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/contexts/AuthContext';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit3,
  Download,
  Copy,
  Check,
  Tag,
  BookOpen,
  Calendar,
  Layers,
  Sparkles,
  ChevronDown,
  X,
  ShieldCheck,
  Info,
} from 'lucide-react';

export type NoteCategory = 'Sermon' | 'Bible Study' | 'Prayer' | 'Personal' | 'General';

export interface MemberNote {
  id: string;
  title: string;
  content: string;
  category: NoteCategory;
  scriptureRef?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export default function NotesPage() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<MemberNote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<MemberNote | null>(null);

  // Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<NoteCategory>('Sermon');
  const [formScriptureRef, setFormScriptureRef] = useState('');
  const [formContent, setFormContent] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Member-specific local storage key (following Rhema mobile app AsyncStorage architecture)
  const storageKey = user?.uid
    ? `@rhema_sermon_notes_${user.uid}`
    : '@rhema_sermon_notes_guest';

  // Load notes on mount or when authenticated user changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setNotes(parsed);
          return;
        }
      }
      setNotes([]);
    } catch (e) {
      console.warn('Failed reading member notes from localStorage:', e);
      setNotes([]);
    }
  }, [storageKey]);

  const saveNotesToStorage = (updatedNotes: MemberNote[]) => {
    setNotes(updatedNotes);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updatedNotes));
    } catch (e) {
      console.error('Failed saving notes to storage:', e);
    }
  };

  const handleOpenNewNote = () => {
    setEditingNote(null);
    setFormTitle('');
    setFormCategory('Sermon');
    setFormScriptureRef('');
    setFormContent('');
    setIsEditorOpen(true);
  };

  const handleOpenEditNote = (note: MemberNote) => {
    setEditingNote(note);
    setFormTitle(note.title);
    setFormCategory(note.category);
    setFormScriptureRef(note.scriptureRef || '');
    setFormContent(note.content);
    setIsEditorOpen(true);
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const now = new Date().toISOString();
    if (editingNote) {
      // Update
      const updated = notes.map((n) =>
        n.id === editingNote.id
          ? {
              ...n,
              title: formTitle.trim(),
              category: formCategory,
              scriptureRef: formScriptureRef.trim() || undefined,
              content: formContent.trim(),
              updatedAt: now,
            }
          : n
      );
      saveNotesToStorage(updated);
    } else {
      // Create
      const newNote: MemberNote = {
        id: `note-${Date.now()}`,
        title: formTitle.trim(),
        category: formCategory,
        scriptureRef: formScriptureRef.trim() || undefined,
        content: formContent.trim(),
        createdAt: now,
        updatedAt: now,
      };
      saveNotesToStorage([newNote, ...notes]);
    }
    setIsEditorOpen(false);
  };

  const handleDeleteNote = (id: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      const updated = notes.filter((n) => n.id !== id);
      saveNotesToStorage(updated);
      setSelectedNoteIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleToggleSelectNote = (id: string) => {
    setSelectedNoteIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedNoteIds.length === filteredNotes.length) {
      setSelectedNoteIds([]);
    } else {
      setSelectedNoteIds(filteredNotes.map((n) => n.id));
    }
  };

  const handleBulkDelete = () => {
    if (
      confirm(`Delete ${selectedNoteIds.length} selected note(s)? This action cannot be undone.`)
    ) {
      const updated = notes.filter((n) => !selectedNoteIds.includes(n.id));
      saveNotesToStorage(updated);
      setSelectedNoteIds([]);
    }
  };

  const handleMergeSelected = () => {
    if (selectedNoteIds.length < 2) {
      alert('Please select at least 2 notes to merge.');
      return;
    }
    const notesToMerge = notes.filter((n) => selectedNoteIds.includes(n.id));
    const mergedTitle = `Merged Notes: ${notesToMerge.map((n) => n.title).join(' & ')}`.slice(0, 80);
    const mergedContent = notesToMerge
      .map(
        (n) =>
          `=== ${n.title.toUpperCase()} (${n.category}${n.scriptureRef ? ` • ${n.scriptureRef}` : ''}) ===\n${n.content}\n`
      )
      .join('\n\n');

    const mergedNote: MemberNote = {
      id: `note-merged-${Date.now()}`,
      title: mergedTitle,
      category: 'General',
      content: mergedContent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveNotesToStorage([mergedNote, ...notes]);
    setSelectedNoteIds([]);
    alert('Notes merged successfully!');
  };

  const handleExportTxt = (note: MemberNote) => {
    const textContent = `${note.title}\nCategory: ${note.category}\nScripture: ${note.scriptureRef || 'N/A'}\nCreated: ${new Date(note.createdAt).toLocaleDateString()}\n\n${note.content}`;
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${note.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyNote = (note: MemberNote) => {
    navigator.clipboard.writeText(`${note.title}\n\n${note.content}`);
    setCopiedId(note.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter notes
  const filteredNotes = notes.filter((note) => {
    const matchesCategory =
      selectedCategory === 'All' || note.category === selectedCategory;
    const matchesSearch =
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.scriptureRef &&
        note.scriptureRef.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const categories: string[] = ['All', 'Sermon', 'Bible Study', 'Prayer', 'Personal', 'General'];

  return (
    <AppShell allowedRoles={['member', 'admin', 'superadmin', 'guest']}>
      <div className="space-y-6">
        {/* TOP HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="border-l-4 border-[#1E6F43] pl-3.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#18221B] dark:text-white tracking-tight flex items-center gap-2">
              <FileText className="text-[#1E6F43]" size={28} />
              <span>Personal Notes Studio</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#5C665F] dark:text-slate-400 mt-0.5">
              Secure, private sermon reflections and Bible study journaling. Saved securely on your device.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleOpenNewNote}
              className="px-4 py-2.5 rounded-xl bg-[#1E6F43] hover:bg-[#175835] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Plus size={16} />
              <span>Create New Note</span>
            </button>
          </div>
        </div>

        {/* SECURITY & PRIVACY CALLOUT */}
        <div className="p-3.5 rounded-2xl bg-[#E8F3EC] dark:bg-[#102418] border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between text-xs text-[#1E6F43] dark:text-emerald-300">
          <div className="flex items-center gap-2.5">
            <span className="text-base">🔒</span>
            <span className="font-medium">
              <strong>Private Device Notebook:</strong> Parity with mobile app AsyncStorage architecture. Stored locally per member account. Web notes and mobile notes do not automatically synchronize to the cloud.
            </span>
          </div>
          <span className="hidden sm:inline-block text-[11px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 px-2.5 py-1 rounded-full">
            M11 Private Storage
          </span>
        </div>

        {/* FILTER & SEARCH TOOLBAR */}
        <div className="p-4 rounded-3xl bg-white dark:bg-[#131C27] border border-[#EBE6DC] dark:border-[#222F3E] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes by title, scriptures, or keywords..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] text-xs text-[#18221B] dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-[#1E6F43]"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#1E6F43] text-white shadow-xs'
                    : 'bg-[#FBF9F4] dark:bg-[#0E1520] text-[#5C665F] dark:text-slate-400 hover:text-[#18221B] dark:hover:text-white border border-[#EFECE6] dark:border-[#1E2B3A]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* BULK ACTIONS TOOLBAR (if any selected) */}
        {selectedNoteIds.length > 0 && (
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-3">
              <span className="font-bold">{selectedNoteIds.length} note(s) selected</span>
              <button
                type="button"
                onClick={handleSelectAll}
                className="underline hover:text-amber-950 cursor-pointer text-[11px]"
              >
                {selectedNoteIds.length === filteredNotes.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleMergeSelected}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Layers size={14} />
                <span>Merge Selected</span>
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}

        {/* NOTES GRID */}
        {filteredNotes.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#131C27] border border-[#EBE6DC] dark:border-[#222F3E] space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-[#1E6F43] flex items-center justify-center mx-auto">
              <FileText size={26} />
            </div>
            <h3 className="text-base font-bold text-[#18221B] dark:text-white">
              No Notes Found
            </h3>
            <p className="text-xs text-[#5C665F] dark:text-slate-400 max-w-sm mx-auto">
              {searchQuery
                ? 'No notes match your search criteria. Try a different term or clear the filter.'
                : 'You have not written any notes in this category yet. Click "Create New Note" to record reflections from Sunday worship.'}
            </p>
            <button
              type="button"
              onClick={handleOpenNewNote}
              className="mt-2 px-4 py-2 rounded-xl bg-[#1E6F43] hover:bg-[#175835] text-white text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={15} />
              <span>Create First Note</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map((note) => {
              const isSelected = selectedNoteIds.includes(note.id);
              return (
                <div
                  key={note.id}
                  className={`rounded-3xl p-5 bg-white dark:bg-[#131C27] border transition-all flex flex-col justify-between group shadow-xs ${
                    isSelected
                      ? 'border-[#1E6F43] ring-2 ring-[#1E6F43]/20'
                      : 'border-[#EBE6DC] dark:border-[#222F3E] hover:border-[#1E6F43]/60'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header Bar */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectNote(note.id)}
                          className="w-4 h-4 rounded text-[#1E6F43] focus:ring-0 cursor-pointer"
                        />
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#E8F3EC] dark:bg-[#102418] text-[#1E6F43] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60">
                          {note.category}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(note.updatedAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Note Title */}
                    <h3
                      onClick={() => handleOpenEditNote(note)}
                      className="font-bold text-sm sm:text-base text-[#18221B] dark:text-white group-hover:text-[#1E6F43] transition-colors cursor-pointer line-clamp-2"
                    >
                      {note.title}
                    </h3>

                    {/* Scripture Reference (if present) */}
                    {note.scriptureRef && (
                      <div className="flex items-center gap-1.5 text-xs text-[#1E6F43] dark:text-emerald-400 font-semibold">
                        <BookOpen size={13} className="shrink-0" />
                        <span>{note.scriptureRef}</span>
                      </div>
                    )}

                    {/* Note Content Excerpt */}
                    <p
                      onClick={() => handleOpenEditNote(note)}
                      className="text-xs text-[#5C665F] dark:text-slate-300 leading-relaxed font-sans line-clamp-4 cursor-pointer whitespace-pre-line"
                    >
                      {note.content}
                    </p>
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-4 mt-3 border-t border-[#EFECE6] dark:border-[#1E2B3A] flex items-center justify-between text-slate-400">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleCopyNote(note)}
                        title="Copy note to clipboard"
                        className="p-1.5 rounded-lg hover:text-[#1E6F43] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                      >
                        {copiedId === note.id ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportTxt(note)}
                        title="Download as TXT"
                        className="p-1.5 rounded-lg hover:text-[#1E6F43] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                      >
                        <Download size={15} />
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditNote(note)}
                        title="Edit note"
                        className="p-1.5 rounded-lg hover:text-[#1E6F43] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(note.id)}
                        title="Delete note"
                        className="p-1.5 rounded-lg hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
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

        {/* CREATE / EDIT NOTE MODAL */}
        {isEditorOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-[#131C27] rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-[#EBE6DC] dark:border-[#222F3E] space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#EFECE6] dark:border-[#1E2B3A]">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#1E6F43] flex items-center justify-center">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#18221B] dark:text-white">
                      {editingNote ? 'Edit Sermon & Study Note' : 'Create Personal Note'}
                    </h3>
                    <p className="text-xs text-[#5C665F] dark:text-slate-400">
                      Private reflections stored securely on your browser.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-[#18221B] dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveNote} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-[#18221B] dark:text-white">
                      Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g. Walking in Obedience..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] text-xs text-[#18221B] dark:text-white focus:outline-hidden focus:border-[#1E6F43]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#18221B] dark:text-white">
                      Category
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as NoteCategory)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] text-xs text-[#18221B] dark:text-white focus:outline-hidden focus:border-[#1E6F43]"
                    >
                      <option value="Sermon">Sermon</option>
                      <option value="Bible Study">Bible Study</option>
                      <option value="Prayer">Prayer</option>
                      <option value="Personal">Personal</option>
                      <option value="General">General</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#18221B] dark:text-white">
                    Scripture Reference (Optional)
                  </label>
                  <input
                    type="text"
                    value={formScriptureRef}
                    onChange={(e) => setFormScriptureRef(e.target.value)}
                    placeholder="e.g. John 15:1-8, Psalm 91"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] text-xs text-[#18221B] dark:text-white focus:outline-hidden focus:border-[#1E6F43]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#18221B] dark:text-white">
                    Reflections &amp; Notes
                  </label>
                  <textarea
                    rows={8}
                    required
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="Write your personal reflections, message takeaways, or study points here..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] text-xs text-[#18221B] dark:text-white font-sans leading-relaxed focus:outline-hidden focus:border-[#1E6F43]"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-slate-400">
                    {formContent.split(/\s+/).filter(Boolean).length} words &bull; {formContent.length} chars
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditorOpen(false)}
                      className="px-4 py-2 rounded-xl border border-[#EFECE6] dark:border-[#1E2B3A] text-xs font-bold text-[#5C665F] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-[#1E6F43] hover:bg-[#175835] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      {editingNote ? 'Save Changes' : 'Create Note'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
