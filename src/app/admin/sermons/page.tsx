'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminNavigationShell } from '@/components/layout/AdminNavigationShell';
import { db, storage } from '@/lib/firebase';
import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  Video,
  Plus,
  Search,
  Edit2,
  Trash2,
  FileText,
  CheckCircle2,
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
  notesText?: string;
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
  if (match && match[1]) return match[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) return cleanUrl;
  return '';
};

const formatDateTimeDisplay = (rawDate: any): string => {
  if (!rawDate) return 'Not published';
  try {
    let d: Date;
    if (typeof rawDate === 'string') {
      d = new Date(rawDate);
    } else if (rawDate?.seconds) {
      d = new Date(rawDate.seconds * 1000);
    } else if (rawDate instanceof Date) {
      d = rawDate;
    } else {
      return 'Not published';
    }

    if (isNaN(d.getTime())) return 'Not published';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = String(hours).padStart(2, '0');

    return `${day}-${month}-${year} at ${hoursStr}:${minutes} ${ampm}`;
  } catch {
    return 'Not published';
  }
};

// Canvas-based image compression to ensure thumbnail stays well under Firestore 1MB limit
const compressImage = async (
  file: File,
  maxWidth = 1280,
  maxHeight = 720,
  quality = 0.82
): Promise<{ blob: Blob; dataUrl: string }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({ blob, dataUrl });
          } else {
            reject(new Error('Canvas blob conversion failed'));
          }
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };
    img.src = objectUrl;
  });
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

  // Thumbnail File State
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [isUploadingThumb, setIsUploadingThumb] = useState(false);
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);

  // Sermon Notes Document State (Matching Mobile Exact Feature Parity)
  const [notesFile, setNotesFile] = useState<File | null>(null);
  const [notesUrl, setNotesUrl] = useState<string>('');
  const [notesFileName, setNotesFileName] = useState<string>('');
  const [notesFileType, setNotesFileType] = useState<string>(''); // 'pdf' | 'doc' | 'docx' | 'txt'
  const [notesFileSize, setNotesFileSize] = useState<number | undefined>(undefined);
  const [notesText, setNotesText] = useState<string>('');
  const [isUploadingNotes, setIsUploadingNotes] = useState(false);
  const notesFileInputRef = useRef<HTMLInputElement | null>(null);

  // Custom Category Creation Modal
  const [showNewCatModal, setShowNewCatModal] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');

  // Preview & Delete Confirmation
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FirebaseSermonItem | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

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
          notesText: d.notesText || '',
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
    setThumbnailFile(null);
    setFormStatus('Published');
    setFormScheduledDate(new Date().toISOString().slice(0, 10));
    setFormScheduledTime('08:00 PM');
    setFormNotifyMembers(true);
    setFormAutoSend(false);
    setFormCategories(['Sunday Service']);
    setNotesFile(null);
    setNotesUrl('');
    setNotesFileName('');
    setNotesFileType('');
    setNotesFileSize(undefined);
    setNotesText('');
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
    setThumbnailFile(null);
    setFormStatus((item.status as any) || 'Published');
    setFormScheduledDate(item.scheduledDate || new Date().toISOString().slice(0, 10));
    setFormScheduledTime(item.scheduledTime || '08:00 PM');
    setFormNotifyMembers(item.notifyMembers !== false);
    setFormAutoSend(!!item.autoSend);

    const cats = item.categories
      ? item.categories.split(';').map((c) => c.trim()).filter(Boolean)
      : [item.category || 'Sunday Service'];
    setFormCategories(cats);

    // Load Sermon Notes Document
    setNotesFile(null);
    setNotesUrl(item.notesUrl || '');
    setNotesFileName(item.notesFileName || '');
    setNotesFileType(item.notesFileType || '');
    setNotesFileSize(item.notesFileSize);
    setNotesText(item.notesText || '');

    setEditorOpen(true);
  };

  // Category Toggle inside editor form
  const toggleFormCategory = (cat: string) => {
    setFormCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  // Handle local 16:9 thumbnail upload with automatic Canvas compression and Firebase Storage upload
  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notify('Please select a valid image file');
      return;
    }

    setIsUploadingThumb(true);
    setThumbnailFile(file);

    try {
      // 1. Compress image to 1280x720 16:9 format
      const { blob, dataUrl } = await compressImage(file, 1280, 720, 0.82);

      // Temporary local preview
      setFormThumbnailUrl(dataUrl);

      // 2. Upload to Firebase Storage so the URL is short and never exceeds Firestore 1MB limit
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `Rhema Church/common/sermons/thumbnails/thumb_${Date.now()}_${cleanName}.jpg`;
      const fileRef = storageRef(storage, storagePath);
      await uploadBytes(fileRef, blob);
      const cloudUrl = await getDownloadURL(fileRef);

      // 3. Set persistent Firebase Storage download URL
      setFormThumbnailUrl(cloudUrl);
      notify('Custom thumbnail uploaded to Cloud Storage');
    } catch (uploadErr) {
      console.warn('Could not upload thumbnail to Firebase Storage, using compressed local fallback:', uploadErr);
      // Even in fallback mode, the compressed dataUrl is only ~100KB, guaranteed < 500,000 bytes
      notify('Custom thumbnail compressed and ready');
    } finally {
      setIsUploadingThumb(false);
    }
  };

  // Handle Sermon Notes Document file selection (Max 20MB: PDF, Word, TXT)
  const handleNotesFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = file.name;
    const ext = name.split('.').pop()?.toLowerCase() || '';

    if (!['pdf', 'doc', 'docx', 'txt'].includes(ext)) {
      setFormError('Please select a PDF (.pdf), Word document (.doc, .docx), or Text document (.txt).');
      return;
    }

    // Max 20 MB = 20 * 1024 * 1024 bytes
    const MAX_DOC_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_DOC_SIZE) {
      setFormError(`Document Limit Exceeded: The selected file is ${(file.size / (1024 * 1024)).toFixed(1)} MB. The maximum allowed file size is 20 MB.`);
      return;
    }

    let fType = 'pdf';
    if (ext === 'doc' || ext === 'docx') fType = ext;
    else if (ext === 'txt') fType = 'txt';

    setNotesFile(file);
    setNotesFileName(name);
    setNotesFileType(fType);
    setNotesFileSize(file.size);
    setFormError(null);

    if (ext === 'txt') {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setNotesText(reader.result);
        }
      };
      reader.readAsText(file);
    } else {
      setNotesText('');
    }
  };

  const handleRemoveNotes = () => {
    setNotesFile(null);
    setNotesUrl('');
    setNotesFileName('');
    setNotesFileType('');
    setNotesFileSize(undefined);
    setNotesText('');
    if (notesFileInputRef.current) {
      notesFileInputRef.current.value = '';
    }
  };

  // Save Sermon (Create or Update) + Trigger FCM Push Notification
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

    // 1. Process Thumbnail URL (Ensure it never exceeds Firestore document limit of 1MB)
    let finalThumbUrl = formThumbnailUrl.trim();
    if (thumbnailFile && (!finalThumbUrl || finalThumbUrl.startsWith('data:'))) {
      try {
        setIsUploadingThumb(true);
        const { blob, dataUrl } = await compressImage(thumbnailFile, 1280, 720, 0.82);
        try {
          const cleanName = thumbnailFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const storagePath = `Rhema Church/common/sermons/thumbnails/thumb_${Date.now()}_${cleanName}.jpg`;
          const fileRef = storageRef(storage, storagePath);
          await uploadBytes(fileRef, blob);
          finalThumbUrl = await getDownloadURL(fileRef);
          setFormThumbnailUrl(finalThumbUrl);
        } catch {
          // If cloud upload fails, use the compressed canvas string which is only ~100KB
          finalThumbUrl = dataUrl;
        }
      } catch (cErr) {
        console.warn('Canvas compression failed:', cErr);
      } finally {
        setIsUploadingThumb(false);
      }
    }

    // Safety guard: if string is somehow still over 500,000 chars, drop it or clear to avoid crashing Firestore
    if (finalThumbUrl.length > 500000) {
      finalThumbUrl = '';
    }

    // 2. Upload Sermon Notes Document to Cloud Storage if new file selected
    let finalNotesUrl = notesUrl;
    if (notesFile) {
      try {
        setIsUploadingNotes(true);
        const cleanName = (notesFileName || notesFile.name).replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `Rhema Church/common/sermons/notes/${Date.now()}_${cleanName}`;
        const fileRef = storageRef(storage, storagePath);
        await uploadBytes(fileRef, notesFile);
        finalNotesUrl = await getDownloadURL(fileRef);
        setNotesUrl(finalNotesUrl);
      } catch (notesErr) {
        console.warn('Could not upload sermon notes document to Firebase Storage:', notesErr);
        // Retain document metadata and proceed gracefully
      } finally {
        setIsUploadingNotes(false);
      }
    }

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
      thumbnailUrl: finalThumbUrl,
      imageUrl: finalThumbUrl,
      status: finalStatus,
      scheduledDate: finalStatus === 'Scheduled' ? formScheduledDate : null,
      scheduledTime: finalStatus === 'Scheduled' ? formScheduledTime : null,
      scheduledPublishAt: finalStatus === 'Scheduled' ? `${formScheduledDate}T${formScheduledTime}:00Z` : null,
      publishedAt: finalStatus === 'Published' ? new Date().toISOString() : null,
      notifyMembers: formNotifyMembers,
      autoSend: formAutoSend,
      notesUrl: finalNotesUrl || '',
      notesFileName: notesFileName || '',
      notesFileType: notesFileType || '',
      notesFileSize: notesFileSize || 0,
      notesText: notesText || '',
      updatedAt: serverTimestamp(),
    };

    try {
      let savedSermonId = editingId;

      if (editingId) {
        const docRef = doc(db, 'Rhema Church', 'rhema', 'sermons', editingId);
        await updateDoc(docRef, payload);
        notify(`Updated sermon: ${formTitleEn}`);
      } else {
        const colRef = collection(db, 'Rhema Church', 'rhema', 'sermons');
        const newDoc = await addDoc(colRef, {
          ...payload,
          createdAt: serverTimestamp(),
        });
        savedSermonId = newDoc.id;
        notify(`Created sermon: ${formTitleEn}`);
      }

      // 🔔 Dispatch Mobile Push Notification when sermon is Published (Exact Mobile Parity)
      if (finalStatus === 'Published') {
        try {
          const churchId = 'rhema';
          const todayIsoStr = new Date().toISOString().slice(0, 10);
          const broadcastData = {
            title: `🎧 New Sermon: ${formTitleEn.trim()}`,
            content: `New sermon "${formTitleEn.trim()}" preached on ${formDate} by ${formPastor.trim() || 'Pastor'} is now available. Watch/listen now!`,
            date: todayIsoStr,
            sermonDate: formDate,
            type: 'sermon',
            targetChurchId: churchId,
            sermonId: savedSermonId,
            imageUrl: finalThumbUrl || '',
            screen: 'SermonVideo',
            createdAt: serverTimestamp(),
          };

          // Dispatch single canonical broadcast to Rhema Church/{churchId}/broadcasts (Matching mobile app exactly)
          await addDoc(collection(db, 'Rhema Church', churchId, 'broadcasts'), broadcastData);

          notify(`🚀 Sermon published & push notification broadcasted to all mobile apps!`);
        } catch (notifErr) {
          console.warn('⚠️ Push notification broadcast warning:', notifErr);
        }
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

          {/* 1. TOP SUMMARY CARDS (Equal Width, Fill 100% Available Content Area) */}
          <div
            className={`grid gap-4 sm:gap-5 w-full ${
              stats.scheduled > 0
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                : 'grid-cols-1 sm:grid-cols-3'
            }`}
          >
            {/* Card 1: PUBLISHED */}
            <div
              onClick={() => setActiveFilter(activeFilter === 'Published' ? 'All' : 'Published')}
              className={`p-6 rounded-3xl border transition-all cursor-pointer shadow-sm relative overflow-hidden flex flex-col justify-between h-36 w-full ${
                activeFilter === 'Published'
                  ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400/50 hover:shadow-md'
              }`}
            >
              <div className="w-10 h-1.5 rounded-full bg-emerald-500" />
              <div>
                <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white block tracking-tight">
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
              onClick={() => setActiveFilter(activeFilter === 'Drafts' ? 'All' : 'Drafts')}
              className={`p-6 rounded-3xl border transition-all cursor-pointer shadow-sm relative overflow-hidden flex flex-col justify-between h-36 w-full ${
                activeFilter === 'Drafts'
                  ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/20 ring-2 ring-amber-500/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-400/50 hover:shadow-md'
              }`}
            >
              <div className="w-10 h-1.5 rounded-full bg-amber-500" />
              <div>
                <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white block tracking-tight">
                  {stats.drafts}
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mt-1 block">
                  DRAFTS
                </span>
                <span className="text-[11px] text-slate-400 font-medium">Tap to filter</span>
              </div>
            </div>

            {/* Card 3: SCHEDULED (if any scheduled) */}
            {stats.scheduled > 0 && (
              <div
                onClick={() => setActiveFilter(activeFilter === 'Scheduled' ? 'All' : 'Scheduled')}
                className={`p-6 rounded-3xl border transition-all cursor-pointer shadow-sm relative overflow-hidden flex flex-col justify-between h-36 w-full ${
                  activeFilter === 'Scheduled'
                    ? 'border-purple-500 bg-purple-50/70 dark:bg-purple-950/20 ring-2 ring-purple-500/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-purple-400/50 hover:shadow-md'
                }`}
              >
                <div className="w-10 h-1.5 rounded-full bg-purple-500" />
                <div>
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white block tracking-tight">
                    {stats.scheduled}
                  </span>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mt-1 block">
                    SCHEDULED
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">Tap to filter</span>
                </div>
              </div>
            )}

            {/* Card 4 (or 3): SERIES */}
            <div
              onClick={() => setActiveFilter('All')}
              className="p-6 rounded-3xl border border-blue-200/80 dark:border-blue-900/40 bg-white dark:bg-slate-900 hover:border-blue-400/50 hover:shadow-md transition-all cursor-pointer shadow-sm relative overflow-hidden flex flex-col justify-between h-36 w-full"
            >
              <div className="w-10 h-1.5 rounded-full bg-blue-600" />
              <div>
                <span className="text-3xl sm:text-4xl font-extrabold text-blue-600 dark:text-blue-400 block tracking-tight">
                  {stats.seriesCount}
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xs font-black uppercase tracking-wider text-blue-950 dark:text-blue-200">
                    SERIES
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                </div>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold">
                  Active ✓
                </span>
              </div>
            </div>
          </div>

          {/* 2. CATEGORY FILTER (Organized wrapped layout with real counts) */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
              <span>Filter by Series &amp; Category</span>
              <span>{filteredSermons.length} sermons</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
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

          {/* 4. SERMONS LISTING (Responsive 2 or 3-column Grid Layout) */}
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
            <div className="space-y-8">
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
                    <div key={categoryName} className="space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                          {categoryName}
                        </h3>
                        <span className="text-[11px] text-slate-400 font-bold">
                          ({catSermons.length})
                        </span>
                      </div>

                      {/* Responsive 2 or 3 Column Sermon Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
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
                              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden hover:border-red-500/40 hover:shadow-lg transition-all flex flex-col justify-between group"
                            >
                              {/* 16:9 Thumbnail Header with Play Button & Badges */}
                              <div
                                onClick={() => {
                                  if (cleanYt) {
                                    setPreviewVideoUrl(
                                      `https://www.youtube.com/embed/${cleanYt}?autoplay=1`
                                    );
                                  }
                                }}
                                className="relative aspect-video w-full bg-slate-950 overflow-hidden cursor-pointer"
                              >
                                {thumbUri ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img
                                    src={thumbUri}
                                    alt={sermon.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                                    <Video size={36} />
                                  </div>
                                )}

                                {/* Play button overlay */}
                                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 flex items-center justify-center transition-colors">
                                  <div className="w-10 h-10 rounded-full bg-white/95 text-black flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                                    <Play size={16} className="ml-0.5 fill-black" />
                                  </div>
                                </div>

                                {/* Duration Badge in bottom-right */}
                                {sermon.duration && (
                                  <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-black/80 backdrop-blur-sm text-white text-[10px] font-bold flex items-center gap-1 shadow">
                                    <Clock size={10} />
                                    <span>{sermon.duration}</span>
                                  </div>
                                )}

                                {/* Status Badge top-left */}
                                <div className="absolute top-2.5 left-2.5">
                                  <span
                                    className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-sm ${
                                      sermon.status === 'Published'
                                        ? 'bg-emerald-500/90 text-white'
                                        : sermon.status === 'Scheduled'
                                        ? 'bg-purple-500/90 text-white'
                                        : 'bg-amber-500/90 text-white'
                                    }`}
                                  >
                                    {sermon.status}
                                  </span>
                                </div>

                                {/* Notes Indicator Badge top-right */}
                                {(sermon.notesUrl || sermon.notesFileName) && (
                                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-purple-600/90 text-white text-[10px] font-bold flex items-center gap-1 backdrop-blur-sm shadow">
                                    <Paperclip size={10} />
                                    <span>NOTES</span>
                                  </div>
                                )}
                              </div>

                              {/* Sermon Details */}
                              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider">
                                      {sermon.category || 'Sunday Service'}
                                    </span>
                                    {sermon.scripture && (
                                      <span className="text-[11px] text-slate-500 font-medium truncate max-w-[160px]">
                                        📖 {sermon.scripture}
                                      </span>
                                    )}
                                  </div>

                                  {/* English Title */}
                                  <h4 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1 leading-snug">
                                    {sermon.titleEn || sermon.title}
                                  </h4>

                                  {/* Telugu Title */}
                                  {(sermon.titleTelugu || sermon.titleTe) && (
                                    <p className="text-xs text-amber-700 dark:text-amber-400 font-serif font-medium line-clamp-1">
                                      {sermon.titleTelugu || sermon.titleTe}
                                    </p>
                                  )}

                                  {/* Preacher & Service Date */}
                                  <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5 pt-0.5">
                                    <span className="font-semibold text-slate-900 dark:text-white">
                                      {sermon.pastor}
                                    </span>
                                    <span>•</span>
                                    <span>{sermon.date}</span>
                                  </div>

                                  {/* Published Timestamp */}
                                  <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-0.5">
                                    <Megaphone size={12} className="text-red-500 shrink-0" />
                                    <span>Published: {publishedDateText}</span>
                                  </p>

                                  {/* Attached Sermon Notes Document Link if present */}
                                  {(sermon.notesUrl || sermon.notesFileName) && (
                                    <a
                                      href={sermon.notesUrl || '#'}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline pt-1"
                                      onClick={(e) => {
                                        if (!sermon.notesUrl) e.preventDefault();
                                      }}
                                    >
                                      <FileText size={12} />
                                      <span className="truncate max-w-[200px]">
                                        {sermon.notesFileName || 'Sermon Notes Document'}
                                      </span>
                                      <ExternalLink size={10} />
                                    </a>
                                  )}
                                </div>

                                {/* Action Buttons: EDIT & DEL */}
                                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(sermon)}
                                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs flex items-center gap-1.5 transition-colors"
                                  >
                                    <Edit2 size={13} />
                                    <span className="text-[11px] uppercase font-bold tracking-wider">
                                      EDIT
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setDeleteTarget(sermon)}
                                    className="px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-bold text-xs flex items-center gap-1.5 transition-colors"
                                  >
                                    <Trash2 size={13} />
                                    <span className="text-[11px] uppercase font-bold tracking-wider">
                                      DEL
                                    </span>
                                  </button>
                                </div>
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

                  {/* 16:9 Thumbnail Custom Upload */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      CUSTOM THUMBNAIL (16:9 FORMAT)
                    </label>

                    <div className="space-y-3">
                      {formThumbnailUrl ? (
                        <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 max-w-sm">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={formThumbnailUrl}
                            alt="Thumbnail preview"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setFormThumbnailUrl('');
                              setThumbnailFile(null);
                            }}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => thumbnailInputRef.current?.click()}
                          className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-red-500/50 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50 dark:bg-slate-950/40"
                        >
                          <Upload size={24} className="mx-auto text-slate-400 mb-1.5" />
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {isUploadingThumb ? 'Uploading thumbnail to Cloud...' : 'Upload 16:9 Custom Thumbnail'}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Recommended size 1280x720 (Landscape format) • Auto-uploaded to Cloud Storage
                          </p>
                        </div>
                      )}

                      <input
                        ref={thumbnailInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleThumbnailUpload}
                      />
                    </div>
                  </div>

                  {/* Scripture Reference */}
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

                  {/* ───────────────────────────────────────────────────────────── */}
                  {/* SERMON NOTES DOCUMENT (OPTIONAL) - Exact Mobile Parity */}
                  {/* ───────────────────────────────────────────────────────────── */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                          <BookOpen size={16} />
                        </span>
                        <h3 className="text-xs font-black uppercase tracking-wider text-purple-950 dark:text-purple-300">
                          SERMON NOTES DOCUMENT
                        </h3>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                        OPTIONAL
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Attach sermon notes or study outline in PDF, Word, or Text format (Max 20 MB). Members can read these notes directly inside the app while watching.
                    </p>

                    {/* Supported Format Pills */}
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400">
                        PDF <span className="font-normal opacity-80">.pdf</span>
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
                        Word <span className="font-normal opacity-80">.doc, .docx</span>
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
                        Text <span className="font-normal opacity-80">.txt</span>
                      </span>
                    </div>

                    {/* Selected Document or Upload Area */}
                    {notesFileName || notesUrl || notesFile ? (
                      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-3">
                        <div className="flex items-center gap-3">
                          {/* File Type Badge */}
                          <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-xs border ${
                              notesFileType === 'pdf'
                                ? 'bg-red-100 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-600'
                                : notesFileType === 'doc' || notesFileType === 'docx'
                                ? 'bg-blue-100 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-600'
                                : 'bg-emerald-100 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-600'
                            }`}
                          >
                            {(notesFileType || 'DOC').toUpperCase()}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {notesFileName || 'Sermon_Notes_Document'}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {notesFileSize ? (
                                <span>{(notesFileSize / 1024).toFixed(0)} KB • </span>
                              ) : null}
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                <CheckCircle2 size={11} />
                                {notesFile ? 'Ready to upload on save' : 'Uploaded to Cloud Storage'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Text file content snippet preview if text format */}
                        {notesText ? (
                          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
                            <span className="font-bold text-[10px] uppercase text-slate-400 block mb-1">
                              Text Content Preview:
                            </span>
                            <p className="line-clamp-2 italic font-mono">
                              {notesText}
                            </p>
                          </div>
                        ) : null}

                        {/* Replace / Remove Document Actions */}
                        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => notesFileInputRef.current?.click()}
                            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5"
                          >
                            <Paperclip size={13} />
                            <span>Replace Document</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleRemoveNotes}
                            className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1.5"
                          >
                            <Trash2 size={13} />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => notesFileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-purple-500/50 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/70 dark:bg-slate-950/40 flex flex-col items-center justify-center space-y-2"
                      >
                        <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-300 flex items-center justify-center">
                          <Upload size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            Choose Sermon Notes Document
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Tap to select PDF, Word (.doc, .docx), or Text (.txt) file • Up to 20 MB
                          </p>
                        </div>
                        <div className="pt-1">
                          <span className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-bold shadow-sm inline-flex items-center gap-1.5">
                            <Paperclip size={13} />
                            <span>Browse Files (Max 20 MB)</span>
                          </span>
                        </div>
                      </div>
                    )}

                    <input
                      ref={notesFileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                      className="hidden"
                      onChange={handleNotesFileSelect}
                    />
                  </div>

                  {/* ───────────────────────────────────────────────────────────── */}
                  {/* PUBLISH STATUS - Exact Mobile Parity (3 Radio Cards) */}
                  {/* ───────────────────────────────────────────────────────────── */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <Radio size={16} />
                      </span>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                        PUBLISH STATUS
                      </h3>
                    </div>

                    <div className="space-y-2.5">
                      {/* Option 1: Publish Now */}
                      <div
                        onClick={() => setFormStatus('Published')}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                          formStatus === 'Published'
                            ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20 ring-1 ring-emerald-500/30'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                              formStatus === 'Published'
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}
                          >
                            <Send size={16} />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white block">
                              Publish Now
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              Live immediately on Member Sermons View
                            </span>
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                            formStatus === 'Published'
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                          }`}
                        >
                          {formStatus === 'Published' && <Check size={12} strokeWidth={3} />}
                        </div>
                      </div>

                      {/* Option 2: Scheduled */}
                      <div
                        onClick={() => setFormStatus('Scheduled')}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                          formStatus === 'Scheduled'
                            ? 'border-purple-500 bg-purple-50/60 dark:bg-purple-950/20 ring-1 ring-purple-500/30'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                              formStatus === 'Scheduled'
                                ? 'bg-purple-500 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}
                          >
                            <Clock size={16} />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white block">
                              Scheduled
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              Auto-publishes on {formScheduledDate} at {formScheduledTime}
                            </span>
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                            formStatus === 'Scheduled'
                              ? 'bg-purple-500 border-purple-500 text-white'
                              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                          }`}
                        >
                          {formStatus === 'Scheduled' && <Check size={12} strokeWidth={3} />}
                        </div>
                      </div>

                      {/* Scheduled Date/Time Inputs if Scheduled is selected */}
                      {formStatus === 'Scheduled' && (
                        <div className="p-3.5 bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in">
                          <div>
                            <label className="block text-[10px] font-bold text-purple-950 dark:text-purple-200 uppercase mb-1">
                              Scheduled Date
                            </label>
                            <input
                              type="date"
                              value={formScheduledDate}
                              onChange={(e) => setFormScheduledDate(e.target.value)}
                              className="w-full bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
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
                              className="w-full bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>
                      )}

                      {/* Option 3: Save as Draft */}
                      <div
                        onClick={() => setFormStatus('Draft')}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                          formStatus === 'Draft'
                            ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/20 ring-1 ring-amber-500/30'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                              formStatus === 'Draft'
                                ? 'bg-amber-500 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}
                          >
                            <FileText size={16} />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white block">
                              Save as Draft
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              Saved privately, hidden from members
                            </span>
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                            formStatus === 'Draft'
                              ? 'bg-amber-500 border-amber-500 text-white'
                              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                          }`}
                        >
                          {formStatus === 'Draft' && <Check size={12} strokeWidth={3} />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sermon Description / Pastoral Notes */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      SERMON DESCRIPTION / PASTORAL NOTES
                    </label>
                    <textarea
                      rows={3}
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Provide sermon context, points, or pastoral remarks..."
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white font-medium"
                    />
                  </div>

                  {/* Action Buttons matching Mobile */}
                  <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      disabled={formSubmitting || isUploadingNotes || isUploadingThumb}
                      onClick={() => handleSaveSermon('Published')}
                      className="w-full py-3.5 px-4 rounded-2xl bg-black dark:bg-white text-white dark:text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition-all"
                    >
                      {formSubmitting || isUploadingNotes || isUploadingThumb ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <Send size={16} />
                      )}
                      <span>
                        {isUploadingThumb
                          ? 'Uploading Custom Thumbnail...'
                          : isUploadingNotes
                          ? 'Uploading Sermon Notes...'
                          : formSubmitting
                          ? 'Saving Sermon...'
                          : '🚀 Save & Publish Now'}
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={formSubmitting || isUploadingNotes || isUploadingThumb}
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
                        ← Back to list
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
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Add New Sermon Series
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowNewCatModal(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>

                <p className="text-xs text-slate-500">
                  Enter the name of the new sermon series or service category to add to the church catalog:
                </p>

                <input
                  type="text"
                  value={newCatInput}
                  onChange={(e) => setNewCatInput(e.target.value)}
                  placeholder="e.g. Kingdom Foundations"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium"
                />

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewCatModal(false)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddNewCategory}
                    className="px-4 py-1.5 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 shadow-sm"
                  >
                    Add Series
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DELETE CONFIRMATION MODAL */}
          {deleteTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                  <div className="p-2 rounded-xl bg-red-100 dark:bg-red-950/50">
                    <Trash2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Delete Sermon?
                    </h3>
                    <p className="text-[11px] text-slate-500">Permanent Firestore removal</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Are you sure you want to delete{' '}
                  <span className="font-bold text-slate-900 dark:text-white">
                    &quot;{deleteTarget.titleEn || deleteTarget.title}&quot;
                  </span>
                  ? This action cannot be undone.
                </p>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    disabled={deleteSubmitting}
                    onClick={() => setDeleteTarget(null)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleteSubmitting}
                    onClick={handleDeleteSermon}
                    className="px-4 py-1.5 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 shadow-sm flex items-center gap-1.5"
                  >
                    {deleteSubmitting ? <RefreshCw size={14} className="animate-spin" /> : null}
                    <span>Delete Permanently</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIDEO PREVIEW MODAL */}
          {previewVideoUrl && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
              <div className="relative w-full max-w-3xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setPreviewVideoUrl(null)}
                  className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/70 text-white hover:bg-black transition-colors"
                >
                  <X size={18} />
                </button>
                <iframe
                  src={previewVideoUrl}
                  title="Sermon Video Player"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}
        </div>
      </AdminNavigationShell>
    </ProtectedRoute>
  );
}
