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

/**
 * The phrase for a new game. Normally a random wordlist entry, but a `?word=`
 * query parameter takes precedence so a specific phrase can be pinned or shared
 * via the URL. The override need not be in WORDS; it only has to be playable,
 * i.e. letters and single spaces, which is exactly what `newGame` accepts.
 * A blank or unplayable value is ignored and a random word is used instead.
 */
export function pickWord(search: string = location.search): string {
  const requested = new URLSearchParams(search).get('word')?.trim()
  if (requested && /^[a-z ]+$/i.test(requested)) return requested
  return WORDS[Math.floor(Math.random() * WORDS.length)]
}
