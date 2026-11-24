'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AdminNavigationShell } from '@/components/layout/AdminNavigationShell';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import {
  CalendarDays,
  Users,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Plus,
  Edit3,
  Trash2,
  BarChart3,
  TrendingUp,
  UserCheck,
  UserX,
  AlertCircle,
  MapPin,
  Mic,
  Tag,
  ChevronRight,
  Download,
  RefreshCw,
  X,
  ShieldAlert,
  Sparkles,
  Eye,
  Check,
  RotateCcw,
  Calendar as CalendarIcon,
  Globe,
} from 'lucide-react';

export type EventStatus = 'Upcoming' | 'Draft' | 'Past' | 'Cancelled';
export type EventCategory =
  | 'Sunday Service'
  | 'Special Conference'
  | 'Youth Night'
  | 'Worship Night'
  | 'Prayer Vigil'
  | 'Community Outreach'
  | 'Bible study'
  | 'Other';

export interface FirebaseEventRecord {
  id: string;
  title: string;
  titleTe?: string;
  theme?: string;
  description?: string;
  descriptionTe?: string;
  category: EventCategory | string;
  startDate: string;
  endDate?: string;
  date?: string;
  startTime: string;
  endTime?: string;
  time?: string;
  venueName: string;
  venue?: string;
  location?: string;
  roomOrHall?: string;
  keynoteSpeaker?: string;
  speaker?: string;
  bannerGradient?: string;
  bannerUrl?: string;
  status: EventStatus;
  maxCapacity: number;
  rsvpEnabled?: boolean;
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

const CATEGORY_OPTIONS: EventCategory[] = [
  'Sunday Service',
  'Special Conference',
  'Youth Night',
  'Worship Night',
  'Prayer Vigil',
  'Community Outreach',
  'Bible study',
  'Other',
];

const STATUS_OPTIONS: EventStatus[] = ['Upcoming', 'Draft', 'Past', 'Cancelled'];

const GRADIENT_PRESETS = [
  { label: 'Amber Gold', value: 'from-amber-600 via-amber-800 to-slate-900' },
  { label: 'Indigo Purple', value: 'from-indigo-600 via-purple-800 to-slate-900' },
  { label: 'Emerald Teal', value: 'from-emerald-600 via-teal-800 to-slate-900' },
  { label: 'Rose Crimson', value: 'from-rose-600 via-red-800 to-slate-900' },
  { label: 'Sky Azure', value: 'from-sky-600 via-blue-800 to-slate-900' },
];

export default function AdminEventsPage() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'events' | 'rsvps' | 'analytics'>('events');

  // Core Data States
  const [events, setEvents] = useState<FirebaseEventRecord[]>([]);
  const [attendees, setAttendees] = useState<FirebaseRsvpRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter States for Events
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Search & Filter States for RSVPs
  const [rsvpEventFilter, setRsvpEventFilter] = useState<string>('ALL');
  const [rsvpStatusFilter, setRsvpStatusFilter] = useState<string>('ALL');
  const [rsvpSearchQuery, setRsvpSearchQuery] = useState('');

  // Modals & Drawers
  const [selectedEventForView, setSelectedEventForView] = useState<FirebaseEventRecord | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<FirebaseEventRecord | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<FirebaseEventRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form Validation & Errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Fetch Events from Firestore
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
          description: d.description || '',
          descriptionTe: d.descriptionTe || '',
          category: d.category || 'Sunday Service',
          startDate: d.startDate || d.date || '',
          endDate: d.endDate || d.startDate || d.date || '',
          date: d.date || d.startDate || '',
          startTime: d.startTime || d.time || '09:00 AM',
          endTime: d.endTime || '',
          time: d.time || d.startTime || '09:00 AM',
          venueName: d.venueName || d.venue || d.location || 'Church Sanctuary',
          venue: d.venue || d.venueName || d.location || 'Church Sanctuary',
          location: d.location || d.venueName || 'Church Sanctuary',
          roomOrHall: d.roomOrHall || '',
          keynoteSpeaker: d.keynoteSpeaker || d.speaker || 'Pastor',
          speaker: d.speaker || d.keynoteSpeaker || 'Pastor',
          bannerGradient: d.bannerGradient || GRADIENT_PRESETS[0].value,
          bannerUrl: d.bannerUrl || '',
          status: (d.status as EventStatus) || 'Upcoming',
          maxCapacity: Number(d.maxCapacity || 500),
          rsvpEnabled: d.rsvpEnabled !== false,
          rsvpStats: d.rsvpStats || {
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

        // Dynamically compute verified RSVP stats from subcollection records
        const eventRsvps = allRsvps.filter((r) => r.eventId === eventId);
        item.rsvpStats = {
          goingCount: eventRsvps.filter((r) => (r.status || '').toLowerCase() === 'going').length,
          interestedCount: eventRsvps.filter((r) => (r.status || '').toLowerCase() === 'interested').length,
          notGoingCount: eventRsvps.filter((r) => ['not_going', 'notgoing', 'not going'].includes((r.status || '').toLowerCase())).length,
          totalResponses: eventRsvps.length,
        };
      }

