'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  Users,
  Heart,
  Music,
  Tv,
  Smile,
  Shield,
  Clock,
  Sparkles,
  CheckCircle2,
  X,
  Send,
  Calendar,
  AlertCircle,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';

export interface MinistryDepartment {
  id: string;
  name: string;
  category: 'Worship' | 'Media' | 'Hospitality' | 'NextGen' | 'Prayer' | 'Outreach';
  description: string;
  requirements: string[];
  openings: string[];
  timeCommitment: string;
  leadCoordinator: string;
  icon: string;
}

export interface VolunteerApplication {
  id: string;
  departmentId: string;
  departmentName: string;
  availability: string[];
  skills: string;
  motivation: string;
  submittedAt: string;
  status: 'Submitted' | 'Leader Review' | 'Orientation Scheduled' | 'Active';
}

const DEPARTMENTS: MinistryDepartment[] = [
  {
    id: 'dept-worship',
    name: 'Worship & Creative Arts',
    category: 'Worship',
    description: 'Leading the congregation into intimate praise and heartfelt adoration through vocal and instrumental excellence.',
    requirements: ['Heart of worship', 'Musical audition', 'Saturday rehearsal attendance'],
    openings: ['Lead Vocalist (Soprano/Alto)', 'Electric & Acoustic Guitarist', 'Keyboard / Synth Player'],
    timeCommitment: '3-4 hrs / week',
    leadCoordinator: 'Pastor Gabriel (Demonstration)',
    icon: 'Music',
  },
  {
    id: 'dept-media',
    name: 'Media & Production Desk',
    category: 'Media',
    description: 'Powering live sanctuary sound, broadcast video, lighting atmosphere, and visual scriptures for services.',
    requirements: ['Willingness to learn technical tools', 'Punctuality', 'Attention to detail'],
    openings: ['Camera Operator', 'ProPresenter Visuals', 'Digital Audio Mixer'],
    timeCommitment: '2-3 hrs / service',
    leadCoordinator: 'Bro. Timothy Paul (Demonstration)',
    icon: 'Tv',
  },
  {
    id: 'dept-hospitality',
    name: 'Ushers & Hospitality Guild',
    category: 'Hospitality',
    description: 'The front-line face of Christ\'s warmth, welcoming guests, guiding seating, and serving Holy Communion.',
    requirements: ['Warm demeanor', 'Friendly smile', 'Reliability on Sunday mornings'],
    openings: ['Guest Welcome Ambassador', 'Sanctuary Usher', 'Communion Steward'],
    timeCommitment: '2 hrs on designated Sundays',
    leadCoordinator: 'Sis. Rebecca (Demonstration)',
    icon: 'Smile',
  },
  {
    id: 'dept-kids',
    name: 'Rhema Kids & Youth Fellowship',
    category: 'NextGen',
    description: 'Nurturing the next generation in biblical truth, joyful praise, and interactive discipleship.',
    requirements: ['Love for children', 'Pastoral background clearance', 'Patience & creativity'],
    openings: ['Sunday School Teacher (Ages 6-9)', 'Youth Small Group Mentor', 'Kids Activity Coordinator'],
    timeCommitment: '2.5 hrs on Sundays',
    leadCoordinator: 'Sis. Hannah (Demonstration)',
    icon: 'Users',
  },
  {
    id: 'dept-prayer',
    name: 'Intercessory Prayer Watch',
    category: 'Prayer',
    description: 'Holding the spiritual walls of the church through dedicated fasting, pre-service prayer, and emergency hospital intercession.',
    requirements: ['Committed prayer life', 'Discretion & confidentiality', 'Spiritual maturity'],
    openings: ['Pre-Service Prayer Intercessor', 'Online Prayer Wall Responder', '24/7 Chain Intercessor'],
    timeCommitment: '1-2 hrs / week',
    leadCoordinator: 'Pastor Samuel (Demonstration)',
    icon: 'Shield',
  },
  {
    id: 'dept-outreach',
    name: 'City Mercy & Community Outreach',
    category: 'Outreach',
    description: 'Taking the Gospel outside the sanctuary walls via food relief, prison visits, and medical aid missions.',
    requirements: ['Servant heart', 'Compassion for the underserved', 'Team collaboration'],
    openings: ['Food Bank Volunteer', 'Community Care Worker', 'Youth Outreach Mentor'],
    timeCommitment: 'Monthly service drives',
    leadCoordinator: 'Deacon Mark (Demonstration)',
    icon: 'Heart',
  },
];

const STORAGE_KEY_VOLUNTEER = '@rhema_volunteer_apps';

