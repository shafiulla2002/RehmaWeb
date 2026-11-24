'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AdminNavigationShell } from '@/components/layout/AdminNavigationShell';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import {
  INITIAL_ADMIN_CELEBRATIONS,
  INITIAL_ADMIN_BROADCASTS,
  INITIAL_ADMIN_WHATSAPP_CHATS,
  INITIAL_ADMIN_GALLERY_ALBUMS,
  INITIAL_ADMIN_ONLINE_MEETINGS,
  AdminCelebrationQueueItem,
  CelebrationType,
  AdminPushBroadcastRecord,
  AdminWhatsAppChatSnippet,
  AdminGalleryAlbumItem,
  AdminOnlineMeetingSession,
} from '@/lib/adminWave7cData';
import {
  Megaphone,
  PartyPopper,
  Bell,
  MessageSquare,
  Image as ImageIcon,
  Video,
  Search,
  Filter,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  Send,
  CheckCheck,
  Check,
  X,
  RotateCcw,
  Sparkles,
  Download,
  Copy,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Users,
  Camera,
  Play,
  Share2,
  Tv,
  Layers,
  Heart,
  Music,
  Cake,
  Gift,
  Home,
  MessageCircle,
  AlertTriangle,
  Upload,
} from 'lucide-react';

const STORAGE_KEY_COMMUNICATIONS = '@rhema_admin_m45_communications';

// =========================================================================
// M45 LOCAL TYPES & MODELS (ALL SCOPED INTERNALLY - ZERO APPUTER EXPORT CONFLICT)
// =========================================================================

type CommunicationsTab =
  | 'celebrations'
  | 'notifications'
  | 'whatsapp'
  | 'gallery'
  | 'meetings';

type NotificationCategory = 'Announcements' | 'Events' | 'Prayer' | 'Attendance' | 'General';
type NotificationAudience = 'All Registered Members' | 'Care Cell Leaders' | 'Worship & Media Team' | 'Youth & Teens' | 'Parents Group';
type NotificationStatus = 'Draft (Sim)' | 'Scheduled (Sim)' | 'Sent (Sim)';

type M45CelebrationType = CelebrationType | 'Baby Dedication';

interface ExtendedCelebration extends Omit<AdminCelebrationQueueItem, 'type'> {
  type: M45CelebrationType;
  careCellGroup?: string;
  notes?: string;
}

interface ExtendedNotification extends AdminPushBroadcastRecord {
  category: NotificationCategory;
  readRatePct: number;
}

interface WhatsAppChatMessage {
  id: string;
  sender: 'contact' | 'admin';
  text: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
}

interface ExtendedWhatsAppChat {
  id: string;
  contactName: string;
  phoneMasked: string;
  avatarBg: string;
  lastMessageSnippet: string;
  timestamp: string;
  unreadCount: number;
  isAutomatedGreeting: boolean;
  messages: WhatsAppChatMessage[];
}

interface ExtendedGalleryAlbum extends AdminGalleryAlbumItem {
  category: 'Worship Services' | 'Youth & Camps' | 'Missions & Outreach' | 'Seasonal Celebrations';
  gradientTheme: string;
  description: string;
}

type MeetingStatus = 'Draft' | 'Scheduled' | 'Live (Simulated)' | 'Completed' | 'Cancelled';

interface ExtendedOnlineMeeting extends AdminOnlineMeetingSession {
  description: string;
  hostName: string;
  meetingUrl: string;
  status: MeetingStatus;
}

// =========================================================================
// BASELINE SYNTHETIC DEMONSTRATION DATASETS
// =========================================================================

const BASELINE_CELEBRATIONS: ExtendedCelebration[] = [
  {
    id: 'CEL-2026-01',
    demoTag: 'Simulated Celebration Item (Demo)',
    memberName: 'Brother Joshua Thomas (Demo)',
    type: 'Birthday',
    eventDate: '11-20',
    phoneMasked: '+91 97402-XXXX2',
    yearsMilestone: 35,
    assignedScriptureVerse: 'Numbers 6:24-26 ("The Lord bless you and keep you; the Lord make His face shine on you...")',
    careCellGroup: 'Bethel Central Care Cell',
    cardDispatched: true,
    whatsappGreetingSent: true,
    notes: 'Pastoral phone blessing completed this morning.',
  },
  {
    id: 'CEL-2026-02',
    demoTag: 'Simulated Celebration Item (Demo)',
    memberName: 'Brother Mark & Sister Reena David (Demo)',
    type: 'Wedding Anniversary',
    eventDate: '11-22',
    phoneMasked: '+91 98455-XXXX1',
    yearsMilestone: 12,
    assignedScriptureVerse: 'Ecclesiastes 4:12 ("A threefold cord is not quickly broken...")',
    careCellGroup: 'Shalom East Care Cell',
    cardDispatched: false,
    whatsappGreetingSent: false,
    notes: 'Anniversary card prepared for Sunday altar blessing.',
  },
  {
    id: 'CEL-2026-03',
    demoTag: 'Simulated Celebration Item (Demo)',
    memberName: 'Sister Lydia Sundaram (Demo)',
    type: 'Baptism Jubilee',
    eventDate: '11-25',
    phoneMasked: '+91 99002-XXXX7',
    yearsMilestone: 1,
    assignedScriptureVerse: '2 Corinthians 5:17 ("Old things are passed away, behold, all things are become new...")',
    careCellGroup: 'Grace North Care Cell',
    cardDispatched: false,
    whatsappGreetingSent: false,
    notes: 'First water baptism anniversary; special testimony celebration.',
  },
  {
    id: 'CEL-2026-04',
    demoTag: 'Simulated Celebration Item (Demo)',
    memberName: 'Baby Hannah Grace (Parents: Brother Daniel & Sister Esther - Demo)',
    type: 'Baby Dedication',
    eventDate: '11-29',
    phoneMasked: '+91 98804-XXXX5',
    assignedScriptureVerse: 'Mark 10:14 ("Let the little children come to me, and do not hinder them, for the kingdom of God belongs to such as these.")',
    careCellGroup: 'Shalom East Care Cell',
    cardDispatched: false,
    whatsappGreetingSent: false,
    notes: 'Sunday morning infant dedication blessing with parents and church elders.',
  },
];

const BASELINE_NOTIFICATIONS: ExtendedNotification[] = [
  {
    id: 'BCAST-2026-01',
    demoTag: 'Simulated Push Broadcast (Demo)',
    title: 'Reminder: 21-Day Fasting & Prayer Watch Begins This Monday',
    body: 'Join the pastoral team online daily at 05:00 AM or in-person at Central Sanctuary 07:00 PM for divine alignment.',
    category: 'Prayer',
    targetAudience: 'All Registered Members',
    scheduledOrSentDate: '2026-11-19',
    status: 'Sent (Sim)',
    recipientCount: 1420,
    readRatePct: 84.5,
  },
  {
    id: 'BCAST-2026-02',
    demoTag: 'Simulated Push Broadcast (Demo)',
    title: 'Worship Team & Choir Saturday Sound Check',
    body: 'All vocalists and instrumentalists please arrive by 03:45 PM tomorrow for Sunday morning setlist run-through.',
    category: 'Attendance',
    targetAudience: 'Worship & Media Team',
    scheduledOrSentDate: '2026-11-21',
    status: 'Scheduled (Sim)',
    recipientCount: 38,
    readRatePct: 92.1,
  },
  {
    id: 'BCAST-2026-03',
    demoTag: 'Simulated Push Broadcast (Demo)',
    title: 'Community Food Drive Crate Packing Schedule',
    body: 'Volunteers needed Saturday 09:00 AM at the Church Distribution Depot to pack 50 bags of dry grains.',
    category: 'Events',
    targetAudience: 'Care Cell Leaders',
    scheduledOrSentDate: '2026-11-22',
    status: 'Draft (Sim)',
    recipientCount: 52,
    readRatePct: 0.0,
  },
];

