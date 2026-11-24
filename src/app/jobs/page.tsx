'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import {
  Briefcase,
  Search,
  Filter,
  MapPin,
  Clock,
  Building,
  CheckCircle2,
  X,
  FileText,
  Mail,
  Phone,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

export interface LiveJobOpportunity {
  id: string;
  title: string;
  organization?: string;
  ministry?: string;
  companyName?: string;
  categoryId?: string;
  category?: string;
  opportunityType?: string;
  type?: string;
  location?: string;
  compensation?: string;
  compensationType?: string;
  salaryRange?: string;
  postedDate?: string;
  createdAt?: any;
  description: string;
  requirements?: string[] | string;
  status?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface LiveJobCategory {
  id: string;
  name: string;
  nameTelugu?: string;
  order?: number;
  isEnabled?: boolean;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<LiveJobOpportunity[]>([]);
  const [categories, setCategories] = useState<LiveJobCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All Types');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState<LiveJobOpportunity | null>(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);

  // Fetch opportunities and categories from canonical Firestore paths:
  // Rhema Church/rhema/job_circle_opportunities
  // Rhema Church/rhema/job_circle_categories
  useEffect(() => {
    async function loadJobCircleData() {
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch categories
        const catCol = collection(db, 'Rhema Church', 'rhema', 'job_circle_categories');
        const catSnap = await getDocs(catCol);
        const catList: LiveJobCategory[] = [];
        catSnap.forEach((docSnap) => {
          const d = docSnap.data();
          if (d.isEnabled !== false) {
            catList.push({
              id: docSnap.id,
              name: d.name || docSnap.id,
              nameTelugu: d.nameTelugu,
              order: d.order || 0,
              isEnabled: d.isEnabled,
            });
          }
        });
        catList.sort((a, b) => (a.order || 0) - (b.order || 0));
        setCategories(catList);

        // 2. Fetch opportunities
        const oppCol = collection(db, 'Rhema Church', 'rhema', 'job_circle_opportunities');
        const oppSnap = await getDocs(oppCol);
        const oppList: LiveJobOpportunity[] = [];
        oppSnap.forEach((docSnap) => {
          const d = docSnap.data();
          // Show approved or active postings
          if (d.status === 'approved' || d.status === 'active' || !d.status) {
            let reqs: string[] = [];
            if (Array.isArray(d.requirements)) {
              reqs = d.requirements;
            } else if (typeof d.requirements === 'string') {
              reqs = d.requirements.split('\n').filter((r: string) => r.trim());
            }

            oppList.push({
              id: docSnap.id,
              title: d.title || 'Ministry Opportunity',
              organization: d.organization || d.companyName || d.ministry || 'Rhema Global Community',
              category: d.category || d.categoryId || 'General',
              categoryId: d.categoryId,
              type: d.type || d.opportunityType || 'Calling',
              location: d.location || 'Church Campus',
              compensation: d.compensation || d.salaryRange || 'Ministry Stipend / Pastoral Placement',
              description: d.description || 'Contribute your professional skills to church ministry and community stewardship.',
              requirements: reqs,
              contactEmail: d.contactEmail || 'placement@rhemaglobal.org',
              contactPhone: d.contactPhone || '+91 90000 10001',
              status: d.status,
              createdAt: d.createdAt,
            });
          }
        });

        setJobs(oppList);
      } catch (err: unknown) {
        console.warn('Failed to fetch job opportunities:', err);
        setError('Unable to load ministry opportunities. Please check your network connection.');
      } finally {
        setLoading(false);
      }
    }

    loadJobCircleData();
  }, []);

