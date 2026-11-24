'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SermonCard } from '@/components/ui/SermonCard';
import { GridSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { getLiveSermons, LiveSermon } from '@/lib/firestoreService';
import { churchCol } from '@/lib/firestore';
import { doc, getDoc } from 'firebase/firestore';

interface SermonItem {
  id: string;
  title: string;
  speaker?: string;
  category?: string;
  date?: string;
  youtubeId?: string;
  thumbnailUrl?: string;
  notesUrl?: string;
  notesType?: string;
  status: string;
  description?: string;
}

const DEFAULT_CATEGORIES = [
  'All',
  'Sunday Service',
  'Bible Study',
  "Women's Fasting Prayer",
  'Youth Fellowship',
  'All Night Prayer',
  'Special Gatherings',
];

export default function SermonsPage() {
  const [sermons, setSermons] = useState<SermonItem[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadSermons() {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch custom sermon categories if defined
        try {
          const catDoc = await getDoc(doc(churchCol('settings'), 'sermon_categories'));
          if (catDoc.exists()) {
            const catData = catDoc.data();
            if (Array.isArray(catData?.categories) && catData.categories.length > 0) {
              setCategories(['All', ...catData.categories]);
            }
          }
        } catch {
          // Use default categories
        }

        const raw = await getLiveSermons(50);
        const list: SermonItem[] = raw.map((s) => ({
          id: s.id,
          title: s.title || 'Untitled Sermon',
          speaker: s.pastor || 'Rhema Ministry',
          category: s.categories ? s.categories.split(';')[0] : 'Sunday Service',
          date: s.date || undefined,
          youtubeId: s.youtubeId,
          thumbnailUrl: s.thumbnailUrl,
          notesUrl: s.notesUrl,
          notesType: s.notesFileName ? (s.notesFileName.endsWith('.pdf') ? 'pdf' : 'doc') : undefined,
          status: s.status || 'Published',
          description: s.description,
        }));

        if (!isCancelled) {
          setSermons(list);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Failed to load sermons:', err);
          setError('Unable to load sermons. Please check your network connection.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadSermons();

    return () => {
      isCancelled = true;
    };
  }, []);

  const years = Array.from(
    new Set(
      sermons
        .map((s) => (s.date ? new Date(s.date).getFullYear().toString() : ''))
        .filter((y) => y && !isNaN(Number(y)))
    )
  ).sort((a, b) => Number(b) - Number(a));

  const filteredSermons = sermons.filter((s) => {
    const matchesCategory = activeCategory === 'All' || s.category === activeCategory;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      s.title.toLowerCase().includes(term) ||
      (s.speaker && s.speaker.toLowerCase().includes(term));
    const sermonYear = s.date ? new Date(s.date).getFullYear().toString() : '';
    const matchesYear = selectedYear === 'All' || sermonYear === selectedYear;

    return matchesCategory && matchesSearch && matchesYear;
  });

  return (
    <AppShell allowedRoles={['member', 'admin', 'superadmin', 'guest']}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Sermons Library &amp; Study Notes
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Watch pulpit video recordings and download synchronized pastoral study notes
            </p>
          </div>

          <div className="flex items-center gap-2">
            {years.length > 0 && (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-white dark:bg-[#131C27] border border-[#EBE6DC] dark:border-[#222F3E] text-xs font-semibold rounded-full px-3.5 py-2 text-slate-700 dark:text-slate-200 shadow-xs"
              >
                <option value="All">All Years</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>
            )}

            <input
              type="text"
              placeholder="Search title, preacher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white dark:bg-[#131C27] border border-[#EBE6DC] dark:border-[#222F3E] text-xs rounded-full px-4 py-2 w-48 sm:w-64 focus:outline-hidden focus:ring-1 focus:ring-[#1E6F43] shadow-xs"
            />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#1E6F43] text-white shadow-xs'
                    : 'bg-white dark:bg-[#131C27] border border-[#EBE6DC] dark:border-[#222F3E] text-slate-700 dark:text-slate-300 hover:bg-[#E8F3EC] dark:hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {error && <ErrorBanner message={error} />}

        {/* Sermons Grid */}
        {isLoading ? (
          <GridSkeleton count={6} />
        ) : filteredSermons.length === 0 ? (
          <EmptyState
            icon="🎙️"
            title="No sermons found"
            subtitle="No sermons match the selected category or search filters."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSermons.map((sermon) => (
              <SermonCard
                key={sermon.id}
                id={sermon.id}
                title={sermon.title}
                speaker={sermon.speaker}
                category={sermon.category}
                date={sermon.date}
                thumbnailUrl={sermon.thumbnailUrl}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
