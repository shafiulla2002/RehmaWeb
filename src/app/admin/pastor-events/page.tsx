'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AdminNavigationShell } from '@/components/layout/AdminNavigationShell';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  onSnapshot,
  writeBatch,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  INITIAL_ADMIN_PASTOR_EVENTS,
  AdminPastorEventItem as BasePastorEventItem,
  PastorAppointmentType,
  TransitMode,
  PastorItineraryWaypoint,
  INITIAL_ADMIN_EVENTS,
  AdminEventRecord,
} from '@/lib/adminWave7cData';
import {
  INITIAL_ADMIN_MEMBERS,
  AdminMemberRecord,
  INITIAL_ADMIN_PRAYER,
  AdminPrayerModerationItem,
  INITIAL_ADMIN_CARECELLS,
  AdminCareCellRecord,
} from '@/lib/adminWave7bData';
import {
  Navigation,
  Compass,
  MapPin,
  Calendar,
  CalendarDays,
  Clock,
  Phone,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Mic,
  Volume2,
  Sparkles,
  Plus,
  Edit3,
  Trash2,
  Copy,
  RotateCcw,
  X,
  User,
  HeartHandshake,
  Video,
  Layers,
  Search,
  Filter,
  ArrowRight,
  ArrowLeft,
  Route,
  Map as MapIcon,
  Car,
  Bike,
  Footprints,
  Info,
  Radio,
  FileText,
  Send,
  MessageSquare,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

const STORAGE_KEY_PASTOR_EVENTS = '@rhema_admin_m42_pastor_events';

// =========================================================================
// TYPES & EXTENDED MODELS FOR M42
// =========================================================================

export type PastorAppointmentStatus =
  | 'Scheduled'
  | 'En Route (Simulated)'
  | 'In Progress (Simulated)'
  | 'Completed (Simulated)'
  | 'Cancelled';

export type TransitBufferStatus =
  | 'Schedule Collision'
  | 'Tight Transit Warning'
  | 'Healthy Transit Buffer';

export interface M42PastorAppointment {
  id: string; // e.g. "PASTOR-EVT-101"
  demoTag: 'Simulated Pastor Itinerary (Demo)';
  pastorId: string; // e.g. "PASTOR-01"
  pastorName: string; // e.g. "Senior Pastor John Mark"
  title: string;
  appointmentType: PastorAppointmentType;
  status: PastorAppointmentStatus;
  date: string; // YYYY-MM-DD
  startTime: string; // e.g. "10:00 AM"
  endTime: string; // e.g. "11:15 AM"

  // Canonical Integrations
  memberOrFamilyName: string;
  memberId?: string; // M33 Member Link (INITIAL_ADMIN_MEMBERS)
  m35EscalatedPrayerId?: string; // M35 Urgent Moderated Prayer Link (INITIAL_ADMIN_PRAYER)
  m13PublicPrayerRefId?: string; // M13 Public Prayer Wall Link
  churchCalendarEventId?: string; // M08 Church Events Calendar Link

  // Optional Cross-Links
  careCellId?: string; // M37 Care Cell Link (INITIAL_ADMIN_CARECELLS)
  onlineMeetingId?: string; // M22 Online Meetings Link
  adminEventId?: string; // M40 Admin Events Link (INITIAL_ADMIN_EVENTS)

  maskedPhone: string;
  destinationAddress: string;
  zone: string; // Synthetic Metro Zone
  priorityLevel: 'High (Emergency)' | 'Normal' | 'Routine';
  hasScheduleConflict: boolean;
  transitBufferStatus?: TransitBufferStatus;
  bufferMinutesToNext?: number;
  transitMode: TransitMode;
  waypoints: PastorItineraryWaypoint[];
  pastoralNotes: string;
  anointingOilRequired: boolean;
  communionRequired: boolean;
}

// Synthetic Pastoral Identities for Demo Switcher
export interface PastoralIdentity {
  id: string;
  name: string;
  roleTitle: string;
  avatarBg: string;
}

const PASTORAL_IDENTITIES: PastoralIdentity[] = [
  { id: 'PASTOR-01', name: 'Senior Pastor John Mark', roleTitle: 'Senior Lead Pastor', avatarBg: 'bg-emerald-600' },
  { id: 'PASTOR-02', name: 'Associate Pastor Timothy Roy', roleTitle: 'Pastoral Care & Hospital Visits', avatarBg: 'bg-blue-600' },
  { id: 'PASTOR-03', name: 'Youth Pastor Andrew Paul', roleTitle: 'Youth & Discipleship Pastor', avatarBg: 'bg-purple-600' },
  { id: 'PASTOR-04', name: 'Sister Mary Stephen', roleTitle: 'Family Welfare & Counseling', avatarBg: 'bg-rose-600' },
];

// Synthetic Metro Zones (Bangalore illustrative testbed with explicit simulation labels)
export interface SyntheticMetroZone {
  key: string;
  displayName: string;
  x: number; // SVG coordinate
  y: number; // SVG coordinate
}

const SYNTHETIC_METRO_ZONES: Record<string, SyntheticMetroZone> = {
  'Central Sanctuary': {
    key: 'Central Sanctuary',
    displayName: 'Simulated Zone A (Central Sanctuary · Indiranagar)',
    x: 280,
    y: 170,
  },
  'South Zone': {
    key: 'South Zone',
    displayName: 'Simulated Zone B (South Zone · Bannerghatta Road)',
    x: 130,
    y: 330,
  },
  'Whitefield Zone': {
    key: 'Whitefield Zone',
    displayName: 'Simulated Zone C (East Zone · Whitefield)',
    x: 430,
    y: 190,
  },
  'Koramangala Zone': {
    key: 'Koramangala Zone',
    displayName: 'Simulated Zone D (Southeast Zone · Koramangala)',
    x: 290,
    y: 280,
  },
  'Hebbal Zone': {
    key: 'Hebbal Zone',
    displayName: 'Simulated Zone E (North Zone · Hebbal)',
    x: 230,
    y: 60,
  },
};

// Deterministic Distance Matrix (KM) between Synthetic Zones
const ZONE_DISTANCE_MATRIX: Record<string, Record<string, number>> = {
  'Central Sanctuary': { 'Central Sanctuary': 0, 'South Zone': 14.2, 'Whitefield Zone': 16.5, 'Koramangala Zone': 6.8, 'Hebbal Zone': 11.4 },
  'South Zone': { 'Central Sanctuary': 14.2, 'South Zone': 0, 'Whitefield Zone': 22.8, 'Koramangala Zone': 9.5, 'Hebbal Zone': 21.0 },
  'Whitefield Zone': { 'Central Sanctuary': 16.5, 'South Zone': 22.8, 'Whitefield Zone': 0, 'Koramangala Zone': 18.2, 'Hebbal Zone': 24.5 },
  'Koramangala Zone': { 'Central Sanctuary': 6.8, 'South Zone': 9.5, 'Whitefield Zone': 18.2, 'Koramangala Zone': 0, 'Hebbal Zone': 16.0 },
  'Hebbal Zone': { 'Central Sanctuary': 11.4, 'South Zone': 21.0, 'Whitefield Zone': 24.5, 'Koramangala Zone': 16.0, 'Hebbal Zone': 0 },
};

// Average transit speeds (KM/H) for simulated transit time
const TRANSIT_SPEEDS_KMH: Record<TransitMode, number> = {
  Car: 25, // Urban city average with traffic
  Bike: 30,
  Walk: 4.5,
};

// Initial Seed Dataset for M42 (Mapped with M33, M35, M08)
const BASELINE_M42_EVENTS: M42PastorAppointment[] = [
  {
    id: 'PASTOR-EVT-101',
    demoTag: 'Simulated Pastor Itinerary (Demo)',
    pastorId: 'PASTOR-01',
    pastorName: 'Senior Pastor John Mark',
    title: 'Emergency ICU Anointing & Prayer Visitation',
    appointmentType: 'Hospital ICU Visitation',
    status: 'Scheduled',
    date: '2026-11-24',
    startTime: '10:00 AM',
    endTime: '11:15 AM',
    memberOrFamilyName: 'Deacon John Peter (Family of Patient)',
    memberId: 'RHEMA-2026-M001',
    m35EscalatedPrayerId: 'PRAY-MOD-101',
    m13PublicPrayerRefId: 'prayer-1',
    churchCalendarEventId: 'EVT-CAL-2026-01',
    adminEventId: 'EVT-2026-01',
    careCellId: 'CELL-HEBBAL-01',
    maskedPhone: '+91 98450-XXXX1',
    destinationAddress: 'Apollo Hospital ICU Ward 4B, Bannerghatta Road',
    zone: 'South Zone',
    priorityLevel: 'High (Emergency)',
    hasScheduleConflict: false,
    transitMode: 'Car',
    waypoints: [
      { id: 'WP-01', stopOrder: 1, addressLabel: 'Rhema Central Sanctuary', neighborhoodZone: 'Indiranagar', distanceKmFromPrev: 0, transitDurationMin: 0 },
      { id: 'WP-02', stopOrder: 2, addressLabel: 'Apollo Hospital ICU Ward 4B', neighborhoodZone: 'Bannerghatta Road', distanceKmFromPrev: 14.2, transitDurationMin: 34 },
    ],
    pastoralNotes: 'Patient undergoing critical surgery recovery. Bring holy anointing oil and communion elements. M35 escalated request.',
    anointingOilRequired: true,
    communionRequired: true,
  },
  {
    id: 'PASTOR-EVT-102',
    demoTag: 'Simulated Pastor Itinerary (Demo)',
    pastorId: 'PASTOR-01',
    pastorName: 'Senior Pastor John Mark',
    title: 'New Home Blessing & Family Dedication Prayer',
    appointmentType: 'Home Blessing & Prayer',
    status: 'Scheduled',
    date: '2026-11-24',
    startTime: '02:30 PM',
    endTime: '04:00 PM',
    memberOrFamilyName: 'Brother Stephen & Sister Mary George (Demo)',
    memberId: 'RHEMA-2026-M002',
    m13PublicPrayerRefId: 'prayer-2',
    maskedPhone: '+91 98450-XXXX2',
    destinationAddress: 'Villa 42, Prestige Palms, Whitefield Main Road',
    zone: 'Whitefield Zone',
    priorityLevel: 'Normal',
    hasScheduleConflict: false,
    transitMode: 'Car',
    waypoints: [
      { id: 'WP-03', stopOrder: 1, addressLabel: 'Apollo Hospital ICU', neighborhoodZone: 'Bannerghatta Road', distanceKmFromPrev: 0, transitDurationMin: 0 },
      { id: 'WP-04', stopOrder: 2, addressLabel: 'Prestige Palms Villa 42', neighborhoodZone: 'Whitefield', distanceKmFromPrev: 22.8, transitDurationMin: 55 },
    ],
    pastoralNotes: 'Family moving into new residence. Dedication prayer and home blessing certificate presentation.',
    anointingOilRequired: true,
    communionRequired: false,
  },
  {
    id: 'PASTOR-EVT-103',
    demoTag: 'Simulated Pastor Itinerary (Demo)',
    pastorId: 'PASTOR-01',
    pastorName: 'Senior Pastor John Mark',
    title: 'Pre-Marital Discipleship Counseling (Session 3 of 4)',
    appointmentType: 'Pre-Marital Counseling',
    status: 'Scheduled',
    date: '2026-11-24',
    startTime: '05:30 PM',
    endTime: '07:00 PM',
    memberOrFamilyName: 'Brother Kevin & Sister Anitha (Demo)',
    memberId: 'RHEMA-2026-M003',
    maskedPhone: '+91 98450-XXXX3',
    destinationAddress: 'Pastoral Counseling Suite, Rhema Central Sanctuary',
    zone: 'Central Sanctuary',
    priorityLevel: 'Normal',
    hasScheduleConflict: false,
    transitMode: 'Car',
    waypoints: [
      { id: 'WP-05', stopOrder: 1, addressLabel: 'Prestige Palms Villa 42', neighborhoodZone: 'Whitefield', distanceKmFromPrev: 0, transitDurationMin: 0 },
      { id: 'WP-06', stopOrder: 2, addressLabel: 'Pastoral Counseling Suite', neighborhoodZone: 'Indiranagar', distanceKmFromPrev: 16.5, transitDurationMin: 40 },
    ],
    pastoralNotes: 'Topic: Biblical Finances & Covenant Marriage Foundations (Ephesians 5:21-33).',
    anointingOilRequired: false,
    communionRequired: false,
  },
];

// Helper to convert time string (e.g. "10:30 AM") to minutes from midnight
function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(' ');
  if (parts.length < 2) return 0;
  const [hourMin, modifier] = parts;
  const [hours, mins] = hourMin.split(':').map(Number);
  let totalHours = hours;
  if (modifier.toUpperCase() === 'PM' && totalHours < 12) totalHours += 12;
  if (modifier.toUpperCase() === 'AM' && totalHours === 12) totalHours = 0;
  return totalHours * 60 + (mins || 0);
}

