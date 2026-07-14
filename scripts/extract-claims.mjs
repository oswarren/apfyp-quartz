// Claim extraction for the APFYP maker-verification layer.
//
// Harvests every technical claim the public site currently asserts (clay bodies, slips,
// glazes, forming, firing, intent) and reconciles it into the claim registry at
// data/claims/. Schema and invariants: data/claims/README.md.
//
// Usage: node scripts/extract-claims.mjs [--write] [--verbose]
//
//   dry-run (default)  report what would change, write nothing
//   --write            create new records / refresh affected_outputs
//   --verbose          list every new record and every asserted hit
//
// What counts as a claim:
//   - frontmatter tags on inference axes (technique/ material/ process/) — visual axes
//     (form/ surface/ color/ mark/ detail/ condition/ batch/) are photo-grounded and
//     governed by docs/taxonomy.md; they are not extracted
//   - lexicon words (data/claim-lexicon.yaml) ASSERTED in a page's title, description
//     (the SEO meta fan-out), or body prose — hedged and store-quoted uses never count,
//     and editorial.claims_to_avoid is never scanned
//   - identical piece-level claims across >=3 pieces of one range coalesce into ONE
//     group record (one maker question, not N), keyed group:<range-slug>:<axis>:<value>
//
// Idempotency: claim ids are stable; re-running refreshes affected_outputs only. Records
// whose occurrences vanish keep their ruling with empty outputs (rejected stays rejected).
// This script never writes status, reviewed, maker_response, assertable, or exceptions.

import {
  loadLexicon,
  loadRegistry,
  saveRegistry,
  loadContent,
  classifyHits,
  stripForScan,
  linkedPieces,
  parseMembers,
  formatMembers,
  tagToClaim,
} from "./claims-lib.mjs"

const WRITE = process.argv.includes("--write")
const VERBOSE = process.argv.includes("--verbose")

const lexicon = loadLexicon()
const records = loadRegistry()
const pages = loadContent()

// ---------- piece -> smallest containing range ----------

const rangeMembers = new Map() // rangeSlug -> Set<number>
for (const p of pages) {
  if (p.kind !== "range") continue
  // keep only links inside the slug's numeric span; the low margin covers adopted gap
  // pieces (1715 -> range-1716-1725), while narrative cross-links to later pieces
  // (e.g. the 2250 pilot mentioned on range-2201-2249) never count
  const bounds = /^range-(\d+)-(\d+)$/.exec(p.slug)
  const links = linkedPieces(p.body)
  const members = bounds
    ? new Set([...links].filter((n) => n >= Number(bounds[1]) - 10 && n <= Number(bounds[2])))
    : links
  rangeMembers.set(p.slug, members)
}
const pieceRange = new Map() // pieceNumber -> rangeSlug
for (const [slug, members] of rangeMembers) {
  for (const n of members) {
    const cur = pieceRange.get(n)
    if (!cur || members.size < rangeMembers.get(cur).size) pieceRange.set(n, slug)
  }
}

// technique tag -> member pieces (pages actually carrying the tag)
const tagPieces = new Map()
for (const p of pages) {
  if (p.kind !== "piece") continue
  for (const t of p.tags) {
    if (!tagPieces.has(t)) tagPieces.set(t, new Set())
    tagPieces.get(t).add(p.pieceNumber)
  }
}

// ---------- harvest ----------

// occurrence: {scope, subject, axis, value, output, snippet}
const pieceHits = [] // scope piece
const groupHits = [] // scope group (range/technique/discover/index prose)
const stats = { asserted: 0, hedged: 0, quoted: 0, byValue: new Map() }

function recordStat(hit, page, fragment) {
  stats[hit.kind]++
  if (hit.kind !== "asserted") return null
  const key = `${hit.axis}:${hit.value}`
  stats.byValue.set(key, (stats.byValue.get(key) ?? 0) + 1)
  if (VERBOSE)
    console.log(
      `  hit ${page.rel}#${fragment}: ${key} — "${(hit.sentence ?? hit.text).slice(0, 110)}"`,
    )
  return true
}

function scanFragment(page, fragment, text) {
  if (!text) return
  for (const hit of classifyHits(text, lexicon)) {
    if (!recordStat(hit, page, fragment)) continue
    const occ = {
      axis: hit.axis,
      value: hit.value,
      output: `content/${page.rel}#${fragment}`,
      snippet: (hit.sentence ?? hit.text).slice(0, 140),
    }
    if (page.kind === "piece") pieceHits.push({ ...occ, piece: page.pieceNumber })
    else groupHits.push({ ...occ, page })
  }
}

