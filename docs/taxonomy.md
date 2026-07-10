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
| `form/cup` | Small drinking-cup form | all of 2250–2260; 1571, 1574, 1576, 1577, 1578; 2085, 2086, 2088, 2089, 2091, 2092; 19; 1627, 1630 |
| `form/bowl` | Open bowl form | 1580, 1588, 1592, 1593; 1729; 3, 12, 16; 1603, 1604, 1606, 1608, 1609, 1610, 1611, 1622, 1623, 1624, 1625, 1637, 1640 |
| `form/faceted` | Angular faceted silhouette (deliberateness never asserted — see member claims_to_avoid) | 2256, 1733 |
| `technique/handbuilt` | Formed by hand (pinch/coil), not wheel-thrown — visible in uneven rims and walls | all of 2250–2260; 1, 1571, 1574, 1576, 1577, 1578, 1579, 1580, 1583, 1587, 1588, 1589, 1591, 1592, 1593, 1594, 1597; 1692, 1693, 1694, 1695, 1697, 1698, 1699, 1700, 1701, 1702, 1703, 1706, 1708, 1709, 1710, 1712, 1714; 2085, 2086, 2088, 2089, 2091, 2092; 1727, 1728, 1729, 1730, 1731, 1733, 1734, 1735, 1737, 1739, 1740, 1741, 1742, 1743, 1744, 1745, 1746, 1747, 1748, 1749, 1750, 1751, 1752, 1753, 1754, 1755, 1756, 1757, 1758, 1759, 1760, 1761, 1762, 1763, 1764, 1765, 1766, 1767, 1768, 1769; 5, 8, 10, 11, 13, 14, 15, 17, 20; 1716, 1718, 1722, 1723, 1724, 1725; 1603, 1604, 1605, 1606, 1607, 1608, 1609, 1610, 1611, 1614, 1615, 1621, 1622, 1623, 1624, 1625, 1627, 1628, 1629, 1630, 1631, 1632, 1634, 1635, 1636, 1637, 1638, 1639, 1640, 1641, 1643, 1644, 1645, 1646, 1647, 1648, 1649, 1651 |
| `surface/crackle-glaze` | Fine crack network (crazing) in the glaze surface | all of 2250–2260 |
| `surface/speckled` | Dark speckling in or under the glaze | all of 2250–2260; 2085, 2088 |
| `surface/bare-clay` | Unglazed exterior as the dominant surface | 1583, 1587, 1588, 1589, 1591, 1592, 1593, 1594, 1597; 1727, 1728, 1729, 1730, 1731, 1733, 1734, 1735, 1737, 1739, 1740, 1741, 1742, 1743, 1744, 1745, 1746, 1747, 1749, 1750, 1751, 1752, 1753, 1754, 1755, 1756, 1757, 1758, 1759, 1760, 1761, 1762, 1764, 1765, 1766, 1767 |
| `surface/marbled-clay` | Two clays visibly marbled/folded together | 1579, 1580, 1583, 1592 |
| `surface/pale-wash` | Thin pale wash-like coating or mottling over a dark body — material never asserted (use over `surface/glaze-wash`-type names unless the image clearly proves glaze) | 1748, 1763, 1764, 1768, 1769 |
| `surface/scored-marks` | Scored/hatched scratch marks across the body, method not asserted — clear cases only; faint scoring is described in prose, never tagged (2026-07-08 ruling) | 1756 |
| `surface/metallic-sheen` | Metallic, pewter-like luster on the surface as photographed — its cause (glaze, salt, ash, firing) never asserted; where a store title names one, it is quoted only | 1692, 1697, 1706; 1718 |
| `surface/coil-ridges` | Stacked horizontal coil bands left visible in the wall — clear cases only; softer seams and single ridges are described in prose, never tagged | 1699, 1701; 11, 15; 1639 |
| `surface/brushed-glaze` | Hand-brushed glaze decoration — bold patches, thin lines, washes, splatter | 2086, 2089, 2091, 2092 |
| `surface/fissured-crust` | Deep drying-style fissures webbing a sandy body — observed only, never characterized as defect; clear cases only, finer crazing stays in prose | 1631, 1632, 1634, 1635, 1638, 1641, 1644, 1648, 1651 |
| `color/cream` | White/cream dominant glaze color | all of 2250–2260; 2085, 2086, 2088, 2089, 2091, 2092 |
| `color/terracotta-red` | Warm red-brown clay-body color as photographed — a color name only, not a material or provenance claim; clear cases only (2026-07-10 ruling: unclear reds stay prose-only) | 1571, 1574, 1578; 1693, 1695, 1698, 1699, 1700, 1701, 1702, 1703, 1708, 1712, 1714 |
| `color/white-buff` | Pale white-buff clay-body color as photographed — a color name only, not a material or provenance claim | 1587, 1588, 1589, 1591; 1603, 1604, 1605, 1606, 1607, 1608, 1609, 1610, 1611, 1614, 1615, 1621, 1622, 1623, 1624 |
| `color/charcoal` | Near-black charcoal-gray body color as photographed — a color name only, not a material or provenance claim; clear cases only | 3, 8, 11, 14, 15, 19; 1646 |
| `mark/painted-number` | Piece number hand-painted on the base in dark pigment | 2250, 2251, 2252, 2253 |
| `mark/incised-number` | Piece number incised/carved into the base clay | 2254, 2255, 2256, 2257, 2258, 2259, 2260; 1571, 1577, 1591; 1697, 1748; 1614, 1615 |
| `mark/handwritten-number` | Piece number handwritten on the bare base — medium not asserted (distinct from `mark/painted-number`, whose members clearly show dark painted pigment) | 2085, 2091 |
| `detail/pooled-interior-glaze` | Glossy glaze pooled in the interior | 2250, 2255, 2257 |
| `detail/glazed-rim-band` | Glaze band along the rim over an otherwise bare body | 1571, 1574, 1576, 1577, 1578, 1579, 1580 |
| `detail/embedded-particles` | Pale grog-like particles visible in the clay body ("grog" not lab-confirmed — see member claims_to_avoid) | 2259; 1694, 1697, 1710; 1759, 1760, 1761, 1762; 1716 |
| `detail/surface-nodules` | Small dark nodules protruding from the clay surface — material never asserted (some store titles call it shale; quoted only) | 1702, 1703; 1729, 1730, 1733, 1735, 1737, 1739, 1741, 1742, 1744, 1745, 1746 |
| `detail/blue-flecks` | Small blue glassy flecks or patches on the surface — "glaze" not asserted unless stated by the store | 1750, 1751 |
| `detail/fabric-impression` | Woven-cloth impression pressed into the clay surface | 1757, 1758 |
| `detail/interior-line-mark` | Thin abstract line mark/drawing visible on the interior glaze | 2252, 2254, 2258 |
| `detail/pink-blush` | Pinkish-tan blush patch on the exterior | 2256, 2257, 2260 |
| `detail/glaze-text` | Handwritten words visible in the glaze decoration — quoted as visible words only, never interpreted | 2089, 2092 |
| `condition/hairline-crack` | Fine hairline crack(s) visible on body, rim, or base — observed only, never characterized as defect or hazard | 2253, 2254, 2258, 2259; 1576; 1603, 1621, 1624 |
| `batch/YYYY-MM-DD` | Photography date from image filenames (not a making/firing date) | `batch/2026-06-16`: 2250–2255 · `batch/2026-06-22`: 2256–2260 · `batch/2023-03-22`: 2 · `batch/2023-03-23`: 5 (the oldest photo dates in the catalog) |

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

