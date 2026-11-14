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
  signInWithMobile: (identifier: string, password: string) => Promise<void>;
  registerStudent: (details: StudentRegistration) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// A tab-scoped marker makes students re-authenticate after the browser session ends.
// It is separate from Supabase persistence so administrator sessions remain unchanged.
const STUDENT_TAB_SESSION_KEY = 'krishansir.student-tab-session.v1';
const clearStudentTabSession = () => {
  try { window.sessionStorage.removeItem(STUDENT_TAB_SESSION_KEY); } catch { /* Storage may be unavailable. */ }
};
const setStudentTabSession = (userId: string) => {
  try { window.sessionStorage.setItem(STUDENT_TAB_SESSION_KEY, userId); } catch { /* Fail closed on next startup. */ }
};
const hasStudentTabSession = (userId: string) => {
  try { return window.sessionStorage.getItem(STUDENT_TAB_SESSION_KEY) === userId; } catch { return false; }
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
      const authListener = client.auth.onAuthStateChange((event, nextSession) => {
        if (!active || event === 'INITIAL_SESSION') return;
        if (event === 'SIGNED_OUT') clearStudentTabSession();
        setSession(nextSession);
      });
      subscription = authListener.data.subscription;

      void client.auth.getSession().then(async ({ data, error }) => {
        if (!active) return;
        if (error) console.error('Unable to restore Supabase session:', error.message);

        let restoredSession = data.session;
        const restoredStudent = restoredSession?.user.user_metadata?.account_type === 'student';
        if (restoredSession && restoredStudent && !hasStudentTabSession(restoredSession.user.id)) {
          clearStudentTabSession();
          await client.auth.signOut({ scope: 'local' });
          restoredSession = null;
        }

        if (!active) return;
        setSession(restoredSession);
        setLoading(false);
      }).catch((error) => {
        if (!active) return;
        console.error('Unable to initialize authentication:', error);
        setLoading(false);
      });
    } catch (error) {
      console.warn(error instanceof Error ? error.message : 'Supabase is not configured.');
      setLoading(false);
    }

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Do not sign students out on a transient offline event. Keep the local Supabase
  // session and the server-authoritative attempt clock intact; the test engine saves
  // answers locally and retries auto-submission when the connection returns.

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
      options: {
        // Always return to the Admin route after Google OAuth. Preserve a hosting
        // subpath (for example GitHub Pages) while avoiding an accidental homepage return.
        redirectTo: (() => {
          const pathSegments = window.location.pathname.split('/').filter(Boolean);
          if (pathSegments[pathSegments.length - 1] === 'admin') pathSegments.pop();
          const adminPath = `/${pathSegments.concat('admin').join('/')}/`;
          return new URL(adminPath, window.location.origin).toString();
        })(),
      },
    });
    if (error) throw error;
  }, []);

  const signInWithMobile = useCallback(async (identifierInput: string, password: string) => {
    const input = identifierInput.trim();
    // Email accounts use their real email; legacy/new mobile accounts use a stable internal alias.
    const email = input.includes('@') ? input.toLowerCase() : studentLoginEmail(input);
    const { data, error } = await requireSupabase().auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.session?.user.user_metadata?.account_type === 'student') setStudentTabSession(data.session.user.id);
  }, []);

  const registerStudent = useCallback(async (details: StudentRegistration) => {
    const input = details.identifier.trim();
    const isEmail = input.includes('@');
    const mobile = isEmail ? null : normalizeIndianMobile(input);
    const email = isEmail ? input.toLowerCase() : studentLoginEmail(mobile as string);
    if (isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('कृपया वैध Email ID दर्ज करें।');
    }
    if (details.password.length < 8 || !/[A-Za-z]/.test(details.password) || !/\d/.test(details.password)) {
      throw new Error('पासवर्ड कम-से-कम 8 अक्षरों का होना चाहिए और उसमें अक्षर तथा अंक दोनों होने चाहिए।');
    }
    const { data, error } = await requireSupabase().auth.signUp({
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
          login_method: isEmail ? 'email' : 'mobile',
          mobile_number: mobile,
        },
      },
    });
    if (error) throw error;
    if (data.session?.user.user_metadata?.account_type === 'student') setStudentTabSession(data.session.user.id);
  }, []);

  const signOut = useCallback(async () => {
    clearStudentTabSession();
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
