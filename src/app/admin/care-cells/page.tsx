'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminNavigationShell } from '@/components/layout/AdminNavigationShell';
import { Button } from '@/components/ui/Button';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  Building2,
  Users,
  UserCheck,
  TrendingUp,
  Calendar,
  AlertCircle,
  Plus,
  PlusCircle,
  CalendarPlus,
  ClipboardCheck,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Search,
  Phone,
  User,
  UserPlus,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Clock,
  MapPin,
  Loader2,
  Sparkles,
  LayoutDashboard,
  Check,
  BookOpen,
  Home,
  Heart,
  Megaphone,
  Navigation,
  MessageCircle,
  ArrowRightLeft,
  Send,
  Share2,
  Download,
  AlertTriangle,
  Flame,
  CheckSquare,
} from 'lucide-react';

export interface CareCellRecord {
  id: string;
  name: string;
  cellCode: string;
  description?: string;
  location: string;
  meetingLocation: string;
  leaderId?: string;
  leaderName: string;
  leaderPhone: string;
  leaderPhoto?: string;
  assistantLeaderId?: string;
  assistantLeaderName?: string;
  assistantLeaderPhone?: string;
  assistantLeaderPhoto?: string;
  meetingDay: string;
  meetingTime: string;
  meetingEndTime?: string;
  maximumMembers: number;
  activeMemberCount: number;
  status: 'Active' | 'Inactive' | 'Archived';
  createdAt?: any;
  updatedAt?: any;
}

export interface CareCellMembershipRecord {
  id: string;
  cellId: string;
  cellCode: string;
  cellName: string;
  memberId: string;
  memberName: string;
  memberPhone?: string;
  memberPhoto?: string;
  locality?: string;
  address?: string;
  membershipStatus: 'Active' | 'Transferred' | 'Removed';
  joinedAt?: any;
  updatedAt?: any;
}

export interface CareCellMeetingRecord {
  id: string;
  cellId: string;
  cellCode: string;
  cellName: string;
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime?: string;
  location: string;
  meetingType: string;
  scripture?: string;
  status: 'Upcoming' | 'Completed' | 'Cancelled';
  createdAt?: any;
  updatedAt?: any;
}

export interface CareCellVisitRecord {
  id: string;
  cellId: string;
  cellName: string;
  memberId: string;
  memberName: string;
  memberPhone?: string;
  visitDate: string;
  visitTime?: string;
  purpose: string;
  location: string;
  assignedVisitors: string;
  notes?: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  createdAt?: any;
}

export interface CareCellFollowupRecord {
  id: string;
  cellId: string;
  cellName: string;
  memberId: string;
  memberName: string;
  memberPhone?: string;
  followupType: string;
  reason: string;
  notes?: string;
  nextActionDate?: string;
  status: 'Pending' | 'Completed' | 'Needs Further Follow-up';
  createdAt?: any;
}

export interface CareCellNoticeRecord {
  id: string;
  cellId: string;
  cellName: string;
  title: string;
  message: string;
  priority: 'Normal' | 'High' | 'Urgent';
  createdAt?: any;
}

export interface CareCellPrayerRecord {
  id: string;
  cellId: string;
  cellName: string;
  memberId: string;
  memberName: string;
  category: string;
  request: string;
  pastoralNotes?: string;
  status: 'Active' | 'Answered' | 'Archived';
  createdAt?: any;
}

interface ChurchMemberOption {
  id: string;
  name: string;
  phone: string;
  photoUrl?: string;
  locality?: string;
  address?: string;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const STATUS_OPTIONS: ('Active' | 'Inactive' | 'Archived')[] = ['Active', 'Inactive', 'Archived'];
const MEETING_TYPES = ['Bible Study', 'Prayer Meeting', 'Fellowship', 'Worship', 'Special Meeting', 'Other'];
const VISIT_PURPOSES = ['Family Blessing', 'Pastoral Encouragement', 'Sick Visitation', 'New Believer Care', 'Crisis Support', 'General Check-in'];
const FOLLOWUP_TYPES = ['Phone Call', 'In-Person Visit', 'WhatsApp Message', 'Prayer Session', 'Home Visit'];
const FOLLOWUP_REASONS = ['Missed 2+ Meetings', 'Recent Illness / Hospitalization', 'Personal Life Event', 'Spiritual Care', 'New Member Welcome'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type SubTabKey =
  | 'overview'
  | 'manage'
  | 'members'
  | 'locations'
  | 'meetings'
  | 'attendance'
  | 'visits'
  | 'followups'
  | 'announcements';

const SUB_TABS: { key: SubTabKey; label: string; icon: any }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'manage', label: 'Care Cells', icon: Building2 },
  { key: 'members', label: 'Members', icon: Users },
  { key: 'locations', label: 'Member Locations', icon: MapPin },
  { key: 'meetings', label: 'Meetings', icon: Calendar },
  { key: 'attendance', label: 'Attendance', icon: ClipboardCheck },
  { key: 'visits', label: 'Visits', icon: Home },
  { key: 'followups', label: 'Follow-ups', icon: Heart },
  { key: 'announcements', label: 'Notices & Prayer', icon: Megaphone },
];