  const filteredJobs = jobs.filter((job) => {
    const matchesCategory =
      selectedCategory === 'All' ||
      job.category?.toLowerCase() === selectedCategory.toLowerCase() ||
      job.categoryId?.toLowerCase() === selectedCategory.toLowerCase();

    const matchesType =
      selectedType === 'All Types' ||
      job.type?.toLowerCase() === selectedType.toLowerCase();

    const matchesSearch =
      searchQuery === '' ||
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.organization && job.organization.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (job.location && job.location.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesType && matchesSearch;
  });

  const handleOpenContactModal = (job: LiveJobOpportunity) => {
    setSelectedJob(job);
    setContactModalOpen(true);
  };

  return (
    <AppShell allowedRoles={['member', 'admin', 'superadmin', 'guest']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Briefcase size={24} />
            </span>
            <div>
              <h1 className="text-2xl font-black text-white">Rhema Job Circle</h1>
              <p className="text-xs text-slate-400">
                Discover Christian vocations, ministry roles, and community employment opportunities
              </p>
            </div>
          </div>
        </div>

        {/* Security architecture banner */}
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl flex items-start gap-3 text-xs text-slate-300">
          <ShieldCheck size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-amber-300 uppercase tracking-wider text-[11px]">
              Verified Ministry Postings &bull; Pastoral Placement Support
            </span>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              All opportunities are loaded live from the Rhema Church registry. Applications and candidate referrals are coordinated directly through our pastoral placement office to protect member privacy and career integrity.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-950/60 border border-red-800 rounded-2xl flex items-start gap-3 text-xs text-red-200">
            <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Search & Filters */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search input */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search job title, ministry, keywords or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Category filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
            >
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Type filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
            >
              <option value="All Types">All Types</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Internship">Internship</option>
              <option value="Calling">Calling / Ministry</option>
            </select>
          </div>
        </div>

        {/* Opportunity List */}
        {loading ? (
          <div className="py-12 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-3">
            <RefreshCw size={28} className="animate-spin text-amber-400 mx-auto" />
            <p className="text-xs text-slate-400">Loading opportunities from church database...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="py-12 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-2">
            <Briefcase size={32} className="text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">No Opportunities Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No active job openings match your current search criteria. Try selecting &ldquo;All Categories&rdquo; or clearing the search box.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 transition-all space-y-4 shadow-xl"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        {job.category}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300">
                        {job.type}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white pt-1">{job.title}</h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Building size={13} className="text-amber-500" />
                      <span>{job.organization}</span>
                      <span className="text-slate-600">&bull;</span>
                      <MapPin size={13} className="text-slate-400" />
                      <span>{job.location}</span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenContactModal(job)}
                    className="self-start sm:self-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-transform active:scale-95 shadow-md"
                  >
                    <span>Pastoral Placement Referral</span>
                    <ChevronRight size={14} />
                  </button>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {job.description}
                </p>

                {Array.isArray(job.requirements) && job.requirements.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Key Qualifications &amp; Role Requirements:
                    </span>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-400">
                      {job.requirements.map((req, rIdx) => (
                        <li key={rIdx} className="flex items-start gap-1.5">
                          <span className="text-amber-400 font-bold">&bull;</span>
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Compensation: {job.compensation}</span>
                  <span className="text-emerald-400 font-sans font-semibold">Active Ministry Posting</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pastoral Referral Contact Modal */}
        {contactModalOpen && selectedJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
              <button
                type="button"
                onClick={() => setContactModalOpen(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={20} />
              </button>

              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Church Pastoral Placement Referral
                </span>
                <h3 className="text-xl font-bold text-white">{selectedJob.title}</h3>
                <p className="text-xs text-slate-400">{selectedJob.organization} &bull; {selectedJob.location}</p>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3 text-xs text-slate-300">
                <div className="flex items-center gap-2 text-amber-300 font-semibold">
                  <ShieldCheck size={16} />
                  <span>Direct Pastoral Referral Protocol</span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  To protect applicant privacy and provide personalized ministry endorsements, job applications are handled through our church pastoral placement team. Connect with our coordinators using the contact options below with this role title.
                </p>
                <div className="pt-2 border-t border-slate-800/80 space-y-1.5 font-mono text-[11px]">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Mail size={13} className="text-amber-400" />
                    <span>careers@rhemaglobal.org</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Phone size={13} className="text-amber-400" />
                    <span>+91 90000 10001 (Church Office)</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <a
                  href={`mailto:careers@rhemaglobal.org?subject=${encodeURIComponent(
                    `Application Referral: ${selectedJob.title} (${selectedJob.id})`
                  )}&body=${encodeURIComponent(
                    `Dear Pastoral Placement Team,\n\nI am writing to express my interest in the role: ${selectedJob.title} with ${selectedJob.organization}.\n\nPlease find my resume and details attached for pastoral endorsement.\n\nBlessings,\nRhema Church Member`
                  )}`}
                  className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-colors"
                >
                  <Mail size={16} />
                  <span>Send Application Email</span>
                </a>
                <button
                  type="button"
                  onClick={() => setContactModalOpen(false)}
                  className="py-3 px-4 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
                >
                  Close Window
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
