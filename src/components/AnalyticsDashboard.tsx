import React from 'react';
import {
  Brain,
  TrendingUp,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Zap,
  BarChart3,
  Award,
} from 'lucide-react';
import { Deck } from '../types/flashcard';
import { calculateDeckStats } from '../lib/spacedRepetition';

interface AnalyticsDashboardProps {
  decks: Deck[];
  onStudyDeck: (deck: Deck) => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  decks,
  onStudyDeck,
}) => {
  const allCards = decks.flatMap((d) => d.cards);
  const totalStats = calculateDeckStats(allCards);

  const dayLabels = ['Today', 'Tomorrow', '+2 Days', '+3 Days', '+4 Days', '+5 Days', '+6 Days'];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      {/* Title */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-2">
          <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
          <span>Cognitive Spaced-Repetition Analytics</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          Memory Retention & Spaced-Repetition Engine
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
          Visualizing Ebbinghaus memory stability, review forecasts, and active-recall intervals across your lecture decks.
        </p>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mb-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Due for Review</span>
          </span>
          <p className="text-3xl font-extrabold text-amber-400">{totalStats.dueCount}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Scheduled for optimal retention</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mb-2">
            <Brain className="w-4 h-4 text-cyan-400" />
            <span>Avg Retrievability</span>
          </span>
          <p className="text-3xl font-extrabold text-cyan-400">{totalStats.averageRetention}%</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Ebbinghaus cognitive stability</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mb-2">
            <Award className="w-4 h-4 text-emerald-400" />
            <span>Mastered Concepts</span>
          </span>
          <p className="text-3xl font-extrabold text-emerald-400">{totalStats.masteredCount}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Interval &gt; 14 days</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mb-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Total Flashcards</span>
          </span>
          <p className="text-3xl font-extrabold text-white">{totalStats.total}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Across {decks.length} active decks</span>
        </div>
      </div>

      {/* Main Grid: Forecast & Ebbinghaus Curve */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 7-Day Spaced Repetition Forecast */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>7-Day Spaced Review Forecast</span>
              </h3>
              <span className="text-[11px] text-slate-500">SM-2 Adaptive Intervals</span>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              Cards automatically distributed across upcoming days to avoid cramming and cement memories into long-term storage.
            </p>

            {/* Bar chart representation */}
            <div className="grid grid-cols-7 gap-2 items-end h-40 pt-6 px-2 border-b border-slate-800">
              {totalStats.forecast.map((count, i) => {
                const maxForecast = Math.max(1, ...totalStats.forecast);
                const heightPercent = Math.max(12, Math.round((count / maxForecast) * 100));
                const isToday = i === 0;

                return (
                  <div key={i} className="flex flex-col items-center gap-2 h-full justify-end group">
                    <span className="text-[11px] font-mono font-bold text-slate-300 opacity-90 group-hover:text-indigo-400">
                      {count}
                    </span>
                    <div
                      className={`w-full max-w-[28px] rounded-t-lg transition-all duration-500 ${
                        isToday
                          ? 'bg-gradient-to-t from-amber-500 to-amber-400'
                          : 'bg-gradient-to-t from-indigo-600 to-cyan-400 group-hover:from-indigo-500 group-hover:to-cyan-300'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-7 gap-2 text-center text-[10px] text-slate-400 pt-2 font-medium">
              {dayLabels.map((lbl, i) => (
                <span key={i} className={i === 0 ? 'text-amber-400 font-bold' : ''}>
                  {lbl}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Peak review load: {Math.max(...totalStats.forecast)} cards</span>
            <span className="text-emerald-400 font-medium">Equilibrated workload</span>
          </div>
        </div>

        {/* Ebbinghaus Forgetting Curve Comparison */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                <Brain className="w-4 h-4 text-emerald-400" />
                <span>The Forgetting Curve vs Spaced Repetition</span>
              </h3>
              <span className="text-[11px] text-slate-500">Cognitive Science</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Without repetition, human retention drops to ~20% within 48 hours. Each scheduled review flattens the decay curve:
            </p>

            {/* Visual SVG Curve Diagram */}
            <div className="relative w-full h-44 bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 400 140">
                {/* Grid lines */}
                <line x1="40" y1="20" x2="380" y2="20" stroke="#334155" strokeDasharray="3 3" opacity="0.4" />
                <line x1="40" y1="65" x2="380" y2="65" stroke="#334155" strokeDasharray="3 3" opacity="0.4" />
                <line x1="40" y1="110" x2="380" y2="110" stroke="#334155" strokeDasharray="3 3" opacity="0.4" />

                {/* Axes */}
                <line x1="40" y1="15" x2="40" y2="120" stroke="#64748b" strokeWidth="1.5" />
                <line x1="40" y1="120" x2="385" y2="120" stroke="#64748b" strokeWidth="1.5" />

                {/* Y-axis labels */}
                <text x="10" y="24" fill="#94a3b8" fontSize="9" fontFamily="monospace">100%</text>
                <text x="15" y="69" fill="#94a3b8" fontSize="9" fontFamily="monospace">50%</text>
                <text x="20" y="114" fill="#94a3b8" fontSize="9" fontFamily="monospace">0%</text>

                {/* Without Review Curve (Red dashed rapid decay) */}
                <path
                  d="M 40 20 Q 80 95, 200 115 T 380 118"
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                />

                {/* Spaced Review Curve 1 */}
                <path d="M 40 20 Q 60 70, 90 85" fill="none" stroke="#6366f1" strokeWidth="2" />
                {/* Review 1 spike */}
                <path d="M 90 85 L 90 22" fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="2 2" />
                <path d="M 90 22 Q 130 60, 180 68" fill="none" stroke="#6366f1" strokeWidth="2" />
                {/* Review 2 spike */}
                <path d="M 180 68 L 180 22" fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="2 2" />
                <path d="M 180 22 Q 250 45, 380 48" fill="none" stroke="#10b981" strokeWidth="2.5" />

                {/* Point markers */}
                <circle cx="90" cy="22" r="3.5" fill="#10b981" />
                <circle cx="180" cy="22" r="3.5" fill="#10b981" />
              </svg>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-3 text-[11px]">
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-3 h-0.5 bg-rose-500 border-b border-rose-500" />
                <span>Without Review (Decays to 15%)</span>
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-3 h-0.5 bg-emerald-500" />
                <span>With Spaced Repetition (Stabilized &gt;90%)</span>
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
            SynapseAI calculates intervals so you review precisely when retention reaches ~88%, maximizing neural plasticity.
          </div>
        </div>
      </div>

      {/* Deck Breakdown Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="font-bold text-sm sm:text-base text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-400" />
          <span>Deck Mastery Overview</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="pb-3 pl-2">Deck Title</th>
                <th className="pb-3">Cards</th>
                <th className="pb-3">Due Now</th>
                <th className="pb-3">Learning</th>
                <th className="pb-3">Review</th>
                <th className="pb-3">Mastered</th>
                <th className="pb-3">Retention</th>
                <th className="pb-3 text-right pr-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {decks.map((deck) => {
                const s = calculateDeckStats(deck.cards);
                return (
                  <tr key={deck.id} className="hover:bg-slate-950/40 transition-colors">
                    <td className="py-3 pl-2 font-semibold text-white max-w-[200px] truncate">
                      {deck.title}
                    </td>
                    <td className="py-3 font-mono text-slate-300">{s.total}</td>
                    <td className="py-3">
                      <span
                        className={`font-mono font-bold ${
                          s.dueCount > 0 ? 'text-amber-400' : 'text-slate-500'
                        }`}
                      >
                        {s.dueCount}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-indigo-400">{s.learningCount}</td>
                    <td className="py-3 font-mono text-cyan-400">{s.reviewCount}</td>
                    <td className="py-3 font-mono text-emerald-400">{s.masteredCount}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{s.averageRetention}%</span>
                        <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              s.averageRetention >= 80
                                ? 'bg-emerald-500'
                                : s.averageRetention >= 50
                                ? 'bg-amber-500'
                                : 'bg-indigo-500'
                            }`}
                            style={{ width: `${s.averageRetention}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-right pr-2">
                      <button
                        onClick={() => onStudyDeck(deck)}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                      >
                        Study
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
