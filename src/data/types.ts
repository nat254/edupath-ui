
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
