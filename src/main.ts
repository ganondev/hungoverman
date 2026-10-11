import kaplay from 'kaplay'
import { registerEnd } from './scenes/end'
import { registerPlay } from './scenes/play'
import { gallows } from './strikes/gallows'
import { pickWord } from './words'

const k = kaplay({
  width: 960,
  height: 600,
  background: [11, 11, 15],
  global: false,
})

registerPlay(k, gallows, pickWord)
registerEnd(k)
k.go('play')
