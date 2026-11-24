'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Share2,
  Calendar,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import {
  getLiveGalleryAlbums,
  getAlbumPhotos,
  LiveGalleryAlbum,
  LiveGalleryPhoto,
  formatFriendlyDate,
} from '@/lib/firestoreService';

export default function AlbumDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const albumId = resolvedParams.id;

  const [album, setAlbum] = useState<LiveGalleryAlbum | null>(null);
  const [photos, setPhotos] = useState<LiveGalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (!albumId) return;
    setLoading(true);
    setError(null);

    // 1. Listen to the Album doc
    const albumDocRef = doc(db, 'Rhema Church', 'rhema', 'gallery_albums', albumId);
    const unsubAlbum = onSnapshot(
      albumDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const rawDate = formatFriendlyDate(data.createdAt || data.date);
          setAlbum({
            id: docSnap.id,
            title: data.name || data.title || data.albumTitle || 'Rhema Church Album',
            name: data.name || data.title || data.albumTitle || 'Rhema Church Album',
            category: data.category || 'Worship Services',
            description: data.description || 'Moments of worship, praise and fellowship at Rhema Church.',
            coverImage: data.coverPhotoUrl || data.coverUrl || data.coverImage || '',
            coverPhotoUrl: data.coverPhotoUrl || data.coverUrl || '',
            photoCount: data.photoCount || 0,
            date: rawDate,
            createdAt: rawDate,
            visibility: data.visibility || 'Public',
          });
        }
      },
      (err) => console.error('[AlbumDetailPage] Album onSnapshot error:', err)
    );

    // 2. Listen to Photos subcollection
    const photosColRef = collection(db, 'Rhema Church', 'rhema', 'gallery_albums', albumId, 'photos');
    const unsubPhotos = onSnapshot(
      photosColRef,
      (photoSnap) => {
        if (!photoSnap.empty) {
          const loadedPhotos: LiveGalleryPhoto[] = photoSnap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              url: data.url || data.photoUrl || '',
              photoUrl: data.photoUrl || data.url || '',
              caption: data.caption || '',
              uploadedBy: data.uploadedBy || 'Rhema Media',
              createdAt: formatFriendlyDate(data.createdAt),
            };
          });
          setPhotos(loadedPhotos);
        } else {
          // Fallback to helper
          getAlbumPhotos(albumId, 'rhema')
            .then((res) => {
              if (res.length > 0) setPhotos(res);
            })
            .catch(() => {});
        }
        setLoading(false);
      },
      (err) => {
        console.error('[AlbumDetailPage] Photos onSnapshot error:', err);
        setLoading(false);
      }
    );

    return () => {
      unsubAlbum();
      unsubPhotos();
    };
  }, [albumId]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') {
        setLightboxIndex(null);
      } else if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev !== null && prev < photos.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : photos.length - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, photos.length]);

  const handleShare = async (photo: LiveGalleryPhoto) => {
    if (navigator.clipboard && photo.url) {
      await navigator.clipboard.writeText(photo.url);
      setNotification('Photo link copied to clipboard!');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Back Link */}
        <Link
          href="/gallery"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E6F43] dark:text-emerald-400 hover:underline"
        >
          <ChevronLeft size={16} />
          <span>Back to All Albums</span>
        </Link>

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

        {/* Album Header Banner */}
        <div className="bg-white dark:bg-[#131C27] rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2">
              {album?.category && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-[#1E6F43] dark:text-emerald-300 font-bold text-[11px] border border-emerald-200 dark:border-emerald-800/40">
                  {album.category}
                </span>
              )}
              {album?.date && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Calendar size={13} />
                  {album.date}
                </span>
              )}
            </div>

            <h1 className="font-serif font-extrabold text-2xl md:text-3xl text-slate-900 dark:text-white">
              {album?.title || 'Loading Album...'}
            </h1>

            {album?.description ? (
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {album.description}
              </p>
            ) : null}
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-[#F7F5EE] dark:bg-[#0D141D] border border-[#EBE6DC] dark:border-[#222F3E] text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Camera size={14} className="text-[#1E6F43]" />
              <span>{photos.length} Photos</span>
            </span>
          </div>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-600" />
              <span>{notification}</span>
            </div>
            <button type="button" onClick={() => setNotification(null)}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* SKELETON LOADER */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="bg-white dark:bg-[#131C27] rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] overflow-hidden animate-pulse aspect-4/3"
              />
            ))}
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && photos.length === 0 && (
          <div className="p-8 rounded-3xl bg-white dark:bg-[#131C27] border border-[#EBE6DC] dark:border-[#222F3E] text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <ImageIcon size={24} />
            </div>
            <h4 className="font-bold text-sm text-[#18221B] dark:text-white">
              No Photos in this Album
            </h4>
            <p className="text-xs text-[#5C665F] dark:text-slate-400 max-w-sm mx-auto">
              Photos uploaded by the church media team will appear here once published.
            </p>
          </div>
        )}

        {/* Photo Grid */}
        {!loading && photos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                onClick={() => setLightboxIndex(index)}
                className="group cursor-pointer bg-white dark:bg-[#131C27] rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] overflow-hidden shadow-xs hover:shadow-lg transition-all"
              >
                <div className="relative aspect-4/3 overflow-hidden bg-slate-900">
                  <img
                    src={photo.url || photo.photoUrl}
                    alt={photo.caption || 'Church photo'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1544427920-c49ccfb85579?auto=format&fit=crop&w=800&q=80';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1 rounded-full bg-black/60 text-white text-xs font-semibold backdrop-blur-xs">
                      Click to View Fullscreen
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-1">
                  <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-snug line-clamp-2">
                    {photo.caption || 'Rhema Church Photo'}
                  </p>
                  {photo.uploadedBy && (
                    <p className="text-[10px] text-slate-400">
                      Uploaded by: {photo.uploadedBy}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Fullscreen Lightbox Modal */}
        {lightboxIndex !== null && photos[lightboxIndex] && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X size={22} />
            </button>

            {/* Previous Button */}
            <button
              type="button"
              onClick={() =>
                setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : photos.length - 1))
              }
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Previous Photo (←)"
            >
              <ChevronLeft size={24} />
            </button>

            {/* Next Button */}
            <button
              type="button"
              onClick={() =>
                setLightboxIndex((prev) => (prev !== null && prev < photos.length - 1 ? prev + 1 : 0))
              }
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Next Photo (→)"
            >
              <ChevronRight size={24} />
            </button>

            {/* Active Photo Container */}
            <div className="max-w-5xl max-h-[85vh] flex flex-col items-center space-y-3">
              <img
                src={photos[lightboxIndex].url || photos[lightboxIndex].photoUrl}
                alt={photos[lightboxIndex].caption || 'Full photo'}
                className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-2xl"
              />

              <div className="text-center text-white space-y-1 max-w-2xl px-4">
                <p className="text-sm font-medium leading-relaxed">
                  {photos[lightboxIndex].caption || 'Rhema Church Photo'}
                </p>
                <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
                  <span>
                    Photo {lightboxIndex + 1} of {photos.length}
                  </span>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => handleShare(photos[lightboxIndex])}
                    className="hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Share2 size={13} />
                    <span>Copy Link</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
