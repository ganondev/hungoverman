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

export function pickWord(): string {
  return WORDS[Math.floor(Math.random() * WORDS.length)]
}
