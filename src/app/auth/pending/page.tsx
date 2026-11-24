'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/Button';
import {
  Clock,
  Building,
  CheckCircle2,
  XCircle,
  Info,
  RefreshCw,
  Phone,
  ShieldCheck,
} from 'lucide-react';

interface RegistrationRequestData {
  id: string;
  phone: string;
  fullName?: string;
  city?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function ApprovalPendingPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [phone, setPhone] = useState<string>('');
  const [requestData, setRequestData] = useState<RegistrationRequestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  // Retrieve applicant phone from user auth or local storage
  useEffect(() => {
    let cleanPhone = '';
    if (user?.phoneNumber) {
      cleanPhone = user.phoneNumber.replace(/\D/g, '').slice(-10);
    } else if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('@pending_registration_phone');
      if (stored) {
        cleanPhone = stored.replace(/\D/g, '').slice(-10);
      }
    }
    setPhone(cleanPhone);
  }, [user]);

  // Subscribe in real-time to canonical path: Rhema Church/rhema/registration_requests/{phone10}
  useEffect(() => {
    if (!phone) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const docRef = doc(db, 'Rhema Church', 'rhema', 'registration_requests', phone);

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        setLoading(false);
        if (snapshot.exists()) {
          const data = snapshot.data() as RegistrationRequestData;
          setRequestData(data);

          // If approved, update localStorage status and redirect or inform
          if (data.status === 'approved') {
            if (typeof window !== 'undefined') {
              localStorage.setItem('@pending_registration_status', 'approved');
            }
          }
        } else {
          setRequestData(null);
        }
      },
      (error) => {
        console.warn('Registration request snapshot error:', error);
        setLoading(false);
        setNotice('Status update check paused. Please consult church pastoral elders.');
      }
    );

    return () => unsubscribe();
  }, [phone]);

  const handleManualCheck = async () => {
    if (!phone) {
      setNotice('No phone number associated with this session. Please sign in or register.');
      return;
    }

    setLoading(true);
    setNotice(null);

    try {
      const docRef = doc(db, 'Rhema Church', 'rhema', 'registration_requests', phone);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as RegistrationRequestData;
        setRequestData(data);
        if (data.status === 'approved') {
          setNotice('Hallelujah! Your membership registration has been approved. You can now access church services.');
        } else if (data.status === 'rejected') {
          setNotice(data.rejectionReason || 'Application review status: Not approved at this time.');
        } else {
          setNotice('Application status is currently PENDING review by pastoral leadership.');
        }
      } else {
        setNotice('No registration request found for this phone number. Please submit a registration request.');
      }
    } catch (e: unknown) {
      console.warn('Manual check error:', e);
      setNotice('Unable to check status right now. Please try again or contact pastoral office.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOutAndExit = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('@pending_registration_phone');
      localStorage.removeItem('@pending_registration_name');
      localStorage.removeItem('@pending_registration_city');
      localStorage.removeItem('@pending_registration_status');
    }
    await signOut();
    router.push('/auth/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 text-slate-100">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <span className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 font-black text-2xl flex items-center justify-center mx-auto shadow-md">
            R
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-white">Membership Status</h2>
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            <Building size={14} className="text-amber-500" />
            <span>Church of God &bull; Rhema Congregation</span>
          </div>
        </div>

        {/* Status Content Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
          {loading ? (
            <div className="py-8 space-y-3">
              <RefreshCw size={28} className="animate-spin text-amber-400 mx-auto" />
              <p className="text-xs text-slate-400">Retrieving application status from church registry...</p>
            </div>
          ) : requestData?.status === 'approved' ? (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 size={36} />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Membership Approved
                </span>
                <h3 className="text-lg font-bold text-white mt-3">Welcome to the Rhema Family!</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Your church membership registration has been approved by church administration.
                </p>
              </div>

              <Button
                type="button"
                variant="primary"
                size="md"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl"
                onClick={() => router.push('/dashboard')}
              >
                <span>Enter Church Portal</span>
              </Button>
            </div>
          ) : requestData?.status === 'rejected' ? (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
                <XCircle size={36} />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30">
                  Application Not Approved
                </span>
                <h3 className="text-lg font-bold text-white mt-3">Pastoral Review Update</h3>
                <p className="text-xs text-red-300 mt-2 leading-relaxed bg-red-950/40 p-3 rounded-xl border border-red-900/50">
                  {requestData.rejectionReason || 'Application was not approved at this time. Please contact the church pastoral office.'}
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="md"
                className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
                onClick={() => router.push('/auth/register')}
              >
                <span>Submit New Registration</span>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <Clock size={32} />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Application Under Review
                </span>
                <h3 className="text-lg font-bold text-white mt-3">Pastoral Review in Progress</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Thank you for submitting your membership application. Our church pastoral elders review new applications to maintain fellowship records.
                </p>
                {phone && (
                  <p className="text-xs font-mono text-amber-400 mt-2 flex items-center justify-center gap-1.5">
                    <Phone size={12} />
                    <span>+91 {phone}</span>
                  </p>
                )}
              </div>

              {notice && (
                <div className="p-3 bg-sky-950/60 border border-sky-800 rounded-xl flex items-start gap-2 text-xs text-sky-200 text-left">
                  <Info size={16} className="text-sky-400 shrink-0 mt-0.5" />
                  <span>{notice}</span>
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                size="md"
                className="w-full gap-2 border-slate-700 text-slate-300 hover:bg-slate-800"
                onClick={handleManualCheck}
              >
                <RefreshCw size={14} />
                <span>Refresh Review Status</span>
              </Button>
            </div>
          )}

          <div className="pt-4 border-t border-slate-800 text-center">
            <button
              onClick={handleSignOutAndExit}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Sign Out &amp; Return to Welcome Screen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
