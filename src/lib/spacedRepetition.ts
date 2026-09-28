import { Flashcard, RepetitionGrade, NextIntervalPreviews, CardReviewLog } from '../types/flashcard';

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/**
 * Checks if a flashcard is currently due for review.
 * New cards or cards whose nextReviewDate <= now are due.
 */
export function isCardDue(card: Flashcard, now: number = Date.now()): boolean {
  if (card.state === 'new') return true;
  return card.nextReviewDate <= now;
}

/**
 * Filters and sorts due cards:
 * 1. Lapsed / Learning cards first (most urgent)
 * 2. Overdue Review cards (by highest urgency)
 * 3. New cards
 */
export function getDueCards(cards: Flashcard[], now: number = Date.now()): Flashcard[] {
  const due = cards.filter((c) => isCardDue(c, now));
  return due.sort((a, b) => {
    // Learning/lapsed cards take top priority
    if (a.state === 'learning' && b.state !== 'learning') return -1;
    if (b.state === 'learning' && a.state !== 'learning') return 1;

    // Next, overdue cards by earliest scheduled time
    return a.nextReviewDate - b.nextReviewDate;
  });
}

/**
 * Formats an interval into a clean human-readable string.
 */
export function formatIntervalPreview(value: number, unit: 'm' | 'd'): string {
  if (unit === 'm') {
    if (value < 60) return `< ${value}m`;
    const hours = Math.round(value / 60);
    return `${hours}h`;
  }
  if (value === 1) return '1d';
  if (value < 30) return `${value}d`;
  const months = Math.round(value / 30);
  return `${months}mo`;
}

/**
 * Calculates live next intervals for all four rating buttons (Again, Hard, Good, Easy)
 * based on current card state and historical ease factor.
 */
export function calculateNextIntervals(card: Flashcard): NextIntervalPreviews {
  const ef = card.easeFactor || 2.5;

  if (card.state === 'new' || card.state === 'learning') {
    return {
      again: { text: '< 1m', interval: 1, unit: 'm' },
      hard: { text: '6m', interval: 6, unit: 'm' },
      good: { text: '10m', interval: 10, unit: 'm' },
      easy: { text: '4d', interval: 4, unit: 'd' },
    };
  }

  // Card in 'review' or 'mastered' state
  const currentDays = card.intervalUnit === 'd' ? card.interval : 1;

  // Hard: modest interval increase with lower ease factor penalty
  const hardDays = Math.max(1, Math.round(currentDays * 1.2));

  // Good: standard SM-2 interval expansion
  const goodDays = Math.max(hardDays + 1, Math.round(currentDays * ef));

  // Easy: bonus expansion + higher ease factor
  const easyDays = Math.max(goodDays + 2, Math.round(currentDays * ef * 1.35));

  return {
    again: { text: '10m', interval: 10, unit: 'm' },
    hard: { text: formatIntervalPreview(hardDays, 'd'), interval: hardDays, unit: 'd' },
    good: { text: formatIntervalPreview(goodDays, 'd'), interval: goodDays, unit: 'd' },
    easy: { text: formatIntervalPreview(easyDays, 'd'), interval: easyDays, unit: 'd' },
  };
}

/**
 * Processes a student review using SuperMemo SM-2 with modern cognitive spaced adjustments.
 */
