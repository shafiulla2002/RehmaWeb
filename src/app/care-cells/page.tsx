'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  Users,
  Calendar,
  Clock,
  MapPin,
  Video,
  BookOpen,
  Phone,
  Home,
  CheckCircle2,
  Lock,
  ChevronRight,
  ExternalLink,
  MessageCircle,
  X,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { getLiveCareCells, LiveCareCell } from '@/lib/firestoreService';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function CareCellsPage() {
  const [careCells, setCareCells] = useState<LiveCareCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedZone, setSelectedZone] = useState<string>('All');
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [visitSubmitted, setVisitSubmitted] = useState(false);
  const [joinedCells, setJoinedCells] = useState<Record<string, boolean>>({});

  // Home Visit Form
  const [visitType, setVisitType] = useState('Sick & Healing Prayer');
  const [visitDate, setVisitDate] = useState('');
  const [visitAddress, setVisitAddress] = useState('');
  const [visitNotes, setVisitNotes] = useState('');

  const fetchCells = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getLiveCareCells('rhema');
      setCareCells(data);
    } catch (err: any) {
      console.error('[CareCellsPage] Error fetching care cells:', err);
      setError('Unable to load care cells. Please check your network connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCells();
  }, []);

  const rawZones = Array.from(new Set(careCells.map((c) => c.zone || c.location).filter(Boolean))) as string[];
  const zones = ['All', ...(rawZones.length > 0 ? rawZones : ['General'])];

  const filteredCells = careCells.filter((c) =>
    selectedZone === 'All' ? true : (c.zone === selectedZone || c.location === selectedZone)
  );

  const featuredCell = careCells[0];

  const handleVisitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = auth.currentUser;
      const visitPayload = {
        memberId: user ? user.uid : 'guest_member',
        cellId: featuredCell?.id || 'general',
        cellName: featuredCell?.name || 'Rhema Care Cell',
        visitType,
        visitDate,
        visitAddress,
        notes: visitNotes,
        status: 'Scheduled',
        createdBy: user ? user.uid : 'guest_member',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'Rhema Church', 'rhema', 'careCellVisits'), visitPayload);
    } catch (err) {
      console.error('[CareCellsPage] Visit request write error:', err);
    } finally {
      setVisitSubmitted(true);
      setTimeout(() => {
        setVisitSubmitted(false);
        setIsVisitModalOpen(false);
        setVisitDate('');
        setVisitAddress('');
        setVisitNotes('');
      }, 2000);
    }
  };

  const handleJoinCell = async (cell: LiveCareCell) => {
    const user = auth.currentUser;
    if (!user) {
      alert('Please sign in to join a care cell.');
      return;
    }
    try {
      await addDoc(collection(db, 'Rhema Church', 'rhema', 'careCellMemberships'), {
        cellId: cell.id,
        cellName: cell.name,
        memberId: user.uid,
        memberName: user.displayName || 'Church Member',
        status: 'Active',
        joinedAt: serverTimestamp(),
      });
      setJoinedCells((prev) => ({ ...prev, [cell.id]: true }));
    } catch (err) {
      console.error('[CareCellsPage] Join care cell error:', err);
    }
  };

  return (
    <AppShell allowedRoles={['member', 'admin', 'superadmin', 'guest']}>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="border-l-4 border-[#1E6F43] pl-3.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#18221B] dark:text-white tracking-tight flex items-center gap-2">
              <Users className="text-[#1E6F43]" size={28} />
              <span>Care Cell Ministry Portal</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#5C665F] dark:text-slate-400 mt-0.5">
              Small group home fellowships, weekly scripture study guides, and pastoral home visit requests.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsVisitModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#1E6F43] hover:bg-[#175835] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer self-start sm:self-auto"
          >
            <Home size={16} />
            <span>Request Pastoral Home Visit</span>
          </button>
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
              onClick={fetchCells}
              className="px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900 hover:bg-red-200 text-red-800 dark:text-red-200 font-bold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw size={12} />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* MY ASSIGNED / FEATURED CARE CELL */}
        {loading ? (
          <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#131C27] border border-[#EBE6DC] dark:border-[#222F3E] shadow-sm animate-pulse space-y-4">
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-md w-1/3" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="h-20 bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
              <div className="h-20 bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
              <div className="h-20 bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
            </div>
          </div>
        ) : featuredCell ? (
          <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#131C27] border border-[#EBE6DC] dark:border-[#222F3E] shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EFECE6] dark:border-[#1E2B3A]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900 text-[#1E6F43] flex items-center justify-center font-bold text-xl">
                  🏡
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    Active Care Cell
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-[#18221B] dark:text-white mt-1">
                    {featuredCell.name}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsVisitModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-[#E8F3EC] dark:bg-[#142B1E] text-[#1E6F43] dark:text-emerald-300 hover:bg-[#1E6F43] hover:text-white text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Home size={14} />
                  <span>Connect with Cell</span>
                </button>
              </div>
            </div>

            {/* CELL DETAILS 3-GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
                  <Clock size={12} /> Gathering Schedule
                </span>
                <p className="font-bold text-[#18221B] dark:text-white">
                  {featuredCell.meetingDay} {featuredCell.meetingTime ? `• ${featuredCell.meetingTime}` : ''}
                </p>
                <p className="text-[11px] text-[#5C665F] dark:text-slate-400">
                  Praise, Word Discussion &amp; Intercession
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
                  <Users size={12} /> Pastoral Cell Leader
                </span>
                <p className="font-bold text-[#18221B] dark:text-white">
                  {featuredCell.leaderName}
                </p>
                <p className="text-[11px] text-[#1E6F43] dark:text-emerald-400 font-medium">
                  Status: {featuredCell.status}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
                  <MapPin size={12} /> Location / Venue
                </span>
                <p className="font-bold text-[#18221B] dark:text-white truncate">
                  {featuredCell.location || featuredCell.meetingLocation || 'Rhema Church Campus'}
                </p>
                <p className="text-[11px] text-[#5C665F] dark:text-slate-400">
                  {featuredCell.zone || 'Koilakuntla'}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* WEEKLY CELL STUDY GUIDE & OUTLINE */}
        <div className="p-6 rounded-3xl bg-[#092817] dark:bg-[#061C10] text-white border border-emerald-900 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-700/60 text-emerald-200 border border-emerald-500/30 flex items-center gap-1.5">
              <BookOpen size={13} />
              <span>This Week&apos;s Fellowship Study Guide</span>
            </span>
            <span className="text-xs text-emerald-300 font-mono">
              Series: Walking in Truth
            </span>
          </div>

          <div className="space-y-2">
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-white">
              Walking in Divine Light &amp; Genuine Fellowship
            </h3>
            <p className="font-serif italic text-xs sm:text-sm text-[#F7E7B4]">
              &ldquo;If we claim to have fellowship with him and yet walk in the darkness, we lie and do not live out the truth. But if we walk in the light, as he is in the light, we have fellowship with one another, and the blood of Jesus, his Son, purifies us from all sin.&rdquo; — 1 John 1:6-7
            </p>
          </div>

          {/* Discussion Questions */}
          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10 space-y-2 text-xs">
            <h4 className="font-bold text-[#FFE8A3] uppercase tracking-wider text-[11px]">
              Cell Discussion Questions:
            </h4>
            <ul className="space-y-1.5 list-disc list-inside text-slate-200 font-sans">
              <li>What does &ldquo;walking in the light&rdquo; look like in your personal daily workplace and family life?</li>
              <li>How does sincere confession of struggles deepen unity and support within our small group?</li>
            </ul>
          </div>
        </div>

        {/* CHURCH-WIDE CARE CELLS DIRECTORY */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-bold text-base text-[#18221B] dark:text-white flex items-center gap-2">
              <Users size={18} className="text-[#1E6F43]" />
              <span>Church Care Cells Directory ({careCells.length})</span>
            </h3>

            {/* Zone Selector */}
            {zones.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {zones.map((zone) => (
                  <button
                    key={zone}
                    type="button"
                    onClick={() => setSelectedZone(zone)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      selectedZone === zone
                        ? 'bg-[#1E6F43] text-white shadow-xs'
                        : 'bg-white dark:bg-[#131C27] text-[#5C665F] dark:text-slate-400 hover:text-[#18221B] dark:hover:text-white border border-[#EBE6DC] dark:border-[#222F3E]'
                    }`}
                  >
                    {zone}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* SKELETON LOADER */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="p-5 rounded-3xl bg-white dark:bg-[#131C27] border border-[#EBE6DC] dark:border-[#222F3E] animate-pulse space-y-4"
                >
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-1/2" />
                  <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4" />
                  <div className="space-y-2">
                    <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded-md w-2/3" />
                    <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded-md w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* EMPTY STATE */}
          {!loading && filteredCells.length === 0 && (
            <div className="p-8 rounded-3xl bg-white dark:bg-[#131C27] border border-[#EBE6DC] dark:border-[#222F3E] text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Users size={24} />
              </div>
              <h4 className="font-bold text-sm text-[#18221B] dark:text-white">
                No Care Cells Found
              </h4>
              <p className="text-xs text-[#5C665F] dark:text-slate-400 max-w-sm mx-auto">
                {selectedZone !== 'All'
                  ? `No active care cells found in ${selectedZone}. Try selecting another zone.`
                  : 'Active care cell small groups will be displayed here as they are established.'}
              </p>
            </div>
          )}

          {/* GRID OF CELLS */}
          {!loading && filteredCells.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCells.map((cell) => (
                <div
                  key={cell.id}
                  className="p-5 rounded-3xl bg-white dark:bg-[#131C27] border border-[#EBE6DC] dark:border-[#222F3E] hover:border-[#1E6F43] transition-all flex flex-col justify-between space-y-4 shadow-xs group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#E8F3EC] dark:bg-[#102418] text-[#1E6F43] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60">
                        {cell.zone || cell.location || 'General'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {cell.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-[#18221B] dark:text-white group-hover:text-[#1E6F43] transition-colors">
                      {cell.name}
                    </h4>

                    <div className="space-y-1.5 text-xs text-[#5C665F] dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Clock size={13} className="shrink-0 text-slate-400" />
                        <span>
                          {cell.meetingDay} {cell.meetingTime ? `• ${cell.meetingTime}` : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users size={13} className="shrink-0 text-slate-400" />
                        <span>Leader: {cell.leaderName}</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <MapPin size={13} className="shrink-0 text-slate-400 mt-0.5" />
                        <span className="line-clamp-1">
                          {cell.location || cell.meetingLocation || 'Rhema Church Campus'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#EFECE6] dark:border-[#1E2B3A] flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400">
                      {cell.maximumMembers ? `Capacity: ${cell.maximumMembers}` : 'Open Fellowship'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleJoinCell(cell)}
                        disabled={joinedCells[cell.id]}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
                          joinedCells[cell.id]
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            : 'bg-[#E8F3EC] dark:bg-[#102418] text-[#1E6F43] dark:text-emerald-300 hover:bg-[#1E6F43] hover:text-white'
                        }`}
                      >
                        {joinedCells[cell.id] ? '✓ Joined' : 'Join'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsVisitModalOpen(true)}
                        className="px-3 py-1 rounded-full bg-[#FBF9F4] dark:bg-[#0E1520] hover:bg-[#1E6F43] hover:text-white text-[11px] font-bold text-[#5C665F] dark:text-slate-300 transition-colors cursor-pointer"
                      >
                        Contact
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECURITY & PRIVACY GOVERNANCE NOTICE */}
        <div className="p-3.5 rounded-2xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] text-[10px] text-slate-500 space-y-1">
          <span className="font-bold flex items-center gap-1 text-[#1E6F43]">
            <Lock size={12} /> Member Directory &amp; Privacy Protection:
          </span>
          <p>
            Under church security policy, private member phone directories and home addresses are never exposed or queried from client Firestore without role-based administrative authorization. Small group fellowships operate with pastoral stewardship.
          </p>
        </div>

        {/* REQUEST PASTORAL HOME VISIT MODAL */}
        {isVisitModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-[#131C27] rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-[#EBE6DC] dark:border-[#222F3E] space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#EFECE6] dark:border-[#1E2B3A]">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#1E6F43] flex items-center justify-center">
                    <Home size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#18221B] dark:text-white">
                      Request Pastoral Home Visit
                    </h3>
                    <p className="text-xs text-[#5C665F] dark:text-slate-400">
                      Our pastoral team ministers to families in their homes.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsVisitModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-black dark:hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {visitSubmitted ? (
                <div className="py-6 text-center space-y-2 animate-in zoom-in-95">
                  <CheckCircle2 size={36} className="text-[#1E6F43] mx-auto" />
                  <h4 className="font-bold text-sm text-[#18221B] dark:text-white">
                    Visit Request Received
                  </h4>
                  <p className="text-xs text-[#5C665F] dark:text-slate-400">
                    The pastoral care team will contact you to coordinate and confirm the visit time. God bless your home!
                  </p>
                </div>
              ) : (
                <form onSubmit={handleVisitSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#18221B] dark:text-white">
                      Purpose of Visit
                    </label>
                    <select
                      value={visitType}
                      onChange={(e) => setVisitType(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] text-xs text-[#18221B] dark:text-white focus:outline-hidden focus:border-[#1E6F43]"
                    >
                      <option value="Sick & Healing Prayer">Sick &amp; Healing Prayer</option>
                      <option value="House Blessing / New Home">House Blessing / New Home</option>
                      <option value="Family Pastoral Counseling">Family Pastoral Counseling</option>
                      <option value="Infant Dedication Prayer">Infant Dedication Prayer</option>
                      <option value="Senior Member Holy Communion">Senior Member Holy Communion</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#18221B] dark:text-white">
                      Preferred Date &amp; Time
                    </label>
                    <input
                      type="date"
                      required
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] text-xs text-[#18221B] dark:text-white focus:outline-hidden focus:border-[#1E6F43]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#18221B] dark:text-white">
                      Residence Address &amp; Landmark
                    </label>
                    <input
                      type="text"
                      required
                      value={visitAddress}
                      onChange={(e) => setVisitAddress(e.target.value)}
                      placeholder="e.g. Near Old Bus Stand, Koilakuntla"
                      className="w-full px-3.5 py-2 rounded-xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] text-xs text-[#18221B] dark:text-white focus:outline-hidden focus:border-[#1E6F43]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#18221B] dark:text-white">
                      Special Notes / Specific Prayer Needs
                    </label>
                    <textarea
                      rows={3}
                      value={visitNotes}
                      onChange={(e) => setVisitNotes(e.target.value)}
                      placeholder="Share any special circumstances or family needs..."
                      className="w-full px-3.5 py-2 rounded-xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] text-xs text-[#18221B] dark:text-white focus:outline-hidden focus:border-[#1E6F43]"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsVisitModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-[#EFECE6] dark:border-[#1E2B3A] text-xs font-bold text-[#5C665F] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-[#1E6F43] hover:bg-[#175835] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      Submit Visit Request
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
