/**
 * Wave 7C (M40–M46) Shared Demonstration Datasets & Pure TypeScript Schemas
 * Strictly Layer A Frontend Simulation Mode — ZERO Firebase imports, reads, writes, or secrets.
 *
 * Canonical Wave 7C Modules:
 * - M40: Admin Events & RSVP Analytics (/admin/events)
 * - M41: Admin Service Roster & Worship Operations (/admin/service-planner)
 * - M42: Pastor Event Itinerary, Route Planner & AI Voice Assistant (/admin/pastor-events)
 * - M43: Admin Job Circle & Ministry Teams (/admin/job-circle)
 * - M44: Admin Finance Suite (Expenses, Invoices & Donations) (/admin/finance)
 * - M45: Admin Celebrations Studio, Notifications, WhatsApp Inbox, Gallery & Online Meetings (/admin/communications)
 * - M46: Church Branches, Church Settings, Support & Platform Super Admin Console (/admin/settings)
 */

// =========================================================================
// M40: Admin Events & RSVP Analytics Models
// =========================================================================

export type EventStatus = 'Upcoming' | 'Past' | 'Draft' | 'Cancelled';
export type EventCategory = 'Sunday Service' | 'Special Conference' | 'Youth Night' | 'Worship Night' | 'Prayer Vigil' | 'Community Outreach';
export type RsvpResponseStatus = 'Going' | 'Interested' | 'Not Going' | 'Pending';

export interface AdminEventAttendee {
  id: string; // e.g. "ATT-M40-01"
  memberId: string;
  name: string;
  phoneMasked: string;
  email: string;
  rsvpStatus: RsvpResponseStatus;
  guestCount: number;
  respondedAt: string; // YYYY-MM-DD
}

export interface AdminEventRecord {
  id: string; // e.g. "EVT-2026-01"
  demoTag: 'Simulated Event Record (Demo)';
  title: string;
  theme: string;
  category: EventCategory;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  startTime: string; // e.g. "09:00 AM"
  endTime: string;
  venueName: string;
  roomOrHall: string;
  keynoteSpeaker: string;
  bannerGradient: string;
  status: EventStatus;
  maxCapacity: number;
  rsvpSummary: {
    goingCount: number;
    interestedCount: number;
    notGoingCount: number;
    pendingCount: number;
  };
  sampleAttendees: AdminEventAttendee[];
}

// =========================================================================
// M41: Admin Service Roster & Worship Operations (9 Sub-Modules) Models
// =========================================================================

export type ServicePlanStatus = 'Confirmed (Sim)' | 'Draft (Sim)' | 'Archived (Sim)';

export interface ServiceRunSheetCue {
  id: string; // e.g. "CUE-01"
  segmentOrder: number;
  startTime: string; // e.g. "09:00 AM"
  durationMinutes: number;
  segmentTitle: string; // e.g. "Opening Worship & Invocation"
  ministerOrLeader: string;
  mediaNotes: string; // e.g. "Display lyrics on screen 1 & 2"
  bandPreset: string;
}

export interface ServiceMusicianAssignment {
  instrumentOrRole: string; // e.g. "Lead Vocals", "Keys 1", "Acoustic Guitar", "Drums"
  assignedMemberName: string;
  status: 'Confirmed' | 'Tentative' | 'Declined';
}

export interface ServicePlanSetlistItem {
  songId: string;
  title: string;
  originalKey: string;
  transposedKey: string;
  tempoBpm: number;
  language: string;
  worshipLeader: string;
}

export interface AdminServicePlan {
  id: string; // e.g. "PLAN-2026-W48"
  demoTag: 'Simulated Service Plan (Demo)';
  serviceDate: string; // YYYY-MM-DD
  serviceTitle: string; // e.g. "Sunday Morning Divine Covenant Service"
  serviceType: 'Morning 1st Service' | 'Morning 2nd Service' | 'Evening Communion Service' | 'Mid-Week Prayer';
  status: ServicePlanStatus;
  leadPastor: string;
  worshipLeader: string;
  estimatedDurationMinutes: number;
  runSheet: ServiceRunSheetCue[];
  musicians: ServiceMusicianAssignment[];
  setlist: ServicePlanSetlistItem[];
  assignedTeamsSummary: {
    usheringCount: number;
    mediaAvCount: number;
    hospitalityCount: number;
    childrenMinistryCount: number;
  };
}

// =========================================================================
// M42: Pastor Event Itinerary, Route Planner & AI Assistant Models
// =========================================================================

export type PastorAppointmentType = 'Hospital ICU Visitation' | 'Home Blessing & Prayer' | 'Pre-Marital Counseling' | 'Elders Board Meeting' | 'Funeral Service' | 'Water Baptism Briefing';
export type TransitMode = 'Car' | 'Bike' | 'Walk';

export interface PastorItineraryWaypoint {
  id: string;
  stopOrder: number;
  addressLabel: string;
  neighborhoodZone: string;
  distanceKmFromPrev: number;
  transitDurationMin: number;
}

