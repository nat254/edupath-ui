import { PlatformUser } from "./types";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

let userList: PlatformUser[] = [];
let isLoading = false;
let listeners: (() => void)[] = [];

function emit() { listeners.forEach((l) => l()); }

export const userStore = {
  subscribe(listener: () => void) {
    listeners.push(listener);
    return () => { listeners = listeners.filter((l) => l !== listener); };
  },
  getAll(): PlatformUser[] { return userList; },
  getIsLoading(): boolean { return isLoading; },
  getById(id: string): PlatformUser | null { return userList.find((u) => u.id === id) ?? null; },

  async fetchAll(role?: string): Promise<void> {
    if (isLoading) return;
    isLoading = true;
    emit();
    try {
      const params = role && role !== "all" ? `?role=${role}` : "";
      const res = await fetch(`${BASE}/users${params}`);
      if (!res.ok) throw new Error(await res.text());
      userList = await res.json();
    } catch (err) {
      console.error("userStore.fetchAll error:", err);
    } finally {
      isLoading = false;
      emit();
    }
  },

  async add(payload: any): Promise<void> {
    const res = await fetch(`${BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Server error" }));
      throw new Error(err.error || "Failed to register user");
    }
    const created: PlatformUser = await res.json();
    userList = [...userList, created];
    emit();
  },

  async update(id: string, payload: Partial<PlatformUser>): Promise<void> {
    const res = await fetch(`${BASE}/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    const updated: PlatformUser = await res.json();
    userList = userList.map((u) => (u.id === id ? { ...u, ...updated } : u));
    emit();
  },

  async toggleStatus(id: string, isActive: boolean): Promise<void> {
    const res = await fetch(`${BASE}/users/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    if (!res.ok) throw new Error(await res.text());
    userList = userList.map((u) => (u.id === id ? { ...u, isActive } : u));
    emit();
  },

  async remove(id: string): Promise<void> {
    const res = await fetch(`${BASE}/users/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(await res.text());
    userList = userList.filter((u) => u.id !== id);
    emit();
  },
};

