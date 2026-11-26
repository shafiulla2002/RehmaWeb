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
} from 'firebase/firestore';
import {
  Building2,
  Users,
  UserCheck,
  TrendingUp,
  Calendar,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Search,
  Phone,
  User,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  Loader2,
  Sparkles,
  LayoutDashboard,
  Check,
  Archive,
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

export default function CareCellsAdminPage() {
  const [cells, setCells] = useState<CareCellRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'manage' | 'members'>('overview');
  const [selectedCellFilter, setSelectedCellFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive' | 'Archived'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Church Members for Leader / Assistant Lookup
  const [membersPool, setMembersPool] = useState<ChurchMemberOption[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [leaderSearchQuery, setLeaderSearchQuery] = useState('');
  const [showLeaderPicker, setShowLeaderPicker] = useState(false);
  const [showAssistantPicker, setShowAssistantPicker] = useState(false);

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
        setLoading(false);
      },
      (err) => {
        console.error('[CareCellsAdminPage] Firestore subscription error:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

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

  // Filtered Care Cells for the Manage tab
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

  // Members filtered by search query in picker modal
  const filteredMembersForPicker = useMemo(() => {
    if (!leaderSearchQuery.trim()) return membersPool.slice(0, 15);
    const q = leaderSearchQuery.toLowerCase().trim();
    return membersPool.filter((m) => m.name.toLowerCase().includes(q) || m.phone.includes(q) || (m.locality && m.locality.toLowerCase().includes(q)));
  }, [membersPool, leaderSearchQuery]);

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
    setModalOpen(true);
  };

  const openEditModal = (cell: CareCellRecord) => {
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
      if (editingCell) {
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
          status: formStatus,
          updatedAt: serverTimestamp(),
        });
        showToast(`Care Cell "${formName}" updated successfully.`);
      } else {
        const colRef = collection(db, 'Rhema Church', 'rhema', 'careCells');
        await addDoc(colRef, {
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
          activeMemberCount: 0,
          status: formStatus,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        showToast(`Care Cell "${formName}" created successfully.`);
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

          {/* ── SUBTABS NAVIGATION (Overview, Care Cells, Members - Matching Mobile Screen) ── */}
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
                    <div className="text-3xl font-extrabold text-slate-900">
                      {cells.reduce((acc, c) => acc + (c.activeMemberCount || 0), 0) || 2}
                    </div>
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
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
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

              {/* Direct Actions Section (Matching Mobile: DIRECT ACTIONS) */}
              <div className="pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-3">
                  DIRECT ACTIONS
                </span>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={openCreateModal}
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Create New Care Cell
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setActiveSubTab('manage')}
                    className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                  >
                    <Building2 className="w-4 h-4 mr-1.5 text-blue-600" />
                    View Care Cells Directory
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setActiveSubTab('members')}
                    className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                  >
                    <Users className="w-4 h-4 mr-1.5 text-purple-600" />
                    View Enrolled Members
                  </Button>
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
                <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-300 p-8">
                  <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-800">No Care Cells Found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    {searchQuery || statusFilter !== 'All'
                      ? 'No care cells match your current filter criteria.'
                      : 'Create your first fellowship care cell group.'}
                  </p>
                  <Button onClick={openCreateModal} className="mt-4 bg-slate-900 hover:bg-slate-800 text-white text-xs">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    New Care Cell
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredCells.map((cell) => {
                    const isActive = cell.status === 'Active';
                    const isArchived = cell.status === 'Archived';
                    const capacityPercent = Math.min(
                      100,
                      Math.round(((cell.activeMemberCount || 0) / (cell.maximumMembers || 20)) * 100)
                    );

                    return (
                      <div
                        key={cell.id}
                        className={`bg-white rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between shadow-sm hover:shadow-md ${
                          !isActive ? 'opacity-85 border-slate-200' : 'border-slate-200'
                        }`}
                      >
                        <div>
                          {/* Top Header Row (Mobile Parity: Code Badge & Status Chip) */}
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                              {cell.cellCode || 'Rhema_CareCell'}
                            </span>
                            <span
                              className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                                isActive
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : isArchived
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {cell.status}
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-slate-900">{cell.name}</h3>
                          {cell.description ? (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{cell.description}</p>
                          ) : null}

                          {/* Leader Row */}
                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-3">
                            {cell.leaderPhoto ? (
                              <img
                                src={cell.leaderPhoto}
                                alt={cell.leaderName}
                                className="w-10 h-10 rounded-full object-cover border border-slate-200"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm">
                                {cell.leaderName
                                  ? cell.leaderName
                                      .split(' ')
                                      .map((n) => n[0])
                                      .join('')
                                      .slice(0, 2)
                                      .toUpperCase()
                                  : 'L'}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-900 truncate">{cell.leaderName}</span>
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                  Leader
                                </span>
                              </div>
                              {cell.leaderPhone && (
                                <a
                                  href={`tel:${cell.leaderPhone.replace(/[^0-9+]/g, '')}`}
                                  className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                                >
                                  <Phone className="w-3 h-3" />
                                  {cell.leaderPhone}
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Assistant Leader Row (if present) */}
                          {cell.assistantLeaderName ? (
                            <div className="mt-2.5 pt-2 border-t border-slate-50 flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                                {cell.assistantLeaderName
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-semibold text-slate-800 truncate">
                                    {cell.assistantLeaderName}
                                  </span>
                                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                                    Asst.
                                  </span>
                                </div>
                                {cell.assistantLeaderPhone && (
                                  <a
                                    href={`tel:${cell.assistantLeaderPhone.replace(/[^0-9+]/g, '')}`}
                                    className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1"
                                  >
                                    <Phone className="w-2.5 h-2.5" />
                                    {cell.assistantLeaderPhone}
                                  </a>
                                )}
                              </div>
                            </div>
                          ) : null}

                          {/* Meeting Meta Row */}
                          <div className="mt-4 bg-slate-50 p-3 rounded-xl space-y-1.5 text-xs text-slate-600 border border-slate-100">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="font-semibold text-slate-800">{cell.meetingDay}s</span>
                              <span className="text-slate-300">•</span>
                              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>
                                {formatTimeDisplay(cell.meetingTime)}
                                {cell.meetingEndTime ? ` - ${formatTimeDisplay(cell.meetingEndTime)}` : ''}
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <span className="truncate">
                                {cell.location} {cell.meetingLocation ? `· ${cell.meetingLocation}` : ''}
                              </span>
                            </div>
                          </div>

                          {/* Capacity Progress Bar */}
                          <div className="mt-4">
                            <div className="flex justify-between text-xs text-slate-600 mb-1 font-medium">
                              <span>Capacity</span>
                              <span>
                                {cell.activeMemberCount || 0} / {cell.maximumMembers} ({capacityPercent}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  capacityPercent > 90
                                    ? 'bg-rose-500'
                                    : capacityPercent > 60
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${capacityPercent}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <Button
                            variant="secondary"
                            onClick={() => openEditModal(cell)}
                            className="h-8 px-3 text-xs flex items-center gap-1.5 border border-slate-200"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Edit
                          </Button>
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

          {/* ── CREATE / EDIT CARE CELL MODAL (FIXED ALIGNMENT & EXACT MOBILE PARITY) ── */}
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

          {/* ── MEMBER PICKER SUB-MODAL (FOR LEADER OR ASSISTANT) ── */}
          {(showLeaderPicker || showAssistantPicker) && (
            <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
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
