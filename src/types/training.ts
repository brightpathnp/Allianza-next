export interface TrainingCountry {
  id: string;
  slug: string;
  name: string;
  flagEmoji: string;
  description: string;
  coverImageUrl?: string;
  publishedAt?: string;
  isPublished: boolean;
}

export interface TrainingLesson {
  id: string;
  slug: string;
  countryId: string;
  title: string;
  order: number;
  content: string; // rich text/markdown
  videoUrl?: string; // optional — uploaded video
  estimatedMinutes: number;
}

export interface TrainingQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface TrainingQuiz {
  id: string;
  countryId: string;
  lessonId?: string;
  questions: TrainingQuizQuestion[];
}

export interface UserModuleProgress {
  userId: string;
  countryId: string;
  completedLessonIds: string[];
  quizPassed: boolean;
  quizScore: number;
  quizAttempts: number;
  completedAt?: string;
  completedQuizIds?: string[];
  quizScores?: Record<string, number>;
}
