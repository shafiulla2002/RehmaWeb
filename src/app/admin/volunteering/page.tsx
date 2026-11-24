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
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import {
  AdminVolunteerApplication,
  INITIAL_ADMIN_VOLUNTEERS,
  VolunteerDepartment,
  VolunteerOnboardingStatus,
} from '@/lib/adminWave7bData';
import {
  UserCheck,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  User,
  Phone,
  Mail,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Plus,
  X,
  Briefcase,
  Calendar,
  Tag,
  Award,
  Layers,
  HeartHandshake,
  Music,
  Smile,
  Coffee,
  Users,
} from 'lucide-react';

const STORAGE_KEY_VOLUNTEERING = '@rhema_admin_demo_volunteering';

const VOLUNTEER_DEPARTMENTS: VolunteerDepartment[] = [
  'Ushering & Hospitality',
  'Worship Choir & Media Audio/Visual',
  "Children's & Teens Ministry",
  'Intercessory Prayer Team',
  'Community Outreach & Food Drive',
  'Welcome Desk & Guest Care',
];

const ONBOARDING_STATUSES: VolunteerOnboardingStatus[] = [
  'Applied (Sim)',
  'Screening & Interview (Sim)',
  'Orientation & Training (Sim)',
  'Active Volunteer (Sim)',
  'Inactive (Sim)',
];

