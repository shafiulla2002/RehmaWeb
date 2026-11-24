'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminNavigationShell } from '@/components/layout/AdminNavigationShell';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import {
  CalendarCheck,
  Users,
  UserCheck,
  TrendingUp,
  AlertTriangle,
  Clock,
  Calendar,
  Save,
  RotateCcw,
  CheckCircle2,
  X,
  Plus,
  Minus,
  PhoneCall,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  Download,
  Play,
  Square,
  RefreshCw,
  Trash2,
} from 'lucide-react';

export type SundayServiceSlot =
  | '07:00 AM (Dawn Prayer)'
  | '08:30 AM (1st Service)'
  | '10:30 AM (2nd Service)'
  | '05:30 PM (Evening Praise)';

export interface LiveAttendanceSession {
  id: string;
  title?: string;
  serviceDate: string;
  serviceSlot: SundayServiceSlot | string;
  status: 'Active' | 'Closed' | string;
  countMain?: number;
  countBalcony?: number;
  countOverflow?: number;
  countChildren?: number;
  firstTimeVisitors?: number;
  totalHeadcount?: number;
  usherNotes?: string;
  responsesCount?: number;
  createdAt?: string;
  updatedAt?: string;
  closedAt?: string;
}

export interface LiveAttendanceResponse {
  id: string;
  memberId: string;
  memberName: string;
  memberPhone?: string;
  status: string;
  respondedAt?: string;
  scannedAt?: string;
}

