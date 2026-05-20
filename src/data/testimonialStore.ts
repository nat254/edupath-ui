import { Testimonial } from "./types";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

let testimonials: Testimonial[] = [];
let listeners: Array<() => void> = [];

function emit() {
  listeners.forEach((l) => l());
}

export const testimonialStore = {
  subscribe(listener: () => void) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },

  getAll() {
    return testimonials;
  },

  /** Fetch approved testimonials (public — landing page) */
  async fetchApproved() {
    try {
      const res = await fetch(`${BASE}/testimonials`);
      if (!res.ok) throw new Error(await res.text());
      const data: Testimonial[] = await res.json();
      testimonials = data;
      emit();
    } catch (err) {
      console.error("testimonialStore.fetchApproved error:", err);
    }
  },

  /** Fetch all testimonials (admin view) */
  async fetchAll() {
    try {
      const res = await fetch(`${BASE}/testimonials/all`);
      if (!res.ok) throw new Error(await res.text());
      const data: Testimonial[] = await res.json();
      testimonials = data;
      emit();
    } catch (err) {
      console.error("testimonialStore.fetchAll error:", err);
    }
  },

  /**
   * Submit a testimonial from a learner.
   * Uses nationalId to identify the user on the backend.
   */
  async add(entry: {
    userId: string;
    role: string;
    rating: number;
    text: string;
  }): Promise<Testimonial> {
    const res = await fetch(`${BASE}/testimonials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(body.error ?? "Failed to submit testimonial");
    }
    const saved: Testimonial = await res.json();
    // Add to local cache (pending approval, so won't show on landing yet)
    testimonials = [saved, ...testimonials.filter((t) => t.id !== saved.id)];
    emit();
    return saved;
  },

  /** Toggle approval status (admin) */
  async setApproved(id: string, approved: boolean): Promise<void> {
    const res = await fetch(`${BASE}/testimonials/${id}/approve`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(body.error ?? "Failed to update testimonial");
    }
    testimonials = testimonials.map((t) =>
      t.id === id ? { ...t, isApproved: approved } : t
    );
    emit();
  },

  /** Delete a testimonial (admin) */
  async remove(id: string): Promise<void> {
    const res = await fetch(`${BASE}/testimonials/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(body.error ?? "Failed to delete testimonial");
    }
    testimonials = testimonials.filter((t) => t.id !== id);
    emit();
  },
};
