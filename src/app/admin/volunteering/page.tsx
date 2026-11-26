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
  HeartHandshake,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
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
  Briefcase,
  Layers,
  Sparkles,
  Megaphone,
  Send,
  Music,
  Video,
  Users,
  Utensils,
  Flame,
  Car,
  Check,
} from 'lucide-react';

export type VolunteerType = 'general' | 'event';
export type VolunteerStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';

export interface VolunteerRecord {
  id: string;
  memberName: string;
  volunteerName?: string;
  memberPhone: string;
  phoneMasked?: string;
  memberEmail?: string;
  volunteerType: VolunteerType;
  status: VolunteerStatus;
  preferredMinistries?: string[];
  skills?: string[];
  availabilityNotes?: string;
  availability?: string;
  eventId?: string;
  eventTitle?: string;
  eventDate?: string;
  eventTime?: string;
  eventLocation?: string;
  preferredRole?: string;
  assignedRole?: string;
  assignedDate?: string;
  assignedTimeSlot?: string;
  assignedLocation?: string;
  assignedResponsibility?: string;
  rejectionReason?: string;
  adminNotes?: string;
  createdAt?: any;
  updatedAt?: any;
}

const MINISTRY_OPTIONS = [
  {
    id: 'worship',
    name: 'Worship & Choir',
    teName: 'ఆరాధన బృందం',
    icon: Music,
    iconBg: 'bg-amber-100 text-amber-700',
  },
  {
    id: 'media',
    name: 'Media & Sound / Tech',
    teName: 'మీడియా & సౌండ్',
    icon: Video,
    iconBg: 'bg-blue-100 text-blue-700',
  },
  {
    id: 'ushers',
    name: 'Ushers & Greeters',
    teName: 'ఆహ్వాన బృందం',
    icon: Users,
    iconBg: 'bg-emerald-100 text-emerald-700',
  },
  {
    id: 'kids',
    name: 'Sunday School & Kids',
    teName: 'సండే స్కూల్',
    icon: Sparkles,
    iconBg: 'bg-purple-100 text-purple-700',
  },
  {
    id: 'hospitality',
    name: 'Hospitality & Food',
    teName: 'ఆతిథ్య సేవ',
    icon: Utensils,
    iconBg: 'bg-orange-100 text-orange-700',
  },
  {
    id: 'prayer',
    name: 'Intercessory Prayer',
    teName: 'విజ్ఞాపన ప్రార్థన',
    icon: Flame,
    iconBg: 'bg-rose-100 text-rose-700',
  },
  {
    id: 'stage',
    name: 'Stage & Campus Setup',
    teName: 'ఏర్పాట్లు',
    icon: Layers,
    iconBg: 'bg-slate-100 text-slate-700',
  },
  {
    id: 'transport',
    name: 'Transport & Parking',
    teName: 'పార్కింగ్',
    icon: Car,
    iconBg: 'bg-teal-100 text-teal-700',
  },
];

const COMMON_MINISTRIES = [
  'Worship & Choir · ఆరాధన బృందం',
  'Media & Sound / Tech · మీడియా & సౌండ్',
  'Ushers & Greeters · ఆహ్వాన బృందం',
  'Sunday School & Kids · సండే స్కూల్',
  'Hospitality & Food · ఆతిథ్య సేవ',
  'Intercessory Prayer · విజ్ఞాపన ప్రార్థన',
  'Stage & Campus Setup · ఏర్పాట్లు',
  'Transport & Parking · పార్కింగ్',
];

const COMMON_EVENT_ROLES = [
  'Ushering & Welcome',
  'Sound & Audio Engineer',
  'Video & Live Stream',
  'Stage Setup & Logistics',
  'Registration & Attendance Desk',
  'Parking & Traffic Control',
  'Refreshments & Hospitality',
  'First Aid & Safety Support',
  'Prayer Team Support',
];

