import type { KAPLAYCtx } from 'kaplay'

/** Menu chrome rests a step back from the ink, matching the play scene's keys. */
const INK: [number, number, number] = [232, 232, 239]
const BTN_BG: [number, number, number] = [40, 40, 52]

const BTN_W = 220
const BTN_H = 56
const BTN_Y = 320
const HOVER_OPACITY = 0.8
const LOADING_OPACITY = 0.5

export function registerMenu(k: KAPLAYCtx, wordlistReady: Promise<void>): void {
  k.scene('menu', () => {
    const cx = k.width() / 2

    k.add([k.pos(cx, 200), k.anchor('center'), k.text('Hungoverman', { size: 48 }), k.color(...INK)])

    const button = k.add([
      k.pos(cx - BTN_W / 2, BTN_Y),
      k.rect(BTN_W, BTN_H, { radius: 8 }),
      k.color(...BTN_BG),
      k.opacity(LOADING_OPACITY),
      k.area(),
    ])
    const label = button.add([
      k.pos(BTN_W / 2, BTN_H / 2),
      k.anchor('center'),
      k.text('Loading...', { size: 24 }),
      k.color(...INK),
      k.opacity(LOADING_OPACITY),
    ])

    // Start is dead until the wordlist resolves, so the first click can never
    // build a round from an empty pool. Until then the button reads
    // "Loading..." and stays dimmed.
    let ready = false

    wordlistReady.then(() => {
      if (!button.exists()) return // menu was left before the list landed
      ready = true
      label.text = 'Start'
      button.opacity = 1
      label.opacity = 1
    })

    button.onHover(() => {
      if (ready) button.opacity = HOVER_OPACITY
    })
    button.onHoverEnd(() => (button.opacity = ready ? 1 : LOADING_OPACITY))
    button.onClick(() => {
      if (ready) k.go('play')
    })
  })
}
