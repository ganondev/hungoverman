/**
 * Pure game state and reducer. No kaplay import, no I/O.
 */

export type Cell = { kind: 'letter'; ch: string } | { kind: 'space' }

export type Vis = 'hidden' | 'shape' | 'solved'

export type Game = {
  cells: Cell[]
  vis: Vis[] // same length as cells
  startVis: 'hidden' | 'shape' // boundary marker before cells[0]
  endVis: 'hidden' | 'shape' // boundary marker after cells[N-1]
  guessed: Set<string>
  strikes: number
  maxStrikes: number // supplied by the StrikeDisplay, not hardcoded
  status: 'playing' | 'won' | 'lost'
}

const LETTER_RE = /^[a-z]$/

/**
 * Build a fresh game. The phrase is lowercased, runs of whitespace collapse to a
 * single space, and the result is trimmed. Only `a-z` and the single-space
 * separator are accepted; anything else throws.
 */
export function newGame(phrase: string, maxStrikes: number): Game {
  const normalised = phrase.toLowerCase().replace(/\s+/g, ' ').trim()
  if (normalised.length === 0) {
    throw new Error('newGame: phrase must contain at least one letter')
  }

  const cells: Cell[] = []
  for (const ch of normalised) {
    if (ch === ' ') {
      cells.push({ kind: 'space' })
    } else if (LETTER_RE.test(ch)) {
      cells.push({ kind: 'letter', ch })
    } else {
      throw new Error(`newGame: unsupported character ${JSON.stringify(ch)}`)
    }
  }

  return {
    cells,
    vis: cells.map((): Vis => 'hidden'),
    startVis: 'hidden',
    endVis: 'hidden',
    guessed: new Set<string>(),
    strikes: 0,
    maxStrikes,
    status: 'playing',
  }
}

/**
 * Pure reducer: returns a new Game and never mutates the one passed in.
 *
 * - Input is normalised to lowercase `a-z`; anything else is ignored (same Game
 *   reference is returned, no state change).
 * - A hit solves every matching letter cell and promotes each still-hidden
 *   neighbour to `shape`. Indices `-1` / `N` promote `startVis` / `endVis`.
 * - A miss, or a repeat of an already-guessed letter, adds one strike.
 */
export function guess(game: Game, ch: string): Game {
  if (game.status !== 'playing') return game

  const letter = typeof ch === 'string' ? ch.toLowerCase() : ''
  if (!LETTER_RE.test(letter)) return game

  // A repeat of anything already tried costs a strike, hit or miss.
  if (game.guessed.has(letter)) return applyStrike(game, new Set(game.guessed))

  const guessed = new Set(game.guessed)
  guessed.add(letter)

  const hits: number[] = []
  game.cells.forEach((cell, i) => {
    if (cell.kind === 'letter' && cell.ch === letter) hits.push(i)
  })

  if (hits.length === 0) return applyStrike(game, guessed)

  const vis = [...game.vis]
  const n = game.cells.length
  let startVis = game.startVis
  let endVis = game.endVis

  for (const i of hits) vis[i] = 'solved'

  for (const i of hits) {
    for (const j of [i - 1, i + 1]) {
      if (j < 0) {
        if (startVis === 'hidden') startVis = 'shape'
      } else if (j >= n) {
        if (endVis === 'hidden') endVis = 'shape'
      } else if (vis[j] === 'hidden') {
        // `solved` is never demoted, and `shape` is terminal for spaces and
        // boundaries, so only `hidden` neighbours are promoted.
        vis[j] = 'shape'
      }
    }
  }

  const won = game.cells.every((cell, i) => cell.kind !== 'letter' || vis[i] === 'solved')

  return {
    cells: [...game.cells],
    vis,
    startVis,
    endVis,
    guessed,
    strikes: game.strikes,
    maxStrikes: game.maxStrikes,
    status: won ? 'won' : 'playing',
  }
}

function applyStrike(game: Game, guessed: Set<string>): Game {
  const strikes = game.strikes + 1
  return {
    cells: [...game.cells],
    vis: [...game.vis],
    startVis: game.startVis,
    endVis: game.endVis,
    guessed,
    strikes,
    maxStrikes: game.maxStrikes,
    status: strikes >= game.maxStrikes ? 'lost' : 'playing',
  }
}
