'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { RefreshCw, ShieldAlert, ArrowLeft, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireAuth?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requireAuth = true,
}) => {
  const router = useRouter();
  const { user, profile, role, isGuest, isPendingApproval, isUnregistered, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    // 1. Strict Authentication: When guest is not permitted, require an authenticated non-guest user
    const allowsGuest = Boolean(allowedRoles?.includes('guest'));
    if (requireAuth && !allowsGuest && (!user || isGuest)) {
      router.push('/auth/login');
      return;
    }

    // 2. Pending Registration Lock: Confine applicants to pending screen
    if (isPendingApproval || role === 'pending') {
      router.push('/auth/pending');
      return;
    }

    // 3. Unregistered phone authenticated users: Direct to registration form
    if (isUnregistered || role === 'unregistered') {
      router.push('/auth/register');
      return;
    }
  }, [user, isGuest, isPendingApproval, isUnregistered, role, isLoading, requireAuth, allowedRoles, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <RefreshCw size={28} className="animate-spin text-amber-500" />
        <span className="text-sm font-medium">Verifying member authorization...</span>
      </div>
    );
  }

  // Not authenticated, or guest session where guest role is not permitted
  const allowsGuest = Boolean(allowedRoles?.includes('guest'));
  if (requireAuth && !allowsGuest && (!user || isGuest)) {
    return null;
  }

  // Pending user locked out of content
  if (isPendingApproval || role === 'pending') {
    return null;
  }

  // Unregistered user locked out of content
  if (isUnregistered || role === 'unregistered') {
    return null;
  }

  // 4. Fail-Closed Policy: Missing or unspecified role restrictions fail closed
  if (!allowedRoles || allowedRoles.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-3xl p-8 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto border border-red-500/20">
            <Lock size={28} />
          </div>
          <h2 className="text-xl font-bold text-white">Access Denied (Fail-Closed)</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            This protected route does not have explicit allowed roles configured. Access has been denied under the application security policy.
          </p>
          <div className="pt-2">
            <Button
              variant="outline"
              size="md"
              className="gap-2 border-slate-700 text-slate-200"
              onClick={() => router.push('/dashboard')}
            >
              <ArrowLeft size={16} />
              <span>Return to Dashboard</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 5. Explicit role check
  if (!allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto border border-red-500/20">
            <ShieldAlert size={28} />
          </div>
          <h2 className="text-xl font-bold text-white">Access Restricted</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your current account role (<span className="text-amber-400 font-semibold uppercase">{role}</span>) does not
            have permission to view this resource.
          </p>
          <div className="pt-2">
            <Button
              variant="outline"
              size="md"
              className="gap-2 border-slate-700 text-slate-200"
              onClick={() => router.push('/dashboard')}
            >
              <ArrowLeft size={16} />
              <span>Return to Dashboard</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
