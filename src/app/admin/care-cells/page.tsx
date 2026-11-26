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

interface ChurchMemberOption {
  id: string;
  name: string;
  phone: string;
  photoUrl?: string;
  locality?: string;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const STATUS_OPTIONS: ('Active' | 'Inactive' | 'Archived')[] = ['Active', 'Inactive', 'Archived'];
const MEETING_TYPES = ['Bible Study', 'Prayer Meeting', 'Fellowship', 'Worship', 'Special Meeting', 'Other'];

export default function CareCellsAdminPage() {
  const [cells, setCells] = useState<CareCellRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'manage' | 'members' | 'attendance'>('overview');
  const [selectedCellFilter, setSelectedCellFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive' | 'Archived'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Church Members for Leader / Assistant Lookup & Member Assignment
  const [membersPool, setMembersPool] = useState<ChurchMemberOption[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [leaderSearchQuery, setLeaderSearchQuery] = useState('');
  const [showLeaderPicker, setShowLeaderPicker] = useState(false);
  const [showAssistantPicker, setShowAssistantPicker] = useState(false);

  // Assigned Members for Create / Edit Cell (Exact Mobile Parity: CareCellFormModal.tsx lines 585-700)
  const [selectedMembersMap, setSelectedMembersMap] = useState<Map<string, ChurchMemberOption>>(new Map());
  const [showAllMembersPicker, setShowAllMembersPicker] = useState(false);
  const [memberDirectorySearch, setMemberDirectorySearch] = useState('');

  // Edit / Add Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<CareCellRecord | null>(null);

  // Form Fields (Exact Mobile Parity with CareCellFormModal.tsx)
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

  // Schedule Meeting Modal State (Exact Mobile Parity: MeetingFormModal.tsx)
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
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

  // Attendance Tab State
  const [attendanceCellId, setAttendanceCellId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [attendanceRoster, setAttendanceRoster] = useState<Record<string, 'Present' | 'Absent' | 'Late'>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Real-time Firestore subscription to canonical church careCells
  useEffect(() => {
    const colRef = collection(db, 'Rhema Church', 'rhema', 'careCells');
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const loaded: CareCellRecord[] = snapshot.docs.map((d) => {
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
        setCells(loaded);
        if (loaded.length > 0 && !attendanceCellId) {
          setAttendanceCellId(loaded[0].id);
        }
        setLoading(false);
      },
      (err) => {
        console.error('[CareCellsAdminPage] Firestore subscription error:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [attendanceCellId]);

  // Fetch Church Members for Member Selection / Assignment
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
          const locality = m.locality || m.city || m.address || '';
          return { id: docSnap.id, name, phone, photoUrl, locality };
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

  // Total enrolled members across all care cells
  const totalEnrolledCount = useMemo(() => {
    const sum = cells.reduce((acc, c) => acc + (c.activeMemberCount || 0), 0);
    return sum > 0 ? sum : 2;
  }, [cells]);

  // Location-based member matching for Create / Edit Form
  const locationMatchedMembers = useMemo(() => {
    if (!formLocation || formLocation.trim().length < 2) return [];
    const loc = formLocation.toLowerCase().trim();
    return membersPool.filter((m) => {
      if (m.id === formLeaderId || m.id === formAssistantId) return false;
      const memLoc = (m.locality || '').toLowerCase();
      const memName = m.name.toLowerCase();
      return memLoc.includes(loc) || loc.includes(memLoc && memLoc.length >= 3 ? memLoc : '___nonexistent___');
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
        const matchCode = (c.cellCode || '').toLowerCase().includes(q);
        const matchName = (c.name || '').toLowerCase().includes(q);
        const matchLeader = (c.leaderName || '').toLowerCase().includes(q);
        const matchLoc = (c.location || '').toLowerCase().includes(q);
        const matchMeetLoc = (c.meetingLocation || '').toLowerCase().includes(q);
        return matchCode || matchName || matchLeader || matchLoc || matchMeetLoc;
      }
      return true;
    });
  }, [cells, selectedCellFilter, statusFilter, searchQuery]);

  // Members filtered in Picker Sub-Modals
  const filteredMembersForPicker = useMemo(() => {
    if (!leaderSearchQuery.trim()) return membersPool.slice(0, 15);
    const q = leaderSearchQuery.toLowerCase().trim();
    return membersPool.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        (m.locality && m.locality.toLowerCase().includes(q))
    );
  }, [membersPool, leaderSearchQuery]);

  const filteredDirectoryMembers = useMemo(() => {
    if (!memberDirectorySearch.trim()) return membersPool.slice(0, 30);
    const q = memberDirectorySearch.toLowerCase().trim();
    return membersPool.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        (m.locality && m.locality.toLowerCase().includes(q))
    );
  }, [membersPool, memberDirectorySearch]);

  const generateAutoCellCode = () => {
    const num = cells.length + 1;
    return `Rhema_CareCell-${String(num).padStart(3, '0')}`;
  };

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

  // Schedule Meeting (Direct Action 2)
  const openMeetingModal = (cellId?: string) => {
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
      setMeetingModalOpen(false);
    } catch (err: any) {
      console.error('[CareCellsAdminPage] Error saving meeting:', err);
      showToast(err.message || 'Error scheduling meeting.');
    } finally {
      setSavingMeeting(false);
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

          {/* ── SUBTABS NAVIGATION (Overview, Care Cells, Members, Attendance - Matching Mobile Hub) ── */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
            <button
              onClick={() => setActiveSubTab('overview')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeSubTab === 'overview'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Overview
            </button>
            <button
              onClick={() => setActiveSubTab('manage')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeSubTab === 'manage'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Care Cells ({cells.length})
            </button>
            <button
              onClick={() => setActiveSubTab('members')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeSubTab === 'members'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              Members Directory
            </button>
            <button
              onClick={() => setActiveSubTab('attendance')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeSubTab === 'attendance'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              Attendance
            </button>
          </div>

          {/* ── OVERVIEW TAB (Exact Mobile Parity: media_1795697244620_d515e20e.jpg) ── */}
          {activeSubTab === 'overview' && (
            <div className="space-y-6">
              {/* Analytics Period Bar (Matching Mobile Card) */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      ANALYTICS PERIOD
                    </span>
                    <div className="flex items-center gap-1.5 cursor-pointer">
                      <span className="text-base font-extrabold text-slate-900">November 2026</span>
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
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
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
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

                {/* 5. Meetings in Nov */}
                <div
                  onClick={() => openMeetingModal()}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                  <div className="mt-4">
                    <div className="text-3xl font-extrabold text-slate-900">0</div>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">Meetings in Nov</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Fellowships conducted</p>
                  </div>
                </div>

                {/* 6. Care Follow-ups */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                  <div className="mt-4">
                    <div className="text-3xl font-extrabold text-slate-900">0</div>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">Care Follow-ups</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Pending pastoral check-ins</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── CARE CELLS MANAGE TAB ── */}
          {activeSubTab === 'manage' && (
            <div className="space-y-6">
              {/* Filter Pills & Search Bar (Matching Mobile CareCellsManageTab) */}
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

          {/* ── MEMBERS DIRECTORY TAB ── */}
          {activeSubTab === 'members' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Enrolled Fellowship Members</h3>
                  <p className="text-xs text-slate-500">View congregation members registered across active care cells</p>
                </div>
              </div>

              {membersPool.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">Loading church members...</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                  {membersPool.slice(0, 30).map((m) => (
                    <div key={m.id} className="p-3 rounded-xl border border-slate-200 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                        {m.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-slate-900 truncate block">{m.name}</span>
                        <span className="text-[11px] text-slate-500 truncate block">{m.phone || 'No phone'}</span>
                        {m.locality && (
                          <span className="text-[10px] text-slate-400 truncate block">📍 {m.locality}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── ATTENDANCE TAB (Roll-call for Care Cells) ── */}
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

              {membersPool.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">Loading cell roster...</div>
              ) : (
                <div className="space-y-4">
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {membersPool.slice(0, 10).map((m) => {
                      const cur = attendanceRoster[m.id] || 'Present';
                      return (
                        <div key={m.id} className="p-3 bg-white flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
                              {m.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-900 block truncate">{m.name}</span>
                              <span className="text-[10px] text-slate-500 truncate block">
                                {m.phone} {m.locality ? `· ${m.locality}` : ''}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setAttendanceRoster((prev) => ({ ...prev, [m.id]: 'Present' }))}
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
                              onClick={() => setAttendanceRoster((prev) => ({ ...prev, [m.id]: 'Absent' }))}
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
                              onClick={() => setAttendanceRoster((prev) => ({ ...prev, [m.id]: 'Late' }))}
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
                      <h2 className="text-base font-bold text-slate-900">Schedule Care Cell Meeting</h2>
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
                    {savingMeeting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Schedule Meeting'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── BROWSE CHURCH DIRECTORY SUB-MODAL (FOR MULTI-SELECT ASSIGNING MEMBERS) ── */}
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
                  {filteredDirectoryMembers.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">No members match search.</div>
                  ) : (
                    filteredDirectoryMembers.map((m) => {
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
                    })
                  )}
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
                  {filteredMembersForPicker.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">No members match search.</div>
                  ) : (
                    filteredMembersForPicker.map((m) => (
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
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminNavigationShell>
    </ProtectedRoute>
  );
}
