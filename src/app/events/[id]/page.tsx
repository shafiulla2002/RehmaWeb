'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { YoutubePlayer } from '@/components/ui/YoutubePlayer';
import { RsvpPollCard } from '@/components/events/RsvpPollCard';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { churchCol } from '@/lib/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

interface EventDetail {
  id: string;
  title: string;
  date?: string;
  time?: string;
  location?: string;
  lat?: number;
  lng?: number;
  coverImageUrl?: string;
  isLiveStream?: boolean;
  youtubeId?: string;
  description?: string;
  rsvpStats?: {
    going?: number;
    interested?: number;
    notGoing?: number;
  };
  services?: {
    name: string;
    time: string;
    leader?: string;
  }[];
  volunteerRoles?: string[];
}

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = React.use(params);
  const eventId = resolvedParams.id;
  const { user } = useAuth();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [selectedVolunteerRole, setSelectedVolunteerRole] = useState<string>('');
  const [volunteerSubmitted, setVolunteerSubmitted] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function fetchEvent() {
      setIsLoading(true);
      setError(null);
      try {
        const eventDocRef = doc(churchCol('events'), eventId);
        const eventSnap = await getDoc(eventDocRef);

        if (!eventSnap.exists()) {
          throw new Error('Event not found.');
        }

        const data = eventSnap.data() as any;
        if (!isCancelled) {
          setEvent({
            id: eventSnap.id,
            title: data.title || 'Untitled Gathering',
            date: data.date,
            time: data.time,
            location: data.location,
            lat: data.lat,
            lng: data.lng,
            coverImageUrl: data.coverImageUrl || data.bannerUrl || data.image,
            isLiveStream: data.isLiveStream || false,
            youtubeId: data.youtubeId,
            description: data.description,
            rsvpStats: data.rsvpStats,
            services: data.services,
            volunteerRoles: data.volunteerRoles || [
              'Hospitality & Welcome',
              'Ushering & Logistics',
              'Choir / Worship Team',
              'Tech Booth / Media Live',
              'Children Sunday School',
            ],
          });
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Failed to load event details:', err);
          setError(err.message || 'Unable to load event details.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchEvent();

    return () => {
      isCancelled = true;
    };
  }, [eventId]);

  function handleShare() {
    if (typeof window !== 'undefined') {
      if (navigator.share) {
        navigator.share({
          title: event?.title || 'Rhema Church Event',
          text: `Join us for ${event?.title} on ${event?.date} at Rhema Church!`,
          url: window.location.href,
        }).catch(() => {});
      } else {
        navigator.clipboard.writeText(window.location.href);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    }
  }

  function handleVolunteerSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVolunteerRole) return;
    setVolunteerSubmitted(true);
  }

  // Feature 21: Client-Side .ics Calendar Generator
  function downloadIcsCalendar() {
    if (!event) return;
    const dateFormatted = (event.date ? event.date.replace(/-/g, '') : new Date().toISOString().slice(0, 10).replace(/-/g, '')) + 'T090000Z';
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Rhema Christian Ministries//Events//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
SUMMARY:${event.title}
DESCRIPTION:${event.description || 'Rhema Christian Gathering'}
LOCATION:${event.location || 'Rhema Sanctuary'}
DTSTART:${dateFormatted}
DTEND:${dateFormatted}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openGoogleCalendar() {
    if (!event) return;
    const dateFormatted = (event.date ? event.date.replace(/-/g, '') : new Date().toISOString().slice(0, 10).replace(/-/g, '')) + 'T090000Z';
    const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${dateFormatted}/${dateFormatted}&details=${encodeURIComponent(event.description || 'Rhema Christian Gathering')}&location=${encodeURIComponent(event.location || 'Rhema Sanctuary')}`;
    window.open(gCalUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <AppShell allowedRoles={['member', 'admin', 'superadmin', 'guest']}>
      <div className="space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-blue-600 transition-colors"
          >
            <span>←</span>
            <span>Back to All Events</span>
          </Link>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={downloadIcsCalendar}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors shadow-xs"
              title="Download standard .ics calendar file"
            >
              <span>📅</span>
              <span>.ICS Download</span>
            </button>

            <button
              type="button"
              onClick={openGoogleCalendar}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors shadow-xs"
              title="Add gathering to Google Calendar"
            >
              <span>🗓️</span>
              <span>Google Calendar</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors shadow-xs"
            >
              <span>🔗</span>
              <span>{copiedLink ? 'Link Copied!' : 'Share Event'}</span>
            </button>
          </div>
        </div>

        {error && <ErrorBanner message={error} />}

        {isLoading ? (
          <CardSkeleton lines={6} />
        ) : !event ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-sm text-gray-500">
            Event not found.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Banner & Title Header */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
              {event.coverImageUrl && (
                <div className="h-56 sm:h-72 w-full relative overflow-hidden bg-gray-900">
                  <img
                    src={event.coverImageUrl}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                  {event.isLiveStream && (
                    <span className="absolute top-4 right-4 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md animate-pulse">
                      🔴 LIVE BROADCAST
                    </span>
                  )}
                </div>
              )}

              <div className="p-6 sm:p-8">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                  {event.title}
                </h1>

                <div className="flex flex-wrap items-center gap-4 mt-4 text-xs font-medium text-gray-600">
                  {event.date && (
                    <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-800 px-3 py-1.5 rounded-lg">
                      <span>📅</span>
                      <span>{event.date}</span>
                      {event.time && <span>· {event.time}</span>}
                    </span>
                  )}

                  {event.location && (
                    <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-800 px-3 py-1.5 rounded-lg">
                      <span>📍</span>
                      <span>{event.location}</span>
                    </span>
                  )}
                </div>

                {event.description && (
                  <p className="text-xs sm:text-sm text-gray-700 mt-5 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                    {event.description}
                  </p>
                )}
              </div>
            </div>

            {/* Live Stream Section (if active) */}
            {event.youtubeId && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span>📺</span>
                  <span>Gathering Live Stream &amp; Recording</span>
                </h3>
                <YoutubePlayer videoId={event.youtubeId} title={event.title} />
              </div>
            )}

            {/* 2-Column Responsive Layout: Details / Schedule vs RSVP / Volunteer */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column (7 cols): Multi-Service Schedule & Google Map */}
              <div className="lg:col-span-7 space-y-6">
                {/* Multi-Service Schedule */}
                {event.services && event.services.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <span>⏱️</span>
                      <span>Service Timings &amp; Program Schedule</span>
                    </h3>
                    <div className="space-y-2.5">
                      {event.services.map((svc, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-between"
                        >
                          <div>
                            <p className="text-xs font-bold text-gray-800">{svc.name}</p>
                            {svc.leader && (
                              <p className="text-[11px] text-gray-500">Ministry: {svc.leader}</p>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-blue-700 bg-blue-100/60 px-2.5 py-1 rounded-md">
                            {svc.time}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Google Maps Embed */}
                {event.location && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
                    <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <span>🗺️</span>
                      <span>Directions &amp; Venue Map</span>
                    </h3>
                    <p className="text-xs text-gray-500 mb-3">{event.location}</p>
                    <div className="rounded-xl overflow-hidden border border-gray-200 h-64 bg-gray-100">
                      <iframe
                        title="Event Location"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(
                          event.location
                        )}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column (5 cols): RSVP Poll & Event Volunteering */}
              <div className="lg:col-span-5 space-y-6">
                {/* RSVP Poll Card (Privacy-Preserved Aggregates) */}
                <RsvpPollCard
                  eventId={event.id}
                  stats={event.rsvpStats}
                  uid={user?.uid}
                />

                {/* Event Volunteering Widget */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
                  <h3 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2">
                    <span>🤝</span>
                    <span>Serve as Event Volunteer</span>
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Support the pastoral and hospitality team during this gathering.
                  </p>

                  {volunteerSubmitted ? (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs space-y-1">
                      <p className="font-bold">✓ Application Recorded Locally</p>
                      <p>You offered to serve in: <span className="font-semibold">{selectedVolunteerRole}</span></p>
                      <p className="text-[11px] text-emerald-600 mt-2 italic">
                        💾 Saved locally · Firebase write pending separate approval
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleVolunteerSubmit} className="space-y-3">
                      <div>
                        <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block mb-1.5">
                          Select Service Role
                        </label>
                        <select
                          value={selectedVolunteerRole}
                          onChange={(e) => setSelectedVolunteerRole(e.target.value)}
                          required
                          className="w-full bg-gray-50 border border-gray-200 text-xs rounded-xl px-3 py-2.5 text-gray-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">-- Choose Ministry Role --</option>
                          {event.volunteerRoles?.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={!selectedVolunteerRole}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors shadow-xs"
                      >
                        Apply for Event Role
                      </button>

                      <p className="text-[10px] text-gray-400 text-center italic">
                        Applications recorded locally awaiting backend write authorization
                      </p>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
