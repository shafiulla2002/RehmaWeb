'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminNavigationShell } from '@/components/layout/AdminNavigationShell';
import { useAuth } from '@/contexts/AuthContext';
import { db, functions } from '@/lib/firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Home,
  Shield,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertCircle,
  Eye,
  Edit2,
  Trash2,
  Sparkles,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  X,
  FileSpreadsheet,
  Award,
  Save,
  Heart,
  Droplets,
  Cake,
} from 'lucide-react';

const ALL_CHURCH_SKILLS: string[] = [
  'Worship Leader',
  'Vocalist / Singer',
  'Acoustic Guitar',
  'Electric Guitar',
  'Bass Guitar',
  'Keyboard / Piano',
  'Drums / Percussion',
  'Choir / Harmonies',
  'Violin / Strings',
  'Flute / Woodwinds',
  'Sound Engineer (FOH)',
  'Stage Audio / Monitors',
  'Live Streaming / Broadcast',
  'Media / Lyrics Projection',
  'Video Camera Operator',
  'Video Director / Mixer',
  'Photographer',
  'Video Editor',
  'Graphic Designer',
  'Social Media Coordinator',
  'Lighting Technician',
  'Preacher / Evangelist',
  'Bible Study Teacher',
  'Sunday School Teacher',
  'Youth Ministry Leader',
  'Children Ministry Helper',
  'Intercessory Prayer Leader',
  'Pastoral Care & Counseling',
  'Women’s Fellowship Leader',
  'Men’s Fellowship Leader',
  'Outreach / Visitation Team',
  'Usher / Greeter',
  'Food & Hospitality (FMH)',
  'Communion Preparation',
  'Event Coordinator / Planner',
  'Stage Decoration / Setup',
  'Driver / Transportation',
  'Facilities & Maintenance',
  'Administration / Finance',
  'Medical / First Aid',
  'Security / Parking',
];

interface FirebaseMemberRecord {
  id: string;
  name?: string;
  fullName?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  normalizedPhone10?: string;
  email?: string;
  gender?: string;
  dob?: string;
  city?: string;
  village?: string;
  mailingCity?: string;
  state?: string;
  zone?: string;
  street?: string;
  zip?: string;
  careCellId?: string;
  careCell?: string;
  spiritualStatus?: string;
  userType?: string;
  role?: string;
  status?: string;
  accountStatus?: string;
  baptismDate?: string;
  Baptism_Date__c?: string;
  anniversaryDate?: string;
  Anniversary_Date__c?: string;
  primarySkill?: string;
  secondarySkill?: string;
  joinDate?: string;
  createdAt?: string;
  updatedAt?: string;
  photoURL?: string;
  profilePhoto?: string;
  photoUrl?: string;
  profileImageUrl?: string;
  PhotoUrl?: string;
  profilePicture?: string;
  avatarUrl?: string;
  memberCode?: string;
  familyRole?: string;
}

function MemberAvatar({
  member,
  size = 36,
  className = '',
}: {
  member: FirebaseMemberRecord;
  size?: number;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const photo =
    member.photoURL ||
    member.profilePhoto ||
    member.photoUrl ||
    member.profileImageUrl ||
    member.PhotoUrl ||
    member.profilePicture ||
    member.avatarUrl ||
    '';

  const name = (member.fullName || member.name || member.displayName || '').trim();
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join('') || (name ? name[0].toUpperCase() : 'M');

  if (photo && !imgError) {
    return (
      <img
        src={photo}
        alt={name || 'Member'}
        onError={() => setImgError(true)}
        style={{ width: size, height: size }}
        className={`rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-800 shadow-xs ${className}`}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, Math.round(size * 0.36)),
      }}
      className={`rounded-full bg-slate-900 dark:bg-black text-white font-extrabold flex items-center justify-center shrink-0 tracking-tight border border-slate-700/30 ${className}`}
    >
      {initials}
    </div>
  );
}

interface FirebaseRegistrationRequest {
  id: string;
  authUid?: string;
  phone: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  gender?: string;
  city?: string;
  zone?: string;
  state?: string;
  street?: string;
  mandal?: string;
  district?: string;
  zip?: string;
  status: 'pending' | 'approved' | 'rejected' | string;
  createdAt?: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedByName?: string;
  reviewedByUid?: string;
  rejectionReason?: string;
  notes?: string;
}

