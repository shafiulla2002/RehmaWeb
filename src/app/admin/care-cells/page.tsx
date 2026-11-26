'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Square,
  List,
  Map as MapIcon,
  Shield,
  ExternalLink,
} from 'lucide-react';
import { ENGLISH_NAMES, TELUGU_NAMES, getChapterCount, getVerseCount } from '@/lib/bible-metadata';

// ── Interfaces ─────────────────────────────────────────────────────────────────
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
  latitude?: number;
  longitude?: number;
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
  latitude?: number;
  longitude?: number;
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
  bibleBook?: string;
  bibleChapter?: number;
  bibleVerse?: string;
  scriptureTextEn?: string;
  scriptureTextTe?: string;
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
  userType?: string;
  locality?: string;
  address?: string;
  city?: string;
  village?: string;
  latitude?: number;
  longitude?: number;
  memberCode?: string;
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
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
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

  // Active care cell for scoped views (e.g. Members, Locations)
  const activeSelectedCell = useMemo(() => {
    if (selectedCellFilter === 'ALL') {
      return cells[0] || null;
    }
    return cells.find((c) => c.id === selectedCellFilter) || cells[0] || null;
  }, [cells, selectedCellFilter]);

  // Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ── Month Picker Handlers ──────────────────────────────────────────────────
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  // ── 1. Firestore Listeners ───────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);

    const unsubCells = onSnapshot(collection(db, 'Rhema Church', 'rhema', 'careCells'), (snap) => {
      const list: CareCellRecord[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          name: d.name || 'Unnamed Cell',
          cellCode: d.cellCode || 'Rhema_CareCell-001',
          description: d.description || '',
          location: d.location || '',
          meetingLocation: d.meetingLocation || d.location || '',
          leaderId: d.leaderId || '',
          leaderName: d.leaderName || 'Unassigned Leader',
          leaderPhone: d.leaderPhone || '',
          leaderPhoto: d.leaderPhoto,
          assistantLeaderId: d.assistantLeaderId,
          assistantLeaderName: d.assistantLeaderName,
          assistantLeaderPhone: d.assistantLeaderPhone,
          assistantLeaderPhoto: d.assistantLeaderPhoto,
          meetingDay: d.meetingDay || 'Friday',
          meetingTime: d.meetingTime || '19:00',
          meetingEndTime: d.meetingEndTime || '20:30',
          maximumMembers: d.maximumMembers || 20,
          activeMemberCount: d.activeMemberCount || 0,
          status: d.status || 'Active',
          latitude: d.latitude || d.meetingLatitude,
          longitude: d.longitude || d.meetingLongitude,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        };
      });
      setCells(list);
      setLoading(false);
    });

    const unsubMemberships = onSnapshot(collection(db, 'Rhema Church', 'rhema', 'careCellMemberships'), (snap) => {
      const list: CareCellMembershipRecord[] = snap.docs.map((d) => ({
        id: d.id,
        cellId: d.data().cellId || '',
        cellCode: d.data().cellCode || '',
        cellName: d.data().cellName || '',
        memberId: d.data().memberId || '',
        memberName: d.data().memberName || 'Church Member',
        memberPhone: d.data().memberPhone || '',
        memberPhoto: d.data().memberPhoto || d.data().photoUrl,
        locality: d.data().locality || d.data().area || '',
        address: d.data().address || '',
        latitude: d.data().latitude,
        longitude: d.data().longitude,
        membershipStatus: d.data().membershipStatus || 'Active',
        joinedAt: d.data().joinedAt,
        updatedAt: d.data().updatedAt,
      }));
      setMemberships(list);
    });

    const unsubMeetings = onSnapshot(collection(db, 'Rhema Church', 'rhema', 'careCellMeetings'), (snap) => {
      const list: CareCellMeetingRecord[] = snap.docs.map((d) => ({
        id: d.id,
        cellId: d.data().cellId || '',
        cellCode: d.data().cellCode || '',
        cellName: d.data().cellName || '',
        title: d.data().title || 'Fellowship Gathering',
        description: d.data().description || '',
        date: d.data().date || '',
        startTime: d.data().startTime || '19:00',
        endTime: d.data().endTime || '20:30',
        location: d.data().location || '',
        meetingType: d.data().meetingType || 'Bible Study',
        bibleBook: d.data().bibleBook,
        bibleChapter: d.data().bibleChapter,
        bibleVerse: d.data().bibleVerse,
        scriptureTextEn: d.data().scriptureTextEn,
        scriptureTextTe: d.data().scriptureTextTe,
        status: d.data().status || 'Upcoming',
        createdAt: d.data().createdAt,
        updatedAt: d.data().updatedAt,
      }));
      setMeetings(list);
    });

    const unsubVisits = onSnapshot(collection(db, 'Rhema Church', 'rhema', 'careCellVisits'), (snap) => {
      const list: CareCellVisitRecord[] = snap.docs.map((d) => ({
        id: d.id,
        cellId: d.data().cellId || '',
        cellName: d.data().cellName || '',
        memberId: d.data().memberId || '',
        memberName: d.data().memberName || 'Member',
        memberPhone: d.data().memberPhone || '',
        visitDate: d.data().visitDate || '',
        visitTime: d.data().visitTime || '',
        purpose: d.data().purpose || 'Routine Fellowship',
        location: d.data().location || '',
        assignedVisitors: d.data().assignedVisitors || 'Pastoral Care Team',
        notes: d.data().notes || '',
        status: d.data().status || 'Scheduled',
        createdAt: d.data().createdAt,
      }));
      setVisits(list);
    });

    const unsubFollowups = onSnapshot(collection(db, 'Rhema Church', 'rhema', 'careCellFollowups'), (snap) => {
      const list: CareCellFollowupRecord[] = snap.docs.map((d) => ({
        id: d.id,
        cellId: d.data().cellId || '',
        cellName: d.data().cellName || '',
        memberId: d.data().memberId || '',
        memberName: d.data().memberName || 'Member',
        memberPhone: d.data().memberPhone || '',
        followupType: d.data().followupType || 'Phone Call',
        reason: d.data().reason || 'Missed Gatherings',
        notes: d.data().notes || '',
        nextActionDate: d.data().nextActionDate || '',
        status: d.data().status || 'Pending',
        createdAt: d.data().createdAt,
      }));
      setFollowups(list);
    });

    const unsubNotices = onSnapshot(collection(db, 'Rhema Church', 'rhema', 'careCellAnnouncements'), (snap) => {
      const list: CareCellNoticeRecord[] = snap.docs.map((d) => ({
        id: d.id,
        cellId: d.data().cellId || '',
        cellName: d.data().cellName || '',
        title: d.data().title || 'Notice',
        message: d.data().message || '',
        priority: d.data().priority || 'Normal',
        createdAt: d.data().createdAt,
      }));
      setNotices(list);
    });

    const unsubPrayers = onSnapshot(collection(db, 'Rhema Church', 'rhema', 'careCellPrayerRequests'), (snap) => {
      const list: CareCellPrayerRecord[] = snap.docs.map((d) => ({
        id: d.id,
        cellId: d.data().cellId || '',
        cellName: d.data().cellName || '',
        memberId: d.data().memberId || '',
        memberName: d.data().memberName || 'Member',
        category: d.data().category || 'General',
        request: d.data().request || '',
        pastoralNotes: d.data().pastoralNotes || '',
        status: d.data().status || 'Active',
        createdAt: d.data().createdAt,
      }));
      setPrayers(list);
    });

    return () => {
      unsubCells();
      unsubMemberships();
      unsubMeetings();
      unsubVisits();
      unsubFollowups();
      unsubNotices();
      unsubPrayers();
    };
  }, []);

  // ── 2. Load Church Member Directory for Lookup & Location Matching ─────────────
  useEffect(() => {
    const fetchChurchMembers = async () => {
      setLoadingMembers(true);
      try {
        const memSnap = await getDocs(collection(db, 'Rhema Church', 'rhema', 'members'));
        let parsed: ChurchMemberOption[] = [];

        if (!memSnap.empty) {
          parsed = memSnap.docs.map((d, index) => {
            const data = d.data();
            const fullName = data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Church Member';
            return {
              id: d.id,
              name: fullName,
              phone: data.phone || data.phoneNumber || data.referencePhone || '',
              photoUrl: data.photoUrl || data.profilePicture || data.profilePhoto,
              userType: data.userType || 'Member',
              locality: data.locality || data.area || data.village || data.city || data.mailingCity || '',
              address: data.address || data.street || data.mailingStreet || '',
              city: data.city || data.mailingCity || '',
              village: data.village || '',
              latitude: typeof data.latitude === 'number' ? data.latitude : (data.lat ? Number(data.lat) : undefined),
              longitude: typeof data.longitude === 'number' ? data.longitude : (data.lng ? Number(data.lng) : undefined),
              memberCode: data.memberCode || `Rhema-${String(index + 1).padStart(3, '0')}`,
            };
          });
        }

        // Fallback demo members if directory is empty
        if (parsed.length === 0) {
          parsed = [
            {
              id: 'demo-1',
              name: 'Rajesh Yeddula',
              phone: '+919948510783',
              locality: 'Koilakuntla',
              address: 'RTC Busstand opposite Muthoot finance, Koilakuntla',
              memberCode: 'Rhema-005',
            },
            {
              id: 'demo-2',
              name: 'Jayanthi Admin',
              phone: '+919398501975',
              locality: 'Koilakuntla',
              address: 'Church of God Campus, Koilakuntla',
              memberCode: 'Rhema-003',
            },
            {
              id: 'demo-3',
              name: 'Shafi Kumar',
              phone: '+919642402639',
              locality: 'Koilakuntla',
              address: 'Main Bazaar, Koilakuntla',
              memberCode: 'Rhema-006',
            },
            {
              id: 'demo-4',
              name: 'Sakibanda Sunil Babu',
              phone: '+918374331432',
              locality: 'Koilakuntla',
              address: 'Koilakuntla',
              memberCode: 'Rhema-002',
            },
            {
              id: 'demo-5',
              name: 'David Abraham',
              phone: '+919876543210',
              locality: 'Hebbal',
              address: 'Hebbal Ring Road',
              memberCode: 'Rhema-007',
            },
            {
              id: 'demo-6',
              name: 'Mary Grace',
              phone: '+919876543211',
              locality: 'Indiranagar',
              address: '100ft Road, Indiranagar',
              memberCode: 'Rhema-008',
            },
          ];
        }

        setMembersPool(parsed);
      } catch (err) {
        console.error('Error fetching church members:', err);
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchChurchMembers();
  }, []);

  // Compute unique localities for the filter pills
  const uniqueLocalities = useMemo(() => {
    const set = new Set<string>();
    membersPool.forEach((m) => {
      if (m.locality && m.locality.trim()) {
        set.add(m.locality.trim());
      }
    });
    return Array.from(set).sort();
  }, [membersPool]);

  // Map of active memberships for deduplication across all cells
  const activeMembershipsMap = useMemo(() => {
    const map = new Map<string, CareCellMembershipRecord>();
    memberships.filter((m) => m.membershipStatus === 'Active').forEach((m) => {
      map.set(m.memberId, m);
    });
    return map;
  }, [memberships]);

  // ── 3. Dedicated Add Members Modal (100% Mobile Parity MemberLookupModal) ──────
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [addMembersTargetCell, setAddMembersTargetCell] = useState<CareCellRecord | null>(null);
  const [addMembersSearchQuery, setAddMembersSearchQuery] = useState('');
  const [addMembersSelectedLocality, setAddMembersSelectedLocality] = useState<string>('ALL');
  const [addMembersFilterByLocation, setAddMembersFilterByLocation] = useState<boolean>(true);
  const [addMembersSelectedMap, setAddMembersSelectedMap] = useState<Map<string, ChurchMemberOption>>(new Map());
  const [addMembersTransferIds, setAddMembersTransferIds] = useState<Set<string>>(new Set());
  const [addMembersSaving, setAddMembersSaving] = useState(false);

  const openAddMembersModalForCell = (cell: CareCellRecord) => {
    setAddMembersTargetCell(cell);
    setAddMembersSearchQuery('');
    setAddMembersSelectedLocality('ALL');
    setAddMembersFilterByLocation(!!(cell.location && cell.location.trim()));
    setAddMembersSelectedMap(new Map());
    setAddMembersTransferIds(new Set());
    setShowAddMembersModal(true);
  };

  // Filtered members for Add Members modal
  const addMembersFilteredList = useMemo(() => {
    let result = membersPool;
    const targetLoc = (addMembersTargetCell?.location || '').trim().toLowerCase();

    // Location toggle filter
    if (addMembersFilterByLocation && targetLoc) {
      result = result.filter((m) => {
        const mLoc = (m.locality || m.city || m.village || m.address || '').toLowerCase();
        return mLoc.includes(targetLoc);
      });
    } else if (addMembersSelectedLocality !== 'ALL') {
      result = result.filter(
        (m) => (m.locality || '').trim().toLowerCase() === addMembersSelectedLocality.toLowerCase()
      );
    }

    // Search query filter
    if (addMembersSearchQuery.trim()) {
      const q = addMembersSearchQuery.toLowerCase().trim();
      const rawDigits = q.replace(/\D/g, '');
      result = result.filter((m) => {
        const matchName = m.name.toLowerCase().includes(q);
        const matchPhone = rawDigits && m.phone ? m.phone.replace(/\D/g, '').includes(rawDigits) : false;
        const matchLoc = m.locality ? m.locality.toLowerCase().includes(q) : false;
        const matchAddr = m.address ? m.address.toLowerCase().includes(q) : false;
        const matchCode = m.memberCode ? m.memberCode.toLowerCase().includes(q) : false;
        return matchName || matchPhone || matchLoc || matchAddr || matchCode;
      });
    }

    return result;
  }, [
    membersPool,
    addMembersTargetCell,
    addMembersFilterByLocation,
    addMembersSelectedLocality,
    addMembersSearchQuery,
  ]);

  const handleToggleAddMember = (m: ChurchMemberOption) => {
    if (!addMembersTargetCell) return;

    // Check if already in THIS cell
    const existingMembership = activeMembershipsMap.get(m.id);
    if (existingMembership && existingMembership.cellId === addMembersTargetCell.id) {
      alert(`${m.name} is already an active member of this Care Cell.`);
      return;
    }

    // Check if in ANOTHER cell (transfer prompt)
    if (existingMembership && existingMembership.cellId !== addMembersTargetCell.id) {
      const otherLabel = existingMembership.cellCode || existingMembership.cellName || 'another cell';
      const confirmed = window.confirm(
        `Member Transfer Required:\n\n${m.name} is currently enrolled in ${otherLabel}.\n\nAdding them to ${addMembersTargetCell.name} will transfer them from ${otherLabel}. Previous records remain preserved.\n\nDo you want to proceed with transfer?`
      );
      if (!confirmed) return;

      setAddMembersSelectedMap((prev) => {
        const next = new Map(prev);
        next.set(m.id, m);
        return next;
      });
      setAddMembersTransferIds((prev) => new Set(prev).add(m.id));
      return;
    }

    // Normal toggle
    setAddMembersSelectedMap((prev) => {
      const next = new Map(prev);
      if (next.has(m.id)) {
        next.delete(m.id);
        setAddMembersTransferIds((tPrev) => {
          const tNext = new Set(tPrev);
          tNext.delete(m.id);
          return tNext;
        });
      } else {
        next.set(m.id, m);
      }
      return next;
    });
  };

  const handleConfirmAddMembers = async () => {
    if (!addMembersTargetCell || addMembersSelectedMap.size === 0) return;
    setAddMembersSaving(true);
    try {
      const batch = writeBatch(db);
      const selectedList = Array.from(addMembersSelectedMap.values());

      for (const m of selectedList) {
        // If member had an existing membership in another cell, mark it as Transferred
        const existing = activeMembershipsMap.get(m.id);
        if (existing) {
          const oldRef = doc(db, 'Rhema Church', 'rhema', 'careCellMemberships', existing.id);
          batch.update(oldRef, {
            membershipStatus: 'Transferred',
            transferredToCellId: addMembersTargetCell.id,
            transferredToCellName: addMembersTargetCell.name,
            updatedAt: serverTimestamp(),
          });
        }

        // Create new membership in target cell
        const newRef = doc(collection(db, 'Rhema Church', 'rhema', 'careCellMemberships'));
        batch.set(newRef, {
          cellId: addMembersTargetCell.id,
          cellCode: addMembersTargetCell.cellCode,
          cellName: addMembersTargetCell.name,
          memberId: m.id,
          memberName: m.name,
          memberPhone: m.phone || '',
          memberPhoto: m.photoUrl || '',
          locality: m.locality || '',
          address: m.address || '',
          latitude: m.latitude || null,
          longitude: m.longitude || null,
          membershipStatus: 'Active',
          joinedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Update target cell activeMemberCount
      const cellRef = doc(db, 'Rhema Church', 'rhema', 'careCells', addMembersTargetCell.id);
      const newCount = (addMembersTargetCell.activeMemberCount || 0) + selectedList.length;
      batch.update(cellRef, {
        activeMemberCount: newCount,
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
      showToast(`Successfully assigned ${selectedList.length} member(s) to ${addMembersTargetCell.name}!`);
      setShowAddMembersModal(false);
    } catch (err: any) {
      console.error('Error assigning members:', err);
      alert('Failed to assign members: ' + (err.message || 'Unknown error'));
    } finally {
      setAddMembersSaving(false);
    }
  };

  // ── 4. Create / Edit Care Cell Form State & Handlers ──────────────────────────
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
  const [formSelectedMembersMap, setFormSelectedMembersMap] = useState<Map<string, ChurchMemberOption>>(new Map());
  const [savingCell, setSavingCell] = useState(false);

  // Single-select Member Lookup Modal (for Leader or Assistant)
  const [singleLookupMode, setSingleLookupMode] = useState<'leader' | 'assistant' | null>(null);
  const [singleLookupSearch, setSingleLookupSearch] = useState('');

  const openCreateModal = () => {
    setEditingCell(null);
    setFormName('');
    const nextNum = cells.length + 1;
    setFormCellCode(`Rhema_CareCell-${String(nextNum).padStart(3, '0')}`);
    setFormDescription('');
    setFormLocation('Koilakuntla');
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
    setFormSelectedMembersMap(new Map());
    setModalOpen(true);
  };

  const openEditModal = (cell: CareCellRecord) => {
    setEditingCell(cell);
    setFormName(cell.name);
    setFormCellCode(cell.cellCode);
    setFormDescription(cell.description || '');
    setFormLocation(cell.location || '');
    setFormMeetingLocation(cell.meetingLocation || cell.location || '');
    setFormLeaderId(cell.leaderId || '');
    setFormLeaderName(cell.leaderName || '');
    setFormLeaderPhone(cell.leaderPhone || '');
    setFormLeaderPhoto(cell.leaderPhoto);
    setFormAssistantId(cell.assistantLeaderId);
    setFormAssistantName(cell.assistantLeaderName || '');
    setFormAssistantPhone(cell.assistantLeaderPhone || '');
    setFormAssistantPhoto(cell.assistantLeaderPhoto);
    setFormMeetingDay(cell.meetingDay || 'Friday');
    setFormMeetingTime(cell.meetingTime || '19:00');
    setFormMeetingEndTime(cell.meetingEndTime || '20:30');
    setFormMaxMembers(String(cell.maximumMembers || 20));
    setFormStatus(cell.status || 'Active');
    setFormSelectedMembersMap(new Map());
    setModalOpen(true);
  };

  // Location matched members in Create Cell form
  const formLocationMatchedMembers = useMemo(() => {
    if (!formLocation || !formLocation.trim() || formLocation.trim().length < 2) {
      return [];
    }
    const loc = formLocation.trim().toLowerCase();
    return membersPool.filter((m) => {
      if (m.id === formLeaderId || m.id === formAssistantId) return false;
      const mLoc = (m.locality || m.city || m.village || m.address || '').toLowerCase();
      return mLoc.includes(loc);
    });
  }, [membersPool, formLocation, formLeaderId, formAssistantId]);

  // When location changes, auto-select matched members if not already selected
  useEffect(() => {
    if (formLocationMatchedMembers.length > 0 && formSelectedMembersMap.size === 0) {
      const map = new Map<string, ChurchMemberOption>();
      formLocationMatchedMembers.forEach((m) => map.set(m.id, m));
      setFormSelectedMembersMap(map);
    }
  }, [formLocationMatchedMembers]);

  const handleSaveCell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCellCode.trim()) {
      alert('Please fill out Care Cell Name and Code.');
      return;
    }
    if (!formLeaderName.trim()) {
      alert('Please assign a Cell Leader.');
      return;
    }

    setSavingCell(true);
    try {
      const cellData: any = {
        name: formName.trim(),
        cellCode: formCellCode.trim(),
        description: formDescription.trim(),
        location: formLocation.trim(),
        meetingLocation: formMeetingLocation.trim() || formLocation.trim(),
        leaderId: formLeaderId || '',
        leaderName: formLeaderName.trim(),
        leaderPhone: formLeaderPhone.trim(),
        meetingDay: formMeetingDay,
        meetingTime: formMeetingTime,
        meetingEndTime: formMeetingEndTime || '20:30',
        maximumMembers: parseInt(formMaxMembers, 10) || 20,
        status: formStatus,
        updatedAt: serverTimestamp(),
      };

      if (formLeaderPhoto) cellData.leaderPhoto = formLeaderPhoto;
      if (formAssistantName.trim()) {
        cellData.assistantLeaderId = formAssistantId || '';
        cellData.assistantLeaderName = formAssistantName.trim();
        cellData.assistantLeaderPhone = formAssistantPhone.trim();
        if (formAssistantPhoto) cellData.assistantLeaderPhoto = formAssistantPhoto;
      } else {
        cellData.assistantLeaderId = null;
        cellData.assistantLeaderName = null;
        cellData.assistantLeaderPhone = null;
        cellData.assistantLeaderPhoto = null;
      }

      let targetCellId = '';

      if (editingCell) {
        await updateDoc(doc(db, 'Rhema Church', 'rhema', 'careCells', editingCell.id), cellData);
        targetCellId = editingCell.id;
        showToast(`Care Cell "${formName}" updated successfully!`);
      } else {
        cellData.createdAt = serverTimestamp();
        cellData.activeMemberCount = formSelectedMembersMap.size;
        const newDoc = await addDoc(collection(db, 'Rhema Church', 'rhema', 'careCells'), cellData);
        targetCellId = newDoc.id;

        // Auto assign selected members for newly created cell
        if (formSelectedMembersMap.size > 0) {
          const batch = writeBatch(db);
          for (const m of Array.from(formSelectedMembersMap.values())) {
            const mRef = doc(collection(db, 'Rhema Church', 'rhema', 'careCellMemberships'));
            batch.set(mRef, {
              cellId: targetCellId,
              cellCode: formCellCode.trim(),
              cellName: formName.trim(),
              memberId: m.id,
              memberName: m.name,
              memberPhone: m.phone || '',
              memberPhoto: m.photoUrl || '',
              locality: m.locality || '',
              address: m.address || '',
              membershipStatus: 'Active',
              joinedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
          await batch.commit();
        }

        showToast(`Care Cell "${formName}" created successfully!`);
      }

      setModalOpen(false);
    } catch (err: any) {
      console.error('Error saving care cell:', err);
      alert('Failed to save care cell: ' + (err.message || 'Unknown error'));
    } finally {
      setSavingCell(false);
    }
  };

  const handleDeleteCell = async (cell: CareCellRecord) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${cell.name}" (${cell.cellCode})?\n\nThis will permanently remove the cell.`
    );
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'Rhema Church', 'rhema', 'careCells', cell.id));
      showToast(`Care Cell "${cell.name}" deleted.`);
    } catch (err: any) {
      console.error('Error deleting care cell:', err);
      alert('Failed to delete cell: ' + (err.message || 'Unknown error'));
    }
  };

  // ── 5. Schedule / Edit Meeting Modal (MeetingFormModal) ─────────────────────────
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<CareCellMeetingRecord | null>(null);
  const [meetingCellId, setMeetingCellId] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingType, setMeetingType] = useState('Bible Study');
  const [meetingDate, setMeetingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [meetingStartTime, setMeetingStartTime] = useState('19:00');
  const [meetingEndTime, setMeetingEndTime] = useState('20:30');
  const [meetingLocation, setMeetingLocation] = useState('');
  const [meetingDescription, setMeetingDescription] = useState('');
  const [meetingStatus, setMeetingStatus] = useState<'Upcoming' | 'Completed' | 'Cancelled'>('Upcoming');

  // Scripture Fields
  const [selectedBookIndex, setSelectedBookIndex] = useState(49); // Philippians
  const [selectedChapter, setSelectedChapter] = useState(4);
  const [selectedVerseRange, setSelectedVerseRange] = useState('6-7');
  const [scriptureTextEn, setScriptureTextEn] = useState(
    'Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.'
  );
  const [scriptureTextTe, setScriptureTextTe] = useState(
    'దేనినిగూర్చియు చింతపడకుడి గాని ప్రతి విషయములోను ప్రార్థన విజ్ఞాపనములచేత కృతజ్ఞతాపూర్వకముగా మీ విన్నపములు దేవునికి తెలియజేయుడి.'
  );
  const [loadingScripture, setLoadingScripture] = useState(false);
  const [savingMeeting, setSavingMeeting] = useState(false);

  const fetchScripture = async (bIdx: number, ch: number, vRange: string) => {
    setLoadingScripture(true);
    try {
      const vNum = parseInt(vRange.split('-')[0].trim(), 10) || 1;
      const res = await fetch(`/api/bible?book=${bIdx}&chapter=${ch}&verse=${vNum}`);
      if (res.ok) {
        const data = await res.json();
        if (data.engText) setScriptureTextEn(data.engText);
        if (data.telText) setScriptureTextTe(data.telText);
      }
    } catch (e) {
      console.warn('Scripture fetch error:', e);
    } finally {
      setLoadingScripture(false);
    }
  };

  const openCreateMeetingModal = (defaultCellId?: string) => {
    setEditingMeeting(null);
    const targetCell = cells.find((c) => c.id === defaultCellId) || cells[0];
    setMeetingCellId(targetCell?.id || '');
    setMeetingTitle('');
    setMeetingType('Bible Study');
    setMeetingDate(new Date().toISOString().split('T')[0]);
    setMeetingStartTime('19:00');
    setMeetingEndTime('20:30');
    setMeetingLocation(targetCell?.meetingLocation || targetCell?.location || '');
    setMeetingDescription('');
    setMeetingStatus('Upcoming');
    setSelectedBookIndex(49);
    setSelectedChapter(4);
    setSelectedVerseRange('6-7');
    setMeetingModalOpen(true);
  };

  const openEditMeetingModal = (meeting: CareCellMeetingRecord) => {
    setEditingMeeting(meeting);
    setMeetingCellId(meeting.cellId);
    setMeetingTitle(meeting.title);
    setMeetingType(meeting.meetingType || 'Bible Study');
    setMeetingDate(meeting.date);
    setMeetingStartTime(meeting.startTime || '19:00');
    setMeetingEndTime(meeting.endTime || '20:30');
    setMeetingLocation(meeting.location || '');
    setMeetingDescription(meeting.description || '');
    setMeetingStatus(meeting.status);

    if (meeting.bibleBook) {
      const bIdx = ENGLISH_NAMES.findIndex((n) => n.toLowerCase() === meeting.bibleBook?.toLowerCase());
      if (bIdx !== -1) setSelectedBookIndex(bIdx);
    }
    if (meeting.bibleChapter) setSelectedChapter(meeting.bibleChapter);
    if (meeting.bibleVerse) setSelectedVerseRange(meeting.bibleVerse);
    if (meeting.scriptureTextEn) setScriptureTextEn(meeting.scriptureTextEn);
    if (meeting.scriptureTextTe) setScriptureTextTe(meeting.scriptureTextTe);

    setMeetingModalOpen(true);
  };

  const handleSaveMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingCellId) {
      alert('Please select a Care Cell.');
      return;
    }
    if (!meetingTitle.trim()) {
      alert('Please enter a Meeting Title.');
      return;
    }
    if (!meetingDate) {
      alert('Please select a Meeting Date.');
      return;
    }

    setSavingMeeting(true);
    try {
      const targetCell = cells.find((c) => c.id === meetingCellId);
      const payload: any = {
        cellId: meetingCellId,
        cellCode: targetCell?.cellCode || '',
        cellName: targetCell?.name || '',
        title: meetingTitle.trim(),
        meetingType,
        date: meetingDate,
        startTime: meetingStartTime,
        endTime: meetingEndTime || '20:30',
        location: meetingLocation.trim() || targetCell?.meetingLocation || '',
        description: meetingDescription.trim(),
        bibleBook: ENGLISH_NAMES[selectedBookIndex] || 'Philippians',
        bibleChapter: selectedChapter,
        bibleVerse: selectedVerseRange.trim(),
        scriptureTextEn,
        scriptureTextTe,
        status: meetingStatus,
        updatedAt: serverTimestamp(),
      };

      if (editingMeeting) {
        await updateDoc(doc(db, 'Rhema Church', 'rhema', 'careCellMeetings', editingMeeting.id), payload);
        showToast('Meeting updated successfully!');
      } else {
        payload.createdAt = serverTimestamp();
        await addDoc(collection(db, 'Rhema Church', 'rhema', 'careCellMeetings'), payload);
        showToast('Care Cell meeting scheduled successfully!');
      }

      setMeetingModalOpen(false);
    } catch (err: any) {
      console.error('Error saving meeting:', err);
      alert('Failed to save meeting: ' + (err.message || 'Unknown error'));
    } finally {
      setSavingMeeting(false);
    }
  };

  const handleCancelMeeting = async (meeting: CareCellMeetingRecord) => {
    const confirmed = window.confirm(
      `Cancel Meeting:\n\nAre you sure you want to cancel the meeting "${meeting.title}" scheduled for ${meeting.date}?`
    );
    if (!confirmed) return;

    try {
      await updateDoc(doc(db, 'Rhema Church', 'rhema', 'careCellMeetings', meeting.id), {
        status: 'Cancelled',
        updatedAt: serverTimestamp(),
      });
      showToast('Meeting has been cancelled.');
    } catch (err: any) {
      console.error('Error cancelling meeting:', err);
      alert('Failed to cancel meeting.');
    }
  };

  // ── 6. Transfer Member Modal State ───────────────────────────────────────────
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [memberToTransfer, setMemberToTransfer] = useState<CareCellMembershipRecord | null>(null);
  const [transferTargetCellId, setTransferTargetCellId] = useState('');
  const [transferring, setTransferring] = useState(false);

  const openTransferModal = (m: CareCellMembershipRecord) => {
    setMemberToTransfer(m);
    const otherCell = cells.find((c) => c.id !== m.cellId);
    setTransferTargetCellId(otherCell?.id || '');
    setTransferModalOpen(true);
  };

  const handleConfirmTransfer = async () => {
    if (!memberToTransfer || !transferTargetCellId) return;
    setTransferring(true);
    try {
      const targetCell = cells.find((c) => c.id === transferTargetCellId);
      if (!targetCell) return;

      const batch = writeBatch(db);
      // Update existing record
      const oldRef = doc(db, 'Rhema Church', 'rhema', 'careCellMemberships', memberToTransfer.id);
      batch.update(oldRef, {
        membershipStatus: 'Transferred',
        transferredToCellId: targetCell.id,
        transferredToCellName: targetCell.name,
        updatedAt: serverTimestamp(),
      });

      // Create new record
      const newRef = doc(collection(db, 'Rhema Church', 'rhema', 'careCellMemberships'));
      batch.set(newRef, {
        cellId: targetCell.id,
        cellCode: targetCell.cellCode,
        cellName: targetCell.name,
        memberId: memberToTransfer.memberId,
        memberName: memberToTransfer.memberName,
        memberPhone: memberToTransfer.memberPhone || '',
        memberPhoto: memberToTransfer.memberPhoto || '',
        locality: memberToTransfer.locality || '',
        address: memberToTransfer.address || '',
        membershipStatus: 'Active',
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
      showToast(`Member transferred to ${targetCell.name}!`);
      setTransferModalOpen(false);
    } catch (err: any) {
      console.error('Error transferring member:', err);
      alert('Transfer failed: ' + (err.message || 'Unknown error'));
    } finally {
      setTransferring(false);
    }
  };

  const handleRemoveMemberFromCell = async (m: CareCellMembershipRecord) => {
    const confirmed = window.confirm(
      `Remove Member:\n\nAre you sure you want to remove ${m.memberName} from ${m.cellName}?\n\nThis will safely update their cell membership without affecting their church account.`
    );
    if (!confirmed) return;

    try {
      await updateDoc(doc(db, 'Rhema Church', 'rhema', 'careCellMemberships', m.id), {
        membershipStatus: 'Removed',
        updatedAt: serverTimestamp(),
      });

      const cell = cells.find((c) => c.id === m.cellId);
      if (cell) {
        await updateDoc(doc(db, 'Rhema Church', 'rhema', 'careCells', cell.id), {
          activeMemberCount: Math.max(0, (cell.activeMemberCount || 1) - 1),
          updatedAt: serverTimestamp(),
        });
      }

      showToast(`${m.memberName} removed from cell.`);
    } catch (err: any) {
      console.error('Error removing member:', err);
      alert('Failed to remove member.');
    }
  };

  // ── 7. Attendance Roll-Call Tab State & Handlers ───────────────────────────────
  const [attendanceCellId, setAttendanceCellId] = useState('');
  const [attendanceMeetingId, setAttendanceMeetingId] = useState('');
  const [attendanceRoster, setAttendanceRoster] = useState<Record<string, 'Present' | 'Absent' | 'Late'>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Auto initialize attendance cell
  useEffect(() => {
    if (!attendanceCellId && cells.length > 0) {
      setAttendanceCellId(cells[0].id);
    }
  }, [cells, attendanceCellId]);

  // Active meetings for attendance cell
  const attendanceMeetings = useMemo(() => {
    return meetings.filter((m) => m.cellId === attendanceCellId);
  }, [meetings, attendanceCellId]);

  // Set default meeting for attendance
  useEffect(() => {
    if (attendanceMeetings.length > 0 && !attendanceMeetingId) {
      setAttendanceMeetingId(attendanceMeetings[0].id);
    }
  }, [attendanceMeetings, attendanceMeetingId]);

  const activeAttendanceMeeting = useMemo(() => {
    return meetings.find((m) => m.id === attendanceMeetingId) || attendanceMeetings[0] || null;
  }, [meetings, attendanceMeetingId, attendanceMeetings]);

  const membersInAttendanceCell = useMemo(() => {
    return memberships.filter((m) => m.cellId === attendanceCellId && m.membershipStatus === 'Active');
  }, [memberships, attendanceCellId]);

  const handleSetAttendanceStatus = (memberId: string, status: 'Present' | 'Absent' | 'Late') => {
    setAttendanceRoster((prev) => ({
      ...prev,
      [memberId]: status,
    }));
  };

  const handleSaveAttendance = async () => {
    if (!attendanceCellId || membersInAttendanceCell.length === 0) return;
    setSavingAttendance(true);
    try {
      const batch = writeBatch(db);
      for (const m of membersInAttendanceCell) {
        const attStatus = attendanceRoster[m.memberId] || 'Present';
        const attRef = doc(collection(db, 'Rhema Church', 'rhema', 'careCellAttendance'));
        batch.set(attRef, {
          cellId: attendanceCellId,
          meetingId: activeAttendanceMeeting?.id || null,
          meetingTitle: activeAttendanceMeeting?.title || 'Care Cell Meeting',
          memberId: m.memberId,
          memberName: m.memberName,
          attendanceStatus: attStatus,
          date: activeAttendanceMeeting?.date || new Date().toISOString().split('T')[0],
          recordedAt: serverTimestamp(),
        });
      }

      if (activeAttendanceMeeting) {
        const mRef = doc(db, 'Rhema Church', 'rhema', 'careCellMeetings', activeAttendanceMeeting.id);
        batch.update(mRef, {
          status: 'Completed',
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
      showToast('Attendance roll-call saved successfully!');
    } catch (err: any) {
      console.error('Error saving attendance:', err);
      alert('Failed to save attendance: ' + (err.message || 'Unknown error'));
    } finally {
      setSavingAttendance(false);
    }
  };

  // ── 8. Member Locations Tab State (Map vs List, Route Planning) ───────────────
  const [locationsViewMode, setLocationsViewMode] = useState<'map' | 'list'>('map');
  const [locationsLocalityFilter, setLocationsLocalityFilter] = useState<string>('ALL');
  const [locationsNeedsVisitOnly, setLocationsNeedsVisitOnly] = useState<boolean>(false);
  const [plannedRouteMemberIds, setPlannedRouteMemberIds] = useState<string[]>([]);

  const handleToggleRoute = (memberId: string) => {
    setPlannedRouteMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const handleOpenMultiStopRoute = (membersToRoute: CareCellMembershipRecord[]) => {
    if (membersToRoute.length === 0) return;
    const dest = encodeURIComponent(membersToRoute[membersToRoute.length - 1].address || membersToRoute[membersToRoute.length - 1].locality || 'Koilakuntla');
    const waypoints = membersToRoute
      .slice(0, membersToRoute.length - 1)
      .map((m) => encodeURIComponent(m.address || m.locality || ''))
      .filter(Boolean)
      .join('|');

    const url = `https://www.google.com/maps/dir/?api=1&destination=${dest}${waypoints ? `&waypoints=${waypoints}` : ''}&travelmode=driving`;
    window.open(url, '_blank');
  };

  // ── 9. Visits Tab State ───────────────────────────────────────────────────────
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

  const openScheduleVisitModal = () => {
    const targetCell = cells.find((c) => c.id === selectedCellFilter) || cells[0];
    setVisitCellId(targetCell?.id || '');
    setVisitMemberId('');
    setVisitMemberName('');
    setVisitMemberPhone('');
    setVisitDate(new Date().toISOString().split('T')[0]);
    setVisitTime('18:00');
    setVisitPurpose('Family Blessing');
    setVisitLocation(targetCell?.meetingLocation || targetCell?.location || '');
    setVisitAssignedVisitors('Pastor & Care Cell Leader');
    setVisitNotes('');
    setVisitModalOpen(true);
  };

  const handleSaveVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitCellId || !visitMemberName.trim()) {
      alert('Please select Care Cell and Member name.');
      return;
    }
    setSavingVisit(true);
    try {
      const targetCell = cells.find((c) => c.id === visitCellId);
      await addDoc(collection(db, 'Rhema Church', 'rhema', 'careCellVisits'), {
        cellId: visitCellId,
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
      showToast('Pastoral visit scheduled successfully!');
      setVisitModalOpen(false);
    } catch (err: any) {
      console.error('Error saving visit:', err);
      alert('Failed to save visit.');
    } finally {
      setSavingVisit(false);
    }
  };

  const handleMarkVisitCompleted = async (v: CareCellVisitRecord) => {
    try {
      await updateDoc(doc(db, 'Rhema Church', 'rhema', 'careCellVisits', v.id), {
        status: 'Completed',
        completedAt: serverTimestamp(),
      });
      showToast('Visit marked as completed!');
    } catch (err: any) {
      console.error('Error marking visit completed:', err);
    }
  };

  // ── 10. Follow-ups Tab State ──────────────────────────────────────────────────
  const [followupModalOpen, setFollowupModalOpen] = useState(false);
  const [followupCellId, setFollowupCellId] = useState('');
  const [followupMemberId, setFollowupMemberId] = useState('');
  const [followupMemberName, setFollowupMemberName] = useState('');
  const [followupMemberPhone, setFollowupMemberPhone] = useState('');
  const [followupType, setFollowupType] = useState('Phone Call');
  const [followupReason, setFollowupReason] = useState('Missed 2+ Meetings');
  const [followupNotes, setFollowupNotes] = useState('');
  const [followupNextActionDate, setFollowupNextActionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [savingFollowup, setSavingFollowup] = useState(false);

  const openLogFollowupModal = (defaultMember?: CareCellMembershipRecord) => {
    const targetCell = defaultMember
      ? cells.find((c) => c.id === defaultMember.cellId) || cells[0]
      : cells.find((c) => c.id === selectedCellFilter) || cells[0];

    setFollowupCellId(targetCell?.id || '');
    setFollowupMemberId(defaultMember?.memberId || '');
    setFollowupMemberName(defaultMember?.memberName || '');
    setFollowupMemberPhone(defaultMember?.memberPhone || '');
    setFollowupType('Phone Call');
    setFollowupReason('Missed 2+ Meetings');
    setFollowupNotes('');
    setFollowupNextActionDate(new Date().toISOString().split('T')[0]);
    setFollowupModalOpen(true);
  };

  const handleSaveFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followupCellId || !followupMemberName.trim()) {
      alert('Please select Care Cell and Member.');
      return;
    }
    setSavingFollowup(true);
    try {
      const targetCell = cells.find((c) => c.id === followupCellId);
      await addDoc(collection(db, 'Rhema Church', 'rhema', 'careCellFollowups'), {
        cellId: followupCellId,
        cellName: targetCell?.name || 'Care Cell',
        memberId: followupMemberId || 'guest',
        memberName: followupMemberName.trim(),
        memberPhone: followupMemberPhone.trim(),
        followupType,
        reason: followupReason,
        notes: followupNotes.trim(),
        nextActionDate: followupNextActionDate,
        status: 'Pending',
        createdAt: serverTimestamp(),
      });
      showToast('Follow-up logged successfully!');
      setFollowupModalOpen(false);
    } catch (err: any) {
      console.error('Error saving follow-up:', err);
      alert('Failed to log follow-up.');
    } finally {
      setSavingFollowup(false);
    }
  };

  const handleResolveFollowup = async (f: CareCellFollowupRecord) => {
    try {
      await updateDoc(doc(db, 'Rhema Church', 'rhema', 'careCellFollowups', f.id), {
        status: 'Completed',
        resolvedAt: serverTimestamp(),
      });
      showToast('Follow-up marked as resolved!');
    } catch (err: any) {
      console.error('Error resolving follow-up:', err);
    }
  };

  // ── 11. Notices & Prayer Tab State ───────────────────────────────────────────
  const [announcePrayerSection, setAnnouncePrayerSection] = useState<'prayers' | 'announcements'>('prayers');
  const [noticeModalOpen, setNoticeModalOpen] = useState(false);
  const [noticeCellId, setNoticeCellId] = useState('');
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [noticePriority, setNoticePriority] = useState<'Normal' | 'High' | 'Urgent'>('Normal');
  const [savingNotice, setSavingNotice] = useState(false);

  const [prayerModalOpen, setPrayerModalOpen] = useState(false);
  const [prayerCellId, setPrayerCellId] = useState('');
  const [prayerMemberName, setPrayerMemberName] = useState('');
  const [prayerCategory, setPrayerCategory] = useState('Healing / Health');
  const [prayerRequestText, setPrayerRequestText] = useState('');
  const [savingPrayer, setSavingPrayer] = useState(false);

  const handleSaveNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeMessage.trim()) return;
    setSavingNotice(true);
    try {
      const targetCell = cells.find((c) => c.id === noticeCellId);
      await addDoc(collection(db, 'Rhema Church', 'rhema', 'careCellAnnouncements'), {
        cellId: noticeCellId || 'ALL',
        cellName: targetCell ? targetCell.name : 'All Care Cells',
        title: noticeTitle.trim(),
        message: noticeMessage.trim(),
        priority: noticePriority,
        createdAt: serverTimestamp(),
      });
      showToast('Announcement broadcasted successfully!');
      setNoticeModalOpen(false);
      setNoticeTitle('');
      setNoticeMessage('');
    } catch (err: any) {
      console.error('Error broadcasting announcement:', err);
    } finally {
      setSavingNotice(false);
    }
  };

  const handleSavePrayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prayerMemberName.trim() || !prayerRequestText.trim()) return;
    setSavingPrayer(true);
    try {
      const targetCell = cells.find((c) => c.id === prayerCellId);
      await addDoc(collection(db, 'Rhema Church', 'rhema', 'careCellPrayerRequests'), {
        cellId: prayerCellId || 'ALL',
        cellName: targetCell ? targetCell.name : 'All Care Cells',
        memberId: 'member',
        memberName: prayerMemberName.trim(),
        category: prayerCategory,
        request: prayerRequestText.trim(),
        status: 'Active',
        createdAt: serverTimestamp(),
      });
      showToast('Prayer petition added successfully!');
      setPrayerModalOpen(false);
      setPrayerMemberName('');
      setPrayerRequestText('');
    } catch (err: any) {
      console.error('Error saving prayer petition:', err);
    } finally {
      setSavingPrayer(false);
    }
  };

  // ── Filtered Records for Active Tab ───────────────────────────────────────────
  const filteredCells = useMemo(() => {
    return cells.filter((c) => {
      if (statusFilter !== 'All' && c.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.cellCode.toLowerCase().includes(q) ||
          c.leaderName.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [cells, statusFilter, searchQuery]);

  const filteredMemberships = useMemo(() => {
    return memberships.filter((m) => {
      if (selectedCellFilter !== 'ALL' && m.cellId !== selectedCellFilter) return false;
      if (m.membershipStatus !== 'Active') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          m.memberName.toLowerCase().includes(q) ||
          (m.memberPhone && m.memberPhone.includes(q)) ||
          m.cellName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [memberships, selectedCellFilter, searchQuery]);

  // Meetings filtered by active cell AND selected calendar month/year
  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      if (selectedCellFilter !== 'ALL' && m.cellId !== selectedCellFilter) return false;
      if (m.date) {
        const d = new Date(m.date);
        if (!isNaN(d.getTime())) {
          if (d.getMonth() + 1 !== selectedMonth || d.getFullYear() !== selectedYear) {
            return false;
          }
        }
      }
      return true;
    });
  }, [meetings, selectedCellFilter, selectedMonth, selectedYear]);

  // Calculate meetings in selected month count for analytics
  const meetingsInSelectedMonthCount = useMemo(() => {
    return meetings.filter((m) => {
      if (m.date) {
        const d = new Date(m.date);
        if (!isNaN(d.getTime())) {
          return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
        }
      }
      return false;
    }).length;
  }, [meetings, selectedMonth, selectedYear]);

  const activeLeadersCount = useMemo(() => {
    const set = new Set<string>();
    cells.forEach((c) => {
      if (c.leaderName && c.status === 'Active') set.add(c.leaderName);
    });
    return set.size;
  }, [cells]);

  const totalAssignedMembers = useMemo(() => {
    return memberships.filter((m) => m.membershipStatus === 'Active').length;
  }, [memberships]);

  // Export CSV of members
  const handleExportCSV = () => {
    const listToExport = filteredMemberships;
    if (listToExport.length === 0) {
      alert('No members to export.');
      return;
    }
    const headers = ['Member Name', 'Phone', 'Care Cell Code', 'Care Cell Name', 'Locality', 'Address'];
    const rows = listToExport.map((m) => [
      `"${m.memberName}"`,
      `"${m.memberPhone || ''}"`,
      `"${m.cellCode || ''}"`,
      `"${m.cellName || ''}"`,
      `"${m.locality || ''}"`,
      `"${m.address || ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CareCell_Members_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
      <AdminNavigationShell>
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          {/* Toast Alert */}
          {toastMessage && (
            <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-semibold">{toastMessage}</span>
            </div>
          )}

          {/* Top Title & Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full w-fit mb-1 border border-emerald-200">
                <Sparkles className="w-3.5 h-3.5" />
                Firebase Live Production Mode · Care Cells Oversight
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Care Cells</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {cells.filter((c) => c.status === 'Active').length} active fellowship groups across canonical church network
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={openCreateModal}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md text-sm font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                + New Cell
              </Button>
            </div>
          </div>

          {/* Subtabs Navigation Bar (All 9 Mobile Subtabs) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200">
            {SUB_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSubTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveSubTab(tab.key)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.key === 'manage' && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        isActive ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {cells.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ───────────────────────────────────────────────────────────────────────── */}
          {/* TAB 1: OVERVIEW                                                           */}
          {/* ───────────────────────────────────────────────────────────────────────── */}
          {activeSubTab === 'overview' && (
            <div className="space-y-6">
              {/* Interactive Calendar Analytics Period Filter */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="relative">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Analytics Period</p>
                    <button
                      onClick={() => setShowMonthYearPicker(!showMonthYearPicker)}
                      className="text-base font-extrabold text-slate-900 flex items-center gap-1.5 hover:text-emerald-700 transition-colors"
                    >
                      {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </button>

                    {/* Quick Month & Year Picker Dropdown */}
                    {showMonthYearPicker && (
                      <div className="absolute top-full left-0 mt-2 z-30 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 w-64 animate-in fade-in">
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                          <span className="text-xs font-bold text-slate-700">Select Month & Year</span>
                          <div className="flex items-center gap-1">
                            {[2025, 2026, 2027].map((yr) => (
                              <button
                                key={yr}
                                onClick={() => setSelectedYear(yr)}
                                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                  selectedYear === yr ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
                                }`}
                              >
                                {yr}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {MONTH_NAMES.map((name, idx) => (
                            <button
                              key={name}
                              onClick={() => {
                                setSelectedMonth(idx + 1);
                                setShowMonthYearPicker(false);
                              }}
                              className={`py-1.5 px-1 rounded-lg text-xs font-semibold text-center transition-all ${
                                selectedMonth === idx + 1
                                  ? 'bg-emerald-600 text-white font-bold'
                                  : 'text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {name.slice(0, 3)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Arrow Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrevMonth}
                    title="Previous Month"
                    className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 active:scale-95 transition-transform"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNextMonth}
                    title="Next Month"
                    className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 active:scale-95 transition-transform"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Top Cell Filter Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setSelectedCellFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    selectedCellFilter === 'ALL'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  All Cells ({cells.length})
                </button>
                {cells.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCellFilter(c.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      selectedCellFilter === c.id
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {c.cellCode} ({c.name})
                  </button>
                ))}
              </div>

              {/* Direct Leadership Actions Row */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Direct Actions</span>
                  <span className="text-[11px] text-slate-400 font-medium">Quick Leadership Actions</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Button
                    onClick={openCreateModal}
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Create Care Cell
                  </Button>
                  <Button
                    onClick={() => openCreateMeetingModal(selectedCellFilter === 'ALL' ? undefined : selectedCellFilter)}
                    className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-2"
                  >
                    <CalendarPlus className="w-3.5 h-3.5 text-slate-600" />
                    Schedule Meeting
                  </Button>
                  <Button
                    onClick={() => setActiveSubTab('attendance')}
                    className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-2"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Mark Attendance
                  </Button>
                </div>
              </div>

              {/* KPI Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <Building2 className="w-5 h-5 text-emerald-600" />
                    <ChevronRight className="w-4 h-4" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900">{cells.length}</h3>
                  <p className="text-xs font-bold text-slate-700">Total Care Cells</p>
                  <p className="text-[11px] text-slate-400">
                    {cells.filter((c) => c.status === 'Active').length} active · {cells.filter((c) => c.status !== 'Active').length} inactive
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <Users className="w-5 h-5 text-indigo-600" />
                    <ChevronRight className="w-4 h-4" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900">{totalAssignedMembers}</h3>
                  <p className="text-xs font-bold text-slate-700">Assigned Members</p>
                  <p className="text-[11px] text-slate-400">Enrolled cell members</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <UserCheck className="w-5 h-5 text-emerald-600" />
                    <ChevronRight className="w-4 h-4" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900">{activeLeadersCount}</h3>
                  <p className="text-xs font-bold text-slate-700">Cell Leaders</p>
                  <p className="text-[11px] text-slate-400">Leaders & Assistants</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <Calendar className="w-5 h-5 text-amber-600" />
                    <ChevronRight className="w-4 h-4" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900">{meetingsInSelectedMonthCount}</h3>
                  <p className="text-xs font-bold text-slate-700">Meetings in {MONTH_NAMES[selectedMonth - 1]}</p>
                  <p className="text-[11px] text-slate-400">{selectedYear} fellowship gatherings</p>
                </div>
              </div>

              {/* Pastoral Care & Fellowship Mission Banner */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                    <Heart className="w-4 h-4" />
                    Pastoral Care & Cell Health Philosophy
                  </div>
                  <h3 className="text-lg font-bold">Connecting Believers Beyond Sunday Services</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Care Cells empower small-group discipleship, localized Bible study, home visitations, and immediate
                    pastoral response for every church family in their own neighbourhood.
                  </p>
                </div>
                <Button
                  onClick={() => setActiveSubTab('manage')}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold whitespace-nowrap shadow"
                >
                  Manage Care Cells →
                </Button>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────────────────── */}
          {/* TAB 2: CARE CELLS MANAGEMENT (Cards with Leader, Capacity, Edit, Delete)   */}
          {/* ───────────────────────────────────────────────────────────────────────── */}
          {activeSubTab === 'manage' && (
            <div className="space-y-6">
              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {(['All', 'Active', 'Inactive', 'Archived'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        statusFilter === st
                          ? 'bg-slate-900 text-white'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {st} ({st === 'All' ? cells.length : cells.filter((c) => c.status === st).length})
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search cell or leader..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Care Cells Grid */}
              {loading ? (
                <div className="py-20 text-center space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
                  <p className="text-xs text-slate-500 font-medium">Loading Care Cells...</p>
                </div>
              ) : filteredCells.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
                  <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-700">No Care Cells Found</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Create a new Care Cell fellowship group to begin assigning local members and scheduling gatherings.
                  </p>
                  <Button
                    onClick={openCreateModal}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                  >
                    + Create First Care Cell
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredCells.map((cell) => {
                    const cellMembers = memberships.filter(
                      (m) => m.cellId === cell.id && m.membershipStatus === 'Active'
                    );
                    const capacityPercent = Math.min(
                      100,
                      Math.round((cellMembers.length / (cell.maximumMembers || 20)) * 100)
                    );

                    return (
                      <div
                        key={cell.id}
                        className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-3">
                          {/* Header Code & Status */}
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                              {cell.cellCode}
                            </span>
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                cell.status === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {cell.status}
                            </span>
                          </div>

                          {/* Cell Name & Description */}
                          <div>
                            <h3 className="text-base font-extrabold text-slate-900">{cell.name}</h3>
                            {cell.description ? (
                              <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{cell.description}</p>
                            ) : null}
                          </div>

                          {/* Leader & Assistant */}
                          <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100 text-xs">
                            <div className="flex items-center gap-2 text-slate-800">
                              <User className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                              <span className="font-bold">{cell.leaderName}</span>
                              <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 rounded">Leader</span>
                            </div>
                            {cell.leaderPhone && (
                              <p className="text-[11px] text-slate-500 pl-5.5">{cell.leaderPhone}</p>
                            )}
                            {cell.assistantLeaderName && (
                              <div className="pt-1 border-t border-slate-200 text-[11px] text-slate-600">
                                Assistant: <span className="font-semibold text-slate-800">{cell.assistantLeaderName}</span>
                              </div>
                            )}
                          </div>

                          {/* Meeting Schedule & Venue */}
                          <div className="space-y-1 text-xs text-slate-600">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>
                                Every {cell.meetingDay} · {cell.meetingTime}
                                {cell.meetingEndTime ? ` – ${cell.meetingEndTime}` : ''}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span className="truncate">{cell.meetingLocation || cell.location || 'Koilakuntla'}</span>
                            </div>
                          </div>

                          {/* Roster Capacity Progress Bar */}
                          <div className="space-y-1 pt-1">
                            <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                              <span>Roster Capacity</span>
                              <span>
                                {cellMembers.length} / {cell.maximumMembers} ({capacityPercent}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  capacityPercent >= 90 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${capacityPercent}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <button
                            onClick={() => {
                              setSelectedCellFilter(cell.id);
                              setActiveSubTab('members');
                            }}
                            className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5"
                          >
                            <Users className="w-3 h-3" />
                            Members
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCellFilter(cell.id);
                              setActiveSubTab('meetings');
                            }}
                            className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5"
                          >
                            <Calendar className="w-3 h-3" />
                            Meetings
                          </button>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditModal(cell)}
                              title="Edit Cell"
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteCell(cell)}
                              title="Delete Cell"
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────────────────── */}
          {/* TAB 3: MEMBERS DIRECTORY (Active Cell Banner, Add Members Modal Trigger)   */}
          {/* ───────────────────────────────────────────────────────────────────────── */}
          {activeSubTab === 'members' && (
            <div className="space-y-6">
              {/* Cell Selector Horizontal Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setSelectedCellFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    selectedCellFilter === 'ALL'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  All Cells ({memberships.filter((m) => m.membershipStatus === 'Active').length})
                </button>
                {cells.map((c) => {
                  const mCount = memberships.filter((m) => m.cellId === c.id && m.membershipStatus === 'Active').length;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCellFilter(c.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        selectedCellFilter === c.id
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {c.cellCode} ({mCount})
                    </button>
                  );
                })}
              </div>

              {/* Active Cell Banner Matching Mobile CareCellMembersTab */}
              {activeSelectedCell && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-lg font-black text-slate-900">
                      {activeSelectedCell.cellCode} · {activeSelectedCell.name}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Leader:{' '}
                      <span className="font-bold text-slate-800">{activeSelectedCell.leaderName}</span> ·{' '}
                      {memberships.filter((m) => m.cellId === activeSelectedCell.id && m.membershipStatus === 'Active').length}{' '}
                      of {activeSelectedCell.maximumMembers} members enrolled
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedCellFilter(activeSelectedCell.id);
                        setActiveSubTab('locations');
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-slate-200 transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      Map
                    </button>
                    <button
                      onClick={handleExportCSV}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-slate-200 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      Export
                    </button>
                    <Button
                      onClick={() => openAddMembersModalForCell(activeSelectedCell)}
                      className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Assign Members
                    </Button>
                  </div>
                </div>
              )}

              {/* Search Bar */}
              <div className="relative w-full max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter assigned members by name, phone or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Members List Cards */}
              {filteredMemberships.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
                  <Users className="w-12 h-12 text-slate-300 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-700">No Members Enrolled</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {searchQuery
                      ? `No enrolled members match "${searchQuery}".`
                      : 'Click "Assign Members" above to assign church members to this cell with zero duplication.'}
                  </p>
                  {activeSelectedCell && (
                    <Button
                      onClick={() => openAddMembersModalForCell(activeSelectedCell)}
                      className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
                    >
                      <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                      Assign Members
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredMemberships.map((m) => {
                    const initials =
                      m.memberName
                        ?.split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((p) => p[0]?.toUpperCase())
                        .join('') || 'M';

                    return (
                      <div
                        key={m.id}
                        className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {m.memberPhoto ? (
                            <img
                              src={m.memberPhoto}
                              alt={m.memberName}
                              className="w-10 h-10 rounded-full object-cover border border-slate-200 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
                              {initials}
                            </div>
                          )}

                          <div className="min-w-0">
                            <h4 className="text-xs font-extrabold text-slate-900 truncate">{m.memberName}</h4>
                            {m.memberPhone && (
                              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{m.memberPhone}</span>
                              </p>
                            )}
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-semibold">
                                {m.cellCode}
                              </span>
                              {m.locality && (
                                <span className="text-[10px] text-slate-400 truncate">· {m.locality}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => openTransferModal(m)}
                            title="Transfer to another cell"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemoveMemberFromCell(m)}
                            title="Remove from cell"
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────────────────── */}
          {/* TAB 4: MEMBER LOCATIONS (Interactive Map vs List View, Multi-stop Route)  */}
          {/* ───────────────────────────────────────────────────────────────────────── */}
          {activeSubTab === 'locations' && (
            <div className="space-y-6">
              {/* Cell Selector & Mode Toggles */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <button
                    onClick={() => setSelectedCellFilter('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      selectedCellFilter === 'ALL'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    All Cells
                  </button>
                  {cells.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCellFilter(c.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        selectedCellFilter === c.id
                          ? 'bg-slate-900 text-white'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {c.cellCode}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      onClick={() => setLocationsViewMode('map')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
                        locationsViewMode === 'map' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      <MapIcon className="w-3.5 h-3.5" />
                      Map
                    </button>
                    <button
                      onClick={() => setLocationsViewMode('list')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
                        locationsViewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      <List className="w-3.5 h-3.5" />
                      List
                    </button>
                  </div>
                </div>
              </div>

              {/* Locality Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <button
                  onClick={() => setLocationsLocalityFilter('ALL')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    locationsLocalityFilter === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  All Localities
                </button>
                {uniqueLocalities.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => setLocationsLocalityFilter(loc)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1 ${
                      locationsLocalityFilter === loc
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {loc}
                  </button>
                ))}
              </div>

              {/* Multi-Stop Visit Route Planning Banner */}
              {plannedRouteMemberIds.length > 0 && (
                <div className="bg-emerald-900 text-white p-4 rounded-2xl shadow-md flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-5 h-5 text-emerald-300" />
                    <span className="text-xs font-bold">
                      {plannedRouteMemberIds.length} members selected for pastoral visit route
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        handleOpenMultiStopRoute(
                          memberships.filter((m) => plannedRouteMemberIds.includes(m.memberId))
                        )
                      }
                      className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow transition-colors flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Multi-Stop Route in Maps
                    </button>
                    <button
                      onClick={() => setPlannedRouteMemberIds([])}
                      className="p-1.5 text-emerald-200 hover:text-white"
                      title="Clear route selection"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* View Rendering */}
              {locationsViewMode === 'map' ? (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm space-y-4 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Geographic Fellowship Zone</h3>
                      <p className="text-xs text-slate-500">
                        Visualizing active care cell members plotted across {activeSelectedCell?.location || 'Koilakuntla'}
                      </p>
                    </div>
                  </div>

                  <div className="relative w-full h-[450px] bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center">
                    <iframe
                      title="Care Cell Map"
                      className="w-full h-full border-0"
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(
                        activeSelectedCell?.location || 'Koilakuntla, Andhra Pradesh'
                      )}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredMemberships
                    .filter((m) => {
                      if (locationsLocalityFilter !== 'ALL') {
                        return (m.locality || '').toLowerCase() === locationsLocalityFilter.toLowerCase();
                      }
                      return true;
                    })
                    .map((m) => {
                      const inRoute = plannedRouteMemberIds.includes(m.memberId);
                      return (
                        <div
                          key={m.id}
                          className={`bg-white border rounded-2xl p-4 shadow-sm space-y-3 transition-colors ${
                            inRoute ? 'border-emerald-500 ring-1 ring-emerald-500 bg-emerald-50/20' : 'border-slate-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-xs font-extrabold text-slate-900">{m.memberName}</h4>
                              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{m.memberPhone || 'No phone'}</span>
                              </p>
                              {m.locality && (
                                <p className="text-[11px] text-emerald-700 flex items-center gap-1 font-semibold mt-0.5">
                                  <MapPin className="w-3 h-3 text-emerald-600" />
                                  <span>{m.locality}</span>
                                </p>
                              )}
                              {m.address && (
                                <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{m.address}</p>
                              )}
                            </div>

                            <button
                              onClick={() => handleToggleRoute(m.memberId)}
                              className={`p-1.5 rounded-lg text-xs font-bold border transition-colors ${
                                inRoute
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                              }`}
                              title={inRoute ? 'Remove from visit route' : 'Add to visit route'}
                            >
                              {inRoute ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                m.address || m.locality || 'Koilakuntla'
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg flex items-center gap-1"
                            >
                              <Navigation className="w-3 h-3 text-slate-500" />
                              Navigate
                            </a>
                            {m.memberPhone && (
                              <a
                                href={`tel:${m.memberPhone}`}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg flex items-center gap-1"
                              >
                                <Phone className="w-3 h-3 text-slate-500" />
                                Call
                              </a>
                            )}
                            {m.memberPhone && (
                              <a
                                href={`https://wa.me/${m.memberPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                  `Praise the Lord ${m.memberName}! Greetings from Rhema Church Care Cell.`
                                )}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg flex items-center gap-1 border border-emerald-200"
                              >
                                <MessageCircle className="w-3 h-3 text-emerald-600" />
                                WhatsApp
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────────────────── */}
          {/* TAB 5: MEETINGS (Mobile CareCellMeetingsTab Exact Parity)                   */}
          {/* ───────────────────────────────────────────────────────────────────────── */}
          {activeSubTab === 'meetings' && (
            <div className="space-y-6">
              {/* Cell Selector Row */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setSelectedCellFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    selectedCellFilter === 'ALL'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  All Cells
                </button>
                {cells.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCellFilter(c.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      selectedCellFilter === c.id
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {c.cellCode}
                  </button>
                ))}
              </div>

              {/* Period & Schedule Meeting Row Matching Mobile */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handlePrevMonth}
                    className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 active:scale-95 transition-transform"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-base font-extrabold text-slate-900">
                    {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                  </span>
                  <button
                    onClick={handleNextMonth}
                    className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 active:scale-95 transition-transform"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <Button
                  onClick={() => openCreateMeetingModal(selectedCellFilter === 'ALL' ? undefined : selectedCellFilter)}
                  className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow"
                >
                  <CalendarPlus className="w-4 h-4" />
                  Schedule Meeting
                </Button>
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-2">
                {(['All', 'Upcoming', 'Completed', 'Cancelled'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => {}}
                    className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700"
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Meetings List */}
              {filteredMeetings.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-700">No Meetings in {MONTH_NAMES[selectedMonth - 1]} {selectedYear}</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    There are no scheduled Care Cell meetings for this calendar period. Use the button below to schedule one.
                  </p>
                  <Button
                    onClick={() => openCreateMeetingModal(selectedCellFilter === 'ALL' ? undefined : selectedCellFilter)}
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
                  >
                    <CalendarPlus className="w-3.5 h-3.5 mr-1.5" />
                    Schedule Meeting
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {filteredMeetings.map((item) => {
                    const isUpcoming = item.status === 'Upcoming';
                    const isCompleted = item.status === 'Completed';
                    const isCancelled = item.status === 'Cancelled';

                    return (
                      <div
                        key={item.id}
                        className={`bg-white border rounded-2xl p-5 shadow-sm space-y-4 ${
                          isCancelled ? 'opacity-60 border-slate-200 bg-slate-50/50' : 'border-slate-200'
                        }`}
                      >
                        {/* Top Badges */}
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-lg">
                            {item.meetingType || 'Fellowship'}
                          </span>
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                              isUpcoming
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : isCompleted
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>

                        {/* Title & Cell */}
                        <div>
                          <h3 className="text-base font-extrabold text-slate-900">{item.title}</h3>
                          <p className="text-xs text-slate-500 font-semibold mt-0.5">
                            {item.cellCode ? `${item.cellCode} — ` : ''}
                            {item.cellName || 'Care Cell'}
                          </p>
                        </div>

                        {/* Schedule & Venue Meta */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{item.date}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {item.startTime}
                              {item.endTime ? ` – ${item.endTime}` : ''}
                            </span>
                          </div>
                          {item.location && (
                            <div className="flex items-center gap-1.5 truncate">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span className="truncate">{item.location}</span>
                            </div>
                          )}
                        </div>

                        {/* Scripture Reading Box */}
                        {item.bibleBook && (
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                              <span>
                                {item.bibleBook} {item.bibleChapter}:{item.bibleVerse}
                              </span>
                            </div>
                            {item.scriptureTextEn && (
                              <p className="text-[11px] text-slate-600 italic line-clamp-2">
                                "{item.scriptureTextEn}"
                              </p>
                            )}
                            {item.scriptureTextTe && (
                              <p className="text-[11px] text-emerald-800 line-clamp-2">
                                "{item.scriptureTextTe}"
                              </p>
                            )}
                          </div>
                        )}

                        {/* Description */}
                        {item.description && (
                          <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>
                        )}

                        {/* Action Buttons Row */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                          {!isCancelled && (
                            <button
                              onClick={() => {
                                setAttendanceCellId(item.cellId);
                                setAttendanceMeetingId(item.id);
                                setActiveSubTab('attendance');
                              }}
                              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                            >
                              <ClipboardCheck className="w-3.5 h-3.5" />
                              {isCompleted ? 'Review Attendance' : 'Mark Attendance'}
                            </button>
                          )}

                          <div className="flex items-center gap-1 ml-auto">
                            <button
                              onClick={() => openEditMeetingModal(item)}
                              title="Edit Meeting"
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {!isCancelled && isUpcoming && (
                              <button
                                onClick={() => handleCancelMeeting(item)}
                                title="Cancel Meeting"
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────────────────── */}
          {/* TAB 6: ATTENDANCE (Roll-call with Present / Absent / Late Pills)           */}
          {/* ───────────────────────────────────────────────────────────────────────── */}
          {activeSubTab === 'attendance' && (
            <div className="space-y-6">
              {/* Meeting Selector Banner */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Attendance Roll-Call</span>
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={attendanceCellId}
                      onChange={(e) => {
                        setAttendanceCellId(e.target.value);
                        setAttendanceMeetingId('');
                      }}
                      className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      {cells.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.cellCode} — {c.name}
                        </option>
                      ))}
                    </select>

                    {attendanceMeetings.length > 0 && (
                      <select
                        value={attendanceMeetingId}
                        onChange={(e) => setAttendanceMeetingId(e.target.value)}
                        className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl"
                      >
                        {attendanceMeetings.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.title} ({m.date})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleSaveAttendance}
                  disabled={savingAttendance || membersInAttendanceCell.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-2"
                >
                  {savingAttendance ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
                  Save Attendance Roll-Call
                </Button>
              </div>

              {/* Roster Roll-Call List */}
              {membersInAttendanceCell.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs">
                  No active members enrolled in this cell. Assign members in the Members tab first.
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100">
                  {membersInAttendanceCell.map((m) => {
                    const status = attendanceRoster[m.memberId] || 'Present';
                    return (
                      <div key={m.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                            {m.memberName.slice(0, 1)}
                          </div>
                          <div>
                            <h4 className="text-xs font-extrabold text-slate-900">{m.memberName}</h4>
                            <p className="text-[11px] text-slate-500">{m.memberPhone || 'No phone'}</p>
                          </div>
                        </div>

                        {/* Status Pills */}
                        <div className="flex items-center gap-2">
                          {(['Present', 'Absent', 'Late'] as const).map((st) => {
                            const isSelected = status === st;
                            return (
                              <button
                                key={st}
                                onClick={() => handleSetAttendanceStatus(m.memberId, st)}
                                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                                  isSelected
                                    ? st === 'Present'
                                      ? 'bg-emerald-600 text-white'
                                      : st === 'Absent'
                                      ? 'bg-rose-600 text-white'
                                      : 'bg-amber-500 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {st}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────────────────── */}
          {/* TAB 7: VISITS (Pastoral Home & Hospital Care Visits)                       */}
          {/* ───────────────────────────────────────────────────────────────────────── */}
          {activeSubTab === 'visits' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Pastoral Care Visits</h3>
                  <p className="text-xs text-slate-500">Track home and hospital visitations for church families</p>
                </div>
                <Button
                  onClick={openScheduleVisitModal}
                  className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Schedule Visit
                </Button>
              </div>

              {visits.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs">
                  No pastoral visits logged yet. Click "Schedule Visit" to log a visit.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visits.map((v) => (
                    <div key={v.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {v.purpose}
                        </span>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            v.status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {v.status}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900">{v.memberName}</h4>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{v.memberPhone || 'No phone'}</span>
                        </p>
                      </div>

                      <div className="text-xs text-slate-600 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{v.visitDate} {v.visitTime ? `at ${v.visitTime}` : ''}</span>
                        </div>
                        {v.location && (
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate">{v.location}</span>
                          </div>
                        )}
                        {v.assignedVisitors && (
                          <p className="text-[11px] text-slate-500 pt-1">
                            Team: <span className="font-semibold text-slate-700">{v.assignedVisitors}</span>
                          </p>
                        )}
                      </div>

                      {v.notes && <p className="text-xs text-slate-500 italic">"{v.notes}"</p>}

                      {v.status !== 'Completed' && (
                        <div className="pt-2 border-t border-slate-100 flex justify-end">
                          <button
                            onClick={() => handleMarkVisitCompleted(v)}
                            className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200"
                          >
                            Mark Completed
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────────────────── */}
          {/* TAB 8: FOLLOW-UPS (Retention & Care for Inactive Members)                   */}
          {/* ───────────────────────────────────────────────────────────────────────── */}
          {activeSubTab === 'followups' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Member Care Follow-ups</h3>
                  <p className="text-xs text-slate-500">Reach out to absent or inactive believers</p>
                </div>
                <Button
                  onClick={() => openLogFollowupModal()}
                  className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Log Follow-up
                </Button>
              </div>

              {followups.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs">
                  No active follow-ups logged. Click "Log Follow-up" to record pastoral outreach.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {followups.map((f) => (
                    <div key={f.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                          {f.reason}
                        </span>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            f.status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {f.status}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900">{f.memberName}</h4>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{f.memberPhone || 'No phone'}</span>
                        </p>
                      </div>

                      {f.notes && <p className="text-xs text-slate-600 line-clamp-2">"{f.notes}"</p>}

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {f.memberPhone && (
                            <a
                              href={`tel:${f.memberPhone}`}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg"
                            >
                              Call
                            </a>
                          )}
                          {f.memberPhone && (
                            <a
                              href={`https://wa.me/${f.memberPhone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg"
                            >
                              WhatsApp
                            </a>
                          )}
                        </div>

                        {f.status !== 'Completed' && (
                          <button
                            onClick={() => handleResolveFollowup(f)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────────────────── */}
          {/* TAB 9: NOTICES & PRAYER REQUESTS                                          */}
          {/* ───────────────────────────────────────────────────────────────────────── */}
          {activeSubTab === 'announcements' && (
            <div className="space-y-6">
              {/* Segmented Toggle Bar */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setAnnouncePrayerSection('prayers')}
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      announcePrayerSection === 'prayers'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Prayer Petitions ({prayers.length})
                  </button>
                  <button
                    onClick={() => setAnnouncePrayerSection('announcements')}
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      announcePrayerSection === 'announcements'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Cell Notices ({notices.length})
                  </button>
                </div>

                <Button
                  onClick={() =>
                    announcePrayerSection === 'prayers' ? setPrayerModalOpen(true) : setNoticeModalOpen(true)
                  }
                  className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {announcePrayerSection === 'prayers' ? 'Add Prayer Request' : 'Broadcast Notice'}
                </Button>
              </div>

              {announcePrayerSection === 'prayers' ? (
                prayers.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs">
                    No cell prayer petitions registered. Click "Add Prayer Request" to log a prayer petition.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {prayers.map((p) => (
                      <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                            {p.category}
                          </span>
                          <span className="text-[10px] text-slate-400">{p.cellName}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900">{p.memberName}</h4>
                        <p className="text-xs text-slate-600 line-clamp-3 italic">"{p.request}"</p>
                      </div>
                    ))}
                  </div>
                )
              ) : notices.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs">
                  No cell announcements broadcasted yet. Click "Broadcast Notice" to create one.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {notices.map((n) => (
                    <div key={n.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700">
                          {n.priority} Priority
                        </span>
                        <span className="text-[10px] text-slate-400">{n.cellName}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">{n.title}</h4>
                      <p className="text-xs text-slate-600 line-clamp-3">{n.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────────────────── */}
          {/* MODAL 1: ADD MEMBERS MODAL (Exact Mobile Parity MemberLookupModal)        */}
          {/* ───────────────────────────────────────────────────────────────────────── */}
          {showAddMembersModal && addMembersTargetCell && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Add Members to {addMembersTargetCell.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Select members to assign. Duplicates are strictly blocked.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddMembersModal(false)}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Search Bar */}
                <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by name, phone or locality..."
                      value={addMembersSearchQuery}
                      onChange={(e) => setAddMembersSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                    {addMembersSearchQuery && (
                      <button
                        onClick={() => setAddMembersSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Location Filter Banner */}
                {addMembersTargetCell.location && (
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="w-4 h-4 text-slate-700 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          Showing members in: {addMembersTargetCell.location}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {addMembersFilterByLocation
                            ? `Matching saved residential locations (${addMembersFilteredList.length} found)`
                            : 'Showing all church members regardless of location'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setAddMembersFilterByLocation(!addMembersFilterByLocation)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${
                        addMembersFilterByLocation
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-700 border border-slate-200'
                      }`}
                    >
                      {addMembersFilterByLocation ? 'Location: ON' : 'Show All'}
                    </button>
                  </div>
                )}

                {/* Locality Filter Pills Bar */}
                {uniqueLocalities.length > 0 && (
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto">
                    <button
                      onClick={() => setAddMembersSelectedLocality('ALL')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        addMembersSelectedLocality === 'ALL'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      All Localities
                    </button>
                    {uniqueLocalities.map((loc) => (
                      <button
                        key={loc}
                        onClick={() => setAddMembersSelectedLocality(loc)}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
                          addMembersSelectedLocality === loc
                            ? 'bg-slate-900 text-white font-bold'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {loc}
                      </button>
                    ))}
                  </div>
                )}

                {/* Members List Items */}
                <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
                  {addMembersFilteredList.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      No matching church members found.
                    </div>
                  ) : (
                    addMembersFilteredList.map((m) => {
                      const isAlreadyInThisCell =
                        activeMembershipsMap.get(m.id)?.cellId === addMembersTargetCell.id;
                      const otherMembership = activeMembershipsMap.get(m.id);
                      const isInOtherCell = otherMembership && otherMembership.cellId !== addMembersTargetCell.id;
                      const isSelected = addMembersSelectedMap.has(m.id);

                      const initials =
                        m.name
                          ?.split(' ')
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((p) => p[0]?.toUpperCase())
                          .join('') || 'M';

                      return (
                        <div
                          key={m.id}
                          onClick={() => !isAlreadyInThisCell && handleToggleAddMember(m)}
                          className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                            isAlreadyInThisCell
                              ? 'bg-slate-50/70 border-slate-200 opacity-60 cursor-not-allowed'
                              : isSelected
                              ? 'bg-emerald-50/40 border-emerald-500 shadow-sm cursor-pointer'
                              : 'bg-white border-slate-200 hover:border-slate-300 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Avatar */}
                            {m.photoUrl ? (
                              <img
                                src={m.photoUrl}
                                alt={m.name}
                                className="w-10 h-10 rounded-full object-cover border border-slate-200 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
                                {initials}
                              </div>
                            )}

                            {/* Member Details */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-extrabold text-slate-900 truncate">{m.name}</span>
                                {m.memberCode && (
                                  <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded">
                                    {m.memberCode}
                                  </span>
                                )}
                              </div>

                              {m.phone && (
                                <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  <span>{m.phone}</span>
                                </p>
                              )}

                              {m.locality && (
                                <p className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  <span>{m.locality}</span>
                                </p>
                              )}

                              {/* Status Badges */}
                              {isAlreadyInThisCell ? (
                                <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                                  <UserCheck className="w-3 h-3 text-emerald-600" />
                                  Already in this Cell
                                </div>
                              ) : isInOtherCell ? (
                                <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-amber-700">
                                  <AlertCircle className="w-3 h-3 text-amber-600" />
                                  In {otherMembership.cellCode || otherMembership.cellName || 'Other Cell'}
                                </div>
                              ) : null}
                            </div>
                          </div>

                          {/* Checkbox */}
                          <div
                            className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors flex-shrink-0 ${
                              isAlreadyInThisCell
                                ? 'bg-slate-200 border-slate-300'
                                : isSelected
                                ? 'bg-slate-900 border-slate-900 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Sticky Bottom Action Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-slate-700">
                    {addMembersSelectedMap.size} members selected
                  </span>

                  <Button
                    onClick={handleConfirmAddMembers}
                    disabled={addMembersSelectedMap.size === 0 || addMembersSaving}
                    className={`rounded-xl text-xs font-bold px-5 py-2 shadow transition-all ${
                      addMembersSelectedMap.size > 0
                        ? 'bg-slate-900 hover:bg-slate-800 text-white'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {addMembersSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Assign Selected'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────────────────── */}
          {/* MODAL 2: CREATE / EDIT CARE CELL MODAL (CareCellFormModal)                */}
          {/* ───────────────────────────────────────────────────────────────────────── */}
          {modalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">
                        {editingCell ? 'Edit Care Cell' : 'Create Care Cell'}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Fellowship details, leader assignment, and weekly gathering schedule
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form Body */}
                <form id="care-cell-form" onSubmit={handleSaveCell} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
                  {/* Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Care Cell Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Grace Fellowship / Hitech City Cell"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>

                  {/* Code */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700">Care Cell Code *</label>
                      <button
                        type="button"
                        onClick={() => {
                          const nextNum = cells.length + 1;
                          setFormCellCode(`Rhema_CareCell-${String(nextNum).padStart(3, '0')}`);
                        }}
                        className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" /> Auto Generate
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Rhema_CareCell-001"
                      value={formCellCode}
                      onChange={(e) => setFormCellCode(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-400">Standard format: Rhema_CareCell-001, Rhema_CareCell-002</p>
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Description</label>
                    <textarea
                      placeholder="Focus of this cell (e.g. Young Adults, Family Bible Study, Neighborhood Care)"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>

                  {/* Location / Area */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Location / Area</label>
                    <input
                      type="text"
                      placeholder="e.g. Madhapur, Kondapur, Jubilee Hills, Koilakuntla"
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>

                  {/* Leader Selection */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Cell Leader (Existing Church Member) *</label>
                    {formLeaderName ? (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-800 font-bold flex items-center justify-center text-xs">
                            {formLeaderName.slice(0, 1)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{formLeaderName}</p>
                            <p className="text-[11px] text-slate-500">{formLeaderPhone || 'No phone'}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSingleLookupMode('leader');
                            setSingleLookupSearch('');
                          }}
                          className="text-xs text-slate-700 font-bold hover:underline"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSingleLookupMode('leader');
                          setSingleLookupSearch('');
                        }}
                        className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors"
                      >
                        <UserPlus className="w-4 h-4 text-slate-500" />
                        Select Cell Leader from Members
                      </button>
                    )}
                  </div>

                  {/* Assistant Leader Selection */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Assistant Leader (Optional)</label>
                    {formAssistantName ? (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-800 font-bold flex items-center justify-center text-xs">
                            {formAssistantName.slice(0, 1)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{formAssistantName}</p>
                            <p className="text-[11px] text-slate-500">{formAssistantPhone || 'No phone'}</p>
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
                          className="text-xs text-rose-600 font-bold hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSingleLookupMode('assistant');
                          setSingleLookupSearch('');
                        }}
                        className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors"
                      >
                        <UserPlus className="w-4 h-4 text-slate-500" />
                        Assign Assistant Leader
                      </button>
                    )}
                  </div>

                  {/* Location-Based Assigned Members Section */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-xs font-bold text-slate-900">
                          Assigned Members {formLocation ? `(${formLocation})` : ''}
                        </span>
                      </div>
                      {formLocationMatchedMembers.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (formSelectedMembersMap.size === formLocationMatchedMembers.length) {
                              setFormSelectedMembersMap(new Map());
                            } else {
                              const map = new Map<string, ChurchMemberOption>();
                              formLocationMatchedMembers.forEach((m) => map.set(m.id, m));
                              setFormSelectedMembersMap(map);
                            }
                          }}
                          className="text-[11px] font-bold text-slate-700 hover:underline"
                        >
                          {formSelectedMembersMap.size === formLocationMatchedMembers.length ? 'Deselect' : 'Select All'}
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 leading-tight">
                      {formLocation
                        ? `Existing church members living within ${formLocation} based on saved residential locations.`
                        : 'Enter a Location / Area above to match members living in that locality.'}
                    </p>

                    {formLocationMatchedMembers.length > 0 && (
                      <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 bg-white rounded-xl border border-slate-200">
                        {formLocationMatchedMembers.map((mem) => {
                          const isChecked = formSelectedMembersMap.has(mem.id);
                          return (
                            <div
                              key={mem.id}
                              onClick={() => {
                                setFormSelectedMembersMap((prev) => {
                                  const next = new Map(prev);
                                  if (next.has(mem.id)) next.delete(mem.id);
                                  else next.set(mem.id, mem);
                                  return next;
                                });
                              }}
                              className="p-2.5 flex items-center justify-between gap-2 hover:bg-slate-50 cursor-pointer text-xs"
                            >
                              <div>
                                <p className="font-bold text-slate-900">{mem.name}</p>
                                <p className="text-[10px] text-slate-400">{mem.phone || mem.locality}</p>
                              </div>
                              <div
                                className={`w-4 h-4 rounded border flex items-center justify-center ${
                                  isChecked ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-300'
                                }`}
                              >
                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Meeting Day Chips */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Meeting Day *</label>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      {DAYS_OF_WEEK.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setFormMeetingDay(d)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                            formMeetingDay === d
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {d.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Times (2 Columns) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Starting Time *</label>
                      <input
                        type="time"
                        value={formMeetingTime}
                        onChange={(e) => setFormMeetingTime(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Ending Time</label>
                      <input
                        type="time"
                        value={formMeetingEndTime}
                        onChange={(e) => setFormMeetingEndTime(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Meeting Location */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Meeting Location / Address</label>
                    <input
                      type="text"
                      placeholder="e.g. Leader's Home / Community Hall / Flat 302"
                      value={formMeetingLocation}
                      onChange={(e) => setFormMeetingLocation(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>

                  {/* Capacity & Status */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Max Capacity</label>
                      <input
                        type="number"
                        min="5"
                        max="100"
                        value={formMaxMembers}
                        onChange={(e) => setFormMaxMembers(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Status</label>
                      <select
                        value={formStatus}
                        onChange={(e: any) => setFormStatus(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      >
                        {STATUS_OPTIONS.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </form>

                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setModalOpen(false)}
                    className="rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </Button>
                  <Button
                    form="care-cell-form"
                    type="submit"
                    disabled={savingCell}
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold px-5"
                  >
                    {savingCell ? <Loader2 className="w-4 h-4 animate-spin" /> : editingCell ? 'Save Changes' : 'Create Care Cell'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────────────────── */}
          {/* SUB-MODAL: SINGLE MEMBER LOOKUP (FOR LEADER OR ASSISTANT)                 */}
          {/* ───────────────────────────────────────────────────────────────────────── */}
          {singleLookupMode && (
            <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-3 sm:p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="text-sm font-extrabold text-slate-900">
                    Select {singleLookupMode === 'leader' ? 'Cell Leader' : 'Assistant Leader'}
                  </h4>
                  <button onClick={() => setSingleLookupMode(null)} className="p-1 text-slate-400 hover:text-slate-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 border-b border-slate-100 bg-slate-50">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search member name or phone..."
                      value={singleLookupSearch}
                      onChange={(e) => setSingleLookupSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>
                </div>

                <div className="p-3 overflow-y-auto space-y-1.5 flex-1 divide-y divide-slate-100">
                  {membersPool
                    .filter((m) => {
                      if (!singleLookupSearch.trim()) return true;
                      const q = singleLookupSearch.toLowerCase();
                      return m.name.toLowerCase().includes(q) || (m.phone && m.phone.includes(q));
                    })
                    .map((m) => (
                      <div
                        key={m.id}
                        onClick={() => {
                          if (singleLookupMode === 'leader') {
                            setFormLeaderId(m.id);
                            setFormLeaderName(m.name);
                            setFormLeaderPhone(m.phone || '');
                            setFormLeaderPhoto(m.photoUrl);
                          } else {
                            setFormAssistantId(m.id);
                            setFormAssistantName(m.name);
                            setFormAssistantPhone(m.phone || '');
                            setFormAssistantPhoto(m.photoUrl);
                          }
                          setSingleLookupMode(null);
                        }}
                        className="p-2.5 flex items-center justify-between gap-2 hover:bg-slate-50 rounded-xl cursor-pointer"
                      >
                        <div>
                          <p className="text-xs font-extrabold text-slate-900">{m.name}</p>
                          <p className="text-[11px] text-slate-500">{m.phone || m.locality}</p>
                        </div>
                        <span className="text-xs font-bold text-slate-700">Select</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────────────────── */}
          {/* MODAL 3: SCHEDULE / EDIT MEETING MODAL (MeetingFormModal)                  */}
          {/* ───────────────────────────────────────────────────────────────────────── */}
          {meetingModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
                      <CalendarPlus className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">
                        {editingMeeting ? 'Edit Meeting' : 'Schedule Fellowship Meeting'}
                      </h3>
                      <p className="text-xs text-slate-500">Plan a gathering with Scripture and attendance roll-call</p>
                    </div>
                  </div>
                  <button onClick={() => setMeetingModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form Body */}
                <form id="meeting-form" onSubmit={handleSaveMeeting} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
                  {/* Care Cell */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Care Cell *</label>
                    <select
                      value={meetingCellId}
                      onChange={(e) => {
                        setMeetingCellId(e.target.value);
                        const c = cells.find((cell) => cell.id === e.target.value);
                        if (c) setMeetingLocation(c.meetingLocation || c.location || '');
                      }}
                      required
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white"
                    >
                      {cells.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.cellCode} — {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Title */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Meeting Title *</label>
                    <input
                      type="text"
                      placeholder="e.g. Weekly Fellowship & Prayer / Walking in Faith"
                      value={meetingTitle}
                      onChange={(e) => setMeetingTitle(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>

                  {/* Meeting Type Chips */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Meeting Type</label>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      {MEETING_TYPES.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setMeetingType(t)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                            meetingType === t
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date & Time Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Date *</label>
                      <input
                        type="date"
                        value={meetingDate}
                        onChange={(e) => setMeetingDate(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Start Time *</label>
                      <input
                        type="time"
                        value={meetingStartTime}
                        onChange={(e) => setMeetingStartTime(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">End Time</label>
                      <input
                        type="time"
                        value={meetingEndTime}
                        onChange={(e) => setMeetingEndTime(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Location */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Location / Venue</label>
                    <input
                      type="text"
                      placeholder="e.g. Leader's Home / Community Hall"
                      value={meetingLocation}
                      onChange={(e) => setMeetingLocation(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>

                  {/* Holy Scripture Reading Section */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-slate-900" />
                        <span className="text-xs font-bold text-slate-900">Holy Scripture Reading</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => fetchScripture(selectedBookIndex, selectedChapter, selectedVerseRange)}
                        className="text-[11px] font-bold text-slate-700 hover:underline flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3 text-slate-500" /> Reload Verse
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Book</label>
                        <select
                          value={selectedBookIndex}
                          onChange={(e) => {
                            const idx = Number(e.target.value);
                            setSelectedBookIndex(idx);
                            setSelectedChapter(1);
                            fetchScripture(idx, 1, selectedVerseRange);
                          }}
                          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
                        >
                          {ENGLISH_NAMES.map((name, idx) => (
                            <option key={name} value={idx}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Chapter</label>
                        <select
                          value={selectedChapter}
                          onChange={(e) => {
                            const ch = Number(e.target.value);
                            setSelectedChapter(ch);
                            fetchScripture(selectedBookIndex, ch, selectedVerseRange);
                          }}
                          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
                        >
                          {Array.from({ length: getChapterCount(selectedBookIndex) || 1 }, (_, i) => i + 1).map((ch) => (
                            <option key={ch} value={ch}>
                              {ch}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Verse(s)</label>
                        <input
                          type="text"
                          placeholder="e.g. 6-7"
                          value={selectedVerseRange}
                          onChange={(e) => {
                            setSelectedVerseRange(e.target.value);
                            fetchScripture(selectedBookIndex, selectedChapter, e.target.value);
                          }}
                          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
                        />
                      </div>
                    </div>

                    {/* Scripture Preview Card */}
                    <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5 text-xs">
                      <p className="font-bold text-slate-900">
                        {ENGLISH_NAMES[selectedBookIndex]} {selectedChapter}:{selectedVerseRange} ·{' '}
                        {TELUGU_NAMES[selectedBookIndex]} {selectedChapter}:{selectedVerseRange}
                      </p>
                      {loadingScripture ? (
                        <div className="py-2 text-center text-slate-400 text-xs">
                          <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
                        </div>
                      ) : (
                        <>
                          {scriptureTextEn && (
                            <div>
                              <span className="text-[10px] font-extrabold text-slate-400 block">ENGLISH</span>
                              <p className="text-slate-700 italic">"{scriptureTextEn}"</p>
                            </div>
                          )}
                          {scriptureTextTe && (
                            <div className="pt-1">
                              <span className="text-[10px] font-extrabold text-emerald-700 block">
                                TELUGU (పరిశుద్ధ గ్రంథం)
                              </span>
                              <p className="text-emerald-950 font-medium">"{scriptureTextTe}"</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Notes / Agenda</label>
                    <textarea
                      placeholder="Special prayer petitions, guest speaker details, or worship focus..."
                      value={meetingDescription}
                      onChange={(e) => setMeetingDescription(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>

                  {/* Status */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Status</label>
                    <select
                      value={meetingStatus}
                      onChange={(e: any) => setMeetingStatus(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white"
                    >
                      <option value="Upcoming">Upcoming</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </form>

                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMeetingModalOpen(false)}
                    className="rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </Button>
                  <Button
                    form="meeting-form"
                    type="submit"
                    disabled={savingMeeting}
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold px-5"
                  >
                    {savingMeeting ? <Loader2 className="w-4 h-4 animate-spin" /> : editingMeeting ? 'Save Changes' : 'Schedule Meeting'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────────────────── */}
          {/* MODAL 4: TRANSFER MEMBER MODAL                                            */}
          {/* ───────────────────────────────────────────────────────────────────────── */}
          {transferModalOpen && memberToTransfer && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4 animate-in zoom-in-95">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-slate-900">Transfer Care Cell Member</h3>
                  <button onClick={() => setTransferModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
                  <p className="font-bold text-slate-900">{memberToTransfer.memberName}</p>
                  <p className="text-slate-500">Currently in: {memberToTransfer.cellName} ({memberToTransfer.cellCode})</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Target Care Cell</label>
                  <select
                    value={transferTargetCellId}
                    onChange={(e) => setTransferTargetCellId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white"
                  >
                    {cells
                      .filter((c) => c.id !== memberToTransfer.cellId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.cellCode} — {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button variant="outline" onClick={() => setTransferModalOpen(false)} className="rounded-xl text-xs font-bold">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmTransfer}
                    disabled={transferring || !transferTargetCellId}
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
                  >
                    {transferring ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Transfer'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────────────────── */}
          {/* MODAL 5: SCHEDULE PASTORAL VISIT MODAL                                    */}
          {/* ───────────────────────────────────────────────────────────────────────── */}
          {visitModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 space-y-4 animate-in zoom-in-95">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-slate-900">Schedule Pastoral Visit</h3>
                  <button onClick={() => setVisitModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveVisit} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Care Cell *</label>
                    <select
                      value={visitCellId}
                      onChange={(e) => setVisitCellId(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                    >
                      {cells.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.cellCode} — {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Member Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Sakibanda Sunil Babu"
                        value={visitMemberName}
                        onChange={(e) => setVisitMemberName(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Phone</label>
                      <input
                        type="tel"
                        placeholder="+91..."
                        value={visitMemberPhone}
                        onChange={(e) => setVisitMemberPhone(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Date</label>
                      <input
                        type="date"
                        value={visitDate}
                        onChange={(e) => setVisitDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Time</label>
                      <input
                        type="time"
                        value={visitTime}
                        onChange={(e) => setVisitTime(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Visit Purpose</label>
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

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Address / Hospital</label>
                    <input
                      type="text"
                      placeholder="e.g. Home address or hospital ward"
                      value={visitLocation}
                      onChange={(e) => setVisitLocation(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <Button type="button" variant="outline" onClick={() => setVisitModalOpen(false)} className="rounded-xl text-xs font-bold">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={savingVisit} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold">
                      {savingVisit ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Schedule Visit'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────────────────── */}
          {/* MODAL 6: LOG CARE FOLLOW-UP MODAL                                         */}
          {/* ───────────────────────────────────────────────────────────────────────── */}
          {followupModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 space-y-4 animate-in zoom-in-95">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-slate-900">Log Care Follow-up</h3>
                  <button onClick={() => setFollowupModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveFollowup} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Care Cell *</label>
                    <select
                      value={followupCellId}
                      onChange={(e) => setFollowupCellId(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                    >
                      {cells.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.cellCode} — {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Member Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Rajesh Yeddula"
                        value={followupMemberName}
                        onChange={(e) => setFollowupMemberName(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Phone</label>
                      <input
                        type="tel"
                        placeholder="+91..."
                        value={followupMemberPhone}
                        onChange={(e) => setFollowupMemberPhone(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Channel</label>
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
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Reason</label>
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
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Notes / Action Taken</label>
                    <textarea
                      placeholder="Spoke with member, prayed for healing, confirmed next meeting attendance..."
                      value={followupNotes}
                      onChange={(e) => setFollowupNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <Button type="button" variant="outline" onClick={() => setFollowupModalOpen(false)} className="rounded-xl text-xs font-bold">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={savingFollowup} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold">
                      {savingFollowup ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log Follow-up'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────────────────── */}
          {/* MODAL 7: BROADCAST NOTICE MODAL                                           */}
          {/* ───────────────────────────────────────────────────────────────────────── */}
          {noticeModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4 animate-in zoom-in-95">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-slate-900">Broadcast Cell Notice</h3>
                  <button onClick={() => setNoticeModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveNotice} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Target Cell</label>
                    <select
                      value={noticeCellId}
                      onChange={(e) => setNoticeCellId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                    >
                      <option value="">All Care Cells</option>
                      {cells.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.cellCode} — {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Title *</label>
                    <input
                      type="text"
                      placeholder="Notice headline..."
                      value={noticeTitle}
                      onChange={(e) => setNoticeTitle(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Message *</label>
                    <textarea
                      placeholder="Announcement body text..."
                      value={noticeMessage}
                      onChange={(e) => setNoticeMessage(e.target.value)}
                      required
                      rows={3}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <Button type="button" variant="outline" onClick={() => setNoticeModalOpen(false)} className="rounded-xl text-xs font-bold">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={savingNotice} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold">
                      {savingNotice ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publish Notice'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────────────────── */}
          {/* MODAL 8: ADD PRAYER PETITION MODAL                                        */}
          {/* ───────────────────────────────────────────────────────────────────────── */}
          {prayerModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4 animate-in zoom-in-95">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-slate-900">Add Prayer Request</h3>
                  <button onClick={() => setPrayerModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSavePrayer} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Care Cell</label>
                    <select
                      value={prayerCellId}
                      onChange={(e) => setPrayerCellId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                    >
                      <option value="">All Care Cells</option>
                      {cells.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.cellCode} — {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Member Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. David Abraham"
                      value={prayerMemberName}
                      onChange={(e) => setPrayerMemberName(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Category</label>
                    <select
                      value={prayerCategory}
                      onChange={(e) => setPrayerCategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                    >
                      <option value="Healing / Health">Healing / Health</option>
                      <option value="Family / Children">Family / Children</option>
                      <option value="Financial / Job">Financial / Job</option>
                      <option value="Spiritual Growth">Spiritual Growth</option>
                      <option value="Thanksgiving">Thanksgiving</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Prayer Petition *</label>
                    <textarea
                      placeholder="Please pray for..."
                      value={prayerRequestText}
                      onChange={(e) => setPrayerRequestText(e.target.value)}
                      required
                      rows={3}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <Button type="button" variant="outline" onClick={() => setPrayerModalOpen(false)} className="rounded-xl text-xs font-bold">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={savingPrayer} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold">
                      {savingPrayer ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Prayer Request'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </AdminNavigationShell>
    </ProtectedRoute>
  );
}
