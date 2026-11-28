import React, { useState } from 'react';
import { X, FileText, Plus, Trash2, Copy, Check } from 'lucide-react';
import { L } from '../../../../lib/translations';
import type { ConversationNote } from '../types';

interface NotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: ConversationNote[];
  onAddNote: (text: string) => void;
  onRemoveNote: (id: string) => void;
  language: string;
}

export const NotesModal: React.FC<NotesModalProps> = ({
  isOpen,
  onClose,
  notes,
  onAddNote,
  onRemoveNote,
  language,
}) => {
  const [noteText, setNoteText] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const isAr = language === 'ar' || language === 'ar-SA' || language === 'ar-EG';

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    onAddNote(noteText.trim());
    setNoteText('');
  };

  const handleCopyAll = () => {
    if (notes.length === 0) return;
    const all = notes
      .map((n) => `[${new Date(n.timestamp).toLocaleTimeString()}] ${n.text}`)
      .join('\n');
    navigator.clipboard.writeText(all);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="notes-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div
        className="w-full max-w-xl max-h-[85vh] overflow-y-auto bg-[#071B33] border-2 border-[#12CFE0]/40 rounded-2xl p-6 shadow-2xl text-[#F4F7FB]"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#12CFE0]/20 mb-5">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-[#12CFE0]" aria-hidden="true" />
            <h2 id="notes-modal-title" className="text-lg font-extrabold text-[#F4F7FB]">
              {isAr ? 'ملاحظات المحادثة الحالية' : L('Conversation Notes')}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label={isAr ? 'إغلاق' : L('Close')}
            className="p-2 rounded-xl text-[#A9BDD3] hover:text-white hover:bg-[#102D4D] transition-colors focus-visible:ring-2 focus-visible:ring-[#12CFE0]"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Add Note Form */}
        <form onSubmit={handleAdd} className="space-y-2 mb-5">
          <label className="block text-xs font-bold text-[#A9BDD3]">
            {isAr ? 'تدوين ملاحظة سريعة أثناء الحوار:' : L('Take a quick note during discussion:')}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              required
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder={isAr ? 'اكتب ملاحظة أو نقطة مهمة…' : L('Type a note or reminder…')}
              className="flex-1 bg-[#102D4D] border border-[#12CFE0]/30 rounded-xl px-3.5 py-2.5 text-sm text-[#F4F7FB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] focus:border-[#12CFE0]"
            />
            <button
              type="submit"
              className="py-2.5 px-4 rounded-xl bg-[#1769AA] hover:bg-[#076D78] text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md focus-visible:ring-2 focus-visible:ring-[#12CFE0]"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>{isAr ? 'إضافة' : 'Add'}</span>
            </button>
          </div>
        </form>

        {/* Notes List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-[#A9BDD3] uppercase tracking-wider">
              {isAr ? `الملاحظات المسجلة (${notes.length})` : `Saved Notes (${notes.length})`}
            </h3>
            {notes.length > 0 && (
              <button
                type="button"
                onClick={handleCopyAll}
                className="text-xs text-[#12CFE0] hover:underline flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? (isAr ? 'تم النسخ' : L('Copied')) : (isAr ? 'نسخ الكل' : L('Copy All'))}</span>
              </button>
            )}
          </div>

          {notes.length === 0 ? (
            <p className="text-xs text-[#A9BDD3]/60 italic p-4 text-center bg-[#102D4D]/50 rounded-xl">
              {isAr ? 'لا توجد ملاحظات مسجلة بعد.' : L('No notes written yet.')}
            </p>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {notes.map((n) => (
                <div
                  key={n.id}
                  className="flex items-start justify-between p-3 bg-[#102D4D] border border-white/10 rounded-xl text-xs gap-3"
                >
                  <div>
                    <span className="text-xs text-[#12CFE0] font-mono block mb-1">
                      {new Date(n.timestamp).toLocaleTimeString()}
                    </span>
                    <p className="text-[#F4F7FB] font-medium leading-relaxed">{n.text}</p>
                  </div>
                  <button
                    onClick={() => onRemoveNote(n.id)}
                    aria-label={isAr ? 'حذف الملاحظة' : L('Delete note')}
                    className="p-1 rounded text-[#A9BDD3] hover:text-rose-400 hover:bg-[#071B33] transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="mt-6 pt-4 border-t border-[#12CFE0]/20 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-[#1769AA] text-white font-bold text-xs hover:bg-[#076D78] transition-all focus-visible:ring-2 focus-visible:ring-[#12CFE0]"
          >
            {isAr ? 'تم' : L('Done')}
          </button>
        </div>
      </div>
    </div>
  );
};
