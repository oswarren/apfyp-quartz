// Deterministic Shopify CDN image fetcher/cacher for APFYP ingest runs.
//
// Usage:
//   node scripts/fetch-piece-images.mjs <survey.json> --out <dir> [--pieces A-B] [--force]
//
// Reads a `generate-pieces.mjs --json` report and downloads every image of
// every QUALIFIED piece (optionally limited to --pieces A-B) into
// <dir>/<piece>/<position>.<ext>, recording provenance in <dir>/index.json:
// source URL, content sha256, byte size, image position, fetch date, status.
//
// Download and bookkeeping only — no visual interpretation happens here.
// Properties the ingest workflow relies on:
//   - already-cached files whose hash matches the index are skipped (resumable)
//   - index.json is a MERGE across runs: entries for pieces outside the
//     current selection are carried forward, so provenance and cross-run
//     duplicate detection survive --pieces subset runs
//   - byte-identical duplicates across everything indexed are detected and
//     reported (a photo of one piece reused on another piece's listing is an
//     editorial problem the visual-review stage must see — batch-19 hit this)
//   - only https://cdn.shopify.com/ URLs are fetched; anything else in the
//     report is recorded as FAILED, never downloaded
//   - any missing/undownloadable/non-image file is recorded as FAILED and the
//     script exits 1; nothing is silently skipped
//   - the output dir must be OUTSIDE this repository: the cache belongs to the
//     private vault (.raw/ingest-runs/<slug>/images/), and listing photos must
//     never enter public git history as local files
//
// --force re-downloads the current selection, ignoring the existing cache.

import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const CDN_PREFIX = "https://cdn.shopify.com/"

// ---------- CLI ----------

const args = process.argv.slice(2)
function flagValue(name) {
  const i = args.indexOf(name)
  if (i === -1) return null
  const v = args[i + 1]
  if (!v || v.startsWith("--")) {
    console.error(`${name} needs a value`)
    process.exit(1)
  }
  return v
}
const outDir = flagValue("--out")
const piecesArg = flagValue("--pieces")
const force = args.includes("--force")
const surveyPath = args.find(
  (a, i) => !a.startsWith("--") && args[i - 1] !== "--out" && args[i - 1] !== "--pieces",
)

if (!surveyPath || !outDir) {
  console.error(
    "usage: node scripts/fetch-piece-images.mjs <survey.json> --out <dir> [--pieces A-B] [--force]",
  )
  process.exit(1)
}
// Anti-accident guard (case-insensitive on Windows): the image cache is
// private vault material and must never land inside the public repo.
function insideRepo(p) {
  const norm = (x) => (process.platform === "win32" ? path.resolve(x).toLowerCase() : path.resolve(x))
  const rel = path.relative(norm(REPO_ROOT), norm(p))
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel))
}
if (insideRepo(outDir)) {
  console.error(`refusing to write inside the public repo (${REPO_ROOT}) — use the vault's run dir`)
  process.exit(1)
}
let range = null
if (piecesArg) {
  const m = /^(\d+)-(\d+)$/.exec(piecesArg)
  if (!m || Number(m[1]) > Number(m[2])) {
    console.error(`--pieces must look like 2281-2289, got: ${piecesArg}`)
    process.exit(1)
  }
  range = { lo: Number(m[1]), hi: Number(m[2]) }
}

// ---------- select work ----------

const survey = JSON.parse(fs.readFileSync(surveyPath, "utf8"))
if (survey.schema !== "apfyp-generate-pieces/1") {
  console.error(`unexpected survey schema: ${survey.schema ?? "none"}`)
  process.exit(1)
}
const targets = survey.pieces.filter(
  (p) => p.qualified && (!range || (p.n >= range.lo && p.n <= range.hi)),
)
const work = targets.flatMap((p) => p.images.map((img) => ({ n: p.n, ...img })))
if (work.length === 0) {
  console.error("no qualified images selected — nothing to do")
  process.exit(1)
}

// ---------- cache index ----------

const indexPath = path.join(outDir, "index.json")
const prior = new Map() // "n:position" -> entry
if (fs.existsSync(indexPath)) {
  for (const e of JSON.parse(fs.readFileSync(indexPath, "utf8")).entries ?? []) {
    prior.set(`${e.piece}:${e.position}`, e)
  }
}

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex")
}

// Magic-byte check: a "downloaded image" that isn't one is a failure, not data.
function looksLikeImage(buf) {
  if (buf.length < 12) return false
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true // JPEG
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return true // PNG
  if (
    buf.subarray(0, 4).toString("latin1") === "RIFF" &&
    buf.subarray(8, 12).toString("latin1") === "WEBP"
  )
    return true // WebP
  if (["GIF87a", "GIF89a"].includes(buf.subarray(0, 6).toString("latin1"))) return true // GIF
  // ISO-BMFF: accept still-image brands only, not arbitrary containers (mp4/mov)
  if (buf.subarray(4, 8).toString("latin1") === "ftyp") {
    const brand = buf.subarray(8, 12).toString("latin1")
    return ["avif", "avis", "heic", "heix", "mif1", "msf1"].includes(brand)
  }
  return false
}

