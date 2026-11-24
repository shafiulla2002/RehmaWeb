'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import {
  Image as ImageIcon,
  Calendar,
  Sparkles,
  Camera,
  Search,
  Filter,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { getLiveGalleryAlbums, LiveGalleryAlbum, formatFriendlyDate } from '@/lib/firestoreService';

export default function GalleryPage() {
  const [albums, setAlbums] = useState<LiveGalleryAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    const colRef = collection(db, 'Rhema Church', 'rhema', 'gallery_albums');
    const unsub = onSnapshot(
      colRef,
      (snap) => {
        if (!snap.empty) {
          const loaded: LiveGalleryAlbum[] = snap.docs.map((d) => {
            const data = d.data();
            const rawDate = formatFriendlyDate(data.createdAt || data.date);
            return {
              id: d.id,
              title: data.name || data.title || data.albumTitle || 'Church Album',
              name: data.name || data.title || data.albumTitle || 'Church Album',
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
          setAlbums(loaded);
          setLoading(false);
        } else {
          getLiveGalleryAlbums('rhema')
            .then((res) => {
              setAlbums(res);
              setLoading(false);
            })
            .catch(() => {
              setAlbums([]);
              setLoading(false);
            });
        }
      },
      (err) => {
        console.error('[GalleryPage] onSnapshot error:', err);
        setError('Unable to load photo gallery in real time.');
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const rawCats = Array.from(new Set(albums.map((a) => a.category).filter(Boolean))) as string[];
  const categories = ['All', ...(rawCats.length > 0 ? rawCats : ['Worship Services', 'Events'])];

  const filteredAlbums = albums.filter((alb) => {
    const matchesCat = selectedCategory === 'All' || alb.category === selectedCategory;
    const matchesSearch =
      (alb.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (alb.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Banner with Psalm 105:1-2 */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B192C] via-[#132A4A] to-[#1E6F43] text-white p-6 md:p-8 shadow-xl">
          <div className="relative z-10 space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-semibold backdrop-blur-xs border border-amber-400/30">
              <Camera size={14} />
              <span>Church Life &amp; Events Gallery</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-serif font-extrabold tracking-tight">
              Capturing Moments of Grace &amp; Glory
            </h1>
            <p className="text-slate-200 text-xs md:text-sm leading-relaxed">
              &ldquo;Give praise to the Lord, proclaim his name; make known among the nations what he has done. Sing to him, sing praise to him; tell of all his wonderful acts.&rdquo;
              — <span className="text-amber-300 font-semibold">Psalm 105:1-2</span>
            </p>
            <div className="pt-1 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/10 text-[11px] text-amber-200 border border-white/15">
                <ShieldCheck size={12} className="text-amber-300" />
                <span>Official Rhema Church Media &amp; Life Events Archive</span>
              </span>
            </div>
          </div>
        </div>

        {/* ERROR STATE */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 flex items-center justify-between gap-3 text-red-700 dark:text-red-300 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900 hover:bg-red-200 text-red-800 dark:text-red-200 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw size={12} />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Search & Category Filter */}
        <div className="bg-white dark:bg-[#131C27] rounded-2xl p-4 border border-[#EBE6DC] dark:border-[#222F3E] shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search albums by title or event..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] bg-[#F7F5EE]/50 dark:bg-[#0D141D] text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#1E6F43]"
              />
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Showing {filteredAlbums.length} albums
            </div>
          </div>

          {categories.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-thin">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full font-medium whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#1E6F43] text-white shadow-xs'
                      : 'bg-[#F7F5EE] dark:bg-[#0D141D] text-slate-600 dark:text-slate-300 hover:bg-[#EBE6DC] dark:hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* SKELETON LOADER */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white dark:bg-[#131C27] rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] overflow-hidden animate-pulse space-y-4"
              >
                <div className="aspect-video bg-slate-200 dark:bg-slate-800" />
                <div className="p-5 space-y-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-1/3" />
                  <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && filteredAlbums.length === 0 && (
          <div className="p-8 rounded-3xl bg-white dark:bg-[#131C27] border border-[#EBE6DC] dark:border-[#222F3E] text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Camera size={24} />
            </div>
            <h4 className="font-bold text-sm text-[#18221B] dark:text-white">
              No Photo Albums Found
            </h4>
            <p className="text-xs text-[#5C665F] dark:text-slate-400 max-w-sm mx-auto">
              {searchQuery
                ? `No albums matched "${searchQuery}". Try a different keyword.`
                : 'Church event photo albums will appear here as they are published by church media.'}
            </p>
          </div>
        )}

        {/* Albums Grid */}
        {!loading && filteredAlbums.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAlbums.map((alb) => {
              const cover = alb.coverImage || alb.coverPhotoUrl || 'https://images.unsplash.com/photo-1544427920-c49ccfb85579?auto=format&fit=crop&w=800&q=80';

              return (
                <Link
                  key={alb.id}
                  href={`/gallery/${alb.id}`}
                  className="group bg-white dark:bg-[#131C27] rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] overflow-hidden shadow-xs hover:shadow-lg transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Cover Image Container */}
                    <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                      <img
                        src={cover}
                        alt={alb.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1544427920-c49ccfb85579?auto=format&fit=crop&w=800&q=80';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                      {alb.category && (
                        <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold border border-white/20">
                          {alb.category}
                        </span>
                      )}

                      <span className="absolute bottom-3 right-3 px-2.5 py-0.5 rounded-full bg-[#1E6F43] text-white text-[10px] font-bold flex items-center gap-1 shadow-md">
                        <ImageIcon size={12} />
                        <span>{alb.photoCount || 0} Photos</span>
                      </span>
                    </div>

                    {/* Album Details */}
                    <div className="p-5 space-y-2">
                      {alb.date && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Calendar size={13} />
                          <span>{alb.date}</span>
                        </div>
                      )}

                      <h3 className="font-serif font-bold text-base text-slate-900 dark:text-white group-hover:text-[#1E6F43] dark:group-hover:text-emerald-400 transition-colors">
                        {alb.title}
                      </h3>

                      {alb.description ? (
                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                          {alb.description}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="p-5 pt-0">
                    <div className="pt-3 border-t border-[#F0EBE0] dark:border-[#1E2C3D] flex items-center justify-between text-xs font-bold text-[#1E6F43] dark:text-emerald-400">
                      <span>View Album Photos</span>
                      <ChevronRight size={15} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
