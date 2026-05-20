import { AnalyticsData } from "./types";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const empty: AnalyticsData = {
  trend: [], 
  daily: [], 
  county: [],
  courseCompletion: [], 
  topCourses: [],
  orgProgress: [],
  status: { completed: 0, inProgress: 0, notStarted: 0 },
};

let data: AnalyticsData = empty;
let isLoading = false;
let listeners: (() => void)[] = [];

function emit() { listeners.forEach(l => l()); }

export const analyticsStore = {
  subscribe(listener: () => void) {
    listeners.push(listener);
    return () => { listeners = listeners.filter(l => l !== listener); };
  },
  getData(): AnalyticsData { return data; },
  getIsLoading(): boolean { return isLoading; },

  async fetchAll(): Promise<void> {
    if (isLoading) return;
    isLoading = true;
    emit();
    try {
      const res = await fetch(`${BASE}/analytics`);
      if (!res.ok) throw new Error(await res.text());
      data = await res.json();
    } catch (err) {
      console.error("analyticsStore.fetchAll error:", err);
    } finally {
      isLoading = false;
      emit();
    }
  },
};