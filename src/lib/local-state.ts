// lib/local-state.ts — Local adapter for deferred Firebase writes
// Prioritizes user safety: actions are stored locally until Firebase writes are approved.

type LocalKey = 'songbook_bookmarks' | 'rsvp_state' | 'bible_progress' | 'sermon_bells';

function getKey(key: LocalKey, uid?: string): string {
  return uid ? `rhema_${key}_${uid}` : `rhema_${key}`;
}

export function localGet<T>(key: LocalKey, uid?: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(getKey(key, uid));
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

export function localSet<T>(key: LocalKey, value: T, uid?: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getKey(key, uid), JSON.stringify(value));
  } catch {}
}

// Songbook bookmarks
export function getBookmarks(uid?: string): string[] {
  return localGet<string[]>('songbook_bookmarks', uid) ?? [];
}

export function toggleBookmark(songId: string, uid?: string): boolean {
  const current = getBookmarks(uid);
  const idx = current.indexOf(songId);
  if (idx >= 0) {
    current.splice(idx, 1);
  } else {
    current.push(songId);
  }
  localSet('songbook_bookmarks', current, uid);
  return idx < 0; // returns true if now bookmarked
}

// RSVP State
export type RsvpStatus = 'going' | 'interested' | 'not_going' | null;

export function getRsvp(eventId: string, uid?: string): RsvpStatus {
  const all = localGet<Record<string, RsvpStatus>>('rsvp_state', uid) ?? {};
  return all[eventId] ?? null;
}

export function setRsvp(eventId: string, status: RsvpStatus, uid?: string): void {
  const all = localGet<Record<string, RsvpStatus>>('rsvp_state', uid) ?? {};
  if (status === null) {
    delete all[eventId];
  } else {
    all[eventId] = status;
  }
  localSet('rsvp_state', all, uid);
}

// Sermon Bells
export function getSermonBell(sermonId: string, uid?: string): boolean {
  const all = localGet<Record<string, boolean>>('sermon_bells', uid) ?? {};
  return all[sermonId] ?? false;
}

export function toggleSermonBell(sermonId: string, uid?: string): boolean {
  const all = localGet<Record<string, boolean>>('sermon_bells', uid) ?? {};
  all[sermonId] = !all[sermonId];
  localSet('sermon_bells', all, uid);
  return all[sermonId];
}

// Bible Reading Progress
export interface BibleProgress {
  planId: string;
  currentDay: number;
  completedDays: number[];
}

export function getBibleProgress(uid?: string): BibleProgress | null {
  return localGet<BibleProgress>('bible_progress', uid);
}

export function saveBibleProgress(progress: BibleProgress, uid?: string): void {
  localSet('bible_progress', progress, uid);
}
