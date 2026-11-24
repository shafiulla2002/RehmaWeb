'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  Sparkles,
  Heart,
  Share2,
  PlusCircle,
  CheckCircle2,
  Search,
  Filter,
  ShieldCheck,
  X,
  MessageSquare,
  BookOpen,
  Calendar,
  User,
} from 'lucide-react';

export interface Testimony {
  id: string;
  title: string;
  author: string;
  isAnonymous: boolean;
  date: string;
  category: 'Healing & Health' | 'Financial Provision' | 'Salvation & Family' | 'Deliverance & Peace' | 'Academic & Career';
  scriptureRef?: string;
  content: string;
  amenCount: number;
  hasSaidAmen?: boolean;
}

const SAMPLE_TESTIMONIES: Testimony[] = [
  {
    id: 'test-1',
    title: 'Miraculous Healing from Chronic Respiratory Condition',
    author: 'Anita Mary',
    isAnonymous: false,
    date: 'Nov 18, 2026',
    category: 'Healing & Health',
    scriptureRef: 'Jeremiah 30:17',
    content:
      'For over three years, I struggled with chronic asthma and recurring chest infections that hindered my daily life and worship. During last month\'s Night of Healing and Intercession, Pastor prayed specifically for chest and respiratory conditions. I felt an immediate warming sensation and peace. Recent medical scans confirmed complete clearance in my lungs! Giving all glory to Jesus Christ.',
    amenCount: 42,
  },
  {
    id: 'test-2',
    title: 'Breakthrough Job Offer After 8 Months of Waiting',
    author: 'Anonymous Believer',
    isAnonymous: true,
    date: 'Nov 15, 2026',
    category: 'Academic & Career',
    scriptureRef: 'Philippians 4:19',
    content:
      'After sudden corporate downsizing in March, every interview closed without an offer. The church care-cell family stood with me in weekly prayer and fasting. Last Tuesday, I received an unrequested offer from a premier tech firm with 40% higher compensation and favorable terms. God never fails those who put their trust in Him!',
    amenCount: 38,
  },
  {
    id: 'test-3',
    title: 'Reconciliation and Restoration of My Family',
    author: 'David Kumar',
    isAnonymous: false,
    date: 'Nov 12, 2026',
    category: 'Salvation & Family',
    scriptureRef: 'Joshua 24:15',
    content:
      'My elder brother had been estranged from our family and away from church fellowship for seven years. We continued lifting his name during Friday fasting prayers. Last Sunday, he unexpectedly joined the second morning worship service, gave his life to Christ at the altar, and embraced our parents in tears. God is restoring our home!',
    amenCount: 56,
  },
  {
    id: 'test-4',
    title: 'Debt Cancellation & Supernatural Tuition Provision',
    author: 'Sarah Elizabeth',
    isAnonymous: false,
    date: 'Nov 08, 2026',
    category: 'Financial Provision',
    scriptureRef: 'Malachi 3:10',
    content:
      'With final university semester deadlines approaching, we fell short of ₹65,000 in tuition fees. We held fast to tithing and God\'s promises. On the day before the registration freeze, an educational foundation informed us of an anonymous grant covering the entire remainder. Truly Jehovah Jireh provides in due season!',
    amenCount: 29,
  },
];

const CATEGORIES = [
  'All',
  'Healing & Health',
  'Financial Provision',
  'Salvation & Family',
  'Deliverance & Peace',
  'Academic & Career',
] as const;

const STORAGE_KEY_TESTIMONIES = '@rhema_local_testimonies';

