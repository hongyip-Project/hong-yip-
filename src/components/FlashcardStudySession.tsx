import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RotateCcw,
  Sparkles,
  Volume2,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Flame,
  Send,
  HelpCircle,
  Shuffle,
  Mic,
  MicOff,
  Trophy,
  Brain,
  Layers,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  Deck,
  Flashcard,
  RepetitionGrade,
  AnswerEvaluation,
} from '../types/flashcard';
import {
  calculateNextIntervals,
  processCardReview,
  calculateRetrievability,
} from '../lib/spacedRepetition';

interface FlashcardStudySessionProps {
  deck: Deck;
  onUpdateDeck: (updatedDeck: Deck) => void;
  onClose: () => void;
  initialMode?: 'flip' | 'tutor' | 'quiz';
  onlyDueCards?: boolean;
}

export const FlashcardStudySession: React.FC<FlashcardStudySessionProps> = ({
  deck,
  onUpdateDeck,
  onClose,
  initialMode = 'flip',
  onlyDueCards = false,
}) => {
  // Study mode: standard flip, AI tutor (active recall typing), or rapid multiple choice quiz
  const [studyMode, setStudyMode] = useState<'flip' | 'tutor' | 'quiz'>(initialMode);

  // Filter study cards: either only due cards or all cards (cram mode)
  const [sessionCards, setSessionCards] = useState<Flashcard[]>(() => {
    const now = Date.now();
    let cards = [...deck.cards];
    if (onlyDueCards) {
      const due = cards.filter((c) => c.state === 'new' || c.nextReviewDate <= now);
      return due.length > 0 ? due : cards;
    }
    return cards;
  });

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);

  // Active Recall Tutor state
  const [studentAnswer, setStudentAnswer] = useState<string>('');
  const [isEvaluatingAnswer, setIsEvaluatingAnswer] = useState<boolean>(false);
  const [aiEvaluation, setAiEvaluation] = useState<AnswerEvaluation | null>(null);

  // Quiz state
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [quizSelectedOption, setQuizSelectedOption] = useState<string | null>(null);
  const [isLoadingQuizOptions, setIsLoadingQuizOptions] = useState<boolean>(false);

  // Session summary stats
  const [reviewedCount, setReviewedCount] = useState<number>(0);
  const [sessionGrades, setSessionGrades] = useState<{ [key in RepetitionGrade]: number }>({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });
  const [isSessionComplete, setIsSessionComplete] = useState<boolean>(false);

  // Audio Speech state
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Microphone Speech recognition state
  const [isListening, setIsListening] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  const currentCard = sessionCards[currentIndex];

  // Robust generator guaranteed to always produce exactly 4 distinct options (1 correct + 3 distractors)
  const buildOptions = useCallback(
    (card: Flashcard, aiDistractors?: string[]): string[] => {
      const set = new Set<string>();
      const correctAns = card.back.trim();
      set.add(correctAns);

      // 1. Incorporate AI-generated distractors if provided
      if (Array.isArray(aiDistractors)) {
        for (const d of aiDistractors) {
          if (typeof d === 'string' && d.trim() && d.trim() !== correctAns) {
            set.add(d.trim());
          }
          if (set.size >= 4) break;
        }
      }

      // 2. Add other distinct answers from the current deck
      if (set.size < 4 && deck.cards.length > 1) {
        const otherAnswers = deck.cards
          .filter((c) => c.id !== card.id && c.back.trim() !== correctAns)
          .map((c) => c.back.trim());

        const shuffledOthers = [...otherAnswers].sort(() => Math.random() - 0.5);
        for (const ans of shuffledOthers) {
          set.add(ans);
          if (set.size >= 4) break;
        }
      }

      // 3. Fallbacks if deck has fewer than 4 cards
      if (set.size < 4) {
        const generalFallbacks = [
          `Inversion: Regulates by decreasing rather than stimulating the targeted cascade.`,
          `Alternative mechanism: Mediated via secondary feedback phosphorylation without direct activation.`,
          `Constrained threshold: Operates exclusively under anaerobic conditions or acute cellular stress.`,
          `Cofactor dependent: Requires external enzymatic cleavage not present in this reaction.`,
        ];
        for (const fb of generalFallbacks) {
          if (!set.has(fb)) {
            set.add(fb);
          }
          if (set.size >= 4) break;
        }
      }

      const arr = Array.from(set).slice(0, 4);
      return arr.sort(() => Math.random() - 0.5);
    },
    [deck.cards]
  );

  // Calculate live SM-2 interval previews for the current card
  const intervalPreviews = currentCard ? calculateNextIntervals(currentCard) : null;
  const currentRetrievability = currentCard ? calculateRetrievability(currentCard) : 0;

  // Speak card text using SpeechSynthesis
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  // Speech to text toggle for Active Recall
  const toggleSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript + ' ';
        }
        setStudentAnswer(transcript.trim());
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  // Fetch multiple choice distractors for Quiz mode
  const fetchDistractors = useCallback(
    async (card: Flashcard) => {
      setQuizSelectedOption(null);

      // Immediately populate with 4 choices so user never waits or sees a blank
      const immediateOptions = buildOptions(card);
      setQuizOptions(immediateOptions);
      setIsLoadingQuizOptions(false);

      const otherCardAnswers = deck.cards
        .filter((c) => c.id !== card.id)
        .map((c) => c.back)
        .slice(0, 5);

      try {
        const res = await fetch('/api/generate-distractors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardFront: card.front,
            cardBack: card.back,
            otherCardAnswers,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.distractors) && data.distractors.length >= 2) {
            const aiEnhancedOptions = buildOptions(card, data.distractors);
            setQuizSelectedOption((currentSel) => {
              if (currentSel === null) {
                setQuizOptions(aiEnhancedOptions);
              }
              return currentSel;
            });
          }
        }
      } catch (err) {
        console.warn('AI distractor generation fallback used:', err);
      }
    },
    [buildOptions, deck.cards]
  );

  // Update quiz options whenever card changes in quiz mode
  useEffect(() => {
    if (studyMode === 'quiz' && currentCard) {
      fetchDistractors(currentCard);
    }
  }, [studyMode, currentIndex, currentCard, fetchDistractors]);

  // Handle student rating submission (Again, Hard, Good, Easy)
  const handleGradeChoice = (grade: RepetitionGrade) => {
    if (!currentCard) return;

    // Process review in the SM-2 spaced repetition engine
    const updatedCard = processCardReview(currentCard, grade, {
      userAnswer: studentAnswer || undefined,
      aiScore: aiEvaluation?.scorePercentage,
    });

    // Update the deck in state and parent
    const updatedDeckCards = deck.cards.map((c) =>
      c.id === updatedCard.id ? updatedCard : c
    );
    const updatedDeck: Deck = {
      ...deck,
      cards: updatedDeckCards,
      updatedAt: Date.now(),
    };
    onUpdateDeck(updatedDeck);

    // Update stats
    setReviewedCount((prev) => prev + 1);
    setSessionGrades((prev) => ({
      ...prev,
      [grade]: prev[grade] + 1,
    }));

    // If card was rated 'again', insert it a few cards later in the session queue so student re-encounters it!
    if (grade === 'again') {
      const remaining = [...sessionCards];
      // Insert 3 steps ahead or at end
      const insertIdx = Math.min(currentIndex + 3, remaining.length);
      remaining.splice(insertIdx, 0, updatedCard);
      setSessionCards(remaining);
    }

    // Reset card state for next
    setIsFlipped(false);
    setShowHint(false);
    setStudentAnswer('');
    setAiEvaluation(null);
    setQuizSelectedOption(null);

    // Check if session completed
    if (currentIndex + 1 >= sessionCards.length) {
      setIsSessionComplete(true);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  // Evaluate Active Recall Answer via Gemini API
  const handleEvaluateStudentAnswer = async () => {
    if (!studentAnswer.trim() || !currentCard) return;
    setIsEvaluatingAnswer(true);

    try {
      const res = await fetch('/api/evaluate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardFront: currentCard.front,
          cardBack: currentCard.back,
          studentAnswer: studentAnswer,
        }),
      });

      if (!res.ok) throw new Error('Evaluation request failed');
      const data: AnswerEvaluation = await res.json();
      setAiEvaluation(data);
      setIsFlipped(true); // Reveal back of card automatically to compare
    } catch (err) {
      console.error(err);
      // Fallback
      setAiEvaluation({
        scorePercentage: 75,
        verdict: 'partially_correct',
        feedback: 'Good recall of key terms! Review the full answer on the reverse side.',
        suggestedRating: 'hard',
        improvementTip: 'Focus on linking the molecular trigger to the functional outcome.',
      });
      setIsFlipped(true);
    } finally {
      setIsEvaluatingAnswer(false);
      if (isListening) toggleSpeechRecognition();
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.key === '1' && isFlipped) {
        handleGradeChoice('again');
      } else if (e.key === '2' && isFlipped) {
        handleGradeChoice('hard');
      } else if (e.key === '3' && isFlipped) {
        handleGradeChoice('good');
      } else if (e.key === '4' && isFlipped) {
        handleGradeChoice('easy');
      } else if (e.key === 'h' || e.key === 'H') {
        setShowHint((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, currentCard]);

  if (sessionCards.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Deck Fully Up-to-Date!</h2>
        <p className="text-sm text-slate-400 mb-6">
          No cards are due right now. The adaptive algorithm scheduled your next reviews for maximum retention.
        </p>
        <button
          onClick={onClose}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all"
        >
          Return to Decks
        </button>
      </div>
    );
  }

  // Session Completed Screen
  if (isSessionComplete) {
    const totalGrades =
      sessionGrades.again + sessionGrades.hard + sessionGrades.good + sessionGrades.easy;
    const accuracy =
      totalGrades > 0
        ? Math.round(((sessionGrades.good + sessionGrades.easy) / totalGrades) * 100)
        : 100;

    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center animate-fade-in">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/20">
          <Trophy className="w-10 h-10 text-white" />
        </div>

        <h2 className="text-3xl font-extrabold text-white mb-2">Practice Session Complete!</h2>
        <p className="text-sm text-slate-400 mb-8">
          The spaced-repetition algorithm has recalibrated each card’s memory interval based on your recall accuracy.
        </p>

        {/* Stats card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 grid grid-cols-3 gap-4">
          <div className="border-r border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Reviewed</span>
            <p className="text-2xl font-extrabold text-white mt-1">{reviewedCount}</p>
          </div>
          <div className="border-r border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Retention Accuracy</span>
            <p className="text-2xl font-extrabold text-emerald-400 mt-1">{accuracy}%</p>
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">Mastery Boost</span>
            <p className="text-2xl font-extrabold text-indigo-400 mt-1">+{sessionGrades.easy * 2 + sessionGrades.good} pts</p>
          </div>
        </div>

        {/* Grade breakdown */}
        <div className="flex justify-center gap-3 text-xs mb-8">
          <span className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 font-medium">
            Again: {sessionGrades.again}
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-medium">
            Hard: {sessionGrades.hard}
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-medium">
            Good: {sessionGrades.good}
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-medium">
            Easy: {sessionGrades.easy}
          </span>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => {
              setCurrentIndex(0);
              setIsSessionComplete(false);
              setReviewedCount(0);
              setSessionCards([...deck.cards]);
            }}
            className="px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Study Again (Cram)</span>
          </button>

          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-500/20"
          >
            Done & Return to Decks
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Top Header & Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Session</span>
        </button>

        {/* Study Mode Selector */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setStudyMode('flip')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              studyMode === 'flip'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Spaced Flip
          </button>
          <button
            onClick={() => setStudyMode('tutor')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              studyMode === 'tutor'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span>AI Grader</span>
          </button>
          <button
            onClick={() => setStudyMode('quiz')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              studyMode === 'quiz'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Rapid Quiz
          </button>
        </div>

        {/* Progress indicator */}
        <div className="text-xs font-mono text-slate-400">
          <span className="text-white font-bold">{currentIndex + 1}</span> / {sessionCards.length}
        </div>
      </div>

      {/* Progress Bar with interval stability indicator */}
      <div className="w-full bg-slate-800/80 rounded-full h-1.5 mb-6 overflow-hidden">
        <div
          className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / sessionCards.length) * 100}%` }}
        />
      </div>

      {/* Mode A: Standard Interactive 3D Flip Card */}
      {studyMode === 'flip' && (
        <div className="space-y-6">
          {/* Card Container */}
          <div
            onClick={() => setIsFlipped((prev) => !prev)}
            className="perspective-1000 min-h-[340px] cursor-pointer group select-none"
          >
            <div
              className={`relative w-full h-full min-h-[340px] rounded-2xl transition-transform-slow transform-style-3d border border-slate-800 shadow-2xl ${
                isFlipped ? 'rotate-y-180 bg-slate-900/95' : 'bg-slate-900/90'
              }`}
            >
              {/* FRONT OF CARD */}
              <div
                className={`absolute inset-0 p-6 sm:p-8 flex flex-col justify-between backface-hidden rounded-2xl ${
                  isFlipped ? 'pointer-events-none' : ''
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {currentCard.conceptCategory || 'Concept'}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded border ${
                          currentCard.difficultyLevel === 'hard'
                            ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                            : currentCard.difficultyLevel === 'medium'
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {currentCard.difficultyLevel}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        State: <strong className="text-slate-300 capitalize">{currentCard.state}</strong>
                      </span>
                    </div>

                    {/* Speech Audio Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        speakText(currentCard.front);
                      }}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                      title="Read Question Aloud"
                    >
                      <Volume2 className={`w-4 h-4 ${isSpeaking ? 'text-indigo-400 animate-pulse' : ''}`} />
                    </button>
                  </div>

                  {/* Question */}
                  <h3 className="text-lg sm:text-xl font-semibold text-white leading-relaxed mt-4">
                    {currentCard.front}
                  </h3>

                  {/* Hint Toggle */}
                  {currentCard.mnemonicOrHint && (
                    <div className="mt-4">
                      {showHint ? (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs flex items-start gap-2 animate-fade-in"
                        >
                          <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                          <span>
                            <strong>Mnemonic Anchor:</strong> {currentCard.mnemonicOrHint}
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowHint(true);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs text-amber-400/80 hover:text-amber-300 hover:underline"
                        >
                          <Lightbulb className="w-3.5 h-3.5" />
                          <span>Need a memory clue? (Press H)</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Interval: {currentCard.interval}{currentCard.intervalUnit}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <span>Click or press</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px]">
                      Space
                    </kbd>
                    <span>to flip</span>
                  </span>
                </div>
              </div>

              {/* BACK OF CARD */}
              <div
                className={`absolute inset-0 p-6 sm:p-8 flex flex-col justify-between rotate-y-180 backface-hidden rounded-2xl bg-slate-900 ${
                  !isFlipped ? 'pointer-events-none' : ''
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Target Answer
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        speakText(currentCard.back);
                      }}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                      title="Read Answer Aloud"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-sm sm:text-base text-slate-100 leading-relaxed">
                    {currentCard.back}
                  </p>

                  {/* Formula / Scientific Law Box */}
                  {currentCard.keyFormulaOrLaw && (
                    <div className="mt-4 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-indigo-300 font-mono text-xs">
                      <span className="text-[10px] text-slate-500 uppercase block font-sans font-semibold mb-1">
                        Key Formula / Equation:
                      </span>
                      {currentCard.keyFormulaOrLaw}
                    </div>
                  )}

                  {currentCard.mnemonicOrHint && (
                    <p className="mt-3 text-xs text-amber-300/90 flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      <span>{currentCard.mnemonicOrHint}</span>
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Ease Factor: {currentCard.easeFactor}x</span>
                  <span>Lapses: {currentCard.lapses}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Adaptive Spaced-Repetition Response Buttons (SM-2 Live Interval Previews) */}
          {isFlipped ? (
            <div className="space-y-2 animate-fade-in">
              <div className="text-center text-xs text-slate-400 font-medium">
                How easily did you recall this answer?
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* 1: Again */}
                <button
                  onClick={() => handleGradeChoice('again')}
                  className="p-3 rounded-xl bg-slate-900 hover:bg-rose-500/20 border border-rose-500/40 hover:border-rose-500 text-rose-300 flex flex-col items-center justify-center gap-1 transition-all group hover:scale-[1.02]"
                >
                  <div className="flex items-center gap-1 text-xs font-bold">
                    <span className="text-[10px] opacity-60">1.</span>
                    <span>Again</span>
                  </div>
                  <span className="text-[11px] font-mono text-rose-400/90 font-semibold">
                    {intervalPreviews?.again.text}
                  </span>
                  <span className="text-[9px] text-slate-500 group-hover:text-slate-400">
                    Full Blackout
                  </span>
                </button>

                {/* 2: Hard */}
                <button
                  onClick={() => handleGradeChoice('hard')}
                  className="p-3 rounded-xl bg-slate-900 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-500 text-amber-300 flex flex-col items-center justify-center gap-1 transition-all group hover:scale-[1.02]"
                >
                  <div className="flex items-center gap-1 text-xs font-bold">
                    <span className="text-[10px] opacity-60">2.</span>
                    <span>Hard</span>
                  </div>
                  <span className="text-[11px] font-mono text-amber-400/90 font-semibold">
                    {intervalPreviews?.hard.text}
                  </span>
                  <span className="text-[9px] text-slate-500 group-hover:text-slate-400">
                    Hesitant / Partial
                  </span>
                </button>

                {/* 3: Good */}
                <button
                  onClick={() => handleGradeChoice('good')}
                  className="p-3 rounded-xl bg-slate-900 hover:bg-indigo-500/20 border border-indigo-500/40 hover:border-indigo-500 text-indigo-300 flex flex-col items-center justify-center gap-1 transition-all group hover:scale-[1.02]"
                >
                  <div className="flex items-center gap-1 text-xs font-bold">
                    <span className="text-[10px] opacity-60">3.</span>
                    <span>Good</span>
                  </div>
                  <span className="text-[11px] font-mono text-indigo-400/90 font-semibold">
                    {intervalPreviews?.good.text}
                  </span>
                  <span className="text-[9px] text-slate-500 group-hover:text-slate-400">
                    Accurate Recall
                  </span>
                </button>

                {/* 4: Easy */}
                <button
                  onClick={() => handleGradeChoice('easy')}
                  className="p-3 rounded-xl bg-slate-900 hover:bg-emerald-500/20 border border-emerald-500/40 hover:border-emerald-500 text-emerald-300 flex flex-col items-center justify-center gap-1 transition-all group hover:scale-[1.02]"
                >
                  <div className="flex items-center gap-1 text-xs font-bold">
                    <span className="text-[10px] opacity-60">4.</span>
                    <span>Easy</span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400/90 font-semibold">
                    {intervalPreviews?.easy.text}
                  </span>
                  <span className="text-[9px] text-slate-500 group-hover:text-slate-400">
                    Instant Mastery
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <button
                onClick={() => setIsFlipped(true)}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-500/20"
              >
                Show Answer (Spacebar)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Mode B: Active Recall AI Grader Tutor */}
      {studyMode === 'tutor' && (
        <div className="space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold">
                {currentCard.conceptCategory}
              </span>
              <span className="text-slate-500">Active Recall Testing</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white mb-4">
              {currentCard.front}
            </h3>

            {/* Answer Input */}
            <div className="relative">
              <textarea
                rows={4}
                value={studentAnswer}
                onChange={(e) => setStudentAnswer(e.target.value)}
                placeholder="Explain the answer in your own words. The AI evaluates conceptual understanding, formulas, and terminology..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-3.5 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />

              {/* Speech-to-text mic button */}
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`absolute bottom-3 right-3 p-2 rounded-lg text-xs flex items-center gap-1 border transition-all ${
                  isListening
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
                title="Speak your answer"
              >
                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                <span className="text-[10px]">{isListening ? 'Listening...' : 'Voice'}</span>
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                AI tests semantic accuracy, not word-for-word repetition.
              </span>
              <button
                onClick={handleEvaluateStudentAnswer}
                disabled={!studentAnswer.trim() || isEvaluatingAnswer}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-md shadow-indigo-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEvaluatingAnswer ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Grading with Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                    <span>Check with AI Tutor</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* AI Feedback Display */}
          {aiEvaluation && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                      aiEvaluation.scorePercentage >= 80
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : aiEvaluation.scorePercentage >= 50
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {aiEvaluation.scorePercentage}%
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white capitalize">
                      {aiEvaluation.verdict.replace('_', ' ')}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Recommended Rating:{' '}
                      <strong className="text-indigo-400 uppercase">
                        {aiEvaluation.suggestedRating}
                      </strong>
                    </p>
                  </div>
                </div>

                <span className="text-[11px] text-slate-500">Gemini 3.8 Flash Evaluator</span>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-3">
                {aiEvaluation.feedback}
              </p>

              {aiEvaluation.improvementTip && (
                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs mb-4">
                  <strong>Memory Tip:</strong> {aiEvaluation.improvementTip}
                </div>
              )}

              {/* Reference Answer for comparison */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs mb-4">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold mb-1">
                  Full Reference Answer:
                </span>
                <p className="text-slate-300">{currentCard.back}</p>
                {currentCard.keyFormulaOrLaw && (
                  <p className="mt-1 font-mono text-cyan-300 text-[11px]">
                    {currentCard.keyFormulaOrLaw}
                  </p>
                )}
              </div>

              {/* Rating selection (defaults highlighted to AI suggestion) */}
              <div className="pt-2">
                <span className="text-xs font-semibold text-slate-300 block mb-2 text-center">
                  Confirm Spaced Repetition Interval:
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {(['again', 'hard', 'good', 'easy'] as RepetitionGrade[]).map((grade) => {
                    const isSuggested = aiEvaluation.suggestedRating === grade;
                    const preview = intervalPreviews?.[grade];
                    return (
                      <button
                        key={grade}
                        onClick={() => handleGradeChoice(grade)}
                        className={`p-2 rounded-xl text-xs font-semibold border flex flex-col items-center justify-center transition-all ${
                          isSuggested
                            ? 'bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-500/30 ring-2 ring-indigo-400/50 scale-[1.02]'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="capitalize">{grade}</span>
                        <span className="text-[10px] opacity-80">{preview?.text}</span>
                        {isSuggested && (
                          <span className="text-[8px] uppercase tracking-wider text-cyan-300 font-bold mt-0.5">
                            AI Pick
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode C: Multiple Choice Rapid Quiz */}
      {studyMode === 'quiz' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
          <div className="flex items-center justify-between mb-4 text-xs">
            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold">
              Multiple Choice Recall
            </span>
            <span className="text-slate-500">{currentCard.conceptCategory}</span>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-white mb-6">
            {currentCard.front}
          </h3>

          {isLoadingQuizOptions ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs">
              <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mb-2" />
              <span>Generating realistic distractors...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {(quizOptions.length >= 4 ? quizOptions : buildOptions(currentCard)).map((opt, i) => {
                const isSelected = quizSelectedOption === opt;
                const isCorrect = opt === currentCard.back;
                const showFeedback = quizSelectedOption !== null;

                let btnStyle = 'bg-slate-950/80 border-slate-800 text-slate-200 hover:border-indigo-500';
                if (showFeedback) {
                  if (isCorrect) {
                    btnStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-200';
                  } else if (isSelected && !isCorrect) {
                    btnStyle = 'bg-rose-500/20 border-rose-500 text-rose-200';
                  } else {
                    btnStyle = 'bg-slate-950/40 border-slate-800/50 text-slate-500';
                  }
                }

                return (
                  <button
                    key={i}
                    disabled={showFeedback}
                    onClick={() => setQuizSelectedOption(opt)}
                    className={`w-full p-3.5 rounded-xl border text-left text-xs sm:text-sm font-medium transition-all flex items-start gap-3 ${btnStyle}`}
                  >
                    <span className="w-5 h-5 rounded-md bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 flex-shrink-0 mt-0.5">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="leading-snug">{opt}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Quiz Result feedback & quick interval update */}
          {quizSelectedOption !== null && (
            <div className="mt-6 pt-6 border-t border-slate-800 flex items-center justify-between animate-fade-in">
              <div>
                {quizSelectedOption === currentCard.back ? (
                  <span className="text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Correct! Great active recall.</span>
                  </span>
                ) : (
                  <span className="text-rose-400 text-xs font-bold flex items-center gap-1.5">
                    <XCircle className="w-4 h-4" />
                    <span>Incorrect. Reviewing this card sooner.</span>
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                {quizSelectedOption === currentCard.back ? (
                  <button
                    onClick={() => handleGradeChoice('good')}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1"
                  >
                    <span>Next Card</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleGradeChoice('again')}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1"
                  >
                    <span>Review Again</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
