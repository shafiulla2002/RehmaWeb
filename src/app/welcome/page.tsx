'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  Sparkles,
  Phone,
  UserPlus,
  Compass,
  Building,
  CheckCircle2,
  Lock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MapPin,
  BookOpen,
  Music,
  Heart,
  CreditCard,
  X
} from 'lucide-react';

const ONBOARDING_SLIDES = [
  {
    id: 'word',
    icon: BookOpen,
    tag: 'Holy Scripture',
    title: 'Rooted in the Living Word',
    desc: 'Access Daily Promises, progressive 4-slot Verse of the Day, and the full 66-book Holy Bible in parallel translations with Audio TTS narration.',
    color: 'from-amber-500/20 to-amber-700/10',
    border: 'border-amber-500/30',
    accent: 'text-amber-400'
  },
  {
    id: 'worship',
    icon: Music,
    tag: 'Spiritual Worship',
    title: 'Bilingual Worship Songbook',
    desc: 'Browse hundreds of English, Telugu, and Hindi worship songs with interactive chord sheets, 1-click key transposition, and Sunday service setlists.',
    color: 'from-sky-500/20 to-sky-700/10',
    border: 'border-sky-500/30',
    accent: 'text-sky-400'
  },
  {
    id: 'fellowship',
    icon: Heart,
    tag: 'Community Life',
    title: 'Christian Fellowship & Prayer',
    desc: 'Engage with community events, submit pastoral prayer requests, find local care cell gatherings, and view sermon study outlines.',
    color: 'from-purple-500/20 to-purple-700/10',
    border: 'border-purple-500/30',
    accent: 'text-purple-400'
  },
  {
    id: 'giving',
    icon: CreditCard,
    tag: 'Kingdom Stewardship',
    title: 'Joyful Giving & Ministry Support',
    desc: 'Support gospel outreach and building missions through instant UPI QR contributions, bank details copy, and official downloadable 80G receipts.',
    color: 'from-emerald-500/20 to-emerald-700/10',
    border: 'border-emerald-500/30',
    accent: 'text-emerald-400'
  }
];

const CHURCH_CAMPUSES = [
  { id: 'central', name: 'Rhema Central Sanctuary', location: 'Main Campus & Cathedral', code: 'RHEMA01' },
  { id: 'north', name: 'Rhema North Campus', location: 'North City Outreach', code: 'RHEMA02' },
  { id: 'south', name: 'Rhema South Fellowship', location: 'South Zone Ministry Center', code: 'RHEMA03' }
];

