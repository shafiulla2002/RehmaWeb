/**
 * Wave 7B (M33–M39) Shared Demonstration Datasets & Pure Utilities
 * Strictly Layer A Frontend Simulation Mode — ZERO Firebase imports, reads, or writes.
 * 
 * Canonical Wave 7B Modules:
 * - M33: Members CRM & Registration Approvals (/admin/members)
 * - M34: Attendance Management (/admin/attendance)
 * - M35: Prayer Request Moderation (/admin/prayer)
 * - M36: Testimony Moderation (/admin/testimonies)
 * - M37: Care Cells Management (/admin/care-cells)
 * - M38: Baptism Requests (/admin/baptism)
 * - M39: Volunteer Management (/admin/volunteering)
 */

// ==========================================
// M33: Members CRM & Registration Approvals Models
// ==========================================
export type MemberSpiritualStatus = 'Baptized' | 'Preparing' | 'Candidate' | 'Under Care';
export type MemberAccountStatus = 'Active' | 'Pending Review' | 'Inactive' | 'Archived';
export type MemberMinistryGroup = 'Youth Ministry' | "Women's Fellowship" | "Men's Fellowship" | 'Worship Choir' | 'Media & Production' | 'Children & Teens' | 'Senior Saints' | 'General';

export interface AdminFamilyMemberRef {
  id: string;
  name: string;
  relation: 'Self' | 'Spouse' | 'Child' | 'Parent' | 'Sibling';
  ageGroup: 'Adult' | 'Youth' | 'Child';
}

export interface AdminMemberRecord {
  id: string; // e.g. "RHEMA-2026-M001"
  demoTag: 'Simulated Member Record (Demo)';
  fullName: string;
  phoneMasked: string; // e.g. "+91 98765-XXXX1"
  email: string;
  city: string;
  zone: 'Hebbal Zone' | 'Indiranagar Zone' | 'Whitefield Zone' | 'Jayanagar Zone' | 'Central Zone';
  careCellId?: string;
  careCellName?: string;
  spiritualStatus: MemberSpiritualStatus;
  accountStatus: MemberAccountStatus;
  ministryGroup: MemberMinistryGroup;
  familyId: string;
  familyRole: 'Head of Household' | 'Spouse' | 'Dependent' | 'Individual';
  familyMembers: AdminFamilyMemberRef[];
  joinDate: string; // YYYY-MM-DD
  notes: string;
}

export interface AdminRegistrationRequest {
  id: string; // e.g. "REQ-2026-081"
  demoTag: 'Simulated Registration Request (Demo)';
  applicantName: string;
  phoneMasked: string;
  email: string;
  city: string;
  zone: string;
  preferredLanguage: string;
  previousChurchBackground: string;
  status: 'Pending Review (Sim)' | 'Interview Scheduled (Sim)' | 'Approved (Sim)' | 'Rejected (Sim)';
  appliedDate: string; // YYYY-MM-DD
  pastoralNotes?: string;
}

// ==========================================
// M34: Attendance Management Models
// ==========================================
export type SundayServiceSlot = '08:30 AM (1st Service)' | '11:00 AM (2nd Service)' | '05:00 PM (Youth Service)' | '07:00 PM (Mid-Week Prayer)';

export interface AdminHeadcountSection {
  sectionName: 'Main Sanctuary' | 'Balcony' | 'Overflow Hall' | "Children's Church";
  count: number;
}

export interface AdminAttendanceSession {
  id: string; // e.g. "ATT-2026-11-15-S1"
  demoTag: 'Simulated Attendance Record (Demo)';
  serviceDate: string; // YYYY-MM-DD
  serviceSlot: SundayServiceSlot;
  headcounts: AdminHeadcountSection[];
  totalHeadcount: number;
  firstTimeVisitors: number;
  regularMembersCheckedIn: number;
  leadUsher: string;
  notes: string;
}

export interface AdminAbsenteeAlert {
  id: string;
  memberId: string;
  memberName: string;
  phoneMasked: string;
  zone: string;
  consecutiveSundaysAbsent: number;
  lastAttendedDate: string;
  followUpStatus: 'Needs Contact (Sim)' | 'Call Logged (Sim)' | 'Pastoral Visit Planned (Sim)' | 'Resolved (Sim)';
  pastoralLog?: string;
}

