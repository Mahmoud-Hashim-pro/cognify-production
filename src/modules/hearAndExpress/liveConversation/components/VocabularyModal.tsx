import React, { useState } from 'react';
import { X, BookOpen, Plus, Trash2, Check } from 'lucide-react';
import type { VocabularyItem } from '../types';

interface VocabularyModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: VocabularyItem[];
  onAddItem: (original: string, replacement: string, note?: string) => void;
  onRemoveItem: (id: string) => void;
  language: string;
}

export const VocabularyModal: React.FC<VocabularyModalProps> = ({
  isOpen,
  onClose,
  items,
  onAddItem,
  onRemoveItem,
  language,
}) => {
  const [original, setOriginal] = useState('');
  const [replacement, setReplacement] = useState('');
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const isAr = language === 'ar' || language === 'ar-SA' || language === 'ar-EG';

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!original.trim() || !replacement.trim()) return;
    onAddItem(original.trim(), replacement.trim(), note.trim() || undefined);
    setOriginal('');
    setReplacement('');
    setNote('');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="vocab-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div
        className="w-full max-w-xl max-h-[85vh] overflow-y-auto bg-[#071B33] border-2 border-[#12CFE0]/40 rounded-2xl p-6 shadow-2xl text-[#F4F7FB]"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#12CFE0]/20 mb-5">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-[#12CFE0]" aria-hidden="true" />
            <h2 id="vocab-modal-title" className="text-lg font-extrabold text-[#F4F7FB]">
              {isAr ? 'المفردات المخصصة والتصحيح الصوتي' : 'Custom Vocabulary & Phonetic Corrections'}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label={isAr ? 'إغلاق' : 'Close'}
            className="p-2 rounded-xl text-[#A9BDD3] hover:text-white hover:bg-[#102D4D] transition-colors focus-visible:ring-2 focus-visible:ring-[#12CFE0]"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <p className="text-xs text-[#A9BDD3] leading-relaxed mb-5">
          {isAr
            ? 'عرّف الكلمات والأسماء التي يخطئ المحرك الصوتي في سماعها، وسيتم استبدالها تلقائياً بالنص الصحيح لحظياً في الترجمة.'
            : 'Define custom words, proper names, or technical terms that speech recognition mishears. They will automatically be corrected in live captions.'}
        </p>

        {/* Add Form */}
        <form onSubmit={handleAdd} className="bg-[#102D4D] p-4 rounded-xl border border-[#12CFE0]/25 space-y-3 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#A9BDD3] mb-1">
                {isAr ? 'الكلمة كما يسمعها المحرك (الخطأ):' : 'Misheard Phrase (What audio engine hears):'}
              </label>
              <input
                type="text"
                required
                value={original}
                onChange={(e) => setOriginal(e.target.value)}
                placeholder={isAr ? 'مثال: رفيق' : 'e.g., Rafik'}
                className="w-full bg-[#071B33] border border-[#12CFE0]/30 rounded-lg px-3 py-2 text-sm text-[#F4F7FB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] focus:border-[#12CFE0]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#12CFE0] mb-1">
                {isAr ? 'الكلمة الصحيحة المطلوبة:' : 'Correct Replacement Phrase:'}
              </label>
              <input
                type="text"
                required
                value={replacement}
                onChange={(e) => setReplacement(e.target.value)}
                placeholder={isAr ? 'مثال: رفيقي' : 'e.g., Rafiqi'}
                className="w-full bg-[#071B33] border border-[#12CFE0]/30 rounded-lg px-3 py-2 text-sm text-[#F4F7FB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] focus:border-[#12CFE0]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#A9BDD3] mb-1">
              {isAr ? 'ملاحظة اختيارية (سياق أو تصنيف):' : 'Optional Context Note:'}
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={isAr ? 'مثال: اسم التطبيق' : 'e.g., App Name'}
              className="w-full bg-[#071B33] border border-[#12CFE0]/30 rounded-lg px-3 py-2 text-sm text-[#F4F7FB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] focus:border-[#12CFE0]"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-[#1769AA] hover:bg-[#076D78] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md focus-visible:ring-2 focus-visible:ring-[#12CFE0]"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>{isAr ? 'إضافة إلى القاموس الصوتي' : 'Add to Vocabulary'}</span>
          </button>
        </form>

        {/* Existing Items List */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-[#A9BDD3] uppercase tracking-wider mb-2">
            {isAr ? `المفردات المسجلة (${items.length})` : `Configured Terms (${items.length})`}
          </h3>
          {items.length === 0 ? (
            <p className="text-xs text-[#A9BDD3]/60 italic p-3 text-center bg-[#102D4D]/50 rounded-lg">
              {isAr ? 'لا توجد كلمات مخصصة حالياً.' : 'No custom vocabulary defined yet.'}
            </p>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 bg-[#102D4D] border border-white/10 rounded-lg text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="line-through text-rose-300 font-mono">{item.originalPhrase}</span>
                    <span className="text-[#12CFE0]">➔</span>
                    <span className="font-extrabold text-emerald-300">{item.replacementPhrase}</span>
                    {item.note && <span className="text-xs text-[#A9BDD3] bg-[#071B33] px-1.5 py-0.5 rounded">({item.note})</span>}
                  </div>
                  <button
                    onClick={() => onRemoveItem(item.id)}
                    aria-label={isAr ? `حذف ${item.replacementPhrase}` : `Delete ${item.replacementPhrase}`}
                    className="p-1 rounded text-[#A9BDD3] hover:text-rose-400 hover:bg-[#071B33] transition-colors"
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
            {isAr ? 'تم' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