export default function VolunteeringPage() {
  const [selectedDept, setSelectedDept] = useState<MinistryDepartment | null>(null);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'directory' | 'my-applications'>('directory');
  const [applications, setApplications] = useState<VolunteerApplication[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  // Form State
  const [deptChoice, setDeptChoice] = useState<string>(DEPARTMENTS[0].id);
  const [availability, setAvailability] = useState<string[]>(['Sunday Morning Services']);
  const [skills, setSkills] = useState('');
  const [motivation, setMotivation] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_VOLUNTEER);
      if (stored) {
        setApplications(JSON.parse(stored));
      } else {
        // Initial sample application for demo
        const initialSample: VolunteerApplication[] = [
          {
            id: 'vol-sample-1',
            departmentId: 'dept-media',
            departmentName: 'Media & Production Desk',
            availability: ['Sunday Morning Services', 'Special Friday Services'],
            skills: 'Basic experience with live streaming and video camera operation.',
            motivation: 'Desire to use technical skills for God\'s glory in the church.',
            submittedAt: 'Nov 10, 2026',
            status: 'Orientation Scheduled',
          },
        ];
        setApplications(initialSample);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleApplyClick = (dept: MinistryDepartment) => {
    setSelectedDept(dept);
    setDeptChoice(dept.id);
    setApplyModalOpen(true);
  };

  const handleAvailabilityToggle = (option: string) => {
    if (availability.includes(option)) {
      setAvailability(availability.filter((a) => a !== option));
    } else {
      setAvailability([...availability, option]);
    }
  };

  const handleSubmitApplication = (e: React.FormEvent) => {
    e.preventDefault();
    const dept = DEPARTMENTS.find((d) => d.id === deptChoice) || DEPARTMENTS[0];

    const newApp: VolunteerApplication = {
      id: `vol-${Date.now()}`,
      departmentId: dept.id,
      departmentName: dept.name,
      availability: availability.length > 0 ? availability : ['Flexible as needed'],
      skills: skills.trim() || 'General service willingness',
      motivation: motivation.trim() || 'Called to serve the body of Christ',
      submittedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'Submitted',
    };

    const updated = [newApp, ...applications];
    setApplications(updated);

    try {
      localStorage.setItem(STORAGE_KEY_VOLUNTEER, JSON.stringify(updated));
    } catch {
      // ignore
    }

    setApplyModalOpen(false);
    setSkills('');
    setMotivation('');
    setActiveTab('my-applications');
    setNotification(`Your volunteer application for ${dept.name} was successfully submitted (Simulated Application)!`);
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Banner with 1 Peter 4:10 */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B192C] via-[#132A4A] to-[#1E6F43] text-white p-6 md:p-8 shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-semibold backdrop-blur-xs border border-amber-400/30">
                <Users size={14} />
                <span>Ministry Volunteering</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-serif font-extrabold tracking-tight">
                Discover Your Ministry Calling
              </h1>
              <p className="text-slate-200 text-xs md:text-sm leading-relaxed">
                &ldquo;Each of you should use whatever gift you have received to serve others, as faithful stewards of God&apos;s grace in its various forms.&rdquo;
                — <span className="text-amber-300 font-semibold">1 Peter 4:10</span>
              </p>
              <div className="pt-1">
                <span className="inline-block px-2.5 py-0.5 rounded-md bg-white/10 text-[11px] text-amber-200 border border-white/15">
                  🛡️ Simulated Application Hub — Zero production database writes
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedDept(DEPARTMENTS[0]);
                  setDeptChoice(DEPARTMENTS[0].id);
                  setApplyModalOpen(true);
                }}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-sm shadow-lg hover:shadow-xl transition-all"
              >
                Apply to Serve
              </button>
            </div>
          </div>
        </div>

        {/* Notifications */}
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
            onClick={() => setActiveTab('directory')}
            className={`pb-2 px-1 border-b-2 transition-all ${
              activeTab === 'directory'
                ? 'border-[#1E6F43] text-[#1E6F43] dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Ministry Directory ({DEPARTMENTS.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('my-applications')}
            className={`pb-2 px-1 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'my-applications'
                ? 'border-[#1E6F43] text-[#1E6F43] dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <span>My Applications</span>
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-[10px]">
              {applications.length}
            </span>
          </button>
        </div>

        {/* Tab Content: Directory */}
        {activeTab === 'directory' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {DEPARTMENTS.map((dept) => (
              <div
                key={dept.id}
                className="bg-white dark:bg-[#131C27] rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full bg-[#E8F3EC] dark:bg-emerald-950/60 text-[#1E6F43] dark:text-emerald-300 font-bold text-[11px]">
                      {dept.category}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock size={12} />
                      {dept.timeCommitment}
                    </span>
                  </div>

                  <h3 className="font-serif font-bold text-base text-slate-900 dark:text-white">
                    {dept.name}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {dept.description}
                  </p>

                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Current Open Roles:
                    </span>
                    <ul className="space-y-1">
                      {dept.openings.map((op, i) => (
                        <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                          <span>{op}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="text-[11px] text-slate-400 pt-1">
                    Coordinator: <span className="text-slate-600 dark:text-slate-300 font-medium">{dept.leadCoordinator}</span>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-[#F0EBE0] dark:border-[#1E2C3D]">
                  <button
                    type="button"
                    onClick={() => handleApplyClick(dept)}
                    className="w-full py-2.5 rounded-xl bg-[#1E6F43] hover:bg-[#165634] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <span>Volunteer for This Ministry</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab Content: My Applications */}
        {activeTab === 'my-applications' && (
          <div className="space-y-4">
            {applications.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-[#131C27] rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E]">
                <Users size={36} className="mx-auto text-slate-400 mb-2" />
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">No volunteer applications yet</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Explore the directory and choose a department to serve with your talents.
                </p>
              </div>
            ) : (
              applications.map((app) => (
                <div
                  key={app.id}
                  className="bg-white dark:bg-[#131C27] rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] p-5 shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F0EBE0] dark:border-[#1E2C3D] pb-3">
                    <div>
                      <h4 className="font-serif font-bold text-base text-slate-900 dark:text-white">
                        {app.departmentName}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Submitted: {app.submittedAt} • Ref: {app.id}
                      </p>
                    </div>

                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-300/40 text-amber-800 dark:text-amber-300 text-xs font-bold">
                      <Sparkles size={13} />
                      <span>Status: {app.status} (Simulated)</span>
                    </div>
                  </div>

                  {/* 4-Stage Progress Tracker */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center text-xs">
                    {[
                      { step: '1. Submitted', active: true },
                      { step: '2. Leader Review', active: app.status !== 'Submitted' },
                      { step: '3. Orientation', active: app.status === 'Orientation Scheduled' || app.status === 'Active' },
                      { step: '4. Active Service', active: app.status === 'Active' },
                    ].map((st, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border text-[11px] font-semibold ${
                          st.active
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 text-emerald-800 dark:text-emerald-200'
                            : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-400'
                        }`}
                      >
                        {st.step}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-[#F7F5EE]/60 dark:bg-[#0D141D] p-3.5 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E]">
                    <div>
                      <span className="font-bold text-slate-700 dark:text-slate-300">Availability: </span>
                      <span className="text-slate-600 dark:text-slate-400">{app.availability.join(', ')}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700 dark:text-slate-300">Skills / Talents: </span>
                      <span className="text-slate-600 dark:text-slate-400">{app.skills}</span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="font-bold text-slate-700 dark:text-slate-300">Calling & Motivation: </span>
                      <span className="text-slate-600 dark:text-slate-400">{app.motivation}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Application Modal */}
        {applyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-[#131C27] w-full max-w-lg rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[#EBE6DC] dark:border-[#222F3E]">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-[#1E6F43]" />
                  <h3 className="font-serif font-bold text-base text-slate-900 dark:text-white">
                    Apply for Volunteer Ministry
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setApplyModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Security notice */}
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <p>
                  <span className="font-bold">Protected Simulation:</span> This application runs locally in simulated mode without transmitting sensitive volunteer data to external or unverified storage.
                </p>
              </div>

              <form onSubmit={handleSubmitApplication} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ministry Department *
                  </label>
                  <select
                    value={deptChoice}
                    onChange={(e) => setDeptChoice(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] bg-[#F7F5EE]/50 dark:bg-[#0D141D] text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#1E6F43]"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Your Availability
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {[
                      'Sunday Morning Services',
                      'Midweek Wednesday Services',
                      'Friday Night Vigils',
                      'Special Church Events / Conferences',
                    ].map((opt) => (
                      <label
                        key={opt}
                        className="flex items-center gap-2 p-2 rounded-lg border border-[#EBE6DC] dark:border-[#222F3E] cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      >
                        <input
                          type="checkbox"
                          checked={availability.includes(opt)}
                          onChange={() => handleAvailabilityToggle(opt)}
                          className="rounded text-[#1E6F43] focus:ring-[#1E6F43]"
                        />
                        <span className="text-slate-700 dark:text-slate-300 text-[11px]">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Relevant Skills or Prior Experience
                  </label>
                  <textarea
                    rows={2}
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    placeholder="e.g. 3 years playing acoustic guitar, soundboard mixing, or youth tutoring"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] bg-[#F7F5EE]/50 dark:bg-[#0D141D] text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#1E6F43]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Spiritual Calling & Motivation *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={motivation}
                    onChange={(e) => setMotivation(e.target.value)}
                    placeholder="Share briefly why you feel called to serve in this department..."
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] bg-[#F7F5EE]/50 dark:bg-[#0D141D] text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#1E6F43]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EBE6DC] dark:border-[#222F3E]">
                  <button
                    type="button"
                    onClick={() => setApplyModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-[#1E6F43] hover:bg-[#165634] text-white shadow-md transition-all flex items-center gap-1.5"
                  >
                    <Send size={14} />
                    <span>Submit Volunteer Application</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