for (const page of pages) {
  scanFragment(page, "title", page.title)
  scanFragment(page, "description", page.description)
  scanFragment(page, "body", stripForScan(page.body))
  if (page.kind === "piece") {
    for (const tag of page.tags) {
      const claim = tagToClaim(tag)
      if (!claim) continue
      pieceHits.push({
        ...claim,
        piece: page.pieceNumber,
        output: `content/${page.rel}#tags`,
        snippet: `tag ${tag}`,
      })
      const key = `${claim.axis}:${claim.value}`
      stats.byValue.set(key, (stats.byValue.get(key) ?? 0) + 1)
    }
  }
}

// ---------- reconcile into the registry ----------

const newOutputs = new Map() // id -> Set<output>
for (const id of records.keys()) newOutputs.set(id, new Set())
const created = []

function ensureRecord(id, fields) {
  if (records.has(id)) return records.get(id)
  const rec = {
    id,
    claim: fields.claim,
    subject: fields.subject,
    scope: fields.scope,
    ...(fields.scope === "group" ? { members: fields.members } : {}),
    axis: fields.axis,
    value: fields.value,
    original: fields.original,
    status: "unknown",
    corrected_value: null,
    superseded: null,
    source: "ai-inference",
    confidence: "low",
    maker_response: null,
    reviewed: null,
    assertable: false,
    private_ref: false,
    exceptions: [],
    avoid_terms: [],
    affected_outputs: [],
  }
  records.set(id, rec)
  newOutputs.set(id, new Set())
  created.push(rec)
  return rec
}

function attach(id, output) {
  newOutputs.get(id).add(output)
}

// Which group record should collect a piece-page occurrence of axis:value?
// Only era/range groups and maker-reviewed seed groups are consolidation targets — a
// technique-page group (e.g. `handbuilding`, whose membership is every handbuilt piece)
// is the explainer's OWN assertion and must not swallow piece-page assertions, or the
// review queue collapses into one 575-member megagroup instead of era questions.
// Maker-reviewed records win (outputs belong with the ruling); otherwise the LARGER
// range group wins so review consolidates into era questions; id breaks ties so
// assignment is deterministic across runs.
const isConsolidationTarget = (rec) =>
  Boolean(rec.reviewed) || rec.source === "ruling-log" || /^range-/.test(String(rec.subject))
function coveringGroup(piece, axis, value) {
  let best = null
  let bestSize = -1
  for (const rec of records.values()) {
    if (rec.scope !== "group" || rec.axis !== axis || rec.value !== value) continue
    if (!isConsolidationTarget(rec)) continue
    const members = parseMembers(rec.members)
    if (!members.has(piece)) continue
    const exceptions = new Set((rec.exceptions ?? []).map(Number))
    if (exceptions.has(piece)) continue
    const better =
      !best ||
      (Boolean(rec.reviewed) !== Boolean(best.reviewed)
        ? Boolean(rec.reviewed)
        : members.size !== bestSize
          ? members.size > bestSize
          : rec.id.localeCompare(best.id) < 0)
    if (better) {
      best = rec
      bestSize = members.size
    }
  }
  return best
}

function attachAsPiece(piece, occs, axis, value) {
  const id = `piece:${piece}:${axis}:${value}`
  ensureRecord(id, {
    scope: "piece",
    subject: piece,
    axis,
    value,
    claim: `Piece ${piece} asserts ${axis} "${value}"`,
    original: occs[0].snippet,
  })
  for (const o of occs) attach(id, o.output)
}

// pass 1: piece hits. Attach to a covering seed/reviewed/pre-existing range group; else
// stage for coalescing. Range groups' MEMBERS are the asserting pieces only (not every
// piece in the range) so scope resolution never flags a claim a piece doesn't make.
const staged = new Map() // `${range}|${axis}:${value}` -> Map<piece, occ[]>
for (const occ of pieceHits) {
  const pieceId = `piece:${occ.piece}:${occ.axis}:${occ.value}`
  if (records.has(pieceId)) {
    attach(pieceId, occ.output)
    continue
  }
  const group = coveringGroup(occ.piece, occ.axis, occ.value)
  if (group) {
    attach(group.id, occ.output)
    continue
  }
  const range = pieceRange.get(occ.piece) ?? null
  const key = `${range}|${occ.axis}:${occ.value}`
  if (!staged.has(key)) staged.set(key, new Map())
  const byPiece = staged.get(key)
  if (!byPiece.has(occ.piece)) byPiece.set(occ.piece, [])
  byPiece.get(occ.piece).push(occ)
}

