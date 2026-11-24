'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  BookOpen,
  Video,
  Music,
  Calendar,
  HeartHandshake,
  Heart,
  CheckSquare,
  User,
  FileText,
  HelpCircle,
  Users,
  Shield,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  Briefcase,
  Waves,
  Tv,
  PartyPopper,
  Camera,
  Bell,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export interface NavItemConfig {
  key: string;
  name: string;
  href: string;
  icon: React.ElementType;
  isAction?: boolean;
}

export const MAIN_NAV_ITEMS: NavItemConfig[] = [
  { key: 'dashboard', name: 'Dashboard', href: '/dashboard', icon: Home },
  { key: 'bible', name: 'Bible', href: '/bible', icon: BookOpen },
  { key: 'sermons', name: 'Sermons', href: '/sermons', icon: Video },
  { key: 'songs', name: 'Songs', href: '/songs', icon: Music },
  { key: 'events', name: 'Events', href: '/events', icon: Calendar },
  { key: 'prayer', name: 'Prayer Wall', href: '/prayer', icon: HeartHandshake },
  { key: 'giving', name: 'Online Giving', href: '/giving', icon: Heart },
  { key: 'attendance', name: 'Attendance', href: '/attendance', icon: CheckSquare },
  { key: 'profile', name: 'Profile', href: '/profile', icon: User },
];

export const EXTENDED_NAV_ITEMS: NavItemConfig[] = [
  { key: 'notes', name: 'Personal Notes', href: '/notes', icon: FileText },
  { key: 'quiz', name: 'Bible Quiz', href: '/quiz', icon: HelpCircle },
  { key: 'care-cells', name: 'Care Cells', href: '/care-cells', icon: Users },
  { key: 'service-duties', name: 'Service Duties', href: '/service-duties', icon: Layers },
  { key: 'testimonies', name: 'Testimonies', href: '/testimonies', icon: Sparkles },
  { key: 'volunteering', name: 'Volunteering', href: '/volunteering', icon: Heart },
  { key: 'jobs', name: 'Job Circle', href: '/jobs', icon: Briefcase },
  { key: 'baptism', name: 'Water Baptism', href: '/baptism', icon: Waves },
  { key: 'online-meetings', name: 'Online Meetings', href: '/online-meetings', icon: Tv },
  { key: 'celebrations', name: 'Celebrations', href: '/celebrations', icon: PartyPopper },
  { key: 'gallery', name: 'Photo Gallery', href: '/gallery', icon: Camera },
  { key: 'notifications', name: 'Notifications', href: '/notifications', icon: Bell },
];

