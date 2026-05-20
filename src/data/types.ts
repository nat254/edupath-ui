
export interface Course {
  id: string;
  title: string;
  category: string;
  objectives: string;
  duration: string;
  videoUrl: string;
  pdfUrl?: string;
  coverImage?:string;
  quiz: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  correctIndexes?: number[];
  isMultiple?: boolean;
}

export interface AnalyticsData {
  trend: { month: string; date: string; enrollments: number; completions: number }[];
  daily: { day: string; date: string; enrollments: number }[];
  county: { name: string; count: number }[];
  courseCompletion: { id: string; name: string; fullName: string; rate: number }[];
  topCourses: { id: string; name: string; fullName: string; score: number }[];
  orgProgress: { name: string; completed: number; inProgress: number; total: number; rate: number }[];
  status: { completed: number; inProgress: number; notStarted: number };
}

export interface Category {
  id: string;
  name: string;
  createdAt: string;
}

export interface Enrollment {
  courseId: string;
  userId: string;        // nationalId from AuthContext
  progress: number;      // 0–100
  status: "in_progress" | "complete";
  startedAt: string;
  completedAt?: string | null;
}

export interface CourseFeedback {
  id: string;
  courseId: string;
  courseName: string;
  userId: string;
  userName: string;
  rating: number;        // 1-5
  comment: string;
  submittedAt: string;   // date string
}

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

export interface Testimonial {
  id: string;
  name: string;
  county?: string;       // joined from users table
  role: string;
  rating: number;
  text: string;
  isApproved?: boolean;
  createdAt?: string;
}
