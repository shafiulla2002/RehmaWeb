'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import {
  formatPhoneAuthError,
  clearRecaptchaContainer,
  createFreshRecaptchaMount,
} from '@/lib/authHelpers';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Phone, Shield, ArrowRight, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isGuest, loginAsGuest, refreshProfile } = useAuth();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [inviteEvent, setInviteEvent] = useState<string | null>(null);

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // If already authenticated member, redirect straight to dashboard
  useEffect(() => {
    if (user && !isGuest) {
      router.replace('/dashboard');
    }
  }, [user, isGuest, router]);

  // Parse invite deep-link query params (?c=rhema&i=9876543210&e=eventId)
  useEffect(() => {
    const invitePhone = searchParams.get('i');
    const eventId = searchParams.get('e');
    if (invitePhone) {
      const clean = invitePhone.replace(/[^0-9]/g, '').slice(-10);
      setPhone(clean);
    }
    if (eventId) {
      setInviteEvent(eventId);
    }
  }, [searchParams]);

  // Resend Countdown Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'otp' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  const clearRecaptcha = () => {
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch {
        // ignore clear error
      }
      recaptchaVerifierRef.current = null;
    }
    clearRecaptchaContainer('recaptcha-container');
  };

  useEffect(() => {
    return () => {
      clearRecaptcha();
    };
  }, []);

  const initRecaptcha = () => {
    if (typeof window === 'undefined') return null;
    // Always dispose any stale verifier and mount on a fresh child element
    // so repeated OTP attempts never trigger "reCAPTCHA has already been rendered in this element".
    clearRecaptcha();
    const mountNode = createFreshRecaptchaMount('recaptcha-container');
    if (!mountNode) return null;

    try {
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, mountNode, {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved
        },
        'expired-callback': () => {
          clearRecaptcha();
          setError('reCAPTCHA expired. Please try sending OTP again.');
        },
      });
    } catch (e: unknown) {
      console.warn('reCAPTCHA init error:', e);
      clearRecaptcha();
      return null;
    }
    return recaptchaVerifierRef.current;
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const clean = phone.replace(/[^0-9]/g, '').slice(-10);
    if (clean.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);

    // Explicit Development-Only Mock Bypass Check
    // Will NEVER execute in production (guarded by process.env.NODE_ENV !== 'production')
    if (process.env.NODE_ENV !== 'production' && clean === '9999999999') {
      console.info('Development mock bypass selected (+919999999999). SMS skipped.');
      setStep('otp');
      setLoading(false);
      setResendTimer(30);
      setCanResend(false);
      return;
    }

    try {
      const appVerifier = initRecaptcha();
      if (!appVerifier) {
        throw new Error('reCAPTCHA verification container is not ready.');
      }

      const formattedPhone = `+91${clean}`;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setStep('otp');
      setResendTimer(60);
      setCanResend(false);
    } catch (err: unknown) {
      console.error('Send OTP error:', err);
      setError(formatPhoneAuthError(err));
      clearRecaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto advance focus to next digit
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const enteredCode = otp.join('');
    if (enteredCode.length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    setLoading(true);

    // Explicit Development Mock Bypass Resolution
    // Strictly available only in development; never active in production builds
    if (process.env.NODE_ENV !== 'production' && phone.slice(-10) === '9999999999') {
      if (enteredCode !== '123456') {
        setError('Invalid OTP code. Development mock bypass requires exact code 123456.');
        setLoading(false);
        return;
      }
      console.info('Development mock bypass verified with exact code 123456.');
      // Grants strictly a synthetic unverified guest session (role: 'guest', phone: '', zero member/admin privileges)
      await loginAsGuest();
      router.push('/dashboard');
      return;
    }

    try {
      if (!confirmationResult) {
        throw new Error('No active verification session. Please request a new OTP.');
      }

      const credential = await confirmationResult.confirm(enteredCode);
      if (credential.user) {
        await refreshProfile();
        // Check if member profile exists
        const clean = phone.replace(/[^0-9]/g, '').slice(-10);
        const churchId = 'rhema';
        const memberSnap = await getDoc(doc(db, 'Rhema Church', churchId, 'members', credential.user.uid));
        if (memberSnap.exists()) {
          router.push('/dashboard');
          return;
        }

        // Check if member registration is pending
        const reqSnap = await getDoc(doc(db, 'Rhema Church', churchId, 'registration_requests', clean));
        if (reqSnap.exists() && reqSnap.data()?.status === 'pending') {
          router.push('/auth/pending');
        } else {
          // Unregistered authenticated user: redirect to registration
          router.push('/auth/register');
        }
      }
    } catch (err: unknown) {
      console.error('OTP Verification Error:', err);
      setError(formatPhoneAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 text-slate-100">
      <div id="recaptcha-container"></div>

      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 font-black text-2xl text-amber-400">
            <span className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center text-xl shadow-md">
              R
            </span>
            <span>Rhema</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {step === 'phone' ? 'Congregation Sign In' : 'Enter 6-Digit OTP'}
          </h2>
          <p className="text-xs text-slate-400">
            {step === 'phone'
              ? 'Enter your registered 10-digit mobile number for secure login'
              : `Verification code sent to +91 ${phone.slice(-10)}`}
          </p>
        </div>

        {/* Invite Banner (if deep-linked - Informational Preview Only) */}
        {inviteEvent && (
          <div className="p-3.5 bg-sky-950/60 border border-sky-800 rounded-xl space-y-2 text-xs text-sky-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-sky-400 shrink-0" />
              <span className="font-semibold text-white">Church Invitation Recognized</span>
            </div>
            <p className="text-[11px] text-sky-300 leading-relaxed">
              You were invited to an upcoming service or fellowship gathering. Preview the event details as an unauthenticated guest, or sign in below with your mobile number for member features.
            </p>
            <button
              type="button"
              onClick={() => {
                // Informational preview navigation only: No session created, zero privilege elevation
                router.push(inviteEvent ? `/events/${inviteEvent}` : '/events');
              }}
              className="w-full text-center py-1.5 px-3 rounded-lg bg-sky-600/30 hover:bg-sky-600/50 text-sky-100 border border-sky-500/40 font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <span>View Event Preview (Guest)</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Development Mode Notice Banner (Feature 3) */}
        {process.env.NODE_ENV !== 'production' && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-200">
            <Shield size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block text-amber-300">Development SMS Mode</span>
              <span>
                Use development bypass number <code className="bg-amber-950/80 px-1.5 py-0.5 rounded text-amber-200 font-mono font-bold">+91 9999999999</code> and code <code className="bg-amber-950/80 px-1.5 py-0.5 rounded text-amber-200 font-mono font-bold">123456</code>. Live SMS delivery is unconfigured.
              </span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl flex items-start gap-2 text-xs text-red-200">
            <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          {step === 'phone' ? (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Mobile Number
                </label>
                <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 focus-within:border-amber-500 transition-colors px-3 py-2">
                  <span className="text-sm font-semibold text-slate-400 border-r border-slate-800 pr-3 mr-3">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="98765 43210"
                    className="w-full bg-transparent text-white placeholder-slate-600 focus:outline-none text-base font-medium tracking-wide"
                    required
                  />
                  <Phone size={18} className="text-slate-600 ml-2" />
                </div>
              </div>

              <Button
                type="submit"
                variant="secondary"
                size="lg"
                className="w-full font-bold gap-2"
                disabled={loading || phone.length < 10}
              >
                {loading ? <RefreshCw className="animate-spin" size={18} /> : <span>Send OTP</span>}
                {!loading && <ArrowRight size={18} />}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 text-center">
                  6-Digit SMS Code
                </label>
                <div className="flex justify-between gap-2">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpInputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-12 h-14 text-center text-xl font-bold rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-amber-500 focus:outline-none transition-colors"
                      required
                    />
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                variant="secondary"
                size="lg"
                className="w-full font-bold"
                disabled={loading || otp.join('').length < 6}
              >
                {loading ? <RefreshCw className="animate-spin" size={18} /> : 'Verify & Continue'}
              </Button>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="hover:text-white transition-colors"
                >
                  Change Number
                </button>

                {canResend ? (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="text-amber-400 font-semibold hover:underline"
                  >
                    Resend Code
                  </button>
                ) : (
                  <span>Resend in {resendTimer}s</span>
                )}
              </div>
            </form>
          )}

          <div className="mt-6 pt-5 border-t border-slate-800 text-center space-y-2">
            <span className="text-xs text-slate-500 block">Don&apos;t have an account yet?</span>
            <Link
              href="/auth/register"
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors inline-block"
            >
              Register for Church Membership &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
          <RefreshCw size={24} className="animate-spin text-amber-500" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
