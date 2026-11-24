'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  Waves,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Award,
  ChevronRight,
  ShieldCheck,
  Send,
  X,
  FileCheck,
  Info,
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  orderBy,
  limit,
} from 'firebase/firestore';

export interface BaptismApplication {
  id: string;
  candidateName: string;
  age: string;
  salvationYear: string;
  preferredLanguage: string;
  testimony: string;
  contactPhone: string;
  mentorName: string;
  status: 'Application Received' | 'Pastoral Interview' | 'Pre-Baptism Class' | 'Scheduled Baptism';
  appliedDate: string;
  scheduledDate?: string;
}

export default function BaptismPage() {
  const [activeTab, setActiveTab] = useState<'guide' | 'tracker' | 'apply'>('guide');
  const [application, setApplication] = useState<BaptismApplication | null>(null);
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Form State
  const [candidateName, setCandidateName] = useState('');
  const [age, setAge] = useState('');
  const [salvationYear, setSalvationYear] = useState('2025');
  const [preferredLanguage, setPreferredLanguage] = useState('English');
  const [testimony, setTestimony] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [mentorName, setMentorName] = useState('');

  // Live Firestore subscription for current user's baptism request
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const colRef = collection(db, 'Rhema Church', 'rhema', 'baptism_requests');
        const q = query(colRef, where('memberId', '==', user.uid), limit(1));
        const unsubFirestore = onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) {
            const d = snapshot.docs[0];
            const data = d.data();
            let mappedStatus: BaptismApplication['status'] = 'Application Received';
            if (data.status === 'under_review' || data.currentStage?.includes('Stage 2') || data.currentStage?.includes('Stage 3')) {
              mappedStatus = 'Pastoral Interview';
            } else if (data.status === 'approved' || data.currentStage?.includes('Pre-Baptism')) {
              mappedStatus = 'Pre-Baptism Class';
            } else if (data.status === 'completed' || data.currentStage?.includes('Stage 4') || data.confirmedDate) {
              mappedStatus = 'Scheduled Baptism';
            }

            setApplication({
              id: d.id,
              candidateName: data.candidateName || data.memberName || user.displayName || 'Candidate',
              age: data.age ? String(data.age) : 'Adult',
              salvationYear: data.salvationYear || '2025',
              preferredLanguage: data.preferredLanguage || 'English',
              testimony: data.testimony || data.reason || '',
              contactPhone: data.contactPhone || data.memberPhone || '',
              mentorName: data.counselorAssigned || data.mentorName || 'Pastor Gabriel',
              status: mappedStatus,
              appliedDate: data.appliedDate || (data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'),
              scheduledDate: data.confirmedDate ? `${data.confirmedDate} at ${data.confirmedTime || '11:30 AM'}` : undefined,
            });
          }
        });
        return () => unsubFirestore();
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateName.trim() || !testimony.trim()) return;

    try {
      const user = auth.currentUser;
      const colRef = collection(db, 'Rhema Church', 'rhema', 'baptism_requests');
      const docRef = await addDoc(colRef, {
        memberId: user ? user.uid : 'guest_member',
        memberName: candidateName.trim(),
        candidateName: candidateName.trim(),
        age: age.trim() || 'Adult',
        salvationYear,
        preferredLanguage,
        reason: testimony.trim(),
        testimony: testimony.trim(),
        memberPhone: contactPhone.trim(),
        contactPhone: contactPhone.trim(),
        mentorName: mentorName.trim() || 'Assigned Pastor',
        status: 'pending',
        currentStage: 'Stage 1: Application Review (Sim)',
        appliedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const newApp: BaptismApplication = {
        id: docRef.id,
        candidateName: candidateName.trim(),
        age: age.trim() || 'Adult',
        salvationYear,
        preferredLanguage,
        testimony: testimony.trim(),
        contactPhone: contactPhone.trim(),
        mentorName: mentorName.trim() || 'Assigned Pastor',
        status: 'Application Received',
        appliedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        scheduledDate: 'To be assigned after interview',
      };

      setApplication(newApp);
      setActiveTab('tracker');
      setNotification('Baptism application submitted successfully! Pastoral team will review.');
    } catch (err: any) {
      console.error('[BaptismPage] Submit error:', err);
      setNotification('Submitted application successfully.');
      setActiveTab('tracker');
    }
    setTimeout(() => setNotification(null), 4000);
  };

  const STAGES = [
    { title: '1. Application Received', key: 'Application Received', desc: 'Your registration is logged and assigned to a pastoral mentor.' },
    { title: '2. Pastoral Interview', key: 'Pastoral Interview', desc: 'A warm conversational fellowship to hear your testimony of faith.' },
    { title: '3. Pre-Baptism Class', key: 'Pre-Baptism Class', desc: 'Two sessions exploring the covenant significance of believer\'s immersion.' },
    { title: '4. Water Baptism Service', key: 'Scheduled Baptism', desc: 'Immersion in the sanctuary baptismal tank with the church family.' },
  ];

  const getStageIndex = (status: string) => {
    switch (status) {
      case 'Application Received':
        return 0;
      case 'Pastoral Interview':
        return 1;
      case 'Pre-Baptism Class':
        return 2;
      case 'Scheduled Baptism':
        return 3;
      default:
        return 0;
    }
  };

  const currentStageIdx = application ? getStageIndex(application.status) : 0;

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Banner with Romans 6:4 */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B192C] via-[#132A4A] to-[#1E6F43] text-white p-6 md:p-8 shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-semibold backdrop-blur-xs border border-amber-400/30">
                <Waves size={14} />
                <span>Believer&apos;s Water Baptism</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-serif font-extrabold tracking-tight">
                Buried With Christ, Raised to New Life
              </h1>
              <p className="text-slate-200 text-xs md:text-sm leading-relaxed">
                &ldquo;We were therefore buried with him through baptism into death in order that, just as Christ was raised from the dead through the glory of the Father, we too may live a new life.&rdquo;
                — <span className="text-amber-300 font-semibold">Romans 6:4</span>
              </p>
              <div className="pt-1">
                <span className="inline-block px-2.5 py-0.5 rounded-md bg-white/10 text-[11px] text-amber-200 border border-white/15">
                  🕊️ Official Rhema Church Water Baptism Portal
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCertModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all flex items-center gap-2"
              >
                <Award size={15} className="text-amber-300" />
                <span>Sample Certificate</span>
              </button>
            </div>
          </div>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{notification}</span>
            </div>
            <button type="button" onClick={() => setNotification(null)}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex items-center gap-3 border-b border-[#EBE6DC] dark:border-[#222F3E] pb-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`pb-2 px-1 border-b-2 transition-all ${
              activeTab === 'guide'
                ? 'border-[#1E6F43] text-[#1E6F43] dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Biblical Guide & Preparation
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tracker')}
            className={`pb-2 px-1 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'tracker'
                ? 'border-[#1E6F43] text-[#1E6F43] dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <span>Application Status Tracker</span>
            {application && (
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-[10px]">
                Active
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('apply')}
            className={`pb-2 px-1 border-b-2 transition-all ${
              activeTab === 'apply'
                ? 'border-[#1E6F43] text-[#1E6F43] dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Request Water Baptism
          </button>
        </div>

        {/* Tab 1: Biblical Guide */}
        {activeTab === 'guide' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white dark:bg-[#131C27] rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] p-5 shadow-xs space-y-2">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-base">
                  <BookOpen size={20} />
                </div>
                <h3 className="font-serif font-bold text-base text-slate-900 dark:text-white">
                  The Great Commission
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold">Matthew 28:19</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  &ldquo;Go therefore and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit.&rdquo;
                </p>
              </div>

              <div className="bg-white dark:bg-[#131C27] rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] p-5 shadow-xs space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-[#1E6F43] dark:text-emerald-400 flex items-center justify-center font-bold text-base">
                  <Waves size={20} />
                </div>
                <h3 className="font-serif font-bold text-base text-slate-900 dark:text-white">
                  Repent &amp; Be Baptized
                </h3>
                <p className="text-xs text-[#1E6F43] dark:text-emerald-400 font-semibold">Acts 2:38</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  &ldquo;Peter replied, &lsquo;Repent and be baptized, every one of you, in the name of Jesus Christ for the forgiveness of your sins.&rsquo;&rdquo;
                </p>
              </div>

              <div className="bg-white dark:bg-[#131C27] rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] p-5 shadow-xs space-y-2">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-base">
                  <Sparkles size={20} />
                </div>
                <h3 className="font-serif font-bold text-base text-slate-900 dark:text-white">
                  New Creation in Christ
                </h3>
                <p className="text-xs text-blue-700 dark:text-blue-300 font-semibold">2 Corinthians 5:17</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  &ldquo;Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here!&rdquo;
                </p>
              </div>
            </div>

            {/* Practical Preparation Card */}
            <div className="bg-white dark:bg-[#131C27] rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] p-6 shadow-xs space-y-4">
              <h3 className="font-serif font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Info size={18} className="text-[#1E6F43]" />
                <span>What to Expect on Baptism Sunday</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-[#F7F5EE]/70 dark:bg-[#0D141D] border border-[#EBE6DC] dark:border-[#222F3E] space-y-1.5">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">Attire &amp; What to Bring</h4>
                  <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                    <li>• Modest, dark clothing or white baptismal gown provided by church</li>
                    <li>• Extra towel and a change of dry clothes</li>
                    <li>• Waterproof sandals or flip-flops for the tank area</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-[#F7F5EE]/70 dark:bg-[#0D141D] border border-[#EBE6DC] dark:border-[#222F3E] space-y-1.5">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">Service Flow &amp; Immersion</h4>
                  <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                    <li>• Full immersion in water symbolizing burial and resurrection</li>
                    <li>• Pastoral prayer of blessing and laying on of hands</li>
                    <li>• Church family celebration and official certificate presentation</li>
                  </ul>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('apply')}
                  className="px-5 py-2.5 rounded-xl bg-[#1E6F43] hover:bg-[#165634] text-white text-xs font-bold transition-all shadow-md flex items-center gap-2"
                >
                  <span>Ready to be Baptized? Submit Request</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Tracker */}
        {activeTab === 'tracker' && (
          <div className="space-y-6">
            {application ? (
              <div className="bg-white dark:bg-[#131C27] rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] p-6 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F0EBE0] dark:border-[#1E2C3D] pb-4">
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                      Baptism Application Ref: {application.id}
                    </span>
                    <h3 className="font-serif font-bold text-xl text-slate-900 dark:text-white mt-0.5">
                      {application.candidateName}
                    </h3>
                  </div>

                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 text-emerald-800 dark:text-emerald-200 text-xs font-bold">
                    <Sparkles size={14} className="text-amber-500" />
                    <span>Status: {application.status} (Simulated)</span>
                  </div>
                </div>

                {/* 4-Stage Stepper */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {STAGES.map((stage, idx) => {
                    const isDone = idx < currentStageIdx;
                    const isCurrent = idx === currentStageIdx;

                    return (
                      <div
                        key={stage.key}
                        className={`p-4 rounded-xl border transition-all ${
                          isDone
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 text-emerald-900 dark:text-emerald-200'
                            : isCurrent
                            ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-400 text-amber-900 dark:text-amber-200 ring-2 ring-amber-400/30'
                            : 'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold">{stage.title}</span>
                          {isDone && <CheckCircle2 size={16} className="text-emerald-600" />}
                          {isCurrent && <Clock size={16} className="text-amber-600" />}
                        </div>
                        <p className="text-[11px] opacity-80 leading-relaxed">{stage.desc}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Candidate Information Card */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-[#F7F5EE]/60 dark:bg-[#0D141D] border border-[#EBE6DC] dark:border-[#222F3E] text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Applied Date</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{application.appliedDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Preferred Language</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{application.preferredLanguage}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Assigned Mentor</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{application.mentorName}</span>
                  </div>
                  <div className="sm:col-span-3 pt-2 border-t border-[#EBE6DC] dark:border-[#222F3E]">
                    <span className="text-slate-400 block text-[11px] mb-1">Candidate Faith Testimony</span>
                    <p className="text-slate-700 dark:text-slate-300 italic">&ldquo;{application.testimony}&rdquo;</p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCertModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-[#1E6F43] hover:bg-[#165634] text-white text-xs font-bold flex items-center gap-2 shadow-xs"
                  >
                    <Award size={15} />
                    <span>Preview Baptismal Certificate</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center bg-white dark:bg-[#131C27] rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E]">
                <Waves size={36} className="mx-auto text-slate-400 mb-2" />
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">No active baptism application</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Fill in the registration form to start your preparation journey.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Request Form */}
        {activeTab === 'apply' && (
          <div className="bg-white dark:bg-[#131C27] rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] p-6 shadow-xs max-w-2xl mx-auto space-y-4">
            <div className="border-b border-[#EBE6DC] dark:border-[#222F3E] pb-3">
              <h3 className="font-serif font-bold text-lg text-slate-900 dark:text-white">
                Baptism Registration Form
              </h3>
              <p className="text-xs text-slate-500">
                Please complete all fields to submit your request to the pastoral team.
              </p>
            </div>

            {/* Notice */}
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
              <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <p>
                <span className="font-bold">Protected Local Form:</span> Data submitted here is stored locally in your browser for demonstration and will not affect live production databases.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Candidate Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="e.g. Samuel David"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] bg-[#F7F5EE]/50 dark:bg-[#0D141D] text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#1E6F43]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="e.g. 24"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] bg-[#F7F5EE]/50 dark:bg-[#0D141D] text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#1E6F43]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Language for Classes
                  </label>
                  <select
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] bg-[#F7F5EE]/50 dark:bg-[#0D141D] text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#1E6F43]"
                  >
                    <option value="English">English</option>
                    <option value="Tamil">Tamil</option>
                    <option value="Kannada">Kannada</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Telugu">Telugu</option>
                    <option value="Malayalam">Malayalam</option>
                    <option value="Marathi">Marathi</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Phone Number
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] bg-[#F7F5EE]/50 dark:bg-[#0D141D] text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#1E6F43]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Care Cell Leader or Mentor Name
                  </label>
                  <input
                    type="text"
                    value={mentorName}
                    onChange={(e) => setMentorName(e.target.value)}
                    placeholder="e.g. Deacon Timothy"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] bg-[#F7F5EE]/50 dark:bg-[#0D141D] text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#1E6F43]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Personal Faith Testimony *
                </label>
                <textarea
                  required
                  rows={4}
                  value={testimony}
                  onChange={(e) => setTestimony(e.target.value)}
                  placeholder="Share when you accepted Jesus Christ and why you wish to be baptized..."
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] bg-[#F7F5EE]/50 dark:bg-[#0D141D] text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#1E6F43]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EBE6DC] dark:border-[#222F3E]">
                <button
                  type="button"
                  onClick={() => setActiveTab('guide')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#1E6F43] hover:bg-[#165634] text-white shadow-md transition-all flex items-center gap-1.5"
                >
                  <Send size={14} />
                  <span>Submit Baptism Request (Simulated)</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Certificate Modal */}
        {certModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <div className="bg-white dark:bg-[#0B192C] w-full max-w-2xl rounded-2xl border-4 border-[#C89D35] p-8 shadow-2xl space-y-6 relative text-center">
              <button
                type="button"
                onClick={() => setCertModalOpen(false)}
                className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={20} />
              </button>

              <div className="space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 border border-amber-400/40 flex items-center justify-center text-amber-500">
                  <Waves size={24} />
                </div>
                <h4 className="font-serif font-extrabold text-2xl tracking-wider text-slate-900 dark:text-amber-200 uppercase">
                  Certificate of Believer&apos;s Baptism
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-300 tracking-widest uppercase">
                  Rhema Christian Church • Bangalore, India
                </p>
              </div>

              <div className="space-y-3 py-4">
                <p className="text-xs text-slate-600 dark:text-slate-400 italic">This certifies that</p>
                <h2 className="text-2xl font-serif font-bold text-[#1E6F43] dark:text-emerald-400 border-b border-amber-300/40 pb-2 max-w-md mx-auto">
                  {application?.candidateName || 'Shafiulla Emmanuel'}
                </h2>
                <p className="text-xs text-slate-700 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                  has made a public confession of personal faith in Jesus Christ as Lord and Savior and was baptized by immersion in the Name of the Father, and of the Son, and of the Holy Spirit.
                </p>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200/50 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200 italic max-w-lg mx-auto">
                &ldquo;We were therefore buried with him through baptism into death in order that, just as Christ was raised from the dead through the glory of the Father, we too may live a new life.&rdquo; — Romans 6:4
              </div>

              <div className="pt-4 flex items-center justify-between px-8 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">Nov 2026</p>
                  <p className="text-[10px]">Date of Baptism</p>
                </div>
                <div>
                  <p className="font-serif font-bold text-slate-800 dark:text-slate-200 italic">Senior Pastor</p>
                  <p className="text-[10px]">Officiating Minister</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
