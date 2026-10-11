/**
 * Decoder for the artifact produced by `tools/pack-wordlist.mjs`.
 *
 * The payload inside the gzip stream is *front-coded*: each word is stored as
 * (number of bytes shared with the previous word) + (the remaining suffix) +
 * `\n`. Because the source list is alphabetically sorted, adjacent words share
 * long prefixes, so this removes most of the redundancy before DEFLATE ever
 * runs. Reconstructing is a single pass and costs nothing at runtime.
 *
 * Everything here is vanilla web-platform JS: `DecompressionStream('gzip')`,
 * `fetch`, `TextDecoder`. No libraries.
 */
const NEWLINE = 0x0a

/** Decode a front-coded byte stream back into the original newline-delimited text. */
export function decodeWordlistBytes(bytes: Uint8Array): string {
  const words: Uint8Array[] = []
  let prev = new Uint8Array(0)
  let i = 0
  while (i < bytes.length) {
    const shared = bytes[i++]
    let end = i
    while (end < bytes.length && bytes[end] !== NEWLINE) end++
    const suffix = bytes.subarray(i, end)
    const word = new Uint8Array(shared + suffix.length)
    word.set(prev.subarray(0, shared), 0)
    word.set(suffix, shared)
    words.push(word)
    prev = word
    i = end + 1
  }

  let total = 0
  for (const w of words) total += w.length + 1
  const out = new Uint8Array(total)
  let o = 0
  for (const w of words) {
    out.set(w, o)
    o += w.length
    out[o++] = NEWLINE
  }
  return new TextDecoder().decode(out)
}

/** Fetch `url` and return the reconstructed wordlist text.
 *
 * Some dev/static servers mark a `.gz` file with `Content-Encoding: gzip`, so the
 * browser transparently decompresses it and `fetch` yields the raw payload. Others
 * serve the gzip bytes untouched. Sniffing the gzip magic handles both. */
export async function loadWordlist(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`failed to fetch ${url}: ${res.status} ${res.statusText}`)
  let bytes = new Uint8Array(await res.arrayBuffer())
  if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
    const gunzipped = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
    bytes = new Uint8Array(await new Response(gunzipped).arrayBuffer())
  }
  return decodeWordlistBytes(bytes)
}
