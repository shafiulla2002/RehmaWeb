'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { RefreshCw } from 'lucide-react';

export default function RootPage() {
  const router = useRouter();
  const { user, isGuest, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    // If authenticated (and not a temporary guest), take directly to member dashboard
    if (user && !isGuest) {
      router.replace('/dashboard');
    } else {
      // Otherwise, present the login page directly
      router.replace('/auth/login');
    }
  }, [user, isGuest, isLoading, router]);

  return (
    <div className="min-h-screen bg-[#F7F5EE] dark:bg-[#0D141D] flex flex-col items-center justify-center text-slate-500 gap-3">
      <RefreshCw size={28} className="animate-spin text-amber-500" />
      <span className="text-sm font-medium">Loading Rhema Church Portal...</span>
    </div>
  );
}
