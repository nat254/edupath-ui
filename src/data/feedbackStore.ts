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

// Seed data so the admin page is populated on first load
const seed: CourseFeedback[] = [
  {
    id: "fb1",
    courseId: "1",
    courseName: "Introduction to Patient Safety",
    userId: "5678",
    userName: "Jane Wanjiku",
    rating: 5,
    comment: "Very well structured. The quiz really helped me retain the material.",
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
  {
    id: "fb2",
    courseId: "2",
    courseName: "Infection Control Fundamentals",
    userId: "5678",
    userName: "Jane Wanjiku",
    rating: 4,
    comment: "Practical content. Would love more real-world case studies.",
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: "fb3",
    courseId: "1",
    courseName: "Introduction to Patient Safety",
    userId: "9999",
    userName: "Pete Mondi",
    rating: 3,
    comment: "Good introduction but felt a bit short on advanced topics.",
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: "fb4",
    courseId: "3",
    courseName: "Emergency Response Training",
    userId: "9999",
    userName: "Pete Mondi",
    rating: 5,
    comment: "Excellent! The scenario-based questions were very realistic.",
    submittedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
];

let feedbackList: CourseFeedback[] = [...seed];
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

  submit(entry: Omit<CourseFeedback, "id" | "submittedAt">) {
    const newEntry: CourseFeedback = {
      ...entry,
      id: `fb${Date.now()}`,
      submittedAt: new Date().toISOString(),
    };
    feedbackList = [newEntry, ...feedbackList];
    emit();
  },

  remove(id: string) {
    feedbackList = feedbackList.filter((f) => f.id !== id);
    emit();
  },
};
