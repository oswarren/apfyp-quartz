// Shopify CSV -> content/pieces/N.md generator for A Penny For Your Pottery.
//
// Usage:
//   node scripts/generate-pieces.mjs <csv-path> --survey
//   node scripts/generate-pieces.mjs <csv-path> --range 2261-2335            (dry run)
//   node scripts/generate-pieces.mjs <csv-path> --range 2261-2335 --write
//
// The CSV is a standard Shopify products_export read in place (e.g. from the
// vault's .raw/) — it must never be committed to this repo.
//
// A piece qualifies for a page only if ALL hold:
//   - handle matches ^pottery-piece-(\d+)$
//   - Status = active and Published = true
//   - has at least one image
//   - body is not the "not yet made" reservation template
//   - price in integer cents === piece number (the penny rule)
//
// Pages carrying `generated: true` frontmatter are refreshed in place.
// Pages WITHOUT it (hand-curated, e.g. the 2250-2260 pilot) are never touched;
// CSV disagreements with them are reported as drift. Nothing is ever deleted.

import { parse } from "csv-parse/sync"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const PIECES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "content", "pieces")
const HANDLE_RE = /^pottery-piece-(\d+)$/
const RESERVE_RE = /not yet made/i
const STORE_BASE = "https://apennyforyourpottery.com/products/"
// Store titles matching this are the bulk template names; anything else is a
// bespoke title Warren wrote himself and may be used as the page title.
const TEMPLATE_TITLE_RE = /^(ceramic|pottery) piece \d+$/i
// Store-tag → taxonomy-tag allowlist. Must mirror docs/taxonomy.md — the CSV
// may only ever set tags listed there (plus batch/ dates).
const CSV_TAG_ALLOWLIST = new Map([
  ["black clay", "color/black-clay"],
  ["wild clay pottery", "material/wild-clay"],
  ["vase", "form/vase"],
  ["cone 10", "process/cone-10"],
])

// ---------- CLI ----------

const args = process.argv.slice(2)
const rangeFlagIdx = args.indexOf("--range")
const csvPath = args.find((a, i) => !a.startsWith("--") && (rangeFlagIdx === -1 || i !== rangeFlagIdx + 1))
const survey = args.includes("--survey")
const write = args.includes("--write")
const range = rangeFlagIdx !== -1 ? parseRange(args[rangeFlagIdx + 1]) : null

if (!csvPath || (!survey && !range)) {
  console.error("usage: node scripts/generate-pieces.mjs <csv-path> (--survey | --range A-B [--write])")
  process.exit(1)
}

function parseRange(s) {
  const m = /^(\d+)-(\d+)$/.exec(s ?? "")
  if (!m) {
    console.error(`--range must look like 2261-2335, got: ${s}`)
    process.exit(1)
  }
  const [lo, hi] = [Number(m[1]), Number(m[2])]
  if (lo > hi) {
    console.error(`--range is inverted: ${s}`)
    process.exit(1)
  }
  return { lo, hi }
}

// ---------- parse + group ----------

// String-math cents: "22.50" / "22.5" / "22" -> 2250. Never floats.
function toCents(s) {
  const m = /^\$?(\d+)(?:\.(\d{1,2}))?$/.exec((s ?? "").trim())
  if (!m) return null
  return Number(m[1]) * 100 + Number((m[2] ?? "0").padEnd(2, "0"))
}

const rows = parse(fs.readFileSync(csvPath), { columns: true, bom: true })

