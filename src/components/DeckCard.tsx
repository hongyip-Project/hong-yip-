import React from 'react';
import {
  Clock,
  Sparkles,
  BookOpen,
  MoreVertical,
  Layers,
  RotateCcw,
  Trash2,
  Edit3,
  CheckCircle2,
  FileText,
  Zap,
} from 'lucide-react';
import { Deck } from '../types/flashcard';
import { calculateDeckStats } from '../lib/spacedRepetition';

interface DeckCardProps {
  deck: Deck;
  onStudyClick: (deck: Deck, onlyDue: boolean) => void;
  onQuizClick?: (deck: Deck) => void;
  onManageClick: (deck: Deck) => void;
  onDeleteClick: (deckId: string) => void;
  onResetClick: (deckId: string) => void;
}

export const DeckCard: React.FC<DeckCardProps> = ({
  deck,
  onStudyClick,
  onQuizClick,
  onManageClick,
  onDeleteClick,
  onResetClick,
}) => {
  const stats = calculateDeckStats(deck.cards);
  const [showMenu, setShowMenu] = React.useState(false);

  return (
    <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all hover:shadow-xl hover:shadow-indigo-500/5 group relative">
      <div>
        {/* Top Tag & Options */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            {deck.topic || 'General Science'}
          </span>

          <div className="relative">
            <button
              onClick={() => setShowMenu((p) => !p)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-1 w-44 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl py-1.5 z-30 text-xs text-slate-300 animate-fade-in">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onManageClick(deck);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Manage / Add Cards</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onStudyClick(deck, false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Cram Mode (All Cards)</span>
                  </button>
                  {onQuizClick && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onQuizClick(deck);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2 text-cyan-300"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Rapid Quiz (4 Choices)</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onResetClick(deck.id);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2 text-amber-300"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Progress</span>
                  </button>
                  <div className="my-1 border-t border-slate-800" />
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDeleteClick(deck.id);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2 text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Deck</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="font-bold text-base text-white group-hover:text-indigo-200 transition-colors line-clamp-1 mb-1.5">
          {deck.title}
        </h3>

        {/* Source file info */}
        {deck.sourceFileName && (
          <p className="text-[11px] text-slate-400 flex items-center gap-1 mb-2.5 truncate">
            <FileText className="w-3 h-3 text-slate-500 flex-shrink-0" />
            <span className="truncate">{deck.sourceFileName}</span>
          </p>
        )}

        {/* Summary */}
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
          {deck.summary}
        </p>

        {/* Memory Retrievability Bar */}
        <div className="mb-4 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="text-slate-400 font-medium">Memory Retention:</span>
            <span
              className={`font-mono font-bold ${
                stats.averageRetention >= 80
                  ? 'text-emerald-400'
                  : stats.averageRetention >= 50
                  ? 'text-amber-400'
                  : 'text-slate-400'
              }`}
            >
              {stats.averageRetention > 0 ? `${stats.averageRetention}%` : 'New Deck'}
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${
                stats.averageRetention >= 80
                  ? 'bg-emerald-500'
                  : stats.averageRetention >= 50
                  ? 'bg-amber-500'
                  : 'bg-indigo-500'
              }`}
              style={{ width: `${Math.max(8, stats.averageRetention)}%` }}
            />
          </div>
        </div>

        {/* Spaced-Repetition State Badges */}
        <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] mb-4">
          <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
            <span className="text-slate-500 block">Due</span>
            <strong className={`font-bold ${stats.dueCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
              {stats.dueCount}
            </strong>
          </div>
          <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
            <span className="text-slate-500 block">Learning</span>
            <strong className="text-indigo-400 font-bold">{stats.learningCount}</strong>
          </div>
          <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
            <span className="text-slate-500 block">Review</span>
            <strong className="text-cyan-400 font-bold">{stats.reviewCount}</strong>
          </div>
          <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
            <span className="text-slate-500 block">Mastered</span>
            <strong className="text-emerald-400 font-bold">{stats.masteredCount}</strong>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2">
        <button
          onClick={() => onStudyClick(deck, true)}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md ${
            stats.dueCount > 0
              ? 'bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-indigo-500/20'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
          }`}
        >
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>{stats.dueCount > 0 ? `Study (${stats.dueCount} Due)` : 'Review All'}</span>
        </button>

        <button
          onClick={() => onManageClick(deck)}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          title="Inspect & Edit Cards"
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
