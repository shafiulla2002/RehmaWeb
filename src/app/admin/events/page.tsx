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
  setDoc,
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
  ArrowUp,
  ArrowDown,
  UserCheck,
  UserX,
  Building2,
} from 'lucide-react';

export type EventStatus = 'Upcoming' | 'Published' | 'Draft' | 'Past' | 'Completed' | 'Cancelled';

export interface WorshipSong {
  id: string;
  title: string;
  titleTe?: string;
  key?: string;
  category?: string;
  lyrics?: string;
}

export interface EventServiceItem {
  id: string;
  name: string;
  time?: string;
  songLeader?: string;
  songs: WorshipSong[];
}

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
  recurring?: string;
  repeatPattern?: string;
  recurrenceDuration?: number;
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
  bannerGradient?: string;
  bannerUrl?: string;
  posterUrl?: string;
  eventServices?: EventServiceItem[];
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

export interface UnifiedMember {
  id: string;
  name: string;
  phone?: string;
  status: 'Present' | 'Absent';
  timestamp?: any;
  profilePicture?: string;
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

const RECURRING_OPTIONS = [
  { label: 'Select Recurrence', value: 'Select Recurrence' },
  { label: 'Every Sunday', value: 'Every Sunday' },
  { label: 'Every day · ప్రతిరోజూ', value: 'Every day' },
  { label: 'Every week (specify day)', value: 'Every week' },
  { label: 'First Sunday of every month', value: 'First Sunday' },
  { label: 'Monthly (same date)', value: 'Monthly' },
];

const DURATION_OPTIONS = [
  { label: 'For 1 month', value: 1 },
  { label: 'For 2 months', value: 2 },
  { label: 'For 3 months', value: 3 },
  { label: 'For 6 months', value: 6 },
  { label: 'For 1 year', value: 12 },
];

// Helper to add months to date string (YYYY-MM-DD)
const addMonthsToDate = (dStr: string, monthsToAdd: number): string => {
  try {
    const d = new Date(dStr);
    d.setMonth(d.getMonth() + monthsToAdd);
    return d.toISOString().split('T')[0];
  } catch {
    return dStr;
  }
};

export default function AdminEventsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'events' | 'rsvps'>('events');

  // Core Data States
  const [events, setEvents] = useState<FirebaseEventRecord[]>([]);
  const [attendees, setAttendees] = useState<FirebaseRsvpRecord[]>([]);
  const [availableSongs, setAvailableSongs] = useState<WorshipSong[]>([]);
  const [churchMembersList, setChurchMembersList] = useState<any[]>([]);
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

