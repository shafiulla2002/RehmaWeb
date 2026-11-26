'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  UserX,
  UserPlus,
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
  Phone,
  MessageCircle,
  QrCode,
  Download,
  Share2,
  RefreshCw,
  Trash2,
  Search,
  Filter,
  Printer,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  MapPin,
  Eye,
  FileSpreadsheet,
  Check,
  Shield,
  Award,
  Building2,
  PieChart,
} from 'lucide-react';
import QRCode from 'qrcode';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES (MOBILE PARITY)
// ─────────────────────────────────────────────────────────────────────────────

export interface EventItemWithStats {
  id: string;
  title: string;
  date: string;
  dateObj: Date;
  dateStr: string;
  timeStr: string;
  location?: string;
  description?: string;
  presentCount: number;
  familyCount: number;
  guestCount: number;
  totalExpected: number;
  absentCount: number;
  turnoutPercent: number;
  status: 'Today' | 'Upcoming' | 'Past';
  requireEventQR?: boolean;
}

export interface AttendanceRecord {
  id: string;
  memberId: string;
  memberName: string;
  memberPhone?: string;
  photoUrl?: string;
  status: 'Present' | 'Absent';
  timestamp?: any;
  method?: 'QR_SCAN' | 'ADMIN_MANUAL' | 'SELF_CHECKIN' | 'GUEST_CHECKIN' | 'FAMILY_CHECKIN' | string;
  churchId?: string;
  eventId?: string;
  eventName?: string;
  scannedAt?: string;
  isGuest?: boolean;
  guestName?: string;
}

export interface CanonicalMember {
  id: string;
  name: string;
  fullName: string;
  displayName: string;
  phone: string;
  city?: string;
  village?: string;
  zone?: string;
  photoURL?: string;
  profilePhoto?: string;
  role?: string;
  userType?: string;
  status?: string;
  isGuest?: boolean;
}

export type TimelineFilter = 'All' | 'This Week' | 'Upcoming' | 'Past';
export type MemberReportFilter = 'Absent' | 'Present' | 'Guests' | 'All';

// Legacy room-by-room headcount session preserved for backward compatibility
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

// ─────────────────────────────────────────────────────────────────────────────
// TIME FORMATTER (MATCHING MOBILE UTILITY)
// ─────────────────────────────────────────────────────────────────────────────

const formatAdminDisplayTime = (
  timeRaw?: string,
  startTime?: any,
  endTime?: any,
  fallbackDateObj?: Date
): string => {
  const parseSingle = (val: any): string => {
    if (!val) return '';
    if (val?.toDate && typeof val.toDate === 'function') {
      try {
        const d = val.toDate();
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        }
      } catch {}
    }
    if (val instanceof Date && !isNaN(val.getTime())) {
      const res = val.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      if (!res.includes('Invalid')) return res;
    }
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (!trimmed) return '';
      if (/^\d{1,2}:\d{2}\s*(AM|PM|am|pm)$/i.test(trimmed)) return trimmed.toUpperCase();
      if (/(?:AM|PM)/i.test(trimmed) && trimmed.length <= 10) return trimmed.toUpperCase();

      const cleanTime = trimmed.includes('T') ? trimmed.split('T')[1] : trimmed;
      const timeMatch = cleanTime.match(/^(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        const h = parseInt(timeMatch[1], 10);
        const m = timeMatch[2];
        if (!isNaN(h) && h >= 0 && h < 24) {
          const ampm = h >= 12 ? 'PM' : 'AM';
          const h12 = h % 12 || 12;
          return `${h12}:${m} ${ampm}`;
        }
      }
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        const res = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        if (!res.includes('Invalid')) return res;
      }
      return trimmed;
    }
    return '';
  };

  const s = parseSingle(startTime);
  const e = parseSingle(endTime);
  if (s && e && !s.includes('Invalid') && !e.includes('Invalid')) return `${s} - ${e}`;
  if (s && !s.includes('Invalid')) return s;
  if (e && !e.includes('Invalid')) return e;

  if (timeRaw && typeof timeRaw === 'string') {
    const rawTrimmed = timeRaw.trim();
    if (rawTrimmed && !rawTrimmed.includes('Invalid')) {
      const parsedRaw = parseSingle(rawTrimmed);
      if (parsedRaw && !parsedRaw.includes('Invalid')) return parsedRaw;
      return rawTrimmed;
    }
  }

  if (fallbackDateObj && !isNaN(fallbackDateObj.getTime())) {
    const fallbackStr = fallbackDateObj.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
    if (!fallbackStr.includes('Invalid') && fallbackStr !== '12:00 AM') return fallbackStr;
  }

  return 'Service Time';
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: MEMBER AVATAR WITH PHOTO & INITIALS FALLBACK
// ─────────────────────────────────────────────────────────────────────────────

