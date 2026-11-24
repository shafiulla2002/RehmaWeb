import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  limit,
  orderBy,
  DocumentData,
} from 'firebase/firestore';

export interface LivePromise {
  id: string;
  verse: string;
  verseTelugu?: string;
  reference: string;
  referenceTe?: string;
  date: string;
  devotionalNote?: string;
  pastor?: string;
  youtubeId?: string;
  imageUrl?: string;
  status?: string;
  theme?: string;
}

export interface LiveDailyVerse {
  id: string;
  verseEn: string;
  verseTe: string;
  referenceEn: string;
  referenceTe: string;
  slot?: string;
  index?: number;
}

export interface LiveSermon {
  id: string;
  title: string;
  titleTe?: string;
  pastor: string;
  date: string;
  duration?: string;
  description?: string;
  scripture?: string;
  youtubeId?: string;
  thumbnailUrl?: string;
  notesUrl?: string;
  notesFileName?: string;
  status?: string;
  categories?: string;
}

export interface LiveWorshipSong {
  id: string;
  title: string;
  titleTe?: string;
  artist?: string;
  key?: string;
  lyricsTe?: string;
  lyricsEn?: string;
  timeSignature?: string;
  category?: string;
  youtubeId?: string;
  status?: string;
  isChurchOwn?: boolean;
}

export interface LiveEvent {
  id: string;
  title: string;
  titleTe?: string;
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  time?: string;
  location?: string;
  address?: string;
  description?: string;
  type?: string;
  category?: string;
  bannerUrl?: string;
  status?: string;
  rsvpEnabled?: boolean;
}

/** Helper: Extract clean YouTube ID from full URL or return as-is */
export function extractYoutubeId(val?: string): string {
  if (!val) return '';
  const trimmed = val.trim();
  if (!trimmed.includes('youtube.com') && !trimmed.includes('youtu.be')) {
    return trimmed;
  }
  const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|live\/|shorts\/))([\w-]{11})/);
  return match ? match[1] : trimmed;
}

