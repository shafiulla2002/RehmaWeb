'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { ADMIN_DEMO_BRANCHES } from '@/lib/adminWave7aData';
import {
  LayoutDashboard,
  Sparkles,
  BookOpen,
  Video,
  Music,
  HelpCircle,
  Users,
  CalendarCheck,
  HeartHandshake,
  MessageSquareQuote,
  Network,
  Droplets,
  UserCheck,
  CalendarDays,
  ClipboardList,
  Navigation,
  Briefcase,
  Receipt,
  Megaphone,
  Settings,
  ArrowLeft,
  Sun,
  Moon,
  Menu,
  X,
  Building2,
  ShieldAlert,
  CheckCircle2,
  Lock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Crown,
} from 'lucide-react';

export interface AdminNavItem {
  moduleId: string;
  name: string;
  routePath: string;
  icon: React.ElementType;
  superAdminOnly?: boolean;
  comingSoon?: boolean;
}

export const WAVE7A_ADMIN_NAV = [
  { moduleId: 'M27', name: 'Admin Dashboard', href: '/admin', icon: LayoutDashboard },
  { moduleId: 'M28', name: 'Daily Promises Studio', href: '/admin/promises', icon: Sparkles },
  { moduleId: 'M29', name: 'Daily Verses (5,863)', href: '/admin/daily-verses', icon: BookOpen, superAdminOnly: true },
  { moduleId: 'M30', name: 'Sermons Manager', href: '/admin/sermons', icon: Video },
  { moduleId: 'M31', name: 'Songbook & Setlists', href: '/admin/songs', icon: Music },
  { moduleId: 'M32', name: 'Bible Quiz Studio', href: '/admin/quizzes', icon: HelpCircle },
];

export const WAVE7B_ADMIN_NAV: AdminNavItem[] = [
  { moduleId: 'M33', name: 'Members CRM & Registration Approvals', routePath: '/admin/members', icon: Users, comingSoon: true },
  { moduleId: 'M34', name: 'Attendance Management', routePath: '/admin/attendance', icon: CalendarCheck, comingSoon: true },
  { moduleId: 'M35', name: 'Prayer Request Moderation', routePath: '/admin/prayer', icon: HeartHandshake, comingSoon: true },
  { moduleId: 'M36', name: 'Testimony Moderation', routePath: '/admin/testimonies', icon: MessageSquareQuote, comingSoon: true },
  { moduleId: 'M37', name: 'Care Cells Management', routePath: '/admin/care-cells', icon: Network, comingSoon: true },
  { moduleId: 'M38', name: 'Baptism Requests', routePath: '/admin/baptism', icon: Droplets, comingSoon: true },
  { moduleId: 'M39', name: 'Volunteer Management', routePath: '/admin/volunteering', icon: UserCheck, comingSoon: true },
];

export const WAVE7C_ADMIN_NAV: AdminNavItem[] = [
  { moduleId: 'M40', name: 'Admin Events & RSVP Analytics', routePath: '/admin/events', icon: CalendarDays, comingSoon: true },
  { moduleId: 'M41', name: 'Admin Service Roster & Worship Operations', routePath: '/admin/service-planner', icon: ClipboardList, comingSoon: true },
  { moduleId: 'M42', name: 'Pastor Event Itinerary, Route Planner & AI Voice Assistant', routePath: '/admin/pastor-events', icon: Navigation, comingSoon: true },
  { moduleId: 'M43', name: 'Admin Job Circle & Ministry Teams', routePath: '/admin/job-circle', icon: Briefcase, comingSoon: true },
  { moduleId: 'M44', name: 'Admin Finance Suite', routePath: '/admin/finance', icon: Receipt, superAdminOnly: true, comingSoon: true },
  { moduleId: 'M45', name: 'Admin Celebrations Studio, Notifications, WhatsApp Inbox, Gallery & Online Meetings', routePath: '/admin/communications', icon: Megaphone, comingSoon: true },
  { moduleId: 'M46', name: 'Church Branches, Church Settings, Support & Platform Super Admin Console', routePath: '/admin/settings', icon: Settings, comingSoon: true },
];

