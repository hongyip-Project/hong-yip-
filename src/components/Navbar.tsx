import React from 'react';
import {
  Brain,
  UploadCloud,
  Layers,
  BarChart3,
  HelpCircle,
  Download,
  Flame,
  Clock,
  Sparkles,
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'decks' | 'upload' | 'analytics' | 'algorithm';
  setActiveTab: (tab: 'decks' | 'upload' | 'analytics' | 'algorithm') => void;
  totalDueCount: number;
  streakDays?: number;
  onOpenImportExport: () => void;
  onNewDeckClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  totalDueCount,
  streakDays = 5,
  onOpenImportExport,
  onNewDeckClick,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0f172a]/90 backdrop-blur-md border-b border-slate-800/80 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={() => setActiveTab('decks')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                SynapseAI
              </span>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Spaced Repetition
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              AI Document OCR & Adaptive Memory
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('decks')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'decks'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>My Decks</span>
            {totalDueCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/30 text-amber-300 border border-amber-500/40">
                {totalDueCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'upload'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span>Generate from Document</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'analytics'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Memory Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('algorithm')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'algorithm'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>How SM-2 Works</span>
          </button>
        </nav>

        {/* Right Info & Actions */}
        <div className="flex items-center gap-3">
          {/* Streak */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-medium"
            title={`${streakDays}-day active learning streak`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="font-semibold">{streakDays}d</span>
          </div>

          {/* Cards Due Status */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
              totalDueCount > 0
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>
              {totalDueCount > 0 ? (
                <>
                  <strong className="text-white">{totalDueCount}</strong> due
                </>
              ) : (
                'All caught up'
              )}
            </span>
          </div>

          {/* Import / Export JSON */}
          <button
            onClick={onOpenImportExport}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Import or Export Decks"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Upload CTA */}
          <button
            onClick={onNewDeckClick}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <UploadCloud className="w-4 h-4" />
            <span className="hidden sm:inline">Upload Notes</span>
          </button>
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-800/80 bg-slate-900/90 py-2 px-3 text-xs">
        <button
          onClick={() => setActiveTab('decks')}
          className={`flex flex-col items-center gap-1 ${
            activeTab === 'decks' ? 'text-indigo-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Decks ({totalDueCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('upload')}
          className={`flex flex-col items-center gap-1 ${
            activeTab === 'upload' ? 'text-indigo-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Upload</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex flex-col items-center gap-1 ${
            activeTab === 'analytics' ? 'text-indigo-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab('algorithm')}
          className={`flex flex-col items-center gap-1 ${
            activeTab === 'algorithm' ? 'text-indigo-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Algorithm</span>
        </button>
      </div>
    </header>
  );
};
