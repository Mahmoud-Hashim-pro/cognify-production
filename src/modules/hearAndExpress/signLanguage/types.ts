import type { ArslSignEntry, hamnosysToThreePose } from '../../../lib/arslDictionary';
import type { SignRecognitionStatus } from '../types';

export type ThreePoseTarget = ReturnType<typeof hamnosysToThreePose>;

export interface SignLanguageSearchResult {
  exactMatch: ArslSignEntry | null;
  suggestions: ArslSignEntry[];
  fingerspellingFallback: string[];
}

export interface SignLanguageServiceConfig {
  preferredAvatar: '3d_procedural' | 'video_reference';
  enableFingerspellingFallback: boolean;
}
