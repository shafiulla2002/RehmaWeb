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
  INITIAL_ADMIN_JOB_OPPORTUNITIES,
  AdminJobOpportunity as BaseJobOpportunity,
  JobCompensationType,
  AdminJobApplicant as BaseJobApplicant,
  JobApplicantStage,
} from '@/lib/adminWave7cData';
import {
  INITIAL_ADMIN_MEMBERS,
  AdminMemberRecord,
  INITIAL_ADMIN_VOLUNTEERS,
  AdminVolunteerApplication,
  VolunteerDepartment,
} from '@/lib/adminWave7bData';
import {
  Briefcase,
  Users,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Plus,
  Edit3,
  Trash2,
  X,
  FileText,
  User,
  Shield,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ArrowRight,
  Calendar,
  Building,
  Check,
  Ban,
  Layers,
  MapPin,
  ExternalLink,
  Phone,
  Mail,
  Award,
  ListOrdered,
  UserCheck,
} from 'lucide-react';

const STORAGE_KEY_JOB_CIRCLE = '@rhema_admin_m43_job_circle';

// =========================================================================
// M43 TYPES & MODELS
// =========================================================================

// Five Opportunity Lifecycle Statuses (Strict User Requirement)
export type AdminJobOpportunityStatus =
  | 'Draft'
  | 'Under Review'
  | 'Published'
  | 'Closed'
  | 'Archived';

// Five Candidate Pipeline Stages (Strict User Requirement)
export type AdminJobApplicantStatus =
  | 'Submitted'
  | 'Under Review'
  | 'Shortlisted'
  | 'Approved'
  | 'Rejected';

export interface AdminJobApplicant {
  id: string; // e.g. "APP-JOB-01"
  opportunityId: string;
  applicantName: string;
  memberId?: string; // M33 Member Link (Read-Only)
  phoneMasked: string; // e.g. "+91 98801-XXXX1"
  email: string;
  currentStage: AdminJobApplicantStatus;
  appliedDate: string; // YYYY-MM-DD
  yearsExperience: number;
  skillsSummary: string[];
  resumeDocName: string; // Demonstration Attachment Label
  backgroundCheckSimulated: boolean; // Demonstration Verification Badge
  interviewDate?: string;
  notes?: string;
}

export interface AdminJobOpportunity {
  id: string; // e.g. "JOB-2026-01"
  demoTag: 'Simulated Job Listing (Demo)';
  publicJobRefId?: string; // Optional reference to M20 JobOpportunity.id
  title: string;
  department: string;
  compensationType: JobCompensationType;
  location: string;
  status: AdminJobOpportunityStatus;
  description: string;
  requirements: string[];
  postedDate: string;
  closingDate: string;
  totalApplicants: number;
  applicants: AdminJobApplicant[];
}

// M43-Local Assigned Volunteer Model with Time-Intervals (Strict User Requirement 1)
export interface M43AssignedVolunteer {
  volunteerId: string; // Links to M39 AdminVolunteerApplication.id
  volunteerName: string;
  subteam: string;
  roleName: string;
  assignedDate: string; // YYYY-MM-DD
  serviceSlot: string; // e.g. "08:30 AM (1st Service)"
  startTime: string; // e.g. "08:00 AM"
  endTime: string; // e.g. "10:30 AM"
  assignmentStatus: 'Active' | 'Inactive' | 'Removed';
}

export interface AdminMinistryTeamDetail {
  teamId: string; // e.g. "TEAM-01"
  teamName: string;
  departmentKey: VolunteerDepartment; // Exact M39 Canonical Department
  subteams: string[];
  teamLead: string;
  leadPhoneMasked: string;
  targetQuota: number; // Exactly from 32, 40, 20, 28, 24, 16 breakdown (sum = 160)
  meetingSchedule: string;
  meetingLocation: string;
  assignedVolunteers: M43AssignedVolunteer[];
}

// Convert "HH:MM AM/PM" to minutes from midnight
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

// =========================================================================
// INITIAL SYNTHETIC DEMONSTRATION DATASETS
// =========================================================================

// Six Canonical M39 Teams with 12 Operational Subteams and EXACT 160 Quota Target
const BASELINE_M43_TEAMS: AdminMinistryTeamDetail[] = [
  {
    teamId: 'TEAM-01',
    teamName: 'Ushering & Sanctuary Hospitality',
    departmentKey: 'Ushering & Hospitality',
    subteams: ['Sanctuary Seating & Protocol', 'Offering & Communion Logistics'],
    teamLead: 'Brother Stephen (Head Usher)',
    leadPhoneMasked: '+91 98450-XXXX1',
    targetQuota: 32,
    meetingSchedule: 'Sunday 07:30 AM & Thursday 07:00 PM',
    meetingLocation: 'Sanctuary Narthex & Hall A',
    assignedVolunteers: [
      {
        volunteerId: 'VOL-2026-03',
        volunteerName: 'David K. Joseph (Demo)',
        subteam: 'Sanctuary Seating & Protocol',
        roleName: 'Main Sanctuary Center Aisle Lead Usher',
        assignedDate: '2026-09-01',
        serviceSlot: '08:30 AM (1st Service)',
        startTime: '08:00 AM',
        endTime: '10:30 AM',
        assignmentStatus: 'Active',
      },
      {
        volunteerId: 'VOL-2026-07',
        volunteerName: 'Brother Marcus (Demo)',
        subteam: 'Offering & Communion Logistics',
        roleName: 'Tithe & Offering Bucket Steward',
        assignedDate: '2026-09-15',
        serviceSlot: '08:30 AM (1st Service)',
        startTime: '08:00 AM',
        endTime: '10:30 AM',
        assignmentStatus: 'Active',
      },
    ],
  },
  {
    teamId: 'TEAM-02',
    teamName: 'Worship Choir & Media Production',
    departmentKey: 'Worship Choir & Media Audio/Visual',
    subteams: ['Worship Band & Choral Ensemble', 'FOH Audio, PTZ Cameras & Broadcast'],
    teamLead: 'Brother Daniel Sundaram & Brother Luke Media',
    leadPhoneMasked: '+91 98450-XXXX2',
    targetQuota: 40,
    meetingSchedule: 'Thursday 06:30 PM & Saturday 04:00 PM',
    meetingLocation: 'Choir Loft & Master Broadcast Control Suite',
    assignedVolunteers: [
      {
        volunteerId: 'VOL-2026-01',
        volunteerName: 'Jonathan Samuel (Demo)',
        subteam: 'FOH Audio, PTZ Cameras & Broadcast',
        roleName: 'Live Broadcast Video Switcher Operator',
        assignedDate: '2026-08-15',
        serviceSlot: '08:30 AM (1st Service)',
        startTime: '07:45 AM',
        endTime: '10:30 AM',
        assignmentStatus: 'Active',
      },
      {
        volunteerId: 'VOL-2026-08',
        volunteerName: 'Sister Grace Thomas (Demo)',
        subteam: 'Worship Band & Choral Ensemble',
        roleName: 'Main Keyboard & Piano Accompanist',
        assignedDate: '2026-08-10',
        serviceSlot: '08:30 AM (1st Service)',
        startTime: '07:45 AM',
        endTime: '10:30 AM',
        assignmentStatus: 'Active',
      },
    ],
  },
  {
    teamId: 'TEAM-03',
    teamName: "Children's Church & Youth Faculty",
    departmentKey: "Children's & Teens Ministry",
    subteams: ['Early Childhood & Sunday School', 'Teens Discipleship & Youth Mentoring'],
    teamLead: 'Sister Ruth (Director)',
    leadPhoneMasked: '+91 98450-XXXX3',
    targetQuota: 20,
    meetingSchedule: '1st Saturday Monthly & Sunday 08:00 AM',
    meetingLocation: 'Children Sanctuary Hall B & Youth Lounge',
    assignedVolunteers: [
      {
        volunteerId: 'VOL-2026-02',
        volunteerName: 'Hannah Deborah (Demo)',
        subteam: 'Early Childhood & Sunday School',
        roleName: 'Primary Sunday School Lead Teacher (Ages 6-8)',
        assignedDate: '2026-09-01',
        serviceSlot: '08:30 AM (1st Service)',
        startTime: '08:15 AM',
        endTime: '10:30 AM',
        assignmentStatus: 'Active',
      },
    ],
  },
  {
    teamId: 'TEAM-04',
    teamName: 'Intercessory Prayer Watch',
    departmentKey: 'Intercessory Prayer Team',
    subteams: ['Daily Dawn Prayer Watch', 'Altar & Post-Service Prayer Line'],
    teamLead: 'Mother Deborah (Prayer Lead)',
    leadPhoneMasked: '+91 98450-XXXX4',
    targetQuota: 28,
    meetingSchedule: 'Wednesday 05:00 AM & Sunday 10:30 AM',
    meetingLocation: 'Upper Room Prayer Chapel',
    assignedVolunteers: [
      {
        volunteerId: 'VOL-2026-05',
        volunteerName: 'Elder Joseph Kurian (Demo)',
        subteam: 'Altar & Post-Service Prayer Line',
        roleName: 'Altar Care & Intercessor Minister',
        assignedDate: '2026-08-01',
        serviceSlot: '08:30 AM (1st Service)',
        startTime: '08:30 AM',
        endTime: '11:00 AM',
        assignmentStatus: 'Active',
      },
    ],
  },
  {
    teamId: 'TEAM-05',
    teamName: 'Community Compassion & Food Bank',
    departmentKey: 'Community Outreach & Food Drive',
    subteams: ['Food Pantry Operations & Distribution', 'Hospital & Community Visitation Squad'],
    teamLead: 'Deacon Samuel Joseph',
    leadPhoneMasked: '+91 98450-XXXX5',
    targetQuota: 24,
    meetingSchedule: '2nd & 4th Saturday 09:00 AM',
    meetingLocation: 'Church Outreach Distribution Depot',
    assignedVolunteers: [
      {
        volunteerId: 'VOL-2026-06',
        volunteerName: 'Brother Timothy Roy (Demo)',
        subteam: 'Food Pantry Operations & Distribution',
        roleName: 'Outreach Vehicle Driver & Food Crate Logistics',
        assignedDate: '2026-09-20',
        serviceSlot: 'Special Events',
        startTime: '09:00 AM',
        endTime: '01:00 PM',
        assignmentStatus: 'Active',
      },
    ],
  },
  {
    teamId: 'TEAM-06',
    teamName: 'Welcome Desk & Guest Integration',
    departmentKey: 'Welcome Desk & Guest Care',
    subteams: ['First-Time Visitor Welcome Pack Desk', 'New Believers Assimilation & Follow-up'],
    teamLead: 'Sister Priya Sundaram',
    leadPhoneMasked: '+91 98450-XXXX6',
    targetQuota: 16,
    meetingSchedule: 'Sunday 08:00 AM & 10:30 AM',
    meetingLocation: 'Main Foyer Welcome Lounge',
    assignedVolunteers: [
      {
        volunteerId: 'VOL-2026-04',
        volunteerName: 'Priya Sundaram (Demo)',
        subteam: 'First-Time Visitor Welcome Pack Desk',
        roleName: 'Foyer Hospitality & Guest Welcome Coordinator',
        assignedDate: '2026-08-15',
        serviceSlot: '08:30 AM (1st Service)',
        startTime: '08:00 AM',
        endTime: '10:30 AM',
        assignmentStatus: 'Active',
      },
    ],
  },
];

