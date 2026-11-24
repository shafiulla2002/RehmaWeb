'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AdminNavigationShell } from '@/components/layout/AdminNavigationShell';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import {
  subscribeChurchProfile,
  updateChurchProfile,
  subscribeChurchCollection,
  createChurchDocument,
  deleteChurchDocument,
} from '@/lib/firebaseCrud';
import {
  INITIAL_ADMIN_BRANCHES,
  INITIAL_ADMIN_CHURCH_SETTINGS,
  INITIAL_PLATFORM_SUPERADMINS,
  AdminBranchRecord,
  AdminChurchSettingsConfig,
  PlatformSuperAdminRecord,
} from '@/lib/adminWave7cData';
import {
  Settings,
  Building2,
  Sliders,
  LifeBuoy,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  CheckCircle2,
  MapPin,
  Users,
  Radio,
  FileText,
  Key,
  AlertTriangle,
  Check,
  Lock,
  ChevronRight,
  RefreshCw,
  Info,
  Calendar,
  Phone,
  Mail,
  Compass,
  HelpCircle,
  Clock,
  Sparkles,
  Search,
  Filter,
  Plus,
  Edit3,
  Trash2,
  Eye,
  Archive,
  Star,
  StarOff,
  CheckCircle,
  XCircle,
  ArrowUpDown,
  X,
  Globe,
  UserCheck,
  Palette,
  Bell,
  CheckSquare,
  MessageSquare,
  ArrowRight,
  Send,
  AlertOctagon,
  CreditCard,
  Award,
  Zap,
  UserPlus,
  Shield,
  Activity,
} from 'lucide-react';

// =========================================================================
// M46 LOCAL STORAGE ENVELOPE & KEY DEFINITIONS (SCOPED INTERNALLY)
// =========================================================================

const STORAGE_KEY_M46 = '@rhema_admin_m46_settings';
const STORAGE_KEY_DEMO_BRANCH = '@rhema_admin_demo_branch';

// =========================================================================
// M46 TYPES (INTERNAL ONLY - ZERO NEXT.JS APP ROUTER CONFLICTS)
// =========================================================================

type M46Tab = 'branches' | 'church-settings' | 'support-desk' | 'platform-console';

type M46BranchStatus = 'Active (Sim)' | 'Inactive (Sim)' | 'Planning Stage (Sim)' | 'Archived (Sim)';

interface M46BranchRecord extends Omit<AdminBranchRecord, 'status'> {
  code: string;
  contactPhone: string;
  status: M46BranchStatus;
}

// Canonical M46 Support Ticket Categories (Exact 5 Categories)
type M46TicketCategory =
  | 'Technical Issue'
  | 'Account & Role Help'
  | 'Attendance & QR Check-in'
  | 'Ministry Operations'
  | 'General Feedback & Requests';

type M46TicketPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
type M46TicketStatus = 'Open (Sim)' | 'In Progress (Sim)' | 'Resolved (Sim)' | 'Closed (Sim)';

interface M46TicketActivityItem {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  note: string;
}

interface M46SupportTicket {
  id: string;
  title: string;
  category: M46TicketCategory;
  priority: M46TicketPriority;
  status: M46TicketStatus;
  requesterName: string;
  requesterRole: string;
  campusId: string;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
  description: string;
  activity: M46TicketActivityItem[];
}

interface M46ServiceSlot {
  id: string;
  name: string;
  time: string;
  day: string;
  description: string;
}

interface M46ChurchSettingsConfig extends AdminChurchSettingsConfig {
  churchDescription: string;
  physicalAddress: string;
  locality: string;
  city: string;
  primaryColor: string;
  secondaryColor: string;
  services: M46ServiceSlot[];
  defaultLanguage: string;
  timeZone: string;
  dateFormat: string;
  currency: string;
  notificationPreferences: {
    emailEnabled: boolean;
    announcementsEnabled: boolean;
    eventsEnabled: boolean;
    attendanceAlertsEnabled: boolean;
    digestFrequency: 'Immediate' | 'Daily Digest' | 'Weekly';
  };
}

// Canonical M46 Organization & Simulated Licensing Types (Sub-Phase 9.4)
type M46OrgStatus = 'Active (Sim)' | 'Suspended (Sim)';
type M46LicenseStatus = 'Active (Sim)' | 'Expiring Soon (Sim)' | 'Suspended (Sim)' | 'Expired (Sim)';
type M46PlanTier = 'Starter' | 'Ministry Pro' | 'Enterprise Multi-Campus';
type M46BillingCycle = 'Monthly' | 'Annual';

interface M46OrganizationRecord {
  id: string;
  name: string;
  code: string;
  leadPastor: string;
  contactEmail: string;
  contactPhone: string;
  city: string;
  stateProvince: string;
  status: M46OrgStatus;
  joinedDate: string;
  activeCampusesCount: number;
  activeMembersEstimate: number;
  subscription: {
    planTier: M46PlanTier;
    billingCycle: M46BillingCycle;
    startDate: string;
    expiryDate: string;
    licenseStatus: M46LicenseStatus;
    autoRenew: boolean;
    simulatedMonthlyFeeINR: number;
  };
}

interface M46PlatformAdminUser {
  id: string;
  adminName: string;
  email: string;
  role: 'superadmin' | 'admin' | 'auditor';
  status: 'Active (Sim)' | 'Suspended (Sim)';
  twoFactorEnabled: boolean;
  assignedDate: string;
  lastLogin: string;
  isPrimaryRootAdmin: boolean;
}

interface M46AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  action: string;
  target: string;
  details: string;
}

interface M46StateEnvelope {
  branches: M46BranchRecord[];
  settings: M46ChurchSettingsConfig;
  tickets: M46SupportTicket[];
  platformAdmins: M46PlatformAdminUser[];
  organizations: M46OrganizationRecord[];
  auditLogs: M46AuditLogEntry[];
  lastResetTimestamp: string;
}

// =========================================================================
// DETERMINISTIC BASELINE ADAPTERS & DEMONSTRATION DATA BUILDERS
// =========================================================================

const mapBaselineBranchStatus = (status: AdminBranchRecord['status']): M46BranchStatus => {
  if (status === 'Active Campus (Sim)') return 'Active (Sim)';
  if (status === 'Planning Stage (Sim)') return 'Planning Stage (Sim)';
  return 'Active (Sim)';
};

const createBaselineBranches = (): M46BranchRecord[] => {
  const branchMetadata: Record<string, { code: string; contactPhone: string }> = {
    'BRANCH-CENTRAL': { code: 'CEN', contactPhone: '+91 80 2520-0001' },
    'BRANCH-WHITEFIELD': { code: 'WTF', contactPhone: '+91 80 2520-0002' },
    'BRANCH-HEBBAL': { code: 'HBL', contactPhone: '+91 80 2520-0003' },
  };

  return INITIAL_ADMIN_BRANCHES.map((b) => ({
    id: b.id,
    name: b.name,
    locality: b.locality,
    address: b.address,
    seniorPastor: b.seniorPastor,
    activeMembersCount: b.activeMembersCount,
    isMainSanctuary: b.isMainSanctuary,
    code: branchMetadata[b.id]?.code || 'CMP',
    contactPhone: branchMetadata[b.id]?.contactPhone || '+91 80 2520-0000',
    status: mapBaselineBranchStatus(b.status),
  }));
};

const createBaselineSettings = (): M46ChurchSettingsConfig => ({
  ...JSON.parse(JSON.stringify(INITIAL_ADMIN_CHURCH_SETTINGS)),
  churchDescription:
    'A Christ-centered, Spirit-filled family of believers dedicated to kingdom worship, biblical discipleship, and transformative community outreach across Bangalore and global online fellowships.',
  physicalAddress: '100 Feet Road, HAL 2nd Stage, Indiranagar, Bangalore - 560038, Karnataka, India',
  locality: 'Indiranagar / Old Airport Road',
  city: 'Bangalore',
  primaryColor: '#1E6F43',
  secondaryColor: '#C89D35',
  services: [
    {
      id: 'SRV-01',
      name: '1st Service',
      time: '08:30 AM',
      day: 'Sunday',
      description: 'Traditional morning worship, expository sermon, and holy communion celebration.',
    },
    {
      id: 'SRV-02',
      name: '2nd Service',
      time: '11:00 AM',
      day: 'Sunday',
      description: 'Contemporary family worship celebration with concurrent Kids Church and crèche ministry.',
    },
    {
      id: 'SRV-03',
      name: 'Youth Service',
      time: '05:00 PM',
      day: 'Sunday',
      description: 'Vibrant youth-led praise, relevant biblical teaching, and community fellowship.',
    },
    {
      id: 'SRV-04',
      name: 'Mid-Week Prayer',
      time: '07:00 PM',
      day: 'Wednesday',
      description: 'Intercessory prayer vigil, healing testimonies, and systematic verse exposition.',
    },
  ],
  defaultLanguage: 'English',
  timeZone: 'Asia/Kolkata (IST, UTC+05:30)',
  dateFormat: 'DD/MM/YYYY',
  currency: 'INR (₹)',
  notificationPreferences: {
    emailEnabled: true,
    announcementsEnabled: true,
    eventsEnabled: true,
    attendanceAlertsEnabled: true,
    digestFrequency: 'Immediate',
  },
});

const createBaselineTickets = (): M46SupportTicket[] => [
  {
    id: 'TCK-101',
    title: 'Sanctuary Main Livestream Audio Sync Issue',
    category: 'Technical Issue',
    priority: 'High',
    status: 'In Progress (Sim)',
    requesterName: 'Deacon Paul (Media Lead)',
    requesterRole: 'Media Team Lead',
    campusId: 'BRANCH-CENTRAL',
    assignedTo: 'Deacon Paul (Media Lead)',
    createdAt: '2026-11-19 14:30',
    updatedAt: '2026-11-20 10:15',
    description: 'Noticeable 400ms audio delay on Sunday stream output channel 2. Needs OBS latency adjustment.',
    activity: [
      {
        id: 'ACT-101-1',
        timestamp: '2026-11-19 14:30',
        actor: 'Deacon Paul (Media Lead)',
        action: 'CREATED',
        note: 'Ticket logged after soundcheck test run.',
      },
      {
        id: 'ACT-101-2',
        timestamp: '2026-11-20 10:15',
        actor: 'Admin Desk',
        action: 'STATUS_CHANGE',
        note: 'Assigned to Media Lead and transitioned to In Progress.',
      },
    ],
  },
  {
    id: 'TCK-102',
    title: 'Volunteer Lead Coordinator Role Assignment',
    category: 'Account & Role Help',
    priority: 'Medium',
    status: 'Open (Sim)',
    requesterName: 'Sister Grace',
    requesterRole: 'Volunteer Coordinator',
    campusId: 'BRANCH-WHITEFIELD',
    assignedTo: 'Admin Support Desk',
    createdAt: '2026-11-20 09:15',
    updatedAt: '2026-11-20 09:15',
    description: 'Needs elevation from Member to Volunteer Lead to approve Sunday usher assignments in Whitefield.',
    activity: [
      {
        id: 'ACT-102-1',
        timestamp: '2026-11-20 09:15',
        actor: 'Sister Grace',
        action: 'CREATED',
        note: 'Requested role verification via Whitefield campus desk.',
      },
    ],
  },
  {
    id: 'TCK-103',
    title: 'Scanner Camera Permission Error on Kids Church Tablet',
    category: 'Attendance & QR Check-in',
    priority: 'Urgent',
    status: 'Open (Sim)',
    requesterName: 'Brother Luke',
    requesterRole: 'Children Ministry Lead',
    campusId: 'BRANCH-CENTRAL',
    assignedTo: 'IT Systems Team',
    createdAt: '2026-11-20 11:45',
    updatedAt: '2026-11-20 11:45',
    description: 'Check-in kiosk browser prompts for camera permission reset on Tablet #4 in Primary Wing.',
    activity: [
      {
        id: 'ACT-103-1',
        timestamp: '2026-11-20 11:45',
        actor: 'Brother Luke',
        action: 'CREATED',
        note: 'Critical check-in kiosk tablet issue logged ahead of Sunday service.',
      },
    ],
  },
  {
    id: 'TCK-104',
    title: 'Mid-Week Communion Elements Replenishment',
    category: 'Ministry Operations',
    priority: 'Low',
    status: 'Resolved (Sim)',
    requesterName: 'Elder Silas',
    requesterRole: 'Hospitality Elder',
    campusId: 'BRANCH-HEBBAL',
    assignedTo: 'Hospitality Lead',
    createdAt: '2026-11-18 16:00',
    updatedAt: '2026-11-19 14:00',
    description: 'Hebbal fellowship received 200 communion sets for Wednesday evening communion service.',
    activity: [
      {
        id: 'ACT-104-1',
        timestamp: '2026-11-18 16:00',
        actor: 'Elder Silas',
        action: 'CREATED',
        note: 'Requested stock dispatch from Central Sanctuary warehouse.',
      },
      {
        id: 'ACT-104-2',
        timestamp: '2026-11-19 14:00',
        actor: 'Hospitality Lead',
        action: 'RESOLVED',
        note: 'Supplies delivered and acknowledged by Hebbal coordinator.',
      },
    ],
  },
  {
    id: 'TCK-105',
    title: 'Proposal for Monthly Youth Prayer Breakfast Schedule',
    category: 'General Feedback & Requests',
    priority: 'Medium',
    status: 'In Progress (Sim)',
    requesterName: 'Youth Director Tim',
    requesterRole: 'Youth Ministry Pastor',
    campusId: 'BRANCH-CENTRAL',
    assignedTo: 'Pastor Office Desk',
    createdAt: '2026-11-20 16:20',
    updatedAt: '2026-11-20 16:35',
    description: 'Requesting permission to add 1st Saturday morning slot to sanctuary calendar for youth prayer.',
    activity: [
      {
        id: 'ACT-105-1',
        timestamp: '2026-11-20 16:20',
        actor: 'Youth Director Tim',
        action: 'CREATED',
        note: 'Submitted itinerary request for Pastoral review.',
      },
      {
        id: 'ACT-105-2',
        timestamp: '2026-11-20 16:35',
        actor: 'Senior Pastor John Mark (Demo)',
        action: 'NOTE_ADDED',
        note: 'Reviewing schedule against wedding appointments in December.',
      },
    ],
  },
];

const createBaselinePlatformAdmins = (): M46PlatformAdminUser[] => {
  return INITIAL_PLATFORM_SUPERADMINS.map((sa) => ({
    id: sa.id,
    adminName: sa.adminName,
    email: sa.email,
    role: 'superadmin',
    status: 'Active (Sim)',
    twoFactorEnabled: true,
    assignedDate: sa.assignedDate,
    lastLogin: '2026-11-20 08:30 (Sim)',
    isPrimaryRootAdmin: sa.isPrimaryRootAdmin,
  }));
};

const createBaselineAuditLogs = (): M46AuditLogEntry[] => [
  {
    id: 'AUD-901',
    timestamp: '2026-11-20 08:00',
    actor: 'Senior Pastor John Mark (Demo)',
    actorRole: 'Super Admin',
    action: 'BASELINE_BOOTSTRAP',
    target: 'System Configuration',
    details: 'M46 Consolidated State Envelope Initialized under Layer A simulation.',
  },
  {
    id: 'AUD-902',
    timestamp: '2026-11-19 18:45',
    actor: 'Elder Samuel Executive Pastor (Demo)',
    actorRole: 'Super Admin',
    action: 'GEOFENCE_VERIFY',
    target: 'Attendance Boundary',
    details: 'Verified 100-meter radius boundary for Central Sanctuary check-in.',
  },
  {
    id: 'AUD-903',
    timestamp: '2026-11-18 12:30',
    actor: 'Senior Pastor John Mark (Demo)',
    actorRole: 'Super Admin',
    action: 'CAMPUS_AUDIT',
    target: 'Hebbal Fellowship',
    details: 'Affirmed planning stage expansion milestone for North Bangalore outreach.',
  },
];

const createBaselineOrganizations = (): M46OrganizationRecord[] => [
  {
    id: 'ORG-RHEMA',
    name: 'Rhema Christian Ministry',
    code: 'RHEMA',
    leadPastor: 'Senior Pastor John Mark',
    contactEmail: 'pastor.office@rhema-demo.org',
    contactPhone: '+91 80 2520-0000',
    city: 'Bangalore',
    stateProvince: 'Karnataka',
    status: 'Active (Sim)',
    joinedDate: '2024-01-01',
    activeCampusesCount: 3,
    activeMembersEstimate: 870,
    subscription: {
      planTier: 'Enterprise Multi-Campus',
      billingCycle: 'Annual',
      startDate: '2026-01-01',
      expiryDate: '2027-01-01',
      licenseStatus: 'Active (Sim)',
      autoRenew: true,
      simulatedMonthlyFeeINR: 24999,
    },
  },
  {
    id: 'ORG-GRACE-BLR',
    name: 'Grace Fellowship City Church',
    code: 'GRACE-BLR',
    leadPastor: 'Pastor Andrew Philip',
    contactEmail: 'admin@gracefellowship-demo.in',
    contactPhone: '+91 80 4112-8890',
    city: 'Bangalore',
    stateProvince: 'Karnataka',
    status: 'Active (Sim)',
    joinedDate: '2025-03-15',
    activeCampusesCount: 1,
    activeMembersEstimate: 420,
    subscription: {
      planTier: 'Ministry Pro',
      billingCycle: 'Annual',
      startDate: '2025-12-15',
      expiryDate: '2026-12-15',
      licenseStatus: 'Expiring Soon (Sim)',
      autoRenew: false,
      simulatedMonthlyFeeINR: 10499,
    },
  },
  {
    id: 'ORG-BETHEL-HYD',
    name: 'Bethel Assembly of God',
    code: 'BETHEL-HYD',
    leadPastor: 'Rev. Timothy Raj',
    contactEmail: 'contact@bethelhyd-demo.org',
    contactPhone: '+91 40 6678-1234',
    city: 'Hyderabad',
    stateProvince: 'Telangana',
    status: 'Active (Sim)',
    joinedDate: '2025-06-01',
    activeCampusesCount: 2,
    activeMembersEstimate: 650,
    subscription: {
      planTier: 'Ministry Pro',
      billingCycle: 'Monthly',
      startDate: '2026-11-01',
      expiryDate: '2026-12-01',
      licenseStatus: 'Active (Sim)',
      autoRenew: true,
      simulatedMonthlyFeeINR: 12499,
    },
  },
  {
    id: 'ORG-CALVARY-CHN',
    name: 'Calvary Community Chapel',
    code: 'CALVARY-CHN',
    leadPastor: 'Pastor Stephen Varghese',
    contactEmail: 'office@calvarychn-demo.org',
    contactPhone: '+91 44 2456-7890',
    city: 'Chennai',
    stateProvince: 'Tamil Nadu',
    status: 'Suspended (Sim)',
    joinedDate: '2024-09-10',
    activeCampusesCount: 1,
    activeMembersEstimate: 180,
    subscription: {
      planTier: 'Starter',
      billingCycle: 'Annual',
      startDate: '2025-09-10',
      expiryDate: '2026-09-10',
      licenseStatus: 'Expired (Sim)',
      autoRenew: false,
      simulatedMonthlyFeeINR: 4166,
    },
  },
];