// ==========================================
// M35: Prayer Request Moderation Models
// ==========================================
export type PrayerModerationCategory = 'Healing & Health' | 'Family & Marriage' | 'Job & Financial Deliverance' | 'Spiritual Growth' | 'Travel & Protection' | 'Praise & Thanksgiving';
export type PrayerModerationDecision = 'Pending Review (Sim)' | 'Approved for Wall (Public)' | 'Pastoral Confidential (Sim)' | 'Answered Praise (Sim)' | 'Archived (Sim)';

export interface AdminPrayerModerationItem {
  id: string; // e.g. "PRAY-MOD-101"
  demoTag: 'Simulated Prayer Moderation (Demo)';
  submittedBy: string;
  isAnonymousOnWall: boolean;
  phoneMasked: string;
  category: PrayerModerationCategory;
  title: string;
  prayerText: string;
  status: PrayerModerationDecision;
  isUrgentFlag: boolean;
  submittedDate: string; // YYYY-MM-DD
  reviewedBy?: string;
  pastoralConfidentialNotes?: string;
}

// ==========================================
// M36: Testimony Moderation Models
// ==========================================
export type TestimonyCategory = 'Miraculous Healing' | 'Financial & Job Breakthrough' | 'Family Deliverance' | 'Salvation Experience' | 'Academic Success' | 'General Thanksgiving';
export type TestimonyModerationStatus = 'Pending Review (Sim)' | 'Approved for Congregation (Sim)' | 'Needs Pastoral Clarification (Sim)' | 'Archived (Sim)';

export interface AdminTestimonyModerationItem {
  id: string; // e.g. "TEST-MOD-201"
  demoTag: 'Simulated Testimony Moderation (Demo)';
  authorName: string;
  isAnonymous: boolean;
  phoneMasked: string;
  category: TestimonyCategory;
  title: string;
  content: string;
  eventDate: string; // Approximate date of miracle
  status: TestimonyModerationStatus;
  isFeaturedForSunday: boolean;
  initialAmenCount: number;
  submittedDate: string; // YYYY-MM-DD
  moderatorNotes?: string;
}

// ==========================================
// M37: Care Cells Management Models
// ==========================================
export interface AdminCareCellRecord {
  id: string; // e.g. "CELL-HEBBAL-01"
  demoTag?: string;
  name: string;
  zone: 'Hebbal Zone' | 'Indiranagar Zone' | 'Whitefield Zone' | 'Jayanagar Zone' | 'Central Zone';
  leaderName: string;
  leaderPhoneMasked: string;
  assistantLeaderName: string;
  hostAddress: string;
  meetingDay: 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  meetingTime: string; // e.g. "07:00 PM"
  assignedStudyGuideTopic: string;
  activeMemberCount: number;
  capacityMax: number;
  status: 'Active (Sim)' | 'New / Launching (Sim)' | 'On Hold (Sim)';
}

// ==========================================
// M38: Baptism Requests Models
// ==========================================
export type BaptismStage = 
  | 'Stage 1: Application Review (Sim)'
  | 'Stage 2: Counseling Scheduled (Sim)'
  | 'Stage 3: Pastoral Interview Passed (Sim)'
  | 'Stage 4: Baptism Service Scheduled (Sim)';

export interface AdminBaptismCandidate {
  id: string; // e.g. "BAPT-2026-01"
  demoTag?: string;
  candidateName: string;
  age: number;
  phoneMasked: string;
  email: string;
  zone: string;
  salvationDate: string;
  personalTestimonySnippet: string;
  currentStage: BaptismStage;
  counselorAssigned?: string;
  classesCompletedCount: number; // 0 to 3
  scheduledBaptismDate?: string; // YYYY-MM-DD
  certificateIssued: boolean;
  appliedDate: string;
}

// ==========================================
// M39: Volunteer Management Models
// ==========================================
export type VolunteerDepartment = 
  | 'Ushering & Hospitality'
  | 'Worship Choir & Media Audio/Visual'
  | "Children's & Teens Ministry"
  | 'Intercessory Prayer Team'
  | 'Community Outreach & Food Drive'
  | 'Welcome Desk & Guest Care';

