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
  INITIAL_ADMIN_SERVICE_PLANS,
  AdminServicePlan,
  ServicePlanStatus,
  ServiceRunSheetCue,
  ServiceMusicianAssignment,
  ServicePlanSetlistItem,
} from '@/lib/adminWave7cData';
import {
  INITIAL_ADMIN_VOLUNTEERS,
  AdminVolunteerApplication,
  VolunteerDepartment,
  SundayServiceSlot,
} from '@/lib/adminWave7bData';
import {
  INITIAL_ADMIN_SONGS,
  AdminSongItem,
} from '@/lib/adminWave7aData';
import {
  ClipboardList,
  Calendar,
  Clock,
  Users,
  Music,
  Plus,
  Edit3,
  Trash2,
  Copy,
  AlertTriangle,
  CheckCircle2,
  X,
  Play,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  ShieldAlert,
  Mic,
  Volume2,
  Radio,
  Tv,
  Layers,
  Search,
  Filter,
} from 'lucide-react';

const STORAGE_KEY_SERVICE_PLANS = '@rhema_admin_m41_service_plans';

// M34 Exactly-Aligned Service Slots
const SERVICE_SLOT_OPTIONS: SundayServiceSlot[] = [
  '08:30 AM (1st Service)',
  '11:00 AM (2nd Service)',
  '05:00 PM (Youth Service)',
  '07:00 PM (Mid-Week Prayer)',
];

// M39 Exactly-Aligned Ministry Departments
const VOLUNTEER_DEPARTMENTS: VolunteerDepartment[] = [
  'Ushering & Hospitality',
  'Worship Choir & Media Audio/Visual',
  "Children's & Teens Ministry",
  'Intercessory Prayer Team',
  'Community Outreach & Food Drive',
  'Welcome Desk & Guest Care',
];

// Chromatic Musical Keys for M31 Transposition
const CHROMATIC_KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export interface ServiceVolunteerDutyAssignment {
  id: string; // e.g. "DUTY-01"
  volunteerId: string; // e.g. "VOL-2026-01"
  volunteerName: string;
  department: VolunteerDepartment;
  dutyRole: string; // e.g. "Head Usher - Main Sanctuary", "FOH Audio Engineer", "Toddler Care"
  serviceSlot: SundayServiceSlot;
  status: 'Confirmed' | 'Tentative' | 'Declined' | 'Unassigned';
  skills: string[];
}

export interface ServiceScheduleConflict {
  id: string;
  personName: string;
  personId?: string;
  conflictType: 'Dual Role in Same Service' | 'Overlapping Schedule' | 'Band & Volunteer Clash' | 'Availability Mismatch';
  description: string;
  serviceSlot: SundayServiceSlot;
  conflictingRoleA: string;
  conflictingRoleB: string;
  severity: 'Critical' | 'Warning';
  suggestedResolution: string;
}

export interface M41ServicePlan {
  id: string; // e.g. "PLAN-2026-W48"
  demoTag: 'Simulated Service Plan (Demo)';
  serviceDate: string; // YYYY-MM-DD
  serviceTitle: string;
  serviceType: SundayServiceSlot;
  status: ServicePlanStatus;
  leadPastor: string;
  worshipLeader: string;
  estimatedDurationMinutes: number;
  startTime: string; // e.g. "08:30 AM"
  endTime: string; // e.g. "10:30 AM"
  rehearsalStartTime: string; // e.g. "07:45 AM"
  runSheet: ServiceRunSheetCue[];
  musicians: ServiceMusicianAssignment[];
  setlist: ServicePlanSetlistItem[];
  volunteerDuties: ServiceVolunteerDutyAssignment[];
  assignedTeamsSummary: {
    usheringCount: number;
    mediaAvCount: number;
    hospitalityCount: number;
    childrenMinistryCount: number;
  };
}

