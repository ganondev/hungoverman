import { describe, expect, it } from 'vitest'

import { guess, newGame, type Game } from '../src/game'
import { layout, type Run } from '../src/layout'

function play(phrase: string, letters: string): Game {
  let game = newGame(phrase, 6)
  for (const ch of letters) game = guess(game, ch)
  return game
}

/** `[shape, solved, shape]`-style shorthand for a run of slots. */
function describeRun(run: Run): string {
  return run.map((slot) => slot.kind).join(',')
}

describe('layout', () => {
  it('is empty for a new game', () => {
    expect(layout(newGame('abc', 6))).toEqual([])
  })

  it('returns one [shape, solved, shape] run for a single interior hit', () => {
    const runs = layout(play('abc', 'b'))
    expect(runs.length).toBe(1)
    expect(runs[0]).toEqual([
      { kind: 'letter', ch: null },
      { kind: 'letter', ch: 'b' },
      { kind: 'letter', ch: null },
    ])
  })

  it('returns two runs for two separated hits', () => {
    const runs = layout(play('abcde', 'ae'))
    expect(runs.length).toBe(2)
    expect(describeRun(runs[0])).toBe('start,letter,letter')
    expect(describeRun(runs[1])).toBe('letter,letter,end')
    expect(runs[0]).toEqual([
      { kind: 'start' },
      { kind: 'letter', ch: 'a' },
      { kind: 'letter', ch: null },
    ])
    expect(runs[1]).toEqual([
      { kind: 'letter', ch: null },
      { kind: 'letter', ch: 'e' },
      { kind: 'end' },
    ])
  })

  it('merges runs when a bridging hit closes the gap', () => {
    const separate = layout(play('abcde', 'ae'))
    expect(separate.length).toBe(2)

    const merged = layout(play('abcde', 'aec'))
    expect(merged.length).toBe(1)
    expect(describeRun(merged[0])).toBe('start,letter,letter,letter,letter,letter,end')
  })

  it('attaches the start and end markers to the first and last run', () => {
    const runs = layout(play('abcde', 'ae'))
    expect(runs[0][0]).toEqual({ kind: 'start' })
    expect(runs[runs.length - 1][runs[runs.length - 1].length - 1]).toEqual({ kind: 'end' })
  })

  it('shows exactly one run of length N+2 when fully solved', () => {
    const game = play('ab cd', 'abcd')
    expect(game.status).toBe('won')

    const runs = layout(game)
    expect(runs.length).toBe(1)
    expect(runs[0].length).toBe(game.cells.length + 2)
    expect(runs[0]).toEqual([
      { kind: 'start' },
      { kind: 'letter', ch: 'a' },
      { kind: 'letter', ch: 'b' },
      { kind: 'space' },
      { kind: 'letter', ch: 'c' },
      { kind: 'letter', ch: 'd' },
      { kind: 'end' },
    ])
  })
})
