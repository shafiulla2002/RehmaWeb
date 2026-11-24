'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SongLyricsViewer } from '@/components/ui/SongLyricsViewer';
import { YoutubePlayer } from '@/components/ui/YoutubePlayer';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { getLiveWorshipSongs, LiveWorshipSong } from '@/lib/firestoreService';
import { churchCol } from '@/lib/firestore';
import { query, limit, getDocs } from 'firebase/firestore';
import {
  SongLang,
  LANG_LABELS,
  getLyricsForLang,
  getChordsForLang,
} from '@/lib/song-language';
import { getBookmarks, toggleBookmark } from '@/lib/local-state';
import { useAuth } from '@/contexts/AuthContext';

interface SongItem {
  id: string;
  title: string;
  titleTe?: string;
  category?: string;
  key?: string;
  bpm?: string | number;
  timeSignature?: string;
  worshipLeader?: string;
  youtubeId?: string;
  lyrics?: string;
  lyricsTe?: string;
  lyricsHi?: string;
  lyricsTa?: string;
  lyricsKn?: string;
  lyricsMl?: string;
  lyricsMr?: string;
  chords?: string;
  chordsEn?: string;
  [key: string]: any;
}

interface SetlistItem {
  id: string;
  name: string;
  date?: string;
  serviceType?: string;
  songs?: { id: string; title: string; key?: string }[];
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function SongsPage() {
  const { user } = useAuth();
  const [songs, setSongs] = useState<SongItem[]>([]);
  const [setlists, setSetlists] = useState<SetlistItem[]>([]);
  const [activeTab, setActiveTab] = useState<'browse' | 'setlists' | 'my_songbook'>('browse');
  const [selectedSong, setSelectedSong] = useState<SongItem | null>(null);
  const [songLang, setSongLang] = useState<SongLang>('te');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBookmarkedIds(getBookmarks(user?.uid));

    let isCancelled = false;

    async function loadSongsAndSetlists() {
      setIsLoading(true);
      setError(null);
      try {
        // 1. Fetch Songs via central live service (Rhema Church/rhema/worshipSongs)
        const rawSongs = await getLiveWorshipSongs(100);
        const songList: SongItem[] = rawSongs.map((s) => ({
          id: s.id,
          title: s.title || 'Untitled Song',
          titleTe: s.titleTe || '',
          category: s.category || 'General',
          key: s.key || '',
          timeSignature: s.timeSignature || '',
          youtubeId: s.youtubeId || '',
          lyrics: s.lyricsEn || '',
          lyricsTe: s.lyricsTe || '',
          status: s.status || 'Published',
        }));

        // 2. Fetch Setlists
        const setlistArr: SetlistItem[] = [];
        try {
          const setlistQuery = query(churchCol('setlists'), limit(30));
          const setlistSnap = await getDocs(setlistQuery);
          setlistSnap.forEach((d) => {
            setlistArr.push({ ...(d.data() as any), id: d.id });
          });
        } catch {
          // Setlists collection may not exist yet
        }

        if (!isCancelled) {
          setSongs(songList);
          setSetlists(setlistArr);
          if (songList.length > 0) {
            setSelectedSong(songList[0]);
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Failed to load songs:', err);
          setError('Unable to load worship songs. Please check your network.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadSongsAndSetlists();

    return () => {
      isCancelled = true;
    };
  }, [user]);

  function handleToggleBookmark(songId: string) {
    toggleBookmark(songId, user?.uid);
    setBookmarkedIds(getBookmarks(user?.uid));
  }

  // Categories list derived from loaded songs
  const categories = [
    'All',
    ...Array.from(new Set(songs.map((s) => s.category).filter(Boolean) as string[])),
  ];

  const filteredSongs = songs.filter((s) => {
    if (activeTab === 'my_songbook' && !bookmarkedIds.includes(s.id)) {
      return false;
    }
    const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
    const matchesLetter = !selectedLetter || s.title.toUpperCase().startsWith(selectedLetter);
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      s.title.toLowerCase().includes(term) ||
      (s.titleTe && s.titleTe.toLowerCase().includes(term)) ||
      (s.worshipLeader && s.worshipLeader.toLowerCase().includes(term));

    return matchesCategory && matchesLetter && matchesSearch;
  });

  const isSelectedBookmarked = selectedSong ? bookmarkedIds.includes(selectedSong.id) : false;
  const currentLyrics = selectedSong ? getLyricsForLang(selectedSong, songLang) : '';
  const currentChords = selectedSong ? getChordsForLang(selectedSong, songLang) : undefined;

  return (
    <AppShell allowedRoles={['member', 'admin', 'superadmin', 'guest']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Bilingual Worship Songbook &amp; Setlists
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Praise and worship songs with lyrics, chord sheets, audio guides, and service setlists
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="inline-flex rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] p-1 bg-white dark:bg-[#131C27] shadow-xs">
            {[
              { id: 'browse', label: 'Browse Songs' },
              { id: 'setlists', label: `Setlists (${setlists.length})` },
              { id: 'my_songbook', label: `My Songbook (${bookmarkedIds.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#1E6F43] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {error && <ErrorBanner message={error} />}

        {/* Setlists Tab View */}
        {activeTab === 'setlists' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
            <h3 className="text-base font-bold text-gray-900 mb-2">
              Sunday &amp; Ministry Service Setlists
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              Curated worship service song sequences prepared by worship leaders
            </p>

            {setlists.length === 0 ? (
              <EmptyState
                icon="🎼"
                title="No setlists scheduled"
                subtitle="Upcoming service setlists will appear here once published by the worship team."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {setlists.map((sl) => (
                  <div
                    key={sl.id}
                    className="p-5 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-gray-900">{sl.name}</h4>
                      {sl.date && (
                        <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                          📅 {sl.date}
                        </span>
                      )}
                    </div>
                    {sl.songs && sl.songs.length > 0 ? (
                      <ol className="space-y-1.5 pl-4 list-decimal text-xs text-gray-700">
                        {sl.songs.map((s, idx) => (
                          <li key={idx} className="font-medium">
                            {s.title} {s.key && <span className="text-blue-600">[{s.key}]</span>}
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No songs added to this setlist.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Browse & My Songbook Tab View (Master-Detail Split) */}
        {(activeTab === 'browse' || activeTab === 'my_songbook') && (
          <div className="space-y-4">
            {/* Filter Toolbar */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <input
                  type="text"
                  placeholder="Search song title, Telugu name, worship leader..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-xs rounded-xl px-3.5 py-2 w-full sm:w-80 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />

                {/* Category Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                        selectedCategory === cat
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* A-Z Alphabet Filter Strip */}
              <div className="flex items-center gap-1 overflow-x-auto pt-2 border-t border-gray-100 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedLetter(null)}
                  className={`px-2 py-0.5 rounded font-bold transition-colors ${
                    selectedLetter === null
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  ALL
                </button>
                {ALPHABET.map((letter) => (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => setSelectedLetter(selectedLetter === letter ? null : letter)}
                    className={`px-1.5 py-0.5 rounded font-semibold transition-colors ${
                      selectedLetter === letter
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {letter}
                  </button>
                ))}
              </div>
            </div>

            {/* Master-Detail Split Grid */}
            {isLoading ? (
              <CardSkeleton lines={6} />
            ) : filteredSongs.length === 0 ? (
              <EmptyState
                icon="🎵"
                title={activeTab === 'my_songbook' ? 'Your songbook is empty' : 'No songs match filters'}
                subtitle={
                  activeTab === 'my_songbook'
                    ? 'Bookmark songs in the Browse tab using the star icon to keep them here.'
                    : 'Try clearing your search term or selecting ALL in the alphabet bar.'
                }
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left 5 Cols: Song List */}
                <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
                  <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-xs font-semibold text-gray-700">
                    <span>Songs ({filteredSongs.length})</span>
                    <span className="text-gray-400">Click to preview</span>
                  </div>
                  <div className="max-h-[70vh] overflow-y-auto divide-y divide-gray-100">
                    {filteredSongs.map((song) => {
                      const isSelected = selectedSong?.id === song.id;
                      const isBookmarked = bookmarkedIds.includes(song.id);
                      return (
                        <div
                          key={song.id}
                          onClick={() => setSelectedSong(song)}
                          className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-50/70 border-l-4 border-blue-600 text-blue-900'
                              : 'hover:bg-gray-50 text-gray-800'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-xs truncate">
                              {song.title}
                            </p>
                            {song.titleTe && (
                              <p className="text-[11px] text-gray-500 truncate mt-0.5">
                                {song.titleTe}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              {song.key && (
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-100/50 px-1.5 py-0.2 rounded">
                                  Key: {song.key}
                                </span>
                              )}
                              {song.bpm && (
                                <span className="text-[10px] text-gray-400">
                                  {song.bpm} BPM
                                </span>
                              )}
                              {song.category && (
                                <span className="text-[10px] text-gray-500">
                                  · {song.category}
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleBookmark(song.id);
                            }}
                            title={isBookmarked ? 'Remove from My Songbook' : 'Add to My Songbook'}
                            className="p-1.5 rounded-full hover:bg-gray-200/50 text-base"
                          >
                            {isBookmarked ? '⭐' : '☆'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right 7 Cols: Song Viewer Detail */}
                <div className="lg:col-span-7 space-y-4">
                  {selectedSong ? (
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-5">
                      {/* Song Title & Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                        <div>
                          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                            {selectedSong.title}
                          </h2>
                          {selectedSong.titleTe && (
                            <p className="text-sm font-semibold text-blue-700 mt-0.5">
                              {selectedSong.titleTe}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {selectedSong.key && (
                              <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-100">
                                Key: {selectedSong.key}
                              </span>
                            )}
                            {selectedSong.timeSignature && (
                              <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                                {selectedSong.timeSignature}
                              </span>
                            )}
                            {selectedSong.bpm && (
                              <span className="text-xs text-gray-500">
                                {selectedSong.bpm} BPM
                              </span>
                            )}
                            {selectedSong.worshipLeader && (
                              <span className="text-xs text-gray-600">
                                🎙️ {selectedSong.worshipLeader}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleBookmark(selectedSong.id)}
                          className={`self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            isSelectedBookmarked
                              ? 'bg-amber-50 text-amber-900 border-amber-300 ring-1 ring-amber-400'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <span>{isSelectedBookmarked ? '⭐' : '☆'}</span>
                          <span>{isSelectedBookmarked ? 'Bookmarked' : 'Add to Songbook'}</span>
                        </button>
                      </div>

                      {/* YouTube Accompaniment Video Player */}
                      {selectedSong.youtubeId && (
                        <div>
                          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                            Audio &amp; Video Accompaniment
                          </h4>
                          <YoutubePlayer
                            videoId={selectedSong.youtubeId}
                            title={selectedSong.title}
                            className="max-h-72"
                          />
                        </div>
                      )}

                      {/* Language Selection Tabs */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                            Lyrics Language / Transliteration
                          </label>
                          <span className="text-[11px] text-gray-400">
                            7-Language Support
                          </span>
                        </div>
                        <div className="flex gap-1.5 overflow-x-auto pb-1">
                          {(Object.keys(LANG_LABELS) as SongLang[]).map((langKey) => (
                            <button
                              key={langKey}
                              type="button"
                              onClick={() => setSongLang(langKey)}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                                songLang === langKey
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {LANG_LABELS[langKey]}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Lyrics & Chords Viewer Component */}
                      <SongLyricsViewer
                        lyrics={currentLyrics || 'Lyrics unavailable in this language.'}
                        chords={currentChords}
                      />

                      <p className="text-[11px] text-gray-400 italic text-center pt-2">
                        💾 Songbook bookmark saved locally (Firebase write pending separate approval)
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-sm text-gray-500">
                      Select a song from the list to view lyrics and chord sheet.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
