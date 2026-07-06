# APFYP taxonomy registry

The single source of allowed taxonomy tags for piece pages. **A tag may not be used on any page unless it is listed here.** Adding a term means editing this file first (so every vocabulary change is a reviewable diff).

## Rules

1. **Provenance**: visual tags (`form/ surface/ color/ mark/ detail/ condition/ technique/`) may only appear on piece pages with `visual_status: real_images_reviewed`. Pages with `images_unreviewed` may carry only `batch/` tags and allowlisted CSV-mapped tags. Exception: technique pages (`content/techniques/`) carry their matching tag so they appear on tag listings beside their pieces.
2. **2-piece rule**: a term enters the registry only with ≥2 member pieces, unless it justifies a standalone technique page.
3. **Naming**: kebab-case, nested under a singular axis prefix: `form/ technique/ surface/ color/ mark/ detail/ condition/ material/ process/ batch/`. The `condition/` axis is the "flaws or irregularities" discovery path — deliberately named neutrally, because piece-page editorial rules consistently forbid characterizing cracks as defects, and pieces will be publicly listed under this axis's URL.
4. **Per-piece `claims_to_avoid` wins** over any tag: a tag records an observation; it never licenses prose the page's own editorial rules forbid.
5. Tags describe what is **visible in the listing photos** or **stated by the store** — never inferred process, recipe, or material composition.

## Active terms

| Tag | Definition | Member pieces (evidence) |
|---|---|---|
| `form/cup` | Small drinking-cup form | all of 2250–2260 |
| `technique/handbuilt` | Formed by hand (pinch/coil), not wheel-thrown — visible in uneven rims and walls | all of 2250–2260 |
| `surface/crackle-glaze` | Fine crack network (crazing) in the glaze surface | all of 2250–2260 |
| `surface/speckled` | Dark speckling in or under the glaze | all of 2250–2260 |
| `color/cream` | White/cream dominant glaze color | all of 2250–2260 |
| `mark/painted-number` | Piece number hand-painted on the base in dark pigment | 2250, 2251, 2252, 2253 |
| `mark/incised-number` | Piece number incised/carved into the base clay | 2254, 2255, 2256, 2257, 2258, 2259, 2260 |
| `detail/pooled-interior-glaze` | Glossy glaze pooled in the interior | 2250, 2255, 2257 |
| `detail/interior-line-mark` | Thin abstract line mark/drawing visible on the interior glaze | 2252, 2254, 2258 |
| `detail/pink-blush` | Pinkish-tan blush patch on the exterior | 2256, 2257, 2260 |
| `condition/hairline-crack` | Fine hairline crack(s) visible on body, rim, or base — observed only, never characterized as defect or hazard | 2253, 2254, 2258, 2259 |
| `batch/YYYY-MM-DD` | Photography date from image filenames (not a making/firing date) | `batch/2026-06-16`: 2250–2255 · `batch/2026-06-22`: 2256–2260 |

## CSV tag allowlist (for the generator, future phase — not yet active)

| Shopify store tag | Maps to |
|---|---|
| `black clay` | `color/black-clay` |
| `wild clay pottery` | `material/wild-clay` |
| `vase` | `form/vase` |
| `cone 10` | `process/cone-10` |

Generic store tags (`apfyp`, `ceramics`, `pottery`) are never mapped.

## Candidates (1 member so far — waiting on the 2-piece rule)

- `detail/embedded-particles` — white grog-like particles (2259 only; note its claims_to_avoid: "grog" not lab-confirmed)
- `condition/rim-crack` — crack from rim into interior, more pronounced than hairline (2256 only; its claims_to_avoid forbids characterizing it)
- `surface/speckle-cluster` — star-like speckle cluster (2255 only)
- `form/faceted` — angular faceted silhouette (2256 only; claims_to_avoid forbids asserting deliberateness)
- `technique/kurinuki`, `material/wild-clay-slip` — known from the project's history but no reviewed piece pages carry them yet

## Technique pages

Every technique page carries its matching tag so it appears on the tag listing alongside its pieces: `techniques/handbuilding` (`technique/handbuilt`), `techniques/crackle-glaze` (`surface/crackle-glaze`), `techniques/speckled-surfaces` (`surface/speckled`), `techniques/numbered-bases` (`mark/painted-number`, `mark/incised-number`).