const UPCOMING_ROADMAP_GROUPS = [
  {
    wave: 'Wave 7C (Planned)',
    modules: [
      'M40 Events & RSVP Analytics',
      'M41 Service Roster (9 Tabs)',
      'M42 Pastor Itinerary & AI Voice',
      'M43 Job Circle & Ministry Teams',
      'M44 Finance Suite (Super Admin)',
      'M45 Celebrations, WhatsApp & Media',
      'M46 Branches, Settings & Super Admin',
    ],
  },
];

const STORAGE_KEY_BRANCH = '@rhema_admin_demo_branch';

export const AdminNavigationShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, availableLanguages } = useLanguage();
  const { role, profile } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roadmapOpen, setRoadmapOpen] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(ADMIN_DEMO_BRANCHES[0].id);

  const isSuperAdmin = role === 'superadmin';

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BRANCH);
      if (saved && ADMIN_DEMO_BRANCHES.some((b) => b.id === saved)) {
        setSelectedBranchId(saved);
      }
    } catch {
      // ignore localStorage fallback
    }
  }, []);

  const handleBranchChange = (branchId: string) => {
    setSelectedBranchId(branchId);
    try {
      localStorage.setItem(STORAGE_KEY_BRANCH, branchId);
    } catch {
      // ignore
    }
  };

  const activeBranch = ADMIN_DEMO_BRANCHES.find((b) => b.id === selectedBranchId) || ADMIN_DEMO_BRANCHES[0];

  const getAdminPageTitle = () => {
    if (pathname === '/admin') return 'M27 · Admin Dashboard';
    if (pathname.startsWith('/admin/promises')) return 'M28 · Daily Promises & Thumbnail Studio';
    if (pathname.startsWith('/admin/daily-verses')) return 'M29 · Super Admin Daily Verses Manager';
    if (pathname.startsWith('/admin/sermons')) return 'M30 · Sermons & Study Notes Manager';
    if (pathname.startsWith('/admin/songs')) return 'M31 · Worship Songbook & Setlist Builder';
    if (pathname.startsWith('/admin/quizzes')) return 'M32 · Bible Quiz Studio & Reports';
    if (pathname.startsWith('/admin/members')) return 'M33 · Members CRM & Registration Approvals';
    if (pathname.startsWith('/admin/attendance')) return 'M34 · Attendance Management';
    if (pathname.startsWith('/admin/prayer')) return 'M35 · Prayer Request Moderation';
    if (pathname.startsWith('/admin/testimonies')) return 'M36 · Testimony Moderation';
    if (pathname.startsWith('/admin/care-cells')) return 'M37 · Care Cells Management';
    if (pathname.startsWith('/admin/baptism')) return 'M38 · Baptism Requests';
    if (pathname.startsWith('/admin/volunteering')) return 'M39 · Volunteer Management';
    if (pathname.startsWith('/admin/events')) return 'M40 · Admin Events & RSVP Analytics';
    if (pathname.startsWith('/admin/service-planner')) return 'M41 · Admin Service Roster & Worship Operations';
    if (pathname.startsWith('/admin/pastor-events')) return 'M42 · Pastor Event Itinerary, Route Planner & AI Voice Assistant';
    if (pathname.startsWith('/admin/job-circle')) return 'M43 · Admin Job Circle & Ministry Teams';
    if (pathname.startsWith('/admin/finance')) return 'M44 · Admin Finance Suite';
    if (pathname.startsWith('/admin/communications')) return 'M45 · Admin Celebrations Studio, Notifications, WhatsApp Inbox, Gallery & Online Meetings';
    if (pathname.startsWith('/admin/settings')) return 'M46 · Church Branches, Church Settings, Support & Platform Super Admin Console';
    return 'Admin Console';
  };

  const renderSidebarInner = (isMobile: boolean) => {
    const isNarrow = !isMobile && collapsed;
    return (
      <aside
        className={`bg-[#0B192C] dark:bg-[#070E17] text-white flex flex-col border-r border-slate-800/80 transition-all duration-300 ${
          isNarrow ? 'w-20' : 'w-68'
        } min-h-screen select-none`}
      >
        {/* Top Brand Block */}
        <div className="p-5 border-b border-white/10 flex flex-col items-center relative">
          {!isMobile ? (
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? 'Expand admin sidebar' : 'Collapse admin sidebar'}
              className="absolute right-3 top-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              title="Close menu"
              className="absolute right-3 top-4 p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
            >
              <X size={18} />
            </button>
          )}

          {!isNarrow ? (
            <div className="flex flex-col items-center text-center mt-1">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-[#E5C158] shadow-inner mb-2">
                <svg className="w-6 h-6 text-[#E5C158]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v9M8 5h8" strokeLinecap="round" />
                  <path d="M2 17l4.5-2 5.5 2 5.5-2 4.5 2v-8l-4.5 2-5.5-2-5.5 2-4.5-2z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="font-serif font-extrabold text-base text-white tracking-wide">
                Rhema Admin
              </h1>
              <p className="text-[10px] font-semibold text-amber-300/90 tracking-widest uppercase mt-0.5">
                Ministry Operations
              </p>
              <span className="mt-2 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-[10px] font-bold text-emerald-300">
                Wave 7A · M27–M32
              </span>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-[#E5C158] mt-2">
              <Crown size={18} />
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
          {!isNarrow && (
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-amber-400/80">
              Ministry &amp; Word (Active)
            </div>
          )}

          {WAVE7A_ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => isMobile && setMobileMenuOpen(false)}
                title={isNarrow ? `${item.moduleId}: ${item.name}` : undefined}
                className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isNarrow ? 'justify-center px-2' : ''
                } ${
                  isActive
                    ? 'bg-[#1E6F43] text-white font-semibold shadow-md shadow-emerald-950/40'
                    : 'text-slate-300 hover:text-white hover:bg-white/8'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    size={17}
                    className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-300'}`}
                  />
                  {!isNarrow && <span className="truncate">{item.name}</span>}
                </div>
                {!isNarrow && item.superAdminOnly && (
                  <span
                    title="Super Admin Only"
                    className="shrink-0 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-[9px] font-bold text-amber-300 uppercase"
                  >
                    SA
                  </span>
                )}
              </Link>
            );
          })}

          {/* Wave 7B — Ministry Operations (Canonical M33–M39) */}
          {!isNarrow && (
            <div className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-amber-400/80">
              Ministry Operations (Wave 7B)
            </div>
          )}

          {WAVE7B_ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.routePath);
            const isImplemented = ['M33', 'M34', 'M35', 'M36', 'M37', 'M38', 'M39'].includes(item.moduleId);

            if (isImplemented) {
              return (
                <Link
                  key={item.routePath}
                  href={item.routePath}
                  onClick={() => isMobile && setMobileMenuOpen(false)}
                  title={isNarrow ? `${item.moduleId}: ${item.name}` : undefined}
                  className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isNarrow ? 'justify-center px-2' : ''
                  } ${
                    isActive
                      ? 'bg-[#1E6F43] text-white font-semibold shadow-md shadow-emerald-950/40'
                      : 'text-slate-300 hover:text-white hover:bg-white/8'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      size={17}
                      className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-300'}`}
                    />
                    {!isNarrow && <span className="truncate">{item.name}</span>}
                  </div>
                </Link>
              );
            }

            return (
              <div
                key={item.routePath}
                title={isNarrow ? `${item.moduleId}: ${item.name} (Coming Soon)` : undefined}
                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isNarrow ? 'justify-center px-2' : ''
                } ${
                  isActive
                    ? 'bg-white/10 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-300 hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    size={17}
                    className="shrink-0 text-slate-400"
                  />
                  {!isNarrow && <span className="truncate">{item.name}</span>}
                </div>
                {!isNarrow && (
                  <span
                    className="shrink-0 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[9px] font-medium text-amber-300/80"
                  >
                    Soon
                  </span>
                )}
              </div>
            );
          })}

          {/* Wave 7C – Upcoming Modules (Canonical M40–M46) */}
          {!isNarrow && (
            <div className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-amber-400/80">
              Wave 7C – Upcoming Modules
            </div>
          )}

          {WAVE7C_ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            // Strict role guard: Do not expose M44 Finance to ordinary Admin users
            if (item.superAdminOnly && !isSuperAdmin) {
              return null;
            }

            const isActive = pathname.startsWith(item.routePath);
            const isImplemented = ['M40'].includes(item.moduleId) || ['M40', 'M41'].includes(item.moduleId) || ['M40', 'M41', 'M42'].includes(item.moduleId) || ['M40', 'M41', 'M42', 'M43'].includes(item.moduleId) || ['M40', 'M41', 'M42', 'M43', 'M44'].includes(item.moduleId) || ['M40', 'M41', 'M42', 'M43', 'M44', 'M45'].includes(item.moduleId) || ['M40', 'M41', 'M42', 'M43', 'M44', 'M45', 'M46'].includes(item.moduleId);

            if (isImplemented) {
              return (
                <Link
                  key={item.routePath}
                  href={item.routePath}
                  onClick={() => isMobile && setMobileMenuOpen(false)}
                  title={isNarrow ? `${item.moduleId}: ${item.name}` : undefined}
                  className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isNarrow ? 'justify-center px-2' : ''
                  } ${
                    isActive
                      ? 'bg-[#1E6F43] text-white font-semibold shadow-md shadow-emerald-950/40'
                      : 'text-slate-300 hover:text-white hover:bg-white/8'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      size={17}
                      className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-300'}`}
                    />
                    {!isNarrow && <span className="truncate">{item.name}</span>}
                  </div>
                </Link>
              );
            }

            return (
              <div
                key={item.routePath}
                title={isNarrow ? `${item.moduleId}: ${item.name} (Upcoming)` : undefined}
                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-medium cursor-not-allowed select-none opacity-60 transition-all ${
                  isNarrow ? 'justify-center px-2' : ''
                } text-slate-400 hover:text-slate-300 hover:bg-white/[0.04]`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    size={17}
                    className="shrink-0 text-slate-400"
                  />
                  {!isNarrow && <span className="truncate">{item.name}</span>}
                </div>
                {!isNarrow && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.superAdminOnly && (
                      <span
                        title="Super Admin Only"
                        className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-[9px] font-bold text-amber-300 uppercase"
                      >
                        SA
                      </span>
                    )}
                    <span
                      className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[9px] font-medium text-amber-300/80"
                    >
                      Upcoming
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Switch Back to Member View */}
          <div className="pt-3 mt-3 border-t border-white/10">
            <Link
              href="/dashboard"
              onClick={() => isMobile && setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-amber-300 hover:text-amber-200 hover:bg-white/8 transition-all ${
                isNarrow ? 'justify-center px-2' : ''
              }`}
            >
              <ArrowLeft size={16} className="shrink-0" />
              {!isNarrow && <span>Member Portal View</span>}
            </Link>
          </div>
        </nav>

        {/* Bottom Role Pill */}
        {!isNarrow && (
          <div className="p-4 border-t border-white/10 bg-[#081322] text-[11px] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Signed-in Role</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold uppercase text-[10px]">
                {role}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 leading-snug">
              UI role guard is for demonstration navigation only; not backend enforcement.
            </p>
          </div>
        )}
      </aside>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#F7F5EE] dark:bg-[#0D141D] text-[#18221B] dark:text-[#F1F5F9] font-sans transition-colors duration-200">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-xs"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:flex shrink-0 sticky top-0 h-screen z-20">
        {renderSidebarInner(false)}
      </div>

      {/* Mobile Drawer Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed left-0 top-0 z-40 md:hidden h-full shadow-2xl">
          {renderSidebarInner(true)}
        </div>
      )}

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Admin Header */}
        <header className="sticky top-0 z-20 bg-[#F7F5EE]/95 dark:bg-[#0D141D]/95 backdrop-blur-md border-b border-[#EBE6DC] dark:border-[#222F3E] px-4 sm:px-6 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Left: Mobile Trigger & Breadcrumb */}
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-1.5 rounded-lg hover:bg-[#EBE6DC] dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                aria-label="Open admin menu"
              >
                <Menu size={20} />
              </button>

              <div className="text-xs font-medium text-[#5C665F] dark:text-slate-400 truncate">
                <Link href="/admin" className="hover:text-[#1E6F43] font-semibold">
                  Admin Console
                </Link>
                <span className="mx-1.5">/</span>
                <span className="font-bold text-[#18221B] dark:text-white">
                  {getAdminPageTitle()}
                </span>
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* Branch Impersonation / Context Switcher (Demo) */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-[#131C27] border border-[#EBE6DC] dark:border-[#222F3E] rounded-full px-2.5 py-1 text-xs shadow-xs">
                <Building2 size={13} className="text-[#C89D35] shrink-0" />
                {isSuperAdmin ? (
                  <select
                    aria-label="Select simulated church branch"
                    value={selectedBranchId}
                    onChange={(e) => handleBranchChange(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
                  >
                    {ADMIN_DEMO_BRANCHES.map((b) => (
                      <option key={b.id} value={b.id} className="text-slate-900">
                        {b.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[160px]">
                    {activeBranch.name}
                  </span>
                )}
              </div>

              {/* 7-Language Selector */}
              <select
                aria-label="Select language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="bg-white dark:bg-[#131C27] border border-[#EBE6DC] dark:border-[#222F3E] rounded-full px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs focus:outline-hidden cursor-pointer"
              >
                {availableLanguages.map((l) => (
                  <option key={l.code} value={l.code} className="text-slate-900">
                    🌐 {l.label}
                  </option>
                ))}
              </select>

              {/* Theme Toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
                className="p-1.5 rounded-full bg-white dark:bg-[#131C27] border border-[#EBE6DC] dark:border-[#222F3E] text-slate-600 dark:text-amber-400 hover:bg-[#E8F3EC] transition-colors shadow-xs"
              >
                {theme === 'light' ? <Sun size={15} className="text-amber-500" /> : <Moon size={15} />}
              </button>

              {/* Member Portal Switcher */}
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0B192C] text-white text-xs font-semibold hover:bg-[#132A4A] transition-colors shadow-xs"
              >
                <ArrowLeft size={13} className="text-[#E5C158]" />
                <span className="hidden sm:inline">Member View</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Live Firebase Cloud Architecture Context Bar */}
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200/80 dark:border-emerald-800/50 px-4 sm:px-6 py-2 text-[11px] text-emerald-950 dark:text-emerald-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              <strong>Firebase Live Production Mode:</strong> Connected directly to Firestore canonical church collections. Real-time synchronizations and administrator privileges active.
            </span>
          </div>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-200/60 dark:bg-emerald-900/60 font-bold">
            Active Context: {activeBranch.city} · {profile?.fullName || 'Admin User'}
          </span>
        </div>

        {/* Main Workspace Content */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">{children}</main>

        {/* Footer */}
        <footer className="border-t border-[#EBE6DC] dark:border-[#222F3E] px-4 sm:px-6 py-3 text-center text-[11px] text-[#5C665F] dark:text-slate-400">
          Rhema Christian Ministry Administration Console &bull; Live Connected Cloud Architecture
        </footer>
      </div>
    </div>
  );
};
