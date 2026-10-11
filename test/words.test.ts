import { describe, expect, it } from 'vitest'

import { pickWord, WORDS } from '../src/words'

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
