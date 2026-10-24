import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  File,
  X,
  BookOpen,
  Zap,
  Sliders,
  Loader2,
  ArrowRight,
  Clock,
  Gauge,
} from 'lucide-react';
import { Deck, Flashcard } from '../types/flashcard';

interface DocumentUploadViewProps {
  onDeckCreated: (newDeck: Deck) => void;
  onStartStudyImmediately?: (deck: Deck) => void;
}

// Helper to scale down large camera photos / scans to max 1600px for instant OCR upload
async function optimizeImageForOcr(file: File): Promise<{ base64: string; mimeType: string }> {
  if (!file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve({ base64: reader.result as string, mimeType: file.type || 'application/pdf' });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1000;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.75);
          resolve({ base64: compressed, mimeType: 'image/jpeg' });
          return;
        }
        resolve({ base64: e.target?.result as string, mimeType: file.type });
      };
      img.onerror = () => {
        resolve({ base64: e.target?.result as string, mimeType: file.type });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export const DocumentUploadView: React.FC<DocumentUploadViewProps> = ({
  onDeckCreated,
  onStartStudyImmediately,
}) => {
  const [activeInputType, setActiveInputType] = useState<'file' | 'text'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileMimeType, setFileMimeType] = useState<string>('application/pdf');
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState<string>('');

  // Generation configurations (Difficulty: Easy, Medium, Hard | Cambridge IGCSE & Checkpoint | cards 1-20)
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [cardCount, setCardCount] = useState<number>(8);
  const targetAudience = 'Cambridge IGCSE & Checkpoint';

  // Fast loading & elapsed time ticker
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Result state
  const [createdDeck, setCreatedDeck] = useState<Deck | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Live timer ticker during generation
  useEffect(() => {
    let interval: any;
    if (isProcessing) {
      setElapsedSeconds(0);
      interval = setInterval(() => {
        setElapsedSeconds((prev) => +(prev + 0.5).toFixed(1));
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  const handleFileChange = async (file: File) => {
    setErrorMessage(null);
    setSelectedFile(file);

    try {
      const optimized = await optimizeImageForOcr(file);
      setFileBase64(optimized.base64);
      setFileMimeType(optimized.mimeType);

      if (file.type.startsWith('image/')) {
        setFilePreviewUrl(optimized.base64);
      } else {
        setFilePreviewUrl(null);
      }
    } catch (err) {
      console.error('File optimization error:', err);
      // Fallback direct read
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setFileBase64(result);
        setFileMimeType(file.type || 'application/pdf');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsProcessing(false);
    setErrorMessage('Generation cancelled by user.');
  };

  const handleGenerate = async () => {
    setErrorMessage(null);

    if (activeInputType === 'file' && !fileBase64 && !selectedFile) {
      setErrorMessage('Please select or drop a lecture document, scanned note, or image first.');
      return;
    }
    if (activeInputType === 'text' && !pasteText.trim()) {
      setErrorMessage('Please paste or type your lecture notes or choose a sample.');
      return;
    }

    setIsProcessing(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const payload: any = {
        difficulty,
        deckFocus: difficulty,
        cardCount,
        targetAudience,
      };

      if (activeInputType === 'file' && fileBase64 && selectedFile) {
        payload.fileData = fileBase64;
        payload.mimeType = fileMimeType;
      } else {
        payload.textContent = pasteText;
      }

      const res = await fetch('/api/analyze-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${res.status}`);
      }

      const data = await res.json();
      const now = Date.now();
      const newDeckId = `deck-${now}-${Math.random().toString(36).substring(2, 7)}`;

      const flashcards: Flashcard[] = (data.flashcards || []).map((card: any, idx: number) => ({
        id: `card-${newDeckId}-${idx + 1}`,
        deckId: newDeckId,
        front: card.front || 'Question',
        back: card.back || 'Answer',
        keyFormulaOrLaw: card.keyFormulaOrLaw || undefined,
        mnemonicOrHint: card.mnemonicOrHint || undefined,
        conceptCategory: card.conceptCategory || 'General',
        difficultyLevel: (['easy', 'medium', 'hard'].includes(card.difficultyLevel)
          ? card.difficultyLevel
          : 'medium') as any,
        state: 'new',
        reps: 0,
        lapses: 0,
        easeFactor: 2.5,
        interval: 1,
        intervalUnit: 'm',
        nextReviewDate: now,
        reviewHistory: [],
      }));

      const newDeck: Deck = {
        id: newDeckId,
        title: data.title || 'Untitled Lecture Deck',
        topic: data.topic || 'General Science',
        summary: data.summary || 'Extracted lecture notes and concepts.',
        extractedKeyTerms: data.extractedKeyTerms || [],
        createdAt: now,
        updatedAt: now,
        cards: flashcards,
        sourceFileName: selectedFile?.name || 'Lecture Notes Text',
        tags: [data.topic || 'Lecture', 'AI Generated'],
      };

      setCreatedDeck(newDeck);
      onDeckCreated(newDeck);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return;
      }
      console.error('Document analysis error:', err);
      setErrorMessage(
        err.message ||
          'Failed to process document. Try selecting 5-8 cards or pasting the main text for fastest extraction.'
      );
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Title Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-3">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          <span>High-Speed Document OCR & Flashcard Generator</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Convert Lecture Documents into Smart Flashcards
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
          Upload PDF past papers, lecture slides, scanned notes, or paste syllabus excerpts.
          Calibrated strictly to Cambridge IGCSE & Checkpoint standards.
        </p>
      </div>

      {/* Main Upload Box */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        {/* Input Switcher Tabs */}
        <div className="flex items-center gap-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800/80 w-fit mx-auto mb-6">
          <button
            onClick={() => setActiveInputType('file')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeInputType === 'file'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Document / Notes (PDF, Image, Slides)</span>
          </button>
          <button
            onClick={() => setActiveInputType('text')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeInputType === 'text'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Paste Lecture Text / Excerpt</span>
          </button>
        </div>

        {/* Tab 1: File Dropzone */}
        {activeInputType === 'file' ? (
          <div>
            {!selectedFile ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-indigo-500/70 bg-slate-950/50 hover:bg-slate-950/80 rounded-xl p-8 text-center cursor-pointer transition-all group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp,text/plain"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                />
                <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform mb-4">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <h3 className="text-base font-semibold text-white">
                  Drop your lecture document here, or <span className="text-indigo-400 underline underline-offset-2">browse</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Supports PDF documents, scanned notebook photos (PNG, JPG), slides, and text files (auto-compressed for fast processing)
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2 text-[11px] text-slate-500">
                  <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700">PDF Slides</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700">Handwritten Scans</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700">Textbook Chapters</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700">Equations & Figures</span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {filePreviewUrl ? (
                    <img
                      src={filePreviewUrl}
                      alt="Uploaded note"
                      className="w-14 h-14 object-cover rounded-lg border border-slate-700"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                      <File className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-white truncate max-w-xs sm:max-w-md">
                        {selectedFile.name}
                      </p>
                      <span className="px-2 py-0.2 rounded text-[10px] font-medium bg-indigo-500/20 text-indigo-300">
                        {selectedFile.type || 'Document'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Ready for High-Speed OCR & Concept Extraction
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setFileBase64(null);
                    setFilePreviewUrl(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 rounded-lg transition-colors"
                  title="Remove file"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Tab 2: Paste Text */
          <div>
            <div className="mb-2">
              <label className="text-xs font-semibold text-slate-300">
                Paste your lecture notes, slides, or study text:
              </label>
            </div>
            <textarea
              rows={6}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste lecture notes, slide bullet points, textbook paragraphs, or formulas here..."
              className="w-full bg-slate-950/70 border border-slate-800 focus:border-indigo-500 rounded-xl p-3.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
            />
          </div>
        )}

        {/* Customization Options Bar */}
        <div className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Difficulty</span>
              </label>
              <span className="text-[10px] text-slate-400">
                {difficulty === 'Easy' ? 'Foundational' : difficulty === 'Medium' ? 'Standard IGCSE' : 'Exam Challenge'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['Easy', 'Medium', 'Hard'] as const).map((level) => {
                const isActive = difficulty === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDifficulty(level)}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                      isActive
                        ? level === 'Easy'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-500/10 font-bold'
                          : level === 'Medium'
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm shadow-indigo-500/20 font-bold'
                          : 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-sm shadow-rose-500/10 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        level === 'Easy'
                          ? 'bg-emerald-400'
                          : level === 'Medium'
                          ? 'bg-cyan-300'
                          : 'bg-rose-400'
                      }`}
                    />
                    <span>{level}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Card Count: <strong className="text-white font-mono text-sm ml-1">{cardCount}</strong> / 20</span>
              </label>
              <span className="text-[10px] text-slate-400">
                Allow: 1 – 20 cards
              </span>
            </div>

            {/* Stepper + Slider row */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCardCount((prev) => Math.max(1, prev - 1))}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center text-sm transition-colors border border-slate-700/60"
                title="Decrease"
              >
                -
              </button>
              <input
                type="range"
                min="1"
                max="20"
                step="1"
                value={cardCount}
                onChange={(e) => setCardCount(Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)))}
                className="flex-1 accent-indigo-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setCardCount((prev) => Math.min(20, prev + 1))}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center text-sm transition-colors border border-slate-700/60"
                title="Increase"
              >
                +
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[10px] text-slate-500 mr-0.5">Presets:</span>
              {[1, 5, 8, 10, 15, 20].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setCardCount(num)}
                  className={`px-2 py-0.5 text-[10px] font-medium rounded-md border transition-all ${
                    cardCount === num
                      ? 'bg-indigo-600 border-indigo-500 text-white font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cambridge IGCSE & Checkpoint curriculum standard pill */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 bg-slate-950/40 px-3.5 py-2 rounded-xl border border-slate-800/60">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-slate-200">Curriculum Standard:</span>
            <span className="text-emerald-300 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              Cambridge IGCSE & Checkpoint
            </span>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline font-mono">
            Mark-scheme alignment & command words
          </span>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={isProcessing}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-indigo-500 via-violet-600 to-indigo-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Extracting Flashcards ({elapsedSeconds}s)...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-cyan-300" />
                <span>Generate Smart Flashcards ({cardCount} Cards)</span>
              </>
            )}
          </button>
        </div>

        {/* Streamlined Fast Loading Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 z-20 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 mb-4 relative shadow-lg shadow-indigo-500/20">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
              <Sparkles className="w-4 h-4 text-cyan-400 absolute -top-1 -right-1 animate-pulse" />
            </div>

            <h3 className="text-lg font-bold text-white mb-1">
              Analyzing Study Material
            </h3>

            {/* Live elapsed timer */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-300 mb-4">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Elapsed: {elapsedSeconds}s</span>
              <span className="text-slate-500">• Fast Mode</span>
            </div>

            {/* Dynamic Status Bar */}
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl p-3.5 mb-5 text-center">
              <div className="w-full bg-slate-800 rounded-full h-1.5 mb-2.5 overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-cyan-400 to-indigo-500 rounded-full animate-pulse w-full" />
              </div>
              <p className="text-xs text-slate-300">
                {elapsedSeconds < 2.5
                  ? 'Reading document text & recognizing key concepts...'
                  : elapsedSeconds < 6
                  ? `Extracting ${cardCount} active-recall flashcard pairs & formulas...`
                  : 'Synthesizing mnemonics & configuring SM-2 intervals...'}
              </p>
            </div>

            <button
              onClick={handleCancelGeneration}
              className="px-4 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Generated Result Preview Banner */}
      {createdDeck && (
        <div className="mt-8 bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-500/20 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold mb-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Deck Ready: {createdDeck.cards.length} Flashcards Generated</span>
              </div>
              <h2 className="text-xl font-bold text-white">{createdDeck.title}</h2>
              <p className="text-xs text-indigo-300 mt-0.5">{createdDeck.topic}</p>
            </div>

            <div className="flex items-center gap-2">
              {onStartStudyImmediately && (
                <button
                  onClick={() => onStartStudyImmediately(createdDeck)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
                >
                  <Zap className="w-4 h-4 text-slate-950 fill-current" />
                  <span>Study Deck Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-300 mt-3 italic">"{createdDeck.summary}"</p>

          {/* Key terms extracted */}
          <div className="mt-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Extracted Key Terms (NLP / OCR):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {createdDeck.extractedKeyTerms.map((term, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-md text-xs bg-slate-800/90 text-slate-200 border border-slate-700/80"
                >
                  {term}
                </span>
              ))}
            </div>
          </div>

          {/* Sample card preview */}
          <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {createdDeck.cards.slice(0, 2).map((c, i) => (
              <div key={i} className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 text-xs">
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <span className="font-semibold text-indigo-400">Card #{i + 1}</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    {c.conceptCategory}
                  </span>
                </div>
                <p className="font-semibold text-slate-200 mb-1.5">Q: {c.front}</p>
                <p className="text-slate-400 line-clamp-2">A: {c.back}</p>
                {c.mnemonicOrHint && (
                  <p className="mt-1 text-[11px] text-amber-300/80 flex items-center gap-1">
                    <span>💡</span>
                    <span>{c.mnemonicOrHint}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