// pass 2: coalesce staged hits — >=3 asserting pieces sharing a range -> one group record
// whose members are exactly those pieces; fewer -> piece records.
for (const [key, byPiece] of staged) {
  const [range, axisValue] = key.split("|")
  const [axis, value] = axisValue.split(/:(.*)/s)
  const pieceNums = [...byPiece.keys()].sort((a, b) => a - b)
  const firstOcc = byPiece.get(pieceNums[0])[0]
  const id = `group:${range}:${axis}:${value}`
  const existing = records.get(id)
  if (existing) {
    // The range group already exists (a seed, a reviewed ruling, or a prior run). Attach
    // only the pieces its member list actually covers; pieces outside it (e.g. 2053/2070,
    // which the chawan seed deliberately excludes) get their own piece records rather than
    // being silently absorbed as non-member outputs.
    const members = parseMembers(existing.members)
    for (const [piece, occs] of byPiece) {
      if (members.has(piece)) for (const o of occs) attach(id, o.output)
      else attachAsPiece(piece, occs, axis, value)
    }
  } else if (range !== "null" && pieceNums.length >= 3) {
    ensureRecord(id, {
      scope: "group",
      subject: range,
      members: formatMembers(pieceNums),
      axis,
      value,
      claim: `The ${range} family asserts ${axis} "${value}" (${pieceNums.length} pieces)`,
      original: firstOcc.snippet,
    })
    for (const occs of byPiece.values()) for (const o of occs) attach(id, o.output)
  } else {
    for (const [piece, occs] of byPiece) attachAsPiece(piece, occs, axis, value)
  }
}

// pass 3: page-level hits (range/technique/discover/index prose). A range page's assertion
// attaches to that range's group (created in pass 2 or a seed) as another output — it does
// NOT expand membership. A technique/other page's claim is page-scoped (empty members): its
// membership is the tag's, already recorded in docs/taxonomy.md.
function subjectSlugFor(page) {
  if (page.kind === "range" || page.kind === "technique") return page.slug
  return page.rel.replace(/\.md$/, "").replace(/\//g, "-")
}
for (const occ of groupHits) {
  const subject = subjectSlugFor(occ.page)
  const id = `group:${subject}:${occ.axis}:${occ.value}`
  if (!records.has(id)) {
    ensureRecord(id, {
      scope: "group",
      subject,
      members: "",
      axis: occ.axis,
      value: occ.value,
      claim: `${occ.page.rel} asserts ${occ.axis} "${occ.value}"`,
      original: occ.snippet,
    })
  }
  attach(id, occ.output)
}

// pass 4: refresh affected_outputs everywhere (full recompute)
let attached = 0
let unchangedCount = 0
const vanished = []
for (const rec of records.values()) {
  const next = [...(newOutputs.get(rec.id) ?? new Set())].sort()
  const prev = Array.isArray(rec.affected_outputs) ? [...rec.affected_outputs].sort() : []
  if (JSON.stringify(next) === JSON.stringify(prev)) unchangedCount++
  else if (next.length === 0 && prev.length > 0) vanished.push(rec.id)
  else attached++
  rec.affected_outputs = next
}

// ---------- report ----------

console.log(
  `extract-claims: ${pages.length} pages scanned — hits: ${stats.asserted} asserted, ${stats.hedged} hedged (skipped), ${stats.quoted} quoted (skipped)`,
)
const topValues = [...stats.byValue.entries()].sort((a, b) => b[1] - a[1])
console.log(`asserted claims by value:`)
for (const [key, n] of topValues) console.log(`  ${String(n).padStart(4)}  ${key}`)
console.log(
  `registry: ${records.size} records — ${created.length} new, ${attached} output refresh(es), ${unchangedCount} unchanged, ${vanished.length} vanished`,
)
if (vanished.length) for (const id of vanished) console.log(`  vanished (ruling kept): ${id}`)
if (created.length) {
  const list = VERBOSE
    ? created
    : created
        .slice()
        .sort((a, b) => b.affected_outputs.length - a.affected_outputs.length)
        .slice(0, 25)
  console.log(VERBOSE ? "new records:" : "new records (top 25 by blast radius):")
  for (const rec of list)
    console.log(
      `  ${rec.id}  [${rec.affected_outputs.length} output(s)]${rec.scope === "group" ? ` members: ${rec.members}` : ""}`,
    )
}

if (WRITE) {
  const files = saveRegistry(records)
  console.log(`wrote: ${files.map((f) => `data/claims/${f}`).join(", ")}`)
} else {
  console.log("dry-run — nothing written (use --write)")
}
