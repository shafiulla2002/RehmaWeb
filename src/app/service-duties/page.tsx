'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Music,
  Mic,
  Monitor,
  BookOpen,
  Tv,
  CalendarDays,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Lock,
} from 'lucide-react';

export interface LiveServicePlan {
  id: string;
  serviceTitle: string;
  serviceType?: string;
  serviceDate?: string;
  date?: string;
  time?: string;
  serviceStartTime?: string;
  location?: string;
  venue?: string;
  preacher?: string;
  leader?: string;
  status?: string;
  totalDurationMinutes?: number;
  runSheet?: Array<{
    order: number;
    program: string;
    responsiblePerson?: string;
    durationMinutes?: number;
    category?: string;
  }>;
  setlist?: Array<{
    title: string;
    key?: string;
    leadSinger?: string;
  }>;
}

export default function ServiceDutiesPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<LiveServicePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<LiveServicePlan | null>(null);

  // Fetch live service plans from canonical path: Rhema Church/rhema/servicePlans
  useEffect(() => {
    async function loadServicePlans() {
      try {
        setLoading(true);
        setError(null);

        const colRef = collection(db, 'Rhema Church', 'rhema', 'servicePlans');
        const snap = await getDocs(colRef);

        const list: LiveServicePlan[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            serviceTitle: d.serviceTitle || d.title || 'Church Worship Service',
            serviceType: d.serviceType || 'sunday_worship',
            date: d.serviceDate || d.date || 'Upcoming Sunday',
            time: d.serviceStartTime || d.time || '10:00 AM - 12:00 PM',
            location: d.location || d.venue || 'Rhema Main Sanctuary',
            preacher: d.preacher || d.speaker || 'Pastoral Team',
            status: d.status || 'Active',
            totalDurationMinutes: d.totalDurationMinutes || 120,
            runSheet: Array.isArray(d.runSheet) ? d.runSheet : [],
            setlist: Array.isArray(d.setlist) ? d.setlist : [],
          });
        });

        setPlans(list);
        if (list.length > 0) {
          setSelectedPlan(list[0]);
        }
      } catch (err: unknown) {
        console.warn('Failed to load service plans:', err);
        setError('Unable to load service plans from church database. Please verify your connection.');
      } finally {
        setLoading(false);
      }
    }

    loadServicePlans();
  }, []);

  return (
    <AppShell allowedRoles={['member', 'admin', 'superadmin', 'guest']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <CalendarDays size={24} />
            </span>
            <div>
              <h1 className="text-2xl font-black text-white">Service Duties &amp; Roster</h1>
              <p className="text-xs text-slate-400">
                View church order of service, duty assignments, and live ministry schedule
              </p>
            </div>
          </div>

          <Link
            href="/service-duties/live-hud"
            className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-transform active:scale-95 shadow-lg"
          >
            <Tv size={16} />
            <span>Launch Stage Live HUD</span>
          </Link>
        </div>

        {/* Security architecture banner */}
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl flex items-start gap-3 text-xs text-slate-300">
          <ShieldAlert size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-amber-300 uppercase tracking-wider text-[11px]">
              Live Plans &bull; Read-Only Roster Protection
            </span>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Service plans and stage run sheets are loaded live from the Rhema Church database. Duty acceptance updates and availability modification writes are restricted until verified role-level write validation is deployed.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-950/60 border border-red-800 rounded-2xl flex items-start gap-3 text-xs text-red-200">
            <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Live Plans Grid */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <Sparkles size={16} /> Scheduled Church Service Plans
          </h2>

          {loading ? (
            <div className="py-12 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-3">
              <RefreshCw size={28} className="animate-spin text-amber-400 mx-auto" />
              <p className="text-xs text-slate-400">Loading service plans from church database...</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="py-12 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-2">
              <Calendar size={32} className="text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-300">No Service Plans Scheduled</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No active service plans are published in the church collection at this time.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map((p) => {
                const isSelected = selectedPlan?.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPlan(p)}
                    className={`text-left p-6 rounded-3xl border transition-all space-y-4 flex flex-col justify-between ${
                      isSelected
                        ? 'bg-slate-900 border-amber-500 shadow-xl'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          {p.serviceType?.replace(/_/g, ' ') || 'Worship'}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                          <Clock size={12} /> {p.totalDurationMinutes || 120}m
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white">{p.serviceTitle}</h3>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <MapPin size={12} className="text-slate-500 shrink-0" />
                        <span className="truncate">{p.location}</span>
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-amber-400 font-mono text-[11px]">{p.date}</span>
                      <span className="text-slate-400 text-[11px]">Speaker: {p.preacher}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Service Plan Run Sheet / Order of Service */}
        {selectedPlan && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Order of Service &amp; Stage Run Sheet
                </span>
                <h3 className="text-xl font-bold text-white mt-1">{selectedPlan.serviceTitle}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedPlan.date} &bull; {selectedPlan.time} &bull; {selectedPlan.location}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {selectedPlan.status || 'Active Roster'}
                </span>
              </div>
            </div>

            {/* Run Sheet Items */}
            {selectedPlan.runSheet && selectedPlan.runSheet.length > 0 ? (
              <div className="divide-y divide-slate-800">
                {selectedPlan.runSheet.map((item, idx) => (
                  <div
                    key={idx}
                    className="py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-slate-950 border border-slate-800 text-amber-400 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                        {item.order || idx + 1}
                      </span>
                      <div>
                        <div className="font-semibold text-white text-sm">{item.program}</div>
                        {item.responsiblePerson && (
                          <div className="text-slate-400 text-[11px]">Assigned: {item.responsiblePerson}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:self-center self-start pl-9 sm:pl-0">
                      {item.durationMinutes && (
                        <span className="px-2.5 py-0.5 rounded-md bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-400">
                          {item.durationMinutes} mins
                        </span>
                      )}
                      {item.category && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300">
                          {item.category.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No detailed run sheet segments recorded for this service plan.
              </div>
            )}

            {/* Roster Assignment Actions Notice */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Lock size={14} className="text-slate-500" />
                <span>Roster status modifications are restricted to ministry coordinators.</span>
              </span>
              <span className="font-mono text-[11px] text-slate-600">ID: {selectedPlan.id}</span>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
