'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AdminNavigationShell } from '@/components/layout/AdminNavigationShell';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import QRCode from 'qrcode';
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
  CalendarDays,
  Users,
  CheckCircle2,
  Clock,
  Search,
  Plus,
  Edit3,
  Trash2,
  MapPin,
  ChevronRight,
  Download,
  RefreshCw,
  X,
  AlertCircle,
  Sparkles,
  Calendar as CalendarIcon,
  QrCode,
  HeartHandshake,
  Music,
  ArrowLeft,
  Image as ImageIcon,
  Vote,
  Printer,
  Check,
  Building,
  FileText,
  Repeat,
  Radio,
  ExternalLink,
} from 'lucide-react';

export type EventStatus = 'Upcoming' | 'Published' | 'Draft' | 'Past' | 'Completed' | 'Cancelled';

export interface FirebaseEventRecord {
  id: string;
  title: string;
  titleTe?: string;
  theme?: string;
  eventType?: string;
  category: string;
  description?: string;
  descriptionTe?: string;
  isRecurring?: boolean;
  startDate: string;
  endDate?: string;
  date?: string;
  startTime: string;
  endTime?: string;
  time?: string;
  venueName: string;
  venueNameTe?: string;
  venue?: string;
  location?: string;
  address?: string;
  roomOrHall?: string;
  keynoteSpeaker?: string;
  speaker?: string;
  bannerGradient?: string;
  bannerUrl?: string;
  posterUrl?: string;
  attachedSetlists?: string[];
  qrCodeRequired?: boolean;
  rsvpEnabled?: boolean;
  volunteerEnabled?: boolean;
  status: EventStatus;
  maxCapacity: number;
  rsvpStats?: {
    goingCount: number;
    interestedCount: number;
    notGoingCount: number;
    totalResponses: number;
  };
  createdAt?: any;
  updatedAt?: any;
}

export interface FirebaseRsvpRecord {
  id: string;
  memberId: string;
  memberName: string;
  memberPhone?: string;
  memberPhoto?: string;
  status: 'Going' | 'Interested' | 'Not Going' | 'Not Interested';
  rsvpStatus?: string;
  isRsvp?: boolean;
  eventId: string;
  eventTitle?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface SongOption {
  id: string;
  title: string;
  category?: string;
}

const EVENT_TYPE_OPTIONS = [
  'Sunday Service',
  'All Night Prayer',
  'Bible study',
  'Fasting Prayer',
  'Special Conference',
  'Youth Night',
  'Worship Night',
  'Prayer Vigil',
  'Community Outreach',
  'Other',
];

export default function AdminEventsPage() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'events' | 'rsvps'>('events');

  // Core Data States
  const [events, setEvents] = useState<FirebaseEventRecord[]>([]);
  const [attendees, setAttendees] = useState<FirebaseRsvpRecord[]>([]);
  const [availableSongs, setAvailableSongs] = useState<SongOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PUBLISHED' | 'UPCOMING' | 'PAST'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // RSVP Roster Filters
  const [rsvpEventFilter, setRsvpEventFilter] = useState<string>('ALL');
  const [rsvpStatusFilter, setRsvpStatusFilter] = useState<string>('ALL');
  const [rsvpSearchQuery, setRsvpSearchQuery] = useState('');

