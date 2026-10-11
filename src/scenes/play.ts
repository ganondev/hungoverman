import type { GameObj, KAPLAYCtx } from 'kaplay'
import { guess, newGame, type Game } from '../game'
import { layout, type Run, type Slot } from '../layout'
import type { StrikeDisplayFactory } from '../strikes/types'

const PITCH = 32
const GAP = 48
const CELL = 28
const UNDERLINE_W = 3
const ROW_Y = 300

/** Structural marks sit a step back from the ink, so letters stay the focus. */
const INK: [number, number, number] = [232, 232, 239]
const DIM: [number, number, number] = [120, 120, 136]

/** Blank underlines are plucked on a slow cycle: pulled taut, then released. */
const PULSE_PERIOD = 2.2 // seconds between plucks
const PULSE_PULL = 0.18 // seconds spent drawing the band taut
const PULSE_REST = 0.78 // idle length, as a fraction of the cell width
const PULSE_FREQ = 2.2 // ring rate, Hz
const PULSE_DECAY = 4 // how fast the ring dies down

/** Brackets ride the same envelope, as travel: how far they swing at taut. */
const BRACKET_TRAVEL = 5

/** Dots bridging an unrevealed gap between runs. */
const GAP_DOT_R = 1.5
const GAP_DOT_STEP = 8

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

  // A visible space abutting a boundary is known content, not a hole, so the
  // run gap is not stacked on top of its column. That keeps the space dot one
  // column from the following run whichever side its visible neighbour is on
  // (a space with hidden cells on its right is a run's last slot, and the same
  // space with hidden cells on its left is a run's first slot). The gap is left
  // to mean "hidden cells only".
  const gaps: number[] = runs.slice(1).map((run, i) => (isHole(runs[i], run) ? GAP : 0))

  const width =
    runs.reduce((acc, run) => acc + run.length * PITCH, 0) +
    gaps.reduce((acc, gap) => acc + gap, 0)

  let x = (k.width() - width) / 2 + PITCH / 2
  let prevEnd = -1 // centre of the previous run's last slot

  runs.forEach((run, i) => {
    if (i > 0 && gaps[i - 1] > 0) drawBridge(k, prevEnd + CELL / 2, x - CELL / 2)
    for (const slot of run) {
      drawSlot(k, slot, x, now)
      x += PITCH
    }
    prevEnd = x - PITCH
    if (i < runs.length - 1) x += gaps[i]
  })
}

/**
 * True when the boundary between two runs is a hole in the line — i.e. the
 * only thing between them is hidden cells. A visible space on either edge means
 * the boundary is a joint instead, and joints are not bridged.
 */
function isHole(prev: Run, next: Run): boolean {
  return prev[prev.length - 1].kind !== 'space' && next[0].kind !== 'space'
}

/**
 * Dots spanning the dead space between two runs. The span is fixed, so it
 * carries no information about how many cells are still hidden.
 */
function drawBridge(k: KAPLAYCtx, from: number, to: number): void {
  const count = Math.floor((to - from) / GAP_DOT_STEP)
  const start = (from + to) / 2 - ((count - 1) * GAP_DOT_STEP) / 2
  for (let i = 0; i < count; i++) {
    k.drawCircle({
      pos: k.vec2(start + i * GAP_DOT_STEP, CELL / 2),
      radius: GAP_DOT_R,
      color: k.rgb(...DIM),
    })
  }
}

function drawSlot(k: KAPLAYCtx, slot: Slot, cx: number, now: number): void {
  const ink = k.rgb(...INK)
  switch (slot.kind) {
    case 'letter': {
      // A blank slot is scaffolding: dim, and pulled taut and released on a
      // slow cycle. A solved one keeps the ink and a steady full-length rule.
      const blank = slot.ch === null
      const half = (CELL * (blank ? pluck(now) : 1)) / 2
      k.drawLine({
        p1: k.vec2(cx - half, CELL / 2),
        p2: k.vec2(cx + half, CELL / 2),
        width: UNDERLINE_W,
        color: blank ? k.rgb(...DIM) : ink,
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
      k.drawCircle({ pos: k.vec2(cx, CELL / 2 - 3), radius: 3, color: k.rgb(...DIM) })
      break
    case 'start':
    case 'end': {
      // The bracket rides the pluck envelope as travel rather than scale, so
      // the word breathes outward instead of the glyph growing.
      const dir = slot.kind === 'start' ? -1 : 1
      k.drawText({
        text: slot.kind === 'start' ? '[' : ']',
        size: 30,
        pos: k.vec2(cx + dir * BRACKET_TRAVEL * pluckSwing(now), 0),
        anchor: 'center',
        color: k.rgb(...DIM),
      })
      break
    }
  }
}

/**
 * Pluck envelope in [-1, 1]: 0 at rest, rising to 1 as the band is drawn taut,
 * then a damped rebound through negative values. The rebound is ceilinged at 1
 * by construction, so a stretched slot never reaches its neighbour.
 */
function pluckSwing(now: number): number {
  const phase = now % PULSE_PERIOD

  if (phase < PULSE_PULL) {
    const pull = phase / PULSE_PULL
    return 1 - (1 - pull) ** 3
  }

  const ring = phase - PULSE_PULL
  return Math.cos(2 * Math.PI * PULSE_FREQ * ring) * Math.exp(-PULSE_DECAY * ring)
}

/** Length of a blank underline as a fraction of the cell width. */
function pluck(now: number): number {
  return PULSE_REST + (1 - PULSE_REST) * pluckSwing(now)
}
