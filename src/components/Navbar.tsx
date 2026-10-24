import React from 'react';
import {
  Brain,
  UploadCloud,
  Layers,
  Sparkles,
  Clock,
  Download,
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'decks' | 'upload';
  setActiveTab: (tab: 'decks' | 'upload') => void;
  totalDueCount: number;
  onOpenImportExport: () => void;
  onNewDeckClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  totalDueCount,
  onOpenImportExport,
  onNewDeckClick,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-800 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={() => setActiveTab('decks')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white">
                Flashcard AI
              </span>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Flashcards
              </span>
            </div>
          </div>
        </div>

        {/* Simplified Navigation (My Decks & Generate from Document) */}
        <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('decks')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'decks'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>My Decks</span>
            {totalDueCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/30 text-amber-300 border border-amber-500/40">
                {totalDueCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'upload'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span>Generate from Document</span>
          </button>
        </nav>

        {/* Right Info & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {totalDueCount > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border bg-amber-500/10 border-amber-500/30 text-amber-300">
              <Clock className="w-3.5 h-3.5" />
              <span>
                <strong className="text-white">{totalDueCount}</strong> due today
              </span>
            </div>
          )}

          {/* Backup / Export */}
          <button
            onClick={onOpenImportExport}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Import or Export Decks"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Upload Button */}
          <button
            onClick={onNewDeckClick}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload Notes</span>
          </button>
        </div>
      </div>
    </header>
  );
};
