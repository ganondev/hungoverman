import type { KAPLAYCtx } from 'kaplay'

/** Menu chrome rests a step back from the ink, matching the play scene's keys. */
const INK: [number, number, number] = [232, 232, 239]
const BTN_BG: [number, number, number] = [40, 40, 52]

const BTN_W = 220
const BTN_H = 56
const BTN_Y = 320
const HOVER_OPACITY = 0.8

export function registerMenu(k: KAPLAYCtx): void {
  k.scene('menu', () => {
    const cx = k.width() / 2

    k.add([k.pos(cx, 200), k.anchor('center'), k.text('Hungoverman', { size: 48 }), k.color(...INK)])

    const button = k.add([
      k.pos(cx - BTN_W / 2, BTN_Y),
      k.rect(BTN_W, BTN_H, { radius: 8 }),
      k.color(...BTN_BG),
      k.opacity(1),
      k.area(),
    ])
    button.add([
      k.pos(BTN_W / 2, BTN_H / 2),
      k.anchor('center'),
      k.text('Start', { size: 24 }),
      k.color(...INK),
    ])

    button.onHover(() => (button.opacity = HOVER_OPACITY))
    button.onHoverEnd(() => (button.opacity = 1))
    button.onClick(() => k.go('play'))
  })
}