## Candidate rulings (Warren, 2026-07-10 — with the 1692–1714 + 2085–2092 batch-3 review)

New terms approved: `surface/metallic-sheen`, `surface/coil-ridges`, `surface/brushed-glaze`, `detail/glaze-text`, and `mark/handwritten-number` (handwritten base numbers in an unidentified medium — kept distinct from `mark/painted-number`, whose members clearly show dark painted pigment; collapse later if Warren prefers). Declined: `detail/white-crust` — the white crusty deposits on 1712/1714 stay prose-only. Color ruling: 1694 and 1709 photograph dusty mauve/rose rather than a clear terracotta red; **a color tag needs a clear match** — unclear cases carry no color tag and are described in prose instead. Standing rules reapplied: faint/uncertain features prose-only (1698/1700/1708 seams and soft ridges, 2091's faint letter-like mark, 2088's illegible base marks); store phrases ("ash-glazed", "salt-fired", "Lake Erie Inclusions", "eroded", "weathered", "Geological Experiment", "Local Clay") quoted, never asserted.

## Candidate rulings (Warren, 2026-07-10 — with the batch-4 review: the first twenty + 1716–1725)

New term approved: `color/charcoal` (near-black charcoal-gray as photographed; a color name only, per the standing rule that color names must never sound like material or provenance claims). Declined: `detail/penny-for-scale` — the penny beside pieces 2 and 5 stays in prose, no tag and no explainer. Attribution ruling: the shared 1722–1725 listing photo (four vessels on a stone ledge) is attributed left-to-right as 1722, 1723, 1724, 1725 (Warren confirmed the order); each page describes only its own position and notes the group photo openly. `form/vase` (registered via the CSV allowlist, where it stays — its member set is generator-maintained) gains its first visually reviewed members, 14 and 1718. Recovered photo dates: `batch/2023-03-22` (piece 2) and `batch/2023-03-23` (piece 5), read from IMG-dated filenames — the oldest photography dates in the catalog. Standing rules reapplied: faint/uncertain features prose-only (soft bands on 8, 13, 17, 20; the folds on 1723; the beaded rim gloss on 1716; pale base swirls on 5); the pressed-looking disc 2 and the smooth-walled 3, 12, 16, 18, 19 carry no `technique/handbuilt` tag because their forming method isn't visible in the photos.