export interface AdminPastorEventItem {
  id: string; // e.g. "PASTOR-EVT-101"
  demoTag: 'Simulated Pastor Itinerary (Demo)';
  title: string;
  appointmentType: PastorAppointmentType;
  date: string; // YYYY-MM-DD
  startTime: string; // e.g. "10:30 AM"
  endTime: string;
  memberOrFamilyName: string;
  maskedPhone: string;
  destinationAddress: string;
  zone: string;
  priorityLevel: 'High (Emergency)' | 'Normal' | 'Routine';
  hasScheduleConflict: boolean;
  transitMode: TransitMode;
  waypoints: PastorItineraryWaypoint[];
  pastoralNotes: string;
}

// =========================================================================
// M43: Admin Job Circle & Ministry Teams Models
// =========================================================================

export type JobCompensationType = 'Full-Time Church Staff' | 'Part-Time Ministry Stipend' | 'Kingdom Business Marketplace' | 'Honorarium Basis';
export type JobOpportunityStatus = 'Published' | 'Under Review' | 'Closed' | 'Draft';
export type JobApplicantStage = 'Applied' | 'Shortlisted' | 'Interview Scheduled' | 'Offer Extended' | 'Archived';

export interface AdminJobApplicant {
  id: string; // e.g. "APP-JOB-01"
  applicantName: string;
  phoneMasked: string;
  email: string;
  currentStage: JobApplicantStage;
  appliedDate: string;
  yearsExperience: number;
  skillsSummary: string[];
  resumeDocName: string;
  interviewDate?: string;
  notes?: string;
}

export interface AdminJobOpportunity {
  id: string; // e.g. "JOB-2026-01"
  demoTag: 'Simulated Job Listing (Demo)';
  title: string;
  department: string;
  compensationType: JobCompensationType;
  location: string;
  status: JobOpportunityStatus;
  description: string;
  requirements: string[];
  postedDate: string;
  closingDate: string;
  totalApplicants: number;
  applicants: AdminJobApplicant[];
}

export interface AdminMinistryTeamSummary {
  teamId: string;
  teamName: string;
  teamLead: string;
  activeVolunteers: number;
  meetingSchedule: string;
}

// =========================================================================
// M44: Admin Finance Suite (Expenses, Invoices & Donations) Models
// Strict Super Admin Boundary
// =========================================================================

export type ExpenseCategory = 'Sanctuary Lease & Utilities' | 'Audio/Visual & Media Production' | 'Missions & Community Food Drive' | 'Guest Speaker Honorariums' | 'Children & Youth Ministry Supplies' | 'Office Administration';
export type ExpenseStatus = 'Pending Approval (Sim)' | 'Approved for Payment (Sim)' | 'Disbursed (Sim)' | 'Rejected (Sim)';

export interface AdminExpenseVoucher {
  id: string; // e.g. "EXP-2026-00101"
  invoiceRefNumber: string; // e.g. "INV-COG-8812"
  demoTag: 'Simulated Finance Voucher (Demo)';
  category: ExpenseCategory;
  vendorName: string;
  description: string;
  amountInr: number;
  expenseDate: string; // YYYY-MM-DD
  status: ExpenseStatus;
  submittedBy: string;
  approvedBy?: string;
  receiptAttachmentName: string;
  notes?: string;
}

export interface AdminDonationLedgerRecord {
  id: string; // e.g. "DON-LEDGER-2026-01"
  receiptNumber: string; // e.g. "RCPT-2026-1042"
  demoTag: 'Simulated Donation Record (Demo)';
  donorNameMasked: string;
  purpose: 'Tithes & Firstfruits' | 'General Offering' | 'Church Building Fund' | 'Missions & Food Drive' | 'Thanksgiving Offering';
  paymentMode: 'Digital UPI / NetBanking (Simulated)' | 'Cash Offering Counter (Simulated)' | 'Bank Cheque (Simulated)';
  amountInr: number;
  donationDate: string; // YYYY-MM-DD
  taxExemptionEligible: boolean; // 80G simulated tax receipt
}

export interface AdminFinanceOverviewKpi {
  fiscalMonth: string; // e.g. "November 2026"
  totalTithesOfferingsInr: number;
  totalOperatingExpensesInr: number;
  netReserveBalanceInr: number;
  pendingVoucherCount: number;
  approvedVoucherCount: number;
}

// =========================================================================
// M45: Admin Celebrations, Notifications, WhatsApp & Media Models
// =========================================================================

export type CelebrationType = 'Birthday' | 'Wedding Anniversary' | 'Baptism Jubilee';

export interface AdminCelebrationQueueItem {
  id: string; // e.g. "CEL-2026-01"
  demoTag: 'Simulated Celebration Item (Demo)';
  memberName: string;
  type: CelebrationType;
  eventDate: string; // MM-DD
  phoneMasked: string;
  yearsMilestone?: number; // e.g. 50th Birthday or 25th Anniversary
  assignedScriptureVerse: string;
  cardDispatched: boolean;
  whatsappGreetingSent: boolean;
}

