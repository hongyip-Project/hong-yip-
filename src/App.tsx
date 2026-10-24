/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  UploadCloud,
  Sparkles,
  Search,
  Plus,
  Zap,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { Deck } from './types/flashcard';
import {
  getStoredDecks,
  saveDeck,
  deleteDeck as deleteStoredDeck,
  resetDeckProgress,
} from './lib/storage';
import { isCardDue } from './lib/spacedRepetition';
import { Navbar } from './components/Navbar';
import { DeckCard } from './components/DeckCard';
import { DocumentUploadView } from './components/DocumentUploadView';
import { FlashcardStudySession } from './components/FlashcardStudySession';
import { DeckManagerModal } from './components/DeckManagerModal';
import { ImportExportModal } from './components/ImportExportModal';

export default function App() {
  const [decks, setDecks] = useState<Deck[]>(() => getStoredDecks());
  const [activeTab, setActiveTab] = useState<'decks' | 'upload'>('decks');

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

  // Quick start studying due cards
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
        {/* If Active Study Session is running, render study player */}
        {activeStudySession ? (
          <FlashcardStudySession
            deck={activeStudySession.deck}
            onlyDueCards={activeStudySession.onlyDue}
            initialMode={activeStudySession.initialMode}
            onUpdateDeck={handleUpdateDeck}
            onClose={() => setActiveStudySession(null)}
          />
        ) : activeTab === 'upload' ? (
          /* Generate from Document View */
          <DocumentUploadView
            onDeckCreated={handleDeckCreated}
            onStartStudyImmediately={handleStartStudyImmediately}
          />
        ) : (
          /* Simplified "My Decks" View */
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fade-in">
            {/* Header with Title and Quick Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                    My Decks
                  </h1>
                  {decks.length > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {decks.length} {decks.length === 1 ? 'deck' : 'decks'}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Upload your study materials, lecture slides, or notes to create active recall flashcards.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                {totalDueCount > 0 && (
                  <button
                    onClick={handleStudyDueToday}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Study Due Cards ({totalDueCount})</span>
                  </button>
                )}

                <button
                  onClick={() => setActiveTab('upload')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white flex items-center gap-2 shadow-md shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Generate from Document</span>
                </button>
              </div>
            </div>

            {/* If decks exist: show search & filters */}
            {decks.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search decks or topics..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>

                {topics.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs">
                    <button
                      onClick={() => setSelectedTopic('all')}
                      className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                        selectedTopic === 'all'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      All ({decks.length})
                    </button>
                    {topics.map((t) => (
                      <button
                        key={t}
                        onClick={() => setSelectedTopic(t)}
                        className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                          selectedTopic === t
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Decks Grid or Empty State */}
            {decks.length === 0 ? (
              /* Clean Empty State */
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-12 text-center max-w-xl mx-auto my-8 shadow-xl">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto mb-4">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">No flashcard decks yet</h2>
                <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
                  Upload your lecture slides, scanned handwritten notes (PDF, image), or paste study text.
                  The AI will automatically extract key terms and create an adaptive spaced-repetition deck.
                </p>
                <button
                  onClick={() => setActiveTab('upload')}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold text-xs shadow-lg shadow-indigo-500/20 inline-flex items-center gap-2 transition-all hover:scale-105"
                >
                  <Sparkles className="w-4 h-4 text-cyan-300" />
                  <span>Generate Your First Deck</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : filteredDecks.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
                No decks matched "{searchQuery}". Try a different search term.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