export type VolunteerOnboardingStatus = 
  | 'Applied (Sim)'
  | 'Screening & Interview (Sim)'
  | 'Orientation & Training (Sim)'
  | 'Active Volunteer (Sim)'
  | 'Inactive (Sim)';

export interface AdminVolunteerApplication {
  id: string; // e.g. "VOL-2026-01"
  demoTag?: string;
  volunteerName: string;
  phoneMasked: string;
  email: string;
  department: VolunteerDepartment;
  skills: string[];
  availability: 'Sunday 1st Service' | 'Sunday 2nd Service' | 'Sunday Youth' | 'Mid-Week' | 'Special Events';
  status: VolunteerOnboardingStatus;
  backgroundCheckVerified: boolean;
  departmentMentor: string;
  assignedServiceRole?: string;
  joinedDate: string;
}

// =========================================================================
// SYNTHETIC BASELINE DEMONSTRATION DATASETS (Zero Production / PII Data)
// =========================================================================

export const INITIAL_ADMIN_MEMBERS: AdminMemberRecord[] = [
  {
    id: 'RHEMA-2026-M001',
    demoTag: 'Simulated Member Record (Demo)',
    fullName: 'David K. Joseph (Demo)',
    phoneMasked: '+91 98450-XXXX1',
    email: 'david.joseph.demo@rhema-demo.org',
    city: 'Bangalore',
    zone: 'Hebbal Zone',
    careCellId: 'CELL-HEBBAL-01',
    careCellName: 'Grace & Truth Fellowship',
    spiritualStatus: 'Baptized',
    accountStatus: 'Active',
    ministryGroup: "Men's Fellowship",
    familyId: 'FAM-001',
    familyRole: 'Head of Household',
    familyMembers: [
      { id: 'RHEMA-2026-M001', name: 'David K. Joseph (Demo)', relation: 'Self', ageGroup: 'Adult' },
      { id: 'RHEMA-2026-M002', name: 'Sarah Joseph (Demo)', relation: 'Spouse', ageGroup: 'Adult' },
      { id: 'RHEMA-2026-M003', name: 'Ethan Joseph (Demo)', relation: 'Child', ageGroup: 'Child' },
    ],
    joinDate: '2024-03-15',
    notes: 'Regular attendee since 2024. Active in ushering team.',
  },
  {
    id: 'RHEMA-2026-M002',
    demoTag: 'Simulated Member Record (Demo)',
    fullName: 'Sarah Joseph (Demo)',
    phoneMasked: '+91 98450-XXXX2',
    email: 'sarah.joseph.demo@rhema-demo.org',
    city: 'Bangalore',
    zone: 'Hebbal Zone',
    careCellId: 'CELL-HEBBAL-01',
    careCellName: 'Grace & Truth Fellowship',
    spiritualStatus: 'Baptized',
    accountStatus: 'Active',
    ministryGroup: "Women's Fellowship",
    familyId: 'FAM-001',
    familyRole: 'Spouse',
    familyMembers: [
      { id: 'RHEMA-2026-M001', name: 'David K. Joseph (Demo)', relation: 'Spouse', ageGroup: 'Adult' },
      { id: 'RHEMA-2026-M002', name: 'Sarah Joseph (Demo)', relation: 'Self', ageGroup: 'Adult' },
      { id: 'RHEMA-2026-M003', name: 'Ethan Joseph (Demo)', relation: 'Child', ageGroup: 'Child' },
    ],
    joinDate: '2024-03-15',
    notes: "Children's church teacher assistant.",
  },
  {
    id: 'RHEMA-2026-M004',
    demoTag: 'Simulated Member Record (Demo)',
    fullName: 'Samuel Paul (Demo)',
    phoneMasked: '+91 97410-XXXX4',
    email: 'samuel.paul.demo@rhema-demo.org',
    city: 'Bangalore',
    zone: 'Indiranagar Zone',
    careCellId: 'CELL-INDIRA-01',
    careCellName: 'Living Waters Fellowship',
    spiritualStatus: 'Baptized',
    accountStatus: 'Active',
    ministryGroup: 'Youth Ministry',
    familyId: 'FAM-002',
    familyRole: 'Individual',
    familyMembers: [
      { id: 'RHEMA-2026-M004', name: 'Samuel Paul (Demo)', relation: 'Self', ageGroup: 'Youth' },
    ],
    joinDate: '2025-01-10',
    notes: 'Worship media projection team member.',
  },
  {
    id: 'RHEMA-2026-M005',
    demoTag: 'Simulated Member Record (Demo)',
    fullName: 'Priscilla Reddy (Demo)',
    phoneMasked: '+91 99000-XXXX5',
    email: 'priscilla.reddy.demo@rhema-demo.org',
    city: 'Bangalore',
    zone: 'Whitefield Zone',
    careCellId: 'CELL-WHITE-01',
    careCellName: 'Cornerstone Care Cell',
    spiritualStatus: 'Candidate',
    accountStatus: 'Active',
    ministryGroup: "Women's Fellowship",
    familyId: 'FAM-003',
    familyRole: 'Head of Household',
    familyMembers: [
      { id: 'RHEMA-2026-M005', name: 'Priscilla Reddy (Demo)', relation: 'Self', ageGroup: 'Adult' },
    ],
    joinDate: '2025-06-20',
    notes: 'Enrolled in baptism preparation classes.',
  },
  {
    id: 'RHEMA-2026-M006',
    demoTag: 'Simulated Member Record (Demo)',
    fullName: 'Abraham Mathew (Demo)',
    phoneMasked: '+91 98860-XXXX6',
    email: 'abraham.mathew.demo@rhema-demo.org',
    city: 'Bangalore',
    zone: 'Jayanagar Zone',
    careCellId: 'CELL-JAYA-01',
    careCellName: 'Bethel Community Cell',
    spiritualStatus: 'Baptized',
    accountStatus: 'Active',
    ministryGroup: 'Senior Saints',
    familyId: 'FAM-004',
    familyRole: 'Head of Household',
    familyMembers: [
      { id: 'RHEMA-2026-M006', name: 'Abraham Mathew (Demo)', relation: 'Self', ageGroup: 'Adult' },
    ],
    joinDate: '2023-11-01',
    notes: 'Senior intercessor, attends mid-week prayer.',
  },
];