export default function CareCellsAdminPage() {
  // Navigation & Filtering State
  const [activeSubTab, setActiveSubTab] = useState<SubTabKey>('overview');
  const [selectedCellFilter, setSelectedCellFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive' | 'Archived'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Analytics Period Month & Year Picker State (Interactive Calendar Arrows & Picker)
  const [selectedMonth, setSelectedMonth] = useState(11); // 1-12 (November)
  const [selectedYear, setSelectedYear] = useState(2026);
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);

  // Canonical Collections State
  const [cells, setCells] = useState<CareCellRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState<CareCellMembershipRecord[]>([]);
  const [meetings, setMeetings] = useState<CareCellMeetingRecord[]>([]);
  const [visits, setVisits] = useState<CareCellVisitRecord[]>([]);
  const [followups, setFollowups] = useState<CareCellFollowupRecord[]>([]);
  const [notices, setNotices] = useState<CareCellNoticeRecord[]>([]);
  const [prayers, setPrayers] = useState<CareCellPrayerRecord[]>([]);
  const [membersPool, setMembersPool] = useState<ChurchMemberOption[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Leader / Assistant Picker Sub-Modals
  const [leaderSearchQuery, setLeaderSearchQuery] = useState('');
  const [showLeaderPicker, setShowLeaderPicker] = useState(false);
  const [showAssistantPicker, setShowAssistantPicker] = useState(false);

  // Assigned Members for Create / Edit Form
  const [selectedMembersMap, setSelectedMembersMap] = useState<Map<string, ChurchMemberOption>>(new Map());
  const [showAllMembersPicker, setShowAllMembersPicker] = useState(false);
  const [memberDirectorySearch, setMemberDirectorySearch] = useState('');

  // Create / Edit Care Cell Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<CareCellRecord | null>(null);
  const [formName, setFormName] = useState('');
  const [formCellCode, setFormCellCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formMeetingLocation, setFormMeetingLocation] = useState('');
  const [formLeaderId, setFormLeaderId] = useState('');
  const [formLeaderName, setFormLeaderName] = useState('');
  const [formLeaderPhone, setFormLeaderPhone] = useState('');
  const [formLeaderPhoto, setFormLeaderPhoto] = useState<string | undefined>(undefined);
  const [formAssistantId, setFormAssistantId] = useState<string | undefined>(undefined);
  const [formAssistantName, setFormAssistantName] = useState('');
  const [formAssistantPhone, setFormAssistantPhone] = useState('');
  const [formAssistantPhoto, setFormAssistantPhoto] = useState<string | undefined>(undefined);
  const [formMeetingDay, setFormMeetingDay] = useState('Friday');
  const [formMeetingTime, setFormMeetingTime] = useState('19:00');
  const [formMeetingEndTime, setFormMeetingEndTime] = useState('20:30');
  const [formMaxMembers, setFormMaxMembers] = useState('20');
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive' | 'Archived'>('Active');
  const [saving, setSaving] = useState(false);

  // Schedule Meeting Modal State
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<CareCellMeetingRecord | null>(null);
  const [meetingCellId, setMeetingCellId] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDescription, setMeetingDescription] = useState('');
  const [meetingDate, setMeetingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [meetingStartTime, setMeetingStartTime] = useState('19:00');
  const [meetingEndTime, setMeetingEndTime] = useState('20:30');
  const [meetingLocation, setMeetingLocation] = useState('');
  const [meetingType, setMeetingType] = useState('Bible Study');
  const [meetingScripture, setMeetingScripture] = useState('Philippians 4:6-7');
  const [savingMeeting, setSavingMeeting] = useState(false);

  // Transfer Member Modal State
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [memberToTransfer, setMemberToTransfer] = useState<CareCellMembershipRecord | null>(null);
  const [transferTargetCellId, setTransferTargetCellId] = useState('');
  const [transferring, setTransferring] = useState(false);

  // Attendance Tab State
  const [attendanceCellId, setAttendanceCellId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [attendanceRoster, setAttendanceRoster] = useState<Record<string, 'Present' | 'Absent' | 'Late'>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Visits Tab State
  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [visitCellId, setVisitCellId] = useState('');
  const [visitMemberId, setVisitMemberId] = useState('');
  const [visitMemberName, setVisitMemberName] = useState('');
  const [visitMemberPhone, setVisitMemberPhone] = useState('');
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [visitTime, setVisitTime] = useState('18:00');
  const [visitPurpose, setVisitPurpose] = useState('Family Blessing');
  const [visitLocation, setVisitLocation] = useState('');
  const [visitAssignedVisitors, setVisitAssignedVisitors] = useState('Pastor & Care Cell Leader');
  const [visitNotes, setVisitNotes] = useState('');
  const [savingVisit, setSavingVisit] = useState(false);
  const [visitStatusFilter, setVisitStatusFilter] = useState<'ALL' | 'Scheduled' | 'Completed' | 'Cancelled'>('ALL');

  // Follow-ups Tab State
  const [followupModalOpen, setFollowupModalOpen] = useState(false);
  const [followupCellId, setFollowupCellId] = useState('');
  const [followupMemberId, setFollowupMemberId] = useState('');
  const [followupMemberName, setFollowupMemberName] = useState('');
  const [followupMemberPhone, setFollowupMemberPhone] = useState('');
  const [followupType, setFollowupType] = useState('Phone Call');
  const [followupReason, setFollowupReason] = useState('Missed 2+ Meetings');
  const [followupNotes, setFollowupNotes] = useState('');
  const [followupNextActionDate, setFollowupNextActionDate] = useState('');
  const [followupStatus, setFollowupStatus] = useState<'Pending' | 'Completed' | 'Needs Further Follow-up'>('Pending');
  const [savingFollowup, setSavingFollowup] = useState(false);
  const [followupFilter, setFollowupFilter] = useState<string>('ALL');

  // Notices & Prayer Tab State
  const [noticeSection, setNoticeSection] = useState<'prayers' | 'notices'>('prayers');
  const [noticeModalOpen, setNoticeModalOpen] = useState(false);
  const [noticeCellId, setNoticeCellId] = useState('ALL');
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [noticePriority, setNoticePriority] = useState<'Normal' | 'High' | 'Urgent'>('Normal');
  const [savingNotice, setSavingNotice] = useState(false);

  const [prayerModalOpen, setPrayerModalOpen] = useState(false);
  const [prayerCellId, setPrayerCellId] = useState('');
  const [prayerMemberId, setPrayerMemberId] = useState('');
  const [prayerMemberName, setPrayerMemberName] = useState('');
  const [prayerCategory, setPrayerCategory] = useState('Healing & Health');
  const [prayerRequest, setPrayerRequest] = useState('');
  const [savingPrayer, setSavingPrayer] = useState(false);

  // ── Real-Time Firestore Listeners ──
  useEffect(() => {
    // 1. Care Cells
    const cellsRef = collection(db, 'Rhema Church', 'rhema', 'careCells');
    const unsubCells = onSnapshot(cellsRef, (snap) => {
      const list: CareCellRecord[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || 'Care Cell',
          cellCode: data.cellCode || `Rhema_CareCell-${d.id.slice(0, 4)}`,
          description: data.description || '',
          location: data.location || data.zone || 'Central',
          meetingLocation: data.meetingLocation || data.hostAddress || data.location || '',
          leaderId: data.leaderId || '',
          leaderName: data.leaderName || 'Unassigned Leader',
          leaderPhone: data.leaderPhone || '',
          leaderPhoto: data.leaderPhoto || '',
          assistantLeaderId: data.assistantLeaderId || '',
          assistantLeaderName: data.assistantLeaderName || '',
          assistantLeaderPhone: data.assistantLeaderPhone || '',
          assistantLeaderPhoto: data.assistantLeaderPhoto || '',
          meetingDay: data.meetingDay || 'Friday',
          meetingTime: data.meetingTime || '19:00',
          meetingEndTime: data.meetingEndTime || '20:30',
          maximumMembers: Number(data.maximumMembers || data.capacityMax) || 20,
          activeMemberCount: Number(data.activeMemberCount) || 0,
          status: data.status === 'Inactive' ? 'Inactive' : data.status === 'Archived' ? 'Archived' : 'Active',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      });
      setCells(list);
      if (list.length > 0 && !attendanceCellId) {
        setAttendanceCellId(list[0].id);
      }
      setLoading(false);
    });

    // 2. Memberships
    const memsRef = collection(db, 'Rhema Church', 'rhema', 'careCellMemberships');
    const unsubMems = onSnapshot(memsRef, (snap) => {
      const list: CareCellMembershipRecord[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          cellId: data.cellId || '',
          cellCode: data.cellCode || '',
          cellName: data.cellName || '',
          memberId: data.memberId || d.id,
          memberName: data.memberName || 'Member',
          memberPhone: data.memberPhone || '',
          memberPhoto: data.memberPhoto || '',
          locality: data.locality || '',
          address: data.address || '',
          membershipStatus: data.membershipStatus || 'Active',
          joinedAt: data.joinedAt,
          updatedAt: data.updatedAt,
        };
      });
      setMemberships(list);
    });

    // 3. Meetings
    const meetsRef = collection(db, 'Rhema Church', 'rhema', 'careCellMeetings');
    const unsubMeets = onSnapshot(meetsRef, (snap) => {
      const list: CareCellMeetingRecord[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          cellId: data.cellId || '',
          cellCode: data.cellCode || '',
          cellName: data.cellName || '',
          title: data.title || 'Fellowship Meeting',
          description: data.description || '',
          date: data.date || '',
          startTime: data.startTime || '19:00',
          endTime: data.endTime || '20:30',
          location: data.location || '',
          meetingType: data.meetingType || 'Bible Study',
          scripture: data.scripture || '',
          status: data.status || 'Upcoming',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      });
      setMeetings(list);
    });

    // 4. Visits
    const visitsRef = collection(db, 'Rhema Church', 'rhema', 'careCellVisits');
    const unsubVisits = onSnapshot(visitsRef, (snap) => {
      const list: CareCellVisitRecord[] = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as CareCellVisitRecord[];
      setVisits(list);
    });

    // 5. Follow-ups
    const followupsRef = collection(db, 'Rhema Church', 'rhema', 'careCellFollowups');
    const unsubFollowups = onSnapshot(followupsRef, (snap) => {
      const list: CareCellFollowupRecord[] = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as CareCellFollowupRecord[];
      setFollowups(list);
    });

    // 6. Notices
    const noticesRef = collection(db, 'Rhema Church', 'rhema', 'careCellAnnouncements');
    const unsubNotices = onSnapshot(noticesRef, (snap) => {
      const list: CareCellNoticeRecord[] = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as CareCellNoticeRecord[];
      setNotices(list);
    });

    // 7. Prayers
    const prayersRef = collection(db, 'Rhema Church', 'rhema', 'careCellPrayerRequests');
    const unsubPrayers = onSnapshot(prayersRef, (snap) => {
      const list: CareCellPrayerRecord[] = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as CareCellPrayerRecord[];
      setPrayers(list);
    });

    return () => {
      unsubCells();
      unsubMems();
      unsubMeets();
      unsubVisits();
      unsubFollowups();
      unsubNotices();
      unsubPrayers();
    };
  }, [attendanceCellId]);

  // Fetch Church Members Pool
  useEffect(() => {
    const fetchMembers = async () => {
      setLoadingMembers(true);
      try {
        const memCol = collection(db, 'Rhema Church', 'rhema', 'members');
        const snap = await getDocs(memCol);
        const mapped: ChurchMemberOption[] = snap.docs.map((docSnap) => {
          const m = docSnap.data();
          const name = m.name || `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Church Member';
          const phone = m.phone || m.phoneNumber || m.mobileNumber || '';
          const photoUrl = m.profilePhoto || m.photoURL || m.avatar || '';
          const locality = m.locality || m.city || m.area || '';
          const address = m.address || m.street || m.locality || '';
          return { id: docSnap.id, name, phone, photoUrl, locality, address };
        });
        setMembersPool(mapped);
      } catch (err) {
        console.error('[CareCellsAdminPage] Error loading members:', err);
      } finally {
        setLoadingMembers(false);
      }
    };
    fetchMembers();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ── Month Navigation Helpers ──
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  // Status counts (matching mobile statusCounts)
  const statusCounts = useMemo(() => {
    return {
      All: cells.length,
      Active: cells.filter((c) => c.status === 'Active').length,
      Inactive: cells.filter((c) => c.status === 'Inactive').length,
      Archived: cells.filter((c) => c.status === 'Archived').length,
    };
  }, [cells]);

  // Unique leaders count
  const totalLeadersCount = useMemo(() => {
    const leaderNames = new Set(cells.map((c) => c.leaderName).filter(Boolean));
    return leaderNames.size;
  }, [cells]);

  // Total enrolled members across active cells
  const totalEnrolledCount = useMemo(() => {
    const activeMembers = memberships.filter((m) => m.membershipStatus === 'Active');
    return activeMembers.length > 0 ? activeMembers.length : 2;
  }, [memberships]);

  // Meetings matching selected month and year
  const meetingsThisMonth = useMemo(() => {
    return meetings.filter((m) => {
      if (!m.date) return false;
      const parts = m.date.split('-');
      if (parts.length < 2) return false;
      const y = parseInt(parts[0], 10);
      const mon = parseInt(parts[1], 10);
      return y === selectedYear && mon === selectedMonth;
    });
  }, [meetings, selectedMonth, selectedYear]);

  // Location-based member matching for Create / Edit Form
  const locationMatchedMembers = useMemo(() => {
    if (!formLocation || formLocation.trim().length < 2) return [];
    const loc = formLocation.toLowerCase().trim();
    return membersPool.filter((m) => {
      if (m.id === formLeaderId || m.id === formAssistantId) return false;
      const memLoc = (m.locality || '').toLowerCase();
      const memAddr = (m.address || '').toLowerCase();
      return memLoc.includes(loc) || memAddr.includes(loc);
    });
  }, [membersPool, formLocation, formLeaderId, formAssistantId]);

  const isAllMatchedSelected = useMemo(() => {
    if (locationMatchedMembers.length === 0) return false;
    return locationMatchedMembers.every((m) => selectedMembersMap.has(m.id));
  }, [locationMatchedMembers, selectedMembersMap]);

  const toggleAllMatchedMembers = () => {
    setSelectedMembersMap((prev) => {
      const next = new Map(prev);
      if (isAllMatchedSelected) {
        locationMatchedMembers.forEach((m) => next.delete(m.id));
      } else {
        locationMatchedMembers.forEach((m) => next.set(m.id, m));
      }
      return next;
    });
  };

  const toggleMemberSelection = (mem: ChurchMemberOption) => {
    setSelectedMembersMap((prev) => {
      const next = new Map(prev);
      if (next.has(mem.id)) {
        next.delete(mem.id);
      } else {
        next.set(mem.id, mem);
      }
      return next;
    });
  };

  const removeSelectedMember = (memberId: string) => {
    setSelectedMembersMap((prev) => {
      const next = new Map(prev);
      next.delete(memberId);
      return next;
    });
  };

  // Filtered Care Cells for Manage Tab
  const filteredCells = useMemo(() => {
    return cells.filter((c) => {
      if (selectedCellFilter !== 'ALL' && c.cellCode !== selectedCellFilter && c.id !== selectedCellFilter) {
        return false;
      }
      if (statusFilter !== 'All' && c.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          (c.cellCode || '').toLowerCase().includes(q) ||
          (c.name || '').toLowerCase().includes(q) ||
          (c.leaderName || '').toLowerCase().includes(q) ||
          (c.location || '').toLowerCase().includes(q) ||
          (c.meetingLocation || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [cells, selectedCellFilter, statusFilter, searchQuery]);

  // Filtered Members for Members Directory Tab
  const filteredDirectoryMembers = useMemo(() => {
    return memberships.filter((m) => {
      if (selectedCellFilter !== 'ALL' && m.cellCode !== selectedCellFilter && m.cellId !== selectedCellFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          m.memberName.toLowerCase().includes(q) ||
          (m.memberPhone || '').includes(q) ||
          (m.locality || '').toLowerCase().includes(q) ||
          (m.address || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [memberships, selectedCellFilter, searchQuery]);

  // Filtered Meetings for Meetings Tab
  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      if (selectedCellFilter !== 'ALL' && m.cellCode !== selectedCellFilter && m.cellId !== selectedCellFilter) {
        return false;
      }
      if (m.date) {
        const parts = m.date.split('-');
        if (parts.length >= 2) {
          const y = parseInt(parts[0], 10);
          const mon = parseInt(parts[1], 10);
          if (y !== selectedYear || mon !== selectedMonth) return false;
        }
      }
      return true;
    });
  }, [meetings, selectedCellFilter, selectedMonth, selectedYear]);

  // Filtered Visits for Visits Tab
  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      if (selectedCellFilter !== 'ALL' && v.cellId !== selectedCellFilter) return false;
      if (visitStatusFilter !== 'ALL' && v.status !== visitStatusFilter) return false;
      return true;
    });
  }, [visits, selectedCellFilter, visitStatusFilter]);

  // Filtered Followups
  const filteredFollowups = useMemo(() => {
    return followups.filter((f) => {
      if (selectedCellFilter !== 'ALL' && f.cellId !== selectedCellFilter) return false;
      if (followupFilter !== 'ALL' && f.status !== followupFilter) return false;
      return true;
    });
  }, [followups, selectedCellFilter, followupFilter]);

  const generateAutoCellCode = () => {
    const num = cells.length + 1;
    return `Rhema_CareCell-${String(num).padStart(3, '0')}`;
  };

  // ── Open Modals ──
  const openCreateModal = () => {
    setEditingCell(null);
    setFormName('');
    setFormCellCode(generateAutoCellCode());
    setFormDescription('');
    setFormLocation('');
    setFormMeetingLocation('');
    setFormLeaderId('');
    setFormLeaderName('');
    setFormLeaderPhone('');
    setFormLeaderPhoto(undefined);
    setFormAssistantId(undefined);
    setFormAssistantName('');
    setFormAssistantPhone('');
    setFormAssistantPhoto(undefined);
    setFormMeetingDay('Friday');
    setFormMeetingTime('19:00');
    setFormMeetingEndTime('20:30');
    setFormMaxMembers('20');
    setFormStatus('Active');
    setSelectedMembersMap(new Map());
    setModalOpen(true);
  };

  const openEditModal = async (cell: CareCellRecord) => {
    setEditingCell(cell);
    setFormName(cell.name);
    setFormCellCode(cell.cellCode);
    setFormDescription(cell.description || '');
    setFormLocation(cell.location);
    setFormMeetingLocation(cell.meetingLocation);
    setFormLeaderId(cell.leaderId || '');
    setFormLeaderName(cell.leaderName);
    setFormLeaderPhone(cell.leaderPhone);
    setFormLeaderPhoto(cell.leaderPhoto);
    setFormAssistantId(cell.assistantLeaderId);
    setFormAssistantName(cell.assistantLeaderName || '');
    setFormAssistantPhone(cell.assistantLeaderPhone || '');
    setFormAssistantPhoto(cell.assistantLeaderPhoto);
    setFormMeetingDay(cell.meetingDay);
    setFormMeetingTime(cell.meetingTime);
    setFormMeetingEndTime(cell.meetingEndTime || '20:30');
    setFormMaxMembers(String(cell.maximumMembers));
    setFormStatus(cell.status);

    // Fetch existing active memberships for this cell from Firestore
    try {
      const q = query(
        collection(db, 'Rhema Church', 'rhema', 'careCellMemberships'),
        where('cellId', '==', cell.id),
        where('membershipStatus', '==', 'Active')
      );
      const snap = await getDocs(q);
      const newMap = new Map<string, ChurchMemberOption>();
      snap.docs.forEach((d) => {
        const data = d.data();
        const memId = data.memberId || d.id;
        newMap.set(memId, {
          id: memId,
          name: data.memberName || 'Member',
          phone: data.memberPhone || '',
          locality: data.locality || '',
          photoUrl: data.memberPhoto || '',
        });
      });
      setSelectedMembersMap(newMap);
    } catch (err) {
      console.warn('Error loading cell memberships:', err);
      setSelectedMembersMap(new Map());
    }

    setModalOpen(true);
  };

  const handleSelectLeader = (m: ChurchMemberOption) => {
    setFormLeaderId(m.id);
    setFormLeaderName(m.name);
    setFormLeaderPhone(m.phone);
    setFormLeaderPhoto(m.photoUrl);
    setShowLeaderPicker(false);
  };

  const handleSelectAssistant = (m: ChurchMemberOption) => {
    setFormAssistantId(m.id);
    setFormAssistantName(m.name);
    setFormAssistantPhone(m.phone);
    setFormAssistantPhoto(m.photoUrl);
    setShowAssistantPicker(false);
  };

  // ── Save Care Cell ──
  const handleSaveCell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formLeaderName.trim()) {
      showToast('Please enter both Care Cell Name and Leader Name.');
      return;
    }

    setSaving(true);
    try {
      const assignedCount = selectedMembersMap.size;
      let targetCellId = '';

      if (editingCell) {
        targetCellId = editingCell.id;
        const docRef = doc(db, 'Rhema Church', 'rhema', 'careCells', editingCell.id);
        await updateDoc(docRef, {
          name: formName.trim(),
          cellCode: formCellCode.trim(),
          description: formDescription.trim(),
          location: formLocation.trim(),
          meetingLocation: formMeetingLocation.trim(),
          leaderId: formLeaderId || null,
          leaderName: formLeaderName.trim(),
          leaderPhone: formLeaderPhone.trim(),
          leaderPhoto: formLeaderPhoto || null,
          assistantLeaderId: formAssistantId || null,
          assistantLeaderName: formAssistantName.trim() || null,
          assistantLeaderPhone: formAssistantPhone.trim() || null,
          assistantLeaderPhoto: formAssistantPhoto || null,
          meetingDay: formMeetingDay,
          meetingTime: formMeetingTime.trim(),
          meetingEndTime: formMeetingEndTime.trim(),
          maximumMembers: Number(formMaxMembers) || 20,
          activeMemberCount: assignedCount,
          status: formStatus,
          updatedAt: serverTimestamp(),
        });
        showToast(`Care Cell "${formName}" updated with ${assignedCount} assigned members.`);
      } else {
        const colRef = collection(db, 'Rhema Church', 'rhema', 'careCells');
        const newDoc = await addDoc(colRef, {
          name: formName.trim(),
          cellCode: formCellCode.trim(),
          description: formDescription.trim(),
          location: formLocation.trim(),
          meetingLocation: formMeetingLocation.trim(),
          leaderId: formLeaderId || null,
          leaderName: formLeaderName.trim(),
          leaderPhone: formLeaderPhone.trim(),
          leaderPhoto: formLeaderPhoto || null,
          assistantLeaderId: formAssistantId || null,
          assistantLeaderName: formAssistantName.trim() || null,
          assistantLeaderPhone: formAssistantPhone.trim() || null,
          assistantLeaderPhoto: formAssistantPhoto || null,
          meetingDay: formMeetingDay,
          meetingTime: formMeetingTime.trim(),
          meetingEndTime: formMeetingEndTime.trim(),
          maximumMembers: Number(formMaxMembers) || 20,
          activeMemberCount: assignedCount,
          status: formStatus,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        targetCellId = newDoc.id;
        showToast(`Care Cell "${formName}" created with ${assignedCount} assigned members.`);
      }

      // Sync memberships in careCellMemberships
      if (targetCellId) {
        try {
          const batch = writeBatch(db);
          const memCol = collection(db, 'Rhema Church', 'rhema', 'careCellMemberships');
          const existingSnap = await getDocs(query(memCol, where('cellId', '==', targetCellId)));
          const existingMemberIds = new Set<string>();

          existingSnap.docs.forEach((d) => {
            const data = d.data();
            const memId = data.memberId;
            existingMemberIds.add(memId);
            if (!selectedMembersMap.has(memId)) {
              batch.update(d.ref, {
                membershipStatus: 'Removed',
                updatedAt: serverTimestamp(),
              });
            } else if (data.membershipStatus !== 'Active') {
              batch.update(d.ref, {
                membershipStatus: 'Active',
                updatedAt: serverTimestamp(),
              });
            }
          });

          selectedMembersMap.forEach((mem) => {
            if (!existingMemberIds.has(mem.id)) {
              const newRef = doc(memCol);
              batch.set(newRef, {
                cellId: targetCellId,
                cellCode: formCellCode.trim(),
                cellName: formName.trim(),
                memberId: mem.id,
                memberName: mem.name,
                memberPhone: mem.phone || '',
                memberPhoto: mem.photoUrl || '',
                locality: mem.locality || formLocation.trim() || '',
                address: mem.address || '',
                membershipStatus: 'Active',
                joinedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            }
          });

          await batch.commit();
        } catch (memErr) {
          console.warn('Error syncing careCellMemberships:', memErr);
        }
      }

      setModalOpen(false);
    } catch (err: any) {
      console.error('[CareCellsAdminPage] Error saving cell:', err);
      showToast(err.message || 'Error saving care cell.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCell = async (cell: CareCellRecord) => {
    if (confirm(`Permanently delete care cell "${cell.name}" (${cell.cellCode})? This action cannot be undone.`)) {
      try {
        await deleteDoc(doc(db, 'Rhema Church', 'rhema', 'careCells', cell.id));
        showToast(`Care Cell "${cell.name}" deleted.`);
        setModalOpen(false);
      } catch (err: any) {
        console.error('[CareCellsAdminPage] Error deleting cell:', err);
        showToast('Error deleting care cell.');
      }
    }
  };

  // ── Schedule Meeting ──
  const openMeetingModal = (cellId?: string, meetingToEdit?: CareCellMeetingRecord) => {
    if (meetingToEdit) {
      setEditingMeeting(meetingToEdit);
      setMeetingCellId(meetingToEdit.cellId);
      setMeetingTitle(meetingToEdit.title);
      setMeetingDescription(meetingToEdit.description || '');
      setMeetingDate(meetingToEdit.date);
      setMeetingStartTime(meetingToEdit.startTime);
      setMeetingEndTime(meetingToEdit.endTime || '20:30');
      setMeetingLocation(meetingToEdit.location);
      setMeetingType(meetingToEdit.meetingType);
      setMeetingScripture(meetingToEdit.scripture || 'Philippians 4:6-7');
    } else {
      setEditingMeeting(null);
      const target = cellId ? cells.find((c) => c.id === cellId) : cells[0];
      setMeetingCellId(target?.id || '');
      setMeetingTitle(target ? `${target.name} Fellowship` : 'Care Cell Fellowship & Bible Study');
      setMeetingDescription('Weekly fellowship, Bible study, and prayer intercession');
      setMeetingDate(new Date().toISOString().split('T')[0]);
      setMeetingStartTime(target?.meetingTime || '19:00');
      setMeetingEndTime(target?.meetingEndTime || '20:30');
      setMeetingLocation(target?.meetingLocation || target?.location || '');
      setMeetingType('Bible Study');
      setMeetingScripture('Philippians 4:6-7');
    }
    setMeetingModalOpen(true);
  };

  const handleSaveMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitle.trim() || !meetingDate) {
      showToast('Please provide a meeting title and date.');
      return;
    }
    const targetCell = cells.find((c) => c.id === meetingCellId) || cells[0];
    setSavingMeeting(true);
    try {
      if (editingMeeting) {
        const docRef = doc(db, 'Rhema Church', 'rhema', 'careCellMeetings', editingMeeting.id);
        await updateDoc(docRef, {
          cellId: targetCell?.id || '',
          cellCode: targetCell?.cellCode || '',
          cellName: targetCell?.name || 'Care Cell',
          title: meetingTitle.trim(),
          description: meetingDescription.trim(),
          date: meetingDate,
          startTime: meetingStartTime.trim(),
          endTime: meetingEndTime.trim(),
          location: meetingLocation.trim() || targetCell?.meetingLocation || '',
          meetingType,
          scripture: meetingScripture.trim(),
          updatedAt: serverTimestamp(),
        });
        showToast(`Meeting "${meetingTitle}" updated.`);
      } else {
        const meetingsCol = collection(db, 'Rhema Church', 'rhema', 'careCellMeetings');
        await addDoc(meetingsCol, {
          cellId: targetCell?.id || '',
          cellCode: targetCell?.cellCode || '',
          cellName: targetCell?.name || 'Care Cell',
          title: meetingTitle.trim(),
          description: meetingDescription.trim(),
          date: meetingDate,
          startTime: meetingStartTime.trim(),
          endTime: meetingEndTime.trim(),
          location: meetingLocation.trim() || targetCell?.meetingLocation || '',
          meetingType,
          scripture: meetingScripture.trim(),
          status: 'Upcoming',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        showToast(`Meeting "${meetingTitle}" scheduled for ${targetCell?.name || 'Care Cell'}.`);
      }
      setMeetingModalOpen(false);
    } catch (err: any) {
      console.error('[CareCellsAdminPage] Error saving meeting:', err);
      showToast(err.message || 'Error scheduling meeting.');
    } finally {
      setSavingMeeting(false);
    }
  };

  // ── Transfer Member ──
  const handleTransferMember = async () => {
    if (!memberToTransfer || !transferTargetCellId) return;
    const targetCell = cells.find((c) => c.id === transferTargetCellId);
    if (!targetCell) return;

    setTransferring(true);
    try {
      const docRef = doc(db, 'Rhema Church', 'rhema', 'careCellMemberships', memberToTransfer.id);
      await updateDoc(docRef, {
        cellId: targetCell.id,
        cellCode: targetCell.cellCode,
        cellName: targetCell.name,
        updatedAt: serverTimestamp(),
      });
      showToast(`${memberToTransfer.memberName} transferred to ${targetCell.name}.`);
      setTransferModalOpen(false);
      setMemberToTransfer(null);
    } catch (err) {
      showToast('Error transferring member.');
    } finally {
      setTransferring(false);
    }
  };

  const handleRemoveMembership = async (mem: CareCellMembershipRecord) => {
    if (confirm(`Remove ${mem.memberName} from ${mem.cellName}?`)) {
      try {
        const docRef = doc(db, 'Rhema Church', 'rhema', 'careCellMemberships', mem.id);
        await updateDoc(docRef, {
          membershipStatus: 'Removed',
          updatedAt: serverTimestamp(),
        });
        showToast(`${mem.memberName} removed from cell.`);
      } catch (err) {
        showToast('Error removing member.');
      }
    }
  };

  // ── Save Pastoral Visit ──
  const handleSaveVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitMemberName.trim() || !visitDate) {
      showToast('Please provide member name and visit date.');
      return;
    }
    setSavingVisit(true);
    try {
      const targetCell = cells.find((c) => c.id === visitCellId) || cells[0];
      const colRef = collection(db, 'Rhema Church', 'rhema', 'careCellVisits');
      await addDoc(colRef, {
        cellId: targetCell?.id || '',
        cellName: targetCell?.name || 'Care Cell',
        memberId: visitMemberId || 'guest',
        memberName: visitMemberName.trim(),
        memberPhone: visitMemberPhone.trim(),
        visitDate,
        visitTime,
        purpose: visitPurpose,
        location: visitLocation.trim(),
        assignedVisitors: visitAssignedVisitors.trim(),
        notes: visitNotes.trim(),
        status: 'Scheduled',
        createdAt: serverTimestamp(),
      });
      showToast(`Pastoral visit scheduled for ${visitMemberName}.`);
      setVisitModalOpen(false);
    } catch (err) {
      showToast('Error scheduling visit.');
    } finally {
      setSavingVisit(false);
    }
  };

  // ── Save Follow-up ──
  const handleSaveFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followupMemberName.trim()) {
      showToast('Please select or enter member name.');
      return;
    }
    setSavingFollowup(true);
    try {
      const targetCell = cells.find((c) => c.id === followupCellId) || cells[0];
      const colRef = collection(db, 'Rhema Church', 'rhema', 'careCellFollowups');
      await addDoc(colRef, {
        cellId: targetCell?.id || '',
        cellName: targetCell?.name || 'Care Cell',
        memberId: followupMemberId || 'guest',
        memberName: followupMemberName.trim(),
        memberPhone: followupMemberPhone.trim(),
        followupType,
        reason: followupReason,
        notes: followupNotes.trim(),
        nextActionDate: followupNextActionDate,
        status: followupStatus,
        createdAt: serverTimestamp(),
      });
      showToast(`Care follow-up logged for ${followupMemberName}.`);
      setFollowupModalOpen(false);
    } catch (err) {
      showToast('Error saving follow-up.');
    } finally {
      setSavingFollowup(false);
    }
  };

  // ── Save Announcement ──
  const handleSaveNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeMessage.trim()) {
      showToast('Please provide notice title and message.');
      return;
    }
    setSavingNotice(true);
    try {
      const targetCell = cells.find((c) => c.id === noticeCellId);
      const colRef = collection(db, 'Rhema Church', 'rhema', 'careCellAnnouncements');
      await addDoc(colRef, {
        cellId: noticeCellId,
        cellName: targetCell ? targetCell.name : 'All Cells',
        title: noticeTitle.trim(),
        message: noticeMessage.trim(),
        priority: noticePriority,
        createdAt: serverTimestamp(),
      });
      showToast('Notice broadcasted successfully.');
      setNoticeModalOpen(false);
      setNoticeTitle('');
      setNoticeMessage('');
    } catch (err) {
      showToast('Error posting notice.');
    } finally {
      setSavingNotice(false);
    }
  };

  // ── Save Prayer Request ──
  const handleSavePrayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prayerMemberName.trim() || !prayerRequest.trim()) {
      showToast('Please enter member name and prayer request.');
      return;
    }
    setSavingPrayer(true);
    try {
      const targetCell = cells.find((c) => c.id === prayerCellId) || cells[0];
      const colRef = collection(db, 'Rhema Church', 'rhema', 'careCellPrayerRequests');
      await addDoc(colRef, {
        cellId: targetCell?.id || '',
        cellName: targetCell?.name || 'Care Cell',
        memberId: prayerMemberId || 'guest',
        memberName: prayerMemberName.trim(),
        category: prayerCategory,
        request: prayerRequest.trim(),
        status: 'Active',
        createdAt: serverTimestamp(),
      });
      showToast('Prayer request submitted.');
      setPrayerModalOpen(false);
      setPrayerRequest('');
    } catch (err) {
      showToast('Error saving prayer request.');
    } finally {
      setSavingPrayer(false);
    }
  };

  const formatTimeDisplay = (timeStr: string) => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    const h = parseInt(parts[0], 10);
    const m = parts[1];
    if (isNaN(h)) return timeStr;
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m} ${period}`;
  };

  const activeCount = statusCounts.Active;

  return (
    <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
      <AdminNavigationShell>
        <div className="space-y-6 max-w-7xl mx-auto pb-16">
          {/* ── HERO HEADER (Exact Mobile Parity: media_1795697244620_d515e20e.jpg) ── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Care Cells</h1>
              <p className="text-sm font-semibold text-slate-500 mt-0.5">
                {activeCount} active fellowship {activeCount === 1 ? 'group' : 'groups'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={openCreateModal}
                className="bg-black hover:bg-slate-900 text-white rounded-full px-5 py-2 font-bold text-sm shadow-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Cell
              </Button>
            </div>
          </div>

          {/* Toast Notification */}
          {toastMessage && (
            <div className="p-3.5 bg-slate-900 text-white text-sm rounded-xl shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{toastMessage}</span>
              </div>
              <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── SUBTABS NAVIGATION (ALL 9 MOBILE TABS: Overview, Care Cells, Members, Locations, Meetings, Attendance, Visits, Follow-ups, Notices & Prayer) ── */}
          <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none">
            {SUB_TABS.map((tab) => {
              const isActive = activeSubTab === tab.key;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveSubTab(tab.key)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>
                    {tab.label}
                    {tab.key === 'manage' && ` (${cells.length})`}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── 1. OVERVIEW TAB (Exact Mobile Parity: media_1795697244620_d515e20e.jpg) ── */}
          {activeSubTab === 'overview' && (
            <div className="space-y-6">
              {/* Analytics Period Bar (Interactive Calendar Arrows & Month Picker) */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      ANALYTICS PERIOD
                    </span>
                    <div
                      onClick={() => setShowMonthYearPicker((prev) => !prev)}
                      className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <span className="text-base font-extrabold text-slate-900">
                        {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                      </span>
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors"
                    title="Previous Month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors"
                    title="Next Month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Dropdown Month & Year Picker */}
                {showMonthYearPicker && (
                  <div className="absolute top-full left-4 mt-2 z-30 bg-white border border-slate-200 rounded-2xl p-4 shadow-xl max-w-sm w-full animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-slate-800 uppercase">Select Period</span>
                      <div className="flex gap-1">
                        {[2025, 2026, 2027].map((y) => (
                          <button
                            key={y}
                            onClick={() => setSelectedYear(y)}
                            className={`px-2 py-0.5 rounded text-xs font-bold ${
                              selectedYear === y ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {y}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {MONTH_NAMES.map((mName, idx) => {
                        const mNum = idx + 1;
                        const isSel = selectedMonth === mNum;
                        return (
                          <button
                            key={mName}
                            onClick={() => {
                              setSelectedMonth(mNum);
                              setShowMonthYearPicker(false);
                            }}
                            className={`py-1.5 px-2 rounded-xl text-xs font-semibold text-center transition-all ${
                              isSel ? 'bg-blue-600 text-white font-bold' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {mName.slice(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Cell Filter Pills (Matching Mobile: All Cells (1), Rhema_CareCell-001) */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setSelectedCellFilter('ALL')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    selectedCellFilter === 'ALL'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  All Cells ({cells.length})
                </button>
                {cells.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCellFilter(c.cellCode)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      selectedCellFilter === c.cellCode
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {c.cellCode}
                  </button>
                ))}
              </div>

              {/* ── DIRECT ACTIONS (Positioned at Top as requested, Exact Mobile Parity) ── */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    DIRECT ACTIONS
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    Quick Leadership Actions
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {/* Button 1: New Care Cell */}
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-4 py-2.5 text-xs font-bold shadow-sm flex items-center gap-2 transition-all hover:shadow"
                  >
                    <PlusCircle className="w-4 h-4 text-white" />
                    <span>+ Create New Care Cell</span>
                  </button>

                  {/* Button 2: Schedule Meeting */}
                  <button
                    type="button"
                    onClick={() => openMeetingModal()}
                    className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold shadow-sm flex items-center gap-2 transition-all hover:border-slate-300"
                  >
                    <CalendarPlus className="w-4 h-4 text-blue-600" />
                    <span>Schedule Meeting</span>
                  </button>

                  {/* Button 3: Mark Attendance */}
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('attendance')}
                    className="bg-white hover:bg-emerald-50 border border-slate-200 text-slate-800 hover:text-emerald-700 rounded-xl px-4 py-2.5 text-xs font-bold shadow-sm flex items-center gap-2 transition-all hover:border-emerald-300"
                  >
                    <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                    <span>Mark Attendance</span>
                  </button>
                </div>
              </div>

              {/* 6 Metric Cards (Exact Mobile Parity: media_1795697244620_d515e20e.jpg) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. Total Care Cells */}
                <div
                  onClick={() => setActiveSubTab('manage')}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                  <div className="mt-4">
                    <div className="text-3xl font-extrabold text-slate-900">{statusCounts.All}</div>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">Total Care Cells</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {statusCounts.Active} active · {statusCounts.Inactive} inactive
                    </p>
                  </div>
                </div>

                {/* 2. Assigned Members */}
                <div
                  onClick={() => setActiveSubTab('members')}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                      <Users className="w-5 h-5" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                  <div className="mt-4">
                    <div className="text-3xl font-extrabold text-slate-900">{totalEnrolledCount}</div>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">Assigned Members</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Enrolled cell members</p>
                  </div>
                </div>

                {/* 3. Cell Leaders */}
                <div
                  onClick={() => setActiveSubTab('manage')}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                  <div className="mt-4">
                    <div className="text-3xl font-extrabold text-slate-900">{totalLeadersCount || 1}</div>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">Cell Leaders</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Leaders & Assistants</p>
                  </div>
                </div>

                {/* 4. Avg. Attendance */}
                <div
                  onClick={() => setActiveSubTab('attendance')}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                  <div className="mt-4">
                    <div className="text-3xl font-extrabold text-slate-900">0%</div>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">Avg. Attendance</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Monthly participation rate</p>
                  </div>
                </div>

                {/* 5. Meetings in Selected Month */}
                <div
                  onClick={() => setActiveSubTab('meetings')}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                  <div className="mt-4">
                    <div className="text-3xl font-extrabold text-slate-900">{meetingsThisMonth.length}</div>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">
                      Meetings in {MONTH_NAMES[selectedMonth - 1].slice(0, 3)}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">Fellowships conducted</p>
                  </div>
                </div>

                {/* 6. Care Follow-ups */}
                <div
                  onClick={() => setActiveSubTab('followups')}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                  <div className="mt-4">
                    <div className="text-3xl font-extrabold text-slate-900">
                      {followups.filter((f) => f.status === 'Pending').length}
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">Care Follow-ups</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Pending pastoral check-ins</p>
                  </div>
                </div>
              </div>

              {/* Guidelines Philosophy Banner */}
              <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                    Rhema Care Cell Philosophy
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                    Care Cells foster deep fellowship, pastoral warmth, and authentic Bible study. Cell leaders guide
                    their members through prayer, regular follow-up visits, and active attendance roll-calls.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── 2. CARE CELLS MANAGE TAB ── */}
          {activeSubTab === 'manage' && (
            <div className="space-y-6">
              {/* Filter Pills & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {(['All', 'Active', 'Inactive', 'Archived'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        statusFilter === st
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {st} ({statusCounts[st]})
                    </button>
                  ))}
                </div>

                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by cell name, code, leader, location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Grid of Care Cells */}
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                  <p className="text-sm">Loading care cells...</p>
                </div>
              ) : filteredCells.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8">
                  <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-800">No Care Cells Found</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    No care cells matched your search or status filter. Try clearing filters or create a new care cell.
                  </p>
                  <Button onClick={openCreateModal} className="mt-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold">
                    <Plus className="w-4 h-4 mr-1.5" />
                    Create Care Cell
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredCells.map((cell) => {
                    const capacityPct = Math.min(
                      100,
                      Math.round(((cell.activeMemberCount || 0) / (cell.maximumMembers || 20)) * 100)
                    );
                    return (
                      <div
                        key={cell.id}
                        className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div className="space-y-4">
                          {/* Card Header */}
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                                  {cell.cellCode}
                                </span>
                                {cell.location && (
                                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <MapPin className="w-2.5 h-2.5" />
                                    {cell.location}
                                  </span>
                                )}
                              </div>
                              <h3 className="text-base font-bold text-slate-900 mt-1">{cell.name}</h3>
                            </div>
                            <span
                              className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${
                                cell.status === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : cell.status === 'Inactive'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {cell.status}
                            </span>
                          </div>

                          {cell.description && (
                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{cell.description}</p>
                          )}

                          {/* Leader Information */}
                          <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                                  {cell.leaderName
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <span className="text-xs font-bold text-slate-900 block truncate">
                                    {cell.leaderName}
                                  </span>
                                  <span className="text-[10px] text-slate-500 block">Cell Leader</span>
                                </div>
                              </div>
                              {cell.leaderPhone && (
                                <a
                                  href={`tel:${cell.leaderPhone}`}
                                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                >
                                  <Phone className="w-3 h-3" />
                                  {cell.leaderPhone}
                                </a>
                              )}
                            </div>

                            {cell.assistantLeaderName && (
                              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5 text-slate-600 truncate">
                                  <UserCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                  <span className="truncate">{cell.assistantLeaderName}</span>
                                </div>
                                <span className="text-[10px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                                  Assistant
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Meeting Schedule Details */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                              <span className="text-[10px] font-bold text-slate-400 block uppercase">Meeting Day</span>
                              <span className="font-bold text-slate-800 mt-0.5 block flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-500" />
                                {cell.meetingDay}
                              </span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                              <span className="text-[10px] font-bold text-slate-400 block uppercase">Time</span>
                              <span className="font-bold text-slate-800 mt-0.5 block flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                {formatTimeDisplay(cell.meetingTime)}
                              </span>
                            </div>
                          </div>

                          {/* Capacity / Active Members */}
                          <div>
                            <div className="flex items-center justify-between text-xs font-semibold mb-1">
                              <span className="text-slate-500">Enrolled Members</span>
                              <span className="text-slate-800 font-bold">
                                {cell.activeMemberCount || 0} / {cell.maximumMembers || 20} ({capacityPct}%)
                              </span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  capacityPct >= 90 ? 'bg-rose-500' : capacityPct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${capacityPct}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="secondary"
                              onClick={() => openEditModal(cell)}
                              className="h-8 px-3 text-xs flex items-center gap-1.5 border border-slate-200"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              Edit
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => openMeetingModal(cell.id)}
                              className="h-8 px-2.5 text-xs flex items-center gap-1 border border-slate-200 text-blue-700 bg-blue-50/50 hover:bg-blue-50"
                            >
                              <CalendarPlus className="w-3.5 h-3.5" />
                              Meeting
                            </Button>
                          </div>
                          <button
                            onClick={() => handleDeleteCell(cell)}
                            className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Care Cell"
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

          {/* ── 3. MEMBERS DIRECTORY TAB ── */}
          {activeSubTab === 'members' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Enrolled Fellowship Members</h3>
                  <p className="text-xs text-slate-500">
                    Manage members enrolled across active care cells with direct transfers and contact info
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={openCreateModal}
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Assign Members
                  </Button>
                </div>
              </div>

              {/* Cell Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <button
                    onClick={() => setSelectedCellFilter('ALL')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      selectedCellFilter === 'ALL'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All Cells ({memberships.length})
                  </button>
                  {cells.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCellFilter(c.cellCode)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        selectedCellFilter === c.cellCode
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {c.cellCode}
                    </button>
                  ))}
                </div>

                <div className="relative max-w-xs w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search member..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {filteredDirectoryMembers.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">No care cell members found.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                  {filteredDirectoryMembers.map((m) => (
                    <div
                      key={m.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                            {m.cellCode || m.cellName}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Active
                          </span>
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {m.memberName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="text-sm font-bold text-slate-900 block truncate">{m.memberName}</span>
                            <span className="text-xs text-slate-500 block">{m.memberPhone || 'No phone'}</span>
                            {m.locality && (
                              <span className="text-[10px] text-slate-400 block truncate">📍 {m.locality}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        {m.memberPhone ? (
                          <a
                            href={`tel:${m.memberPhone}`}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            Call
                          </a>
                        ) : (
                          <div />
                        )}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setMemberToTransfer(m);
                              setTransferTargetCellId(cells[0]?.id || '');
                              setTransferModalOpen(true);
                            }}
                            className="text-[11px] font-semibold text-slate-600 hover:text-blue-600 px-2 py-1 rounded-lg hover:bg-slate-100 flex items-center gap-1"
                            title="Transfer to Another Cell"
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                            Transfer
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveMembership(m)}
                            className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 px-2 py-1 rounded-lg hover:bg-rose-50"
                            title="Remove from Cell"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── 4. MEMBER LOCATIONS TAB (Matching CareCellMapModal in Mobile) ── */}
          {activeSubTab === 'locations' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    Member Locations & Fellowship Zones
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Proximity matching of congregation residential addresses to Care Cell meeting venues
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">Filter Cell:</span>
                  <select
                    value={selectedCellFilter}
                    onChange={(e) => setSelectedCellFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-xl bg-slate-50"
                  >
                    <option value="ALL">All Care Cells</option>
                    {cells.map((c) => (
                      <option key={c.id} value={c.cellCode}>
                        {c.name} ({c.cellCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fellowship Zone Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cells.map((c) => {
                  const cellMems = memberships.filter(
                    (m) => (m.cellId === c.id || m.cellCode === c.cellCode) && m.membershipStatus === 'Active'
                  );
                  return (
                    <div key={c.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                          {c.cellCode}
                        </span>
                        <span className="text-xs font-bold text-slate-700">{cellMems.length} Members</span>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{c.name}</h4>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>Venue: {c.meetingLocation || c.location}</span>
                        </p>
                      </div>

                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          c.meetingLocation || c.location
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
                      >
                        <Navigation className="w-3 h-3" />
                        Open Meeting Venue in Google Maps
                      </a>

                      <div className="pt-2 border-t border-slate-200/80 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Enrolled Members in this Locality:
                        </span>
                        <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                          {cellMems.map((mem) => (
                            <div
                              key={mem.id}
                              className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                            >
                              <div className="min-w-0">
                                <span className="font-semibold text-slate-900 block truncate">{mem.memberName}</span>
                                <span className="text-[10px] text-slate-400 block truncate">
                                  {mem.locality || mem.address || 'Locality Saved'}
                                </span>
                              </div>
                              {mem.memberPhone && (
                                <a href={`tel:${mem.memberPhone}`} className="text-slate-500 hover:text-blue-600 p-1">
                                  <Phone className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── 5. MEETINGS TAB (Matching CareCellMeetingsTab in Mobile) ── */}
          {activeSubTab === 'meetings' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-teal-600" />
                    Care Cell Fellowship Meetings
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Schedule, edit, and track weekly home Bible study and worship gatherings
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => openMeetingModal()}
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    <CalendarPlus className="w-4 h-4" />
                    Schedule Meeting
                  </Button>
                </div>
              </div>

              {filteredMeetings.length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <Calendar className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs">No meetings scheduled for this period.</p>
                  <Button onClick={() => openMeetingModal()} variant="secondary" className="text-xs">
                    + Schedule First Meeting
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredMeetings.map((item) => (
                    <div
                      key={item.id}
                      className="p-5 rounded-2xl border border-slate-200 bg-white hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                            {item.cellCode} · {item.cellName}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              item.status === 'Completed'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : item.status === 'Cancelled'
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-base font-bold text-slate-900">{item.title}</h4>
                          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block mt-1">
                            {item.meetingType}
                          </span>
                        </div>

                        {item.scripture && (
                          <div className="p-2.5 bg-slate-50 rounded-xl text-xs text-slate-700 flex items-center gap-2">
                            <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>Scripture: {item.scripture}</span>
                          </div>
                        )}

                        <div className="space-y-1 text-xs text-slate-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-semibold">{item.date}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {formatTimeDisplay(item.startTime)} - {formatTimeDisplay(item.endTime || '20:30')}
                            </span>
                          </div>
                          {item.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span className="truncate">{item.location}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setAttendanceCellId(item.cellId);
                            setAttendanceDate(item.date);
                            setActiveSubTab('attendance');
                          }}
                          className="h-8 px-2.5 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1"
                        >
                          <ClipboardCheck className="w-3.5 h-3.5" />
                          Attendance
                        </Button>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="secondary"
                            onClick={() => openMeetingModal(item.cellId, item)}
                            className="h-8 px-2 text-xs border border-slate-200"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm(`Cancel meeting "${item.title}"?`)) {
                                await updateDoc(doc(db, 'Rhema Church', 'rhema', 'careCellMeetings', item.id), {
                                  status: 'Cancelled',
                                  updatedAt: serverTimestamp(),
                                });
                                showToast('Meeting cancelled.');
                              }
                            }}
                            className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50"
                            title="Cancel Meeting"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── 6. ATTENDANCE TAB (Roll-call for Care Cells) ── */}
          {activeSubTab === 'attendance' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5 text-emerald-600" />
                    Care Cell Attendance Roll-Call
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Record weekly meeting attendance for enrolled care cell fellowship members
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Select Cell */}
                  <select
                    value={attendanceCellId}
                    onChange={(e) => setAttendanceCellId(e.target.value)}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {cells.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.cellCode})
                      </option>
                    ))}
                  </select>

                  {/* Select Date */}
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {memberships.filter((m) => m.cellId === attendanceCellId).length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No active members enrolled in this cell. Assign members in the Members tab first.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {memberships
                      .filter((m) => m.cellId === attendanceCellId)
                      .map((m) => {
                        const cur = attendanceRoster[m.memberId] || 'Present';
                        return (
                          <div key={m.id} className="p-3 bg-white flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
                                {m.memberName
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-slate-900 block truncate">{m.memberName}</span>
                                <span className="text-[10px] text-slate-500 truncate block">
                                  {m.memberPhone} {m.locality ? `· ${m.locality}` : ''}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setAttendanceRoster((prev) => ({ ...prev, [m.memberId]: 'Present' }))}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                                  cur === 'Present'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                Present
                              </button>
                              <button
                                type="button"
                                onClick={() => setAttendanceRoster((prev) => ({ ...prev, [m.memberId]: 'Absent' }))}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                                  cur === 'Absent'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                Absent
                              </button>
                              <button
                                type="button"
                                onClick={() => setAttendanceRoster((prev) => ({ ...prev, [m.memberId]: 'Late' }))}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                                  cur === 'Late'
                                    ? 'bg-amber-500 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                Late
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={async () => {
                        setSavingAttendance(true);
                        try {
                          const col = collection(db, 'Rhema Church', 'rhema', 'careCellAttendance');
                          await addDoc(col, {
                            cellId: attendanceCellId,
                            date: attendanceDate,
                            roster: attendanceRoster,
                            recordedAt: serverTimestamp(),
                          });
                          showToast('Care Cell Attendance saved successfully!');
                        } catch (err: any) {
                          showToast('Error saving attendance.');
                        } finally {
                          setSavingAttendance(false);
                        }
                      }}
                      disabled={savingAttendance}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5"
                    >
                      {savingAttendance ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Check className="w-4 h-4 mr-1.5" />}
                      Save Attendance Roll-Call
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── 7. VISITS TAB (Pastoral Visits to Cell Members) ── */}
          {activeSubTab === 'visits' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Home className="w-5 h-5 text-indigo-600" />
                    Pastoral Care Visits
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Coordinate home visitations, hospital visits, and pastoral encouragement for care cell families
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setVisitCellId(cells[0]?.id || '');
                    setVisitModalOpen(true);
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Schedule Pastoral Visit
                </Button>
              </div>

              {filteredVisits.length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <Home className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs">No pastoral visits scheduled.</p>
                  <Button
                    onClick={() => {
                      setVisitCellId(cells[0]?.id || '');
                      setVisitModalOpen(true);
                    }}
                    variant="secondary"
                    className="text-xs"
                  >
                    + Schedule First Visit
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredVisits.map((v) => (
                    <div
                      key={v.id}
                      className="p-5 rounded-2xl border border-slate-200 bg-white hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                            {v.cellName}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              v.status === 'Completed'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {v.status}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-base font-bold text-slate-900">{v.memberName}</h4>
                          <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full inline-block mt-1">
                            {v.purpose}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs text-slate-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {v.visitDate} {v.visitTime ? `at ${v.visitTime}` : ''}
                            </span>
                          </div>
                          {v.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span className="truncate">{v.location}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span>Visitors: {v.assignedVisitors}</span>
                          </div>
                        </div>

                        {v.notes && (
                          <p className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            "{v.notes}"
                          </p>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        {v.memberPhone ? (
                          <a
                            href={`tel:${v.memberPhone}`}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            Call
                          </a>
                        ) : (
                          <div />
                        )}
                        {v.status !== 'Completed' && (
                          <Button
                            variant="secondary"
                            onClick={async () => {
                              await updateDoc(doc(db, 'Rhema Church', 'rhema', 'careCellVisits', v.id), {
                                status: 'Completed',
                              });
                              showToast('Visit marked as completed.');
                            }}
                            className="h-7 px-2.5 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
                          >
                            Mark Completed
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── 8. FOLLOW-UPS TAB (Pastoral Follow-up on Members) ── */}
          {activeSubTab === 'followups' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-rose-600" />
                    Care & Retention Follow-ups
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Proactive pastoral outreach for absent members, prayer needs, and spiritual check-ins
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setFollowupCellId(cells[0]?.id || '');
                    setFollowupModalOpen(true);
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Log Care Follow-up
                </Button>
              </div>

              {filteredFollowups.length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <Heart className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs">No pending care follow-ups.</p>
                  <Button
                    onClick={() => {
                      setFollowupCellId(cells[0]?.id || '');
                      setFollowupModalOpen(true);
                    }}
                    variant="secondary"
                    className="text-xs"
                  >
                    + Log New Follow-up
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredFollowups.map((f) => (
                    <div
                      key={f.id}
                      className="p-5 rounded-2xl border border-slate-200 bg-white hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                            {f.cellName}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              f.status === 'Completed'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {f.status}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-base font-bold text-slate-900">{f.memberName}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                              {f.followupType}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">· {f.reason}</span>
                          </div>
                        </div>

                        {f.notes && (
                          <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                            "{f.notes}"
                          </p>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {f.memberPhone && (
                            <>
                              <a
                                href={`tel:${f.memberPhone}`}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                Call
                              </a>
                              <a
                                href={`https://wa.me/${f.memberPhone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                WhatsApp
                              </a>
                            </>
                          )}
                        </div>

                        {f.status !== 'Completed' && (
                          <Button
                            variant="secondary"
                            onClick={async () => {
                              await updateDoc(doc(db, 'Rhema Church', 'rhema', 'careCellFollowups', f.id), {
                                status: 'Completed',
                              });
                              showToast('Follow-up marked as completed.');
                            }}
                            className="h-7 px-2.5 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── 9. NOTICES & PRAYER TAB (Matching CareCellAnnouncePrayerTab in Mobile) ── */}
          {activeSubTab === 'announcements' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-amber-600" />
                    Cell Notices & Prayer Wall
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Broadcast study materials, cell announcements, and intercede for member prayer needs
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => setNoticeSection('prayers')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        noticeSection === 'prayers' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Prayer Requests ({prayers.length})
                    </button>
                    <button
                      onClick={() => setNoticeSection('notices')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        noticeSection === 'notices' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Cell Notices ({notices.length})
                    </button>
                  </div>
                  {noticeSection === 'prayers' ? (
                    <Button
                      onClick={() => {
                        setPrayerCellId(cells[0]?.id || '');
                        setPrayerModalOpen(true);
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Add Prayer
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        setNoticeCellId('ALL');
                        setNoticeModalOpen(true);
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Broadcast Notice
                    </Button>
                  )}
                </div>
              </div>

              {noticeSection === 'prayers' ? (
                prayers.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-xs">No active cell prayer requests.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {prayers.map((p) => (
                      <div key={p.id} className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                            {p.category}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              p.status === 'Answered'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {p.status}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{p.memberName}</h4>
                          <span className="text-[11px] text-slate-400">{p.cellName}</span>
                        </div>
                        <p className="text-xs text-slate-700 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                          "{p.request}"
                        </p>
                        {p.status !== 'Answered' && (
                          <div className="pt-2 border-t border-slate-100 flex justify-end">
                            <Button
                              variant="secondary"
                              onClick={async () => {
                                await updateDoc(doc(db, 'Rhema Church', 'rhema', 'careCellPrayerRequests', p.id), {
                                  status: 'Answered',
                                });
                                showToast('Prayer marked as answered! Praise God.');
                              }}
                              className="h-7 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
                            >
                              <Check className="w-3 h-3 mr-1" />
                              Praise Report / Answered
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              ) : notices.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs">No cell announcements posted.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {notices.map((n) => (
                    <div key={n.id} className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                          {n.cellName}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            n.priority === 'Urgent'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : n.priority === 'High'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {n.priority} Priority
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-900">{n.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── CREATE / EDIT CARE CELL MODAL (WITH ASSIGNED MEMBERS FIELD & SCROLLABLE CONTAINER) ── */}
          {modalOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
                {/* Fixed Modal Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        {editingCell ? 'Edit Care Cell' : 'Create Care Cell'}
                      </h2>
                      <p className="text-xs text-slate-500">
                        Fellowship details, leader assignment, and weekly gathering schedule
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Scrollable Form Body */}
                <form id="careCellForm" onSubmit={handleSaveCell} className="p-6 overflow-y-auto flex-1 space-y-4">
                  {/* Care Cell Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Care Cell Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Grace Fellowship / Hitech City Cell"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Care Cell Code with Auto Generate Button (Matching Mobile) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Care Cell Code *
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormCellCode(generateAutoCellCode())}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700"
                      >
                        Auto Generate
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Rhema_CareCell-001"
                      value={formCellCode}
                      onChange={(e) => setFormCellCode(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm font-mono border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Standard format: Rhema_CareCell-001, Rhema_CareCell-002
                    </p>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Focus of this cell (e.g. Young Adults, Family Bible Study, Neighborhood Care)"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Location / Area */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Location / Area
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Madhapur, Kondapur, Jubilee Hills"
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Cell Leader (Existing Church Member) * (Matching Mobile Lookup Card) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Cell Leader (Existing Church Member) *
                    </label>
                    {formLeaderName ? (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center">
                            {formLeaderName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <span className="text-sm font-bold text-slate-900 block">{formLeaderName}</span>
                            <span className="text-xs text-slate-500 block">{formLeaderPhone || 'No phone'}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setLeaderSearchQuery('');
                            setShowLeaderPicker(true);
                          }}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 px-2.5 py-1 rounded-lg hover:bg-blue-50"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setLeaderSearchQuery('');
                          setShowLeaderPicker(true);
                        }}
                        className="w-full py-2.5 px-3 border border-dashed border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2"
                      >
                        <User className="w-4 h-4 text-slate-400" />
                        Select Cell Leader from Members
                      </button>
                    )}
                  </div>

                  {/* Assistant Leader (Optional) (Matching Mobile Lookup Card) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Assistant Leader (Optional)
                    </label>
                    {formAssistantName ? (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center">
                            {formAssistantName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-slate-900 block">{formAssistantName}</span>
                            <span className="text-xs text-slate-500 block">{formAssistantPhone || 'No phone'}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFormAssistantId(undefined);
                            setFormAssistantName('');
                            setFormAssistantPhone('');
                            setFormAssistantPhoto(undefined);
                          }}
                          className="text-xs font-bold text-rose-600 hover:text-rose-700 px-2.5 py-1 rounded-lg hover:bg-rose-50"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setLeaderSearchQuery('');
                          setShowAssistantPicker(true);
                        }}
                        className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                        Assign Assistant Leader
                      </button>
                    )}
                  </div>

                  {/* ── ASSIGNED MEMBERS SECTION (Exact Mobile Parity: CareCellFormModal.tsx lines 585-700) ── */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Assigned Members {formLocation.trim() ? `(${formLocation.trim()})` : ''}
                        </span>
                      </div>
                      {locationMatchedMembers.length > 0 && (
                        <button
                          type="button"
                          onClick={toggleAllMatchedMembers}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 px-2 py-0.5 rounded hover:bg-blue-50 transition-colors"
                        >
                          {isAllMatchedSelected ? 'Deselect All' : 'Select All'}
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {formLocation.trim()
                        ? `Existing church members living within ${formLocation.trim()} based on saved profile locations.`
                        : 'Enter a Location / Area above to match members living in that locality, or browse the church directory below.'}
                    </p>

                    {/* Location Matched Members List */}
                    {formLocation.trim().length >= 2 && (
                      <div className="space-y-1.5 pt-1">
                        {locationMatchedMembers.length === 0 ? (
                          <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-2 text-xs text-slate-500">
                            <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                            <span>No members currently saved with residential address in "{formLocation}".</span>
                          </div>
                        ) : (
                          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                            {locationMatchedMembers.map((mem) => {
                              const isSel = selectedMembersMap.has(mem.id);
                              return (
                                <div
                                  key={mem.id}
                                  onClick={() => toggleMemberSelection(mem)}
                                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                    isSel
                                      ? 'bg-blue-50/70 border-blue-300 shadow-xs'
                                      : 'bg-white border-slate-200 hover:border-slate-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div
                                      className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                                        isSel
                                          ? 'bg-blue-600 border-blue-600 text-white'
                                          : 'border-slate-300 bg-white'
                                      }`}
                                    >
                                      {isSel && <Check className="w-3 h-3 stroke-[3]" />}
                                    </div>
                                    <div className="min-w-0">
                                      <span className="text-xs font-bold text-slate-900 block truncate">
                                        {mem.name}
                                      </span>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                                          <MapPin className="w-2.5 h-2.5 text-slate-500" />
                                          {mem.locality || formLocation}
                                        </span>
                                        {mem.phone && (
                                          <span className="text-[10px] text-slate-500">{mem.phone}</span>
                                        )}
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

                    {/* Open Church Directory Lookup Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setMemberDirectorySearch('');
                        setShowAllMembersPicker(true);
                      }}
                      className="w-full py-2.5 px-3 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2 transition-all shadow-xs"
                    >
                      <UserPlus className="w-4 h-4 text-blue-600" />
                      <span>
                        {formLocation.trim()
                          ? `Browse / Filter Members in ${formLocation.trim()} (${selectedMembersMap.size} selected)`
                          : `Select Members from Church Directory (${selectedMembersMap.size} selected)`}
                      </span>
                    </button>

                    {/* Selected Members Chips */}
                    {selectedMembersMap.size > 0 && (
                      <div className="pt-2 border-t border-slate-200/60">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                          Enrolled Cell Members ({selectedMembersMap.size})
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                          {Array.from(selectedMembersMap.values()).map((mem) => (
                            <span
                              key={mem.id}
                              className="inline-flex items-center gap-1 bg-white border border-slate-200 text-slate-800 text-[11px] font-semibold px-2 py-0.5 rounded-lg shadow-2xs"
                            >
                              <span>{mem.name}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeSelectedMember(mem.id);
                                }}
                                className="text-slate-400 hover:text-rose-600 ml-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Meeting Day * (Matching Mobile Day Pill Selector) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Meeting Day *
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {DAYS_OF_WEEK.map((day) => {
                        const isSel = formMeetingDay === day;
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => setFormMeetingDay(day)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              isSel ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Starting Time * & Ending Time */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Starting Time *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="19:00"
                        value={formMeetingTime}
                        onChange={(e) => setFormMeetingTime(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        {formatTimeDisplay(formMeetingTime)} (24h format e.g. 19:00)
                      </span>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Ending Time
                      </label>
                      <input
                        type="text"
                        placeholder="20:30"
                        value={formMeetingEndTime}
                        onChange={(e) => setFormMeetingEndTime(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        {formatTimeDisplay(formMeetingEndTime)} (24h format e.g. 20:30)
                      </span>
                    </div>
                  </div>

                  {/* Meeting Location / Address */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Meeting Location / Address
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Leader's Home / Community Hall"
                      value={formMeetingLocation}
                      onChange={(e) => setFormMeetingLocation(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Max Members & Status Pills (Matching Mobile) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Max Members
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="200"
                        value={formMaxMembers}
                        onChange={(e) => setFormMaxMembers(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Status
                      </label>
                      <div className="flex gap-1.5">
                        {STATUS_OPTIONS.map((st) => {
                          const isSel = formStatus === st;
                          return (
                            <button
                              key={st}
                              type="button"
                              onClick={() => setFormStatus(st)}
                              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                                isSel
                                  ? st === 'Active'
                                    ? 'bg-emerald-600 text-white'
                                    : st === 'Inactive'
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-rose-600 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {st}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </form>

                {/* Fixed Modal Footer */}
                <div className="p-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
                  {editingCell ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteCell(editingCell)}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 px-3 py-2 rounded-xl hover:bg-rose-50 flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Care Cell
                    </button>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setModalOpen(false)}
                      disabled={saving}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      form="careCellForm"
                      disabled={saving}
                      className="bg-black hover:bg-slate-900 text-white text-xs font-bold min-w-[130px]"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      ) : editingCell ? (
                        'Save Changes'
                      ) : (
                        'Create Care Cell'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── SCHEDULE MEETING MODAL (DIRECT ACTION 2 - Exact Mobile Parity: MeetingFormModal.tsx) ── */}
          {meetingModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                      <CalendarPlus className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        {editingMeeting ? 'Edit Care Cell Meeting' : 'Schedule Care Cell Meeting'}
                      </h2>
                      <p className="text-xs text-slate-500">Plan weekly gathering, Bible study, and prayer topic</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMeetingModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form id="meetingForm" onSubmit={handleSaveMeeting} className="p-6 overflow-y-auto flex-1 space-y-4">
                  {/* Select Cell */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Care Cell *
                    </label>
                    <select
                      value={meetingCellId}
                      onChange={(e) => {
                        const cid = e.target.value;
                        setMeetingCellId(cid);
                        const c = cells.find((item) => item.id === cid);
                        if (c) {
                          setMeetingTitle(`${c.name} Fellowship`);
                          setMeetingLocation(c.meetingLocation || c.location);
                          setMeetingStartTime(c.meetingTime || '19:00');
                          setMeetingEndTime(c.meetingEndTime || '20:30');
                        }
                      }}
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      {cells.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.cellCode}) · {c.location}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Meeting Title */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Meeting Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Weekly Fellowship & Bible Study"
                      value={meetingTitle}
                      onChange={(e) => setMeetingTitle(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Scripture Focus & Study Topic */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Scripture / Study Focus
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Philippians 4:6-7 / Overcoming Worry"
                      value={meetingScripture}
                      onChange={(e) => setMeetingScripture(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Date, Start Time, End Time */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Meeting Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={meetingDate}
                        onChange={(e) => setMeetingDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Start Time
                      </label>
                      <input
                        type="text"
                        value={meetingStartTime}
                        onChange={(e) => setMeetingStartTime(e.target.value)}
                        placeholder="19:00"
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        End Time
                      </label>
                      <input
                        type="text"
                        value={meetingEndTime}
                        onChange={(e) => setMeetingEndTime(e.target.value)}
                        placeholder="20:30"
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Meeting Location */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Venue / Meeting Location
                    </label>
                    <input
                      type="text"
                      value={meetingLocation}
                      onChange={(e) => setMeetingLocation(e.target.value)}
                      placeholder="e.g. Leader's Residence / Community Center"
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Meeting Type */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Meeting Type
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {MEETING_TYPES.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setMeetingType(t)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            meetingType === t
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes / Description */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Pastoral Notes / Instructions
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Special prayer focus, guest speaker notes, or directions..."
                      value={meetingDescription}
                      onChange={(e) => setMeetingDescription(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </form>

                <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0 bg-slate-50">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setMeetingModalOpen(false)}
                    disabled={savingMeeting}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    form="meetingForm"
                    disabled={savingMeeting}
                    className="bg-black hover:bg-slate-900 text-white text-xs font-bold min-w-[140px]"
                  >
                    {savingMeeting ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : editingMeeting ? (
                      'Save Changes'
                    ) : (
                      'Schedule Meeting'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── TRANSFER MEMBER SUB-MODAL ── */}
          {transferModalOpen && memberToTransfer && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900">Transfer Cell Member</h3>
                  </div>
                  <button onClick={() => setTransferModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-600">
                  Transfer <strong className="text-slate-900">{memberToTransfer.memberName}</strong> from{' '}
                  <span className="font-semibold">{memberToTransfer.cellName}</span> to another care cell:
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Select Target Care Cell
                  </label>
                  <select
                    value={transferTargetCellId}
                    onChange={(e) => setTransferTargetCellId(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {cells
                      .filter((c) => c.id !== memberToTransfer.cellId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.cellCode}) · {c.location}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <Button variant="secondary" onClick={() => setTransferModalOpen(false)} className="text-xs">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleTransferMember}
                    disabled={transferring}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                  >
                    {transferring ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Transfer'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── SCHEDULE VISIT SUB-MODAL ── */}
          {visitModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                  <div className="flex items-center gap-2">
                    <Home className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900">Schedule Pastoral Care Visit</h3>
                  </div>
                  <button onClick={() => setVisitModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveVisit} className="p-6 overflow-y-auto flex-1 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Care Cell
                    </label>
                    <select
                      value={visitCellId}
                      onChange={(e) => setVisitCellId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                    >
                      {cells.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.cellCode})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Member Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={visitMemberName}
                      onChange={(e) => setVisitMemberName(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        placeholder="+91..."
                        value={visitMemberPhone}
                        onChange={(e) => setVisitMemberPhone(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Purpose
                      </label>
                      <select
                        value={visitPurpose}
                        onChange={(e) => setVisitPurpose(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                      >
                        {VISIT_PURPOSES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Visit Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={visitDate}
                        onChange={(e) => setVisitDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Visit Time
                      </label>
                      <input
                        type="text"
                        placeholder="18:00"
                        value={visitTime}
                        onChange={(e) => setVisitTime(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Home Address / Venue
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Flat 302, Green Valley Apartments"
                      value={visitLocation}
                      onChange={(e) => setVisitLocation(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Assigned Pastoral Visitors
                    </label>
                    <input
                      type="text"
                      value={visitAssignedVisitors}
                      onChange={(e) => setVisitAssignedVisitors(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Notes / Prayer Points
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Special prayer requests or context for the visit..."
                      value={visitNotes}
                      onChange={(e) => setVisitNotes(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setVisitModalOpen(false)} className="text-xs">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={savingVisit} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold">
                      {savingVisit ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Schedule Visit'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ── LOG FOLLOW-UP SUB-MODAL ── */}
          {followupModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-rose-600" />
                    <h3 className="text-sm font-bold text-slate-900">Log Care Follow-up</h3>
                  </div>
                  <button onClick={() => setFollowupModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveFollowup} className="p-6 overflow-y-auto flex-1 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Care Cell
                    </label>
                    <select
                      value={followupCellId}
                      onChange={(e) => setFollowupCellId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                    >
                      {cells.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.cellCode})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Member Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. David Abraham"
                      value={followupMemberName}
                      onChange={(e) => setFollowupMemberName(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        placeholder="+91..."
                        value={followupMemberPhone}
                        onChange={(e) => setFollowupMemberPhone(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Follow-up Type
                      </label>
                      <select
                        value={followupType}
                        onChange={(e) => setFollowupType(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                      >
                        {FOLLOWUP_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Trigger / Reason
                    </label>
                    <select
                      value={followupReason}
                      onChange={(e) => setFollowupReason(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                    >
                      {FOLLOWUP_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Pastoral Remarks / Action Notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Notes on member situation, conversation summary, and next action..."
                      value={followupNotes}
                      onChange={(e) => setFollowupNotes(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setFollowupModalOpen(false)} className="text-xs">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={savingFollowup} className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold">
                      {savingFollowup ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log Follow-up'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ── BROADCAST NOTICE MODAL ── */}
          {noticeModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-amber-600" />
                    <h3 className="text-sm font-bold text-slate-900">Broadcast Care Cell Notice</h3>
                  </div>
                  <button onClick={() => setNoticeModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveNotice} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Target Cell
                    </label>
                    <select
                      value={noticeCellId}
                      onChange={(e) => setNoticeCellId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                    >
                      <option value="ALL">All Care Cells (Broadcast)</option>
                      {cells.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.cellCode})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Notice Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Fasting Prayer Schedule / Venue Shift"
                      value={noticeTitle}
                      onChange={(e) => setNoticeTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Notice Message *
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Announcement message for care cell members..."
                      value={noticeMessage}
                      onChange={(e) => setNoticeMessage(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setNoticeModalOpen(false)} className="text-xs">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={savingNotice} className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold">
                      {savingNotice ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Broadcast Notice'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ── ADD PRAYER REQUEST MODAL ── */}
          {prayerModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <h3 className="text-sm font-bold text-slate-900">Add Cell Prayer Request</h3>
                  </div>
                  <button onClick={() => setPrayerModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSavePrayer} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Member Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sister Sarah"
                      value={prayerMemberName}
                      onChange={(e) => setPrayerMemberName(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Category
                    </label>
                    <select
                      value={prayerCategory}
                      onChange={(e) => setPrayerCategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                    >
                      {['Healing & Health', 'Job & Career', 'Family Peace', 'Financial Deliverance', 'Spiritual Growth', 'Travel Mercies'].map(
                        (cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Prayer Request *
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Enter specific petition or intercession need..."
                      value={prayerRequest}
                      onChange={(e) => setPrayerRequest(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setPrayerModalOpen(false)} className="text-xs">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={savingPrayer} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold">
                      {savingPrayer ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Prayer'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ── BROWSE CHURCH DIRECTORY SUB-MODAL ── */}
          {showAllMembersPicker && (
            <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Select Members from Church Directory</h3>
                    <p className="text-xs text-slate-500">
                      {selectedMembersMap.size} members currently assigned to this care cell
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAllMembersPicker(false)}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 border-b border-slate-100">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search member by name, phone or locality..."
                      value={memberDirectorySearch}
                      onChange={(e) => setMemberDirectorySearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="p-3 overflow-y-auto flex-1 space-y-1.5">
                  {membersPool
                    .filter((m) => {
                      if (!memberDirectorySearch.trim()) return true;
                      const q = memberDirectorySearch.toLowerCase().trim();
                      return m.name.toLowerCase().includes(q) || m.phone.includes(q) || (m.locality && m.locality.toLowerCase().includes(q));
                    })
                    .slice(0, 30)
                    .map((m) => {
                      const isSel = selectedMembersMap.has(m.id);
                      return (
                        <div
                          key={m.id}
                          onClick={() => toggleMemberSelection(m)}
                          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            isSel
                              ? 'bg-blue-50/70 border-blue-300 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                                isSel ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSel && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-900 block truncate">{m.name}</span>
                              <div className="flex items-center gap-2 mt-0.5">
                                {m.locality && (
                                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                                    <MapPin className="w-2.5 h-2.5 text-slate-500" />
                                    {m.locality}
                                  </span>
                                )}
                                {m.phone && <span className="text-[10px] text-slate-500">{m.phone}</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    {selectedMembersMap.size} selected
                  </span>
                  <Button
                    onClick={() => setShowAllMembersPicker(false)}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-1.5"
                  >
                    Done
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── MEMBER PICKER SUB-MODAL (FOR LEADER OR ASSISTANT) ── */}
          {(showLeaderPicker || showAssistantPicker) && (
            <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    {showLeaderPicker ? 'Select Cell Leader' : 'Assign Assistant Leader'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowLeaderPicker(false);
                      setShowAssistantPicker(false);
                    }}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-3 border-b border-slate-100">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search member by name, phone or locality..."
                      value={leaderSearchQuery}
                      onChange={(e) => setLeaderSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="p-3 overflow-y-auto flex-1 space-y-1.5">
                  {membersPool
                    .filter((m) => {
                      if (!leaderSearchQuery.trim()) return true;
                      const q = leaderSearchQuery.toLowerCase().trim();
                      return m.name.toLowerCase().includes(q) || m.phone.includes(q) || (m.locality && m.locality.toLowerCase().includes(q));
                    })
                    .slice(0, 20)
                    .map((m) => (
                      <div
                        key={m.id}
                        onClick={() => (showLeaderPicker ? handleSelectLeader(m) : handleSelectAssistant(m))}
                        className="p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                            {m.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-900 truncate block">{m.name}</span>
                            <span className="text-[11px] text-slate-500 truncate block">
                              {m.phone} {m.locality ? `· ${m.locality}` : ''}
                            </span>
                          </div>
                        </div>
                        <Check className="w-4 h-4 text-slate-300" />
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminNavigationShell>
    </ProtectedRoute>
  );
}
