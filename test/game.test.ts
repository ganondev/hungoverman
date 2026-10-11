import { describe, expect, it } from 'vitest'

import { guess, newGame, type Game } from '../src/game'

/** Cells as a compact string for readable assertions: letters/`_` for spaces. */
function shape(game: Game): string {
  return game.vis.join(',')
}

describe('newGame', () => {
  it('lowercases the phrase and collapses whitespace runs', () => {
    const game = newGame('  Hair   of  The DOG ', 6)
    expect(game.cells).toEqual([
      { kind: 'letter', ch: 'h' },
      { kind: 'letter', ch: 'a' },
      { kind: 'letter', ch: 'i' },
      { kind: 'letter', ch: 'r' },
      { kind: 'space' },
      { kind: 'letter', ch: 'o' },
      { kind: 'letter', ch: 'f' },
      { kind: 'space' },
      { kind: 'letter', ch: 't' },
      { kind: 'letter', ch: 'h' },
      { kind: 'letter', ch: 'e' },
      { kind: 'space' },
      { kind: 'letter', ch: 'd' },
      { kind: 'letter', ch: 'o' },
      { kind: 'letter', ch: 'g' },
    ])
  })

  it('starts fully hidden with no strikes and no guesses', () => {
    const game = newGame('abc', 6)
    expect(shape(game)).toBe('hidden,hidden,hidden')
    expect(game.startVis).toBe('hidden')
    expect(game.endVis).toBe('hidden')
    expect(game.guessed.size).toBe(0)
    expect(game.strikes).toBe(0)
    expect(game.maxStrikes).toBe(6)
    expect(game.status).toBe('playing')
  })

  it('throws on characters outside a-z and space', () => {
    expect(() => newGame('hi!', 6)).toThrow()
    expect(() => newGame('a1', 6)).toThrow()
  })
})

describe('guess', () => {
  it('a hit reveals every occurrence', () => {
    const game = guess(newGame('banana', 6), 'a')
    expect(game.cells.length).toBe(6)
    // Every `a` (indices 1, 3, 5) is solved; each neighbour is promoted to shape
    // and index N promotes the end boundary.
    expect(shape(game)).toBe('shape,solved,shape,solved,shape,solved')
    expect(game.endVis).toBe('shape')
  })

  it('promotes hidden neighbours of a hit to shape', () => {
    const game = guess(newGame('abc', 6), 'b')
    expect(shape(game)).toBe('shape,solved,shape')
  })

  it('promotes the start boundary at index -1', () => {
    const game = guess(newGame('abc', 6), 'a')
    expect(game.startVis).toBe('shape')
    expect(game.endVis).toBe('hidden')
  })

  it('promotes the end boundary at index N', () => {
    const game = guess(newGame('abc', 6), 'c')
    expect(game.endVis).toBe('shape')
    expect(game.startVis).toBe('hidden')
  })

  it('never demotes a solved cell', () => {
    const first = guess(newGame('ab', 6), 'a')
    expect(shape(first)).toBe('solved,shape')

    const second = guess(first, 'b')
    expect(shape(second)).toBe('solved,solved')
  })

  it('turns space neighbours into shape and never solves them', () => {
    const game = guess(newGame('ab cd', 6), 'c')
    expect(shape(game)).toBe('hidden,hidden,shape,solved,shape')

    const solved = guess(guess(guess(game, 'b'), 'd'), 'a')
    expect(solved.vis[2]).toBe('shape')
    expect(solved.status).toBe('won')
  })

  it('a miss adds a strike', () => {
    const game = guess(newGame('abc', 6), 'z')
    expect(game.strikes).toBe(1)
    expect(game.status).toBe('playing')
    expect(game.guessed.has('z')).toBe(true)
  })

  it('a repeat of an already-guessed letter adds a strike', () => {
    const hit = guess(newGame('abc', 6), 'a')
    const repeatHit = guess(hit, 'a')
    expect(repeatHit.strikes).toBe(hit.strikes + 1)

    const miss = guess(newGame('abc', 6), 'z')
    const repeatMiss = guess(miss, 'z')
    expect(repeatMiss.strikes).toBe(miss.strikes + 1)
  })

  it('wins when every letter is solved, regardless of spaces', () => {
    let game: Game = newGame('ab c', 6)
    game = guess(game, 'a')
    game = guess(game, 'b')
    game = guess(game, 'c')
    expect(game.status).toBe('won')
    // The space only ever reached `shape`.
    expect(game.vis[2]).toBe('shape')
  })

  it('loses when strikes reach maxStrikes', () => {
    let game: Game = newGame('abc', 2)
    game = guess(game, 'z')
    expect(game.status).toBe('playing')
    game = guess(game, 'y')
    expect(game.strikes).toBe(2)
    expect(game.status).toBe('lost')
  })

  it('ignores every guess once the game is over', () => {
    const lost = guess(guess(newGame('abc', 1), 'z'), 'a')
    expect(lost.status).toBe('lost')
    const afterLoss = guess(lost, 'a')
    expect(afterLoss.status).toBe('lost')
    expect(afterLoss.strikes).toBe(lost.strikes)
    expect(afterLoss.vis).toEqual(lost.vis)
    expect(afterLoss.guessed.size).toBe(lost.guessed.size)

    const won = guess(guess(guess(newGame('ab', 6), 'a'), 'b'), 'z')
    expect(won.status).toBe('won')
    const afterWin = guess(won, 'z')
    expect(afterWin.status).toBe('won')
    expect(afterWin.strikes).toBe(won.strikes)
    expect(afterWin.vis).toEqual(won.vis)
  })

  it('ignores input that is not a letter', () => {
    const game = newGame('abc', 6)
    for (const bad of ['', '1', '-', ' ', 'ab', '!', 'ä']) {
      const after = guess(game, bad)
      expect(after.status).toBe('playing')
      expect(after.strikes).toBe(0)
      expect(after.guessed.size).toBe(0)
      expect(after.vis).toEqual(game.vis)
      expect(after.startVis).toBe('hidden')
      expect(after.endVis).toBe('hidden')
    }
  })

  it('normalises input case', () => {
    const game = guess(newGame('abc', 6), 'A')
    expect(game.vis[0]).toBe('solved')
    expect(game.guessed.has('a')).toBe(true)
  })

  it('is pure: it does not mutate the game it is given', () => {
    const before = newGame('ab', 6)
    const snapshot = { vis: [...before.vis], strikes: before.strikes, guessed: before.guessed.size }
    const after = guess(before, 'a')
    expect(after).not.toBe(before)
    expect(before.vis).toEqual(snapshot.vis)
    expect(before.strikes).toBe(snapshot.strikes)
    expect(before.guessed.size).toBe(snapshot.guessed)
    expect(after.vis).not.toBe(before.vis)
    expect(after.cells).not.toBe(before.cells)
    expect(after.guessed).not.toBe(before.guessed)
  })
})