  // Attendance Screen State (Matches mobile EventAttendeesScreen)
  const [attendModalEvent, setAttendModalEvent] = useState<FirebaseEventRecord | null>(null);
  const [attendanceMembers, setAttendanceMembers] = useState<UnifiedMember[]>([]);
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState<'All' | 'Present' | 'Absent'>('All');
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);

  // Song Picker Modal State (for Multi-Service manager)
  const [songPickerServiceId, setSongPickerServiceId] = useState<string | null>(null);
  const [songPickerSearch, setSongPickerSearch] = useState('');

  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form Validation & Errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Format Helper: Display Date as DD-MM-YYYY matching mobile app
  const formatDisplayDate = (dateStr?: string) => {
    if (!dateStr) return 'TBA';
    if (dateStr.includes('-') && dateStr.split('-')[0].length === 4) {
      const [year, month, day] = dateStr.split('-');
      return `${day}-${month}-${year}`;
    }
    return dateStr;
  };

  // Avatar Initials & Color Generator (matching mobile app)
  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const bgColors = ['bg-blue-100', 'bg-red-100', 'bg-emerald-100', 'bg-amber-100', 'bg-purple-100', 'bg-indigo-100'];
    const textColors = ['text-blue-800', 'text-red-800', 'text-emerald-800', 'text-amber-800', 'text-purple-800', 'text-indigo-800'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const index = Math.abs(hash) % bgColors.length;
    return { bg: bgColors[index], text: textColors[index] };
  };

  // Load Events, RSVPs, Songs & Church Members from Firestore
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
          recurring: d.recurring || (d.isRecurring ? 'Every Sunday' : 'One-time event'),
          repeatPattern: d.repeatPattern || d.recurring || 'Every Sunday',
          recurrenceDuration: Number(d.recurrenceDuration || 1),
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
          bannerGradient: d.bannerGradient || 'from-emerald-700 to-slate-900',
          bannerUrl: d.bannerUrl || d.posterUrl || '',
          posterUrl: d.posterUrl || d.bannerUrl || '',
          eventServices: Array.isArray(d.eventServices) ? d.eventServices : [],
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

        // Fetch RSVPs
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

      items.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
      setEvents(items);
      setAttendees(allRsvps);

      // Load church songs for the worship service manager
      try {
        const songsSnap = await getDocs(collection(db, 'Rhema Church', 'rhema', 'songs'));
        const songsList: WorshipSong[] = [];
        songsSnap.forEach((docS) => {
          const sd = docS.data();
          songsList.push({
            id: docS.id,
            title: sd.title || 'Untitled Song',
            titleTe: sd.titleTe || '',
            key: sd.key || sd.songKey || '',
            category: sd.category || '',
            lyrics: sd.lyrics || '',
          });
        });
        setAvailableSongs(songsList);
      } catch {
        // songs optional
      }

      // Load church members for the attendance check-in drawer
      try {
        const membersSnap = await getDocs(collection(db, 'Rhema Church', 'rhema', 'members'));
        const mList: any[] = [];
        membersSnap.forEach((mDoc) => {
          const md = mDoc.data();
          mList.push({
            id: mDoc.id,
            name: md.fullName || md.name || md.memberName || 'Member',
            phone: md.phone || md.mobile || '',
            photoURL: md.photoURL || md.profilePicture || '',
          });
        });
        setChurchMembersList(mList);
      } catch {
        // members optional
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
    recurring: 'Every Sunday',
    repeatPattern: 'Every Sunday',
    recurrenceDuration: 1,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    startTime: '09:00 AM',
    endTime: '12:00 PM',
    venueName: '',
    venueNameTe: '',
    address: '',
    posterUrl: '',
    eventServices: [] as EventServiceItem[],
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
      recurring: 'Every Sunday',
      repeatPattern: 'Every Sunday',
      recurrenceDuration: 1,
      startDate: today,
      endDate: today,
      startTime: '09:00 AM',
      endTime: '12:00 PM',
      venueName: '',
      venueNameTe: '',
      address: '',
      posterUrl: '',
      eventServices: [],
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
      recurring: evt.recurring || evt.repeatPattern || 'Every Sunday',
      repeatPattern: evt.repeatPattern || evt.recurring || 'Every Sunday',
      recurrenceDuration: Number(evt.recurrenceDuration || 1),
      startDate: evt.startDate || evt.date || '',
      endDate: evt.endDate || evt.startDate || '',
      startTime: evt.startTime || evt.time || '09:00 AM',
      endTime: evt.endTime || '',
      venueName: evt.venueName || evt.venue || '',
      venueNameTe: evt.venueNameTe || '',
      address: evt.address || evt.location || '',
      posterUrl: evt.posterUrl || evt.bannerUrl || '',
      eventServices: evt.eventServices || [],
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

  // Open Attendance Modal (Matches mobile app EventAttendeesScreen)
  const openAttendanceModal = async (evt: FirebaseEventRecord) => {
    setAttendModalEvent(evt);
    setIsAttendanceLoading(true);
    setAttendanceSearchQuery('');
    setAttendanceFilter('All');

    try {
      // 1. Fetch checked-in attendees from subcollection
      const attendeesSnap = await getDocs(
        collection(db, 'Rhema Church', 'rhema', 'events', evt.id, 'attendees')
      );
      const attendedMap = new Map<string, any>();
      attendeesSnap.forEach((docSnap) => {
        const ad = docSnap.data();
        const mId = ad.memberId || docSnap.id;
        if (mId) {
          attendedMap.set(mId, ad.timestamp || new Date());
        }
      });

      // 2. Merge church members with attendees
      const unifiedMap = new Map<string, UnifiedMember>();

      churchMembersList.forEach((m: any) => {
        unifiedMap.set(m.id, {
          id: m.id,
          name: m.name,
          phone: m.phone,
          status: attendedMap.has(m.id) ? 'Present' : 'Absent',
          timestamp: attendedMap.get(m.id),
          profilePicture: m.photoURL,
        });
      });

      // Add any attendee not in churchMembersList (e.g. visitors)
      attendeesSnap.forEach((docSnap) => {
        const ad = docSnap.data();
        const mId = ad.memberId || docSnap.id;
        if (mId && !unifiedMap.has(mId)) {
          unifiedMap.set(mId, {
            id: mId,
            name: ad.memberName || 'Guest / Visitor',
            phone: ad.memberPhone || '',
            status: 'Present',
            timestamp: ad.timestamp || new Date(),
            profilePicture: ad.photoURL || '',
          });
        }
      });

      const list = Array.from(unifiedMap.values());
      list.sort((a, b) => {
        if (a.status === 'Present' && b.status === 'Present') return 0;
        if (a.status === 'Present') return -1;
        if (b.status === 'Present') return 1;
        return a.name.localeCompare(b.name);
      });

      setAttendanceMembers(list);
    } catch (attErr) {
      console.error('Error loading event attendees:', attErr);
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  // Toggle Attendance Check-In (Mark Present / Absent)
  const handleToggleAttendance = async (member: UnifiedMember) => {
    if (!attendModalEvent) return;

    const newStatus = member.status === 'Present' ? 'Absent' : 'Present';
    const nowTimestamp = new Date();

    // Optimistically update local state
    setAttendanceMembers((prev) =>
      prev.map((m) =>
        m.id === member.id
          ? {
              ...m,
              status: newStatus,
              timestamp: newStatus === 'Present' ? nowTimestamp : undefined,
            }
          : m
      )
    );

    try {
      const attRef = doc(db, 'Rhema Church', 'rhema', 'events', attendModalEvent.id, 'attendees', member.id);
      if (newStatus === 'Present') {
        await setDoc(attRef, {
          memberId: member.id,
          memberName: member.name,
          memberPhone: member.phone || '',
          status: 'Present',
          timestamp: serverTimestamp(),
        });
        showToast(`${member.name} marked Present`);
      } else {
        await deleteDoc(attRef);
        showToast(`${member.name} marked Absent`);
      }
    } catch (err: any) {
      console.error('Failed to update attendance:', err);
      showToast('Error updating attendance: ' + err.message);
    }
  };

  // Export Attendance CSV
  const handleExportAttendanceCSV = () => {
    if (!attendModalEvent) return;
    const rows = [
      ['Member Name', 'Phone', 'Status', 'Check-In Time'],
      ...attendanceMembers.map((m) => [
        `"${m.name}"`,
        `"${m.phone || ''}"`,
        m.status,
        m.timestamp?.toDate
          ? m.timestamp.toDate().toLocaleTimeString()
          : m.timestamp instanceof Date
          ? m.timestamp.toLocaleTimeString()
          : '',
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rhema-Attendance-${attendModalEvent.title.replace(/\s+/g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Multi-Service & Setlist Handlers
  const handleAddService = () => {
    const newService: EventServiceItem = {
      id: `srv-${Date.now()}`,
      name: `Service ${formData.eventServices.length + 1}`,
      songs: [],
    };
    setFormData({
      ...formData,
      eventServices: [...formData.eventServices, newService],
    });
  };

  const handleRemoveService = (serviceId: string) => {
    setFormData({
      ...formData,
      eventServices: formData.eventServices.filter((s) => s.id !== serviceId),
    });
  };

  const handleUpdateServiceName = (serviceId: string, name: string) => {
    setFormData({
      ...formData,
      eventServices: formData.eventServices.map((s) => (s.id === serviceId ? { ...s, name } : s)),
    });
  };

  const handleUpdateServiceSongLeader = (serviceId: string, songLeader: string) => {
    setFormData({
      ...formData,
      eventServices: formData.eventServices.map((s) => (s.id === serviceId ? { ...s, songLeader } : s)),
    });
  };

  const handleRemoveSongFromService = (serviceId: string, songIdx: number) => {
    setFormData({
      ...formData,
      eventServices: formData.eventServices.map((s) => {
        if (s.id !== serviceId) return s;
        const newSongs = s.songs.filter((_, idx) => idx !== songIdx);
        return { ...s, songs: newSongs };
      }),
    });
  };

  const handleMoveSongInService = (serviceId: string, songIdx: number, direction: 'up' | 'down') => {
    setFormData({
      ...formData,
      eventServices: formData.eventServices.map((s) => {
        if (s.id !== serviceId) return s;
        const targetIdx = direction === 'up' ? songIdx - 1 : songIdx + 1;
        if (targetIdx < 0 || targetIdx >= s.songs.length) return s;
        const newSongs = [...s.songs];
        const [moved] = newSongs.splice(songIdx, 1);
        newSongs.splice(targetIdx, 0, moved);
        return { ...s, songs: newSongs };
      }),
    });
  };

  // Toggle song in active service from Song Picker Modal
  const handleToggleSongInPicker = (song: WorshipSong) => {
    if (!songPickerServiceId) return;

    setFormData({
      ...formData,
      eventServices: formData.eventServices.map((s) => {
        if (s.id !== songPickerServiceId) return s;
        const exists = s.songs.some((x) => x.id === song.id);
        const newSongs = exists ? s.songs.filter((x) => x.id !== song.id) : [...s.songs, song];
        return { ...s, songs: newSongs };
      }),
    });
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
        recurring: formData.isRecurring ? formData.recurring : 'One-time event',
        repeatPattern: formData.isRecurring ? formData.repeatPattern : 'One-time event',
        recurrenceDuration: formData.isRecurring ? formData.recurrenceDuration : 1,
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
        services: formData.eventServices,
        eventServices: formData.eventServices,
        hasWorshipServices: formData.eventServices.length > 0,
        requireEventQR: formData.qrCodeRequired,
        requireEventQr: formData.qrCodeRequired,
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

  // Filtered Attendance for Drawer
  const filteredAttendanceList = useMemo(() => {
    return attendanceMembers.filter((m) => {
      if (attendanceFilter === 'Present' && m.status !== 'Present') return false;
      if (attendanceFilter === 'Absent' && m.status !== 'Absent') return false;
      if (attendanceSearchQuery.trim()) {
        const q = attendanceSearchQuery.toLowerCase();
        return m.name.toLowerCase().includes(q) || (m.phone && m.phone.includes(q));
      }
      return true;
    });
  }, [attendanceMembers, attendanceFilter, attendanceSearchQuery]);

  const presentCount = attendanceMembers.filter((m) => m.status === 'Present').length;
  const absentCount = attendanceMembers.filter((m) => m.status === 'Absent').length;

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

          {/* STAT FILTER CARDS (Exact match to mobile app top pills) */}
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

          {/* TAB 1: EVENTS SCHEDULE */}
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

                          {/* Worship Services Configured */}
                          {evt.eventServices && evt.eventServices.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                              <Music size={12} />
                              <span>{evt.eventServices.length} Service{evt.eventServices.length > 1 ? 's' : ''} set</span>
                            </span>
                          )}
                        </div>

                        {/* RSVP Active Pill Banner */}
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

                        {/* Action Buttons Row */}
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

                          {/* 2. Attend (Opens full Event Attendance Screen) */}
                          <button
                            type="button"
                            onClick={() => openAttendanceModal(evt)}
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

          {/* TAB 2: RSVP ROSTER */}
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
          {/* NEW / EDIT EVENT FORM (Exact Mobile App Structure & Fields) */}
          {/* ========================================================= */}
          {isFormViewOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full p-5 sm:p-7 space-y-6 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto">
                {/* Form Header */}
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
                        Saves live to Firestore: <code className="font-mono text-amber-500">Rhema Church/rhema/events</code>
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

                  {/* CARD 2: DATE & SCHEDULE (With complete Recurring Fields) */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      <span className="p-1.5 rounded-lg bg-slate-900 text-white">
                        <CalendarIcon size={14} />
                      </span>
                      <span>DATE &amp; SCHEDULE</span>
                    </div>

                    {/* One-Time vs Recurring Toggle */}
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200/60 dark:bg-slate-900 rounded-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            isRecurring: false,
                            recurring: 'One-time event',
                            repeatPattern: 'One-time event',
                          });
                        }}
                        className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
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
                        onClick={() => {
                          const newEnd = addMonthsToDate(formData.startDate, formData.recurrenceDuration || 1);
                          setFormData({
                            ...formData,
                            isRecurring: true,
                            recurring: formData.recurring === 'One-time event' ? 'Every Sunday' : formData.recurring,
                            repeatPattern: formData.repeatPattern === 'One-time event' ? 'Every Sunday' : formData.repeatPattern,
                            endDate: newEnd,
                          });
                        }}
                        className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          formData.isRecurring
                            ? 'bg-black text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        <Repeat size={13} />
                        <span>Recurring</span>
                      </button>
                    </div>

                    {/* Date Inputs Grid (With Dynamic Labels for Recurring) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                          {formData.isRecurring ? 'SERIES START DATE *' : 'START DATE *'}
                        </label>
                        <input
                          type="date"
                          value={formData.startDate}
                          onChange={(e) => {
                            const newStart = e.target.value;
                            const newEnd = formData.isRecurring
                              ? addMonthsToDate(newStart, formData.recurrenceDuration)
                              : newStart;
                            setFormData({
                              ...formData,
                              startDate: newStart,
                              endDate: newEnd,
                            });
                          }}
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
                          {formData.isRecurring ? 'SERIES END DATE *' : 'END DATE *'}
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

                    {/* RECURRING OPTIONS (Only displayed when Recurring is selected!) */}
                    {formData.isRecurring && (
                      <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800/60 animate-in fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Repeat Pattern */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                              Repeat Pattern <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={formData.repeatPattern}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  repeatPattern: e.target.value,
                                  recurring: e.target.value,
                                })
                              }
                              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                            >
                              {RECURRING_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Recurrence Duration */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                              Recurrence Duration
                            </label>
                            <select
                              value={formData.recurrenceDuration}
                              onChange={(e) => {
                                const months = Number(e.target.value);
                                const newEnd = addMonthsToDate(formData.startDate, months);
                                setFormData({
                                  ...formData,
                                  recurrenceDuration: months,
                                  endDate: newEnd,
                                });
                              }}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                            >
                              {DURATION_OPTIONS.map((d) => (
                                <option key={d.value} value={d.value}>
                                  {d.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Recurring Info Card (Matching Mobile App exactly) */}
                        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <Repeat size={14} className="text-emerald-600 dark:text-emerald-400" />
                            <span className="inline-flex px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-extrabold uppercase tracking-wider">
                              {formData.repeatPattern === 'Every day' ? 'DAILY EVENT SERIES' : 'RECURRING EVENT SERIES'}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                            {formData.repeatPattern === 'Every day'
                              ? `Repeats Every Day from ${formatDisplayDate(formData.startDate)} to ${formatDisplayDate(formData.endDate)}`
                              : `Repeats (${formData.repeatPattern}) from ${formatDisplayDate(formData.startDate)} to ${formatDisplayDate(formData.endDate)}`}
                          </div>
                          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
                            Every occurrence in this period will automatically be generated in the church calendar. Attendance is recorded independently for each day.
                          </div>
                          <div className="text-[11px] text-emerald-600 dark:text-emerald-500 font-serif leading-relaxed">
                            ఈ కాలంలోని ప్రతి ఈవెంట్ స్వతంత్రంగా క్యాలెండర్‌లో సృష్టించబడుతుంది మరియు ప్రతి దినం హాజరు ప్రత్యేకంగా నమోదు చేయబడుతుంది.
                          </div>
                        </div>
                      </div>
                    )}
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

                    {/* Live Preview */}
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

                  {/* CARD 5: WORSHIP SERVICES & SONG SETLISTS (Exact Mobile App Implementation) */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="p-1.5 rounded-lg bg-emerald-500 text-white">
                          <Music size={14} />
                        </span>
                        <div>
                          <div className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                            Worship Services &amp; Song Setlists
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {formData.eventServices.length === 0
                              ? 'Optional: attach worship services & song setlists to this event'
                              : `${formData.eventServices.length} service${formData.eventServices.length > 1 ? 's' : ''} configured`}
                          </div>
                        </div>
                      </div>

                      {formData.eventServices.length > 0 && (
                        <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-extrabold tracking-wider">
                          ENABLED
                        </span>
                      )}
                    </div>

                    {/* List of Configured Services */}
                    {formData.eventServices.map((service, sIndex) => (
                      <div
                        key={service.id}
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3"
                      >
                        {/* Service Card Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-md bg-emerald-500 text-white text-xs font-black flex items-center justify-center">
                              {sIndex + 1}
                            </span>
                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                              SERVICE NAME <span className="text-red-500">*</span>
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveService(service.id)}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Trash2 size={12} />
                            <span>Remove</span>
                          </button>
                        </div>

                        {/* Service Name Input */}
                        <input
                          type="text"
                          value={service.name}
                          onChange={(e) => handleUpdateServiceName(service.id, e.target.value)}
                          placeholder="e.g. English Service, Morning Worship (Required)"
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white font-bold focus:outline-none"
                        />

                        {/* Song Leader (Optional) */}
                        <div className="space-y-1">
                          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                            SONG LEADER (OPTIONAL)
                          </label>
                          <input
                            type="text"
                            value={service.songLeader || ''}
                            onChange={(e) => handleUpdateServiceSongLeader(service.id, e.target.value)}
                            placeholder="e.g. Bro. David, Sis. Sarah"
                            className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white font-medium focus:outline-none"
                          />
                        </div>

                        {/* Song Setlist Sub-Section */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                              SONG SETLIST ({service.songs.length} songs)
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                setSongPickerServiceId(service.id);
                                setSongPickerSearch('');
                              }}
                              className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Plus size={12} />
                              <span>Select Songs</span>
                            </button>
                          </div>

                          {/* Songs List inside this Service */}
                          {service.songs.length === 0 ? (
                            <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 space-y-1">
                              <Music size={16} className="mx-auto text-slate-300" />
                              <div>No songs added yet for this service.</div>
                              <div className="text-[10px]">Click &apos;+ Select Songs&apos; to attach songs from songbook.</div>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {service.songs.map((song, songIdx) => (
                                <div
                                  key={song.id || songIdx}
                                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="font-extrabold text-slate-400 text-[11px] w-5">
                                      {songIdx + 1}.
                                    </span>
                                    <div className="truncate">
                                      <div className="font-bold text-slate-900 dark:text-white truncate">
                                        {song.title}
                                      </div>
                                      {song.titleTe && (
                                        <div className="text-[10px] text-slate-500 font-serif truncate">
                                          {song.titleTe}
                                        </div>
                                      )}
                                    </div>
                                    {song.key && (
                                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[9px] font-bold">
                                        {song.key}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      disabled={songIdx === 0}
                                      onClick={() => handleMoveSongInService(service.id, songIdx, 'up')}
                                      className="p-1 rounded text-slate-400 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                                      title="Move up"
                                    >
                                      <ArrowUp size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={songIdx === service.songs.length - 1}
                                      onClick={() => handleMoveSongInService(service.id, songIdx, 'down')}
                                      className="p-1 rounded text-slate-400 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                                      title="Move down"
                                    >
                                      <ArrowDown size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveSongFromService(service.id, songIdx)}
                                      className="p-1 rounded text-rose-500 hover:text-rose-700 cursor-pointer"
                                      title="Remove from setlist"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Action button to add worship service */}
                    <button
                      type="button"
                      onClick={handleAddService}
                      className="w-full py-3 rounded-xl bg-black hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Plus size={15} />
                      <span>{formData.eventServices.length === 0 ? 'Add Worship Service / Setlist' : 'Add Another Service'}</span>
                    </button>
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

                  {/* FOOTER ACTION BUTTONS */}
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
          {/* SONG PICKER MODAL (For Worship Services)                   */}
          {/* ========================================================= */}
          {songPickerServiceId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl relative max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Music size={18} className="text-emerald-500" />
                    <span>Select Worship Songs</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSongPickerServiceId(null)}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Search in Song Picker */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={songPickerSearch}
                    onChange={(e) => setSongPickerSearch(e.target.value)}
                    placeholder="Search song by title or category..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none"
                  />
                </div>

                {/* Songs Checkbox List */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 pr-1">
                  {availableSongs
                    .filter((s) => {
                      if (!songPickerSearch.trim()) return true;
                      const q = songPickerSearch.toLowerCase();
                      return s.title.toLowerCase().includes(q) || (s.titleTe && s.titleTe.includes(q));
                    })
                    .map((song) => {
                      const currentService = formData.eventServices.find((s) => s.id === songPickerServiceId);
                      const isSelected = currentService?.songs.some((x) => x.id === song.id);

                      return (
                        <div
                          key={song.id}
                          onClick={() => handleToggleSongInPicker(song)}
                          className="py-2.5 px-3 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl cursor-pointer"
                        >
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="font-bold text-slate-900 dark:text-white truncate">
                              {song.title}
                            </div>
                            {song.titleTe && (
                              <div className="text-[10px] text-slate-500 font-serif truncate">
                                {song.titleTe}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {song.key && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[9px] font-bold">
                                {song.key}
                              </span>
                            )}
                            <div
                              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                                isSelected
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'border-slate-300 dark:border-slate-700'
                              }`}
                            >
                              {isSelected && <Check size={12} strokeWidth={3} />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Done Button */}
                <div className="pt-2 flex justify-end border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSongPickerServiceId(null)}
                    className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold"
                  >
                    Done
                  </button>
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
          {/* EVENT ATTENDEES SCREEN (Exact Mobile App EventAttendeesScreen) */}
          {/* ========================================================= */}
          {attendModalEvent && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-5 sm:p-7 space-y-5 shadow-2xl relative my-auto max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setAttendModalEvent(null)}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                        {attendModalEvent.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <Building2 size={12} className="text-slate-400" />
                        <span>Rhema Church &bull; {formatDisplayDate(attendModalEvent.startDate)}</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">
                          RHEMA
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportAttendanceCSV}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer"
                      title="Export CSV"
                    >
                      <Download size={13} />
                      <span className="hidden sm:inline">Export CSV</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAttendModalEvent(null)}
                      className="p-1.5 text-slate-400 hover:text-slate-600"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Filter Pills (All, Present, Absent matching mobile app) */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAttendanceFilter('All')}
                    className={`py-2 rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
                      attendanceFilter === 'All'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    All ({attendanceMembers.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setAttendanceFilter('Present')}
                    className={`py-2 rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
                      attendanceFilter === 'Present'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100'
                    }`}
                  >
                    Present ({presentCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => setAttendanceFilter('Absent')}
                    className={`py-2 rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
                      attendanceFilter === 'Absent'
                        ? 'bg-slate-700 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    Absent ({absentCount})
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={attendanceSearchQuery}
                    onChange={(e) => setAttendanceSearchQuery(e.target.value)}
                    placeholder="Search attendees by name or phone..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none"
                  />
                </div>

                {/* Attendees List */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 pr-1 max-h-[50vh]">
                  {isAttendanceLoading ? (
                    <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                      <RefreshCw size={16} className="animate-spin text-emerald-500" />
                      <span>Loading church member list...</span>
                    </div>
                  ) : filteredAttendanceList.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No matching attendees found.
                    </div>
                  ) : (
                    filteredAttendanceList.map((member) => {
                      const avatar = getAvatarColor(member.name);

                      return (
                        <div
                          key={member.id}
                          className="py-3 px-2 flex items-center justify-between text-xs hover:bg-slate-50/80 dark:hover:bg-slate-800/40 rounded-xl transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {member.profilePicture ? (
                              <img
                                src={member.profilePicture}
                                alt={member.name}
                                className="w-10 h-10 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${avatar.bg} ${avatar.text}`}
                              >
                                {getInitials(member.name)}
                              </div>
                            )}

                            <div className="min-w-0 truncate">
                              <div className="font-bold text-slate-900 dark:text-white truncate">
                                {member.name}
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                                <span>{member.phone || 'No Phone'}</span>
                                {member.status === 'Present' && member.timestamp && (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                    &bull; Checked in
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                member.status === 'Present'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {member.status}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleToggleAttendance(member)}
                              className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                                member.status === 'Present'
                                  ? 'border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-100'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                              }`}
                            >
                              {member.status === 'Present' ? 'Mark Absent' : 'Mark Present'}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="pt-2 flex justify-end border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setAttendModalEvent(null)}
                    className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold"
                  >
                    Done
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
