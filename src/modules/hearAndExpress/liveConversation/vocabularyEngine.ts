import type { VocabularyItem } from './types';

export class VocabularyEngine {
  private items: VocabularyItem[] = [];

  constructor() {
    this.loadPersisted();
  }

  private loadPersisted(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const stored = localStorage.getItem('rafiqi_hear_express_vocabulary');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.items = parsed;
        }
      }
    } catch {
      // ignore
    }
  }

  private persist(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem('rafiqi_hear_express_vocabulary', JSON.stringify(this.items));
    } catch {
      // ignore
    }
  }

  public getItems(): VocabularyItem[] {
    return [...this.items];
  }

  public addItem(
    originalPhrase: string,
    replacementPhrase: string,
    note?: string,
    caseSensitive = false
  ): VocabularyItem {
    const item: VocabularyItem = {
      id: `voc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      originalPhrase: originalPhrase.trim(),
      replacementPhrase: replacementPhrase.trim(),
      note: note?.trim(),
      caseSensitive,
    };
    this.items.push(item);
    this.persist();
    return item;
  }

  public removeItem(id: string): boolean {
    const idx = this.items.findIndex((it) => it.id === id);
    if (idx !== -1) {
      this.items.splice(idx, 1);
      this.persist();
      return true;
    }
    return false;
  }

  public clear(): void {
    this.items = [];
    this.persist();
  }

  /**
   * Normalizes Arabic text by unifying Alef variants, Ta Marbuta, Ya/Alef Maqsura,
   * and stripping diacritics (tashkeel). Critical for robust search and speech matching.
   */
  public static normalizeArabic(text: string): string {
    if (!text) return '';
    return text
      // Strip Tashkeel / Harakat
      .replace(/[\u064B-\u065F\u0670]/g, '')
      // Unify Alef forms
      .replace(/[إأآا]/g, 'ا')
      // Unify Ta Marbuta
      .replace(/ة/g, 'ه')
      // Unify Ya / Alef Maqsura
      .replace(/ى/g, 'ي')
      // Trim multiple spaces
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Applies all user vocabulary replacements to a candidate transcript string.
   */
  public applyVocabulary(text: string): string {
    if (!text || this.items.length === 0) return text;

    let result = text;
    for (const item of this.items) {
      if (!item.originalPhrase || !item.replacementPhrase) continue;

      if (item.caseSensitive) {
        // Direct string replacement
        result = result.split(item.originalPhrase).join(item.replacementPhrase);
      } else {
        // Case-insensitive word/phrase boundary or substring replacement
        try {
          const escaped = item.originalPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escaped, 'gi');
          result = result.replace(regex, item.replacementPhrase);
        } catch {
          // Fallback simple replace
          result = result.split(item.originalPhrase).join(item.replacementPhrase);
        }
      }
    }

    return result;
  }

  /**
   * Flexible multilingual search matching that handles Arabic orthographic variants.
   */
  public static isSearchMatch(query: string, text: string): boolean {
    if (!query || !text) return false;

    const cleanQuery = query.trim().toLowerCase();
    const cleanText = text.toLowerCase();

    if (cleanText.includes(cleanQuery)) return true;

    // Check Arabic normalized version
    const normQuery = VocabularyEngine.normalizeArabic(cleanQuery);
    const normText = VocabularyEngine.normalizeArabic(cleanText);

    return normText.includes(normQuery);
  }
}
