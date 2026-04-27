export interface Enrollment {
  courseId: string;
  userId: string; // nationalId from AuthContext
  progress: number; // 0–100
  status: "in_progress" | "complete";
  startedAt: string;
}

let enrollments: Enrollment[] = [];
let listeners: (() => void)[] = [];

function emit() {
  listeners.forEach((l) => l());
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

  /** Enroll a user in a course (no-op if already enrolled). */
  enroll(userId: string, courseId: string) {
    const already = enrollments.find(
      (e) => e.userId === userId && e.courseId === courseId,
    );
    if (already) return;
    enrollments = [
      ...enrollments,
      {
        courseId,
        userId,
        progress: 0,
        status: "in_progress",
        startedAt: new Date().toISOString(),
      },
    ];
    emit();
  },

  /** Check whether a user has enrolled in a course. */
  isEnrolled(userId: string, courseId: string): boolean {
    return enrollments.some(
      (e) => e.userId === userId && e.courseId === courseId,
    );
  },

  /** Get a single enrollment record (or null). */
  getEnrollment(userId: string, courseId: string): Enrollment | null {
    return (
      enrollments.find(
        (e) => e.userId === userId && e.courseId === courseId,
      ) ?? null
    );
  },

  /** Update progress (0–100) for a course. Auto-marks complete at 100. */
  updateProgress(userId: string, courseId: string, progress: number) {
    enrollments = enrollments.map((e) => {
      if (e.userId !== userId || e.courseId !== courseId) return e;
      const clamped = Math.min(100, Math.max(0, Math.round(progress)));
      return {
        ...e,
        progress: clamped,
        status: clamped >= 100 ? "complete" : "in_progress",
      };
    });
    emit();
  },

  /** Get all enrollments for a given user. */
  getMyEnrollments(userId: string): Enrollment[] {
    return enrollments.filter((e) => e.userId === userId);
  },
};
