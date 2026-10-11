import type { StrikeDisplay } from './types'

export function gallows(): StrikeDisplay {
  let strikes = 0

  return {
    maxStrikes: 6,

    mount(k, parent, { w, h }) {
      const ink = k.rgb(232, 232, 239)
      const stroke = 4
      const line = (x1: number, y1: number, x2: number, y2: number): void =>
        k.drawLine({ p1: k.vec2(x1, y1), p2: k.vec2(x2, y2), width: stroke, color: ink })

      const baseY = h - stroke
      const topY = stroke
      const postX = w * 0.25
      const beamX = w * 0.72
      const ropeEnd = topY + h * 0.12
      const headR = w * 0.09
      const headY = ropeEnd + headR
      const bodyTop = headY + headR
      const bodyBot = bodyTop + h * 0.28
      const limb = h * 0.18

      const stages: Array<() => void> = [
        () => {
          line(postX - w * 0.2, baseY, postX + w * 0.2, baseY)
          line(postX, baseY, postX, topY)
        },
        () => {
          line(postX, topY, beamX, topY)
          line(postX, topY + h * 0.14, postX + w * 0.14, topY)
        },
        () => line(beamX, topY, beamX, ropeEnd),
        () =>
          k.drawCircle({
            pos: k.vec2(beamX, headY),
            radius: headR,
            fill: false,
            outline: { width: stroke, color: ink },
          }),
        () => line(beamX, bodyTop, beamX, bodyBot),
        () => {
          const armY = bodyTop + h * 0.08
          line(beamX, armY, beamX - limb * 0.7, armY + limb * 0.6)
          line(beamX, armY, beamX + limb * 0.7, armY + limb * 0.6)
          line(beamX, bodyBot, beamX - limb * 0.6, bodyBot + limb)
          line(beamX, bodyBot, beamX + limb * 0.6, bodyBot + limb)
        },
      ]

      const g = parent.add([])
      g.onDraw(() => {
        for (let i = 0; i < Math.min(strikes, stages.length); i++) stages[i]()
      })
    },

    setStrikes(n) {
      strikes = n
    },
  }
}
