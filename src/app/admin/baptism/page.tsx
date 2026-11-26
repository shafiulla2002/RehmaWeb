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
  Droplets,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Award,
  Calendar,
  MapPin,
  Phone,
  User,
  Plus,
  X,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
} from 'lucide-react';

export type BaptismStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'completed';

export interface BaptismRecord {
  id: string;
  memberName: string;
  candidateName?: string;
  memberPhone: string;
  phoneMasked?: string;
  email?: string;
  age?: number;
  gender?: string;
  address?: string;
  preferredDate?: string;
  status: BaptismStatus;
  previousBaptism?: boolean;
  reason?: string;
  testimony?: string;
  personalTestimonySnippet?: string;
  additionalNotes?: string;
  confirmedDate?: string;
  confirmedTime?: string;
  confirmedLocation?: string;
  adminRemarks?: string;
  counselorAssigned?: string;
  certificateIssued?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export default function BaptismAdminPage() {
  const [requests, setRequests] = useState<BaptismRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | BaptismStatus>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Detail / Status Update Modal State (Exact Mobile Parity with AdminBaptism.tsx)
  const [selectedRequest, setSelectedRequest] = useState<BaptismRecord | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editStatus, setEditStatus] = useState<BaptismStatus>('pending');
  const [adminRemarks, setAdminRemarks] = useState('');
  const [confirmedDate, setConfirmedDate] = useState('');
  const [confirmedTime, setConfirmedTime] = useState('');
  const [confirmedLocation, setConfirmedLocation] = useState('');
  const [savingAction, setSavingAction] = useState(false);

  // Add Candidate Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAge, setNewAge] = useState<number>(24);
  const [newGender, setNewGender] = useState<'Male' | 'Female'>('Male');
  const [newAddress, setNewAddress] = useState('');
  const [newPreferredDate, setNewPreferredDate] = useState('');
  const [newPreviousBaptism, setNewPreviousBaptism] = useState<boolean>(false);
  const [newReason, setNewReason] = useState('');
  const [newAdditionalNotes, setNewAdditionalNotes] = useState('');
  const [addingCandidate, setAddingCandidate] = useState(false);

  // Real-time Firestore subscription to canonical church collection
  useEffect(() => {
    const colRef = collection(db, 'Rhema Church', 'rhema', 'baptism_requests');
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const loaded: BaptismRecord[] = snapshot.docs.map((d) => {
          const data = d.data();
          const rawStatus = data.status || 'pending';
          const normalizedStatus: BaptismStatus =
            rawStatus === 'approved'
              ? 'approved'
              : rawStatus === 'completed'
              ? 'completed'
              : rawStatus === 'rejected'
              ? 'rejected'
              : rawStatus === 'under_review'
              ? 'under_review'
              : 'pending';

          return {
            id: d.id,
            memberName: data.memberName || data.candidateName || 'Candidate',
            candidateName: data.candidateName || data.memberName || 'Candidate',
            memberPhone: data.memberPhone || data.phoneMasked || '',
            phoneMasked: data.phoneMasked || data.memberPhone || '',
            email: data.email || '',
            age: data.age || 20,
            gender: data.gender || '',
            address: data.address || data.zone || '',
            preferredDate: data.preferredDate || '',
            status: normalizedStatus,
            previousBaptism: Boolean(data.previousBaptism),
            reason: data.reason || data.testimony || data.personalTestimonySnippet || '',
            testimony: data.testimony || data.reason || '',
            additionalNotes: data.additionalNotes || '',
            confirmedDate: data.confirmedDate || data.scheduledBaptismDate || '',
            confirmedTime: data.confirmedTime || '10:30 AM',
            confirmedLocation: data.confirmedLocation || 'Main Sanctuary Baptistry',
            adminRemarks: data.adminRemarks || '',
            counselorAssigned: data.counselorAssigned || '',
            certificateIssued: Boolean(data.certificateIssued),
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        });
        setRequests(loaded);
        setLoading(false);
      },
      (err) => {
        console.error('[BaptismAdminPage] Firestore subscription error:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Statistics (Matching Mobile stats)
  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((r) => r.status === 'pending').length;
    const underReview = requests.filter((r) => r.status === 'under_review').length;
    const approved = requests.filter((r) => r.status === 'approved').length;
    const completed = requests.filter((r) => r.status === 'completed').length;
    const rejected = requests.filter((r) => r.status === 'rejected').length;
    return { total, pending, underReview, approved, completed, rejected };
  }, [requests]);

  // Filtered List
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const q = searchQuery.trim().toLowerCase();
      const nameMatch = (req.memberName || '').toLowerCase().includes(q);
      const phoneMatch = (req.memberPhone || '').includes(q);
      const addressMatch = (req.address || '').toLowerCase().includes(q);
      const matchesSearch = !q || nameMatch || phoneMatch || addressMatch;
      const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [requests, searchQuery, statusFilter]);

  const getInitials = (name?: string) => {
    if (!name) return 'B';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Status Badge Helper (Exact Mobile Parity: getStatusBadge)
  const getStatusBadge = (status: BaptismStatus) => {
    switch (status) {
      case 'approved':
        return {
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          text: 'text-emerald-700',
          label: 'Approved',
          icon: CheckCircle2,
        };
      case 'completed':
        return {
          bg: 'bg-indigo-50',
          border: 'border-indigo-200',
          text: 'text-indigo-700',
          label: 'Completed',
          icon: Award,
        };
      case 'under_review':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-700',
          label: 'Under Review',
          icon: AlertCircle,
        };
      case 'rejected':
        return {
          bg: 'bg-rose-50',
          border: 'border-rose-200',
          text: 'text-rose-700',
          label: 'Declined',
          icon: XCircle,
        };
      case 'pending':
      default:
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-700',
          label: 'Pending',
          icon: Clock,
        };
    }
  };

