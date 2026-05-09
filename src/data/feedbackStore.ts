const BASE = "http://localhost:5000";

export interface CourseFeedback {
  id: string;
  courseId: string;
  courseName: string;
  userId: string;
  userName: string;
  rating: number;        // 1-5
  comment: string;
  submittedAt: string;   // ISO date string
}

let feedbackList: CourseFeedback[] = [];
let listeners: (() => void)[] = [];

function emit() {
  listeners.forEach((l) => l());
}

export const feedbackStore = {
  subscribe(listener: () => void) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },

  getSnapshot() {
    return feedbackList;
  },

  getAll() {
    return feedbackList;
  },

  getByCourse(courseId: string) {
    return feedbackList.filter((f) => f.courseId === courseId);
  },

  /** Fetch all feedback from the backend (admin view) */
  async fetchAll() {
    try {
      const res = await fetch(`${BASE}/feedback`);
      if (!res.ok) throw new Error(await res.text());
      const data: CourseFeedback[] = await res.json();
      feedbackList = data;
      emit();
    } catch (err) {
      console.error("feedbackStore.fetchAll error:", err);
    }
  },

  /** Fetch feedback for a specific course */
  async fetchByCourse(courseId: string) {
    try {
      const res = await fetch(`${BASE}/feedback/${courseId}`);
      if (!res.ok) throw new Error(await res.text());
      const data: CourseFeedback[] = await res.json();
      // Merge into the list (replace entries for this course)
      feedbackList = [
        ...feedbackList.filter((f) => f.courseId !== courseId),
        ...data,
      ];
      emit();
    } catch (err) {
      console.error("feedbackStore.fetchByCourse error:", err);
    }
  },

  /**
   * Submit (or update) feedback for a course.
   * Returns the saved entry on success, throws on failure.
   */
  async submit(entry: {
    userId: string;
    courseId: string;
    courseName: string;
    userName: string;
    rating: number;
    comment: string;
  }): Promise<CourseFeedback> {
    const res = await fetch(`${BASE}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId:   entry.userId,
        courseId: entry.courseId,
        rating:   entry.rating,
        comment:  entry.comment,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(body.error ?? "Failed to submit feedback");
    }

    const saved: CourseFeedback = await res.json();
    // Ensure courseName is populated (backend doesn't re-join on upsert response)
    saved.courseName = saved.courseName ?? entry.courseName;

    // Update local cache
    feedbackList = [
      saved,
      ...feedbackList.filter(
        (f) => !(f.courseId === saved.courseId && f.userId === saved.userId),
      ),
    ];
    emit();
    return saved;
  },

  async remove(id: string) {
    const res = await fetch(`${BASE}/feedback/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(body.error ?? "Failed to delete feedback");
    }
    feedbackList = feedbackList.filter((f) => f.id !== id);
    emit();
  },
};