// Baseline Initial Job Opportunities with 5 Statuses & 5-Stage Applicants
const BASELINE_M43_OPPORTUNITIES: AdminJobOpportunity[] = [
  {
    id: 'JOB-2026-01',
    demoTag: 'Simulated Job Listing (Demo)',
    publicJobRefId: 'job-1',
    title: 'Full-Time Associate Media & Broadcast Director',
    department: 'Media & Communications',
    compensationType: 'Full-Time Church Staff',
    location: 'Rhema Central Sanctuary, Bangalore',
    status: 'Published',
    description: 'Lead video production, live streaming broadcasts, digital audio consoles, and multi-camera switcher operations in ministry excellence.',
    requirements: [
      'Minimum 2 years experience in multi-camera live video production',
      'Proficiency in Blackmagic ATEM, OBS, and digital mixing consoles',
      'Committed servant heart for church worship excellence',
    ],
    postedDate: '2026-11-01',
    closingDate: '2026-12-15',
    totalApplicants: 4,
    applicants: [
      {
        id: 'APP-JOB-01',
        opportunityId: 'JOB-2026-01',
        applicantName: 'Brother Mark Philip (Demo)',
        memberId: 'RHEMA-2026-M001',
        phoneMasked: '+91 98801-XXXX1',
        email: 'mark.philip.demo@rhema-demo.org',
        currentStage: 'Shortlisted',
        appliedDate: '2026-11-08',
        yearsExperience: 4,
        skillsSummary: ['ATEM Switching', 'DaVinci Resolve', 'Live Sound Mixing'],
        resumeDocName: 'Resume_Mark_Philip_Media_Lead.pdf [Demonstration Attachment]',
        backgroundCheckSimulated: true,
        interviewDate: '2026-11-26',
        notes: 'Strong portfolio in live broadcast mixing. Cleared pastoral screening.',
      },
      {
        id: 'APP-JOB-02',
        opportunityId: 'JOB-2026-01',
        applicantName: 'Sister Sarah Paul (Demo)',
        memberId: 'RHEMA-2026-M002',
        phoneMasked: '+91 98801-XXXX2',
        email: 'sarah.paul.demo@rhema-demo.org',
        currentStage: 'Under Review',
        appliedDate: '2026-11-12',
        yearsExperience: 2,
        skillsSummary: ['Graphic Design', 'Premiere Pro', 'PTZ Camera Control'],
        resumeDocName: 'Resume_Sarah_Paul_Graphics.pdf [Demonstration Attachment]',
        backgroundCheckSimulated: true,
        notes: 'Great creative portfolio. Under review by media department head.',
      },
      {
        id: 'APP-JOB-03',
        opportunityId: 'JOB-2026-01',
        applicantName: 'Brother Kevin David (Demo)',
        memberId: 'RHEMA-2026-M003',
        phoneMasked: '+91 98801-XXXX3',
        email: 'kevin.david.demo@rhema-demo.org',
        currentStage: 'Submitted',
        appliedDate: '2026-11-15',
        yearsExperience: 1,
        skillsSummary: ['Audio Cabling', 'Stage Prep'],
        resumeDocName: 'Resume_Kevin_David.pdf [Demonstration Attachment]',
        backgroundCheckSimulated: true,
      },
      {
        id: 'APP-JOB-04',
        opportunityId: 'JOB-2026-01',
        applicantName: 'Brother Johnathan Lee (Demo)',
        phoneMasked: '+91 98801-XXXX4',
        email: 'johnathan.lee.demo@rhema-demo.org',
        currentStage: 'Rejected',
        appliedDate: '2026-11-02',
        yearsExperience: 0,
        skillsSummary: ['Basic Sound'],
        resumeDocName: 'Resume_Johnathan.pdf [Demonstration Attachment]',
        backgroundCheckSimulated: true,
        notes: 'Candidate withdrew due to relocation.',
      },
    ],
  },
  {
    id: 'JOB-2026-02',
    demoTag: 'Simulated Job Listing (Demo)',
    publicJobRefId: 'job-2',
    title: 'Church Administrator & Facility Coordinator',
    department: 'Church Administration',
    compensationType: 'Full-Time Church Staff',
    location: 'Central Sanctuary Administration Suite',
    status: 'Published',
    description: 'Oversee facilities scheduling, vendor logistics, administrative documentation, and general church office workflows.',
    requirements: [
      'Degree in business administration, commerce, or equivalent experience',
      'Proficiency in spreadsheets, inventory control, and office logistics',
      'High integrity and collaborative organizational skills',
    ],
    postedDate: '2026-11-05',
    closingDate: '2026-12-20',
    totalApplicants: 2,
    applicants: [
      {
        id: 'APP-JOB-05',
        opportunityId: 'JOB-2026-02',
        applicantName: 'Sister Rachel Mathew (Demo)',
        memberId: 'RHEMA-2026-M001',
        phoneMasked: '+91 98802-XXXX1',
        email: 'rachel.mathew.demo@rhema-demo.org',
        currentStage: 'Approved',
        appliedDate: '2026-11-07',
        yearsExperience: 5,
        skillsSummary: ['Office Admin', 'Budget Tracking', 'Event Logistics'],
        resumeDocName: 'Resume_Rachel_Mathew_Admin.pdf [Demonstration Attachment]',
        backgroundCheckSimulated: true,
        interviewDate: '2026-11-18',
        notes: 'Approved by board. Formal offer letter extended in simulation.',
      },
    ],
  },
  {
    id: 'JOB-2026-03',
    demoTag: 'Simulated Job Listing (Demo)',
    title: 'Part-Time Children Ministry Worship Song Leader',
    department: "Children's & Teens Ministry",
    compensationType: 'Part-Time Ministry Stipend',
    location: 'Children Sanctuary Hall B',
    status: 'Under Review',
    description: 'Lead praise and action worship songs for Sunday School primary classes (ages 4-10) during Sunday morning services.',
    requirements: [
      'Acoustic guitar or keyboard proficiency with vocal leadership',
      'Heart for mentoring children in joyful Christian praise',
    ],
    postedDate: '2026-11-10',
    closingDate: '2026-12-30',
    totalApplicants: 1,
    applicants: [],
  },
  {
    id: 'JOB-2026-04',
    demoTag: 'Simulated Job Listing (Demo)',
    title: 'Kingdom Marketplace Graphic & Motion Designer',
    department: 'Media & Communications',
    compensationType: 'Kingdom Business Marketplace',
    location: 'Remote / Flexible Hybrid',
    status: 'Draft',
    description: 'Design promotional flyers, event title slides, and short-form video sermon reels for church digital outreach.',
    requirements: ['After Effects, Figma, and Canva expertise', 'Active portfolio of church/ministry media'],
    postedDate: '2026-11-18',
    closingDate: '2027-01-10',
    totalApplicants: 0,
    applicants: [],
  },
  {
    id: 'JOB-2026-05',
    demoTag: 'Simulated Job Listing (Demo)',
    title: 'Weekend Facility Maintenance & Sanctuary Caretaker',
    department: 'Ushering & Hospitality',
    compensationType: 'Honorarium Basis',
    location: 'Rhema Central Sanctuary',
    status: 'Closed',
    description: 'Support sanctuary cleaning, stage chair layouts, and sanitization between Sunday service shifts.',
    requirements: ['Punctual, dependable, and physically capable of stage equipment arrangement'],
    postedDate: '2026-10-15',
    closingDate: '2026-11-15',
    totalApplicants: 3,
    applicants: [],
  },
];