const products = new Map() // handle -> product
for (const row of rows) {
  const handle = row["Handle"]
  if (!handle) continue
  let p = products.get(handle)
  if (!p) {
    p = { handle, title: "", body: "", status: "", published: "", priceCents: null, variantRows: 0, images: [] }
    products.set(handle, p)
  }
  if (row["Title"]) {
    // primary row
    p.title = row["Title"]
    p.body = row["Body (HTML)"] ?? ""
    p.status = row["Status"] ?? ""
    p.published = row["Published"] ?? ""
    p.storeTags = (row["Tags"] ?? "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
  }
  if (row["Variant Price"]) {
    p.variantRows++
    if (p.priceCents === null) p.priceCents = toCents(row["Variant Price"])
  }
  if (row["Image Src"]) {
    // Only public Shopify CDN URLs may enter the repo; anything else is
    // dropped and surfaced as an anomaly (also keeps YAML/Markdown clean).
    if (row["Image Src"].startsWith("https://cdn.shopify.com/")) {
      p.images.push({
        src: row["Image Src"],
        position: Number(row["Image Position"] || 0),
        // Alt text is free text from Shopify admin — strip characters that
        // would break ![alt](src) syntax or smuggle markup into the page.
        alt: (row["Image Alt Text"] ?? "").replace(/[\r\n]+/g, " ").replace(/[[\]()<>]/g, "").trim(),
      })
    } else {
      p.droppedImages = (p.droppedImages ?? 0) + 1
    }
  }
}
for (const p of products.values()) p.images.sort((a, b) => a.position - b.position)

// ---------- classify ----------

const pieces = [] // numbered pieces, qualified or not
const anomalies = []
let reserveCount = 0
let madeTemplateCount = 0
// Store tags that are neither generic nor allowlisted — surfaced in --survey
// so new Shopify tags become visible candidates instead of vanishing silently.
const GENERIC_STORE_TAGS = new Set(["apfyp", "ceramics", "pottery"])
const unknownStoreTags = new Map() // tag -> count

for (const p of products.values()) {
  const m = HANDLE_RE.exec(p.handle)
  if (!m) continue
  const n = Number(m[1])
  for (const st of p.storeTags ?? []) {
    if (!GENERIC_STORE_TAGS.has(st) && !CSV_TAG_ALLOWLIST.has(st)) {
      unknownStoreTags.set(st, (unknownStoreTags.get(st) ?? 0) + 1)
    }
  }
  const isReserve = RESERVE_RE.test(p.body)
  if (isReserve) reserveCount++
  else if (/more used to the touch of clay/i.test(p.body)) madeTemplateCount++

  const reasons = []
  if (p.status !== "active") reasons.push(`status=${p.status || "?"}`)
  if (String(p.published).toLowerCase() !== "true") reasons.push("unpublished")
  if (p.images.length === 0) reasons.push("no images")
  if (isReserve) reasons.push("reserve listing")
  if (p.priceCents !== n) {
    reasons.push(`price ${fmtPrice(p.priceCents)} != piece number`)
    anomalies.push(`#${n}: price ${fmtPrice(p.priceCents)}, expected ${fmtPrice(n)}`)
  }
  if (p.variantRows > 1) {
    reasons.push(`${p.variantRows} variants`)
    anomalies.push(`#${n}: ${p.variantRows} variant rows (expected 1)`)
  }
  if (p.droppedImages) {
    anomalies.push(`#${n}: ${p.droppedImages} non-Shopify-CDN image(s) dropped`)
  }
  pieces.push({ n, product: p, qualified: reasons.length === 0, reasons })
}
pieces.sort((a, b) => a.n - b.n)

function fmtPrice(cents) {
  return cents === null ? "unparseable" : `$${(cents / 100).toFixed(2)}`
}

// ---------- local page inventory ----------

const localPages = new Map() // n -> { file, generated }
if (fs.existsSync(PIECES_DIR)) {
  for (const f of fs.readdirSync(PIECES_DIR)) {
    const m = /^(\d+)\.md$/.exec(f)
    if (!m) continue
    const head = frontmatterOf(path.join(PIECES_DIR, f))
    // Safety net: a reviewed page is curated even if its generated flag was
    // never removed — visual review promotes a page out of generator control.
    const flaggedGenerated = /^generated:\s*true\s*\r?$/m.test(head)
    const reviewed = /^visual_status:\s*['"]?real_images_reviewed['"]?\s*\r?$/m.test(head)
    if (flaggedGenerated && reviewed) {
      console.warn(`WARN: ${f} is reviewed but still flagged generated: true — treating as curated; remove the flag`)
    }
    localPages.set(Number(m[1]), { file: f, generated: flaggedGenerated && !reviewed, head })
  }
}

function frontmatterOf(file) {
  const text = fs.readFileSync(file, "utf8")
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)
  return m ? m[1] : ""
}

// ---------- survey mode ----------

if (survey) {
  const qualified = pieces.filter((p) => p.qualified)
  const withImages = pieces.filter((p) => p.product.images.length > 0)
  console.log(`products in CSV:              ${products.size}`)
  console.log(`numbered pottery-piece-N:     ${pieces.length}`)
  console.log(`  with >=1 image:             ${withImages.length}`)
  console.log(`  reserve-template listings:  ${reserveCount}`)
  console.log(`  made-template listings:     ${madeTemplateCount}`)
  console.log(`  QUALIFIED for pages:        ${qualified.length}`)
  if (qualified.length) {
    console.log(`  qualified number range:     #${qualified[0].n} - #${qualified[qualified.length - 1].n}`)
  }
  console.log(`local piece pages:            ${localPages.size} (${[...localPages.values()].filter((l) => !l.generated).length} curated)`)
  const missing = [...localPages.keys()].filter((n) => !pieces.some((p) => p.n === n))
  if (missing.length) console.log(`local pages MISSING from CSV: ${missing.join(", ")}`)
  console.log(`anomalies (${anomalies.length}):`)
  for (const a of anomalies) console.log(`  ${a}`)
  if (unknownStoreTags.size) {
    console.log(`store tags not in allowlist (candidates for docs/taxonomy.md):`)
    const sorted = [...unknownStoreTags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)
    for (const [t, c] of sorted) console.log(`  ${t} (x${c})`)
  }
  process.exit(0)
}

// ---------- page rendering ----------

function sanitizeText(s) {
  return (s ?? "").replace(/[\r\n]+/g, " ").replace(/[[\]()<>{}]/g, "").trim()
}

function monthName(isoDate) {
  const [y, m] = isoDate.split("-").map(Number)
  const names = ["January","February","March","April","May","June","July","August","September","October","November","December"]
  return `${names[m - 1]} ${y}`
}

function renderPage(n, p, willExist) {
  const price = (p.priceCents / 100).toFixed(2)
  // Site name comes from pageTitleSuffix in quartz.config.yaml — never baked
  // into page titles. Bespoke store titles (Warren's own public copy) are
  // used when present; otherwise the honest minimum.
  const bespoke = p.title && !TEMPLATE_TITLE_RE.test(p.title.trim())
  // Store titles often embed "Ceramic Piece N" at the start or end — strip it
  // so appending "— Piece N" never doubles the number.
  // Strip only THIS piece's number from the store title — a title genuinely
  // ending in some other number ("Conversation Piece 3") must survive.
  const bespokeCore = bespoke
    ? sanitizeText(p.title)
        .replace(new RegExp(`^\\s*(?:ceramic|pottery)?\\s*piece\\s*${n}\\s*[:\\-–—]\\s*`, "i"), "")
        .replace(new RegExp(`[:\\-–—]?\\s*(?:ceramic|pottery)?\\s*piece\\s*${n}\\s*$`, "i"), "")
        // trailing bare piece number ("Handmade Abstract Cup - 2086")
        .replace(new RegExp(`[:\\-–—]\\s*${n}\\s*$`), "")
        .replace(/[.,;:\s]+$/, "")
        .trim()
    : ""
  const title = bespokeCore ? `${bespokeCore} — Piece ${n}` : `Piece ${n}`
  const firstImage = p.images[0]
  const alt = firstImage.alt || `Listing photo of handmade ceramic piece ${n} from A Penny For Your Pottery.`
  const productUrl = `${STORE_BASE}${p.handle}`

  // A piece's photo date comes from its image filenames — but only when the
  // dated images all agree. Mixed dates (e.g. a later re-shoot inserted at
  // position 1) would make both the month claim and the batch tag wrong, so
  // they void the date instead (reported by the caller as an anomaly).
  const dates = [...new Set(p.images.map((img) => extractDate(img.src)).filter(Boolean))]
  const productionDate = dates.length === 1 ? dates[0] : null
  if (dates.length > 1) p.mixedDates = dates

  // Unique description: varies on price, photo month, and image count —
  // the axes the export actually provides. No visual adjectives.
  const imgClause = `${p.images.length} photo${p.images.length === 1 ? "" : "s"} on its listing`
  const photoClause = productionDate ? `photographed ${monthName(productionDate)}, ` : ""
  const description = `Piece ${n} of 10,000 in A Penny For Your Pottery's numbered ceramic series — listed at $${price}, ${photoClause}${imgClause}.`

  // Tags the CSV is allowed to set: batch date + registry-allowlisted store tags.
  const tags = []
  if (productionDate) tags.push(`batch/${productionDate}`)
  for (const st of p.storeTags ?? []) {
    const mapped = CSV_TAG_ALLOWLIST.get(st)
    if (mapped && !tags.includes(mapped)) tags.push(mapped)
  }

  const nav = []
  if (willExist.has(n - 1)) nav.push(`Previous: [[${n - 1}]]`)
  if (willExist.has(n + 1)) nav.push(`Next: [[${n + 1}]]`)

  const lines = [
    "---",
    "type: catalog-piece",
    `piece_number: ${n}`,
    `title: ${JSON.stringify(title)}`,
    `description: ${JSON.stringify(description)}`,
    `price: ${price}`,
    `shopify_handle: ${p.handle}`,
    `product_url: ${productUrl}`,
    "image_urls:",
    ...p.images.map((img) => `  - ${img.src}`),
    ...(productionDate ? [`production_date: ${productionDate}`] : []),
    "visual_status: images_unreviewed",
    "checkout_source: Shopify",
    "generated: true",
    ...(tags.length ? ["tags:", ...tags.map((t) => `  - ${t}`)] : []),
    "editorial:",
    "  claims_to_avoid:",
    "    - clay body composition, glaze recipe, or firing method",
    "    - live inventory, stock, or sold/available status — check Shopify for current availability",
    "    - buyer or order history",
    "    - exact physical dimensions (no measured reference in source photos)",
    "    - any connection to Wild Clay Archive or other sourcing/material projects",
    "    - visual descriptions beyond the listing photos (images not yet editorially reviewed)",
    "---",
    "",
    `![${alt}](${firstImage.src})`,
    "",
    `This is handmade piece ${n} of 10,000 in the series — individually numbered on its base and listed at $${price}. The photographs come straight from its listing on the store.`,
    "",
    ...(nav.length ? [nav.join(" · "), ""] : []),
    `**[View / Buy on Shopify →](${productUrl})**`,
    "",
  ]
  return lines.join("\n")
}

function extractDate(src) {
  const m = /PXL[-_](\d{4})(\d{2})(\d{2})/.exec(src ?? "")
  if (!m) return null
  const [mo, day] = [Number(m[2]), Number(m[3])]
  if (mo < 1 || mo > 12 || day < 1 || day > 31) return null
  return `${m[1]}-${m[2]}-${m[3]}`
}

// ---------- generate ----------

const inRange = pieces.filter((p) => p.n >= range.lo && p.n <= range.hi)
const targets = inRange.filter((p) => p.qualified)
const willExist = new Set([...localPages.keys(), ...targets.filter((p) => !localPages.get(p.n) || localPages.get(p.n).generated).map((p) => p.n)])

let created = 0
let updated = 0
let unchanged = 0
const skippedCurated = []
const drift = []

for (const { n, product: p } of targets) {
  const local = localPages.get(n)
  if (local && !local.generated) {
    skippedCurated.push(n)
    const priceInPage = /^price: (.+?)\r?$/m.exec(local.head)?.[1]?.replace(/["']/g, "")
    const pagePriceCents = priceInPage ? toCents(priceInPage) : null
    if (pagePriceCents !== null && pagePriceCents !== p.priceCents) {
      drift.push(`#${n}: curated page says ${fmtPrice(pagePriceCents)}, CSV says ${fmtPrice(p.priceCents)}`)
    }
    const imgCount = (local.head.match(/^ {2}- https?:/gm) ?? []).length
    if (imgCount && imgCount !== p.images.length) {
      drift.push(`#${n}: curated page lists ${imgCount} images, CSV has ${p.images.length}`)
    }
    continue
  }
  const content = renderPage(n, p, willExist)
  const file = path.join(PIECES_DIR, `${n}.md`)
  if (!local) {
    created++
    if (write) fs.writeFileSync(file, content)
  } else if (fs.readFileSync(file, "utf8") !== content) {
    updated++
    if (write) fs.writeFileSync(file, content)
  } else {
    unchanged++
  }
}

console.log(`${write ? "WROTE" : "DRY RUN"} range #${range.lo}-#${range.hi}`)
console.log(`  in range:        ${inRange.length} (${targets.length} qualified)`)
console.log(`  created:         ${created}`)
console.log(`  updated:         ${updated}`)
console.log(`  unchanged:       ${unchanged}`)
console.log(`  skipped curated: ${skippedCurated.length}${skippedCurated.length ? ` (${skippedCurated.join(", ")})` : ""}`)
for (const d of drift) console.log(`  drift: ${d}`)
for (const t of targets.filter((t) => t.product.mixedDates)) {
  console.log(`  mixed photo dates #${t.n}: ${t.product.mixedDates.join(", ")} — date claim and batch tag omitted`)
}
const disqualified = inRange.filter((p) => !p.qualified)
if (disqualified.length) {
  console.log(`  not qualified in range:`)
  for (const p of disqualified.slice(0, 20)) console.log(`    #${p.n}: ${p.reasons.join("; ")}`)
  if (disqualified.length > 20) console.log(`    ... and ${disqualified.length - 20} more`)
}
