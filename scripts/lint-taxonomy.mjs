// Taxonomy lint for APFYP piece/technique pages.
//
// Usage: node scripts/lint-taxonomy.mjs
//
// Errors (exit 1):
//   E1  a page uses a tag not registered in docs/taxonomy.md
//   E2  an images_unreviewed page carries a tag outside batch/ + the CSV allowlist
//   E3  a wikilink in content/ points at a basename that doesn't exist
//   E4  a piece page's piece_number is missing, quoted, or doesn't match its
//       filename — must be a YAML number equal to the filename's integer
// Warnings (exit 0, reported):
//   W1  registry member list disagrees with the pages actually carrying the tag
//   W2  a registered tag has fewer than 2 member pages (2-piece rule watch)
//
// Run before every content merge, alongside the leak grep (see CLAUDE.md).

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const CONTENT = path.join(ROOT, "content")
const REGISTRY = path.join(ROOT, "docs", "taxonomy.md")

const VISUAL_AXES = ["form/", "surface/", "color/", "mark/", "detail/", "condition/", "technique/", "material/", "process/"]
const BATCH_RE = /^batch\/(\d{4})-(\d{2})-(\d{2})$/

// ---------- parse the registry ----------

const registryText = fs.readFileSync(REGISTRY, "utf8")

// Active terms table rows: | `tag` | definition | members |
const activeTerms = new Map() // tag -> raw members cell
for (const m of registryText.matchAll(/^\|\s*`([a-z/-]+)`\s*\|[^|]*\|([^|]*)\|/gm)) {
  if (m[1].includes("/")) activeTerms.set(m[1], m[2].trim())
}
// The batch/YYYY-MM-DD row registers the prefix, not a literal tag
activeTerms.delete("batch/yyyy-mm-dd")

// CSV allowlist rows: | `store tag` | `mapped/tag` |  — mapped side only
const allowlisted = new Set()
for (const m of registryText.matchAll(/\|\s*`[^`]+`\s*\|\s*`([a-z/-]+\/[a-z0-9-]+)`\s*\|/g)) {
  allowlisted.add(m[1])
}

// ---------- scan content ----------

function* mdFiles(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) yield* mdFiles(full)
    else if (e.name.endsWith(".md")) yield full
  }
}

const errors = []
const warnings = []
const tagMembers = new Map() // tag -> [pieceNumbers/basenames]
const basenames = new Set()
const pages = []

for (const file of mdFiles(CONTENT)) {
  const rel = path.relative(CONTENT, file).replace(/\\/g, "/")
  basenames.add(path.basename(file, ".md"))
  const text = fs.readFileSync(file, "utf8")
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1] ?? ""
  const tags = [...fm.matchAll(/^\s{2}- ([a-z0-9/-]+)\s*$/gm)]
    .map((m) => m[1])
    .filter((t) => t.includes("/")) // taxonomy tags are always nested
  const reviewed = /^visual_status:\s*['"]?(real_images_reviewed|ai_visual_reviewed)['"]?\s*\r?$/m.test(fm)
  const isTechniquePage = rel.startsWith("techniques/")
  const isPiece = /^pieces\/\d+\.md$/.test(rel)
  pages.push({ rel, file, text, tags, reviewed, isTechniquePage, isPiece })

  // E4: every piece page must carry piece_number as a YAML NUMBER (unquoted)
  // equal to the integer in its filename. The Ledger/tag sort override
  // classifies string piece_numbers as non-pieces and floats them to the top,
  // so a quoted "2250" silently breaks piece ordering in every listing.
  if (rel.startsWith("pieces/") && rel !== "pieces/index.md") {
    const expected = path.basename(rel, ".md")
    const value = /^piece_number:[ \t]*(.*?)[ \t]*\r?$/m.exec(fm)?.[1]
    if (value === undefined) {
      errors.push(`E4 ${rel}: missing piece_number in frontmatter`)
    } else if (!/^\d+$/.test(value) || value !== expected) {
      errors.push(`E4 ${rel}: piece_number must be the unquoted number ${expected}, got: ${value === "" ? "(empty)" : value}`)
    }
  }

  for (const tag of tags) {
    // E1: registered?
    const isBatch = BATCH_RE.test(tag)
    if (isBatch) {
      const [, , mo, day] = BATCH_RE.exec(tag)
      if (Number(mo) < 1 || Number(mo) > 12 || Number(day) < 1 || Number(day) > 31) {
        errors.push(`E1 ${rel}: invalid batch date tag "${tag}"`)
      }
    } else if (!activeTerms.has(tag) && !allowlisted.has(tag)) {
      errors.push(`E1 ${rel}: tag "${tag}" is not registered in docs/taxonomy.md`)
    }
    // E2: provenance — unreviewed pieces may carry only batch/ + allowlist
    if (isPiece && !reviewed && !isBatch && !allowlisted.has(tag)) {
      errors.push(`E2 ${rel}: unreviewed page carries visual tag "${tag}"`)
    }
    if (!isBatch) {
      if (!tagMembers.has(tag)) tagMembers.set(tag, [])
      tagMembers.get(tag).push(path.basename(rel, ".md"))
    }
  }
}

// E3: wikilinks resolve (body only — skip frontmatter)
for (const { rel, text } of pages) {
  const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---/, "")
  for (const m of body.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g)) {
    const target = m[1].trim()
    if (!basenames.has(target)) {
      errors.push(`E3 ${rel}: wikilink [[${target}]] has no matching page`)
    }
  }
}

// W1/W2: member reconciliation against the registry (piece-membered terms only)
function parseMembers(cell) {
  // handles "2250, 2251, 2252" and "all of 2250–2260" and "2250–2255: ..." fragments
  const nums = new Set()
  for (const r of cell.matchAll(/(\d{1,5})\s*[–-]\s*(\d{1,5})/g)) {
    for (let i = Number(r[1]); i <= Number(r[2]); i++) nums.add(String(i))
  }
  // 1-5 digits: piece numbers run 1..10000 (piece 1 is a member since 2026-07)
  for (const s of cell.replace(/(\d{1,5})\s*[–-]\s*(\d{1,5})/g, "").matchAll(/\b(\d{1,5})\b/g)) nums.add(s[1])
  return nums
}

for (const [tag, cell] of activeTerms) {
  const declared = parseMembers(cell)
  if (declared.size === 0) continue // prose-only cells aren't reconcilable
  const actual = new Set((tagMembers.get(tag) ?? []).filter((b) => /^\d+$/.test(b)))
  const missing = [...declared].filter((n) => !actual.has(n))
  const extra = [...actual].filter((n) => !declared.has(n))
  if (missing.length || extra.length) {
    warnings.push(`W1 ${tag}: registry says [${[...declared].join(",")}] but pages say [${[...actual].join(",")}]`)
  }
  if (actual.size === 1) {
    warnings.push(`W2 ${tag}: only one member page — 2-piece rule watch`)
  }
}

// ---------- report ----------

for (const w of warnings) console.log(`WARN  ${w}`)
for (const e of errors) console.log(`ERROR ${e}`)
console.log(`lint-taxonomy: ${pages.length} pages, ${activeTerms.size} registered terms, ${errors.length} error(s), ${warnings.length} warning(s)`)
process.exit(errors.length ? 1 : 0)