function extOf(url) {
  const m = /\.(jpe?g|png|webp|gif|avif)(?:$|\?)/i.exec(new URL(url).pathname + "?")
  return m ? `.${m[1].toLowerCase()}` : ".img"
}

async function fetchBytes(url) {
  let lastErr
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return Buffer.from(await res.arrayBuffer())
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr
}

// ---------- run ----------

const entries = []
let fetched = 0
let cached = 0
let failed = 0

for (const img of work) {
  const key = `${img.n}:${img.position}`
  const file = `${img.n}/${img.position}${extOf(img.src)}` // forward slashes: portable index key
  const abs = path.join(outDir, String(img.n), `${img.position}${extOf(img.src)}`)
  const entry = {
    piece: img.n,
    position: img.position,
    url: img.src,
    alt: img.alt,
    file,
    sha256: null,
    bytes: null,
    fetched_at: null,
    status: null,
  }
  entries.push(entry)

  if (!img.src.startsWith(CDN_PREFIX)) {
    Object.assign(entry, { status: "failed", error: `refused: non-Shopify-CDN URL` })
    failed++
    console.error(`FAILED #${img.n} position ${img.position}: non-Shopify-CDN URL refused\n  ${img.src}`)
    continue
  }

  const priorEntry = prior.get(key)
  if (!force && fs.existsSync(abs)) {
    const buf = fs.readFileSync(abs)
    const hash = sha256(buf)
    if (priorEntry && priorEntry.url === img.src && priorEntry.sha256 === hash && looksLikeImage(buf)) {
      // hash fields from the verified prior entry; alt stays from the CURRENT survey
      Object.assign(entry, {
        sha256: hash,
        bytes: buf.length,
        fetched_at: priorEntry.fetched_at,
        status: "cached",
      })
      cached++
      continue
    }
    // file exists but index disagrees (or file is not an image): re-download
  }

  try {
    const buf = await fetchBytes(img.src)
    if (!looksLikeImage(buf)) throw new Error("unrecognized image signature (not a valid image file)")
    fs.mkdirSync(path.dirname(abs), { recursive: true })
    fs.writeFileSync(abs, buf)
    Object.assign(entry, {
      sha256: sha256(buf),
      bytes: buf.length,
      fetched_at: new Date().toISOString(),
      status: "fetched",
    })
    fetched++
  } catch (e) {
    Object.assign(entry, { status: "failed", error: String(e?.message ?? e) })
    failed++
    console.error(`FAILED #${img.n} position ${img.position}: ${entry.error}\n  ${img.src}`)
  }
}

// Merge: carry forward prior entries outside the current selection, so subset
// runs never drop provenance and duplicate detection stays cross-run.
const currentKeys = new Set(work.map((img) => `${img.n}:${img.position}`))
let carried = 0
for (const [key, e] of prior) {
  if (!currentKeys.has(key)) {
    entries.push(e)
    carried++
  }
}
entries.sort((a, b) => a.piece - b.piece || a.position - b.position)

// Byte-identical duplicates anywhere indexed (within or across pieces/runs).
const byHash = new Map()
for (const e of entries) {
  if (e.sha256) {
    if (!byHash.has(e.sha256)) byHash.set(e.sha256, [])
    byHash.get(e.sha256).push(`${e.piece}:${e.position}`)
  }
}
const duplicates = [...byHash.entries()]
  .filter(([, refs]) => refs.length > 1)
  .map(([hash, refs]) => ({ sha256: hash, images: refs }))

fs.mkdirSync(outDir, { recursive: true })
// Atomic-ish write: never leave a truncated index.json behind a crash.
const tmpPath = indexPath + ".tmp"
fs.writeFileSync(
  tmpPath,
  JSON.stringify(
    {
      schema: "apfyp-image-cache/1",
      source_report: path.resolve(surveyPath),
      csv_sha256: survey.csv?.sha256 ?? null,
      updated_at: new Date().toISOString(),
      entries,
      duplicates,
    },
    null,
    2,
  ) + "\n",
)
fs.renameSync(tmpPath, indexPath)

console.log(
  `images: ${work.length} required — ${fetched} fetched, ${cached} cached, ${failed} FAILED${carried ? ` (+${carried} prior entries carried forward)` : ""}`,
)
for (const d of duplicates)
  console.log(`  duplicate bytes: ${d.images.join(" = ")} (${d.sha256.slice(0, 12)}…)`)
if (failed > 0) {
  console.error(
    `${failed} image(s) failed — fix and re-run (cached files are kept); pieces with failures are BLOCKED for visual review`,
  )
  process.exit(1)
}