export const INITIAL_ADMIN_APPROVALS: AdminRegistrationRequest[] = [
  {
    id: 'REQ-2026-081',
    demoTag: 'Simulated Registration Request (Demo)',
    applicantName: 'Timothy Rao (Demo)',
    phoneMasked: '+91 98451-XXXX1',
    email: 'timothy.rao.demo@rhema-demo.org',
    city: 'Bangalore',
    zone: 'Hebbal Zone',
    preferredLanguage: 'Telugu & English',
    previousChurchBackground: 'Baptist Church Guntur (Relocated to Bangalore)',
    status: 'Pending Review (Sim)',
    appliedDate: '2026-11-18',
    pastoralNotes: 'Attended two Sunday morning services. Requested membership interview.',
  },
  {
    id: 'REQ-2026-082',
    demoTag: 'Simulated Registration Request (Demo)',
    applicantName: 'Rachel Grace (Demo)',
    phoneMasked: '+91 98452-XXXX2',
    email: 'rachel.grace.demo@rhema-demo.org',
    city: 'Bangalore',
    zone: 'Indiranagar Zone',
    preferredLanguage: 'English',
    previousChurchBackground: 'Assemblies of God (College Student)',
    status: 'Interview Scheduled (Sim)',
    appliedDate: '2026-11-17',
    pastoralNotes: 'Pastoral counseling meeting set for Sunday 12:30 PM.',
  },
  {
    id: 'REQ-2026-083',
    demoTag: 'Simulated Registration Request (Demo)',
    applicantName: 'Enoch Daniel (Demo)',
    phoneMasked: '+91 98453-XXXX3',
    email: 'enoch.daniel.demo@rhema-demo.org',
    city: 'Bangalore',
    zone: 'Central Zone',
    preferredLanguage: 'Hindi & English',
    previousChurchBackground: 'Church of North India',
    status: 'Pending Review (Sim)',
    appliedDate: '2026-11-19',
    pastoralNotes: 'Wishes to join Sunday evening youth fellowship.',
  },
];