      // Sort by startDate descending
      items.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
      setEvents(items);
      setAttendees(allRsvps);
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

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        evt.title.toLowerCase().includes(q) ||
        (evt.titleTe && evt.titleTe.includes(q)) ||
        (evt.theme && evt.theme.toLowerCase().includes(q)) ||
        (evt.keynoteSpeaker && evt.keynoteSpeaker.toLowerCase().includes(q)) ||
        (evt.venueName && evt.venueName.toLowerCase().includes(q));

      const matchesCategory = categoryFilter === 'ALL' || evt.category === categoryFilter;
      const matchesStatus = statusFilter === 'ALL' || evt.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [events, searchQuery, categoryFilter, statusFilter]);

  // Filtered RSVPs
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

  // KPI Calculations
  const kpis = useMemo(() => {
    const totalEvents = events.length;
    const upcomingEvents = events.filter((e) => e.status === 'Upcoming').length;
    const totalRsvps = attendees.length;
    const confirmedGoing = attendees.filter((a) => a.status === 'Going').length;
    const totalCapacity = events.reduce((acc, e) => acc + (e.maxCapacity || 0), 0);
    const attendanceRate = totalCapacity > 0 ? Math.round((confirmedGoing / totalCapacity) * 100) : 0;

    return {
      totalEvents,
      upcomingEvents,
      totalRsvps,
      confirmedGoing,
      attendanceRate,
    };
  }, [events, attendees]);

  // Event Form State for Create / Edit
  const [formData, setFormData] = useState<{
    title: string;
    titleTe: string;
    theme: string;
    description: string;
    descriptionTe: string;
    category: EventCategory | string;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    venueName: string;
    roomOrHall: string;
    keynoteSpeaker: string;
    maxCapacity: number;
    bannerGradient: string;
    status: EventStatus;
    rsvpEnabled: boolean;
  }>({
    title: '',
    titleTe: '',
    theme: '',
    description: '',
    descriptionTe: '',
    category: 'Sunday Service',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    startTime: '09:00 AM',
    endTime: '12:00 PM',
    venueName: 'Rhema Central Sanctuary',
    roomOrHall: 'Main Worship Auditorium',
    keynoteSpeaker: 'Pastor Gabriel',
    maxCapacity: 500,
    bannerGradient: GRADIENT_PRESETS[0].value,
    status: 'Upcoming',
    rsvpEnabled: true,
  });

  const openCreateModal = () => {
    setFormData({
      title: '',
      titleTe: '',
      theme: '',
      description: '',
      descriptionTe: '',
      category: 'Special Conference',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      startTime: '10:00 AM',
      endTime: '01:00 PM',
      venueName: 'Rhema Central Sanctuary',
      roomOrHall: 'Main Worship Auditorium',
      keynoteSpeaker: profile?.fullName || 'Pastor Gabriel',
      maxCapacity: 500,
      bannerGradient: GRADIENT_PRESETS[0].value,
      status: 'Upcoming',
      rsvpEnabled: true,
    });
    setFormErrors({});
    setIsCreateModalOpen(true);
  };

  const openEditModal = (evt: FirebaseEventRecord) => {
    setEditingEvent(evt);
    setFormData({
      title: evt.title,
      titleTe: evt.titleTe || '',
      theme: evt.theme || '',
      description: evt.description || '',
      descriptionTe: evt.descriptionTe || '',
      category: evt.category,
      startDate: evt.startDate || evt.date || '',
      endDate: evt.endDate || evt.startDate || '',
      startTime: evt.startTime || evt.time || '09:00 AM',
      endTime: evt.endTime || '',
      venueName: evt.venueName || evt.venue || 'Church Sanctuary',
      roomOrHall: evt.roomOrHall || '',
      keynoteSpeaker: evt.keynoteSpeaker || evt.speaker || 'Pastor',
      maxCapacity: evt.maxCapacity || 500,
      bannerGradient: evt.bannerGradient || GRADIENT_PRESETS[0].value,
      status: evt.status || 'Upcoming',
      rsvpEnabled: evt.rsvpEnabled !== false,
    });
    setFormErrors({});
  };

  const validateEventForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.title.trim()) errors.title = 'Event title is required';
    if (!formData.startDate) errors.startDate = 'Start date is required';
    if (!formData.venueName.trim()) errors.venueName = 'Venue name is required';
    if (!formData.keynoteSpeaker.trim()) errors.keynoteSpeaker = 'Speaker / Leader is required';
    if (formData.maxCapacity <= 0) errors.maxCapacity = 'Capacity must be greater than zero';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save New Event to Firestore
  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEventForm()) return;

    try {
      setIsSaving(true);
      const colRef = collection(db, 'Rhema Church', 'rhema', 'events');
      const payload = {
        title: formData.title.trim(),
        titleTe: formData.titleTe.trim() || null,
        theme: formData.theme.trim() || null,
        description: formData.description.trim() || null,
        descriptionTe: formData.descriptionTe.trim() || null,
        category: formData.category,
        startDate: formData.startDate,
        endDate: formData.endDate || formData.startDate,
        date: formData.startDate,
        startTime: formData.startTime,
        endTime: formData.endTime || null,
        time: formData.startTime,
        venueName: formData.venueName.trim(),
        venue: formData.venueName.trim(),
        location: formData.venueName.trim(),
        roomOrHall: formData.roomOrHall.trim() || null,
        keynoteSpeaker: formData.keynoteSpeaker.trim(),
        speaker: formData.keynoteSpeaker.trim(),
        bannerGradient: formData.bannerGradient,
        status: formData.status,
        maxCapacity: Number(formData.maxCapacity),
        rsvpEnabled: formData.rsvpEnabled,
        rsvpStats: {
          goingCount: 0,
          interestedCount: 0,
          notGoingCount: 0,
          totalResponses: 0,
        },
        createdBy: user?.uid || 'admin',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(colRef, payload);
      showToast(`Event "${formData.title}" created successfully`);
      setIsCreateModalOpen(false);
      loadEvents();
    } catch (err: any) {
      console.error('Failed to create event in Firestore:', err);
      showToast('Error saving event: ' + (err.message || 'Permission denied'));
    } finally {
      setIsSaving(false);
    }
  };

  // Save Edit Event in Firestore
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent || !validateEventForm()) return;

    try {
      setIsSaving(true);
      const docRef = doc(db, 'Rhema Church', 'rhema', 'events', editingEvent.id);
      const payload = {
        title: formData.title.trim(),
        titleTe: formData.titleTe.trim() || null,
        theme: formData.theme.trim() || null,
        description: formData.description.trim() || null,
        descriptionTe: formData.descriptionTe.trim() || null,
        category: formData.category,
        startDate: formData.startDate,
        endDate: formData.endDate || formData.startDate,
        date: formData.startDate,
        startTime: formData.startTime,
        endTime: formData.endTime || null,
        time: formData.startTime,
        venueName: formData.venueName.trim(),
        venue: formData.venueName.trim(),
        location: formData.venueName.trim(),
        roomOrHall: formData.roomOrHall.trim() || null,
        keynoteSpeaker: formData.keynoteSpeaker.trim(),
        speaker: formData.keynoteSpeaker.trim(),
        bannerGradient: formData.bannerGradient,
        status: formData.status,
        maxCapacity: Number(formData.maxCapacity),
        rsvpEnabled: formData.rsvpEnabled,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(docRef, payload);
      showToast(`Event "${formData.title}" updated successfully`);
      setEditingEvent(null);
      loadEvents();
    } catch (err: any) {
      console.error('Failed to update event in Firestore:', err);
      showToast('Error updating event: ' + (err.message || 'Permission denied'));
    } finally {
      setIsSaving(false);
    }
  };

  // Confirm Delete Event in Firestore
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
      console.error('Failed to delete event from Firestore:', err);
      showToast('Error deleting event: ' + (err.message || 'Permission denied'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle Event Status
  const handleQuickStatusChange = async (evt: FirebaseEventRecord, newStatus: EventStatus) => {
    try {
      const docRef = doc(db, 'Rhema Church', 'rhema', 'events', evt.id);
      await updateDoc(docRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      showToast(`Status updated to "${newStatus}"`);
      loadEvents();
    } catch (err: any) {
      console.error('Failed to update status:', err);
      showToast('Failed to update status: ' + err.message);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
      <AdminNavigationShell>
        <div className="space-y-6">
          {/* Toast Notification */}
          {toastMessage && (
            <div className="fixed top-6 right-6 z-50 bg-slate-900 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 size={18} className="text-emerald-400" />
              <span className="text-xs font-semibold">{toastMessage}</span>
            </div>
          )}

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <CalendarDays size={26} />
              </span>
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Events &amp; RSVP Studio</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Live Firestore
                  </span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Rhema Church Schedule &bull; RSVP tracking, bilingual details &amp; congregation gatherings
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadEvents()}
                disabled={isRefreshing}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-slate-700 dark:text-slate-200"
              >
                <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>

              <button
                type="button"
                onClick={openCreateModal}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/20 flex items-center gap-1.5 transition-all"
              >
                <Plus size={16} />
                <span>Create Event</span>
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 flex items-center gap-3 text-xs">
              <AlertCircle size={18} className="text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* KPI Analytics Ribbon */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Events
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {kpis.totalEvents}
                </span>
                <span className="text-xs text-amber-500 font-bold">
                  {kpis.upcomingEvents} Upcoming
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total RSVPs
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {kpis.totalRsvps}
                </span>
                <span className="text-xs text-emerald-500 font-bold">
                  {kpis.confirmedGoing} Going
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Attendance Rate
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {kpis.attendanceRate}%
                </span>
                <TrendingUp size={16} className="text-teal-500" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Active Church
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  Rhema Church
                </span>
                <span className="text-[10px] font-mono text-slate-500">rhema</span>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('events')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
                activeTab === 'events'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CalendarDays size={14} />
              <span>Events Schedule ({events.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('rsvps')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
                activeTab === 'rsvps'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users size={14} />
              <span>RSVP Roster ({attendees.length})</span>
            </button>
          </div>

          {/* TAB 1: EVENTS LIST */}
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
                    placeholder="Search by title, speaker, theme or venue..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
                  >
                    <option value="ALL">All Categories</option>
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
                  >
                    <option value="ALL">All Statuses</option>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Events Grid */}
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
                    {searchQuery || categoryFilter !== 'ALL' || statusFilter !== 'ALL'
                      ? 'No events match your search criteria. Try resetting filters.'
                      : 'Create your first gathering to publish it to the member portal.'}
                  </p>
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    <span>Create Event</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredEvents.map((evt) => {
                    const goingCount = evt.rsvpStats?.goingCount || 0;
                    const totalResponses = evt.rsvpStats?.totalResponses || 0;

                    return (
                      <div
                        key={evt.id}
                        className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        {/* Event Banner */}
                        <div
                          className={`h-24 bg-gradient-to-r ${evt.bannerGradient || 'from-emerald-700 to-slate-900'} p-4 relative flex flex-col justify-between text-white`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm text-[10px] font-bold uppercase tracking-wider text-amber-300 border border-amber-400/30">
                              {evt.category}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                evt.status === 'Upcoming'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                                  : evt.status === 'Draft'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                                  : 'bg-slate-500/20 text-slate-300 border-slate-400/30'
                              }`}
                            >
                              {evt.status}
                            </span>
                          </div>

                          <div className="text-[11px] font-medium text-white/90 truncate flex items-center gap-1.5">
                            <Clock size={12} />
                            <span>
                              {evt.startDate} &bull; {evt.startTime}
                            </span>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                          <div className="space-y-1.5">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                              {evt.title}
                            </h3>
                            {evt.titleTe && (
                              <p className="text-xs font-serif text-amber-600 dark:text-amber-400">
                                {evt.titleTe}
                              </p>
                            )}
                            {evt.theme && (
                              <p className="text-xs text-slate-600 dark:text-slate-300 italic line-clamp-1">
                                &ldquo;{evt.theme}&rdquo;
                              </p>
                            )}

                            <div className="pt-2 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                              <div className="flex items-center gap-1.5 truncate">
                                <MapPin size={13} className="text-slate-400 shrink-0" />
                                <span className="truncate">{evt.venueName}</span>
                              </div>
                              <div className="flex items-center gap-1.5 truncate">
                                <Mic size={13} className="text-slate-400 shrink-0" />
                                <span className="truncate">{evt.keynoteSpeaker}</span>
                              </div>
                            </div>
                          </div>

                          {/* RSVP Stats & Actions */}
                          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500 flex items-center gap-1">
                                <Users size={13} />
                                <span>RSVP</span>
                              </span>
                              <span className="font-bold text-slate-900 dark:text-white">
                                {goingCount} Going &bull; {totalResponses} Total
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQuickStatusChange(
                                      evt,
                                      evt.status === 'Upcoming' ? 'Draft' : 'Upcoming'
                                    )
                                  }
                                  className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                  {evt.status === 'Upcoming' ? 'Unpublish' : 'Publish'}
                                </button>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditModal(evt)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                  title="Edit event"
                                >
                                  <Edit3 size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingEvent(evt)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                  title="Delete event"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: RSVP ROSTER */}
          {activeTab === 'rsvps' && (
            <div className="space-y-4">
              {/* Search & Filter */}
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
                    <option value="ALL">All Events</option>
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
                          <tr key={`${att.eventId}-${att.id}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
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
                              {att.createdAt?.toDate ? att.createdAt.toDate().toLocaleDateString() : 'Recent'}
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

          {/* CREATE / EDIT EVENT MODAL */}
          {(isCreateModalOpen || editingEvent) && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setEditingEvent(null);
                  }}
                  className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
                >
                  <X size={18} />
                </button>

                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CalendarDays size={20} className="text-emerald-500" />
                    <span>{editingEvent ? 'Edit Church Event' : 'Create New Event'}</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Saves directly to Firestore: <code className="font-mono text-amber-500">Rhema Church/rhema/events</code>
                  </p>
                </div>

                <form onSubmit={editingEvent ? handleSaveEdit : handleSaveCreate} className="space-y-4">
                  {/* Title En & Te */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Event Title (English) *
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g. Sunday Victory Worship"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                      {formErrors.title && (
                        <span className="text-[10px] text-red-500 mt-0.5 block">{formErrors.title}</span>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Event Title (Telugu) &bull; తెలుగు
                      </label>
                      <input
                        type="text"
                        value={formData.titleTe}
                        onChange={(e) => setFormData({ ...formData, titleTe: e.target.value })}
                        placeholder="ఉదా: ఆదివారం విజయోత్సవ ఆరాధన"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-serif"
                      />
                    </div>
                  </div>

                  {/* Theme & Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Theme / Scripture Motto
                      </label>
                      <input
                        type="text"
                        value={formData.theme}
                        onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                        placeholder="e.g. Walking in Victorious Faith"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Category
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value as EventCategory })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                      >
                        {CATEGORY_OPTIONS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Date, Time & Venue */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Date *
                      </label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value, endDate: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                      />
                      {formErrors.startDate && (
                        <span className="text-[10px] text-red-500 mt-0.5 block">{formErrors.startDate}</span>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Start Time
                      </label>
                      <input
                        type="text"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        placeholder="09:00 AM"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        End Time
                      </label>
                      <input
                        type="text"
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        placeholder="12:00 PM"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Venue & Speaker */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Venue / Location *
                      </label>
                      <input
                        type="text"
                        value={formData.venueName}
                        onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
                        placeholder="Rhema Central Sanctuary"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                      />
                      {formErrors.venueName && (
                        <span className="text-[10px] text-red-500 mt-0.5 block">{formErrors.venueName}</span>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Speaker / Preacher *
                      </label>
                      <input
                        type="text"
                        value={formData.keynoteSpeaker}
                        onChange={(e) => setFormData({ ...formData, keynoteSpeaker: e.target.value })}
                        placeholder="Pastor Gabriel"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                      />
                      {formErrors.keynoteSpeaker && (
                        <span className="text-[10px] text-red-500 mt-0.5 block">{formErrors.keynoteSpeaker}</span>
                      )}
                    </div>
                  </div>

                  {/* Description En & Te */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Description (English)
                      </label>
                      <textarea
                        rows={3}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Details of the gathering..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Description (Telugu)
                      </label>
                      <textarea
                        rows={3}
                        value={formData.descriptionTe}
                        onChange={(e) => setFormData({ ...formData, descriptionTe: e.target.value })}
                        placeholder="కార్యక్రమ వివరాలు..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none resize-none font-serif"
                      />
                    </div>
                  </div>

                  {/* Banner Gradient Preset & Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Banner Palette Preset
                      </label>
                      <div className="grid grid-cols-5 gap-1.5 pt-1">
                        {GRADIENT_PRESETS.map((p) => (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() => setFormData({ ...formData, bannerGradient: p.value })}
                            className={`h-7 rounded-lg bg-gradient-to-r ${p.value} border-2 transition-all ${
                              formData.bannerGradient === p.value
                                ? 'border-amber-400 scale-105'
                                : 'border-transparent opacity-80 hover:opacity-100'
                            }`}
                            title={p.label}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Publishing Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as EventStatus })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreateModalOpen(false);
                        setEditingEvent(null);
                      }}
                      className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-950/20 flex items-center gap-1.5"
                    >
                      {isSaving && <RefreshCw size={13} className="animate-spin" />}
                      <span>{editingEvent ? 'Save Changes' : 'Publish Gathering'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* CONFIRM DELETE MODAL */}
          {deletingEvent && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-center">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto border border-red-500/20">
                  <Trash2 size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Gathering?</h3>
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
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                    className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-red-950/20 flex items-center gap-1.5"
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
