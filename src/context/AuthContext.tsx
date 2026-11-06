import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { normalizeIndianMobile, requireSupabase } from '../lib/supabase';

type StudentRegistration = {
  mobile: string;
  password: string;
  studentName: string;
  studentClass: '9' | '10';
  rollNo: string;
  schoolName: string;
};

export type StudentProfile = {
  user_id: string;
  student_name: string;
  class_level: string;
  roll_no: string;
  school_name: string;
  created_at: string;
  updated_at: string;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: StudentProfile | null;
  loading: boolean;
  profileLoading: boolean;
  configured: boolean;
  isAdmin: boolean;
  adminLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signInWithMobile: (mobile: string, password: string) => Promise<void>;
  registerStudent: (details: StudentRegistration) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Map an Indian mobile number to a stable internal email identifier.
 * Students still enter only their mobile number in the UI. This requires
 * Supabase Email provider enabled and email confirmations disabled.
 * The generated address is not a mailbox and cannot receive password resets.
 */
const mobileLoginEmail = (mobile: string): string => {
  const phone = normalizeIndianMobile(mobile);
  const digits = phone.replace(/\D/g, '');
  return `student-${digits}@students.krishansir.online`;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    let active = true;
    let subscription: { unsubscribe: () => void } | undefined;

    try {
      const client = requireSupabase();
      client.auth.getSession().then(({ data, error }) => {
        if (!active) return;
        if (error) console.error('Unable to restore Supabase session:', error.message);
        setSession(data.session);
        setLoading(false);
      });
      const authListener = client.auth.onAuthStateChange((_event, nextSession) => {
        if (active) setSession(nextSession);
      });
      subscription = authListener.data.subscription;
    } catch (error) {
      console.warn(error instanceof Error ? error.message : 'Supabase is not configured.');
      setLoading(false);
    }

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session?.user) {
      setProfile(null);
      return;
    }
    setProfileLoading(true);
    try {
      const { data, error } = await requireSupabase()
        .from('student_profiles')
        .select('user_id, student_name, class_level, roll_no, school_name, created_at, updated_at')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (error) throw error;
      setProfile(data as StudentProfile | null);
    } finally {
      setProfileLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    let active = true;
    if (!session?.user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    requireSupabase()
      .from('student_profiles')
      .select('user_id, student_name, class_level, roll_no, school_name, created_at, updated_at')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error('Unable to load student profile:', error.message);
          setProfile(null);
        } else {
          setProfile(data as StudentProfile | null);
        }
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });

    return () => { active = false; };
  }, [session?.user?.id]);

  useEffect(() => {
    let active = true;
    if (!session?.user) {
      setIsAdmin(false);
      setAdminLoading(false);
      return;
    }
    setAdminLoading(true);
    requireSupabase()
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'admin')
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error('Unable to verify admin role:', error.message);
          setIsAdmin(false);
        } else {
          setIsAdmin(Boolean(data));
        }
      })
      .finally(() => { if (active) setAdminLoading(false); });
    return () => { active = false; };
  }, [session?.user?.id]);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await requireSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  }, []);

  const signInWithMobile = useCallback(async (mobile: string, password: string) => {
    const email = mobileLoginEmail(mobile);
    const { error } = await requireSupabase().auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const registerStudent = useCallback(async (details: StudentRegistration) => {
    const phone = normalizeIndianMobile(details.mobile);
    const email = mobileLoginEmail(phone);
    if (details.password.length < 8) {
      throw new Error('पासवर्ड कम-से-कम 8 अक्षरों का होना चाहिए।');
    }
    const { error } = await requireSupabase().auth.signUp({
      email,
      password: details.password,
      options: {
        data: {
          full_name: details.studentName.trim(),
          student_class: details.studentClass,
          roll_no: details.rollNo.trim(),
          school_name: details.schoolName.trim(),
          account_type: 'student',
          mobile_number: phone,
        },
      },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await requireSupabase().auth.signOut();
    if (error) throw error;
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    session,
    profile,
    loading,
    profileLoading,
    isAdmin,
    adminLoading,
    signInWithGoogle,
    configured: (() => {
      try { requireSupabase(); return true; } catch { return false; }
    })(),
    refreshProfile,
    signInWithMobile,
    registerStudent,
    signOut,
  }), [session, profile, loading, profileLoading, isAdmin, adminLoading, signInWithGoogle, refreshProfile, signInWithMobile, registerStudent, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
};
