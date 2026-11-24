'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminNavigationShell } from '@/components/layout/AdminNavigationShell';
import { Button } from '@/components/ui/Button';
import {
  AdminBaptismCandidate,
  INITIAL_ADMIN_BAPTISM,
  BaptismStage,
} from '@/lib/adminWave7bData';
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
  Droplets,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  User,
  Phone,
  Mail,
  Calendar,
  Award,
  BookOpen,
  UserCheck,
  Plus,
  X,
  Sparkles,
  AlertCircle,
  FileText,
  ChevronRight,
  Shield,
  MapPin,
  Loader2,
} from 'lucide-react';

const BAPTISM_STAGES: BaptismStage[] = [
  'Stage 1: Application Review (Sim)',
  'Stage 2: Counseling Scheduled (Sim)',
  'Stage 3: Pastoral Interview Passed (Sim)',
  'Stage 4: Baptism Service Scheduled (Sim)',
];

export default function BaptismAdminPage() {
  const [candidates, setCandidates] = useState<AdminBaptismCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('All');
  const [selectedZone, setSelectedZone] = useState<string>('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Review Modal State
  const [reviewCandidate, setReviewCandidate] = useState<AdminBaptismCandidate | null>(null);
  const [targetStage, setTargetStage] = useState<BaptismStage>('Stage 1: Application Review (Sim)');
  const [assignedCounselor, setAssignedCounselor] = useState('');
  const [classesCount, setClassesCount] = useState<number>(0);
  const [serviceDate, setServiceDate] = useState('');

  // Certificate Modal State
  const [certificateCandidate, setCertificateCandidate] = useState<AdminBaptismCandidate | null>(null);

  // Add Candidate Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState<number>(24);
  const [newPhone, setNewPhone] = useState('+91 99003-XXXX8');
  const [newEmail, setNewEmail] = useState('');
  const [newZone, setNewZone] = useState('Whitefield Zone');
  const [newSalvationDate, setNewSalvationDate] = useState('2026-01-01');
  const [newSnippet, setNewSnippet] = useState('');

  // Real-time Firestore Subscription with Seeding Fallback
  useEffect(() => {
    const colRef = collection(db, 'Rhema Church', 'rhema', 'baptism_requests');
    const unsubscribe = onSnapshot(
      colRef,
      async (snapshot) => {
        if (snapshot.empty) {
          try {
            const batch = writeBatch(db);
            INITIAL_ADMIN_BAPTISM.forEach((item) => {
              const newDocRef = doc(colRef, item.id);
              batch.set(newDocRef, {
                candidateName: item.candidateName,
                memberName: item.candidateName,
                age: item.age,
                phoneMasked: item.phoneMasked,
                memberPhone: item.phoneMasked,
                email: item.email,
                zone: item.zone,
                salvationDate: item.salvationDate,
                personalTestimonySnippet: item.personalTestimonySnippet,
                currentStage: item.currentStage,
                counselorAssigned: item.counselorAssigned,
                classesCompletedCount: item.classesCompletedCount,
                scheduledBaptismDate: item.scheduledBaptismDate || null,
                certificateIssued: item.certificateIssued,
                status: item.currentStage.includes('Stage 4') ? 'approved' : item.currentStage.includes('Stage 1') ? 'pending' : 'under_review',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            });
            await batch.commit();
          } catch (seedErr) {
            console.error('[BaptismAdminPage] Seeding error:', seedErr);
            setCandidates(INITIAL_ADMIN_BAPTISM);
            setLoading(false);
          }
        } else {
          const loaded: AdminBaptismCandidate[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              demoTag: 'Live Baptism Candidate',
              candidateName: data.candidateName || data.memberName || 'Candidate',
              age: data.age || 20,
              phoneMasked: data.phoneMasked || data.memberPhone || '+91 99003-XXXXX',
              email: data.email || 'candidate@rhema.org',
              zone: data.zone || 'General',
              salvationDate: data.salvationDate || '2026-01-01',
              personalTestimonySnippet: data.personalTestimonySnippet || data.reason || data.testimony || '',
              currentStage: (data.currentStage || 'Stage 1: Application Review (Sim)') as BaptismStage,
              counselorAssigned: data.counselorAssigned || data.mentorName || undefined,
              classesCompletedCount: data.classesCompletedCount || 0,
              scheduledBaptismDate: data.scheduledBaptismDate || data.confirmedDate || undefined,
              certificateIssued: Boolean(data.certificateIssued),
              appliedDate: data.appliedDate || '2026-11-24',
            };
          });
          setCandidates(loaded);
          setLoading(false);
        }
      },
      (err) => {
        console.error('[BaptismAdminPage] Firestore error:', err);
        setCandidates(INITIAL_ADMIN_BAPTISM);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Open Stage & Pastoral Review Modal
  const openReviewModal = (cand: AdminBaptismCandidate) => {
    setReviewCandidate(cand);
    setTargetStage(cand.currentStage);
    setAssignedCounselor(cand.counselorAssigned || 'Pastor John Mark');
    setClassesCount(cand.classesCompletedCount);
    setServiceDate(cand.scheduledBaptismDate || '2026-11-29');
  };

  // Save Review / Stage Progression
  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewCandidate) return;

    try {
      const docRef = doc(db, 'Rhema Church', 'rhema', 'baptism_requests', reviewCandidate.id);
      let newStatus = 'under_review';
      if (targetStage.includes('Stage 1')) newStatus = 'pending';
      if (targetStage.includes('Stage 4')) newStatus = 'approved';

      await updateDoc(docRef, {
        currentStage: targetStage,
        status: newStatus,
        counselorAssigned: assignedCounselor.trim() || null,
        classesCompletedCount: classesCount,
        scheduledBaptismDate: targetStage === 'Stage 4: Baptism Service Scheduled (Sim)' ? serviceDate : (reviewCandidate.scheduledBaptismDate || null),
        confirmedDate: targetStage === 'Stage 4: Baptism Service Scheduled (Sim)' ? serviceDate : null,
        updatedAt: serverTimestamp(),
      });
      showToast(`Updated baptism profile for ${reviewCandidate.candidateName}: ${targetStage}.`);
    } catch (err: any) {
      console.error('[BaptismAdminPage] Save review error:', err);
      showToast('Error updating baptism candidate.');
    }
    setReviewCandidate(null);
  };

  // Class Increment Helper
  const handleIncrementClass = async (candId: string) => {
    const cand = candidates.find((c) => c.id === candId);
    if (!cand) return;
    const nextCount = Math.min(3, cand.classesCompletedCount + 1);
    try {
      await updateDoc(doc(db, 'Rhema Church', 'rhema', 'baptism_requests', candId), {
        classesCompletedCount: nextCount,
        updatedAt: serverTimestamp(),
      });
      showToast('Updated preparatory doctrine class count.');
    } catch (err) {
      console.error('[BaptismAdminPage] Increment class error:', err);
    }
  };

  // Issue Certificate
  const handleIssueCertificate = async (candId: string) => {
    try {
      await updateDoc(doc(db, 'Rhema Church', 'rhema', 'baptism_requests', candId), {
        certificateIssued: true,
        status: 'completed',
        updatedAt: serverTimestamp(),
      });
      showToast('Water Baptism Certificate issued.');
    } catch (err) {
      console.error('[BaptismAdminPage] Issue certificate error:', err);
    }
  };

  // Add Candidate Form
  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newSnippet.trim()) return;

    try {
      const colRef = collection(db, 'Rhema Church', 'rhema', 'baptism_requests');
      const docRef = await addDoc(colRef, {
        candidateName: newName.trim(),
        memberName: newName.trim(),
        age: Number(newAge),
        phoneMasked: newPhone.trim(),
        memberPhone: newPhone.trim(),
        email: newEmail.trim() || `${newName.toLowerCase().replace(/\s+/g, '.')}@rhema.org`,
        zone: newZone,
        salvationDate: newSalvationDate,
        personalTestimonySnippet: newSnippet.trim(),
        reason: newSnippet.trim(),
        testimony: newSnippet.trim(),
        currentStage: 'Stage 1: Application Review (Sim)',
        status: 'pending',
        classesCompletedCount: 0,
        appliedDate: new Date().toISOString().split('T')[0],
        certificateIssued: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      showToast(`Registered new baptism candidate ${newName.trim()} (${docRef.id}).`);
    } catch (err: any) {
      console.error('[BaptismAdminPage] Add candidate error:', err);
      showToast('Error registering baptism candidate.');
    }

    setAddModalOpen(false);
    setNewName('');
    setNewSnippet('');
  };

  // Filter Candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const matchSearch =
        c.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.zone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.counselorAssigned && c.counselorAssigned.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchStage = selectedStage === 'All' || c.currentStage === selectedStage;
      const matchZone = selectedZone === 'All' || c.zone === selectedZone;
      return matchSearch && matchStage && matchZone;
    });
  }, [candidates, searchQuery, selectedStage, selectedZone]);

  // Statistics
  const stage1Count = useMemo(() => candidates.filter((c) => c.currentStage.includes('Stage 1')).length, [candidates]);
  const stage23Count = useMemo(() => candidates.filter((c) => c.currentStage.includes('Stage 2') || c.currentStage.includes('Stage 3')).length, [candidates]);
  const stage4Count = useMemo(() => candidates.filter((c) => c.currentStage.includes('Stage 4')).length, [candidates]);
  const certCount = useMemo(() => candidates.filter((c) => c.certificateIssued).length, [candidates]);

  const getStageBadge = (stage: BaptismStage) => {
    if (stage.includes('Stage 4')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
          <CheckCircle2 size={12} /> Stage 4: Service Scheduled
        </span>
      );
    }
    if (stage.includes('Stage 3')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-950/80 border border-blue-500/40 text-blue-300">
          <UserCheck size={12} /> Stage 3: Pastoral Interview Passed
        </span>
      );
    }
    if (stage.includes('Stage 2')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-950/80 border border-amber-500/40 text-amber-300">
          <Clock size={12} /> Stage 2: Counseling Scheduled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 border border-slate-700 text-slate-300">
        <FileText size={12} /> Stage 1: Application Review
      </span>
    );
  };

  return (
    <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
      <AdminNavigationShell>
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-semibold text-cyan-400">
                <Droplets size={14} />
                <span>M38 — Ministry Operations</span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                Baptism Requests &amp; Discipleship Intake
              </h1>
              <p className="text-xs text-slate-400">
                Manage candidate obedience through the 4-stage baptism journey: application triage, preparatory doctrine classes, pastoral interview, and immersion service scheduling.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="secondary"
                size="sm"
                className="gap-2 font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950"
                onClick={() => setAddModalOpen(true)}
              >
                <Plus size={15} />
                <span>+ Log Baptism Candidate</span>
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
                <span className="text-xs font-medium">Stage 1: Review</span>
                <Clock size={16} className="text-slate-400" />
              </div>
              <div className="text-2xl font-extrabold text-white">{stage1Count}</div>
              <p className="text-[11px] text-slate-500 mt-1">Awaiting triage &amp; mentor</p>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-medium">Stages 2 &amp; 3: Prep</span>
                <BookOpen size={16} className="text-amber-400" />
              </div>
              <div className="text-2xl font-extrabold text-amber-300">{stage23Count}</div>
              <p className="text-[11px] text-slate-500 mt-1">Classes &amp; pastoral interview</p>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-medium">Stage 4: Pool Service</span>
                <Droplets size={16} className="text-cyan-400" />
              </div>
              <div className="text-2xl font-extrabold text-cyan-300">{stage4Count}</div>
              <p className="text-[11px] text-slate-500 mt-1">Ready for water immersion</p>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-medium">Certificates Issued</span>
                <Award size={16} className="text-emerald-400" />
              </div>
              <div className="text-2xl font-extrabold text-emerald-300">{certCount}</div>
              <p className="text-[11px] text-slate-500 mt-1">Post-baptism registry</p>
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
                placeholder="Search candidates by name, zone, counselor, or ID..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
              >
                <option value="All">All Stages</option>
                {BAPTISM_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
              >
                <option value="All">All Church Zones</option>
                <option value="Whitefield Zone">Whitefield Zone</option>
                <option value="Hebbal Zone">Hebbal Zone</option>
                <option value="Indiranagar Zone">Indiranagar Zone</option>
                <option value="Koramangala Zone">Koramangala Zone</option>
              </select>
            </div>
          </div>

          {/* Baptism Candidates Queue */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Candidates Queue ({filteredCandidates.length})
                </span>
                <span className="text-[10px] text-slate-500">· Layer A Local Persistence</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Four-Stage Discipleship Pipeline
              </div>
            </div>

            {filteredCandidates.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No candidates match the specified filter criteria.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {filteredCandidates.map((cand) => (
                  <div
                    key={cand.id}
                    className="p-5 hover:bg-slate-850/50 transition-colors flex flex-col md:flex-row md:items-start justify-between gap-4"
                  >
                    <div className="space-y-2.5 flex-1">
                      {/* Top Badges & ID */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-mono text-cyan-400/90 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30 font-semibold">
                          {cand.id}
                        </span>
                        {getStageBadge(cand.currentStage)}
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          <MapPin size={10} className="text-slate-500" /> {cand.zone}
                        </span>
                        {cand.certificateIssued && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/40">
                            <Award size={10} /> Certificate Ready
                          </span>
                        )}
                      </div>

                      {/* Candidate Name & Salvation History */}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white leading-snug">
                            {cand.candidateName}
                          </h3>
                          <span className="text-xs text-slate-400">· Age {cand.age}</span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 font-sans">
                          &ldquo;{cand.personalTestimonySnippet}&rdquo;
                        </p>
                      </div>

                      {/* Contact & Class Progression */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-400 pt-1">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Phone size={12} className="text-slate-500" />
                          <span>{cand.phoneMasked}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Calendar size={12} className="text-slate-500" />
                          <span>Saved: {cand.salvationDate}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-400">
                          <User size={12} className="text-slate-500" />
                          <span>Counselor: {cand.counselorAssigned || 'Unassigned'}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">Classes:</span>
                          <span className="font-semibold text-white">
                            {cand.classesCompletedCount} / 3 Complete
                          </span>
                          {cand.classesCompletedCount < 3 && (
                            <button
                              type="button"
                              onClick={() => handleIncrementClass(cand.id)}
                              className="px-1.5 py-0.5 text-[10px] font-bold bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 rounded"
                              title="Mark next doctrine class complete (Sim)"
                            >
                              +1
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Scheduled Immersion Info */}
                      {cand.scheduledBaptismDate && (
                        <div className="p-2.5 bg-cyan-950/20 border border-cyan-500/30 rounded-xl text-xs text-cyan-200 flex items-center gap-2">
                          <Droplets size={14} className="text-cyan-400 shrink-0" />
                          <div>
                            <span className="font-bold">Baptism Immersion Service Date: </span>
                            <span>{cand.scheduledBaptismDate} (Central Sanctuary Baptistery)</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions Panel */}
                    <div className="flex md:flex-col items-center gap-2 shrink-0 pt-2 md:pt-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs gap-1.5 w-full justify-center bg-slate-800 hover:bg-slate-700 text-white"
                        onClick={() => openReviewModal(cand)}
                      >
                        <Shield size={13} />
                        <span>Manage Stage</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1.5 w-full justify-center border-slate-700 text-slate-300 hover:text-white"
                        onClick={() => setCertificateCandidate(cand)}
                      >
                        <Award size={13} className="text-amber-400" />
                        <span>Certificate</span>
                      </Button>

                      {!cand.certificateIssued && cand.currentStage.includes('Stage 4') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30 w-full justify-center"
                          onClick={() => handleIssueCertificate(cand.id)}
                        >
                          <CheckCircle2 size={13} />
                          <span>Issue Cert</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Manage Stage & Pastoral Review Modal */}
          {reviewCandidate && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Droplets size={18} className="text-cyan-400" />
                    <h2 className="text-lg font-bold text-white">Manage Baptism Pipeline Stage</h2>
                  </div>
                  <button
                    onClick={() => setReviewCandidate(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{reviewCandidate.candidateName}</span>
                    <span className="text-cyan-400 font-mono">{reviewCandidate.id}</span>
                  </div>
                  <p className="text-slate-300 italic">&ldquo;{reviewCandidate.personalTestimonySnippet}&rdquo;</p>
                  <div className="flex items-center gap-4 text-slate-400 pt-1">
                    <span>Zone: {reviewCandidate.zone}</span>
                    <span>Age: {reviewCandidate.age}</span>
                    <span>Applied: {reviewCandidate.appliedDate}</span>
                  </div>
                </div>

                <form onSubmit={handleSaveReview} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Discipleship Stage</label>
                    <select
                      value={targetStage}
                      onChange={(e) => setTargetStage(e.target.value as BaptismStage)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      {BAPTISM_STAGES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Assigned Mentor / Counselor</label>
                      <input
                        type="text"
                        value={assignedCounselor}
                        onChange={(e) => setAssignedCounselor(e.target.value)}
                        placeholder="e.g. Pastor John Mark (Demo)"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Preparatory Doctrine Classes (0-3)</label>
                      <input
                        type="number"
                        min={0}
                        max={3}
                        value={classesCount}
                        onChange={(e) => setClassesCount(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  {targetStage === 'Stage 4: Baptism Service Scheduled (Sim)' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Scheduled Immersion Date</label>
                      <input
                        type="date"
                        value={serviceDate}
                        onChange={(e) => setServiceDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-2.5 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-slate-700 text-slate-300"
                      onClick={() => setReviewCandidate(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
                    >
                      Save Stage Progress
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Certificate Preview Modal */}
          {certificateCandidate && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Award size={18} className="text-amber-400" />
                    <h2 className="text-lg font-bold text-white">Simulated Baptism Certificate</h2>
                  </div>
                  <button
                    onClick={() => setCertificateCandidate(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Styled Certificate Canvas Card */}
                <div className="p-8 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 border-2 border-amber-400/40 rounded-2xl text-center space-y-4 shadow-inner relative overflow-hidden">
                  <div className="text-[10px] font-bold tracking-widest text-amber-400 uppercase">
                    Rhema Christian Ministry · Certificate of Holy Baptism
                  </div>
                  <h3 className="text-2xl font-serif font-black text-white">
                    Certificate of Obedience
                  </h3>
                  <p className="text-xs text-slate-400 italic">
                    &ldquo;Buried with Him in baptism, wherein also ye are risen with Him through the faith of the operation of God.&rdquo; — Colossians 2:12
                  </p>

                  <div className="py-2 border-y border-amber-400/20 my-2">
                    <div className="text-xs text-slate-400">This certifies that</div>
                    <div className="text-xl font-bold text-cyan-300 font-serif my-1">
                      {certificateCandidate.candidateName}
                    </div>
                    <div className="text-xs text-slate-400">
                      Has publicly confessed faith in the Lord Jesus Christ and followed Him in Holy Water Baptism.
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs text-slate-400 pt-2">
                    <div>
                      <div className="text-white font-medium">
                        {certificateCandidate.scheduledBaptismDate || '2026-11-29'}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">Date of Baptism</div>
                    </div>
                    <div>
                      <div className="text-white font-medium">
                        {certificateCandidate.counselorAssigned || 'Senior Pastor (Rhema)'}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">Officiating Minister</div>
                    </div>
                  </div>

                  <div className="text-[9px] text-amber-400/60 font-mono pt-2">
                    {certificateCandidate.id} · Layer A Simulated Document
                  </div>
                </div>

                <div className="flex justify-end gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-slate-700 text-slate-300"
                    onClick={() => setCertificateCandidate(null)}
                  >
                    Close Preview
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Add Candidate Modal */}
          {addModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Droplets size={18} className="text-cyan-400" />
                    <h2 className="text-lg font-bold text-white">Log Baptism Candidate</h2>
                  </div>
                  <button
                    onClick={() => setAddModalOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleAddCandidate} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Candidate Full Name</label>
                      <input
                        type="text"
                        required
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="e.g. Stephen Paul"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Age</label>
                      <input
                        type="number"
                        min={12}
                        max={100}
                        required
                        value={newAge}
                        onChange={(e) => setNewAge(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Masked Phone</label>
                      <input
                        type="text"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Church Zone</label>
                      <select
                        value={newZone}
                        onChange={(e) => setNewZone(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="Whitefield Zone">Whitefield Zone</option>
                        <option value="Hebbal Zone">Hebbal Zone</option>
                        <option value="Indiranagar Zone">Indiranagar Zone</option>
                        <option value="Koramangala Zone">Koramangala Zone</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Date of Salvation Decision</label>
                    <input
                      type="date"
                      value={newSalvationDate}
                      onChange={(e) => setNewSalvationDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Personal Faith Testimony</label>
                    <textarea
                      rows={3}
                      required
                      value={newSnippet}
                      onChange={(e) => setNewSnippet(e.target.value)}
                      placeholder="Brief summary of how the candidate came to faith and desires water baptism..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
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
                      className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
                    >
                      Save Candidate Profile
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