export default function WelcomePage() {
  const router = useRouter();
  const { user, isGuest, isLoading, loginAsGuest } = useAuth();

  // Seamless redirect: if logged in member -> dashboard; if unauthenticated -> login
  useEffect(() => {
    if (isLoading) return;
    if (user && !isGuest) {
      router.replace('/dashboard');
    } else {
      router.replace('/auth/login');
    }
  }, [user, isGuest, isLoading, router]);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedCampus, setSelectedCampus] = useState(CHURCH_CAMPUSES[0]);
  const [campusModalOpen, setCampusModalOpen] = useState(false);

  // Load campus preference from localStorage safely
  useEffect(() => {
    try {
      const saved = localStorage.getItem('rhema_campus_pref');
      if (saved) {
        const found = CHURCH_CAMPUSES.find(c => c.id === saved);
        if (found) setSelectedCampus(found);
      }
    } catch {
      // LocalStorage access fallback
    }
  }, []);

  const handleSelectCampus = (campus: typeof CHURCH_CAMPUSES[0]) => {
    setSelectedCampus(campus);
    try {
      localStorage.setItem('rhema_campus_pref', campus.id);
    } catch {}
    setCampusModalOpen(false);
  };

  // Auto-advance slides every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % ONBOARDING_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const slide = ONBOARDING_SLIDES[currentSlide];
  const SlideIcon = slide.icon;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950">
      {/* Top Banner */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 font-black text-xl flex items-center justify-center shadow-md">
              R
            </span>
            <div>
              <span className="font-bold text-lg text-white">Rhema</span>
              <span className="text-xs text-slate-400 block -mt-1">Christian Ministries</span>
            </div>
          </div>

          {/* Campus Selector Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCampusModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
              title="Change church campus"
            >
              <MapPin size={13} className="text-amber-400" />
              <span>{selectedCampus.name}</span>
            </button>

            <Link href="/auth/login">
              <Button
                variant="outline"
                size="sm"
                className="!bg-white/10 !border-slate-400/70 !text-white font-semibold hover:!bg-white/20 hover:!border-amber-400/80"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button variant="secondary" size="sm">
                Register
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Body */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Hero Pitch */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
              <Sparkles size={14} />
              <span>Serving Christ & Christian Ministries</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              One Fellowship. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-sky-400 to-indigo-400">
                One Spiritual Home.
              </span>
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl">
              Welcome to the official Rhema Web Portal. Access daily promises, multilingual scripture,
              sermon libraries, community prayer walls, fellowship gatherings, and online ministry giving.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/auth/login">
                <Button variant="secondary" size="lg" className="gap-2 font-semibold">
                  <Phone size={18} />
                  <span>Member Sign In</span>
                </Button>
              </Link>

              <Link href="/auth/register">
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2 !bg-white/10 !border-slate-400/70 !text-white font-semibold hover:!bg-white/20 hover:!border-amber-400/80"
                >
                  <UserPlus size={18} />
                  <span>New Member Registration</span>
                </Button>
              </Link>

              <Link href="/dashboard" onClick={loginAsGuest}>
                <Button
                  variant="ghost"
                  size="lg"
                  className="gap-2 !bg-slate-900/80 !border !border-amber-400/50 !text-amber-200 font-semibold hover:!bg-amber-500/20 hover:!text-white hover:!border-amber-300"
                >
                  <Compass size={18} />
                  <span>Explore as Guest</span>
                  <ArrowRight size={16} />
                </Button>
              </Link>
            </div>
          </div>

          {/* Right: Onboarding Walkthrough Carousel (Feature 1) */}
          <div className="lg:col-span-6 space-y-4">
            <div className={`bg-gradient-to-br ${slide.color} border ${slide.border} bg-slate-900/90 rounded-3xl p-6 sm:p-8 shadow-2xl relative transition-all duration-300 min-h-[320px] flex flex-col justify-between`}>
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <SlideIcon size={18} className={slide.accent} />
                    <span>{slide.tag}</span>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">
                    0{currentSlide + 1} / 0{ONBOARDING_SLIDES.length}
                  </span>
                </div>

                <div className="mt-6 space-y-3">
                  <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {slide.title}
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {slide.desc}
                  </p>
                </div>
              </div>

              {/* Carousel Navigation Bar */}
              <div className="pt-6 border-t border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {ONBOARDING_SLIDES.map((s, idx) => (
                    <button
                      key={s.id}
                      onClick={() => setCurrentSlide(idx)}
                      className={`h-2 rounded-full transition-all duration-200 ${
                        idx === currentSlide ? 'w-8 bg-amber-400' : 'w-2 bg-slate-700 hover:bg-slate-600'
                      }`}
                      aria-label={`Slide ${idx + 1}`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentSlide(prev => (prev - 1 + ONBOARDING_SLIDES.length) % ONBOARDING_SLIDES.length)}
                    className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-750 transition-colors"
                    aria-label="Previous slide"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setCurrentSlide(prev => (prev + 1) % ONBOARDING_SLIDES.length)}
                    className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-750 transition-colors"
                    aria-label="Next slide"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Campus Info Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl px-5 py-3.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <Building size={16} className="text-amber-400" />
                <div>
                  <span className="font-semibold text-white block">{selectedCampus.name}</span>
                  <span className="text-slate-400 text-[11px]">{selectedCampus.location}</span>
                </div>
              </div>
              <button
                onClick={() => setCampusModalOpen(true)}
                className="text-amber-400 hover:underline font-medium"
              >
                Change
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Campus Selector Modal (Feature 2) */}
      {campusModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 font-bold text-white text-base">
                <MapPin size={18} className="text-amber-400" />
                <span>Select Church Campus</span>
              </div>
              <button
                onClick={() => setCampusModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Choose your local fellowship campus. This preference is saved locally on your device for bulletin display.
            </p>

            <div className="space-y-2.5 pt-1">
              {CHURCH_CAMPUSES.map((campus) => {
                const isSelected = selectedCampus.id === campus.id;
                return (
                  <button
                    key={campus.id}
                    onClick={() => handleSelectCampus(campus)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/40 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm flex items-center gap-2">
                        <span>{campus.name}</span>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{campus.location}</div>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                      {campus.code}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} Rhema Christian Ministries. Phase 4B Verified.
      </footer>
    </div>
  );
}
