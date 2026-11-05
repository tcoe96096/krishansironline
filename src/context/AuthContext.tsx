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

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
  signInWithMobile: (mobile: string, password: string) => Promise<void>;
  registerStudent: (details: StudentRegistration) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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

  const signInWithMobile = useCallback(async (mobile: string, password: string) => {
    const phone = normalizeIndianMobile(mobile);
    const { error } = await requireSupabase().auth.signInWithPassword({ phone, password });
    if (error) throw error;
  }, []);

  const registerStudent = useCallback(async (details: StudentRegistration) => {
    const phone = normalizeIndianMobile(details.mobile);
    if (details.password.length < 8) {
      throw new Error('पासवर्ड कम-से-कम 8 अक्षरों का होना चाहिए।');
    }
    const { error } = await requireSupabase().auth.signUp({
      phone,
      password: details.password,
      options: {
        data: {
          full_name: details.studentName.trim(),
          student_class: details.studentClass,
          roll_no: details.rollNo.trim(),
          school_name: details.schoolName.trim(),
          account_type: 'student',
        },
      },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await requireSupabase().auth.signOut();
    if (error) throw error;
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    session,
    loading,
    configured: (() => {
      try { requireSupabase(); return true; } catch { return false; }
    })(),
    signInWithMobile,
    registerStudent,
    signOut,
  }), [session, loading, signInWithMobile, registerStudent, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
};
