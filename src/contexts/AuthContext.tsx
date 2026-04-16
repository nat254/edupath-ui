import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User as SupaUser } from "@supabase/supabase-js";

export type UserRole = "admin" | "learner";

export interface User {
  id: string;
  nationalId: string;
  email: string;
  organization: string;
  county: string;
  role: UserRole;
  name: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (nationalId: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: { nationalId: string; email: string; organization: string; county: string; pin: string; name?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

// Map national ID + PIN to a synthetic email/password.
// PIN is padded to satisfy Supabase's 6-char minimum.
const idToEmail = (nationalId: string) => `id-${nationalId}@tms.local`;
const pinToPassword = (pin: string) => `pin-${pin}-tms`;

const loadProfile = async (supaUser: SupaUser): Promise<User | null> => {
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", supaUser.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", supaUser.id),
  ]);
  if (!profile) return null;
  const isAdmin = (roles ?? []).some((r) => r.role === "admin");
  return {
    id: supaUser.id,
    nationalId: profile.national_id,
    email: profile.email ?? supaUser.email ?? "",
    organization: profile.organization ?? "",
    county: profile.county ?? "",
    role: isAdmin ? "admin" : "learner",
    name: profile.name || "Learner",
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up listener BEFORE checking session
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // Defer Supabase calls to avoid deadlocks
        setTimeout(() => {
          loadProfile(session.user).then((u) => setUser(u));
        }, 0);
      } else {
        setUser(null);
      }
    });

    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        const u = await loadProfile(data.session.user);
        setUser(u);
      }
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const login = async (nationalId: string, pin: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: idToEmail(nationalId),
      password: pinToPassword(pin),
    });
    if (error) return { success: false, error: "Invalid National ID or PIN" };
    return { success: true };
  };

  const register = async (data: { nationalId: string; email: string; organization: string; county: string; pin: string; name?: string }) => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    const { error } = await supabase.auth.signUp({
      email: idToEmail(data.nationalId),
      password: pinToPassword(data.pin),
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          national_id: data.nationalId,
          name: data.name || "New Learner",
          organization: data.organization,
          county: data.county,
          // Real (contact) email goes into the profile via trigger
          contact_email: data.email,
          role: "learner",
        },
      },
    });
    if (error) {
      if (error.message.toLowerCase().includes("already")) {
        return { success: false, error: "National ID already registered" };
      }
      return { success: false, error: error.message };
    }
    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
};
