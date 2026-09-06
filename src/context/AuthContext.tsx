import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

export interface AppAccount {
  id: string;
  name: string;
  email: string;
  password?: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  activeAccount: AppAccount | null;
  accountId: string | null;
  isAdmin: boolean;
  isLoggedIn: boolean;
  userName: string;
  userEmail: string;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<{ error: any; account?: AppAccount }>;
  signUp: (email: string, pass: string, name?: string) => Promise<{ error: any; account?: AppAccount }>;
  signOut: () => Promise<void>;
  signInDemoAdmin: () => void;
  isDemoAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCOUNTS_STORAGE_KEY = 'athenaeum_user_accounts';
const ACTIVE_ACCOUNT_STORAGE_KEY = 'athenaeum_active_account';

function getStoredAccounts(): AppAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveAccounts(accounts: AppAccount[]) {
  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch (err) {
    console.error('Failed to save accounts to localStorage', err);
  }
}

function getStoredActiveAccount(): AppAccount | null {
  try {
    const raw = localStorage.getItem(ACTIVE_ACCOUNT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveStoredActiveAccount(account: AppAccount | null) {
  try {
    if (account) {
      localStorage.setItem(ACTIVE_ACCOUNT_STORAGE_KEY, JSON.stringify(account));
    } else {
      localStorage.removeItem(ACTIVE_ACCOUNT_STORAGE_KEY);
    }
  } catch (err) {
    console.error('Failed to persist active account', err);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [activeAccount, setActiveAccount] = useState<AppAccount | null>(() => getStoredActiveAccount());
  const [loading, setLoading] = useState(true);
  const [isDemoAdmin, setIsDemoAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, pass: string): Promise<{ error: any; account?: AppAccount }> => {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Check Supabase app_accounts table first
    try {
      const { data: dbAccount } = await supabase
        .from('app_accounts')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (dbAccount) {
        if (dbAccount.password && dbAccount.password !== pass) {
          return { error: { message: 'Incorrect password. Please verify your password and try again.' } };
        }
        const appAcc: AppAccount = {
          id: dbAccount.id,
          name: dbAccount.name,
          email: dbAccount.email,
          password: dbAccount.password,
          createdAt: dbAccount.created_at,
        };
        // sync to local accounts
        const localAccounts = getStoredAccounts();
        const existingIdx = localAccounts.findIndex(a => a.email.toLowerCase() === cleanEmail);
        if (existingIdx >= 0) {
          localAccounts[existingIdx] = appAcc;
        } else {
          localAccounts.push(appAcc);
        }
        saveAccounts(localAccounts);

        setActiveAccount(appAcc);
        saveStoredActiveAccount(appAcc);
        setIsDemoAdmin(false);
        return { error: null, account: appAcc };
      }
    } catch (err) {
      console.warn('Database accounts check failed, checking local accounts', err);
    }

    // 2. Check local accounts cache
    const accounts = getStoredAccounts();
    const match = accounts.find(a => a.email.toLowerCase() === cleanEmail);

    if (match) {
      if (match.password && match.password !== pass) {
        return { error: { message: 'Incorrect password. Please verify your password and try again.' } };
      }
      setActiveAccount(match);
      saveStoredActiveAccount(match);
      setIsDemoAdmin(false);
      return { error: null, account: match };
    }

    // 3. Try Supabase auth in case they registered via Supabase Auth
    try {
      const res = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: pass,
      });
      if (!res.error && res.data.user) {
        const sbAccount: AppAccount = {
          id: res.data.user.id,
          name: res.data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
          email: cleanEmail,
          createdAt: new Date().toISOString(),
        };
        setActiveAccount(sbAccount);
        saveStoredActiveAccount(sbAccount);
        setIsDemoAdmin(false);
        return { error: null, account: sbAccount };
      }
    } catch {
      // ignore
    }

    return { 
      error: { 
        message: 'Account not found. Please verify your email or click "Create Account" to register.' 
      } 
    };
  };

  const signUp = async (email: string, pass: string, name?: string): Promise<{ error: any; account?: AppAccount }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !pass) {
      return { error: { message: 'Email and password are required.' } };
    }
    if (pass.length < 6) {
      return { error: { message: 'Password must be at least 6 characters long.' } };
    }

    // Check if account already exists in DB
    try {
      const { data: existingDb } = await supabase
        .from('app_accounts')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (existingDb) {
        return { error: { message: 'An account with this email already exists. Please sign in.' } };
      }
    } catch {
      // ignore
    }

    const accounts = getStoredAccounts();
    const existing = accounts.find(a => a.email.toLowerCase() === cleanEmail);
    if (existing) {
      return { error: { message: 'An account with this email already exists. Please sign in.' } };
    }

    const displayName = name?.trim() || cleanEmail.split('@')[0];
    const newAccount: AppAccount = {
      id: 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      name: displayName,
      email: cleanEmail,
      password: pass,
      createdAt: new Date().toISOString(),
    };

    // Save to Supabase app_accounts table
    try {
      await supabase.from('app_accounts').insert([{
        id: newAccount.id,
        name: newAccount.name,
        email: newAccount.email,
        password: newAccount.password,
        created_at: newAccount.createdAt,
        updated_at: newAccount.createdAt,
      }]);
    } catch (err) {
      console.warn('Failed to insert into app_accounts table:', err);
    }

    accounts.push(newAccount);
    saveAccounts(accounts);

    // Auto sign-in the newly created account immediately
    setActiveAccount(newAccount);
    saveStoredActiveAccount(newAccount);
    setIsDemoAdmin(false);

    // Try background Supabase signup without blocking user if email confirmation is required
    try {
      supabase.auth.signUp({
        email: cleanEmail,
        password: pass,
        options: {
          data: { full_name: displayName }
        }
      }).catch(() => {});
    } catch {
      // ignore
    }

    return { error: null, account: newAccount };
  };

  const signOut = async () => {
    setActiveAccount(null);
    saveStoredActiveAccount(null);
    setIsDemoAdmin(false);
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    setUser(null);
    setSession(null);
  };

  const signInDemoAdmin = () => {
    const demoAccount: AppAccount = {
      id: 'demo_user',
      name: 'Alex Morgan',
      email: 'alex.morgan@athenaeum.io',
      createdAt: new Date().toISOString(),
    };
    setActiveAccount(demoAccount);
    saveStoredActiveAccount(demoAccount);
    setIsDemoAdmin(true);
  };

  const isLoggedIn = Boolean(activeAccount || user || isDemoAdmin);
  const isAdmin = isLoggedIn; // maintain compatibility across existing components
  const userName = activeAccount?.name || user?.user_metadata?.full_name || (isDemoAdmin ? 'Alex Morgan' : '');
  const userEmail = activeAccount?.email || user?.email || (isDemoAdmin ? 'alex.morgan@athenaeum.io' : '');
  const accountId = activeAccount?.email ? activeAccount.email.toLowerCase().trim() : (user?.email ? user.email.toLowerCase().trim() : (isDemoAdmin ? 'demo_user' : null));

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        activeAccount,
        accountId,
        isAdmin,
        isLoggedIn,
        userName,
        userEmail,
        loading,
        signIn,
        signUp,
        signOut,
        signInDemoAdmin,
        isDemoAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

