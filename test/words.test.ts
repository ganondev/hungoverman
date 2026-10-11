import { describe, expect, it } from 'vitest'

import { parseWordlist, pickWord, setWordlist, WORDS } from '../src/words'

describe('pickWord', () => {
  it('uses the ?word= override, even when it is not in the wordlist', () => {
    expect(pickWord('?word=cromulent')).toBe('cromulent')
  })

  it('decodes the override and trims surrounding whitespace', () => {
    expect(pickWord('?word=hair%20of%20the%20dog')).toBe('hair of the dog')
    expect(pickWord('?word=%20%20hangover%20%20')).toBe('hangover')
  })

  it('falls back to a random wordlist entry when the override is blank', () => {
    expect(WORDS).toContain(pickWord('?word='))
    expect(WORDS).toContain(pickWord('?word=%20%20'))
  })

  it('ignores an override that newGame could not accept', () => {
    expect(WORDS).toContain(pickWord('?word=hi!'))
    expect(WORDS).toContain(pickWord('?word=42'))
  })

  it('picks a wordlist entry when there is no override', () => {
    expect(WORDS).toContain(pickWord(''))
    expect(WORDS).toContain(pickWord('?other=thing'))
  })
})

describe('parseWordlist', () => {
  it('lowercases, trims and de-duplicates playable words', () => {
    expect(parseWordlist('Apple\napple\nbanana\n')).toEqual(['apple', 'banana'])
  })

  it('drops entries the game could not build a round from', () => {
    const raw = ["AA's", 'Caf\u00e9', 'well-known', 'x', 'a'.repeat(25)].join('\n')
    expect(parseWordlist(raw)).toEqual(['x'])
  })

  it('keeps words up to the 24-cell ceiling', () => {
    expect(parseWordlist('a'.repeat(24))).toEqual(['a'.repeat(24)])
  })

  it('ignores blank lines and surrounding whitespace', () => {
    expect(parseWordlist('\n\n  \n')).toEqual([])
  })
})

describe('setWordlist', () => {
  it('swaps the pool pickWord draws from', () => {
    setWordlist(['zzz'])
    expect(pickWord('')).toBe('zzz')
  })

  it('ignores an empty pool so the previous one survives', () => {
    setWordlist([])
    expect(pickWord('')).toBe('zzz')
  })
})
