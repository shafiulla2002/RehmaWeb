export type SlotLabel = 'Morning' | 'Afternoon' | 'Evening' | 'Night';
export const SLOTS: SlotLabel[] = ['Morning', 'Afternoon', 'Evening', 'Night'];
export const TOTAL_VERSES = 5863;
const EPOCH = new Date('2026-10-30T00:00:00Z');
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function getIndicesForDate(date: Date, totalVerses = TOTAL_VERSES): number[] {
  const epochUtc = Date.UTC(EPOCH.getFullYear(), EPOCH.getMonth(), EPOCH.getDate());
  const targetUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((targetUtc - epochUtc) / MS_PER_DAY);
  const base = diffDays * 4;
  return [0, 1, 2, 3].map((i) => ((base + i) % totalVerses + totalVerses) % totalVerses);
}

export function getCurrentSlot(): SlotLabel {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 17) return 'Afternoon';
  if (hour >= 17 && hour < 21) return 'Evening';
  return 'Night';
}

export function isSlotUnlocked(slot: SlotLabel, date: Date): boolean {
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  if (!isToday) return true; // past days are always unlocked
  const hour = today.getHours();
  const unlockHours: Record<SlotLabel, number> = {
    Morning: 5,
    Afternoon: 12,
    Evening: 17,
    Night: 21,
  };
  return hour >= unlockHours[slot];
}

export function formatDateStrip(date: Date): string {
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function getLast7Days(): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
}
