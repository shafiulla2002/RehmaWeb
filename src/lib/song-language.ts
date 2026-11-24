// lib/song-language.ts — Ported from app/src/services/SongLanguageHelper.ts
export type SongLang = 'en' | 'te' | 'hi' | 'ta' | 'mr' | 'ml' | 'kn';

export const LANG_LABELS: Record<SongLang, string> = {
  en: 'English',
  te: 'తెలుగు',
  hi: 'हिंदी',
  ta: 'தமிழ்',
  mr: 'मराठी',
  ml: 'മലയാളം',
  kn: 'ಕನ್ನಡ',
};

export function getLyricsForLang(song: any, lang: SongLang): string {
  if (!song) return '';
  const map: Record<SongLang, string[]> = {
    en: ['lyrics', 'lyricsEn', 'lyricsEnglish'],
    te: ['lyricsTe', 'lyricsTelugu', 'teluguLyrics'],
    hi: ['lyricsHi', 'lyricsHindi'],
    ta: ['lyricsTa', 'lyricsTamil'],
    mr: ['lyricsMr', 'lyricsMarathi'],
    ml: ['lyricsMl', 'lyricsMalayalam'],
    kn: ['lyricsKn', 'lyricsKannada'],
  };
  for (const key of map[lang]) {
    if (song[key]) return song[key];
  }
  return song.lyrics ?? song.lyricsEn ?? song.teluguLyrics ?? song.lyricsTe ?? '';
}

export function getChordsForLang(song: any, lang: SongLang): string {
  if (!song) return '';
  if (lang === 'en') return song.chords ?? song.chordsEn ?? '';
  return song[`chords${lang.charAt(0).toUpperCase() + lang.slice(1)}`] ?? song.chords ?? '';
}