// Baseline Initial Seed with M34/M39/M31 Extensions
const BASELINE_M41_PLANS: M41ServicePlan[] = [
  {
    id: 'PLAN-2026-W48-S1',
    demoTag: 'Simulated Service Plan (Demo)',
    serviceDate: '2026-11-29',
    serviceTitle: 'Sunday Morning Divine Covenant Service (1st)',
    serviceType: '08:30 AM (1st Service)',
    status: 'Confirmed (Sim)',
    leadPastor: 'Senior Pastor John Mark (Demo)',
    worshipLeader: 'Brother Daniel Sundaram (Demo)',
    estimatedDurationMinutes: 110,
    startTime: '08:30 AM',
    endTime: '10:20 AM',
    rehearsalStartTime: '07:45 AM',
    runSheet: [
      {
        id: 'CUE-01',
        segmentOrder: 1,
        startTime: '08:30 AM',
        durationMinutes: 5,
        segmentTitle: 'Pre-Service Prayer & Sanctuary Welcome',
        ministerOrLeader: 'Elder Stephen (Demo)',
        mediaNotes: 'Ambient pad music; show Welcome Slide with Live Stream countdown',
        bandPreset: 'Acoustic Piano & Soft Strings',
      },
      {
        id: 'CUE-02',
        segmentOrder: 2,
        startTime: '08:35 AM',
        durationMinutes: 30,
        segmentTitle: 'Praise & Worship Extravaganza',
        ministerOrLeader: 'Brother Daniel & Rhema Choir',
        mediaNotes: 'Bilingual Lyrics (English/Telugu); lower-third chords for choir monitors',
        bandPreset: 'Full Band Dynamic',
      },
      {
        id: 'CUE-03',
        segmentOrder: 3,
        startTime: '09:05 AM',
        durationMinutes: 10,
        segmentTitle: 'Holy Communion & Congregational Thanksgiving',
        ministerOrLeader: 'Senior Pastor John Mark',
        mediaNotes: '1 Corinthians 11:24 Scripture graphic on center screen',
        bandPreset: 'Gentle Acoustic Guitar Solo',
      },
      {
        id: 'CUE-04',
        segmentOrder: 4,
        startTime: '09:15 AM',
        durationMinutes: 10,
        segmentTitle: 'Announcements, Tithes & Ministry Updates',
        ministerOrLeader: 'Associate Pastor Timothy',
        mediaNotes: 'Event flyer slides & QR Giving code on screen 2',
        bandPreset: 'Light Piano Chords',
      },
      {
        id: 'CUE-05',
        segmentOrder: 5,
        startTime: '09:25 AM',
        durationMinutes: 45,
        segmentTitle: 'Ministry of the Word: Covenant of Supernatural Peace',
        ministerOrLeader: 'Senior Pastor John Mark',
        mediaNotes: 'Sermon title graphic and primary Scripture points',
        bandPreset: 'Muted',
      },
      {
        id: 'CUE-06',
        segmentOrder: 6,
        startTime: '10:10 AM',
        durationMinutes: 10,
        segmentTitle: 'Altar Call, Benediction & Pastoral Prayer Line',
        ministerOrLeader: 'All Pastors & Elders',
        mediaNotes: 'Prayer request backdrop graphic',
        bandPreset: 'Soft Ambient Choir Reprise',
      },
    ],
    musicians: [
      { instrumentOrRole: 'Lead Vocals', assignedMemberName: 'Brother Daniel Sundaram (Demo)', status: 'Confirmed' },
      { instrumentOrRole: 'Keys 1 (Acoustic/Grand)', assignedMemberName: 'Sister Grace Thomas (Demo)', status: 'Confirmed' },
      { instrumentOrRole: 'Drums', assignedMemberName: 'Brother Joshua Rao (Demo)', status: 'Confirmed' },
      { instrumentOrRole: 'Bass Guitar', assignedMemberName: 'Brother Caleb Paul (Demo)', status: 'Confirmed' },
      { instrumentOrRole: 'Acoustic Guitar', assignedMemberName: 'Brother Mark David (Demo)', status: 'Confirmed' },
      { instrumentOrRole: 'Audio/Visual FOH Engineer', assignedMemberName: 'Brother Luke Media (Demo)', status: 'Confirmed' },
    ],
    setlist: [
      { songId: 'song-1', title: 'Way Maker (Bilingual)', originalKey: 'E', transposedKey: 'E', tempoBpm: 68, language: 'English & Telugu', worshipLeader: 'Brother Daniel' },
      { songId: 'song-2', title: '10,000 Reasons (Bless the Lord)', originalKey: 'G', transposedKey: 'G', tempoBpm: 73, language: 'English', worshipLeader: 'Brother Daniel' },
      { songId: 'song-3', title: 'Great Is Thy Faithfulness', originalKey: 'D', transposedKey: 'E', tempoBpm: 88, language: 'English & Telugu', worshipLeader: 'Sister Grace' },
    ],
    volunteerDuties: [
      { id: 'DUTY-01', volunteerId: 'VOL-2026-01', volunteerName: 'Jonathan Samuel (Demo)', department: 'Worship Choir & Media Audio/Visual', dutyRole: 'Live Broadcast Switcher & PTZ Camera 1', serviceSlot: '08:30 AM (1st Service)', status: 'Confirmed', skills: ['Sound Engineering', 'Digital Mixing Console'] },
      { id: 'DUTY-02', volunteerId: 'VOL-2026-02', volunteerName: 'Hannah Grace (Demo)', department: "Children's & Teens Ministry", dutyRole: "Children's Church Sunday School Lead", serviceSlot: '08:30 AM (1st Service)', status: 'Confirmed', skills: ['Child Evangelism', 'Biblical Storytelling'] },
      { id: 'DUTY-03', volunteerId: 'VOL-2026-03', volunteerName: 'David K. Joseph (Demo)', department: 'Ushering & Hospitality', dutyRole: 'Main Sanctuary Lead Usher - Center Aisle', serviceSlot: '08:30 AM (1st Service)', status: 'Confirmed', skills: ['Crowd Management', 'Sanctuary Protocol'] },
      { id: 'DUTY-04', volunteerId: 'VOL-2026-04', volunteerName: 'Priya Sundaram (Demo)', department: 'Welcome Desk & Guest Care', dutyRole: 'First-Time Visitors Welcome & Gift Pack Desk', serviceSlot: '08:30 AM (1st Service)', status: 'Confirmed', skills: ['Member Counseling', 'Hospitality Protocol'] },
      { id: 'DUTY-05', volunteerId: 'VOL-2026-05', volunteerName: 'Sarah Thomas (Demo)', department: 'Intercessory Prayer Team', dutyRole: 'Pre-Service Altar Intercession', serviceSlot: '08:30 AM (1st Service)', status: 'Confirmed', skills: ['Deliverance Ministry', 'Intercessory Prayer'] },
      { id: 'DUTY-06', volunteerId: 'VOL-2026-06', volunteerName: 'Caleb Joshua (Demo)', department: 'Ushering & Hospitality', dutyRole: 'Balcony & Overflow Seating Coordinator', serviceSlot: '08:30 AM (1st Service)', status: 'Tentative', skills: ['Fire Safety', 'First Aid Responder'] },
    ],
    assignedTeamsSummary: {
      usheringCount: 12,
      mediaAvCount: 5,
      hospitalityCount: 6,
      childrenMinistryCount: 8,
    },
  },
  {
    id: 'PLAN-2026-W48-S2',
    demoTag: 'Simulated Service Plan (Demo)',
    serviceDate: '2026-11-29',
    serviceTitle: 'Sunday Morning Miracle Celebration (2nd)',
    serviceType: '11:00 AM (2nd Service)',
    status: 'Confirmed (Sim)',
    leadPastor: 'Pastor Gabriel (Demo)',
    worshipLeader: 'Sister Rachel Paul (Demo)',
    estimatedDurationMinutes: 105,
    startTime: '11:00 AM',
    endTime: '12:45 PM',
    rehearsalStartTime: '10:30 AM',
    runSheet: [
      {
        id: 'CUE-21',
        segmentOrder: 1,
        startTime: '11:00 AM',
        durationMinutes: 5,
        segmentTitle: 'Sanctuary Call to Worship & Invocation',
        ministerOrLeader: 'Pastor Gabriel (Demo)',
        mediaNotes: 'Countdown video; choir entrance music',
        bandPreset: 'Grand Piano Intro',
      },
      {
        id: 'CUE-22',
        segmentOrder: 2,
        startTime: '11:05 AM',
        durationMinutes: 30,
        segmentTitle: 'High Praise & Vibrant Congregational Worship',
        ministerOrLeader: 'Sister Rachel & Youth Band',
        mediaNotes: 'High-energy visuals with lyrics on 3 screens',
        bandPreset: 'Electric Driven Praise',
      },
      {
        id: 'CUE-23',
        segmentOrder: 3,
        startTime: '11:35 AM',
        durationMinutes: 10,
        segmentTitle: 'Giving & Kingdom Advancement Tithes',
        ministerOrLeader: 'Elder Stephen (Demo)',
        mediaNotes: 'Tithes & Offerings Scripture on display',
        bandPreset: 'Gentle Acoustic Guitar',
      },
      {
        id: 'CUE-24',
        segmentOrder: 4,
        startTime: '11:45 AM',
        durationMinutes: 45,
        segmentTitle: 'Word of Faith: Supernatural Expansion in 2026',
        ministerOrLeader: 'Senior Pastor John Mark',
        mediaNotes: 'Sermon slides and keynote bullet points',
        bandPreset: 'Muted',
      },
      {
        id: 'CUE-25',
        segmentOrder: 5,
        startTime: '12:30 PM',
        durationMinutes: 15,
        segmentTitle: 'Healing Ministry, Impartation & Benediction',
        ministerOrLeader: 'All Pastors',
        mediaNotes: 'Healing verses and soft choir backdrop',
        bandPreset: 'Ambient Pad & Solo Cello',
      },
    ],
    musicians: [
      { instrumentOrRole: 'Lead Vocals', assignedMemberName: 'Sister Rachel Paul (Demo)', status: 'Confirmed' },
      { instrumentOrRole: 'Keys 1 (Acoustic/Grand)', assignedMemberName: 'Sister Grace Thomas (Demo)', status: 'Confirmed' },
      { instrumentOrRole: 'Drums', assignedMemberName: 'Brother Timothy Roy (Demo)', status: 'Confirmed' },
      { instrumentOrRole: 'Bass Guitar', assignedMemberName: 'Brother Caleb Paul (Demo)', status: 'Confirmed' },
      { instrumentOrRole: 'Electric Guitar', assignedMemberName: 'Brother Samuel David (Demo)', status: 'Confirmed' },
      { instrumentOrRole: 'Audio/Visual FOH Engineer', assignedMemberName: 'Brother Luke Media (Demo)', status: 'Tentative' },
    ],
    setlist: [
      { songId: 'song-2', title: '10,000 Reasons (Bless the Lord)', originalKey: 'G', transposedKey: 'A', tempoBpm: 73, language: 'English', worshipLeader: 'Sister Rachel' },
      { songId: 'song-4', title: 'Goodness of God', originalKey: 'A', transposedKey: 'A', tempoBpm: 63, language: 'English & Telugu', worshipLeader: 'Sister Rachel' },
    ],
    volunteerDuties: [
      { id: 'DUTY-11', volunteerId: 'VOL-2026-01', volunteerName: 'Jonathan Samuel (Demo)', department: 'Worship Choir & Media Audio/Visual', dutyRole: 'Live Broadcast Audio Mixer', serviceSlot: '11:00 AM (2nd Service)', status: 'Confirmed', skills: ['Sound Engineering', 'Digital Mixing Console'] },
      { id: 'DUTY-12', volunteerId: 'VOL-2026-03', volunteerName: 'David K. Joseph (Demo)', department: 'Ushering & Hospitality', dutyRole: 'Auditorium Head Count Usher', serviceSlot: '11:00 AM (2nd Service)', status: 'Confirmed', skills: ['Crowd Management', 'Sanctuary Protocol'] },
    ],
    assignedTeamsSummary: {
      usheringCount: 14,
      mediaAvCount: 6,
      hospitalityCount: 6,
      childrenMinistryCount: 10,
    },
  },
];

