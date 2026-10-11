/** Placeholder wordlist. Every entry is lowercase and <= 24 cells including spaces. */
export const WORDS: readonly string[] = [
  'hangover',
  'tequila',
  'espresso',
  'headache',
  'kebab',
  'paracetamol',
  'daylight robbery',
  'hair of the dog',
  'curtains',
  'asparagus',
  'what happened last night',
  'oh no',
  'taxi home',
  'gregs sausage roll',
  'never drinking again',
  'bottle of water',
  'phone charger',
  'lost my keys',
  'sick day',
  'kebab shop',
  'spicy noodles',
  'mystery bruise',
  'two pints',
]

/** A word the game can actually build a round from: 1–24 letters, no spaces. */
const PLAYABLE = /^[a-z]{1,24}$/

/** Pool `pickWord` draws from. Starts as the built-in list, replaced once loaded. */
let pool: readonly string[] = WORDS

/** Install the loaded pool. An empty list is ignored, so the fallback survives. */
export function setWordlist(words: readonly string[]): void {
  if (words.length > 0) pool = words
}

/**
 * Turn the raw newline-delimited text into the game's pool: lowercased, trimmed,
 * duplicates removed, and only entries `newGame` can accept. Anything with an
 * apostrophe, accent, hyphen or over-long length is dropped here rather than
 * throwing in the middle of a round.
 */
export function parseWordlist(text: string): string[] {
  const seen = new Set<string>()
  for (const line of text.split('\n')) {
    const word = line.trim().toLowerCase()
    if (PLAYABLE.test(word)) seen.add(word)
  }
  return [...seen]
}

/**
 * The phrase for a new game. Normally a random wordlist entry, but a `?word=`
 * query parameter takes precedence so a specific phrase can be pinned or shared
 * via the URL. The override need not be in the pool; it only has to be playable,
 * i.e. letters and single spaces, which is exactly what `newGame` accepts.
 * A blank or unplayable value is ignored and a random word is used instead.
 */
export function pickWord(search: string = location.search): string {
  const requested = new URLSearchParams(search).get('word')?.trim()
  if (requested && /^[a-z ]+$/i.test(requested)) return requested
  return pool[Math.floor(Math.random() * pool.length)]
}
