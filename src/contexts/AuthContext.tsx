import React, { createContext, useContext, useState, ReactNode } from "react";

export type UserRole = "admin" | "learner";

export interface User {
  nationalId: string;
  email: string;
  organization: string;
  county: string;
  role: UserRole;
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: (nationalId: string, pin: string) => { success: boolean; error?: string };
  register: (data: { nationalId: string; email: string; organization: string; county: string; pin: string }) => { success: boolean; error?: string };
  logout: () => void;
  updateProfile: (data: Partial<Pick<User, "name" | "email" | "organization" | "county">>) => void;
  changePin: (currentPin: string, newPin: string) => { success: boolean; error?: string };
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

const mockUsers: User[] = [
  { nationalId: "1234", email: "admin@tms.co.ke", organization: "Kenyatta National Hospital - FID-12-324627", county: "Nairobi", role: "admin", name: "Admin User" },
  { nationalId: "5678", email: "learner@tms.co.ke", organization: "Kenyatta National Hospital - FID-12-324627", county: "Nairobi", role: "learner", name: "Jane Wanjiku" },
];

// Track current PIN per nationalId (in-memory)
const pinMap: Record<string, string> = {};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = (nationalId: string, pin: string): { success: boolean; error?: string } => {
    const found = mockUsers.find((u) => u.nationalId === nationalId);
    if (!found) return { success: false, error: "Invalid National ID or PIN" };
    const expectedPin = pinMap[nationalId] ?? "1234";
    if (pin !== expectedPin) return { success: false, error: "Invalid National ID or PIN" };
    setUser(found);
    return { success: true };
  };

  const updateProfile = (data: Partial<Pick<User, "name" | "email" | "organization" | "county">>) => {
    if (!user) return;
    const updated = { ...user, ...data };
    // Sync back into mockUsers array so re-login picks up changes
    const idx = mockUsers.findIndex((u) => u.nationalId === user.nationalId);
    if (idx !== -1) mockUsers[idx] = updated;
    setUser(updated);
  };

  const changePin = (currentPin: string, newPin: string): { success: boolean; error?: string } => {
    if (!user) return { success: false, error: "Not logged in" };
    const expected = pinMap[user.nationalId] ?? "1234";
    if (currentPin !== expected) return { success: false, error: "Current PIN is incorrect" };
    if (newPin.length < 4) return { success: false, error: "PIN must be at least 4 digits" };
    pinMap[user.nationalId] = newPin;
    return { success: true };
  };

  const register = (data: { nationalId: string; email: string; organization: string; county: string; pin: string }): { success: boolean; error?: string } => {
    if (mockUsers.find((u) => u.nationalId === data.nationalId)) {
      return { success: false, error: "National ID already registered" };
    }
    const newUser: User = {
      nationalId: data.nationalId,
      email: data.email,
      organization: data.organization,
      county: data.county,
      role: "learner",
      name: "New Learner",
    };
    mockUsers.push(newUser);
    setUser(newUser);
    return { success: true };
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateProfile, changePin }}>
      {children}
    </AuthContext.Provider>
  );
};
