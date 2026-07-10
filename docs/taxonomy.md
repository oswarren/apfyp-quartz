# APFYP taxonomy registry

The single source of allowed taxonomy tags for piece pages. **A tag may not be used on any page unless it is listed here.** Adding a term means editing this file first (so every vocabulary change is a reviewable diff).

## Rules

1. **Provenance**: visual tags (`form/ surface/ color/ mark/ detail/ condition/ technique/`) may only appear on piece pages whose images were actually reviewed: `visual_status: real_images_reviewed` (human-checked) or `ai_visual_reviewed` (Claude reviewed the listing photos; carries `visual_reviewed_by` + `visual_review_date`). Pages with `images_unreviewed` may carry only `batch/` tags and allowlisted CSV-mapped tags. Exception: technique pages (`content/techniques/`) carry their matching tag so they appear on tag listings beside their pieces.
2. **2-piece rule**: a term enters the registry only with ≥2 member pieces, unless it justifies a standalone technique page.
3. **Naming**: kebab-case, nested under a singular axis prefix: `form/ technique/ surface/ color/ mark/ detail/ condition/ material/ process/ batch/`. The `condition/` axis is the "flaws or irregularities" discovery path — deliberately named neutrally, because piece-page editorial rules consistently forbid characterizing cracks as defects, and pieces will be publicly listed under this axis's URL.
4. **Per-piece `claims_to_avoid` wins** over any tag: a tag records an observation; it never licenses prose the page's own editorial rules forbid.
5. Tags describe what is **visible in the listing photos** or **stated by the store** — never inferred process, recipe, or material composition.

## Active terms

| Tag | Definition | Member pieces (evidence) |
|---|---|---|
| `form/cup` | Small drinking-cup form | all of 2250–2260; 1571, 1574, 1576, 1577, 1578 |
| `form/bowl` | Open bowl form | 1580, 1588, 1592, 1593; 1729 |
| `form/faceted` | Angular faceted silhouette (deliberateness never asserted — see member claims_to_avoid) | 2256, 1733 |
| `technique/handbuilt` | Formed by hand (pinch/coil), not wheel-thrown — visible in uneven rims and walls | all of 2250–2260; 1, 1571, 1574, 1576, 1577, 1578, 1579, 1580, 1583, 1587, 1588, 1589, 1591, 1592, 1593, 1594, 1597; 1727, 1728, 1729, 1730, 1731, 1733, 1734, 1735, 1737, 1739, 1740, 1741, 1742, 1743, 1744, 1745, 1746, 1747, 1748, 1749, 1750, 1751, 1752, 1753, 1754, 1755, 1756, 1757, 1758, 1759, 1760, 1761, 1762, 1763, 1764, 1765, 1766, 1767, 1768, 1769 |
| `surface/crackle-glaze` | Fine crack network (crazing) in the glaze surface | all of 2250–2260 |
| `surface/speckled` | Dark speckling in or under the glaze | all of 2250–2260 |
| `surface/bare-clay` | Unglazed exterior as the dominant surface | 1583, 1587, 1588, 1589, 1591, 1592, 1593, 1594, 1597; 1727, 1728, 1729, 1730, 1731, 1733, 1734, 1735, 1737, 1739, 1740, 1741, 1742, 1743, 1744, 1745, 1746, 1747, 1749, 1750, 1751, 1752, 1753, 1754, 1755, 1756, 1757, 1758, 1759, 1760, 1761, 1762, 1764, 1765, 1766, 1767 |
| `surface/marbled-clay` | Two clays visibly marbled/folded together | 1579, 1580, 1583, 1592 |
| `surface/pale-wash` | Thin pale wash-like coating or mottling over a dark body — material never asserted (use over `surface/glaze-wash`-type names unless the image clearly proves glaze) | 1748, 1763, 1764, 1768, 1769 |
| `surface/scored-marks` | Scored/hatched scratch marks across the body, method not asserted — clear cases only; faint scoring is described in prose, never tagged (2026-07-08 ruling) | 1756 |
| `color/cream` | White/cream dominant glaze color | all of 2250–2260 |
| `color/terracotta-red` | Warm red-brown clay-body color as photographed — a color name only, not a material or provenance claim | 1571, 1574, 1578 |
| `color/white-buff` | Pale white-buff clay-body color as photographed — a color name only, not a material or provenance claim | 1587, 1588, 1589, 1591 |
| `mark/painted-number` | Piece number hand-painted on the base in dark pigment | 2250, 2251, 2252, 2253 |
| `mark/incised-number` | Piece number incised/carved into the base clay | 2254, 2255, 2256, 2257, 2258, 2259, 2260; 1571, 1577, 1591; 1748 |
| `detail/pooled-interior-glaze` | Glossy glaze pooled in the interior | 2250, 2255, 2257 |
| `detail/glazed-rim-band` | Glaze band along the rim over an otherwise bare body | 1571, 1574, 1576, 1577, 1578, 1579, 1580 |
| `detail/embedded-particles` | Pale grog-like particles visible in the clay body ("grog" not lab-confirmed — see member claims_to_avoid) | 2259; 1759, 1760, 1761, 1762 |
| `detail/surface-nodules` | Small dark nodules protruding from the clay surface — material never asserted (some store titles call it shale; quoted only) | 1729, 1730, 1733, 1735, 1737, 1739, 1741, 1742, 1744, 1745, 1746 |
| `detail/blue-flecks` | Small blue glassy flecks or patches on the surface — "glaze" not asserted unless stated by the store | 1750, 1751 |
| `detail/fabric-impression` | Woven-cloth impression pressed into the clay surface | 1757, 1758 |
| `detail/interior-line-mark` | Thin abstract line mark/drawing visible on the interior glaze | 2252, 2254, 2258 |
| `detail/pink-blush` | Pinkish-tan blush patch on the exterior | 2256, 2257, 2260 |
| `condition/hairline-crack` | Fine hairline crack(s) visible on body, rim, or base — observed only, never characterized as defect or hazard | 2253, 2254, 2258, 2259; 1576 |
| `batch/YYYY-MM-DD` | Photography date from image filenames (not a making/firing date) | `batch/2026-06-16`: 2250–2255 · `batch/2026-06-22`: 2256–2260 |