export interface AdminPushBroadcastRecord {
  id: string; // e.g. "BCAST-2026-01"
  demoTag?: string;
  title: string;
  body: string;
  targetAudience: 'All Registered Members' | 'Care Cell Leaders' | 'Worship & Media Team' | 'Youth & Teens' | 'Parents Group';
  scheduledOrSentDate: string;
  status: 'Sent (Sim)' | 'Scheduled (Sim)' | 'Draft (Sim)';
  recipientCount: number;
}

export interface AdminWhatsAppChatSnippet {
  id: string; // e.g. "WA-MSG-01"
  senderName: string;
  phoneMasked: string;
  lastMessageSnippet: string;
  timestamp: string;
  unreadCount: number;
  isAutomatedGreeting: boolean;
}

export interface AdminGalleryAlbumItem {
  id: string; // e.g. "ALB-2026-01"
  albumTitle: string;
  coverImageTheme: string;
  eventDate: string;
  photoCount: number;
  photographerName: string;
}

export interface AdminOnlineMeetingSession {
  id: string; // e.g. "MEET-2026-01"
  title: string;
  platform: 'Zoom Video (Sim)' | 'Google Meet (Sim)';
  meetingDate: string;
  meetingTime: string;
  passcodeProtected: boolean;
  passcode: string;
  registeredAttendeesCount: number;
}

// =========================================================================
// M46: Church Branches, Settings, Support & Super Admin Console Models
// =========================================================================

export interface AdminBranchRecord {
  id: string; // e.g. "BRANCH-CENTRAL"
  name: string;
  locality: string;
  address: string;
  seniorPastor: string;
  activeMembersCount: number;
  isMainSanctuary: boolean;
  status: 'Active Campus (Sim)' | 'Planning Stage (Sim)';
}

export interface AdminChurchSettingsConfig {
  churchName: string;
  tagline: string;
  sanctuaryLatitude: number;
  sanctuaryLongitude: number;
  attendanceGeofenceRadiusMeters: number; // 100m geofence for M15
  primaryContactPhone: string;
  pastoralSupportEmail: string;
  sundayService1Time: string;
  sundayService2Time: string;
  midweekPrayerTime: string;
  dailyVerseEngineSyncEnabled: boolean;
  dailyQuizEngineSyncEnabled: boolean;
}

export interface PlatformSuperAdminRecord {
  id: string; // e.g. "SA-PLATFORM-01"
  adminName: string;
  email: string;
  role: 'superadmin';
  assignedDate: string;
  isPrimaryRootAdmin: boolean;
}

// =========================================================================
// DEMONSTRATION DATASETS (LAYER A FRONTEND SIMULATION MODE)
// =========================================================================

export const INITIAL_ADMIN_EVENTS: AdminEventRecord[] = [
  {
    id: 'EVT-2026-01',
    demoTag: 'Simulated Event Record (Demo)',
    title: 'Anointed Breakthrough Conference 2026',
    theme: 'Arise and Shine for Thy Light Is Come (Isaiah 60:1)',
    category: 'Special Conference',
    startDate: '2026-12-04',
    endDate: '2026-12-06',
    startTime: '06:00 PM',
    endTime: '09:30 PM',
    venueName: 'Rhema Central Sanctuary',
    roomOrHall: 'Main Worship Auditorium',
    keynoteSpeaker: 'Rev. Dr. David Paul & Guest Evangelist',
    bannerGradient: 'from-amber-600 via-amber-800 to-slate-900',
    status: 'Upcoming',
    maxCapacity: 1200,
    rsvpSummary: {
      goingCount: 342,
      interestedCount: 128,
      notGoingCount: 14,
      pendingCount: 45,
    },
    sampleAttendees: [
      {
        id: 'ATT-M40-01',
        memberId: 'RHEMA-2026-1001',
        name: 'Brother Samuel Joseph (Demo)',
        phoneMasked: '+91 98451-XXXX1',
        email: 'samuel.joseph.demo@rhema-demo.org',
        rsvpStatus: 'Going',
        guestCount: 3,
        respondedAt: '2026-11-15',
      },
      {
        id: 'ATT-M40-02',
        memberId: 'RHEMA-2026-1002',
        name: 'Sister Rebecca Kurian (Demo)',
        phoneMasked: '+91 98451-XXXX2',
        email: 'rebecca.kurian.demo@rhema-demo.org',
        rsvpStatus: 'Going',
        guestCount: 2,
        respondedAt: '2026-11-16',
      },
      {
        id: 'ATT-M40-03',
        memberId: 'RHEMA-2026-1003',
        name: 'Brother Timothy Barnabas (Demo)',
        phoneMasked: '+91 98451-XXXX3',
        email: 'timothy.barnabas.demo@rhema-demo.org',
        rsvpStatus: 'Interested',
        guestCount: 1,
        respondedAt: '2026-11-18',
      },
    ],
  },
  {
    id: 'EVT-2026-02',
    demoTag: 'Simulated Event Record (Demo)',
    title: 'Youth Fire Night: Prophetic Worship & Impartation',
    theme: 'Set Apart for Kingdom Purpose (Jeremiah 1:5)',
    category: 'Youth Night',
    startDate: '2026-11-28',
    endDate: '2026-11-28',
    startTime: '05:30 PM',
    endTime: '08:30 PM',
    venueName: 'Rhema Youth Hall',
    roomOrHall: 'Hall B (Level 2)',
    keynoteSpeaker: 'Pastor Stephen Mark (Youth Pastor)',
    bannerGradient: 'from-indigo-600 via-purple-800 to-slate-900',
    status: 'Upcoming',
    maxCapacity: 350,
    rsvpSummary: {
      goingCount: 185,
      interestedCount: 64,
      notGoingCount: 8,
      pendingCount: 20,
    },
    sampleAttendees: [],
  },
  {
    id: 'EVT-2026-03',
    demoTag: 'Simulated Event Record (Demo)',
    title: 'Community Thanksgiving & Winter Food Drive',
    theme: 'Feeding the Multitudes with Christ Compassion',
    category: 'Community Outreach',
    startDate: '2026-12-12',
    endDate: '2026-12-12',
    startTime: '09:00 AM',
    endTime: '02:00 PM',
    venueName: 'Hebbal Community Outreach Center',
    roomOrHall: 'Ground Courtyard',
    keynoteSpeaker: 'Pastor Andrew & Outreach Elders',
    bannerGradient: 'from-emerald-600 via-teal-800 to-slate-900',
    status: 'Draft',
    maxCapacity: 500,
    rsvpSummary: {
      goingCount: 94,
      interestedCount: 42,
      notGoingCount: 5,
      pendingCount: 18,
    },
    sampleAttendees: [],
  },
];