export function Sidebar({
  collapsed,
  onToggle,
  onOpenModal,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onOpenModal?: (modalType: 'giving' | 'attendance' | 'profile') => void;
}) {
  const pathname = usePathname();
  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'superadmin';
  const isExtendedActive = EXTENDED_NAV_ITEMS.some((item) => pathname.startsWith(item.href));
  const [extendedOpen, setExtendedOpen] = useState(isExtendedActive);

  return (
    <aside
      className={`bg-[#0B192C] dark:bg-[#070E17] text-white flex flex-col transition-all duration-300 border-r border-slate-800/80 ${
        collapsed ? 'w-20' : 'w-64'
      } min-h-screen select-none`}
    >
      {/* Top Branding Header */}
      <div className="p-5 border-b border-white/10 flex flex-col items-center relative">
        <button
          type="button"
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute right-3 top-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {!collapsed ? (
          <div className="flex flex-col items-center text-center mt-1">
            {/* Gold Cross & Bible Emblem */}
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-inner mb-2.5">
              <svg className="w-7 h-7 text-[#E5C158]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v9M8 5h8" strokeLinecap="round" />
                <path d="M2 17l4.5-2 5.5 2 5.5-2 4.5 2v-8l-4.5 2-5.5-2-5.5 2-4.5-2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="font-serif font-extrabold text-lg text-white tracking-wide">
              Rhema Web
            </h1>
            <p className="text-[11px] font-medium text-amber-300/80 tracking-wider uppercase mt-0.5">
              Christian Ministry
            </p>

            {/* Subtle Gold Divider with Ornament */}
            <div className="flex items-center gap-2 w-36 my-3 opacity-60">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-amber-400" />
              <div className="w-1.5 h-1.5 rotate-45 bg-amber-300" />
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-amber-400" />
            </div>
          </div>
        ) : (
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center text-amber-300 mt-2">
            <svg className="w-6 h-6 text-[#E5C158]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v9M8 5h8" strokeLinecap="round" />
              <path d="M2 17l4.5-2 5.5 2 5.5-2 4.5 2v-8l-4.5 2-5.5-2-5.5 2-4.5-2z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto scrollbar-thin">
        {MAIN_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            (item.href === '/dashboard' && pathname === '/dashboard') ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                collapsed ? 'justify-center px-2' : ''
              } ${
                isActive
                  ? 'bg-[#1E6F43] text-white font-semibold shadow-md shadow-emerald-950/40'
                  : 'text-slate-300 hover:text-white hover:bg-white/8'
              }`}
            >
              <Icon
                size={18}
                className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-300'}`}
              />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}

        {/* More Ministries Section */}
        <div className="pt-2">
          {!collapsed ? (
            <button
              type="button"
              onClick={() => setExtendedOpen(!extendedOpen)}
              className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-amber-400/80 hover:text-amber-300 hover:bg-white/5 rounded-lg transition-colors"
            >
              <span>More Ministries</span>
              {extendedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          ) : (
            <div className="h-[1px] bg-white/10 my-2" />
          )}

          {(extendedOpen || collapsed) && (
            <div className={`space-y-1 ${!collapsed ? 'pl-1 pt-1' : ''}`}>
              {EXTENDED_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    title={collapsed ? item.name : undefined}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      collapsed ? 'justify-center px-2' : ''
                    } ${
                      isActive
                        ? 'bg-[#1E6F43] text-white font-semibold shadow-xs'
                        : 'text-slate-400 hover:text-white hover:bg-white/8'
                    }`}
                  >
                    <Icon
                      size={16}
                      className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`}
                    />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Admin Navigation (if authorized) */}
        {isAdmin && (
          <div className="pt-3 border-t border-white/10 mt-3">
            <Link
              href="/admin"
              className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                collapsed ? 'justify-center px-2' : ''
              } ${
                pathname.startsWith('/admin')
                  ? 'bg-amber-600 text-white font-semibold shadow-md'
                  : 'text-amber-300/80 hover:text-amber-200 hover:bg-white/8'
              }`}
            >
              <Shield size={18} className="shrink-0" />
              {!collapsed && <span>Admin Console</span>}
            </Link>
          </div>
        )}
      </nav>

      {/* Scenic Cross on the Hill Silhouette (matching the design mockup) */}
      {!collapsed && (
        <div className="mt-auto p-4 pt-1">
          <div className="relative rounded-2xl overflow-hidden h-28 border border-white/10 bg-gradient-to-t from-[#040810] via-[#0A1728] to-[#12233A] flex items-end justify-center pb-1 shadow-inner">
            {/* Warm twilight radiance glow */}
            <div className="absolute w-24 h-24 rounded-full bg-amber-400/20 blur-xl top-2" />
            <div className="absolute w-14 h-14 rounded-full bg-orange-300/15 blur-md top-4" />

            {/* Distant Hills */}
            <div className="absolute bottom-0 inset-x-0 h-9 bg-[#060D19]/80 rounded-t-[60%]" />
            <div className="absolute bottom-0 inset-x-0 h-6 bg-[#03060C] rounded-t-[40%]" />

            {/* Central Holy Cross Silhouette */}
            <div className="relative z-10 flex flex-col items-center mb-1">
              {/* Vertical beam */}
              <div className="w-1.5 h-14 bg-amber-100/90 shadow-lg" />
              {/* Horizontal beam */}
              <div className="w-7 h-1.5 bg-amber-100/90 -mt-10 mb-8 shadow-lg" />
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
