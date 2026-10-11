import type { GameObj, KAPLAYCtx } from 'kaplay'

export type StrikeResult = 'won' | 'lost'

export interface StrikeDisplay {
  /** Number of failures the display can show. The game uses this as maxStrikes. */
  readonly maxStrikes: number
  /** Create all game objects as children of `parent`, fitted to `size`. */
  mount(k: KAPLAYCtx, parent: GameObj, size: { w: number; h: number }): void
  /** Idempotent. Called with 0 on new game, then on every change. */
  setStrikes(n: number): void
  /** Optional end-of-game hook. */
  finish?(result: StrikeResult): void
}

export type StrikeDisplayFactory = () => StrikeDisplay
