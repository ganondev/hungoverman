/// <reference types="vite/client" />
import kaplay from 'kaplay'
import { registerEnd } from './scenes/end'
import { registerMenu } from './scenes/menu'
import { registerPlay } from './scenes/play'
import { gallows } from './strikes/gallows'
import { parseWordlist, pickWord, setWordlist } from './words'
import { loadWordlist } from './wordlist'

const k = kaplay({
  width: 960,
  height: 600,
  background: [11, 11, 15],
  pixelDensity: 2,
  global: false,
})

// Kick the fetch/decode off on mount; the menu holds its Start button until
// this settles. On failure we log and fall back to the built-in list rather
// than stranding the button on "Loading...".
const wordlistReady = loadWordlist(`${import.meta.env.BASE_URL}words.gz`)
  .then((text) => setWordlist(parseWordlist(text)))
  .catch((err) => console.error('wordlist failed to load; using the built-in list', err))

registerMenu(k, wordlistReady)
registerPlay(k, gallows, pickWord)
registerEnd(k)
k.go('menu')