export default function VolunteerManagementAdminPage() {
  const [applications, setApplications] = useState<VolunteerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSegment, setActiveSegment] = useState<VolunteerType>('general');
  const [statusFilter, setStatusFilter] = useState<'all' | VolunteerStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected Application for Approval / Assignment Modals
  const [selectedApp, setSelectedApp] = useState<VolunteerRecord | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Duty Assignment Form State (Exact Mobile Parity)
  const [assignedRole, setAssignedRole] = useState('');
  const [assignedTimeSlot, setAssignedTimeSlot] = useState('');
  const [assignedLocation, setAssignedLocation] = useState('');
  const [assignedResponsibility, setAssignedResponsibility] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Post General Volunteer Call to Members Modal State (Exact Mobile Parity: media_1795699919490_0ab77314.jpg)
  const [showPostCallModal, setShowPostCallModal] = useState(false);
  const [callTitle, setCallTitle] = useState('');
  const [callDescription, setCallDescription] = useState('');
  const [callSlotsNeeded, setCallSlotsNeeded] = useState('Open / Any');
  const [customSlots, setCustomSlots] = useState('');
  const [callMinistries, setCallMinistries] = useState<string[]>(['Worship & Choir', 'Media & Sound / Tech']);
  const [postingCall, setPostingCall] = useState(false);

  const handleOpenPostCallModal = () => {
    setCallTitle('');
    setCallDescription('');
    setCallSlotsNeeded('Open / Any');
    setCustomSlots('');
    setCallMinistries(['Worship & Choir', 'Media & Sound / Tech']);
    setShowPostCallModal(true);
  };

  // Real-time Firestore subscription to canonical church collection
  useEffect(() => {
    const colRef = collection(db, 'Rhema Church', 'rhema', 'volunteer_applications');
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const loaded: VolunteerRecord[] = snapshot.docs.map((d) => {
          const data = d.data();
          const rawStatus = data.status || 'pending';
          const normalizedStatus: VolunteerStatus =
            rawStatus === 'approved' || rawStatus === 'Active Volunteer (Sim)'
              ? 'approved'
              : rawStatus === 'rejected'
              ? 'rejected'
              : rawStatus === 'withdrawn'
              ? 'withdrawn'
              : 'pending';

          const inferredType: VolunteerType =
            data.volunteerType === 'event' || Boolean(data.eventId || data.eventTitle)
              ? 'event'
              : 'general';

          return {
            id: d.id,
            memberName: data.memberName || data.volunteerName || 'Volunteer',
            volunteerName: data.volunteerName || data.memberName || 'Volunteer',
            memberPhone: data.memberPhone || data.phoneMasked || '',
            phoneMasked: data.phoneMasked || data.memberPhone || '',
            memberEmail: data.email || data.memberEmail || '',
            volunteerType: inferredType,
            status: normalizedStatus,
            preferredMinistries: Array.isArray(data.preferredMinistries)
              ? data.preferredMinistries
              : data.department
              ? [data.department]
              : [],
            skills: Array.isArray(data.skills) ? data.skills : [],
            availabilityNotes: data.availabilityNotes || data.availability || '',
            eventId: data.eventId || '',
            eventTitle: data.eventTitle || '',
            eventDate: data.eventDate || '',
            eventTime: data.eventTime || '',
            eventLocation: data.eventLocation || '',
            preferredRole: data.preferredRole || data.assignedServiceRole || '',
            assignedRole: data.assignedRole || data.assignedServiceRole || '',
            assignedDate: data.assignedDate || '',
            assignedTimeSlot: data.assignedTimeSlot || '',
            assignedLocation: data.assignedLocation || '',
            assignedResponsibility: data.assignedResponsibility || '',
            rejectionReason: data.rejectionReason || '',
            adminNotes: data.adminNotes || '',
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        });
        setApplications(loaded);
        setLoading(false);
      },
      (err) => {
        console.error('[VolunteerAdminPage] Firestore subscription error:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Statistics (Exact Mobile Parity: stats with category breakdown)
  const stats = useMemo(() => {
    const total = applications.length;
    const generalTotal = applications.filter((a) => a.volunteerType === 'general').length;
    const eventTotal = applications.filter((a) => a.volunteerType === 'event').length;

    const activeList = applications.filter((a) => a.volunteerType === activeSegment);
    const categoryPending = activeList.filter((a) => a.status === 'pending').length;
    const categoryApproved = activeList.filter((a) => a.status === 'approved').length;
    const categoryRejected = activeList.filter((a) => a.status === 'rejected').length;

    return {
      total,
      generalTotal,
      eventTotal,
      categoryPending,
      categoryApproved,
      categoryRejected,
    };
  }, [applications, activeSegment]);

  // Filtered Applications for Active Segment
  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      if (app.volunteerType !== activeSegment) return false;
      if (statusFilter !== 'all' && app.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (app.memberName || '').toLowerCase().includes(q);
        const phoneMatch = (app.memberPhone || '').includes(q);
        const roleMatch = (app.preferredRole || app.assignedRole || '').toLowerCase().includes(q);
        const eventMatch = (app.eventTitle || '').toLowerCase().includes(q);
        const ministryMatch = (app.preferredMinistries || []).some((m) => m.toLowerCase().includes(q));
        if (!nameMatch && !phoneMatch && !roleMatch && !eventMatch && !ministryMatch) {
          return false;
        }
      }
      return true;
    });
  }, [applications, activeSegment, statusFilter, searchQuery]);

  const getInitials = (name?: string) => {
    if (!name) return 'V';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Status Badge Rendering (Exact Mobile Parity: renderStatusBadge)
  const renderStatusBadge = (status: VolunteerStatus) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            APPROVED
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3" />
            DECLINED
          </span>
        );
      case 'withdrawn':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <AlertCircle className="w-3 h-3" />
            WITHDRAWN
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" />
            PENDING
          </span>
        );
    }
  };

  const handleOpenApprove = (app: VolunteerRecord) => {
    setSelectedApp(app);
    if (app.volunteerType === 'event') {
      setAssignedRole(app.assignedRole || app.preferredRole || 'Event Volunteer');
      setAssignedTimeSlot(app.assignedTimeSlot || app.eventTime || '09:00 AM - 01:00 PM');
      setAssignedLocation(app.assignedLocation || app.eventLocation || 'Main Sanctuary');
      setAssignedResponsibility(app.assignedResponsibility || '');
      setShowApprovalModal(true);
    } else {
      if (confirm(`Approve general church volunteer application for ${app.memberName}?`)) {
        executeGeneralApproval(app.id, app.memberName);
      }
    }
  };

  const executeGeneralApproval = async (id: string, name: string) => {
    try {
      const docRef = doc(db, 'Rhema Church', 'rhema', 'volunteer_applications', id);
      await updateDoc(docRef, {
        status: 'approved',
        updatedAt: serverTimestamp(),
      });
      showToast(`Volunteer application for ${name} has been approved.`);
    } catch (err: any) {
      console.error('[VolunteerAdminPage] Approve error:', err);
      showToast('Failed to approve application.');
    }
  };

  const handleConfirmEventApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;

    setActionLoading(true);
    try {
      const docRef = doc(db, 'Rhema Church', 'rhema', 'volunteer_applications', selectedApp.id);
      await updateDoc(docRef, {
        status: 'approved',
        assignedRole: assignedRole.trim() || selectedApp.preferredRole || 'Event Volunteer',
        assignedTimeSlot: assignedTimeSlot.trim(),
        assignedLocation: assignedLocation.trim(),
        assignedResponsibility: assignedResponsibility.trim(),
        updatedAt: serverTimestamp(),
      });
      showToast(`Event volunteer ${selectedApp.memberName} approved and assigned.`);
      setShowApprovalModal(false);
    } catch (err: any) {
      console.error('[VolunteerAdminPage] Event approval error:', err);
      showToast('Failed to approve event volunteer.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenReject = (app: VolunteerRecord) => {
    setSelectedApp(app);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleConfirmRejection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;

    setActionLoading(true);
    try {
      const docRef = doc(db, 'Rhema Church', 'rhema', 'volunteer_applications', selectedApp.id);
      await updateDoc(docRef, {
        status: 'rejected',
        rejectionReason: rejectionReason.trim(),
        updatedAt: serverTimestamp(),
      });
      showToast(`Volunteer application for ${selectedApp.memberName} marked as declined.`);
      setShowRejectModal(false);
    } catch (err: any) {
      console.error('[VolunteerAdminPage] Rejection error:', err);
      showToast('Failed to decline application.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteApplication = async (app: VolunteerRecord) => {
    if (confirm(`Permanently delete volunteer application for ${app.memberName}? This cannot be undone.`)) {
      try {
        await deleteDoc(doc(db, 'Rhema Church', 'rhema', 'volunteer_applications', app.id));
        showToast(`Application for ${app.memberName} deleted.`);
      } catch (err: any) {
        console.error('[VolunteerAdminPage] Delete error:', err);
        showToast('Error deleting application.');
      }
    }
  };

  // Post General Volunteer Call to Members (Exact Mobile Parity: media_1795699919490_0ab77314.jpg)
  const handlePostVolunteerCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callTitle.trim()) {
      showToast('Please enter a Volunteer Call Title.');
      return;
    }
    if (callMinistries.length === 0) {
      showToast('Please select at least one ministry area.');
      return;
    }

    setPostingCall(true);
    try {
      const finalSlots = customSlots.trim() ? `${customSlots.trim()} Needed` : callSlotsNeeded;

      // 1. Save to volunteer_calls collection
      const callsCol = collection(db, 'Rhema Church', 'rhema', 'volunteer_calls');
      await addDoc(callsCol, {
        title: callTitle.trim(),
        description: callDescription.trim(),
        slotsNeeded: finalSlots,
        targetMinistries: callMinistries,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 2. Broadcast notification to congregation
      const notifCol = collection(db, 'Rhema Church', 'rhema', 'notifications');
      await addDoc(notifCol, {
        title: `Volunteer Call: ${callTitle.trim()}`,
        message: callDescription.trim() || `Volunteers needed (${finalSlots}) for: ${callMinistries.join(', ')}.`,
        type: 'volunteer_call',
        targetMinistries: callMinistries,
        slotsNeeded: finalSlots,
        createdAt: serverTimestamp(),
      });

      showToast('Volunteer Call published to church congregation.');
      setShowPostCallModal(false);
    } catch (err: any) {
      console.error('[VolunteerAdminPage] Post call error:', err);
      showToast('Failed to broadcast volunteer call.');
    } finally {
      setPostingCall(false);
    }
  };

  const toggleCallMinistry = (m: string) => {
    setCallMinistries((prev) =>
      prev.includes(m) ? prev.filter((item) => item !== m) : [...prev, m]
    );
  };

  return (
    <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
      <AdminNavigationShell>
        <div className="space-y-6 max-w-7xl mx-auto pb-16">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  M39 · Ministry Operations
                </span>
                <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Firestore
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mt-1">Volunteer Management</h1>
              <p className="text-sm text-slate-600">
                Review and assign church ministry volunteers, manage event duty rosters, and track availability.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Post General Volunteer Call to Members Button (Exact Mobile Parity Request) */}
              <Button
                onClick={handleOpenPostCallModal}
                className="bg-black hover:bg-slate-900 text-white rounded-full px-5 py-2 font-bold text-sm shadow-sm flex items-center gap-2"
              >
                <Megaphone className="w-4 h-4 text-emerald-400" />
                Post General Volunteer Call to Members
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

          {/* ── High-End Category Tabs: General Church vs Event Volunteers (Exact Mobile Parity) ── */}
          <div className="p-1.5 bg-white border border-slate-200 rounded-2xl shadow-sm inline-flex w-full sm:w-auto">
            <button
              onClick={() => {
                setActiveSegment('general');
                setStatusFilter('all');
              }}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2.5 ${
                activeSegment === 'general'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>General Church</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeSegment === 'general' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {stats.generalTotal}
              </span>
            </button>
            <button
              onClick={() => {
                setActiveSegment('event');
                setStatusFilter('all');
              }}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2.5 ${
                activeSegment === 'event'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>Event Volunteers</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeSegment === 'event' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {stats.eventTotal}
              </span>
            </button>
          </div>

          {/* ── Category-Aware Status KPI Cards (Exact Mobile Parity) ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {/* ALL */}
            <div
              onClick={() => setStatusFilter('all')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white hover:bg-slate-50 border-slate-200 ${
                statusFilter === 'all' ? 'ring-2 ring-emerald-600 shadow-sm bg-emerald-50/30' : ''
              }`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">ALL</span>
              <div className="text-2xl font-extrabold text-slate-900 mt-1.5">
                {activeSegment === 'general' ? stats.generalTotal : stats.eventTotal}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Total in category</p>
            </div>

            {/* PENDING */}
            <div
              onClick={() => setStatusFilter('pending')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer bg-amber-50/70 hover:bg-amber-100/70 border-amber-200 ${
                statusFilter === 'pending' ? 'ring-2 ring-amber-600 shadow-sm' : ''
              }`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">PENDING</span>
              <div className="text-2xl font-extrabold text-amber-900 mt-1.5">{stats.categoryPending}</div>
              <p className="text-[11px] text-amber-700/80 mt-0.5">Awaiting review</p>
            </div>

            {/* APPROVED */}
            <div
              onClick={() => setStatusFilter('approved')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer bg-emerald-50/70 hover:bg-emerald-100/70 border-emerald-200 ${
                statusFilter === 'approved' ? 'ring-2 ring-emerald-600 shadow-sm' : ''
              }`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">APPROVED</span>
              <div className="text-2xl font-extrabold text-emerald-900 mt-1.5">{stats.categoryApproved}</div>
              <p className="text-[11px] text-emerald-700/80 mt-0.5">Active on roster</p>
            </div>

            {/* DECLINED */}
            <div
              onClick={() => setStatusFilter('rejected')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer bg-rose-50/70 hover:bg-rose-100/70 border-rose-200 ${
                statusFilter === 'rejected' ? 'ring-2 ring-rose-600 shadow-sm' : ''
              }`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">DECLINED</span>
              <div className="text-2xl font-extrabold text-rose-900 mt-1.5">{stats.categoryRejected}</div>
              <p className="text-[11px] text-rose-700/80 mt-0.5">Not approved</p>
            </div>
          </div>

          {/* Search Input Bar (Exact Mobile Parity) */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={
                  activeSegment === 'general'
                    ? 'Search by member name, mobile, ministry...'
                    : 'Search by member name, event, role...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
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

          {/* Applications List */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
              <p className="text-sm">Loading volunteer applications...</p>
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-300 p-8">
              <HeartHandshake className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Volunteer Applications Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                {activeSegment === 'general'
                  ? 'Applications submitted for general church volunteering will appear here.'
                  : 'Applications submitted for specific church events will appear here.'}
              </p>
              <Button
                onClick={handleOpenPostCallModal}
                className="mt-4 bg-slate-900 hover:bg-slate-800 text-white text-xs"
              >
                <Megaphone className="w-3.5 h-3.5 mr-1.5" />
                Post General Volunteer Call
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredApps.map((app) => {
                const isEvent = app.volunteerType === 'event';
                const isApproved = app.status === 'approved';
                const isPending = app.status === 'pending';
                const isExpanded = expandedId === app.id;
                const initials = getInitials(app.memberName);

                return (
                  <div
                    key={app.id}
                    className={`bg-white rounded-2xl border transition-all duration-200 shadow-sm overflow-hidden ${
                      isExpanded
                        ? 'border-emerald-600 ring-1 ring-emerald-600'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="p-4 sm:p-5">
                      {isEvent ? (
                        /* Event Volunteer Card Layout (Exact Mobile Parity) */
                        <div>
                          {/* 1. Event Name at top + Status Badge & Action buttons */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-sky-100 border border-sky-200 text-sky-700 flex items-center justify-center shrink-0">
                                <Calendar className="w-4 h-4" />
                              </div>
                              <h3 className="text-base font-bold text-slate-900 truncate">
                                {app.eventTitle || 'Church Gathering Event'}
                              </h3>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {renderStatusBadge(app.status)}
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : app.id)}
                                className="p-1 text-slate-400 hover:text-slate-600"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          {/* 2. Volunteer Name & CALL Button (Mobile Parity: callBtn) */}
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-1.5 font-bold text-slate-800">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span>{app.memberName}</span>
                            </div>

                            {/* Clickable Mobile Phone with prominent CALL Button (Matching Mobile) */}
                            {app.memberPhone && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-600 font-semibold">{app.memberPhone}</span>
                                <a
                                  href={`tel:${app.memberPhone.replace(/[^0-9+]/g, '')}`}
                                  className="px-2.5 py-0.5 rounded-md bg-sky-100 hover:bg-sky-200 text-sky-800 text-[11px] font-extrabold flex items-center gap-1 transition-colors"
                                >
                                  <Phone className="w-2.5 h-2.5" />
                                  CALL
                                </a>
                              </div>
                            )}
                          </div>

                          {/* 3. Applied for Role Badge */}
                          <div className="mt-2.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                            <span>Applied for Role:</span>
                            <strong className="text-sky-700 font-bold">{app.preferredRole || 'Event Volunteer'}</strong>
                          </div>

                          {/* 4. If Assigned Duty: Box with Assignment Details */}
                          {isApproved && (app.assignedRole || app.assignedTimeSlot) && (
                            <div className="mt-3 p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1 text-xs text-emerald-900">
                              <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Confirmed Service Assignment:
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                                {app.assignedRole && (
                                  <div>
                                    <span className="text-emerald-700 font-semibold">Assigned Role:</span>{' '}
                                    <strong>{app.assignedRole}</strong>
                                  </div>
                                )}
                                {app.assignedTimeSlot && (
                                  <div>
                                    <span className="text-emerald-700 font-semibold">Time Slot:</span>{' '}
                                    <span>{app.assignedTimeSlot}</span>
                                  </div>
                                )}
                                {app.assignedLocation && (
                                  <div>
                                    <span className="text-emerald-700 font-semibold">Location:</span>{' '}
                                    <span>{app.assignedLocation}</span>
                                  </div>
                                )}
                                {app.assignedResponsibility && (
                                  <div>
                                    <span className="text-emerald-700 font-semibold">Responsibility:</span>{' '}
                                    <span>{app.assignedResponsibility}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 5. If Rejected: Rejection Reason Box */}
                          {app.status === 'rejected' && app.rejectionReason && (
                            <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                              <span className="font-bold block mb-0.5">Reason for Declining:</span>
                              <p>{app.rejectionReason}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* General Church Volunteer Card Layout (Exact Mobile Parity) */
                        <div>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shrink-0">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="text-base font-bold text-slate-900 truncate">{app.memberName}</h3>
                                  {renderStatusBadge(app.status)}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                                  <span className="font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                                    GENERAL CHURCH
                                  </span>
                                  {/* Call Member with prominent CALL Button (Matching Mobile: styles.contactRow with CALL) */}
                                  {app.memberPhone && (
                                    <div className="flex items-center gap-1.5 ml-1">
                                      <span className="font-medium text-slate-600">{app.memberPhone}</span>
                                      <a
                                        href={`tel:${app.memberPhone.replace(/[^0-9+]/g, '')}`}
                                        className="px-2 py-0.5 rounded bg-sky-100 hover:bg-sky-200 text-sky-800 text-[10px] font-extrabold flex items-center gap-1 transition-colors"
                                      >
                                        <Phone className="w-2.5 h-2.5" />
                                        CALL
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : app.id)}
                                className="p-1 text-slate-400 hover:text-slate-600"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          {/* Preferred Ministries Tags */}
                          {app.preferredMinistries && app.preferredMinistries.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {app.preferredMinistries.map((m, idx) => (
                                <span
                                  key={idx}
                                  className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200"
                                >
                                  {m}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Skills Tags */}
                          {app.skills && app.skills.length > 0 && (
                            <div className="mt-2 text-xs text-slate-500">
                              <span className="font-semibold text-slate-700">Skills: </span>
                              {app.skills.join(', ')}
                            </div>
                          )}

                          {/* Availability Notes */}
                          {app.availabilityNotes && (
                            <div className="mt-1 text-xs text-slate-500">
                              <span className="font-semibold text-slate-700">Availability: </span>
                              {app.availabilityNotes}
                            </div>
                          )}

                          {/* Rejection Reason */}
                          {app.status === 'rejected' && app.rejectionReason && (
                            <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                              <span className="font-bold block mb-0.5">Reason for Declining:</span>
                              <p>{app.rejectionReason}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Card Actions Row */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {isPending && (
                            <>
                              <Button
                                onClick={() => handleOpenApprove(app)}
                                className="h-8 px-3 text-xs bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {isEvent ? 'Approve & Assign' : 'Approve Application'}
                              </Button>
                              <Button
                                variant="secondary"
                                onClick={() => handleOpenReject(app)}
                                className="h-8 px-3 text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1.5"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Decline
                              </Button>
                            </>
                          )}
                          {isApproved && isEvent && (
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setSelectedApp(app);
                                setAssignedRole(app.assignedRole || '');
                                setAssignedTimeSlot(app.assignedTimeSlot || '');
                                setAssignedLocation(app.assignedLocation || '');
                                setAssignedResponsibility(app.assignedResponsibility || '');
                                setShowApprovalModal(true);
                              }}
                              className="h-8 px-3 text-xs border border-slate-200 flex items-center gap-1.5"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              Edit Assignment
                            </Button>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteApplication(app)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Application"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── POST VOLUNTEER CALL MODAL (EXACT MOBILE PARITY: media_1795699919490_0ab77314.jpg) ── */}
          {showPostCallModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
                {/* Fixed Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                      <Megaphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Post Volunteer Call</h2>
                      <p className="text-xs text-slate-500">Broadcast ministry volunteer opportunities to the church</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPostCallModal(false)}
                    className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Scrollable Body */}
                <form id="postCallForm" onSubmit={handlePostVolunteerCall} className="p-6 overflow-y-auto flex-1 space-y-5">
                  {/* Card 1: Volunteer Call Overview (Matching media_1795699919490_0ab77314.jpg) */}
                  <div className="p-5 bg-slate-50/60 border border-slate-200 rounded-2xl space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Volunteer Call Overview</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Give your general volunteer post a clear title and message for members
                      </p>
                    </div>

                    {/* Volunteer Call Title */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        VOLUNTEER CALL TITLE *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sunday Morning Ushers & Welcome Team"
                        value={callTitle}
                        onChange={(e) => setCallTitle(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    {/* Description / Invitation Message */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        DESCRIPTION / INVITATION MESSAGE
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Describe how members can help and what this ministry team does..."
                        value={callDescription}
                        onChange={(e) => setCallDescription(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    {/* Volunteers Needed (Slots) with Preset Pills & Custom Input */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        VOLUNTEERS NEEDED (SLOTS)
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2.5">
                        {['Open / Any', '2 Needed', '5 Needed', '10 Needed', '15 Needed', '20 Needed'].map((slot) => {
                          const isSel = callSlotsNeeded === slot && !customSlots.trim();
                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => {
                                setCallSlotsNeeded(slot);
                                setCustomSlots('');
                              }}
                              className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all text-center ${
                                isSel
                                  ? 'border-emerald-600 text-emerald-700 bg-white shadow-xs ring-1 ring-emerald-600/30 font-extrabold'
                                  : 'border-slate-200 text-slate-700 hover:border-slate-300 bg-white'
                              }`}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                      <input
                        type="number"
                        min="1"
                        placeholder="Or enter custom number of volunteers (leave blank for open)"
                        value={customSlots}
                        onChange={(e) => {
                          setCustomSlots(e.target.value);
                          if (e.target.value) {
                            setCallSlotsNeeded(`${e.target.value} Needed`);
                          } else {
                            setCallSlotsNeeded('Open / Any');
                          }
                        }}
                        className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Card 2: Where Should Members Serve? * (Matching media_1795699919490_0ab77314.jpg) */}
                  <div className="p-5 bg-slate-50/60 border border-slate-200 rounded-2xl space-y-3.5">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Where Should Members Serve? *</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Select one or more ministry areas for this volunteer call:
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {MINISTRY_OPTIONS.map((item) => {
                        const isSelected = callMinistries.includes(item.name);
                        const Icon = item.icon;
                        return (
                          <div
                            key={item.id}
                            onClick={() => toggleCallMinistry(item.name)}
                            className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                              isSelected
                                ? 'border-emerald-500 bg-white ring-2 ring-emerald-500/20 shadow-xs'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2.5">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.iconBg}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div
                                className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                                  isSelected
                                    ? 'border-emerald-600 bg-emerald-600 text-white'
                                    : 'border-slate-300 bg-white'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-900 block">{item.name}</span>
                              <span className="text-[10px] text-slate-500 block mt-0.5">{item.teName}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </form>

                {/* Fixed Footer (Matching Mobile Cancel & Publish Bar) */}
                <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 bg-slate-50">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowPostCallModal(false)}
                    disabled={postingCall}
                    className="rounded-xl px-5 text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    form="postCallForm"
                    disabled={postingCall}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 px-6 py-2.5 shadow-sm min-w-[170px]"
                  >
                    {postingCall ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 text-white" />
                        Publish Volunteer Call
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── EVENT APPROVAL & ASSIGNMENT MODAL (FIXED ALIGNMENT) ── */}
          {showApprovalModal && selectedApp && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Assign Event Duty</h2>
                      <p className="text-xs text-slate-500">
                        {selectedApp.memberName} · {selectedApp.eventTitle || 'Church Event'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowApprovalModal(false)}
                    className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form id="eventDutyForm" onSubmit={handleConfirmEventApproval} className="p-6 overflow-y-auto flex-1 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Assigned Role *
                    </label>
                    <select
                      value={assignedRole}
                      onChange={(e) => setAssignedRole(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                    >
                      {COMMON_EVENT_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Time Slot
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 09:00 AM - 01:00 PM"
                        value={assignedTimeSlot}
                        onChange={(e) => setAssignedTimeSlot(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Duty Location
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Main Sanctuary East Gate"
                        value={assignedLocation}
                        onChange={(e) => setAssignedLocation(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Key Responsibility Notes
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Welcome incoming families, distribute songbooks and assist with communion trays."
                      value={assignedResponsibility}
                      onChange={(e) => setAssignedResponsibility(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </form>

                <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 bg-slate-50">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowApprovalModal(false)}
                    disabled={actionLoading}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    form="eventDutyForm"
                    disabled={actionLoading}
                    className="bg-black hover:bg-slate-900 text-white text-xs font-bold min-w-[140px]"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Approve & Assign'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── REJECTION / DECLINE MODAL ── */}
          {showRejectModal && selectedApp && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                      <XCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Decline Application</h2>
                      <p className="text-xs text-slate-500">{selectedApp.memberName}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRejectModal(false)}
                    className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form id="declineForm" onSubmit={handleConfirmRejection} className="p-6 overflow-y-auto flex-1 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Reason for Declining (Optional)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Volunteer roster full for this date, or transferred to another team."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>
                </form>

                <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 bg-slate-50">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowRejectModal(false)}
                    disabled={actionLoading}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    form="declineForm"
                    disabled={actionLoading}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold min-w-[120px]"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm Decline'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminNavigationShell>
    </ProtectedRoute>
  );
}