export default function AttendanceAdminPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<LiveAttendanceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Session / Headcount Form State
  const [selectedSlot, setSelectedSlot] = useState<SundayServiceSlot>('08:30 AM (1st Service)');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [countMain, setCountMain] = useState(300);
  const [countBalcony, setCountBalcony] = useState(80);
  const [countOverflow, setCountOverflow] = useState(30);
  const [countChildren, setCountChildren] = useState(50);
  const [firstTimeVisitors, setFirstTimeVisitors] = useState(15);
  const [usherNotes, setUsherNotes] = useState('');

  // Selected Session for viewing live responses
  const [viewingSession, setViewingSession] = useState<LiveAttendanceSession | null>(null);
  const [sessionResponses, setSessionResponses] = useState<LiveAttendanceResponse[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Real-time Firestore subscription to attendanceRequests
  useEffect(() => {
    setLoading(true);
    const colRef = collection(db, 'Rhema Church', 'rhema', 'attendanceRequests');

    const unsub = onSnapshot(
      colRef,
      (snapshot) => {
        const list: LiveAttendanceSession[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          const main = Number(data.countMain || 0);
          const balcony = Number(data.countBalcony || 0);
          const overflow = Number(data.countOverflow || 0);
          const children = Number(data.countChildren || 0);
          const total = main + balcony + overflow + children;

          list.push({
            id: d.id,
            title: data.title || `${data.serviceDate || ''} - ${data.serviceSlot || 'Service'}`,
            serviceDate: data.serviceDate || '',
            serviceSlot: data.serviceSlot || '08:30 AM (1st Service)',
            status: data.status || 'Closed',
            countMain: main,
            countBalcony: balcony,
            countOverflow: overflow,
            countChildren: children,
            firstTimeVisitors: Number(data.firstTimeVisitors || 0),
            totalHeadcount: data.totalHeadcount || total,
            usherNotes: data.usherNotes || '',
            responsesCount: data.responsesCount || 0,
            createdAt: data.createdAt || '',
            updatedAt: data.updatedAt || '',
          });
        });

        // Sort descending by serviceDate
        list.sort((a, b) => (b.serviceDate || '').localeCompare(a.serviceDate || ''));
        setSessions(list);
        setLoading(false);
      },
      (err) => {
        console.error('[M34 Attendance Admin] Firestore listener error:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Compute live current total
  const currentTotal = useMemo(() => {
    return Math.max(0, countMain) + Math.max(0, countBalcony) + Math.max(0, countOverflow) + Math.max(0, countChildren);
  }, [countMain, countBalcony, countOverflow, countChildren]);

  // Handle Save / Launch Headcount Session
  const handleSaveHeadcount = async (e: React.FormEvent, makeActive = false) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const sessionId = `ATT-${selectedDate}-${selectedSlot.substring(0, 5).replace(':', '')}`;
      const nowIso = new Date().toISOString();
      const docRef = doc(db, 'Rhema Church', 'rhema', 'attendanceRequests', sessionId);

      const payload: Partial<LiveAttendanceSession> = {
        id: sessionId,
        title: `${selectedDate} - ${selectedSlot}`,
        serviceDate: selectedDate,
        serviceSlot: selectedSlot,
        status: makeActive ? 'Active' : 'Closed',
        countMain,
        countBalcony,
        countOverflow,
        countChildren,
        firstTimeVisitors,
        totalHeadcount: currentTotal,
        usherNotes: usherNotes.trim(),
        updatedAt: nowIso,
      };

      await setDoc(docRef, { ...payload, createdAt: nowIso }, { merge: true });
      showToast(makeActive ? 'Live attendance session activated! Members can now check in.' : 'Session headcount saved to church registry.');
    } catch (err: any) {
      console.error('Error saving attendance session:', err);
      showToast(`Error: ${err.message || 'Failed to save session'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Session Active / Closed
  const handleToggleStatus = async (session: LiveAttendanceSession) => {
    const newStatus = session.status === 'Active' ? 'Closed' : 'Active';
    try {
      const docRef = doc(db, 'Rhema Church', 'rhema', 'attendanceRequests', session.id);
      await updateDoc(docRef, {
        status: newStatus,
        updatedAt: new Date().toISOString(),
        ...(newStatus === 'Closed' ? { closedAt: new Date().toISOString() } : {}),
      });
      showToast(`Session is now ${newStatus}!`);
    } catch (err: any) {
      console.error('Error updating session status:', err);
      showToast(`Error: ${err.message || 'Failed to toggle status'}`);
    }
  };

  // Delete Session
  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to permanently delete this attendance session?')) return;
    try {
      const docRef = doc(db, 'Rhema Church', 'rhema', 'attendanceRequests', sessionId);
      await deleteDoc(docRef);
      showToast('Attendance record deleted.');
      if (viewingSession?.id === sessionId) setViewingSession(null);
    } catch (err: any) {
      console.error('Error deleting session:', err);
      showToast(`Error: ${err.message || 'Failed to delete'}`);
    }
  };

  // View Responses for a Session
  const handleViewResponses = async (session: LiveAttendanceSession) => {
    setViewingSession(session);
    setLoadingResponses(true);
    try {
      const resCol = collection(db, 'Rhema Church', 'rhema', 'attendanceRequests', session.id, 'responses');
      const snap = await getDocs(resCol);
      const list: LiveAttendanceResponse[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          memberId: data.memberId || d.id,
          memberName: data.memberName || 'Member',
          memberPhone: data.memberPhone || '',
          status: data.status || 'Present',
          respondedAt: data.respondedAt || data.scannedAt || '',
        });
      });
      setSessionResponses(list);
    } catch (err) {
      console.warn('Could not load responses for session:', err);
    } finally {
      setLoadingResponses(false);
    }
  };

  // Export Attendance to CSV
  const handleExportCSV = () => {
    const headers = ['Session ID', 'Date', 'Slot', 'Status', 'Main', 'Balcony', 'Overflow', 'Children', 'Visitors', 'Total Headcount'];
    const rows = sessions.map((s) => [
      `"${s.id}"`,
      `"${s.serviceDate}"`,
      `"${s.serviceSlot}"`,
      `"${s.status}"`,
      s.countMain || 0,
      s.countBalcony || 0,
      s.countOverflow || 0,
      s.countChildren || 0,
      s.firstTimeVisitors || 0,
      s.totalHeadcount || 0,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rhema_attendance_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Attendance records exported to CSV.');
  };

  // Overall Statistics
  const totalGathered = useMemo(() => sessions.reduce((acc, s) => acc + (s.totalHeadcount || 0), 0), [sessions]);
  const activeSessionsCount = useMemo(() => sessions.filter((s) => s.status === 'Active').length, [sessions]);
  const avgAttendance = useMemo(() => (sessions.length > 0 ? Math.round(totalGathered / sessions.length) : 0), [sessions, totalGathered]);

  return (
    <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
      <AdminNavigationShell>
        <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {/* Toast */}
          {toastMessage && (
            <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-emerald-600 text-white text-xs font-semibold rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
              <CheckCircle2 size={16} />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500 font-bold">
                  <CalendarCheck size={24} />
                </span>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Attendance Analytics &amp; Ushering HUD
                  </h1>
                  <span className="text-xs text-slate-500">Module 34 • Live Firebase Sessions</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                Open real-time check-in sessions for congregation check-in, record sanctuary section headcounts, and analyze attendance percentages.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Download size={14} />
                <span>Export CSV Report</span>
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Recorded Headcount</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{totalGathered.toLocaleString()}</div>
              <span className="text-[10px] text-slate-500">Across {sessions.length} services logged</span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Live Active Sessions</span>
              <div className="text-2xl font-black text-amber-500">{activeSessionsCount}</div>
              <span className="text-[10px] text-slate-500">Open for member check-in</span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Average Per Service</span>
              <div className="text-2xl font-black text-emerald-500">{avgAttendance.toLocaleString()}</div>
              <span className="text-[10px] text-slate-500">Congregants &amp; Visitors</span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Capacity Utilization</span>
              <div className="text-2xl font-black text-sky-500">
                {avgAttendance > 0 ? `${Math.min(100, Math.round((avgAttendance / 600) * 100))}%` : '0%'}
              </div>
              <span className="text-[10px] text-slate-500">Based on 600-seat sanctuary</span>
            </div>
          </div>

          {/* Main Grid: Form + Live Sessions Table */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Log Session & Ushering Input (5 cols) */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <UserCheck size={16} className="text-amber-500" />
                  <span>Sanctuary Headcount &amp; Check-In</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500">
                  Ushering HUD
                </span>
              </div>

              <form className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Service Date</label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Service Slot</label>
                    <select
                      value={selectedSlot}
                      onChange={(e) => setSelectedSlot(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs"
                    >
                      <option value="07:00 AM (Dawn Prayer)">07:00 AM (Dawn Prayer)</option>
                      <option value="08:30 AM (1st Service)">08:30 AM (1st Service)</option>
                      <option value="10:30 AM (2nd Service)">10:30 AM (2nd Service)</option>
                      <option value="05:30 PM (Evening Praise)">05:30 PM (Evening Praise)</option>
                    </select>
                  </div>
                </div>

                {/* Section Headcounts */}
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">Main Sanctuary Hall</span>
                      <span className="text-[10px] text-slate-400">Ground floor seating</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCountMain((p) => Math.max(0, p - 10))}
                        className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={countMain}
                        onChange={(e) => setCountMain(Number(e.target.value))}
                        className="w-16 text-center font-bold py-1 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setCountMain((p) => p + 10)}
                        className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">Balcony Tier</span>
                      <span className="text-[10px] text-slate-400">Upper balcony seats</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCountBalcony((p) => Math.max(0, p - 10))}
                        className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={countBalcony}
                        onChange={(e) => setCountBalcony(Number(e.target.value))}
                        className="w-16 text-center font-bold py-1 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setCountBalcony((p) => p + 10)}
                        className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">Children&apos;s Church</span>
                      <span className="text-[10px] text-slate-400">Sunday school halls</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCountChildren((p) => Math.max(0, p - 5))}
                        className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={countChildren}
                        onChange={(e) => setCountChildren(Number(e.target.value))}
                        className="w-16 text-center font-bold py-1 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setCountChildren((p) => p + 5)}
                        className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">First-Time Visitors</span>
                      <span className="text-[10px] text-slate-400">Welcome team reception</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={firstTimeVisitors}
                        onChange={(e) => setFirstTimeVisitors(Number(e.target.value))}
                        className="w-20 text-center font-bold py-1 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Total Summary */}
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                  <span className="font-bold text-xs text-amber-500 uppercase">Calculated Total</span>
                  <span className="text-xl font-black text-amber-500">{currentTotal}</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Ushering Notes</label>
                  <textarea
                    rows={2}
                    placeholder="E.g. Heavy rain at 8am, extra chairs placed in hallway..."
                    value={usherNotes}
                    onChange={(e) => setUsherNotes(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={(e) => handleSaveHeadcount(e, false)}
                    disabled={isSubmitting}
                    className="py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Save size={14} />
                    <span>Save Log Only</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleSaveHeadcount(e, true)}
                    disabled={isSubmitting}
                    className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Play size={14} />
                    <span>Launch Live Session</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Sessions History & Response Viewer (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar size={16} className="text-amber-500" />
                    <span>Live Attendance Sessions History</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">{sessions.length} records</span>
                </div>

                {loading ? (
                  <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                    <RefreshCw size={24} className="animate-spin text-amber-500 mx-auto" />
                    <p>Loading attendance sessions...</p>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No attendance sessions logged yet. Create your first session on the left.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sessions.map((sess) => (
                      <div
                        key={sess.id}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900 dark:text-white">
                                {sess.serviceDate}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                  sess.status === 'Active'
                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                    : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                }`}
                              >
                                {sess.status}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 font-medium block mt-0.5">{sess.serviceSlot}</span>
                          </div>

                          <div className="text-right">
                            <span className="text-base font-black text-slate-900 dark:text-white">
                              {sess.totalHeadcount || 0}
                            </span>
                            <span className="text-[10px] text-slate-400 block">Total Headcount</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2 text-[10px] p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-500">
                          <div>
                            <span>Main Hall:</span> <strong className="text-slate-800 dark:text-slate-200">{sess.countMain || 0}</strong>
                          </div>
                          <div>
                            <span>Balcony:</span> <strong className="text-slate-800 dark:text-slate-200">{sess.countBalcony || 0}</strong>
                          </div>
                          <div>
                            <span>Children:</span> <strong className="text-slate-800 dark:text-slate-200">{sess.countChildren || 0}</strong>
                          </div>
                          <div>
                            <span>Visitors:</span> <strong className="text-slate-800 dark:text-slate-200">{sess.firstTimeVisitors || 0}</strong>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
                          <button
                            onClick={() => handleViewResponses(sess)}
                            className="text-amber-500 hover:underline font-bold text-[11px] flex items-center gap-1"
                          >
                            <span>View Member Check-ins</span>
                            <Clock size={11} />
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleStatus(sess)}
                              className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                                sess.status === 'Active'
                                  ? 'border-amber-400 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                  : 'border-emerald-500 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                              }`}
                            >
                              {sess.status === 'Active' ? 'End Session' : 'Reactivate'}
                            </button>

                            <button
                              onClick={() => handleDeleteSession(sess.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-red-500"
                              title="Delete Session"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal: View Member Check-Ins for Session */}
          {viewingSession && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Member Check-Ins: {viewingSession.serviceDate}
                    </h3>
                    <span className="text-[11px] text-slate-500">{viewingSession.serviceSlot}</span>
                  </div>
                  <button onClick={() => setViewingSession(null)} className="text-slate-400 hover:text-white">
                    <X size={18} />
                  </button>
                </div>

                {loadingResponses ? (
                  <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                    <RefreshCw size={20} className="animate-spin text-amber-500 mx-auto" />
                    <p>Loading check-ins...</p>
                  </div>
                ) : sessionResponses.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No member digital check-ins recorded for this session yet.
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto space-y-2">
                    {sessionResponses.map((res) => (
                      <div
                        key={res.id}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block">{res.memberName}</span>
                          <span className="font-mono text-[10px] text-slate-400">{res.memberPhone || res.memberId}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          {res.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    onClick={() => setViewingSession(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminNavigationShell>
    </ProtectedRoute>
  );
}
