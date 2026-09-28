import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  Search,
  RotateCcw,
  Sparkles,
  BookOpen,
  HelpCircle,
  Clock,
  Layers,
  Download,
} from 'lucide-react';
import { Deck, Flashcard, CardDifficulty } from '../types/flashcard';
import { isCardDue, formatIntervalPreview } from '../lib/spacedRepetition';

interface DeckManagerModalProps {
  deck: Deck;
  onUpdateDeck: (updated: Deck) => void;
  onClose: () => void;
  onResetDeck: () => void;
}

export const DeckManagerModal: React.FC<DeckManagerModalProps> = ({
  deck,
  onUpdateDeck,
  onClose,
  onResetDeck,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState<string>('all');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  // Form state for creating / editing
  const [formFront, setFormFront] = useState('');
  const [formBack, setFormBack] = useState('');
  const [formFormula, setFormFormula] = useState('');
  const [formMnemonic, setFormMnemonic] = useState('');
  const [formCategory, setFormCategory] = useState('Core Concept');
  const [formDifficulty, setFormDifficulty] = useState<CardDifficulty>('medium');
  const [isAddingNew, setIsAddingNew] = useState(false);

  const startEdit = (card: Flashcard) => {
    setEditingCardId(card.id);
    setFormFront(card.front);
    setFormBack(card.back);
    setFormFormula(card.keyFormulaOrLaw || '');
    setFormMnemonic(card.mnemonicOrHint || '');
    setFormCategory(card.conceptCategory || 'General');
    setFormDifficulty(card.difficultyLevel);
    setIsAddingNew(false);
  };

  const startAddNew = () => {
    setIsAddingNew(true);
    setEditingCardId(null);
    setFormFront('');
    setFormBack('');
    setFormFormula('');
    setFormMnemonic('');
    setFormCategory('General Concept');
    setFormDifficulty('medium');
  };

  const cancelEdit = () => {
    setEditingCardId(null);
    setIsAddingNew(false);
  };

  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFront.trim() || !formBack.trim()) return;

    const now = Date.now();

    if (isAddingNew) {
      const newCard: Flashcard = {
        id: `card-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        deckId: deck.id,
        front: formFront.trim(),
        back: formBack.trim(),
        keyFormulaOrLaw: formFormula.trim() || undefined,
        mnemonicOrHint: formMnemonic.trim() || undefined,
        conceptCategory: formCategory.trim() || 'General',
        difficultyLevel: formDifficulty,
        state: 'new',
        reps: 0,
        lapses: 0,
        easeFactor: 2.5,
        interval: 1,
        intervalUnit: 'm',
        nextReviewDate: now,
        reviewHistory: [],
      };
      const updatedCards = [newCard, ...deck.cards];
      onUpdateDeck({ ...deck, cards: updatedCards, updatedAt: now });
      setIsAddingNew(false);
    } else if (editingCardId) {
      const updatedCards = deck.cards.map((c) => {
        if (c.id === editingCardId) {
          return {
            ...c,
            front: formFront.trim(),
            back: formBack.trim(),
            keyFormulaOrLaw: formFormula.trim() || undefined,
            mnemonicOrHint: formMnemonic.trim() || undefined,
            conceptCategory: formCategory.trim() || 'General',
            difficultyLevel: formDifficulty,
          };
        }
        return c;
      });
      onUpdateDeck({ ...deck, cards: updatedCards, updatedAt: now });
      setEditingCardId(null);
    }
  };

  const handleDeleteCard = (cardId: string) => {
    const updatedCards = deck.cards.filter((c) => c.id !== cardId);
    onUpdateDeck({ ...deck, cards: updatedCards, updatedAt: Date.now() });
  };

  const handleResetCard = (cardId: string) => {
    const now = Date.now();
    const updatedCards = deck.cards.map((c) => {
      if (c.id === cardId) {
        return {
          ...c,
          state: 'new' as const,
          reps: 0,
          lapses: 0,
          easeFactor: 2.5,
          interval: 1,
          intervalUnit: 'm' as const,
          nextReviewDate: now,
          lastReviewedDate: undefined,
          reviewHistory: [],
        };
      }
      return c;
    });
    onUpdateDeck({ ...deck, cards: updatedCards, updatedAt: now });
  };

  const exportCurrentDeckJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(deck, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${deck.title.replace(/\s+/g, '_')}_deck.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredCards = deck.cards.filter((c) => {
    const matchesSearch =
      c.front.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.back.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.conceptCategory && c.conceptCategory.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterState === 'all') return true;
    if (filterState === 'due') return isCardDue(c);
    return c.state === filterState;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">{deck.title}</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300">
                {deck.cards.length} Cards
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{deck.topic}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportCurrentDeckJson}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Export deck to JSON"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action & Filter Bar */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search flashcards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <select
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All States ({deck.cards.length})</option>
              <option value="due">Due for Review</option>
              <option value="new">New</option>
              <option value="learning">Learning</option>
              <option value="review">Review</option>
              <option value="mastered">Mastered</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onResetDeck}
              className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-medium flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Deck Stats</span>
            </button>

            <button
              onClick={startAddNew}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Flashcard</span>
            </button>
          </div>
        </div>

        {/* Card Editor / Creator Drawer */}
        {(isAddingNew || editingCardId) && (
          <form
            onSubmit={handleSaveCard}
            className="p-5 bg-slate-950 border-b border-indigo-500/30 animate-fade-in space-y-3"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-indigo-300">
                {isAddingNew ? 'Create New Flashcard' : 'Edit Flashcard'}
              </span>
              <button
                type="button"
                onClick={cancelEdit}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Card Front (Question / Prompt)
                </label>
                <textarea
                  rows={3}
                  value={formFront}
                  onChange={(e) => setFormFront(e.target.value)}
                  placeholder="e.g., What is the primary role of CaMKII in synaptic plasticity?"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Card Back (Answer / Explanation)
                </label>
                <textarea
                  rows={3}
                  value={formBack}
                  onChange={(e) => setFormBack(e.target.value)}
                  placeholder="e.g., Autophosphorylates and inserts AMPA receptors..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Category / Subtopic
                </label>
                <input
                  type="text"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Difficulty
                </label>
                <select
                  value={formDifficulty}
                  onChange={(e) => setFormDifficulty(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Formula / Equation (optional)
                </label>
                <input
                  type="text"
                  value={formFormula}
                  onChange={(e) => setFormFormula(e.target.value)}
                  placeholder="e.g., ΔG = ΔH - TΔS"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-cyan-300 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Mnemonic / Hint (optional)
                </label>
                <input
                  type="text"
                  value={formMnemonic}
                  onChange={(e) => setFormMnemonic(e.target.value)}
                  placeholder="Memory trick or acronym"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-amber-300"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={cancelEdit}
                className="px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Flashcard</span>
              </button>
            </div>
          </form>
        )}

        {/* Flashcards List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredCards.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No flashcards found matching your query.
            </div>
          ) : (
            filteredCards.map((card, idx) => {
              const due = isCardDue(card);
              return (
                <div
                  key={card.id}
                  className="bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 rounded-xl p-4 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-indigo-400">
                          #{idx + 1}
                        </span>
                        <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {card.conceptCategory}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                            card.state === 'mastered'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : card.state === 'review'
                              ? 'bg-cyan-500/20 text-cyan-300'
                              : card.state === 'learning'
                              ? 'bg-indigo-500/20 text-indigo-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {card.state}
                        </span>
                        {due && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                            Due Now
                          </span>
                        )}
                        <span className="text-[11px] font-mono text-slate-500">
                          Interval: {card.interval}{card.intervalUnit} • EF: {card.easeFactor}x
                        </span>
                      </div>

                      <h4 className="text-xs sm:text-sm font-semibold text-white mb-1">
                        Q: {card.front}
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        A: {card.back}
                      </p>

                      {card.keyFormulaOrLaw && (
                        <p className="mt-1.5 font-mono text-[11px] text-cyan-300 bg-slate-900/80 px-2 py-1 rounded border border-slate-800 inline-block">
                          {card.keyFormulaOrLaw}
                        </p>
                      )}

                      {card.mnemonicOrHint && (
                        <p className="mt-1 text-[11px] text-amber-400/90 flex items-center gap-1">
                          <span>💡</span>
                          <span>{card.mnemonicOrHint}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleResetCard(card.id)}
                        className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-900 rounded-lg transition-colors"
                        title="Reset learning stats"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => startEdit(card)}
                        className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-900 rounded-lg transition-colors"
                        title="Edit Card"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors"
                        title="Delete Card"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
