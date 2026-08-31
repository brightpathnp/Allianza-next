"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef, ReactNode } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, onSnapshot, collection, getDocs, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { University } from '../types';

interface UserProfile {
  email: string;
  fullName: string;
  roles: ('agent' | 'university' | 'superadmin')[];
  agencyName?: string;
  institutionName?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  activeRole: string | null;
  loading: boolean;
  logout: () => Promise<void>;
  selectRole: (role: string) => void;
  institutions: University[];
  loadingInstitutions: boolean;
  hiddenCountries: Record<string, boolean>;
  hideLandingPages: boolean;
  hideTrainingHub: boolean;
  hideSupportCenter: boolean;
}

function isClient() {
  return typeof window !== "undefined";
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeRole, setActiveRole] = useState<string | null>(() => {
    if (!isClient()) return null;
    return sessionStorage.getItem('activeRole');
  });
  const activeRoleRef = useRef<string | null>(activeRole);
  activeRoleRef.current = activeRole;

  const [loading, setLoading] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [institutions, setInstitutions] = useState<University[]>([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(true);
  const [hiddenCountries, setHiddenCountries] = useState<Record<string, boolean>>({});
  const [hideLandingPages, setHideLandingPages] = useState<boolean>(() => {
    if (!isClient()) return false;
    return localStorage.getItem('sys_hideLandingPages') === 'true';
  });
  const [hideTrainingHub, setHideTrainingHub] = useState<boolean>(false);
  const [hideSupportCenter, setHideSupportCenter] = useState<boolean>(false);

  const selectRole = useCallback((role: string) => {
    setActiveRole(role);
    activeRoleRef.current = role;
    if (isClient()) {
      sessionStorage.setItem('activeRole', role);
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setActiveRole(null);
    activeRoleRef.current = null;
    if (isClient()) {
      sessionStorage.removeItem('activeRole');
    }
  }, []);

  // Fetch system settings and institutions once on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const settingsSnap = await getDoc(doc(db, 'config', 'system_settings'));
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          setHiddenCountries(data?.hiddenCountries || {});
          const isHide = !!data?.hideLandingPages;
          setHideLandingPages(isHide);
          if (isClient()) {
            localStorage.setItem('sys_hideLandingPages', isHide ? 'true' : 'false');
          }
          setHideTrainingHub(data?.hideTrainingHub || false);
          setHideSupportCenter(data?.hideSupportCenter || false);
        }
        setLoadingSettings(false);

        const instSnap = await getDocs(collection(db, 'institutions'));
        const fetched = instSnap.docs.map(docSnap => ({
          ...docSnap.data(),
          id: docSnap.id
        })) as University[];
        setInstitutions(fetched);
        setLoadingInstitutions(false);
      } catch (err) {
        console.warn("Notice: Auth data fetching error (quota?):", err);
        setLoadingSettings(false);
        setLoadingInstitutions(false);
      }
    };
    fetchConfig();
  }, []);

  // Authentication Persistence and Profile Sync
  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        const docRef = doc(db, 'users', currentUser.uid);
        unsubscribeProfile = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            const isSuperAdminByEmail = data.email === 'bec.edu.ktm@gmail.com' || data.email === 'bec.edu.nep@gmail.com';
            if (isSuperAdminByEmail && !data.roles.includes('superadmin')) {
              data.roles = [...(data.roles || []), 'superadmin'];
            }

            setProfile({ ...data, uid: docSnap.id });
            
            const currentActiveRole = activeRoleRef.current;
            // Auto-select role
            if (data.roles.includes('superadmin')) {
              // Superadmin always defaults to 'superadmin' active role initially
              if (!currentActiveRole || !data.roles.includes(currentActiveRole as any)) {
                selectRole('superadmin');
              }
            } else {
              if (!currentActiveRole && data.roles.length >= 1) {
                selectRole(data.roles[0]);
              } else if (currentActiveRole && !data.roles.includes(currentActiveRole as any)) {
                // Reset if persisted role is no longer valid
                selectRole(data.roles[0]);
              }
            }
          } else {
            setProfile(null);
          }
          setLoading(false);
        }, (error) => {
          console.warn("Notice: User profile sync error (possibly quota exceeded):", error);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setActiveRole(null);
        activeRoleRef.current = null;
        if (isClient()) {
          sessionStorage.removeItem('activeRole');
        }
        if (unsubscribeProfile) unsubscribeProfile();
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, [selectRole]);

  // Dynamically filter institutions from hidden/enabled countries
  const filteredInstitutions = useMemo(() => {
    return institutions.filter(inst => {
      const parentCountry = inst.country || '';
      if (!parentCountry) return true;
      
      const countryNorm = parentCountry.trim().toLowerCase();
      
      // Check direct matching and popular alias combinations
      for (const [key, value] of Object.entries(hiddenCountries)) {
        if (value === true) {
          const kNorm = key.trim().toLowerCase();
          if (countryNorm === kNorm) return false;
          if (kNorm === 'united kingdom' && countryNorm === 'uk') return false;
          if (kNorm === 'uk' && countryNorm === 'united kingdom') return false;
          if (kNorm === 'united arab emirates' && countryNorm === 'uae') return false;
          if (kNorm === 'uae' && countryNorm === 'united arab emirates') return false;
        }
      }
      return true;
    });
  }, [institutions, hiddenCountries]);

  const contextValue = useMemo(() => ({
    user,
    profile,
    activeRole,
    loading: loading || loadingSettings,
    logout,
    selectRole,
    institutions: filteredInstitutions,
    loadingInstitutions,
    hiddenCountries,
    hideLandingPages,
    hideTrainingHub,
    hideSupportCenter
  }), [
    user,
    profile,
    activeRole,
    loading,
    loadingSettings,
    logout,
    selectRole,
    filteredInstitutions,
    loadingInstitutions,
    hiddenCountries,
    hideLandingPages,
    hideTrainingHub,
    hideSupportCenter
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};