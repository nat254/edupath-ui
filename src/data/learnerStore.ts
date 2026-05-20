import { Learner } from "./types";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

let learnerList: Learner[] = [];
let isLoading = false;
let listeners: (() => void)[] = [];

function emit() {
  listeners.forEach((l) => l());
}

export const learnerStore = {
  subscribe(listener: () => void) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },

  getAll(): Learner[] {
    return learnerList;
  },

  getIsLoading(): boolean {
    return isLoading;
  },

  getById(id: string): Learner | null {
    return learnerList.find((l) => l.id === id) ?? null;
  },

  /** Fetch all learners with real enrollment stats from the backend */
  async fetchAll(): Promise<void> {
    if (isLoading) return;
    isLoading = true;
    emit();
    try {
      const res = await fetch(`${BASE}/learners`);
      if (!res.ok) throw new Error(await res.text());
      const data: Learner[] = await res.json();
      learnerList = data;
    } catch (err) {
      console.error("learnerStore.fetchAll error:", err);
    } finally {
      isLoading = false;
      emit();
    }
  },

  /** Create a new learner via the backend API */
  async add(payload: Omit<Learner, "id">): Promise<void> {
    const res = await fetch(`${BASE}/learners`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    const created: Learner = await res.json();
    learnerList = [...learnerList, created];
    emit();
  },

  /** Update an existing learner via the backend API */
  async update(id: string, payload: Partial<Omit<Learner, "id">>): Promise<void> {
    const res = await fetch(`${BASE}/learners/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    const updated: Learner = await res.json();
    learnerList = learnerList.map((l) => (l.id === id ? updated : l));
    emit();
  },

  /** Delete a learner via the backend API */
  async remove(id: string): Promise<void> {
    const res = await fetch(`${BASE}/learners/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(await res.text());
    learnerList = learnerList.filter((l) => l.id !== id);
    emit();
  },
};