## Candidate rulings (Warren, 2026-07-10 — with the batch-5 review: 1603–1651)

New term approved: `surface/fissured-crust` (deep drying-style fissures webbing a sandy body; observed only, never characterized as defect; clear cases only — softer crazing on 1636 and 1649 stays in prose). Color rulings reapplied: the dusty plum/rose/brick reds of 1631–1651 carry NO color tag per the batch-3 clear-match rule (described in prose); 1646 is a clear `color/charcoal` member; the sandy tan of 1625–1630 has no registry color and stays prose-only. Staging/props recorded in claims_to_avoid, never in prose as product facts: sage bundles (1606, 1608), candle jar (1641, 1645), laptop-and-books desk scene (1641), Japanese-ceramics book (1646, 1647), a black rock (1647), background pieces (1640), and the cracked dry ground under the outdoor photos (1635–1640) — a setting, never an origin claim. 1610's red-orange underlayer breaking through white stays prose-only (1 member).

## Candidates (1 member so far — waiting on the 2-piece rule)

- `condition/rim-crack` — crack from rim into interior, more pronounced than hairline (2256 only; its claims_to_avoid forbids characterizing it)
- `surface/speckle-cluster` — star-like speckle cluster (2255 only)
- `technique/kurinuki`, `material/wild-clay-slip` — known from the project's history but no reviewed piece pages carry them yet

## Technique pages

Every technique page carries its matching tag so it appears on the tag listing alongside its pieces: `techniques/handbuilding` (`technique/handbuilt`), `techniques/crackle-glaze` (`surface/crackle-glaze`), `techniques/speckled-surfaces` (`surface/speckled`), `techniques/numbered-bases` (`mark/painted-number`, `mark/incised-number`), and — added with the 2026-07-08 reviewed-page repair — `techniques/bare-clay` (`surface/bare-clay`), `techniques/embedded-particles` (`detail/embedded-particles`), `techniques/surface-nodules` (`detail/surface-nodules`), `techniques/pale-wash` (`surface/pale-wash`), `techniques/blue-flecks` (`detail/blue-flecks`), `techniques/fabric-impression` (`detail/fabric-impression`), `techniques/scored-marks` (`surface/scored-marks`), `techniques/glazed-rim-band` (`detail/glazed-rim-band`) — and, added with the 2026-07-10 batch-3 review: `techniques/metallic-sheen` (`surface/metallic-sheen`), `techniques/coil-ridges` (`surface/coil-ridges`), `techniques/brushed-glaze` (`surface/brushed-glaze`), `techniques/glaze-text` (`detail/glaze-text`). `techniques/numbered-bases` additionally carries `mark/handwritten-number` (all three number-mark styles share one explainer). Added with the 2026-07-10 batch-5 review: `techniques/fissured-crust` (`surface/fissured-crust`). Explainer slug = tag leaf, verbatim.
