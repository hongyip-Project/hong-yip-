import { Deck, Flashcard } from '../types/flashcard';
import { INITIAL_SAMPLE_DECKS } from '../data/sampleDecks';

const STORAGE_KEY = 'synapse_flashcard_decks_v1';

export function getStoredDecks(): Deck[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveStoredDecks(INITIAL_SAMPLE_DECKS);
      return INITIAL_SAMPLE_DECKS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_SAMPLE_DECKS;
  } catch (err) {
    console.error('Failed to load decks from localStorage:', err);
    return INITIAL_SAMPLE_DECKS;
  }
}

export function saveStoredDecks(decks: Deck[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
  } catch (err) {
    console.error('Failed to save decks to localStorage:', err);
  }
}

export function saveDeck(deck: Deck): Deck[] {
  const current = getStoredDecks();
  const existingIdx = current.findIndex((d) => d.id === deck.id);
  let updated: Deck[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = { ...deck, updatedAt: Date.now() };
  } else {
    updated = [deck, ...current];
  }
  saveStoredDecks(updated);
  return updated;
}

export function deleteDeck(deckId: string): Deck[] {
  const current = getStoredDecks();
  const updated = current.filter((d) => d.id !== deckId);
  saveStoredDecks(updated);
  return updated;
}

export function updateCardInDeck(deckId: string, updatedCard: Flashcard): Deck[] {
  const current = getStoredDecks();
  const deckIdx = current.findIndex((d) => d.id === deckId);
  if (deckIdx === -1) return current;

  const deck = current[deckIdx];
  const cardIdx = deck.cards.findIndex((c) => c.id === updatedCard.id);
  let newCards = [...deck.cards];
  if (cardIdx >= 0) {
    newCards[cardIdx] = updatedCard;
  } else {
    newCards.push(updatedCard);
  }

  const updatedDeck: Deck = {
    ...deck,
    cards: newCards,
    updatedAt: Date.now(),
  };

  const updatedDecks = [...current];
  updatedDecks[deckIdx] = updatedDeck;
  saveStoredDecks(updatedDecks);
  return updatedDecks;
}

export function resetDeckProgress(deckId: string): Deck[] {
  const current = getStoredDecks();
  const deckIdx = current.findIndex((d) => d.id === deckId);
  if (deckIdx === -1) return current;

  const now = Date.now();
  const deck = current[deckIdx];
  const resetCards: Flashcard[] = deck.cards.map((c) => ({
    ...c,
    state: 'new',
    reps: 0,
    lapses: 0,
    easeFactor: 2.5,
    interval: 1,
    intervalUnit: 'm',
    nextReviewDate: now,
    lastReviewedDate: undefined,
    reviewHistory: [],
  }));

  const updatedDeck = { ...deck, cards: resetCards, updatedAt: now };
  const updatedDecks = [...current];
  updatedDecks[deckIdx] = updatedDeck;
  saveStoredDecks(updatedDecks);
  return updatedDecks;
}

export function exportDecksToJson(): string {
  const decks = getStoredDecks();
  return JSON.stringify(decks, null, 2);
}

export function importDecksFromJson(jsonStr: string): { success: boolean; count: number; error?: string } {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) {
      return { success: false, count: 0, error: 'JSON root must be an array of decks.' };
    }
    // Simple schema validation
    const validDecks: Deck[] = parsed.filter(
      (d) => d && typeof d.id === 'string' && typeof d.title === 'string' && Array.isArray(d.cards)
    );
    if (validDecks.length === 0) {
      return { success: false, count: 0, error: 'No valid decks found in provided JSON.' };
    }

    const current = getStoredDecks();
    const existingIds = new Set(current.map((d) => d.id));
    const merged = [...current];

    validDecks.forEach((d) => {
      if (existingIds.has(d.id)) {
        const idx = merged.findIndex((m) => m.id === d.id);
        merged[idx] = d;
      } else {
        merged.unshift(d);
      }
    });

    saveStoredDecks(merged);
    return { success: true, count: validDecks.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message || 'Invalid JSON format.' };
  }
}
