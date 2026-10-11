import type { GameObj, KAPLAYCtx } from 'kaplay'
import { guess, newGame, type Game } from '../game'
import { layout, type Slot } from '../layout'
import type { StrikeDisplayFactory } from '../strikes/types'

const PITCH = 32
const GAP = 48
const CELL = 28
const UNDERLINE_W = 3
const ROW_Y = 300

/** Blank underlines are plucked on a slow cycle: pulled taut, then released. */
const PULSE_PERIOD = 2.2 // seconds between plucks
const PULSE_PULL = 0.18 // seconds spent drawing the band taut
const PULSE_REST = 0.78 // idle length, as a fraction of the cell width
const PULSE_FREQ = 2.2 // ring rate, Hz
const PULSE_DECAY = 4 // how fast the ring dies down

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
  const now = k.time()

  // Nothing is visible yet: a lone blank slot stands in so the stage never
  // reads as an empty screen. It is always exactly one slot, so it reveals
  // nothing about the length of the phrase.
  if (runs.length === 0) {
    drawSlot(k, { kind: 'letter', ch: null }, k.width() / 2, now)
    return
  }

  const width =
    runs.reduce((acc, run) => acc + run.length * PITCH, 0) + (runs.length - 1) * GAP
  let x = (k.width() - width) / 2 + PITCH / 2

  for (const run of runs) {
    for (const slot of run) {
      drawSlot(k, slot, x, now)
      x += PITCH
    }
    x += GAP
  }
}

function drawSlot(k: KAPLAYCtx, slot: Slot, cx: number, now: number): void {
  const ink = k.rgb(232, 232, 239)
  switch (slot.kind) {
    case 'letter': {
      // A blank slot is pulled taut and released on a slow cycle; a solved one
      // holds a steady full-length rule.
      const half = (CELL * (slot.ch === null ? pluck(now) : 1)) / 2
      k.drawLine({
        p1: k.vec2(cx - half, CELL / 2),
        p2: k.vec2(cx + half, CELL / 2),
        width: UNDERLINE_W,
        color: ink,
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
    }
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

/**
 * Length of a blank underline as a fraction of the cell width. The cycle is a
 * slow pull out to taut, then a small damped rebound as the band is released,
 * then rest until the next pluck. The rebound is ceilinged at 1 by
 * construction, so a stretched slot never reaches its neighbour.
 */
function pluck(now: number): number {
  const swing = 1 - PULSE_REST
  const phase = now % PULSE_PERIOD

  if (phase < PULSE_PULL) {
    const pull = phase / PULSE_PULL
    return PULSE_REST + swing * (1 - (1 - pull) ** 3)
  }

  const ring = phase - PULSE_PULL
  const decay = Math.exp(-PULSE_DECAY * ring)
  return PULSE_REST + swing * Math.cos(2 * Math.PI * PULSE_FREQ * ring) * decay
}