/** Helper: Format ISO date string or timestamp to human date */
export function formatFriendlyDate(val?: any): string {
  if (!val) return '';
  let d: Date;
  if (val.toDate && typeof val.toDate === 'function') {
    d = val.toDate();
  } else if (val.seconds) {
    d = new Date(val.seconds * 1000);
  } else {
    d = new Date(val);
  }
  if (isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─────────────────────────────────────────────────────────────
// 1. M05: Promises
// ─────────────────────────────────────────────────────────────
export async function getLivePromises(max = 50): Promise<LivePromise[]> {
  try {
    const colRef = collection(db, 'Rhema Church', 'rhema', 'promises');
    const snap = await getDocs(query(colRef, limit(max)));
    const list: LivePromise[] = [];
    snap.forEach((d) => {
      const data = d.data();
      list.push({
        id: d.id,
        verse: data.verse || data.content || '',
        verseTelugu: data.verseTelugu || data.contentTe || '',
        reference: data.verseReferenceEn || data.reference || data.verseReference || '',
        referenceTe: data.verseReferenceTe || data.referenceTe || '',
        date: data.date || data.scheduledDate || '',
        devotionalNote: data.devotionalNote || '',
        pastor: data.pastor || '',
        youtubeId: extractYoutubeId(data.youtubeId),
        imageUrl: data.imageUrl || data.thumbnailUrl || '',
        status: data.status || 'Published',
        theme: data.theme || '#1E3A8A',
      });
    });
    // Sort descending by date
    return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  } catch (err) {
    console.error('[firestoreService] Failed to load promises:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────
// 2. M06: Daily Verses
// ─────────────────────────────────────────────────────────────
export async function getLiveDailyVerses(max = 20): Promise<LiveDailyVerse[]> {
  try {
    const colRef = collection(db, 'daily_verses');
    const snap = await getDocs(query(colRef, limit(max)));
    const list: LiveDailyVerse[] = [];
    snap.forEach((d) => {
      const data = d.data();
      list.push({
        id: d.id,
        verseEn: data.verseEn || data.verseText || '',
        verseTe: data.verseTe || data.verseTextTe || '',
        referenceEn: data.referenceEn || data.reference || '',
        referenceTe: data.referenceTe || data.referenceTelugu || '',
        slot: data.slot || '',
        index: data.index,
      });
    });
    return list;
  } catch (err) {
    console.error('[firestoreService] Failed to load daily verses:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────
// 3. M07: Sermons
// ─────────────────────────────────────────────────────────────
export async function getLiveSermons(max = 50): Promise<LiveSermon[]> {
  try {
    const colRef = collection(db, 'Rhema Church', 'rhema', 'sermons');
    const snap = await getDocs(query(colRef, limit(max)));
    const list: LiveSermon[] = [];
    snap.forEach((d) => {
      const data = d.data();
      list.push({
        id: d.id,
        title: data.title || data.titleEn || 'Sunday Sermon',
        titleTe: data.titleTe || data.titleTelugu || '',
        pastor: data.pastor || 'Pastor',
        date: data.date || (data.publishedAt ? data.publishedAt.slice(0, 10) : ''),
        duration: data.duration ? `${data.duration}m` : '45m',
        description: data.description || '',
        scripture: data.scripture || data.ref || '',
        youtubeId: extractYoutubeId(data.youtubeId),
        thumbnailUrl: data.thumbnailUrl || data.imageUrl || '',
        notesUrl: data.notesUrl || '',
        notesFileName: data.notesFileName || '',
        status: data.status || 'Published',
        categories: data.categories || '',
      });
    });
    return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  } catch (err) {
    console.error('[firestoreService] Failed to load sermons:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────
// 4. M08: Worship Songs
// ─────────────────────────────────────────────────────────────
export async function getLiveWorshipSongs(max = 100): Promise<LiveWorshipSong[]> {
  try {
    const churchColRef = collection(db, 'Rhema Church', 'rhema', 'worshipSongs');
    const snap = await getDocs(query(churchColRef, limit(max)));
    const list: LiveWorshipSong[] = [];
    snap.forEach((d) => {
      const data = d.data();
      list.push({
        id: d.id,
        title: data.title || data.titleEn || '',
        titleTe: data.titleTe || '',
        artist: data.artist || '',
        key: data.key || '',
        lyricsTe: data.lyricsTe || '',
        lyricsEn: data.lyricsEn || '',
        timeSignature: data.timeSignature || '',
        category: data.category || '',
        youtubeId: extractYoutubeId(data.youtubeId),
        status: data.status || 'Published',
        isChurchOwn: true,
      });
    });

    // Optional masterSongs fallback if authenticated and available
    try {
      const masterColRef = collection(db, 'masterSongs');
      const masterSnap = await getDocs(query(masterColRef, limit(20)));
      masterSnap.forEach((d) => {
        const data = d.data();
        if (!list.some((s) => s.id === d.id)) {
          list.push({
            id: d.id,
            title: data.title || data.titleEn || '',
            titleTe: data.titleTe || '',
            artist: data.artist || '',
            key: data.key || '',
            lyricsTe: data.lyricsTe || '',
            lyricsEn: data.lyricsEn || '',
            timeSignature: data.timeSignature || '',
            category: data.category || '',
            youtubeId: extractYoutubeId(data.youtubeId),
            status: data.status || 'Published',
            isChurchOwn: false,
          });
        }
      });
    } catch {
      // Graceful ignore masterSongs fallback if unauthorized
    }

    return list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  } catch (err) {
    console.error('[firestoreService] Failed to load songs:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────
// 5. M09: Events
// ─────────────────────────────────────────────────────────────
export async function getLiveEvents(max = 50): Promise<LiveEvent[]> {
  try {
    const colRef = collection(db, 'Rhema Church', 'rhema', 'events');
    const snap = await getDocs(query(colRef, limit(max)));
    const list: LiveEvent[] = [];
    snap.forEach((d) => {
      const data = d.data();
      list.push({
        id: d.id,
        title: data.title || data.name || '',
        titleTe: data.titleTe || data.titleTelugu || '',
        date: data.date || '',
        endDate: data.endDate || '',
        startTime: data.startTime || '',
        endTime: data.endTime || '',
        time: data.time || (data.startTime ? data.startTime : ''),
        location: data.location || data.address || data.venue || 'Rhema Church',
        address: data.address || '',
        description: data.description || data.descEn || '',
        type: data.type || data.eventType || 'Service',
        category: data.category || '',
        bannerUrl: data.bannerUrl || data.image || '',
        status: data.status || 'Published',
        rsvpEnabled: Boolean(data.rsvpEnabled),
      });
    });
    return list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  } catch (err) {
    console.error('[firestoreService] Failed to load events:', err);
    throw err;
  }
}


// ==========================================
// PHASE 2B-1: CARE CELLS, MEETINGS, GALLERY, CELEBRATIONS
// ==========================================

export interface LiveCareCell {
  id: string;
  name: string;
  cellCode?: string;
  description?: string;
  zone?: string;
  location?: string;
  meetingLocation?: string;
  leaderName: string;
  leaderPhone?: string;
  leaderPhoto?: string;
  meetingDay: string;
  meetingTime: string;
  meetingEndTime?: string;
  maximumMembers?: number;
  status: string;
}

export async function getLiveCareCells(churchId = 'rhema'): Promise<LiveCareCell[]> {
  try {
    const colRef = collection(db, 'Rhema Church', churchId, 'careCells');
    const snap = await getDocs(colRef);
    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name || 'Care Cell',
        cellCode: data.cellCode || '',
        description: data.description || '',
        zone: data.location || data.locality || 'General',
        location: data.location || data.meetingLocation || '',
        meetingLocation: data.meetingLocation || data.location || data.address || '',
        leaderName: data.leaderName || 'Cell Leader',
        leaderPhone: data.leaderPhone || '',
        leaderPhoto: data.leaderPhoto || '',
        meetingDay: data.meetingDay || 'Friday',
        meetingTime: data.meetingTime || '',
        meetingEndTime: data.meetingEndTime || '',
        maximumMembers: data.maximumMembers || 20,
        status: data.status || 'Active',
      };
    });
  } catch (err) {
    console.error('[firestoreService] Failed to load care cells:', err);
    throw err;
  }
}

export interface LiveOnlineMeeting {
  id: string;
  title: string;
  topic?: string;
  platform: 'Google Meet' | 'Zoom' | 'YouTube Live' | string;
  provider?: string;
  meetingType?: string;
  scheduledDate?: string;
  date?: string;
  startTimeLabel?: string;
  endTimeLabel?: string;
  time?: string;
  host?: string;
  teacherName?: string;
  link: string;
  meetingUrl?: string;
  meetingId?: string;
  passcode?: string;
  description?: string;
  status: 'live' | 'scheduled' | 'ended' | string;
}

export async function getLiveOnlineMeetings(churchId = 'rhema'): Promise<LiveOnlineMeeting[]> {
  try {
    const colRef = collection(db, 'Rhema Church', churchId, 'online_meetings');
    const snap = await getDocs(colRef);
    return snap.docs.map(d => {
      const data = d.data();
      const rawPlatform = data.provider || data.platform || data.meetingType || 'Google Meet';
      let cleanPlatform = 'Google Meet';
      const pLower = String(rawPlatform).toLowerCase();
      if (pLower.includes('zoom')) cleanPlatform = 'Zoom';
      else if (pLower.includes('youtube') || pLower.includes('live')) cleanPlatform = 'YouTube Live';
      else if (pLower.includes('meet')) cleanPlatform = 'Google Meet';

      const timeLabel = data.startTimeLabel 
        ? `${data.startTimeLabel}${data.endTimeLabel ? ' – ' + data.endTimeLabel : ''}`
        : (data.time || 'Schedule announced');

      return {
        id: d.id,
        title: data.title || data.topic || 'Church Online Meeting',
        topic: data.topic || data.title || '',
        platform: cleanPlatform,
        provider: data.provider || cleanPlatform,
        meetingType: data.meetingType || '',
        scheduledDate: data.scheduledDate || data.date || '',
        date: data.date || data.scheduledDate || '',
        startTimeLabel: data.startTimeLabel || '',
        endTimeLabel: data.endTimeLabel || '',
        time: timeLabel,
        host: data.teacherName || data.host || 'Church Pastor',
        teacherName: data.teacherName || data.host || '',
        link: data.meetingUrl || data.meetingLink || data.url || '',
        meetingUrl: data.meetingUrl || data.meetingLink || data.url || '',
        meetingId: data.meetingId || data.id || '',
        passcode: data.passcode || '',
        description: data.description || '',
        status: String(data.status || 'scheduled').toLowerCase(),
      };
    });
  } catch (err) {
    console.error('[firestoreService] Failed to load online meetings:', err);
    throw err;
  }
}

export interface LiveGalleryAlbum {
  id: string;
  title: string;
  name?: string;
  category?: string;
  description?: string;
  coverImage: string;
  coverPhotoUrl?: string;
  photoCount: number;
  date?: string;
  createdAt?: string;
  visibility?: string;
}

export interface LiveGalleryPhoto {
  id: string;
  url: string;
  photoUrl?: string;
  caption?: string;
  uploadedBy?: string;
  createdAt?: any;
}

export async function getLiveGalleryAlbums(churchId = 'rhema'): Promise<LiveGalleryAlbum[]> {
  try {
    const colRef = collection(db, 'Rhema Church', churchId, 'gallery_albums');
    const snap = await getDocs(colRef);
    return snap.docs.map(d => {
      const data = d.data();
      const rawDate = formatFriendlyDate(data.createdAt || data.date);
      return {
        id: d.id,
        title: data.name || data.title || 'Church Album',
        name: data.name || data.title || 'Church Album',
        category: data.category || 'Worship Services',
        description: data.description || '',
        coverImage: data.coverPhotoUrl || data.coverUrl || data.coverImage || '',
        coverPhotoUrl: data.coverPhotoUrl || data.coverUrl || '',
        photoCount: data.photoCount || 0,
        date: rawDate,
        createdAt: rawDate,
        visibility: data.visibility || 'Public',
      };
    });
  } catch (err) {
    console.error('[firestoreService] Failed to load gallery albums:', err);
    throw err;
  }
}

export async function getAlbumPhotos(albumId: string, churchId = 'rhema'): Promise<LiveGalleryPhoto[]> {
  try {
    const colRef = collection(db, 'Rhema Church', churchId, 'gallery_albums', albumId, 'photos');
    const snap = await getDocs(colRef);
    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        url: data.url || data.photoUrl || '',
        photoUrl: data.photoUrl || data.url || '',
        caption: data.caption || '',
        uploadedBy: data.uploadedBy || '',
        createdAt: formatFriendlyDate(data.createdAt),
      };
    });
  } catch (err) {
    console.error('[firestoreService] Failed to load album photos:', err);
    return [];
  }
}

export interface LiveCelebrant {
  id: string;
  name: string;
  type: 'Birthday' | 'Wedding Anniversary';
  dateLabel: string;
  photoUrl?: string;
  careCell?: string;
  isToday: boolean;
  daysUntil: number;
}

export async function getLiveCelebrations(churchId = 'rhema'): Promise<LiveCelebrant[]> {
  try {
    const results: LiveCelebrant[] = [];
    
    // 1. Check live_celebrations collection
    const liveCol = collection(db, 'Rhema Church', churchId, 'live_celebrations');
    const liveSnap = await getDocs(liveCol);
    liveSnap.forEach(d => {
      const data = d.data();
      results.push({
        id: d.id,
        name: data.memberName || data.name || 'Church Member',
        type: data.type === 'anniversary' ? 'Wedding Anniversary' : 'Birthday',
        dateLabel: data.date || data.scheduledDate || 'Today',
        photoUrl: data.photoUrl || data.profileImageUrl || '',
        careCell: data.careCell || 'Rhema Church',
        isToday: true,
        daysUntil: 0
      });
    });

    // 2. Also check members collection for active celebrations (matches mobile FirestoreService.ts)
    try {
      const membersCol = collection(db, 'Rhema Church', churchId, 'members');
      const memSnap = await getDocs(membersCol);
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentDay = now.getDate();

      memSnap.forEach(d => {
        const data = d.data();
        const memberName = data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Church Member';
        const photo = data.profilePhoto || data.profileImageUrl || data.photoURL || '';

        // Check Birthday
        const rawDob = data.dob || data.birthdate || data.dateOfBirth;
        if (rawDob && typeof rawDob === 'string') {
          const parts = rawDob.split(/[-/]/);
          if (parts.length >= 2) {
            let m = 0, day = 0;
            if (parts[0].length === 4) {
              m = parseInt(parts[1], 10);
              day = parseInt(parts[2], 10);
            } else if (parts[2].length === 4) {
              day = parseInt(parts[0], 10);
              m = parseInt(parts[1], 10);
            }
            if (m > 0 && day > 0) {
              const isToday = m === currentMonth && day === currentDay;
              let diff = (m - currentMonth) * 30 + (day - currentDay);
              if (diff < 0) diff += 365;
              if (diff >= 0 && diff <= 30) {
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                results.push({
                  id: `bday_${d.id}`,
                  name: memberName,
                  type: 'Birthday',
                  dateLabel: isToday ? 'Today' : `${monthNames[m - 1]} ${day}`,
                  photoUrl: photo,
                  careCell: data.careCell || 'Rhema Member',
                  isToday,
                  daysUntil: diff
                });
              }
            }
          }
        }

        // Check Anniversary
        const rawAnniv = data.marriageDate || data.anniversaryDate || data.anniversary;
        if (rawAnniv && typeof rawAnniv === 'string') {
          const parts = rawAnniv.split(/[-/]/);
          if (parts.length >= 2) {
            let m = 0, day = 0;
            if (parts[0].length === 4) {
              m = parseInt(parts[1], 10);
              day = parseInt(parts[2], 10);
            } else if (parts[2].length === 4) {
              day = parseInt(parts[0], 10);
              m = parseInt(parts[1], 10);
            }
            if (m > 0 && day > 0) {
              const isToday = m === currentMonth && day === currentDay;
              let diff = (m - currentMonth) * 30 + (day - currentDay);
              if (diff < 0) diff += 365;
              if (diff >= 0 && diff <= 30) {
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                results.push({
                  id: `anniv_${d.id}`,
                  name: memberName,
                  type: 'Wedding Anniversary',
                  dateLabel: isToday ? 'Today' : `${monthNames[m - 1]} ${day}`,
                  photoUrl: photo,
                  careCell: data.careCell || 'Rhema Member',
                  isToday,
                  daysUntil: diff
                });
              }
            }
          }
        }
      });
    } catch (memErr) {
      // Ignored if permissions restrict members collection
    }

    return results.sort((a, b) => a.daysUntil - b.daysUntil);
  } catch (err) {
    console.error('[firestoreService] Failed to load celebrations:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────
// 10. M25: Notifications Inbox
// ─────────────────────────────────────────────────────────────
export interface LiveNotification {
  id: string;
  title: string;
  message: string;
  category: 'Church Broadcast' | 'Ministry Alert' | 'Care Cell' | 'Service Reminder';
  type?: string;
  targetMemberId?: string;
  createdAt: string;
  rawTimestamp?: number;
  actionLabel?: string;
  actionUrl?: string;
  isRead?: boolean;
}

export async function getLiveNotifications(targetMemberId?: string, churchId = 'rhema'): Promise<LiveNotification[]> {
  try {
    const list: LiveNotification[] = [];

    // Helper to categorize raw type string
    const mapCategory = (type?: string): LiveNotification['category'] => {
      const t = String(type || '').toLowerCase();
      if (t.includes('care_cell') || t.includes('carecell')) return 'Care Cell';
      if (t.includes('roster') || t.includes('service') || t.includes('duty')) return 'Service Reminder';
      if (t.includes('prayer') || t.includes('ministry') || t.includes('testimony') || t.includes('enrollment')) return 'Ministry Alert';
      return 'Church Broadcast';
    };

    // Helper to derive action link
    const mapAction = (type?: string, data?: DocumentData) => {
      const t = String(type || '').toLowerCase();
      if (t.includes('testimony')) return { label: 'View Testimonies', url: '/testimonies' };
      if (t.includes('prayer')) return { label: 'Go to Prayer Wall', url: '/prayer' };
      if (t.includes('care')) return { label: 'Open Care Cells', url: '/care-cells' };
      if (t.includes('duty') || t.includes('roster')) return { label: 'View Service Duties', url: '/service-duties' };
      if (t.includes('event')) return { label: 'View Events', url: '/events' };
      if (data?.actionUrl) return { label: data.actionLabel || 'View Details', url: data.actionUrl };
      return undefined;
    };

    // 1. Fetch Church-Wide / General Notifications
    const colRef = collection(db, 'Rhema Church', churchId, 'notifications');
    const snap = await getDocs(query(colRef, limit(50)));
    
    snap.forEach((d) => {
      const data = d.data();
      const action = mapAction(data.type, data);
      
      let rawMs = 0;
      if (data.createdAt?.toMillis) {
        rawMs = data.createdAt.toMillis();
      } else if (data.createdAt?.seconds) {
        rawMs = data.createdAt.seconds * 1000;
      } else if (typeof data.createdAt === 'string') {
        rawMs = new Date(data.createdAt).getTime() || 0;
      }

      list.push({
        id: d.id,
        title: data.title || 'Church Notification',
        message: data.body || data.content || data.message || '',
        category: mapCategory(data.type || data.category),
        type: data.type || '',
        targetMemberId: data.targetMemberId || data.targetAccountId || '',
        createdAt: formatFriendlyDate(data.createdAt),
        rawTimestamp: rawMs,
        actionLabel: action?.label,
        actionUrl: action?.url,
        isRead: Boolean(data.read || data.isRead),
      });
    });

    // 2. If targetMemberId provided, query member-specific notifications
    if (targetMemberId) {
      try {
        const memNotifRef = collection(db, 'Rhema Church', churchId, 'members', targetMemberId, 'notifications');
        const memSnap = await getDocs(query(memNotifRef, limit(30)));
        memSnap.forEach((d) => {
          if (!list.some((existing) => existing.id === d.id)) {
            const data = d.data();
            const action = mapAction(data.type, data);
            let rawMs = 0;
            if (data.createdAt?.toMillis) rawMs = data.createdAt.toMillis();
            else if (data.createdAt?.seconds) rawMs = data.createdAt.seconds * 1000;
            else if (typeof data.createdAt === 'string') rawMs = new Date(data.createdAt).getTime() || 0;

            list.push({
              id: d.id,
              title: data.title || 'Personal Alert',
              message: data.body || data.content || data.message || '',
              category: mapCategory(data.type || data.category),
              type: data.type || '',
              targetMemberId,
              createdAt: formatFriendlyDate(data.createdAt),
              rawTimestamp: rawMs,
              actionLabel: action?.label,
              actionUrl: action?.url,
              isRead: Boolean(data.read || data.isRead),
            });
          }
        });
      } catch {
        // Ignored if member notifications collection is empty or unpermitted
      }
    }

    return list.sort((a, b) => (b.rawTimestamp || 0) - (a.rawTimestamp || 0));
  } catch (err) {
    console.error('[firestoreService] Failed to load notifications:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────
// 11. M26: Read-Only Member Profile
// ─────────────────────────────────────────────────────────────
export interface LiveMemberProfile {
  id: string;
  uid?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  memberCode?: string;
  userType?: string;
  role?: string;
  status?: string;
  joinDate?: string;
  city?: string;
  district?: string;
  state?: string;
  careCell?: string;
  churchName?: string;
  dob?: string;
  anniversaryDate?: string;
  baptized?: boolean;
  baptismDate?: string;
  baptismChurch?: string;
  profilePhoto?: string;
}

export async function getLiveMemberProfile(uid: string, churchId = 'rhema'): Promise<LiveMemberProfile | null> {
  if (!uid) return null;
  try {
    const docRef = doc(db, 'Rhema Church', churchId, 'members', uid);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return null;
    }
    const data = snap.data();
    const fullName = data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Rhema Member';
    return {
      id: snap.id,
      uid: snap.id,
      name: fullName,
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      email: data.email || '',
      phone: data.phone || '',
      memberCode: data.memberCode || '',
      userType: data.userType || 'Member',
      role: data.role || data.userType || 'member',
      status: data.status || 'Active',
      joinDate: formatFriendlyDate(data.joinDate || data.approvedAt),
      city: data.city || data.locationData?.city || '',
      district: data.district || '',
      state: data.state || '',
      careCell: data.careCell || '',
      churchName: data.churchName || 'Rhema Church',
      dob: data.dob || '',
      anniversaryDate: data.anniversaryDate || data.marriageDate || '',
      baptized: Boolean(data.baptized),
      baptismDate: data.baptismDate || '',
      baptismChurch: data.baptismChurch || '',
      profilePhoto: data.profilePhoto || data.profileImageUrl || data.photoURL || '',
    };
  } catch (err) {
    console.error('[firestoreService] Failed to load member profile:', err);
    throw err;
  }
}

