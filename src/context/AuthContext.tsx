import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { normalizeIndianMobile, requireSupabase, studentLoginEmail } from '../lib/supabase';

type StudentRegistration = {
  identifier: string;
  identifierType: 'mobile' | 'email';
  password: string;
  studentName: string;
  studentClass: '6' | '7' | '8' | '9' | '10' | '11' | '12';
  rollNo: string;
  schoolName: string;
  country: string;
  state: string;
  district: string;
  areaType: 'village' | 'city' | 'town' | 'other';
  localityName: string;
  pinCode: string;
};

export type StudentProfile = {
  user_id: string;
  student_name: string;
  class_level: string;
  roll_no: string;
  school_name: string;
  country: string;
  state: string | null;
  district: string | null;
  area_type: string | null;
  locality_name: string | null;
  pin_code: string | null;
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
        .select('user_id, student_name, class_level, roll_no, school_name, country, state, district, area_type, locality_name, pin_code, created_at, updated_at')
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
    void (async () => {
      try {
        const { data, error } = await requireSupabase()
          .from('student_profiles')
          .select('user_id, student_name, class_level, roll_no, school_name, country, state, district, area_type, locality_name, pin_code, created_at, updated_at')
          .eq('user_id', session.user.id)
          .maybeSingle();
        if (!active) return;
        if (error) {
          console.error('Unable to load student profile:', error.message);
          setProfile(null);
        } else {
          setProfile(data as StudentProfile | null);
        }
      } finally {
        if (active) setProfileLoading(false);
      }
    })();

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
    void (async () => {
      try {
        const { data, error } = await requireSupabase()
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'admin')
          .maybeSingle();
        if (!active) return;
        if (error) {
          console.error('Unable to verify admin role:', error.message);
          setIsAdmin(false);
        } else {
          setIsAdmin(Boolean(data));
        }
      } finally {
        if (active) setAdminLoading(false);
      }
    })();
    return () => { active = false; };
  }, [session?.user?.id]);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await requireSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  }, []);

  const signInWithMobile = useCallback(async (identifierInput: string, password: string) => {
    const value = identifierInput.trim();
    const identifier = value.includes('@')
      ? value.toLowerCase()
      : studentLoginEmail(value);
    const { error } = await requireSupabase().auth.signInWithPassword({ email: identifier, password });
    if (error) throw error;
  }, []);

  const registerStudent = useCallback(async (details: StudentRegistration) => {
    const isEmail = details.identifierType === 'email';
    const mobile = isEmail ? null : normalizeIndianMobile(details.identifier);
    const email = isEmail
      ? details.identifier.trim().toLowerCase()
      : studentLoginEmail(details.identifier);
    if (isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('कृपया वैध Email ID दर्ज करें।');
    }
    if (details.password.length < 8 || !/[A-Za-z]/.test(details.password) || !/\d/.test(details.password)) {
      throw new Error('पासवर्ड कम-से-कम 8 अक्षरों का होना चाहिए और उसमें अक्षर तथा अंक दोनों होने चाहिए।');
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
          country: details.country.trim(),
          state: details.state.trim(),
          district: details.district.trim(),
          area_type: details.areaType,
          locality_name: details.localityName.trim(),
          pin_code: details.pinCode.trim(),
          account_type: 'student',
          ...(mobile ? { mobile_number: mobile } : {}),
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
