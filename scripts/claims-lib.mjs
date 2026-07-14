// Shared library for the APFYP claim registry.
//
// Consumers: scripts/extract-claims.mjs (harvest), scripts/claim-impact.mjs (stale/queue
// reports), scripts/lint-taxonomy.mjs (E5/E6/E7/W3). Schema: data/claims/README.md.
//
// Design rules mirrored from the registry README:
//   - scripts may only write affected_outputs, original (first-seen), confidence (downward)
//   - human-owned fields (status, reviewed, maker_response, assertable, exceptions,
//     members-after-creation) are never touched here
//   - claim ids are stable: scope:subject:axis:value

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import YAML from "yaml"

export const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
export const CONTENT = path.join(ROOT, "content")
export const DATA = path.join(ROOT, "data")
export const CLAIMS_DIR = path.join(DATA, "claims")
export const LEXICON_FILE = path.join(DATA, "claim-lexicon.yaml")

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// ---------- lexicon ----------

// Returns terms with compiled matchers. Each match string is word-boundary and
// case-insensitive; `pattern` terms derive their value from the matched text
// (e.g. "cone 10" -> "cone-10").
export function loadLexicon() {
  const doc = YAML.parse(fs.readFileSync(LEXICON_FILE, "utf8"))
  return (doc.terms ?? []).map((t) => ({
    value: t.value,
    axis: t.axis,
    dynamicValue: Boolean(t.pattern),
    regex: t.pattern
      ? new RegExp(`\\b(?:${t.pattern})\\b`, "gi")
      : new RegExp(`\\b(?:${(t.match ?? []).map(escapeRe).join("|")})\\b`, "gi"),
    exceptRegexes: (t.except ?? []).map((e) => new RegExp(`\\b${escapeRe(e)}\\b`, "gi")),
  }))
}

export const slugifyValue = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

// ---------- prose classification ----------

// A hit is an assertion unless it is (a) inside a double-quoted store phrase, (b) part of
// a hyphenated tag-name compound (the lexicon's `except` list), or (c) in a sentence that
// carries a hedge cue. Only asserted hits become claims.
const HEDGE_CUES =
  /\b(never|not|isn'?t|aren'?t|won'?t)\s+(asserted|claimed|named|says?|guess(?:ed)?|identified)\b|\bclaims?\b|\btags?\b|\btagged\b|\bnot\s+a\s+claim\b|\bnever\s+a\s+claim\b|\bcan'?t\s+say\b|\bcannot\s+say\b|\balone\s+can'?t\b|\bunclaimed\b|\bunnamed\b|\bunidentified\b|\bambiguous\b|\bunclear\b|\bunknown\b|\buncertain\b|\bwhether\b|\bcould\s+be\b|\bmay\s+be\b|\bmight\s+be\b|\bperhaps\b|\bpossibly\b|\blooks?\s+like\b|\breads?\s+as\b|\breading\s+as\b|\bresembl\w+\b|\bsuggest\w*\b|\bseem\w*\b|\bappear\w*\b|\bas\s+if\b|\bstore(?:'s)?\s+(word|title|phrase|tag|description|copy)\b|\bquoted\b|\bI\s+believe\b|\bif\s+I\s+remember\b|-like\b|\bin\s+an?\s+unidentified\b/i

function quotedRanges(text) {
  const ranges = []
  for (const m of text.matchAll(/"[^"\n]{1,400}"|“[^”\n]{1,400}”/g)) {
    ranges.push([m.index, m.index + m[0].length])
  }
  return ranges
}

function sentenceBounds(text, index) {
  // sentence = span between sentence-ending punctuation (or newline) boundaries
  let start = 0
  for (const m of text.slice(0, index).matchAll(/[.!?]\s|\n/g)) start = m.index + m[0].length
  const endMatch = /[.!?](?=\s)|\n/g
  endMatch.lastIndex = index
  const e = endMatch.exec(text)
  return [start, e ? e.index + 1 : text.length]
}