  // Modals & Views
  const [isFormViewOpen, setIsFormViewOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<FirebaseEventRecord | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<FirebaseEventRecord | null>(null);
  const [qrModalEvent, setQrModalEvent] = useState<FirebaseEventRecord | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [attendModalEvent, setAttendModalEvent] = useState<FirebaseEventRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [customSetlistInput, setCustomSetlistInput] = useState('');

  // Form Validation & Errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Format Helper: Display Date as DD-MM-YYYY matching mobile app
  const formatDisplayDate = (dateStr?: string) => {
    if (!dateStr) return 'TBA';
    // If format is YYYY-MM-DD
    if (dateStr.includes('-') && dateStr.split('-')[0].length === 4) {
      const [year, month, day] = dateStr.split('-');
      return `${day}-${month}-${year}`;
    }
    return dateStr;
  };

  // Load Events & RSVPs from Firestore
  const loadEvents = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      const colRef = collection(db, 'Rhema Church', 'rhema', 'events');
      const snap = await getDocs(colRef);
      const items: FirebaseEventRecord[] = [];
      const allRsvps: FirebaseRsvpRecord[] = [];

      for (const docSnap of snap.docs) {
        const d = docSnap.data();
        const eventId = docSnap.id;

        const item: FirebaseEventRecord = {
          id: eventId,
          title: d.title || 'Untitled Gathering',
          titleTe: d.titleTe || '',
          theme: d.theme || '',
          eventType: d.eventType || d.category || 'Sunday Service',
          category: d.category || d.eventType || 'Sunday Service',
          description: d.description || '',
          descriptionTe: d.descriptionTe || '',
          isRecurring: Boolean(d.isRecurring),
          startDate: d.startDate || d.date || '',
          endDate: d.endDate || d.startDate || d.date || '',
          date: d.date || d.startDate || '',
          startTime: d.startTime || d.time || '09:00 AM',
          endTime: d.endTime || '',
          time: d.time || d.startTime || '09:00 AM',
          venueName: d.venueName || d.venue || d.location || 'Church Sanctuary',
          venueNameTe: d.venueNameTe || '',
          venue: d.venue || d.venueName || d.location || 'Church Sanctuary',
          location: d.location || d.venueName || 'Church Sanctuary',
          address: d.address || d.location || '',
          roomOrHall: d.roomOrHall || '',
          keynoteSpeaker: d.keynoteSpeaker || d.speaker || 'Pastor',
          speaker: d.speaker || d.keynoteSpeaker || 'Pastor',
          bannerGradient: d.bannerGradient || 'from-emerald-700 to-slate-900',
          bannerUrl: d.bannerUrl || d.posterUrl || '',
          posterUrl: d.posterUrl || d.bannerUrl || '',
          attachedSetlists: Array.isArray(d.attachedSetlists) ? d.attachedSetlists : [],
          qrCodeRequired: Boolean(d.qrCodeRequired),
          rsvpEnabled: d.rsvpEnabled !== false,
          volunteerEnabled: Boolean(d.volunteerEnabled),
          status: (d.status as EventStatus) || 'Published',
          maxCapacity: Number(d.maxCapacity || 500),
          rsvpStats: {
            goingCount: 0,
            interestedCount: 0,
            notGoingCount: 0,
            totalResponses: 0,
          },
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        };
        items.push(item);

        // Fetch subcollection RSVPs
        try {
          const rsvpCol = collection(db, 'Rhema Church', 'rhema', 'events', eventId, 'rsvps');
          const rsvpSnap = await getDocs(rsvpCol);
          rsvpSnap.forEach((rDoc) => {
            const rd = rDoc.data();
            allRsvps.push({
              id: rDoc.id,
              memberId: rd.memberId || rDoc.id,
              memberName: rd.memberName || 'Church Member',
              memberPhone: rd.memberPhone || '',
              memberPhoto: rd.memberPhoto || '',
              status: rd.status || rd.rsvpStatus || 'Going',
              rsvpStatus: rd.rsvpStatus || rd.status || 'Going',
              isRsvp: true,
              eventId,
              eventTitle: item.title,
              createdAt: rd.createdAt,
              updatedAt: rd.updatedAt,
            });
          });
        } catch (rErr) {
          console.warn(`Could not load RSVPs for event ${eventId}:`, rErr);
        }

        // Compute RSVP stats
        const eventRsvps = allRsvps.filter((r) => r.eventId === eventId);
        item.rsvpStats = {
          goingCount: eventRsvps.filter((r) => (r.status || '').toLowerCase() === 'going').length,
          interestedCount: eventRsvps.filter((r) => (r.status || '').toLowerCase() === 'interested').length,
          notGoingCount: eventRsvps.filter((r) =>
            ['not_going', 'notgoing', 'not going'].includes((r.status || '').toLowerCase())
          ).length,
          totalResponses: eventRsvps.length,
        };
      }

      // Sort by startDate descending
      items.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
      setEvents(items);
      setAttendees(allRsvps);

      // Load available songs for setlist picker
      try {
        const songsSnap = await getDocs(collection(db, 'Rhema Church', 'rhema', 'songs'));
        const songsList: SongOption[] = [];
        songsSnap.forEach((docS) => {
          const sd = docS.data();
          songsList.push({ id: docS.id, title: sd.title || 'Untitled Song', category: sd.category });
        });
        setAvailableSongs(songsList);
      } catch {
        // songs optional
      }
    } catch (err: any) {
      console.error('Error loading church events:', err);
      setError('Unable to load events from Firestore. Please verify permissions.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Form State matching mobile app exactly
  const [formData, setFormData] = useState({
    title: '',
    titleTe: '',
    eventType: 'Sunday Service',
    description: '',
    descriptionTe: '',
    isRecurring: false,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    startTime: '09:00 AM',
    endTime: '12:00 PM',
    venueName: '',
    venueNameTe: '',
    address: '',
    posterUrl: '',
    attachedSetlists: [] as string[],
    qrCodeRequired: false,
    rsvpEnabled: false,
    volunteerEnabled: false,
    status: 'Published' as EventStatus,
  });

  const openCreateModal = () => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      title: '',
      titleTe: '',
      eventType: 'Sunday Service',
      description: '',
      descriptionTe: '',
      isRecurring: false,
      startDate: today,
      endDate: today,
      startTime: '09:00 AM',
      endTime: '12:00 PM',
      venueName: '',
      venueNameTe: '',
      address: '',
      posterUrl: '',
      attachedSetlists: [],
      qrCodeRequired: false,
      rsvpEnabled: false,
      volunteerEnabled: false,
      status: 'Published',
    });
    setFormErrors({});
    setEditingEvent(null);
    setIsFormViewOpen(true);
  };

  const openEditModal = (evt: FirebaseEventRecord) => {
    setEditingEvent(evt);
    setFormData({
      title: evt.title,
      titleTe: evt.titleTe || '',
      eventType: evt.eventType || evt.category || 'Sunday Service',
      description: evt.description || '',
      descriptionTe: evt.descriptionTe || '',
      isRecurring: Boolean(evt.isRecurring),
      startDate: evt.startDate || evt.date || '',
      endDate: evt.endDate || evt.startDate || '',
      startTime: evt.startTime || evt.time || '09:00 AM',
      endTime: evt.endTime || '',
      venueName: evt.venueName || evt.venue || '',
      venueNameTe: evt.venueNameTe || '',
      address: evt.address || evt.location || '',
      posterUrl: evt.posterUrl || evt.bannerUrl || '',
      attachedSetlists: evt.attachedSetlists || [],
      qrCodeRequired: Boolean(evt.qrCodeRequired),
      rsvpEnabled: Boolean(evt.rsvpEnabled),
      volunteerEnabled: Boolean(evt.volunteerEnabled),
      status: evt.status || 'Published',
    });
    setFormErrors({});
    setIsFormViewOpen(true);
  };

  // Open QR Modal
  const openQrModal = async (evt: FirebaseEventRecord) => {
    setQrModalEvent(evt);
    try {
      const payload = JSON.stringify({
        eventId: evt.id,
        title: evt.title,
        date: evt.startDate,
        church: 'Rhema Church',
        churchId: 'rhema',
      });
      const dataUrl = await QRCode.toDataURL(payload, {
        width: 380,
        margin: 2,
        color: { dark: '#091528', light: '#FFFFFF' },
      });
      setQrCodeDataUrl(dataUrl);
    } catch (qrErr) {
      console.error('Failed to generate QR Code:', qrErr);
    }
  };

  const downloadQrCode = () => {
    if (!qrCodeDataUrl || !qrModalEvent) return;
    const a = document.createElement('a');
    a.href = qrCodeDataUrl;
    a.download = `Rhema-Event-QR-${qrModalEvent.title.replace(/\s+/g, '-')}.png`;
    a.click();
  };

  // Validation
  const validateEventForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.title.trim()) errors.title = 'Event Title (English) is required';
    if (!formData.startDate) errors.startDate = 'Start date is required';
    if (!formData.startTime) errors.startTime = 'Start time is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Event (Create / Edit)
  const handleSaveEvent = async (publishImmediately: boolean) => {
    if (!validateEventForm()) return;

    try {
      setIsSaving(true);
      const targetStatus: EventStatus = publishImmediately ? 'Published' : 'Draft';

      const payload = {
        title: formData.title.trim(),
        titleTe: formData.titleTe.trim() || null,
        eventType: formData.eventType,
        category: formData.eventType,
        description: formData.description.trim() || null,
        descriptionTe: formData.descriptionTe.trim() || null,
        isRecurring: formData.isRecurring,
        startDate: formData.startDate,
        endDate: formData.endDate || formData.startDate,
        date: formData.startDate,
        startTime: formData.startTime,
        endTime: formData.endTime || null,
        time: formData.startTime,
        venueName: formData.venueName.trim() || 'No Venue',
        venueNameTe: formData.venueNameTe.trim() || null,
        venue: formData.venueName.trim() || 'No Venue',
        location: formData.venueName.trim() || 'No Venue',
        address: formData.address.trim() || null,
        posterUrl: formData.posterUrl.trim() || null,
        bannerUrl: formData.posterUrl.trim() || null,
        attachedSetlists: formData.attachedSetlists,
        qrCodeRequired: formData.qrCodeRequired,
        rsvpEnabled: formData.rsvpEnabled,
        volunteerEnabled: formData.volunteerEnabled,
        status: targetStatus,
        maxCapacity: 500,
        updatedAt: serverTimestamp(),
      };

      if (editingEvent) {
        const docRef = doc(db, 'Rhema Church', 'rhema', 'events', editingEvent.id);
        await updateDoc(docRef, payload);
        showToast(`Event "${formData.title}" updated successfully`);
      } else {
        const colRef = collection(db, 'Rhema Church', 'rhema', 'events');
        await addDoc(colRef, {
          ...payload,
          createdBy: user?.uid || 'admin',
          createdAt: serverTimestamp(),
        });
        showToast(`Event "${formData.title}" created successfully`);
      }

      setIsFormViewOpen(false);
      setEditingEvent(null);
      loadEvents();
    } catch (err: any) {
      console.error('Failed to save event:', err);
      showToast('Error saving event: ' + (err.message || 'Permission denied'));
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Event
  const handleConfirmDelete = async () => {
    if (!deletingEvent) return;
    try {
      setIsDeleting(true);
      const docRef = doc(db, 'Rhema Church', 'rhema', 'events', deletingEvent.id);
      await deleteDoc(docRef);
      showToast(`Event "${deletingEvent.title}" deleted`);
      setDeletingEvent(null);
      loadEvents();
    } catch (err: any) {
      console.error('Failed to delete event:', err);
      showToast('Error deleting event: ' + (err.message || 'Permission denied'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter Counts
  const filterCounts = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const published = events.filter((e) => e.status === 'Published' || e.status === 'Upcoming').length;
    const upcoming = events.filter((e) => e.startDate >= today && e.status !== 'Past' && e.status !== 'Completed').length;
    const past = events.filter((e) => e.startDate < today || e.status === 'Past' || e.status === 'Completed').length;
    return { published, upcoming, past };
  }, [events]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return events.filter((evt) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        evt.title.toLowerCase().includes(q) ||
        (evt.titleTe && evt.titleTe.includes(q)) ||
        (evt.venueName && evt.venueName.toLowerCase().includes(q)) ||
        (evt.address && evt.address.toLowerCase().includes(q));

      const matchesCategory = categoryFilter === 'ALL' || evt.eventType === categoryFilter || evt.category === categoryFilter;

      let matchesPill = true;
      if (activeFilter === 'PUBLISHED') {
        matchesPill = evt.status === 'Published' || evt.status === 'Upcoming';
      } else if (activeFilter === 'UPCOMING') {
        matchesPill = evt.startDate >= today && evt.status !== 'Past' && evt.status !== 'Completed';
      } else if (activeFilter === 'PAST') {
        matchesPill = evt.startDate < today || evt.status === 'Past' || evt.status === 'Completed';
      }

      return matchesSearch && matchesCategory && matchesPill;
    });
  }, [events, searchQuery, categoryFilter, activeFilter]);

  // Filtered RSVPs for Tab 2
  const filteredAttendees = useMemo(() => {
    return attendees.filter((att) => {
      const matchesEvent = rsvpEventFilter === 'ALL' || att.eventId === rsvpEventFilter;
      const matchesStatus = rsvpStatusFilter === 'ALL' || att.status === rsvpStatusFilter;
      const q = rsvpSearchQuery.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        att.memberName.toLowerCase().includes(q) ||
        (att.memberPhone && att.memberPhone.includes(q)) ||
        (att.eventTitle && att.eventTitle.toLowerCase().includes(q));

      return matchesEvent && matchesStatus && matchesSearch;
    });
  }, [attendees, rsvpEventFilter, rsvpStatusFilter, rsvpSearchQuery]);

  return (
    <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
      <AdminNavigationShell>
        <div className="space-y-6">
          {/* Toast Notification */}
          {toastMessage && (
            <div className="fixed top-6 right-6 z-50 bg-slate-900 border border-emerald-500/50 text-emerald-300 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 size={18} className="text-emerald-400" />
              <span className="text-xs font-semibold">{toastMessage}</span>
            </div>
          )}

          {/* PAGE HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-[#091528] text-white shadow-xs">
                <CalendarDays size={24} />
              </span>
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Events</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    Live Firestore
                  </span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Church Events Schedule &bull; RSVP tracking, bilingual details &amp; attendance check-in
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadEvents()}
                disabled={isRefreshing}
                className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-slate-700 dark:text-slate-200"
              >
                <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>

              <button
                type="button"
                onClick={openCreateModal}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus size={16} />
                <span>+ New</span>
              </button>
            </div>
          </div>

          {/* ERROR ALERT */}
          {error && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 flex items-center gap-3 text-xs">
              <AlertCircle size={18} className="text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* STAT FILTER CARDS (Exact match to mobile app top pills)     */}
          {/* ========================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Card 1: PUBLISHED (Green) */}
            <button
              type="button"
              onClick={() => setActiveFilter(activeFilter === 'PUBLISHED' ? 'ALL' : 'PUBLISHED')}
              className={`p-4 rounded-2xl border text-center transition-all cursor-pointer ${
                activeFilter === 'PUBLISHED'
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                  : 'bg-white dark:bg-slate-900 border-emerald-500/40 hover:border-emerald-500'
              }`}
            >
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {filterCounts.published}
              </div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-1 mt-0.5">
                <span>PUBLISHED</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                Active &bull; Tap to filter
              </div>
            </button>

            {/* Card 2: UPCOMING (Blue) */}
            <button
              type="button"
              onClick={() => setActiveFilter(activeFilter === 'UPCOMING' ? 'ALL' : 'UPCOMING')}
              className={`p-4 rounded-2xl border text-center transition-all cursor-pointer ${
                activeFilter === 'UPCOMING'
                  ? 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-500 shadow-sm ring-2 ring-blue-500/20'
                  : 'bg-white dark:bg-slate-900 border-blue-500/40 hover:border-blue-500'
              }`}
            >
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                {filterCounts.upcoming}
              </div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-300 mt-0.5">
                UPCOMING
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                Tap to filter
              </div>
            </button>

            {/* Card 3: PAST (Red/Rose) */}
            <button
              type="button"
              onClick={() => setActiveFilter(activeFilter === 'PAST' ? 'ALL' : 'PAST')}
              className={`p-4 rounded-2xl border text-center transition-all cursor-pointer ${
                activeFilter === 'PAST'
                  ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-500 shadow-sm ring-2 ring-rose-500/20'
                  : 'bg-white dark:bg-slate-900 border-rose-500/40 hover:border-rose-500'
              }`}
            >
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                {filterCounts.past}
              </div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-rose-700 dark:text-rose-300 mt-0.5">
                PAST
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                Tap to filter
              </div>
            </button>
          </div>

          {/* TAB SWITCHER */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('events')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  activeTab === 'events'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <CalendarDays size={13} />
                <span>Events Schedule ({filteredEvents.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('rsvps')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  activeTab === 'rsvps'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Users size={13} />
                <span>RSVP Roster ({attendees.length})</span>
              </button>
            </div>

            {activeFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setActiveFilter('ALL')}
                className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
              >
                Clear filter ({activeFilter})
              </button>
            )}
          </div>

          {/* ========================================================= */}
          {/* TAB 1: EVENTS SCHEDULE                                     */}
          {/* ========================================================= */}
          {activeTab === 'events' && (
            <div className="space-y-4">
              {/* Search & Category Filter */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title, Telugu, venue, speaker or address..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
                  >
                    <option value="ALL">All Event Types</option>
                    {EVENT_TYPE_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Section Heading */}
              <div className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider pt-1 flex items-center justify-between">
                <span>
                  {activeFilter === 'ALL'
                    ? 'ALL CHURCH EVENTS'
                    : activeFilter === 'PUBLISHED'
                    ? 'PUBLISHED EVENTS'
                    : activeFilter === 'UPCOMING'
                    ? 'UPCOMING EVENTS'
                    : 'PAST EVENTS'}
                </span>
                <span className="text-slate-400 font-normal">
                  Showing {filteredEvents.length} gathering{filteredEvents.length === 1 ? '' : 's'}
                </span>
              </div>

              {/* EVENTS LIST (Exact Mobile Card Structure adapted for Web) */}
              {isLoading ? (
                <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
                  <RefreshCw size={24} className="animate-spin text-emerald-500" />
                  <span className="text-xs">Loading church events from Firestore...</span>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
                  <CalendarIcon size={32} className="mx-auto text-slate-400" />
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    No church events found
                  </div>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {searchQuery || categoryFilter !== 'ALL' || activeFilter !== 'ALL'
                      ? 'No events match your search criteria. Try clearing filters.'
                      : 'Create your first church gathering to publish it to members.'}
                  </p>
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    <span>Create Event</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredEvents.map((evt) => {
                    const goingCount = evt.rsvpStats?.goingCount || 0;
                    const poster = evt.posterUrl || evt.bannerUrl;

                    return (
                      <div
                        key={evt.id}
                        className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3.5"
                      >
                        {/* Top Section: Poster & Information */}
                        <div className="flex items-start gap-4">
                          {/* Event Poster / Thumbnail */}
                          <div className="w-28 h-22 sm:w-32 sm:h-24 rounded-2xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 relative">
                            {poster ? (
                              <img
                                src={poster}
                                alt={evt.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div
                                className={`w-full h-full bg-gradient-to-br ${
                                  evt.bannerGradient || 'from-emerald-700 to-slate-900'
                                } flex flex-col items-center justify-center p-2 text-white text-center`}
                              >
                                <CalendarIcon size={20} className="mb-1 text-white/80" />
                                <span className="text-[9px] font-bold uppercase tracking-wider line-clamp-1">
                                  {evt.eventType || 'Event'}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Event Text Info */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <h3 className="text-base sm:text-[17px] font-bold text-slate-900 dark:text-white leading-snug truncate">
                              {evt.title}
                            </h3>

                            {evt.titleTe && (
                              <p className="text-xs font-serif text-amber-600 dark:text-amber-400 truncate">
                                {evt.titleTe}
                              </p>
                            )}

                            <div className="pt-0.5 space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
                              <div className="flex items-center gap-1.5">
                                <CalendarIcon size={12} className="text-slate-400 shrink-0" />
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {formatDisplayDate(evt.startDate)}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <Clock size={12} className="text-slate-400 shrink-0" />
                                <span>
                                  {evt.startTime}
                                  {evt.endTime ? ` — ${evt.endTime}` : ''}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 truncate">
                                <MapPin size={12} className="text-slate-400 shrink-0" />
                                <span className="truncate">
                                  {evt.venueName || evt.location || 'No Venue'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Status & Feature Pills */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                          {/* Completed / Status badge */}
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] ${
                              evt.status === 'Completed' || evt.status === 'Past'
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                : evt.status === 'Draft'
                                ? 'bg-amber-100/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300/40'
                                : 'bg-emerald-100/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40'
                            }`}
                          >
                            <CheckCircle2 size={11} />
                            <span>{evt.status}</span>
                          </span>

                          {/* QR Code Status */}
                          {evt.qrCodeRequired ? (
                            <span className="inline-flex items-center gap-1 font-bold text-amber-700 dark:text-amber-400">
                              <QrCode size={12} />
                              <span>QR Required</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-500">
                              <span>Church QR Allowed</span>
                            </span>
                          )}

                          {/* Volunteer Tag */}
                          {evt.volunteerEnabled && (
                            <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 font-semibold">
                              <HeartHandshake size={12} />
                              <span>Volunteers Open</span>
                            </span>
                          )}

                          {/* Setlists Attached */}
                          {evt.attachedSetlists && evt.attachedSetlists.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                              <Music size={12} />
                              <span>{evt.attachedSetlists.length} Setlist attached</span>
                            </span>
                          )}
                        </div>

                        {/* RSVP Active Pill Banner (Exact Mobile Card Feature) */}
                        <div
                          onClick={() => {
                            setActiveTab('rsvps');
                            setRsvpEventFilter(evt.id);
                          }}
                          className="px-3.5 py-2 rounded-2xl bg-[#EBF3FF] dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-center justify-between text-xs cursor-pointer hover:bg-blue-100/80 dark:hover:bg-blue-900/40 transition-colors"
                        >
                          <span className="font-bold text-[#1E3A8A] dark:text-blue-300 flex items-center gap-1.5">
                            <Vote size={14} className="text-blue-600 dark:text-blue-400" />
                            <span>{evt.rsvpEnabled ? 'RSVP Poll Active' : 'RSVP Disabled'}</span>
                          </span>

                          <span className="font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1">
                            <span>{goingCount} Going &bull; View Roster</span>
                            <ChevronRight size={14} />
                          </span>
                        </div>

                        {/* Action Buttons Row (Exact match to mobile app buttons) */}
                        <div className="grid grid-cols-4 gap-2 pt-1">
                          {/* 1. QR */}
                          <button
                            type="button"
                            onClick={() => openQrModal(evt)}
                            className="py-1.5 px-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <QrCode size={13} className="text-slate-500" />
                            <span>QR</span>
                          </button>

                          {/* 2. Attend */}
                          <button
                            type="button"
                            onClick={() => setAttendModalEvent(evt)}
                            className="py-1.5 px-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Users size={13} className="text-slate-500" />
                            <span>Attend</span>
                          </button>

                          {/* 3. Edit */}
                          <button
                            type="button"
                            onClick={() => openEditModal(evt)}
                            className="py-1.5 px-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Edit3 size={13} className="text-slate-500" />
                            <span>Edit</span>
                          </button>

                          {/* 4. Del */}
                          <button
                            type="button"
                            onClick={() => setDeletingEvent(evt)}
                            className="py-1.5 px-2 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} className="text-rose-500" />
                            <span>Del</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: RSVP ROSTER                                         */}
          {/* ========================================================= */}
          {activeTab === 'rsvps' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={rsvpSearchQuery}
                    onChange={(e) => setRsvpSearchQuery(e.target.value)}
                    placeholder="Search by member name, phone or event..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={rsvpEventFilter}
                    onChange={(e) => setRsvpEventFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
                  >
                    <option value="ALL">All Events ({events.length})</option>
                    {events.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.title}
                      </option>
                    ))}
                  </select>

                  <select
                    value={rsvpStatusFilter}
                    onChange={(e) => setRsvpStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
                  >
                    <option value="ALL">All Responses</option>
                    <option value="Going">Going</option>
                    <option value="Interested">Interested</option>
                    <option value="Not Going">Not Going</option>
                  </select>
                </div>
              </div>

              {/* RSVP Table */}
              <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Member</th>
                        <th className="py-3 px-4">Event</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Phone</th>
                        <th className="py-3 px-4">Responded</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {filteredAttendees.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500">
                            No RSVP responses found.
                          </td>
                        </tr>
                      ) : (
                        filteredAttendees.map((att) => (
                          <tr
                            key={`${att.eventId}-${att.id}`}
                            className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                          >
                            <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                              {att.memberName}
                            </td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-300 truncate max-w-xs">
                              {att.eventTitle}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                  att.status === 'Going'
                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                    : att.status === 'Interested'
                                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                                    : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                                }`}
                              >
                                {att.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                              {att.memberPhone || '—'}
                            </td>
                            <td className="py-3 px-4 text-slate-400 text-[11px]">
                              {att.createdAt?.toDate
                                ? att.createdAt.toDate().toLocaleDateString()
                                : 'Recent'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* NEW / EDIT EVENT FORM (Full Mobile App Feature Set)         */}
          {/* ========================================================= */}
          {isFormViewOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full p-5 sm:p-7 space-y-6 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto">
                {/* Form Header with Back Link & Title */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsFormViewOpen(false)}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                      title="Back to list"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <div>
                      <h2 className="text-xl font-black text-slate-900 dark:text-white">
                        {editingEvent ? 'Edit Event' : 'New Event'}
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Saves live to Firestore collection: <code className="font-mono text-amber-500">Rhema Church/rhema/events</code>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsFormViewOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* CARD 1: EVENT DETAILS (ℹ️ EVENT DETAILS) */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      <span className="p-1.5 rounded-lg bg-slate-900 text-white">
                        <FileText size={14} />
                      </span>
                      <span>EVENT DETAILS</span>
                    </div>

                    {/* EVENT TITLE - ENGLISH */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        EVENT TITLE — ENGLISH *
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g. Easter Sunday Service 2026"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                      {formErrors.title && (
                        <span className="text-[10px] text-rose-500 mt-1 block font-medium">
                          {formErrors.title}
                        </span>
                      )}
                    </div>

                    {/* EVENT TITLE - TELUGU */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        EVENT TITLE — TELUGU &bull; తెలుగు
                      </label>
                      <input
                        type="text"
                        value={formData.titleTe}
                        onChange={(e) => setFormData({ ...formData, titleTe: e.target.value })}
                        placeholder="తెలుగులో కార్యక్రమం పేరు..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-serif"
                      />
                    </div>

                    {/* EVENT TYPE */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        EVENT TYPE
                      </label>
                      <select
                        value={formData.eventType}
                        onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                      >
                        {EVENT_TYPE_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* DESCRIPTION - ENGLISH */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        DESCRIPTION — ENGLISH
                      </label>
                      <textarea
                        rows={2}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Tell your members what to expect..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none resize-none"
                      />
                    </div>

                    {/* DESCRIPTION - TELUGU */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        DESCRIPTION — TELUGU &bull; తెలుగు
                      </label>
                      <textarea
                        rows={2}
                        value={formData.descriptionTe}
                        onChange={(e) => setFormData({ ...formData, descriptionTe: e.target.value })}
                        placeholder="కార్యక్రమం గురించి వివరించండి..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none resize-none font-serif"
                      />
                    </div>
                  </div>

                  {/* CARD 2: DATE & SCHEDULE (📅 DATE & SCHEDULE) */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      <span className="p-1.5 rounded-lg bg-slate-900 text-white">
                        <CalendarIcon size={14} />
                      </span>
                      <span>DATE &amp; SCHEDULE</span>
                    </div>

                    {/* One-Time Event vs Recurring Toggle */}
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200/60 dark:bg-slate-900 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, isRecurring: false })}
                        className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          !formData.isRecurring
                            ? 'bg-black text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        <CalendarIcon size={13} />
                        <span>One-Time Event</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, isRecurring: true })}
                        className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          formData.isRecurring
                            ? 'bg-black text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        <Repeat size={13} />
                        <span>Recurring</span>
                      </button>
                    </div>

                    {/* Date & Time Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                          START DATE *
                        </label>
                        <input
                          type="date"
                          value={formData.startDate}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              startDate: e.target.value,
                              endDate: e.target.value,
                            })
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                        />
                        {formErrors.startDate && (
                          <span className="text-[10px] text-rose-500 mt-1 block">
                            {formErrors.startDate}
                          </span>
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                          END DATE *
                        </label>
                        <input
                          type="date"
                          value={formData.endDate}
                          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                          START TIME *
                        </label>
                        <input
                          type="text"
                          value={formData.startTime}
                          onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                          placeholder="09:00 AM"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                        />
                        {formErrors.startTime && (
                          <span className="text-[10px] text-rose-500 mt-1 block">
                            {formErrors.startTime}
                          </span>
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                          END TIME *
                        </label>
                        <input
                          type="text"
                          value={formData.endTime}
                          onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                          placeholder="12:00 PM"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* CARD 3: VENUE & LOCATION (📍 VENUE & LOCATION) */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      <span className="p-1.5 rounded-lg bg-slate-900 text-white">
                        <MapPin size={14} />
                      </span>
                      <span>VENUE &amp; LOCATION</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                          VENUE NAME — ENGLISH
                        </label>
                        <input
                          type="text"
                          value={formData.venueName}
                          onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
                          placeholder="e.g. Main Auditorium"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                          VENUE NAME — TELUGU &bull; తెలుగు
                        </label>
                        <input
                          type="text"
                          value={formData.venueNameTe}
                          onChange={(e) => setFormData({ ...formData, venueNameTe: e.target.value })}
                          placeholder="ఆవరణ పేరు తెలుగులో..."
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none font-serif"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          FULL ADDRESS
                        </label>
                        <span className="text-[10px] text-slate-400">Shown on Google Maps link</span>
                      </div>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Street, area, city..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* CARD 4: EVENT BANNER & POSTER (🖼️ EVENT BANNER & POSTER) */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      <span className="p-1.5 rounded-lg bg-slate-900 text-white">
                        <ImageIcon size={14} />
                      </span>
                      <span>EVENT BANNER &amp; POSTER</span>
                    </div>

                    {/* Upload Dropzone */}
                    <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => {
                              if (typeof reader.result === 'string') {
                                setFormData({ ...formData, posterUrl: reader.result });
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <div className="flex flex-col items-center justify-center space-y-1.5 pointer-events-none">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                          <ImageIcon size={20} />
                        </div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Upload Poster from Gallery
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Recommended aspect ratio: 16:9 widescreen
                        </div>
                      </div>
                    </div>

                    {/* URL Input */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        OR PASTE IMAGE URL
                      </label>
                      <input
                        type="url"
                        value={formData.posterUrl}
                        onChange={(e) => setFormData({ ...formData, posterUrl: e.target.value })}
                        placeholder="https://example.com/poster.jpg"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Supports JPG, PNG, WEBP, and direct cloud image URLs.
                      </p>
                    </div>

                    {/* Live Preview if url exists */}
                    {formData.posterUrl && (
                      <div className="pt-2">
                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">
                          Poster Live Preview
                        </span>
                        <div className="w-full h-36 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black/10 relative">
                          <img
                            src={formData.posterUrl}
                            alt="Poster Preview"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, posterUrl: '' })}
                            className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black"
                            title="Remove Poster"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* CARD 5: WORSHIP SERVICES & SONG SETLISTS (🎵) */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      <span className="p-1.5 rounded-lg bg-emerald-600 text-white">
                        <Music size={14} />
                      </span>
                      <span>WORSHIP SERVICES &amp; SONG SETLISTS</span>
                    </div>

                    <p className="text-xs text-slate-500">
                      Optional: attach worship services &amp; song setlists to this event
                    </p>

                    {/* Attached Setlists list */}
                    {formData.attachedSetlists.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {formData.attachedSetlists.map((item, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5"
                          >
                            <Music size={12} />
                            <span>{item}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = formData.attachedSetlists.filter((_, i) => i !== idx);
                                setFormData({ ...formData, attachedSetlists: updated });
                              }}
                              className="text-emerald-600 hover:text-emerald-900 dark:hover:text-white"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Add Setlist input / dropdown */}
                    <div className="flex items-center gap-2 pt-1">
                      {availableSongs.length > 0 ? (
                        <select
                          onChange={(e) => {
                            if (e.target.value && !formData.attachedSetlists.includes(e.target.value)) {
                              setFormData({
                                ...formData,
                                attachedSetlists: [...formData.attachedSetlists, e.target.value],
                              });
                            }
                            e.target.value = '';
                          }}
                          className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
                        >
                          <option value="">Choose from Church Songbook...</option>
                          {availableSongs.map((s) => (
                            <option key={s.id} value={s.title}>
                              {s.title} {s.category ? `(${s.category})` : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={customSetlistInput}
                          onChange={(e) => setCustomSetlistInput(e.target.value)}
                          placeholder="e.g. Sunday Worship Setlist A"
                          className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                        />
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (customSetlistInput.trim()) {
                            setFormData({
                              ...formData,
                              attachedSetlists: [...formData.attachedSetlists, customSetlistInput.trim()],
                            });
                            setCustomSetlistInput('');
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-black hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>Add Service / Setlist</span>
                      </button>
                    </div>
                  </div>

                  {/* CARD 6: ATTENDANCE CHECK-IN SETTINGS (🔲) */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        <span className="p-1.5 rounded-lg bg-slate-900 text-white">
                          <QrCode size={14} />
                        </span>
                        <span>ATTENDANCE CHECK-IN SETTINGS</span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white pt-1">
                        Event QR Code Required
                      </div>
                      <p className="text-xs text-slate-500 max-w-lg leading-relaxed">
                        Church QR Code is allowed. Members can scan either the permanent Church QR or this Event QR to mark attendance.
                      </p>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={formData.qrCodeRequired}
                      onClick={() => setFormData({ ...formData, qrCodeRequired: !formData.qrCodeRequired })}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        formData.qrCodeRequired ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          formData.qrCodeRequired ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* CARD 7: MEMBER RSVP POLL (👥) */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        <span className="p-1.5 rounded-lg bg-blue-900 text-white">
                          <Users size={14} />
                        </span>
                        <span>MEMBER RSVP POLL</span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white pt-1">
                        Enable Member RSVP Poll
                      </div>
                      <p className="text-xs text-slate-500 max-w-lg leading-relaxed">
                        RSVP is disabled by default. Members will see event details without RSVP options.
                      </p>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={formData.rsvpEnabled}
                      onClick={() => setFormData({ ...formData, rsvpEnabled: !formData.rsvpEnabled })}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        formData.rsvpEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          formData.rsvpEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* CARD 8: VOLUNTEER REGISTRATION (🤍) */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        <span className="p-1.5 rounded-lg bg-purple-900 text-white">
                          <HeartHandshake size={14} />
                        </span>
                        <span>VOLUNTEER REGISTRATION</span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white pt-1">
                        Enable Volunteer Registration
                      </div>
                      <p className="text-xs text-slate-500 max-w-lg leading-relaxed">
                        Volunteering is OFF. Turn ON to open volunteer applications for this event.
                      </p>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={formData.volunteerEnabled}
                      onClick={() => setFormData({ ...formData, volunteerEnabled: !formData.volunteerEnabled })}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        formData.volunteerEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          formData.volunteerEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* FOOTER ACTION BUTTONS (Matching Mobile App Exactly) */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setIsFormViewOpen(false)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1.5 order-3 sm:order-1"
                    >
                      <ArrowLeft size={14} />
                      <span>Back to list</span>
                    </button>

                    <div className="flex items-center gap-3 w-full sm:w-auto order-1 sm:order-2">
                      <button
                        type="button"
                        onClick={() => handleSaveEvent(false)}
                        disabled={isSaving}
                        className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                      >
                        Save as Draft
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSaveEvent(true)}
                        disabled={isSaving}
                        className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-[#1E6F43] hover:bg-[#185c37] text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        {isSaving && <RefreshCw size={14} className="animate-spin" />}
                        <span>{editingEvent ? 'Save Changes' : 'Publish Event'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* EVENT QR CODE MODAL                                        */}
          {/* ========================================================= */}
          {qrModalEvent && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-center relative">
                <button
                  type="button"
                  onClick={() => setQrModalEvent(null)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X size={18} />
                </button>

                <div className="space-y-1">
                  <div className="inline-flex p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 mb-1">
                    <QrCode size={24} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {qrModalEvent.title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {formatDisplayDate(qrModalEvent.startDate)} &bull; {qrModalEvent.startTime}
                  </p>
                </div>

                {qrCodeDataUrl ? (
                  <div className="p-4 bg-white rounded-2xl shadow-inner border border-slate-200 mx-auto inline-block">
                    <img src={qrCodeDataUrl} alt="Event QR Code" className="w-56 h-56 mx-auto" />
                  </div>
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center mx-auto text-xs text-slate-400">
                    Generating QR code...
                  </div>
                )}

                <p className="text-[11px] text-slate-400 leading-tight">
                  Members can scan this QR code directly with the Rhema mobile app or web scanner to mark verified attendance.
                </p>

                <div className="pt-2 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={downloadQrCode}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Download PNG</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer size={14} />
                    <span>Print</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* ATTENDANCE / ATTENDEE MODAL                                */}
          {/* ========================================================= */}
          {attendModalEvent && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative max-h-[85vh] overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setAttendModalEvent(null)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X size={18} />
                </button>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users size={18} className="text-emerald-500" />
                    <span>Attendance Check-In</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    {attendModalEvent.title} &bull; {formatDisplayDate(attendModalEvent.startDate)}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Confirmed RSVPs (Going):</span>
                  <span className="font-bold text-emerald-600 text-sm">
                    {attendModalEvent.rsvpStats?.goingCount || 0} Members
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Recent RSVP Responders
                  </div>
                  {attendees.filter((a) => a.eventId === attendModalEvent.id).length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                      No RSVP responders yet. Members will appear here when they respond to the event poll.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-60 overflow-y-auto">
                      {attendees
                        .filter((a) => a.eventId === attendModalEvent.id)
                        .map((att) => (
                          <div
                            key={att.id}
                            className="py-2.5 px-3 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl"
                          >
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white">
                                {att.memberName}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {att.memberPhone || 'No phone'}
                              </div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                att.status === 'Going'
                                  ? 'bg-emerald-500/10 text-emerald-500'
                                  : 'bg-amber-500/10 text-amber-500'
                              }`}
                            >
                              {att.status}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setAttendModalEvent(null)}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* CONFIRM DELETE MODAL                                       */}
          {/* ========================================================= */}
          {deletingEvent && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-center">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20">
                  <Trash2 size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Event?</h3>
                  <p className="text-xs text-slate-500">
                    Are you sure you want to permanently delete{' '}
                    <span className="font-semibold text-slate-900 dark:text-white">
                      &ldquo;{deletingEvent.title}&rdquo;
                    </span>
                    ? This action cannot be undone.
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDeletingEvent(null)}
                    disabled={isDeleting}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    {isDeleting && <RefreshCw size={13} className="animate-spin" />}
                    <span>Confirm Delete</span>
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
