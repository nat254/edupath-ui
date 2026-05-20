import { Enrollment } from "./types";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

let enrollments: Enrollment[] = [];
let listeners: (() => void)[] = [];

function emit() {
  listeners.forEach((l) => l());
}

/** Map backend row → frontend Enrollment shape */
function fromApi(row: {
  courseId: string;
  progress: number;
  enrolledAt: string;
  completedAt: string | null;
  _userId: string;
}): Enrollment {
  return {
    courseId: row.courseId,
    userId: row._userId,
    progress: row.progress,
    status: row.completedAt !== null ? "complete" : row.progress >= 100 ? "complete" : "in_progress",
    startedAt: row.enrolledAt,
    completedAt: row.completedAt,
  };
}

export const enrollmentStore = {
  subscribe(listener: () => void) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },

  getSnapshot() {
    return enrollments;
  },

  /** Fetch all enrollments for the current user from the backend */
  async fetchMyEnrollments(userId: string) {
    try {
      const res = await fetch(`${BASE}/enrollments/${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error(await res.text());
      const rows: Array<{
        courseId: string;
        progress: number;
        enrolledAt: string;
        completedAt: string | null;
      }> = await res.json();

      const myNew = rows.map((r) => fromApi({ ...r, _userId: userId }));
      enrollments = [
        ...enrollments.filter((e) => e.userId !== userId),
        ...myNew,
      ];
      emit();
    } catch (err) {
      console.error("enrollmentStore.fetchMyEnrollments error:", err);
    }
  },

  /** Enroll a user in a course — persists to backend, then updates local cache. */
  async enroll(userId: string, courseId: string): Promise<void> {
    try {
      const res = await fetch(`${BASE}/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, courseId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error ?? "Failed to enroll");
      }
      const row: { courseId: string; progress: number; enrolledAt: string; completedAt: string | null } =
        await res.json();

      const entry = fromApi({ ...row, _userId: userId });
      if (!enrollments.some((e) => e.userId === userId && e.courseId === courseId)) {
        enrollments = [...enrollments, entry];
        emit();
      }
    } catch (err) {
      console.error("enrollmentStore.enroll error:", err);
    }
  },

  /** Check whether a user has enrolled in a course (from local cache). */
  isEnrolled(userId: string, courseId: string): boolean {
    return enrollments.some((e) => e.userId === userId && e.courseId === courseId);
  },

  /** Get a single enrollment record from cache (or null). */
  getEnrollment(userId: string, courseId: string): Enrollment | null {
    return enrollments.find((e) => e.userId === userId && e.courseId === courseId) ?? null;
  },

  /**
   * Update progress (0–100) for a course.
   * - progress 50  → video watched
   * - progress 100 → quiz complete, sets completed_at on backend
   */
  async updateProgress(userId: string, courseId: string, progress: number): Promise<void> {
    const clamped = Math.min(100, Math.max(0, Math.round(progress)));

    // Optimistic update
    enrollments = enrollments.map((e) => {
      if (e.userId !== userId || e.courseId !== courseId) return e;
      return {
        ...e,
        progress: clamped,
        status: clamped >= 100 ? "complete" : "in_progress",
      };
    });
    emit();

    try {
      const res = await fetch(`${BASE}/enrollments/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, courseId, progress: clamped }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        console.error("updateProgress API error:", body.error);
      }
    } catch (err) {
      console.error("enrollmentStore.updateProgress error:", err);
    }
  },

  /** Get all enrollments for a given user from local cache. */
  getMyEnrollments(userId: string): Enrollment[] {
    return enrollments.filter((e) => e.userId === userId);
  },
};