// Replace wikilinks with display text and strip URLs so scans see only reader-visible prose.
export function stripForScan(body) {
  return body
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?\|([^\]]*)\]\]/g, "$2") // [[target|display]] -> display
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?\]\]/g, "$1") // [[target]] -> target
    .replace(/\]\((https?:)?[^)\s]+\)/g, "]") // markdown link/image URLs
    .replace(/https?:\/\/\S+/g, " ")
}

// Returns [{value, axis, start, end, text, kind}] where kind: asserted | hedged | quoted.
// Longest match wins when terms overlap (e.g. "salt-fired" beats "fired").
export function classifyHits(text, lexicon) {
  const candidates = []
  for (const term of lexicon) {
    const excepted = new Set()
    for (const ex of term.exceptRegexes) {
      ex.lastIndex = 0
      for (const m of text.matchAll(ex)) {
        for (let i = m.index; i < m.index + m[0].length; i++) excepted.add(i)
      }
    }
    term.regex.lastIndex = 0
    for (const m of text.matchAll(term.regex)) {
      if (excepted.has(m.index)) continue
      candidates.push({
        value: term.dynamicValue ? slugifyValue(m[0]) : term.value,
        axis: term.axis,
        start: m.index,
        end: m.index + m[0].length,
        text: m[0],
      })
    }
  }
  candidates.sort((a, b) => a.start - b.start || b.end - a.end)
  const hits = []
  let coveredTo = -1
  for (const c of candidates) {
    if (c.start < coveredTo) continue // shorter/later overlap of a kept match
    coveredTo = c.end
    hits.push(c)
  }
  const quoted = quotedRanges(text)
  for (const h of hits) {
    if (quoted.some(([s, e]) => h.start >= s && h.end <= e)) {
      h.kind = "quoted"
      continue
    }
    const [s, e] = sentenceBounds(text, h.start)
    h.sentence = text.slice(s, e).replace(/\s+/g, " ").trim()
    h.kind = HEDGE_CUES.test(h.sentence) ? "hedged" : "asserted"
  }
  return hits
}

// ---------- content scan ----------

// Loads every content page with parsed frontmatter and scan-ready fields.
export function loadContent() {
  const pages = []
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) walk(full)
      else if (e.name.endsWith(".md")) {
        const rel = path.relative(CONTENT, full).replace(/\\/g, "/")
        const text = fs.readFileSync(full, "utf8")
        const fmMatch = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)
        let fm = {}
        try {
          fm = fmMatch ? (YAML.parse(fmMatch[1]) ?? {}) : {}
        } catch {
          fm = {}
        }
        const body = fmMatch ? text.slice(fmMatch[0].length) : text
        const pieceMatch = /^pieces\/(\d+)\.md$/.exec(rel)
        pages.push({
          rel,
          file: full,
          slug: path.basename(rel, ".md"),
          kind: pieceMatch
            ? "piece"
            : rel.startsWith("ranges/") && rel !== "ranges/index.md"
              ? "range"
              : rel.startsWith("techniques/") && rel !== "techniques/index.md"
                ? "technique"
                : "other",
          pieceNumber: pieceMatch ? Number(pieceMatch[1]) : null,
          fm,
          title: typeof fm.title === "string" ? fm.title : "",
          description: typeof fm.description === "string" ? fm.description : "",
          tags: Array.isArray(fm.tags) ? fm.tags.filter((t) => typeof t === "string") : [],
          body,
        })
      }
    }
  }
  walk(CONTENT)
  return pages
}

// Piece numbers wikilinked from a page body ("[[2236]]", "[[2236|piece 2236]]").
export function linkedPieces(body) {
  const nums = new Set()
  for (const m of body.matchAll(/\[\[(\d{1,5})(?:\|[^\]]*)?\]\]/g)) nums.add(Number(m[1]))
  return nums
}

// ---------- members grammar (same as docs/taxonomy.md cells) ----------

export function parseMembers(cell) {
  const nums = new Set()
  if (!cell) return nums
  const s = String(cell)
  for (const r of s.matchAll(/(\d{1,5})\s*[–-]\s*(\d{1,5})/g)) {
    for (let i = Number(r[1]); i <= Number(r[2]); i++) nums.add(i)
  }
  for (const m of s.replace(/(\d{1,5})\s*[–-]\s*(\d{1,5})/g, "").matchAll(/\b(\d{1,5})\b/g))
    nums.add(Number(m[1]))
  return nums
}