export const INITIAL_ADMIN_ATTENDANCE: AdminAttendanceSession[] = [
  {
    id: 'ATT-2026-11-15-S1',
    demoTag: 'Simulated Attendance Record (Demo)',
    serviceDate: '2026-11-15',
    serviceSlot: '08:30 AM (1st Service)',
    headcounts: [
      { sectionName: 'Main Sanctuary', count: 342 },
      { sectionName: 'Balcony', count: 118 },
      { sectionName: 'Overflow Hall', count: 45 },
      { sectionName: "Children's Church", count: 64 },
    ],
    totalHeadcount: 569,
    firstTimeVisitors: 28,
    regularMembersCheckedIn: 410,
    leadUsher: 'Brother Stephen (Demo)',
    notes: 'Communion Sunday service. Sanctuary reached full capacity by 09:00 AM.',
  },
  {
    id: 'ATT-2026-11-15-S2',
    demoTag: 'Simulated Attendance Record (Demo)',
    serviceDate: '2026-11-15',
    serviceSlot: '11:00 AM (2nd Service)',
    headcounts: [
      { sectionName: 'Main Sanctuary', count: 412 },
      { sectionName: 'Balcony', count: 145 },
      { sectionName: 'Overflow Hall', count: 82 },
      { sectionName: "Children's Church", count: 91 },
    ],
    totalHeadcount: 730,
    firstTimeVisitors: 44,
    regularMembersCheckedIn: 520,
    leadUsher: 'Brother Philip (Demo)',
    notes: 'Bilingual worship service with guest testimonies.',
  },
  {
    id: 'ATT-2026-11-08-S1',
    demoTag: 'Simulated Attendance Record (Demo)',
    serviceDate: '2026-11-08',
    serviceSlot: '08:30 AM (1st Service)',
    headcounts: [
      { sectionName: 'Main Sanctuary', count: 320 },
      { sectionName: 'Balcony', count: 105 },
      { sectionName: 'Overflow Hall', count: 38 },
      { sectionName: "Children's Church", count: 58 },
    ],
    totalHeadcount: 521,
    firstTimeVisitors: 21,
    regularMembersCheckedIn: 395,
    leadUsher: 'Brother Stephen (Demo)',
    notes: 'Normal Sunday schedule.',
  },
];

export const INITIAL_ADMIN_ABSENTEES: AdminAbsenteeAlert[] = [
  {
    id: 'ABS-001',
    memberId: 'RHEMA-2026-M018',
    memberName: 'Barnabas Varma (Demo)',
    phoneMasked: '+91 99120-XXXX8',
    zone: 'Hebbal Zone',
    consecutiveSundaysAbsent: 3,
    lastAttendedDate: '2026-10-25',
    followUpStatus: 'Needs Contact (Sim)',
    pastoralLog: 'No response to previous WhatsApp bulletin check-in.',
  },
  {
    id: 'ABS-002',
    memberId: 'RHEMA-2026-M029',
    memberName: 'Elizabeth Kurian (Demo)',
    phoneMasked: '+91 94480-XXXX9',
    zone: 'Whitefield Zone',
    consecutiveSundaysAbsent: 4,
    lastAttendedDate: '2026-10-18',
    followUpStatus: 'Call Logged (Sim)',
    pastoralLog: 'Spoke with member on 17 Nov. Recovering from surgery; requested prayer visit.',
  },
];

