import { franc } from 'franc-min';

export type DetectedLanguage = 'en' | 'kri' | 'other';

// franc is a free, offline statistical language detector -- but its training
// corpus has no Sierra Leonean Krio at all, so it never recognizes it (short
// Krio queries typically get misclassified as Spanish or Portuguese, whose
// n-grams happen to overlap). Krio detection instead runs on a small
// hand-picked list of function words/particles that are near-universal in
// Krio sentences and rare/absent in English ("dae", "wetin", "una", "na",
// ...) -- counting marker hits per language handles code-switched
// English/Krio sentences naturally, since each half of the sentence
// contributes to its own language's score independently of the other.
const KRIO_MARKERS = [
  'dae', 'na', 'wetin', 'wusai', 'aw', 'una', 'dem', 'pikin', 'tenki', 'mek',
  'wan', 'os', 'kam', 'nomo', 'sabi', 'padi', 'waka', 'tumoch', 'nar', 'yu',
  'wi', 'dis', 'dat', 'don', 'go', 'fambul', 'kohtu', 'chip', 'smol', 'lek',
  'wetin di', 'aw di', 'i dae', 'no gud', 'kaman', 'kohna', 'sef', 'oona',
];
const ENGLISH_MARKERS = [
  'the', 'a', 'an', 'is', 'are', 'in', 'for', 'to', 'of', 'and', 'with',
  'near', 'bedroom', 'house', 'rent', 'buy', 'price', 'looking', 'want',
];

function countMarkerHits(words: string[], markers: string[]): number {
  const set = new Set(markers);
  return words.filter((w) => set.has(w)).length;
}

export function detectLanguage(text: string): DetectedLanguage {
  const trimmed = text.trim();
  if (!trimmed) return 'other';
  const words = trimmed.toLowerCase().split(/\s+/).filter(Boolean);

  const krioHits = countMarkerHits(words, KRIO_MARKERS);
  const englishHits = countMarkerHits(words, ENGLISH_MARKERS);

  if (krioHits > 0 && krioHits >= englishHits) return 'kri';
  if (englishHits > 0) return 'en';

  // Neither vocabulary matched anything -- fall back to franc for a broad
  // signal on genuinely different languages (French, Spanish, ...) that
  // aren't Krio or English at all. franc needs a few words to be reliable;
  // very short unmatched input is treated as English (the platform's
  // default) rather than guessed at.
  if (words.length < 3) return 'en';
  const code = franc(trimmed);
  if (code === 'eng') return 'en';
  if (code === 'und') return 'en';
  return 'other';
}