export default function AdminJobCirclePage() {
  // Navigation Tabs: 'opportunities' | 'pipeline' | 'teams' | 'validator'
  const [activeTab, setActiveTab] = useState<'opportunities' | 'pipeline' | 'teams' | 'validator'>('opportunities');

  // Core State
  const [opportunities, setOpportunities] = useState<AdminJobOpportunity[]>(BASELINE_M43_OPPORTUNITIES);
  const [ministryTeams, setMinistryTeams] = useState<AdminMinistryTeamDetail[]>(BASELINE_M43_TEAMS);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string>('JOB-2026-01');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [compFilter, setCompFilter] = useState<string>('ALL');

  // Modals
  const [isCreateOppModalOpen, setIsCreateOppModalOpen] = useState(false);
  const [isEditOppModalOpen, setIsEditOppModalOpen] = useState(false);
  const [editingOppTarget, setEditingOppTarget] = useState<AdminJobOpportunity | null>(null);
  const [deletingOppId, setDeletingOppId] = useState<string | null>(null);

  // Applicant Review Modal
  const [reviewingApplicant, setReviewingApplicant] = useState<AdminJobApplicant | null>(null);

  // Volunteer Assignment Modal & 5-Gate Engine State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignTargetTeamId, setAssignTargetTeamId] = useState<string>('TEAM-01');
  const [assignForm, setAssignForm] = useState({
    volunteerId: 'VOL-2026-03',
    subteam: 'Sanctuary Seating & Protocol',
    roleName: 'Aisle Protocol Usher',
    serviceSlot: '08:30 AM (1st Service)',
    startTime: '08:00 AM',
    endTime: '10:30 AM',
  });
  const [validationResult, setValidationResult] = useState<{ valid: boolean; error?: string } | null>(null);

  // Form State for Create & Edit Job Opportunity
  const [oppFormData, setOppFormData] = useState({
    title: '',
    department: 'Media & Communications',
    compensationType: 'Full-Time Church Staff' as JobCompensationType,
    location: 'Rhema Central Sanctuary, Bangalore',
    status: 'Published' as AdminJobOpportunityStatus,
    description: '',
    requirementsStr: '',
    closingDate: '2026-12-31',
  });
  const [oppFormErrors, setOppFormErrors] = useState<Record<string, string>>({});

  // Real-time Firestore sync with baseline seed fallback
  useEffect(() => {
    const oppCol = collection(db, 'Rhema Church', 'rhema', 'job_circle_opportunities');
    const unsubOpp = onSnapshot(
      oppCol,
      async (snapshot) => {
        if (snapshot.empty) {
          try {
            const batch = writeBatch(db);
            BASELINE_M43_OPPORTUNITIES.forEach((opp) => {
              batch.set(doc(oppCol, opp.id), {
                ...opp,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            });
            await batch.commit();
          } catch (seedErr) {
            console.error('[AdminJobCirclePage] Seeding opps error:', seedErr);
            setOpportunities(BASELINE_M43_OPPORTUNITIES);
          }
        } else {
          const loaded: AdminJobOpportunity[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              demoTag: 'Simulated Job Listing (Demo)',
              title: data.title || 'Opportunity',
              department: data.department || 'Ministry',
              compensationType: data.compensationType || 'Ministry Stipend / Honorarium',
              location: data.location || 'Church Campus',
              status: data.status || 'Published',
              description: data.description || '',
              requirements: Array.isArray(data.requirements) ? data.requirements : [],
              postedDate: data.postedDate || '2026-11-24',
              closingDate: data.closingDate || '2026-12-31',
              totalApplicants: data.totalApplicants || (Array.isArray(data.applicants) ? data.applicants.length : 0),
              applicants: Array.isArray(data.applicants) ? data.applicants : [],
            };
          });
          setOpportunities(loaded);
        }
      },
      (err) => {
        console.error('[AdminJobCirclePage] Opps error:', err);
        setOpportunities(BASELINE_M43_OPPORTUNITIES);
      }
    );

    const teamCol = collection(db, 'Rhema Church', 'rhema', 'job_circle_teams');
    const unsubTeam = onSnapshot(
      teamCol,
      async (snapshot) => {
        if (snapshot.empty) {
          try {
            const batch = writeBatch(db);
            BASELINE_M43_TEAMS.forEach((t) => {
              batch.set(doc(teamCol, t.teamId), {
                ...t,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            });
            await batch.commit();
          } catch (seedErr) {
            console.error('[AdminJobCirclePage] Seeding teams error:', seedErr);
            setMinistryTeams(BASELINE_M43_TEAMS);
          }
        } else {
          const loaded: AdminMinistryTeamDetail[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              teamId: d.id,
              teamName: data.teamName || 'Ministry Team',
              departmentKey: data.departmentKey || 'Ushering & Hospitality',
              subteams: Array.isArray(data.subteams) ? data.subteams : [],
              teamLead: data.teamLead || 'Team Lead',
              leadPhoneMasked: data.leadPhoneMasked || '+91 98450-XXXXX',
              targetQuota: data.targetQuota || 20,
              meetingSchedule: data.meetingSchedule || 'Weekly',
              meetingLocation: data.meetingLocation || 'Church Sanctuary',
              assignedVolunteers: Array.isArray(data.assignedVolunteers) ? data.assignedVolunteers : [],
            };
          });
          setMinistryTeams(loaded);
        }
      },
      (err) => {
        console.error('[AdminJobCirclePage] Teams error:', err);
        setMinistryTeams(BASELINE_M43_TEAMS);
      }
    );

    return () => {
      unsubOpp();
      unsubTeam();
    };
  }, []);

  const persistState = async (newOpps: AdminJobOpportunity[], newTeams: AdminMinistryTeamDetail[]) => {
    setOpportunities(newOpps);
    setMinistryTeams(newTeams);
    try {
      const batch = writeBatch(db);
      const oppCol = collection(db, 'Rhema Church', 'rhema', 'job_circle_opportunities');
      newOpps.forEach((opp) => {
        batch.set(
          doc(oppCol, opp.id),
          {
            ...opp,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      });

      const teamCol = collection(db, 'Rhema Church', 'rhema', 'job_circle_teams');
      newTeams.forEach((t) => {
        batch.set(
          doc(teamCol, t.teamId),
          {
            ...t,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      });
      await batch.commit();
    } catch (err) {
      console.error('[AdminJobCirclePage] Firestore persist error:', err);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleResetDemoData = async () => {
    try {
      const batch = writeBatch(db);
      const oppCol = collection(db, 'Rhema Church', 'rhema', 'job_circle_opportunities');
      BASELINE_M43_OPPORTUNITIES.forEach((opp) => {
        batch.set(doc(oppCol, opp.id), {
          ...opp,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      const teamCol = collection(db, 'Rhema Church', 'rhema', 'job_circle_teams');
      BASELINE_M43_TEAMS.forEach((t) => {
        batch.set(doc(teamCol, t.teamId), {
          ...t,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
    } catch (err) {
      console.error('[AdminJobCirclePage] Reset error:', err);
    }
    setOpportunities(BASELINE_M43_OPPORTUNITIES);
    setMinistryTeams(BASELINE_M43_TEAMS);
    setSelectedOpportunityId('JOB-2026-01');
    showToast('Reset to baseline Job Circle opportunities and canonical Ministry Teams');
  };

  // =========================================================================
  // DYNAMIC KPI CALCULATIONS (EXACT 160 VOLUNTEER QUOTA TARGET)
  // =========================================================================

  const kpis = useMemo(() => {
    const publishedOpps = opportunities.filter((o) => o.status === 'Published').length;
    const totalOpps = opportunities.length;

    // All applicants across all opportunities
    const allApplicants = opportunities.flatMap((o) => o.applicants || []);
    const totalApplicantsCount = allApplicants.length;

    // Exact 160 Canonical Quota Target
    const TOTAL_CANONICAL_TARGET_QUOTA = 160;
    const totalActiveAssignedVolunteers = ministryTeams.reduce(
      (acc, team) =>
        acc + team.assignedVolunteers.filter((v) => v.assignmentStatus === 'Active').length,
      0
    );

    const overallQuotaFillRatePct = Number(
      ((totalActiveAssignedVolunteers / TOTAL_CANONICAL_TARGET_QUOTA) * 100).toFixed(1)
    );

    return {
      publishedOpps,
      totalOpps,
      totalApplicantsCount,
      totalActiveAssignedVolunteers,
      targetQuotaBaseline: TOTAL_CANONICAL_TARGET_QUOTA,
      overallQuotaFillRatePct,
    };
  }, [opportunities, ministryTeams]);

  // Filtered Opportunities
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((o) => {
      const matchesSearch =
        !searchQuery ||
        o.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
      const matchesComp = compFilter === 'ALL' || o.compensationType === compFilter;
      return matchesSearch && matchesStatus && matchesComp;
    });
  }, [opportunities, searchQuery, statusFilter, compFilter]);

  // All Applicants Flattened for the Pipeline View
  const allPipelineApplicants = useMemo(() => {
    return opportunities.flatMap((o) =>
      (o.applicants || []).map((app) => ({
        ...app,
        opportunityTitle: o.title,
        opportunityDepartment: o.department,
      }))
    );
  }, [opportunities]);

  // Selected Opportunity
  const activeOpportunity = useMemo(() => {
    return (
      opportunities.find((o) => o.id === selectedOpportunityId) ||
      opportunities[0] ||
      BASELINE_M43_OPPORTUNITIES[0]
    );
  }, [opportunities, selectedOpportunityId]);

  // =========================================================================
  // THE FIVE VOLUNTEER VALIDATION GATES (STRICT ENFORCEMENT - NO OVERRIDES)
  // =========================================================================

  const executeFiveValidationGates = (
    vol: AdminVolunteerApplication,
    targetTeam: AdminMinistryTeamDetail,
    subteam: string,
    roleName: string,
    serviceSlot: string,
    startTime: string,
    endTime: string
  ): { valid: boolean; error?: string } => {
    // GATE 1: Canonical Department Compatibility
    if (vol.department !== targetTeam.departmentKey) {
      return {
        valid: false,
        error: `Gate 1 Violation: Incompatible Department. Volunteer belongs to "${vol.department}", which cannot be assigned to "${targetTeam.departmentKey}".`,
      };
    }

    // GATE 2: Availability and Service-Slot Compatibility
    const volAvail = vol.availability;
    const isSlotCompatible =
      volAvail === 'Special Events' ||
      (volAvail === 'Sunday 1st Service' && serviceSlot.includes('1st Service')) ||
      (volAvail === 'Sunday 2nd Service' && serviceSlot.includes('2nd Service')) ||
      (volAvail === 'Sunday Youth' && serviceSlot.includes('Youth')) ||
      (volAvail === 'Mid-Week' && serviceSlot.includes('Mid-Week'));

    if (!isSlotCompatible) {
      return {
        valid: false,
        error: `Gate 2 Violation: Availability Incompatible. Volunteer's declared M39 availability is "${volAvail}", which does not cover slot "${serviceSlot}".`,
      };
    }

    // GATE 3: Duplicate Assignment Prevention
    const alreadyInTeam = targetTeam.assignedVolunteers.some(
      (a) => a.volunteerId === vol.id && a.assignmentStatus === 'Active' && a.roleName === roleName
    );
    if (alreadyInTeam) {
      return {
        valid: false,
        error: `Gate 3 Violation: Duplicate Assignment. Volunteer "${vol.volunteerName}" is already actively serving as "${roleName}" in this team.`,
      };
    }

    // GATE 4: Existing Assignment & Schedule Conflict Detection (Time-Interval Overlap)
    const newStartMin = parseTimeToMinutes(startTime);
    const newEndMin = parseTimeToMinutes(endTime);

    for (const team of ministryTeams) {
      for (const a of team.assignedVolunteers) {
        if (a.volunteerId === vol.id && a.assignmentStatus === 'Active' && a.serviceSlot === serviceSlot) {
          const aStartMin = parseTimeToMinutes(a.startTime);
          const aEndMin = parseTimeToMinutes(a.endTime);
          // Overlap: newStart < aEnd && newEnd > aStart
          if (newStartMin < aEndMin && newEndMin > aStartMin) {
            return {
              valid: false,
              error: `Gate 4 Violation: Schedule Collision. Volunteer is already scheduled in "${team.teamName}" (${a.roleName}) from ${a.startTime} to ${a.endTime} on ${a.serviceSlot}.`,
            };
          }
        }
      }
    }

    // GATE 5: Team Capacity and Quota Enforcement
    const activeCount = targetTeam.assignedVolunteers.filter((a) => a.assignmentStatus === 'Active').length;
    if (activeCount >= targetTeam.targetQuota) {
      return {
        valid: false,
        error: `Gate 5 Violation: Team Capacity Reached. "${targetTeam.teamName}" has reached its maximum canonical quota of ${targetTeam.targetQuota} volunteers.`,
      };
    }

    return { valid: true };
  };

  // Re-run validation whenever assignment form changes
  useEffect(() => {
    if (!isAssignModalOpen) {
      setValidationResult(null);
      return;
    }
    const vol = INITIAL_ADMIN_VOLUNTEERS.find((v) => v.id === assignForm.volunteerId);
    const team = ministryTeams.find((t) => t.teamId === assignTargetTeamId);
    if (!vol || !team) {
      setValidationResult(null);
      return;
    }
    const res = executeFiveValidationGates(
      vol,
      team,
      assignForm.subteam,
      assignForm.roleName,
      assignForm.serviceSlot,
      assignForm.startTime,
      assignForm.endTime
    );
    setValidationResult(res);
  }, [assignForm, assignTargetTeamId, isAssignModalOpen, ministryTeams]);

  // =========================================================================
  // ACTIONS: OPPORTUNITY CRUD
  // =========================================================================

  const openCreateOppModal = () => {
    setOppFormData({
      title: '',
      department: 'Media & Communications',
      compensationType: 'Full-Time Church Staff',
      location: 'Rhema Central Sanctuary, Bangalore',
      status: 'Published',
      description: '',
      requirementsStr: 'Minimum 2 years proven ministry experience\nCommitted member with heart for discipleship',
      closingDate: '2026-12-31',
    });
    setOppFormErrors({});
    setIsCreateOppModalOpen(true);
  };

  const openEditOppModal = (opp: AdminJobOpportunity) => {
    setEditingOppTarget(opp);
    setOppFormData({
      title: opp.title,
      department: opp.department,
      compensationType: opp.compensationType,
      location: opp.location,
      status: opp.status,
      description: opp.description,
      requirementsStr: opp.requirements.join('\n'),
      closingDate: opp.closingDate,
    });
    setOppFormErrors({});
    setIsEditOppModalOpen(true);
  };

  const validateOppForm = () => {
    const errors: Record<string, string> = {};
    if (!oppFormData.title.trim()) errors.title = 'Title is required';
    if (!oppFormData.description.trim()) errors.description = 'Description is required';
    if (!oppFormData.closingDate.trim()) errors.closingDate = 'Closing date is required';
    setOppFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveCreateOpp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateOppForm()) return;

    const newId = `JOB-2026-${Date.now().toString().slice(-4)}`;
    const newOpp: AdminJobOpportunity = {
      id: newId,
      demoTag: 'Simulated Job Listing (Demo)',
      title: oppFormData.title.trim(),
      department: oppFormData.department,
      compensationType: oppFormData.compensationType,
      location: oppFormData.location.trim(),
      status: oppFormData.status,
      description: oppFormData.description.trim(),
      requirements: oppFormData.requirementsStr.split('\n').filter((r) => r.trim().length > 0),
      postedDate: new Date().toISOString().split('T')[0],
      closingDate: oppFormData.closingDate,
      totalApplicants: 0,
      applicants: [],
    };

    const nextOpps = [newOpp, ...opportunities];
    persistState(nextOpps, ministryTeams);
    setSelectedOpportunityId(newId);
    setIsCreateOppModalOpen(false);
    showToast(`Created new job opportunity: "${newOpp.title}" (Simulated)`);
  };

  const handleSaveEditOpp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateOppForm() || !editingOppTarget) return;

    const nextOpps = opportunities.map((opp) => {
      if (opp.id === editingOppTarget.id) {
        return {
          ...opp,
          title: oppFormData.title.trim(),
          department: oppFormData.department,
          compensationType: oppFormData.compensationType,
          location: oppFormData.location.trim(),
          status: oppFormData.status,
          description: oppFormData.description.trim(),
          requirements: oppFormData.requirementsStr.split('\n').filter((r) => r.trim().length > 0),
          closingDate: oppFormData.closingDate,
        };
      }
      return opp;
    });

    persistState(nextOpps, ministryTeams);
    setIsEditOppModalOpen(false);
    setEditingOppTarget(null);
    showToast(`Updated opportunity "${oppFormData.title}" (Simulated)`);
  };

  const handleConfirmDeleteOpp = async () => {
    if (!deletingOppId) return;
    try {
      await deleteDoc(doc(db, 'Rhema Church', 'rhema', 'job_circle_opportunities', deletingOppId));
    } catch (err) {
      console.error('[AdminJobCirclePage] Delete opp error:', err);
    }
    const nextOpps = opportunities.filter((o) => o.id !== deletingOppId);
    if (nextOpps.length === 0) {
      showToast('Maintaining at least one job opportunity in database.');
      setDeletingOppId(null);
      return;
    }
    setOpportunities(nextOpps);
    setSelectedOpportunityId(nextOpps[0].id);
    setDeletingOppId(null);
    showToast('Deleted job opportunity listing');
  };

  // =========================================================================
  // ACTIONS: APPLICANT STAGE ADVANCEMENT (5-STAGE PIPELINE)
  // =========================================================================

  const handleAdvanceApplicantStage = (
    oppId: string,
    appId: string,
    newStage: AdminJobApplicantStatus
  ) => {
    const nextOpps = opportunities.map((opp) => {
      if (opp.id === oppId) {
        const nextApps = (opp.applicants || []).map((app) =>
          app.id === appId ? { ...app, currentStage: newStage } : app
        );
        return { ...opp, applicants: nextApps };
      }
      return opp;
    });

    persistState(nextOpps, ministryTeams);
    if (reviewingApplicant && reviewingApplicant.id === appId) {
      setReviewingApplicant({ ...reviewingApplicant, currentStage: newStage });
    }
    showToast(`Applicant transitioned to "${newStage}" (Simulated)`);
  };

  // =========================================================================
  // ACTIONS: VOLUNTEER ASSIGNMENT & REMOVAL (5-GATE ENFORCED)
  // =========================================================================

  const handleConfirmVolunteerAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validationResult || !validationResult.valid) {
      showToast('Assignment blocked by volunteer validation gates.');
      return;
    }

    const vol = INITIAL_ADMIN_VOLUNTEERS.find((v) => v.id === assignForm.volunteerId);
    if (!vol) return;

    const newAssignment: M43AssignedVolunteer = {
      volunteerId: vol.id,
      volunteerName: vol.volunteerName,
      subteam: assignForm.subteam,
      roleName: assignForm.roleName,
      assignedDate: new Date().toISOString().split('T')[0],
      serviceSlot: assignForm.serviceSlot,
      startTime: assignForm.startTime,
      endTime: assignForm.endTime,
      assignmentStatus: 'Active',
    };

    const nextTeams = ministryTeams.map((team) => {
      if (team.teamId === assignTargetTeamId) {
        return {
          ...team,
          assignedVolunteers: [newAssignment, ...team.assignedVolunteers],
        };
      }
      return team;
    });

    persistState(opportunities, nextTeams);
    setIsAssignModalOpen(false);
    showToast(`Assigned ${vol.volunteerName} to ${newAssignment.subteam} (Simulated)`);
  };

  const handleRemoveVolunteerFromTeam = (teamId: string, volunteerId: string) => {
    const nextTeams = ministryTeams.map((team) => {
      if (team.teamId === teamId) {
        const updated = team.assignedVolunteers.filter((v) => v.volunteerId !== volunteerId);
        return { ...team, assignedVolunteers: updated };
      }
      return team;
    });

    persistState(opportunities, nextTeams);
    showToast('Removed volunteer from team roster (Simulated)');
  };

  return (
    <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
      <AdminNavigationShell>
        <div className="min-h-screen bg-[#070E17] text-slate-100 p-4 md:p-8 space-y-6">
          {/* Top Banner */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-amber-950/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
                <Briefcase size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-white tracking-wide">
                    M43 · Admin Job Circle &amp; Ministry Teams
                  </h1>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 uppercase">
                    Layer A Simulation
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Manage church vocational job opportunities, screen candidate application pipelines, and organize canonical ministry teams across all 6 M39 departments.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={openCreateOppModal}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1E6F43] hover:bg-[#185835] text-white text-xs font-semibold shadow-md shadow-emerald-950/40 transition-colors"
                title="Create a new vocational job opportunity"
              >
                <Plus size={14} />
                <span>+ Create Opportunity</span>
              </button>
              <button
                type="button"
                onClick={handleResetDemoData}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-colors"
                title="Reset to baseline demonstration data"
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

          {/* Dynamic KPI Strip (Based on Exact 160 Quota Target) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="bg-[#0B192C] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Job Opportunities</span>
                <Briefcase size={16} className="text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white">
                {kpis.publishedOpps} <span className="text-sm font-normal text-slate-400">/ {kpis.totalOpps} Total</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Active published listings open for applications
              </p>
            </div>

            <div className="bg-[#0B192C] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Candidate Pipeline</span>
                <Users size={16} className="text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-blue-300">
                {kpis.totalApplicantsCount} Applicants
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Across 5 screening &amp; review stages
              </p>
            </div>

            <div className="bg-[#0B192C] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Canonical Teams</span>
                <Building size={16} className="text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-purple-300">
                6 Teams Active
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                100% M39 Department Coverage (12 Subteams)
              </p>
            </div>

            <div className="bg-[#0B192C] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Volunteer Fill Rate</span>
                <Award size={16} className="text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-amber-300">
                {kpis.overallQuotaFillRatePct}%
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {kpis.totalActiveAssignedVolunteers} / {kpis.targetQuotaBaseline} Target Quota (Exact 160)
              </p>
            </div>
          </div>

          {/* Sub-Tabs Navigation */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('opportunities')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                activeTab === 'opportunities'
                  ? 'bg-[#1E6F43] text-white shadow-md shadow-emerald-950/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Briefcase size={15} />
              <span>Job Opportunities ({opportunities.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pipeline')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                activeTab === 'pipeline'
                  ? 'bg-[#1E6F43] text-white shadow-md shadow-emerald-950/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Users size={15} />
              <span>Applicant Review Pipeline ({allPipelineApplicants.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('teams')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                activeTab === 'teams'
                  ? 'bg-[#1E6F43] text-white shadow-md shadow-emerald-950/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Building size={15} />
              <span>Ministry Teams &amp; Quotas (6 Departments)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('validator')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                activeTab === 'validator'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-950/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Shield size={15} />
              <span>Volunteer 5-Gate Validator</span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: JOB OPPORTUNITIES SUITE                                            */}
          {/* ========================================================================= */}
          {activeTab === 'opportunities' && (
            <div className="space-y-4">
              {/* Filter Toolbar */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#0B192C] border border-slate-800/80 rounded-2xl p-3 shadow-sm">
                <div className="flex items-center gap-2 flex-1">
                  <Search size={15} className="text-slate-400 ml-1" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by role title, department, description..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-slate-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ALL">All Opportunity Statuses</option>
                    <option value="Draft">Draft</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Published">Published</option>
                    <option value="Closed">Closed</option>
                    <option value="Archived">Archived</option>
                  </select>

                  <select
                    value={compFilter}
                    onChange={(e) => setCompFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ALL">All Compensation Types</option>
                    <option value="Full-Time Church Staff">Full-Time Church Staff</option>
                    <option value="Part-Time Ministry Stipend">Part-Time Ministry Stipend</option>
                    <option value="Kingdom Business Marketplace">Kingdom Business Marketplace</option>
                    <option value="Honorarium Basis">Honorarium Basis</option>
                  </select>
                </div>
              </div>

              {/* Opportunities Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredOpportunities.map((opp) => (
                  <div
                    key={opp.id}
                    onClick={() => setSelectedOpportunityId(opp.id)}
                    className={`cursor-pointer rounded-2xl p-5 border transition-all ${
                      opp.id === activeOpportunity?.id
                        ? 'bg-[#0B192C] border-emerald-500/80 shadow-lg shadow-emerald-950/20'
                        : 'bg-[#0B192C]/70 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                              opp.status === 'Published'
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                                : opp.status === 'Under Review'
                                ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                                : opp.status === 'Closed'
                                ? 'bg-red-950/60 text-red-300 border-red-500/40'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {opp.status}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            {opp.department}
                          </span>
                        </div>
                        <h3 className="font-bold text-white text-base mt-1.5">{opp.title}</h3>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                          <span className="flex items-center gap-1 text-slate-300">
                            <Building size={13} className="text-amber-400" />
                            {opp.compensationType}
                          </span>
                          <span className="flex items-center gap-1 text-slate-400">
                            <MapPin size={13} className="text-blue-400" />
                            {opp.location}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-start">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditOppModal(opp);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                          title="Edit opportunity"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingOppId(opp.id);
                          }}
                          className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/20"
                          title="Delete opportunity"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 line-clamp-2 mt-3">
                      {opp.description}
                    </p>

                    {/* Requirements Tags */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {opp.requirements.slice(0, 2).map((req, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-400 truncate max-w-xs"
                        >
                          • {req}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                      <span>Closing: <strong className="text-white">{opp.closingDate}</strong></span>
                      <span className="font-semibold text-emerald-400">
                        {opp.applicants?.length || 0} Candidates in Pipeline
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: APPLICANT REVIEW PIPELINE (5-STAGE TRACKING)                       */}
          {/* ========================================================================= */}
          {activeTab === 'pipeline' && (
            <div className="space-y-4">
              <div className="bg-[#0B192C] border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Candidate Screening Pipeline (5 Stages)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Track applicants across Submitted, Under Review, Shortlisted, Approved, and Rejected stages.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-xl bg-slate-900 text-xs font-bold text-emerald-400 border border-slate-800">
                  {allPipelineApplicants.length} Total Candidates
                </span>
              </div>

              {/* 5-Column Kanban Board */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
                {(['Submitted', 'Under Review', 'Shortlisted', 'Approved', 'Rejected'] as AdminJobApplicantStatus[]).map(
                  (stage) => {
                    const stageApplicants = allPipelineApplicants.filter(
                      (a) => a.currentStage === stage
                    );

                    return (
                      <div
                        key={stage}
                        className="bg-[#0B192C]/80 border border-slate-800/90 rounded-2xl p-3.5 space-y-3 flex flex-col justify-between min-h-[420px]"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <span className="text-xs font-bold text-white tracking-wide">
                              {stage}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
                              {stageApplicants.length}
                            </span>
                          </div>

                          <div className="space-y-2.5">
                            {stageApplicants.map((app) => (
                              <div
                                key={app.id}
                                onClick={() => setReviewingApplicant(app)}
                                className="cursor-pointer bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-3 space-y-2 transition-all shadow-sm"
                              >
                                <div>
                                  <h4 className="text-xs font-bold text-white">{app.applicantName}</h4>
                                  <span className="text-[10px] text-slate-400 block line-clamp-1">
                                    {app.opportunityTitle}
                                  </span>
                                </div>

                                <div className="text-[10px] text-slate-400 space-y-0.5">
                                  <div>Exp: <strong className="text-slate-200">{app.yearsExperience} Years</strong></div>
                                  <div>Phone: <strong className="text-slate-200">{app.phoneMasked}</strong></div>
                                </div>

                                <div className="flex flex-wrap gap-1">
                                  {app.skillsSummary.slice(0, 2).map((s, idx) => (
                                    <span
                                      key={idx}
                                      className="px-1.5 py-0.2 rounded bg-slate-800 text-[9px] text-emerald-300 font-medium"
                                    >
                                      {s}
                                    </span>
                                  ))}
                                </div>

                                {/* Stage Quick Advance Action */}
                                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px]">
                                  <span className="text-slate-500">{app.appliedDate}</span>
                                  <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                                    Review <ChevronRight size={11} />
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-2 text-center text-[10px] text-slate-500 border-t border-slate-800/60">
                          {stageApplicants.length} Candidates
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: MINISTRY TEAMS & QUOTAS (6 CANONICAL M39 DEPARTMENTS)              */}
          {/* ========================================================================= */}
          {activeTab === 'teams' && (
            <div className="space-y-4">
              <div className="bg-[#0B192C] border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Canonical Ministry Teams (6 M39 Departments · 160 Total Target Quota)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Each team maps to one canonical M39 department and manages specialized operational subteams.
                  </p>
                </div>
                <div className="text-right text-xs">
                  <span className="text-slate-400">Total Church Roster Quota: </span>
                  <strong className="text-amber-300">{kpis.totalActiveAssignedVolunteers} / 160 ({kpis.overallQuotaFillRatePct}%)</strong>
                </div>
              </div>

              {/* 6 Departmental Team Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ministryTeams.map((team) => {
                  const activeVolunteersCount = team.assignedVolunteers.filter(
                    (v) => v.assignmentStatus === 'Active'
                  ).length;
                  const fillPct = Math.min(
                    100,
                    Math.round((activeVolunteersCount / team.targetQuota) * 100)
                  );

                  return (
                    <div
                      key={team.teamId}
                      className="bg-[#0B192C] border border-slate-800/90 rounded-2xl p-5 space-y-4 flex flex-col justify-between shadow-sm"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950/60 text-purple-300 border border-purple-500/30">
                              {team.departmentKey}
                            </span>
                            <h3 className="font-bold text-white text-base mt-1.5">{team.teamName}</h3>
                          </div>
                          <span className="text-xs font-bold text-emerald-400">
                            {activeVolunteersCount} / {team.targetQuota}
                          </span>
                        </div>

                        {/* Quota Progress Bar */}
                        <div className="space-y-1">
                          <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                fillPct >= 90
                                  ? 'bg-emerald-500'
                                  : fillPct >= 70
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${fillPct}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>Quota Progress</span>
                            <span>{fillPct}%</span>
                          </div>
                        </div>

                        {/* Team Leadership & Schedule */}
                        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs space-y-1 text-slate-300">
                          <div>Lead: <strong className="text-white">{team.teamLead}</strong></div>
                          <div>Phone: <span className="text-slate-400">{team.leadPhoneMasked}</span></div>
                          <div>Briefing: <span className="text-amber-300">{team.meetingSchedule}</span></div>
                        </div>

                        {/* Subteams Pills */}
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            Operational Subteams
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {team.subteams.map((sub, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-medium"
                              >
                                {sub}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Assigned Volunteers Roster Preview */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Assigned Roster ({team.assignedVolunteers.length})
                          </span>
                          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                            {team.assignedVolunteers.map((vol, vIdx) => (
                              <div
                                key={vIdx}
                                className="bg-slate-900/60 border border-slate-800 p-2 rounded-lg flex items-center justify-between text-xs"
                              >
                                <div>
                                  <strong className="text-white block text-[11px]">{vol.volunteerName}</strong>
                                  <span className="text-[10px] text-slate-400">{vol.roleName} · {vol.serviceSlot}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveVolunteerFromTeam(team.teamId, vol.volunteerId)}
                                  className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-950/40"
                                  title="Remove from team"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => {
                            setAssignTargetTeamId(team.teamId);
                            setAssignForm({
                              volunteerId: 'VOL-2026-03',
                              subteam: team.subteams[0] || 'Sanctuary Logistics',
                              roleName: 'Department Steward',
                              serviceSlot: '08:30 AM (1st Service)',
                              startTime: '08:00 AM',
                              endTime: '10:30 AM',
                            });
                            setIsAssignModalOpen(true);
                          }}
                          className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 hover:text-white border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Plus size={14} className="text-emerald-400" />
                          <span>+ Assign Volunteer to Team</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: VOLUNTEER 5-GATE VALIDATOR & AUDIT VIEW                            */}
          {/* ========================================================================= */}
          {activeTab === 'validator' && (
            <div className="space-y-6">
              <div className="bg-[#0B192C] border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-white text-base">
                      Five-Gate Volunteer Validation Engine
                    </h3>
                    <p className="text-xs text-slate-400">
                      Evaluates assignment requests against M39 canonical department parity, availability slots, duplicate prevention, time collisions, and team capacity.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-950/60 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                    Active Enforcement
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Gate 1</span>
                    <strong className="text-white block">Department Match</strong>
                    <p className="text-[11px] text-slate-400">
                      Volunteer M39 department must strictly match team canonical department.
                    </p>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Gate 2</span>
                    <strong className="text-white block">Slot Compatibility</strong>
                    <p className="text-[11px] text-slate-400">
                      Volunteer availability must cover target service shift (1st, 2nd, Youth, Mid-Week).
                    </p>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Gate 3</span>
                    <strong className="text-white block">Duplicate Prevention</strong>
                    <p className="text-[11px] text-slate-400">
                      Blocks assigning the same volunteer more than once to the same active role.
                    </p>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Gate 4</span>
                    <strong className="text-white block">Time Collision Check</strong>
                    <p className="text-[11px] text-slate-400">
                      Verifies no overlapping duty intervals exist across any active team roster.
                    </p>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Gate 5</span>
                    <strong className="text-white block">Quota Enforcement</strong>
                    <p className="text-[11px] text-slate-400">
                      Blocks assignment if team has reached maximum canonical target quota.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODALS & ACTION DIALOGS                                                   */}
          {/* ========================================================================= */}

          {/* 1. Create Job Opportunity Modal */}
          {isCreateOppModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#0B192C] border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Briefcase size={18} className="text-emerald-400" />
                    <h3 className="font-bold text-white text-sm">Create Job Opportunity Listing</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreateOppModalOpen(false)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSaveCreateOpp} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Role Title *</label>
                    <input
                      type="text"
                      required
                      value={oppFormData.title}
                      onChange={(e) => setOppFormData({ ...oppFormData, title: e.target.value })}
                      placeholder="e.g. Associate Media & Live Broadcast Director"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                    />
                    {oppFormErrors.title && <p className="text-red-400 text-[10px] mt-1">{oppFormErrors.title}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Department</label>
                      <select
                        value={oppFormData.department}
                        onChange={(e) => setOppFormData({ ...oppFormData, department: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Media & Communications">Media &amp; Communications</option>
                        <option value="Church Administration">Church Administration</option>
                        <option value="Children's & Teens Ministry">Children&rsquo;s &amp; Teens Ministry</option>
                        <option value="Worship & Creative Arts">Worship &amp; Creative Arts</option>
                        <option value="Ushering & Hospitality">Ushering &amp; Hospitality</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Compensation Type</label>
                      <select
                        value={oppFormData.compensationType}
                        onChange={(e) => setOppFormData({ ...oppFormData, compensationType: e.target.value as JobCompensationType })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Full-Time Church Staff">Full-Time Church Staff</option>
                        <option value="Part-Time Ministry Stipend">Part-Time Ministry Stipend</option>
                        <option value="Kingdom Business Marketplace">Kingdom Business Marketplace</option>
                        <option value="Honorarium Basis">Honorarium Basis</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Opportunity Status</label>
                      <select
                        value={oppFormData.status}
                        onChange={(e) => setOppFormData({ ...oppFormData, status: e.target.value as AdminJobOpportunityStatus })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Draft">Draft</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Published">Published</option>
                        <option value="Closed">Closed</option>
                        <option value="Archived">Archived</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Closing Date *</label>
                      <input
                        type="date"
                        required
                        value={oppFormData.closingDate}
                        onChange={(e) => setOppFormData({ ...oppFormData, closingDate: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Location</label>
                    <input
                      type="text"
                      value={oppFormData.location}
                      onChange={(e) => setOppFormData({ ...oppFormData, location: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Job Description *</label>
                    <textarea
                      rows={3}
                      required
                      value={oppFormData.description}
                      onChange={(e) => setOppFormData({ ...oppFormData, description: e.target.value })}
                      placeholder="Outline core responsibilities and ministry expectations..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Requirements (one per line)</label>
                    <textarea
                      rows={2}
                      value={oppFormData.requirementsStr}
                      onChange={(e) => setOppFormData({ ...oppFormData, requirementsStr: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCreateOppModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#1E6F43] hover:bg-[#185835] text-white text-xs font-semibold shadow-md shadow-emerald-950/40"
                    >
                      Publish Opportunity (Simulated)
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 2. Edit Job Opportunity Modal */}
          {isEditOppModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#0B192C] border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Edit3 size={18} className="text-amber-400" />
                    <h3 className="font-bold text-white text-sm">Edit Opportunity ({editingOppTarget?.id})</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditOppModalOpen(false)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSaveEditOpp} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Role Title *</label>
                    <input
                      type="text"
                      required
                      value={oppFormData.title}
                      onChange={(e) => setOppFormData({ ...oppFormData, title: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Department</label>
                      <select
                        value={oppFormData.department}
                        onChange={(e) => setOppFormData({ ...oppFormData, department: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Media & Communications">Media &amp; Communications</option>
                        <option value="Church Administration">Church Administration</option>
                        <option value="Children's & Teens Ministry">Children&rsquo;s &amp; Teens Ministry</option>
                        <option value="Worship & Creative Arts">Worship &amp; Creative Arts</option>
                        <option value="Ushering & Hospitality">Ushering &amp; Hospitality</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Compensation Type</label>
                      <select
                        value={oppFormData.compensationType}
                        onChange={(e) => setOppFormData({ ...oppFormData, compensationType: e.target.value as JobCompensationType })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Full-Time Church Staff">Full-Time Church Staff</option>
                        <option value="Part-Time Ministry Stipend">Part-Time Ministry Stipend</option>
                        <option value="Kingdom Business Marketplace">Kingdom Business Marketplace</option>
                        <option value="Honorarium Basis">Honorarium Basis</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Opportunity Status</label>
                      <select
                        value={oppFormData.status}
                        onChange={(e) => setOppFormData({ ...oppFormData, status: e.target.value as AdminJobOpportunityStatus })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Draft">Draft</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Published">Published</option>
                        <option value="Closed">Closed</option>
                        <option value="Archived">Archived</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Closing Date</label>
                      <input
                        type="date"
                        value={oppFormData.closingDate}
                        onChange={(e) => setOppFormData({ ...oppFormData, closingDate: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Job Description</label>
                    <textarea
                      rows={3}
                      value={oppFormData.description}
                      onChange={(e) => setOppFormData({ ...oppFormData, description: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditOppModalOpen(false)}
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

          {/* 3. Review Applicant Dossier Modal (5-Stage Pipeline) */}
          {reviewingApplicant && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#0B192C] border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <User size={18} className="text-blue-400" />
                    <div>
                      <h3 className="font-bold text-white text-sm">{reviewingApplicant.applicantName}</h3>
                      <span className="text-[10px] text-slate-400">ID: {reviewingApplicant.id} · Applied: {reviewingApplicant.appliedDate}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReviewingApplicant(null)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  {/* Stage Status Badge & Advance Actions */}
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Current Pipeline Stage</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                        {reviewingApplicant.currentStage}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {(['Submitted', 'Under Review', 'Shortlisted', 'Approved', 'Rejected'] as AdminJobApplicantStatus[]).map(
                        (stage) => (
                          <button
                            key={stage}
                            type="button"
                            onClick={() =>
                              handleAdvanceApplicantStage(
                                reviewingApplicant.opportunityId,
                                reviewingApplicant.id,
                                stage
                              )
                            }
                            className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                              reviewingApplicant.currentStage === stage
                                ? 'bg-emerald-600 text-white border-emerald-500'
                                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                            }`}
                          >
                            &rarr; {stage}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Synthetic Profile & Privacy Safe Information */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">Masked Mobile Contact</span>
                      <strong className="text-white text-xs">{reviewingApplicant.phoneMasked}</strong>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">Experience</span>
                      <strong className="text-emerald-400 text-xs">{reviewingApplicant.yearsExperience} Years Professional</strong>
                    </div>
                  </div>

                  {/* Demonstration Resume Attachment Label */}
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-amber-400" />
                      <div>
                        <span className="text-white text-xs block font-semibold">{reviewingApplicant.resumeDocName}</span>
                        <span className="text-[10px] text-slate-400">Demonstration Attachment (No real file download)</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-mono">
                      PDF (Sim)
                    </span>
                  </div>

                  {/* Skills Summary */}
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      Technical &amp; Vocational Skills
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {reviewingApplicant.skillsSummary.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-emerald-300 font-medium"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Administrative Notes */}
                  {reviewingApplicant.notes && (
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                      <span className="text-slate-400 text-[10px] block uppercase font-bold">Administrative Review Notes</span>
                      <p className="text-slate-300 italic">&ldquo;{reviewingApplicant.notes}&rdquo;</p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setReviewingApplicant(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold"
                  >
                    Close Dossier
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 4. Assign Volunteer to Ministry Team Modal (5-Gate Validator) */}
          {isAssignModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#0B192C] border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <UserCheck size={18} className="text-emerald-400" />
                    <div>
                      <h3 className="font-bold text-white text-sm">Assign Volunteer to Ministry Team</h3>
                      <span className="text-[10px] text-slate-400">
                        Target Team: {ministryTeams.find((t) => t.teamId === assignTargetTeamId)?.teamName}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAssignModalOpen(false)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleConfirmVolunteerAssignment} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Select Volunteer from M39 Catalog *
                    </label>
                    <select
                      value={assignForm.volunteerId}
                      onChange={(e) => setAssignForm({ ...assignForm, volunteerId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                    >
                      {INITIAL_ADMIN_VOLUNTEERS.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.volunteerName} ({v.department}) · Avail: {v.availability}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Operational Subteam
                      </label>
                      <select
                        value={assignForm.subteam}
                        onChange={(e) => setAssignForm({ ...assignForm, subteam: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      >
                        {(
                          ministryTeams.find((t) => t.teamId === assignTargetTeamId)?.subteams || [
                            'General Operations',
                          ]
                        ).map((sub, sIdx) => (
                          <option key={sIdx} value={sub}>
                            {sub}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Role Name *</label>
                      <input
                        type="text"
                        required
                        value={assignForm.roleName}
                        onChange={(e) => setAssignForm({ ...assignForm, roleName: e.target.value })}
                        placeholder="e.g. Lead PTZ Switcher"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Service Shift</label>
                      <select
                        value={assignForm.serviceSlot}
                        onChange={(e) => setAssignForm({ ...assignForm, serviceSlot: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="08:30 AM (1st Service)">08:30 AM (1st Service)</option>
                        <option value="11:00 AM (2nd Service)">11:00 AM (2nd Service)</option>
                        <option value="05:00 PM (Youth Service)">05:00 PM (Youth Service)</option>
                        <option value="Mid-Week Service">Mid-Week Service</option>
                        <option value="Special Events">Special Events</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Start Time</label>
                      <input
                        type="text"
                        value={assignForm.startTime}
                        onChange={(e) => setAssignForm({ ...assignForm, startTime: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">End Time</label>
                      <input
                        type="text"
                        value={assignForm.endTime}
                        onChange={(e) => setAssignForm({ ...assignForm, endTime: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Live Validation Gate Status Banner */}
                  {validationResult && (
                    <div
                      className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                        validationResult.valid
                          ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                          : 'bg-red-950/60 border-red-500/40 text-red-300'
                      }`}
                    >
                      {validationResult.valid ? (
                        <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <strong className="block">
                          {validationResult.valid
                            ? 'All 5 Validation Gates Passed'
                            : 'Validation Gate Blocked'}
                        </strong>
                        <p className="text-[11px] mt-0.5">
                          {validationResult.valid
                            ? 'Volunteer is cleared for assignment. Canonical department, availability, and quota criteria are met.'
                            : validationResult.error}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAssignModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!validationResult || !validationResult.valid}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-md ${
                        validationResult && validationResult.valid
                          ? 'bg-[#1E6F43] hover:bg-[#185835] text-white cursor-pointer shadow-emerald-950/40'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      }`}
                    >
                      Confirm Assignment (Simulated)
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 5. Delete Opportunity Confirmation Dialog */}
          {deletingOppId && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#0B192C] border border-red-500/40 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                <div className="w-12 h-12 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto">
                  <AlertTriangle size={24} />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-base font-bold text-white">Delete Job Opportunity?</h3>
                  <p className="text-xs text-slate-400">
                    Are you sure you want to remove this opportunity listing? Its associated candidate records will be archived from the local simulation state.
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDeletingOppId(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteOpp}
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