export const INITIAL_ADMIN_PRAYER: AdminPrayerModerationItem[] = [
  {
    id: 'PRAY-MOD-101',
    demoTag: 'Simulated Prayer Moderation (Demo)',
    submittedBy: 'Brother Luke (Demo)',
    isAnonymousOnWall: false,
    phoneMasked: '+91 98801-XXXX1',
    category: 'Healing & Health',
    title: 'Prayer for Mother in Hospital ICU',
    prayerText: 'Please pray for my mother admitted in Bangalore Baptist Hospital with severe pneumonia. Believing for rapid recovery and breathing stabilization.',
    status: 'Pending Review (Sim)',
    isUrgentFlag: true,
    submittedDate: '2026-11-19',
    pastoralConfidentialNotes: 'Urgent hospital visitation requested. Care cell leader alerted.',
  },
  {
    id: 'PRAY-MOD-102',
    demoTag: 'Simulated Prayer Moderation (Demo)',
    submittedBy: 'Sister Mercy (Demo)',
    isAnonymousOnWall: true,
    phoneMasked: '+91 98802-XXXX2',
    category: 'Job & Financial Deliverance',
    title: 'Final Round Job Interview Tomorrow',
    prayerText: 'Appearing for final technical panel interview for software engineer post after 5 months of unemployment. Asking God for favor and peace.',
    status: 'Approved for Wall (Public)',
    isUrgentFlag: false,
    submittedDate: '2026-11-18',
    reviewedBy: 'Pastor Timothy (Demo)',
  },
  {
    id: 'PRAY-MOD-103',
    demoTag: 'Simulated Prayer Moderation (Demo)',
    submittedBy: 'Anonymous Church Member (Demo)',
    isAnonymousOnWall: true,
    phoneMasked: '+91 98803-XXXX3',
    category: 'Family & Marriage',
    title: 'Peace in Strained Marriage Relationship',
    prayerText: 'Seeking deep prayer for reconciliation and Christ-centered restoration in our marriage amidst difficult misunderstandings.',
    status: 'Pastoral Confidential (Sim)',
    isUrgentFlag: false,
    submittedDate: '2026-11-17',
    reviewedBy: 'Senior Pastor (Demo)',
    pastoralConfidentialNotes: 'Confidential marital counseling scheduled with pastoral team.',
  },
];

export const INITIAL_ADMIN_TESTIMONIES: AdminTestimonyModerationItem[] = [
  {
    id: 'TEST-MOD-201',
    demoTag: 'Simulated Testimony Moderation (Demo)',
    authorName: 'Mary Magdalene Rao (Demo)',
    isAnonymous: false,
    phoneMasked: '+91 97401-XXXX1',
    category: 'Miraculous Healing',
    title: 'Healed from Chronic Migraines After Anointing Service',
    content: 'Suffered for over 4 years with debilitating headaches. At last month healing and communion service, elders laid hands and prayed. Praise Jesus, I have been 100% pain-free ever since!',
    eventDate: '2026-10-28',
    status: 'Approved for Congregation (Sim)',
    isFeaturedForSunday: true,
    initialAmenCount: 42,
    submittedDate: '2026-11-10',
    moderatorNotes: 'Cleared for Sunday morning announcement praise highlight.',
  },
  {
    id: 'TEST-MOD-202',
    demoTag: 'Simulated Testimony Moderation (Demo)',
    authorName: 'Joshua Thomas (Demo)',
    isAnonymous: false,
    phoneMasked: '+91 97402-XXXX2',
    category: 'Financial & Job Breakthrough',
    title: 'God Provided Debt Relief & New Employment',
    content: 'After losing my job in July, our family held onto Philippians 4:19. Yesterday God opened an incredible management role with double the salary to clear our loans.',
    eventDate: '2026-11-12',
    status: 'Pending Review (Sim)',
    isFeaturedForSunday: false,
    initialAmenCount: 15,
    submittedDate: '2026-11-16',
  },
  {
    id: 'TEST-MOD-203',
    demoTag: 'Simulated Testimony Moderation (Demo)',
    authorName: 'Sister Grace (Demo)',
    isAnonymous: true,
    phoneMasked: '+91 97403-XXXX3',
    category: 'Salvation Experience',
    title: 'Brother Came to Christ Through Church Easter Broadcast',
    content: 'My elder brother who opposed the gospel watched the Rhema online YouTube broadcast and gave his heart to the Lord. Now attending care cell regularly.',
    eventDate: '2026-11-01',
    status: 'Approved for Congregation (Sim)',
    isFeaturedForSunday: false,
    initialAmenCount: 38,
    submittedDate: '2026-11-12',
  },
];

