export type CardState = 'new' | 'learning' | 'review' | 'mastered';
export type RepetitionGrade = 'again' | 'hard' | 'good' | 'easy';
export type CardDifficulty = 'easy' | 'medium' | 'hard';

export interface CardReviewLog {
  date: number;
  grade: RepetitionGrade;
  interval: number; // in days or minutes
  intervalUnit: 'm' | 'd';
  easeFactor: number;
  userAnswer?: string;
  aiScore?: number;
}

export interface Flashcard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  keyFormulaOrLaw?: string;
  mnemonicOrHint?: string;
  conceptCategory?: string;
  difficultyLevel: CardDifficulty;
  state: CardState;
  reps: number;
  lapses: number;
  easeFactor: number; // starts at 2.5, floor at 1.3
  interval: number; // current scheduled interval value
  intervalUnit: 'm' | 'd'; // 'm' for minutes, 'd' for days
  nextReviewDate: number; // ms timestamp
  lastReviewedDate?: number; // ms timestamp
  reviewHistory: CardReviewLog[];
}

export interface Deck {
  id: string;
  title: string;
  topic: string;
  summary: string;
  extractedKeyTerms: string[];
  createdAt: number;
  updatedAt: number;
  cards: Flashcard[];
  sourceFileName?: string;
  tags?: string[];
}

export interface AnswerEvaluation {
  scorePercentage: number;
  verdict: 'correct' | 'partially_correct' | 'incorrect';
  feedback: string;
  suggestedRating: RepetitionGrade;
  improvementTip: string;
}

export interface NextIntervalPreviews {
  again: { text: string; interval: number; unit: 'm' | 'd' };
  hard: { text: string; interval: number; unit: 'm' | 'd' };
  good: { text: string; interval: number; unit: 'm' | 'd' };
  easy: { text: string; interval: number; unit: 'm' | 'd' };
}