export default function MembersCrmAdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'directory' | 'approvals'>('directory');

  // Datasets state
  const [members, setMembers] = useState<FirebaseMemberRecord[]>([]);
  const [approvals, setApprovals] = useState<FirebaseRegistrationRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Directory Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState<string>('All');
  const [selectedSpiritual, setSelectedSpiritual] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  // Modals & Drawers
  const [selectedMember, setSelectedMember] = useState<FirebaseMemberRecord | null>(null);
  const [selectedApproval, setSelectedApproval] = useState<FirebaseRegistrationRequest | null>(null);
  const [interviewModalItem, setInterviewModalItem] = useState<FirebaseRegistrationRequest | null>(null);
  const [interviewNotes, setInterviewNotes] = useState('');
  const [rejectionModalItem, setRejectionModalItem] = useState<FirebaseRegistrationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit / Add Member Modal (Exact Mobile Field Parity)
  const [editMemberModalOpen, setEditMemberModalOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [memberFormName, setMemberFormName] = useState('');
  const [memberFormPhone, setMemberFormPhone] = useState('');
  const [memberFormEmail, setMemberFormEmail] = useState('');
  const [memberFormCity, setMemberFormCity] = useState('');
  const [memberFormZone, setMemberFormZone] = useState('Central Zone');
  const [memberFormDob, setMemberFormDob] = useState('');
  const [memberFormBaptismDate, setMemberFormBaptismDate] = useState('');
  const [memberFormAnniversaryDate, setMemberFormAnniversaryDate] = useState('');
  const [memberFormPrimarySkill, setMemberFormPrimarySkill] = useState('');
  const [memberFormSecondarySkill, setMemberFormSecondarySkill] = useState('');
  const [memberFormSpiritual, setMemberFormSpiritual] = useState('Active Member');
  const [memberFormRole, setMemberFormRole] = useState('Member');
  const [memberFormStatus, setMemberFormStatus] = useState('Active');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // -------------------------------------------------------------
  // REAL-TIME FIRESTORE DATA LISTENER
  // -------------------------------------------------------------
  useEffect(() => {
    setLoading(true);
    setError(null);

    const membersCol = collection(db, 'Rhema Church', 'rhema', 'members');
    const reqCol = collection(db, 'Rhema Church', 'rhema', 'registration_requests');

    // Subscribe to members with deduplication matching canonical mobile congregation view
    const unsubMembers = onSnapshot(
      membersCol,
      (snapshot) => {
        const rawMap = new Map<string, FirebaseMemberRecord>();
        snapshot.forEach((d) => {
          const data = d.data();
          if (data.status === 'Left') return;

          const rawName = (
            data.fullName ||
            data.name ||
            data.displayName ||
            `${data.firstName || ''} ${data.lastName || ''}`.trim() ||
            (data.phone ? `Member (${data.phone})` : 'Unknown')
          ).trim();

          const key = rawName.toLowerCase() || d.id;

          const photo =
            data.photoURL ||
            data.profilePhoto ||
            data.photoUrl ||
            data.profileImageUrl ||
            data.PhotoUrl ||
            data.profilePicture ||
            data.avatarUrl ||
            data.photo ||
            data.picture ||
            '';

          const record: FirebaseMemberRecord = {
            id: d.id,
            name: rawName,
            fullName: rawName,
            displayName: rawName,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            phone: data.phone || data.normalizedPhone10 || '',
            normalizedPhone10: data.normalizedPhone10 || '',
            email: data.email || '',
            gender: data.gender || 'Not Specified',
            city: data.city || data.village || data.mailingCity || '',
            village: data.village || data.city || '',
            state: data.state || data.mailingState || '',
            zone: data.zone || 'Central Zone',
            careCell: data.careCell || data.careCellName || 'Rhema Fellowship',
            spiritualStatus: data.spiritualStatus || 'Active Member',
            userType: data.userType || data.role || 'Member',
            role: data.role || data.userType || 'Member',
            status: data.status || data.accountStatus || 'Active',
            accountStatus: data.accountStatus || data.status || 'Active',
            dob: data.dob || '',
            baptismDate: data.baptismDate || data.Baptism_Date__c || '',
            Baptism_Date__c: data.Baptism_Date__c || data.baptismDate || '',
            anniversaryDate: data.anniversaryDate || data.Anniversary_Date__c || '',
            Anniversary_Date__c: data.Anniversary_Date__c || data.anniversaryDate || '',
            primarySkill: data.primarySkill || '',
            secondarySkill: data.secondarySkill || '',
            joinDate: data.joinDate || data.createdAt || '',
            memberCode: data.memberCode || `RHM-${d.id.substring(0, 6).toUpperCase()}`,
            familyRole: data.familyRole || 'Head of Household',
            photoURL: photo,
            profilePhoto: photo,
            photoUrl: photo,
            profileImageUrl: photo,
            PhotoUrl: photo,
            profilePicture: photo,
            avatarUrl: photo,
          };

          if (!rawMap.has(key)) {
            rawMap.set(key, record);
          } else {
            const existing = rawMap.get(key)!;
            // Prefer record with photo or more complete contact info
            if (!existing.photoURL && photo) {
              rawMap.set(key, { ...existing, ...record, photoURL: photo, profilePhoto: photo, photoUrl: photo, profileImageUrl: photo });
            } else if (!existing.phone && record.phone) {
              rawMap.set(key, { ...existing, phone: record.phone, normalizedPhone10: record.normalizedPhone10 });
            }
          }
        });

        const memList = Array.from(rawMap.values());
        setMembers(memList);
        setLoading(false);
      },
      (err) => {
        console.error('[M33 Members CRM] Error listening to members:', err);
        setError('Failed to load live members directory.');
        setLoading(false);
      }
    );

    // Subscribe to registration requests
    const unsubRequests = onSnapshot(
      reqCol,
      (snapshot) => {
        const reqList: FirebaseRegistrationRequest[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          reqList.push({
            id: d.id,
            authUid: data.authUid || '',
            phone: data.phone || data.normalizedPhone10 || d.id,
            fullName: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Applicant',
            email: data.email || '',
            gender: data.gender || 'Not Specified',
            city: data.city || '',
            zone: data.zone || 'Central Zone',
            state: data.state || '',
            street: data.street || '',
            status: data.status || 'pending',
            createdAt: data.createdAt || data.submittedAt || '',
            submittedAt: data.submittedAt || data.createdAt || '',
            reviewedAt: data.reviewedAt || '',
            reviewedByName: data.reviewedByName || '',
            reviewedByUid: data.reviewedByUid || '',
            rejectionReason: data.rejectionReason || '',
            notes: data.notes || '',
          });
        });
        setApprovals(reqList);
      },
      (err) => {
        console.warn('[M33 Members CRM] Error listening to registration requests:', err);
      }
    );

    return () => {
      unsubMembers();
      unsubRequests();
    };
  }, []);

  // -------------------------------------------------------------
  // APPROVAL ACTIONS
  // -------------------------------------------------------------
  const handleApproveApplicant = async (app: FirebaseRegistrationRequest) => {
    setIsSubmitting(true);
    try {
      const targetMemberId = app.authUid || app.id;
      const nowIso = new Date().toISOString();
      const adminName = user?.displayName || 'Church Admin';
      const adminUid = user?.uid || '';

      // 1. Create or update member in members collection
      const memberRef = doc(db, 'Rhema Church', 'rhema', 'members', targetMemberId);
      await setDoc(
        memberRef,
        {
          id: targetMemberId,
          name: app.fullName || 'Church Member',
          fullName: app.fullName || 'Church Member',
          phone: app.phone,
          email: app.email || '',
          gender: app.gender || 'Not Specified',
          city: app.city || 'Bangalore',
          zone: app.zone || 'Central Zone',
          state: app.state || 'Karnataka',
          spiritualStatus: 'Baptized Member',
          userType: 'Member',
          role: 'Member',
          status: 'Active',
          accountStatus: 'Active',
          churchId: 'rhema',
          primaryChurchId: 'rhema',
          joinDate: nowIso,
          approvedAt: nowIso,
          approvedByUid: adminUid,
          approvedByName: adminName,
          updatedAt: nowIso,
          createdAt: nowIso,
        },
        { merge: true }
      );

      // 2. Update registration_requests doc
      const reqRef = doc(db, 'Rhema Church', 'rhema', 'registration_requests', app.id);
      await updateDoc(reqRef, {
        status: 'approved',
        reviewedAt: nowIso,
        reviewedByUid: adminUid,
        reviewedByName: adminName,
        notes: interviewNotes ? `${interviewNotes}` : '',
        updatedAt: nowIso,
      });

      showToast(`Approved registration for ${app.fullName}. Member profile activated!`);
      setSelectedApproval(null);
      setInterviewModalItem(null);
      setInterviewNotes('');
    } catch (err: any) {
      console.error('Error approving registration request:', err);
      showToast(`Error: ${err.message || 'Failed to approve registration'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectApplicant = async () => {
    if (!rejectionModalItem) return;
    setIsSubmitting(true);
    try {
      const nowIso = new Date().toISOString();
      const adminName = user?.displayName || 'Church Admin';
      const adminUid = user?.uid || '';

      const reqRef = doc(db, 'Rhema Church', 'rhema', 'registration_requests', rejectionModalItem.id);
      await updateDoc(reqRef, {
        status: 'rejected',
        rejectionReason: rejectionReason || 'Application not accepted at this time',
        reviewedAt: nowIso,
        reviewedByUid: adminUid,
        reviewedByName: adminName,
        updatedAt: nowIso,
      });

      showToast(`Registration request for ${rejectionModalItem.fullName} marked as rejected.`);
      setRejectionModalItem(null);
      setRejectionReason('');
      setSelectedApproval(null);
    } catch (err: any) {
      console.error('Error rejecting registration request:', err);
      showToast(`Error: ${err.message || 'Failed to reject registration'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRequest = async (appId: string) => {
    if (!confirm('Are you sure you want to permanently delete this registration record?')) return;
    try {
      const reqRef = doc(db, 'Rhema Church', 'rhema', 'registration_requests', appId);
      await deleteDoc(reqRef);
      showToast('Registration request deleted successfully.');
      setSelectedApproval(null);
    } catch (err: any) {
      console.error('Error deleting registration request:', err);
      showToast(`Error: ${err.message || 'Failed to delete request'}`);
    }
  };

  // -------------------------------------------------------------
  // MEMBER CRUD ACTIONS (EXACT MOBILE APP PARITY)
  // -------------------------------------------------------------
  const handleOpenEditMember = (mem: FirebaseMemberRecord) => {
    setEditingMemberId(mem.id);
    setMemberFormName(mem.fullName || mem.name || '');
    setMemberFormPhone(mem.phone || mem.normalizedPhone10 || '');
    setMemberFormEmail(mem.email || '');
    setMemberFormCity(mem.city || mem.village || mem.mailingCity || 'Bangalore');
    setMemberFormZone(mem.zone || 'Central Zone');
    setMemberFormDob(mem.dob || '');
    setMemberFormBaptismDate(mem.baptismDate || mem.Baptism_Date__c || '');
    setMemberFormAnniversaryDate(mem.anniversaryDate || mem.Anniversary_Date__c || '');
    setMemberFormPrimarySkill(mem.primarySkill || '');
    setMemberFormSecondarySkill(mem.secondarySkill || '');
    setMemberFormSpiritual(mem.spiritualStatus || 'Active Member');
    setMemberFormRole(mem.role || mem.userType || 'Member');
    setMemberFormStatus(mem.status || mem.accountStatus || 'Active');
    setEditMemberModalOpen(true);
  };

  const handleOpenAddMember = () => {
    setEditingMemberId(null);
    setMemberFormName('');
    setMemberFormPhone('');
    setMemberFormEmail('');
    setMemberFormCity('');
    setMemberFormZone('Central Zone');
    setMemberFormDob('');
    setMemberFormBaptismDate('');
    setMemberFormAnniversaryDate('');
    setMemberFormPrimarySkill('');
    setMemberFormSecondarySkill('');
    setMemberFormSpiritual('Active Member');
    setMemberFormRole('Member');
    setMemberFormStatus('Active');
    setEditMemberModalOpen(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberFormName.trim()) {
      alert('Please provide member full name.');
      return;
    }
    if (!memberFormPhone.trim()) {
      alert('Please provide member phone number.');
      return;
    }

    const digitsOnly = memberFormPhone.replace(/\D/g, '');
    const last10 = digitsOnly.slice(-10);
    const formattedPhone = digitsOnly.startsWith('91') && digitsOnly.length > 10
      ? `+${digitsOnly}`
      : (last10 ? `+91${last10}` : memberFormPhone.trim());

    // Real-time duplicate phone validation on create (matching mobile parity)
    if (!editingMemberId && last10) {
      const isDuplicate = members.some((m) => {
        const mDigits = (m.phone || m.normalizedPhone10 || '').replace(/\D/g, '').slice(-10);
        return mDigits === last10;
      });
      if (isDuplicate) {
        alert('A member with this phone number already exists in this church.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const nowIso = new Date().toISOString();
      const targetId = editingMemberId || `RHM-${Date.now().toString().slice(-6)}`;
      const memberRef = doc(db, 'Rhema Church', 'rhema', 'members', targetId);

      // If demoting or deactivating an existing active admin, route through transactional Cloud Function
      if (editingMemberId) {
        const existing = members.find((m) => m.id === editingMemberId);
        const wasAdmin = (existing?.role?.toLowerCase() === 'admin' || existing?.userType?.toLowerCase() === 'admin') && existing?.status?.toLowerCase() === 'active';
        const willBeAdmin = (memberFormRole?.toLowerCase() === 'admin') && (memberFormStatus?.toLowerCase() === 'active');

        if (wasAdmin && !willBeAdmin) {
          const activeAdminsCount = members.filter(
            (m) => (m.role?.toLowerCase() === 'admin' || m.userType?.toLowerCase() === 'admin') && m.status?.toLowerCase() === 'active'
          ).length;
          if (activeAdminsCount <= 1) {
            alert('Cannot demote or deactivate the last active administrator for this church.');
            setIsSubmitting(false);
            return;
          }
          const { httpsCallable } = await import('firebase/functions');
          const manageFn = httpsCallable(functions, 'manageChurchAdminAccount');
          await manageFn({
            targetMemberId: editingMemberId,
            action: memberFormRole?.toLowerCase() !== 'admin' ? 'demote' : 'deactivate',
            newRole: memberFormRole,
            newStatus: memberFormStatus,
          });
          showToast('Administrator updated via secure backend.');
          setEditMemberModalOpen(false);
          setIsSubmitting(false);
          return;
        }
      }

      const trimmedName = memberFormName.trim();
      const nameParts = trimmedName.split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      const payload: Partial<FirebaseMemberRecord> = {
        name: trimmedName,
        fullName: trimmedName,
        displayName: trimmedName,
        firstName: firstName,
        lastName: lastName,
        phone: formattedPhone,
        normalizedPhone10: last10,
        email: memberFormEmail.trim(),
        city: memberFormCity.trim(),
        village: memberFormCity.trim(),
        mailingCity: memberFormCity.trim(),
        zone: memberFormZone,
        dob: memberFormDob || '',
        baptismDate: memberFormBaptismDate || '',
        Baptism_Date__c: memberFormBaptismDate || '',
        anniversaryDate: memberFormAnniversaryDate || '',
        Anniversary_Date__c: memberFormAnniversaryDate || '',
        primarySkill: memberFormPrimarySkill.trim(),
        secondarySkill: memberFormSecondarySkill.trim(),
        spiritualStatus: memberFormSpiritual,
        userType: memberFormRole,
        role: memberFormRole,
        status: memberFormStatus,
        accountStatus: memberFormStatus,
        updatedAt: nowIso,
      };

      if (!editingMemberId) {
        payload.createdAt = nowIso;
        payload.joinDate = nowIso;
        payload.memberCode = `RHM-${targetId.toUpperCase()}`;
      }

      await setDoc(memberRef, payload, { merge: true });
      showToast(editingMemberId ? 'Member details updated successfully!' : 'New member added to directory!');
      setEditMemberModalOpen(false);
      if (selectedMember && selectedMember.id === targetId) {
        setSelectedMember({ ...selectedMember, ...payload });
      }
    } catch (err: any) {
      console.error('Error saving member:', err);
      showToast(`Error: ${err.message || 'Failed to save member'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    const target = members.find((m) => m.id === memberId);
    const isTargetAdmin = (target?.role?.toLowerCase() === 'admin' || target?.userType?.toLowerCase() === 'admin') && target?.status?.toLowerCase() === 'active';

    if (isTargetAdmin) {
      const activeAdminsCount = members.filter(
        (m) => (m.role?.toLowerCase() === 'admin' || m.userType?.toLowerCase() === 'admin') && m.status?.toLowerCase() === 'active'
      ).length;
      if (activeAdminsCount <= 1) {
        alert('Cannot delete the last active administrator for this church.');
        return;
      }
    }

    if (!confirm('Are you sure you want to permanently delete this member record? This will revoke access.')) return;
    try {
      if (isTargetAdmin) {
        const { httpsCallable } = await import('firebase/functions');
        const manageFn = httpsCallable(functions, 'manageChurchAdminAccount');
        await manageFn({ targetMemberId: memberId, action: 'delete' });
      } else {
        const memberRef = doc(db, 'Rhema Church', 'rhema', 'members', memberId);
        await deleteDoc(memberRef);
      }
      showToast('Member removed from directory.');
      setSelectedMember(null);
    } catch (err: any) {
      console.error('Error deleting member:', err);
      showToast(`Error: ${err.message || 'Failed to delete member'}`);
    }
  };

  // -------------------------------------------------------------
  // EXPORT TO CSV
  // -------------------------------------------------------------
  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Full Name',
      'Phone',
      'Email',
      'City / Village',
      'Zone',
      'Date of Birth',
      'Baptism Date',
      'Anniversary Date',
      'Primary Skill',
      'Secondary Skill',
      'Spiritual Status',
      'Role',
      'Status',
      'Join Date',
    ];
    const rows = filteredMembers.map((m) => [
      `"${m.id}"`,
      `"${m.fullName || m.name || ''}"`,
      `"${m.phone || ''}"`,
      `"${m.email || ''}"`,
      `"${m.city || m.village || ''}"`,
      `"${m.zone || ''}"`,
      `"${m.dob || ''}"`,
      `"${m.baptismDate || m.Baptism_Date__c || ''}"`,
      `"${m.anniversaryDate || m.Anniversary_Date__c || ''}"`,
      `"${m.primarySkill || ''}"`,
      `"${m.secondarySkill || ''}"`,
      `"${m.spiritualStatus || ''}"`,
      `"${m.role || m.userType || ''}"`,
      `"${m.status || m.accountStatus || ''}"`,
      `"${m.joinDate || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rhema_members_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Members directory exported to CSV.');
  };

  // -------------------------------------------------------------
  // STATS & FILTERED DATASETS (EXACT MOBILE PARITY)
  // -------------------------------------------------------------
  const stats = useMemo(() => {
    const total = members.length;
    const active = members.filter((m) => {
      const st = (m.status || m.accountStatus || 'Active').toLowerCase();
      return st === 'active';
    }).length;
    const inactive = members.filter((m) => {
      const st = (m.status || m.accountStatus || '').toLowerCase();
      return st === 'inactive';
    }).length;
    return { total, active, inactive };
  }, [members]);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        searchQuery === '' ||
        (m.fullName || m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.phone || '').includes(searchQuery) ||
        (m.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesZone = selectedZone === 'All' || m.zone === selectedZone;
      const matchesSpiritual = selectedSpiritual === 'All' || m.spiritualStatus === selectedSpiritual;
      const matchesStatus =
        selectedStatus === 'All' ||
        (m.status || m.accountStatus || 'Active').toLowerCase() === selectedStatus.toLowerCase();

      return matchesSearch && matchesZone && matchesSpiritual && matchesStatus;
    });
  }, [members, searchQuery, selectedZone, selectedSpiritual, selectedStatus]);

  const filteredApprovals = useMemo(() => {
    if (approvalStatusFilter === 'all') return approvals;
    return approvals.filter((a) => a.status.toLowerCase() === approvalStatusFilter);
  }, [approvals, approvalStatusFilter]);

  const pendingApprovalsCount = useMemo(() => {
    return approvals.filter((a) => a.status.toLowerCase() === 'pending').length;
  }, [approvals]);

  return (
    <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
      <AdminNavigationShell>
        <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {/* Toast Notification */}
          {toastMessage && (
            <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-emerald-600 text-white text-xs font-semibold rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
              <CheckCircle2 size={16} />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500 font-bold">
                  <Users size={24} />
                </span>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Members CRM &amp; Pastoral Registry
                  </h1>
                  <span className="text-xs text-slate-500">Module 33 • Live Firebase Integration</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                Manage congregation directory, verify registration queues, assign pastoral roles, and track member engagement.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Download size={14} />
                <span>Export CSV</span>
              </button>

              <button
                onClick={handleOpenAddMember}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md"
              >
                <UserPlus size={15} />
                <span>Add Member</span>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-xs text-red-500">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* THREE SUMMARY CARDS (MOBILE APP PARITY)                     */}
          {/* ─────────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
            {/* Card 1: Total Members */}
            <button
              type="button"
              onClick={() => setSelectedStatus('All')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between ${
                selectedStatus === 'All'
                  ? 'border-[#1A2D5A] dark:border-blue-400 ring-2 ring-[#1A2D5A]/15 dark:ring-blue-400/20 shadow-md'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Top Accent Notch (Mobile Parity) */}
              <div
                className={`absolute top-0 left-0 right-0 transition-all ${
                  selectedStatus === 'All'
                    ? 'bg-[#1A2D5A] dark:bg-blue-400 h-1.5'
                    : 'bg-[#1A2D5A]/60 dark:bg-blue-400/40 h-1'
                }`}
              />

              <div className="pt-1">
                <span className="text-3xl font-black tracking-tight text-[#1A2D5A] dark:text-blue-400 block font-mono">
                  {stats.total}
                </span>

                <div className="flex items-center gap-1.5 mt-1.5">
                  <span
                    className={`text-xs font-extrabold uppercase tracking-wider ${
                      selectedStatus === 'All'
                        ? 'text-[#1A2D5A] dark:text-blue-400'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    TOTAL
                  </span>
                  {selectedStatus === 'All' && (
                    <span className="w-2 h-2 rounded-full bg-[#1A2D5A] dark:bg-blue-400 inline-block" />
                  )}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                <span
                  className={`font-semibold ${
                    selectedStatus === 'All'
                      ? 'text-[#1A2D5A] dark:text-blue-400 font-bold'
                      : 'text-slate-400'
                  }`}
                >
                  {selectedStatus === 'All' ? 'Active ✓' : 'Tap to filter'}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">All Congregation</span>
              </div>
            </button>

            {/* Card 2: Active Members */}
            <button
              type="button"
              onClick={() => setSelectedStatus(selectedStatus === 'Active' ? 'All' : 'Active')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between ${
                selectedStatus === 'Active'
                  ? 'border-emerald-600 dark:border-emerald-400 ring-2 ring-emerald-600/15 dark:ring-emerald-400/20 shadow-md'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Top Accent Notch (Mobile Parity) */}
              <div
                className={`absolute top-0 left-0 right-0 transition-all ${
                  selectedStatus === 'Active'
                    ? 'bg-emerald-600 dark:bg-emerald-400 h-1.5'
                    : 'bg-emerald-600/60 dark:bg-emerald-400/40 h-1'
                }`}
              />

              <div className="pt-1">
                <span className="text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 block font-mono">
                  {stats.active}
                </span>

                <div className="flex items-center gap-1.5 mt-1.5">
                  <span
                    className={`text-xs font-extrabold uppercase tracking-wider ${
                      selectedStatus === 'Active'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    ACTIVE
                  </span>
                  {selectedStatus === 'Active' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 inline-block" />
                  )}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                <span
                  className={`font-semibold ${
                    selectedStatus === 'Active'
                      ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                      : 'text-slate-400'
                  }`}
                >
                  {selectedStatus === 'Active' ? 'Active ✓' : 'Tap to filter'}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Regular Church Members</span>
              </div>
            </button>

            {/* Card 3: Inactive Members */}
            <button
              type="button"
              onClick={() => setSelectedStatus(selectedStatus === 'Inactive' ? 'All' : 'Inactive')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between ${
                selectedStatus === 'Inactive'
                  ? 'border-red-600 dark:border-red-400 ring-2 ring-red-600/15 dark:ring-red-400/20 shadow-md'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Top Accent Notch (Mobile Parity) */}
              <div
                className={`absolute top-0 left-0 right-0 transition-all ${
                  selectedStatus === 'Inactive'
                    ? 'bg-red-600 dark:bg-red-400 h-1.5'
                    : 'bg-red-600/60 dark:bg-red-400/40 h-1'
                }`}
              />

              <div className="pt-1">
                <span className="text-3xl font-black tracking-tight text-red-600 dark:text-red-400 block font-mono">
                  {stats.inactive}
                </span>

                <div className="flex items-center gap-1.5 mt-1.5">
                  <span
                    className={`text-xs font-extrabold uppercase tracking-wider ${
                      selectedStatus === 'Inactive'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    INACTIVE
                  </span>
                  {selectedStatus === 'Inactive' && (
                    <span className="w-2 h-2 rounded-full bg-red-600 dark:bg-red-400 inline-block" />
                  )}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                <span
                  className={`font-semibold ${
                    selectedStatus === 'Inactive'
                      ? 'text-red-600 dark:text-red-400 font-bold'
                      : 'text-slate-400'
                  }`}
                >
                  {selectedStatus === 'Inactive' ? 'Active ✓' : 'Tap to filter'}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Inactive Profiles</span>
              </div>
            </button>
          </div>

          {/* Primary View Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('directory')}
              className={`pb-3 px-4 text-xs font-bold transition-all relative ${
                activeTab === 'directory'
                  ? 'text-amber-500 border-b-2 border-amber-500'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Users size={15} />
                <span>Congregation Directory ({members.length})</span>
              </span>
            </button>

            <button
              onClick={() => setActiveTab('approvals')}
              className={`pb-3 px-4 text-xs font-bold transition-all relative ${
                activeTab === 'approvals'
                  ? 'text-amber-500 border-b-2 border-amber-500'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Clock size={15} />
                <span>Registration Queue</span>
                {pendingApprovalsCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-slate-950 font-black">
                    {pendingApprovalsCount}
                  </span>
                )}
              </span>
            </button>
          </div>

          {/* Loading Skeleton */}
          {loading && (
            <div className="py-12 text-center space-y-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-xs">
              <RefreshCw size={28} className="animate-spin text-amber-500 mx-auto" />
              <p className="text-xs text-slate-400">Loading live church registry...</p>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* TAB 1: CONGREGATION DIRECTORY                               */}
          {/* ─────────────────────────────────────────────────────────── */}
          {!loading && activeTab === 'directory' && (
            <div className="space-y-4">
              {/* Filter & Search Bar */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between shadow-xs">
                <div className="relative w-full md:w-80">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search name, phone, email, ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                  <select
                    value={selectedZone}
                    onChange={(e) => setSelectedZone(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="All">All Zones</option>
                    <option value="North Zone">North Zone</option>
                    <option value="Central Zone">Central Zone</option>
                    <option value="South Zone">South Zone</option>
                    <option value="East Zone">East Zone</option>
                  </select>

                  <select
                    value={selectedSpiritual}
                    onChange={(e) => setSelectedSpiritual(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="All">All Spiritual</option>
                    <option value="Baptized">Baptized</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Candidate">Candidate</option>
                    <option value="Active Member">Active Member</option>
                  </select>

                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="All">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Under Pastoral Care">Under Pastoral Care</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Members Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                {filteredMembers.length === 0 ? (
                  <div className="p-12 text-center text-xs text-slate-400 space-y-1">
                    <p className="font-semibold text-slate-600 dark:text-slate-300">No members match your search criteria.</p>
                    <p>Try clearing filters or search terms.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-3 px-4">Member Name &amp; ID</th>
                          <th className="py-3 px-4">Contact</th>
                          <th className="py-3 px-4">Zone &amp; City</th>
                          <th className="py-3 px-4">Spiritual Status</th>
                          <th className="py-3 px-4">Role</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                        {filteredMembers.map((m) => (
                          <tr
                            key={m.id}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <MemberAvatar member={m} size={36} />
                                <div>
                                  <span className="font-bold text-slate-900 dark:text-white block">
                                    {m.fullName || m.name}
                                  </span>
                                  <span className="font-mono text-[10px] text-slate-400">{m.memberCode || m.id}</span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="space-y-0.5">
                                <span className="flex items-center gap-1 font-mono text-[11px]">
                                  <Phone size={10} className="text-slate-400" />
                                  <span>{m.phone || 'No phone'}</span>
                                </span>
                                {m.email && (
                                  <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                    <Mail size={10} />
                                    <span>{m.email}</span>
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="space-y-0.5">
                                <span className="font-medium">{m.zone || 'Central Zone'}</span>
                                <span className="text-[10px] text-slate-400 block">{m.city || 'Bangalore'}</span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-500 border border-sky-500/20">
                                {m.spiritualStatus}
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase">
                                {m.role || m.userType || 'Member'}
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  (m.status || m.accountStatus) === 'Active'
                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                }`}
                              >
                                {m.status || m.accountStatus || 'Active'}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setSelectedMember(m)}
                                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                                  title="View Member Dossier"
                                >
                                  <Eye size={14} />
                                </button>
                                <button
                                  onClick={() => handleOpenEditMember(m)}
                                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-amber-500 transition-colors"
                                  title="Edit Member"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteMember(m.id)}
                                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-red-500 transition-colors"
                                  title="Delete Member"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* TAB 2: REGISTRATION APPROVAL QUEUE                          */}
          {/* ─────────────────────────────────────────────────────────── */}
          {!loading && activeTab === 'approvals' && (
            <div className="space-y-4">
              {/* Queue Filter */}
              <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setApprovalStatusFilter('pending')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      approvalStatusFilter === 'pending'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Pending ({approvals.filter((a) => a.status.toLowerCase() === 'pending').length})
                  </button>
                  <button
                    onClick={() => setApprovalStatusFilter('approved')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      approvalStatusFilter === 'approved'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Approved ({approvals.filter((a) => a.status.toLowerCase() === 'approved').length})
                  </button>
                  <button
                    onClick={() => setApprovalStatusFilter('rejected')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      approvalStatusFilter === 'rejected'
                        ? 'bg-red-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Rejected ({approvals.filter((a) => a.status.toLowerCase() === 'rejected').length})
                  </button>
                  <button
                    onClick={() => setApprovalStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      approvalStatusFilter === 'all'
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    All ({approvals.length})
                  </button>
                </div>
              </div>

              {/* Queue List */}
              {filteredApprovals.length === 0 ? (
                <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-xs text-xs text-slate-400">
                  <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="font-bold text-slate-600 dark:text-slate-300">No registration requests in this state.</p>
                  <p>All pastoral review queues are up to date.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredApprovals.map((req) => (
                    <div
                      key={req.id}
                      className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">{req.fullName}</h3>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                req.status === 'pending'
                                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                  : req.status === 'approved'
                                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                  : 'bg-red-500/10 text-red-500 border-red-500/20'
                              }`}
                            >
                              {req.status}
                            </span>
                          </div>
                          <span className="font-mono text-[11px] text-slate-400">{req.phone}</span>
                        </div>

                        <span className="text-[10px] text-slate-400">
                          {req.submittedAt ? new Date(req.submittedAt).toLocaleDateString() : 'Recent'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Location</span>
                          <span className="font-medium text-slate-700 dark:text-slate-200">
                            {[req.city, req.state].filter(Boolean).join(', ') || 'Bangalore'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Zone</span>
                          <span className="font-medium text-slate-700 dark:text-slate-200">{req.zone || 'Central Zone'}</span>
                        </div>
                        {req.email && (
                          <div className="col-span-2">
                            <span className="text-slate-400 block text-[10px]">Email</span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">{req.email}</span>
                          </div>
                        )}
                        {req.rejectionReason && (
                          <div className="col-span-2 text-red-500">
                            <span className="block text-[10px] font-bold">Rejection Note:</span>
                            <span>{req.rejectionReason}</span>
                          </div>
                        )}
                      </div>

                      {req.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <button
                            onClick={() => {
                              setRejectionModalItem(req);
                              setRejectionReason('');
                            }}
                            disabled={isSubmitting}
                            className="px-3 py-1.5 rounded-xl border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold transition-colors"
                          >
                            Reject
                          </button>

                          <button
                            onClick={() => {
                              setInterviewModalItem(req);
                              setInterviewNotes('');
                            }}
                            disabled={isSubmitting}
                            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-xs"
                          >
                            Approve &amp; Activate
                          </button>
                        </div>
                      )}

                      {req.status !== 'pending' && (
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <span>Reviewed by {req.reviewedByName || 'Admin'}</span>
                          <button
                            onClick={() => handleDeleteRequest(req.id)}
                            className="text-red-500 hover:underline flex items-center gap-1"
                          >
                            <Trash2 size={12} />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* MODAL: APPROVE APPLICANT (INTERVIEW NOTES)                  */}
          {/* ─────────────────────────────────────────────────────────── */}
          {interviewModalItem && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Confirm Member Activation
                  </h3>
                  <button onClick={() => setInterviewModalItem(null)} className="text-slate-400 hover:text-white">
                    <X size={18} />
                  </button>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  You are approving <span className="font-bold text-slate-900 dark:text-white">{interviewModalItem.fullName}</span> ({interviewModalItem.phone}). This will create an active church membership record and grant congregation access.
                </p>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Pastoral Interview / Intake Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="E.g. Met with pastor on Sunday, verified baptism certificate..."
                    value={interviewNotes}
                    onChange={(e) => setInterviewNotes(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setInterviewModalItem(null)}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleApproveApplicant(interviewModalItem)}
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5"
                  >
                    {isSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    <span>Confirm Approval</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* MODAL: REJECT APPLICANT (REASON)                            */}
          {/* ─────────────────────────────────────────────────────────── */}
          {rejectionModalItem && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Reject Registration Application
                  </h3>
                  <button onClick={() => setRejectionModalItem(null)} className="text-slate-400 hover:text-white">
                    <X size={18} />
                  </button>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Rejecting registration for <span className="font-bold text-slate-900 dark:text-white">{rejectionModalItem.fullName}</span>. Please specify the pastoral reason.
                </p>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Rejection Reason
                  </label>
                  <input
                    type="text"
                    placeholder="E.g. Incomplete phone verification, located outside church zone..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setRejectionModalItem(null)}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRejectApplicant}
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5"
                  >
                    {isSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <XCircle size={14} />}
                    <span>Confirm Rejection</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* MODAL: ADD / EDIT MEMBER                                    */}
          {/* ─────────────────────────────────────────────────────────── */}
          {editMemberModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                      {editingMemberId ? 'Edit Member' : 'Add New Member'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {editingMemberId
                        ? 'Update member details below.'
                        : 'They will receive a shareable link to join Rhema Central Sanctuary'}
                    </p>
                  </div>
                  <button
                    onClick={() => setEditMemberModalOpen(false)}
                    className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSaveMember} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide text-[11px]">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Enter member's name"
                        value={memberFormName}
                        onChange={(e) => setMemberFormName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500 font-medium text-xs transition-colors"
                      />
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide text-[11px]">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 9876543210"
                        value={memberFormPhone}
                        onChange={(e) => setMemberFormPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500 font-medium text-xs transition-colors"
                      />
                    </div>

                    {/* Email Address */}
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide text-[11px]">
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="member@example.com"
                        value={memberFormEmail}
                        onChange={(e) => setMemberFormEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500 font-medium text-xs transition-colors"
                      />
                    </div>

                    {/* City / Village */}
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide text-[11px]">
                        City / Village
                      </label>
                      <input
                        type="text"
                        placeholder="Enter city or village"
                        value={memberFormCity}
                        onChange={(e) => setMemberFormCity(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500 font-medium text-xs transition-colors"
                      />
                    </div>

                    {/* Church Zone */}
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide text-[11px]">
                        Church Zone
                      </label>
                      <select
                        value={memberFormZone}
                        onChange={(e) => setMemberFormZone(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500 font-medium text-xs transition-colors"
                      >
                        <option value="Central Zone">Central Zone</option>
                        <option value="North Zone">North Zone</option>
                        <option value="South Zone">South Zone</option>
                        <option value="East Zone">East Zone</option>
                      </select>
                    </div>

                    {/* Date of Birth (DOB) */}
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide text-[11px]">
                        Date of Birth (DOB)
                      </label>
                      <input
                        type="date"
                        value={memberFormDob}
                        onChange={(e) => setMemberFormDob(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500 font-medium text-xs transition-colors"
                      />
                    </div>

                    {/* Baptism Date */}
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide text-[11px]">
                        Baptism Date
                      </label>
                      <input
                        type="date"
                        value={memberFormBaptismDate}
                        onChange={(e) => setMemberFormBaptismDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500 font-medium text-xs transition-colors"
                      />
                    </div>

                    {/* Wedding Anniversary Date */}
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide text-[11px]">
                        Wedding Anniversary Date
                      </label>
                      <input
                        type="date"
                        value={memberFormAnniversaryDate}
                        onChange={(e) => setMemberFormAnniversaryDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500 font-medium text-xs transition-colors"
                      />
                    </div>

                    {/* Primary Skill */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide text-[11px]">
                          Primary Skill
                        </label>
                        {memberFormPrimarySkill && (
                          <button
                            type="button"
                            onClick={() => setMemberFormPrimarySkill('')}
                            className="text-[10px] text-red-500 hover:text-red-400 font-semibold"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        list="church-skills-list"
                        placeholder="Select or enter primary skill"
                        value={memberFormPrimarySkill}
                        onChange={(e) => setMemberFormPrimarySkill(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500 font-medium text-xs transition-colors"
                      />
                    </div>

                    {/* Secondary Skill */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide text-[11px]">
                          Secondary Skill
                        </label>
                        {memberFormSecondarySkill && (
                          <button
                            type="button"
                            onClick={() => setMemberFormSecondarySkill('')}
                            className="text-[10px] text-red-500 hover:text-red-400 font-semibold"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        list="church-skills-list"
                        placeholder="Select or enter secondary skill"
                        value={memberFormSecondarySkill}
                        onChange={(e) => setMemberFormSecondarySkill(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500 font-medium text-xs transition-colors"
                      />
                    </div>

                    {/* Spiritual Status */}
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide text-[11px]">
                        Spiritual Status
                      </label>
                      <select
                        value={memberFormSpiritual}
                        onChange={(e) => setMemberFormSpiritual(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500 font-medium text-xs transition-colors"
                      >
                        <option value="Active Member">Active Member</option>
                        <option value="Baptized">Baptized</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Candidate">Candidate</option>
                      </select>
                    </div>

                    {/* Member Status */}
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide text-[11px]">
                        Member Status
                      </label>
                      <select
                        value={memberFormStatus}
                        onChange={(e) => setMemberFormStatus(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500 font-medium text-xs transition-colors"
                      >
                        <option value="Active">Active</option>
                        <option value="Under Pastoral Care">Under Pastoral Care</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  {/* Role Selector */}
                  <div className="pt-2">
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide text-[11px]">
                      Role
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Member', 'Admin', 'Super Admin'] as const).map((r) => {
                        const isSelected = memberFormRole.toLowerCase() === r.toLowerCase();
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setMemberFormRole(r)}
                            className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                              isSelected
                                ? 'bg-[#1a2d5a] dark:bg-blue-600 text-white border-[#1a2d5a] dark:border-blue-500 shadow-sm'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                            }`}
                          >
                            {r}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Skills Datalist */}
                  <datalist id="church-skills-list">
                    {ALL_CHURCH_SKILLS.map((skill) => (
                      <option key={skill} value={skill} />
                    ))}
                  </datalist>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setEditMemberModalOpen(false)}
                      disabled={isSubmitting}
                      className="px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2.5 rounded-full bg-[#1a2d5a] dark:bg-white text-white dark:text-slate-900 font-extrabold shadow-md hover:opacity-95 flex items-center gap-2 transition-all cursor-pointer"
                    >
                      {isSubmitting ? (
                        <RefreshCw size={15} className="animate-spin" />
                      ) : (
                        <Save size={15} />
                      )}
                      <span>{editingMemberId ? 'SAVE CHANGES' : 'ADD MEMBER'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* DRAWER: MEMBER DETAILS                                      */}
          {/* ─────────────────────────────────────────────────────────── */}
          {selectedMember && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-end">
              <div className="bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 w-full max-w-md h-full p-6 overflow-y-auto space-y-6 shadow-2xl">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
                    Member Dossier
                  </span>
                  <button onClick={() => setSelectedMember(null)} className="text-slate-400 hover:text-white">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <MemberAvatar member={selectedMember} size={64} className="rounded-2xl" />
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {selectedMember.fullName || selectedMember.name}
                    </h2>
                    <p className="text-xs font-mono text-slate-400">{selectedMember.memberCode || selectedMember.id}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 uppercase">
                        {selectedMember.role || selectedMember.userType}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 uppercase">
                        {selectedMember.status || selectedMember.accountStatus}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 text-xs divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="pt-2 flex justify-between">
                    <span className="text-slate-400">Phone Number</span>
                    <span className="font-mono font-medium text-slate-900 dark:text-white">
                      {selectedMember.phone || 'Not recorded'}
                    </span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-slate-400">Email Address</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {selectedMember.email || 'None'}
                    </span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-slate-400">Church Zone</span>
                    <span className="font-medium text-slate-900 dark:text-white">{selectedMember.zone || 'Central Zone'}</span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-slate-400">City / Village</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {selectedMember.city || selectedMember.village || 'Not recorded'}
                    </span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-slate-400">Date of Birth (DOB)</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {selectedMember.dob || 'Not recorded'}
                    </span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-slate-400">Baptism Date</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {selectedMember.baptismDate || selectedMember.Baptism_Date__c || 'Not recorded'}
                    </span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-slate-400">Wedding Anniversary</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {selectedMember.anniversaryDate || selectedMember.Anniversary_Date__c || 'Not recorded'}
                    </span>
                  </div>
                  <div className="pt-2 flex justify-between items-center">
                    <span className="text-slate-400">Primary Skill</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/40 text-[11px]">
                      {selectedMember.primarySkill || 'None'}
                    </span>
                  </div>
                  <div className="pt-2 flex justify-between items-center">
                    <span className="text-slate-400">Secondary Skill</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800/40 text-[11px]">
                      {selectedMember.secondarySkill || 'None'}
                    </span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-slate-400">Spiritual Status</span>
                    <span className="font-medium text-sky-500">{selectedMember.spiritualStatus}</span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-slate-400">Joined Church Date</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {selectedMember.joinDate ? new Date(selectedMember.joinDate).toLocaleDateString() : 'Active Member'}
                    </span>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedMember(null);
                      handleOpenEditMember(selectedMember);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <Edit2 size={14} />
                    <span>Edit Profile</span>
                  </button>
                  <button
                    onClick={() => handleDeleteMember(selectedMember.id)}
                    className="p-2.5 rounded-xl border border-red-300 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    title="Delete Member"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminNavigationShell>
    </ProtectedRoute>
  );
}