export const INITIAL_ADMIN_CARECELLS: AdminCareCellRecord[] = [
  {
    id: 'CELL-HEBBAL-01',
    demoTag: 'Simulated Care Cell Record (Demo)',
    name: 'Grace & Truth Fellowship',
    zone: 'Hebbal Zone',
    leaderName: 'Brother Mark David (Demo)',
    leaderPhoneMasked: '+91 98455-XXXX1',
    assistantLeaderName: 'Sister Reena David (Demo)',
    hostAddress: 'Flat 402, Royal Palms, Kempapura, Hebbal, Bangalore',
    meetingDay: 'Thursday',
    meetingTime: '07:00 PM',
    assignedStudyGuideTopic: 'Walking in the Fruit of the Spirit (Part 3)',
    activeMemberCount: 14,
    capacityMax: 18,
    status: 'Active (Sim)',
  },
  {
    id: 'CELL-INDIRA-01',
    demoTag: 'Simulated Care Cell Record (Demo)',
    name: 'Living Waters Fellowship',
    zone: 'Indiranagar Zone',
    leaderName: 'Brother Silas Roy (Demo)',
    leaderPhoneMasked: '+91 98455-XXXX2',
    assistantLeaderName: 'Brother Caleb John (Demo)',
    hostAddress: '#24, 12th Main Road, HAL 2nd Stage, Indiranagar, Bangalore',
    meetingDay: 'Friday',
    meetingTime: '07:30 PM',
    assignedStudyGuideTopic: 'Overcoming Anxiety through Prayer & Thanksgiving',
    activeMemberCount: 16,
    capacityMax: 20,
    status: 'Active (Sim)',
  },
  {
    id: 'CELL-WHITE-01',
    demoTag: 'Simulated Care Cell Record (Demo)',
    name: 'Cornerstone Care Cell',
    zone: 'Whitefield Zone',
    leaderName: 'Brother Andrew Thomas (Demo)',
    leaderPhoneMasked: '+91 98455-XXXX3',
    assistantLeaderName: 'Sister Grace Thomas (Demo)',
    hostAddress: 'Villa 18, Palm Meadows, Ramagondanahalli, Whitefield, Bangalore',
    meetingDay: 'Wednesday',
    meetingTime: '07:00 PM',
    assignedStudyGuideTopic: 'Kingdom Stewardship & Generosity',
    activeMemberCount: 12,
    capacityMax: 16,
    status: 'Active (Sim)',
  },
  {
    id: 'CELL-JAYA-01',
    demoTag: 'Simulated Care Cell Record (Demo)',
    name: 'Bethel Community Cell',
    zone: 'Jayanagar Zone',
    leaderName: 'Brother Cornelius Rao (Demo)',
    leaderPhoneMasked: '+91 98455-XXXX4',
    assistantLeaderName: 'Sister Esther Rao (Demo)',
    hostAddress: '#105, 4th Block, 9th Cross, Jayanagar, Bangalore',
    meetingDay: 'Friday',
    meetingTime: '06:45 PM',
    assignedStudyGuideTopic: 'The Power of Scriptural Unity in the Body',
    activeMemberCount: 18,
    capacityMax: 20,
    status: 'Active (Sim)',
  },
];