export function formatMembers(numbers) {
  const sorted = [...numbers].sort((a, b) => a - b)
  const parts = []
  for (let i = 0; i < sorted.length; ) {
    let j = i
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++
    parts.push(j > i + 1 ? `${sorted[i]}-${sorted[j]}` : sorted.slice(i, j + 1).join(", "))
    i = j + 1
  }
  return parts.join(", ")
}

// ---------- tag -> claim mapping (inference axes only) ----------

const TAG_CLAIM_TABLE = {
  "technique/handbuilt": { axis: "forming", value: "handbuilt" },
  "technique/kurinuki": { axis: "forming", value: "kurinuki" },
  "material/wild-clay": { axis: "clay-body", value: "wild-clay" },
  "material/wild-clay-slip": { axis: "surface-material", value: "wild-clay-slip" },
  "process/cone-10": { axis: "firing", value: "cone-10" },
}
const TAG_AXIS_FALLBACK = {
  technique: "forming",
  material: "clay-body",
  process: "firing",
}

// Returns {axis, value} for tags that assert making facts; null for visual/batch axes.
export function tagToClaim(tag) {
  if (TAG_CLAIM_TABLE[tag]) return TAG_CLAIM_TABLE[tag]
  const [prefix, ...rest] = tag.split("/")
  if (TAG_AXIS_FALLBACK[prefix] && rest.length)
    return { axis: TAG_AXIS_FALLBACK[prefix], value: rest.join("/") }
  return null
}

// ---------- registry I/O ----------

const FIELD_ORDER = [
  "id",
  "claim",
  "subject",
  "scope",
  "members",
  "axis",
  "value",
  "original",
  "status",
  "corrected_value",
  "superseded",
  "source",
  "confidence",
  "maker_response",
  "reviewed",
  "assertable",
  "private_ref",
  "exceptions",
  "avoid_terms",
  "affected_outputs",
]

export function loadRegistry() {
  const records = new Map()
  if (!fs.existsSync(CLAIMS_DIR)) return records
  for (const name of fs.readdirSync(CLAIMS_DIR).sort()) {
    if (!name.endsWith(".yaml")) continue
    const parsed = YAML.parse(fs.readFileSync(path.join(CLAIMS_DIR, name), "utf8"))
    for (const rec of parsed ?? []) {
      if (!rec || !rec.id) continue
      if (records.has(rec.id))
        throw new Error(`duplicate claim id ${rec.id} (in ${name} and an earlier shard)`)
      records.set(rec.id, rec)
    }
  }
  return records
}

const BANNER =
  "# APFYP claim registry — schema: data/claims/README.md\n" +
  "# Machine-rewritten by scripts/extract-claims.mjs --write; comments do not survive.\n"

function orderRecord(rec) {
  const out = {}
  for (const k of FIELD_ORDER) if (k in rec) out[k] = rec[k]
  for (const k of Object.keys(rec)) if (!(k in out)) out[k] = rec[k]
  return out
}

export function pieceShardName(pieceNumber) {
  return `pieces-${String(Math.floor(pieceNumber / 100) * 100).padStart(4, "0")}.yaml`
}

// Writes the registry back: groups.yaml + per-100-block piece shards, sorted by id.
// Returns the list of files written or removed-from (for reporting).
export function saveRegistry(records) {
  const byFile = new Map()
  for (const rec of records.values()) {
    const file = rec.scope === "piece" ? pieceShardName(Number(rec.subject)) : "groups.yaml"
    if (!byFile.has(file)) byFile.set(file, [])
    byFile.get(file).push(rec)
  }
  fs.mkdirSync(CLAIMS_DIR, { recursive: true })
  const written = []
  const expected = new Set(byFile.keys())
  for (const [file, recs] of [...byFile.entries()].sort()) {
    recs.sort((a, b) => a.id.localeCompare(b.id))
    const body = YAML.stringify(recs.map(orderRecord), { nullStr: "", lineWidth: 0 })
    fs.writeFileSync(path.join(CLAIMS_DIR, file), BANNER + "\n" + body)
    written.push(file)
  }
  // never delete shard files implicitly; an emptied shard is rewritten as banner-only
  for (const name of fs.readdirSync(CLAIMS_DIR)) {
    if (name.endsWith(".yaml") && !expected.has(name)) {
      fs.writeFileSync(path.join(CLAIMS_DIR, name), BANNER + "\n[]\n")
      written.push(name)
    }
  }
  return written
}

