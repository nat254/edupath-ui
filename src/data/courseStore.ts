import { Course } from "./types";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

let courseList: Course[] = [];
let isLoading = false;
let listeners: (() => void)[] = [];

function emit() { listeners.forEach((l) => l()); }

function fixUrls(c: Course): Course {
  return {
    ...c,
    videoUrl: c.videoUrl?.startsWith("/") ? `${API}${c.videoUrl}` : c.videoUrl,
    pdfUrl: c.pdfUrl?.startsWith("/") ? `${API}${c.pdfUrl}` : c.pdfUrl,
  };
}

export const courseStore = {
  subscribe(listener: () => void) {
    listeners.push(listener);
    return () => { listeners = listeners.filter((l) => l !== listener); };
  },
  getAll() { return courseList; },
  getIsLoading() { return isLoading; },
  getById(id: string) { return courseList.find((c) => c.id === id) ?? null; },

  /** Fetch courses, optionally filtered by user role for audience visibility */
  async fetchAll(role?: string) {
    isLoading = true;
    emit();
    try {
      const params = role ? `?role=${role}` : "";
      const res = await fetch(`${API}/courses${params}`);
      if (!res.ok) throw new Error("Failed to fetch courses");
      const data: Course[] = await res.json();
      courseList = data.map(fixUrls);
    } catch (err) {
      console.error("courseStore.fetchAll error:", err);
    } finally {
      isLoading = false;
      emit();
    }
  },

  async add(formData: FormData): Promise<Course> {
    const res = await fetch(`${API}/courses`, { method: "POST", body: formData });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Server error" }));
      throw new Error(err.error);
    }
    const created: Course = await res.json();
    const fixed = fixUrls(created);
    courseList = [fixed, ...courseList];
    emit();
    return fixed;
  },

  async update(id: string, formData: FormData): Promise<Course> {
    const res = await fetch(`${API}/courses/${id}`, { method: "PATCH", body: formData });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Server error" }));
      throw new Error(err.error);
    }
    const updated: Course = await res.json();
    const fixed = fixUrls(updated);
    courseList = courseList.map((c) => (c.id === id ? fixed : c));
    emit();
    return fixed;
  },

  async remove(id: string): Promise<void> {
    const res = await fetch(`${API}/courses/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Server error" }));
      throw new Error(err.error);
    }
    courseList = courseList.filter((c) => c.id !== id);
    emit();
  },
};
