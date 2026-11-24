'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import {
  User,
  Users,
  Settings,
  Shield,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle2,
  Heart,
  Globe,
  Sun,
  Moon,
  Info,
  Building,
  Award,
  Sparkles,
  BookOpen,
  Lock,
  AlertCircle,
  RefreshCw,
  Edit2,
  Save,
  X,
} from 'lucide-react';
import { getLiveMemberProfile, LiveMemberProfile } from '@/lib/firestoreService';

export default function ProfilePage() {
  const { user, profile, role } = useAuth();
  const { language, setLanguage, availableLanguages } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const [memberProfile, setMemberProfile] = useState<LiveMemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'household' | 'settings' | 'about'>('overview');

  // Edit Profile Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formStreet, setFormStreet] = useState('');
  const [formState, setFormState] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Preference states
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [careCellAlerts, setCareCellAlerts] = useState(true);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchProfile = async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await getLiveMemberProfile(user.uid, 'rhema');
      setMemberProfile(data);

      if (data) {
        setFormName(data.name || profile?.fullName || '');
        setFormEmail(data.email || user.email || '');
        setFormCity(data.city || '');
        setFormState(data.state || '');
      }
    } catch (err: any) {
      console.error('[ProfilePage] Error fetching member profile:', err);
      setError('Unable to load member profile details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user?.uid]);

  const handleOpenEdit = () => {
    setFormName(memberProfile?.name || profile?.fullName || user?.displayName || '');
    setFormEmail(memberProfile?.email || user?.email || '');
    setFormCity(memberProfile?.city || '');
    setFormState(memberProfile?.state || '');
    setEditModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;

    setIsSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const memberRef = doc(db, 'Rhema Church', 'rhema', 'members', user.uid);

      const updates: Record<string, any> = {
        name: formName.trim(),
        fullName: formName.trim(),
        email: formEmail.trim(),
        city: formCity.trim(),
        mailingCity: formCity.trim(),
        state: formState.trim(),
        mailingState: formState.trim(),
        street: formStreet.trim(),
        mailingStreet: formStreet.trim(),
        languagePreference: language,
        notificationPreferences: {
          emailAlerts,
          smsAlerts,
          careCellAlerts,
        },
        updatedAt: nowIso,
      };

      await setDoc(memberRef, updates, { merge: true });

      // Refresh in-memory profile
      setMemberProfile((prev) =>
        prev
          ? {
              ...prev,
              name: formName.trim(),
              email: formEmail.trim(),
              city: formCity.trim(),
              state: formState.trim(),
            }
          : null
      );

      showToast('Profile updated successfully!');
      setEditModalOpen(false);
    } catch (err: any) {
      console.error('[M26 Profile] Error saving profile updates:', err);
      showToast(`Error: ${err.message || 'Failed to save profile'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!user?.uid) return;
    try {
      const memberRef = doc(db, 'Rhema Church', 'rhema', 'members', user.uid);
      await updateDoc(memberRef, {
        languagePreference: language,
        notificationPreferences: {
          emailAlerts,
          smsAlerts,
          careCellAlerts,
        },
        updatedAt: new Date().toISOString(),
      });
      showToast('Preferences saved to church account!');
    } catch (e) {
      // Local fallback
      showToast('Preferences updated locally!');
    }
  };

  const displayName = memberProfile?.name || profile?.fullName || user?.displayName || 'Rhema Church Member';
  const displayRole = memberProfile?.userType || role || 'Member';
  const displayEmail = memberProfile?.email || user?.email || 'Registered via Phone';
  const displayPhone = memberProfile?.phone || user?.phoneNumber || 'Registered Member';
  const displayCode = memberProfile?.memberCode || `RHM-${(user?.uid || 'MEM').substring(0, 6).toUpperCase()}`;
  const displayCell = memberProfile?.careCell || 'Rhema Fellowship';
  const displayStatus = memberProfile?.status || 'Active';

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-emerald-600 text-white text-xs font-semibold rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
            <CheckCircle2 size={16} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Banner with Colossians 3:12-14 */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B192C] via-[#132A4A] to-[#1E6F43] text-white p-6 md:p-8 shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-400/40 text-amber-300 font-serif font-extrabold text-2xl flex items-center justify-center shadow-inner shrink-0">
                {displayName.charAt(0).toUpperCase()}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl md:text-2xl font-serif font-extrabold tracking-tight">
                    {displayName}
                  </h1>
                  <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold uppercase">
                    {displayRole}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold uppercase">
                    {displayStatus}
                  </span>
                </div>
                <p className="text-slate-300 text-xs">
                  Member ID: <span className="font-mono text-amber-200">{displayCode}</span> • {displayCell}
                </p>
                <div className="pt-1 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/10 text-[10px] text-amber-200 border border-white/15">
                    <Shield size={12} className="text-amber-300" />
                    <span>Protected Profile • Live Firebase Synchronized</span>
                  </span>
                  <button
                    onClick={handleOpenEdit}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    <Edit2 size={12} />
                    <span>Edit Profile</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="text-right hidden sm:block">
              <p className="text-xs text-amber-300 font-serif italic max-w-xs leading-relaxed">
                &ldquo;Therefore, as God&apos;s chosen people, holy and dearly loved, clothe yourselves with compassion, kindness, humility, gentleness and patience.&rdquo;
              </p>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest block mt-1">
                Colossians 3:12
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-4 border-b border-[#EBE6DC] dark:border-[#222F3E] text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2 px-1 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'overview'
                ? 'border-[#1E6F43] text-[#1E6F43] dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <User size={14} />
            <span>Profile Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('household')}
            className={`pb-2 px-1 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'household'
                ? 'border-[#1E6F43] text-[#1E6F43] dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Users size={14} />
            <span>Household &amp; Family</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-2 px-1 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'settings'
                ? 'border-[#1E6F43] text-[#1E6F43] dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Settings size={14} />
            <span>Preferences &amp; Language</span>
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`pb-2 px-1 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'about'
                ? 'border-[#1E6F43] text-[#1E6F43] dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Building size={14} />
            <span>About Rhema Church</span>
          </button>
        </div>

        {/* Tab 1: Profile Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-5">
              {loading && (
                <div className="bg-white dark:bg-[#131C27] rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] p-6 shadow-xs animate-pulse space-y-4">
                  <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-1/3" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="h-16 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
                    <div className="h-16 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
                    <div className="h-16 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
                    <div className="h-16 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
                  </div>
                </div>
              )}

              {!loading && (
                <div className="bg-white dark:bg-[#131C27] rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif font-bold text-base text-slate-900 dark:text-white">
                      Personal Membership Information
                    </h3>
                    <button
                      onClick={handleOpenEdit}
                      className="text-xs text-[#1E6F43] dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
                    >
                      <Edit2 size={12} />
                      <span>Edit Details</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 rounded-xl bg-[#F7F5EE]/60 dark:bg-[#0D141D] border border-[#EBE6DC] dark:border-[#222F3E]">
                      <span className="text-slate-400 block text-[11px]">Full Name</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {displayName}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#F7F5EE]/60 dark:bg-[#0D141D] border border-[#EBE6DC] dark:border-[#222F3E]">
                      <span className="text-slate-400 block text-[11px]">Email Address</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {displayEmail}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#F7F5EE]/60 dark:bg-[#0D141D] border border-[#EBE6DC] dark:border-[#222F3E]">
                      <span className="text-slate-400 block text-[11px]">Contact Phone</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {displayPhone}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#F7F5EE]/60 dark:bg-[#0D141D] border border-[#EBE6DC] dark:border-[#222F3E]">
                      <span className="text-slate-400 block text-[11px]">Care Cell Small Group</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {displayCell}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#F7F5EE]/60 dark:bg-[#0D141D] border border-[#EBE6DC] dark:border-[#222F3E]">
                      <span className="text-slate-400 block text-[11px]">Membership Code</span>
                      <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">
                        {displayCode}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#F7F5EE]/60 dark:bg-[#0D141D] border border-[#EBE6DC] dark:border-[#222F3E]">
                      <span className="text-slate-400 block text-[11px]">City &amp; Region</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {[memberProfile?.city, memberProfile?.state].filter(Boolean).join(', ') || 'Koilakuntla, Andhra Pradesh'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* SECURITY & WRITE-LOCK GOVERNANCE NOTICE */}
              <div className="p-4 rounded-2xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2 font-bold text-[#1E6F43] dark:text-emerald-400 text-xs">
                  <Shield size={15} />
                  <span>Church Governance &amp; Security Policy</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  System-managed membership records (roles, church association, membership identifiers, account status, and phone verifications) are protected against client-side tampering. You can update your contact name, email, city, and address at any time.
                </p>
              </div>
            </div>

            {/* Pastoral Sidebar */}
            <div className="space-y-5">
              <div className="bg-white dark:bg-[#131C27] rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] p-5 shadow-xs space-y-3 text-xs">
                <h4 className="font-serif font-bold text-sm text-slate-900 dark:text-white">
                  Rhema Church Pastoral Office
                </h4>
                <p className="text-slate-500 text-[11px]">
                  For prayer support, pastoral counseling, or membership questions, our leadership team is here for your family.
                </p>
                <div className="space-y-2 pt-1 border-t border-[#F0EBE0] dark:border-[#1E2C3D]">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <MapPin size={14} className="text-[#1E6F43] shrink-0" />
                    <span>Main Sanctuary • Koilakuntla</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Users size={14} className="text-[#1E6F43] shrink-0" />
                    <span>Pastoral Stewardship Team</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Household Directory */}
        {activeTab === 'household' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
              <Shield size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p>
                <span className="font-bold">Household Records:</span> Family relationships and Sunday School enrollments are securely linked by church pastoral records under the family head&apos;s membership document.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-white dark:bg-[#131C27] border border-[#EBE6DC] dark:border-[#222F3E] text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-[#1E6F43] flex items-center justify-center mx-auto">
                <Users size={22} />
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Household Family Group
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Household family member enrollments and child dedications are registered through pastoral administration during family counseling.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Preferences & Language */}
        {activeTab === 'settings' && (
          <div className="bg-white dark:bg-[#131C27] rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] p-6 shadow-xs max-w-2xl space-y-6">
            <h3 className="font-serif font-bold text-base text-slate-900 dark:text-white">
              Application &amp; Language Settings
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Primary Ministry Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] bg-[#F7F5EE]/50 dark:bg-[#0D141D] text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#1E6F43]"
                >
                  {availableLanguages.map((l) => (
                    <option key={l.code} value={l.code}>
                      🌐 {l.label} ({l.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Display Theme
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="px-4 py-2 rounded-xl border border-[#EBE6DC] dark:border-[#222F3E] bg-[#F7F5EE] dark:bg-[#0D141D] text-slate-700 dark:text-slate-300 flex items-center gap-2 font-semibold hover:border-[#1E6F43] cursor-pointer"
                  >
                    {theme === 'light' ? (
                      <>
                        <Sun size={15} className="text-amber-500" />
                        <span>Warm Ivory Light Theme</span>
                      </>
                    ) : (
                      <>
                        <Moon size={15} className="text-amber-400" />
                        <span>Deep Navy Dark Theme</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#EBE6DC] dark:border-[#222F3E]">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notification Preferences (Saved to Cloud)
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailAlerts}
                      onChange={(e) => setEmailAlerts(e.target.checked)}
                      className="rounded text-[#1E6F43] focus:ring-[#1E6F43]"
                    />
                    <span>Receive Sunday Service &amp; Broadcast Bulletins by Email</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={careCellAlerts}
                      onChange={(e) => setCareCellAlerts(e.target.checked)}
                      className="rounded text-[#1E6F43] focus:ring-[#1E6F43]"
                    />
                    <span>Receive Weekly Care Cell Prayer &amp; Study Guides</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-[#EBE6DC] dark:border-[#222F3E] flex justify-end">
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  className="px-5 py-2.5 rounded-xl bg-[#1E6F43] hover:bg-[#165634] text-white font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Save size={14} />
                  <span>Save Preferences to Cloud</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: About Rhema Church */}
        {activeTab === 'about' && (
          <div className="bg-white dark:bg-[#131C27] rounded-2xl border border-[#EBE6DC] dark:border-[#222F3E] p-6 shadow-xs space-y-5 text-xs leading-relaxed">
            <div className="border-b border-[#EBE6DC] dark:border-[#222F3E] pb-3">
              <h3 className="font-serif font-bold text-lg text-slate-900 dark:text-white">
                About Rhema Christian Church &amp; Ministries
              </h3>
              <p className="text-slate-500">
                A Christ-centered congregation dedicated to the living Word of God, transformative worship, and apostolic discipleship.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#F7F5EE]/60 dark:bg-[#0D141D] border border-[#EBE6DC] dark:border-[#222F3E] space-y-1">
                <span className="font-bold text-slate-800 dark:text-slate-200">Our Vision</span>
                <p className="text-slate-600 dark:text-slate-400">
                  To proclaim the uncompromised Gospel of Jesus Christ and nurture believers into spiritually mature disciples who love God and impact their generation.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F7F5EE]/60 dark:bg-[#0D141D] border border-[#EBE6DC] dark:border-[#222F3E] space-y-1">
                <span className="font-bold text-slate-800 dark:text-slate-200">Sanctuary Location</span>
                <p className="text-slate-600 dark:text-slate-400">
                  Main Sanctuary Cathedral, Koilakuntla, Kurnool District, Andhra Pradesh, India.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────── */}
        {/* MODAL: EDIT MEMBER PROFILE                                  */}
        {/* ─────────────────────────────────────────────────────────── */}
        {editModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#131C27] border border-[#EBE6DC] dark:border-[#222F3E] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Edit Personal Profile Details
                </h3>
                <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Display Name / Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F5EE]/60 dark:bg-[#0D141D] border border-[#EBE6DC] dark:border-[#222F3E] text-slate-900 dark:text-white focus:outline-hidden focus:border-[#1E6F43]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F5EE]/60 dark:bg-[#0D141D] border border-[#EBE6DC] dark:border-[#222F3E] text-slate-900 dark:text-white focus:outline-hidden focus:border-[#1E6F43]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#F7F5EE]/60 dark:bg-[#0D141D] border border-[#EBE6DC] dark:border-[#222F3E] text-slate-900 dark:text-white focus:outline-hidden focus:border-[#1E6F43]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      State / Region
                    </label>
                    <input
                      type="text"
                      value={formState}
                      onChange={(e) => setFormState(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#F7F5EE]/60 dark:bg-[#0D141D] border border-[#EBE6DC] dark:border-[#222F3E] text-slate-900 dark:text-white focus:outline-hidden focus:border-[#1E6F43]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={formStreet}
                    onChange={(e) => setFormStreet(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F5EE]/60 dark:bg-[#0D141D] border border-[#EBE6DC] dark:border-[#222F3E] text-slate-900 dark:text-white focus:outline-hidden focus:border-[#1E6F43]"
                  />
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-[11px] text-amber-800 dark:text-amber-300">
                  <span>Note: Membership roles and pastoral codes are locked for church governance.</span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EBE6DC] dark:border-[#222F3E]">
                  <button
                    type="button"
                    onClick={() => setEditModalOpen(false)}
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 rounded-xl bg-[#1E6F43] hover:bg-[#165634] text-white font-bold shadow-md flex items-center gap-1.5"
                  >
                    {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                    <span>Save to Church Profile</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
