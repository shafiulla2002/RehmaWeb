'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminNavigationShell } from '@/components/layout/AdminNavigationShell';
import { Button } from '@/components/ui/Button';
import {
  AdminCareCellRecord,
  INITIAL_ADMIN_CARECELLS,
} from '@/lib/adminWave7bData';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';
import {
  Network,
  Users,
  MapPin,
  Calendar,
  Clock,
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Search,
  Building,
  UserCheck,
  Send,
  AlertCircle,
  Sparkles,
  Loader2,
} from 'lucide-react';

const AVAILABLE_ZONES = [
  'All',
  'Hebbal Zone',
  'Indiranagar Zone',
  'Whitefield Zone',
  'Jayanagar Zone',
  'Central Zone',
] as const;

export default function CareCellsAdminPage() {
  const [cells, setCells] = useState<AdminCareCellRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit / Add Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCellId, setEditingCellId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formZone, setFormZone] = useState<AdminCareCellRecord['zone']>('Hebbal Zone');
  const [formLeader, setFormLeader] = useState('');
  const [formLeaderPhone, setFormLeaderPhone] = useState('+91 98455-XXXX1');
  const [formAssistant, setFormAssistant] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formDay, setFormDay] = useState<AdminCareCellRecord['meetingDay']>('Thursday');
  const [formTime, setFormTime] = useState('07:00 PM');
  const [formStudyTopic, setFormStudyTopic] = useState('Walking in the Fruit of the Spirit (Part 3)');
  const [formCapacityMax, setFormCapacityMax] = useState(18);
  const [formActiveCount, setFormActiveCount] = useState(14);
  const [formStatus, setFormStatus] = useState<AdminCareCellRecord['status']>('Active (Sim)');

  // Study Guide Distributor Modal
  const [distributorModalOpen, setDistributorModalOpen] = useState(false);
  const [bulkStudyTopic, setBulkStudyTopic] = useState('Faith Unshakable: Rooted in Christ (Coordinated with M30 Sunday Series)');
  const [selectedCellsForGuide, setSelectedCellsForGuide] = useState<string[]>([]);

  // Real-time Firestore subscription with initial seeding fallback
  useEffect(() => {
    const colRef = collection(db, 'Rhema Church', 'rhema', 'careCells');
    const unsubscribe = onSnapshot(
      colRef,
      async (snapshot) => {
        if (snapshot.empty) {
          // Seed initial care cells if empty
          try {
            const batch = writeBatch(db);
            INITIAL_ADMIN_CARECELLS.forEach((item) => {
              const newDocRef = doc(colRef, item.id);
              batch.set(newDocRef, {
                name: item.name,
                zone: item.zone,
                location: item.zone,
                meetingLocation: item.hostAddress,
                leaderName: item.leaderName,
                leaderPhone: item.leaderPhoneMasked,
                assistantLeaderName: item.assistantLeaderName,
                meetingDay: item.meetingDay,
                meetingTime: item.meetingTime,
                assignedStudyGuideTopic: item.assignedStudyGuideTopic,
                capacityMax: item.capacityMax,
                maximumMembers: item.capacityMax,
                activeMemberCount: item.activeMemberCount,
                status: 'Active',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            });
            await batch.commit();
          } catch (seedErr) {
            console.error('[CareCellsAdminPage] Seeding error:', seedErr);
            setCells(INITIAL_ADMIN_CARECELLS);
            setLoading(false);
          }
        } else {
          const loaded: AdminCareCellRecord[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: data.name || 'Care Cell',
              zone: (data.zone || data.location || 'Hebbal Zone') as AdminCareCellRecord['zone'],
              leaderName: data.leaderName || 'Leader',
              leaderPhoneMasked: data.leaderPhone || '+91 98455-XXXXX',
              assistantLeaderName: data.assistantLeaderName || '',
              hostAddress: data.meetingLocation || data.hostAddress || data.location || 'Church Campus',
              meetingDay: (data.meetingDay || 'Thursday') as AdminCareCellRecord['meetingDay'],
              meetingTime: data.meetingTime || '07:00 PM',
              assignedStudyGuideTopic: data.assignedStudyGuideTopic || 'Walking in the Spirit',
              capacityMax: data.capacityMax || data.maximumMembers || 20,
              activeMemberCount: data.activeMemberCount || 10,
              status: (data.status === 'Active' || data.status === 'Active (Sim)' ? 'Active (Sim)' : data.status) as AdminCareCellRecord['status'],
              demoTag: 'Live Church Care Cell',
            };
          });
          setCells(loaded);
          setLoading(false);
        }
      },
      (err) => {
        console.error('[CareCellsAdminPage] Firestore error:', err);
        setCells(INITIAL_ADMIN_CARECELLS);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const openEditor = (c?: AdminCareCellRecord) => {
    if (c) {
      setEditingCellId(c.id);
      setFormName(c.name);
      setFormZone(c.zone);
      setFormLeader(c.leaderName);
      setFormLeaderPhone(c.leaderPhoneMasked);
      setFormAssistant(c.assistantLeaderName);
      setFormAddress(c.hostAddress);
      setFormDay(c.meetingDay);
      setFormTime(c.meetingTime);
      setFormStudyTopic(c.assignedStudyGuideTopic);
      setFormCapacityMax(c.capacityMax);
      setFormActiveCount(c.activeMemberCount);
      setFormStatus(c.status);
    } else {
      setEditingCellId(null);
      setFormName('');
      setFormZone('Central Zone');
      setFormLeader('');
      setFormLeaderPhone('+91 98455-XXXXX');
      setFormAssistant('');
      setFormAddress('');
      setFormDay('Friday');
      setFormTime('07:00 PM');
      setFormStudyTopic('Grace Foundations (Weekly Study Series)');
      setFormCapacityMax(16);
      setFormActiveCount(8);
      setFormStatus('Active (Sim)');
    }
    setModalOpen(true);
  };

  const handleSaveCell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formLeader.trim()) return;

    try {
      if (editingCellId) {
        const docRef = doc(db, 'Rhema Church', 'rhema', 'careCells', editingCellId);
        await updateDoc(docRef, {
          name: formName.trim(),
          zone: formZone,
          location: formZone,
          meetingLocation: formAddress.trim(),
          leaderName: formLeader.trim(),
          leaderPhone: formLeaderPhone.trim(),
          assistantLeaderName: formAssistant.trim(),
          meetingDay: formDay,
          meetingTime: formTime.trim(),
          assignedStudyGuideTopic: formStudyTopic.trim(),
          capacityMax: formCapacityMax,
          maximumMembers: formCapacityMax,
          activeMemberCount: formActiveCount,
          status: formStatus.includes('Inactive') ? 'Inactive' : 'Active',
          updatedAt: serverTimestamp(),
        });
        showToast(`Updated care cell ${editingCellId}.`);
      } else {
        const colRef = collection(db, 'Rhema Church', 'rhema', 'careCells');
        const docRef = await addDoc(colRef, {
          name: formName.trim(),
          zone: formZone,
          location: formZone,
          meetingLocation: formAddress.trim(),
          leaderName: formLeader.trim(),
          leaderPhone: formLeaderPhone.trim(),
          assistantLeaderName: formAssistant.trim(),
          meetingDay: formDay,
          meetingTime: formTime.trim(),
          assignedStudyGuideTopic: formStudyTopic.trim(),
          capacityMax: formCapacityMax,
          maximumMembers: formCapacityMax,
          activeMemberCount: formActiveCount,
          status: 'Active',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        showToast(`Created new care cell ${docRef.id}.`);
      }
    } catch (err: any) {
      console.error('[CareCellsAdminPage] Save error:', err);
      showToast('Error saving care cell.');
    }
    setModalOpen(false);
  };

  const handleDeleteCell = async (id: string) => {
    if (confirm(`Remove care cell ${id} from church directory?`)) {
      try {
        await deleteDoc(doc(db, 'Rhema Church', 'rhema', 'careCells', id));
        showToast(`Removed care cell ${id}.`);
      } catch (err: any) {
        console.error('[CareCellsAdminPage] Delete error:', err);
        showToast('Error deleting care cell.');
      }
    }
  };

  const handleDistributeStudyGuide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkStudyTopic.trim()) return;

    try {
      const batch = writeBatch(db);
      const targetCells = cells.filter(
        (c) => selectedCellsForGuide.length === 0 || selectedCellsForGuide.includes(c.id)
      );
      targetCells.forEach((c) => {
        batch.update(doc(db, 'Rhema Church', 'rhema', 'careCells', c.id), {
          assignedStudyGuideTopic: bulkStudyTopic.trim(),
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
      showToast(`Distributed study guide to ${targetCells.length} care cells.`);
    } catch (err: any) {
      console.error('[CareCellsAdminPage] Distribute error:', err);
      showToast('Error distributing study guide.');
    }
    setDistributorModalOpen(false);
  };

  const filteredCells = useMemo(() => {
    return cells.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.leaderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.hostAddress.toLowerCase().includes(searchQuery.toLowerCase());
      const matchZone = selectedZone === 'All' || c.zone === selectedZone;
      return matchSearch && matchZone;
    });
  }, [cells, searchQuery, selectedZone]);

  return (
    <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
      <AdminNavigationShell>
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-400">
                <Network size={14} />
                <span>M37 — Ministry Operations</span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                Care Cells Management &amp; Zone Oversight
              </h1>
              <p className="text-xs text-slate-400">
                Organize geographic fellowship zones, assign cell leaders, track home venue capacities, and coordinate weekly study guides.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-slate-700 text-slate-200"
                onClick={() => {
                  setSelectedCellsForGuide([]);
                  setDistributorModalOpen(true);
                }}
              >
                <BookOpen size={15} />
                <span>Distribute Study Guide</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="gap-2 font-bold bg-amber-500 hover:bg-amber-400 text-slate-950"
                onClick={() => openEditor()}
              >
                <Plus size={15} />
                <span>+ Add Care Cell</span>
              </Button>
            </div>
          </div>

          {/* Toast Notification */}
          {toastMessage && (
            <div className="p-3.5 bg-emerald-950/80 border border-emerald-500/40 rounded-xl flex items-center justify-between text-xs text-emerald-200 shadow-lg animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>{toastMessage}</span>
              </div>
              <button onClick={() => setToastMessage(null)} className="text-emerald-400 hover:text-white">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Zone Navigation Pills & Search Bar */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
              {AVAILABLE_ZONES.map((zone) => (
                <button
                  key={zone}
                  onClick={() => setSelectedZone(zone)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    selectedZone === zone
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {zone}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-64">
              <Search size={15} className="absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cell or leader..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Care Cells Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredCells.map((cell) => {
              const capacityPct = Math.min(100, Math.round((cell.activeMemberCount / cell.capacityMax) * 100));
              const isFull = cell.activeMemberCount >= cell.capacityMax;

              return (
                <div
                  key={cell.id}
                  className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 shadow-xl hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold font-mono text-amber-400 uppercase tracking-wider block">
                          {cell.id} &bull; {cell.zone}
                        </span>
                        <h3 className="text-base font-bold text-white">{cell.name}</h3>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          cell.status.startsWith('Active')
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {cell.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs text-slate-300 bg-slate-950 p-3 rounded-2xl border border-slate-800/80">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <UserCheck size={14} className="text-amber-400" />
                          <span className="font-semibold text-white">{cell.leaderName}</span>
                          <span className="text-[10px] text-slate-500">(Leader)</span>
                        </div>
                        <span className="text-[11px] text-slate-400">{cell.leaderPhoneMasked}</span>
                      </div>
                      {cell.assistantLeaderName && (
                        <div className="text-[11px] text-slate-400 pl-5">
                          Asst: {cell.assistantLeaderName}
                        </div>
                      )}

                      <div className="flex items-start gap-2 pt-1.5 border-t border-slate-800">
                        <MapPin size={13} className="text-slate-500 shrink-0 mt-0.5" />
                        <span className="text-[11px] text-slate-300">{cell.hostAddress}</span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px] text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-500" />
                          <span>{cell.meetingDay}s</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock size={13} className="text-slate-500" />
                          <span>{cell.meetingTime}</span>
                        </div>
                      </div>
                    </div>

                    {/* Weekly Study Topic Pill */}
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-0.5">
                        Assigned Weekly Study Guide (Linked to M30)
                      </span>
                      <p className="text-[11px] font-medium leading-relaxed">{cell.assignedStudyGuideTopic}</p>
                    </div>

                    {/* Member Capacity Progress Bar */}
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Roster Capacity:</span>
                        <span className={`font-semibold ${isFull ? 'text-red-400' : 'text-slate-200'}`}>
                          {cell.activeMemberCount} / {cell.capacityMax} Members ({capacityPct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-950 overflow-hidden">
                        <div
                          style={{ width: `${capacityPct}%` }}
                          className={`h-full rounded-full transition-all ${
                            isFull ? 'bg-red-500' : capacityPct > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs border-slate-700 text-slate-300 hover:text-white"
                      onClick={() => openEditor(cell)}
                    >
                      <Edit2 size={13} />
                      <span>Edit Cell</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs text-red-400 border-red-950 hover:bg-red-950/40"
                      onClick={() => handleDeleteCell(cell.id)}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* EDIT / ADD MODAL */}
          {modalOpen && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {editingCellId ? `Edit Care Cell ${editingCellId}` : 'Add New Care Cell Fellowship'}
                    </h3>
                    <p className="text-xs text-slate-400">Local Demonstration Store (Zero Live Firebase)</p>
                  </div>
                  <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSaveCell} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Care Cell Name *</label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Grace & Truth Fellowship"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 font-medium mb-1">Geographic Zone</label>
                      <select
                        value={formZone}
                        onChange={(e) => setFormZone(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500"
                      >
                        <option value="Hebbal Zone">Hebbal Zone</option>
                        <option value="Indiranagar Zone">Indiranagar Zone</option>
                        <option value="Whitefield Zone">Whitefield Zone</option>
                        <option value="Jayanagar Zone">Jayanagar Zone</option>
                        <option value="Central Zone">Central Zone</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 font-medium mb-1">Cell Status</label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500"
                      >
                        <option value="Active (Sim)">Active</option>
                        <option value="New / Launching (Sim)">New / Launching</option>
                        <option value="On Hold (Sim)">On Hold</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 font-medium mb-1">Appointed Leader *</label>
                      <input
                        type="text"
                        required
                        value={formLeader}
                        onChange={(e) => setFormLeader(e.target.value)}
                        placeholder="Brother Mark David"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-medium mb-1">Leader Masked Phone</label>
                      <input
                        type="text"
                        value={formLeaderPhone}
                        onChange={(e) => setFormLeaderPhone(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Assistant Leader / Co-Host</label>
                    <input
                      type="text"
                      value={formAssistant}
                      onChange={(e) => setFormAssistant(e.target.value)}
                      placeholder="Sister Reena David"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Host Home Address *</label>
                    <input
                      type="text"
                      required
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      placeholder="e.g. Flat 402, Royal Palms, Kempapura, Hebbal"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 font-medium mb-1">Meeting Day</label>
                      <select
                        value={formDay}
                        onChange={(e) => setFormDay(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500"
                      >
                        <option value="Wednesday">Wednesday</option>
                        <option value="Thursday">Thursday</option>
                        <option value="Friday">Friday</option>
                        <option value="Saturday">Saturday</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 font-medium mb-1">Meeting Time</label>
                      <input
                        type="text"
                        value={formTime}
                        onChange={(e) => setFormTime(e.target.value)}
                        placeholder="07:00 PM"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 font-medium mb-1">Active Attendees</label>
                      <input
                        type="number"
                        min={0}
                        value={formActiveCount}
                        onChange={(e) => setFormActiveCount(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-medium mb-1">Max Venue Capacity</label>
                      <input
                        type="number"
                        min={1}
                        value={formCapacityMax}
                        onChange={(e) => setFormCapacityMax(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Weekly Discussion Guide Topic</label>
                    <input
                      type="text"
                      value={formStudyTopic}
                      onChange={(e) => setFormStudyTopic(e.target.value)}
                      placeholder="Coordinated sermon study guide..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-slate-700 text-slate-300"
                      onClick={() => setModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="secondary"
                      size="sm"
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                    >
                      Save Care Cell
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* STUDY GUIDE DISTRIBUTOR MODAL */}
          {distributorModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
                <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <BookOpen size={16} className="text-amber-400" />
                      <span>Distribute Weekly Study Guide</span>
                    </h3>
                    <p className="text-xs text-slate-400">Coordinated with M30 Sunday Sermon Series</p>
                  </div>
                  <button onClick={() => setDistributorModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleDistributeStudyGuide} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Study Guide Discussion Theme *</label>
                    <textarea
                      rows={3}
                      required
                      value={bulkStudyTopic}
                      onChange={(e) => setBulkStudyTopic(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500 leading-relaxed"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[11px] leading-relaxed">
                    This will synchronize the study guide topic across all active care cell leaders for their midweek discussion meetings.
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-slate-700 text-slate-300"
                      onClick={() => setDistributorModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="secondary"
                      size="sm"
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold gap-1.5"
                    >
                      <Send size={14} />
                      <span>Distribute to Leaders</span>
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </AdminNavigationShell>
    </ProtectedRoute>
  );
}