export const INITIAL_ADMIN_BAPTISM: AdminBaptismCandidate[] = [
  {
    id: 'BAPT-2026-01',
    demoTag: 'Simulated Baptism Candidate (Demo)',
    candidateName: 'Priscilla Reddy (Demo)',
    age: 28,
    phoneMasked: '+91 99000-XXXX5',
    email: 'priscilla.reddy.demo@rhema-demo.org',
    zone: 'Whitefield Zone',
    salvationDate: '2025-05-15',
    personalTestimonySnippet: 'Came from non-Christian background, encountered Christ during personal illness. Desires full water baptism obedience.',
    currentStage: 'Stage 3: Pastoral Interview Passed (Sim)',
    counselorAssigned: 'Pastor John Mark (Demo)',
    classesCompletedCount: 3,
    scheduledBaptismDate: '2026-11-29',
    certificateIssued: false,
    appliedDate: '2026-10-15',
  },
  {
    id: 'BAPT-2026-02',
    demoTag: 'Simulated Baptism Candidate (Demo)',
    candidateName: 'Daniel Jonathan (Demo)',
    age: 19,
    phoneMasked: '+91 99001-XXXX6',
    email: 'daniel.jonathan.demo@rhema-demo.org',
    zone: 'Hebbal Zone',
    salvationDate: '2026-02-10',
    personalTestimonySnippet: 'Grew up attending youth ministry, made personal decision for Christ during youth camp.',
    currentStage: 'Stage 2: Counseling Scheduled (Sim)',
    counselorAssigned: 'Elder Samuel (Demo)',
    classesCompletedCount: 2,
    appliedDate: '2026-10-22',
    certificateIssued: false,
  },
  {
    id: 'BAPT-2026-03',
    demoTag: 'Simulated Baptism Candidate (Demo)',
    candidateName: 'Lydia Sundaram (Demo)',
    age: 34,
    phoneMasked: '+91 99002-XXXX7',
    email: 'lydia.sundaram.demo@rhema-demo.org',
    zone: 'Indiranagar Zone',
    salvationDate: '2026-06-01',
    personalTestimonySnippet: 'Accepted Christ during gospel outreach. Submitting request for water baptism classes.',
    currentStage: 'Stage 1: Application Review (Sim)',
    classesCompletedCount: 0,
    appliedDate: '2026-11-15',
    certificateIssued: false,
  },
];

export const INITIAL_ADMIN_VOLUNTEERS: AdminVolunteerApplication[] = [
  {
    id: 'VOL-2026-01',
    demoTag: 'Simulated Volunteer Record (Demo)',
    volunteerName: 'Jonathan Samuel (Demo)',
    phoneMasked: '+91 98458-XXXX1',
    email: 'jonathan.samuel.demo@rhema-demo.org',
    department: 'Worship Choir & Media Audio/Visual',
    skills: ['Sound Engineering', 'Digital Mixing Console', 'Audio Cabling'],
    availability: 'Sunday 1st Service',
    status: 'Active Volunteer (Sim)',
    backgroundCheckVerified: true,
    departmentMentor: 'Brother Luke (Head of Media)',
    assignedServiceRole: 'FOH Sound Engineer (Morning)',
    joinedDate: '2025-08-10',
  },
  {
    id: 'VOL-2026-02',
    demoTag: 'Simulated Volunteer Record (Demo)',
    volunteerName: 'Hannah Deborah (Demo)',
    phoneMasked: '+91 98458-XXXX2',
    email: 'hannah.deborah.demo@rhema-demo.org',
    department: "Children's & Teens Ministry",
    skills: ['Storytelling', 'Sunday School Curriculum', 'First Aid Certified'],
    availability: 'Sunday 2nd Service',
    status: 'Active Volunteer (Sim)',
    backgroundCheckVerified: true,
    departmentMentor: 'Sister Ruth (Children Ministry Director)',
    assignedServiceRole: 'Primary Class Teacher (Ages 6-9)',
    joinedDate: '2025-09-01',
  },
  {
    id: 'VOL-2026-03',
    demoTag: 'Simulated Volunteer Record (Demo)',
    volunteerName: 'Mathew Varughese (Demo)',
    phoneMasked: '+91 98458-XXXX3',
    email: 'mathew.varughese.demo@rhema-demo.org',
    department: 'Ushering & Hospitality',
    skills: ['Crowd Logistics', 'Parking Management', 'First-Time Guest Welcome'],
    availability: 'Sunday 1st Service',
    status: 'Orientation & Training (Sim)',
    backgroundCheckVerified: true,
    departmentMentor: 'Brother Stephen (Head Usher)',
    joinedDate: '2026-11-05',
  },
  {
    id: 'VOL-2026-04',
    demoTag: 'Simulated Volunteer Record (Demo)',
    volunteerName: 'Tabitha Solomon (Demo)',
    phoneMasked: '+91 98458-XXXX4',
    email: 'tabitha.solomon.demo@rhema-demo.org',
    department: 'Community Outreach & Food Drive',
    skills: ['Medical Camp Support', 'Community Food Distribution', 'Tamil & Kannada Translation'],
    availability: 'Special Events',
    status: 'Applied (Sim)',
    backgroundCheckVerified: false,
    departmentMentor: 'Pastor Andrew (Outreach Pastor)',
    joinedDate: '2026-11-18',
  },
];