export function processCardReview(
  card: Flashcard,
  grade: RepetitionGrade,
  meta?: { userAnswer?: string; aiScore?: number },
  now: number = Date.now()
): Flashcard {
  const previews = calculateNextIntervals(card);
  const choice = previews[grade];

  let nextEaseFactor = card.easeFactor || 2.5;
  let nextReps = card.reps || 0;
  let nextLapses = card.lapses || 0;
  let nextState = card.state;

  if (grade === 'again') {
    nextLapses += 1;
    nextReps = 0;
    nextState = 'learning';
    nextEaseFactor = Math.max(1.3, nextEaseFactor - 0.2);
  } else if (grade === 'hard') {
    nextEaseFactor = Math.max(1.3, nextEaseFactor - 0.15);
    if (nextState === 'new') nextState = 'learning';
  } else if (grade === 'good') {
    nextReps += 1;
    if (choice.unit === 'd') {
      nextState = nextReps >= 4 && choice.interval >= 14 ? 'mastered' : 'review';
    } else {
      nextState = 'learning';
    }
  } else if (grade === 'easy') {
    nextReps += 1;
    nextEaseFactor = Math.min(3.2, nextEaseFactor + 0.15);
    nextState = nextReps >= 2 ? 'mastered' : 'review';
  }

  // Calculate milliseconds to add
  const addedMs =
    choice.unit === 'm' ? choice.interval * MS_PER_MINUTE : choice.interval * MS_PER_DAY;
  const nextReviewDate = now + addedMs;

  const logEntry: CardReviewLog = {
    date: now,
    grade,
    interval: choice.interval,
    intervalUnit: choice.unit,
    easeFactor: Number(nextEaseFactor.toFixed(2)),
    userAnswer: meta?.userAnswer,
    aiScore: meta?.aiScore,
  };

  return {
    ...card,
    state: nextState,
    reps: nextReps,
    lapses: nextLapses,
    easeFactor: Number(nextEaseFactor.toFixed(2)),
    interval: choice.interval,
    intervalUnit: choice.unit,
    nextReviewDate,
    lastReviewedDate: now,
    reviewHistory: [...(card.reviewHistory || []), logEntry],
  };
}

/**
 * Calculates retention probability (Retrievability %) based on Ebbinghaus forgetting curve.
 * R = e^(-t / S), target retrievability ~90% when due.
 */
export function calculateRetrievability(card: Flashcard, now: number = Date.now()): number {
  if (card.state === 'new') return 0;
  if (!card.lastReviewedDate) return 50;

  const elapsedMs = Math.max(0, now - card.lastReviewedDate);
  const scheduledIntervalMs =
    card.intervalUnit === 'm'
      ? card.interval * MS_PER_MINUTE
      : card.interval * MS_PER_DAY;

  if (scheduledIntervalMs <= 0) return 90;

  // At elapsed = 0: R = 100%
  // At elapsed = scheduledInterval: R = ~88%
  // Overdue (elapsed = 2x): R drops to ~77%
  const decayFactor = 0.13; // ln(1 / 0.88)
  const ratio = elapsedMs / scheduledIntervalMs;
  const retrievability = Math.exp(-decayFactor * ratio) * 100;

  return Math.min(100, Math.max(15, Math.round(retrievability)));
}

/**
 * Aggregates deck spaced-repetition statistics and review forecast.
 */
export function calculateDeckStats(cards: Flashcard[], now: number = Date.now()) {
  const total = cards.length;
  if (total === 0) {
    return {
      total: 0,
      dueCount: 0,
      newCount: 0,
      learningCount: 0,
      reviewCount: 0,
      masteredCount: 0,
      averageRetention: 0,
      forecast: [0, 0, 0, 0, 0, 0, 0],
    };
  }

  let dueCount = 0;
  let newCount = 0;
  let learningCount = 0;
  let reviewCount = 0;
  let masteredCount = 0;
  let totalRetention = 0;
  let reviewedCardsCount = 0;

  cards.forEach((card) => {
    if (isCardDue(card, now)) dueCount++;
    if (card.state === 'new') newCount++;
    else if (card.state === 'learning') learningCount++;
    else if (card.state === 'review') reviewCount++;
    else if (card.state === 'mastered') masteredCount++;

    if (card.state !== 'new') {
      totalRetention += calculateRetrievability(card, now);
      reviewedCardsCount++;
    }
  });

  const averageRetention =
    reviewedCardsCount > 0 ? Math.round(totalRetention / reviewedCardsCount) : 0;

  // Forecast for next 7 days
  const forecast = [0, 0, 0, 0, 0, 0, 0];
  cards.forEach((card) => {
    if (card.state === 'new') return;
    const diffDays = Math.floor((card.nextReviewDate - now) / MS_PER_DAY);
    if (diffDays >= 0 && diffDays < 7) {
      forecast[diffDays]++;
    }
  });

  return {
    total,
    dueCount,
    newCount,
    learningCount,
    reviewCount,
    masteredCount,
    averageRetention,
    forecast,
  };
}
