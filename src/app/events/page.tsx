'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { EventCard } from '@/components/ui/EventCard';
import { GridSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { getLiveEvents, LiveEvent } from '@/lib/firestoreService';

interface EventItem {
  id: string;
  title: string;
  date?: string;
  time?: string;
  location?: string;
  coverImageUrl?: string;
  isLiveStream?: boolean;
  description?: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [activeTab, setActiveTab] = useState<'this_week' | 'upcoming' | 'past'>('upcoming');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadEvents() {
      setIsLoading(true);
      setError(null);
      try {
        const raw = await getLiveEvents(50);
        const list: EventItem[] = raw.map((e) => ({
          id: e.id,
          title: e.title || 'Untitled Gathering',
          date: e.date,
          time: e.time,
          location: e.location,
          coverImageUrl: e.bannerUrl,
          isLiveStream: false,
          description: e.description,
        }));

        if (!isCancelled) {
          setEvents(list);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Failed to load church events:', err);
          setError('Unable to load church gatherings. Please check your connection.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadEvents();

    return () => {
      isCancelled = true;
    };
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const oneWeekLater = new Date(today);
  oneWeekLater.setDate(oneWeekLater.getDate() + 7);

  const filteredEvents = events.filter((e) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      e.title.toLowerCase().includes(term) ||
      (e.location && e.location.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    if (!e.date) return activeTab === 'upcoming';
    const eventDate = new Date(e.date);
    eventDate.setHours(0, 0, 0, 0);

    if (activeTab === 'this_week') {
      return eventDate >= today && eventDate <= oneWeekLater;
    }
    if (activeTab === 'upcoming') {
      return eventDate >= today;
    }
    if (activeTab === 'past') {
      return eventDate < today;
    }
    return true;
  });

  return (
    <AppShell allowedRoles={['member', 'admin', 'superadmin', 'guest']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Church Events &amp; Gatherings
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Worship services, fasting prayers, youth gatherings, and volunteer opportunities
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search event or venue..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white dark:bg-[#131C27] border border-[#EBE6DC] dark:border-[#222F3E] text-xs rounded-full px-4 py-2 w-full sm:w-64 focus:outline-hidden focus:ring-1 focus:ring-[#1E6F43] shadow-xs"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {[
            { id: 'this_week', label: 'This Week' },
            { id: 'upcoming', label: 'All Upcoming' },
            { id: 'past', label: 'Past Gatherings' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-2xl text-xs font-semibold border transition-all ${
                activeTab === tab.id
                  ? 'bg-[#1E6F43] text-white border-[#1E6F43] shadow-xs'
                  : 'bg-white dark:bg-[#131C27] border-[#EBE6DC] dark:border-[#222F3E] text-slate-700 dark:text-slate-300 hover:bg-[#E8F3EC] dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && <ErrorBanner message={error} />}

        {isLoading ? (
          <GridSkeleton count={6} />
        ) : filteredEvents.length === 0 ? (
          <EmptyState
            icon="📅"
            title="No events found"
            subtitle={
              activeTab === 'this_week'
                ? 'No events scheduled for the next 7 days. Check All Upcoming for future gatherings.'
                : 'No church events currently listed in this category.'
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredEvents.map((event) => (
              <EventCard
                key={event.id}
                id={event.id}
                title={event.title}
                date={event.date}
                time={event.time}
                location={event.location}
                coverImageUrl={event.coverImageUrl}
                isLiveStream={event.isLiveStream}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
