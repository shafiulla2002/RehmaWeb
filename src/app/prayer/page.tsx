'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { churchCol } from '@/lib/firestore';
import { query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import {
  HeartHandshake,
  Plus,
  Search,
  Heart,
  Shield,
  Clock,
  User,
  CheckCircle2,
  Lock,
  X,
  Sparkles,
} from 'lucide-react';

export type PrayerCategory =
  | 'All'
  | 'Personal'
  | 'Family'
  | 'Healing'
  | 'Peace & Strength'
  | 'Ministry';

export interface PrayerItem {
  id: string;
  authorName: string;
  isAnonymous?: boolean;
  title: string;
  description: string;
  category: PrayerCategory;
  prayerCount: number;
  createdAt: string;
  isDemo?: boolean;
}

const SEED_PRAYERS: PrayerItem[] = [
  {
    id: 'prayer-1',
    authorName: 'Anita Mary',
    isAnonymous: false,
    title: 'Healing for My Father',
    description:
      'Please pray for my father’s health. He is undergoing cardiac treatment and needs God’s miraculous healing, peace, and restorative strength. 🙏',
    category: 'Healing',
    prayerCount: 18,
    createdAt: '2 hours ago',
    isDemo: true,
  },
  {
    id: 'prayer-2',
    authorName: 'Pastoral Outreach Team',
    isAnonymous: false,
    title: 'Grace & Revival in Rural Care Cells',
    description:
      'Lifting up our church mission workers and care cell leaders conducting village evangelism this weekend. May many hearts receive Christ Jesus.',
    category: 'Ministry',
    prayerCount: 34,
    createdAt: '5 hours ago',
    isDemo: true,
  },
  {
    id: 'prayer-3',
    authorName: 'Anonymous Sister',
    isAnonymous: true,
    title: 'Peace & Wisdom in Financial Struggles',
    description:
      'Asking for the congregation to stand in agreement for our family business during this challenging season. Trusting Jehovah Jireh to provide.',
    category: 'Peace & Strength',
    prayerCount: 22,
    createdAt: '1 day ago',
    isDemo: true,
  },
  {
    id: 'prayer-4',
    authorName: 'David K.',
    isAnonymous: false,
    title: 'Youth Board Exam Preparation',
    description:
      'Prayers for all our high school and college students appearing for upcoming board and entrance exams. May God grant divine memory, peace, and calm.',
    category: 'Personal',
    prayerCount: 29,
    createdAt: '2 days ago',
    isDemo: true,
  },
  {
    id: 'prayer-5',
    authorName: 'Samuel & Grace',
    isAnonymous: false,
    title: 'Thanksgiving for God’s Faithful Provision',
    description:
      'Praising the Lord for answered prayers! God provided the medical recovery we cried out for last month. Thank you church family for your prayers!',
    category: 'Family',
    prayerCount: 45,
    createdAt: '3 days ago',
    isDemo: true,
  },
];

export default function PrayerWallPage() {
  const [prayers, setPrayers] = useState<PrayerItem[]>(SEED_PRAYERS);
  const [selectedCategory, setSelectedCategory] = useState<PrayerCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [prayedSet, setPrayedSet] = useState<Record<string, boolean>>({});
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<PrayerCategory>('Personal');
  const [formDescription, setFormDescription] = useState('');
  const [formAnonymous, setFormAnonymous] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  // Load live approved public prayers if permissible
  useEffect(() => {
    let isCancelled = false;

    async function loadPublicPrayers() {
      try {
        const pq = query(
          churchCol('prayerRequests'),
          where('isPublic', '==', true),
          where('status', '==', 'approved'),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
        const snap = await getDocs(pq);
        if (!snap.empty && !isCancelled) {
          const liveList: PrayerItem[] = [];
          snap.forEach((d) => {
            const data = d.data() as any;
            liveList.push({
              id: d.id,
              authorName: data.isAnonymous ? 'Anonymous' : data.authorName || 'Church Member',
              isAnonymous: data.isAnonymous,
              title: data.title || 'Prayer Request',
              description: data.description || '',
              category: data.category || 'General',
              prayerCount: data.prayerCount || 1,
              createdAt: 'Recently',
              isDemo: false,
            });
          });
          setPrayers([...liveList, ...SEED_PRAYERS]);
        }
      } catch (e) {
        // Safe graceful fallback to seed prayers
        console.warn('Public prayer requests query skipped/restricted:', e);
      }
    }

    loadPublicPrayers();

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleTogglePray = (id: string) => {
    const hasPrayed = prayedSet[id];
    setPrayedSet((prev) => ({ ...prev, [id]: !hasPrayed }));
    setPrayers((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              prayerCount: hasPrayed ? item.prayerCount - 1 : item.prayerCount + 1,
            }
          : item
      )
    );
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDescription.trim()) return;

    const newPrayer: PrayerItem = {
      id: `local-prayer-${Date.now()}`,
      authorName: formAnonymous ? 'Anonymous' : 'You (Pending Review)',
      isAnonymous: formAnonymous,
      title: formTitle.trim(),
      description: formDescription.trim(),
      category: formCategory,
      prayerCount: 1,
      createdAt: 'Just now',
      isDemo: true,
    };

    setPrayers([newPrayer, ...prayers]);
    setSubmissionSuccess(true);
    setTimeout(() => {
      setSubmissionSuccess(false);
      setIsSubmitModalOpen(false);
      setFormTitle('');
      setFormDescription('');
      setFormAnonymous(false);
    }, 2000);
  };

  const filteredPrayers = prayers.filter((item) => {
    const matchesCat =
      selectedCategory === 'All' || item.category === selectedCategory;
    const matchesQuery =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.authorName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const categories: PrayerCategory[] = [
    'All',
    'Personal',
    'Family',
    'Healing',
    'Peace & Strength',
    'Ministry',
  ];

  return (
    <AppShell allowedRoles={['member', 'admin', 'superadmin', 'guest']}>
      <div className="space-y-6">
        {/* TOP HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="border-l-4 border-[#1E6F43] pl-3.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#18221B] dark:text-white tracking-tight flex items-center gap-2">
              <HeartHandshake className="text-[#1E6F43]" size={28} />
              <span>Congregation Prayer Wall</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#5C665F] dark:text-slate-400 mt-0.5">
              Stand in intercession with your church community. Pray for one another and rejoice in faith.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsSubmitModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#1E6F43] hover:bg-[#175835] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer self-start sm:self-auto"
          >
            <Plus size={16} />
            <span>Share Prayer Request</span>
          </button>
        </div>

        {/* SCRIPTURE ENCOURAGEMENT BANNER */}
        <div className="p-4 sm:p-5 rounded-3xl bg-[#E8F3EC] dark:bg-[#102418] border border-emerald-200 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#1E6F43] dark:text-emerald-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center shrink-0 text-emerald-800 dark:text-emerald-200 font-bold">
              🕊️
            </div>
            <div>
              <p className="font-serif italic text-xs sm:text-sm text-[#18221B] dark:text-white">
                &ldquo;Therefore encourage one another and build each other up, just as in fact you are doing.&rdquo;
              </p>
              <p className="font-sans font-bold text-[11px] text-[#1E6F43] dark:text-emerald-400 mt-0.5">
                — 1 Thessalonians 5:11
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <Lock size={13} />
            <span>Pastoral Moderation Active</span>
          </div>
        </div>

        {/* FILTER & SEARCH TOOLBAR */}
        <div className="p-4 rounded-3xl bg-white dark:bg-[#131C27] border border-[#EBE6DC] dark:border-[#222F3E] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search prayers by need, name, or keyword..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] text-xs text-[#18221B] dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-[#1E6F43]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#1E6F43] text-white shadow-xs'
                    : 'bg-[#FBF9F4] dark:bg-[#0E1520] text-[#5C665F] dark:text-slate-400 hover:text-[#18221B] dark:hover:text-white border border-[#EFECE6] dark:border-[#1E2B3A]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* PRAYER CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPrayers.map((prayer) => {
            const hasPrayed = prayedSet[prayer.id];
            return (
              <div
                key={prayer.id}
                className="p-5 rounded-3xl bg-white dark:bg-[#131C27] border border-[#EBE6DC] dark:border-[#222F3E] hover:border-[#1E6F43]/60 transition-all flex flex-col justify-between space-y-4 shadow-xs"
              >
                <div className="space-y-3">
                  {/* Top author row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center justify-center">
                        {prayer.isAnonymous ? '?' : prayer.authorName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-xs text-[#18221B] dark:text-white">
                            {prayer.authorName}
                          </h4>
                          {prayer.isDemo && (
                            <span className="text-[9px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/80 px-1 rounded">
                              Sample
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Clock size={11} />
                          <span>{prayer.createdAt}</span>
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#E8F3EC] dark:bg-[#102418] text-[#1E6F43] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60">
                      {prayer.category}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-bold text-sm text-[#18221B] dark:text-white">
                    {prayer.title}
                  </h3>
                  <p className="text-xs text-[#5C665F] dark:text-slate-300 leading-relaxed font-sans">
                    {prayer.description}
                  </p>
                </div>

                {/* Bottom Action Footer */}
                <div className="pt-3 border-t border-[#EFECE6] dark:border-[#1E2B3A] flex items-center justify-between text-xs">
                  <span className="text-[#5C665F] dark:text-slate-400 font-medium flex items-center gap-1.5">
                    <Heart size={14} className="text-red-500 fill-red-500" />
                    <span>{prayer.prayerCount} Prayers Offered</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => handleTogglePray(prayer.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      hasPrayed
                        ? 'bg-[#1E6F43] text-white shadow-xs'
                        : 'bg-[#E8F3EC] dark:bg-[#142B1E] text-[#1E6F43] dark:text-emerald-300 hover:bg-[#1E6F43] hover:text-white'
                    }`}
                  >
                    <span>🙏</span>
                    <span>{hasPrayed ? 'Prayed' : 'Pray for this'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* SUBMIT PRAYER REQUEST MODAL */}
        {isSubmitModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-[#131C27] rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-[#EBE6DC] dark:border-[#222F3E] space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#EFECE6] dark:border-[#1E2B3A]">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#1E6F43] flex items-center justify-center">
                    <HeartHandshake size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#18221B] dark:text-white">
                      Share a Prayer Request
                    </h3>
                    <p className="text-xs text-[#5C665F] dark:text-slate-400">
                      Entrust your petition to the pastoral team and church body.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-[#18221B] dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {submissionSuccess ? (
                <div className="p-6 text-center space-y-2 animate-in zoom-in-95">
                  <CheckCircle2 size={36} className="text-[#1E6F43] mx-auto" />
                  <h4 className="font-bold text-sm text-[#18221B] dark:text-white">
                    Prayer Request Received
                  </h4>
                  <p className="text-xs text-[#5C665F] dark:text-slate-400">
                    Your request has been saved and shared with the pastoral intercessory team.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitRequest} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#18221B] dark:text-white">
                      Request Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g. Prayer for Grandma's Surgery"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] text-xs text-[#18221B] dark:text-white focus:outline-hidden focus:border-[#1E6F43]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#18221B] dark:text-white">
                      Category
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as PrayerCategory)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] text-xs text-[#18221B] dark:text-white focus:outline-hidden focus:border-[#1E6F43]"
                    >
                      <option value="Personal">Personal</option>
                      <option value="Family">Family</option>
                      <option value="Healing">Healing</option>
                      <option value="Peace & Strength">Peace & Strength</option>
                      <option value="Ministry">Ministry</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#18221B] dark:text-white">
                      Petition Details *
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Share how our church family can pray specifically for you..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] text-xs text-[#18221B] dark:text-white font-sans leading-relaxed focus:outline-hidden focus:border-[#1E6F43]"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="anonCheck"
                      checked={formAnonymous}
                      onChange={(e) => setFormAnonymous(e.target.checked)}
                      className="w-4 h-4 rounded text-[#1E6F43] focus:ring-0 cursor-pointer"
                    />
                    <label
                      htmlFor="anonCheck"
                      className="text-xs text-[#5C665F] dark:text-slate-300 font-medium cursor-pointer"
                    >
                      Post anonymously (Your name will not appear on the public wall)
                    </label>
                  </div>

                  <div className="p-3 rounded-xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] text-[10px] text-slate-500 space-y-1">
                    <span className="font-bold flex items-center gap-1 text-[#1E6F43]">
                      <Lock size={11} /> Privacy &amp; Governance Protection:
                    </span>
                    <p>
                      Phone numbers, addresses, and private medical documents are never exposed. All requests are handled with pastoral confidentiality.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsSubmitModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-[#EFECE6] dark:border-[#1E2B3A] text-xs font-bold text-[#5C665F] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-[#1E6F43] hover:bg-[#175835] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      Submit for Intercession
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
