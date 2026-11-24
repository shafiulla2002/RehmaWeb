'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export type UserRole = 'member' | 'guest' | 'admin' | 'superadmin' | 'pending' | 'unregistered';

export interface UserProfile {
  uid: string;
  phone: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  role: UserRole;
  churchId: string;
  isGuest?: boolean;
  status?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  isGuest: boolean;
  isPendingApproval: boolean;
  isUnregistered: boolean;
  isLoading: boolean;
  loginAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: 'guest',
  isGuest: true,
  isPendingApproval: false,
  isUnregistered: false,
  isLoading: true,
  loginAsGuest: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole>('guest');
  const [isGuest, setIsGuest] = useState<boolean>(true);
  const [isPendingApproval, setIsPendingApproval] = useState<boolean>(false);
  const [isUnregistered, setIsUnregistered] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const syncProfile = async (firebaseUser: User | null) => {
    if (!firebaseUser) {
      setUser(null);
      setProfile(null);
      setRole('guest');
      setIsGuest(true);
      setIsPendingApproval(false);
      setIsUnregistered(false);
      setIsLoading(false);
      return;
    }

    setUser(firebaseUser);

    // If anonymous user, treat strictly as guest mode
    if (firebaseUser.isAnonymous) {
      const guestProfile: UserProfile = {
        uid: firebaseUser.uid,
        phone: '',
        fullName: 'Guest Visitor',
        role: 'guest',
        churchId: 'rhema',
        isGuest: true,
      };
      setProfile(guestProfile);
      setRole('guest');
      setIsGuest(true);
      setIsPendingApproval(false);
      setIsUnregistered(false);
      setIsLoading(false);
      return;
    }

    // Authenticated user with phone or credential
    try {
      const churchId = 'rhema';
      const memberRef = doc(db, 'Rhema Church', churchId, 'members', firebaseUser.uid);
      const memberSnap = await getDoc(memberRef);

      let data: any = null;
      let memberId: string = firebaseUser.uid;

      if (memberSnap.exists()) {
        data = memberSnap.data();
      } else if (firebaseUser.phoneNumber) {
        // Fallback: match existing church member by last 10 digits of phone number
        const rawPhone = firebaseUser.phoneNumber.replace(/[^0-9]/g, '').slice(-10);
        try {
          const membersSnap = await getDocs(collection(db, 'Rhema Church', churchId, 'members'));
          for (const d of membersSnap.docs) {
            const m = d.data();
            const candPhone = String(m.phone || m.phoneNumber || m.mobile || m.contactNumber || '').replace(/[^0-9]/g, '');
            if (candPhone.endsWith(rawPhone) || (candPhone && rawPhone.endsWith(candPhone))) {
              data = m;
              memberId = d.id;
              break;
            }
          }
        } catch (e) {
          console.warn('Error matching member by phone in AuthContext:', e);
        }
      }

      if (data) {
        // 1. Authoritative Super Admin evaluation (MUST strictly precede ordinary admin check)
        const isSuperAdmin = Boolean(
          data.isPlatformSuperAdmin === true ||
          data.superadmin === true ||
          data.isSuperAdmin === true ||
          String(data.role || '').toLowerCase().replace(/[\s_]+/g, '') === 'superadmin' ||
          ['super admin', 'superadmin', 'super_admin'].includes(String(data.userType || '').toLowerCase().trim())
        );

        // 2. Ordinary Admin evaluation (only if not already a Super Admin)
        const isOrdinaryAdmin = Boolean(
          !isSuperAdmin && (
            data.role === 'admin' ||
            String(data.userType || '').toUpperCase() === 'ADMIN' ||
            String(data.role || '').toLowerCase() === 'admin'
          )
        );

        const userRole: UserRole = isSuperAdmin 
          ? 'superadmin' 
          : isOrdinaryAdmin 
          ? 'admin' 
          : 'member';

        const userProfile: UserProfile = {
          uid: memberId,
          phone: data.phone || firebaseUser.phoneNumber || '',
          fullName: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Church Member',
          firstName: data.firstName,
          lastName: data.lastName,
          city: data.city || data.village,
          role: userRole,
          churchId: data.churchId || churchId,
          isGuest: false,
          status: 'active',
        };

        setProfile(userProfile);
        setRole(userRole);
        setIsGuest(false);
        setIsPendingApproval(false);
        setIsUnregistered(false);
      } else {
        // Check if there is an active pending registration for this user's phone or authUid
        const rawPhone = firebaseUser.phoneNumber?.replace(/[^0-9]/g, '').slice(-10);
        if (rawPhone) {
          const reqRef = doc(db, 'Rhema Church', churchId, 'registration_requests', rawPhone);
          const reqSnap = await getDoc(reqRef);
          if (reqSnap.exists()) {
            const reqData = reqSnap.data();
            const userProfile: UserProfile = {
              uid: firebaseUser.uid,
              phone: reqData.phone || firebaseUser.phoneNumber || '',
              fullName: reqData.fullName || `${reqData.firstName || ''} ${reqData.lastName || ''}`.trim(),
              city: reqData.city,
              role: 'pending',
              churchId,
              isGuest: false,
              status: reqData.status || 'pending',
            };
            setProfile(userProfile);
            setRole('pending');
            setIsGuest(false);
            setIsPendingApproval(reqData.status === 'pending');
            setIsUnregistered(false);
            setIsLoading(false);
            return;
          }
        }

        // Unregistered authenticated user: NEVER automatically assign 'member' role.
        // User must remain unapproved and must be routed to complete registration.
        const unapprovedProfile: UserProfile = {
          uid: firebaseUser.uid,
          phone: firebaseUser.phoneNumber || '',
          fullName: firebaseUser.displayName || 'Unregistered Applicant',
          role: 'unregistered',
          churchId,
          isGuest: false,
          status: 'unregistered',
        };
        setProfile(unapprovedProfile);
        setRole('unregistered');
        setIsGuest(false);
        setIsPendingApproval(false);
        setIsUnregistered(true);
      }
    } catch (err) {
      console.error('Error fetching member profile:', err);
      // Fallback state on error: do not elevate privileges
      setRole('guest');
      setIsGuest(true);
      setIsUnregistered(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      syncProfile(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  const loginAsGuest = async () => {
    setIsLoading(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('@guest_intent', 'true');
    }
    // Set local state strictly to synthetic unverified guest session
    setIsGuest(true);
    setRole('guest');
    setIsPendingApproval(false);
    setIsUnregistered(false);
    setProfile({
      uid: 'guest_dev_synthetic',
      phone: '',
      fullName: 'Synthetic Dev Guest (Unverified)',
      role: 'guest',
      churchId: 'rhema',
      isGuest: true,
      status: 'unverified_guest',
    });
    setIsLoading(false);
  };

  const signOut = async () => {
    setIsLoading(true);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('@guest_intent');
      localStorage.removeItem('@pending_registration_phone');
    }
    try {
      await fbSignOut(auth);
    } catch (e) {
      console.warn('Sign out caught:', e);
    }
    setUser(null);
    setProfile(null);
    setRole('guest');
    setIsGuest(true);
    setIsPendingApproval(false);
    setIsUnregistered(false);
    setIsLoading(false);
  };

  const refreshProfile = async () => {
    await syncProfile(auth.currentUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        isGuest,
        isPendingApproval,
        isUnregistered,
        isLoading,
        loginAsGuest,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
