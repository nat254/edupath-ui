const BASE = "http://localhost:5000";

export interface Learner {
  id: string;
  name: string;
  email: string;
  nationalId: string;
  organization: string;
  county: string;
  coursesCompleted: number;
  coursesInProgress: number;
}

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
};
