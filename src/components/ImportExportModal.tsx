import React, { useState } from 'react';
import {
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Copy,
  Check,
} from 'lucide-react';
import { exportDecksToJson, importDecksFromJson, saveStoredDecks } from '../lib/storage';
import { Deck } from '../types/flashcard';

interface ImportExportModalProps {
  onClose: () => void;
  onRefreshDecks: (decks: Deck[]) => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  onClose,
  onRefreshDecks,
}) => {
  const [importJsonText, setImportJsonText] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const handleDownloadFile = () => {
    const jsonStr = exportDecksToJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flashcard_ai_decks_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setMessage({ type: 'success', text: 'Decks exported successfully as JSON file.' });
  };

  const handleCopyJson = () => {
    const jsonStr = exportDecksToJson();
    navigator.clipboard.writeText(jsonStr);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleImportSubmit = () => {
    setMessage(null);
    if (!importJsonText.trim()) {
      setMessage({ type: 'error', text: 'Please paste valid JSON decks.' });
      return;
    }

    const result = importDecksFromJson(importJsonText);
    if (result.success) {
      setMessage({ type: 'success', text: `Successfully imported ${result.count} deck(s)!` });
      setImportJsonText('');
      setTimeout(() => {
        window.location.reload();
      }, 900);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to parse JSON.' });
    }
  };

  const handleClearAllDecks = () => {
    if (confirm('Are you sure you want to clear all decks? This cannot be undone.')) {
      saveStoredDecks([]);
      onRefreshDecks([]);
      setMessage({ type: 'success', text: 'All decks cleared.' });
      setTimeout(() => onClose(), 600);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl p-6 relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white">Import & Export Decks</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`p-3 rounded-xl mb-4 text-xs flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Export Section */}
        <div className="mb-6 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
          <h3 className="text-xs font-bold text-white mb-1.5 flex items-center gap-2">
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export Your Decks</span>
          </h3>
          <p className="text-[11px] text-slate-400 mb-3">
            Download your flashcard decks with spaced-repetition intervals and review histories as a JSON backup.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadFile}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download JSON Backup</span>
            </button>
            <button
              onClick={handleCopyJson}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'Copied!' : 'Copy to Clipboard'}</span>
            </button>
          </div>
        </div>

        {/* Import Section */}
        <div className="mb-6 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
          <h3 className="text-xs font-bold text-white mb-1.5 flex items-center gap-2">
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Import Decks (JSON)</span>
          </h3>
          <p className="text-[11px] text-slate-400 mb-2">
            Paste exported deck JSON data to import them into your library:
          </p>
          <textarea
            rows={3}
            value={importJsonText}
            onChange={(e) => setImportJsonText(e.target.value)}
            placeholder='[ { "id": "deck-1", "title": "...", "cards": [...] } ]'
            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500 mb-2"
          />
          <button
            onClick={handleImportSubmit}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Decks</span>
          </button>
        </div>

        {/* Reset / Clear */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">Need to start fresh?</span>
          <button
            onClick={handleClearAllDecks}
            className="px-3 py-1 rounded-lg border border-slate-800 text-rose-400 hover:bg-slate-800 text-xs flex items-center gap-1.5"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear All Decks</span>
          </button>
        </div>
      </div>
    </div>
  );
};
