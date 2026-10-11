/**
 * Pure projection of a Game into the visible runs of known cells.
 *
 * Hidden cells occupy no space; a run is a maximal group of known cells.
 * Because a hit promotes its neighbours, adjacent known cells always belong to
 * the same run, so a gap between runs always implies at least one unknown cell
 * and therefore leaks no length information.
 */

import type { Game } from './game'

export type Slot =
  | { kind: 'start' } // startVis === 'shape'
  | { kind: 'end' } // endVis === 'shape'
  | { kind: 'letter'; ch: string | null } // null when vis === 'shape'
  | { kind: 'space' }

export type Run = Slot[]

/** Runs in index order; hidden cells are omitted and split runs. */
export function layout(game: Game): Run[] {
  const runs: Run[] = []
  let run: Run = []

  const flush = (): void => {
    if (run.length > 0) {
      runs.push(run)
      run = []
    }
  }

  if (game.startVis === 'shape') run.push({ kind: 'start' })

  game.cells.forEach((cell, i) => {
    const vis = game.vis[i]
    if (vis === 'hidden') {
      flush()
      return
    }
    if (cell.kind === 'space') {
      run.push({ kind: 'space' })
    } else {
      run.push({ kind: 'letter', ch: vis === 'solved' ? cell.ch : null })
    }
  })

  if (game.endVis === 'shape') run.push({ kind: 'end' })
  flush()

  return runs
}
