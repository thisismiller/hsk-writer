#!/usr/bin/env node
// Build-time script: extract CC-CEDICT data into a compact JSON file
// that the browser can lazy-load on first dictionary lookup.
//
// Output: public/dict/cedict.json
// Format: { "simplified": [{ "p": "pinyin", "e": ["def1", ...] }, ...], ... }
//
// Filters applied to keep the file practical:
//   - Words 1–4 characters (covers all HSK vocabulary)
//   - Must contain at least one CJK character (U+4E00–U+9FFF)
//   - Non-variant entries only
//   - Max 3 English definitions per entry

import cedict from 'cc-cedict'
import { mkdirSync, writeFileSync } from 'fs'

const { all, simplified } = cedict.data
const CJK = /[\u4e00-\u9fff]/
const lookup = {}

for (const [word, pinyinMap] of Object.entries(simplified)) {
  const chars = [...word]
  if (chars.length > 4) continue
  if (!CJK.test(word)) continue

  const entries = []

  for (const pinyinPair of Object.values(pinyinMap)) {
    // pinyinPair[0] = Uint32Array of base (non-variant) indices
    const baseIndices = pinyinPair[0]
    for (const idx of baseIndices) {
      const row = all[idx]
      if (!row) continue
      // row: [traditional, simplified, pinyin, english, classifiers, variant_of]
      if (row[5] && row[5].length > 0) continue  // skip variants
      const english = typeof row[3] === 'string' ? [row[3]] : row[3]
      if (!english || english.length === 0) continue
      entries.push({ p: row[2], e: english.slice(0, 3) })
    }
  }

  if (entries.length > 0) {
    lookup[word] = entries
  }
}

mkdirSync('public/dict', { recursive: true })
writeFileSync('public/dict/cedict.json', JSON.stringify(lookup))

const entryCount = Object.keys(lookup).length
const sizeKB = Math.round(Buffer.byteLength(JSON.stringify(lookup)) / 1024)
console.log(`cedict.json: ${entryCount.toLocaleString()} entries, ${sizeKB.toLocaleString()} KB`)
