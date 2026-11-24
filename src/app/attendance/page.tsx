'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import {
  CheckSquare,
  QrCode,
  Calendar as CalendarIcon,
  Flame,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Send,
  X,
  Sparkles,
  RefreshCw,
  Lock,
  UserCheck,
} from 'lucide-react';

interface LiveEventItem {
  id: string;
  title: string;
  titleTe?: string;
  date: string;
  time?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  category?: string;
  description?: string;
}

interface MemberAttendanceLog {
  id: string;
  eventId?: string;
  eventName?: string;
  memberId?: string;
  memberName?: string;
  status: 'Present' | 'Absent' | 'Excused' | string;
  date: string;
  time?: string;
  method?: string;
  venue?: string;
}

interface ActiveSessionData {
  id: string;
  title: string;
  serviceDate: string;
  serviceSlot: string;
  status: string;
}

export default function AttendancePage() {
  const { user, profile } = useAuth();
  const [events, setEvents] = useState<LiveEventItem[]>([]);
  const [history, setHistory] = useState<MemberAttendanceLog[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveSessionData | null>(null);
  const [hasCheckedInToday, setHasCheckedInToday] = useState<boolean>(false);
  const [checkedInTime, setCheckedInTime] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Listen to active attendance sessions in real-time
  useEffect(() => {
    const attCol = collection(db, 'Rhema Church', 'rhema', 'attendanceRequests');
    const unsub = onSnapshot(
      attCol,
      async (snapshot) => {
        let active: ActiveSessionData | null = null;
        snapshot.forEach((d) => {
          const data = d.data();
          if (data.status === 'Active') {
            active = {
              id: d.id,
              title: data.title || `${data.serviceDate || ''} - ${data.serviceSlot || 'Service'}`,
              serviceDate: data.serviceDate || '',
              serviceSlot: data.serviceSlot || '',
              status: data.status,
            };
          }
        });
        setActiveSession(active);

        // Check if member already responded to active session
        if (active && user?.uid) {
          try {
            const currentActive = active as ActiveSessionData;
            const resRef = doc(db, 'Rhema Church', 'rhema', 'attendanceRequests', currentActive.id, 'responses', user.uid);
            const resSnap = await getDoc(resRef);
            if (resSnap.exists()) {
              setHasCheckedInToday(true);
              const rd = resSnap.data();
              setCheckedInTime(rd.scannedAt || rd.respondedAt ? new Date(rd.scannedAt || rd.respondedAt).toLocaleTimeString() : 'Verified');
            } else {
              setHasCheckedInToday(false);
              setCheckedInTime(null);
            }
          } catch (e) {
            console.warn('Could not verify member check-in status:', e);
          }
        }
      },
      (err) => {
        console.warn('Error listening to attendance sessions:', err);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  // 2. Fetch upcoming events schedule & personal attendance history
  useEffect(() => {
    async function loadScheduleAndHistory() {
      try {
        setLoading(true);
        setError(null);

        // Fetch church schedule from events
        const eventsCol = collection(db, 'Rhema Church', 'rhema', 'events');
        const eventsSnap = await getDocs(eventsCol);
        const eventList: LiveEventItem[] = [];
        eventsSnap.forEach((docSnap) => {
          const d = docSnap.data();
          if (d.status === 'published' || !d.status || d.status === 'active') {
            eventList.push({
              id: docSnap.id,
              title: d.title || 'Church Gathering',
              titleTe: d.titleTe,
              date: d.date || d.startDate || 'Regular Service',
              time: d.time || d.startTime || '10:00 AM',
              startTime: d.startTime,
              endTime: d.endTime,
              location: d.location || 'Rhema Sanctuary',
              category: d.category || 'Worship',
              description: d.description,
            });
          }
        });
        setEvents(eventList);

        // Fetch authenticated member's personal attendance history
        if (user?.uid) {
          try {
            const attCol = collection(db, 'Rhema Church', 'rhema', 'attendanceRecords');
            const attQuery = query(attCol, where('memberId', '==', user.uid), limit(25));
            const attSnap = await getDocs(attQuery);
            const logs: MemberAttendanceLog[] = [];
            attSnap.forEach((docSnap) => {
              const d = docSnap.data();
              logs.push({
                id: docSnap.id,
                eventId: d.eventId,
                eventName: d.eventName || 'Church Service',
                memberId: d.memberId,
                memberName: d.memberName || user.displayName || 'Member',
                status: d.status || 'Present',
                date: d.scannedAt || d.date || (d.timestamp?.toDate ? d.timestamp.toDate().toLocaleDateString() : 'Recent'),
                time: d.time,
                method: d.method || 'DIGITAL_CHECKIN',
                venue: d.venue || 'Rhema Main Sanctuary',
              });
            });
            setHistory(logs);
          } catch (attErr) {
            console.warn('Personal attendance records query notice:', attErr);
          }
        }
      } catch (err: unknown) {
        console.warn('Failed to load events:', err);
        setError('Unable to load church gathering schedule. Please verify your connection.');
      } finally {
        setLoading(false);
      }
    }

    loadScheduleAndHistory();
  }, [user?.uid]);

  // Handle Check-in Action
  const handleCheckInNow = async () => {
    if (!activeSession || !user?.uid) return;
    setIsCheckingIn(true);
    try {
      const now = new Date();
      const nowIso = now.toISOString();
      const memberName = profile?.fullName || user.displayName || 'Church Member';
      const memberPhone = user.phoneNumber || '';

      // 1. Record response in attendanceRequests subcollection
      const responseRef = doc(db, 'Rhema Church', 'rhema', 'attendanceRequests', activeSession.id, 'responses', user.uid);
      await setDoc(
        responseRef,
        {
          memberId: user.uid,
          memberName,
          memberPhone,
          status: 'Present',
          respondedAt: nowIso,
          scannedAt: nowIso,
        },
        { merge: true }
      );

      // 2. Record in member personal attendanceRecords
      const logId = `${activeSession.id}_${user.uid}`;
      const logRef = doc(db, 'Rhema Church', 'rhema', 'attendanceRecords', logId);
      await setDoc(
        logRef,
        {
          id: logId,
          eventId: activeSession.id,
          sessionId: activeSession.id,
          memberId: user.uid,
          memberName,
          eventName: activeSession.title,
          date: activeSession.serviceDate,
          status: 'Present',
          scannedAt: nowIso,
          method: 'DIGITAL_CHECKIN',
          venue: 'Rhema Main Sanctuary',
          createdAt: nowIso,
        },
        { merge: true }
      );

      setHasCheckedInToday(true);
      setCheckedInTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      showToast('Amen! You are checked in for today’s gathering.');

      // Add to local history list
      setHistory((prev) => [
        {
          id: logId,
          eventName: activeSession.title,
          memberId: user.uid,
          memberName,
          status: 'Present',
          date: now.toLocaleDateString(),
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          method: 'DIGITAL_CHECKIN',
          venue: 'Rhema Main Sanctuary',
        },
        ...prev,
      ]);
    } catch (err: any) {
      console.error('Check-in error:', err);
      showToast(`Error: ${err.message || 'Check-in failed'}`);
    } finally {
      setIsCheckingIn(false);
    }
  };

  return (
    <AppShell allowedRoles={['member', 'admin', 'superadmin', 'guest']}>
      <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-emerald-600 text-white text-xs font-semibold rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
            <CheckCircle2 size={16} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <CheckSquare size={24} />
            </span>
            <div>
              <h1 className="text-2xl font-black text-white">Church Attendance &amp; Check-In Hub</h1>
              <p className="text-xs text-slate-400">
                Check in to live sanctuary services and review personal church attendance records
              </p>
            </div>
          </div>
        </div>

        {/* LIVE SESSION CHECK-IN HERO BANNER */}
        {activeSession ? (
          <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-amber-950/60 border border-emerald-500/30 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                    Live Check-In In Progress
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">{activeSession.title}</h2>
                <p className="text-xs text-slate-300">
                  {activeSession.serviceDate} • {activeSession.serviceSlot} • Main Sanctuary Cathedral
                </p>
              </div>

              <div>
                {hasCheckedInToday ? (
                  <div className="px-5 py-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center gap-2 text-xs font-bold">
                    <CheckCircle2 size={18} className="text-emerald-400" />
                    <span>Checked In &bull; Verified ({checkedInTime})</span>
                  </div>
                ) : (
                  <button
                    onClick={handleCheckInNow}
                    disabled={isCheckingIn}
                    className="px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-xl flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    {isCheckingIn ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <UserCheck size={16} />
                        <span>Check In to Service Now</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-slate-500" />
              <span>No service check-in currently active. Ushers will open check-in during worship services.</span>
            </div>
            <span className="font-mono text-[11px] text-slate-500">Next Service: Sunday 08:30 AM</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-950/60 border border-red-800 rounded-2xl flex items-start gap-3 text-xs text-red-200">
            <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Two Columns: Personal History + Upcoming Schedule */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Personal Attendance History (7 cols) */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <CheckSquare size={16} /> My Attendance Record
              </h2>
              <span className="text-xs text-slate-400 font-mono">{history.length} services</span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                <RefreshCw size={24} className="animate-spin text-amber-500 mx-auto" />
                <p>Loading personal logs...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No attendance check-ins recorded yet. Check in during Sunday services.
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-white block">{item.eventName}</span>
                      <span className="text-[10px] text-slate-400">
                        {item.date} • {item.venue || 'Rhema Main Sanctuary'}
                      </span>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Upcoming Gatherings Schedule (5 cols) */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <CalendarIcon size={16} /> Sanctuary Gatherings
              </h2>
              <span className="text-xs text-slate-400 font-mono">{events.length} listed</span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <RefreshCw size={24} className="animate-spin text-amber-500 mx-auto" />
              </div>
            ) : events.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No upcoming events scheduled.
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {events.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{evt.title}</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">
                        {evt.category || 'Service'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>{evt.date}</span>
                      <span className="font-mono">{evt.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