  const openRequestDetail = (req: BaptismRecord) => {
    setSelectedRequest(req);
    setEditStatus(req.status || 'pending');
    setAdminRemarks(req.adminRemarks || '');
    setConfirmedDate(req.confirmedDate || req.preferredDate || '');
    setConfirmedTime(req.confirmedTime || '10:30 AM');
    setConfirmedLocation(req.confirmedLocation || 'Main Sanctuary Baptistry');
    setDetailModalOpen(true);
  };

  const handleSaveAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    if (editStatus === 'approved' && !confirmedDate) {
      showToast('Please confirm the scheduled baptism date before approving.');
      return;
    }

    setSavingAction(true);
    try {
      const docRef = doc(db, 'Rhema Church', 'rhema', 'baptism_requests', selectedRequest.id);
      await updateDoc(docRef, {
        status: editStatus,
        adminRemarks: adminRemarks.trim(),
        confirmedDate: editStatus === 'approved' || editStatus === 'completed' ? confirmedDate : '',
        confirmedTime: editStatus === 'approved' || editStatus === 'completed' ? confirmedTime : '',
        confirmedLocation: editStatus === 'approved' || editStatus === 'completed' ? confirmedLocation.trim() : '',
        updatedAt: serverTimestamp(),
      });
      showToast(`Baptism request updated to ${editStatus.toUpperCase().replace('_', ' ')}.`);
      setDetailModalOpen(false);
    } catch (err: any) {
      console.error('[BaptismAdminPage] Update error:', err);
      showToast(err.message || 'Error updating request.');
    } finally {
      setSavingAction(false);
    }
  };

  const handleDeleteRequest = async (req: BaptismRecord) => {
    if (confirm(`Are you sure you want to delete the baptism request for ${req.memberName}? This cannot be undone.`)) {
      try {
        await deleteDoc(doc(db, 'Rhema Church', 'rhema', 'baptism_requests', req.id));
        showToast(`Baptism request for ${req.memberName} deleted.`);
      } catch (err: any) {
        console.error('[BaptismAdminPage] Delete error:', err);
        showToast('Error deleting request.');
      }
    }
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) {
      showToast('Please provide candidate name and contact phone.');
      return;
    }

    setAddingCandidate(true);
    try {
      const colRef = collection(db, 'Rhema Church', 'rhema', 'baptism_requests');
      await addDoc(colRef, {
        memberName: newName.trim(),
        candidateName: newName.trim(),
        memberPhone: newPhone.trim(),
        phoneMasked: newPhone.trim(),
        email: newEmail.trim() || '',
        age: Number(newAge) || 20,
        gender: newGender,
        address: newAddress.trim(),
        preferredDate: newPreferredDate.trim(),
        previousBaptism: newPreviousBaptism,
        reason: newReason.trim(),
        testimony: newReason.trim(),
        additionalNotes: newAdditionalNotes.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      showToast(`Baptism candidate "${newName}" added successfully.`);
      setAddModalOpen(false);
    } catch (err: any) {
      console.error('[BaptismAdminPage] Add candidate error:', err);
      showToast(err.message || 'Error adding candidate.');
    } finally {
      setAddingCandidate(false);
    }
  };

  return (
    <ProtectedRoute>
      <AdminNavigationShell>
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  M38 · Ministry Operations
                </span>
                <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Firestore
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mt-1">Baptism Requests & Registry</h1>
              <p className="text-sm text-slate-600">
                Review water baptism applications, schedule pastoral counseling interviews, and track baptism services.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setAddModalOpen(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Candidate
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

          {/* 6 Summary KPI Cards (Matching Mobile statFilters) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {/* All */}
            <div
              onClick={() => setStatusFilter('all')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer bg-slate-50/70 hover:bg-slate-100 border-slate-200 ${
                statusFilter === 'all' ? 'ring-2 ring-slate-800 shadow-sm' : ''
              }`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">All</span>
              <div className="text-2xl font-extrabold text-slate-900 mt-1.5">{stats.total}</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Total roster</p>
            </div>

            {/* Pending */}
            <div
              onClick={() => setStatusFilter('pending')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer bg-amber-50/70 hover:bg-amber-100/70 border-amber-200 ${
                statusFilter === 'pending' ? 'ring-2 ring-amber-600 shadow-sm' : ''
              }`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Pending</span>
              <div className="text-2xl font-extrabold text-amber-900 mt-1.5">{stats.pending}</div>
              <p className="text-[11px] text-amber-700/80 mt-0.5">Needs review</p>
            </div>

            {/* Under Review */}
            <div
              onClick={() => setStatusFilter('under_review')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer bg-blue-50/70 hover:bg-blue-100/70 border-blue-200 ${
                statusFilter === 'under_review' ? 'ring-2 ring-blue-600 shadow-sm' : ''
              }`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Review</span>
              <div className="text-2xl font-extrabold text-blue-900 mt-1.5">{stats.underReview}</div>
              <p className="text-[11px] text-blue-700/80 mt-0.5">Interviewing</p>
            </div>

            {/* Approved */}
            <div
              onClick={() => setStatusFilter('approved')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer bg-emerald-50/70 hover:bg-emerald-100/70 border-emerald-200 ${
                statusFilter === 'approved' ? 'ring-2 ring-emerald-600 shadow-sm' : ''
              }`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Approved</span>
              <div className="text-2xl font-extrabold text-emerald-900 mt-1.5">{stats.approved}</div>
              <p className="text-[11px] text-emerald-700/80 mt-0.5">Scheduled</p>
            </div>

            {/* Completed */}
            <div
              onClick={() => setStatusFilter('completed')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer bg-indigo-50/70 hover:bg-indigo-100/70 border-indigo-200 ${
                statusFilter === 'completed' ? 'ring-2 ring-indigo-600 shadow-sm' : ''
              }`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Completed</span>
              <div className="text-2xl font-extrabold text-indigo-900 mt-1.5">{stats.completed}</div>
              <p className="text-[11px] text-indigo-700/80 mt-0.5">Baptized</p>
            </div>

            {/* Declined */}
            <div
              onClick={() => setStatusFilter('rejected')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer bg-rose-50/70 hover:bg-rose-100/70 border-rose-200 ${
                statusFilter === 'rejected' ? 'ring-2 ring-rose-600 shadow-sm' : ''
              }`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Declined</span>
              <div className="text-2xl font-extrabold text-rose-900 mt-1.5">{stats.rejected}</div>
              <p className="text-[11px] text-rose-700/80 mt-0.5">Not approved</p>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(
                [
                  { key: 'all', label: 'All' },
                  { key: 'pending', label: 'Pending' },
                  { key: 'under_review', label: 'Under Review' },
                  { key: 'approved', label: 'Approved' },
                  { key: 'completed', label: 'Completed' },
                  { key: 'rejected', label: 'Declined' },
                ] as const
              ).map((tab) => {
                const isActive = statusFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by member name, mobile, address..."
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

          {/* Request Cards List */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
              <p className="text-sm">Loading baptism requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-300 p-8">
              <Droplets className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Baptism Requests Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                {searchQuery || statusFilter !== 'all'
                  ? 'No baptism requests match the filter criteria.'
                  : 'No baptism applications have been submitted yet.'}
              </p>
              <Button onClick={() => setAddModalOpen(true)} className="mt-4 bg-slate-900 hover:bg-slate-800 text-white text-xs">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Baptism Candidate
              </Button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredRequests.map((req) => {
                const isExpanded = expandedId === req.id;
                const badge = getStatusBadge(req.status);
                const BadgeIcon = badge.icon;
                const initials = getInitials(req.memberName);
                const isScheduled = (req.status === 'approved' || req.status === 'completed') && Boolean(req.confirmedDate);

                return (
                  <div
                    key={req.id}
                    className={`bg-white rounded-2xl border transition-all duration-200 shadow-sm overflow-hidden ${
                      isExpanded ? 'border-amber-400 ring-1 ring-amber-400' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Card Summary Header */}
                    <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      {/* Left: Avatar + Name + Locality + Badge */}
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <div className="w-11 h-11 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900 truncate">{req.memberName}</h3>
                            <span
                              className={`text-xs font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1 ${badge.bg} ${badge.text} ${badge.border}`}
                            >
                              <BadgeIcon className="w-3 h-3" />
                              {badge.label}
                            </span>
                            <span className="text-xs font-medium text-slate-500">
                              • {req.previousBaptism ? 'Previous Baptism' : 'First Time'}
                            </span>
                          </div>

                          {req.address && (
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              {req.address}
                            </p>
                          )}

                          {/* Contact Details Row */}
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-600">
                            {req.memberPhone && (
                              <a
                                href={`tel:${req.memberPhone.replace(/[^0-9+]/g, '')}`}
                                className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                              >
                                <Phone className="w-3 h-3" />
                                {req.memberPhone}
                              </a>
                            )}
                            {req.preferredDate && (
                              <span className="flex items-center gap-1 text-slate-500">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                Pref: {req.preferredDate}
                              </span>
                            )}
                            {(req.gender || req.age) && (
                              <span className="flex items-center gap-1 text-slate-500">
                                <User className="w-3 h-3 text-slate-400" />
                                {req.gender ? req.gender : ''}
                                {req.gender && req.age ? ' • ' : ''}
                                {req.age ? `${req.age} yrs` : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <Button
                          variant="secondary"
                          onClick={() => openRequestDetail(req)}
                          className="h-8 px-3 text-xs flex items-center gap-1.5 border border-slate-200 hover:bg-slate-100"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Review / Update
                        </Button>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : req.id)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                          title="Toggle Details"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDeleteRequest(req)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Request"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Scheduled Pill Banner (if approved/completed and scheduled) */}
                    {isScheduled && (
                      <div className="mx-4 sm:mx-5 mb-3 px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-medium text-emerald-800">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          <strong>Scheduled Baptism:</strong> {req.confirmedDate}{' '}
                          {req.confirmedTime ? `@ ${req.confirmedTime}` : ''}{' '}
                          {req.confirmedLocation ? `(${req.confirmedLocation})` : ''}
                        </span>
                      </div>
                    )}

                    {/* In-Place Expanded Content (Exact Mobile Parity) */}
                    {isExpanded && (
                      <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-slate-100 bg-slate-50/50 space-y-3">
                        {/* Testimony / Reason */}
                        {req.reason && (
                          <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                              Reason / Testimony for Baptism:
                            </span>
                            <p className="text-xs text-slate-800 italic">"{req.reason}"</p>
                          </div>
                        )}

                        {/* Candidate Notes */}
                        {req.additionalNotes && (
                          <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                              Candidate Notes:
                            </span>
                            <p className="text-xs text-slate-800">{req.additionalNotes}</p>
                          </div>
                        )}

                        {/* Pastoral Remarks */}
                        {req.adminRemarks && (
                          <div className="bg-blue-50/80 p-3.5 rounded-xl border border-blue-200">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 block mb-1">
                              Pastoral / Admin Remarks:
                            </span>
                            <p className="text-xs text-blue-900">{req.adminRemarks}</p>
                          </div>
                        )}

                        {/* Quick Action Button */}
                        <div className="pt-2 flex justify-end">
                          <Button
                            onClick={() => openRequestDetail(req)}
                            className="bg-slate-900 hover:bg-slate-800 text-white text-xs"
                          >
                            <Edit2 className="w-3 h-3 mr-1.5" />
                            Update Status & Schedule
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Review / Status Update Modal (Exact Mobile Parity) */}
          {detailModalOpen && selectedRequest && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Droplets className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Baptism Pastoral Counseling</h2>
                      <p className="text-xs text-slate-500">
                        {selectedRequest.memberName} · {selectedRequest.memberPhone || 'No Phone'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDetailModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveAction} className="mt-5 space-y-4">
                  {/* Status Selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Baptism Stage / Status *
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as BaptismStatus)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-semibold"
                    >
                      <option value="pending">Pending Review (Waiting for pastoral contact)</option>
                      <option value="under_review">Under Review (Pastoral interview scheduled)</option>
                      <option value="approved">Approved (Scheduled for baptism service)</option>
                      <option value="completed">Completed (Baptism ceremony concluded)</option>
                      <option value="rejected">Declined (Needs more preparation / spiritual counseling)</option>
                    </select>
                  </div>

                  {/* Conditional Schedule Fields (if Approved or Completed) */}
                  {(editStatus === 'approved' || editStatus === 'completed') && (
                    <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                      <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        Baptism Service Schedule
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-emerald-800 mb-1">
                            Confirmed Date *
                          </label>
                          <input
                            type="date"
                            required
                            value={confirmedDate}
                            onChange={(e) => setConfirmedDate(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm bg-white border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-emerald-800 mb-1">
                            Confirmed Time
                          </label>
                          <input
                            type="text"
                            placeholder="10:30 AM"
                            value={confirmedTime}
                            onChange={(e) => setConfirmedTime(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm bg-white border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-emerald-800 mb-1">
                          Service Location
                        </label>
                        <input
                          type="text"
                          placeholder="Main Sanctuary Baptistry"
                          value={confirmedLocation}
                          onChange={(e) => setConfirmedLocation(e.target.value)}
                          className="w-full px-3 py-1.5 text-sm bg-white border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Pastoral Remarks */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Pastoral Remarks / Counseling Notes
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Enter notes on candidate's faith confession, salvation assurance, and pastoral interview outcome."
                      value={adminRemarks}
                      onChange={(e) => setAdminRemarks(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setDetailModalOpen(false)}
                      disabled={savingAction}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={savingAction}
                      className="bg-slate-900 hover:bg-slate-800 text-white min-w-[120px]"
                    >
                      {savingAction ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      ) : (
                        'Save Decision'
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Add Candidate Modal */}
          {addModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Droplets className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Add Baptism Candidate</h2>
                      <p className="text-xs text-slate-500">Record a new water baptism application</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAddModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleAddCandidate} className="mt-5 space-y-4">
                  {/* Full Name & Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Candidate Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Samuel Kumar"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Contact Phone *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. +91 99003 12345"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Age, Gender & Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Age
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="120"
                        value={newAge}
                        onChange={(e) => setNewAge(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Gender
                      </label>
                      <select
                        value={newGender}
                        onChange={(e) => setNewGender(e.target.value as any)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Preferred Date
                      </label>
                      <input
                        type="date"
                        value={newPreferredDate}
                        onChange={(e) => setNewPreferredDate(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Residential Address / Locality
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Koilakuntla Central Area"
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Previous Baptism Checkbox */}
                  <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <input
                      type="checkbox"
                      id="prevBap"
                      checked={newPreviousBaptism}
                      onChange={(e) => setNewPreviousBaptism(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <label htmlFor="prevBap" className="text-xs font-semibold text-slate-800 cursor-pointer">
                      Candidate has received previous water baptism in another church/denomination
                    </label>
                  </div>

                  {/* Personal Testimony */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Reason / Personal Testimony for Baptism
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Brief personal testimony or salvation experience..."
                      value={newReason}
                      onChange={(e) => setNewReason(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Additional Notes */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Additional Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Any health considerations, immersion preferences, or pastoral remarks..."
                      value={newAdditionalNotes}
                      onChange={(e) => setNewAdditionalNotes(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setAddModalOpen(false)}
                      disabled={addingCandidate}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={addingCandidate}
                      className="bg-slate-900 hover:bg-slate-800 text-white min-w-[120px]"
                    >
                      {addingCandidate ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      ) : (
                        'Save Candidate'
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