export const INITIAL_ADMIN_SERVICE_PLANS: AdminServicePlan[] = [
  {
    id: 'PLAN-2026-W48',
    demoTag: 'Simulated Service Plan (Demo)',
    serviceDate: '2026-11-29',
    serviceTitle: 'Sunday Morning Divine Covenant Service',
    serviceType: 'Morning 1st Service',
    status: 'Confirmed (Sim)',
    leadPastor: 'Senior Pastor John Mark (Demo)',
    worshipLeader: 'Brother Daniel Sundaram (Demo)',
    estimatedDurationMinutes: 110,
    runSheet: [
      {
        id: 'CUE-01',
        segmentOrder: 1,
        startTime: '09:00 AM',
        durationMinutes: 5,
        segmentTitle: 'Pre-Service Prayer & Sanctuary Welcome',
        ministerOrLeader: 'Elder Stephen',
        mediaNotes: 'Ambient pad music; show Welcome Slide with Live Stream countdown',
        bandPreset: 'Acoustic Piano & Soft Strings',
      },
      {
        id: 'CUE-02',
        segmentOrder: 2,
        startTime: '09:05 AM',
        durationMinutes: 30,
        segmentTitle: 'Praise & Worship Extravaganza',
        ministerOrLeader: 'Brother Daniel & Rhema Choir',
        mediaNotes: 'Bilingual Lyrics (English/Telugu); lower-third chords for choir monitors',
        bandPreset: 'Full Band Dynamic',
      },
      {
        id: 'CUE-03',
        segmentOrder: 3,
        startTime: '09:35 AM',
        durationMinutes: 10,
        segmentTitle: 'Holy Communion & Congregational Thanksgiving',
        ministerOrLeader: 'Senior Pastor John Mark',
        mediaNotes: '1 Corinthians 11:24 Scripture graphic on center screen',
        bandPreset: 'Gentle Acoustic Guitar Solo',
      },
      {
        id: 'CUE-04',
        segmentOrder: 4,
        startTime: '09:45 AM',
        durationMinutes: 10,
        segmentTitle: 'Announcements, Tithes & Ministry Updates',
        ministerOrLeader: 'Associate Pastor Timothy',
        mediaNotes: 'Event flyer slides & QR Giving code on screen 2',
        bandPreset: 'Light Piano Chords',
      },
      {
        id: 'CUE-05',
        segmentOrder: 5,
        startTime: '09:55 AM',
        durationMinutes: 45,
        segmentTitle: 'Ministry of the Word: Covenant of Supernatural Peace',
        ministerOrLeader: 'Senior Pastor John Mark',
        mediaNotes: 'Sermon title graphic and primary Scripture points',
        bandPreset: 'Muted',
      },
      {
        id: 'CUE-06',
        segmentOrder: 6,
        startTime: '10:40 AM',
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
      { songId: 'SONG-01', title: 'Way Maker, Miracle Worker', originalKey: 'E', transposedKey: 'E', tempoBpm: 68, language: 'English & Telugu', worshipLeader: 'Brother Daniel' },
      { songId: 'SONG-02', title: '10,000 Reasons (Bless the Lord)', originalKey: 'G', transposedKey: 'G', tempoBpm: 72, language: 'English', worshipLeader: 'Brother Daniel' },
      { songId: 'SONG-03', title: 'Yehova Naa Kaapari (The Lord Is My Shepherd)', originalKey: 'D', transposedKey: 'D', tempoBpm: 84, language: 'Telugu', worshipLeader: 'Sister Grace' },
    ],
    assignedTeamsSummary: {
      usheringCount: 12,
      mediaAvCount: 5,
      hospitalityCount: 6,
      childrenMinistryCount: 8,
    },
  },
];

export const INITIAL_ADMIN_PASTOR_EVENTS: AdminPastorEventItem[] = [
  {
    id: 'PASTOR-EVT-101',
    demoTag: 'Simulated Pastor Itinerary (Demo)',
    title: 'Emergency ICU Anointing & Prayer Visitation',
    appointmentType: 'Hospital ICU Visitation',
    date: '2026-11-24',
    startTime: '10:00 AM',
    endTime: '11:15 AM',
    memberOrFamilyName: 'Deacon John Peter (Family of Patient)',
    maskedPhone: '+91 98450-XXXX1',
    destinationAddress: 'Apollo Hospital ICU Ward 4B, Bannerghatta Road, Bangalore',
    zone: 'South Zone',
    priorityLevel: 'High (Emergency)',
    hasScheduleConflict: false,
    transitMode: 'Car',
    waypoints: [
      { id: 'WP-01', stopOrder: 1, addressLabel: 'Rhema Central Sanctuary', neighborhoodZone: 'Indiranagar', distanceKmFromPrev: 0, transitDurationMin: 0 },
      { id: 'WP-02', stopOrder: 2, addressLabel: 'Apollo Hospital ICU', neighborhoodZone: 'Bannerghatta Road', distanceKmFromPrev: 14.2, transitDurationMin: 35 },
    ],
    pastoralNotes: 'Patient undergoing surgery recovery. Bring holy anointing oil and communion elements.',
  },
  {
    id: 'PASTOR-EVT-102',
    demoTag: 'Simulated Pastor Itinerary (Demo)',
    title: 'New Home Blessing & Family Dedication Prayer',
    appointmentType: 'Home Blessing & Prayer',
    date: '2026-11-24',
    startTime: '02:30 PM',
    endTime: '04:00 PM',
    memberOrFamilyName: 'Brother Stephen & Sister Mary George (Demo)',
    maskedPhone: '+91 98450-XXXX2',
    destinationAddress: 'Villa 42, Prestige Palms, Whitefield Main Road, Bangalore',
    zone: 'Whitefield Zone',
    priorityLevel: 'Normal',
    hasScheduleConflict: false,
    transitMode: 'Car',
    waypoints: [
      { id: 'WP-03', stopOrder: 1, addressLabel: 'Apollo Hospital', neighborhoodZone: 'Bannerghatta Road', distanceKmFromPrev: 0, transitDurationMin: 0 },
      { id: 'WP-04', stopOrder: 2, addressLabel: 'Prestige Palms Villa 42', neighborhoodZone: 'Whitefield', distanceKmFromPrev: 22.8, transitDurationMin: 50 },
    ],
    pastoralNotes: 'Family moving into new home. House dedication prayer and dedication certificate presentation.',
  },
  {
    id: 'PASTOR-EVT-103',
    demoTag: 'Simulated Pastor Itinerary (Demo)',
    title: 'Pre-Marital Discipleship Counseling (Session 3 of 4)',
    appointmentType: 'Pre-Marital Counseling',
    date: '2026-11-25',
    startTime: '04:30 PM',
    endTime: '06:00 PM',
    memberOrFamilyName: 'Brother Kevin & Sister Anitha (Demo)',
    maskedPhone: '+91 98450-XXXX3',
    destinationAddress: 'Pastoral Counseling Suite, Rhema Central Sanctuary',
    zone: 'Central Sanctuary',
    priorityLevel: 'Normal',
    hasScheduleConflict: false,
    transitMode: 'Car',
    waypoints: [],
    pastoralNotes: 'Topic: Biblical Finances & Covenant Marriage Foundations (Ephesians 5:21-33).',
  },
];

export const INITIAL_ADMIN_JOB_OPPORTUNITIES: AdminJobOpportunity[] = [
  {
    id: 'JOB-2026-01',
    demoTag: 'Simulated Job Listing (Demo)',
    title: 'Full-Time Associate Media & Broadcast Director',
    department: 'Media & Communications',
    compensationType: 'Full-Time Church Staff',
    location: 'Rhema Central Sanctuary, Bangalore',
    status: 'Published',
    description: 'Lead our video production, live streaming broadcasts, digital mixers, and social media media team in ministry excellence.',
    requirements: [
      'Minimum 2 years experience in multi-camera live video production',
      'Proficiency in Blackmagic ATEM, OBS, and digital audio workflows',
      'Committed member with heart for church worship excellence',
    ],
    postedDate: '2026-11-01',
    closingDate: '2026-12-15',
    totalApplicants: 4,
    applicants: [
      {
        id: 'APP-JOB-01',
        applicantName: 'Brother Mark Philip (Demo)',
        phoneMasked: '+91 98801-XXXX1',
        email: 'mark.philip.demo@rhema-demo.org',
        currentStage: 'Shortlisted',
        appliedDate: '2026-11-08',
        yearsExperience: 4,
        skillsSummary: ['ATEM Switching', 'DaVinci Resolve', 'Sound Reinforcement'],
        resumeDocName: 'Resume_Mark_Philip_Media_Lead.pdf',
        interviewDate: '2026-11-26',
        notes: 'Strong portfolio in Sunday broadcast mixing. Scheduled for pastoral interview.',
      },
      {
        id: 'APP-JOB-02',
        applicantName: 'Sister Sarah Paul (Demo)',
        phoneMasked: '+91 98801-XXXX2',
        email: 'sarah.paul.demo@rhema-demo.org',
        currentStage: 'Applied',
        appliedDate: '2026-11-12',
        yearsExperience: 2,
        skillsSummary: ['Photoshop', 'Premiere Pro', 'Camera Operation'],
        resumeDocName: 'Resume_Sarah_Paul_Video.pdf',
      },
    ],
  },
  {
    id: 'JOB-2026-02',
    demoTag: 'Simulated Job Listing (Demo)',
    title: 'Children & Teens Ministry Coordinator (Part-Time)',
    department: "Children's Church",
    compensationType: 'Part-Time Ministry Stipend',
    location: 'Hebbal Campus, Bangalore',
    status: 'Published',
    description: 'Coordinate Sunday School teachers, lessons, crafts, and safety for ages 3 to 14 across our morning services.',
    requirements: [
      'Passionate about discipleship and biblical child evangelism',
      'Experience in curriculum planning and volunteer team management',
      'Clear safety background clearance',
    ],
    postedDate: '2026-11-10',
    closingDate: '2026-12-20',
    totalApplicants: 2,
    applicants: [],
  },
];

export const INITIAL_ADMIN_MINISTRY_TEAMS: AdminMinistryTeamSummary[] = [
  { teamId: 'TEAM-01', teamName: 'Worship Band & Choir', teamLead: 'Brother Daniel Sundaram', activeVolunteers: 24, meetingSchedule: 'Thursday 06:30 PM' },
  { teamId: 'TEAM-02', teamName: 'Media, Sound & Video', teamLead: 'Brother Luke Media', activeVolunteers: 16, meetingSchedule: 'Saturday 04:00 PM' },
  { teamId: 'TEAM-03', teamName: 'Ushering & Guest Hospitality', teamLead: 'Brother Stephen Head Usher', activeVolunteers: 32, meetingSchedule: 'Sunday 07:30 AM' },
  { teamId: 'TEAM-04', teamName: "Children's Ministry Faculty", teamLead: 'Sister Ruth Director', activeVolunteers: 18, meetingSchedule: '1st Saturday Monthly' },
  { teamId: 'TEAM-05', teamName: 'Intercessory Prayer Watch', teamLead: 'Mother Deborah', activeVolunteers: 28, meetingSchedule: 'Wednesday 05:00 AM' },
];

export const INITIAL_ADMIN_EXPENSES: AdminExpenseVoucher[] = [
  {
    id: 'EXP-2026-00101',
    invoiceRefNumber: 'INV-COG-8812',
    demoTag: 'Simulated Finance Voucher (Demo)',
    category: 'Audio/Visual & Media Production',
    vendorName: 'Bangalore Pro-Audio Systems Pvt Ltd (Demo)',
    description: 'Procurement of 2x Shure SLXD Wireless Vocal Microphones and replacement XLR audio snake cabling for Main Sanctuary stage.',
    amountInr: 84500,
    expenseDate: '2026-11-14',
    status: 'Approved for Payment (Sim)',
    submittedBy: 'Brother Luke (Media Director Demo)',
    approvedBy: 'Senior Pastor John Mark (Super Admin Demo)',
    receiptAttachmentName: 'Invoice_8812_BangaloreProAudio.pdf',
    notes: 'Budget cleared from Q4 2026 Media Equipment Allocation.',
  },
  {
    id: 'EXP-2026-00102',
    invoiceRefNumber: 'INV-BLR-4019',
    demoTag: 'Simulated Finance Voucher (Demo)',
    category: 'Sanctuary Lease & Utilities',
    vendorName: 'BESCOM Electric Supply (Demo)',
    description: 'Monthly electricity tariff and commercial transformer servicing for Central Sanctuary complex.',
    amountInr: 32400,
    expenseDate: '2026-11-10',
    status: 'Disbursed (Sim)',
    submittedBy: 'Brother Thomas (Admin Office Demo)',
    approvedBy: 'Senior Pastor John Mark (Super Admin Demo)',
    receiptAttachmentName: 'Receipt_BESCOM_Nov2026.pdf',
  },
  {
    id: 'EXP-2026-00103',
    invoiceRefNumber: 'INV-FOOD-1044',
    demoTag: 'Simulated Finance Voucher (Demo)',
    category: 'Missions & Community Food Drive',
    vendorName: 'Karnataka Grain Wholesale Wholesalers (Demo)',
    description: 'Purchase of 50x 25kg Rice Bags, cooking oil, and lentils for November Slum Community Outreach.',
    amountInr: 47800,
    expenseDate: '2026-11-18',
    status: 'Pending Approval (Sim)',
    submittedBy: 'Pastor Andrew (Outreach Pastor Demo)',
    receiptAttachmentName: 'GrainWholesale_Receipt_Nov18.pdf',
    notes: 'Awaiting Super Admin disbursement approval for outreach weekend.',
  },
];

export const INITIAL_ADMIN_DONATIONS: AdminDonationLedgerRecord[] = [
  {
    id: 'DON-LEDGER-2026-01',
    receiptNumber: 'RCPT-2026-1042',
    demoTag: 'Simulated Donation Record (Demo)',
    donorNameMasked: 'Brother Samuel J. (Demo)',
    purpose: 'Tithes & Firstfruits',
    paymentMode: 'Digital UPI / NetBanking (Simulated)',
    amountInr: 15000,
    donationDate: '2026-11-15',
    taxExemptionEligible: true,
  },
  {
    id: 'DON-LEDGER-2026-02',
    receiptNumber: 'RCPT-2026-1043',
    demoTag: 'Simulated Donation Record (Demo)',
    donorNameMasked: 'Sister Priscilla R. (Demo)',
    purpose: 'Church Building Fund',
    paymentMode: 'Digital UPI / NetBanking (Simulated)',
    amountInr: 25000,
    donationDate: '2026-11-15',
    taxExemptionEligible: true,
  },
  {
    id: 'DON-LEDGER-2026-03',
    receiptNumber: 'RCPT-2026-1044',
    demoTag: 'Simulated Donation Record (Demo)',
    donorNameMasked: 'Sunday Morning Anonymous Cash (Demo)',
    purpose: 'General Offering',
    paymentMode: 'Cash Offering Counter (Simulated)',
    amountInr: 48920,
    donationDate: '2026-11-15',
    taxExemptionEligible: false,
  },
];

export const INITIAL_ADMIN_FINANCE_KPI: AdminFinanceOverviewKpi = {
  fiscalMonth: 'November 2026',
  totalTithesOfferingsInr: 412500,
  totalOperatingExpensesInr: 164700,
  netReserveBalanceInr: 247800,
  pendingVoucherCount: 1,
  approvedVoucherCount: 2,
};

export const INITIAL_ADMIN_CELEBRATIONS: AdminCelebrationQueueItem[] = [
  {
    id: 'CEL-2026-01',
    demoTag: 'Simulated Celebration Item (Demo)',
    memberName: 'Brother Joshua Thomas (Demo)',
    type: 'Birthday',
    eventDate: '11-20',
    phoneMasked: '+91 97402-XXXX2',
    yearsMilestone: 35,
    assignedScriptureVerse: 'Numbers 6:24-26 ("The Lord bless you and keep you...")',
    cardDispatched: true,
    whatsappGreetingSent: true,
  },
  {
    id: 'CEL-2026-02',
    demoTag: 'Simulated Celebration Item (Demo)',
    memberName: 'Brother Mark & Sister Reena David (Demo)',
    type: 'Wedding Anniversary',
    eventDate: '11-22',
    phoneMasked: '+91 98455-XXXX1',
    yearsMilestone: 12,
    assignedScriptureVerse: 'Ecclesiastes 4:12 ("A threefold cord is not quickly broken...")',
    cardDispatched: false,
    whatsappGreetingSent: false,
  },
  {
    id: 'CEL-2026-03',
    demoTag: 'Simulated Celebration Item (Demo)',
    memberName: 'Sister Lydia Sundaram (Demo)',
    type: 'Baptism Jubilee',
    eventDate: '11-25',
    phoneMasked: '+91 99002-XXXX7',
    yearsMilestone: 1,
    assignedScriptureVerse: '2 Corinthians 5:17 ("Old things are passed away, behold, all things are become new...")',
    cardDispatched: false,
    whatsappGreetingSent: false,
  },
];

export const INITIAL_ADMIN_BROADCASTS: AdminPushBroadcastRecord[] = [
  {
    id: 'BCAST-2026-01',
    demoTag: 'Simulated Push Broadcast (Demo)',
    title: 'Reminder: 21-Day Fasting & Prayer Watch Begins This Monday',
    body: 'Join the pastoral team online daily at 05:00 AM or in-person at Central Sanctuary 07:00 PM for divine alignment.',
    targetAudience: 'All Registered Members',
    scheduledOrSentDate: '2026-11-19',
    status: 'Sent (Sim)',
    recipientCount: 1420,
  },
  {
    id: 'BCAST-2026-02',
    demoTag: 'Simulated Push Broadcast (Demo)',
    title: 'Worship Team & Choir Saturday Sound Check',
    body: 'All vocalists and instrumentalists please arrive by 03:45 PM tomorrow for Sunday morning setlist run-through.',
    targetAudience: 'Worship & Media Team',
    scheduledOrSentDate: '2026-11-21',
    status: 'Scheduled (Sim)',
    recipientCount: 38,
  },
];

export const INITIAL_ADMIN_WHATSAPP_CHATS: AdminWhatsAppChatSnippet[] = [
  {
    id: 'WA-MSG-01',
    senderName: 'Mary Magdalene Rao (Demo)',
    phoneMasked: '+91 97401-XXXX1',
    lastMessageSnippet: 'Praise the Lord Pastor, thank you so much for the birthday card and prayer audio note!',
    timestamp: '11:15 AM',
    unreadCount: 0,
    isAutomatedGreeting: false,
  },
  {
    id: 'WA-MSG-02',
    senderName: 'Joshua Thomas (Demo)',
    phoneMasked: '+91 97402-XXXX2',
    lastMessageSnippet: 'Amen Pastor! The whole family was blessed. See you at Sunday worship.',
    timestamp: 'Yesterday',
    unreadCount: 1,
    isAutomatedGreeting: false,
  },
];

export const INITIAL_ADMIN_GALLERY_ALBUMS: AdminGalleryAlbumItem[] = [
  {
    id: 'ALB-2026-01',
    albumTitle: 'Youth Encounter Camp 2026: Fire & Grace',
    coverImageTheme: 'Outdoor amphitheater worship with acoustic guitars',
    eventDate: '2026-10-18',
    photoCount: 48,
    photographerName: 'Brother Caleb (Media Team)',
  },
  {
    id: 'ALB-2026-02',
    albumTitle: 'Holy Communion & Miracle Healing Service',
    coverImageTheme: 'Pastors ministering communion elements at sanctuary altar',
    eventDate: '2026-11-01',
    photoCount: 32,
    photographerName: 'Sister Sarah (Media Team)',
  },
];

export const INITIAL_ADMIN_ONLINE_MEETINGS: AdminOnlineMeetingSession[] = [
  {
    id: 'MEET-2026-01',
    title: 'Wednesday Mid-Week Bible Study & Global Intercession',
    platform: 'Zoom Video (Sim)',
    meetingDate: '2026-11-25',
    meetingTime: '07:30 PM',
    passcodeProtected: true,
    passcode: 'RHEMA777',
    registeredAttendeesCount: 165,
  },
  {
    id: 'MEET-2026-02',
    title: 'Early Morning 05:00 AM Breakthrough Prayer Watch',
    platform: 'Google Meet (Sim)',
    meetingDate: '2026-11-26',
    meetingTime: '05:00 AM',
    passcodeProtected: false,
    passcode: '',
    registeredAttendeesCount: 88,
  },
];

export const INITIAL_ADMIN_BRANCHES: AdminBranchRecord[] = [
  {
    id: 'BRANCH-CENTRAL',
    name: 'Rhema Central Sanctuary',
    locality: 'Indiranagar / Old Airport Road',
    address: '100 Feet Road, Indiranagar, Bangalore - 560038',
    seniorPastor: 'Senior Pastor John Mark (Demo)',
    activeMembersCount: 1140,
    isMainSanctuary: true,
    status: 'Active Campus (Sim)',
  },
  {
    id: 'BRANCH-WHITEFIELD',
    name: 'Rhema Whitefield Campus',
    locality: 'Whitefield Main Road',
    address: 'ITPL Main Road, Whitefield, Bangalore - 560066',
    seniorPastor: 'Pastor Timothy Barnabas (Demo)',
    activeMembersCount: 420,
    isMainSanctuary: false,
    status: 'Active Campus (Sim)',
  },
  {
    id: 'BRANCH-HEBBAL',
    name: 'Rhema Hebbal Fellowship',
    locality: 'Kempapura / Hebbal',
    address: 'Bellary Road, Near Esteem Mall, Hebbal, Bangalore - 560024',
    seniorPastor: 'Pastor Andrew David (Demo)',
    activeMembersCount: 280,
    isMainSanctuary: false,
    status: 'Active Campus (Sim)',
  },
];

export const INITIAL_ADMIN_CHURCH_SETTINGS: AdminChurchSettingsConfig = {
  churchName: 'Rhema Christian Ministry',
  tagline: 'A Christ-Centered, Spirit-Filled Family of Believers',
  sanctuaryLatitude: 12.9716, // Bangalore Central Sanctuary coordinates
  sanctuaryLongitude: 77.5946,
  attendanceGeofenceRadiusMeters: 100, // 100-meter radius boundary for M15 Attendance
  primaryContactPhone: '+91 80 2520-0000',
  pastoralSupportEmail: 'pastor.office@rhema-demo.org',
  sundayService1Time: '09:00 AM',
  sundayService2Time: '11:15 AM',
  midweekPrayerTime: 'Wednesday 07:00 PM',
  dailyVerseEngineSyncEnabled: true,
  dailyQuizEngineSyncEnabled: true,
};

export const INITIAL_PLATFORM_SUPERADMINS: PlatformSuperAdminRecord[] = [
  {
    id: 'SA-PLATFORM-01',
    adminName: 'Senior Pastor John Mark (Demo)',
    email: 'pastor.johnmark@rhema-demo.org',
    role: 'superadmin',
    assignedDate: '2024-01-01',
    isPrimaryRootAdmin: true,
  },
  {
    id: 'SA-PLATFORM-02',
    adminName: 'Elder Samuel Executive Pastor (Demo)',
    email: 'elder.samuel@rhema-demo.org',
    role: 'superadmin',
    assignedDate: '2024-06-15',
    isPrimaryRootAdmin: false,
  },
];