const createInitialM46State = (): M46StateEnvelope => ({
  branches: createBaselineBranches(),
  settings: createBaselineSettings(),
  tickets: createBaselineTickets(),
  platformAdmins: createBaselinePlatformAdmins(),
  organizations: createBaselineOrganizations(),
  auditLogs: createBaselineAuditLogs(),
  lastResetTimestamp: new Date().toISOString(),
});

// Format current date and time for audit logs
const formatCurrentAuditTimestamp = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

// =========================================================================
// M46 CORE PAGE COMPONENT (SUB-PHASE 9.3: AREAS B & C IMPLEMENTATION)
// =========================================================================

function M46SettingsPageContent() {
  const { role, profile } = useAuth();
  const isSuperAdmin = role === 'superadmin';
  const currentActorName = profile?.fullName || (isSuperAdmin ? 'Senior Pastor John Mark (Demo)' : 'Church Administrator (Demo)');

  // Local storage state envelope
  const [state, setState] = useState<M46StateEnvelope>(createInitialM46State);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeBranchName, setActiveBranchName] = useState<string>('Rhema Central Sanctuary');

  // Role-aware active tab
  // Super Admin: defaults to 'branches' or 'church-settings'
  // Admin: strictly defaults to 'church-settings'
  const [activeTab, setActiveTab] = useState<M46Tab>(() => (isSuperAdmin ? 'branches' : 'church-settings'));

  // Notification and toast state
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Reset confirmation modal state (strictly scoped to granular settings/tickets resets)
  const [resetModalMode, setResetModalMode] = useState<'settings' | 'tickets' | null>(null);

  // =========================================================================
  // AREA A: BRANCH MANAGEMENT LOCAL STATES (SUB-PHASE 9.2)
  // =========================================================================
  const [branchSearchTerm, setBranchSearchTerm] = useState('');
  const [branchStatusFilter, setBranchStatusFilter] = useState<'All' | M46BranchStatus>('All');
  const [showCreateBranchModal, setShowCreateBranchModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<M46BranchRecord | null>(null);
  const [viewingBranch, setViewingBranch] = useState<M46BranchRecord | null>(null);
  const [deletingBranch, setDeletingBranch] = useState<M46BranchRecord | null>(null);

  const [branchFormData, setBranchFormData] = useState({
    name: '',
    code: '',
    locality: '',
    address: '',
    seniorPastor: '',
    contactPhone: '',
    activeMembersCount: 150,
    status: 'Active (Sim)' as M46BranchStatus,
    isMainSanctuary: false,
  });
  const [branchFormErrors, setBranchFormErrors] = useState<Record<string, string>>({});

  // =========================================================================
  // AREA B: CHURCH SETTINGS LOCAL STATES (SUB-PHASE 9.3)
  // =========================================================================
  const [settingsFormData, setSettingsFormData] = useState<M46ChurchSettingsConfig>(createBaselineSettings);
  const [settingsErrors, setSettingsErrors] = useState<Record<string, string>>({});
  const [editingServiceSlot, setEditingServiceSlot] = useState<M46ServiceSlot | null>(null);
  const [serviceFormData, setServiceFormData] = useState<M46ServiceSlot>({
    id: '',
    name: '',
    time: '',
    day: 'Sunday',
    description: '',
  });

  // =========================================================================
  // AREA C: SUPPORT DESK LOCAL STATES (SUB-PHASE 9.3)
  // =========================================================================
  const [ticketSearchTerm, setTicketSearchTerm] = useState('');
  const [ticketCategoryFilter, setTicketCategoryFilter] = useState<string>('All');
  const [ticketPriorityFilter, setTicketPriorityFilter] = useState<string>('All');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>('All');

  // Modals for Area C
  const [showCreateTicketModal, setShowCreateTicketModal] = useState(false);
  const [viewingTicket, setViewingTicket] = useState<M46SupportTicket | null>(null);
  const [editingTicket, setEditingTicket] = useState<M46SupportTicket | null>(null);
  const [closingTicket, setClosingTicket] = useState<M46SupportTicket | null>(null);
  const [deletingTicket, setDeletingTicket] = useState<M46SupportTicket | null>(null);

  // Ticket Form States
  const [ticketFormData, setTicketFormData] = useState<{
    title: string;
    category: M46TicketCategory;
    priority: M46TicketPriority;
    campusId: string;
    requesterName: string;
    requesterRole: string;
    assignedTo: string;
    description: string;
  }>({
    title: '',
    category: 'Technical Issue',
    priority: 'Medium',
    campusId: 'BRANCH-CENTRAL',
    requesterName: '',
    requesterRole: 'Ministry Team Member',
    assignedTo: 'Admin Support Desk',
    description: '',
  });
  const [ticketFormErrors, setTicketFormErrors] = useState<Record<string, string>>({});
  const [activityNoteInput, setActivityNoteInput] = useState('');

  // =========================================================================
  // AREA D: PLATFORM SUPER ADMIN & LICENSING LOCAL STATES (SUB-PHASE 9.4)
  // =========================================================================
  const [platformSubTab, setPlatformSubTab] = useState<'organizations' | 'admins' | 'audit'>('organizations');

  // Organization directory filters
  const [orgSearchTerm, setOrgSearchTerm] = useState('');
  const [orgStatusFilter, setOrgStatusFilter] = useState<'All' | M46OrgStatus>('All');
  const [orgPlanFilter, setOrgPlanFilter] = useState<'All' | M46PlanTier>('All');
  const [orgLicenseFilter, setOrgLicenseFilter] = useState<'All' | M46LicenseStatus>('All');

  // Organization modals
  const [selectedOrg, setSelectedOrg] = useState<M46OrganizationRecord | null>(null);
  const [licensingOrg, setLicensingOrg] = useState<M46OrganizationRecord | null>(null);
  const [licenseFormData, setLicenseFormData] = useState<{
    planTier: M46PlanTier;
    billingCycle: M46BillingCycle;
    autoRenew: boolean;
    monthsToAdd: number;
  }>({
    planTier: 'Ministry Pro',
    billingCycle: 'Annual',
    autoRenew: true,
    monthsToAdd: 12,
  });

  // Platform admin directory filters
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [adminRoleFilter, setAdminRoleFilter] = useState<'All' | 'superadmin' | 'admin' | 'auditor'>('All');

  // Platform admin modals
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<M46PlatformAdminUser | null>(null);
  const [suspendingAdmin, setSuspendingAdmin] = useState<M46PlatformAdminUser | null>(null);
  const [revokingAdmin, setRevokingAdmin] = useState<M46PlatformAdminUser | null>(null);

  const [adminFormData, setAdminFormData] = useState<{
    adminName: string;
    email: string;
    role: 'superadmin' | 'admin' | 'auditor';
    twoFactorEnabled: boolean;
  }>({
    adminName: '',
    email: '',
    role: 'admin',
    twoFactorEnabled: true,
  });
  const [adminFormErrors, setAdminFormErrors] = useState<Record<string, string>>({});

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.text === text ? null : curr));
    }, 4500);
  }, []);

  // Helper to append a simulated audit log
  const appendAuditLog = useCallback(
    (action: string, target: string, details: string, currentLogs: M46AuditLogEntry[]): M46AuditLogEntry[] => {
      const newLog: M46AuditLogEntry = {
        id: `AUD-${Date.now()}`,
        timestamp: formatCurrentAuditTimestamp(),
        actor: currentActorName,
        actorRole: isSuperAdmin ? 'Super Admin' : 'Admin',
        action,
        target,
        details,
      };
      return [newLog, ...currentLogs];
    },
    [currentActorName, isSuperAdmin]
  );

  // Live Firestore Synchronization with Baseline Seeding & Fallback
  useEffect(() => {
    let seededRoot = false;
    let seededBranches = false;

    // 1. Subscribe to Church Root Profile Document ('Rhema Church/rhema')
    const unsubProfile = subscribeChurchProfile(async (churchDoc) => {
      if (!churchDoc && !seededRoot) {
        seededRoot = true;
        try {
          const baseline = createBaselineSettings();
          await updateChurchProfile({
            name: baseline.churchName,
            pastorName: 'Senior Pastor John Mark',
            churchCode: 'RHEMA',
            contactEmail: baseline.pastoralSupportEmail,
            contactPhone: baseline.primaryContactPhone,
            address: baseline.physicalAddress,
            aboutUs: baseline.churchDescription,
            theme: { primaryColor: baseline.primaryColor, secondaryColor: baseline.secondaryColor },
            givingDetails: {
              upiId: 'rhema.ministry@hdfcbank',
              accountName: 'Rhema Christian Ministry Trust',
              accountNumber: '50200012345678',
              ifscCode: 'HDFC0001234',
              bankName: 'HDFC Bank Ltd, Indiranagar Branch, Bengaluru',
            },
          });
        } catch (e) {
          console.warn('[M46] Failed to seed root church profile:', e);
        }
      } else if (churchDoc) {
        setState((prev) => {
          const updatedSettings: M46ChurchSettingsConfig = {
            ...prev.settings,
            churchName: churchDoc.name || prev.settings.churchName,
            pastoralSupportEmail: churchDoc.contactEmail || prev.settings.pastoralSupportEmail,
            primaryContactPhone: churchDoc.contactPhone || prev.settings.primaryContactPhone,
            physicalAddress: churchDoc.address || prev.settings.physicalAddress,
            churchDescription: churchDoc.aboutUs || prev.settings.churchDescription,
          };
          setSettingsFormData(updatedSettings);
          return { ...prev, settings: updatedSettings };
        });
      }
      setIsInitialized(true);
    });

    // 2. Subscribe to Satellite Branches Subcollection ('Rhema Church/rhema/branches')
    const unsubBranches = subscribeChurchCollection<any>('branches', async (items) => {
      if (items.length === 0 && !seededBranches) {
        seededBranches = true;
        const baselineBranches = createBaselineBranches();
        for (const b of baselineBranches) {
          try {
            await createChurchDocument('branches', b, b.id);
          } catch (e) {
            console.warn('[M46] Failed to seed branch:', e);
          }
        }
      } else if (items.length > 0) {
        setState((prev) => ({
          ...prev,
          branches: items.map((b: any) => ({
            ...b,
            status: mapBaselineBranchStatus(b.status),
          })),
        }));
      }
    });

    return () => {
      unsubProfile();
      unsubBranches();
    };
  }, []);

  // Enforce tab access invariant for ordinary Admin:
  useEffect(() => {
    if (!isSuperAdmin && (activeTab === 'branches' || activeTab === 'platform-console')) {
      setActiveTab('church-settings');
    }
  }, [isSuperAdmin, activeTab]);

  // Persist state updates to LocalStorage safely AND to live Firestore
  const persistState = useCallback(async (nextState: M46StateEnvelope) => {
    setState(nextState);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_M46, JSON.stringify(nextState));
      }
      // Async sync to Firestore Root Church Document
      await updateChurchProfile({
        name: nextState.settings.churchName,
        contactEmail: nextState.settings.pastoralSupportEmail,
        contactPhone: nextState.settings.primaryContactPhone,
        address: nextState.settings.physicalAddress,
        aboutUs: nextState.settings.churchDescription,
        theme: {
          primaryColor: nextState.settings.primaryColor,
          secondaryColor: nextState.settings.secondaryColor,
        },
      });

      // Sync active branches to Firestore
      for (const b of nextState.branches) {
        await createChurchDocument('branches', b, b.id);
      }
    } catch (e) {
      console.warn('[M46] Failed to persist state to Firestore:', e);
    }
  }, []);

  // Safe Granular Reset handler preserving Area A branches, organizations & platform admins
  const handleExecuteReset = (mode: 'settings' | 'tickets') => {
    if (mode === 'settings') {
      // Explicitly preserve Area A branches, tickets, organizations, and platformAdmins
      const defaultSettings = createBaselineSettings();
      const updatedLogs = appendAuditLog(
        'SETTINGS_RESET',
        'Church Profile & Configuration',
        'Church general and campus settings restored to factory defaults. Area A branches, tickets, organizations, and platform admins preserved.',
        state.auditLogs
      );
      const updated: M46StateEnvelope = {
        ...state,
        branches: state.branches,
        settings: defaultSettings,
        tickets: state.tickets,
        organizations: state.organizations,
        platformAdmins: state.platformAdmins,
        auditLogs: updatedLogs,
      };
      persistState(updated);
      setSettingsFormData(defaultSettings);
      showToast('Church settings restored to default baseline. Branches, tickets, organizations & platform admins preserved.', 'success');
    } else if (mode === 'tickets') {
      // Explicitly preserve Area A branches, settings, organizations, and platformAdmins
      const defaultTickets = createBaselineTickets();
      const updatedLogs = appendAuditLog(
        'TICKETS_RESET',
        'Support Desk Queue',
        'Support ticket queue reset to 5 canonical demonstration tickets. Area A branches, church settings, organizations, and platform admins preserved.',
        state.auditLogs
      );
      const updated: M46StateEnvelope = {
        ...state,
        branches: state.branches,
        settings: state.settings,
        tickets: defaultTickets,
        organizations: state.organizations,
        platformAdmins: state.platformAdmins,
        auditLogs: updatedLogs,
      };
      persistState(updated);
      showToast('Support ticket queue reset to default baseline. Branches, settings, organizations & platform admins preserved.', 'success');
    }

    setResetModalMode(null);
  };

  // KPI Calculations from local state
  const kpis = useMemo(() => {
    const totalCampuses = state.branches.length;
    const activeCampuses = state.branches.filter((b) => b.status === 'Active (Sim)').length;
    const planningCampuses = state.branches.filter((b) => b.status === 'Planning Stage (Sim)').length;
    const inactiveOrArchived = state.branches.filter(
      (b) => b.status === 'Inactive (Sim)' || b.status === 'Archived (Sim)'
    ).length;
    const totalMembership = state.branches
      .filter((b) => b.status !== 'Archived (Sim)')
      .reduce((acc, b) => acc + (b.activeMembersCount || 0), 0);

    const geofenceMeters = state.settings.attendanceGeofenceRadiusMeters || 100;
    const openTicketsCount = state.tickets.filter((t) => t.status === 'Open (Sim)').length;
    const inProgressTicketsCount = state.tickets.filter((t) => t.status === 'In Progress (Sim)').length;
    const resolvedOrClosedCount = state.tickets.filter(
      (t) => t.status === 'Resolved (Sim)' || t.status === 'Closed (Sim)'
    ).length;
    const urgentTicketsCount = state.tickets.filter(
      (t) => t.priority === 'Urgent' && t.status !== 'Closed (Sim)'
    ).length;
    const superAdminCount = state.platformAdmins.filter((a) => a.role === 'superadmin' && a.status === 'Active (Sim)').length;

    // Area D: Platform Organization & Licensing KPIs (Sub-Phase 9.4)
    const totalOrganizations = state.organizations?.length || 0;
    const activeOrganizations = state.organizations?.filter((o) => o.status === 'Active (Sim)').length || 0;
    const suspendedOrganizations = state.organizations?.filter((o) => o.status === 'Suspended (Sim)').length || 0;
    const enterpriseSubCount = state.organizations?.filter((o) => o.subscription.planTier === 'Enterprise Multi-Campus').length || 0;
    const proSubCount = state.organizations?.filter((o) => o.subscription.planTier === 'Ministry Pro').length || 0;
    const starterSubCount = state.organizations?.filter((o) => o.subscription.planTier === 'Starter').length || 0;
    const expiringLicensesCount = state.organizations?.filter(
      (o) => o.subscription.licenseStatus === 'Expiring Soon (Sim)' || o.subscription.licenseStatus === 'Expired (Sim)'
    ).length || 0;
    const totalPlatformAdmins = state.platformAdmins.length;

    return {
      totalCampuses,
      activeCampuses,
      planningCampuses,
      inactiveOrArchived,
      totalMembership,
      geofenceMeters,
      openTicketsCount,
      inProgressTicketsCount,
      resolvedOrClosedCount,
      urgentTicketsCount,
      superAdminCount,
      serviceCount: state.settings.services?.length || 4,
      totalOrganizations,
      activeOrganizations,
      suspendedOrganizations,
      enterpriseSubCount,
      proSubCount,
      starterSubCount,
      expiringLicensesCount,
      totalPlatformAdmins,
    };
  }, [state]);

  // Available tabs based on current role
  const availableTabs: { id: M46Tab; label: string; icon: React.ElementType; tag?: string }[] = useMemo(() => {
    if (isSuperAdmin) {
      return [
        { id: 'branches', label: 'Church Branches', icon: Building2, tag: 'Super Admin' },
        { id: 'church-settings', label: 'Church Settings', icon: Sliders },
        { id: 'support-desk', label: 'Support Desk', icon: LifeBuoy, tag: `${kpis.openTicketsCount} Open` },
        { id: 'platform-console', label: 'Platform Console', icon: ShieldCheck, tag: 'Super Admin' },
      ];
    }
    return [
      { id: 'church-settings', label: 'Church Settings', icon: Sliders },
      { id: 'support-desk', label: 'Support Desk', icon: LifeBuoy, tag: `${kpis.openTicketsCount} Open` },
    ];
  }, [isSuperAdmin, kpis.openTicketsCount]);

  // =========================================================================
  // AREA A: FILTERED BRANCH DIRECTORY & VALIDATOR
  // =========================================================================
  const filteredBranches = useMemo(() => {
    return state.branches.filter((branch) => {
      const matchesSearch =
        branch.name.toLowerCase().includes(branchSearchTerm.toLowerCase()) ||
        branch.code.toLowerCase().includes(branchSearchTerm.toLowerCase()) ||
        branch.locality.toLowerCase().includes(branchSearchTerm.toLowerCase()) ||
        branch.address.toLowerCase().includes(branchSearchTerm.toLowerCase()) ||
        branch.seniorPastor.toLowerCase().includes(branchSearchTerm.toLowerCase()) ||
        branch.contactPhone.toLowerCase().includes(branchSearchTerm.toLowerCase());

      const matchesStatus = branchStatusFilter === 'All' || branch.status === branchStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [state.branches, branchSearchTerm, branchStatusFilter]);

  // Canonical M46 Campus Code Validator:
  // - Uppercase alphanumeric characters with optional single hyphens (e.g. CEN, RHM-BLR-05)
  // - Length between 2 and 20 characters
  // - Cannot start or end with a hyphen
  // - Unique across branches (case-insensitive)
  const validateBranchCode = (
    code: string,
    existingBranches: M46BranchRecord[],
    isEditing = false,
    currentBranchId?: string
  ): { isValid: boolean; error?: string } => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      return { isValid: false, error: 'Campus code is required.' };
    }
    if (cleanCode.length < 2 || cleanCode.length > 20) {
      return {
        isValid: false,
        error: `Campus code must be between 2 and 20 characters (current length: ${cleanCode.length}).`,
      };
    }
    if (cleanCode.startsWith('-') || cleanCode.endsWith('-')) {
      return {
        isValid: false,
        error: 'Campus code cannot start or end with a hyphen (e.g. RHM-BLR-05).',
      };
    }
    if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(cleanCode)) {
      return {
        isValid: false,
        error: 'Campus code must contain only uppercase alphanumeric characters and optional hyphens (e.g. CEN, RHM-BLR-05).',
      };
    }
    const duplicate = existingBranches.find(
      (b) => b.code.toUpperCase() === cleanCode && (!isEditing || b.id !== currentBranchId)
    );
    if (duplicate) {
      return {
        isValid: false,
        error: `Campus code "${cleanCode}" is already used by ${duplicate.name}.`,
      };
    }
    return { isValid: true };
  };

  const validateBranchForm = (isEditing = false, currentBranchId?: string): boolean => {
    const errors: Record<string, string> = {};

    if (!branchFormData.name.trim() || branchFormData.name.trim().length < 3) {
      errors.name = 'Branch name must be at least 3 characters long.';
    }

    const codeResult = validateBranchCode(branchFormData.code, state.branches, isEditing, currentBranchId);
    if (!codeResult.isValid && codeResult.error) {
      errors.code = codeResult.error;
    }

    if (!branchFormData.locality.trim()) {
      errors.locality = 'Locality or neighborhood is required.';
    }

    if (!branchFormData.address.trim() || branchFormData.address.trim().length < 8) {
      errors.address = 'Full sanctuary street address is required (at least 8 chars).';
    }

    if (!branchFormData.seniorPastor.trim()) {
      errors.seniorPastor = 'Senior or Campus Pastor name is required.';
    }

    if (!branchFormData.contactPhone.trim()) {
      errors.contactPhone = 'Campus administrative phone number is required.';
    }

    if (isNaN(branchFormData.activeMembersCount) || branchFormData.activeMembersCount < 0) {
      errors.activeMembersCount = 'Active congregation count must be a non-negative number.';
    }

    setBranchFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenCreateModal = () => {
    if (!isSuperAdmin) return;
    setBranchFormData({
      name: '',
      code: '',
      locality: '',
      address: '',
      seniorPastor: '',
      contactPhone: '+91 80 2520-0000',
      activeMembersCount: 120,
      status: 'Active (Sim)',
      isMainSanctuary: false,
    });
    setBranchFormErrors({});
    setShowCreateBranchModal(true);
  };

  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    if (!validateBranchForm(false)) return;

    const cleanCode = branchFormData.code.trim().toUpperCase();
    const newBranchId = `BRANCH-${cleanCode}-${Date.now().toString().slice(-4)}`;

    const newBranch: M46BranchRecord = {
      id: newBranchId,
      name: branchFormData.name.trim(),
      code: cleanCode,
      locality: branchFormData.locality.trim(),
      address: branchFormData.address.trim(),
      seniorPastor: branchFormData.seniorPastor.trim(),
      contactPhone: branchFormData.contactPhone.trim(),
      activeMembersCount: Number(branchFormData.activeMembersCount),
      status: branchFormData.status,
      isMainSanctuary: Boolean(branchFormData.isMainSanctuary),
    };

    let updatedBranches = [...state.branches];
    if (newBranch.isMainSanctuary) {
      updatedBranches = updatedBranches.map((b) => ({ ...b, isMainSanctuary: false }));
    }
    updatedBranches.push(newBranch);

    const updatedAuditLogs = appendAuditLog(
      'BRANCH_CREATE',
      newBranch.name,
      `Created new campus [${newBranch.code}] ${newBranch.name} (${newBranch.status}) with ${newBranch.activeMembersCount} members.${
        newBranch.isMainSanctuary ? ' Designated as primary Main Sanctuary.' : ''
      }`,
      state.auditLogs
    );

    persistState({
      ...state,
      branches: updatedBranches,
      auditLogs: updatedAuditLogs,
    });

    setShowCreateBranchModal(false);
    showToast(`Branch [${newBranch.code}] ${newBranch.name} created successfully.`, 'success');
  };

  const handleOpenEditModal = (branch: M46BranchRecord) => {
    if (!isSuperAdmin) return;
    setEditingBranch(branch);
    setBranchFormData({
      name: branch.name,
      code: branch.code,
      locality: branch.locality,
      address: branch.address,
      seniorPastor: branch.seniorPastor,
      contactPhone: branch.contactPhone,
      activeMembersCount: branch.activeMembersCount,
      status: branch.status,
      isMainSanctuary: branch.isMainSanctuary,
    });
    setBranchFormErrors({});
  };

  const handleUpdateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin || !editingBranch) return;
    if (!validateBranchForm(true, editingBranch.id)) return;

    const cleanCode = branchFormData.code.trim().toUpperCase();
    const isDesignatingMain = Boolean(branchFormData.isMainSanctuary);

    if (isDesignatingMain && (branchFormData.status === 'Inactive (Sim)' || branchFormData.status === 'Archived (Sim)')) {
      showToast('Invariant Violation: The designated Main Sanctuary must remain in Active status.', 'error');
      return;
    }

    let updatedBranches = state.branches.map((b) => {
      if (b.id === editingBranch.id) {
        return {
          ...b,
          name: branchFormData.name.trim(),
          code: cleanCode,
          locality: branchFormData.locality.trim(),
          address: branchFormData.address.trim(),
          seniorPastor: branchFormData.seniorPastor.trim(),
          contactPhone: branchFormData.contactPhone.trim(),
          activeMembersCount: Number(branchFormData.activeMembersCount),
          status: branchFormData.status,
          isMainSanctuary: isDesignatingMain,
        };
      }
      if (isDesignatingMain) {
        return { ...b, isMainSanctuary: false };
      }
      return b;
    });

    const hasMainSanctuary = updatedBranches.some((b) => b.isMainSanctuary);
    if (!hasMainSanctuary) {
      showToast('Invariant Warning: Rhema requires at least one campus designated as primary Main Sanctuary.', 'warning');
      updatedBranches = updatedBranches.map((b) => (b.id === editingBranch.id ? { ...b, isMainSanctuary: true } : b));
    }

    const updatedAuditLogs = appendAuditLog(
      'BRANCH_UPDATE',
      branchFormData.name.trim(),
      `Updated details for campus [${cleanCode}] ${branchFormData.name.trim()}.${
        isDesignatingMain ? ' Designated as primary Main Sanctuary.' : ''
      }`,
      state.auditLogs
    );

    persistState({
      ...state,
      branches: updatedBranches,
      auditLogs: updatedAuditLogs,
    });

    setEditingBranch(null);
    showToast(`Campus [${cleanCode}] updated successfully.`, 'success');
  };

  const handleToggleBranchStatus = (branch: M46BranchRecord) => {
    if (!isSuperAdmin) return;

    if (branch.isMainSanctuary && branch.status === 'Active (Sim)') {
      showToast(
        'Invariant Violation: The designated Main Sanctuary cannot be deactivated. Please designate another active campus as Main Sanctuary first.',
        'error'
      );
      return;
    }

    const newStatus: M46BranchStatus = branch.status === 'Active (Sim)' ? 'Inactive (Sim)' : 'Active (Sim)';
    const updatedBranches = state.branches.map((b) => (b.id === branch.id ? { ...b, status: newStatus } : b));

    const updatedAuditLogs = appendAuditLog(
      'BRANCH_STATUS_CHANGE',
      branch.name,
      `Changed lifecycle status of [${branch.code}] ${branch.name} from ${branch.status} to ${newStatus}.`,
      state.auditLogs
    );

    persistState({
      ...state,
      branches: updatedBranches,
      auditLogs: updatedAuditLogs,
    });

    showToast(`Campus [${branch.code}] status updated to ${newStatus}.`, 'success');
  };

  const handleArchiveBranch = (branch: M46BranchRecord) => {
    if (!isSuperAdmin) return;

    if (branch.isMainSanctuary) {
      showToast('Invariant Violation: The designated Main Sanctuary cannot be archived.', 'error');
      return;
    }

    const updatedBranches = state.branches.map((b) =>
      b.id === branch.id ? { ...b, status: 'Archived (Sim)' as M46BranchStatus } : b
    );

    const updatedAuditLogs = appendAuditLog(
      'BRANCH_ARCHIVE',
      branch.name,
      `Archived campus [${branch.code}] ${branch.name}. Excluded from active campus operations.`,
      state.auditLogs
    );

    persistState({
      ...state,
      branches: updatedBranches,
      auditLogs: updatedAuditLogs,
    });

    showToast(`Campus [${branch.code}] ${branch.name} has been archived.`, 'warning');
    if (viewingBranch?.id === branch.id) {
      setViewingBranch(null);
    }
  };

  const handleSetMainSanctuary = (branch: M46BranchRecord) => {
    if (!isSuperAdmin) return;
    if (branch.isMainSanctuary) {
      showToast(`[${branch.code}] ${branch.name} is already the primary Main Sanctuary.`, 'info' as any);
      return;
    }

    const updatedBranches = state.branches.map((b) => {
      if (b.id === branch.id) {
        return {
          ...b,
          isMainSanctuary: true,
          status: 'Active (Sim)' as M46BranchStatus,
        };
      }
      return { ...b, isMainSanctuary: false };
    });

    const updatedAuditLogs = appendAuditLog(
      'MAIN_SANCTUARY_DESIGNATE',
      branch.name,
      `Designated [${branch.code}] ${branch.name} as primary Main Sanctuary. Single-primary-branch invariant enforced.`,
      state.auditLogs
    );

    persistState({
      ...state,
      branches: updatedBranches,
      auditLogs: updatedAuditLogs,
    });

    showToast(`[${branch.code}] ${branch.name} designated as primary Main Sanctuary.`, 'success');
    if (viewingBranch?.id === branch.id) {
      setViewingBranch({ ...branch, isMainSanctuary: true, status: 'Active (Sim)' });
    }
  };

  const handleConfirmDeleteBranch = () => {
    if (!isSuperAdmin || !deletingBranch) return;

    if (deletingBranch.isMainSanctuary) {
      showToast('Security Invariant: The primary Main Sanctuary cannot be deleted.', 'error');
      setDeletingBranch(null);
      return;
    }

    const branchToDelete = deletingBranch;
    const updatedBranches = state.branches.filter((b) => b.id !== branchToDelete.id);

    const updatedAuditLogs = appendAuditLog(
      'BRANCH_DELETE',
      branchToDelete.name,
      `Permanently removed synthetic campus record [${branchToDelete.code}] ${branchToDelete.name}.`,
      state.auditLogs
    );

    persistState({
      ...state,
      branches: updatedBranches,
      auditLogs: updatedAuditLogs,
    });

    try {
      deleteChurchDocument('branches', branchToDelete.id);
    } catch (e) {
      console.warn('[M46] Failed to delete branch from Firestore:', e);
    }

    setDeletingBranch(null);
    if (viewingBranch?.id === branchToDelete.id) {
      setViewingBranch(null);
    }
    showToast(`Campus [${branchToDelete.code}] ${branchToDelete.name} permanently deleted.`, 'success');
  };

  // =========================================================================
  // AREA B: CHURCH SETTINGS VALIDATION & SAVING (SUB-PHASE 9.3)
  // =========================================================================
  const validateChurchSettings = (): boolean => {
    const errors: Record<string, string> = {};

    if (!settingsFormData.churchName.trim() || settingsFormData.churchName.trim().length < 3) {
      errors.churchName = 'Church Name must be at least 3 characters long.';
    }

    if (!settingsFormData.tagline.trim()) {
      errors.tagline = 'Church tagline or motto is required.';
    }

    if (!settingsFormData.primaryContactPhone.trim()) {
      errors.primaryContactPhone = 'Primary contact phone number is required.';
    }

    if (!settingsFormData.pastoralSupportEmail.trim() || !settingsFormData.pastoralSupportEmail.includes('@')) {
      errors.pastoralSupportEmail = 'Valid pastoral email address is required.';
    }

    if (!settingsFormData.physicalAddress.trim() || settingsFormData.physicalAddress.trim().length < 10) {
      errors.physicalAddress = 'Physical sanctuary street address must be at least 10 characters.';
    }

    // Geofence numeric bounds validation (Sensible boundaries: 25m to 1000m)
    const geofence = Number(settingsFormData.attendanceGeofenceRadiusMeters);
    if (isNaN(geofence) || geofence < 25 || geofence > 1000) {
      errors.attendanceGeofenceRadiusMeters = 'Geofence radius must be between 25 and 1,000 meters.';
    }

    // Latitude & Longitude bounds validation (-90 to 90, -180 to 180)
    const lat = Number(settingsFormData.sanctuaryLatitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      errors.sanctuaryLatitude = 'Latitude must be between -90.0 and +90.0 degrees.';
    }

    const lng = Number(settingsFormData.sanctuaryLongitude);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      errors.sanctuaryLongitude = 'Longitude must be between -180.0 and +180.0 degrees.';
    }

    // Primary & Secondary Brand Colors (Hex code)
    if (!/^#[0-9A-Fa-f]{6}$/.test(settingsFormData.primaryColor)) {
      errors.primaryColor = 'Primary color must be a valid 6-digit hex code (e.g. #1E6F43).';
    }
    if (!/^#[0-9A-Fa-f]{6}$/.test(settingsFormData.secondaryColor)) {
      errors.secondaryColor = 'Secondary color must be a valid 6-digit hex code (e.g. #C89D35).';
    }

    setSettingsErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveChurchSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateChurchSettings()) {
      showToast('Please correct the validation errors in Church Settings before saving.', 'error');
      return;
    }

    const updatedSettings: M46ChurchSettingsConfig = {
      ...settingsFormData,
      attendanceGeofenceRadiusMeters: Number(settingsFormData.attendanceGeofenceRadiusMeters),
      sanctuaryLatitude: Number(settingsFormData.sanctuaryLatitude),
      sanctuaryLongitude: Number(settingsFormData.sanctuaryLongitude),
    };

    const updatedLogs = appendAuditLog(
      'SETTINGS_UPDATE',
      settingsFormData.churchName,
      `Updated church profile, visual branding, regional preferences, and geofence radius (${updatedSettings.attendanceGeofenceRadiusMeters}m).`,
      state.auditLogs
    );

    persistState({
      ...state,
      settings: updatedSettings,
      auditLogs: updatedLogs,
    });

    showToast('Church General & Campus Settings saved successfully.', 'success');
  };

  // Service Slot Editing Handlers
  const handleOpenEditService = (slot: M46ServiceSlot) => {
    setEditingServiceSlot(slot);
    setServiceFormData({ ...slot });
  };

  const handleSaveServiceSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingServiceSlot) return;

    if (!serviceFormData.name.trim() || !serviceFormData.time.trim()) {
      showToast('Service name and scheduled time are required.', 'error');
      return;
    }

    const updatedServices = (settingsFormData.services || []).map((s) =>
      s.id === editingServiceSlot.id ? { ...serviceFormData } : s
    );

    setSettingsFormData({
      ...settingsFormData,
      services: updatedServices,
    });

    setEditingServiceSlot(null);
    showToast(`Service schedule slot [${serviceFormData.name}] updated. Remember to save church settings.`, 'info' as any);
  };

  // =========================================================================
  // AREA C: SUPPORT DESK FILTERING & CRUD (SUB-PHASE 9.3)
  // =========================================================================
  const filteredTickets = useMemo(() => {
    return state.tickets.filter((ticket) => {
      const matchesSearch =
        ticket.title.toLowerCase().includes(ticketSearchTerm.toLowerCase()) ||
        ticket.id.toLowerCase().includes(ticketSearchTerm.toLowerCase()) ||
        ticket.requesterName.toLowerCase().includes(ticketSearchTerm.toLowerCase()) ||
        ticket.description.toLowerCase().includes(ticketSearchTerm.toLowerCase()) ||
        ticket.assignedTo.toLowerCase().includes(ticketSearchTerm.toLowerCase());

      const matchesCategory = ticketCategoryFilter === 'All' || ticket.category === ticketCategoryFilter;
      const matchesPriority = ticketPriorityFilter === 'All' || ticket.priority === ticketPriorityFilter;
      const matchesStatus = ticketStatusFilter === 'All' || ticket.status === ticketStatusFilter;

      return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
    });
  }, [state.tickets, ticketSearchTerm, ticketCategoryFilter, ticketPriorityFilter, ticketStatusFilter]);

  const handleOpenCreateTicket = () => {
    setTicketFormData({
      title: '',
      category: 'Technical Issue',
      priority: 'Medium',
      campusId: state.branches[0]?.id || 'BRANCH-CENTRAL',
      requesterName: currentActorName,
      requesterRole: isSuperAdmin ? 'Senior Pastor / Executive Lead' : 'Church Administrator',
      assignedTo: 'Admin Support Desk',
      description: '',
    });
    setTicketFormErrors({});
    setShowCreateTicketModal(true);
  };

  const validateTicketForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!ticketFormData.title.trim() || ticketFormData.title.trim().length < 5) {
      errors.title = 'Ticket title must be at least 5 characters long.';
    }

    if (!ticketFormData.requesterName.trim()) {
      errors.requesterName = 'Requester name is required.';
    }

    if (!ticketFormData.description.trim() || ticketFormData.description.trim().length < 10) {
      errors.description = 'Detailed description must be at least 10 characters long.';
    }

    setTicketFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateTicketForm()) return;

    const newTicketId = `TCK-${Date.now().toString().slice(-4)}`;
    const currentTimestamp = formatCurrentAuditTimestamp();

    const newTicket: M46SupportTicket = {
      id: newTicketId,
      title: ticketFormData.title.trim(),
      category: ticketFormData.category,
      priority: ticketFormData.priority,
      status: 'Open (Sim)',
      requesterName: ticketFormData.requesterName.trim(),
      requesterRole: ticketFormData.requesterRole.trim(),
      campusId: ticketFormData.campusId,
      assignedTo: ticketFormData.assignedTo,
      createdAt: currentTimestamp,
      updatedAt: currentTimestamp,
      description: ticketFormData.description.trim(),
      activity: [
        {
          id: `ACT-${newTicketId}-1`,
          timestamp: currentTimestamp,
          actor: currentActorName,
          action: 'CREATED',
          note: `Ticket logged under ${ticketFormData.category} with ${ticketFormData.priority} priority.`,
        },
      ],
    };

    const updatedTickets = [newTicket, ...state.tickets];
    const updatedLogs = appendAuditLog(
      'TICKET_CREATE',
      newTicket.title,
      `Created support ticket [${newTicket.id}] (${newTicket.category}, ${newTicket.priority}) by ${newTicket.requesterName}.`,
      state.auditLogs
    );

    persistState({
      ...state,
      tickets: updatedTickets,
      auditLogs: updatedLogs,
    });

    setShowCreateTicketModal(false);
    showToast(`Support ticket [${newTicket.id}] created successfully.`, 'success');
  };

  const handleUpdateTicketStatus = (ticket: M46SupportTicket, nextStatus: M46TicketStatus) => {
    const currentTimestamp = formatCurrentAuditTimestamp();

    const newActivity: M46TicketActivityItem = {
      id: `ACT-${ticket.id}-${Date.now().toString().slice(-4)}`,
      timestamp: currentTimestamp,
      actor: currentActorName,
      action: 'STATUS_TRANSITION',
      note: `Status changed from ${ticket.status} to ${nextStatus}.`,
    };

    const updatedTickets = state.tickets.map((t) => {
      if (t.id === ticket.id) {
        return {
          ...t,
          status: nextStatus,
          updatedAt: currentTimestamp,
          activity: [...(t.activity || []), newActivity],
        };
      }
      return t;
    });

    const updatedLogs = appendAuditLog(
      'TICKET_STATUS_CHANGE',
      ticket.id,
      `Ticket [${ticket.id}] transitioned to ${nextStatus}.`,
      state.auditLogs
    );

    persistState({
      ...state,
      tickets: updatedTickets,
      auditLogs: updatedLogs,
    });

    showToast(`Ticket [${ticket.id}] updated to ${nextStatus}.`, 'success');
    if (viewingTicket?.id === ticket.id) {
      setViewingTicket({
        ...ticket,
        status: nextStatus,
        updatedAt: currentTimestamp,
        activity: [...(ticket.activity || []), newActivity],
      });
    }
  };

  const handleAddTicketActivityNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingTicket || !activityNoteInput.trim()) return;

    const currentTimestamp = formatCurrentAuditTimestamp();
    const newActivity: M46TicketActivityItem = {
      id: `ACT-${viewingTicket.id}-${Date.now().toString().slice(-4)}`,
      timestamp: currentTimestamp,
      actor: currentActorName,
      action: 'INTERNAL_NOTE',
      note: activityNoteInput.trim(),
    };

    const updatedTickets = state.tickets.map((t) => {
      if (t.id === viewingTicket.id) {
        return {
          ...t,
          updatedAt: currentTimestamp,
          activity: [...(t.activity || []), newActivity],
        };
      }
      return t;
    });

    persistState({
      ...state,
      tickets: updatedTickets,
    });

    setViewingTicket({
      ...viewingTicket,
      updatedAt: currentTimestamp,
      activity: [...(viewingTicket.activity || []), newActivity],
    });
    setActivityNoteInput('');
    showToast('Activity note added to ticket timeline.', 'success');
  };

  const handleConfirmCloseTicket = () => {
    if (!closingTicket) return;
    handleUpdateTicketStatus(closingTicket, 'Closed (Sim)');
    setClosingTicket(null);
  };

  const handleConfirmDeleteTicket = () => {
    if (!deletingTicket) return;

    const ticketToDelete = deletingTicket;
    const updatedTickets = state.tickets.filter((t) => t.id !== ticketToDelete.id);

    const updatedLogs = appendAuditLog(
      'TICKET_DELETE',
      ticketToDelete.id,
      `Removed support ticket [${ticketToDelete.id}]: "${ticketToDelete.title}".`,
      state.auditLogs
    );

    persistState({
      ...state,
      tickets: updatedTickets,
      auditLogs: updatedLogs,
    });

    setDeletingTicket(null);
    if (viewingTicket?.id === ticketToDelete.id) {
      setViewingTicket(null);
    }
    showToast(`Support ticket [${ticketToDelete.id}] deleted.`, 'success');
  };

  // =========================================================================
  // AREA D: PLATFORM SUPER ADMIN & LICENSING HANDLERS (SUB-PHASE 9.4)
  // =========================================================================

  // Filtered Organizations
  const filteredOrganizations = useMemo(() => {
    return (state.organizations || []).filter((org) => {
      const matchesSearch =
        org.name.toLowerCase().includes(orgSearchTerm.toLowerCase()) ||
        org.code.toLowerCase().includes(orgSearchTerm.toLowerCase()) ||
        org.leadPastor.toLowerCase().includes(orgSearchTerm.toLowerCase()) ||
        org.city.toLowerCase().includes(orgSearchTerm.toLowerCase()) ||
        org.contactEmail.toLowerCase().includes(orgSearchTerm.toLowerCase());

      const matchesStatus = orgStatusFilter === 'All' || org.status === orgStatusFilter;
      const matchesPlan = orgPlanFilter === 'All' || org.subscription.planTier === orgPlanFilter;
      const matchesLicense = orgLicenseFilter === 'All' || org.subscription.licenseStatus === orgLicenseFilter;

      return matchesSearch && matchesStatus && matchesPlan && matchesLicense;
    });
  }, [state.organizations, orgSearchTerm, orgStatusFilter, orgPlanFilter, orgLicenseFilter]);

  // Filtered Platform Admins
  const filteredPlatformAdmins = useMemo(() => {
    return (state.platformAdmins || []).filter((adm) => {
      const matchesSearch =
        adm.adminName.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
        adm.email.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
        adm.id.toLowerCase().includes(adminSearchTerm.toLowerCase());

      const matchesRole = adminRoleFilter === 'All' || adm.role === adminRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [state.platformAdmins, adminSearchTerm, adminRoleFilter]);

  // Toggle Organization Active / Suspended
  const handleToggleOrgStatus = (org: M46OrganizationRecord) => {
    const isCurrentlyActive = org.status === 'Active (Sim)';
    const nextStatus: M46OrgStatus = isCurrentlyActive ? 'Suspended (Sim)' : 'Active (Sim)';
    const nextLicenseStatus: M46LicenseStatus = isCurrentlyActive ? 'Suspended (Sim)' : 'Active (Sim)';

    const updatedOrgs = state.organizations.map((o) => {
      if (o.id === org.id) {
        return {
          ...o,
          status: nextStatus,
          subscription: {
            ...o.subscription,
            licenseStatus: nextLicenseStatus,
          },
        };
      }
      return o;
    });

    const updatedLogs = appendAuditLog(
      'ORG_STATUS_CHANGE',
      org.id,
      `Organization [${org.name}] status toggled to ${nextStatus}. Simulated license set to ${nextLicenseStatus}.`,
      state.auditLogs
    );

    persistState({
      ...state,
      organizations: updatedOrgs,
      auditLogs: updatedLogs,
    });

    if (selectedOrg?.id === org.id) {
      setSelectedOrg({
        ...selectedOrg,
        status: nextStatus,
        subscription: {
          ...selectedOrg.subscription,
          licenseStatus: nextLicenseStatus,
        },
      });
    }

    showToast(`Organization "${org.name}" status updated to ${nextStatus}.`, 'success');
  };

  // Open Licensing Modal
  const handleOpenLicensingModal = (org: M46OrganizationRecord) => {
    setLicensingOrg(org);
    setLicenseFormData({
      planTier: org.subscription.planTier,
      billingCycle: org.subscription.billingCycle,
      autoRenew: org.subscription.autoRenew,
      monthsToAdd: 12,
    });
  };

  // Save Organization Subscription & Renewal
  const handleSaveOrgSubscription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!licensingOrg) return;

    const feeMap: Record<M46PlanTier, number> = {
      Starter: 4999,
      'Ministry Pro': 12499,
      'Enterprise Multi-Campus': 29999,
    };

    const currentExpiry = new Date(licensingOrg.subscription.expiryDate);
    const validExpiry = isNaN(currentExpiry.getTime()) ? new Date() : currentExpiry;
    validExpiry.setMonth(validExpiry.getMonth() + (licenseFormData.monthsToAdd || 12));
    const newExpiryDate = validExpiry.toISOString().split('T')[0];

    const updatedOrgs = state.organizations.map((o) => {
      if (o.id === licensingOrg.id) {
        return {
          ...o,
          subscription: {
            ...o.subscription,
            planTier: licenseFormData.planTier,
            billingCycle: licenseFormData.billingCycle,
            autoRenew: licenseFormData.autoRenew,
            expiryDate: newExpiryDate,
            licenseStatus: 'Active (Sim)' as M46LicenseStatus,
            simulatedMonthlyFeeINR: feeMap[licenseFormData.planTier],
          },
        };
      }
      return o;
    });

    const updatedLogs = appendAuditLog(
      'ORG_LICENSE_RENEW',
      licensingOrg.id,
      `Updated plan to ${licenseFormData.planTier} (${licenseFormData.billingCycle}). Extended validity to ${newExpiryDate}.`,
      state.auditLogs
    );

    persistState({
      ...state,
      organizations: updatedOrgs,
      auditLogs: updatedLogs,
    });

    if (selectedOrg?.id === licensingOrg.id) {
      setSelectedOrg({
        ...selectedOrg,
        subscription: {
          ...selectedOrg.subscription,
          planTier: licenseFormData.planTier,
          billingCycle: licenseFormData.billingCycle,
          autoRenew: licenseFormData.autoRenew,
          expiryDate: newExpiryDate,
          licenseStatus: 'Active (Sim)' as M46LicenseStatus,
          simulatedMonthlyFeeINR: feeMap[licenseFormData.planTier],
        },
      });
    }

    setLicensingOrg(null);
    showToast(`Subscription for "${licensingOrg.name}" successfully updated & renewed.`, 'success');
  };

  // Add Platform Administrator
  const handleOpenAddAdminModal = () => {
    setAdminFormData({
      adminName: '',
      email: '',
      role: 'admin',
      twoFactorEnabled: true,
    });
    setAdminFormErrors({});
    setShowAddAdminModal(true);
  };

  const handleCreatePlatformAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!adminFormData.adminName.trim()) {
      errors.adminName = 'Administrator full name is required.';
    }
    if (!adminFormData.email.trim() || !adminFormData.email.includes('@')) {
      errors.email = 'Valid administrative email address is required.';
    } else {
      const emailExists = state.platformAdmins.some(
        (a) => a.email.toLowerCase() === adminFormData.email.trim().toLowerCase()
      );
      if (emailExists) {
        errors.email = 'An administrator with this email address already exists.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setAdminFormErrors(errors);
      return;
    }

    const nextIdNum = state.platformAdmins.length + 1;
    const newAdmin: M46PlatformAdminUser = {
      id: `SA-PLATFORM-${String(nextIdNum).padStart(2, '0')}`,
      adminName: adminFormData.adminName.trim(),
      email: adminFormData.email.trim().toLowerCase(),
      role: adminFormData.role,
      status: 'Active (Sim)',
      twoFactorEnabled: adminFormData.twoFactorEnabled,
      assignedDate: new Date().toISOString().split('T')[0],
      lastLogin: 'Never (Pending First Login)',
      isPrimaryRootAdmin: false,
    };

    const updatedAdmins = [...state.platformAdmins, newAdmin];
    const updatedLogs = appendAuditLog(
      'PLATFORM_ADMIN_ADDED',
      newAdmin.id,
      `Enrolled new platform administrator "${newAdmin.adminName}" (${newAdmin.role}).`,
      state.auditLogs
    );

    persistState({
      ...state,
      platformAdmins: updatedAdmins,
      auditLogs: updatedLogs,
    });

    setShowAddAdminModal(false);
    showToast(`Platform administrator "${newAdmin.adminName}" added successfully.`, 'success');
  };

  // Edit Platform Administrator
  const handleOpenEditAdminModal = (admin: M46PlatformAdminUser) => {
    setEditingAdmin(admin);
    setAdminFormData({
      adminName: admin.adminName,
      email: admin.email,
      role: admin.role,
      twoFactorEnabled: admin.twoFactorEnabled,
    });
    setAdminFormErrors({});
  };

  const handleUpdatePlatformAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;

    const errors: Record<string, string> = {};
    if (!adminFormData.adminName.trim()) {
      errors.adminName = 'Administrator name is required.';
    }

    if (Object.keys(errors).length > 0) {
      setAdminFormErrors(errors);
      return;
    }

    if (editingAdmin.isPrimaryRootAdmin && adminFormData.role !== 'superadmin') {
      showToast('Primary Root Super Admin must retain the "superadmin" role.', 'error');
      return;
    }

    const updatedAdmins = state.platformAdmins.map((a) => {
      if (a.id === editingAdmin.id) {
        return {
          ...a,
          adminName: adminFormData.adminName.trim(),
          role: editingAdmin.isPrimaryRootAdmin ? 'superadmin' : adminFormData.role,
          twoFactorEnabled: adminFormData.twoFactorEnabled,
        };
      }
      return a;
    });

    const updatedLogs = appendAuditLog(
      'PLATFORM_ADMIN_UPDATED',
      editingAdmin.id,
      `Updated platform administrator profile for "${adminFormData.adminName}".`,
      state.auditLogs
    );

    persistState({
      ...state,
      platformAdmins: updatedAdmins,
      auditLogs: updatedLogs,
    });

    setEditingAdmin(null);
    showToast(`Administrator "${editingAdmin.adminName}" updated successfully.`, 'success');
  };

  // Suspend / Reactivate Platform Administrator
  const handleConfirmSuspendAdmin = () => {
    if (!suspendingAdmin) return;

    if (suspendingAdmin.isPrimaryRootAdmin) {
      showToast('Action Denied: Primary Root Super Admin cannot be suspended under platform security invariants.', 'error');
      setSuspendingAdmin(null);
      return;
    }

    const isCurrentlyActive = suspendingAdmin.status === 'Active (Sim)';
    const nextStatus = isCurrentlyActive ? 'Suspended (Sim)' : 'Active (Sim)';

    const updatedAdmins = state.platformAdmins.map((a) => {
      if (a.id === suspendingAdmin.id) {
        return {
          ...a,
          status: nextStatus as 'Active (Sim)' | 'Suspended (Sim)',
        };
      }
      return a;
    });

    const updatedLogs = appendAuditLog(
      isCurrentlyActive ? 'PLATFORM_ADMIN_SUSPENDED' : 'PLATFORM_ADMIN_REACTIVATED',
      suspendingAdmin.id,
      `Platform administrator "${suspendingAdmin.adminName}" status changed to ${nextStatus}.`,
      state.auditLogs
    );

    persistState({
      ...state,
      platformAdmins: updatedAdmins,
      auditLogs: updatedLogs,
    });

    showToast(`Administrator "${suspendingAdmin.adminName}" is now ${nextStatus}.`, 'success');
    setSuspendingAdmin(null);
  };

  // Revoke Platform Administrator
  const handleConfirmRevokeAdmin = () => {
    if (!revokingAdmin) return;

    if (revokingAdmin.isPrimaryRootAdmin) {
      showToast('Action Denied: Primary Root Super Admin cannot be revoked or deleted under platform security invariants.', 'error');
      setRevokingAdmin(null);
      return;
    }

    const adminToRevoke = revokingAdmin;
    const updatedAdmins = state.platformAdmins.filter((a) => a.id !== adminToRevoke.id);

    const updatedLogs = appendAuditLog(
      'PLATFORM_ADMIN_REVOKED',
      adminToRevoke.id,
      `Permanently revoked platform administrator credentials for "${adminToRevoke.adminName}".`,
      state.auditLogs
    );

    persistState({
      ...state,
      platformAdmins: updatedAdmins,
      auditLogs: updatedLogs,
    });

    showToast(`Administrator "${adminToRevoke.adminName}" revoked successfully.`, 'success');
    setRevokingAdmin(null);
  };

  return (
    <AdminNavigationShell>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Toast / Notification Banner */}
        {notification && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between animate-fadeIn ${
              notification.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : notification.type === 'error'
                ? 'bg-red-500/10 border-red-500/30 text-red-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
          >
            <div className="flex items-center gap-3">
              {notification.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
              {notification.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />}
              {notification.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />}
              <span className="text-sm font-medium">{notification.text}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-xs text-slate-400 hover:text-white underline ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* =========================================================================
            HEADER & HERO SECTION
            ========================================================================= */}
        <div className="bg-[#0B192C] text-white p-6 md:p-8 rounded-2xl shadow-xl border border-slate-800/80 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute right-32 -bottom-12 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  Wave 7C · Phase 9
                </span>
                <span className="px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  Layer A Simulation
                </span>
                <span
                  className={`px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase rounded-full border ${
                    isSuperAdmin
                      ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                      : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                  }`}
                >
                  {isSuperAdmin ? 'Role: Super Admin' : 'Role: Admin'}
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                <Settings className="w-7 h-7 text-[#C89D35]" />
                <span>Church Branches, Settings & Platform Console</span>
              </h1>
              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                Centralized campus governance, sanctuary operations, administrative support desk, and platform-level super admin console under synthetic demonstration persistence.
              </p>
            </div>

            {/* Data Safety Notice Badge (Reset All intentionally omitted to protect M46 records) */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 text-emerald-300 border border-emerald-500/30">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Area A &amp; Platform Data Protected</span>
            </div>
          </div>

          {/* Active Campus & Simulation Notice Bar */}
          <div className="mt-6 pt-5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Active Demo Branch Context:{' '}
                <strong className="text-slate-200 font-semibold">{activeBranchName}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Storage Key: <code className="text-amber-300/90 font-mono">@rhema_admin_m46_settings</code></span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            ROLE-AWARE NAVIGATION TABS
            ========================================================================= */}
        <div className="flex border-b border-slate-200 bg-white px-3 pt-2 rounded-xl shadow-sm overflow-x-auto">
          {availableTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-4 py-3 text-xs md:text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${
                  isActive
                    ? 'border-[#1E6F43] text-[#1E6F43] bg-emerald-50/50'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#1E6F43]' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.tag && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      tab.tag.includes('Super Admin')
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {tab.tag}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* =========================================================================
            TAB CONTENTS
            ========================================================================= */}
        <div className="space-y-6">
          {/* =====================================================================
              TAB A: CHURCH BRANCH MANAGEMENT (SUB-PHASE 9.2 FULL IMPLEMENTATION)
              ===================================================================== */}
          {activeTab === 'branches' && (
            <div className="space-y-6">
              {!isSuperAdmin ? (
                <div className="p-6 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-4">
                  <ShieldAlert className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-red-900">Access Restricted</h3>
                    <p className="text-xs text-red-700 mt-1">
                      Church Branch Management is restricted to Super Administrators. Please switch to Church Settings or Support Desk.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Area A On Hold Banner (Client-Priority Directive) */}
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-3">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold">Feature On Hold (Client Directive):</strong> Multi-Campus / Sub-Branches Management is currently on hold per client priority update. All existing baseline campuses and functionality remain intact and operational for future activation.
                    </div>
                  </div>

                  {/* Area A Header & Action Bar */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#1E6F43] shrink-0">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold text-slate-900">Area A: Church Branch Management</h2>
                          <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 rounded-full border border-purple-200">
                            Super Admin Console
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Multi-campus lifecycle management, primary sanctuary designation, pastoral assignments, and member allocations.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleOpenCreateModal}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#1E6F43] hover:bg-[#165534] transition-all shadow-sm active:scale-95 shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add New Campus</span>
                    </button>
                  </div>

                  {/* Area A KPI Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Campuses</p>
                      <h4 className="text-2xl font-black text-slate-900 mt-1">{kpis.totalCampuses}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">All registered facilities</p>
                    </div>

                    <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Campuses</p>
                      <h4 className="text-2xl font-black text-emerald-700 mt-1">{kpis.activeCampuses}</h4>
                      <p className="text-[11px] text-emerald-600 mt-0.5">Operating sanctuaries</p>
                    </div>

                    <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Planning Stage</p>
                      <h4 className="text-2xl font-black text-amber-600 mt-1">{kpis.planningCampuses}</h4>
                      <p className="text-[11px] text-amber-600 mt-0.5">Under development</p>
                    </div>

                    <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Inactive / Archived</p>
                      <h4 className="text-2xl font-black text-slate-600 mt-1">{kpis.inactiveOrArchived}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Paused or decommissioned</p>
                    </div>

                    <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Congregation Size</p>
                      <h4 className="text-2xl font-black text-blue-700 mt-1">{kpis.totalMembership.toLocaleString()}</h4>
                      <p className="text-[11px] text-blue-600 mt-0.5">Members across active campuses</p>
                    </div>
                  </div>

                  {/* Search and Filters Bar */}
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={branchSearchTerm}
                        onChange={(e) => setBranchSearchTerm(e.target.value)}
                        placeholder="Search campuses by name, code, locality, address, or pastor..."
                        className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#1E6F43] focus:border-transparent bg-slate-50 focus:bg-white transition-all text-slate-800"
                      />
                      {branchSearchTerm && (
                        <button
                          onClick={() => setBranchSearchTerm('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                      {(['All', 'Active (Sim)', 'Planning Stage (Sim)', 'Inactive (Sim)', 'Archived (Sim)'] as const).map(
                        (status) => {
                          const isSelected = branchStatusFilter === status;
                          return (
                            <button
                              key={status}
                              onClick={() => setBranchStatusFilter(status)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                                isSelected
                                  ? 'bg-[#1E6F43] text-white shadow-sm'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                              }`}
                            >
                              {status === 'All' ? 'All Campuses' : status.replace(' (Sim)', '')}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>

                  {/* Branch Cards Grid */}
                  {filteredBranches.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">No campuses found</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        No church branch records matched your search query or filter criteria.
                      </p>
                      <button
                        onClick={() => {
                          setBranchSearchTerm('');
                          setBranchStatusFilter('All');
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#1E6F43] hover:bg-emerald-50 border border-emerald-200"
                      >
                        Clear Filters
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {filteredBranches.map((branch) => {
                        const isMain = branch.isMainSanctuary;
                        return (
                          <div
                            key={branch.id}
                            className={`p-5 rounded-2xl border bg-white shadow-sm transition-all flex flex-col justify-between ${
                              isMain
                                ? 'border-amber-300 ring-2 ring-amber-400/20 shadow-amber-500/5'
                                : branch.status === 'Archived (Sim)'
                                ? 'border-slate-200 bg-slate-50/70 opacity-80'
                                : 'border-slate-200 hover:border-emerald-300'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-mono font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                                    {branch.code}
                                  </span>
                                  {isMain && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                      <Star className="w-3 h-3 fill-amber-500 text-amber-600" />
                                      Main Sanctuary
                                    </span>
                                  )}
                                </div>

                                <span
                                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                                    branch.status === 'Active (Sim)'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : branch.status === 'Planning Stage (Sim)'
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : branch.status === 'Inactive (Sim)'
                                      ? 'bg-slate-100 text-slate-700 border-slate-300'
                                      : 'bg-red-50 text-red-700 border-red-200'
                                  }`}
                                >
                                  {branch.status}
                                </span>
                              </div>

                              <h3 className="text-base font-bold text-slate-900 mt-3 tracking-tight">
                                {branch.name}
                              </h3>
                              <p className="text-xs font-medium text-emerald-800 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                                <span>{branch.locality}</span>
                              </p>

                              <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                                {branch.address}
                              </p>

                              <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400">Pastor:</span>
                                  <span className="font-semibold text-slate-800">{branch.seniorPastor}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400">Contact:</span>
                                  <span className="font-mono text-slate-700 text-[11px]">{branch.contactPhone}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400">Members:</span>
                                  <span className="font-bold text-[#1E6F43]">
                                    {branch.activeMembersCount.toLocaleString()} believers
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
                              <button
                                onClick={() => setViewingBranch(branch)}
                                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                                title="View Campus Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleOpenEditModal(branch)}
                                className="p-2 rounded-xl text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                                title="Edit Campus"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleToggleBranchStatus(branch)}
                                disabled={branch.isMainSanctuary && branch.status === 'Active (Sim)'}
                                className={`p-2 rounded-xl transition-colors ${
                                  branch.status === 'Active (Sim)'
                                    ? 'text-emerald-600 hover:text-amber-600 hover:bg-amber-50'
                                    : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                                } ${branch.isMainSanctuary ? 'opacity-40 cursor-not-allowed' : ''}`}
                                title={
                                  branch.isMainSanctuary
                                    ? 'Main Sanctuary cannot be deactivated'
                                    : branch.status === 'Active (Sim)'
                                    ? 'Deactivate Campus'
                                    : 'Activate Campus'
                                }
                              >
                                {branch.status === 'Active (Sim)' ? (
                                  <CheckCircle className="w-4 h-4" />
                                ) : (
                                  <XCircle className="w-4 h-4" />
                                )}
                              </button>

                              <button
                                onClick={() => handleSetMainSanctuary(branch)}
                                disabled={branch.isMainSanctuary}
                                className={`p-2 rounded-xl transition-colors ${
                                  branch.isMainSanctuary
                                    ? 'text-amber-500 cursor-default'
                                    : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'
                                }`}
                                title={
                                  branch.isMainSanctuary
                                    ? 'Currently designated as primary Main Sanctuary'
                                    : 'Designate as Primary Main Sanctuary'
                                }
                              >
                                <Star className={`w-4 h-4 ${branch.isMainSanctuary ? 'fill-amber-400' : ''}`} />
                              </button>

                              <button
                                onClick={() => handleArchiveBranch(branch)}
                                disabled={branch.isMainSanctuary || branch.status === 'Archived (Sim)'}
                                className={`p-2 rounded-xl transition-colors text-slate-400 hover:text-slate-700 hover:bg-slate-100 ${
                                  branch.isMainSanctuary || branch.status === 'Archived (Sim)'
                                    ? 'opacity-30 cursor-not-allowed'
                                    : ''
                                }`}
                                title={branch.isMainSanctuary ? 'Main Sanctuary cannot be archived' : 'Archive Campus'}
                              >
                                <Archive className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => setDeletingBranch(branch)}
                                disabled={branch.isMainSanctuary}
                                className={`p-2 rounded-xl transition-colors ${
                                  branch.isMainSanctuary
                                    ? 'opacity-20 cursor-not-allowed text-slate-300'
                                    : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                }`}
                                title={
                                  branch.isMainSanctuary
                                    ? 'Main Sanctuary is protected from deletion'
                                    : 'Delete Campus'
                                }
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Simulated Audit Trail for Branch Actions */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#1E6F43]" />
                        <h3 className="text-sm font-bold text-slate-900">Branch Operations Audit Log</h3>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        {state.auditLogs.filter((l) => l.action.startsWith('BRANCH_') || l.action === 'MAIN_SANCTUARY_DESIGNATE').length} recorded actions
                      </span>
                    </div>

                    <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                      {state.auditLogs
                        .filter((l) => l.action.startsWith('BRANCH_') || l.action === 'MAIN_SANCTUARY_DESIGNATE')
                        .map((log) => (
                          <div
                            key={log.id}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start justify-between text-xs gap-3"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                  {log.action}
                                </span>
                                <span className="font-bold text-slate-800">{log.target}</span>
                              </div>
                              <p className="text-slate-600 text-[11px]">{log.details}</p>
                            </div>
                            <div className="text-right shrink-0 text-[10px] text-slate-400">
                              <span>{log.timestamp}</span>
                              <p className="text-slate-500">{log.actor}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =====================================================================
              TAB B: CHURCH GENERAL & CAMPUS SETTINGS (SUB-PHASE 9.3 FULL IMPLEMENTATION)
              ===================================================================== */}
          {activeTab === 'church-settings' && (
            <div className="space-y-6">
              {/* Area B Header & Action Bar */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                    <Sliders className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900">Area B: Church General & Campus Settings</h2>
                      <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 rounded-full border border-blue-200">
                        Admin & Super Admin
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configure church profile, visual branding, canonical service schedules, simulated geofencing, regional preferences, and notification defaults.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setResetModalMode('settings')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Reset Settings</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveChurchSettings}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#1E6F43] hover:bg-[#165534] shadow-sm transition-all active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save All Settings</span>
                  </button>
                </div>
              </div>

              {/* Area B Main Settings Form Grid */}
              <form onSubmit={handleSaveChurchSettings} className="space-y-6">
                {/* SECTION 1: Church Profile & Leadership */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#1E6F43]" />
                      <h3 className="text-sm font-bold text-slate-900">1. Church Profile & Leadership Dossier</h3>
                    </div>
                    <span className="text-[11px] text-slate-400">Core organizational identity</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Official Ministry Name *</label>
                      <input
                        type="text"
                        value={settingsFormData.churchName}
                        onChange={(e) => setSettingsFormData({ ...settingsFormData, churchName: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43]"
                      />
                      {settingsErrors.churchName && <p className="text-[11px] text-red-600">{settingsErrors.churchName}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Tagline / Motto *</label>
                      <input
                        type="text"
                        value={settingsFormData.tagline}
                        onChange={(e) => setSettingsFormData({ ...settingsFormData, tagline: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43]"
                      />
                      {settingsErrors.tagline && <p className="text-[11px] text-red-600">{settingsErrors.tagline}</p>}
                    </div>

                    <div className="md:col-span-2 space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Mission & Ministry Description *</label>
                      <textarea
                        rows={2}
                        value={settingsFormData.churchDescription}
                        onChange={(e) =>
                          setSettingsFormData({ ...settingsFormData, churchDescription: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Primary Contact Phone *</label>
                      <input
                        type="text"
                        value={settingsFormData.primaryContactPhone}
                        onChange={(e) =>
                          setSettingsFormData({ ...settingsFormData, primaryContactPhone: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43]"
                      />
                      {settingsErrors.primaryContactPhone && (
                        <p className="text-[11px] text-red-600">{settingsErrors.primaryContactPhone}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Pastoral Support Email *</label>
                      <input
                        type="email"
                        value={settingsFormData.pastoralSupportEmail}
                        onChange={(e) =>
                          setSettingsFormData({ ...settingsFormData, pastoralSupportEmail: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43]"
                      />
                      {settingsErrors.pastoralSupportEmail && (
                        <p className="text-[11px] text-red-600">{settingsErrors.pastoralSupportEmail}</p>
                      )}
                    </div>

                    <div className="md:col-span-2 space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Central Sanctuary Physical Address *</label>
                      <input
                        type="text"
                        value={settingsFormData.physicalAddress}
                        onChange={(e) => setSettingsFormData({ ...settingsFormData, physicalAddress: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43]"
                      />
                      {settingsErrors.physicalAddress && (
                        <p className="text-[11px] text-red-600">{settingsErrors.physicalAddress}</p>
                      )}
                    </div>

                    {/* Synthetic Leadership Dossier */}
                    <div className="md:col-span-2 pt-2 border-t border-slate-100">
                      <p className="text-xs font-semibold text-slate-700 mb-2">Church Pastor & Executive Leadership Dossier (Demo)</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Senior Pastor</p>
                          <p className="text-xs font-bold text-slate-800">Senior Pastor John Mark (Demo)</p>
                          <p className="text-[11px] text-slate-500">pastor.johnmark@rhema-demo.org</p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Executive Pastor</p>
                          <p className="text-xs font-bold text-slate-800">Executive Pastor Samuel (Demo)</p>
                          <p className="text-[11px] text-slate-500">executive.pastor@rhema-demo.org</p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Lead Administrator</p>
                          <p className="text-xs font-bold text-slate-800">Deacon Peter (Lead Administrator)</p>
                          <p className="text-[11px] text-slate-500">admin.desk@rhema-demo.org</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: Branding Settings & Live Visual Preview */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Palette className="w-4 h-4 text-[#C89D35]" />
                      <h3 className="text-sm font-bold text-slate-900">2. Visual Brand Identity & Color Theme</h3>
                    </div>
                    <span className="text-[11px] text-slate-400">Theme preview & color customization</span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Color Inputs */}
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">Primary Brand Color (Forest Green)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={settingsFormData.primaryColor}
                            onChange={(e) => setSettingsFormData({ ...settingsFormData, primaryColor: e.target.value })}
                            className="w-9 h-9 rounded-xl border border-slate-200 p-0.5 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={settingsFormData.primaryColor}
                            onChange={(e) => setSettingsFormData({ ...settingsFormData, primaryColor: e.target.value })}
                            className="flex-1 px-3 py-2 text-xs font-mono uppercase rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43]"
                          />
                        </div>
                        {settingsErrors.primaryColor && (
                          <p className="text-[11px] text-red-600">{settingsErrors.primaryColor}</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">Secondary Accent Color (Gold)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={settingsFormData.secondaryColor}
                            onChange={(e) =>
                              setSettingsFormData({ ...settingsFormData, secondaryColor: e.target.value })
                            }
                            className="w-9 h-9 rounded-xl border border-slate-200 p-0.5 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={settingsFormData.secondaryColor}
                            onChange={(e) =>
                              setSettingsFormData({ ...settingsFormData, secondaryColor: e.target.value })
                            }
                            className="flex-1 px-3 py-2 text-xs font-mono uppercase rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43]"
                          />
                        </div>
                        {settingsErrors.secondaryColor && (
                          <p className="text-[11px] text-red-600">{settingsErrors.secondaryColor}</p>
                        )}
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                        {/* Local SVG Church Cross Logo */}
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                          style={{ backgroundColor: settingsFormData.primaryColor }}
                        >
                          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                              d="M12 2V22M7 8H17"
                              stroke={settingsFormData.secondaryColor}
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            />
                            <circle cx="12" cy="8" r="1.5" fill="#FFFFFF" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">Rhema Crest Logo</p>
                          <p className="text-[11px] text-slate-500">Vector SVG placeholder</p>
                        </div>
                      </div>
                    </div>

                    {/* Live Branding Preview Card */}
                    <div className="lg:col-span-2 p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-semibold uppercase tracking-wider text-[10px]">Live Branding Preview</span>
                        <span className="font-mono text-[10px]">Header Simulation</span>
                      </div>

                      {/* Mock Header Banner */}
                      <div
                        className="p-5 rounded-xl text-white shadow-md transition-all flex flex-col justify-between min-h-[140px]"
                        style={{ backgroundColor: settingsFormData.primaryColor }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-black/20 flex items-center justify-center backdrop-blur-sm">
                              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                                <path
                                  d="M12 2V22M7 8H17"
                                  stroke={settingsFormData.secondaryColor}
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                />
                              </svg>
                            </div>
                            <div>
                              <h4 className="font-extrabold text-base tracking-tight">{settingsFormData.churchName}</h4>
                              <p className="text-xs opacity-90 italic">&ldquo;{settingsFormData.tagline}&rdquo;</p>
                            </div>
                          </div>
                          <span
                            className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                            style={{ backgroundColor: settingsFormData.secondaryColor, color: '#0B192C' }}
                          >
                            Member Portal
                          </span>
                        </div>

                        <div className="pt-4 border-t border-white/20 flex items-center justify-between text-[11px] opacity-90">
                          <span>{settingsFormData.city} · Central Sanctuary</span>
                          <span>{settingsFormData.primaryContactPhone}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 3: Service Schedule Settings (The 4 Canonical Slots) */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      <h3 className="text-sm font-bold text-slate-900">3. Canonical Service Schedule Settings</h3>
                    </div>
                    <span className="text-[11px] text-slate-400">4 Canonical Worship Slots</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(settingsFormData.services || []).map((slot) => (
                      <div
                        key={slot.id}
                        className="p-4 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              {slot.day} · {slot.time}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenEditService(slot)}
                              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm mt-2">{slot.name}</h4>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{slot.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SECTION 4: Campus Configuration & Simulated Geofence Parameters */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Compass className="w-4 h-4 text-blue-600" />
                      <h3 className="text-sm font-bold text-slate-900">4. Campus Geofence & Engine Synchronization</h3>
                    </div>
                    <span className="text-[11px] text-slate-400">Attendance boundary & engine sync</span>
                  </div>

                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-start gap-3">
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Layer A Simulated Settings Notice:</strong> Sanctuary coordinates and geofence radius define the mathematical boundary parameters for simulated QR attendance (M15). No live GPS hardware is tracked or enforced.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Geofence Radius (Meters) *</label>
                      <input
                        type="number"
                        min={25}
                        max={1000}
                        value={settingsFormData.attendanceGeofenceRadiusMeters}
                        onChange={(e) =>
                          setSettingsFormData({
                            ...settingsFormData,
                            attendanceGeofenceRadiusMeters: parseInt(e.target.value, 10) || 100,
                          })
                        }
                        className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43]"
                      />
                      <p className="text-[10px] text-slate-500">Allowed range: 25m – 1000m (Default: 100m)</p>
                      {settingsErrors.attendanceGeofenceRadiusMeters && (
                        <p className="text-[11px] text-red-600">{settingsErrors.attendanceGeofenceRadiusMeters}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Sanctuary Latitude *</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={settingsFormData.sanctuaryLatitude}
                        onChange={(e) =>
                          setSettingsFormData({
                            ...settingsFormData,
                            sanctuaryLatitude: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43]"
                      />
                      <p className="text-[10px] text-slate-500">Bangalore Central Sanctuary: 12.9716</p>
                      {settingsErrors.sanctuaryLatitude && (
                        <p className="text-[11px] text-red-600">{settingsErrors.sanctuaryLatitude}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Sanctuary Longitude *</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={settingsFormData.sanctuaryLongitude}
                        onChange={(e) =>
                          setSettingsFormData({
                            ...settingsFormData,
                            sanctuaryLongitude: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43]"
                      />
                      <p className="text-[10px] text-slate-500">Bangalore Central Sanctuary: 77.5946</p>
                      {settingsErrors.sanctuaryLongitude && (
                        <p className="text-[11px] text-red-600">{settingsErrors.sanctuaryLongitude}</p>
                      )}
                    </div>
                  </div>

                  {/* Engine Toggles */}
                  <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={settingsFormData.dailyVerseEngineSyncEnabled}
                        onChange={(e) =>
                          setSettingsFormData({
                            ...settingsFormData,
                            dailyVerseEngineSyncEnabled: e.target.checked,
                          })
                        }
                        className="rounded text-[#1E6F43] focus:ring-[#1E6F43] w-4 h-4"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-800">Daily Verse Engine Sync (M29)</p>
                        <p className="text-[11px] text-slate-500">Synchronize daily promises with 5,863 verses</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={settingsFormData.dailyQuizEngineSyncEnabled}
                        onChange={(e) =>
                          setSettingsFormData({
                            ...settingsFormData,
                            dailyQuizEngineSyncEnabled: e.target.checked,
                          })
                        }
                        className="rounded text-[#1E6F43] focus:ring-[#1E6F43] w-4 h-4"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-800">Bible Quiz Studio Sync (M32)</p>
                        <p className="text-[11px] text-slate-500">Automate daily quiz publishing to member portals</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* SECTION 5: Language & Regional Preferences */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-purple-600" />
                      <h3 className="text-sm font-bold text-slate-900">5. Language and Regional Preferences</h3>
                    </div>
                    <span className="text-[11px] text-slate-400">Localization defaults</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Default Language</label>
                      <select
                        value={settingsFormData.defaultLanguage}
                        onChange={(e) => setSettingsFormData({ ...settingsFormData, defaultLanguage: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43] bg-white"
                      >
                        <option value="English">English</option>
                        <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                        <option value="Tamil">Tamil (தமிழ்)</option>
                        <option value="Telugu">Telugu (తెలుగు)</option>
                        <option value="Hindi">Hindi (हिन्दी)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Time Zone</label>
                      <select
                        value={settingsFormData.timeZone}
                        onChange={(e) => setSettingsFormData({ ...settingsFormData, timeZone: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43] bg-white"
                      >
                        <option value="Asia/Kolkata (IST, UTC+05:30)">Asia/Kolkata (IST, UTC+05:30)</option>
                        <option value="UTC (UTC+00:00)">UTC (UTC+00:00)</option>
                        <option value="America/New_York (EST, UTC-05:00)">America/New_York (EST)</option>
                        <option value="Europe/London (GMT, UTC+00:00)">Europe/London (GMT)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Date Format</label>
                      <select
                        value={settingsFormData.dateFormat}
                        onChange={(e) => setSettingsFormData({ ...settingsFormData, dateFormat: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43] bg-white"
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY (Indian Standard)</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY (US Standard)</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Financial Currency</label>
                      <input
                        type="text"
                        value={settingsFormData.currency}
                        onChange={(e) => setSettingsFormData({ ...settingsFormData, currency: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43]"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 6: Notification Preferences */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-500" />
                      <h3 className="text-sm font-bold text-slate-900">6. Administrative Notification Preferences</h3>
                    </div>
                    <span className="text-[11px] text-slate-400">Communication & dispatch toggles</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settingsFormData.notificationPreferences?.emailEnabled ?? true}
                        onChange={(e) =>
                          setSettingsFormData({
                            ...settingsFormData,
                            notificationPreferences: {
                              ...settingsFormData.notificationPreferences,
                              emailEnabled: e.target.checked,
                            },
                          })
                        }
                        className="rounded text-[#1E6F43] focus:ring-[#1E6F43] w-4 h-4"
                      />
                      <span className="text-xs font-semibold text-slate-800">Email Dispatches</span>
                    </label>

                    <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settingsFormData.notificationPreferences?.announcementsEnabled ?? true}
                        onChange={(e) =>
                          setSettingsFormData({
                            ...settingsFormData,
                            notificationPreferences: {
                              ...settingsFormData.notificationPreferences,
                              announcementsEnabled: e.target.checked,
                            },
                          })
                        }
                        className="rounded text-[#1E6F43] focus:ring-[#1E6F43] w-4 h-4"
                      />
                      <span className="text-xs font-semibold text-slate-800">Sunday Announcements</span>
                    </label>

                    <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settingsFormData.notificationPreferences?.eventsEnabled ?? true}
                        onChange={(e) =>
                          setSettingsFormData({
                            ...settingsFormData,
                            notificationPreferences: {
                              ...settingsFormData.notificationPreferences,
                              eventsEnabled: e.target.checked,
                            },
                          })
                        }
                        className="rounded text-[#1E6F43] focus:ring-[#1E6F43] w-4 h-4"
                      />
                      <span className="text-xs font-semibold text-slate-800">Event RSVP Alerts</span>
                    </label>

                    <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settingsFormData.notificationPreferences?.attendanceAlertsEnabled ?? true}
                        onChange={(e) =>
                          setSettingsFormData({
                            ...settingsFormData,
                            notificationPreferences: {
                              ...settingsFormData.notificationPreferences,
                              attendanceAlertsEnabled: e.target.checked,
                            },
                          })
                        }
                        className="rounded text-[#1E6F43] focus:ring-[#1E6F43] w-4 h-4"
                      />
                      <span className="text-xs font-semibold text-slate-800">QR Check-in Alerts</span>
                    </label>
                  </div>
                </div>

                {/* Final Form Actions Bar */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetModalMode('settings')}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Reset Settings to Default
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#1E6F43] hover:bg-[#165534] shadow-sm transition-all active:scale-95 flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save All Church Settings</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* =====================================================================
              TAB C: ADMINISTRATIVE SUPPORT DESK (SUB-PHASE 9.3 FULL IMPLEMENTATION)
              ===================================================================== */}
          {activeTab === 'support-desk' && (
            <div className="space-y-6">
              {/* Area C Header & Action Bar */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                    <LifeBuoy className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900">Area C: Administrative Support Desk</h2>
                      <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                        Helpdesk Operations
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Log, triage, resolve, and monitor operational support requests across technical issues, role access, QR attendance, and ministry logistics.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setResetModalMode('tickets')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Reset Queue</span>
                  </button>
                  <button
                    onClick={handleOpenCreateTicket}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#1E6F43] hover:bg-[#165534] transition-all shadow-sm active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Ticket</span>
                  </button>
                </div>
              </div>

              {/* Area C KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Tickets</p>
                  <h4 className="text-2xl font-black text-slate-900 mt-1">{state.tickets.length}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">All recorded requests</p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Open Queue</p>
                  <h4 className="text-2xl font-black text-amber-600 mt-1">{kpis.openTicketsCount}</h4>
                  <p className="text-[11px] text-amber-600 mt-0.5">Awaiting investigation</p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">In Progress</p>
                  <h4 className="text-2xl font-black text-blue-600 mt-1">{kpis.inProgressTicketsCount}</h4>
                  <p className="text-[11px] text-blue-600 mt-0.5">Assigned to team</p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Resolved / Closed</p>
                  <h4 className="text-2xl font-black text-emerald-700 mt-1">{kpis.resolvedOrClosedCount}</h4>
                  <p className="text-[11px] text-emerald-600 mt-0.5">Successfully concluded</p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Urgent Attention</p>
                  <h4 className="text-2xl font-black text-red-600 mt-1">{kpis.urgentTicketsCount}</h4>
                  <p className="text-[11px] text-red-600 mt-0.5">Critical priority queue</p>
                </div>
              </div>

              {/* Area C Search and Multi-Filter Controls */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={ticketSearchTerm}
                    onChange={(e) => setTicketSearchTerm(e.target.value)}
                    placeholder="Search tickets by ID, title, requester, description, or coordinator..."
                    className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#1E6F43] focus:border-transparent bg-slate-50 focus:bg-white transition-all text-slate-800"
                  />
                  {ticketSearchTerm && (
                    <button
                      onClick={() => setTicketSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Category Filter */}
                  <select
                    value={ticketCategoryFilter}
                    onChange={(e) => setTicketCategoryFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1E6F43]"
                  >
                    <option value="All">All Categories (5)</option>
                    <option value="Technical Issue">Technical Issue</option>
                    <option value="Account & Role Help">Account & Role Help</option>
                    <option value="Attendance & QR Check-in">Attendance & QR Check-in</option>
                    <option value="Ministry Operations">Ministry Operations</option>
                    <option value="General Feedback & Requests">General Feedback & Requests</option>
                  </select>

                  {/* Priority Filter */}
                  <select
                    value={ticketPriorityFilter}
                    onChange={(e) => setTicketPriorityFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1E6F43]"
                  >
                    <option value="All">All Priorities</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>

                  {/* Status Filter */}
                  <select
                    value={ticketStatusFilter}
                    onChange={(e) => setTicketStatusFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1E6F43]"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Open (Sim)">Open</option>
                    <option value="In Progress (Sim)">In Progress</option>
                    <option value="Resolved (Sim)">Resolved</option>
                    <option value="Closed (Sim)">Closed</option>
                  </select>
                </div>
              </div>

              {/* Tickets List */}
              {filteredTickets.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                    <LifeBuoy className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">No support tickets found</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    No tickets matched your search query or selected filter criteria.
                  </p>
                  <button
                    onClick={() => {
                      setTicketSearchTerm('');
                      setTicketCategoryFilter('All');
                      setTicketPriorityFilter('All');
                      setTicketStatusFilter('All');
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#1E6F43] hover:bg-emerald-50 border border-emerald-200"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTickets.map((ticket) => {
                    return (
                      <div
                        key={ticket.id}
                        className={`p-5 rounded-2xl border bg-white shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          ticket.status === 'Closed (Sim)'
                            ? 'opacity-70 bg-slate-50/60'
                            : ticket.priority === 'Urgent'
                            ? 'border-red-200 hover:border-red-300'
                            : 'border-slate-200 hover:border-emerald-300'
                        }`}
                      >
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              {ticket.id}
                            </span>
                            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700">
                              {ticket.category}
                            </span>
                            <span
                              className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                                ticket.priority === 'Urgent'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : ticket.priority === 'High'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : ticket.priority === 'Medium'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {ticket.priority} Priority
                            </span>
                            <span
                              className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                                ticket.status === 'Open (Sim)'
                                  ? 'bg-amber-100 text-amber-800'
                                  : ticket.status === 'In Progress (Sim)'
                                  ? 'bg-blue-100 text-blue-800'
                                  : ticket.status === 'Resolved (Sim)'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {ticket.status}
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-slate-900 tracking-tight">{ticket.title}</h3>

                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{ticket.description}</p>

                          <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-[11px] text-slate-500 pt-1">
                            <span>
                              Requested by <strong>{ticket.requesterName}</strong> ({ticket.requesterRole})
                            </span>
                            <span>•</span>
                            <span>Assigned to: <strong className="text-slate-700">{ticket.assignedTo}</strong></span>
                            <span>•</span>
                            <span>Logged: {ticket.createdAt}</span>
                          </div>
                        </div>

                        {/* Ticket Action Controls */}
                        <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                          {/* View Ticket Timeline */}
                          <button
                            onClick={() => setViewingTicket(ticket)}
                            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="View Ticket Details & Activity"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Quick Status Transitions */}
                          {ticket.status === 'Open (Sim)' && (
                            <button
                              onClick={() => handleUpdateTicketStatus(ticket, 'In Progress (Sim)')}
                              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                            >
                              Start Progress
                            </button>
                          )}

                          {ticket.status === 'In Progress (Sim)' && (
                            <button
                              onClick={() => handleUpdateTicketStatus(ticket, 'Resolved (Sim)')}
                              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                            >
                              Mark Resolved
                            </button>
                          )}

                          {ticket.status === 'Resolved (Sim)' && (
                            <button
                              onClick={() => setClosingTicket(ticket)}
                              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors"
                            >
                              Close Ticket
                            </button>
                          )}

                          {ticket.status === 'Closed (Sim)' && (
                            <button
                              onClick={() => handleUpdateTicketStatus(ticket, 'Open (Sim)')}
                              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
                            >
                              Reopen
                            </button>
                          )}

                          {/* Delete Ticket */}
                          <button
                            onClick={() => setDeletingTicket(ticket)}
                            className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete Ticket"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* =====================================================================
              TAB D: PLATFORM SUPER ADMIN CONSOLE & LICENSING (SUPER ADMIN ONLY)
              ===================================================================== */}
          {activeTab === 'platform-console' && (
            <div className="space-y-6">
              {!isSuperAdmin ? (
                <div className="p-6 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-4">
                  <ShieldAlert className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-red-900">Access Restricted</h3>
                    <p className="text-xs text-red-700 mt-1">
                      The Platform Super Admin Console is strictly reserved for Super Administrators. Please switch to Church Settings or Support Desk.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Area D Header & Action Bar */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold text-slate-900">Area D: Platform Super Admin Console & Licensing Studio</h2>
                          <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 rounded-full border border-purple-200">
                            Root Super Admin
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Multi-tenant organization registry, simulated subscription licensing, and platform administrator credential governance.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={handleOpenAddAdminModal}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 shadow-sm transition-all active:scale-95"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Add Platform Admin</span>
                      </button>
                    </div>
                  </div>

                  {/* Platform Overview KPI Cards (Section 3.A) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Registered Church Organizations */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Church Organizations</span>
                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                          <Building2 className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-extrabold text-slate-900">{kpis.totalOrganizations}</span>
                        <span className="text-xs text-slate-500">Registered</span>
                      </div>
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-emerald-700 font-semibold">{kpis.activeOrganizations} Active</span>
                        <span className="text-slate-500 font-medium">{kpis.suspendedOrganizations} Suspended</span>
                      </div>
                    </div>

                    {/* Subscription Distribution */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Subscription Tiers</span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                          <CreditCard className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-extrabold text-slate-900">
                          {kpis.enterpriseSubCount + kpis.proSubCount + kpis.starterSubCount}
                        </span>
                        <span className="text-xs text-slate-500">Active Licenses</span>
                      </div>
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                        <span>{kpis.enterpriseSubCount} Enterprise</span>
                        <span>{kpis.proSubCount} Pro</span>
                        <span>{kpis.starterSubCount} Starter</span>
                      </div>
                    </div>

                    {/* Licensing Health & Renewal Alerts */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Licensing Health</span>
                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-extrabold text-amber-600">{kpis.expiringLicensesCount}</span>
                        <span className="text-xs text-slate-500">Action Required</span>
                      </div>
                      <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 truncate">
                        Expiring Soon or Expired (Sim)
                      </div>
                    </div>

                    {/* Platform Administrators */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Platform Admins</span>
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-extrabold text-slate-900">{kpis.totalPlatformAdmins}</span>
                        <span className="text-xs text-slate-500">Enrolled</span>
                      </div>
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-purple-700 font-semibold">{kpis.superAdminCount} SuperAdmins</span>
                        <span className="text-emerald-700 font-medium">100% 2FA</span>
                      </div>
                    </div>
                  </div>

                  {/* Sub-Navigation Tabs within Area D */}
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                    <button
                      type="button"
                      onClick={() => setPlatformSubTab('organizations')}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        platformSubTab === 'organizations'
                          ? 'bg-purple-700 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      <span>Organizations & Licenses</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${platformSubTab === 'organizations' ? 'bg-purple-900 text-purple-200' : 'bg-slate-200 text-slate-700'}`}>
                        {state.organizations?.length || 0}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPlatformSubTab('admins')}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        platformSubTab === 'admins'
                          ? 'bg-purple-700 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Key className="w-4 h-4" />
                      <span>Platform Administrators</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${platformSubTab === 'admins' ? 'bg-purple-900 text-purple-200' : 'bg-slate-200 text-slate-700'}`}>
                        {state.platformAdmins.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPlatformSubTab('audit')}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        platformSubTab === 'audit'
                          ? 'bg-purple-700 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      <span>Platform Audit Trail</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${platformSubTab === 'audit' ? 'bg-purple-900 text-purple-200' : 'bg-slate-200 text-slate-700'}`}>
                        {state.auditLogs.length}
                      </span>
                    </button>
                  </div>

                  {/* SUB-VIEW 1: Organizations & Licenses (Section 3.B & Section 4) */}
                  {platformSubTab === 'organizations' && (
                    <div className="space-y-4">
                      {/* Search & Filter Bar */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
                        <div className="flex-1 relative">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={orgSearchTerm}
                            onChange={(e) => setOrgSearchTerm(e.target.value)}
                            placeholder="Search organizations by name, code, pastor, city, or email..."
                            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={orgStatusFilter}
                            onChange={(e) => setOrgStatusFilter(e.target.value as any)}
                            className="px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600 bg-white"
                          >
                            <option value="All">All Statuses</option>
                            <option value="Active (Sim)">Active (Sim)</option>
                            <option value="Suspended (Sim)">Suspended (Sim)</option>
                          </select>

                          <select
                            value={orgPlanFilter}
                            onChange={(e) => setOrgPlanFilter(e.target.value as any)}
                            className="px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600 bg-white"
                          >
                            <option value="All">All Plans</option>
                            <option value="Starter">Starter</option>
                            <option value="Ministry Pro">Ministry Pro</option>
                            <option value="Enterprise Multi-Campus">Enterprise Multi-Campus</option>
                          </select>

                          <select
                            value={orgLicenseFilter}
                            onChange={(e) => setOrgLicenseFilter(e.target.value as any)}
                            className="px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600 bg-white"
                          >
                            <option value="All">All Licenses</option>
                            <option value="Active (Sim)">Active (Sim)</option>
                            <option value="Expiring Soon (Sim)">Expiring Soon (Sim)</option>
                            <option value="Suspended (Sim)">Suspended (Sim)</option>
                            <option value="Expired (Sim)">Expired (Sim)</option>
                          </select>
                        </div>
                      </div>

                      {/* Organizations Directory Table / Cards */}
                      {filteredOrganizations.length === 0 ? (
                        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
                          <p className="text-sm font-semibold">No church organizations matched your filters.</p>
                          <p className="text-xs text-slate-400 mt-1">Try clearing search terms or status selections.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4">
                          {filteredOrganizations.map((org) => {
                            const isSuspended = org.status === 'Suspended (Sim)';
                            const isExpiring = org.subscription.licenseStatus === 'Expiring Soon (Sim)';
                            const isExpired = org.subscription.licenseStatus === 'Expired (Sim)';

                            return (
                              <div
                                key={org.id}
                                className={`p-5 rounded-2xl border bg-white shadow-sm transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                                  isSuspended
                                    ? 'border-slate-300 bg-slate-50/60 opacity-90'
                                    : isExpired
                                    ? 'border-red-300'
                                    : isExpiring
                                    ? 'border-amber-300'
                                    : 'border-slate-200 hover:border-purple-300'
                                }`}
                              >
                                <div className="space-y-2 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                                      {org.code}
                                    </span>
                                    <h4 className="font-extrabold text-slate-900 text-sm md:text-base">{org.name}</h4>
                                    <span
                                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                        org.status === 'Active (Sim)'
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : 'bg-slate-100 text-slate-600 border-slate-300'
                                      }`}
                                    >
                                      {org.status}
                                    </span>
                                    <span
                                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                        org.subscription.planTier === 'Enterprise Multi-Campus'
                                          ? 'bg-purple-100 text-purple-800 border-purple-200'
                                          : org.subscription.planTier === 'Ministry Pro'
                                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                                          : 'bg-slate-100 text-slate-700 border-slate-200'
                                      }`}
                                    >
                                      {org.subscription.planTier}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs text-slate-600">
                                    <p className="flex items-center gap-1.5">
                                      <Users className="w-3.5 h-3.5 text-slate-400" />
                                      <span>Lead: <strong>{org.leadPastor}</strong></span>
                                    </p>
                                    <p className="flex items-center gap-1.5">
                                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                      <span>{org.city}, {org.stateProvince} ({org.activeCampusesCount} Campuses)</span>
                                    </p>
                                    <p className="flex items-center gap-1.5">
                                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                                      <span>{org.contactEmail}</span>
                                    </p>
                                  </div>

                                  {/* Licensing details row */}
                                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
                                    <span>
                                      Billing: <strong className="text-slate-700">{org.subscription.billingCycle}</strong> (₹{org.subscription.simulatedMonthlyFeeINR.toLocaleString('en-IN')}/mo)
                                    </span>
                                    <span>
                                      Valid Until: <strong className="text-slate-700 font-mono">{org.subscription.expiryDate}</strong>
                                    </span>
                                    <span
                                      className={`font-semibold ${
                                        isExpired
                                          ? 'text-red-600 font-bold'
                                          : isExpiring
                                          ? 'text-amber-600 font-bold'
                                          : 'text-emerald-700'
                                      }`}
                                    >
                                      License: {org.subscription.licenseStatus}
                                    </span>
                                    {org.subscription.autoRenew && (
                                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> Auto-Renew Enabled
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-wrap lg:flex-col items-stretch gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedOrg(org)}
                                    className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                                    <span>View Details</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenLicensingModal(org)}
                                    className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors"
                                  >
                                    <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                                    <span>Manage License</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleToggleOrgStatus(org)}
                                    className={`inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                                      isSuspended
                                        ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                                        : 'text-red-700 bg-red-50 hover:bg-red-100 border border-red-200'
                                    }`}
                                  >
                                    {isSuspended ? (
                                      <>
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Activate Org</span>
                                      </>
                                    ) : (
                                      <>
                                        <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                                        <span>Suspend Org</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUB-VIEW 2: Platform Administrators (Section 3.C) */}
                  {platformSubTab === 'admins' && (
                    <div className="space-y-4">
                      {/* Search & Filter Bar */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
                        <div className="flex-1 relative">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={adminSearchTerm}
                            onChange={(e) => setAdminSearchTerm(e.target.value)}
                            placeholder="Search platform administrators by name, email, or identifier..."
                            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                          />
                        </div>

                        <select
                          value={adminRoleFilter}
                          onChange={(e) => setAdminRoleFilter(e.target.value as any)}
                          className="px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600 bg-white"
                        >
                          <option value="All">All Roles</option>
                          <option value="superadmin">Super Admin</option>
                          <option value="admin">Administrator</option>
                          <option value="auditor">Auditor</option>
                        </select>
                      </div>

                      {/* Platform Admins Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredPlatformAdmins.map((adm) => {
                          const isSuspended = adm.status === 'Suspended (Sim)';

                          return (
                            <div
                              key={adm.id}
                              className={`p-5 rounded-2xl border bg-white shadow-sm space-y-4 ${
                                isSuspended ? 'border-slate-300 bg-slate-50/70' : 'border-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                    {adm.id}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                      adm.role === 'superadmin'
                                        ? 'bg-purple-100 text-purple-800'
                                        : adm.role === 'admin'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {adm.role}
                                  </span>
                                </div>

                                {adm.isPrimaryRootAdmin && (
                                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 font-bold border border-purple-200 flex items-center gap-1 shadow-sm">
                                    <Lock className="w-3 h-3 text-purple-600" /> Primary Root Super Admin (Protected)
                                  </span>
                                )}
                              </div>

                              <div>
                                <h4 className="font-extrabold text-slate-900 text-base">{adm.adminName}</h4>
                                <p className="text-xs text-slate-500 font-mono mt-0.5">{adm.email}</p>
                              </div>

                              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600">
                                <div>
                                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Status</span>
                                  <strong className={isSuspended ? 'text-red-600' : 'text-emerald-700'}>{adm.status}</strong>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Two-Factor Auth</span>
                                  <strong className="text-purple-700">{adm.twoFactorEnabled ? 'Enforced (2FA)' : 'Optional'}</strong>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Assigned Date</span>
                                  <span>{adm.assignedDate}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Last Login (Sim)</span>
                                  <span>{adm.lastLogin}</span>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditAdminModal(adm)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Edit</span>
                                </button>

                                <div className="flex items-center gap-2">
                                  {/* Suspend / Reactivate Button */}
                                  <button
                                    type="button"
                                    disabled={adm.isPrimaryRootAdmin}
                                    onClick={() => setSuspendingAdmin(adm)}
                                    title={adm.isPrimaryRootAdmin ? 'Primary Root Super Admin cannot be suspended' : ''}
                                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                                      adm.isPrimaryRootAdmin
                                        ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400'
                                        : isSuspended
                                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                    }`}
                                  >
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    <span>{isSuspended ? 'Reactivate' : 'Suspend'}</span>
                                  </button>

                                  {/* Revoke Button */}
                                  <button
                                    type="button"
                                    disabled={adm.isPrimaryRootAdmin}
                                    onClick={() => setRevokingAdmin(adm)}
                                    title={adm.isPrimaryRootAdmin ? 'Primary Root Super Admin cannot be revoked' : ''}
                                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                                      adm.isPrimaryRootAdmin
                                        ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400'
                                        : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                                    }`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Revoke</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Safety Disclaimer Notice */}
                      <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-200 text-xs text-purple-900 flex items-start gap-3">
                        <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>Security & Credential Simulation Notice:</strong> Platform Administrator Management is restricted to local demonstration storage. Enrolling, editing, or suspending accounts does <strong>not</strong> alter real Firebase Authentication users, production IAM roles, or cloud databases.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB-VIEW 3: Platform Audit Trail (Section 3.C) */}
                  {platformSubTab === 'audit' && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-purple-600" />
                          <h3 className="text-sm font-bold text-slate-900">Platform Security & Licensing Audit Trail</h3>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">{state.auditLogs.length} events logged</span>
                      </div>

                      <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                        {state.auditLogs.map((log) => (
                          <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] text-slate-400">{log.timestamp}</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                  {log.action}
                                </span>
                                <strong className="text-slate-800">{log.target}</strong>
                              </div>
                              <p className="text-slate-600">{log.details}</p>
                            </div>
                            <div className="text-[11px] text-slate-400 shrink-0 text-right">
                              <span>Actor: <strong className="text-slate-700">{log.actor}</strong></span>
                              <span className="block text-[10px]">{log.actorRole}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* =========================================================================
            LAYER A SIMULATION NOTICE BANNER
            ========================================================================= */}
        <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              <strong>Layer A Demonstration Simulation:</strong> Multi-tenant church organizations, subscription licensing, platform administrator accounts, and support tickets operate under client-side simulation. No live database writes or cloud authentication changes take place.
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap">
            M46 · Sub-Phase 9.4
          </span>
        </div>

        {/* =========================================================================
            MODAL: CREATE CAMPUS MODAL (SUB-PHASE 9.2)
            ========================================================================= */}
        {showCreateBranchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#1E6F43] flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Add New Church Campus</h3>
                    <p className="text-xs text-slate-500">Register facility, code, and leadership</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateBranchModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateBranch} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Campus Name *</label>
                    <input
                      type="text"
                      value={branchFormData.name}
                      onChange={(e) => setBranchFormData({ ...branchFormData, name: e.target.value })}
                      placeholder="e.g. Rhema Koramangala Extension"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43]"
                    />
                    {branchFormErrors.name && <p className="text-[11px] text-red-600">{branchFormErrors.name}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Code (2–20 chars) *</label>
                    <input
                      type="text"
                      value={branchFormData.code}
                      onChange={(e) =>
                        setBranchFormData({ ...branchFormData, code: e.target.value.toUpperCase().slice(0, 20) })
                      }
                      placeholder="e.g. CEN, RHM-BLR-05"
                      className="w-full px-3 py-2 text-xs font-mono font-bold uppercase rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43]"
                    />
                    {branchFormErrors.code && <p className="text-[11px] text-red-600">{branchFormErrors.code}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Locality / Area *</label>
                    <input
                      type="text"
                      value={branchFormData.locality}
                      onChange={(e) => setBranchFormData({ ...branchFormData, locality: e.target.value })}
                      placeholder="e.g. Koramangala 4th Block"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43]"
                    />
                    {branchFormErrors.locality && <p className="text-[11px] text-red-600">{branchFormErrors.locality}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Initial Status</label>
                    <select
                      value={branchFormData.status}
                      onChange={(e) =>
                        setBranchFormData({ ...branchFormData, status: e.target.value as M46BranchStatus })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43] bg-white"
                    >
                      <option value="Active (Sim)">Active (Sim)</option>
                      <option value="Planning Stage (Sim)">Planning Stage (Sim)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Sanctuary Street Address *</label>
                  <textarea
                    rows={2}
                    value={branchFormData.address}
                    onChange={(e) => setBranchFormData({ ...branchFormData, address: e.target.value })}
                    placeholder="e.g. 80 Feet Road, Koramangala, Bangalore - 560034"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43]"
                  />
                  {branchFormErrors.address && <p className="text-[11px] text-red-600">{branchFormErrors.address}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Campus Pastor *</label>
                    <input
                      type="text"
                      value={branchFormData.seniorPastor}
                      onChange={(e) => setBranchFormData({ ...branchFormData, seniorPastor: e.target.value })}
                      placeholder="e.g. Pastor Caleb Joshua (Demo)"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43]"
                    />
                    {branchFormErrors.seniorPastor && <p className="text-[11px] text-red-600">{branchFormErrors.seniorPastor}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Administrative Phone *</label>
                    <input
                      type="text"
                      value={branchFormData.contactPhone}
                      onChange={(e) => setBranchFormData({ ...branchFormData, contactPhone: e.target.value })}
                      placeholder="+91 80 2520-0004"
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43]"
                    />
                    {branchFormErrors.contactPhone && <p className="text-[11px] text-red-600">{branchFormErrors.contactPhone}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Initial Membership Allocation</label>
                    <input
                      type="number"
                      min={0}
                      value={branchFormData.activeMembersCount}
                      onChange={(e) =>
                        setBranchFormData({ ...branchFormData, activeMembersCount: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43]"
                    />
                    {branchFormErrors.activeMembersCount && (
                      <p className="text-[11px] text-red-600">{branchFormErrors.activeMembersCount}</p>
                    )}
                  </div>

                  <div className="space-y-1 flex flex-col justify-end">
                    <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={branchFormData.isMainSanctuary}
                        onChange={(e) =>
                          setBranchFormData({ ...branchFormData, isMainSanctuary: e.target.checked })
                        }
                        className="rounded text-[#1E6F43] focus:ring-[#1E6F43] w-4 h-4"
                      />
                      <span className="text-xs font-semibold text-slate-800">Designate as Main Sanctuary</span>
                    </label>
                  </div>
                </div>

                {branchFormData.isMainSanctuary && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                    <Star className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 fill-amber-500" />
                    <span>
                      <strong>Single-Primary Invariant:</strong> Checking this will automatically reassign the primary Main Sanctuary status to this campus, demoting the previous primary branch.
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateBranchModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#1E6F43] hover:bg-[#165534] shadow-sm transition-all"
                  >
                    Create Campus
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL: EDIT CAMPUS MODAL (SUB-PHASE 9.2)
            ========================================================================= */}
        {editingBranch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Edit Campus Details</h3>
                    <p className="text-xs text-slate-500">[{editingBranch.code}] {editingBranch.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingBranch(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateBranch} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Campus Name *</label>
                    <input
                      type="text"
                      value={branchFormData.name}
                      onChange={(e) => setBranchFormData({ ...branchFormData, name: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43]"
                    />
                    {branchFormErrors.name && <p className="text-[11px] text-red-600">{branchFormErrors.name}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Code (2–20 chars) *</label>
                    <input
                      type="text"
                      value={branchFormData.code}
                      onChange={(e) =>
                        setBranchFormData({ ...branchFormData, code: e.target.value.toUpperCase().slice(0, 20) })
                      }
                      placeholder="e.g. CEN, RHM-BLR-05"
                      className="w-full px-3 py-2 text-xs font-mono font-bold uppercase rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43]"
                    />
                    {branchFormErrors.code && <p className="text-[11px] text-red-600">{branchFormErrors.code}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Locality / Area *</label>
                    <input
                      type="text"
                      value={branchFormData.locality}
                      onChange={(e) => setBranchFormData({ ...branchFormData, locality: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43]"
                    />
                    {branchFormErrors.locality && <p className="text-[11px] text-red-600">{branchFormErrors.locality}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Lifecycle Status</label>
                    <select
                      value={branchFormData.status}
                      onChange={(e) =>
                        setBranchFormData({ ...branchFormData, status: e.target.value as M46BranchStatus })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43] bg-white"
                    >
                      <option value="Active (Sim)">Active (Sim)</option>
                      <option value="Planning Stage (Sim)">Planning Stage (Sim)</option>
                      <option value="Inactive (Sim)">Inactive (Sim)</option>
                      <option value="Archived (Sim)">Archived (Sim)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Sanctuary Street Address *</label>
                  <textarea
                    rows={2}
                    value={branchFormData.address}
                    onChange={(e) => setBranchFormData({ ...branchFormData, address: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43]"
                  />
                  {branchFormErrors.address && <p className="text-[11px] text-red-600">{branchFormErrors.address}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Campus Pastor *</label>
                    <input
                      type="text"
                      value={branchFormData.seniorPastor}
                      onChange={(e) => setBranchFormData({ ...branchFormData, seniorPastor: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43]"
                    />
                    {branchFormErrors.seniorPastor && <p className="text-[11px] text-red-600">{branchFormErrors.seniorPastor}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Administrative Phone *</label>
                    <input
                      type="text"
                      value={branchFormData.contactPhone}
                      onChange={(e) => setBranchFormData({ ...branchFormData, contactPhone: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43]"
                    />
                    {branchFormErrors.contactPhone && <p className="text-[11px] text-red-600">{branchFormErrors.contactPhone}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Active Membership Allocation</label>
                    <input
                      type="number"
                      min={0}
                      value={branchFormData.activeMembersCount}
                      onChange={(e) =>
                        setBranchFormData({ ...branchFormData, activeMembersCount: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43]"
                    />
                  </div>

                  <div className="space-y-1 flex flex-col justify-end">
                    <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={branchFormData.isMainSanctuary}
                        onChange={(e) =>
                          setBranchFormData({ ...branchFormData, isMainSanctuary: e.target.checked })
                        }
                        className="rounded text-[#1E6F43] focus:ring-[#1E6F43] w-4 h-4"
                      />
                      <span className="text-xs font-semibold text-slate-800">Designate as Main Sanctuary</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingBranch(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL: VIEW CAMPUS DETAILS MODAL (SUB-PHASE 9.2)
            ========================================================================= */}
        {viewingBranch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                    {viewingBranch.code}
                  </span>
                  <h3 className="text-base font-bold text-slate-900">{viewingBranch.name}</h3>
                </div>
                <button
                  onClick={() => setViewingBranch(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  {viewingBranch.isMainSanctuary && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                      Primary Main Sanctuary
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-full font-bold bg-slate-100 text-slate-800">
                    Status: {viewingBranch.status}
                  </span>
                  <span className="px-2.5 py-1 rounded-full font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {viewingBranch.activeMembersCount >= 1000
                      ? 'Mega Sanctuary Tier'
                      : viewingBranch.activeMembersCount >= 300
                      ? 'Regional Campus Tier'
                      : 'Community Fellowship Tier'}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-start justify-between">
                    <span className="text-slate-400">Locality:</span>
                    <span className="font-semibold text-slate-800 text-right">{viewingBranch.locality}</span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-slate-400">Street Address:</span>
                    <span className="font-medium text-slate-800 text-right max-w-[280px]">{viewingBranch.address}</span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-slate-400">Campus Pastor:</span>
                    <span className="font-semibold text-slate-800 text-right">{viewingBranch.seniorPastor}</span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-slate-400">Admin Phone:</span>
                    <span className="font-mono font-medium text-slate-800 text-right">{viewingBranch.contactPhone}</span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-slate-400">Active Membership:</span>
                    <span className="font-bold text-[#1E6F43] text-right">
                      {viewingBranch.activeMembersCount.toLocaleString()} believers
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-800 flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    Campus identity is managed through client LocalStorage. Invariant enforces that exactly one campus holds primary Main Sanctuary designation at all times.
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  {!viewingBranch.isMainSanctuary && (
                    <button
                      onClick={() => handleSetMainSanctuary(viewingBranch)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 flex items-center gap-1.5"
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-500" />
                      Make Main Sanctuary
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const b = viewingBranch;
                      setViewingBranch(null);
                      handleOpenEditModal(b);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setViewingBranch(null)}
                    className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#1E6F43] hover:bg-[#165534]"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL: DELETE CAMPUS CONFIRMATION MODAL (SUB-PHASE 9.2)
            ========================================================================= */}
        {deletingBranch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Delete Campus Record?</h3>
                  <p className="text-xs text-slate-500">[{deletingBranch.code}] {deletingBranch.name}</p>
                </div>
              </div>

              {deletingBranch.isMainSanctuary ? (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 space-y-2">
                  <p className="font-bold flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-red-600" />
                    Security Invariant Violation
                  </p>
                  <p>
                    <strong>{deletingBranch.name}</strong> is currently designated as the primary Main Sanctuary. The primary sanctuary cannot be deleted under any circumstances.
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={() => setDeletingBranch(null)}
                      className="w-full px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700"
                    >
                      Understood, Return
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Are you sure you want to permanently delete the synthetic branch record for{' '}
                    <strong>{deletingBranch.name}</strong> ({deletingBranch.activeMembersCount} allocated members)?
                  </p>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setDeletingBranch(null)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDeleteBranch}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm"
                    >
                      Yes, Delete Campus
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL: EDIT SERVICE SCHEDULE SLOT MODAL (SUB-PHASE 9.3)
            ========================================================================= */}
        {editingServiceSlot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-base font-bold text-slate-900">Edit Service Schedule Slot</h3>
                </div>
                <button
                  onClick={() => setEditingServiceSlot(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveServiceSlot} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Service Slot Name *</label>
                  <input
                    type="text"
                    value={serviceFormData.name}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Scheduled Time *</label>
                    <input
                      type="text"
                      value={serviceFormData.time}
                      onChange={(e) => setServiceFormData({ ...serviceFormData, time: e.target.value })}
                      placeholder="e.g. 08:30 AM"
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Service Day *</label>
                    <select
                      value={serviceFormData.day}
                      onChange={(e) => setServiceFormData({ ...serviceFormData, day: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43] bg-white"
                    >
                      <option value="Sunday">Sunday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Friday">Friday</option>
                      <option value="Saturday">Saturday</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Service Description</label>
                  <textarea
                    rows={2}
                    value={serviceFormData.description}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, description: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingServiceSlot(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#1E6F43] hover:bg-[#165534]"
                  >
                    Update Slot
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL: CREATE SUPPORT TICKET MODAL (SUB-PHASE 9.3)
            ========================================================================= */}
        {showCreateTicketModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <LifeBuoy className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Create Support Desk Ticket</h3>
                    <p className="text-xs text-slate-500">Log ministry request across canonical categories</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateTicketModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTicket} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Ticket Title / Subject *</label>
                  <input
                    type="text"
                    value={ticketFormData.title}
                    onChange={(e) => setTicketFormData({ ...ticketFormData, title: e.target.value })}
                    placeholder="e.g. Livestream audio latency on main channel"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43]"
                  />
                  {ticketFormErrors.title && <p className="text-[11px] text-red-600">{ticketFormErrors.title}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Canonical Category *</label>
                    <select
                      value={ticketFormData.category}
                      onChange={(e) =>
                        setTicketFormData({ ...ticketFormData, category: e.target.value as M46TicketCategory })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43] bg-white"
                    >
                      <option value="Technical Issue">Technical Issue</option>
                      <option value="Account & Role Help">Account & Role Help</option>
                      <option value="Attendance & QR Check-in">Attendance & QR Check-in</option>
                      <option value="Ministry Operations">Ministry Operations</option>
                      <option value="General Feedback & Requests">General Feedback & Requests</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Priority Level *</label>
                    <select
                      value={ticketFormData.priority}
                      onChange={(e) =>
                        setTicketFormData({ ...ticketFormData, priority: e.target.value as M46TicketPriority })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43] bg-white"
                    >
                      <option value="Low">Low Priority</option>
                      <option value="Medium">Medium Priority</option>
                      <option value="High">High Priority</option>
                      <option value="Urgent">Urgent Priority</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Affected Campus *</label>
                    <select
                      value={ticketFormData.campusId}
                      onChange={(e) => setTicketFormData({ ...ticketFormData, campusId: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43] bg-white"
                    >
                      {state.branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          [{b.code}] {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Assign To Queue *</label>
                    <select
                      value={ticketFormData.assignedTo}
                      onChange={(e) => setTicketFormData({ ...ticketFormData, assignedTo: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43] bg-white"
                    >
                      <option value="Admin Support Desk">Admin Support Desk</option>
                      <option value="IT Systems Team">IT Systems Team</option>
                      <option value="Deacon Paul (Media Lead)">Deacon Paul (Media Lead)</option>
                      <option value="Pastor Office Desk">Pastor Office Desk</option>
                      <option value="Hospitality Lead">Hospitality Lead</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Requester Full Name *</label>
                    <input
                      type="text"
                      value={ticketFormData.requesterName}
                      onChange={(e) => setTicketFormData({ ...ticketFormData, requesterName: e.target.value })}
                      placeholder="e.g. Deacon Silas"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43]"
                    />
                    {ticketFormErrors.requesterName && (
                      <p className="text-[11px] text-red-600">{ticketFormErrors.requesterName}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Requester Ministry Role</label>
                    <input
                      type="text"
                      value={ticketFormData.requesterRole}
                      onChange={(e) => setTicketFormData({ ...ticketFormData, requesterRole: e.target.value })}
                      placeholder="e.g. Usheer Team Lead"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Description of Issue / Request *</label>
                  <textarea
                    rows={3}
                    value={ticketFormData.description}
                    onChange={(e) => setTicketFormData({ ...ticketFormData, description: e.target.value })}
                    placeholder="Provide details of the problem, error message, or operational support needed..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43]"
                  />
                  {ticketFormErrors.description && (
                    <p className="text-[11px] text-red-600">{ticketFormErrors.description}</p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateTicketModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#1E6F43] hover:bg-[#165534] shadow-sm transition-all"
                  >
                    Submit Ticket
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL: VIEW TICKET DETAILS & ACTIVITY TIMELINE (SUB-PHASE 9.3)
            ========================================================================= */}
        {viewingTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8 max-h-[90vh] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
                      {viewingTicket.id}
                    </span>
                    <h3 className="text-base font-bold text-slate-900">{viewingTicket.title}</h3>
                  </div>
                  <button
                    onClick={() => setViewingTicket(null)}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 text-xs mt-4">
                  {/* Status & Category Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-800">
                      Category: {viewingTicket.category}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold border ${
                        viewingTicket.priority === 'Urgent'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : viewingTicket.priority === 'High'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      Priority: {viewingTicket.priority}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                      Status: {viewingTicket.status}
                    </span>
                  </div>

                  {/* Summary Box */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <p className="text-xs text-slate-700 font-medium leading-relaxed">{viewingTicket.description}</p>
                    <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
                      <span>Requester: <strong>{viewingTicket.requesterName}</strong> ({viewingTicket.requesterRole})</span>
                      <span>Assigned: <strong>{viewingTicket.assignedTo}</strong></span>
                    </div>
                  </div>

                  {/* Activity Timeline */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Ticket Activity Timeline ({viewingTicket.activity?.length || 0})</span>
                    </h4>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {(viewingTicket.activity || []).map((act) => (
                        <div key={act.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-800">{act.actor}</span>
                            <span className="text-slate-400 font-mono">{act.timestamp}</span>
                          </div>
                          <p className="text-slate-600 text-[11px]">{act.note}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Add Note Form */}
                  <form onSubmit={handleAddTicketActivityNote} className="pt-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={activityNoteInput}
                      onChange={(e) => setActivityNoteInput(e.target.value)}
                      placeholder="Type internal note or progress update..."
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6F43]"
                    />
                    <button
                      type="submit"
                      disabled={!activityNoteInput.trim()}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-white bg-[#1E6F43] hover:bg-[#165534] disabled:opacity-40 transition-colors flex items-center gap-1 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Add Note</span>
                    </button>
                  </form>
                </div>
              </div>

              {/* Modal Footer Lifecycle Actions */}
              <div className="flex flex-wrap items-center justify-between pt-4 border-t border-slate-100 gap-2">
                <div className="flex items-center gap-2">
                  {viewingTicket.status === 'Open (Sim)' && (
                    <button
                      onClick={() => handleUpdateTicketStatus(viewingTicket, 'In Progress (Sim)')}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200"
                    >
                      Transition to In Progress
                    </button>
                  )}
                  {viewingTicket.status === 'In Progress (Sim)' && (
                    <button
                      onClick={() => handleUpdateTicketStatus(viewingTicket, 'Resolved (Sim)')}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
                    >
                      Transition to Resolved
                    </button>
                  )}
                  {viewingTicket.status === 'Resolved (Sim)' && (
                    <button
                      onClick={() => {
                        const t = viewingTicket;
                        setViewingTicket(null);
                        setClosingTicket(t);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300"
                    >
                      Close Ticket
                    </button>
                  )}
                  {viewingTicket.status === 'Closed (Sim)' && (
                    <button
                      onClick={() => handleUpdateTicketStatus(viewingTicket, 'Open (Sim)')}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200"
                    >
                      Reopen Ticket
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setViewingTicket(null)}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL: CLOSE TICKET CONFIRMATION (SUB-PHASE 9.3)
            ========================================================================= */}
        {closingTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Close Support Ticket?</h3>
                  <p className="text-xs text-slate-500">[{closingTicket.id}] {closingTicket.title}</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Closing this ticket marks the issue as completed. You can reopen it at any time if further assistance is required.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setClosingTicket(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCloseTicket}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 shadow-sm"
                >
                  Confirm Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL: DELETE TICKET CONFIRMATION (SUB-PHASE 9.3)
            ========================================================================= */}
        {deletingTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Delete Support Ticket?</h3>
                  <p className="text-xs text-slate-500">[{deletingTicket.id}] {deletingTicket.title}</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to permanently delete ticket <strong>{deletingTicket.id}</strong>? This action will remove this ticket and its activity timeline from simulated local storage.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingTicket(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteTicket}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm"
                >
                  Yes, Delete Ticket
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL: GRANULAR RESET CONFIRMATION MODAL (SUB-PHASE 9.3 / DATA-SAFE)
            ========================================================================= */}
        {resetModalMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {resetModalMode === 'settings'
                      ? 'Reset Church Settings to Defaults?'
                      : 'Reset Support Desk Queue?'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Granular reset preserving Area A branches &amp; Area D records
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {resetModalMode === 'settings' && (
                  <>This will reset church profile information, branding colors, service schedules, and geofence settings back to baseline defaults. <strong>Area A branch records, Area C support tickets, and Area D organizations/platform administrators will NOT be touched.</strong></>
                )}
                {resetModalMode === 'tickets' && (
                  <>This will restore the support ticket queue to the 5 canonical baseline demonstration tickets. <strong>Area A branch records, Area B church settings, and Area D organizations/platform administrators will NOT be touched.</strong></>
                )}
              </p>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 space-y-1">
                <p>• Only key <code className="font-mono text-slate-700">@rhema_admin_m46_settings</code> is affected.</p>
                <p>• Other module keys (M01–M45, active branch) will remain untouched.</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalMode(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleExecuteReset(resetModalMode)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow-sm"
                >
                  Yes, Proceed with Reset
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL: ORGANIZATION DETAILS DRAWER / MODAL (SUB-PHASE 9.4)
            ========================================================================= */}
        {selectedOrg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{selectedOrg.name}</h3>
                    <p className="text-xs text-slate-500 font-mono">Code: {selectedOrg.code} · ID: {selectedOrg.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOrg(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Organization Overview */}
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Senior / Lead Pastor</span>
                    <strong className="text-slate-800">{selectedOrg.leadPastor}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Location</span>
                    <strong className="text-slate-800">{selectedOrg.city}, {selectedOrg.stateProvince}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Contact Email</span>
                    <span className="text-slate-700 font-mono">{selectedOrg.contactEmail}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Contact Phone</span>
                    <span className="text-slate-700 font-mono">{selectedOrg.contactPhone}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Active Campuses</span>
                    <strong className="text-slate-800">{selectedOrg.activeCampusesCount} Registered Campuses</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Member Estimate</span>
                    <strong className="text-slate-800">~{selectedOrg.activeMembersEstimate} Congregants</strong>
                  </div>
                </div>

                {/* Subscription & License Breakdown */}
                <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100 space-y-2">
                  <h4 className="font-bold text-purple-900 text-xs flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-purple-700" />
                    <span>Active Subscription & Licensing Dossier</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-slate-700">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Plan Tier</span>
                      <strong className="text-purple-800">{selectedOrg.subscription.planTier}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Billing Cycle</span>
                      <strong>{selectedOrg.subscription.billingCycle} (₹{selectedOrg.subscription.simulatedMonthlyFeeINR.toLocaleString('en-IN')}/mo)</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">License Status</span>
                      <strong className={selectedOrg.subscription.licenseStatus === 'Active (Sim)' ? 'text-emerald-700' : 'text-amber-700'}>
                        {selectedOrg.subscription.licenseStatus}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Renewal Date</span>
                      <span className="font-mono">{selectedOrg.subscription.expiryDate}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedOrg(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedOrg;
                    setSelectedOrg(null);
                    handleOpenLicensingModal(target);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 shadow-sm"
                >
                  Manage License & Renewal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL: MANAGE LICENSE & SIMULATED RENEWAL (SUB-PHASE 9.4)
            ========================================================================= */}
        {licensingOrg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Manage Licensing & Renewal</h3>
                    <p className="text-xs text-slate-500">{licensingOrg.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setLicensingOrg(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveOrgSubscription} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Subscription Plan Tier *</label>
                  <select
                    value={licenseFormData.planTier}
                    onChange={(e) => setLicenseFormData({ ...licenseFormData, planTier: e.target.value as M46PlanTier })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600 bg-white"
                  >
                    <option value="Starter">Starter Plan (₹4,999/mo · Single Campus, up to 250 members)</option>
                    <option value="Ministry Pro">Ministry Pro Plan (₹12,499/mo · Up to 1,500 members, service planner)</option>
                    <option value="Enterprise Multi-Campus">Enterprise Multi-Campus Plan (₹29,999/mo · Unlimited members, multi-campus)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Billing Cycle *</label>
                    <select
                      value={licenseFormData.billingCycle}
                      onChange={(e) => setLicenseFormData({ ...licenseFormData, billingCycle: e.target.value as M46BillingCycle })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600 bg-white"
                    >
                      <option value="Annual">Annual Billing (12 Months)</option>
                      <option value="Monthly">Monthly Billing (1 Month)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Add Extension Validity</label>
                    <select
                      value={licenseFormData.monthsToAdd}
                      onChange={(e) => setLicenseFormData({ ...licenseFormData, monthsToAdd: parseInt(e.target.value, 10) })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600 bg-white"
                    >
                      <option value={12}>+1 Year (12 Months)</option>
                      <option value={6}>+6 Months</option>
                      <option value={1}>+1 Month</option>
                      <option value={24}>+2 Years (24 Months)</option>
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={licenseFormData.autoRenew}
                    onChange={(e) => setLicenseFormData({ ...licenseFormData, autoRenew: e.target.checked })}
                    className="rounded text-purple-600 focus:ring-purple-600 w-4 h-4"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-800">Enable Automated Renewal</p>
                    <p className="text-[11px] text-slate-500">Simulate recurring billing on scheduled anniversary dates</p>
                  </div>
                </label>

                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>Simulated Licensing Notice:</strong> Executing renewal updates expiry dates and marks the license status active in demonstration local storage. No live billing gateway or credit card processing occurs.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setLicensingOrg(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 shadow-sm"
                  >
                    Confirm Plan & Renew License
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL: ADD PLATFORM ADMINISTRATOR (SUB-PHASE 9.4)
            ========================================================================= */}
        {showAddAdminModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Add Platform Administrator</h3>
                    <p className="text-xs text-slate-500">Enroll new synthetic platform administrator account</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddAdminModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreatePlatformAdmin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Administrator Full Name *</label>
                  <input
                    type="text"
                    value={adminFormData.adminName}
                    onChange={(e) => setAdminFormData({ ...adminFormData, adminName: e.target.value })}
                    placeholder="e.g. Pastor David Kumar (Demo)"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                  {adminFormErrors.adminName && <p className="text-[11px] text-red-600">{adminFormErrors.adminName}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Administrative Email Address *</label>
                  <input
                    type="email"
                    value={adminFormData.email}
                    onChange={(e) => setAdminFormData({ ...adminFormData, email: e.target.value })}
                    placeholder="e.g. pastor.david@rhema-demo.org"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                  {adminFormErrors.email && <p className="text-[11px] text-red-600">{adminFormErrors.email}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Platform Role *</label>
                  <select
                    value={adminFormData.role}
                    onChange={(e) => setAdminFormData({ ...adminFormData, role: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600 bg-white"
                  >
                    <option value="admin">Administrator (Church Settings & Support Desk)</option>
                    <option value="superadmin">Super Admin (All Modules & Platform Console)</option>
                    <option value="auditor">Auditor (Read-Only Compliance & Activity Logs)</option>
                  </select>
                </div>

                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adminFormData.twoFactorEnabled}
                    onChange={(e) => setAdminFormData({ ...adminFormData, twoFactorEnabled: e.target.checked })}
                    className="rounded text-purple-600 focus:ring-purple-600 w-4 h-4"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-800">Enforce Multi-Factor Authentication (2FA)</p>
                    <p className="text-[11px] text-slate-500">Require OTP confirmation for elevated console sessions</p>
                  </div>
                </label>

                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>Simulated Account Notice:</strong> This administrator account is created in demonstration local storage only. Real Firebase Authentication and cloud IAM are not modified.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddAdminModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 shadow-sm"
                  >
                    Create Platform Administrator
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL: EDIT PLATFORM ADMINISTRATOR (SUB-PHASE 9.4)
            ========================================================================= */}
        {editingAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Edit Platform Administrator</h3>
                    <p className="text-xs text-slate-500">[{editingAdmin.id}] {editingAdmin.adminName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingAdmin(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdatePlatformAdmin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Administrator Full Name *</label>
                  <input
                    type="text"
                    value={adminFormData.adminName}
                    onChange={(e) => setAdminFormData({ ...adminFormData, adminName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                  {adminFormErrors.adminName && <p className="text-[11px] text-red-600">{adminFormErrors.adminName}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Administrative Email Address (Read-Only)</label>
                  <input
                    type="email"
                    disabled
                    value={adminFormData.email}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-mono cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Platform Role *</label>
                  {editingAdmin.isPrimaryRootAdmin ? (
                    <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900 font-semibold flex items-center gap-2">
                      <Lock className="w-4 h-4 text-purple-600" />
                      <span>Primary Root Super Admin role is protected and locked to "superadmin".</span>
                    </div>
                  ) : (
                    <select
                      value={adminFormData.role}
                      onChange={(e) => setAdminFormData({ ...adminFormData, role: e.target.value as any })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600 bg-white"
                    >
                      <option value="admin">Administrator (Church Settings & Support Desk)</option>
                      <option value="superadmin">Super Admin (All Modules & Platform Console)</option>
                      <option value="auditor">Auditor (Read-Only Compliance & Activity Logs)</option>
                    </select>
                  )}
                </div>

                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adminFormData.twoFactorEnabled}
                    onChange={(e) => setAdminFormData({ ...adminFormData, twoFactorEnabled: e.target.checked })}
                    className="rounded text-purple-600 focus:ring-purple-600 w-4 h-4"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-800">Enforce Multi-Factor Authentication (2FA)</p>
                    <p className="text-[11px] text-slate-500">Require OTP verification on login</p>
                  </div>
                </label>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingAdmin(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 shadow-sm"
                  >
                    Save Administrator Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL: SUSPEND / REACTIVATE ADMINISTRATOR CONFIRMATION (SUB-PHASE 9.4)
            ========================================================================= */}
        {suspendingAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {suspendingAdmin.status === 'Active (Sim)' ? 'Suspend Administrator?' : 'Reactivate Administrator?'}
                  </h3>
                  <p className="text-xs text-slate-500">[{suspendingAdmin.id}] {suspendingAdmin.adminName}</p>
                </div>
              </div>

              {suspendingAdmin.isPrimaryRootAdmin ? (
                <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-800">
                  <strong>Protected Account:</strong> This is the Primary Root Super Admin. Suspension is strictly disallowed under platform security policies.
                </div>
              ) : (
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to {suspendingAdmin.status === 'Active (Sim)' ? 'suspend' : 'reactivate'} administrative privileges for <strong>{suspendingAdmin.adminName}</strong>?
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSuspendingAdmin(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                {!suspendingAdmin.isPrimaryRootAdmin && (
                  <button
                    type="button"
                    onClick={handleConfirmSuspendAdmin}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 shadow-sm"
                  >
                    Confirm {suspendingAdmin.status === 'Active (Sim)' ? 'Suspension' : 'Reactivation'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL: REVOKE ADMINISTRATOR CONFIRMATION (SUB-PHASE 9.4)
            ========================================================================= */}
        {revokingAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Revoke Platform Administrator?</h3>
                  <p className="text-xs text-slate-500">[{revokingAdmin.id}] {revokingAdmin.adminName}</p>
                </div>
              </div>

              {revokingAdmin.isPrimaryRootAdmin ? (
                <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-800">
                  <strong>Protected Root Account:</strong> The Primary Root Super Admin cannot be revoked or deleted under platform security policies.
                </div>
              ) : (
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to permanently revoke credentials for <strong>{revokingAdmin.adminName}</strong> ({revokingAdmin.email})? This action will remove the administrator account from local simulation storage.
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRevokingAdmin(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                {!revokingAdmin.isPrimaryRootAdmin && (
                  <button
                    type="button"
                    onClick={handleConfirmRevokeAdmin}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm"
                  >
                    Yes, Revoke Administrator
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminNavigationShell>
  );
}

// =========================================================================
// ROUTE PROTECTION WRAPPER (SIX-ROLE RBAC ENFORCEMENT)
// =========================================================================

export default function M46SettingsPage() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
      <M46SettingsPageContent />
    </ProtectedRoute>
  );
}