const BASELINE_WHATSAPP_CHATS: ExtendedWhatsAppChat[] = [
  {
    id: 'WA-MSG-01',
    contactName: 'Mary Magdalene Rao (Demo)',
    phoneMasked: '+91 97401-XXXX1',
    avatarBg: 'bg-emerald-600',
    lastMessageSnippet: 'Praise the Lord Pastor, thank you so much for the birthday card and prayer audio note!',
    timestamp: '11:15 AM',
    unreadCount: 0,
    isAutomatedGreeting: false,
    messages: [
      {
        id: 'w1',
        sender: 'admin',
        text: 'Happy Birthday Sister Mary! Numbers 6:24-26: The Lord bless you and keep you; the Lord make His face shine on you and be gracious to you! — Rhema Pastoral Team',
        timestamp: '09:00 AM',
        status: 'read',
      },
      {
        id: 'w2',
        sender: 'contact',
        text: 'Praise the Lord Pastor, thank you so much for the birthday card and prayer audio note!',
        timestamp: '11:15 AM',
        status: 'read',
      },
    ],
  },
  {
    id: 'WA-MSG-02',
    contactName: 'Joshua Thomas (Demo)',
    phoneMasked: '+91 97402-XXXX2',
    avatarBg: 'bg-amber-600',
    lastMessageSnippet: 'Amen Pastor! The whole family was blessed. See you at Sunday worship.',
    timestamp: 'Yesterday',
    unreadCount: 1,
    isAutomatedGreeting: false,
    messages: [
      {
        id: 'w3',
        sender: 'admin',
        text: 'Brother Joshua, we rejoice with you on your 35th milestone! May God grant you wisdom and fruitfulness in this new season.',
        timestamp: 'Yesterday 10:30 AM',
        status: 'read',
      },
      {
        id: 'w4',
        sender: 'contact',
        text: 'Amen Pastor! The whole family was blessed. See you at Sunday worship.',
        timestamp: 'Yesterday 04:20 PM',
        status: 'delivered',
      },
    ],
  },
];

// Pure CSS/SVG Thematic Gradients (Zero External Images)
const BASELINE_GALLERY_ALBUMS: ExtendedGalleryAlbum[] = [
  {
    id: 'ALB-2026-01',
    albumTitle: 'Youth Encounter Camp 2026: Fire & Grace',
    category: 'Youth & Camps',
    gradientTheme: 'from-amber-900 via-slate-900 to-[#0B192C]',
    coverImageTheme: 'Outdoor amphitheater worship with acoustic guitars (Simulated Visual)',
    eventDate: '2026-10-18',
    photoCount: 48,
    photographerName: 'Brother Caleb (Media Team)',
    description: 'Three days of spiritual revival, worship campfires, and youth discipleship in the hills.',
  },
  {
    id: 'ALB-2026-02',
    albumTitle: 'Holy Communion & Miracle Healing Service',
    category: 'Worship Services',
    gradientTheme: 'from-emerald-950 via-slate-900 to-[#0B192C]',
    coverImageTheme: 'Pastors ministering communion elements at sanctuary altar (Simulated Visual)',
    eventDate: '2026-11-01',
    photoCount: 32,
    photographerName: 'Sister Sarah (Media Team)',
    description: 'First Sunday of the month corporate celebration of the Lord’s Supper and divine healing testimonies.',
  },
];

const BASELINE_ONLINE_MEETINGS: ExtendedOnlineMeeting[] = [
  {
    id: 'MEET-2026-01',
    title: 'Wednesday Mid-Week Bible Study & Global Intercession',
    platform: 'Zoom Video (Sim)',
    meetingDate: '2026-11-25',
    meetingTime: '07:30 PM',
    hostName: 'Pastor Samuel Joseph (Demo)',
    meetingUrl: 'https://zoom.us/j/sample-rhema-midweek-demo',
    passcodeProtected: true,
    passcode: 'RHEMA777',
    status: 'Scheduled',
    registeredAttendeesCount: 165,
    description: 'Verse-by-verse exposition through the Book of Romans with interactive breakout care cell prayer groups.',
  },
  {
    id: 'MEET-2026-02',
    title: 'Early Morning 05:00 AM Breakthrough Prayer Watch',
    platform: 'Google Meet (Sim)',
    meetingDate: '2026-11-26',
    meetingTime: '05:00 AM',
    hostName: 'Pastor Gabriel (Demo)',
    meetingUrl: 'https://meet.google.com/sample-rhema-dawn-demo',
    passcodeProtected: false,
    passcode: '',
    status: 'Scheduled',
    registeredAttendeesCount: 88,
    description: 'Corporate dawn intercessory prayer watch covering family requests, sick members, and church outreach.',
  },
];