// ---------- scope resolution ----------

function covers(rec, pieceNumber) {
  if (rec.scope === "piece") return Number(rec.subject) === pieceNumber
  const members = parseMembers(rec.members)
  if (!members.has(pieceNumber)) return false
  const exceptions = new Set(
    (Array.isArray(rec.exceptions) ? rec.exceptions : []).map((e) => Number(e)),
  )
  return !exceptions.has(pieceNumber)
}

// All records covering a piece, and per axis:value the single effective winner.
// Precedence: piece scope > group scope; maker-reviewed > unreviewed; smaller group >
// larger group; later reviewed date wins remaining ties.
export function effectiveClaims(records, pieceNumber) {
  const covering = [...records.values()].filter((r) => covers(r, pieceNumber))
  const byKey = new Map()
  for (const rec of covering) {
    const key = `${rec.axis}:${rec.value}`
    const cur = byKey.get(key)
    if (!cur || wins(rec, cur, pieceNumber)) byKey.set(key, rec)
  }
  return { covering, effective: byKey }
}

function wins(a, b) {
  const scopeRank = (r) => (r.scope === "piece" ? 0 : 1)
  if (scopeRank(a) !== scopeRank(b)) return scopeRank(a) < scopeRank(b)
  const reviewedRank = (r) => (r.reviewed ? 0 : 1)
  if (reviewedRank(a) !== reviewedRank(b)) return reviewedRank(a) < reviewedRank(b)
  const sizeRank = (r) => (r.scope === "group" ? parseMembers(r.members).size : 0)
  if (sizeRank(a) !== sizeRank(b)) return sizeRank(a) < sizeRank(b)
  return String(a.reviewed ?? "") > String(b.reviewed ?? "")
}

// The slug a group record uses for a range/technique/other page (mirrors extract-claims).
export function pageSubjectSlug(page) {
  if (page.kind === "range" || page.kind === "technique") return page.slug
  return page.rel.replace(/\.md$/, "").replace(/\//g, "-")
}

// Records that govern a page's assertions: piece pages resolve by scope; range/technique/
// other pages resolve by subject slug.
export function coveringRecordsForPage(records, page) {
  if (page.kind === "piece") return effectiveClaims(records, page.pieceNumber).covering
  const slug = pageSubjectSlug(page)
  return [...records.values()].filter((r) => r.scope === "group" && r.subject === slug)
}

// ---------- enforcement helpers (shared by lint + claim-impact) ----------

const escapeReLit = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// The words a ruling forbids on covered pages: the value itself (for rejected/never-use/
// corrected) plus every avoid_term.
export function bannedTerms(rec) {
  const words = new Set(rec.avoid_terms ?? [])
  if (["rejected", "never-use", "corrected"].includes(rec.status)) words.add(rec.value)
  return words
}

// Does a page fragment ("title" | "description" | "tags" | "body") still assert any word a
// ruling forbids? Reuses asserted-hit classification; also matches avoid_terms that aren't
// lexicon values (e.g. "carbon-smoke") as word-boundary substrings.
export function fragmentAssertsBanned(page, fragment, rec, lexicon) {
  const banned = bannedTerms(rec)
  if (banned.size === 0) return false
  if (fragment === "tags") return page.tags.some((t) => banned.has(t.split("/").pop()))
  const text =
    fragment === "title"
      ? page.title
      : fragment === "description"
        ? page.description
        : stripForScan(page.body)
  for (const hit of classifyHits(text, lexicon))
    if (hit.kind === "asserted" && banned.has(hit.value)) return true
  const lower = text.toLowerCase()
  for (const w of rec.avoid_terms ?? [])
    if (new RegExp(`\\b${escapeReLit(w.toLowerCase())}\\b`).test(lower)) return true
  return false
}
