/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  UploadCloud,
  Sparkles,
  Clock,
  CheckCircle2,
  Brain,
  Search,
  Plus,
  ArrowRight,
  TrendingUp,
  Zap,
  Filter,
} from 'lucide-react';
import { Deck, Flashcard } from './types/flashcard';
import {
  getStoredDecks,
  saveDeck,
  deleteDeck as deleteStoredDeck,
  resetDeckProgress,
  saveStoredDecks,
} from './lib/storage';
import { isCardDue, calculateDeckStats } from './lib/spacedRepetition';
import { Navbar } from './components/Navbar';
import { DeckCard } from './components/DeckCard';
import { DocumentUploadView } from './components/DocumentUploadView';
import { FlashcardStudySession } from './components/FlashcardStudySession';
import { DeckManagerModal } from './components/DeckManagerModal';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { AlgorithmGuideModal } from './components/AlgorithmGuideModal';
import { ImportExportModal } from './components/ImportExportModal';

export default function App() {
  const [decks, setDecks] = useState<Deck[]>(() => getStoredDecks());
  const [activeTab, setActiveTab] = useState<'decks' | 'upload' | 'analytics' | 'algorithm'>('decks');

  // Active study session
  const [activeStudySession, setActiveStudySession] = useState<{
    deck: Deck;
    onlyDue: boolean;
    initialMode?: 'flip' | 'tutor' | 'quiz';
  } | null>(null);

  // Deck manager modal
  const [inspectingDeck, setInspectingDeck] = useState<Deck | null>(null);

  // Import / Export modal
  const [showImportExport, setShowImportExport] = useState(false);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('all');

  // Total cards due today across all decks
  const totalDueCount = useMemo(() => {
    return decks.reduce((acc, d) => {
      const dueCards = d.cards.filter((c) => isCardDue(c));
      return acc + dueCards.length;
    }, 0);
  }, [decks]);

  // Overall aggregate stats
  const allCards = useMemo(() => decks.flatMap((d) => d.cards), [decks]);
  const overallStats = useMemo(() => calculateDeckStats(allCards), [allCards]);

  // Unique topics
  const topics = useMemo(() => {
    const set = new Set(decks.map((d) => d.topic).filter(Boolean));
    return Array.from(set);
  }, [decks]);

  // Filtered decks
  const filteredDecks = useMemo(() => {
    return decks.filter((deck) => {
      const matchesSearch =
        deck.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deck.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deck.summary.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTopic = selectedTopic === 'all' || deck.topic === selectedTopic;
      return matchesSearch && matchesTopic;
    });
  }, [decks, searchQuery, selectedTopic]);

  // Update a deck in state and storage
  const handleUpdateDeck = (updatedDeck: Deck) => {
    const updated = saveDeck(updatedDeck);
    setDecks(updated);
    if (inspectingDeck && inspectingDeck.id === updatedDeck.id) {
      setInspectingDeck(updatedDeck);
    }
  };

  // Delete a deck
  const handleDeleteDeck = (deckId: string) => {
    if (confirm('Are you sure you want to delete this deck? This action cannot be undone.')) {
      const updated = deleteStoredDeck(deckId);
      setDecks(updated);
      if (inspectingDeck && inspectingDeck.id === deckId) {
        setInspectingDeck(null);
      }
    }
  };

  // Reset progress for a deck
  const handleResetDeck = (deckId: string) => {
    if (confirm('Reset all spaced repetition intervals for this deck? Cards will revert to New state.')) {
      const updated = resetDeckProgress(deckId);
      setDecks(updated);
      const refreshed = updated.find((d) => d.id === deckId);
      if (refreshed && inspectingDeck && inspectingDeck.id === deckId) {
        setInspectingDeck(refreshed);
      }
    }
  };

  // Handle deck created from Document Upload
  const handleDeckCreated = (newDeck: Deck) => {
    const updated = saveDeck(newDeck);
    setDecks(updated);
  };

  // Start study immediately
  const handleStartStudyImmediately = (deck: Deck) => {
    setActiveStudySession({ deck, onlyDue: false, initialMode: 'flip' });
  };

  // Find a deck with due cards to study now
  const handleStudyDueToday = () => {
    const deckWithDue = decks.find((d) => d.cards.some((c) => isCardDue(c)));
    if (deckWithDue) {
      setActiveStudySession({ deck: deckWithDue, onlyDue: true, initialMode: 'flip' });
    } else if (decks.length > 0) {
      setActiveStudySession({ deck: decks[0], onlyDue: false, initialMode: 'flip' });
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col">
      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveStudySession(null);
          setActiveTab(tab);
        }}
        totalDueCount={totalDueCount}
        onOpenImportExport={() => setShowImportExport(true)}
        onNewDeckClick={() => {
          setActiveStudySession(null);
          setActiveTab('upload');
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {/* If Active Study Session is running, render study interface */}
        {activeStudySession ? (
          <FlashcardStudySession
            deck={activeStudySession.deck}
            onlyDueCards={activeStudySession.onlyDue}
            initialMode={activeStudySession.initialMode}
            onUpdateDeck={handleUpdateDeck}
            onClose={() => setActiveStudySession(null)}
          />
        ) : activeTab === 'upload' ? (
          /* Document Upload & Multimodal OCR View */
          <DocumentUploadView
            onDeckCreated={handleDeckCreated}
            onStartStudyImmediately={handleStartStudyImmediately}
          />
        ) : activeTab === 'analytics' ? (
          /* Memory Retention Analytics Dashboard */
          <AnalyticsDashboard
            decks={decks}
            onStudyDeck={(deck) =>
              setActiveStudySession({ deck, onlyDue: false, initialMode: 'flip' })
            }
          />
        ) : activeTab === 'algorithm' ? (
          /* SM-2 Spaced Repetition Mechanics Guide */
          <AlgorithmGuideModal onClose={() => setActiveTab('decks')} />
        ) : (
          /* Decks Home Dashboard */
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
            {/* Hero Quick Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-indigo-950/50 border border-indigo-500/25 p-6 sm:p-8 shadow-2xl">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3 border border-indigo-500/30">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                    <span>Adaptive Spaced Repetition (SuperMemo SM-2)</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                    Master Complex Lectures with Active Recall
                  </h1>
                  <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                    Upload documents or slides to extract key terms, formulas, and concepts into smart flashcards.
                    Our algorithm adjusts each card's review interval based on your personal recall retention.
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleStudyDueToday}
                      className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/25 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                    >
                      <Zap className="w-4 h-4 fill-current text-white" />
                      <span>{totalDueCount > 0 ? `Study ${totalDueCount} Due Cards` : 'Start Review Session'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setActiveTab('upload')}
                      className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 flex items-center gap-2 transition-colors"
                    >
                      <UploadCloud className="w-4 h-4 text-cyan-400" />
                      <span>Upload Notes & OCR</span>
                    </button>
                  </div>
                </div>

                {/* Quick Snapshot Metrics */}
                <div className="grid grid-cols-2 gap-3 min-w-[280px]">
                  <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block font-medium">Due for Review</span>
                    <strong className="text-2xl font-black text-amber-400">{totalDueCount}</strong>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Needs recall</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block font-medium">Avg Retrievability</span>
                    <strong className="text-2xl font-black text-cyan-400">
                      {overallStats.averageRetention > 0 ? `${overallStats.averageRetention}%` : 'New'}
                    </strong>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Ebbinghaus retention</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block font-medium">Mastered Cards</span>
                    <strong className="text-2xl font-black text-emerald-400">
                      {overallStats.masteredCount}
                    </strong>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Interval &gt; 14 days</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block font-medium">Total Flashcards</span>
                    <strong className="text-2xl font-black text-white">{overallStats.total}</strong>
                    <span className="text-[10px] text-slate-500 block mt-0.5">In {decks.length} decks</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="Search decks, topics, or terms..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              {/* Topic Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs">
                <button
                  onClick={() => setSelectedTopic('all')}
                  className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                    selectedTopic === 'all'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  All Topics ({decks.length})
                </button>
                {topics.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedTopic(t)}
                    className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                      selectedTopic === t
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Decks Grid */}
            {filteredDecks.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
                <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white mb-1">No decks found</h3>
                <p className="text-xs text-slate-400 mb-6 max-w-sm mx-auto">
                  {searchQuery
                    ? 'No decks match your search criteria. Try a different query.'
                    : 'Upload a lecture PDF, slides, or scanned notes to create your first deck.'}
                </p>
                <button
                  onClick={() => setActiveTab('upload')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all"
                >
                  Upload Lecture Notes
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDecks.map((deck) => (
                  <DeckCard
                    key={deck.id}
                    deck={deck}
                    onStudyClick={(d, onlyDue) =>
                      setActiveStudySession({ deck: d, onlyDue, initialMode: 'flip' })
                    }
                    onQuizClick={(d) =>
                      setActiveStudySession({ deck: d, onlyDue: false, initialMode: 'quiz' })
                    }
                    onManageClick={(d) => setInspectingDeck(d)}
                    onDeleteClick={handleDeleteDeck}
                    onResetClick={handleResetDeck}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Deck Inspection & Edit Modal */}
      {inspectingDeck && (
        <DeckManagerModal
          deck={inspectingDeck}
          onUpdateDeck={handleUpdateDeck}
          onResetDeck={() => handleResetDeck(inspectingDeck.id)}
          onClose={() => setInspectingDeck(null)}
        />
      )}

      {/* Import / Export Modal */}
      {showImportExport && (
        <ImportExportModal
          onClose={() => setShowImportExport(false)}
          onRefreshDecks={(updated) => setDecks(updated)}
        />
      )}
    </div>
  );
}