// Voice Assistant Simulated Responses
interface AssistantMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export default function AdminPastorEventsPage() {
  // Tabs: 'overview' | 'route-planner' | 'voice-assistant' | 'dossier' | 'conflicts'
  const [activeTab, setActiveTab] = useState<'overview' | 'route-planner' | 'voice-assistant' | 'dossier' | 'conflicts'>('overview');

  // Pastoral Identity Demo Switcher
  const [selectedPastorId, setSelectedPastorId] = useState<string>('PASTOR-01');
  const [selectedDate, setSelectedDate] = useState<string>('2026-11-24');

  // Core Itinerary State
  const [appointments, setAppointments] = useState<M42PastorAppointment[]>(BASELINE_M42_EVENTS);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>('PASTOR-EVT-101');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Mobile Itinerary Matching States
  const [itineraryTab, setItineraryTab] = useState<'today' | 'upcoming' | 'past'>('today');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [startingLocation, setStartingLocation] = useState<string>('Church of God, Hyderabad');
  const [isUpdatingLocation, setIsUpdatingLocation] = useState<boolean>(false);
  const [isRoutePlanModalOpen, setIsRoutePlanModalOpen] = useState<boolean>(false);
  const [isMapViewModalOpen, setIsMapViewModalOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('@rhema_pastor_starting_loc');
      if (saved) setStartingLocation(saved);
    } catch {}
  }, []);

  const handleUpdateStartingLocation = () => {
    setIsUpdatingLocation(true);
    try {
      localStorage.setItem('@rhema_pastor_starting_loc', startingLocation);
    } catch {}
    setTimeout(() => {
      setIsUpdatingLocation(false);
      showToast('Starting location updated successfully');
    }, 350);
  };

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [deletingTargetId, setDeletingTargetId] = useState<string | null>(null);

  // AI Voice Assistant State (Layer A Simulation)
  const [isVoiceSpeaking, setIsVoiceSpeaking] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([
    {
      id: 'msg-01',
      sender: 'assistant',
      text: 'Good morning, Senior Pastor. I have synchronized your pastoral itinerary for today. 3 appointments are scheduled across South Zone, East Zone, and Central Sanctuary. Zero schedule collisions detected.',
      timestamp: '09:00 AM',
    },
  ]);

  // Form State for Create & Edit (Mobile Step-by-Step Aligned)
  const [modalStep, setModalStep] = useState<number>(1);
  const [formData, setFormData] = useState({
    title: '',
    appointmentType: 'Home Blessing & Prayer' as PastorAppointmentType,
    date: '2026-11-24',
    startTime: '11:30 AM',
    endTime: '12:45 PM',
    venue: '',
    city: '',
    address: '',
    description: '',
    memberOrFamilyName: '',
    memberId: 'RHEMA-2026-M001',
    m35EscalatedPrayerId: '',
    m13PublicPrayerRefId: '',
    churchCalendarEventId: '',
    careCellId: '',
    onlineMeetingId: '',
    adminEventId: '',
    maskedPhone: '+91 98450-XXXX1',
    destinationAddress: '',
    zone: 'South Zone',
    priorityLevel: 'Normal' as 'High (Emergency)' | 'Normal' | 'Routine',
    transitMode: 'Car' as TransitMode,
    pastoralNotes: '',
    anointingOilRequired: true,
    communionRequired: false,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Active Pastor Record
  const activePastor = useMemo(() => {
    return PASTORAL_IDENTITIES.find((p) => p.id === selectedPastorId) || PASTORAL_IDENTITIES[0];
  }, [selectedPastorId]);

  // Real-time Firestore sync with baseline seed fallback
  useEffect(() => {
    const colRef = collection(db, 'Rhema Church', 'rhema', 'pastorEvents');
    const unsubscribe = onSnapshot(
      colRef,
      async (snapshot) => {
        if (snapshot.empty) {
          try {
            const batch = writeBatch(db);
            BASELINE_M42_EVENTS.forEach((item) => {
              const docRef = doc(colRef, item.id);
              batch.set(docRef, {
                ...item,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            });
            await batch.commit();
          } catch (seedErr) {
            console.error('[AdminPastorEventsPage] Seeding error:', seedErr);
            setAppointments(BASELINE_M42_EVENTS);
          }
        } else {
          const loaded: M42PastorAppointment[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              demoTag: 'Simulated Pastor Itinerary (Demo)',
              pastorId: data.pastorId || 'PASTOR-01',
              pastorName: data.pastorName || 'Senior Pastor John Mark',
              title: data.title || 'Pastoral Appointment',
              appointmentType: data.appointmentType || 'Home Blessing & Prayer',
              status: data.status || 'Scheduled',
              date: data.date || '2026-11-24',
              startTime: data.startTime || '10:00 AM',
              endTime: data.endTime || '11:15 AM',
              memberOrFamilyName: data.memberOrFamilyName || 'Church Family',
              memberId: data.memberId,
              m35EscalatedPrayerId: data.m35EscalatedPrayerId,
              m13PublicPrayerRefId: data.m13PublicPrayerRefId,
              churchCalendarEventId: data.churchCalendarEventId,
              careCellId: data.careCellId,
              maskedPhone: data.maskedPhone || '+91 98450-XXXXX',
              destinationAddress: data.destinationAddress || 'Church Campus',
              zone: data.zone || 'Central Sanctuary',
              priorityLevel: data.priorityLevel || 'Normal',
              hasScheduleConflict: Boolean(data.hasScheduleConflict),
              transitMode: data.transitMode || 'Car',
              waypoints: data.waypoints || [],
              pastoralNotes: data.pastoralNotes || '',
              anointingOilRequired: Boolean(data.anointingOilRequired),
              communionRequired: Boolean(data.communionRequired),
            };
          });
          setAppointments(loaded);
          if (loaded.length > 0 && !loaded.some((a) => a.id === selectedAppointmentId)) {
            setSelectedAppointmentId(loaded[0].id);
          }
        }
      },
      (err) => {
        console.error('[AdminPastorEventsPage] Firestore error:', err);
        setAppointments(BASELINE_M42_EVENTS);
      }
    );

    return () => unsubscribe();
  }, []);

  const persistAppointments = async (items: M42PastorAppointment[]) => {
    setAppointments(items);
    try {
      const batch = writeBatch(db);
      const colRef = collection(db, 'Rhema Church', 'rhema', 'pastorEvents');
      items.forEach((item) => {
        const docRef = doc(colRef, item.id);
        batch.set(
          docRef,
          {
            ...item,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      });
      await batch.commit();
    } catch (err) {
      console.error('[AdminPastorEventsPage] Firestore persist error:', err);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleResetDemoData = async () => {
    try {
      const batch = writeBatch(db);
      const colRef = collection(db, 'Rhema Church', 'rhema', 'pastorEvents');
      BASELINE_M42_EVENTS.forEach((item) => {
        batch.set(doc(colRef, item.id), {
          ...item,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
    } catch (err) {
      console.error('[AdminPastorEventsPage] Reset error:', err);
    }
    setAppointments(BASELINE_M42_EVENTS);
    setSelectedAppointmentId(BASELINE_M42_EVENTS[0].id);
    showToast('Reset to baseline pastoral itinerary');
  };

  // Filtered Appointments for Selected Pastor & Date
  const filteredAppointments = useMemo(() => {
    return appointments.filter((item) => {
      const matchesPastor = !item.pastorId || item.pastorId === selectedPastorId;
      const matchesDate = !selectedDate || item.date === selectedDate;
      const matchesType = filterType === 'ALL' || item.appointmentType === filterType;
      const matchesSearch =
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.memberOrFamilyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.destinationAddress.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesPastor && matchesDate && matchesType && matchesSearch;
    });
  }, [appointments, selectedPastorId, selectedDate, filterType, searchQuery]);

  // Chronologically Sorted Appointments for Active Pastor & Day
  const sortedDayAppointments = useMemo(() => {
    return [...filteredAppointments].sort((a, b) => {
      return parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
    });
  }, [filteredAppointments]);

  // Active Selected Appointment
  const activeAppointment = useMemo(() => {
    return (
      sortedDayAppointments.find((a) => a.id === selectedAppointmentId) ||
      sortedDayAppointments[0] ||
      appointments[0]
    );
  }, [sortedDayAppointments, selectedAppointmentId, appointments]);

  // Helper for today's date in YYYY-MM-DD
  const getTodayDateStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Categorize appointments into today, upcoming, past matching mobile app
  const categorizedAppointments = useMemo(() => {
    const today = getTodayDateStr();
    return appointments.map((apt) => {
      let section: 'today' | 'upcoming' | 'past' = 'upcoming';
      if (apt.date === today) {
        section = 'today';
      } else if (apt.date < today) {
        section = 'past';
      }
      return { ...apt, section };
    });
  }, [appointments]);

  // Mobile Itinerary Displayed Events
  const mobileDisplayedAppointments = useMemo(() => {
    let list = selectedDateFilter
      ? categorizedAppointments.filter((a) => a.date === selectedDateFilter)
      : categorizedAppointments.filter((a) => a.section === itineraryTab);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.memberOrFamilyName.toLowerCase().includes(q) ||
          a.destinationAddress.toLowerCase().includes(q) ||
          a.appointmentType.toLowerCase().includes(q)
      );
    }

    if (filterType !== 'ALL') {
      list = list.filter((a) => a.appointmentType === filterType);
    }

    return list.sort((a, b) => {
      if (a.date !== b.date) {
        return itineraryTab === 'past' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date);
      }
      return itineraryTab === 'past'
        ? parseTimeToMinutes(b.startTime) - parseTimeToMinutes(a.startTime)
        : parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
    });
  }, [categorizedAppointments, selectedDateFilter, itineraryTab, searchQuery, filterType]);

  // Mobile Stats
  const mobileTotalEvents = mobileDisplayedAppointments.length;

  const mobileTotalDistance = useMemo(() => {
    if (mobileDisplayedAppointments.length === 0) return 0;
    return mobileDisplayedAppointments.reduce((acc, apt) => {
      const wDist = apt.waypoints.reduce((wAcc, w) => wAcc + (w.distanceKmFromPrev || 0), 0);
      return acc + (wDist > 0 ? wDist : 14.2);
    }, 0);
  }, [mobileDisplayedAppointments]);

  const mobileTotalTravelTime = useMemo(() => {
    if (mobileDisplayedAppointments.length === 0) return 0;
    return mobileDisplayedAppointments.reduce((acc, apt) => {
      const wMins = apt.waypoints.reduce((wAcc, w) => wAcc + (w.transitDurationMin || 0), 0);
      return acc + (wMins > 0 ? wMins : 30);
    }, 0);
  }, [mobileDisplayedAppointments]);

  const formatDurationMins = (mins: number) => {
    if (mins === 0) return '0 m';
    if (mins < 60) return `${mins} m`;
    const h = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
  };

  const formatEventDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts;
        const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return `${days[dateObj.getDay()]} ${d}-${m}-${y}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // =========================================================================
  // DETERMINISTIC ROUTE & BUFFER CALCULATION ENGINE
  // =========================================================================

  interface EvaluatedLeg {
    fromTitle: string;
    fromZone: string;
    toTitle: string;
    toZone: string;
    distanceKm: number;
    transitDurationMin: number;
    transitMode: TransitMode;
    availableBufferMin: number;
    status: TransitBufferStatus;
  }

  const evaluatedRouteLegs = useMemo(() => {
    const legs: EvaluatedLeg[] = [];
    if (sortedDayAppointments.length < 2) return legs;

    for (let i = 0; i < sortedDayAppointments.length - 1; i++) {
      const current = sortedDayAppointments[i];
      const next = sortedDayAppointments[i + 1];

      const fromZone = current.zone || 'Central Sanctuary';
      const toZone = next.zone || 'Central Sanctuary';

      // Lookup distance
      const distance = ZONE_DISTANCE_MATRIX[fromZone]?.[toZone] ?? 12.0;
      const speed = TRANSIT_SPEEDS_KMH[current.transitMode || 'Car'];
      const transitDurationMin = Math.round((distance / speed) * 60);

      // Buffer Formula: Next Start Time - (Current End Time + Transit Duration)
      const currentEndMin = parseTimeToMinutes(current.endTime);
      const nextStartMin = parseTimeToMinutes(next.startTime);
      const availableBufferMin = nextStartMin - (currentEndMin + transitDurationMin);

      // Exact Buffer Rules from Specification:
      // Buffer < 0 mins -> 'Schedule Collision'
      // Buffer 0 through 14 mins -> 'Tight Transit Warning'
      // Buffer >= 15 mins -> 'Healthy Transit Buffer'
      let status: TransitBufferStatus = 'Healthy Transit Buffer';
      if (availableBufferMin < 0) {
        status = 'Schedule Collision';
      } else if (availableBufferMin < 15) {
        status = 'Tight Transit Warning';
      }

      legs.push({
        fromTitle: current.title,
        fromZone,
        toTitle: next.title,
        toZone,
        distanceKm: distance,
        transitDurationMin,
        transitMode: current.transitMode || 'Car',
        availableBufferMin,
        status,
      });
    }

    return legs;
  }, [sortedDayAppointments]);

  // Overall Day Travel Metrics
  const travelMetrics = useMemo(() => {
    const totalKm = evaluatedRouteLegs.reduce((acc, leg) => acc + leg.distanceKm, 0);
    const totalTransitMin = evaluatedRouteLegs.reduce((acc, leg) => acc + leg.transitDurationMin, 0);
    const collisionCount = evaluatedRouteLegs.filter((leg) => leg.status === 'Schedule Collision').length;
    const tightWarningCount = evaluatedRouteLegs.filter((leg) => leg.status === 'Tight Transit Warning').length;
    const highPriorityCount = sortedDayAppointments.filter((a) => a.priorityLevel === 'High (Emergency)').length;

    return {
      totalKm,
      totalTransitMin,
      collisionCount,
      tightWarningCount,
      highPriorityCount,
      appointmentCount: sortedDayAppointments.length,
    };
  }, [evaluatedRouteLegs, sortedDayAppointments]);

  // =========================================================================
  // SIMULATED AI VOICE ASSISTANT HANDLER (LAYER A SIMULATION ONLY)
  // =========================================================================

  const speakText = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.onstart = () => setIsVoiceSpeaking(true);
        utterance.onend = () => setIsVoiceSpeaking(false);
        utterance.onerror = () => setIsVoiceSpeaking(false);
        window.speechSynthesis.speak(utterance);
      } catch {
        setIsVoiceSpeaking(false);
      }
    } else {
      setIsVoiceSpeaking(false);
    }
  };

  const handleTriggerVoiceCommand = (commandType: string) => {
    let userPrompt = '';
    let assistantReply = '';

    if (commandType === 'next') {
      userPrompt = 'What is my next appointment?';
      if (sortedDayAppointments.length > 0) {
        const next = sortedDayAppointments[0];
        assistantReply = `Your next scheduled appointment is "${next.title}" with ${next.memberOrFamilyName} at ${next.startTime}. It is located in ${next.zone} at ${next.destinationAddress}. Priority is ${next.priorityLevel}.`;
      } else {
        assistantReply = 'You have no further appointments scheduled for today. You are free to return to Central Sanctuary.';
      }
    } else if (commandType === 'route') {
      userPrompt = 'Simulate route to next destination';
      if (evaluatedRouteLegs.length > 0) {
        const leg = evaluatedRouteLegs[0];
        assistantReply = `Simulated route calculated to ${leg.toTitle}. Estimated travel distance is ${leg.distanceKm} km with an estimated transit time of ${leg.transitDurationMin} minutes via ${leg.transitMode}. Buffer health is marked as ${leg.status}.`;
      } else {
        assistantReply = 'Only one appointment is active on this day. Estimated transit from Sanctuary is 14.2 km (34 minutes).';
      }
    } else if (commandType === 'summary') {
      userPrompt = "Summarize today's itinerary";
      assistantReply = `Summary for ${activePastor.name} on ${selectedDate}: You have ${travelMetrics.appointmentCount} appointments covering approximately ${travelMetrics.totalKm} simulated kilometers. ${travelMetrics.highPriorityCount > 0 ? `${travelMetrics.highPriorityCount} urgent hospital visitation requires immediate pastoral attention.` : 'All appointments are within normal parameters.'} ${travelMetrics.collisionCount > 0 ? `Alert: ${travelMetrics.collisionCount} schedule collision detected.` : 'Transit buffers are healthy.'}`;
    } else if (commandType === 'note') {
      userPrompt = 'Add pastoral note to active visit';
      assistantReply = `Dictation captured: "Anointing prayer completed. Family comforted. Requested follow-up with care cell leader." Note appended to ${activeAppointment?.title || 'active visit'}.`;
      if (activeAppointment) {
        const updated = appointments.map((a) =>
          a.id === activeAppointment.id
            ? { ...a, pastoralNotes: `${a.pastoralNotes} [Voice Note]: Anointing prayer completed. Family comforted.` }
            : a
        );
        persistAppointments(updated);
      }
    } else if (commandType === 'complete') {
      userPrompt = 'Mark current visit completed';
      if (activeAppointment) {
        assistantReply = `Visit "${activeAppointment.title}" has been marked as Completed (Simulated). Waypoint checked. Ready for next destination.`;
        const updated = appointments.map((a) =>
          a.id === activeAppointment.id ? { ...a, status: 'Completed (Simulated)' as PastorAppointmentStatus } : a
        );
        persistAppointments(updated);
      } else {
        assistantReply = 'No active visit is currently selected.';
      }
    }

    const newMsgs: AssistantMessage[] = [
      ...assistantMessages,
      { id: `user-${Date.now()}`, sender: 'user', text: userPrompt, timestamp: 'Just now' },
      { id: `asst-${Date.now()}`, sender: 'assistant', text: assistantReply, timestamp: 'Just now' },
    ];
    setAssistantMessages(newMsgs);
    speakText(assistantReply);
  };

  // =========================================================================
  // APPOINTMENT CRUD HANDLERS
  // =========================================================================

  const openCreateModal = () => {
    setModalStep(1);
    setFormData({
      title: '',
      appointmentType: 'Home Blessing & Prayer',
      date: selectedDate || '2026-11-24',
      startTime: '11:30 AM',
      endTime: '12:45 PM',
      venue: 'Calvary Temple Sanctuary',
      city: 'Guntur',
      address: 'Ring Road, Arundelpet, Guntur, AP, 522002',
      description: 'Pastoral family blessing and home dedication service.',
      memberOrFamilyName: 'Brother David K. Joseph (Demo)',
      memberId: 'RHEMA-2026-M001',
      m35EscalatedPrayerId: '',
      m13PublicPrayerRefId: '',
      churchCalendarEventId: '',
      careCellId: '',
      onlineMeetingId: '',
      adminEventId: '',
      maskedPhone: '+91 98450-XXXX1',
      destinationAddress: 'Calvary Temple Sanctuary — Guntur — Ring Road, Arundelpet, Guntur, AP, 522002',
      zone: 'Whitefield Zone',
      priorityLevel: 'Normal',
      transitMode: 'Car',
      pastoralNotes: 'Bring holy anointing oil and communion elements.',
      anointingOilRequired: true,
      communionRequired: false,
    });
    setFormErrors({});
    setIsCreateModalOpen(true);
  };

  const openEditModal = (item: M42PastorAppointment) => {
    setModalStep(1);
    setEditingTargetId(item.id);
    
    // Parse venue, city, address
    const parts = (item.destinationAddress || '').split(' — ').map(p => p.trim());
    const vName = parts[0] || item.destinationAddress || '';
    const cName = parts[1] || 'Guntur';
    const aName = parts.length > 2 ? parts.slice(2).join(' — ') : (parts[1] || item.destinationAddress || '');

    setFormData({
      title: item.title,
      appointmentType: item.appointmentType,
      date: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
      venue: vName,
      city: cName,
      address: aName,
      description: item.pastoralNotes || '',
      memberOrFamilyName: item.memberOrFamilyName,
      memberId: item.memberId || '',
      m35EscalatedPrayerId: item.m35EscalatedPrayerId || '',
      m13PublicPrayerRefId: item.m13PublicPrayerRefId || '',
      churchCalendarEventId: item.churchCalendarEventId || '',
      careCellId: item.careCellId || '',
      onlineMeetingId: item.onlineMeetingId || '',
      adminEventId: item.adminEventId || '',
      maskedPhone: item.maskedPhone,
      destinationAddress: item.destinationAddress,
      zone: item.zone,
      priorityLevel: item.priorityLevel,
      transitMode: item.transitMode,
      pastoralNotes: item.pastoralNotes,
      anointingOilRequired: item.anointingOilRequired,
      communionRequired: item.communionRequired,
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const validateForm = (targetStep?: number) => {
    const errs: Record<string, string> = {};
    if (!formData.title.trim()) errs.title = 'Please enter an event title.';
    if (!formData.date.trim()) errs.date = 'Date is required.';
    if (!formData.startTime.trim()) errs.startTime = 'Start Time is required.';
    if (!formData.endTime.trim()) errs.endTime = 'End Time is required.';

    if (targetStep === undefined || targetStep >= 2) {
      if (!formData.venue.trim()) errs.venue = 'Please enter a venue name.';
      if (!formData.city.trim()) errs.city = 'Please enter a Town / Village.';
      if (!formData.address.trim() && !formData.destinationAddress.trim()) errs.address = 'Please enter full address for maps integration.';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const newId = `PASTOR-EVT-${Date.now().toString().slice(-4)}`;
    const newItem: M42PastorAppointment = {
      id: newId,
      demoTag: 'Simulated Pastor Itinerary (Demo)',
      pastorId: selectedPastorId,
      pastorName: activePastor.name,
      title: formData.title.trim(),
      appointmentType: formData.appointmentType,
      status: 'Scheduled',
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      memberOrFamilyName: formData.memberOrFamilyName.trim(),
      memberId: formData.memberId || undefined,
      m35EscalatedPrayerId: formData.m35EscalatedPrayerId || undefined,
      m13PublicPrayerRefId: formData.m13PublicPrayerRefId || undefined,
      churchCalendarEventId: formData.churchCalendarEventId || undefined,
      careCellId: formData.careCellId || undefined,
      onlineMeetingId: formData.onlineMeetingId || undefined,
      adminEventId: formData.adminEventId || undefined,
      maskedPhone: formData.maskedPhone,
      destinationAddress: [formData.venue.trim(), formData.city.trim(), formData.address.trim()].filter(Boolean).join(' — ') || formData.destinationAddress.trim(),
      zone: formData.zone,
      priorityLevel: formData.priorityLevel,
      hasScheduleConflict: false,
      transitBufferStatus: 'Healthy Transit Buffer',
      bufferMinutesToNext: 30,
      transitMode: formData.transitMode,
      waypoints: [
        { id: `WP-${Date.now()}-1`, stopOrder: 1, addressLabel: 'Origin Sanctuary', neighborhoodZone: 'Indiranagar', distanceKmFromPrev: 0, transitDurationMin: 0 },
        { id: `WP-${Date.now()}-2`, stopOrder: 2, addressLabel: formData.destinationAddress.trim(), neighborhoodZone: formData.zone, distanceKmFromPrev: 12.5, transitDurationMin: 30 },
      ],
      pastoralNotes: formData.pastoralNotes.trim(),
      anointingOilRequired: formData.anointingOilRequired,
      communionRequired: formData.communionRequired,
    };

    const nextList = [newItem, ...appointments];
    persistAppointments(nextList);
    setSelectedAppointmentId(newId);
    setIsCreateModalOpen(false);
    showToast(`Created new pastoral appointment: "${newItem.title}" (Simulated)`);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !editingTargetId) return;

    const nextList = appointments.map((item) => {
      if (item.id === editingTargetId) {
        return {
          ...item,
          title: formData.title.trim(),
          appointmentType: formData.appointmentType,
          date: formData.date,
          startTime: formData.startTime,
          endTime: formData.endTime,
          memberOrFamilyName: formData.memberOrFamilyName.trim(),
          memberId: formData.memberId || undefined,
          m35EscalatedPrayerId: formData.m35EscalatedPrayerId || undefined,
          m13PublicPrayerRefId: formData.m13PublicPrayerRefId || undefined,
          churchCalendarEventId: formData.churchCalendarEventId || undefined,
          careCellId: formData.careCellId || undefined,
          onlineMeetingId: formData.onlineMeetingId || undefined,
          adminEventId: formData.adminEventId || undefined,
          maskedPhone: formData.maskedPhone,
          destinationAddress: [formData.venue.trim(), formData.city.trim(), formData.address.trim()].filter(Boolean).join(' — ') || formData.destinationAddress.trim(),
          zone: formData.zone,
          priorityLevel: formData.priorityLevel,
          transitMode: formData.transitMode,
          pastoralNotes: formData.pastoralNotes.trim(),
          anointingOilRequired: formData.anointingOilRequired,
          communionRequired: formData.communionRequired,
        };
      }
      return item;
    });

    persistAppointments(nextList);
    setIsEditModalOpen(false);
    setEditingTargetId(null);
    showToast(`Updated appointment metadata for "${formData.title}" (Simulated)`);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTargetId) return;
    try {
      await deleteDoc(doc(db, 'Rhema Church', 'rhema', 'pastorEvents', deletingTargetId));
    } catch (err) {
      console.error('[AdminPastorEventsPage] Delete error:', err);
    }
    const nextList = appointments.filter((a) => a.id !== deletingTargetId);
    if (nextList.length === 0) {
      showToast('Maintaining at least one appointment record.');
      setDeletingTargetId(null);
      return;
    }
    setAppointments(nextList);
    setSelectedAppointmentId(nextList[0].id);
    setDeletingTargetId(null);
    showToast('Deleted pastoral appointment record');
  };

  const handleStatusChange = (newStatus: PastorAppointmentStatus) => {
    if (!activeAppointment) return;
    const nextList = appointments.map((a) =>
      a.id === activeAppointment.id ? { ...a, status: newStatus } : a
    );
    persistAppointments(nextList);
    showToast(`Updated status to "${newStatus}" (Simulated)`);
  };

  return (
    <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
      <AdminNavigationShell>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 md:p-8 space-y-6">
          {/* Top Header Matching Mobile (Image 2: Pastor's Itinerary) */}
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <Link
                href="/admin/dashboard"
                className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Back to Admin Dashboard"
              >
                <ArrowLeft size={22} />
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Pastor&apos;s Itinerary
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activePastor.name} · {activePastor.roleTitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDatePicker((prev) => !prev)}
                className={`p-2.5 rounded-full border transition-all ${
                  selectedDateFilter
                    ? 'bg-amber-500 text-white border-amber-600'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Filter itinerary by date"
              >
                <CalendarDays size={18} />
              </button>

              <button
                type="button"
                onClick={openCreateModal}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-950 text-white dark:bg-white dark:text-slate-950 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 shadow-md shadow-slate-950/15 transition-all"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">New Event</span>
              </button>
            </div>
          </div>

          {/* Sub-Tabs / Mode Bar */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
                activeTab === 'overview'
                  ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Calendar size={14} />
              <span>Itinerary ({mobileDisplayedAppointments.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('route-planner')}
              className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
                activeTab === 'route-planner'
                  ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Compass size={14} />
              <span>Route Visualizer</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('voice-assistant')}
              className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
                activeTab === 'voice-assistant'
                  ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Mic size={14} />
              <span>AI Voice HUD</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('dossier')}
              className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
                activeTab === 'dossier'
                  ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <HeartHandshake size={14} />
              <span>Member Dossier</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('conflicts')}
              className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
                activeTab === 'conflicts'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <AlertTriangle size={14} className={travelMetrics.collisionCount > 0 ? 'text-red-500' : ''} />
              <span>Buffer Analysis ({travelMetrics.collisionCount + travelMetrics.tightWarningCount})</span>
            </button>
          </div>

          {/* Date Picker Popover */}
          {showDatePicker && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-lg space-y-3 max-w-md">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                <span>Select Date Filter</span>
                <button
                  type="button"
                  onClick={() => setShowDatePicker(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={selectedDateFilter || getTodayDateStr()}
                  onChange={(e) => setSelectedDateFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-semibold"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDateFilter(getTodayDateStr());
                    setShowDatePicker(false);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDateFilter(null);
                    setShowDatePicker(false);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Clear Filter
                </button>
              </div>
            </div>
          )}

          {/* Toast Notification */}
          {toastMessage && (
            <div className="fixed bottom-6 right-6 z-50 bg-[#1E6F43] text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold border border-emerald-400/40 animate-fade-in">
              <CheckCircle2 size={16} />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: MOBILE ITINERARY & AGENDA (Image 2: Pastor's Itinerary)            */}
          {/* ========================================================================= */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Filter Tabs: Today | Upcoming | Past (Exact mobile match) */}
              <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-2xl flex items-center max-w-md">
                {(['today', 'upcoming', 'past'] as const).map((tab) => {
                  const isActive = itineraryTab === tab && !selectedDateFilter;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => {
                        setSelectedDateFilter(null);
                        setItineraryTab(tab);
                      }}
                      className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all ${
                        isActive
                          ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  );
                })}
              </div>

              {/* Date Filter Indicator Banner */}
              {selectedDateFilter && (
                <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-4 py-2 rounded-xl text-xs text-amber-900 dark:text-amber-200">
                  <span className="font-semibold">
                    Filtered by Date: {selectedDateFilter}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedDateFilter(null)}
                    className="font-bold underline text-amber-800 dark:text-amber-300 hover:text-amber-900"
                  >
                    Show All
                  </button>
                </div>
              )}

              {/* STARTING FROM Card (Exact mobile match) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-2">
                <label className="block text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  STARTING FROM
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={startingLocation}
                    onChange={(e) => setStartingLocation(e.target.value)}
                    placeholder="Type starting address..."
                    className="flex-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:border-slate-950 dark:focus:border-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleUpdateStartingLocation}
                    disabled={isUpdatingLocation}
                    className="px-5 py-2.5 rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 transition-all shrink-0"
                  >
                    {isUpdatingLocation ? 'Updating...' : 'Update'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Type address and press Update
                </p>
              </div>

              {/* 3-Column Stats Strip (Exact mobile match) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-around divide-x divide-slate-200 dark:divide-slate-800 text-center">
                <div className="flex-1 px-2">
                  <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                    {mobileTotalEvents}
                  </div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                    EVENTS
                  </div>
                </div>

                <div className="flex-1 px-2">
                  <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                    {Math.round(mobileTotalDistance)} km
                  </div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                    TRAVEL DIST
                  </div>
                </div>

                <div className="flex-1 px-2">
                  <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                    {formatDurationMins(mobileTotalTravelTime)}
                  </div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                    TRAVEL TIME
                  </div>
                </div>
              </div>

              {/* Search Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm">
                <div className="flex items-center gap-2 flex-1">
                  <Search size={15} className="text-slate-400 ml-1 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search itinerary by title, member, destination..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-slate-950 dark:focus:border-white"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-slate-400 shrink-0" />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="ALL">All Types</option>
                    <option value="Hospital ICU Visitation">Hospital ICU Visitation</option>
                    <option value="Home Blessing &amp; Prayer">Home Blessing &amp; Prayer</option>
                    <option value="Pre-Marital Counseling">Pre-Marital Counseling</option>
                    <option value="Elders Board Meeting">Elders Board Meeting</option>
                    <option value="Funeral Service">Funeral Service</option>
                  </select>
                </div>
              </div>

              {/* Events List or Empty State (Exact mobile match) */}
              {mobileDisplayedAppointments.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-4 shadow-sm flex flex-col items-center justify-center">
                  <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
                    <CalendarDays size={44} strokeWidth={1.5} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-bold text-slate-700 dark:text-slate-200">
                      No events found for {selectedDateFilter ? 'selected date' : itineraryTab}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {itineraryTab === 'today'
                        ? 'No pastoral appointments or hospital visits scheduled for today.'
                        : 'Switch tabs or schedule a new pastoral appointment.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="px-4 py-2 rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-all flex items-center gap-2"
                  >
                    <Plus size={15} />
                    <span>+ Schedule pastoral appointment</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mobileDisplayedAppointments.map((item, index) => {
                    const leg = evaluatedRouteLegs[index];
                    return (
                      <div
                        key={item.id}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50">
                                {item.appointmentType}
                              </span>
                              {item.priorityLevel === 'High (Emergency)' && (
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-700/50">
                                  High (Emergency)
                                </span>
                              )}
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50">
                                {item.status}
                              </span>
                            </div>
                            <h3 className="text-base font-bold text-amber-800 dark:text-amber-400">
                              {item.title}
                            </h3>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
                            >
                              <Edit3 size={13} />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingTargetId(item.id)}
                              className="px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/50 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-1.5"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-slate-900 dark:text-slate-100 shrink-0" />
                            <span>{formatEventDate(item.date)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock size={14} className="text-slate-900 dark:text-slate-100 shrink-0" />
                            <span>
                              Start: {item.startTime} {item.endTime ? `| End: ${item.endTime}` : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                            <Clock size={14} className="shrink-0" />
                            <span>
                              Meeting length:{' '}
                              {Math.max(
                                15,
                                parseTimeToMinutes(item.endTime) - parseTimeToMinutes(item.startTime)
                              )}{' '}
                              mins
                            </span>
                          </div>
                        </div>

                        {/* Venue & Location Section */}
                        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                          <span className="text-[11px] font-bold tracking-wider text-teal-800 dark:text-teal-400 uppercase">
                            VENUE &amp; LOCATION
                          </span>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {item.memberOrFamilyName || 'Sanctuary Campus'}
                          </p>
                          {item.zone && (
                            <p className="text-xs font-medium text-teal-700 dark:text-teal-300">
                              {item.zone}
                            </p>
                          )}
                          {item.destinationAddress && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {item.destinationAddress}
                            </p>
                          )}

                          <div className="pt-1">
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                item.destinationAddress || item.zone || item.memberOrFamilyName
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                            >
                              <Navigation size={14} />
                              <span>Get Directions</span>
                            </a>
                          </div>
                        </div>

                        {/* Live Journey Tracker */}
                        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                          <span className="text-[11px] font-extrabold tracking-wider text-purple-700 dark:text-purple-400 uppercase">
                            LIVE JOURNEY TRACKER
                          </span>
                          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <Car size={16} className="text-purple-600 dark:text-purple-400 shrink-0" />
                              <div>
                                <p className="font-semibold text-slate-900 dark:text-white">
                                  {startingLocation.split(',')[0]} &rarr;{' '}
                                  {item.destinationAddress.split(',')[0]}
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                  Mode: {item.transitMode}{' '}
                                  {item.anointingOilRequired ? '· Anointing Oil Required' : ''}{' '}
                                  {item.communionRequired ? '· Communion Kit' : ''}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-bold text-slate-900 dark:text-white">
                                ~{item.waypoints[1]?.distanceKmFromPrev || 12.5} km
                              </p>
                              <p className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
                                ~{item.waypoints[1]?.transitDurationMin || 28} mins
                              </p>
                            </div>
                          </div>
                        </div>

                        {item.pastoralNotes && (
                          <div className="pt-2 text-xs text-slate-600 dark:text-slate-300 italic bg-amber-50/50 dark:bg-amber-950/20 p-2.5 rounded-lg border border-amber-200/40 dark:border-amber-800/30">
                            &ldquo;{item.pastoralNotes}&rdquo;
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Floating Bottom Action Buttons (Exact mobile match) */}
              <div className="sticky bottom-6 z-30 flex items-center justify-center gap-3 pt-4 pointer-events-none">
                <button
                  type="button"
                  onClick={() => setIsRoutePlanModalOpen(true)}
                  className="pointer-events-auto flex items-center gap-2 px-6 py-3 rounded-full bg-slate-950 text-white dark:bg-white dark:text-slate-950 font-extrabold text-sm shadow-xl shadow-slate-950/25 hover:scale-105 active:scale-95 transition-all"
                >
                  <Route size={18} />
                  <span>Route Plan</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsMapViewModalOpen(true)}
                  className="pointer-events-auto flex items-center gap-2 px-6 py-3 rounded-full bg-slate-800 text-white border border-slate-700 dark:bg-slate-800 dark:text-white font-extrabold text-sm shadow-xl shadow-slate-950/25 hover:scale-105 active:scale-95 transition-all"
                >
                  <MapIcon size={18} />
                  <span>Map View</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: SIMULATED ROUTE PLANNER & INTERACTIVE SVG MAP                      */}
          {/* ========================================================================= */}
          {activeTab === 'route-planner' && (
            <div className="space-y-6">
              <div className="bg-[#0B192C] border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-white text-base">
                      Simulated Multi-Stop Route Visualizer
                    </h3>
                    <p className="text-xs text-slate-400">
                      Illustrative metropolitan zone vector roadmap based on synthetic Bangalore demonstration coordinates. Distance &amp; travel times are simulated estimates.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-medium">
                      Total Leg Distance: <strong className="text-emerald-400">{travelMetrics.totalKm} KM</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-medium">
                      Total Travel: <strong className="text-blue-400">~{travelMetrics.totalTransitMin} Mins</strong>
                    </span>
                  </div>
                </div>

                {/* Interactive SVG Canvas */}
                <div className="bg-[#070E17] border border-slate-800 rounded-2xl p-4 overflow-hidden relative">
                  <svg
                    viewBox="0 0 550 400"
                    className="w-full h-80 max-h-96 text-slate-400 select-none"
                  >
                    {/* Background grid lines */}
                    <defs>
                      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1E293B" strokeWidth="0.5" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />

                    {/* Zone Boundary Circles */}
                    {Object.values(SYNTHETIC_METRO_ZONES).map((z) => (
                      <g key={z.key}>
                        <circle cx={z.x} cy={z.y} r="38" fill="#0F172A" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
                        <text x={z.x} y={z.y + 48} fill="#94A3B8" fontSize="9" textAnchor="middle" fontWeight="bold">
                          {z.key}
                        </text>
                      </g>
                    ))}

                    {/* Route Connecting Lines */}
                    {evaluatedRouteLegs.map((leg, idx) => {
                      const fromCoord = SYNTHETIC_METRO_ZONES[leg.fromZone] || SYNTHETIC_METRO_ZONES['Central Sanctuary'];
                      const toCoord = SYNTHETIC_METRO_ZONES[leg.toZone] || SYNTHETIC_METRO_ZONES['South Zone'];
                      const isCollision = leg.status === 'Schedule Collision';

                      return (
                        <g key={idx}>
                          <line
                            x1={fromCoord.x}
                            y1={fromCoord.y}
                            x2={toCoord.x}
                            y2={toCoord.y}
                            stroke={isCollision ? '#EF4444' : '#10B981'}
                            strokeWidth="3"
                            strokeDasharray="6 4"
                          />
                          {/* Midpoint badge */}
                          <circle
                            cx={(fromCoord.x + toCoord.x) / 2}
                            cy={(fromCoord.y + toCoord.y) / 2}
                            r="12"
                            fill="#0B192C"
                            stroke={isCollision ? '#EF4444' : '#10B981'}
                            strokeWidth="1.5"
                          />
                          <text
                            x={(fromCoord.x + toCoord.x) / 2}
                            y={(fromCoord.y + toCoord.y) / 2 + 3}
                            fill="#FFFFFF"
                            fontSize="8"
                            textAnchor="middle"
                            fontWeight="bold"
                          >
                            {leg.distanceKm}k
                          </text>
                        </g>
                      );
                    })}

                    {/* Numbered Stops Pins */}
                    {sortedDayAppointments.map((appt, idx) => {
                      const coord = SYNTHETIC_METRO_ZONES[appt.zone] || SYNTHETIC_METRO_ZONES['Central Sanctuary'];
                      const isSelected = appt.id === activeAppointment?.id;

                      return (
                        <g
                          key={appt.id}
                          className="cursor-pointer"
                          onClick={() => setSelectedAppointmentId(appt.id)}
                        >
                          <circle
                            cx={coord.x}
                            cy={coord.y}
                            r={isSelected ? 18 : 14}
                            fill={isSelected ? '#1E6F43' : '#1E293B'}
                            stroke={isSelected ? '#34D399' : '#64748B'}
                            strokeWidth="2"
                          />
                          <text
                            x={coord.x}
                            y={coord.y + 4}
                            fill="#FFFFFF"
                            fontSize="11"
                            textAnchor="middle"
                            fontWeight="bold"
                          >
                            {idx + 1}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Waypoint Legs Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {evaluatedRouteLegs.map((leg, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-white">
                          <span>Stop #{idx + 1}</span>
                          <ArrowRight size={13} className="text-slate-400" />
                          <span>Stop #{idx + 2}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {leg.fromZone} &rarr; {leg.toZone}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-emerald-400 block">{leg.distanceKm} km · {leg.transitDurationMin} mins</span>
                        <span
                          className={`text-[10px] font-bold ${
                            leg.status === 'Schedule Collision'
                              ? 'text-red-400'
                              : leg.status === 'Tight Transit Warning'
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {leg.status} ({leg.availableBufferMin}m)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: SIMULATED AI VOICE ASSISTANT STUDIO                                */}
          {/* ========================================================================= */}
          {activeTab === 'voice-assistant' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Voice Command Console */}
              <div className="bg-[#0B192C] border border-slate-800 rounded-2xl p-5 space-y-5 md:col-span-1">
                <div>
                  <h3 className="font-bold text-white text-base">AI Voice Assistant</h3>
                  <p className="text-xs text-slate-400">
                    Hands-free voice assistant simulator for pastoral driving and itinerary briefing.
                  </p>
                </div>

                {/* Simulated Mic Visualizer */}
                <div className="bg-black/60 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
                  <div
                    className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center transition-all ${
                      isVoiceSpeaking
                        ? 'bg-red-500/20 border-2 border-red-500 text-red-400 scale-105 animate-pulse'
                        : 'bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-400'
                    }`}
                  >
                    <Mic size={36} />
                  </div>

                  {/* Audio Waveform Simulator */}
                  <div className="flex items-center justify-center gap-1 h-8">
                    {[12, 24, 18, 32, 28, 14, 26, 30, 20, 16, 28, 22].map((height, i) => (
                      <div
                        key={i}
                        className={`w-1 rounded-full transition-all duration-150 ${
                          isVoiceSpeaking ? 'bg-amber-400 animate-pulse' : 'bg-slate-700'
                        }`}
                        style={{ height: isVoiceSpeaking ? `${height}px` : '6px' }}
                      />
                    ))}
                  </div>

                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    {isVoiceSpeaking ? 'Speaking Audio Response...' : 'Simulated Voice Interaction (Click-to-Trigger)'}
                  </span>
                </div>

                {/* Click-to-Trigger Command Action Chips */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase text-slate-400 block">
                    Click-to-Trigger Voice Commands
                  </span>
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleTriggerVoiceCommand('next')}
                      className="w-full text-left px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs text-slate-200 border border-slate-800 flex items-center justify-between transition-colors"
                    >
                      <span>🗣️ &ldquo;What is my next appointment?&rdquo;</span>
                      <ArrowRight size={13} className="text-slate-500" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTriggerVoiceCommand('route')}
                      className="w-full text-left px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs text-slate-200 border border-slate-800 flex items-center justify-between transition-colors"
                    >
                      <span>🗣️ &ldquo;Simulate route to next destination&rdquo;</span>
                      <ArrowRight size={13} className="text-slate-500" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTriggerVoiceCommand('summary')}
                      className="w-full text-left px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs text-slate-200 border border-slate-800 flex items-center justify-between transition-colors"
                    >
                      <span>🗣️ &ldquo;Summarize today&rsquo;s itinerary&rdquo;</span>
                      <ArrowRight size={13} className="text-slate-500" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTriggerVoiceCommand('note')}
                      className="w-full text-left px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs text-slate-200 border border-slate-800 flex items-center justify-between transition-colors"
                    >
                      <span>🗣️ &ldquo;Add pastoral prayer note&rdquo;</span>
                      <ArrowRight size={13} className="text-slate-500" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTriggerVoiceCommand('complete')}
                      className="w-full text-left px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs text-slate-200 border border-slate-800 flex items-center justify-between transition-colors"
                    >
                      <span>🗣️ &ldquo;Mark current visit completed&rdquo;</span>
                      <ArrowRight size={13} className="text-slate-500" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Spoken Transcript Feed */}
              <div className="bg-[#0B192C] border border-slate-800 rounded-2xl p-5 space-y-4 md:col-span-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare size={16} className="text-emerald-400" />
                      <h3 className="font-bold text-white text-sm">Spoken Transcript &amp; Dialogue Feed</h3>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Native Web SpeechSynthesis API
                    </span>
                  </div>

                  <div className="mt-4 space-y-3 max-h-96 overflow-y-auto pr-2">
                    {assistantMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-3 text-xs ${
                          msg.sender === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {msg.sender === 'assistant' && (
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                            <Sparkles size={14} />
                          </div>
                        )}
                        <div
                          className={`max-w-md p-3.5 rounded-2xl ${
                            msg.sender === 'user'
                              ? 'bg-slate-800 text-white border border-slate-700'
                              : 'bg-slate-900 text-slate-200 border border-slate-800 shadow-sm'
                          }`}
                        >
                          <p>{msg.text}</p>
                          <span className="text-[10px] text-slate-500 block mt-1 text-right">
                            {msg.timestamp}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                  <input
                    type="text"
                    disabled
                    placeholder="Microphone is operating in Click-to-Trigger demonstration mode..."
                    className="flex-1 bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-500 cursor-not-allowed"
                  />
                  <span className="text-[11px] text-slate-400 font-medium px-2">
                    Simulated Mode Active
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: MEMBER & PRAYER REQUEST DOSSIER (M33 · M35 · M13 INTEGRATION)       */}
          {/* ========================================================================= */}
          {activeTab === 'dossier' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Member Profile Dossier (M33 Linked) */}
              <div className="bg-[#0B192C] border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-emerald-400" />
                    <h3 className="font-bold text-white text-sm">
                      M33 Member CRM Dossier · {activeAppointment?.memberOrFamilyName}
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950/60 text-blue-300 border border-blue-500/30">
                    ID: {activeAppointment?.memberId || 'RHEMA-2026-M001'}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">Masked Mobile Contact</span>
                      <strong className="text-white text-xs">{activeAppointment?.maskedPhone}</strong>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">Geographic Zone</span>
                      <strong className="text-amber-400 text-xs">{activeAppointment?.zone}</strong>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Destination Address</span>
                    <strong className="text-white text-xs">{activeAppointment?.destinationAddress}</strong>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-slate-400 text-[10px] block">Pastoral Care Briefing Notes</span>
                    <p className="text-slate-300 italic text-xs">&ldquo;{activeAppointment?.pastoralNotes}&rdquo;</p>
                  </div>
                </div>
              </div>

              {/* Prayer Moderation & Wall Dossier (M35 & M13 Linked) */}
              <div className="bg-[#0B192C] border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <HeartHandshake size={16} className="text-amber-400" />
                    <h3 className="font-bold text-white text-sm">
                      M35 Escalated Prayer Moderation Dossier
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/60 text-amber-300 border border-amber-500/30">
                    {activeAppointment?.m35EscalatedPrayerId || 'PRAY-MOD-101'}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[10px]">Triage Classification</span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-red-950 text-red-300 border border-red-500/40">
                        Pastoral Confidential · Urgent ICU
                      </span>
                    </div>
                    <h4 className="font-bold text-white text-xs mt-1">
                      Prayer for Mother in Hospital ICU (Pneumonia Recovery)
                    </h4>
                    <p className="text-slate-300 text-xs">
                      Please pray for my mother admitted in Hospital ICU with severe respiratory issues. Believing for rapid recovery and breathing stabilization.
                    </p>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-slate-400 text-[10px] block">Administrative Intercessor Notes</span>
                    <p className="text-slate-300 text-xs">
                      Urgent hospital visitation requested by family. Care cell leaders alerted. Anointing oil and communion elements required.
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px]">
                    <span className="text-slate-400">M13 Prayer Wall Public Reference:</span>
                    <span className="font-semibold text-emerald-400">{activeAppointment?.m13PublicPrayerRefId || 'prayer-1'} (34 Intercessors)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: TRANSIT BUFFER & SCHEDULE CONFLICT ANALYSIS                         */}
          {/* ========================================================================= */}
          {activeTab === 'conflicts' && (
            <div className="space-y-4">
              <div className="bg-[#0B192C] border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-white text-base">
                      Transit Buffer &amp; Schedule Conflict Engine
                    </h3>
                    <p className="text-xs text-slate-400">
                      Calculates buffer between consecutive appointments: Buffer = Next Start Time - (Current End Time + Estimated Transit).
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-xl bg-red-950/60 text-red-300 border border-red-500/30 font-bold">
                      {travelMetrics.collisionCount} Collisions (&lt;0m)
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-amber-950/60 text-amber-300 border border-amber-500/30 font-bold">
                      {travelMetrics.tightWarningCount} Tight Warnings (&lt;15m)
                    </span>
                  </div>
                </div>

                {/* Buffer Breakdown Rows */}
                {evaluatedRouteLegs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    Need at least two sequential appointments on this date to evaluate travel buffer intervals.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {evaluatedRouteLegs.map((leg, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                          leg.status === 'Schedule Collision'
                            ? 'bg-red-950/30 border-red-500/40 text-red-300'
                            : leg.status === 'Tight Transit Warning'
                            ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                            : 'bg-slate-900 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs">Leg #{idx + 1}:</span>
                            <span className="font-semibold text-slate-200">{leg.fromTitle}</span>
                            <ArrowRight size={13} className="text-slate-500" />
                            <span className="font-semibold text-slate-200">{leg.toTitle}</span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            {leg.fromZone} &rarr; {leg.toZone} · Transit Distance: ~{leg.distanceKm} km · Est. Transit: {leg.transitDurationMin} mins
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="font-bold text-sm block">
                              {leg.availableBufferMin} mins buffer
                            </span>
                            <span className="text-[10px] font-semibold uppercase tracking-wider block">
                              {leg.status}
                            </span>
                          </div>
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                              leg.status === 'Schedule Collision'
                                ? 'bg-red-900/60 text-red-200 border-red-500/40'
                                : leg.status === 'Tight Transit Warning'
                                ? 'bg-amber-900/60 text-amber-200 border-amber-500/40'
                                : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                            }`}
                          >
                            {leg.status === 'Schedule Collision'
                              ? 'COLLISION'
                              : leg.status === 'Tight Transit Warning'
                              ? 'WARNING'
                              : 'HEALTHY'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODALS & ACTION DIALOGS                                                   */}
          {/* ========================================================================= */}

          {/* Create Appointment Modal */}
          {isCreateModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#0B192C] border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Navigation size={18} className="text-emerald-400" />
                    <h3 className="font-bold text-white text-sm">Create Pastoral Itinerary Appointment</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSaveCreate} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Appointment Title *</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Hospital ICU Anointing & Prayer"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                    />
                    {formErrors.title && <p className="text-red-400 text-[10px] mt-1">{formErrors.title}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Appointment Type</label>
                      <select
                        value={formData.appointmentType}
                        onChange={(e) => setFormData({ ...formData, appointmentType: e.target.value as PastorAppointmentType })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Hospital ICU Visitation">Hospital ICU Visitation</option>
                        <option value="Home Blessing & Prayer">Home Blessing & Prayer</option>
                        <option value="Pre-Marital Counseling">Pre-Marital Counseling</option>
                        <option value="Elders Board Meeting">Elders Board Meeting</option>
                        <option value="Funeral Service">Funeral Service</option>
                        <option value="Water Baptism Briefing">Water Baptism Briefing</option>
                        <option value="Care Cell Pastoral Visit">Care Cell Pastoral Visit</option>
                        <option value="Emergency Pastoral Care">Emergency Pastoral Care</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Priority Level</label>
                      <select
                        value={formData.priorityLevel}
                        onChange={(e) => setFormData({ ...formData, priorityLevel: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Normal">Normal</option>
                        <option value="High (Emergency)">High (Emergency)</option>
                        <option value="Routine">Routine</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Date *</label>
                      <input
                        type="date"
                        required
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Start Time *</label>
                      <input
                        type="text"
                        required
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        placeholder="10:00 AM"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">End Time *</label>
                      <input
                        type="text"
                        required
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        placeholder="11:15 AM"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Member / Family Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.memberOrFamilyName}
                        onChange={(e) => setFormData({ ...formData, memberOrFamilyName: e.target.value })}
                        placeholder="e.g. Brother David K. Joseph"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Masked Phone</label>
                      <input
                        type="text"
                        value={formData.maskedPhone}
                        onChange={(e) => setFormData({ ...formData, maskedPhone: e.target.value })}
                        placeholder="+91 98450-XXXX1"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Destination Address *</label>
                      <input
                        type="text"
                        required
                        value={formData.destinationAddress}
                        onChange={(e) => setFormData({ ...formData, destinationAddress: e.target.value })}
                        placeholder="e.g. Apollo Hospital ICU Ward 4B"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Metro Zone</label>
                      <select
                        value={formData.zone}
                        onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Central Sanctuary">Central Sanctuary (Indiranagar)</option>
                        <option value="South Zone">South Zone (Bannerghatta Road)</option>
                        <option value="Whitefield Zone">East Zone (Whitefield)</option>
                        <option value="Koramangala Zone">Southeast Zone (Koramangala)</option>
                        <option value="Hebbal Zone">North Zone (Hebbal)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Pastoral Briefing &amp; Prayer Notes</label>
                    <textarea
                      rows={2}
                      value={formData.pastoralNotes}
                      onChange={(e) => setFormData({ ...formData, pastoralNotes: e.target.value })}
                      placeholder="Add pastoral notes, Scripture points, special prayer needs..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex items-center gap-4 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.anointingOilRequired}
                        onChange={(e) => setFormData({ ...formData, anointingOilRequired: e.target.checked })}
                        className="rounded border-slate-800 text-emerald-600 focus:ring-0"
                      />
                      <span className="text-slate-300 text-[11px]">Require Anointing Oil</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.communionRequired}
                        onChange={(e) => setFormData({ ...formData, communionRequired: e.target.checked })}
                        className="rounded border-slate-800 text-emerald-600 focus:ring-0"
                      />
                      <span className="text-slate-300 text-[11px]">Require Holy Communion</span>
                    </label>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#1E6F43] hover:bg-[#185835] text-white text-xs font-semibold shadow-md shadow-emerald-950/40"
                    >
                      Create Appointment (Simulated)
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Appointment Modal */}
          {isEditModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#0B192C] border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Edit3 size={18} className="text-amber-400" />
                    <h3 className="font-bold text-white text-sm">Edit Pastoral Appointment ({editingTargetId})</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Appointment Title *</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Appointment Type</label>
                      <select
                        value={formData.appointmentType}
                        onChange={(e) => setFormData({ ...formData, appointmentType: e.target.value as PastorAppointmentType })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Hospital ICU Visitation">Hospital ICU Visitation</option>
                        <option value="Home Blessing & Prayer">Home Blessing & Prayer</option>
                        <option value="Pre-Marital Counseling">Pre-Marital Counseling</option>
                        <option value="Elders Board Meeting">Elders Board Meeting</option>
                        <option value="Funeral Service">Funeral Service</option>
                        <option value="Water Baptism Briefing">Water Baptism Briefing</option>
                        <option value="Care Cell Pastoral Visit">Care Cell Pastoral Visit</option>
                        <option value="Emergency Pastoral Care">Emergency Pastoral Care</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Priority Level</label>
                      <select
                        value={formData.priorityLevel}
                        onChange={(e) => setFormData({ ...formData, priorityLevel: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Normal">Normal</option>
                        <option value="High (Emergency)">High (Emergency)</option>
                        <option value="Routine">Routine</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Date *</label>
                      <input
                        type="date"
                        required
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Start Time *</label>
                      <input
                        type="text"
                        required
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">End Time *</label>
                      <input
                        type="text"
                        required
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Member / Family Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.memberOrFamilyName}
                        onChange={(e) => setFormData({ ...formData, memberOrFamilyName: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Masked Phone</label>
                      <input
                        type="text"
                        value={formData.maskedPhone}
                        onChange={(e) => setFormData({ ...formData, maskedPhone: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Destination Address *</label>
                      <input
                        type="text"
                        required
                        value={formData.destinationAddress}
                        onChange={(e) => setFormData({ ...formData, destinationAddress: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Metro Zone</label>
                      <select
                        value={formData.zone}
                        onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Central Sanctuary">Central Sanctuary (Indiranagar)</option>
                        <option value="South Zone">South Zone (Bannerghatta Road)</option>
                        <option value="Whitefield Zone">East Zone (Whitefield)</option>
                        <option value="Koramangala Zone">Southeast Zone (Koramangala)</option>
                        <option value="Hebbal Zone">North Zone (Hebbal)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Pastoral Briefing &amp; Prayer Notes</label>
                    <textarea
                      rows={2}
                      value={formData.pastoralNotes}
                      onChange={(e) => setFormData({ ...formData, pastoralNotes: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md shadow-amber-950/40"
                    >
                      Save Changes (Simulated)
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deletingTargetId && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#0B192C] border border-red-500/40 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                <div className="w-12 h-12 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto">
                  <AlertTriangle size={24} />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-base font-bold text-white">Delete Pastoral Appointment?</h3>
                  <p className="text-xs text-slate-400">
                    Are you sure you want to remove this appointment record from your local simulation state? This will remove its associated waypoint and travel buffer calculations.
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDeletingTargetId(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
                  >
                    Confirm Delete (Simulated)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Route Plan Modal */}
          {isRoutePlanModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950 flex items-center justify-center font-bold">
                      <Route size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Pastor&apos;s Route Plan</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Sequential multi-stop visitation itinerary</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsRoutePlanModalOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Origin Point</span>
                    <p className="font-bold text-slate-900 dark:text-white">{startingLocation}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Total Route</span>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {Math.round(mobileTotalDistance)} km · ~{formatDurationMins(mobileTotalTravelTime)}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/40">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      START
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-900 dark:text-emerald-300">{startingLocation}</p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400">Departure Origin</p>
                    </div>
                  </div>

                  {mobileDisplayedAppointments.map((item, idx) => (
                    <div key={item.id} className="space-y-2">
                      <div className="ml-4 pl-4 border-l-2 border-dashed border-slate-300 dark:border-slate-700 py-1 text-xs text-slate-500">
                        &darr; Leg {idx + 1}: ~{item.waypoints[1]?.distanceKmFromPrev || 12.5} km ({item.waypoints[1]?.transitDurationMin || 28} mins driving)
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="w-7 h-7 rounded-full bg-slate-950 text-white dark:bg-white dark:text-slate-950 flex items-center justify-center text-xs font-bold shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-slate-900 dark:text-white">{item.title}</p>
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{item.startTime}</span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300">{item.memberOrFamilyName} · {item.destinationAddress}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <a
                    href={`https://www.google.com/maps/dir/${encodeURIComponent(startingLocation)}/${mobileDisplayedAppointments.map((a) => encodeURIComponent(a.destinationAddress)).join('/')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 flex items-center gap-2"
                  >
                    <Navigation size={14} />
                    <span>Open Full Route in Google Maps</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setIsRoutePlanModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Map View Modal */}
          {isMapViewModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold">
                      <MapIcon size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Pastor&apos;s Itinerary Map View</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Metropolitan zones &amp; destination waypoints</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMapViewModalOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 overflow-hidden relative">
                  <svg viewBox="0 0 550 400" className="w-full h-72 text-slate-400 select-none">
                    <defs>
                      <pattern id="modal-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1E293B" strokeWidth="0.5" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#modal-grid)" />

                    {Object.values(SYNTHETIC_METRO_ZONES).map((z) => (
                      <g key={z.key}>
                        <circle cx={z.x} cy={z.y} r="38" fill="#0F172A" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
                        <text x={z.x} y={z.y + 48} fill="#94A3B8" fontSize="9" textAnchor="middle" fontWeight="bold">
                          {z.key}
                        </text>
                      </g>
                    ))}

                    {mobileDisplayedAppointments.map((apt, idx) => {
                      const zoneObj = SYNTHETIC_METRO_ZONES[apt.zone] || SYNTHETIC_METRO_ZONES['Central Sanctuary'];
                      return (
                        <g key={apt.id} transform={`translate(${zoneObj.x}, ${zoneObj.y})`}>
                          <circle cx="0" cy="0" r="14" fill="#059669" stroke="#ffffff" strokeWidth="2" />
                          <text x="0" y="4" fill="#ffffff" fontSize="10" textAnchor="middle" fontWeight="bold">
                            {idx + 1}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {mobileDisplayedAppointments.map((apt, idx) => (
                    <div key={apt.id} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[180px]">{apt.title}</span>
                      </div>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(apt.destinationAddress)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold text-[11px]"
                      >
                        Map &rarr;
                      </a>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsMapViewModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100"
                  >
                    Close
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
