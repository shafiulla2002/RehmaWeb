'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Laptop,
  Menu,
  X,
  Heart,
  QrCode,
  User as UserIcon,
  CheckCircle2,
} from 'lucide-react';

interface Props {
  children: React.ReactNode;
  requireAuth?: boolean;
  allowedRoles?: UserRole[];
}

export function AppShell({
  children,
  requireAuth = true,
  allowedRoles = ['member', 'admin', 'superadmin'],
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModal, setActiveModal] = useState<'giving' | 'attendance' | 'profile' | null>(null);

  const pathname = usePathname();
  const router = useRouter();
  const { profile, role, signOut } = useAuth();
  const { language, setLanguage, availableLanguages } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const isAdmin = role === 'admin' || role === 'superadmin';

  // Breadcrumb path title computation
  const getPageTitle = () => {
    if (pathname.includes('/dashboard')) return 'Dashboard';
    if (pathname.includes('/bible')) return 'Bible Workspace';
    if (pathname.includes('/sermons')) return 'Sermons Library';
    if (pathname.includes('/songs')) return 'Worship Songbook';
    if (pathname.includes('/events')) return 'Church Events';
    if (pathname.includes('/prayer')) return 'Prayer Wall';
    if (pathname.includes('/giving')) return 'Kingdom Giving';
    if (pathname.includes('/attendance')) return 'Attendance Hub';
    if (pathname.includes('/notes')) return 'Personal Notes Studio';
    if (pathname.includes('/quiz')) return 'Bible Quiz Hub';
    if (pathname.includes('/care-cells')) return 'Care Cell Portal';
    if (pathname.includes('/service-duties/live-hud')) return 'LiveStageHUD Stage View';
    if (pathname.includes('/service-duties')) return 'Service Duties & Roster';
    if (pathname.includes('/testimonies')) return 'Testimonies of Praise';
    if (pathname.includes('/volunteering')) return 'Church Volunteering';
    if (pathname.includes('/jobs')) return 'Job Circle & Ministry';
    if (pathname.includes('/baptism')) return 'Water Baptism Portal';
    if (pathname.includes('/online-meetings')) return 'Online Sanctuary & Live';
    if (pathname.includes('/celebrations')) return 'Celebrations & Blessings';
    if (pathname.includes('/gallery')) return 'Church Photo Gallery';
    if (pathname.includes('/notifications')) return 'Notifications & Broadcasts';
    if (pathname.includes('/profile')) return 'Member Profile & Settings';
    if (pathname.includes('/verse')) return 'Daily Verse';
    if (pathname.includes('/promises')) return 'Daily Promises';
    if (pathname.includes('/admin')) return 'Admin Console';
    return 'Dashboard';
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    // Route search query to Bible or Sermons or Songs based on content
    router.push(`/sermons?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <ProtectedRoute requireAuth={requireAuth} allowedRoles={allowedRoles}>
      <div className="flex min-h-screen bg-[#F7F5EE] dark:bg-[#0D141D] text-[#18221B] dark:text-[#F1F5F9] font-sans transition-colors duration-200">
        {/* Mobile Backdrop Overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Desktop Sidebar (Dark Navy) */}
        <div className="hidden md:flex flex-shrink-0 sticky top-0 h-screen z-20">
          <Sidebar
            collapsed={collapsed}
            onToggle={() => setCollapsed(!collapsed)}
            onOpenModal={(modal) => setActiveModal(modal)}
          />
        </div>

        {/* Mobile Sidebar (Dark Navy Drawer) */}
        {mobileOpen && (
          <div className="fixed left-0 top-0 z-40 md:hidden h-full shadow-2xl">
            <Sidebar
              collapsed={false}
              onToggle={() => setMobileOpen(false)}
              onOpenModal={(modal) => {
                setMobileOpen(false);
                setActiveModal(modal);
              }}
            />
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Header Bar matching user's design */}
          <header className="sticky top-0 z-20 bg-[#F7F5EE]/95 dark:bg-[#0D141D]/95 backdrop-blur-md border-b border-[#EBE6DC] dark:border-[#222F3E] px-4 sm:px-6 py-2.5 transition-colors">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Left: Mobile Toggle & Breadcrumb */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileOpen(!mobileOpen)}
                  className="md:hidden p-1.5 rounded-lg hover:bg-[#EBE6DC] dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                  aria-label="Open navigation menu"
                >
                  <Menu size={20} />
                </button>

                <div className="flex items-center gap-1.5 text-xs text-[#5C665F] dark:text-slate-400 font-medium">
                  <span className="text-sm">🏠</span>
                  <Link href="/dashboard" className="hover:text-[#1E6F43] transition-colors">
                    Member Portal
                  </Link>
                  <span>/</span>
                  <span className="font-bold text-[#18221B] dark:text-white">
                    {getPageTitle()}
                  </span>
                </div>
              </div>

              {/* Middle: Universal Search Bar */}
              <div className="flex-1 max-w-md mx-auto w-full">
                <form onSubmit={handleSearchSubmit} className="relative">
                  <Search
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Bible, sermons, songs, events..."
                    className="w-full bg-white dark:bg-[#131C27] border border-[#EBE6DC] dark:border-[#222F3E] rounded-full pl-9 pr-4 py-1.5 text-xs text-[#18221B] dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#1E6F43] shadow-xs transition-all"
                  />
                </form>
              </div>

              {/* Right: Controls & Profile */}
              <div className="flex items-center gap-2.5 justify-end shrink-0">
                {/* 7 Regional Languages Selector */}
                <div className="relative">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="bg-white dark:bg-[#131C27] border border-[#EBE6DC] dark:border-[#222F3E] rounded-full px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs focus:outline-hidden cursor-pointer"
                  >
                    {availableLanguages.map((l) => (
                      <option key={l.code} value={l.code}>
                        🌐 {l.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sun / Moon Theme Toggle */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
                  className="p-1.5 rounded-full bg-white dark:bg-[#131C27] border border-[#EBE6DC] dark:border-[#222F3E] text-slate-600 dark:text-amber-400 hover:bg-[#E8F3EC] transition-all shadow-xs"
                >
                  {theme === 'light' ? <Sun size={15} className="text-amber-500" /> : <Moon size={15} />}
                </button>

                {/* Notifications Bell */}
                <Link
                  href="/notifications"
                  title="Notifications & Updates"
                  className="relative p-1.5 rounded-full bg-white dark:bg-[#131C27] border border-[#EBE6DC] dark:border-[#222F3E] text-slate-600 dark:text-slate-300 hover:bg-[#E8F3EC] transition-all shadow-xs"
                >
                  <Bell size={15} />
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
                </Link>

                {/* Member Avatar */}
                <div
                  onClick={() => setActiveModal('profile')}
                  title="View Profile"
                  className="w-8 h-8 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center cursor-pointer shadow-xs border border-white/40 ring-1 ring-[#1E6F43]"
                >
                  {profile?.fullName ? profile.fullName.charAt(0).toUpperCase() : 'S'}
                </div>

                {/* Admin View Button (Navigates to /admin) */}
                <Link
                  href="/admin"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-white dark:bg-slate-900 text-[#18221B] dark:text-white text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs"
                >
                  <Laptop size={13} className="text-slate-600 dark:text-slate-300" />
                  <span>Admin View</span>
                </Link>
              </div>
            </div>
          </header>

          {/* Page Body */}
          <main className="flex-1 p-4 sm:p-6 lg:p-7 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>

        {/* ONLINE GIVING STEWARDSHIP MODAL */}
        {activeModal === 'giving' && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-[#131C27] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#EBE6DC] dark:border-[#222F3E] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#1E6F43] flex items-center justify-center">
                    <Heart size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-gray-900 dark:text-white">Kingdom Stewardship</h3>
                    <p className="text-xs text-gray-500">Tithe, Missions &amp; Church Offerings</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs text-gray-600 dark:text-gray-300">
                <p className="leading-relaxed">
                  &ldquo;Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver.&rdquo;
                  <span className="block font-semibold text-gray-800 dark:text-gray-200 mt-1">— 2 Corinthians 9:7</span>
                </p>

                <div className="p-4 rounded-2xl bg-[#F7F5EE] dark:bg-[#0D141D] border border-[#EBE6DC] dark:border-[#222F3E] space-y-2">
                  <div className="flex justify-between font-semibold">
                    <span>Church Bank Transfer (NEFT/IMPS):</span>
                    <span className="text-[#1E6F43]">Active</span>
                  </div>
                  <p className="text-[11px] font-mono text-gray-700 dark:text-gray-300">
                    Account: Rhema Christian Ministry<br />
                    A/C No: 987654321098<br />
                    IFSC: HDFC0001234 (Main Branch)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-full py-2.5 rounded-xl bg-[#1E6F43] hover:bg-[#175835] text-white font-bold text-xs transition-colors shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* ATTENDANCE CHECK-IN MODAL */}
        {activeModal === 'attendance' && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-[#131C27] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#EBE6DC] dark:border-[#222F3E] space-y-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto">
                <QrCode size={28} />
              </div>

              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Congregation Attendance</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Sunday Service &amp; Fellowship Fellowship Check-in
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-left space-y-1.5 text-xs text-emerald-900 dark:text-emerald-200">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>Sunday Service Verified</span>
                </div>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                  Current Attendance Rate: <strong className="text-emerald-700 dark:text-emerald-100">86%</strong> (18 / 21 Gatherings Attended)
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-full py-2.5 rounded-xl bg-[#1E6F43] hover:bg-[#175835] text-white font-bold text-xs transition-colors shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* MEMBER PROFILE MODAL */}
        {activeModal === 'profile' && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-[#131C27] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#EBE6DC] dark:border-[#222F3E] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                    <UserIcon size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-gray-900 dark:text-white">Member Profile</h3>
                    <p className="text-xs text-gray-500">Rhema Christian Ministry Account</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-2.5 text-xs text-gray-700 dark:text-gray-200">
                <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-400">Name:</span>
                  <span className="font-semibold">{profile?.fullName || 'Shafi'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-400">Phone:</span>
                  <span className="font-mono">{profile?.phone || '+91 9999999999'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-400">Role:</span>
                  <span className="font-bold uppercase text-[#1E6F43]">{role}</span>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={signOut}
                  className="flex-1 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold transition-colors"
                >
                  Sign Out
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2 rounded-xl bg-[#1E6F43] hover:bg-[#175835] text-white text-xs font-bold transition-colors shadow-xs"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
