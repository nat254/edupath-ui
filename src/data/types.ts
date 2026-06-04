
export interface Course {
  id: string;
  title: string;
  category: string;
  objectives: string;
  duration: string;
  videoUrl: string;
  pdfUrl?: string;
  coverImage?: string;
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
  roleDistribution?: { role: string; count: number }[];
  categoryAudience?: { name: string; audienceType: string; enrollments: number; completions: number }[];
  designation?: { name: string; count: number }[];
}

export type AudienceType = "healthcare_provider" | "internal_staff" | "both";

export interface Category {
  id: string;
  name: string;
  audienceType: AudienceType;
  courseCount: number;
  createdAt: string;
}

export interface Enrollment {
  courseId: string;
  userId: string;
  progress: number;
  quizScore?: number | null;
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
  rating: number;
  comment: string;
  submittedAt: string;
}

export type UserRole = "admin" | "healthcare_provider" | "internal_staff";
export type Designation = "Tech Support" | "Call Center" | "Customer Delivery";

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  nationalId?: string;
  organization?: string;
  county?: string;
  designation?: Designation | string;
  role: UserRole;
  isActive: boolean;
  createdAt?: string;
  coursesCompleted: number;
  coursesInProgress: number;
}


export interface Testimonial {
  id: string;
  name: string;
  county?: string;
  role: string;
  rating: number;
  text: string;
  isApproved?: boolean;
  createdAt?: string;
}
