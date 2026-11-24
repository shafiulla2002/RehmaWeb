'use client';

import React, { useState, useEffect, useMemo } from 'react';
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

  // Form State for Create & Edit
  const [formData, setFormData] = useState({
    title: '',
    appointmentType: 'Home Blessing & Prayer' as PastorAppointmentType,
    date: '2026-11-24',
    startTime: '11:30 AM',
    endTime: '12:45 PM',
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
    setFormData({
      title: '',
      appointmentType: 'Home Blessing & Prayer',
      date: selectedDate,
      startTime: '11:30 AM',
      endTime: '12:45 PM',
      memberOrFamilyName: 'Brother David K. Joseph (Demo)',
      memberId: 'RHEMA-2026-M001',
      m35EscalatedPrayerId: '',
      m13PublicPrayerRefId: '',
      churchCalendarEventId: '',
      careCellId: '',
      onlineMeetingId: '',
      adminEventId: '',
      maskedPhone: '+91 98450-XXXX1',
      destinationAddress: 'Prestige Palms, Whitefield Main Road',
      zone: 'Whitefield Zone',
      priorityLevel: 'Normal',
      transitMode: 'Car',
      pastoralNotes: 'Pastoral family blessing and house dedication prayer.',
      anointingOilRequired: true,
      communionRequired: false,
    });
    setFormErrors({});
    setIsCreateModalOpen(true);
  };

  const openEditModal = (item: M42PastorAppointment) => {
    setEditingTargetId(item.id);
    setFormData({
      title: item.title,
      appointmentType: item.appointmentType,
      date: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
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

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!formData.title.trim()) errs.title = 'Title is required';
    if (!formData.date.trim()) errs.date = 'Date is required';
    if (!formData.startTime.trim()) errs.startTime = 'Start time is required';
    if (!formData.endTime.trim()) errs.endTime = 'End time is required';
    if (!formData.memberOrFamilyName.trim()) errs.memberOrFamilyName = 'Member or family name is required';
    if (!formData.destinationAddress.trim()) errs.destinationAddress = 'Address is required';
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
      destinationAddress: formData.destinationAddress.trim(),
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
          destinationAddress: formData.destinationAddress.trim(),
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
        <div className="min-h-screen bg-[#070E17] text-slate-100 p-4 md:p-8 space-y-6">
          {/* Top Banner with Pastoral Identity Switcher */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-amber-950/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
                <Navigation size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-white tracking-wide">
                    M42 · Pastor Event Itinerary, Route Planner &amp; AI Voice Assistant
                  </h1>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 uppercase">
                    Layer A Simulation
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Orchestrate pastoral visitation itineraries, evaluate simulated urban transit legs &amp; buffer warnings, and interact with the simulated AI voice assistant.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={openCreateModal}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1E6F43] hover:bg-[#185835] text-white text-xs font-semibold shadow-md shadow-emerald-950/40 transition-colors"
                title="Create a new pastoral itinerary appointment"
              >
                <Plus size={14} />
                <span>+ Create Appointment</span>
              </button>
              <button
                type="button"
                onClick={handleResetDemoData}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-colors"
                title="Reset to baseline synthetic demonstration appointments"
              >
                <RotateCcw size={14} />
                <span>Reset Demo Data</span>
              </button>
            </div>
          </div>

          {/* Toast Notification */}
          {toastMessage && (
            <div className="fixed bottom-6 right-6 z-50 bg-[#1E6F43] text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold border border-emerald-400/40 animate-fade-in">
              <CheckCircle2 size={16} />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Pastoral Identity Selector Bar & Date Filter */}
          <div className="bg-[#0B192C] border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <User size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Assigned Pastoral Identity (Demonstration Switcher)
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <select
                    value={selectedPastorId}
                    onChange={(e) => setSelectedPastorId(e.target.value)}
                    className="bg-slate-900 border border-slate-800 text-sm font-bold text-white rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500"
                  >
                    {PASTORAL_IDENTITIES.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {p.roleTitle}
                      </option>
                    ))}
                  </select>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-950/60 text-emerald-300 border border-emerald-500/40">
                    RBAC: Admin Role
                  </span>
                </div>
              </div>
            </div>

            {/* Date Picker & Quick Actions */}
            <div className="flex items-center gap-3 text-xs border-t md:border-t-0 pt-2 md:pt-0 border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-slate-400" />
                <span className="text-slate-400 text-[11px]">Itinerary Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-xs font-semibold text-white rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="border-l border-slate-800 pl-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTriggerVoiceCommand('summary')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
                >
                  <Volume2 size={14} className="text-amber-400" />
                  <span>Audio Brief</span>
                </button>
              </div>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="bg-[#0B192C] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Scheduled Visits</span>
                <Calendar size={16} className="text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white">
                {travelMetrics.appointmentCount} Appointments
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {travelMetrics.highPriorityCount} Marked High Priority / ICU
              </p>
            </div>

            <div className="bg-[#0B192C] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Estimated Transit</span>
                <Compass size={16} className="text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-blue-300">
                {travelMetrics.totalKm} Simulated KM
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Est. ~{travelMetrics.totalTransitMin} mins driving time
              </p>
            </div>

            <div className="bg-[#0B192C] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Schedule Collisions</span>
                <AlertTriangle size={16} className={travelMetrics.collisionCount > 0 ? 'text-red-400' : 'text-emerald-400'} />
              </div>
              <div className={`text-2xl font-bold ${travelMetrics.collisionCount > 0 ? 'text-red-400' : 'text-emerald-300'}`}>
                {travelMetrics.collisionCount} Collisions
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {travelMetrics.tightWarningCount} Tight transit warnings (&lt;15m)
              </p>
            </div>

            <div className="bg-[#0B192C] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider">AI Voice HUD</span>
                <Mic size={16} className={isVoiceSpeaking ? 'text-red-400 animate-pulse' : 'text-purple-400'} />
              </div>
              <div className="text-2xl font-bold text-purple-300">
                {isVoiceSpeaking ? 'Speaking...' : 'Ready'}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                SpeechSynthesis / Click-to-Trigger Demo
              </p>
            </div>
          </div>

          {/* Sub-Tabs Navigation */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                activeTab === 'overview'
                  ? 'bg-[#1E6F43] text-white shadow-md shadow-emerald-950/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Calendar size={15} />
              <span>Itinerary Agenda ({sortedDayAppointments.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('route-planner')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                activeTab === 'route-planner'
                  ? 'bg-[#1E6F43] text-white shadow-md shadow-emerald-950/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Compass size={15} />
              <span>Route Planner &amp; SVG Map ({evaluatedRouteLegs.length} legs)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('voice-assistant')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                activeTab === 'voice-assistant'
                  ? 'bg-[#1E6F43] text-white shadow-md shadow-emerald-950/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Mic size={15} />
              <span>AI Voice Assistant Studio</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('dossier')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                activeTab === 'dossier'
                  ? 'bg-[#1E6F43] text-white shadow-md shadow-emerald-950/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <HeartHandshake size={15} />
              <span>Member &amp; Prayer Dossier (M33 · M35)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('conflicts')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                activeTab === 'conflicts'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-950/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <AlertTriangle size={15} className={travelMetrics.collisionCount > 0 ? 'text-red-400' : ''} />
              <span>Transit Buffer Analysis ({travelMetrics.collisionCount + travelMetrics.tightWarningCount})</span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: ITINERARY AGENDA & TIMELINE                                        */}
          {/* ========================================================================= */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Filter Toolbar */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#0B192C] border border-slate-800/80 rounded-2xl p-3 shadow-sm">
                <div className="flex items-center gap-2 flex-1">
                  <Search size={15} className="text-slate-400 ml-1" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by appointment title, member name, destination..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-slate-400" />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ALL">All Appointment Types</option>
                    <option value="Hospital ICU Visitation">Hospital ICU Visitation</option>
                    <option value="Home Blessing & Prayer">Home Blessing & Prayer</option>
                    <option value="Pre-Marital Counseling">Pre-Marital Counseling</option>
                    <option value="Elders Board Meeting">Elders Board Meeting</option>
                    <option value="Funeral Service">Funeral Service</option>
                  </select>
                </div>
              </div>

              {/* Appointment Cards Timeline */}
              {sortedDayAppointments.length === 0 ? (
                <div className="bg-[#0B192C] border border-slate-800 rounded-2xl p-10 text-center space-y-3">
                  <Calendar size={32} className="text-slate-600 mx-auto" />
                  <p className="text-sm font-semibold text-slate-300">No appointments scheduled for this date &amp; pastor</p>
                  <p className="text-xs text-slate-500">Click &ldquo;+ Create Appointment&rdquo; to add a new visit or select another date.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedDayAppointments.map((item, index) => {
                    const isSelected = item.id === activeAppointment?.id;
                    const leg = evaluatedRouteLegs[index];

                    return (
                      <div key={item.id} className="space-y-3">
                        <div
                          onClick={() => setSelectedAppointmentId(item.id)}
                          className={`cursor-pointer rounded-2xl p-5 border transition-all ${
                            isSelected
                              ? 'bg-[#0B192C] border-emerald-500/80 shadow-lg shadow-emerald-950/20'
                              : 'bg-[#0B192C]/70 border-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center shrink-0">
                                <span className="text-[10px] font-bold text-slate-400">STOP</span>
                                <span className="text-xs font-bold text-emerald-400">#{index + 1}</span>
                              </div>

                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 border border-emerald-500/30 text-emerald-300">
                                    {item.appointmentType}
                                  </span>
                                  {item.priorityLevel === 'High (Emergency)' && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950/80 border border-red-500/30 text-red-300 animate-pulse">
                                      High (Emergency)
                                    </span>
                                  )}
                                  <span className="text-xs text-slate-400 font-medium">
                                    {item.startTime} - {item.endTime}
                                  </span>
                                </div>
                                <h3 className="font-bold text-white text-base mt-1">{item.title}</h3>
                                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                  <span className="flex items-center gap-1 text-slate-300">
                                    <User size={13} className="text-amber-400" />
                                    {item.memberOrFamilyName}
                                  </span>
                                  <span className="flex items-center gap-1 text-slate-400">
                                    <MapPin size={13} className="text-blue-400" />
                                    {item.destinationAddress}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Status & Actions */}
                            <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                              <select
                                value={item.status}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  const updated = appointments.map((a) =>
                                    a.id === item.id ? { ...a, status: e.target.value as PastorAppointmentStatus } : a
                                  );
                                  persistAppointments(updated);
                                }}
                                className="bg-slate-900 border border-slate-800 text-[11px] font-semibold text-emerald-300 rounded-xl px-2.5 py-1 focus:outline-none"
                              >
                                <option value="Scheduled">Scheduled</option>
                                <option value="En Route (Simulated)">En Route (Simulated)</option>
                                <option value="In Progress (Simulated)">In Progress (Simulated)</option>
                                <option value="Completed (Simulated)">Completed (Simulated)</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(item);
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                                title="Edit appointment"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingTargetId(item.id);
                                }}
                                className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/20"
                                title="Delete appointment"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Notes and Badges */}
                          <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                            <p className="text-[11px] text-slate-300 italic line-clamp-1">
                              &ldquo;{item.pastoralNotes}&rdquo;
                            </p>
                            <div className="flex items-center gap-2 text-[10px]">
                              {item.anointingOilRequired && (
                                <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/30 text-amber-300 font-medium">
                                  Anointing Oil
                                </span>
                              )}
                              {item.communionRequired && (
                                <span className="px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/30 text-purple-300 font-medium">
                                  Holy Communion Elements
                                </span>
                              )}
                              {item.m35EscalatedPrayerId && (
                                <span className="px-2 py-0.5 rounded bg-blue-950/60 border border-blue-500/30 text-blue-300 font-medium">
                                  M35 Escalated ({item.m35EscalatedPrayerId})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Inter-Stop Transit Buffer Indicator */}
                        {leg && (
                          <div
                            className={`mx-6 px-4 py-2 rounded-xl text-xs border flex items-center justify-between ${
                              leg.status === 'Schedule Collision'
                                ? 'bg-red-950/40 border-red-500/40 text-red-300'
                                : leg.status === 'Tight Transit Warning'
                                ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                                : 'bg-slate-900/80 border-slate-800 text-slate-400'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Car size={13} className="text-slate-400" />
                              <span className="font-semibold text-white">Simulated Transit:</span>
                              <span>~{leg.distanceKm} km ({leg.transitDurationMin} mins) via {leg.transitMode}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="font-semibold">
                                {leg.status === 'Schedule Collision'
                                  ? `🔴 Collision (${leg.availableBufferMin}m buffer)`
                                  : leg.status === 'Tight Transit Warning'
                                  ? `🟡 Tight Buffer (${leg.availableBufferMin}m available)`
                                  : `🟢 Healthy Buffer (${leg.availableBufferMin}m)`}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
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
        </div>
      </AdminNavigationShell>
    </ProtectedRoute>
  );
}
