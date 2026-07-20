// Claim impact + review-queue reporting for the APFYP maker-verification layer.
// Read-only over the registry and content. Schema: data/claims/README.md.
//
// Usage:
//   node scripts/claim-impact.mjs                 stale-page report (default)
//   node scripts/claim-impact.mjs --queue [n]     next n open review items, biggest blast radius first
//   node scripts/claim-impact.mjs --piece N       every claim covering piece N, with scope resolution
//   node scripts/claim-impact.mjs --piece N --open   only piece N's unresolved questions (the "ask the maker" view)
//
// Stale report: for every corrected / rejected / never-use record, re-scan its
// affected_outputs for wording that still needs to change — the "fix one fact, see all the
// pages that go stale" view. A page is stale if it still contains the banned value/avoid_terms
// (rejected, never-use, corrected-old-value) or, for a corrected+assertable claim, still shows
// `original` instead of `corrected_value`.

import {
  loadRegistry,
  loadContent,
  loadLexicon,
  effectiveClaims,
  fragmentAssertsBanned,
  bannedTerms,
} from "./claims-lib.mjs"

const args = process.argv.slice(2)
const has = (f) => args.includes(f)
const valAfter = (f) => {
  const i = args.indexOf(f)
  return i >= 0 ? args[i + 1] : undefined
}

const records = loadRegistry()
const pages = loadContent()
const lexicon = loadLexicon()
// affected_outputs store repo-relative paths ("content/pieces/2236.md#body"); page.rel is
// CONTENT-relative ("pieces/2236.md"). Key by the repo-relative form so lookups line up.
const pageByRel = new Map(pages.map((p) => [`content/${p.rel}`, p]))

// ---------- --piece N ----------

if (has("--piece")) {
  const n = Number(valAfter("--piece"))
  if (!Number.isInteger(n)) {
    console.error("usage: --piece <number>")
    process.exit(2)
  }
  const { covering, effective } = effectiveClaims(records, n)

  // --open: the "ask the maker" view — only the questions no one has answered yet, so an
  // unknown detail becomes a question for Warren instead of a hedge on the page. Same
  // definition of "open" as --queue: no `reviewed` date, status still unknown/deferred.
  if (has("--open")) {
    const open = covering
      .filter((r) => !r.reviewed && (r.status === "unknown" || r.status === "deferred"))
      .sort((a, b) => a.axis.localeCompare(b.axis) || a.value.localeCompare(b.value))
    console.log(`open questions for piece ${n}: ${open.length} unresolved`)
    for (const rec of open) {
      const scope = rec.scope === "piece" ? "piece" : `group ${rec.subject}`
      console.log(`  [${rec.axis}] ${rec.value} — ${scope} · ${rec.id}`)
    }
    if (open.length === 0)
      console.log("  (nothing open — every claim covering this piece has been ruled)")
    process.exit(0)
  }

  console.log(`claims covering piece ${n}: ${covering.length} record(s)`)
  const effectiveIds = new Set([...effective.values()].map((r) => r.id))
  for (const rec of covering.sort(
    (a, b) => a.axis.localeCompare(b.axis) || a.value.localeCompare(b.value),
  )) {
    const win = effectiveIds.has(rec.id) && effective.get(`${rec.axis}:${rec.value}`)?.id === rec.id
    const scope = rec.scope === "piece" ? "piece" : `group ${rec.subject}`
    const overridden = win ? "" : "  (overridden)"
    console.log(
      `  [${rec.status}] ${rec.axis}:${rec.value} — ${scope}${rec.assertable ? " · assertable" : ""}${overridden}`,
    )
    if (win && rec.maker_response) console.log(`      maker: ${rec.maker_response}`)
  }
  process.exit(0)
}

// ---------- --queue [n] ----------

if (has("--queue")) {
  const nRaw = valAfter("--queue")
  const limit = nRaw && /^\d+$/.test(nRaw) ? Number(nRaw) : 20
  const open = [...records.values()]
    .filter((r) => !r.reviewed && (r.status === "unknown" || r.status === "deferred"))
    .map((r) => ({ rec: r, radius: (r.affected_outputs ?? []).length }))
    .sort(
      (a, b) =>
        b.radius - a.radius ||
        a.rec.axis.localeCompare(b.rec.axis) ||
        a.rec.id.localeCompare(b.rec.id),
    )
  console.log(
    `review queue: ${open.length} open item(s) — next ${Math.min(limit, open.length)} by blast radius\n`,
  )
  for (const { rec, radius } of open.slice(0, limit)) {
    const files = new Set((rec.affected_outputs ?? []).map((o) => o.split("#")[0]))
    const scope =
      rec.scope === "group"
        ? `group ${rec.subject} [${rec.members || "—"}]`
        : `piece ${rec.subject}`
    console.log(`• ${rec.axis}:${rec.value}  (${radius} output(s) across ${files.size} file(s))`)
    console.log(`    ${scope}`)
    console.log(`    id: ${rec.id}`)
  }
  if (open.length > limit)
    console.log(`\n… ${open.length - limit} more. Re-run with --queue ${open.length}.`)
  process.exit(0)
}

// ---------- default: stale-page report ----------

const ruled = [...records.values()].filter((r) =>
  ["corrected", "rejected", "never-use"].includes(r.status),
)
let staleTotal = 0
const staleByFile = new Map()

for (const rec of ruled) {
  for (const output of rec.affected_outputs ?? []) {
    const [rel, fragment] = output.split("#")
    const page = pageByRel.get(rel)
    if (page && fragmentAssertsBanned(page, fragment, rec, lexicon)) {
      staleTotal++
      if (!staleByFile.has(rel)) staleByFile.set(rel, [])
      staleByFile.get(rel).push({ fragment, rec })
    }
  }
}

if (ruled.length === 0) {
  console.log("claim-impact: no corrected/rejected/never-use rulings yet — nothing to propagate.")
  process.exit(0)
}
console.log(
  `claim-impact: ${ruled.length} ruled claim(s) — ${staleTotal} stale location(s) across ${staleByFile.size} file(s)\n`,
)
for (const [rel, items] of [...staleByFile.entries()].sort()) {
  console.log(`${rel}`)
  for (const { fragment, rec } of items) {
    const fix =
      rec.status === "corrected" && rec.corrected_value
        ? ` → "${rec.value}" becomes "${rec.corrected_value}"`
        : rec.status === "rejected" || rec.status === "never-use"
          ? ` → remove "${[...bannedTerms(rec)].join('", "')}"`
          : ""
    console.log(`  #${fragment}  [${rec.status}] ${rec.axis}:${rec.value}${fix}  (${rec.id})`)
  }
}
if (staleTotal === 0) console.log("all ruled claims are already reconciled in content ✓")
process.exit(0)
