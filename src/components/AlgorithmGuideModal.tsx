import React from 'react';
import {
  Brain,
  Zap,
  TrendingUp,
  Clock,
  CheckCircle2,
  HelpCircle,
  X,
  Code,
  Sparkles,
} from 'lucide-react';

interface AlgorithmGuideModalProps {
  onClose: () => void;
}

export const AlgorithmGuideModal: React.FC<AlgorithmGuideModalProps> = ({ onClose }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fade-in text-slate-200">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-2">
            <Brain className="w-3.5 h-3.5 text-cyan-400" />
            <span>Algorithm Mechanics & Cognitive Science</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Adaptive Spaced Repetition (SM-2 & FSRS)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            How SynapseAI dynamically tracks student performance and schedules card intervals for near-permanent retention.
          </p>
        </div>
      </div>

      {/* Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Core Idea: Ebbinghaus & Synaptic Consolidation */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4 border border-indigo-500/30">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white mb-2">
            The Science of Memory Decay
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            In 1885, Hermann Ebbinghaus discovered that human memories decay exponentially over time without active reinforcement. Within 48 hours of reading a lecture slide, upwards of 75% of detailed information is forgotten.
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Spaced repetition interrupts this forgetting curve at the exact threshold where recall requires moderate cognitive effort. This effort triggers Long-Term Potentiation (LTP) in the hippocampus, stabilizing synaptic connections.
          </p>
        </div>

        {/* Dynamic Interval Calculation */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4 border border-cyan-500/30">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white mb-2">
            Dynamic Interval Scaling
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            Every card possesses an independent <strong>Ease Factor (EF)</strong> (starting at 2.5) and a <strong>Repetition Counter (n)</strong>.
          </p>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-cyan-300 space-y-1 mb-3">
            <div>Step 1: Repetition 1 ➔ Interval = 1 Day</div>
            <div>Step 2: Repetition 2 ➔ Interval = 6 Days</div>
            <div>Step 3: Repetition n ➔ Interval(n) = Interval(n-1) × EF</div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            If you struggle with a card, its Ease Factor decreases, making it reappear sooner. If you master it with ease, the Ease Factor increases, multiplying the interval so you don’t waste time over-reviewing familiar facts.
          </p>
        </div>
      </div>

      {/* Button Ratings Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-base font-bold text-white mb-4">
          Response Grades & How the Algorithm Reacts
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="bg-slate-950 p-4 rounded-xl border border-rose-500/30">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 mb-2 inline-block">
              [1] Again
            </span>
            <h4 className="text-xs font-bold text-white mb-1">Blackout / Forgot</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Resets consecutive repetitions to 0. Marks card as "Learning" and schedules it for immediate re-test in 1 minute.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/30">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 mb-2 inline-block">
              [2] Hard
            </span>
            <h4 className="text-xs font-bold text-white mb-1">Hesitant Recall</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Card recalled with effort. Ease Factor penalized by -0.15. Interval increases conservatively by only 1.2×.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-indigo-500/30">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 mb-2 inline-block">
              [3] Good
            </span>
            <h4 className="text-xs font-bold text-white mb-1">Standard Correct</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Standard successful recall. Interval multiplied by the full Ease Factor (e.g. 2.5× growth).
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 mb-2 inline-block">
              [4] Easy
            </span>
            <h4 className="text-xs font-bold text-white mb-1">Effortless Mastery</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Instant recall. Ease Factor boosted by +0.15. Receives bonus multiplier (1.35×), jumping forward in time.
            </p>
          </div>
        </div>
      </div>

      {/* Multimodal OCR & LLM Extraction Note */}
      <div className="bg-gradient-to-r from-indigo-950/60 to-slate-900 border border-indigo-500/30 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <h3 className="text-base font-bold text-white">
            Multimodal OCR & Knowledge Parsing Pipeline
          </h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          When you upload lecture slides or scanned notes, Gemini 3.8 Flash performs Optical Character Recognition on diagrams, handwritten annotations, and equations. It transforms unstructured lecture materials into atomic, unambiguous Question-Answer pairs optimized for active recall, complete with formulas and memory mnemonics.
        </p>
      </div>
    </div>
  );
};