export default function TestimoniesPage() {
  const [testimonies, setTestimonies] = useState<Testimony[]>(SAMPLE_TESTIMONIES);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // New Testimony Form State
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<Testimony['category']>('Healing & Health');
  const [formScripture, setFormScripture] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formAnonymous, setFormAnonymous] = useState(false);
  const [formAuthorName, setFormAuthorName] = useState('');

  // Load custom testimonies from localStorage if any
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_TESTIMONIES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTestimonies([...parsed, ...SAMPLE_TESTIMONIES]);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const handleAmen = (id: string) => {
    setTestimonies((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const currentlyAmen = !!t.hasSaidAmen;
          return {
            ...t,
            amenCount: currentlyAmen ? t.amenCount - 1 : t.amenCount + 1,
            hasSaidAmen: !currentlyAmen,
          };
        }
        return t;
      })
    );
  };

  const handleShare = async (testimony: Testimony) => {
    const text = `"${testimony.title}" — A testimony of God's goodness at Rhema Church.\n\n${testimony.content.slice(0, 160)}...\n\nRead more on Rhema Web.`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      setNotification('Testimony link and excerpt copied to clipboard!');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) return;

    const newTestimony: Testimony = {
      id: `local-${Date.now()}`,
      title: formTitle.trim(),
      author: formAnonymous ? 'Anonymous Believer' : formAuthorName.trim() || 'Church Member',
      isAnonymous: formAnonymous,
      date: 'Just now',
      category: formCategory,
      scriptureRef: formScripture.trim() || undefined,
      content: formContent.trim(),
      amenCount: 1,
      hasSaidAmen: true,
    };

    const updated = [newTestimony, ...testimonies];
    setTestimonies(updated);

    try {
      const localOnly = updated.filter((t) => t.id.startsWith('local-'));
      localStorage.setItem(STORAGE_KEY_TESTIMONIES, JSON.stringify(localOnly));
    } catch {
      // ignore
    }

    setModalOpen(false);
    setFormTitle('');
    setFormScripture('');
    setFormContent('');
    setFormAuthorName('');
    setFormAnonymous(false);
    setNotification('Your testimony has been submitted for pastoral review and added to your feed!');
    setTimeout(() => setNotification(null), 4000);
  };

  const filteredTestimonies = testimonies.filter((t) => {
    const matchesCategory = activeCategory === 'All' || t.category === activeCategory;
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.scriptureRef && t.scriptureRef.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Banner with Bible Verse */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B192C] via-[#132A4A] to-[#1E6F43] text-white p-6 md:p-8 shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-semibold backdrop-blur-xs border border-amber-400/30">
                <Sparkles size={14} />
                <span>Testimonies of Praise & Victory</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-serif font-extrabold tracking-tight">
                Celebrate God&apos;s Faithfulness
              </h1>
              <p className="text-slate-200 text-xs md:text-sm leading-relaxed">
                &ldquo;And they overcame him by the blood of the Lamb and by the word of their testimony.&rdquo;
                — <span className="text-amber-300 font-semibold">Revelation 12:11</span>
              </p>
              <div className="pt-1">
                <span className="inline-block px-2.5 py-0.5 rounded-md bg-white/10 text-[11px] text-amber-200 border border-white/15">
                  🛡️ Demonstration Feed — Submissions are reviewed by the pastoral team
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-sm shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 shrink-0"
            >
              <PlusCircle size={18} />
              <span>Share Your Testimony</span>
            </button>
          </div>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between shadow-md transition-all">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-medium">{notification}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-md"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="bg-white dark:bg-[#131C27] rounded-2xl p-4 border border-[#EBE6DC] dark:border-[#222F3E] shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by keywords, author, or scripture..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] bg-[#F7F5EE]/50 dark:bg-[#0D141D] text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#1E6F43]"
              />
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
              <Filter size={14} className="text-[#1E6F43]" />
              <span>Showing {filteredTestimonies.length} testimonies</span>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-thin">
            {CATEGORIES.map((cat) => {
              const active = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full font-medium whitespace-nowrap transition-all ${
                    active
                      ? 'bg-[#1E6F43] text-white shadow-xs'
                      : 'bg-[#F7F5EE] dark:bg-[#0D141D] text-slate-600 dark:text-slate-300 hover:bg-[#EBE6DC] dark:hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Testimonies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredTestimonies.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-[#131C27] rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Card Header: Category & Date */}
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-[#1E6F43] dark:text-emerald-400 font-semibold border border-emerald-100 dark:border-emerald-800/40">
                    {item.category}
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                    <Calendar size={13} />
                    <span>{item.date}</span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-serif font-bold text-base text-slate-900 dark:text-white leading-snug">
                  {item.title}
                </h3>

                {/* Scripture Reference Pill */}
                {item.scriptureRef && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[11px] font-semibold border border-amber-200/60 dark:border-amber-800/40">
                    <BookOpen size={12} />
                    <span>{item.scriptureRef}</span>
                  </div>
                )}

                {/* Content */}
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {item.content}
                </p>
              </div>

              {/* Card Footer: Author and Actions */}
              <div className="pt-4 mt-4 border-t border-[#F0EBE0] dark:border-[#1E2C3D] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#0B192C] text-amber-300 flex items-center justify-center font-bold text-xs">
                    {item.isAnonymous ? '?' : item.author.charAt(0)}
                  </div>
                  <div className="text-xs">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {item.author}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {item.isAnonymous ? 'Private Member' : 'Sample Member'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Amen Button */}
                  <button
                    type="button"
                    onClick={() => handleAmen(item.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      item.hasSaidAmen
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-[#F7F5EE] dark:bg-[#0D141D] text-slate-700 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-amber-950/60 hover:text-amber-700'
                    }`}
                  >
                    <span>🙏 Amen</span>
                    <span className="font-bold">({item.amenCount})</span>
                  </button>

                  {/* Share Button */}
                  <button
                    type="button"
                    onClick={() => handleShare(item)}
                    title="Copy testimony link"
                    className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-[#F7F5EE] dark:hover:bg-slate-800 transition-colors"
                  >
                    <Share2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredTestimonies.length === 0 && (
          <div className="p-12 text-center bg-white dark:bg-[#131C27] rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E]">
            <MessageSquare size={36} className="mx-auto text-slate-400 mb-2" />
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">No testimonies found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Try adjusting your search query or selecting a different category.
            </p>
          </div>
        )}

        {/* Submit Testimony Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-[#131C27] w-full max-w-lg rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[#EBE6DC] dark:border-[#222F3E]">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-[#C89D35]" />
                  <h3 className="font-serif font-bold text-base text-slate-900 dark:text-white">
                    Submit Praise Testimony
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Pastoral Review Notice */}
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                <ShieldCheck size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p>
                  <span className="font-bold">Pastoral Moderation:</span> For the encouragement and edification of the congregation, all submitted testimonies are reviewed prayerfully before publishing.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Testimony Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. God's Divine Healing During the Night Service"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] bg-[#F7F5EE]/50 dark:bg-[#0D141D] text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#1E6F43]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Category *
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] bg-[#F7F5EE]/50 dark:bg-[#0D141D] text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#1E6F43]"
                    >
                      <option value="Healing & Health">Healing & Health</option>
                      <option value="Financial Provision">Financial Provision</option>
                      <option value="Salvation & Family">Salvation & Family</option>
                      <option value="Deliverance & Peace">Deliverance & Peace</option>
                      <option value="Academic & Career">Academic & Career</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Scripture Reference (Optional)
                    </label>
                    <input
                      type="text"
                      value={formScripture}
                      onChange={(e) => setFormScripture(e.target.value)}
                      placeholder="e.g. Psalm 103:2-3"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] bg-[#F7F5EE]/50 dark:bg-[#0D141D] text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#1E6F43]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Your Testimony Story *
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="Describe how the Lord intervened, answered prayer, or touched your life..."
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] bg-[#F7F5EE]/50 dark:bg-[#0D141D] text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#1E6F43]"
                  />
                </div>

                {!formAnonymous && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Your Full Name
                    </label>
                    <input
                      type="text"
                      value={formAuthorName}
                      onChange={(e) => setFormAuthorName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] bg-[#F7F5EE]/50 dark:bg-[#0D141D] text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#1E6F43]"
                    />
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="anonymousCheck"
                    checked={formAnonymous}
                    onChange={(e) => setFormAnonymous(e.target.checked)}
                    className="rounded text-[#1E6F43] focus:ring-[#1E6F43]"
                  />
                  <label htmlFor="anonymousCheck" className="text-xs text-slate-700 dark:text-slate-300">
                    Post anonymously (your name will appear as &ldquo;Anonymous Believer&rdquo;)
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EBE6DC] dark:border-[#222F3E]">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-[#1E6F43] hover:bg-[#165634] text-white shadow-md transition-all"
                  >
                    Submit for Review
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
