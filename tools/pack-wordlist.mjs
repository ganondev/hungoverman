// Pack a newline-delimited wordlist into the smallest gzip artifact that
// vanilla browser JS can decode:
//   source text  --front-code-->  bytes  --gzip-->  public/words.gz
//
// Front-coding replaces each word with (shared-prefix-length with the previous
// word, remaining suffix, '\n'). On an alphabetically sorted list this removes
// most of the redundancy *before* gzip sees it, which matters because DEFLATE
// only has a 32 KiB window and order-0 Huffman.
//
// Usage: node tools/pack-wordlist.mjs [source] [out]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { gzipSync, gunzipSync, constants } from 'node:zlib'
import { dirname } from 'node:path'
import { createHash } from 'node:crypto'

const SRC = process.argv[2] ?? '/usr/share/dict/american-english'
const OUT = process.argv[3] ?? 'public/words.gz'
const NL = 0x0a

const raw = readFileSync(SRC)

/** @param {Uint8Array} buf */
function frontCode(buf) {
  const words = []
  let start = 0
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === NL) { words.push(buf.subarray(start, i)); start = i + 1 }
  }
  if (start < buf.length) words.push(buf.subarray(start)) // no trailing newline

  const out = Buffer.alloc(buf.length) // prefix byte adds 1/word, suffix removes >=1
  let o = 0
  let prev = new Uint8Array(0)
  for (const w of words) {
    const m = Math.min(prev.length, w.length)
    let c = 0
    while (c < m && prev[c] === w[c]) c++
    if (c > 255) throw new Error('shared-prefix length exceeds one byte')
    out[o++] = c
    out.set(w.subarray(c), o); o += w.length - c
    out[o++] = NL
    prev = w
  }
  return out.subarray(0, o)
}

const packed = frontCode(raw)

const variants = {
  'gzip -9 (default)': gzipSync(packed, { level: 9 }),
  'gzip -9 filtered': gzipSync(packed, { level: 9, memLevel: 7, strategy: constants.Z_FILTERED }),
}
const [label, gz] = Object.entries(variants).sort((a, b) => a[1].length - b[1].length)[0]

const plain = gzipSync(raw, { level: 9 })

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, gz)

// Verify losslessness by round-tripping back to the exact source bytes.
const restored = frontDecode(gunzipSync(gz))
const ok = Buffer.compare(Buffer.from(restored), raw) === 0

/** @param {Buffer} bytes @returns {Buffer} */
function frontDecode(bytes) {
  const out = []
  let prev = Buffer.alloc(0)
  let i = 0
  while (i < bytes.length) {
    const c = bytes[i++]
    let j = i
    while (j < bytes.length && bytes[j] !== NL) j++
    const suffix = bytes.subarray(i, j)
    const word = Buffer.alloc(c + suffix.length)
    prev.copy(word, 0, 0, c)
    suffix.copy(word, c)
    out.push(word)
    prev = word
    i = j + 1
  }
  return Buffer.concat(out.flatMap((w, k) => (k ? [Buffer.from('\n'), w] : [w])).concat([Buffer.from('\n')]))
}

const sha = b => createHash('sha256').update(b).digest('hex').slice(0, 16)
const f = n => n.toLocaleString('en-US').padStart(9)
console.log(`source            ${f(raw.length)} B  sha256:${sha(raw)}`)
console.log(`front-coded       ${f(packed.length)} B  (${(packed.length / raw.length * 100).toFixed(1)}% of source)`)
console.log(`plain gzip -9     ${f(plain.length)} B  (${(plain.length / raw.length * 100).toFixed(1)}%)`)
console.log(`-> ${OUT}  ${f(gz.length)} B  (${(gz.length / raw.length * 100).toFixed(1)}%)  [${label}]`)
console.log(`round-trip exact: ${ok ? 'YES' : 'NO'}  sha256:${sha(restored)}`)
if (!ok) process.exit(1)