export default function VolunteerManagementAdminPage() {
  const [volunteers, setVolunteers] = useState<AdminVolunteerApplication[]>(INITIAL_ADMIN_VOLUNTEERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Review & Assignment Modal State
  const [reviewVolunteer, setReviewVolunteer] = useState<AdminVolunteerApplication | null>(null);
  const [targetStatus, setTargetStatus] = useState<VolunteerOnboardingStatus>('Applied (Sim)');
  const [targetDept, setTargetDept] = useState<VolunteerDepartment>('Ushering & Hospitality');
  const [assignedRole, setAssignedRole] = useState('');
  const [assignedMentor, setAssignedMentor] = useState('');
  const [bgCheckVerified, setBgCheckVerified] = useState(false);

  // Add Volunteer Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('+91 98458-XXXX5');
  const [newEmail, setNewEmail] = useState('');
  const [newDept, setNewDept] = useState<VolunteerDepartment>('Ushering & Hospitality');
  const [newSkillsStr, setNewSkillsStr] = useState('First-Time Guest Welcome, Crowd Guidance');
  const [newAvailability, setNewAvailability] = useState<AdminVolunteerApplication['availability']>('Sunday 1st Service');
  const [newMentor, setNewMentor] = useState('Brother Stephen (Head Usher)');

  // Real-time Firestore sync with initial seeding fallback
  useEffect(() => {
    const colRef = collection(db, 'Rhema Church', 'rhema', 'volunteer_applications');
    const unsubscribe = onSnapshot(
      colRef,
      async (snapshot) => {
        if (snapshot.empty) {
          try {
            const batch = writeBatch(db);
            INITIAL_ADMIN_VOLUNTEERS.forEach((item) => {
              const docRef = doc(colRef, item.id);
              batch.set(docRef, {
                volunteerName: item.volunteerName,
                phoneMasked: item.phoneMasked,
                email: item.email,
                department: item.department,
                skills: item.skills,
                availability: item.availability,
                status: item.status,
                backgroundCheckVerified: item.backgroundCheckVerified,
                departmentMentor: item.departmentMentor,
                assignedServiceRole: item.assignedServiceRole || null,
                joinedDate: item.joinedDate,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            });
            await batch.commit();
          } catch (seedErr) {
            console.error('[VolunteerAdminPage] Seeding error:', seedErr);
            setVolunteers(INITIAL_ADMIN_VOLUNTEERS);
          }
        } else {
          const loaded: AdminVolunteerApplication[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              demoTag: 'Live Volunteer Record',
              volunteerName: data.volunteerName || data.applicantName || 'Volunteer',
              phoneMasked: data.phoneMasked || data.memberPhone || '+91 98458-XXXXX',
              email: data.email || 'volunteer@rhema.org',
              department: (data.department || 'Ushering & Hospitality') as VolunteerDepartment,
              skills: Array.isArray(data.skills) ? data.skills : ['General Ministry Service'],
              availability: data.availability || 'Sunday 1st Service',
              status: (data.status || 'Applied (Sim)') as VolunteerOnboardingStatus,
              backgroundCheckVerified: Boolean(data.backgroundCheckVerified),
              departmentMentor: data.departmentMentor || 'Ministry Lead',
              assignedServiceRole: data.assignedServiceRole || undefined,
              joinedDate: data.joinedDate || '2026-11-24',
            };
          });
          setVolunteers(loaded);
        }
      },
      (err) => {
        console.error('[VolunteerAdminPage] Firestore error:', err);
        setVolunteers(INITIAL_ADMIN_VOLUNTEERS);
      }
    );

    return () => unsubscribe();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Open Review & Assignment Modal
  const openReviewModal = (vol: AdminVolunteerApplication) => {
    setReviewVolunteer(vol);
    setTargetStatus(vol.status);
    setTargetDept(vol.department);
    setAssignedRole(vol.assignedServiceRole || '');
    setAssignedMentor(vol.departmentMentor);
    setBgCheckVerified(vol.backgroundCheckVerified);
  };

  // Save Review / Ministry Assignment
  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewVolunteer) return;

    try {
      await updateDoc(doc(db, 'Rhema Church', 'rhema', 'volunteer_applications', reviewVolunteer.id), {
        status: targetStatus,
        department: targetDept,
        assignedServiceRole: assignedRole.trim() || null,
        departmentMentor: assignedMentor.trim() || reviewVolunteer.departmentMentor,
        backgroundCheckVerified: bgCheckVerified,
        updatedAt: serverTimestamp(),
      });
      showToast(`Updated ministry profile for ${reviewVolunteer.volunteerName}: ${targetStatus}.`);
    } catch (err: any) {
      console.error('[VolunteerAdminPage] Save review error:', err);
      showToast('Error updating volunteer application.');
    }
    setReviewVolunteer(null);
  };

  // Quick Toggle Background Check
  const toggleBackgroundCheck = async (volId: string) => {
    const vol = volunteers.find((v) => v.id === volId);
    if (!vol) return;
    const nextState = !vol.backgroundCheckVerified;
    try {
      await updateDoc(doc(db, 'Rhema Church', 'rhema', 'volunteer_applications', volId), {
        backgroundCheckVerified: nextState,
        updatedAt: serverTimestamp(),
      });
      showToast(
        nextState
          ? `Background check marked verified for ${vol.volunteerName}.`
          : `Background check cleared/reset for ${vol.volunteerName}.`
      );
    } catch (err) {
      console.error('[VolunteerAdminPage] Toggle background check error:', err);
    }
  };

  // Quick Action: Activate Volunteer
  const handleQuickActivate = async (volId: string) => {
    try {
      await updateDoc(doc(db, 'Rhema Church', 'rhema', 'volunteer_applications', volId), {
        status: 'Active Volunteer (Sim)',
        backgroundCheckVerified: true,
        updatedAt: serverTimestamp(),
      });
      showToast('Volunteer activated for service roster.');
    } catch (err) {
      console.error('[VolunteerAdminPage] Quick activate error:', err);
    }
  };

  // Add New Volunteer Application
  const handleAddVolunteer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const parsedSkills = newSkillsStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const colRef = collection(db, 'Rhema Church', 'rhema', 'volunteer_applications');
      const docRef = await addDoc(colRef, {
        volunteerName: newName.trim(),
        phoneMasked: newPhone.trim(),
        memberPhone: newPhone.trim(),
        email: newEmail.trim() || `${newName.toLowerCase().replace(/\s+/g, '.')}@rhema.org`,
        department: newDept,
        skills: parsedSkills.length > 0 ? parsedSkills : ['General Ministry Service'],
        availability: newAvailability,
        status: 'Applied (Sim)',
        backgroundCheckVerified: false,
        departmentMentor: newMentor.trim() || 'Ministry Lead',
        joinedDate: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      showToast(`Registered new volunteer application ${newName.trim()} (${docRef.id}).`);
    } catch (err: any) {
      console.error('[VolunteerAdminPage] Add error:', err);
      showToast('Error registering volunteer application.');
    }

    setAddModalOpen(false);
    setNewName('');
  };

  // Filter Volunteers
  const filteredVolunteers = useMemo(() => {
    return volunteers.filter((v) => {
      const matchSearch =
        v.volunteerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (v.assignedServiceRole && v.assignedServiceRole.toLowerCase().includes(searchQuery.toLowerCase())) ||
        v.departmentMentor.toLowerCase().includes(searchQuery.toLowerCase());
      const matchDept = selectedDept === 'All' || v.department === selectedDept;
      const matchStatus = selectedStatus === 'All' || v.status === selectedStatus;
      return matchSearch && matchDept && matchStatus;
    });
  }, [volunteers, searchQuery, selectedDept, selectedStatus]);

  // Statistics
  const activeCount = useMemo(() => volunteers.filter((v) => v.status === 'Active Volunteer (Sim)').length, [volunteers]);
  const onboardingCount = useMemo(() => volunteers.filter((v) => v.status !== 'Active Volunteer (Sim)' && v.status !== 'Inactive (Sim)').length, [volunteers]);
  const bgVerifiedCount = useMemo(() => volunteers.filter((v) => v.backgroundCheckVerified).length, [volunteers]);

  const getDepartmentBadgeClass = (dept: VolunteerDepartment) => {
    switch (dept) {
      case 'Worship Choir & Media Audio/Visual':
        return 'bg-purple-500/10 border-purple-500/30 text-purple-300';
      case "Children's & Teens Ministry":
        return 'bg-amber-500/10 border-amber-500/30 text-amber-300';
      case 'Ushering & Hospitality':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300';
      case 'Intercessory Prayer Team':
        return 'bg-rose-500/10 border-rose-500/30 text-rose-300';
      case 'Community Outreach & Food Drive':
        return 'bg-blue-500/10 border-blue-500/30 text-blue-300';
      case 'Welcome Desk & Guest Care':
        return 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300';
    }
  };

  const getStatusBadge = (status: VolunteerOnboardingStatus) => {
    switch (status) {
      case 'Active Volunteer (Sim)':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
            <CheckCircle2 size={12} /> Active Serving
          </span>
        );
      case 'Orientation & Training (Sim)':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-950/80 border border-indigo-500/40 text-indigo-300">
            <Layers size={12} /> Orientation &amp; Training
          </span>
        );
      case 'Screening & Interview (Sim)':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-950/80 border border-amber-500/40 text-amber-300">
            <Clock size={12} /> Screening &amp; Interview
          </span>
        );
      case 'Applied (Sim)':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 border border-slate-700 text-slate-300">
            <Briefcase size={12} /> Applied
          </span>
        );
      case 'Inactive (Sim)':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-950/40 border border-red-500/30 text-red-400">
            Inactive
          </span>
        );
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
      <AdminNavigationShell>
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-400">
                <UserCheck size={14} />
                <span>M39 — Ministry Operations</span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                Volunteer Management &amp; Service Roster Hub
              </h1>
              <p className="text-xs text-slate-400">
                Oversee the 4-stage volunteer onboarding workflow, assign mentors, verify background clearances, and deploy disciples across the 6 major church ministry departments.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="secondary"
                size="sm"
                className="gap-2 font-bold bg-indigo-500 hover:bg-indigo-400 text-white"
                onClick={() => setAddModalOpen(true)}
              >
                <Plus size={15} />
                <span>+ Register Volunteer</span>
              </Button>
            </div>
          </div>

          {/* Toast Notification */}
          {toastMessage && (
            <div className="p-3.5 bg-emerald-950/80 border border-emerald-500/40 rounded-xl flex items-center justify-between text-xs text-emerald-200 shadow-lg animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>{toastMessage}</span>
              </div>
              <button onClick={() => setToastMessage(null)} className="text-emerald-400 hover:text-white">
                <X size={14} />
              </button>
            </div>
          )}

          {/* KPI Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-medium">Total Volunteers</span>
                <Users size={16} className="text-slate-400" />
              </div>
              <div className="text-2xl font-extrabold text-white">{volunteers.length}</div>
              <p className="text-[11px] text-slate-500 mt-1">Across 6 departments</p>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-medium">Active Serving</span>
                <CheckCircle2 size={16} className="text-emerald-400" />
              </div>
              <div className="text-2xl font-extrabold text-emerald-300">{activeCount}</div>
              <p className="text-[11px] text-slate-500 mt-1">Deployed in Sunday rosters</p>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-medium">In Onboarding</span>
                <Clock size={16} className="text-amber-400" />
              </div>
              <div className="text-2xl font-extrabold text-amber-300">{onboardingCount}</div>
              <p className="text-[11px] text-slate-500 mt-1">Screening &amp; orientation</p>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-medium">Verified Backgrounds</span>
                <ShieldCheck size={16} className="text-indigo-400" />
              </div>
              <div className="text-2xl font-extrabold text-indigo-300">{bgVerifiedCount}</div>
              <p className="text-[11px] text-slate-500 mt-1">Ministry safety compliance</p>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2 relative">
              <Search size={15} className="absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search volunteers by name, skills, role, or mentor..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="All">All Departments</option>
                {VOLUNTEER_DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="All">All Onboarding Stages</option>
                {ONBOARDING_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Volunteers Queue */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Volunteers Roster ({filteredVolunteers.length})
                </span>
                <span className="text-[10px] text-slate-500">· Layer A Local Persistence</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Four-Stage Onboarding Pipeline
              </div>
            </div>

            {filteredVolunteers.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No volunteers match the specified filters.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {filteredVolunteers.map((vol) => (
                  <div
                    key={vol.id}
                    className="p-5 hover:bg-slate-850/50 transition-colors flex flex-col md:flex-row md:items-start justify-between gap-4"
                  >
                    <div className="space-y-2.5 flex-1">
                      {/* Top Badges & ID */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-mono text-indigo-400 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-500/30 font-semibold">
                          {vol.id}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getDepartmentBadgeClass(
                            vol.department
                          )}`}
                        >
                          {vol.department}
                        </span>
                        {getStatusBadge(vol.status)}

                        {vol.backgroundCheckVerified ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/40">
                            <ShieldCheck size={10} /> Background Cleared
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/40">
                            <ShieldAlert size={10} /> Background Check Pending
                          </span>
                        )}
                      </div>

                      {/* Volunteer Name & Assigned Service Role */}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white leading-snug">
                            {vol.volunteerName}
                          </h3>
                          {vol.assignedServiceRole && (
                            <span className="text-xs font-semibold text-indigo-300 bg-indigo-950/50 px-2.5 py-0.5 rounded-md border border-indigo-500/30">
                              Role: {vol.assignedServiceRole}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Skills Tags */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Tag size={10} /> Skills:
                        </span>
                        {vol.skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-medium text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>

                      {/* Contact, Availability, Mentor */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-400 pt-1">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Phone size={12} className="text-slate-500" />
                          <span>{vol.phoneMasked}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Calendar size={12} className="text-slate-500" />
                          <span>Slot: {vol.availability}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-400">
                          <User size={12} className="text-slate-500" />
                          <span>Mentor: {vol.departmentMentor}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Clock size={12} />
                          <span>Joined: {vol.joinedDate}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Panel */}
                    <div className="flex md:flex-col items-center gap-2 shrink-0 pt-2 md:pt-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs gap-1.5 w-full justify-center bg-slate-800 hover:bg-slate-700 text-white"
                        onClick={() => openReviewModal(vol)}
                      >
                        <Briefcase size={13} />
                        <span>Manage / Assign</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className={`text-xs gap-1.5 w-full justify-center ${
                          vol.backgroundCheckVerified
                            ? 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/20'
                            : 'border-amber-500/40 text-amber-300 hover:bg-amber-950/20'
                        }`}
                        onClick={() => toggleBackgroundCheck(vol.id)}
                      >
                        <Shield size={13} />
                        <span>{vol.backgroundCheckVerified ? 'Reset Check' : 'Verify Check'}</span>
                      </Button>

                      {vol.status !== 'Active Volunteer (Sim)' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30 w-full justify-center"
                          onClick={() => handleQuickActivate(vol.id)}
                        >
                          <CheckCircle2 size={13} />
                          <span>Activate</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Manage Onboarding & Ministry Assignment Modal */}
          {reviewVolunteer && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <UserCheck size={18} className="text-indigo-400" />
                    <h2 className="text-lg font-bold text-white">Volunteer Assignment &amp; Onboarding</h2>
                  </div>
                  <button
                    onClick={() => setReviewVolunteer(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{reviewVolunteer.volunteerName}</span>
                    <span className="text-indigo-400 font-mono">{reviewVolunteer.id}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-slate-400 pt-1">
                    <span>Contact: {reviewVolunteer.phoneMasked}</span>
                    <span>·</span>
                    <span>Availability: {reviewVolunteer.availability}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Skills: {reviewVolunteer.skills.join(', ')}
                  </div>
                </div>

                <form onSubmit={handleSaveReview} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Department</label>
                      <select
                        value={targetDept}
                        onChange={(e) => setTargetDept(e.target.value as VolunteerDepartment)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        {VOLUNTEER_DEPARTMENTS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Onboarding Status</label>
                      <select
                        value={targetStatus}
                        onChange={(e) => setTargetStatus(e.target.value as VolunteerOnboardingStatus)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        {ONBOARDING_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Assigned Service Role</label>
                      <input
                        type="text"
                        value={assignedRole}
                        onChange={(e) => setAssignedRole(e.target.value)}
                        placeholder="e.g. FOH Sound Engineer (Morning)"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Department Mentor / Lead</label>
                      <input
                        type="text"
                        value={assignedMentor}
                        onChange={(e) => setAssignedMentor(e.target.value)}
                        placeholder="e.g. Brother Stephen (Head Usher)"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Safety &amp; Background Clearance</div>
                      <div className="text-[10px] text-slate-400">Verified through pastoral leadership protocols</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={bgCheckVerified}
                      onChange={(e) => setBgCheckVerified(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-500 focus:ring-indigo-400 bg-slate-950 border-slate-700"
                    />
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-slate-700 text-slate-300"
                      onClick={() => setReviewVolunteer(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                    >
                      Save Assignment &amp; Status
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Add Volunteer Modal */}
          {addModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <UserCheck size={18} className="text-indigo-400" />
                    <h2 className="text-lg font-bold text-white">Register Volunteer Application</h2>
                  </div>
                  <button
                    onClick={() => setAddModalOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleAddVolunteer} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Volunteer Full Name</label>
                      <input
                        type="text"
                        required
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="e.g. Timothy Barnabas"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Masked Phone</label>
                      <input
                        type="text"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Preferred Department</label>
                      <select
                        value={newDept}
                        onChange={(e) => setNewDept(e.target.value as VolunteerDepartment)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        {VOLUNTEER_DEPARTMENTS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Service Availability</label>
                      <select
                        value={newAvailability}
                        onChange={(e) => setNewAvailability(e.target.value as AdminVolunteerApplication['availability'])}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="Sunday 1st Service">Sunday 1st Service</option>
                        <option value="Sunday 2nd Service">Sunday 2nd Service</option>
                        <option value="Sunday Youth">Sunday Youth</option>
                        <option value="Mid-Week">Mid-Week</option>
                        <option value="Special Events">Special Events</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Skills / Talents (comma-separated)</label>
                    <input
                      type="text"
                      value={newSkillsStr}
                      onChange={(e) => setNewSkillsStr(e.target.value)}
                      placeholder="e.g. Photography, Video Editing, Guitar"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Department Mentor</label>
                    <input
                      type="text"
                      value={newMentor}
                      onChange={(e) => setNewMentor(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-slate-700 text-slate-300"
                      onClick={() => setAddModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                    >
                      Submit Volunteer Profile
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
