export const organizations = [
  { id: "1", name: "Kenyatta National Hospital - FID-12-324627" },
  { id: "2", name: "Moi Teaching & Referral Hospital - FID-15-891234" },
  { id: "3", name: "Nairobi Hospital - FID-18-456789" },
  { id: "4", name: "Aga Khan University Hospital - FID-20-112233" },
  { id: "5", name: "Coast General Hospital - FID-22-778899" },
];

export interface Course {
  id: string;
  title: string;
  category: string;
  objectives: string;
  duration: string;
  videoUrl: string;
  quiz: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

export const categories = [
  "Biometrics",
  "Lipa pole pole",
  "Provider Portal",
  "Assisted Registration",
];

export const courses: Course[] = [
  {
    id: "1",
    title: "Introduction to Patient Safety",
    category: "Patient Safety",
    objectives: "Understand core patient safety principles and reporting protocols.",
    duration: "2 hours",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    quiz: [
      { id: "q1", question: "What is the primary goal of patient safety?", options: ["Reduce costs", "Prevent harm to patients", "Speed up discharge", "Increase admissions"], correctIndex: 1 },
      { id: "q2", question: "Who is responsible for patient safety?", options: ["Only doctors", "Only nurses", "Everyone in the organization", "Hospital management only"], correctIndex: 2 },
      { id: "q3", question: "What should you do when you identify a safety concern?", options: ["Ignore it", "Report it immediately", "Wait until end of shift", "Tell a colleague only"], correctIndex: 1 },
    ],
  },
  {
    id: "2",
    title: "Infection Control Fundamentals",
    category: "Infection Control",
    objectives: "Learn proper hygiene protocols and infection prevention measures.",
    duration: "1.5 hours",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    quiz: [
      { id: "q1", question: "How long should you wash your hands?", options: ["5 seconds", "10 seconds", "20 seconds", "1 minute"], correctIndex: 2 },
      { id: "q2", question: "When should PPE be worn?", options: ["Never", "Only in surgery", "When there is risk of exposure", "Only during emergencies"], correctIndex: 2 },
    ],
  },
  {
    id: "3",
    title: "Emergency Response Training",
    category: "Emergency Response",
    objectives: "Prepare for emergency situations with proper response protocols.",
    duration: "3 hours",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    quiz: [
      { id: "q1", question: "What is the first step in an emergency?", options: ["Run", "Assess the situation", "Call for help immediately", "Document the event"], correctIndex: 1 },
    ],
  },
  {
    id: "4",
    title: "Leadership in Healthcare",
    category: "Leadership",
    objectives: "Develop leadership skills for healthcare settings.",
    duration: "2.5 hours",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    quiz: [
      { id: "q1", question: "What is a key trait of effective leaders?", options: ["Micromanagement", "Empathy", "Avoiding decisions", "Working alone"], correctIndex: 1 },
    ],
  },
  {
    id: "5",
    title: "Mental Health Awareness",
    category: "Mental Health",
    objectives: "Recognize signs of mental health issues and support strategies.",
    duration: "1 hour",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    quiz: [
      { id: "q1", question: "Which is a common sign of burnout?", options: ["Increased energy", "Emotional exhaustion", "Better focus", "More motivation"], correctIndex: 1 },
    ],
  },
];

export interface LearnerProgress {
  courseId: string;
  progress: number; // 0-100
  status: "not_started" | "in_progress" | "complete";
  quizScore?: number;
  feedback?: { rating: number; comment: string };
}

export const mockLearnerProgress: LearnerProgress[] = [
  { courseId: "1", progress: 100, status: "complete", quizScore: 90, feedback: { rating: 5, comment: "Great course!" } },
  { courseId: "2", progress: 60, status: "in_progress" },
  { courseId: "3", progress: 0, status: "not_started" },
  { courseId: "4", progress: 30, status: "in_progress" },
  { courseId: "5", progress: 0, status: "not_started" },
];

export const notifications = [
  { id: "1", message: "New course 'Patient Safety' has been assigned to you.", time: "2 hours ago", read: false },
  { id: "2", message: "You scored 90% on 'Infection Control' quiz.", time: "1 day ago", read: false },
  { id: "3", message: "Course 'Emergency Response' deadline is approaching.", time: "3 days ago", read: true },
];

export const mockLearners = [
  { id: "1", name: "Jane Wanjiku", nationalId: "1234567890", organization: "Kenyatta National Hospital", coursesCompleted: 3, coursesInProgress: 2 },
  { id: "2", name: "Peter Omondi", nationalId: "0987654321", organization: "Moi Teaching & Referral Hospital", coursesCompleted: 1, coursesInProgress: 4 },
  { id: "3", name: "Mary Achieng", nationalId: "1122334455", organization: "Nairobi Hospital", coursesCompleted: 5, coursesInProgress: 0 },
  { id: "4", name: "John Kamau", nationalId: "5566778899", organization: "Aga Khan University Hospital", coursesCompleted: 2, coursesInProgress: 1 },
];
