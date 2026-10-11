import type { KAPLAYCtx } from 'kaplay'
import type { Game } from '../game'

export function registerEnd(k: KAPLAYCtx): void {
  k.scene('end', (game: Game) => {
    const phrase = game.cells.map((c) => (c.kind === 'space' ? ' ' : c.ch)).join('')
    const cx = k.width() / 2

    k.add([
      k.pos(cx, 200),
      k.anchor('center'),
      k.text(game.status === 'won' ? 'Survived' : 'Hungover', { size: 48 }),
    ])
    k.add([k.pos(cx, 300), k.anchor('center'), k.text(phrase.toUpperCase(), { size: 32 })])
    k.add([
      k.pos(cx, 400),
      k.anchor('center'),
      k.text('press any key', { size: 18 }),
      k.opacity(0.6),
    ])

    k.onKeyPress(() => k.go('play'))
    k.onMousePress(() => k.go('play'))
  })
}