## CSV tag allowlist (active — generator v2 maps these; mirror of CSV_TAG_ALLOWLIST in scripts/generate-pieces.mjs)

| Shopify store tag | Maps to |
|---|---|
| `black clay` | `color/black-clay` |
| `wild clay pottery` | `material/wild-clay` |
| `vase` | `form/vase` |
| `cone 10` | `process/cone-10` |

Generic store tags (`apfyp`, `ceramics`, `pottery`) are never mapped.

## Candidate rulings (Warren, 2026-07-08 — with the 1727–1769 batch-2 review)

All batch-1 candidates approved into Active terms, with two renames to keep color names free of provenance/material connotations: `color/red-clay` → **`color/terracotta-red`**, `color/white-clay` → **`color/white-buff`**. Promoted with batch-2 members: `detail/embedded-particles`, `form/faceted`. New batch-2 terms approved: `detail/surface-nodules`, `surface/pale-wash` (chosen over `surface/glaze-wash` — never name glaze unless the image proves it), `detail/blue-flecks` (renamed from proposed `detail/blue-glaze-flecks` for the same reason), `detail/fabric-impression`, `surface/scored-marks`. Standing rule from the ruling: **faint/uncertain feature cases are never tagged — describe them in prose instead** (applied: 1744/1767 scored-marks, 1745 faceted, 1769 surface-nodules, 1748 blue-flecks).

## Candidates (1 member so far — waiting on the 2-piece rule)

- `condition/rim-crack` — crack from rim into interior, more pronounced than hairline (2256 only; its claims_to_avoid forbids characterizing it)
- `surface/speckle-cluster` — star-like speckle cluster (2255 only)
- `technique/kurinuki`, `material/wild-clay-slip` — known from the project's history but no reviewed piece pages carry them yet

## Technique pages

Every technique page carries its matching tag so it appears on the tag listing alongside its pieces: `techniques/handbuilding` (`technique/handbuilt`), `techniques/crackle-glaze` (`surface/crackle-glaze`), `techniques/speckled-surfaces` (`surface/speckled`), `techniques/numbered-bases` (`mark/painted-number`, `mark/incised-number`), and — added with the 2026-07-08 reviewed-page repair — `techniques/bare-clay` (`surface/bare-clay`), `techniques/embedded-particles` (`detail/embedded-particles`), `techniques/surface-nodules` (`detail/surface-nodules`), `techniques/pale-wash` (`surface/pale-wash`), `techniques/blue-flecks` (`detail/blue-flecks`), `techniques/fabric-impression` (`detail/fabric-impression`), `techniques/scored-marks` (`surface/scored-marks`), `techniques/glazed-rim-band` (`detail/glazed-rim-band`). Explainer slug = tag leaf, verbatim.
