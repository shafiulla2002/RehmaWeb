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
} from 'firebase/firestore';
import {
  Network,
  Users,
  MapPin,
  Calendar,
  Clock,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Search,
  Building2,
  UserCheck,
  Phone,
  User,
  Shield,
  Loader2,
  AlertCircle,
  Archive,
  RefreshCw,
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

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const STATUS_OPTIONS: ('Active' | 'Inactive' | 'Archived')[] = ['Active', 'Inactive', 'Archived'];

export default function CareCellsAdminPage() {
  const [cells, setCells] = useState<CareCellRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive' | 'Archived'>('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit / Add Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<CareCellRecord | null>(null);

  // Form Fields (Exact Mobile Parity with CareCellFormModal.tsx)
  const [formName, setFormName] = useState('');
  const [formCellCode, setFormCellCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formMeetingLocation, setFormMeetingLocation] = useState('');
  const [formLeaderName, setFormLeaderName] = useState('');
  const [formLeaderPhone, setFormLeaderPhone] = useState('');
  const [formAssistantName, setFormAssistantName] = useState('');
  const [formAssistantPhone, setFormAssistantPhone] = useState('');
  const [formMeetingDay, setFormMeetingDay] = useState('Friday');
  const [formMeetingTime, setFormMeetingTime] = useState('19:00');
  const [formMeetingEndTime, setFormMeetingEndTime] = useState('20:30');
  const [formMaxMembers, setFormMaxMembers] = useState(20);
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive' | 'Archived'>('Active');
  const [saving, setSaving] = useState(false);

  // Real-time Firestore subscription to canonical church collection
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
            meetingLocation: data.meetingLocation || data.hostAddress || data.location || 'Church Venue',
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
            maximumMembers: data.maximumMembers || data.capacityMax || 20,
            activeMemberCount: data.activeMemberCount || 0,
            status: (data.status === 'Inactive' ? 'Inactive' : data.status === 'Archived' ? 'Archived' : 'Active'),
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

  // Total enrolled members count
  const totalAssignedMembers = useMemo(() => {
    return cells.reduce((acc, c) => acc + (c.activeMemberCount || 0), 0);
  }, [cells]);

  // Filtered Care Cells
  const filteredCells = useMemo(() => {
    return cells.filter((c) => {
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
  }, [cells, searchQuery, statusFilter]);

  const openCreateModal = () => {
    setEditingCell(null);
    setFormName('');
    // Auto-generate next code: Rhema_CareCell-00X
    const nextNum = cells.length + 1;
    setFormCellCode(`Rhema_CareCell-${String(nextNum).padStart(3, '0')}`);
    setFormDescription('');
    setFormLocation('');
    setFormMeetingLocation('');
    setFormLeaderName('');
    setFormLeaderPhone('');
    setFormAssistantName('');
    setFormAssistantPhone('');
    setFormMeetingDay('Friday');
    setFormMeetingTime('19:00');
    setFormMeetingEndTime('20:30');
    setFormMaxMembers(20);
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
    setFormLeaderName(cell.leaderName);
    setFormLeaderPhone(cell.leaderPhone);
    setFormAssistantName(cell.assistantLeaderName || '');
    setFormAssistantPhone(cell.assistantLeaderPhone || '');
    setFormMeetingDay(cell.meetingDay);
    setFormMeetingTime(cell.meetingTime);
    setFormMeetingEndTime(cell.meetingEndTime || '20:30');
    setFormMaxMembers(cell.maximumMembers);
    setFormStatus(cell.status);
    setModalOpen(true);
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
          leaderName: formLeaderName.trim(),
          leaderPhone: formLeaderPhone.trim(),
          assistantLeaderName: formAssistantName.trim() || null,
          assistantLeaderPhone: formAssistantPhone.trim() || null,
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
          leaderName: formLeaderName.trim(),
          leaderPhone: formLeaderPhone.trim(),
          assistantLeaderName: formAssistantName.trim() || null,
          assistantLeaderPhone: formAssistantPhone.trim() || null,
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

  const handleToggleStatus = async (cell: CareCellRecord) => {
    const nextStatus = cell.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const docRef = doc(db, 'Rhema Church', 'rhema', 'careCells', cell.id);
      await updateDoc(docRef, {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      showToast(`Care Cell marked as ${nextStatus}.`);
    } catch (err: any) {
      console.error('[CareCellsAdminPage] Error toggling status:', err);
      showToast('Error updating status.');
    }
  };

  const handleDeleteCell = async (cell: CareCellRecord) => {
    if (confirm(`Permanently delete care cell "${cell.name}" (${cell.cellCode})? This action cannot be undone.`)) {
      try {
        await deleteDoc(doc(db, 'Rhema Church', 'rhema', 'careCells', cell.id));
        showToast(`Care Cell "${cell.name}" deleted.`);
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

  return (
    <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
      <AdminNavigationShell>
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  M37 · Ministry Operations
                </span>
                <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Firestore
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mt-1">Care Cells Management</h1>
              <p className="text-sm text-slate-600">
                Organize fellowship care groups, assign cell leaders, track venues, and manage member participation.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={openCreateModal}
                className="bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Care Cell
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

          {/* 4 Summary KPI Cards (Matching Mobile CareCellsOverviewTab) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Care Cells */}
            <div
              onClick={() => setStatusFilter('All')}
              className={`p-5 rounded-2xl border transition-all cursor-pointer bg-blue-50/50 hover:bg-blue-50 border-blue-200 ${
                statusFilter === 'All' ? 'ring-2 ring-blue-600 shadow-sm' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Total Care Cells</span>
                <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-blue-900 mt-2">{statusCounts.All}</div>
              <p className="text-xs text-blue-700/80 mt-1">
                {statusCounts.Active} active · {statusCounts.Inactive} inactive
              </p>
            </div>

            {/* Active Care Cells */}
            <div
              onClick={() => setStatusFilter('Active')}
              className={`p-5 rounded-2xl border transition-all cursor-pointer bg-emerald-50/50 hover:bg-emerald-50 border-emerald-200 ${
                statusFilter === 'Active' ? 'ring-2 ring-emerald-600 shadow-sm' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Active Care Cells</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-emerald-900 mt-2">{statusCounts.Active}</div>
              <p className="text-xs text-emerald-700/80 mt-1">Active fellowship groups</p>
            </div>

            {/* Inactive Care Cells */}
            <div
              onClick={() => setStatusFilter('Inactive')}
              className={`p-5 rounded-2xl border transition-all cursor-pointer bg-amber-50/50 hover:bg-amber-50 border-amber-200 ${
                statusFilter === 'Inactive' ? 'ring-2 ring-amber-600 shadow-sm' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Inactive Care Cells</span>
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                  <Archive className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-amber-900 mt-2">{statusCounts.Inactive}</div>
              <p className="text-xs text-amber-700/80 mt-1">Paused or archived</p>
            </div>

            {/* Cell Leaders */}
            <div
              className="p-5 rounded-2xl border transition-all bg-purple-50/50 border-purple-200"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Cell Leaders</span>
                <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
                  <UserCheck className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-purple-900 mt-2">{totalLeadersCount}</div>
              <p className="text-xs text-purple-700/80 mt-1">Assigned fellowship leaders</p>
            </div>
          </div>

          {/* Filter Pills & Search Bar (Matching Mobile CareCellsManageTab) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            {/* Status Tabs */}
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

            {/* Search Input */}
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

          {/* Care Cells Grid */}
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
                  ? 'No care cells match your current search or filter criteria.'
                  : 'Start by creating your first care cell fellowship group.'}
              </p>
              <Button onClick={openCreateModal} className="mt-4 bg-slate-900 hover:bg-slate-800 text-white text-xs">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Create New Care Cell
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

                      {/* Name & Description */}
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
                              capacityPercent > 90 ? 'bg-rose-500' : capacityPercent > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${capacityPercent}%` }}
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
                          onClick={() => handleToggleStatus(cell)}
                          className={`h-8 px-2.5 text-xs border ${
                            isActive
                              ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200'
                              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                          }`}
                        >
                          {isActive ? 'Pause' : 'Activate'}
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

          {/* Add / Edit Care Cell Modal (100% Mobile Parity) */}
          {modalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        {editingCell ? 'Edit Care Cell' : 'Create New Care Cell'}
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

                <form onSubmit={handleSaveCell} className="mt-5 space-y-4">
                  {/* Row: Name & Code */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Care Cell Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Boys Care Cell / North Gate"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Cell Code *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rhema_CareCell-001"
                        value={formCellCode}
                        onChange={(e) => setFormCellCode(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm font-mono border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Locality & Address */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Locality / Area *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Koilakuntla / Hebbal"
                        value={formLocation}
                        onChange={(e) => setFormLocation(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Meeting Venue / Address
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Flat 302, Green Valley Apartments"
                        value={formMeetingLocation}
                        onChange={(e) => setFormMeetingLocation(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Cell Leader Information */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      Care Cell Leader (Primary)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Leader Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Rajesh Yeddula"
                          value={formLeaderName}
                          onChange={(e) => setFormLeaderName(e.target.value)}
                          className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Leader Phone (WhatsApp) *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. +91 99485 10783"
                          value={formLeaderPhone}
                          onChange={(e) => setFormLeaderPhone(e.target.value)}
                          className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Assistant Leader Information (Optional) */}
                  <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/60 space-y-3">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                      Assistant Leader (Optional)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Assistant Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. John Doe"
                          value={formAssistantName}
                          onChange={(e) => setFormAssistantName(e.target.value)}
                          className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Assistant Phone
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. +91 98455 12345"
                          value={formAssistantPhone}
                          onChange={(e) => setFormAssistantPhone(e.target.value)}
                          className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Gathering Schedule: Day & Times */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Meeting Day
                      </label>
                      <select
                        value={formMeetingDay}
                        onChange={(e) => setFormMeetingDay(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                      >
                        {DAYS_OF_WEEK.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Start Time
                      </label>
                      <input
                        type="text"
                        placeholder="19:00"
                        value={formMeetingTime}
                        onChange={(e) => setFormMeetingTime(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        End Time
                      </label>
                      <input
                        type="text"
                        placeholder="20:30"
                        value={formMeetingEndTime}
                        onChange={(e) => setFormMeetingEndTime(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Capacity & Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Max Capacity
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="200"
                        value={formMaxMembers}
                        onChange={(e) => setFormMaxMembers(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Status
                      </label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as any)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                      >
                        {STATUS_OPTIONS.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Description / Fellowship Focus
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Weekly youth prayer, fellowship, and scripture meditation."
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setModalOpen(false)}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={saving}
                      className="bg-slate-900 hover:bg-slate-800 text-white min-w-[120px]"
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
                </form>
              </div>
            </div>
          )}
        </div>
      </AdminNavigationShell>
    </ProtectedRoute>
  );
}
