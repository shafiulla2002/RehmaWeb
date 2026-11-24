'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { formatPhoneAuthError, clearRecaptchaContainer, createFreshRecaptchaMount } from '@/lib/authHelpers';
import { Button } from '@/components/ui/Button';
import {
  UserPlus,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Phone,
  ShieldCheck,
  ChevronLeft,
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<'details' | 'otp' | 'success'>('details');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    dob: '',
    gender: 'Male',
    city: '',
    address: '',
    maritalStatus: 'Single',
    anniversary: '',
    childrenCount: '0',
    baptized: 'No',
    baptismDate: '',
    baptismChurch: '',
  });

  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Timer countdown for OTP resend
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const clearRecaptcha = () => {
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch {
        // ignore
      }
      recaptchaVerifierRef.current = null;
    }
    clearRecaptchaContainer('register-recaptcha-container');
  };

  useEffect(() => {
    return () => {
      clearRecaptcha();
    };
  }, []);

  const initRecaptcha = () => {
    if (typeof window === 'undefined') return null;
    clearRecaptcha();
    const mountNode = createFreshRecaptchaMount('register-recaptcha-container');
    if (!mountNode) return null;

    try {
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, mountNode, {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved
        },
        'expired-callback': () => {
          clearRecaptcha();
          setError('reCAPTCHA verification expired. Please try again.');
        },
      });
    } catch (e: unknown) {
      console.warn('reCAPTCHA init error:', e);
      clearRecaptcha();
      return null;
    }
    return recaptchaVerifierRef.current;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('Please provide your first and last name.');
      return;
    }

    const cleanPhone = formData.phone.replace(/[^0-9]/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!formData.city.trim()) {
      setError('Please provide your city or village location.');
      return;
    }

    setLoading(true);

    try {
      const verifier = initRecaptcha();
      if (!verifier) {
        throw new Error('Failed to initialize verification container. Please refresh the page.');
      }

      const formattedPhone = `+91${cleanPhone}`;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      setConfirmationResult(confirmation);
      setStep('otp');
      setResendTimer(60);
    } catch (err: unknown) {
      console.error('Phone auth send OTP error:', err);
      clearRecaptcha();
      setError(formatPhoneAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const enteredOtp = otp.trim();
    if (enteredOtp.length !== 6) {
      setError('Please enter the complete 6-digit SMS verification code.');
      return;
    }

    if (!confirmationResult) {
      setError('Session expired. Please request a new verification code.');
      setStep('details');
      return;
    }

    setLoading(true);

    try {
      // 1. Confirm Phone Auth credential
      const userCredential = await confirmationResult.confirm(enteredOtp);
      const user = userCredential.user;

      if (!user) {
        throw new Error('Authentication succeeded but user record was not found.');
      }

      const cleanPhone = formData.phone.replace(/[^0-9]/g, '').slice(-10);
      const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim();
      const villageOrCity = formData.city.trim();

      // 2. Canonical Firestore path: Rhema Church/rhema/registration_requests/{phone10}
      // Strictly follows lines 672-713 of firestore.rules:
      // status: 'pending', authUid: user.uid, NO moderation fields
      const requestPayload = {
        id: cleanPhone,
        phone: cleanPhone,
        fullName,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        authUid: user.uid,
        status: 'pending',
        city: villageOrCity,
        village: villageOrCity,
        address: formData.address.trim(),
        gender: formData.gender,
        dob: formData.dob || '',
        maritalStatus: formData.maritalStatus,
        anniversary: formData.anniversary || '',
        childrenCount: formData.childrenCount || '0',
        baptized: formData.baptized,
        baptismDate: formData.baptismDate || '',
        baptismChurch: formData.baptismChurch || '',
        churchId: 'rhema',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const docRef = doc(db, 'Rhema Church', 'rhema', 'registration_requests', cleanPhone);
      await setDoc(docRef, requestPayload, { merge: true });

      // Save phone key to local storage for pending status page
      if (typeof window !== 'undefined') {
        localStorage.setItem('@pending_registration_phone', cleanPhone);
        localStorage.setItem('@pending_registration_name', fullName);
        localStorage.setItem('@pending_registration_city', villageOrCity);
        localStorage.setItem('@pending_registration_status', 'pending');
      }

      setStep('success');
    } catch (err: unknown) {
      console.error('Registration submission error:', err);
      setError(formatPhoneAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 text-slate-100 flex flex-col items-center justify-center">
      {/* Invisible reCAPTCHA container */}
      <div id="register-recaptcha-container" />

      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 font-black text-2xl text-amber-400">
            <span className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center text-xl shadow-md">
              R
            </span>
            <span>Rhema</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Church Membership Registration
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Join our spiritual family. Verified applications are reviewed by church administration.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-950/60 border border-red-800 rounded-2xl flex items-start gap-3 text-xs sm:text-sm text-red-200 shadow-xl">
            <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {step === 'details' && (
          <form onSubmit={handleSendOtp} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">
            {/* Step Indicator */}
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-400 pb-2 border-b border-slate-800">
              <span className="flex items-center gap-2">
                <UserPlus size={16} /> Step 1: Member Information
              </span>
              <span className="text-slate-500 font-mono">1 of 2</span>
            </div>

            {/* Section 1: Personal Info */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">First Name *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    placeholder="e.g. John"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Last Name *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    placeholder="e.g. Wesley"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Mobile Phone (10-Digit) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono">+91</span>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      placeholder="9876543210"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-3 py-2 text-sm text-white font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Gender *</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Address & Residence */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-slate-800 pb-2">
                2. Residence & Location
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">City / Village *</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    required
                    placeholder="e.g. Bangalore"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Street Address</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Door No, Street name"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Family & Spiritual Details */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-slate-800 pb-2">
                3. Family & Spiritual Background
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Marital Status</label>
                  <select
                    name="maritalStatus"
                    value={formData.maritalStatus}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Water Baptized?</label>
                  <select
                    name="baptized"
                    value={formData.baptized}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Baptism Church</label>
                  <input
                    type="text"
                    name="baptismChurch"
                    value={formData.baptismChurch}
                    onChange={handleChange}
                    placeholder="e.g. Rhema Church"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl gap-2 shadow-lg"
            >
              {loading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Sending SMS Verification...</span>
                </>
              ) : (
                <>
                  <span>Verify Phone &amp; Continue</span>
                  <ArrowRight size={18} />
                </>
              )}
            </Button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtpAndRegister} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-400 pb-2 border-b border-slate-800">
              <button
                type="button"
                onClick={() => setStep('details')}
                className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
              >
                <ChevronLeft size={16} /> Back to Form
              </button>
              <span className="text-slate-500 font-mono">2 of 2</span>
            </div>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <Phone size={24} />
              </div>
              <h3 className="text-lg font-bold text-white">Enter SMS Verification Code</h3>
              <p className="text-xs text-slate-400">
                We sent a 6-digit OTP to <span className="font-mono text-amber-300">+91 {formData.phone.slice(-10)}</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 text-center mb-2">6-Digit Code</label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-48 mx-auto block text-center text-2xl font-mono tracking-widest bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-amber-400 focus:border-amber-400 focus:outline-none"
                required
              />
            </div>

            <div className="text-center text-xs text-slate-400">
              {resendTimer > 0 ? (
                <span>Resend code in {resendTimer}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="text-amber-400 hover:text-amber-300 font-semibold"
                >
                  Resend SMS OTP
                </button>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading || otp.length !== 6}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl gap-2 shadow-lg"
            >
              {loading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Verifying &amp; Submitting...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  <span>Submit Registration Request</span>
                </>
              )}
            </Button>
          </form>
        )}

        {step === 'success' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Registration Request Submitted!</h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                Your application has been registered under <span className="font-mono text-emerald-300">+91 {formData.phone.slice(-10)}</span> with status <span className="text-amber-300 font-bold uppercase">Pending</span>. Church pastoral elders review all new applications.
              </p>
            </div>

            <div className="pt-4 flex flex-col gap-3 max-w-sm mx-auto">
              <Button
                variant="primary"
                size="md"
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl"
                onClick={() => router.push('/auth/pending')}
              >
                <span>Track Application Status</span>
                <ArrowRight size={16} />
              </Button>
              <Link
                href="/auth/login"
                className="text-xs text-slate-500 hover:text-slate-300 py-2 transition-colors"
              >
                Return to Sign In
              </Link>
            </div>
          </div>
        )}

        <div className="text-center text-xs text-slate-500">
          Already a registered member?{' '}
          <Link href="/auth/login" className="text-amber-400 hover:underline">
            Sign In with Mobile
          </Link>
        </div>
      </div>
    </div>
  );
}