function MemberAvatar({
  member,
  size = 36,
  className = '',
}: {
  member: { fullName?: string; name?: string; displayName?: string; photoURL?: string; profilePhoto?: string };
  size?: number;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const photo = member.photoURL || member.profilePhoto || '';
  const name = (member.fullName || member.name || member.displayName || '').trim();
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join('') || (name ? name[0].toUpperCase() : 'M');

  if (photo && !imgError) {
    return (
      <img
        src={photo}
        alt={name || 'Member'}
        onError={() => setImgError(true)}
        style={{ width: size, height: size }}
        className={`rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-800 shadow-xs ${className}`}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, Math.round(size * 0.36)),
      }}
      className={`rounded-full bg-slate-900 dark:bg-black text-white font-extrabold flex items-center justify-center shrink-0 tracking-tight border border-slate-700/30 ${className}`}
    >
      {initials}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function AttendanceAdminPage() {
  const { user } = useAuth();
  const churchId = 'rhema';
  const churchName = 'Rhema Global Ministries';
  const churchCode = 'RHEMA-CENTRAL';

  // Navigation: Main Tab (Events vs Headcount)
  const [mainTab, setMainTab] = useState<'events' | 'headcounts'>('events');

  // Datasets State
  const [eventsList, setEventsList] = useState<EventItemWithStats[]>([]);
  const [churchMembers, setChurchMembers] = useState<CanonicalMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected Event View State
  const [selectedEvent, setSelectedEvent] = useState<EventItemWithStats | null>(null);
  const [attendees, setAttendees] = useState<AttendanceRecord[]>([]);
  const [eventDetailLoading, setEventDetailLoading] = useState(false);
  const [reportFilter, setReportFilter] = useState<MemberReportFilter>('Absent');
  const [searchMemberQuery, setSearchMemberQuery] = useState('');
  const [markingMemberId, setMarkingMemberId] = useState<string | null>(null);

  // Event List Filters
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>('All');
  const [searchEventQuery, setSearchEventQuery] = useState('');
  const [visibleEventsCount, setVisibleEventsCount] = useState<number>(6);

  // QR Modal State
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrModalType, setQrModalType] = useState<'church' | 'event'>('church');
  const [qrModalEvent, setQrModalEvent] = useState<EventItemWithStats | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Delete Event State
  const [eventToDelete, setEventToDelete] = useState<EventItemWithStats | null>(null);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);

  // Legacy Headcounts State
  const [sessions, setSessions] = useState<LiveAttendanceSession[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SundayServiceSlot>('08:30 AM (1st Service)');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [countMain, setCountMain] = useState(300);
  const [countBalcony, setCountBalcony] = useState(80);
  const [countOverflow, setCountOverflow] = useState(30);
  const [countChildren, setCountChildren] = useState(50);
  const [firstTimeVisitors, setFirstTimeVisitors] = useState(15);
  const [usherNotes, setUsherNotes] = useState('');
  const [isSubmittingHeadcount, setIsSubmittingHeadcount] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // REAL-TIME DATA SUBSCRIPTION
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    setLoading(true);

    const eventsCol = collection(db, 'Rhema Church', churchId, 'events');
    const membersCol = collection(db, 'Rhema Church', churchId, 'members');
    const recordsCol = collection(db, 'Rhema Church', churchId, 'attendanceRecords');
    const reqsCol = collection(db, 'Rhema Church', churchId, 'attendanceRequests');

    // 1. Members Subscription with canonical deduplication
    const unsubMembers = onSnapshot(
      membersCol,
      (snapshot) => {
        const memMap = new Map<string, CanonicalMember>();
        snapshot.forEach((d) => {
          const data = d.data();
          if (data.status === 'Left') return;

          const rawName = (
            data.fullName ||
            data.name ||
            data.displayName ||
            `${data.firstName || ''} ${data.lastName || ''}`.trim() ||
            (data.phone ? `Member (${data.phone})` : 'Unknown')
          ).trim();

          const key = rawName.toLowerCase() || d.id;
          const photo =
            data.photoURL ||
            data.profilePhoto ||
            data.photoUrl ||
            data.profileImageUrl ||
            data.PhotoUrl ||
            data.profilePicture ||
            '';

          const member: CanonicalMember = {
            id: d.id,
            name: rawName,
            fullName: rawName,
            displayName: rawName,
            phone: data.phone || data.normalizedPhone10 || '',
            city: data.city || data.village || data.mailingCity || '',
            village: data.village || data.city || '',
            zone: data.zone || 'Central Zone',
            photoURL: photo,
            profilePhoto: photo,
            role: data.role || data.userType || 'Member',
            userType: data.userType || data.role || 'Member',
            status: data.status || data.accountStatus || 'Active',
            isGuest: Boolean(data.isGuest || data.userType === 'guest' || data.role === 'guest'),
          };

          if (!memMap.has(key)) {
            memMap.set(key, member);
          } else {
            const existing = memMap.get(key)!;
            if (!existing.photoURL && photo) {
              memMap.set(key, { ...existing, ...member, photoURL: photo, profilePhoto: photo });
            }
          }
        });

        setChurchMembers(Array.from(memMap.values()));
      },
      (err) => console.error('[AdminAttendance] Members listener error:', err)
    );

    // 2. Events and Attendance Records Subscription
    const unsubRecords = onSnapshot(
      recordsCol,
      (recSnap) => {
        const statsByEvent = new Map<string, { presentCount: number; guestCount: number; familyCount: number }>();
        recSnap.forEach((doc) => {
          const d = doc.data();
          const evId = d.eventId || (doc.id.includes('_') ? doc.id.split('_')[0] : '');
          if (!evId) return;

          let entry = statsByEvent.get(evId);
          if (!entry) {
            entry = { presentCount: 0, guestCount: 0, familyCount: 0 };
            statsByEvent.set(evId, entry);
          }
          entry.presentCount++;
          const isGuest = Boolean(d.isGuest || doc.id.startsWith('guest_') || (d.memberName && /\(guest\)\s*$/i.test(d.memberName)));
          const isFamily = !isGuest && (d.method === 'FAMILY_CHECKIN' || doc.id.startsWith('fam_') || (d.memberName && d.memberName.includes('Family')));
          if (isGuest) entry.guestCount++;
          if (isFamily) entry.familyCount++;
        });

        // Query events
        getDocs(eventsCol)
          .then((evSnap) => {
            const rawEvents: any[] = [];
            evSnap.forEach((d) => rawEvents.push({ id: d.id, ...d.data() }));

            const totalExpected = 633; // Canonical congregation members count
            const todayStr = new Date().toISOString().split('T')[0];
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);

            const enriched: EventItemWithStats[] = rawEvents.map((ev) => {
              let dateObj = new Date();
              let dateStr = 'Upcoming';

              if (ev.date) {
                const parsed = new Date(ev.date);
                if (!isNaN(parsed.getTime())) dateObj = parsed;
              } else if (ev.startTime) {
                const parsed = new Date(ev.startTime);
                if (!isNaN(parsed.getTime())) dateObj = parsed;
              } else if (ev.createdAt?.toDate) {
                dateObj = ev.createdAt.toDate();
              }

              try {
                dateStr = dateObj.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
              } catch {}

              const timeStr = formatAdminDisplayTime(ev.time, ev.startTime, ev.endTime, dateObj);
              const evDateOnly = dateObj.toISOString().split('T')[0];

              let status: 'Today' | 'Upcoming' | 'Past' = 'Past';
              if (String(ev.status || '').toLowerCase() === 'completed') {
                status = 'Past';
              } else if (evDateOnly === todayStr) {
                status = 'Today';
              } else if (dateObj >= startOfToday) {
                status = 'Upcoming';
              }

              let presentCount = 0;
              let guestCount = 0;
              let familyCount = 0;

              if (status !== 'Upcoming') {
                if (statsByEvent.has(ev.id)) {
                  const s = statsByEvent.get(ev.id)!;
                  presentCount = s.presentCount;
                  guestCount = s.guestCount;
                  familyCount = s.familyCount;
                } else if (typeof ev.presentCount === 'number') {
                  presentCount = ev.presentCount;
                  guestCount = ev.guestCount || 0;
                  familyCount = ev.familyCount || 0;
                }
              }

              const absentCount = Math.max(0, totalExpected - Math.max(0, presentCount - guestCount));
              const turnoutPercent = totalExpected > 0 ? Math.min(100, Math.round((presentCount / totalExpected) * 100)) : 0;

              return {
                id: ev.id,
                title: ev.title || ev.name || 'Church Service',
                date: ev.date || evDateOnly,
                dateObj,
                dateStr,
                timeStr,
                location: ev.location || churchName,
                description: ev.description || '',
                presentCount,
                familyCount,
                guestCount,
                totalExpected,
                absentCount,
                turnoutPercent,
                status,
                requireEventQR: Boolean(ev.requireEventQR || ev.requireEventQr),
              };
            });

            // Sort: Today first, then Upcoming (ascending), then Past (descending)
            enriched.sort((a, b) => {
              if (a.status === 'Today' && b.status !== 'Today') return -1;
              if (b.status === 'Today' && a.status !== 'Today') return 1;
              if (a.status === 'Upcoming' && b.status === 'Past') return -1;
              if (b.status === 'Upcoming' && a.status === 'Past') return 1;
              if (a.status === 'Upcoming' && b.status === 'Upcoming') {
                return a.dateObj.getTime() - b.dateObj.getTime();
              }
              return b.dateObj.getTime() - a.dateObj.getTime();
            });

            setEventsList(enriched);
            setLoading(false);
          })
          .catch((err) => {
            console.error('[AdminAttendance] Events fetch error:', err);
            setLoading(false);
          });
      },
      (err) => console.error('[AdminAttendance] Records listener error:', err)
    );

    // 3. Headcount Requests Subscription (Preserving existing headcount feature)
    const unsubReqs = onSnapshot(
      reqsCol,
      (snap) => {
        const list: LiveAttendanceSession[] = [];
        snap.forEach((d) => {
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
        list.sort((a, b) => (b.serviceDate || '').localeCompare(a.serviceDate || ''));
        setSessions(list);
      },
      (err) => console.error('[AdminAttendance] Headcounts listener error:', err)
    );

    return () => {
      unsubMembers();
      unsubRecords();
      unsubReqs();
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // EVENT ATTENDEES DRILLDOWN
  // ─────────────────────────────────────────────────────────────────────────

  const handleSelectEvent = async (event: EventItemWithStats) => {
    setSelectedEvent(event);
    setEventDetailLoading(true);
    setReportFilter('Absent');
    setSearchMemberQuery('');

    try {
      const attendeesCol = collection(db, 'Rhema Church', churchId, 'events', event.id, 'attendees');
      const snap = await getDocs(attendeesCol);
      const list: AttendanceRecord[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          memberId: data.memberId || d.id,
          memberName: data.memberName || 'Member',
          memberPhone: data.memberPhone || '',
          photoUrl: data.photoUrl || '',
          status: 'Present',
          timestamp: data.timestamp,
          scannedAt: data.scannedAt || '',
          method: data.method || 'ADMIN_MANUAL',
          isGuest: Boolean(data.isGuest || d.id.startsWith('guest_')),
          guestName: data.guestName || '',
        });
      });
      setAttendees(list);
    } catch (e) {
      console.error('[AdminAttendance] Error fetching event attendees:', e);
      setAttendees([]);
    } finally {
      setEventDetailLoading(false);
    }
  };

  const handleRefreshEventDetails = async () => {
    if (!selectedEvent) return;
    handleSelectEvent(selectedEvent);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // MANUAL ATTENDANCE TOGGLE (ONE-CLICK PRESENT / ABSENT)
  // ─────────────────────────────────────────────────────────────────────────

  const handleToggleAttendance = async (member: CanonicalMember, targetStatus: 'Present' | 'Absent') => {
    if (!selectedEvent) return;
    setMarkingMemberId(member.id);

    try {
      const memberId = member.id;
      const eventId = selectedEvent.id;
      const recordDocId = `${eventId}_${memberId}`;

      if (targetStatus === 'Present') {
        const payload: AttendanceRecord = {
          id: memberId,
          memberId,
          memberName: member.fullName || member.name,
          memberPhone: member.phone || '',
          photoUrl: member.photoURL || '',
          status: 'Present',
          timestamp: new Date().toISOString(),
          scannedAt: new Date().toISOString(),
          method: 'ADMIN_MANUAL',
          churchId,
          eventId,
          eventName: selectedEvent.title,
          isGuest: Boolean(member.isGuest),
        };

        // Write to subcollection, church attendanceRecords, and attendanceRequests/responses
        await Promise.all([
          setDoc(doc(db, 'Rhema Church', churchId, 'events', eventId, 'attendees', memberId), payload, { merge: true }),
          setDoc(doc(db, 'Rhema Church', churchId, 'attendanceRecords', recordDocId), payload, { merge: true }),
          setDoc(doc(db, 'Rhema Church', churchId, 'attendanceRequests', eventId, 'responses', memberId), payload, { merge: true }),
        ]);

        setAttendees((prev) => [payload, ...prev.filter((a) => a.memberId !== memberId)]);
        setSelectedEvent((prev) => {
          if (!prev) return null;
          const newPresent = prev.presentCount + 1;
          const newAbsent = Math.max(0, prev.totalExpected - newPresent);
          const newTurnout = prev.totalExpected > 0 ? Math.min(100, Math.round((newPresent / prev.totalExpected) * 100)) : 0;
          return { ...prev, presentCount: newPresent, absentCount: newAbsent, turnoutPercent: newTurnout };
        });

        showToast(`Marked ${member.fullName || member.name} as Present ✓`);
      } else {
        // Remove attendee
        await Promise.all([
          deleteDoc(doc(db, 'Rhema Church', churchId, 'events', eventId, 'attendees', memberId)),
          deleteDoc(doc(db, 'Rhema Church', churchId, 'attendanceRecords', recordDocId)),
          deleteDoc(doc(db, 'Rhema Church', churchId, 'attendanceRequests', eventId, 'responses', memberId)),
        ]);

        setAttendees((prev) => prev.filter((a) => a.memberId !== memberId));
        setSelectedEvent((prev) => {
          if (!prev) return null;
          const newPresent = Math.max(0, prev.presentCount - 1);
          const newAbsent = Math.max(0, prev.totalExpected - newPresent);
          const newTurnout = prev.totalExpected > 0 ? Math.min(100, Math.round((newPresent / prev.totalExpected) * 100)) : 0;
          return { ...prev, presentCount: newPresent, absentCount: newAbsent, turnoutPercent: newTurnout };
        });

        showToast(`Removed ${member.fullName || member.name} from attendees.`);
      }
    } catch (err: any) {
      console.error('Error toggling attendance:', err);
      showToast(`Error: ${err.message || 'Could not update attendance'}`);
    } finally {
      setMarkingMemberId(null);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // WHATSAPP & PHONE OUTREACH
  // ─────────────────────────────────────────────────────────────────────────

  const handleWhatsAppOutreach = (phone?: string, name?: string) => {
    if (!phone) {
      alert(`${name || 'This member'} has no phone number recorded.`);
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    const serviceName = selectedEvent?.title || 'Sunday Worship Service';
    const message = `Praise the Lord ${name || 'Brother/Sister'}! 🙏 We missed you today at ${serviceName} at Rhema Church. We are praying for you and your family. Hope to see you soon!`;
    const url = `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone.slice(-10)}`}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handlePhoneCall = (phone?: string) => {
    if (!phone) {
      alert('No phone number recorded.');
      return;
    }
    window.open(`tel:${phone}`, '_self');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // QR CODE GENERATION & EXPORT
  // ─────────────────────────────────────────────────────────────────────────

  const openQRModal = (type: 'church' | 'event', event?: EventItemWithStats) => {
    setQrModalType(type);
    setQrModalEvent(event || null);
    setQrModalOpen(true);

    const payload = JSON.stringify({
      action: 'Rhema_Attendance',
      churchId,
      churchName,
      churchCode,
      eventId: type === 'event' && event ? event.id : 'general_service',
      eventName: type === 'event' && event ? event.title : 'General Service',
      timestamp: Date.now(),
      type: 'attendance_checkin',
      version: '2.0',
    });

    QRCode.toDataURL(payload, { width: 340, margin: 2 })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code:', err));
  };

  const downloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${qrModalType === 'event' ? qrModalEvent?.title || 'Event' : 'Rhema_Church'}_Attendance_QR.png`;
    link.click();
  };

  const printQR = () => {
    window.print();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE EVENT
  // ─────────────────────────────────────────────────────────────────────────

  const handleDeleteEvent = async (event: EventItemWithStats) => {
    if (!confirm(`Are you sure you want to permanently delete "${event.title}"?`)) return;
    setIsDeletingEvent(true);
    try {
      await deleteDoc(doc(db, 'Rhema Church', churchId, 'events', event.id));
      setEventsList((prev) => prev.filter((e) => e.id !== event.id));
      if (selectedEvent?.id === event.id) setSelectedEvent(null);
      showToast('Event removed successfully.');
    } catch (e: any) {
      showToast(`Error: ${e.message || 'Could not delete event'}`);
    } finally {
      setIsDeletingEvent(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // CSV EXPORT (ATTENDEE REGISTER)
  // ─────────────────────────────────────────────────────────────────────────

  const handleExportAttendeeCSV = () => {
    if (!selectedEvent) return;
    const headers = ['Member Name', 'Phone Number', 'Status', 'Check-in Method', 'Scanned Time', 'Event Title', 'Event Date'];
    const attendeePhoneMap = new Map(attendees.map((a) => [a.memberPhone?.slice(-10), a]));
    const attendeeIdMap = new Map(attendees.map((a) => [a.memberId, a]));

    const rows = churchMembers.map((m) => {
      const match = attendeeIdMap.get(m.id) || (m.phone ? attendeePhoneMap.get(m.phone.slice(-10)) : null);
      const isPresent = Boolean(match);
      return [
        `"${m.fullName || m.name}"`,
        `"${m.phone || ''}"`,
        `"${isPresent ? 'Present' : 'Absent'}"`,
        `"${match?.method || 'N/A'}"`,
        `"${match?.scannedAt || match?.timestamp ? new Date(match?.scannedAt || match?.timestamp).toLocaleTimeString() : 'N/A'}"`,
        `"${selectedEvent.title}"`,
        `"${selectedEvent.dateStr}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.href = encodedUri;
    link.download = `${selectedEvent.title.replace(/\s+/g, '_')}_Attendance_${selectedEvent.date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Event attendance exported to CSV.');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // COMPUTED ATTENDEE LISTS FOR SELECTED EVENT
  // ─────────────────────────────────────────────────────────────────────────

  const { presentMembers, absentMembers, guestAttendees, displayAttendees } = useMemo(() => {
    if (!selectedEvent) {
      return { presentMembers: [], absentMembers: [], guestAttendees: [], displayAttendees: [] };
    }

    const attendeeIdSet = new Set(attendees.map((a) => a.memberId));
    const attendeePhoneSet = new Set(attendees.map((a) => a.memberPhone?.slice(-10)).filter(Boolean));

    const present: { member: CanonicalMember; record: AttendanceRecord }[] = [];
    const absent: CanonicalMember[] = [];

    churchMembers.forEach((m) => {
      const p10 = m.phone?.slice(-10);
      const match = attendees.find((a) => a.memberId === m.id || (p10 && a.memberPhone?.slice(-10) === p10));
      if (match) {
        present.push({ member: m, record: match });
      } else {
        absent.push(m);
      }
    });

    const guests = attendees.filter((a) => a.isGuest || !churchMembers.some((m) => m.id === a.memberId));

    let displayList: any[] = [];
    if (reportFilter === 'Absent') {
      displayList = absent.map((m) => ({ type: 'absent', member: m, record: null }));
    } else if (reportFilter === 'Present') {
      displayList = present.map((p) => ({ type: 'present', member: p.member, record: p.record }));
    } else if (reportFilter === 'Guests') {
      displayList = guests.map((g) => ({
        type: 'guest',
        member: { id: g.memberId, name: g.memberName, fullName: g.memberName, phone: g.memberPhone || '', isGuest: true },
        record: g,
      }));
    } else {
      // All
      displayList = [
        ...present.map((p) => ({ type: 'present', member: p.member, record: p.record })),
        ...absent.map((m) => ({ type: 'absent', member: m, record: null })),
        ...guests.map((g) => ({
          type: 'guest',
          member: { id: g.memberId, name: g.memberName, fullName: g.memberName, phone: g.memberPhone || '', isGuest: true },
          record: g,
        })),
      ];
    }

    if (searchMemberQuery.trim()) {
      const q = searchMemberQuery.toLowerCase();
      displayList = displayList.filter(
        (item) =>
          item.member.name?.toLowerCase().includes(q) ||
          item.member.fullName?.toLowerCase().includes(q) ||
          item.member.phone?.includes(q) ||
          item.member.village?.toLowerCase().includes(q)
      );
    }

    return {
      presentMembers: present,
      absentMembers: absent,
      guestAttendees: guests,
      displayAttendees: displayList,
    };
  }, [selectedEvent, attendees, churchMembers, reportFilter, searchMemberQuery]);

  // ─────────────────────────────────────────────────────────────────────────
  // COMPUTED EVENTS FOR TIMELINE
  // ─────────────────────────────────────────────────────────────────────────

  const filteredEvents = useMemo(() => {
    let list = [...eventsList];

    if (timelineFilter === 'This Week') {
      const now = new Date();
      const sunday = new Date(now);
      sunday.setDate(now.getDate() - now.getDay());
      sunday.setHours(0, 0, 0, 0);
      const saturday = new Date(sunday);
      saturday.setDate(sunday.getDate() + 6);
      saturday.setHours(23, 59, 59, 999);
      list = list.filter((e) => e.dateObj >= sunday && e.dateObj <= saturday);
    } else if (timelineFilter === 'Upcoming') {
      list = list.filter((e) => e.status === 'Upcoming' || e.status === 'Today');
    } else if (timelineFilter === 'Past') {
      list = list.filter((e) => e.status === 'Past');
    }

    if (searchEventQuery.trim()) {
      const q = searchEventQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.dateStr.toLowerCase().includes(q) ||
          (e.location && e.location.toLowerCase().includes(q))
      );
    }

    return list;
  }, [eventsList, timelineFilter, searchEventQuery]);

  const visibleEvents = useMemo(() => {
    return filteredEvents.slice(0, visibleEventsCount);
  }, [filteredEvents, visibleEventsCount]);

  // Overall Timeline Stats
  const timelineStats = useMemo(() => {
    const total = eventsList.length;
    const todayCount = eventsList.filter((e) => e.status === 'Today').length;
    const completedPast = eventsList.filter((e) => e.status === 'Past');
    const avgTurnout =
      completedPast.length > 0
        ? Math.round(completedPast.reduce((acc, e) => acc + e.turnoutPercent, 0) / completedPast.length)
        : 0;
    return { total, todayCount, avgTurnout };
  }, [eventsList]);

  // Timeline Counts by Filter Tab (Matching Mobile Roster Pills)
  const timelineCounts = useMemo(() => {
    const all = eventsList.length;
    const now = new Date();
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - now.getDay());
    sunday.setHours(0, 0, 0, 0);
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    saturday.setHours(23, 59, 59, 999);
    const thisWeek = eventsList.filter((e) => e.dateObj >= sunday && e.dateObj <= saturday).length;
    const upcoming = eventsList.filter((e) => e.status === 'Upcoming' || e.status === 'Today').length;
    const past = eventsList.filter((e) => e.status === 'Past').length;
    return { all, thisWeek, upcoming, past };
  }, [eventsList]);

  // ─────────────────────────────────────────────────────────────────────────
  // LEGACY HEADCOUNT SAVE HANDLER (PRESERVED)
  // ─────────────────────────────────────────────────────────────────────────

  const handleSaveHeadcount = async (e: React.FormEvent, makeActive = false) => {
    e.preventDefault();
    setIsSubmittingHeadcount(true);
    try {
      const sessionId = `ATT-${selectedDate}-${selectedSlot.substring(0, 5).replace(':', '')}`;
      const nowIso = new Date().toISOString();
      const docRef = doc(db, 'Rhema Church', churchId, 'attendanceRequests', sessionId);

      const total = countMain + countBalcony + countOverflow + countChildren;
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
        totalHeadcount: total,
        usherNotes: usherNotes.trim(),
        updatedAt: nowIso,
      };

      await setDoc(docRef, { ...payload, createdAt: nowIso }, { merge: true });
      showToast(makeActive ? 'Headcount session activated!' : 'Session headcount saved.');
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Failed to save'}`);
    } finally {
      setIsSubmittingHeadcount(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ATTENDANCE DISTRIBUTION DONUT CHART (EXACT MOBILE PARITY)
  // ─────────────────────────────────────────────────────────────────────────

  const renderDonutChart = () => {
    const size = 180;
    const strokeWidth = 16;
    const center = size / 2;
    const radius = center - strokeWidth;
    const circumference = 2 * Math.PI * radius;

    const total = Math.max(1, (selectedEvent?.totalExpected || 633) + guestAttendees.length);
    const presentReg = Math.max(0, presentMembers.length - (selectedEvent?.familyCount || 0));
    const family = selectedEvent?.familyCount || 0;
    const guests = guestAttendees.length;
    const absent = absentMembers.length;

    const presentRegPct = presentReg / total;
    const familyPct = family / total;
    const guestsPct = guests / total;
    const absentPct = absent / total;

    const presentRegStroke = presentRegPct * circumference;
    const familyStroke = familyPct * circumference;
    const guestsStroke = guestsPct * circumference;
    const absentStroke = absentPct * circumference;

    let offset = 0;
    const seg1Offset = offset;
    offset += presentRegStroke;
    const seg2Offset = offset;
    offset += familyStroke;
    const seg3Offset = offset;
    offset += guestsStroke;
    const seg4Offset = offset;

    return (
      <div className="flex flex-col md:flex-row items-center justify-around gap-6 py-2">
        <div className="relative w-[180px] h-[180px] shrink-0">
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background Base Ring */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              fill="none"
              className="text-slate-100 dark:text-slate-800"
            />

            {/* Segment 1: Present Members (Green) */}
            {presentRegStroke > 0 && (
              <circle
                cx={center}
                cy={center}
                r={radius}
                stroke="#10B981"
                strokeWidth={strokeWidth}
                strokeDasharray={`${presentRegStroke} ${circumference}`}
                strokeDashoffset={-seg1Offset}
                strokeLinecap="round"
                fill="none"
              />
            )}

            {/* Segment 2: Family Members (Blue) */}
            {familyStroke > 0 && (
              <circle
                cx={center}
                cy={center}
                r={radius}
                stroke="#2563EB"
                strokeWidth={strokeWidth}
                strokeDasharray={`${familyStroke} ${circumference}`}
                strokeDashoffset={-seg2Offset}
                strokeLinecap="round"
                fill="none"
              />
            )}

            {/* Segment 3: Guests & Visitors (Purple) */}
            {guestsStroke > 0 && (
              <circle
                cx={center}
                cy={center}
                r={radius}
                stroke="#7C3AED"
                strokeWidth={strokeWidth}
                strokeDasharray={`${guestsStroke} ${circumference}`}
                strokeDashoffset={-seg3Offset}
                strokeLinecap="round"
                fill="none"
              />
            )}

            {/* Segment 4: Absent Members (Red) */}
            {absentStroke > 0 && (
              <circle
                cx={center}
                cy={center}
                r={radius}
                stroke="#EF4444"
                strokeWidth={strokeWidth}
                strokeDasharray={`${absentStroke} ${circumference}`}
                strokeDashoffset={-seg4Offset}
                strokeLinecap="round"
                fill="none"
              />
            )}
          </svg>

          {/* Center Callout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {selectedEvent?.turnoutPercent || 0}%
            </span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Turnout
            </span>
          </div>
        </div>

        {/* Legend Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/40">
            <div className="flex items-center gap-2.5">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Present Members</span>
            </div>
            <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">{presentReg}</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800/40">
            <div className="flex items-center gap-2.5">
              <span className="w-3.5 h-3.5 rounded-full bg-blue-600 shrink-0" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Household Family</span>
            </div>
            <span className="text-sm font-black text-blue-700 dark:text-blue-400">{family}</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-800/40">
            <div className="flex items-center gap-2.5">
              <span className="w-3.5 h-3.5 rounded-full bg-purple-600 shrink-0" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Guests &amp; Visitors</span>
            </div>
            <span className="text-sm font-black text-purple-700 dark:text-purple-400">{guests}</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-800/40">
            <div className="flex items-center gap-2.5">
              <span className="w-3.5 h-3.5 rounded-full bg-rose-500 shrink-0" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Absent Members</span>
            </div>
            <span className="text-sm font-black text-rose-700 dark:text-rose-400">{absent}</span>
          </div>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
      <AdminNavigationShell>
        <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-20">
          {/* Toast Notification */}
          {toastMessage && (
            <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-[#1A2D5A] dark:bg-blue-600 text-white text-xs font-bold rounded-2xl shadow-2xl flex items-center gap-2 animate-fade-in border border-white/20">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Page Top Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <span>Admin Console</span>
                <span>/</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">M34 - Attendance Management</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
                <CalendarCheck className="text-amber-500" size={28} />
                <span>Attendance Management Studio</span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Curate service attendance timelines, generate entrance QR check-in posters, and manage live member roll calls.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => openQRModal('church')}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-black text-white hover:bg-slate-800 border border-slate-700/60 flex flex-col items-center justify-center transition-all cursor-pointer shadow-xs min-w-[72px]"
                title="Permanent Church QR Code"
              >
                <QrCode size={18} />
                <span className="text-[10px] font-bold mt-0.5">Church QR</span>
              </button>
            </div>
          </div>

          {/* Module Primary Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => {
                setMainTab('events');
                setSelectedEvent(null);
              }}
              className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                mainTab === 'events'
                  ? 'border-[#1A2D5A] dark:border-amber-500 text-[#1A2D5A] dark:text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Calendar size={15} />
              <span>Service Events Timeline ({eventsList.length})</span>
            </button>
            <button
              onClick={() => setMainTab('headcounts')}
              className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                mainTab === 'headcounts'
                  ? 'border-[#1A2D5A] dark:border-amber-500 text-[#1A2D5A] dark:text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Users size={15} />
              <span>Sanctuary Headcount &amp; Slots ({sessions.length})</span>
            </button>
          </div>

          {/* ─────────────────────────────────────────────────────────── */}
          {/* TAB 1: SERVICE EVENTS TIMELINE & DRILLDOWN                  */}
          {/* ─────────────────────────────────────────────────────────── */}
          {mainTab === 'events' && (
            <>
              {!selectedEvent ? (
                // ─── EVENTS TIMELINE VIEW ───────────────────────────────
                <div className="space-y-6">
                  {/* Top Summary Cards (Exact Mobile Parity) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Services */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-[#1A2D5A] dark:bg-blue-500" />
                      <div className="text-3xl font-black text-[#1A2D5A] dark:text-blue-400">
                        {timelineStats.total}
                      </div>
                      <div className="text-xs font-extrabold uppercase text-slate-600 dark:text-slate-300 tracking-wider mt-1">
                        Total Services
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Recorded church gatherings</p>
                    </div>

                    {/* Active Today */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600 dark:bg-emerald-400" />
                      <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                        {timelineStats.todayCount}
                      </div>
                      <div className="text-xs font-extrabold uppercase text-slate-600 dark:text-slate-300 tracking-wider mt-1">
                        Services Today
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Live Sunday / weekday services</p>
                    </div>

                    {/* Total Expected Members */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
                      <div className="text-3xl font-black text-amber-600 dark:text-amber-400">
                        {churchMembers.length || 633}
                      </div>
                      <div className="text-xs font-extrabold uppercase text-slate-600 dark:text-slate-300 tracking-wider mt-1">
                        Active Members
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Canonical congregation roster</p>
                    </div>

                    {/* Average Turnout Rate */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-purple-600 dark:bg-purple-400" />
                      <div className="text-3xl font-black text-purple-600 dark:text-purple-400">
                        {timelineStats.avgTurnout}%
                      </div>
                      <div className="text-xs font-extrabold uppercase text-slate-600 dark:text-slate-300 tracking-wider mt-1">
                        Average Turnout
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Overall past service participation</p>
                    </div>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Timeline Filter Pills (Matching Mobile: All Events (11), This Week (0), Upcoming (0), Past (11)) */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                      {[
                        { id: 'All', label: `All Events (${timelineCounts.all})` },
                        { id: 'This Week', label: `This Week (${timelineCounts.thisWeek})` },
                        { id: 'Upcoming', label: `Upcoming (${timelineCounts.upcoming})` },
                        { id: 'Past', label: `Past (${timelineCounts.past})` },
                      ].map((tab) => {
                        const isActive = timelineFilter === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setTimelineFilter(tab.id as TimelineFilter)}
                            className={`px-4 py-2 rounded-full text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                              isActive
                                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Search Service Input */}
                    <div className="relative w-full md:w-80">
                      <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                      <input
                        type="text"
                        placeholder="Search events by title or date..."
                        value={searchEventQuery}
                        onChange={(e) => setSearchEventQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-amber-500 font-medium"
                      />
                    </div>
                  </div>

                  {/* Section Heading Row: SELECT AN EVENT TO VIEW REPORT */}
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                      SELECT AN EVENT TO VIEW REPORT
                    </span>
                    <span className="text-slate-400 font-semibold text-[11px]">
                      Showing {Math.min(visibleEvents.length, filteredEvents.length)} of {filteredEvents.length}
                    </span>
                  </div>

                  {/* Events Grid */}
                  {loading ? (
                    <div className="py-20 text-center space-y-3">
                      <RefreshCw size={28} className="animate-spin text-amber-500 mx-auto" />
                      <p className="text-xs text-slate-500">Loading service events &amp; attendance...</p>
                    </div>
                  ) : filteredEvents.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-xs text-slate-400 space-y-2">
                      <CalendarCheck size={36} className="mx-auto text-slate-300 dark:text-slate-700" />
                      <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">No service events found</p>
                      <p>Try clearing filters or search terms.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {visibleEvents.map((ev) => {
                        const statusColors = {
                          Today: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
                          Upcoming: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
                          Past: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
                        }[ev.status];

                        return (
                          <div
                            key={ev.id}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                          >
                            <div className="space-y-3">
                              {/* Top Row: Status badge, QR mode badge, Date, and Delete button */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusColors}`}>
                                    {ev.status}
                                  </span>

                                  {ev.requireEventQR ? (
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 inline-flex items-center gap-1">
                                      <QrCode size={11} className="text-purple-600 dark:text-purple-400" />
                                      <span>Event QR Only</span>
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1">
                                      <Building2 size={11} className="text-emerald-600 dark:text-emerald-400" />
                                      <span>Church QR Allowed</span>
                                    </span>
                                  )}

                                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    {ev.dateStr}
                                  </span>
                                </div>

                                <button
                                  onClick={() => handleDeleteEvent(ev)}
                                  title="Delete Service Event"
                                  className="w-8 h-8 rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>

                              {/* Title & Date/Time */}
                              <div className="min-w-0">
                                <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors truncate" title={ev.title}>
                                  {ev.title}
                                </h3>
                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 min-w-0">
                                  <div className="flex items-center gap-1 shrink-0 font-medium whitespace-nowrap">
                                    <Clock size={13} className="text-slate-400 shrink-0" />
                                    <span className="whitespace-nowrap">{ev.timeStr}</span>
                                  </div>
                                  {ev.location && (
                                    <>
                                      <span className="text-slate-300 dark:text-slate-700 shrink-0">•</span>
                                      <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden" title={ev.location}>
                                        <MapPin size={12} className="text-slate-400 shrink-0" />
                                        <span className="truncate block text-[11px] text-slate-400">{ev.location}</span>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Turnout Inline Metrics Matching Mobile Screenshot */}
                              <div className="flex items-center gap-4 text-xs font-bold py-1">
                                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                  <UserCheck size={14} />
                                  <span>{ev.presentCount} Present</span>
                                </span>
                                <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                                  <TrendingUp size={14} />
                                  <span>{ev.turnoutPercent}% Turnout</span>
                                </span>
                                <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                                  <UserX size={14} />
                                  <span>{ev.absentCount} Absent</span>
                                </span>
                              </div>
                            </div>

                            {/* Bottom Action Row: Event QR & View Report & Charts */}
                            <div className="grid grid-cols-2 gap-2 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
                              <button
                                onClick={() => openQRModal('event', ev)}
                                className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#1A2D5A] dark:text-blue-400 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all border border-slate-200 dark:border-slate-700 cursor-pointer shadow-xs"
                              >
                                <QrCode size={14} />
                                <span>Event QR</span>
                              </button>
                              <button
                                onClick={() => handleSelectEvent(ev)}
                                className="py-2.5 px-3 rounded-xl bg-[#1A2D5A] hover:bg-[#152347] dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-extrabold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs"
                              >
                                <span>View Report &amp; Charts</span>
                                <ChevronRight size={15} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Load More Pagination */}
                  {visibleEvents.length < filteredEvents.length && (
                    <div className="text-center pt-2">
                      <button
                        onClick={() => setVisibleEventsCount((prev) => prev + 6)}
                        className="px-6 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
                      >
                        Load More Events ({filteredEvents.length - visibleEvents.length} remaining)
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                // ─── SELECTED EVENT DRILLDOWN REGISTER VIEW ─────────────
                <div className="space-y-6 animate-fade-in">
                  {/* Back Navigation Button & Action Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <button
                      onClick={() => setSelectedEvent(null)}
                      className="inline-flex items-center gap-2 text-xs font-bold text-[#1A2D5A] dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      <ArrowLeft size={16} />
                      <span>Back to All Services</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openQRModal('event', selectedEvent)}
                        className="px-3.5 py-2 rounded-xl bg-[#1A2D5A] hover:bg-[#152347] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <QrCode size={15} />
                        <span>Event QR</span>
                      </button>
                      <button
                        onClick={handleExportAttendeeCSV}
                        className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <Download size={15} />
                        <span>Export CSV</span>
                      </button>
                      <button
                        onClick={handleRefreshEventDetails}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
                        title="Refresh Attendees"
                      >
                        <RefreshCw size={15} className={eventDetailLoading ? 'animate-spin' : ''} />
                      </button>
                    </div>
                  </div>

                  {/* Event Header & Summary Info */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            {selectedEvent.status}
                          </span>
                          {selectedEvent.requireEventQR ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 inline-flex items-center gap-1">
                              <QrCode size={11} className="text-purple-600 dark:text-purple-400" />
                              <span>Event QR Only</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1">
                              <Building2 size={11} className="text-emerald-600 dark:text-emerald-400" />
                              <span>Church QR Allowed</span>
                            </span>
                          )}
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-500">{selectedEvent.dateStr}</span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-500">{selectedEvent.timeStr}</span>
                        </div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                          {selectedEvent.title}
                        </h2>
                        {selectedEvent.location && (
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate" title={selectedEvent.location}>
                            <MapPin size={12} className="shrink-0" />
                            <span className="truncate">{selectedEvent.location}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* SECTION 1: 5 KEY STATISTIC CARDS (EXACT MOBILE PARITY) */}
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                        EVENT ATTENDANCE BREAKDOWN
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        {/* 1. Expected Members */}
                        <div className="bg-slate-50/80 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl p-4 shadow-xs">
                          <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 mb-2">
                            <Users size={17} />
                          </div>
                          <div className="text-2xl font-black text-slate-900 dark:text-white">
                            {selectedEvent.totalExpected || 633}
                          </div>
                          <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                            Expected
                          </div>
                          <div className="text-[10px] text-slate-400">Registered Roster</div>
                        </div>

                        {/* 2. Total Present */}
                        <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-2xl p-4 shadow-xs">
                          <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-700 dark:text-emerald-400 mb-2">
                            <UserCheck size={17} />
                          </div>
                          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                            {presentMembers.length}
                          </div>
                          <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">
                            Present
                          </div>
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            {selectedEvent.turnoutPercent}% Turnout
                          </div>
                        </div>

                        {/* 3. Absent Members */}
                        <div className="bg-rose-50/70 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800 rounded-2xl p-4 shadow-xs">
                          <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/60 flex items-center justify-center text-rose-700 dark:text-rose-400 mb-2">
                            <UserX size={17} />
                          </div>
                          <div className="text-2xl font-black text-rose-700 dark:text-rose-400">
                            {absentMembers.length}
                          </div>
                          <div className="text-[11px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wide">
                            Absent
                          </div>
                          <div className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                            Needs Follow-up
                          </div>
                        </div>

                        {/* 4. Family Members */}
                        <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-800 rounded-2xl p-4 shadow-xs">
                          <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center text-blue-700 dark:text-blue-400 mb-2">
                            <Users size={17} />
                          </div>
                          <div className="text-2xl font-black text-blue-700 dark:text-blue-400">
                            {selectedEvent.familyCount || 0}
                          </div>
                          <div className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wide">
                            Family
                          </div>
                          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                            Household Attendees
                          </div>
                        </div>

                        {/* 5. Guests & Visitors */}
                        <div className="bg-purple-50/70 dark:bg-purple-950/30 border border-purple-300 dark:border-purple-800 rounded-2xl p-4 shadow-xs">
                          <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/60 flex items-center justify-center text-purple-700 dark:text-purple-400 mb-2">
                            <UserPlus size={17} />
                          </div>
                          <div className="text-2xl font-black text-purple-700 dark:text-purple-400">
                            {guestAttendees.length}
                          </div>
                          <div className="text-[11px] font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wide">
                            Guests
                          </div>
                          <div className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                            Visitors Brought
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: ATTENDANCE DISTRIBUTION CHART (EXACT MOBILE DONUT) */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <PieChart size={18} className="text-[#1A2D5A] dark:text-blue-400" />
                      <h3 className="font-black text-sm text-slate-900 dark:text-white">
                        Attendance Distribution Chart
                      </h3>
                    </div>
                    {renderDonutChart()}
                  </div>

                  {/* SECTION 3: MEMBER ROSTER & PASTORAL OUTREACH */}
                  <div className="flex items-center justify-between px-1 pt-2">
                    <span className="font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                      MEMBER ROSTER &amp; PASTORAL OUTREACH
                    </span>
                  </div>

                  {/* Filter Tabs & Search Bar for Register */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Filter Tabs matching Mobile: Absent, Present, Guests, All */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                      {(
                        [
                          { key: 'Absent', count: absentMembers.length },
                          { key: 'Present', count: presentMembers.length },
                          { key: 'Guests', count: guestAttendees.length },
                          { key: 'All', count: churchMembers.length + guestAttendees.length },
                        ] as const
                      ).map(({ key, count }) => {
                        const isActive = reportFilter === key;
                        return (
                          <button
                            key={key}
                            onClick={() => setReportFilter(key)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                              isActive
                                ? 'bg-[#1A2D5A] text-white dark:bg-white dark:text-slate-900 shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            <span>{key}</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-white/20 text-white dark:bg-black/20 dark:text-slate-900' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Member Search input */}
                    <div className="relative w-full md:w-80">
                      <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                      <input
                        type="text"
                        placeholder="Search member by name, phone, village..."
                        value={searchMemberQuery}
                        onChange={(e) => setSearchMemberQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-amber-500 font-medium"
                      />
                    </div>
                  </div>

                  {/* Attendees List / Table */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
                    {displayAttendees.length === 0 ? (
                      <div className="p-12 text-center text-xs text-slate-400 space-y-1">
                        <p className="font-bold text-slate-600 dark:text-slate-300">No members match this view</p>
                        <p>Try switching filter tabs or clearing search terms.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                            <tr>
                              <th className="py-3 px-4">Member Name</th>
                              <th className="py-3 px-4">Contact &amp; Village</th>
                              <th className="py-3 px-4">Status</th>
                              <th className="py-3 px-4">Check-in Details</th>
                              <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                            {displayAttendees.map((item, idx) => {
                              const m = item.member;
                              const rec = item.record;
                              const isPresent = item.type === 'present' || item.type === 'guest';
                              const isMarking = markingMemberId === m.id;

                              return (
                                <tr key={m.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                  {/* Avatar & Name */}
                                  <td className="py-3.5 px-4">
                                    <div className="flex items-center gap-3">
                                      <MemberAvatar member={m} size={36} />
                                      <div>
                                        <span className="font-bold text-slate-900 dark:text-white block">
                                          {m.fullName || m.name}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-mono">
                                          {m.id ? `ID: ${m.id.substring(0, 8)}` : 'Guest'}
                                        </span>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Contact & Village */}
                                  <td className="py-3.5 px-4">
                                    <div className="space-y-0.5">
                                      <span className="font-medium text-slate-900 dark:text-white block">
                                        {m.phone || 'No phone'}
                                      </span>
                                      <span className="text-[10px] text-slate-400">
                                        {m.village || m.city || 'Central Sanctuary'}
                                      </span>
                                    </div>
                                  </td>

                                  {/* Status Badge */}
                                  <td className="py-3.5 px-4">
                                    {isPresent ? (
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                                        <Check size={12} strokeWidth={2.5} />
                                        <span>Present</span>
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 inline-flex items-center gap-1">
                                        <UserX size={12} />
                                        <span>Absent</span>
                                      </span>
                                    )}
                                  </td>

                                  {/* Check-in Details */}
                                  <td className="py-3.5 px-4">
                                    {isPresent && rec ? (
                                      <div className="space-y-0.5">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                          {rec.method === 'QR_SCAN' ? 'QR Check-in' : rec.method === 'FAMILY_CHECKIN' ? 'Family Check-in' : 'Manual Roll Call'}
                                        </span>
                                        <span className="text-[10px] text-slate-400 block">
                                          {rec.scannedAt || rec.timestamp ? new Date(rec.scannedAt || rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recorded'}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 text-[11px]">Not checked in</span>
                                    )}
                                  </td>

                                  {/* Actions: Mark Present/Absent, WhatsApp, Phone */}
                                  <td className="py-3.5 px-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      {!isPresent ? (
                                        <>
                                          <button
                                            onClick={() => handleToggleAttendance(m, 'Present')}
                                            disabled={isMarking}
                                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                                          >
                                            {isMarking ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} strokeWidth={2.5} />}
                                            <span>Mark Present</span>
                                          </button>
                                          {m.phone && (
                                            <>
                                              <button
                                                onClick={() => handleWhatsAppOutreach(m.phone, m.fullName || m.name)}
                                                title="WhatsApp Outreach"
                                                className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors cursor-pointer"
                                              >
                                                <MessageCircle size={15} />
                                              </button>
                                              <button
                                                onClick={() => handlePhoneCall(m.phone)}
                                                title="Call Member"
                                                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors cursor-pointer"
                                              >
                                                <Phone size={15} />
                                              </button>
                                            </>
                                          )}
                                        </>
                                      ) : (
                                        <button
                                          onClick={() => handleToggleAttendance(m, 'Absent')}
                                          disabled={isMarking}
                                          className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold text-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                                        >
                                          {isMarking ? <RefreshCw size={13} className="animate-spin" /> : <UserX size={13} />}
                                          <span>Mark Absent</span>
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* TAB 2: SANCTUARY HEADCOUNT & SLOTS (PRESERVED)               */}
          {/* ─────────────────────────────────────────────────────────── */}
          {mainTab === 'headcounts' && (
            <div className="space-y-6">
              {/* Form & Overview Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form */}
                <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
                  <div>
                    <h3 className="font-black text-base text-slate-900 dark:text-white">Record Service Headcount</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Log usher headcount tallies for church records.</p>
                  </div>

                  <form onSubmit={(e) => handleSaveHeadcount(e, false)} className="space-y-3.5 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Service Date</label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Service Slot</label>
                      <select
                        value={selectedSlot}
                        onChange={(e) => setSelectedSlot(e.target.value as SundayServiceSlot)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500 font-medium"
                      >
                        <option value="07:00 AM (Dawn Prayer)">07:00 AM (Dawn Prayer)</option>
                        <option value="08:30 AM (1st Service)">08:30 AM (1st Service)</option>
                        <option value="10:30 AM (2nd Service)">10:30 AM (2nd Service)</option>
                        <option value="05:30 PM (Evening Praise)">05:30 PM (Evening Praise)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Main Sanctuary</label>
                        <input
                          type="number"
                          value={countMain}
                          onChange={(e) => setCountMain(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Balcony</label>
                        <input
                          type="number"
                          value={countBalcony}
                          onChange={(e) => setCountBalcony(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500 font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Overflow Hall</label>
                        <input
                          type="number"
                          value={countOverflow}
                          onChange={(e) => setCountOverflow(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Children Church</label>
                        <input
                          type="number"
                          value={countChildren}
                          onChange={(e) => setCountChildren(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500 font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">First-Time Visitors</label>
                      <input
                        type="number"
                        value={firstTimeVisitors}
                        onChange={(e) => setFirstTimeVisitors(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Usher Notes</label>
                      <textarea
                        rows={2}
                        value={usherNotes}
                        onChange={(e) => setUsherNotes(e.target.value)}
                        placeholder="Weather conditions, overflow status, guest feedback..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500"
                      />
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={isSubmittingHeadcount}
                        className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {isSubmittingHeadcount ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                        <span>Save Headcount</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Headcount Sessions Table */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-base text-slate-900 dark:text-white">Past Headcount Logs</h3>
                      <p className="text-xs text-slate-500">Historical room tallies recorded by ushers.</p>
                    </div>
                  </div>

                  {sessions.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                      No headcount sessions recorded yet. Use the form on the left to create one.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="py-3 px-3">Date &amp; Slot</th>
                            <th className="py-3 px-3">Total Headcount</th>
                            <th className="py-3 px-3">Sanctuary / Balcony</th>
                            <th className="py-3 px-3">Visitors</th>
                            <th className="py-3 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                          {sessions.map((s) => (
                            <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                              <td className="py-3 px-3">
                                <span className="font-bold text-slate-900 dark:text-white block">{s.serviceDate}</span>
                                <span className="text-[10px] text-slate-400">{s.serviceSlot}</span>
                              </td>
                              <td className="py-3 px-3 font-black text-emerald-600 dark:text-emerald-400 text-sm">
                                {s.totalHeadcount || 0}
                              </td>
                              <td className="py-3 px-3 text-[11px]">
                                {s.countMain || 0} main / {s.countBalcony || 0} balcony
                              </td>
                              <td className="py-3 px-3 font-semibold text-purple-600 dark:text-purple-400">
                                {s.firstTimeVisitors || 0}
                              </td>
                              <td className="py-3 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                  {s.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* MODAL: UNIFIED QR CODE (CHURCH & EVENT)                     */}
          {/* ─────────────────────────────────────────────────────────── */}
          {qrModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-center">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="text-left">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {qrModalType === 'event' ? qrModalEvent?.title || 'Service QR' : 'Church Entrance QR'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {qrModalType === 'event' ? 'Event-specific check-in pass' : 'Permanent Sanctuary Check-in'}
                    </p>
                  </div>
                  <button onClick={() => setQrModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                    <X size={18} />
                  </button>
                </div>

                {/* QR Display */}
                <div className="bg-white p-4 rounded-2xl shadow-inner border border-slate-200 inline-block mx-auto">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="Attendance QR Code" className="w-64 h-64 object-contain mx-auto" />
                  ) : (
                    <div className="w-64 h-64 flex items-center justify-center text-slate-400">
                      <RefreshCw size={24} className="animate-spin" />
                    </div>
                  )}
                </div>

                <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    Scan with Rhema Mobile App
                  </p>
                  <p className="text-[11px]">
                    Members scan this QR code upon arrival to instantly record their attendance into church records.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={downloadQR}
                    className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Download PNG</span>
                  </button>
                  <button
                    onClick={printQR}
                    className="py-2.5 px-3 rounded-xl bg-[#1A2D5A] hover:bg-[#152347] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Printer size={14} />
                    <span>Print Poster</span>
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
