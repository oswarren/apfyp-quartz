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

for (const p of products.values()) {
  const m = HANDLE_RE.exec(p.handle)
  if (!m) continue
  const n = Number(m[1])
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
    localPages.set(Number(m[1]), { file: f, generated: /^generated: true\r?$/m.test(head), head })
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
  process.exit(0)
}

// ---------- page rendering ----------

function renderPage(n, p, willExist) {
  const price = (p.priceCents / 100).toFixed(2)
  const title = `Ceramic Piece ${n} — A Penny For Your Pottery`
  const description = `Piece ${n} of 10,000 in A Penny For Your Pottery's numbered ceramic series, listed at $${price}.`
  const firstImage = p.images[0]
  const alt = firstImage.alt || `Handmade ceramic piece ${n} from A Penny For Your Pottery, photographed for its listing.`
  const productionDate = extractDate(firstImage.src)
  const productUrl = `${STORE_BASE}${p.handle}`

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
    `This is handmade piece ${n} of 10,000 in the series — individually numbered on its base and listed at $${price}. The photographs above come straight from the live listing and haven't been editorially reviewed yet.`,
    "",
    ...(nav.length ? [nav.join(" · "), ""] : []),
    `**[View / Buy on Shopify →](${productUrl})**`,
    "",
  ]
  return lines.join("\n")
}

function extractDate(src) {
  const m = /PXL[-_](\d{4})(\d{2})(\d{2})/.exec(src ?? "")
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null
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
const disqualified = inRange.filter((p) => !p.qualified)
if (disqualified.length) {
  console.log(`  not qualified in range:`)
  for (const p of disqualified.slice(0, 20)) console.log(`    #${p.n}: ${p.reasons.join("; ")}`)
  if (disqualified.length > 20) console.log(`    ... and ${disqualified.length - 20} more`)
}
