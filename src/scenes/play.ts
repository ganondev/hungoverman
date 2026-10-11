import type { GameObj, KAPLAYCtx } from 'kaplay'
import { guess, newGame, type Game } from '../game'
import { layout, type Slot } from '../layout'
import type { StrikeDisplayFactory } from '../strikes/types'

const PITCH = 32
const GAP = 48
const CELL = 28
const ROW_Y = 300

const KEY_W = 56
const KEY_H = 48
const KEY_PAD = 8
const KEY_Y = 410
const INPUT_DEBOUNCE = 0.2

const KEY_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']

export function registerPlay(
  k: KAPLAYCtx,
  makeDisplay: StrikeDisplayFactory,
  pickWord: () => string,
): void {
  k.scene('play', () => {
    const display = makeDisplay()
    let game = newGame(pickWord(), display.maxStrikes)
    let finished = false

    const strikeSize = { w: 200, h: 220 }
    const strikeAnchor = k.add([k.pos((k.width() - strikeSize.w) / 2, 40)])
    display.mount(k, strikeAnchor, strikeSize)
    display.setStrikes(0)

    const row = k.add([k.pos(0, ROW_Y)])
    row.onDraw(() => drawRow(k, game))

    const keys = new Map<string, GameObj>()
    for (const [rowIdx, letters] of KEY_ROWS.entries()) {
      const rowWidth = letters.length * KEY_W + (letters.length - 1) * KEY_PAD
      const rowX = (k.width() - rowWidth) / 2
      for (const [col, ch] of [...letters].entries()) {
        const key = k.add([
          k.pos(rowX + col * (KEY_W + KEY_PAD), KEY_Y + rowIdx * (KEY_H + KEY_PAD)),
          k.rect(KEY_W, KEY_H, { radius: 6 }),
          k.color(40, 40, 52),
          k.opacity(1),
          k.area(),
        ])
        key.add([
          k.pos(KEY_W / 2, KEY_H / 2),
          k.anchor('center'),
          k.text(ch.toUpperCase(), { size: 22 }),
          k.color(232, 232, 239),
        ])
        key.onClick(() => submit(ch))
        keys.set(ch, key)
      }
    }

    k.onCharInput((ch) => submit(ch))

    let lastInputAt = -Infinity

    function submit(ch: string): void {
      if (finished) return
      const now = k.time()
      if (now - lastInputAt < INPUT_DEBOUNCE) return
      lastInputAt = now

      const next = guess(game, ch)
      if (next === game) return
      game = next

      display.setStrikes(game.strikes)
      const key = keys.get(ch.toLowerCase())
      if (key) key.opacity = 0.3

      if (game.status !== 'playing') {
        finished = true
        display.finish?.(game.status)
        k.wait(1.2, () => k.go('end', game))
      }
    }
  })
}

function drawRow(k: KAPLAYCtx, game: Game): void {
  const runs = layout(game)
  if (runs.length === 0) return

  const width =
    runs.reduce((acc, run) => acc + run.length * PITCH, 0) + (runs.length - 1) * GAP
  let x = (k.width() - width) / 2 + PITCH / 2

  for (const run of runs) {
    for (const slot of run) {
      drawSlot(k, slot, x)
      x += PITCH
    }
    x += GAP
  }
}

function drawSlot(k: KAPLAYCtx, slot: Slot, cx: number): void {
  const ink = k.rgb(232, 232, 239)
  switch (slot.kind) {
    case 'letter':
      k.drawRect({
        pos: k.vec2(cx - CELL / 2, -CELL / 2),
        width: CELL,
        height: CELL,
        fill: false,
        outline: { width: 2, color: ink },
      })
      if (slot.ch !== null) {
        k.drawText({
          text: slot.ch.toUpperCase(),
          size: 22,
          pos: k.vec2(cx, 0),
          anchor: 'center',
          color: ink,
        })
      }
      break
    case 'space':
      k.drawCircle({ pos: k.vec2(cx, CELL / 2 - 3), radius: 3, color: ink })
      break
    case 'start':
    case 'end':
      k.drawText({
        text: slot.kind === 'start' ? '[' : ']',
        size: 30,
        pos: k.vec2(cx, 0),
        anchor: 'center',
        color: ink,
      })
      break
  }
}