export default function AdminServicePlannerPage() {
  // Navigation Tabs: 'overview' | 'runsheet' | 'band-setlist' | 'volunteers' | 'conflicts'
  const [activeTab, setActiveTab] = useState<'overview' | 'runsheet' | 'band-setlist' | 'volunteers' | 'conflicts'>('overview');

  // Service Plans State
  const [servicePlans, setServicePlans] = useState<M41ServicePlan[]>(BASELINE_M41_PLANS);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('PLAN-2026-W48-S1');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals & Dialogs
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [isEditPlanOpen, setIsEditPlanOpen] = useState(false);
  const [editingPlanTargetId, setEditingPlanTargetId] = useState<string | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [isLiveStageHudOpen, setIsLiveStageHudOpen] = useState(false);
  const [activeHudCueIndex, setActiveHudCueIndex] = useState(1); // Cue 2 active by default

  // Plan Form State (Create & Edit)
  const [planFormData, setPlanFormData] = useState<{
    serviceTitle: string;
    serviceDate: string;
    serviceType: SundayServiceSlot;
    leadPastor: string;
    worshipLeader: string;
    estimatedDurationMinutes: number;
    status: ServicePlanStatus;
  }>({
    serviceTitle: '',
    serviceDate: '2026-12-06',
    serviceType: '08:30 AM (1st Service)',
    leadPastor: 'Senior Pastor John Mark (Demo)',
    worshipLeader: 'Brother Daniel Sundaram (Demo)',
    estimatedDurationMinutes: 105,
    status: 'Draft (Sim)',
  });
  const [planFormErrors, setPlanFormErrors] = useState<Record<string, string>>({});

  // Volunteer Reassignment Modal State
  const [editingDuty, setEditingDuty] = useState<ServiceVolunteerDutyAssignment | null>(null);
  const [selectedReplacementVolId, setSelectedReplacementVolId] = useState('');

  // Add Song Modal State
  const [isAddSongModalOpen, setIsAddSongModalOpen] = useState(false);
  const [selectedSongToAddId, setSelectedSongToAddId] = useState('song-4');
  const [songKeyOverride, setSongKeyOverride] = useState('A');

  // Add Run Sheet Cue Modal State
  const [isAddCueModalOpen, setIsAddCueModalOpen] = useState(false);
  const [newCueData, setNewCueData] = useState({
    segmentTitle: '',
    durationMinutes: 10,
    ministerOrLeader: 'Senior Pastor John Mark',
    mediaNotes: 'Display presentation slide',
    bandPreset: 'Light Acoustic Strings',
  });

  // Real-time Firestore sync with initial baseline seed fallback
  useEffect(() => {
    const colRef = collection(db, 'Rhema Church', 'rhema', 'servicePlans');
    const unsubscribe = onSnapshot(
      colRef,
      async (snapshot) => {
        if (snapshot.empty) {
          try {
            const batch = writeBatch(db);
            BASELINE_M41_PLANS.forEach((plan) => {
              const docRef = doc(colRef, plan.id);
              batch.set(docRef, {
                ...plan,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            });
            await batch.commit();
          } catch (seedErr) {
            console.error('[AdminServicePlannerPage] Seeding error:', seedErr);
            setServicePlans(BASELINE_M41_PLANS);
          }
        } else {
          const loaded: M41ServicePlan[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              demoTag: 'Simulated Service Plan (Demo)',
              serviceDate: data.serviceDate || '2026-11-29',
              serviceTitle: data.serviceTitle || 'Sunday Service',
              serviceType: data.serviceType || '08:30 AM (1st Service)',
              status: data.status || 'Confirmed (Sim)',
              leadPastor: data.leadPastor || 'Senior Pastor John Mark',
              worshipLeader: data.worshipLeader || 'Brother Daniel Sundaram',
              estimatedDurationMinutes: data.estimatedDurationMinutes || 105,
              startTime: data.startTime || '08:30 AM',
              endTime: data.endTime || '10:20 AM',
              rehearsalStartTime: data.rehearsalStartTime || '07:45 AM',
              runSheet: data.runSheet || [],
              musicians: data.musicians || [],
              setlist: data.setlist || [],
              volunteerDuties: data.volunteerDuties || [],
              assignedTeamsSummary: data.assignedTeamsSummary || {
                usheringCount: 14,
                mediaAvCount: 6,
                hospitalityCount: 6,
                childrenMinistryCount: 10,
              },
            };
          });
          setServicePlans(loaded);
          if (loaded.length > 0 && !loaded.some((p) => p.id === selectedPlanId)) {
            setSelectedPlanId(loaded[0].id);
          }
        }
      },
      (err) => {
        console.error('[AdminServicePlannerPage] Firestore error:', err);
        setServicePlans(BASELINE_M41_PLANS);
      }
    );

    return () => unsubscribe();
  }, []);

  const persistPlans = async (updated: M41ServicePlan[]) => {
    setServicePlans(updated);
    try {
      const batch = writeBatch(db);
      const colRef = collection(db, 'Rhema Church', 'rhema', 'servicePlans');
      updated.forEach((plan) => {
        const docRef = doc(colRef, plan.id);
        batch.set(
          docRef,
          {
            ...plan,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      });
      await batch.commit();
    } catch (err) {
      console.error('[AdminServicePlannerPage] Firestore persist error:', err);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleResetBaseline = async () => {
    try {
      const batch = writeBatch(db);
      const colRef = collection(db, 'Rhema Church', 'rhema', 'servicePlans');
      BASELINE_M41_PLANS.forEach((plan) => {
        batch.set(doc(colRef, plan.id), {
          ...plan,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
    } catch (err) {
      console.error('[AdminServicePlannerPage] Reset baseline error:', err);
    }
    setServicePlans(BASELINE_M41_PLANS);
    setSelectedPlanId(BASELINE_M41_PLANS[0].id);
    showToast('Reset to Baseline Service Plans');
  };

  // Currently Selected Plan
  const activePlan = useMemo(() => {
    return servicePlans.find((p) => p.id === selectedPlanId) || servicePlans[0];
  }, [servicePlans, selectedPlanId]);

  // Total Run Sheet Runtime Calculation
  const totalRunSheetMinutes = useMemo(() => {
    if (!activePlan || !activePlan.runSheet) return 0;
    return activePlan.runSheet.reduce((acc, cue) => acc + (cue.durationMinutes || 0), 0);
  }, [activePlan]);

  const isRunSheetOvertime = totalRunSheetMinutes > (activePlan?.estimatedDurationMinutes || 0);

  // =========================================================================
  // AUTOMATED CONFLICT DETECTION ENGINE
  // =========================================================================
  const detectedConflicts = useMemo<ServiceScheduleConflict[]>(() => {
    const conflicts: ServiceScheduleConflict[] = [];

    // Helper: Parse "HH:MM AM/PM" to minutes
    const parseTimeMinutes = (timeStr: string): number => {
      if (!timeStr) return 0;
      const [time, modifier] = timeStr.trim().split(' ');
      const [hoursStr, minutesStr] = time.split(':');
      let hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    // Evaluate across all active service plans
    servicePlans.forEach((plan) => {
      // 1. Dual Role in Same Service
      const roleMap: Record<string, string[]> = {};

      plan.musicians.forEach((m) => {
        if (!roleMap[m.assignedMemberName]) roleMap[m.assignedMemberName] = [];
        roleMap[m.assignedMemberName].push(`Musician (${m.instrumentOrRole})`);
      });

      plan.volunteerDuties.forEach((v) => {
        if (v.status !== 'Unassigned') {
          if (!roleMap[v.volunteerName]) roleMap[v.volunteerName] = [];
          roleMap[v.volunteerName].push(`Volunteer (${v.dutyRole})`);
        }
      });

      Object.entries(roleMap).forEach(([person, roles]) => {
        if (roles.length > 1) {
          conflicts.push({
            id: `CONF-DUAL-${plan.id}-${person.replace(/\s+/g, '')}`,
            personName: person,
            conflictType: 'Dual Role in Same Service',
            description: `${person} is assigned to ${roles.length} roles in ${plan.serviceType}: [${roles.join(' AND ')}].`,
            serviceSlot: plan.serviceType,
            conflictingRoleA: roles[0],
            conflictingRoleB: roles[1],
            severity: 'Critical',
            suggestedResolution: `Reassign one of the duties to another team member to prevent dual booking.`,
          });
        }
      });

      // 4. M39 Declared Availability Mismatch
      plan.volunteerDuties.forEach((v) => {
        if (v.status !== 'Unassigned') {
          const profile = INITIAL_ADMIN_VOLUNTEERS.find((vol) => vol.id === v.volunteerId);
          if (profile) {
            let matches = true;
            if (plan.serviceType.includes('1st') && profile.availability !== 'Sunday 1st Service' && profile.availability !== 'Special Events') matches = false;
            if (plan.serviceType.includes('2nd') && profile.availability !== 'Sunday 2nd Service' && profile.availability !== 'Special Events') matches = false;
            if (plan.serviceType.includes('Youth') && profile.availability !== 'Sunday Youth' && profile.availability !== 'Special Events') matches = false;

            if (!matches) {
              conflicts.push({
                id: `CONF-AVAIL-${v.id}`,
                personName: v.volunteerName,
                conflictType: 'Availability Mismatch',
                description: `${v.volunteerName} is assigned to ${plan.serviceType}, but their M39 availability profile is marked strictly for "${profile.availability}".`,
                serviceSlot: plan.serviceType,
                conflictingRoleA: v.dutyRole,
                conflictingRoleB: `Declared Profile: ${profile.availability}`,
                severity: 'Warning',
                suggestedResolution: `Contact volunteer to confirm exceptional coverage or select an available volunteer.`,
              });
            }
          }
        }
      });
    });

    // 2. Overlapping Schedule Conflicts (Cross-Service)
    for (let i = 0; i < servicePlans.length; i++) {
      for (let j = i + 1; j < servicePlans.length; j++) {
        const p1 = servicePlans[i];
        const p2 = servicePlans[j];

        if (p1.serviceDate === p2.serviceDate) {
          const p1Start = parseTimeMinutes(p1.startTime);
          const p1End = parseTimeMinutes(p1.endTime);
          const p2Rehearsal = parseTimeMinutes(p2.rehearsalStartTime);
          const p2Start = parseTimeMinutes(p2.startTime);

          // Check if p1 overlaps with p2 rehearsal or start (with 15min buffer)
          const isOverlap = p1End + 15 > p2Rehearsal && p2Start >= p1Start;

          if (isOverlap) {
            // Find common participants
            const p1People = new Set([
              ...p1.musicians.map((m) => m.assignedMemberName),
              ...p1.volunteerDuties.map((v) => v.volunteerName),
            ]);

            p2.musicians.forEach((m) => {
              if (p1People.has(m.assignedMemberName)) {
                conflicts.push({
                  id: `CONF-OVERLAP-${p1.id}-${p2.id}-${m.assignedMemberName.replace(/\s+/g, '')}`,
                  personName: m.assignedMemberName,
                  conflictType: 'Overlapping Schedule',
                  description: `${m.assignedMemberName} is booked in ${p1.serviceType} (ends ${p1.endTime}) which overlaps with ${p2.serviceType} rehearsal (starts ${p2.rehearsalStartTime}) without required 15min transition buffer.`,
                  serviceSlot: p1.serviceType,
                  conflictingRoleA: `${p1.serviceType} Duty`,
                  conflictingRoleB: `${p2.serviceType} Musician (${m.instrumentOrRole})`,
                  severity: 'Critical',
                  suggestedResolution: 'Adjust rehearsal schedule or assign another musician for Service 2.',
                });
              }
            });
          }
        }
      }
    }

    return conflicts;
  }, [servicePlans]);

  // Overall KPIs
  const kpis = useMemo(() => {
    const totalPlans = servicePlans.length;
    const activeMusicians = activePlan?.musicians || [];
    const confirmedMusicians = activeMusicians.filter((m) => m.status === 'Confirmed').length;
    const musicianCoveragePct = activeMusicians.length > 0 ? Math.round((confirmedMusicians / activeMusicians.length) * 100) : 0;

    const activeDuties = activePlan?.volunteerDuties || [];
    const filledDuties = activeDuties.filter((d) => d.status !== 'Unassigned').length;
    const volunteerCoveragePct = activeDuties.length > 0 ? Math.round((filledDuties / activeDuties.length) * 100) : 0;

    const setlistCount = activePlan?.setlist?.length || 0;
    const conflictCount = detectedConflicts.length;

    return {
      totalPlans,
      musicianCoveragePct,
      volunteerCoveragePct,
      setlistCount,
      conflictCount,
    };
  }, [servicePlans, activePlan, detectedConflicts]);

  // =========================================================================
  // ACTIONS & HANDLERS
  // =========================================================================

  // Helper to compute slot timings from M34 slot definitions
  const getSlotTimings = (slot: SundayServiceSlot, durationMins: number) => {
    switch (slot) {
      case '08:30 AM (1st Service)': {
        const start = '08:30 AM';
        const rehearsal = '07:45 AM';
        const startMins = 8 * 60 + 30;
        const endMins = startMins + durationMins;
        const endHour = Math.floor(endMins / 60);
        const endMin = endMins % 60;
        const endAmPm = endHour >= 12 ? 'PM' : 'AM';
        const formattedHour = endHour > 12 ? endHour - 12 : endHour === 0 ? 12 : endHour;
        const endFormatted = `${String(formattedHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')} ${endAmPm}`;
        return { startTime: start, endTime: endFormatted, rehearsalStartTime: rehearsal };
      }
      case '11:00 AM (2nd Service)': {
        const start = '11:00 AM';
        const rehearsal = '10:15 AM';
        const startMins = 11 * 60;
        const endMins = startMins + durationMins;
        const endHour = Math.floor(endMins / 60);
        const endMin = endMins % 60;
        const endAmPm = endHour >= 12 ? 'PM' : 'AM';
        const formattedHour = endHour > 12 ? endHour - 12 : endHour === 0 ? 12 : endHour;
        const endFormatted = `${String(formattedHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')} ${endAmPm}`;
        return { startTime: start, endTime: endFormatted, rehearsalStartTime: rehearsal };
      }
      case '05:00 PM (Youth Service)': {
        const start = '05:00 PM';
        const rehearsal = '04:15 PM';
        const startMins = 17 * 60;
        const endMins = startMins + durationMins;
        const endHour = Math.floor(endMins / 60);
        const endMin = endMins % 60;
        const endAmPm = endHour >= 12 ? 'PM' : 'AM';
        const formattedHour = endHour > 12 ? endHour - 12 : endHour === 0 ? 12 : endHour;
        const endFormatted = `${String(formattedHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')} ${endAmPm}`;
        return { startTime: start, endTime: endFormatted, rehearsalStartTime: rehearsal };
      }
      case '07:00 PM (Mid-Week Prayer)':
      default: {
        const start = '07:00 PM';
        const rehearsal = '06:30 PM';
        const startMins = 19 * 60;
        const endMins = startMins + durationMins;
        const endHour = Math.floor(endMins / 60);
        const endMin = endMins % 60;
        const endAmPm = endHour >= 12 ? 'PM' : 'AM';
        const formattedHour = endHour > 12 ? endHour - 12 : endHour === 0 ? 12 : endHour;
        const endFormatted = `${String(formattedHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')} ${endAmPm}`;
        return { startTime: start, endTime: endFormatted, rehearsalStartTime: rehearsal };
      }
    }
  };

  // Open Create Plan Modal
  const openCreatePlanModal = () => {
    setPlanFormData({
      serviceTitle: '',
      serviceDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      serviceType: '08:30 AM (1st Service)',
      leadPastor: 'Senior Pastor John Mark (Demo)',
      worshipLeader: 'Brother Daniel Sundaram (Demo)',
      estimatedDurationMinutes: 105,
      status: 'Draft (Sim)',
    });
    setPlanFormErrors({});
    setIsCreatePlanOpen(true);
  };

  // Open Edit Plan Modal
  const openEditPlanModal = (planToEdit?: M41ServicePlan) => {
    const target = planToEdit || activePlan;
    if (!target) return;
    setEditingPlanTargetId(target.id);
    setPlanFormData({
      serviceTitle: target.serviceTitle,
      serviceDate: target.serviceDate,
      serviceType: target.serviceType,
      leadPastor: target.leadPastor,
      worshipLeader: target.worshipLeader,
      estimatedDurationMinutes: target.estimatedDurationMinutes,
      status: target.status,
    });
    setPlanFormErrors({});
    setIsEditPlanOpen(true);
  };

  // Validate Plan Form
  const validatePlanForm = () => {
    const errors: Record<string, string> = {};
    if (!planFormData.serviceTitle.trim()) {
      errors.serviceTitle = 'Service title is required.';
    }
    if (!planFormData.serviceDate.trim()) {
      errors.serviceDate = 'Service date is required.';
    }
    if (!planFormData.leadPastor.trim()) {
      errors.leadPastor = 'Lead Pastor is required.';
    }
    if (!planFormData.worshipLeader.trim()) {
      errors.worshipLeader = 'Worship Leader is required.';
    }
    if (!planFormData.estimatedDurationMinutes || planFormData.estimatedDurationMinutes < 15) {
      errors.estimatedDurationMinutes = 'Estimated duration must be at least 15 minutes.';
    }
    setPlanFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save New Service Plan
  const handleSaveCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePlanForm()) return;

    const newId = `PLAN-2026-${Date.now().toString().slice(-4)}`;
    const timings = getSlotTimings(planFormData.serviceType, Number(planFormData.estimatedDurationMinutes));

    const newPlan: M41ServicePlan = {
      id: newId,
      demoTag: 'Simulated Service Plan (Demo)',
      serviceDate: planFormData.serviceDate,
      serviceTitle: planFormData.serviceTitle.trim(),
      serviceType: planFormData.serviceType,
      status: planFormData.status,
      leadPastor: planFormData.leadPastor.trim(),
      worshipLeader: planFormData.worshipLeader.trim(),
      estimatedDurationMinutes: Number(planFormData.estimatedDurationMinutes),
      startTime: timings.startTime,
      endTime: timings.endTime,
      rehearsalStartTime: timings.rehearsalStartTime,
      runSheet: [
        {
          id: `CUE-${Date.now().toString().slice(-4)}-1`,
          segmentOrder: 1,
          startTime: timings.startTime,
          durationMinutes: 10,
          segmentTitle: 'Pre-Service Prayer & Sanctuary Welcome',
          ministerOrLeader: 'Elder Stephen (Demo)',
          mediaNotes: 'Ambient welcome slide & countdown timer',
          bandPreset: 'Acoustic Piano & Soft Strings',
        },
        {
          id: `CUE-${Date.now().toString().slice(-4)}-2`,
          segmentOrder: 2,
          startTime: '08:40 AM',
          durationMinutes: 30,
          segmentTitle: 'Praise & Worship Extravaganza',
          ministerOrLeader: planFormData.worshipLeader.trim(),
          mediaNotes: 'Bilingual lyrics display (English / Telugu)',
          bandPreset: 'Full Dynamic Band',
        },
        {
          id: `CUE-${Date.now().toString().slice(-4)}-3`,
          segmentOrder: 3,
          startTime: '09:10 AM',
          durationMinutes: 45,
          segmentTitle: 'Ministry of the Word',
          ministerOrLeader: planFormData.leadPastor.trim(),
          mediaNotes: 'Sermon title slides and scripture graphics',
          bandPreset: 'Muted',
        },
        {
          id: `CUE-${Date.now().toString().slice(-4)}-4`,
          segmentOrder: 4,
          startTime: '09:55 AM',
          durationMinutes: 10,
          segmentTitle: 'Altar Call & Benediction',
          ministerOrLeader: 'All Pastors & Elders',
          mediaNotes: 'Benediction blessing slide',
          bandPreset: 'Soft Ambient Choir Reprise',
        },
      ],
      musicians: [
        { instrumentOrRole: 'Lead Vocals', assignedMemberName: planFormData.worshipLeader.trim(), status: 'Confirmed' },
        { instrumentOrRole: 'Keys 1 (Acoustic/Grand)', assignedMemberName: 'Sister Grace Thomas (Demo)', status: 'Confirmed' },
        { instrumentOrRole: 'Drums', assignedMemberName: 'Brother Joshua Rao (Demo)', status: 'Confirmed' },
        { instrumentOrRole: 'Bass Guitar', assignedMemberName: 'Brother Caleb Paul (Demo)', status: 'Confirmed' },
        { instrumentOrRole: 'Audio/Visual FOH Engineer', assignedMemberName: 'Brother Luke Media (Demo)', status: 'Confirmed' },
      ],
      setlist: [
        { songId: 'song-1', title: 'Way Maker (Bilingual)', originalKey: 'E', transposedKey: 'E', tempoBpm: 68, language: 'English & Telugu', worshipLeader: planFormData.worshipLeader.trim() },
        { songId: 'song-4', title: 'Goodness of God', originalKey: 'A', transposedKey: 'A', tempoBpm: 63, language: 'English & Telugu', worshipLeader: planFormData.worshipLeader.trim() },
      ],
      volunteerDuties: [
        { id: `DUTY-${Date.now().toString().slice(-4)}-1`, volunteerId: 'VOL-2026-03', volunteerName: 'David K. Joseph (Demo)', department: 'Ushering & Hospitality', dutyRole: 'Main Sanctuary Lead Usher', serviceSlot: planFormData.serviceType, status: 'Confirmed', skills: ['Crowd Management', 'Sanctuary Protocol'] },
        { id: `DUTY-${Date.now().toString().slice(-4)}-2`, volunteerId: 'VOL-2026-01', volunteerName: 'Jonathan Samuel (Demo)', department: 'Worship Choir & Media Audio/Visual', dutyRole: 'Live Broadcast Switcher', serviceSlot: planFormData.serviceType, status: 'Confirmed', skills: ['Sound Engineering', 'Digital Mixing Console'] },
      ],
      assignedTeamsSummary: {
        usheringCount: 12,
        mediaAvCount: 5,
        hospitalityCount: 6,
        childrenMinistryCount: 8,
      },
    };

    const nextPlans = [newPlan, ...servicePlans];
    persistPlans(nextPlans);
    setSelectedPlanId(newId);
    setIsCreatePlanOpen(false);
    showToast(`Created new service plan: "${newPlan.serviceTitle}" (Simulated)`);
  };

  // Save Edit Service Plan Metadata
  const handleSaveEditPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePlanForm()) return;

    const targetId = editingPlanTargetId || activePlan?.id;
    if (!targetId) return;

    const timings = getSlotTimings(planFormData.serviceType, Number(planFormData.estimatedDurationMinutes));

    const nextPlans = servicePlans.map((p) => {
      if (p.id === targetId) {
        return {
          ...p,
          serviceTitle: planFormData.serviceTitle.trim(),
          serviceDate: planFormData.serviceDate,
          serviceType: planFormData.serviceType,
          leadPastor: planFormData.leadPastor.trim(),
          worshipLeader: planFormData.worshipLeader.trim(),
          estimatedDurationMinutes: Number(planFormData.estimatedDurationMinutes),
          status: planFormData.status,
          startTime: timings.startTime,
          endTime: timings.endTime,
          rehearsalStartTime: timings.rehearsalStartTime,
        };
      }
      return p;
    });

    persistPlans(nextPlans);
    setIsEditPlanOpen(false);
    setEditingPlanTargetId(null);
    showToast(`Updated service plan metadata for "${planFormData.serviceTitle}" (Simulated)`);
  };

  // Duplicate Active Service Plan
  const handleDuplicatePlan = () => {
    if (!activePlan) return;
    const newId = `PLAN-2026-${Date.now().toString().slice(-4)}`;
    const duplicated: M41ServicePlan = {
      ...activePlan,
      id: newId,
      serviceTitle: `${activePlan.serviceTitle} (Copy)`,
      status: 'Draft (Sim)',
      runSheet: activePlan.runSheet.map((c) => ({ ...c, id: `CUE-${Date.now().toString().slice(-4)}-${c.segmentOrder}` })),
      volunteerDuties: activePlan.volunteerDuties.map((v) => ({ ...v, id: `DUTY-${Date.now().toString().slice(-4)}-${v.id}` })),
    };

    const nextPlans = [duplicated, ...servicePlans];
    persistPlans(nextPlans);
    setSelectedPlanId(newId);
    showToast(`Duplicated plan as "${duplicated.serviceTitle}" (Simulated)`);
  };

  // Delete Plan
  const handleConfirmDeletePlan = async () => {
    if (!deletingPlanId) return;
    try {
      await deleteDoc(doc(db, 'Rhema Church', 'rhema', 'servicePlans', deletingPlanId));
    } catch (err) {
      console.error('[AdminServicePlannerPage] Delete error:', err);
    }
    const nextPlans = servicePlans.filter((p) => p.id !== deletingPlanId);
    if (nextPlans.length === 0) {
      showToast('Cannot delete all service plans. Maintaining at least one plan.');
      setDeletingPlanId(null);
      return;
    }
    setServicePlans(nextPlans);
    setSelectedPlanId(nextPlans[0].id);
    setDeletingPlanId(null);
    showToast('Service Plan Deleted');
  };

  // Update Musician Confirmation Status
  const handleToggleMusicianStatus = (roleName: string, newStatus: 'Confirmed' | 'Tentative' | 'Declined') => {
    if (!activePlan) return;
    const updatedMusicians = activePlan.musicians.map((m) => {
      if (m.instrumentOrRole === roleName) {
        return { ...m, status: newStatus };
      }
      return m;
    });

    const updatedPlan: M41ServicePlan = { ...activePlan, musicians: updatedMusicians };
    const nextPlans = servicePlans.map((p) => (p.id === activePlan.id ? updatedPlan : p));
    persistPlans(nextPlans);
    showToast(`Updated ${roleName} to "${newStatus}" (Simulated)`);
  };

  // Setlist Reordering & Removal
  const handleMoveSong = (index: number, direction: 'up' | 'down') => {
    if (!activePlan) return;
    const nextSetlist = [...activePlan.setlist];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= nextSetlist.length) return;

    const temp = nextSetlist[index];
    nextSetlist[index] = nextSetlist[targetIdx];
    nextSetlist[targetIdx] = temp;

    const updatedPlan: M41ServicePlan = { ...activePlan, setlist: nextSetlist };
    const nextPlans = servicePlans.map((p) => (p.id === activePlan.id ? updatedPlan : p));
    persistPlans(nextPlans);
  };

  const handleRemoveSong = (songId: string) => {
    if (!activePlan) return;
    const nextSetlist = activePlan.setlist.filter((s) => s.songId !== songId);
    const updatedPlan: M41ServicePlan = { ...activePlan, setlist: nextSetlist };
    const nextPlans = servicePlans.map((p) => (p.id === activePlan.id ? updatedPlan : p));
    persistPlans(nextPlans);
    showToast('Song removed from setlist (Simulated)');
  };

  const handleTransposeSong = (songId: string, newKey: string) => {
    if (!activePlan) return;
    const nextSetlist = activePlan.setlist.map((s) => {
      if (s.songId === songId) {
        return { ...s, transposedKey: newKey };
      }
      return s;
    });
    const updatedPlan: M41ServicePlan = { ...activePlan, setlist: nextSetlist };
    const nextPlans = servicePlans.map((p) => (p.id === activePlan.id ? updatedPlan : p));
    persistPlans(nextPlans);
    showToast(`Transposed key to "${newKey}" (Simulated)`);
  };

  const handleAddSongToSetlist = () => {
    if (!activePlan) return;
    const songMaster = INITIAL_ADMIN_SONGS.find((s) => s.id === selectedSongToAddId);
    if (!songMaster) return;

    const newItem: ServicePlanSetlistItem = {
      songId: songMaster.id,
      title: songMaster.title,
      originalKey: songMaster.musicalKey,
      transposedKey: songKeyOverride || songMaster.musicalKey,
      tempoBpm: songMaster.tempoBpm,
      language: 'English & Telugu',
      worshipLeader: activePlan.worshipLeader,
    };

    const nextSetlist = [...activePlan.setlist, newItem];
    const updatedPlan: M41ServicePlan = { ...activePlan, setlist: nextSetlist };
    const nextPlans = servicePlans.map((p) => (p.id === activePlan.id ? updatedPlan : p));
    persistPlans(nextPlans);
    setIsAddSongModalOpen(false);
    showToast(`Added "${songMaster.title}" to setlist (Simulated)`);
  };

  // Volunteer Reassignment
  const handleConfirmVolunteerReassignment = () => {
    if (!activePlan || !editingDuty) return;
    const volRecord = INITIAL_ADMIN_VOLUNTEERS.find((v) => v.id === selectedReplacementVolId);
    if (!volRecord) return;

    const nextDuties = activePlan.volunteerDuties.map((d) => {
      if (d.id === editingDuty.id) {
        return {
          ...d,
          volunteerId: volRecord.id,
          volunteerName: volRecord.volunteerName,
          status: 'Confirmed' as const,
          skills: volRecord.skills,
        };
      }
      return d;
    });

    const updatedPlan: M41ServicePlan = { ...activePlan, volunteerDuties: nextDuties };
    const nextPlans = servicePlans.map((p) => (p.id === activePlan.id ? updatedPlan : p));
    persistPlans(nextPlans);
    setEditingDuty(null);
    showToast(`Assigned ${volRecord.volunteerName} to ${editingDuty.dutyRole} (Simulated)`);
  };

  // Run Sheet Cue Addition
  const handleAddCue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlan || !newCueData.segmentTitle.trim()) return;

    const newCue: ServiceRunSheetCue = {
      id: `CUE-${Date.now().toString().slice(-4)}`,
      segmentOrder: activePlan.runSheet.length + 1,
      startTime: '10:15 AM',
      durationMinutes: Number(newCueData.durationMinutes) || 10,
      segmentTitle: newCueData.segmentTitle.trim(),
      ministerOrLeader: newCueData.ministerOrLeader.trim(),
      mediaNotes: newCueData.mediaNotes.trim(),
      bandPreset: newCueData.bandPreset.trim(),
    };

    const nextRunSheet = [...activePlan.runSheet, newCue];
    const updatedPlan: M41ServicePlan = { ...activePlan, runSheet: nextRunSheet };
    const nextPlans = servicePlans.map((p) => (p.id === activePlan.id ? updatedPlan : p));
    persistPlans(nextPlans);
    setIsAddCueModalOpen(false);
    showToast(`Added segment "${newCue.segmentTitle}" to Order of Worship`);
  };

  return (
    <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
      <AdminNavigationShell>
        <div className="min-h-screen bg-[#070E17] text-slate-100 p-4 md:p-8 space-y-6">
          {/* Top Banner */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-amber-950/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
                <Sparkles size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-white tracking-wide">
                    M41 · Admin Service Roster &amp; Worship Operations
                  </h1>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 uppercase">
                    Layer A Simulation
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Orchestrate weekly service plans, program run sheet cues, coordinate worship musicians, transpose setlists, assign volunteer duties, and auto-detect schedule conflicts.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={openCreatePlanModal}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1E6F43] hover:bg-[#185835] text-white text-xs font-semibold shadow-md shadow-emerald-950/40 transition-colors"
                title="Create a new service plan from scratch"
              >
                <Plus size={14} />
                <span>+ Create New Plan</span>
              </button>
              <button
                type="button"
                onClick={handleResetBaseline}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-colors"
                title="Reset service roster to baseline demonstration data"
              >
                <RotateCcw size={14} />
                <span>Reset Demo Data</span>
              </button>
              <button
                type="button"
                onClick={handleDuplicatePlan}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors"
                title="Duplicate active service template for next week"
              >
                <Copy size={14} />
                <span>Duplicate Plan</span>
              </button>
              <button
                type="button"
                onClick={() => setIsLiveStageHudOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
              >
                <Radio size={14} className="text-emerald-400" />
                <span>Stage HUD Live</span>
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

          {/* KPI Cards Row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            <div className="bg-[#0B192C] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Scheduled Plans</span>
                <Calendar size={16} className="text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-white">{kpis.totalPlans}</div>
              <p className="text-[10px] text-slate-500 mt-0.5">Active Service Sessions</p>
            </div>

            <div className="bg-[#0B192C] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Band Coverage</span>
                <Music size={16} className="text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-300">{kpis.musicianCoveragePct}%</div>
              <p className="text-[10px] text-slate-500 mt-0.5">Confirmed Musicians</p>
            </div>

            <div className="bg-[#0B192C] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Volunteer Fill</span>
                <Users size={16} className="text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-blue-300">{kpis.volunteerCoveragePct}%</div>
              <p className="text-[10px] text-slate-500 mt-0.5">M39 Department Quota</p>
            </div>

            <div className="bg-[#0B192C] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Setlist Repertoire</span>
                <Volume2 size={16} className="text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-purple-300">{kpis.setlistCount} Songs</div>
              <p className="text-[10px] text-slate-500 mt-0.5">M31 Songbook Cues</p>
            </div>

            <div className="bg-[#0B192C] border border-slate-800/80 rounded-2xl p-4 shadow-sm col-span-2 md:col-span-1">
              <div className="flex items-center justify-between text-slate-400 mb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Schedule Health</span>
                <AlertTriangle size={16} className={kpis.conflictCount > 0 ? 'text-amber-400' : 'text-emerald-400'} />
              </div>
              <div className={`text-2xl font-bold ${kpis.conflictCount > 0 ? 'text-amber-400' : 'text-emerald-300'}`}>
                {kpis.conflictCount} Conflicts
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {kpis.conflictCount > 0 ? 'Action required in Conflict Tab' : 'Zero scheduling collisions'}
              </p>
            </div>
          </div>

          {/* Active Service Selector Bar (Aligned with M34 Attendance Slots) */}
          <div className="bg-[#0B192C] border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <ClipboardList size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Target Service Session (M34 Aligned)
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <select
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    className="bg-slate-900 border border-slate-800 text-sm font-bold text-white rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500"
                  >
                    {servicePlans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.serviceDate} · {p.serviceType} — {p.serviceTitle}
                      </option>
                    ))}
                  </select>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      activePlan?.status === 'Confirmed (Sim)'
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                        : 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    {activePlan?.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Service Summary Details */}
            <div className="flex items-center gap-4 text-xs text-slate-300 border-t md:border-t-0 pt-2 md:pt-0 border-slate-800">
              <div>
                <span className="text-slate-500 block text-[10px]">Lead Pastor:</span>
                <span className="font-semibold text-white">{activePlan?.leadPastor}</span>
              </div>
              <div className="border-l border-slate-800 pl-4">
                <span className="text-slate-500 block text-[10px]">Worship Leader:</span>
                <span className="font-semibold text-white">{activePlan?.worshipLeader}</span>
              </div>
              <div className="border-l border-slate-800 pl-4">
                <span className="text-slate-500 block text-[10px]">Planned Window:</span>
                <span className="font-semibold text-amber-300">
                  {activePlan?.startTime} - {activePlan?.endTime} ({activePlan?.estimatedDurationMinutes}m)
                </span>
              </div>
              <div className="border-l border-slate-800 pl-4">
                <button
                  type="button"
                  onClick={() => openEditPlanModal(activePlan)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-medium transition-colors"
                  title="Edit active service plan metadata"
                >
                  <Edit3 size={13} className="text-amber-400" />
                  <span>Edit Plan</span>
                </button>
              </div>
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
              <span>Service Schedule &amp; Plans</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('runsheet')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                activeTab === 'runsheet'
                  ? 'bg-[#1E6F43] text-white shadow-md shadow-emerald-950/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Clock size={15} />
              <span>Order of Worship (Run Sheet) ({activePlan?.runSheet?.length || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('band-setlist')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                activeTab === 'band-setlist'
                  ? 'bg-[#1E6F43] text-white shadow-md shadow-emerald-950/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Music size={15} />
              <span>Worship Band &amp; Setlist ({activePlan?.setlist?.length || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('volunteers')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                activeTab === 'volunteers'
                  ? 'bg-[#1E6F43] text-white shadow-md shadow-emerald-950/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Users size={15} />
              <span>M39 Volunteer Duties ({activePlan?.volunteerDuties?.length || 0})</span>
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
              <AlertTriangle size={15} className={detectedConflicts.length > 0 ? 'text-amber-400' : ''} />
              <span>Conflicts &amp; Overlaps ({detectedConflicts.length})</span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: SERVICE SCHEDULE & PLANS                                           */}
          {/* ========================================================================= */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {servicePlans.map((plan) => {
                  const isSelected = plan.id === activePlan?.id;
                  const confirmedBand = plan.musicians.filter((m) => m.status === 'Confirmed').length;
                  const filledVolunteers = plan.volunteerDuties.filter((d) => d.status !== 'Unassigned').length;

                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`cursor-pointer rounded-2xl p-5 border transition-all ${
                        isSelected
                          ? 'bg-[#0B192C] border-emerald-500/80 shadow-lg shadow-emerald-950/20'
                          : 'bg-[#0B192C]/70 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/30 text-[10px] font-bold text-emerald-300">
                              {plan.serviceType}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">{plan.serviceDate}</span>
                          </div>
                          <h3 className="font-bold text-white text-base mt-1.5">{plan.serviceTitle}</h3>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            plan.status === 'Confirmed (Sim)'
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                              : 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                          }`}
                        >
                          {plan.status}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Band Lineup</span>
                          <span className="font-bold text-emerald-400">
                            {confirmedBand}/{plan.musicians.length} Confirmed
                          </span>
                        </div>
                        <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Volunteer Roster</span>
                          <span className="font-bold text-blue-400">
                            {filledVolunteers}/{plan.volunteerDuties.length} Filled
                          </span>
                        </div>
                        <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Duration</span>
                          <span className="font-bold text-amber-300">{plan.estimatedDurationMinutes} mins</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                        <span>Lead Pastor: <strong className="text-white">{plan.leadPastor}</strong></span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditPlanModal(plan);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1"
                            title="Edit plan metadata"
                          >
                            <Edit3 size={12} className="text-amber-400" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPlanId(plan.id);
                              setActiveTab('runsheet');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
                          >
                            Open Run Sheet
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingPlanId(plan.id);
                            }}
                            className="p-1 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/20"
                            title="Delete plan"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: ORDER OF WORSHIP (RUN SHEET & LIVE STAGE HUD)                      */}
          {/* ========================================================================= */}
          {activeTab === 'runsheet' && (
            <div className="space-y-4">
              {/* Overrun Warning Banner */}
              {isRunSheetOvertime && (
                <div className="bg-amber-950/60 border border-amber-500/50 rounded-2xl p-4 flex items-center gap-3 text-xs text-amber-200 shadow-md">
                  <AlertTriangle size={18} className="text-amber-400 shrink-0" />
                  <div>
                    <span className="font-bold">Service Run Sheet Overrun Alert: </span>
                    Total program cue duration ({totalRunSheetMinutes} mins) exceeds planned duration ({activePlan?.estimatedDurationMinutes} mins) by {totalRunSheetMinutes - (activePlan?.estimatedDurationMinutes || 0)} minutes.
                  </div>
                </div>
              )}

              {/* Toolbar */}
              <div className="bg-[#0B192C] border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-amber-400" />
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Sequential Run Sheet Cues ({activePlan?.runSheet?.length || 0} segments)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Accumulated Runtime: <strong className="text-white">{totalRunSheetMinutes} mins</strong> (Planned: {activePlan?.estimatedDurationMinutes} mins)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddCueModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E6F43] hover:bg-[#185835] text-white text-xs font-semibold transition-colors"
                  >
                    <Plus size={14} />
                    <span>Add Segment Cue</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLiveStageHudOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                  >
                    <Radio size={14} className="text-emerald-400" />
                    <span>Launch Stage HUD</span>
                  </button>
                </div>
              </div>

              {/* Cue Table */}
              <div className="bg-[#0B192C] border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4 w-12 font-semibold">#</th>
                        <th className="py-3 px-4 font-semibold">Start &amp; Duration</th>
                        <th className="py-3 px-4 font-semibold">Segment Title</th>
                        <th className="py-3 px-4 font-semibold">Minister / Leader</th>
                        <th className="py-3 px-4 font-semibold">Media &amp; Visual Notes</th>
                        <th className="py-3 px-4 font-semibold">Band Sound Preset</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {activePlan?.runSheet?.map((cue, idx) => (
                        <tr
                          key={cue.id}
                          className={`hover:bg-slate-800/30 transition-colors ${
                            idx === activeHudCueIndex ? 'bg-emerald-950/20 border-l-4 border-l-emerald-500' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-bold text-slate-400">{cue.segmentOrder}</td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-white">{cue.startTime}</span>
                            <span className="text-[11px] text-amber-400 ml-1.5">({cue.durationMinutes}m)</span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-100">{cue.segmentTitle}</td>
                          <td className="py-3 px-4 text-emerald-300">{cue.ministerOrLeader}</td>
                          <td className="py-3 px-4 text-slate-400 max-w-xs truncate">{cue.mediaNotes}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-purple-300 font-medium">
                              {cue.bandPreset}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: WORSHIP BAND & M31 SETLIST                                         */}
          {/* ========================================================================= */}
          {activeTab === 'band-setlist' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Worship Musician Lineup */}
              <div className="space-y-4">
                <div className="bg-[#0B192C] border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2">
                    <Music size={16} className="text-emerald-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Worship Musician Lineup ({activePlan?.musicians?.length || 0})
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400">8 Standard Band Instruments</span>
                </div>

                <div className="bg-[#0B192C] border border-slate-800/80 rounded-2xl overflow-hidden divide-y divide-slate-800/60 shadow-sm">
                  {activePlan?.musicians?.map((m) => (
                    <div key={m.instrumentOrRole} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-800/30 transition-colors">
                      <div>
                        <span className="font-bold text-white block">{m.instrumentOrRole}</span>
                        <span className="text-slate-400 text-[11px]">{m.assignedMemberName}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={m.status}
                          onChange={(e) =>
                            handleToggleMusicianStatus(
                              m.instrumentOrRole,
                              e.target.value as 'Confirmed' | 'Tentative' | 'Declined'
                            )
                          }
                          className={`text-[10px] font-bold rounded-lg px-2.5 py-1 border focus:outline-none ${
                            m.status === 'Confirmed'
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                              : m.status === 'Tentative'
                              ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                              : 'bg-red-950/80 text-red-300 border-red-500/40'
                          }`}
                        >
                          <option value="Confirmed">Confirmed</option>
                          <option value="Tentative">Tentative</option>
                          <option value="Declined">Declined</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Worship Setlist Manager (Linked to M31) */}
              <div className="space-y-4">
                <div className="bg-[#0B192C] border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2">
                    <Volume2 size={16} className="text-purple-400" />
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        Worship Setlist (M31 Linked)
                      </h3>
                      <p className="text-[11px] text-slate-400">Chromatic Key Transposition Active</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddSongModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E6F43] hover:bg-[#185835] text-white text-xs font-semibold transition-colors"
                  >
                    <Plus size={14} />
                    <span>Add Song</span>
                  </button>
                </div>

                <div className="bg-[#0B192C] border border-slate-800/80 rounded-2xl divide-y divide-slate-800/60 overflow-hidden shadow-sm">
                  {activePlan?.setlist?.map((s, idx) => (
                    <div key={s.songId} className="p-3.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 text-center font-bold text-slate-500">{idx + 1}</span>
                        <div>
                          <div className="font-semibold text-white">{s.title}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>{s.tempoBpm} BPM</span>
                            <span>·</span>
                            <span>{s.language}</span>
                            <span>·</span>
                            <span className="text-slate-500">Orig: {s.originalKey}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Key Transposer Selector */}
                        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
                          <span className="text-[10px] text-slate-400">Key:</span>
                          <select
                            value={s.transposedKey}
                            onChange={(e) => handleTransposeSong(s.songId, e.target.value)}
                            className="bg-transparent text-emerald-400 font-bold text-xs focus:outline-none"
                          >
                            {CHROMATIC_KEYS.map((k) => (
                              <option key={k} value={k} className="bg-slate-900 text-white">
                                {k}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Reorder Buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveSong(idx, 'up')}
                            className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                            title="Move Up"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === activePlan.setlist.length - 1}
                            onClick={() => handleMoveSong(idx, 'down')}
                            className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                            title="Move Down"
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveSong(s.songId)}
                          className="p-1 text-red-400 hover:text-red-300"
                          title="Remove Song"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: M39 VOLUNTEER DUTIES & DEPARTMENTS                                 */}
          {/* ========================================================================= */}
          {activeTab === 'volunteers' && (
            <div className="space-y-4">
              <div className="bg-[#0B192C] border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-blue-400" />
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      M39 Volunteer Department Roster ({activePlan?.volunteerDuties?.length || 0} assigned duties)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Coordinated across 6 canonical M39 ministry departments
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400">Stable Synthetic IDs (VOL-2026-XX)</span>
              </div>

              {/* Department Duty Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activePlan?.volunteerDuties?.map((duty) => (
                  <div
                    key={duty.id}
                    className="bg-[#0B192C] border border-slate-800/80 rounded-2xl p-4 space-y-3 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-300 truncate max-w-[180px]">
                          {duty.department}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                            duty.status === 'Confirmed'
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                              : 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                          }`}
                        >
                          {duty.status}
                        </span>
                      </div>

                      <h4 className="font-bold text-white text-xs">{duty.dutyRole}</h4>
                      <div className="text-[11px] text-emerald-400 font-semibold">{duty.volunteerName}</div>
                      <div className="text-[10px] text-slate-500">ID: {duty.volunteerId}</div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                        Skills: {duty.skills.slice(0, 2).join(', ')}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDuty(duty);
                          setSelectedReplacementVolId(duty.volunteerId);
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-medium transition-colors"
                      >
                        Reassign
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: AUTOMATED CONFLICT DETECTION                                       */}
          {/* ========================================================================= */}
          {activeTab === 'conflicts' && (
            <div className="space-y-4">
              <div className="bg-[#0B192C] border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} className="text-amber-400" />
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Automated Conflict Detection Engine
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Evaluates dual roles in same service, overlapping service times (15m buffer), and M39 availability profiles.
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-bold text-amber-300">
                  {detectedConflicts.length} Issues Detected
                </span>
              </div>

              {detectedConflicts.length === 0 ? (
                <div className="bg-[#0B192C] border border-emerald-500/30 rounded-2xl p-12 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={24} />
                  </div>
                  <h3 className="text-sm font-semibold text-white">All Schedules Harmonized</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    No dual-role assignments, schedule overlaps, or availability collisions were detected across active service plans.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {detectedConflicts.map((conf) => (
                    <div
                      key={conf.id}
                      className={`rounded-2xl p-4 border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm ${
                        conf.severity === 'Critical'
                          ? 'bg-red-950/20 border-red-500/40 text-red-200'
                          : 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                              conf.severity === 'Critical'
                                ? 'bg-red-900/80 text-white border-red-500'
                                : 'bg-amber-900/80 text-white border-amber-500'
                            }`}
                          >
                            {conf.severity} ({conf.conflictType})
                          </span>
                          <span className="font-semibold text-white text-xs">{conf.personName}</span>
                          <span className="text-[11px] text-slate-400">· {conf.serviceSlot}</span>
                        </div>
                        <p className="text-xs text-slate-300">{conf.description}</p>
                        <p className="text-[11px] text-slate-400 italic">💡 Suggested: {conf.suggestedResolution}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('volunteers');
                          showToast('Navigate to Volunteers Tab to reassign conflict');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold shrink-0"
                      >
                        Resolve Conflict
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODALS & SIMULATORS                                                       */}
          {/* ========================================================================= */}

          {/* Create Service Plan Modal */}
          {isCreatePlanOpen && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#0B192C] border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-emerald-400" />
                    <h3 className="font-bold text-white text-sm">Create New Service Plan</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreatePlanOpen(false)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSaveCreatePlan} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Service Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={planFormData.serviceTitle}
                      onChange={(e) => setPlanFormData({ ...planFormData, serviceTitle: e.target.value })}
                      placeholder="e.g. Sunday Celebration &amp; Praise Service"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                    />
                    {planFormErrors.serviceTitle && (
                      <p className="text-red-400 text-[10px] mt-1">{planFormErrors.serviceTitle}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Service Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={planFormData.serviceDate}
                        onChange={(e) => setPlanFormData({ ...planFormData, serviceDate: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      />
                      {planFormErrors.serviceDate && (
                        <p className="text-red-400 text-[10px] mt-1">{planFormErrors.serviceDate}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Service Slot (M34) *
                      </label>
                      <select
                        value={planFormData.serviceType}
                        onChange={(e) => setPlanFormData({ ...planFormData, serviceType: e.target.value as SundayServiceSlot })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="08:30 AM (1st Service)">08:30 AM (1st Service)</option>
                        <option value="11:00 AM (2nd Service)">11:00 AM (2nd Service)</option>
                        <option value="05:00 PM (Youth Service)">05:00 PM (Youth Service)</option>
                        <option value="07:00 PM (Mid-Week Prayer)">07:00 PM (Mid-Week Prayer)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Lead Pastor *
                      </label>
                      <input
                        type="text"
                        required
                        value={planFormData.leadPastor}
                        onChange={(e) => setPlanFormData({ ...planFormData, leadPastor: e.target.value })}
                        placeholder="e.g. Senior Pastor John Mark"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      />
                      {planFormErrors.leadPastor && (
                        <p className="text-red-400 text-[10px] mt-1">{planFormErrors.leadPastor}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Worship Leader *
                      </label>
                      <input
                        type="text"
                        required
                        value={planFormData.worshipLeader}
                        onChange={(e) => setPlanFormData({ ...planFormData, worshipLeader: e.target.value })}
                        placeholder="e.g. Brother Daniel Sundaram"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      />
                      {planFormErrors.worshipLeader && (
                        <p className="text-red-400 text-[10px] mt-1">{planFormErrors.worshipLeader}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Estimated Duration (Mins) *
                      </label>
                      <input
                        type="number"
                        min="15"
                        max="300"
                        required
                        value={planFormData.estimatedDurationMinutes}
                        onChange={(e) => setPlanFormData({ ...planFormData, estimatedDurationMinutes: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      />
                      {planFormErrors.estimatedDurationMinutes && (
                        <p className="text-red-400 text-[10px] mt-1">{planFormErrors.estimatedDurationMinutes}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Service Status
                      </label>
                      <select
                        value={planFormData.status}
                        onChange={(e) => setPlanFormData({ ...planFormData, status: e.target.value as ServicePlanStatus })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Draft (Sim)">Draft (Sim)</option>
                        <option value="Confirmed (Sim)">Confirmed (Sim)</option>
                        <option value="Archived (Sim)">Archived (Sim)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatePlanOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#1E6F43] hover:bg-[#185835] text-white text-xs font-semibold shadow-md shadow-emerald-950/40"
                    >
                      Create Service Plan (Simulated)
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Service Plan Metadata Modal */}
          {isEditPlanOpen && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#0B192C] border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Edit3 size={18} className="text-amber-400" />
                    <h3 className="font-bold text-white text-sm">
                      Edit Service Plan Metadata ({editingPlanTargetId || activePlan?.id})
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditPlanOpen(false);
                      setEditingPlanTargetId(null);
                    }}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSaveEditPlan} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Service Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={planFormData.serviceTitle}
                      onChange={(e) => setPlanFormData({ ...planFormData, serviceTitle: e.target.value })}
                      placeholder="e.g. Sunday Celebration &amp; Praise Service"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                    />
                    {planFormErrors.serviceTitle && (
                      <p className="text-red-400 text-[10px] mt-1">{planFormErrors.serviceTitle}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Service Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={planFormData.serviceDate}
                        onChange={(e) => setPlanFormData({ ...planFormData, serviceDate: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      />
                      {planFormErrors.serviceDate && (
                        <p className="text-red-400 text-[10px] mt-1">{planFormErrors.serviceDate}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Service Slot (M34) *
                      </label>
                      <select
                        value={planFormData.serviceType}
                        onChange={(e) => setPlanFormData({ ...planFormData, serviceType: e.target.value as SundayServiceSlot })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="08:30 AM (1st Service)">08:30 AM (1st Service)</option>
                        <option value="11:00 AM (2nd Service)">11:00 AM (2nd Service)</option>
                        <option value="05:00 PM (Youth Service)">05:00 PM (Youth Service)</option>
                        <option value="07:00 PM (Mid-Week Prayer)">07:00 PM (Mid-Week Prayer)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Lead Pastor *
                      </label>
                      <input
                        type="text"
                        required
                        value={planFormData.leadPastor}
                        onChange={(e) => setPlanFormData({ ...planFormData, leadPastor: e.target.value })}
                        placeholder="e.g. Senior Pastor John Mark"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      />
                      {planFormErrors.leadPastor && (
                        <p className="text-red-400 text-[10px] mt-1">{planFormErrors.leadPastor}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Worship Leader *
                      </label>
                      <input
                        type="text"
                        required
                        value={planFormData.worshipLeader}
                        onChange={(e) => setPlanFormData({ ...planFormData, worshipLeader: e.target.value })}
                        placeholder="e.g. Brother Daniel Sundaram"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      />
                      {planFormErrors.worshipLeader && (
                        <p className="text-red-400 text-[10px] mt-1">{planFormErrors.worshipLeader}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Estimated Duration (Mins) *
                      </label>
                      <input
                        type="number"
                        min="15"
                        max="300"
                        required
                        value={planFormData.estimatedDurationMinutes}
                        onChange={(e) => setPlanFormData({ ...planFormData, estimatedDurationMinutes: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      />
                      {planFormErrors.estimatedDurationMinutes && (
                        <p className="text-red-400 text-[10px] mt-1">{planFormErrors.estimatedDurationMinutes}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Service Status
                      </label>
                      <select
                        value={planFormData.status}
                        onChange={(e) => setPlanFormData({ ...planFormData, status: e.target.value as ServicePlanStatus })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Draft (Sim)">Draft (Sim)</option>
                        <option value="Confirmed (Sim)">Confirmed (Sim)</option>
                        <option value="Archived (Sim)">Archived (Sim)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditPlanOpen(false);
                        setEditingPlanTargetId(null);
                      }}
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

          {/* 1. Live Stage HUD Simulator (M17 Embedded) */}
          {isLiveStageHudOpen && (
            <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-[#070E17] border border-emerald-500/40 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative">
                <button
                  type="button"
                  onClick={() => setIsLiveStageHudOpen(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  <X size={18} />
                </button>

                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Radio size={18} className="text-red-500 animate-pulse" />
                    <span className="text-xs font-bold text-white uppercase tracking-widest">
                      Live Stage HUD Simulator · {activePlan?.serviceType}
                    </span>
                  </div>
                  <span className="text-xs text-emerald-400 font-mono">ON AIR (SIM)</span>
                </div>

                {/* Stage Monitor Display Box */}
                <div className="bg-black/80 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
                  <span className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">
                    Active Program Segment
                  </span>
                  <div className="text-2xl md:text-3xl font-extrabold text-white tracking-wide">
                    {activePlan?.runSheet[activeHudCueIndex]?.segmentTitle || 'Opening Worship'}
                  </div>

                  <div className="text-5xl font-mono font-black text-amber-400 tracking-wider">
                    18:42
                  </div>
                  <p className="text-xs text-slate-400">
                    Leader: <strong className="text-emerald-300">{activePlan?.runSheet[activeHudCueIndex]?.ministerOrLeader}</strong> · Preset: <strong className="text-purple-300">{activePlan?.runSheet[activeHudCueIndex]?.bandPreset}</strong>
                  </p>
                </div>

                {/* Next Up Cue Bar */}
                <div className="bg-[#0B192C] border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">NEXT UP:</span>
                  <span className="font-bold text-white">
                    {activePlan?.runSheet[activeHudCueIndex + 1]?.segmentTitle || 'Altar Call & Benediction'}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveHudCueIndex((prev) =>
                        prev < (activePlan?.runSheet?.length || 1) - 1 ? prev + 1 : 0
                      )
                    }
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-300"
                  >
                    Advance Cue ⏭️
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. Add Song Modal (M31 Linked) */}
          {isAddSongModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#0B192C] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Music size={18} className="text-emerald-400" />
                    <h3 className="font-bold text-white text-sm">Add Song from M31 Songbook</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddSongModalOpen(false)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Select Song</label>
                    <select
                      value={selectedSongToAddId}
                      onChange={(e) => setSelectedSongToAddId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                    >
                      {INITIAL_ADMIN_SONGS.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title} (Orig: {s.musicalKey}, {s.tempoBpm} BPM)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Target Transposed Key</label>
                    <select
                      value={songKeyOverride}
                      onChange={(e) => setSongKeyOverride(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                    >
                      {CHROMATIC_KEYS.map((k) => (
                        <option key={k} value={k}>
                          Key: {k}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddSongModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddSongToSetlist}
                    className="px-4 py-2 rounded-xl bg-[#1E6F43] text-white text-xs font-semibold"
                  >
                    Add to Setlist
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. Volunteer Reassignment Modal */}
          {editingDuty && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#0B192C] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Users size={18} className="text-blue-400" />
                    <h3 className="font-bold text-white text-sm">Reassign Volunteer Duty</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingDuty(null)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Duty Position</span>
                    <p className="font-semibold text-white">{editingDuty.dutyRole}</p>
                    <p className="text-slate-400 text-[11px]">{editingDuty.department} · {editingDuty.serviceSlot}</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Select Eligible Volunteer from M39
                    </label>
                    <select
                      value={selectedReplacementVolId}
                      onChange={(e) => setSelectedReplacementVolId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                    >
                      {INITIAL_ADMIN_VOLUNTEERS.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.volunteerName} ({v.department}) · {v.availability}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingDuty(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmVolunteerReassignment}
                    className="px-4 py-2 rounded-xl bg-[#1E6F43] text-white text-xs font-semibold"
                  >
                    Confirm Reassignment
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 4. Add Cue Modal */}
          {isAddCueModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#0B192C] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Clock size={18} className="text-emerald-400" />
                    <h3 className="font-bold text-white text-sm">Add Run Sheet Program Cue</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddCueModalOpen(false)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleAddCue} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Segment Title *</label>
                    <input
                      type="text"
                      required
                      value={newCueData.segmentTitle}
                      onChange={(e) => setNewCueData({ ...newCueData, segmentTitle: e.target.value })}
                      placeholder="e.g. Special Choral Anthem"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Duration (Mins)</label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={newCueData.durationMinutes}
                        onChange={(e) => setNewCueData({ ...newCueData, durationMinutes: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Minister / Leader</label>
                      <input
                        type="text"
                        value={newCueData.ministerOrLeader}
                        onChange={(e) => setNewCueData({ ...newCueData, ministerOrLeader: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Media / AV Notes</label>
                    <input
                      type="text"
                      value={newCueData.mediaNotes}
                      onChange={(e) => setNewCueData({ ...newCueData, mediaNotes: e.target.value })}
                      placeholder="e.g. Show lower-third title graphic"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Band Sound Preset</label>
                    <input
                      type="text"
                      value={newCueData.bandPreset}
                      onChange={(e) => setNewCueData({ ...newCueData, bandPreset: e.target.value })}
                      placeholder="e.g. Acoustic Strings & Pad"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddCueModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#1E6F43] text-white text-xs font-semibold"
                    >
                      Add Segment
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 5. Delete Plan Dialog */}
          {deletingPlanId && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#0B192C] border border-red-500/40 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                <div className="w-12 h-12 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto">
                  <AlertTriangle size={24} />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-base font-bold text-white">Delete Demonstration Service Plan?</h3>
                  <p className="text-xs text-slate-400">
                    Are you sure you want to remove this service plan from your local simulation state? This will remove its associated run sheet, musician assignments, and volunteer duties.
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDeletingPlanId(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeletePlan}
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