export default function AdminCommunicationsPage() {
  const [activeTab, setActiveTab] = useState<CommunicationsTab>('celebrations');
  const [celebrations, setCelebrations] = useState<ExtendedCelebration[]>(BASELINE_CELEBRATIONS);
  const [notifications, setNotifications] = useState<ExtendedNotification[]>(BASELINE_NOTIFICATIONS);
  const [whatsappChats, setWhatsappChats] = useState<ExtendedWhatsAppChat[]>(BASELINE_WHATSAPP_CHATS);
  const [galleryAlbums, setGalleryAlbums] = useState<ExtendedGalleryAlbum[]>(BASELINE_GALLERY_ALBUMS);
  const [onlineMeetings, setOnlineMeetings] = useState<ExtendedOnlineMeeting[]>(BASELINE_ONLINE_MEETINGS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active WhatsApp chat selection & reply input
  const [activeChatId, setActiveChatId] = useState<string>('WA-MSG-01');
  const [replyInputText, setReplyInputText] = useState<string>('');

  // Modals state
  const [isCelebrationModalOpen, setIsCelebrationModalOpen] = useState(false);
  const [editingCelebration, setEditingCelebration] = useState<ExtendedCelebration | null>(null);
  const [deletingCelebrationId, setDeletingCelebrationId] = useState<string | null>(null);

  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState<ExtendedNotification | null>(null);
  const [deletingNotificationId, setDeletingNotificationId] = useState<string | null>(null);

  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<ExtendedGalleryAlbum | null>(null);
  const [deletingAlbumId, setDeletingAlbumId] = useState<string | null>(null);
  const [isSimulatedUploadOpen, setIsSimulatedUploadOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<ExtendedOnlineMeeting | null>(null);
  const [deletingMeetingId, setDeletingMeetingId] = useState<string | null>(null);

  // Celebrations Filter State
  const [celebrationTypeFilter, setCelebrationTypeFilter] = useState<'ALL' | M45CelebrationType>('ALL');

  // Form States
  const [celForm, setCelForm] = useState({
    memberName: '',
    type: 'Birthday' as M45CelebrationType,
    eventDate: '11-28',
    phoneMasked: '+91 98450-XXXX1',
    yearsMilestone: 30,
    assignedScriptureVerse: 'Psalm 121:1-8 ("The Lord shall preserve your going out and your coming in...")',
    careCellGroup: 'Bethel Central Care Cell',
    notes: '',
  });

  const [notifForm, setNotifForm] = useState({
    title: '',
    body: '',
    category: 'Announcements' as NotificationCategory,
    targetAudience: 'All Registered Members' as NotificationAudience,
    scheduledOrSentDate: '2026-11-22',
    status: 'Scheduled (Sim)' as NotificationStatus,
  });

  const [albumForm, setAlbumForm] = useState({
    albumTitle: '',
    category: 'Worship Services' as ExtendedGalleryAlbum['category'],
    eventDate: '2026-11-20',
    photographerName: 'Media Team Volunteer (Demo)',
    description: '',
    gradientTheme: 'from-emerald-950 via-slate-900 to-[#0B192C]',
  });

  const [meetForm, setMeetForm] = useState({
    title: '',
    platform: 'Google Meet (Sim)' as ExtendedOnlineMeeting['platform'],
    meetingDate: '2026-11-27',
    meetingTime: '07:00 PM',
    hostName: 'Senior Pastor John Mark (Demo)',
    meetingUrl: 'https://meet.google.com/sample-fellowship-demo',
    passcodeProtected: false,
    passcode: '',
    status: 'Scheduled' as MeetingStatus,
    description: '',
  });

  // Live Firestore synchronization for Broadcasts, Gallery Albums, and Online Meetings
  useEffect(() => {
    // 1. Live Broadcasts
    const bcastCol = collection(db, 'Rhema Church', 'rhema', 'broadcasts');
    const unsubBcast = onSnapshot(
      bcastCol,
      async (snap) => {
        if (!snap.empty) {
          const loaded: ExtendedNotification[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: data.title || 'Church Broadcast',
              body: data.body || data.message || '',
              category: (data.category as NotificationCategory) || 'Announcements',
              targetAudience: (data.targetAudience as NotificationAudience) || 'All Registered Members',
              scheduledOrSentDate: data.scheduledOrSentDate || (data.createdAt ? new Date(data.createdAt).toISOString().split('T')[0] : '2026-11-24'),
              status: (data.status as NotificationStatus) || 'Sent (Sim)',
              recipientCount: data.recipientCount || 1420,
              readRatePct: data.readRatePct ?? 82.5,
              demoTag: data.demoTag,
            };
          });
          setNotifications(loaded);
        } else {
          // Auto-seed initial broadcasts
          try {
            for (const b of BASELINE_NOTIFICATIONS) {
              await setDoc(doc(db, 'Rhema Church', 'rhema', 'broadcasts', b.id), {
                ...b,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }
          } catch {}
        }
      },
      () => {}
    );

    // 2. Live Gallery Albums
    const galleryCol = collection(db, 'Rhema Church', 'rhema', 'gallery_albums');
    const unsubGallery = onSnapshot(
      galleryCol,
      async (snap) => {
        if (!snap.empty) {
          const loaded: ExtendedGalleryAlbum[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              albumTitle: data.albumTitle || data.title || data.name || 'Church Album',
              category: data.category || 'Worship Services',
              gradientTheme: data.gradientTheme || 'from-emerald-950 via-slate-900 to-[#0B192C]',
              coverImageTheme: data.coverImageTheme || data.coverPhotoUrl || 'Album Visual',
              eventDate: data.eventDate || data.date || 'Recent',
              photoCount: data.photoCount || 12,
              photographerName: data.photographerName || 'Media Team',
              description: data.description || '',
            };
          });
          setGalleryAlbums(loaded);
        } else {
          // Auto-seed initial albums
          try {
            for (const g of BASELINE_GALLERY_ALBUMS) {
              await setDoc(doc(db, 'Rhema Church', 'rhema', 'gallery_albums', g.id), {
                ...g,
                title: g.albumTitle,
                name: g.albumTitle,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }
          } catch {}
        }
      },
      () => {}
    );

    // 3. Live Online Meetings
    const meetCol = collection(db, 'Rhema Church', 'rhema', 'online_meetings');
    const unsubMeet = onSnapshot(
      meetCol,
      async (snap) => {
        if (!snap.empty) {
          const loaded: ExtendedOnlineMeeting[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: data.title || data.topic || 'Online Meeting',
              platform: data.platform || data.provider || 'Google Meet',
              meetingDate: data.meetingDate || data.date || '2026-11-27',
              meetingTime: data.meetingTime || data.time || '07:00 PM',
              hostName: data.hostName || data.host || 'Senior Pastor',
              meetingUrl: data.meetingUrl || data.link || 'https://meet.google.com/sample',
              passcodeProtected: Boolean(data.passcodeProtected),
              passcode: data.passcode || '',
              status: (data.status as MeetingStatus) || 'Scheduled',
              registeredAttendeesCount: data.registeredAttendeesCount || 45,
              description: data.description || '',
            };
          });
          setOnlineMeetings(loaded);
        } else {
          // Auto-seed initial meetings
          try {
            for (const m of BASELINE_ONLINE_MEETINGS) {
              await setDoc(doc(db, 'Rhema Church', 'rhema', 'online_meetings', m.id), {
                ...m,
                topic: m.title,
                provider: m.platform,
                link: m.meetingUrl,
                date: m.meetingDate,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }
          } catch {}
        }
      },
      () => {}
    );

    return () => {
      unsubBcast();
      unsubGallery();
      unsubMeet();
    };
  }, []);

  const persistState = (
    c: ExtendedCelebration[],
    n: ExtendedNotification[],
    w: ExtendedWhatsAppChat[],
    g: ExtendedGalleryAlbum[],
    m: ExtendedOnlineMeeting[]
  ) => {
    setCelebrations(c);
    setNotifications(n);
    setWhatsappChats(w);
    setGalleryAlbums(g);
    setOnlineMeetings(m);
    try {
      localStorage.setItem(
        STORAGE_KEY_COMMUNICATIONS,
        JSON.stringify({
          celebrations: c,
          notifications: n,
          whatsappChats: w,
          galleryAlbums: g,
          onlineMeetings: m,
        })
      );
    } catch {
      // ignore
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleResetDemoData = () => {
    try {
      localStorage.removeItem(STORAGE_KEY_COMMUNICATIONS);
    } catch {
      // ignore
    }
    setCelebrations(BASELINE_CELEBRATIONS);
    setNotifications(BASELINE_NOTIFICATIONS);
    setWhatsappChats(BASELINE_WHATSAPP_CHATS);
    setGalleryAlbums(BASELINE_GALLERY_ALBUMS);
    setOnlineMeetings(BASELINE_ONLINE_MEETINGS);
    setCelebrationTypeFilter('ALL');
    setActiveChatId('WA-MSG-01');
    showToast('Reset Communications Suite to baseline demonstration records');
  };

  // Filtered Celebrations by Milestone Type
  const filteredCelebrations = useMemo(() => {
    return celebrations.filter((cel) => celebrationTypeFilter === 'ALL' || cel.type === celebrationTypeFilter);
  }, [celebrations, celebrationTypeFilter]);

  // Executive KPI summary counts
  const kpis = useMemo(() => {
    const activeCelebrationsCount = celebrations.length;
    const sentBroadcastsCount = notifications.filter((n) => n.status === 'Sent (Sim)').length;
    const totalRecipientsReached = notifications.reduce((acc, n) => acc + (n.status === 'Sent (Sim)' ? n.recipientCount : 0), 0);
    const unreadChatsCount = whatsappChats.reduce((acc, c) => acc + c.unreadCount, 0);
    const totalAlbumsCount = galleryAlbums.length;
    const totalPhotosCount = galleryAlbums.reduce((acc, a) => acc + a.photoCount, 0);
    const scheduledMeetingsCount = onlineMeetings.filter((m) => m.status === 'Scheduled' || m.status === 'Live (Simulated)').length;

    return {
      activeCelebrationsCount,
      sentBroadcastsCount,
      totalRecipientsReached,
      unreadChatsCount,
      totalAlbumsCount,
      totalPhotosCount,
      scheduledMeetingsCount,
    };
  }, [celebrations, notifications, whatsappChats, galleryAlbums, onlineMeetings]);

  // Selected WhatsApp chat
  const activeChat = useMemo(() => {
    return whatsappChats.find((c) => c.id === activeChatId) || whatsappChats[0] || BASELINE_WHATSAPP_CHATS[0];
  }, [whatsappChats, activeChatId]);

  // =========================================================================
  // ACTIONS: CELEBRATIONS STUDIO CRUD & TOGGLES
  // =========================================================================

  const handleToggleCardDispatched = (id: string) => {
    const nextList = celebrations.map((c) => (c.id === id ? { ...c, cardDispatched: !c.cardDispatched } : c));
    persistState(nextList, notifications, whatsappChats, galleryAlbums, onlineMeetings);
    showToast('Updated card dispatch status (Simulated)');
  };

  const handleToggleWhatsappSent = (id: string) => {
    const nextList = celebrations.map((c) => (c.id === id ? { ...c, whatsappGreetingSent: !c.whatsappGreetingSent } : c));
    persistState(nextList, notifications, whatsappChats, galleryAlbums, onlineMeetings);
    showToast('Updated WhatsApp greeting status (Simulated)');
  };

  const handleOpenCreateCelebration = () => {
    setEditingCelebration(null);
    setCelForm({
      memberName: '',
      type: 'Birthday',
      eventDate: '11-28',
      phoneMasked: '+91 98450-XXXX1',
      yearsMilestone: 30,
      assignedScriptureVerse: 'Psalm 121:1-8 ("The Lord shall preserve your going out and your coming in...")',
      careCellGroup: 'Bethel Central Care Cell',
      notes: '',
    });
    setIsCelebrationModalOpen(true);
  };

  const handleSaveCelebration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!celForm.memberName || !celForm.eventDate) {
      showToast('Member name and date are required.');
      return;
    }
    if (editingCelebration) {
      const nextList = celebrations.map((c) =>
        c.id === editingCelebration.id
          ? {
              ...c,
              memberName: celForm.memberName,
              type: celForm.type,
              eventDate: celForm.eventDate,
              phoneMasked: celForm.phoneMasked,
              yearsMilestone: Number(celForm.yearsMilestone) > 0 ? Number(celForm.yearsMilestone) : undefined,
              assignedScriptureVerse: celForm.assignedScriptureVerse,
              careCellGroup: celForm.careCellGroup,
              notes: celForm.notes,
            }
          : c
      );
      persistState(nextList, notifications, whatsappChats, galleryAlbums, onlineMeetings);
      showToast('Updated celebration milestone (Simulated)');
    } else {
      const newItem: ExtendedCelebration = {
        id: `CEL-2026-${String(celebrations.length + 1).padStart(2, '0')}`,
        demoTag: 'Simulated Celebration Item (Demo)',
        memberName: celForm.memberName,
        type: celForm.type,
        eventDate: celForm.eventDate,
        phoneMasked: celForm.phoneMasked,
        yearsMilestone: Number(celForm.yearsMilestone) > 0 ? Number(celForm.yearsMilestone) : undefined,
        assignedScriptureVerse: celForm.assignedScriptureVerse,
        careCellGroup: celForm.careCellGroup,
        cardDispatched: false,
        whatsappGreetingSent: false,
        notes: celForm.notes,
      };
      const nextList = [newItem, ...celebrations];
      persistState(nextList, notifications, whatsappChats, galleryAlbums, onlineMeetings);
      showToast('Scheduled celebration milestone (Simulated)');
    }
    setIsCelebrationModalOpen(false);
  };

  const handleConfirmDeleteCelebration = () => {
    if (!deletingCelebrationId) return;
    const nextList = celebrations.filter((c) => c.id !== deletingCelebrationId);
    persistState(nextList, notifications, whatsappChats, galleryAlbums, onlineMeetings);
    setDeletingCelebrationId(null);
    showToast('Deleted celebration milestone (Simulated)');
  };

  // =========================================================================
  // ACTIONS: NOTIFICATIONS CRUD & BROADCASTS
  // =========================================================================

  const handleOpenCreateNotification = () => {
    setEditingNotification(null);
    setNotifForm({
      title: '',
      body: '',
      category: 'Announcements',
      targetAudience: 'All Registered Members',
      scheduledOrSentDate: new Date().toISOString().split('T')[0],
      status: 'Scheduled (Sim)',
    });
    setIsNotificationModalOpen(true);
  };

  const handleSaveNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifForm.title || !notifForm.body) {
      showToast('Announcement title and body are required.');
      return;
    }
    try {
      if (editingNotification) {
        await updateDoc(doc(db, 'Rhema Church', 'rhema', 'broadcasts', editingNotification.id), {
          title: notifForm.title,
          body: notifForm.body,
          category: notifForm.category,
          targetAudience: notifForm.targetAudience,
          scheduledOrSentDate: notifForm.scheduledOrSentDate,
          status: notifForm.status,
          updatedAt: new Date().toISOString(),
        });
        showToast('Updated notification broadcast in Firestore');
      } else {
        const newDocRef = doc(collection(db, 'Rhema Church', 'rhema', 'broadcasts'));
        const recipientCountMap: Record<NotificationAudience, number> = {
          'All Registered Members': 1420,
          'Care Cell Leaders': 52,
          'Worship & Media Team': 38,
          'Youth & Teens': 180,
          'Parents Group': 240,
        };
        const newItem: ExtendedNotification = {
          id: newDocRef.id,
          title: notifForm.title,
          body: notifForm.body,
          category: notifForm.category,
          targetAudience: notifForm.targetAudience,
          scheduledOrSentDate: notifForm.scheduledOrSentDate,
          status: notifForm.status,
          recipientCount: recipientCountMap[notifForm.targetAudience] || 100,
          readRatePct: notifForm.status === 'Sent (Sim)' ? 80.0 : 0.0,
        };
        await setDoc(newDocRef, {
          ...newItem,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        // Also fan out to notifications collection for real-time member alerts
        const memberNotifRef = doc(collection(db, 'Rhema Church', 'rhema', 'notifications'));
        await setDoc(memberNotifRef, {
          title: notifForm.title,
          body: notifForm.body,
          message: notifForm.body,
          category: 'Church Broadcast',
          targetMemberId: 'all_members',
          createdAt: new Date().toISOString(),
        });

        showToast('Broadcast published to Firestore & member inbox');
      }
      setIsNotificationModalOpen(false);
    } catch (err) {
      console.error('[AdminCommunications] Notification error:', err);
      showToast('Error saving broadcast. Please check permissions.');
    }
  };

  const handleConfirmDeleteNotification = async () => {
    if (!deletingNotificationId) return;
    try {
      await deleteDoc(doc(db, 'Rhema Church', 'rhema', 'broadcasts', deletingNotificationId));
      showToast('Deleted notification broadcast from Firestore');
      setDeletingNotificationId(null);
    } catch (err) {
      showToast('Failed to delete broadcast');
    }
  };

  // =========================================================================
  // ACTIONS: WHATSAPP INBOX INTERACTIVE REPLY COMPOSER
  // =========================================================================

  const handleSendWhatsAppReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyInputText.trim()) return;

    const newMsg: WhatsAppChatMessage = {
      id: `w-${Date.now()}`,
      sender: 'admin',
      text: replyInputText.trim(),
      timestamp: 'Just now',
      status: 'read',
    };

    const nextChats = whatsappChats.map((c) => {
      if (c.id === activeChat.id) {
        return {
          ...c,
          lastMessageSnippet: newMsg.text,
          timestamp: 'Just now',
          unreadCount: 0,
          messages: [...c.messages, newMsg],
        };
      }
      return c;
    });

    persistState(celebrations, notifications, nextChats, galleryAlbums, onlineMeetings);
    setReplyInputText('');
    showToast('Sent simulated WhatsApp reply (Demo)');
  };

  const handleInsertQuickReply = (text: string) => {
    setReplyInputText(text);
  };

  // =========================================================================
  // ACTIONS: GALLERY CRUD & SIMULATED UPLOAD WORKFLOW
  // =========================================================================

  const handleOpenCreateAlbum = () => {
    setEditingAlbum(null);
    setAlbumForm({
      albumTitle: '',
      category: 'Worship Services',
      eventDate: new Date().toISOString().split('T')[0],
      photographerName: 'Media Team Volunteer (Demo)',
      description: '',
      gradientTheme: 'from-emerald-950 via-slate-900 to-[#0B192C]',
    });
    setIsAlbumModalOpen(true);
  };

  const handleSaveAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!albumForm.albumTitle) {
      showToast('Album title is required.');
      return;
    }
    try {
      if (editingAlbum) {
        await updateDoc(doc(db, 'Rhema Church', 'rhema', 'gallery_albums', editingAlbum.id), {
          title: albumForm.albumTitle,
          name: albumForm.albumTitle,
          albumTitle: albumForm.albumTitle,
          category: albumForm.category,
          eventDate: albumForm.eventDate,
          photographerName: albumForm.photographerName,
          description: albumForm.description,
          gradientTheme: albumForm.gradientTheme,
          updatedAt: new Date().toISOString(),
        });
        showToast('Updated gallery album in Firestore');
      } else {
        const newDocRef = doc(collection(db, 'Rhema Church', 'rhema', 'gallery_albums'));
        const newItem: ExtendedGalleryAlbum = {
          id: newDocRef.id,
          albumTitle: albumForm.albumTitle,
          category: albumForm.category,
          gradientTheme: albumForm.gradientTheme,
          coverImageTheme: `${albumForm.albumTitle} (Thematic Visual)`,
          eventDate: albumForm.eventDate,
          photoCount: 16,
          photographerName: albumForm.photographerName,
          description: albumForm.description,
        };
        await setDoc(newDocRef, {
          ...newItem,
          title: albumForm.albumTitle,
          name: albumForm.albumTitle,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        showToast('Created new gallery album in Firestore');
      }
      setIsAlbumModalOpen(false);
    } catch (err) {
      showToast('Error saving album to Firestore');
    }
  };

  const handleStartSimulatedUpload = () => {
    setUploadProgress(10);
    setIsSimulatedUploadOpen(true);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsSimulatedUploadOpen(false);
            setUploadProgress(0);
            showToast('Simulated upload completed. Added 8 photos to album.');
          }, 600);
          return 100;
        }
        return prev + 30;
      });
    }, 400);
  };

  const handleConfirmDeleteAlbum = async () => {
    if (!deletingAlbumId) return;
    try {
      await deleteDoc(doc(db, 'Rhema Church', 'rhema', 'gallery_albums', deletingAlbumId));
      showToast('Deleted gallery album from Firestore');
      setDeletingAlbumId(null);
    } catch (err) {
      showToast('Failed to delete album');
    }
  };

  // =========================================================================
  // ACTIONS: ONLINE MEETINGS CRUD & LIFECYCLE
  // =========================================================================

  const handleOpenCreateMeeting = () => {
    setEditingMeeting(null);
    setMeetForm({
      title: '',
      platform: 'Google Meet (Sim)',
      meetingDate: new Date().toISOString().split('T')[0],
      meetingTime: '07:00 PM',
      hostName: 'Senior Pastor John Mark',
      meetingUrl: 'https://meet.google.com/sample-fellowship-demo',
      passcodeProtected: false,
      passcode: '',
      status: 'Scheduled',
      description: '',
    });
    setIsMeetingModalOpen(true);
  };

  const handleSaveMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetForm.title) {
      showToast('Meeting title is required.');
      return;
    }
    try {
      if (editingMeeting) {
        await updateDoc(doc(db, 'Rhema Church', 'rhema', 'online_meetings', editingMeeting.id), {
          title: meetForm.title,
          topic: meetForm.title,
          platform: meetForm.platform,
          provider: meetForm.platform,
          meetingDate: meetForm.meetingDate,
          date: meetForm.meetingDate,
          meetingTime: meetForm.meetingTime,
          hostName: meetForm.hostName,
          meetingUrl: meetForm.meetingUrl,
          link: meetForm.meetingUrl,
          passcodeProtected: meetForm.passcodeProtected,
          passcode: meetForm.passcode,
          status: meetForm.status,
          description: meetForm.description,
          updatedAt: new Date().toISOString(),
        });
        showToast('Updated online meeting in Firestore');
      } else {
        const newDocRef = doc(collection(db, 'Rhema Church', 'rhema', 'online_meetings'));
        const newItem: ExtendedOnlineMeeting = {
          id: newDocRef.id,
          title: meetForm.title,
          platform: meetForm.platform,
          meetingDate: meetForm.meetingDate,
          meetingTime: meetForm.meetingTime,
          hostName: meetForm.hostName,
          meetingUrl: meetForm.meetingUrl,
          passcodeProtected: meetForm.passcodeProtected,
          passcode: meetForm.passcode,
          status: meetForm.status,
          registeredAttendeesCount: 45,
          description: meetForm.description,
        };
        await setDoc(newDocRef, {
          ...newItem,
          topic: meetForm.title,
          provider: meetForm.platform,
          link: meetForm.meetingUrl,
          date: meetForm.meetingDate,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        showToast('Created online meeting in Firestore');
      }
      setIsMeetingModalOpen(false);
    } catch (err) {
      showToast('Error saving meeting to Firestore');
    }
  };

  const handleCopyMeetingLink = (url: string) => {
    navigator.clipboard.writeText(url);
    showToast('Copied meeting link to clipboard');
  };

  const handleConfirmDeleteMeeting = async () => {
    if (!deletingMeetingId) return;
    try {
      await deleteDoc(doc(db, 'Rhema Church', 'rhema', 'online_meetings', deletingMeetingId));
      showToast('Deleted online meeting from Firestore');
      setDeletingMeetingId(null);
    } catch (err) {
      showToast('Failed to delete meeting');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
      <AdminNavigationShell>
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
          {/* TOAST NOTIFICATION */}
          {toastMessage && (
            <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-medium animate-in fade-in slide-in-from-bottom-3">
              <Sparkles size={18} className="shrink-0 text-amber-300" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* HEADER SECTION */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-[10px] font-bold text-emerald-300">
                  Wave 7C · Phase 8 (M45)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-semibold text-amber-300">
                  Layer A Simulation
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-semibold text-slate-300">
                  Admin &amp; Super Admin
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                <Megaphone className="text-emerald-400" size={28} />
                <span>Admin Communications Suite</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Centralized church broadcasts, celebration milestones, simulated WhatsApp pastoral inquiries, event gallery albums, and online prayer vigils.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleResetDemoData}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
              >
                <RotateCcw size={14} className="text-amber-400" />
                <span>Reset Demo Data</span>
              </button>
            </div>
          </div>

          {/* EXECUTIVE COMMUNICATIONS SUMMARY CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div className="bg-[#0B192C]/90 border border-slate-800 rounded-2xl p-3.5 space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Milestones</span>
                <PartyPopper size={15} className="text-amber-400" />
              </div>
              <div className="text-xl font-black text-white">{kpis.activeCelebrationsCount}</div>
              <p className="text-[10px] text-slate-400">Upcoming birthdays &amp; jubilees</p>
            </div>

            <div className="bg-[#0B192C]/90 border border-slate-800 rounded-2xl p-3.5 space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Broadcasts</span>
                <Bell size={15} className="text-emerald-400" />
              </div>
              <div className="text-xl font-black text-white">{kpis.sentBroadcastsCount}</div>
              <p className="text-[10px] text-emerald-400/80 font-mono">
                {kpis.totalRecipientsReached.toLocaleString('en-IN')} reached
              </p>
            </div>

            <div className="bg-[#0B192C]/90 border border-slate-800 rounded-2xl p-3.5 space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">WhatsApp</span>
                <MessageSquare size={15} className="text-emerald-400" />
              </div>
              <div className="text-xl font-black text-white">{whatsappChats.length}</div>
              <p className="text-[10px] text-amber-300 font-mono">
                {kpis.unreadChatsCount} unread inquiry
              </p>
            </div>

            <div className="bg-[#0B192C]/90 border border-slate-800 rounded-2xl p-3.5 space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Gallery</span>
                <ImageIcon size={15} className="text-purple-400" />
              </div>
              <div className="text-xl font-black text-white">{kpis.totalAlbumsCount}</div>
              <p className="text-[10px] text-slate-400 font-mono">
                {kpis.totalPhotosCount} photos curated
              </p>
            </div>

            <div className="bg-[#0B192C]/90 border border-slate-800 rounded-2xl p-3.5 space-y-1 shadow-sm col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Meetings</span>
                <Video size={15} className="text-cyan-400" />
              </div>
              <div className="text-xl font-black text-white">{kpis.scheduledMeetingsCount}</div>
              <p className="text-[10px] text-cyan-300">Scheduled live watches</p>
            </div>
          </div>

          {/* TAB NAVIGATION (ALL 5 FUNCTIONAL AREAS) */}
          <div className="border-b border-slate-800 flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: 'celebrations', label: 'Celebrations Studio', icon: PartyPopper },
              { id: 'notifications', label: 'Push Notifications', icon: Bell },
              { id: 'whatsapp', label: 'WhatsApp Inbox', icon: MessageSquare },
              { id: 'gallery', label: 'Gallery Albums', icon: ImageIcon },
              { id: 'meetings', label: 'Online Meetings', icon: Video },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as CommunicationsTab)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-xl text-xs font-semibold whitespace-nowrap transition-all border-b-2 ${
                    isActive
                      ? 'border-emerald-400 text-white bg-slate-900/80 shadow-sm'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-emerald-400' : 'text-slate-400'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* ================================================================= */}
          {/* TAB 1: CELEBRATIONS STUDIO                                        */}
          {/* ================================================================= */}
          {activeTab === 'celebrations' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <PartyPopper size={16} className="text-amber-400" />
                    <span>Member Milestone Queue &amp; Blessing Dispatch</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Track birthdays, wedding anniversaries, baptism jubilees, and baby dedications without exposing real PII
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenCreateCelebration}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-2 transition-colors shrink-0 shadow-md shadow-amber-950/40"
                >
                  <Plus size={15} />
                  <span>Add Celebration Milestone</span>
                </button>
              </div>

              {/* Milestone Type Filter Bar (All + 4 Canonical Milestone Types) */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0B192C]/70 border border-slate-800 rounded-2xl p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
                    <Filter size={12} className="text-amber-400" />
                    Milestone Type:
                  </span>
                  {(
                    [
                      { value: 'ALL', label: 'All Milestones' },
                      { value: 'Birthday', label: 'Birthday' },
                      { value: 'Wedding Anniversary', label: 'Wedding Anniversary' },
                      { value: 'Baptism Jubilee', label: 'Baptism Jubilee' },
                      { value: 'Baby Dedication', label: 'Baby Dedication' },
                    ] as const
                  ).map((opt) => {
                    const active = celebrationTypeFilter === opt.value;
                    const count =
                      opt.value === 'ALL'
                        ? celebrations.length
                        : celebrations.filter((c) => c.type === opt.value).length;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setCelebrationTypeFilter(opt.value)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                          active
                            ? 'bg-amber-600/20 border-amber-500/50 text-amber-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        {opt.label} ({count})
                      </button>
                    );
                  })}
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  Showing {filteredCelebrations.length} of {celebrations.length}
                </span>
              </div>

              {filteredCelebrations.length === 0 ? (
                <div className="bg-[#0B192C]/70 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
                  <p className="text-xs text-slate-400">
                    No celebration milestones match the selected filter ({celebrationTypeFilter}).
                  </p>
                  <button
                    type="button"
                    onClick={() => setCelebrationTypeFilter('ALL')}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-300"
                  >
                    Show All Milestones
                  </button>
                </div>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCelebrations.map((cel) => (
                  <div
                    key={cel.id}
                    className="bg-[#0B192C]/85 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 shadow-sm transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-[10px] font-bold text-amber-300">
                            {cel.type} {cel.yearsMilestone ? `(${cel.yearsMilestone} yrs)` : ''}
                          </span>
                          <h4 className="text-sm font-bold text-white mt-1.5">{cel.memberName}</h4>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-400 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                          {cel.eventDate}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 space-y-0.5">
                        <p className="font-mono">Phone (Masked): {cel.phoneMasked}</p>
                        <p>Care Cell: {cel.careCellGroup || 'Central Fellowship'}</p>
                      </div>

                      {/* Scripture Verse Quote */}
                      <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                        <span className="text-[10px] text-amber-400 uppercase font-bold block flex items-center gap-1">
                          <Sparkles size={11} />
                          Assigned Promise
                        </span>
                        <p className="text-slate-300 italic text-[11px] leading-relaxed">
                          &ldquo;{cel.assignedScriptureVerse}&rdquo;
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-slate-800/80">
                      <div className="flex items-center justify-between text-xs">
                        {/* Card Dispatched Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleCardDispatched(cel.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                            cel.cardDispatched
                              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          <CheckCircle2 size={12} className={cel.cardDispatched ? 'text-emerald-400' : 'text-slate-500'} />
                          <span>{cel.cardDispatched ? 'Card Dispatched' : 'Dispatch Card'}</span>
                        </button>

                        {/* WhatsApp Sent Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleWhatsappSent(cel.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                            cel.whatsappGreetingSent
                              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          <Send size={12} className={cel.whatsappGreetingSent ? 'text-emerald-400' : 'text-slate-500'} />
                          <span>{cel.whatsappGreetingSent ? 'WhatsApp Sent' : 'Send Greeting'}</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCelebration(cel);
                            setCelForm({
                              memberName: cel.memberName,
                              type: cel.type,
                              eventDate: cel.eventDate,
                              phoneMasked: cel.phoneMasked,
                              yearsMilestone: cel.yearsMilestone ?? 0,
                              assignedScriptureVerse: cel.assignedScriptureVerse,
                              careCellGroup: cel.careCellGroup || 'Bethel Central Care Cell',
                              notes: cel.notes || '',
                            });
                            setIsCelebrationModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1"
                        >
                          <Edit3 size={13} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCelebrationId(cel.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold flex items-center gap-1"
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
          )}

          {/* ================================================================= */}
          {/* TAB 2: PUSH NOTIFICATIONS & BROADCASTS                            */}
          {/* ================================================================= */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Bell size={16} className="text-emerald-400" />
                    <span>Church Push Announcements &amp; Broadcast Dispatch</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Segmented mobile broadcasts targeting care cells, teams, and congregation
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenCreateNotification}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition-colors shrink-0 shadow-md shadow-emerald-950/40"
                >
                  <Plus size={15} />
                  <span>New Push Broadcast</span>
                </button>
              </div>

              <div className="bg-[#0B192C]/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Broadcast Title &amp; Message</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Target Audience</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Reach / Open Rate</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {notifications.map((notif) => (
                        <tr key={notif.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 max-w-sm">
                            <span className="font-semibold text-white block">{notif.title}</span>
                            <span className="text-[11px] text-slate-400 block line-clamp-1">{notif.body}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-semibold text-slate-300">
                              {notif.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                            {notif.targetAudience}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                            {notif.scheduledOrSentDate}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {notif.status === 'Sent (Sim)' ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-bold text-emerald-300">
                                Sent
                              </span>
                            ) : notif.status === 'Scheduled (Sim)' ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-[10px] font-bold text-amber-300">
                                Scheduled
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-400">
                                Draft
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                            <span className="text-white font-bold block">{notif.recipientCount} devices</span>
                            <span className="text-[10px] text-emerald-400">{notif.readRatePct}% open rate</span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingNotification(notif);
                                  setNotifForm({
                                    title: notif.title,
                                    body: notif.body,
                                    category: notif.category,
                                    targetAudience: notif.targetAudience,
                                    scheduledOrSentDate: notif.scheduledOrSentDate,
                                    status: notif.status,
                                  });
                                  setIsNotificationModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingNotificationId(notif.id)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-rose-300 transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 3: WHATSAPP INBOX SIMULATION                                  */}
          {/* ================================================================= */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-4">
              {/* Mandatory Governance Watermark Banner */}
              <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-3.5 flex items-center gap-3 text-xs text-amber-200">
                <AlertTriangle size={18} className="text-amber-400 shrink-0" />
                <p>
                  <strong>WORKFLOW TRAINING SIMULATION:</strong> All conversations, pastoral threads, and contact responses are synthetic demonstration logs. No genuine WhatsApp API endpoints or live message broadcasts are invoked.
                </p>
              </div>

              {/* Dual-Pane WhatsApp Layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 bg-[#0B192C]/90 border border-slate-800 rounded-3xl overflow-hidden min-h-[520px] shadow-xl">
                {/* Left: Contacts Roster */}
                <div className="border-r border-slate-800 flex flex-col">
                  <div className="p-4 border-b border-slate-800 bg-slate-900/80">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Pastoral Inquiries Feed
                    </h3>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                      <input
                        type="text"
                        placeholder="Search chats or members..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="divide-y divide-slate-800/80 flex-1 overflow-y-auto">
                    {whatsappChats.map((chat) => (
                      <div
                        key={chat.id}
                        onClick={() => setActiveChatId(chat.id)}
                        className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                          activeChat.id === chat.id ? 'bg-slate-800/80' : 'hover:bg-slate-900/60'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-full ${chat.avatarBg} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                          {chat.contactName.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-white truncate">{chat.contactName}</h4>
                            <span className="text-[10px] text-slate-400 font-mono">{chat.timestamp}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {chat.lastMessageSnippet}
                          </p>
                          <span className="text-[10px] text-slate-500 font-mono block mt-1">
                            {chat.phoneMasked}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Active Chat Thread & Composer */}
                <div className="md:col-span-2 flex flex-col justify-between bg-slate-950/60">
                  {/* Chat Header */}
                  <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full ${activeChat.avatarBg} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                        {activeChat.contactName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{activeChat.contactName}</h4>
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                          Online (Simulated) · {activeChat.phoneMasked}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-400">
                      Demonstration WhatsApp Channel
                    </span>
                  </div>

                  {/* Messages Scroll Area */}
                  <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                    {activeChat.messages.map((m) => (
                      <div
                        key={m.id}
                        className={`flex flex-col ${m.sender === 'admin' ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-md rounded-2xl px-3.5 py-2.5 text-xs shadow-sm ${
                            m.sender === 'admin'
                              ? 'bg-emerald-700 text-white rounded-br-none'
                              : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                          }`}
                        >
                          <p className="leading-relaxed">{m.text}</p>
                          <div className="flex items-center justify-end gap-1 mt-1 text-[9px] opacity-80 font-mono">
                            <span>{m.timestamp}</span>
                            {m.sender === 'admin' && <CheckCheck size={12} className="text-cyan-300" />}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Quick Reply Chips */}
                  <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-900/40 flex flex-wrap gap-2 text-[11px]">
                    <span className="text-slate-400 self-center text-[10px] uppercase font-bold">Quick Templates:</span>
                    {[
                      'Praying for you and your family! God bless you abundantly.',
                      'Amen! Looking forward to fellowship this Sunday.',
                      'Thank you for reaching out. We will pray over this request.',
                    ].map((snippet, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleInsertQuickReply(snippet)}
                        className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      >
                        {snippet.slice(0, 32)}...
                      </button>
                    ))}
                  </div>

                  {/* Reply Input Composer */}
                  <form onSubmit={handleSendWhatsAppReply} className="p-3 border-t border-slate-800 bg-slate-900 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Type a pastoral WhatsApp response (Simulated)..."
                      value={replyInputText}
                      onChange={(e) => setReplyInputText(e.target.value)}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md"
                    >
                      <Send size={13} />
                      <span>Send</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 4: GALLERY MANAGEMENT (ZERO EXTERNAL IMAGES - PURE CSS/SVG)   */}
          {/* ================================================================= */}
          {activeTab === 'gallery' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ImageIcon size={16} className="text-purple-400" />
                    <span>Church Life Gallery Albums &amp; Simulated Media Assets</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Local CSS/SVG gradient visual cards · Zero external network image dependencies
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleStartSimulatedUpload}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                  >
                    <Upload size={14} className="text-purple-400" />
                    <span>Simulate Photo Upload</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenCreateAlbum}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 transition-colors shadow-md shadow-purple-950/40"
                  >
                    <Plus size={15} />
                    <span>Create Album</span>
                  </button>
                </div>
              </div>

              {/* Album Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {galleryAlbums.map((alb) => (
                  <div
                    key={alb.id}
                    className="bg-[#0B192C]/90 border border-slate-800 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between"
                  >
                    {/* Thematic Pure CSS/SVG Card Header (No External URLs) */}
                    <div
                      className={`h-40 bg-gradient-to-br ${alb.gradientTheme} p-4 flex flex-col justify-between relative border-b border-slate-800`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full bg-black/40 backdrop-blur-xs border border-white/20 text-[10px] font-bold text-white">
                          {alb.category}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-black/40 text-[10px] font-mono font-bold text-purple-300">
                          {alb.photoCount} Photos
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/60 block">
                          Thematic Visual
                        </span>
                        <p className="text-xs text-white/90 line-clamp-1 italic font-medium">
                          &ldquo;{alb.coverImageTheme}&rdquo;
                        </p>
                      </div>
                    </div>

                    <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <h4 className="text-sm font-bold text-white">{alb.albumTitle}</h4>
                        <p className="text-xs text-slate-400 line-clamp-2">{alb.description}</p>
                      </div>

                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                        <span className="font-mono text-[11px]">{alb.eventDate}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAlbum(alb);
                              setAlbumForm({
                                albumTitle: alb.albumTitle,
                                category: alb.category,
                                eventDate: alb.eventDate,
                                photographerName: alb.photographerName,
                                description: alb.description,
                                gradientTheme: alb.gradientTheme,
                              });
                              setIsAlbumModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingAlbumId(alb.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-rose-300 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 5: ONLINE MEETINGS MANAGEMENT                                */}
          {/* ================================================================= */}
          {activeTab === 'meetings' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Video size={16} className="text-cyan-400" />
                    <span>Virtual Prayer Vigils &amp; Bible Expositions</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Manage Google Meet, Zoom, and YouTube Live virtual church rooms
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenCreateMeeting}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-2 transition-colors shrink-0 shadow-md shadow-cyan-950/40"
                >
                  <Plus size={15} />
                  <span>Schedule Virtual Meeting</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {onlineMeetings.map((meet) => (
                  <div
                    key={meet.id}
                    className="bg-[#0B192C]/85 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 space-y-4 shadow-sm transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-[10px] font-bold text-cyan-300">
                            {meet.platform}
                          </span>
                          <h4 className="text-sm font-bold text-white mt-1.5">{meet.title}</h4>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            meet.status === 'Live (Simulated)'
                              ? 'bg-rose-950 text-rose-300 border border-rose-500/40 animate-pulse'
                              : 'bg-slate-900 text-slate-300 border border-slate-800'
                          }`}
                        >
                          {meet.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-2">{meet.description}</p>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-1">
                        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
                          <span className="text-[10px] text-slate-500 block uppercase font-bold">Schedule</span>
                          <span className="font-mono">{meet.meetingDate} · {meet.meetingTime}</span>
                        </div>
                        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
                          <span className="text-[10px] text-slate-500 block uppercase font-bold">Host Minister</span>
                          <span className="truncate block">{meet.hostName}</span>
                        </div>
                      </div>

                      {/* URL Box */}
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                        <span className="font-mono text-cyan-400 truncate max-w-[220px]">
                          {meet.meetingUrl}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyMeetingLink(meet.meetingUrl)}
                          className="p-1 rounded text-slate-400 hover:text-white"
                          title="Copy meeting link"
                        >
                          <Copy size={13} />
                        </button>
                      </div>

                      {meet.passcodeProtected && (
                        <p className="text-[10px] text-amber-300 font-mono">
                          Passcode Protected: <strong>{meet.passcode}</strong>
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-mono">
                        {meet.registeredAttendeesCount} Attending (Sim)
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMeeting(meet);
                            setMeetForm({
                              title: meet.title,
                              platform: meet.platform,
                              meetingDate: meet.meetingDate,
                              meetingTime: meet.meetingTime,
                              hostName: meet.hostName,
                              meetingUrl: meet.meetingUrl,
                              passcodeProtected: meet.passcodeProtected,
                              passcode: meet.passcode,
                              status: meet.status,
                              description: meet.description,
                            });
                            setIsMeetingModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingMeetingId(meet.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-rose-300 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* MODALS                                                            */}
          {/* ================================================================= */}

          {/* 1. Celebration Modal */}
          {isCelebrationModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#0B192C] border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <PartyPopper className="text-amber-400" size={16} />
                    <span>{editingCelebration ? 'Edit Celebration Milestone' : 'Add Celebration Milestone'}</span>
                  </h3>
                  <button type="button" onClick={() => setIsCelebrationModalOpen(false)} className="text-slate-400 hover:text-white">
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleSaveCelebration} className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Member Name (Synthetic) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sister Deborah Samuel (Demo)"
                      value={celForm.memberName}
                      onChange={(e) => setCelForm({ ...celForm, memberName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Celebration Type</label>
                      <select
                        value={celForm.type}
                        onChange={(e) => {
                          const nextType = e.target.value as M45CelebrationType;
                          setCelForm({
                            ...celForm,
                            type: nextType,
                            yearsMilestone: nextType === 'Baby Dedication' && !editingCelebration ? 0 : celForm.yearsMilestone,
                          });
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="Birthday">Birthday</option>
                        <option value="Wedding Anniversary">Wedding Anniversary</option>
                        <option value="Baptism Jubilee">Baptism Jubilee</option>
                        <option value="Baby Dedication">Baby Dedication</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Date (MM-DD) *</label>
                      <input
                        type="text"
                        required
                        placeholder="MM-DD e.g. 11-28"
                        value={celForm.eventDate}
                        onChange={(e) => setCelForm({ ...celForm, eventDate: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Phone (Masked)</label>
                      <input
                        type="text"
                        value={celForm.phoneMasked}
                        onChange={(e) => setCelForm({ ...celForm, phoneMasked: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Years Milestone (0 if N/A)</label>
                      <input
                        type="number"
                        min={0}
                        value={celForm.yearsMilestone}
                        onChange={(e) => setCelForm({ ...celForm, yearsMilestone: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Assigned Scripture Verse</label>
                    <textarea
                      rows={2}
                      value={celForm.assignedScriptureVerse}
                      onChange={(e) => setCelForm({ ...celForm, assignedScriptureVerse: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCelebrationModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold">
                      Save Milestone
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 2. Notification Modal */}
          {isNotificationModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#0B192C] border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Bell className="text-emerald-400" size={16} />
                    <span>{editingNotification ? 'Edit Push Broadcast' : 'Create Push Broadcast'}</span>
                  </h3>
                  <button type="button" onClick={() => setIsNotificationModalOpen(false)} className="text-slate-400 hover:text-white">
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleSaveNotification} className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Broadcast Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sunday Morning Miracle Service Alert"
                      value={notifForm.title}
                      onChange={(e) => setNotifForm({ ...notifForm, title: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Message Body *</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Enter mobile push announcement text..."
                      value={notifForm.body}
                      onChange={(e) => setNotifForm({ ...notifForm, body: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Category</label>
                      <select
                        value={notifForm.category}
                        onChange={(e) => setNotifForm({ ...notifForm, category: e.target.value as NotificationCategory })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Announcements">Announcements</option>
                        <option value="Events">Events</option>
                        <option value="Prayer">Prayer</option>
                        <option value="Attendance">Attendance</option>
                        <option value="General">General</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Target Audience</label>
                      <select
                        value={notifForm.targetAudience}
                        onChange={(e) => setNotifForm({ ...notifForm, targetAudience: e.target.value as NotificationAudience })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="All Registered Members">All Registered Members</option>
                        <option value="Care Cell Leaders">Care Cell Leaders</option>
                        <option value="Worship & Media Team">Worship &amp; Media Team</option>
                        <option value="Youth & Teens">Youth &amp; Teens</option>
                        <option value="Parents Group">Parents Group</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Date</label>
                      <input
                        type="date"
                        value={notifForm.scheduledOrSentDate}
                        onChange={(e) => setNotifForm({ ...notifForm, scheduledOrSentDate: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Status</label>
                      <select
                        value={notifForm.status}
                        onChange={(e) => setNotifForm({ ...notifForm, status: e.target.value as NotificationStatus })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Scheduled (Sim)">Scheduled (Sim)</option>
                        <option value="Sent (Sim)">Sent (Sim)</option>
                        <option value="Draft (Sim)">Draft (Sim)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsNotificationModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                      Save Broadcast
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 3. Album Modal */}
          {isAlbumModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#0B192C] border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ImageIcon className="text-purple-400" size={16} />
                    <span>{editingAlbum ? 'Edit Gallery Album' : 'Create Gallery Album'}</span>
                  </h3>
                  <button type="button" onClick={() => setIsAlbumModalOpen(false)} className="text-slate-400 hover:text-white">
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleSaveAlbum} className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Album Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Christmas Carol Festival 2026"
                      value={albumForm.albumTitle}
                      onChange={(e) => setAlbumForm({ ...albumForm, albumTitle: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Category</label>
                      <select
                        value={albumForm.category}
                        onChange={(e) => setAlbumForm({ ...albumForm, category: e.target.value as ExtendedGalleryAlbum['category'] })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                      >
                        <option value="Worship Services">Worship Services</option>
                        <option value="Youth & Camps">Youth &amp; Camps</option>
                        <option value="Missions & Outreach">Missions &amp; Outreach</option>
                        <option value="Seasonal Celebrations">Seasonal Celebrations</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Event Date</label>
                      <input
                        type="date"
                        value={albumForm.eventDate}
                        onChange={(e) => setAlbumForm({ ...albumForm, eventDate: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Photographer Credit</label>
                    <input
                      type="text"
                      value={albumForm.photographerName}
                      onChange={(e) => setAlbumForm({ ...albumForm, photographerName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Thematic CSS Gradient Theme</label>
                    <select
                      value={albumForm.gradientTheme}
                      onChange={(e) => setAlbumForm({ ...albumForm, gradientTheme: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="from-emerald-950 via-slate-900 to-[#0B192C]">Emerald Sanctuary Deep</option>
                      <option value="from-amber-900 via-slate-900 to-[#0B192C]">Amber Campfire Sunset</option>
                      <option value="from-cyan-950 via-slate-900 to-[#0B192C]">Cyan Outreach River</option>
                      <option value="from-purple-950 via-slate-900 to-[#0B192C]">Regal Violet Glory</option>
                    </select>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAlbumModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold">
                      Save Album
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 4. Simulated Upload Progress Modal */}
          {isSimulatedUploadOpen && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#0B192C] border border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-center">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto border border-purple-500/20">
                  <Upload size={24} className="animate-bounce" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Simulating Client-Side Photo Ingestion</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Ingesting local vectors &amp; gradients without Firebase Storage network calls...
                  </p>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span className="text-[10px] text-purple-300 font-mono font-bold block">
                  {uploadProgress}% Complete (Simulated)
                </span>
              </div>
            </div>
          )}

          {/* 5. Online Meeting Modal */}
          {isMeetingModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#0B192C] border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Video className="text-cyan-400" size={16} />
                    <span>{editingMeeting ? 'Edit Virtual Meeting' : 'Schedule Virtual Meeting'}</span>
                  </h3>
                  <button type="button" onClick={() => setIsMeetingModalOpen(false)} className="text-slate-400 hover:text-white">
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleSaveMeeting} className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Session Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Wednesday Night Virtual Prayer Fellowship"
                      value={meetForm.title}
                      onChange={(e) => setMeetForm({ ...meetForm, title: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Platform</label>
                      <select
                        value={meetForm.platform}
                        onChange={(e) => setMeetForm({ ...meetForm, platform: e.target.value as ExtendedOnlineMeeting['platform'] })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="Google Meet (Sim)">Google Meet (Sim)</option>
                        <option value="Zoom Video (Sim)">Zoom Video (Sim)</option>
                        <option value="YouTube Live (Sim)">YouTube Live (Sim)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Meeting Status</label>
                      <select
                        value={meetForm.status}
                        onChange={(e) => setMeetForm({ ...meetForm, status: e.target.value as MeetingStatus })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="Scheduled">Scheduled</option>
                        <option value="Live (Simulated)">Live (Simulated)</option>
                        <option value="Completed">Completed</option>
                        <option value="Draft">Draft</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Date</label>
                      <input
                        type="date"
                        value={meetForm.meetingDate}
                        onChange={(e) => setMeetForm({ ...meetForm, meetingDate: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Time</label>
                      <input
                        type="text"
                        placeholder="e.g. 07:00 PM"
                        value={meetForm.meetingTime}
                        onChange={(e) => setMeetForm({ ...meetForm, meetingTime: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Synthetic Room URL</label>
                    <input
                      type="text"
                      value={meetForm.meetingUrl}
                      onChange={(e) => setMeetForm({ ...meetForm, meetingUrl: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        id="passCheck"
                        checked={meetForm.passcodeProtected}
                        onChange={(e) => setMeetForm({ ...meetForm, passcodeProtected: e.target.checked })}
                        className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                      />
                      <label htmlFor="passCheck" className="text-slate-300 select-none">
                        Passcode Protected
                      </label>
                    </div>
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Passcode</label>
                      <input
                        type="text"
                        disabled={!meetForm.passcodeProtected}
                        value={meetForm.passcode}
                        onChange={(e) => setMeetForm({ ...meetForm, passcode: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono disabled:opacity-50 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsMeetingModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold">
                      Save Meeting
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 6. Confirm Delete Celebrations */}
          {deletingCelebrationId && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#0B192C] border border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Delete Celebration Milestone?</h3>
                  <p className="text-xs text-slate-400 mt-1">This will remove the milestone from the pastoral blessing queue.</p>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setDeletingCelebrationId(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold">Cancel</button>
                  <button type="button" onClick={handleConfirmDeleteCelebration} className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold">Delete</button>
                </div>
              </div>
            </div>
          )}

          {/* 7. Confirm Delete Notification */}
          {deletingNotificationId && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#0B192C] border border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Delete Broadcast?</h3>
                  <p className="text-xs text-slate-400 mt-1">This will permanently remove the simulated broadcast record.</p>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setDeletingNotificationId(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold">Cancel</button>
                  <button type="button" onClick={handleConfirmDeleteNotification} className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold">Delete</button>
                </div>
              </div>
            </div>
          )}

          {/* 8. Confirm Delete Album */}
          {deletingAlbumId && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#0B192C] border border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Delete Gallery Album?</h3>
                  <p className="text-xs text-slate-400 mt-1">This will remove the album curation and its simulated photos.</p>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setDeletingAlbumId(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold">Cancel</button>
                  <button type="button" onClick={handleConfirmDeleteAlbum} className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold">Delete</button>
                </div>
              </div>
            </div>
          )}

          {/* 9. Confirm Delete Meeting */}
          {deletingMeetingId && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#0B192C] border border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Cancel &amp; Delete Meeting?</h3>
                  <p className="text-xs text-slate-400 mt-1">This will remove the virtual service session from the schedule.</p>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setDeletingMeetingId(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold">Cancel</button>
                  <button type="button" onClick={handleConfirmDeleteMeeting} className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold">Delete</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminNavigationShell>
    </ProtectedRoute>
  );
}
