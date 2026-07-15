# Claim review log

Append-only journal of maker-verification review sessions, in the same style as the
`docs/taxonomy.md` batch rulings. Each session records what Warren confirmed, corrected,
rejected, or deferred, which claim groups were touched, and any new `avoid_terms`. The
machine-readable truth lives in `data/claims/`; this file is the narrative record and the
recap source for `/review-claims`.

The registry is seeded from the taxonomy.md batch rulings (batch-15/16/17/18 making notes,
the pale-wash maker's account, and the batch-13 chawan handbuilt contradiction). Those seeds
are already `confirmed`/`rejected` — they are settled context, not open questions.

---

## Session 0 — seed + first extraction (2026-07-14, automated, no maker questions)

Built the claim registry and its tooling. Seeded 10 maker-confirmed rulings from the
taxonomy.md batch log:

- **confirmed** (assertable in prose): May-12 bowls' dark fields are brushed slips / glazes /
  mason stains (batch-15); the pale-wash coating is settled thin glaze (batch-15, already
  published on `techniques/pale-wash.md`).
- **confirmed** (on record, `assertable: false` — stays in `claims_to_avoid`): rust-streak
  cups are wheel-thrown (batch-15); beaded crust is thick slips with plant matter (batch-16);
  pierced holes take a bamboo/rod carrying handle (batch-17); the 1719–1721 boulders are
  salt-fired, base patches are wadding marks (batch-18).
- **rejected**: the May-12 dark fields are NOT carbon-smoke or reduction — `avoid_terms`
  smoke/carbon/reduction (batch-15 re-read).

Flagged one open contradiction for review: `group:range-2051-2100:forming:handbuilt` — the
batch-13 chawans were tagged handbuilt, but batch-15 found throwing rings and turned feet on
closely similar chawans. Status `unknown`, awaiting Warren.

First extraction over 805 pages harvested 2,513 asserted technical occurrences, deduped into
346 claim records (10 confirmed, 2 rejected, 334 open). `node scripts/lint-taxonomy.mjs`:
0 errors, 0 warnings.

Next highest-value: run `/review-claims` — the queue leads with `forming:handbuilt` by era
group and the `stoneware` dark-bowl family (highest publicness — titles and SEO descriptions).

---

## Pilot session — dark bowls (2026-07-14, with Warren)

First live maker review, demonstrating the loop end to end on the June-08 dark-bowl family.

- **Corrected** `group:range-2201-2249:clay-body:stoneware` (2236–2241, 2243): the body is
  **black sculpture clay, not stoneware** (`corrected_value`, `avoid_terms: [stoneware]`,
  `assertable: true`, `source: maker`). Blast radius: 16 locations across 8 files — the piece
  titles, SEO descriptions, bodies, and the range page prose/table. E5 flagged every one; the
  writer replaced "stoneware" with "black sculpture clay" throughout while keeping the visual
  "coarse/sandy/dark/near-black" descriptions; E5 cleared and `claim-impact` shows 0 stale.
- **Confirmed** `group:dark-bowls:surface-material:glaze` (2236–2240): the pooled interiors
  **are glaze** and may be stated (`assertable: true`) — overriding the `surface/glassy-pools`
  "never assert the melt" default for these specific pieces. Their `claims_to_avoid` lines were
  updated to lift the "pooled interior as a specific material" restriction (2236 shown).
- **Policy confirmed:** material-named tags (`crackle-glaze`, `brushed-glaze`,
  `glazed-rim-band`, `black-clay`) keep their names; prose is constrained/hedged unless the
  glaze is separately confirmed. Applies as the default for the S1 glaze-tag session.

Clean pages proven untouched: pieces 1, 2115, 2161 yielded no false material claims (their
only technical claim is the legitimate `handbuilt`/`wheel-thrown` forming record). Nothing was
merged or deployed — all changes sit on the `feat/maker-verification` branch for review.

Next: S1 (glaze-tag family) and S4 (`handbuilt` by era, starting with the chawan contradiction
`group:range-2051-2100:forming:handbuilt`).

---

## Session 2 — S1 glaze-tag family (2026-07-15, with Warren)

Reviewed the seven tags whose name commits to "glaze." Seven rulings:

- **`crackle-glaze` — CORRECTED: not glaze.** The crackled surface is the maker's own
  process — "water dripped in an incremental manner onto dried clay and slips on one side,
  letting the decoration occur, using various clays and materials." Recorded corrected +
  assertable, `avoid_terms: [glaze]` (scoped to the explainer only, empty members → pieces
  untouched). Rewrote `techniques/crackle-glaze.md` as the maker's water-drip account; dropped
  the entire "crazing in a glaze" mechanism and the interior-glaze bullet (that detail lives on
  the piece pages). E5 clear.
- **`brushed-glaze` — VISUAL-ONLY: a mix.** The brushed decoration is slip, glaze, or mason
  stain depending on the piece (per batch-15), not flatly "glaze." Rewrote the explainer to name
  the mix. (`visual-only` rather than `corrected` so E5 doesn't ban the word "glaze," which is
  legitimately part of the mix.)
- **`glazed-rim-band` — CONFIRMED glaze.** Glazed on the inside and outside rim; explainer's
  "a stripe of glaze along the rim" stands as fact.
- **`glaze-flecks` — CONFIRMED glaze.** Mineral flecks suspended in a pale glaze.
- **`pooled-interior-glaze` — CONFIRMED glaze** (new record, 2250/2255/2257).
- **`glaze-text` — VISUAL-ONLY: not glaze.** The handwritten words are part of the brushed
  slip/glaze/stain decoration, medium not asserted. Rewrote the explainer (retitled display
  "Handwritten Words"; tag slug kept).
- **NEW: `clay-body:wild-clay` for the rim-band pieces (~1571–1580) — CONFIRMED, PUBLISH
  PENDING.** Warren volunteered that these are wild-clay bodies. Recorded `assertable: false`
  because these pages' `claims_to_avoid` forbids connection to sourcing/material projects —
  Warren to decide whether "wild clay" may be named on the pages.

Rewrote 3 technique explainers (crackle-glaze, brushed-glaze, glaze-text); lint 0/0, 0 stale.
Standing policy applied: tag slugs/URLs kept; where a glaze-name is now factually wrong
(crackle, glaze-text) the display title was changed but the slug preserved.

**Pending Warren's input (flagged, not acted on):**

1. **Pilot pages** 2250–2260 (human-reviewed gold) plus 2244, and 1708/2074/`pieces/index.md`,
   still describe the crackle as "crackle glaze." Per-page approval needed before applying the
   water-drip correction to any of them — especially the human-reviewed pilot.
2. **Tag-slug renames:** `surface/crackle-glaze` and `detail/glaze-text` now name a material
   they aren't. Rename the slugs (breaks URLs/wikilinks, needs redirects) or keep them as legacy
   visual labels? Warren's call.
3. **Wild-clay publish** decision above.

Next: S2 remainder / S4 (`handbuilt` by era).

### S1 follow-up (2026-07-15, Warren's three directives)

- **Crackle correction applied to the pilot pages.** The 11 human-reviewed pilot cups
  (2250–2260) plus `pieces/index.md` were rewritten: "crackle glaze" / "crackled glaze" →
  "crackle" / "crackled surface"; the wikilink display `[[crackle-glaze|crackle glaze]]` →
  `[[crackle-glaze|crackle]]` (slug preserved). The **confirmed interior "pooled glaze"** on
  2250/2255/2257 was left untouched. `1708` needed nothing (it already said "No glaze is
  visible… the network is in the clay surface"). `2074` was **left alone** — it's a genuinely
  glazed vessel (not crackle-glaze-tagged), so the water-drip ruling doesn't apply.
- **Wild clay published** on the seven glazed-rim-band pieces (1571, 1574, 1576, 1577, 1578,
  1579, 1580). Named in each description and body (colors kept), added the `material/wild-clay`
  discovery tag (its first maker-confirmed members), lifted the per-page "don't call the body
  'wild clay'" guardrail, and rewrote the sourcing-project `claims_to_avoid` line to permit the
  material while still barring links to the Wild Clay Archive / Locator projects. Registry
  record set `assertable: true`. taxonomy.md note added.
- **Tag-slug rename: not done — would break URLs.** The alias-redirects plugin covers content
  pages but NOT the auto-generated `/tags/…` pages, and a technique explainer's slug must match
  its tag leaf. So renaming `surface/crackle-glaze` or `detail/glaze-text` would 404 their
  `/tags/` URLs with no redirect. The **display titles** were already corrected in S1 ("Crackle
  Surface", "Handwritten Words"); the slugs stay as legacy labels.
- **Lint fix:** dropped "wild clay archive" from the E7 leak pattern — it's public guardrail
  vocabulary (in `claims_to_avoid` on many pages), so it false-positived on legitimate
  "do not link to it" notes. E7 now matches only the canonical rule-1 secrets.

**`2244` resolved (2026-07-15):** Warren confirmed it's the same water-drip crackle as the
cups. Rewrote its description, alt text, body, and Q&A — "crazed/peeling glaze" → "crackled,
peeling surface"; the interpretation-implying "crazed" softened to "crackled." Added 2244 to
the `group:crackle-glaze:surface-material:glaze` members so E5 now bans "glaze" on it too (it
has no legitimate glaze, unlike the pilot cups' confirmed interiors). The maker-reviewed record
overrides the old range-level inference for 2244. Lint 0/0, 0 stale.

S1 and its follow-ups are fully closed. Next: **S4** (`handbuilt` by era, starting with the
batch-13 chawan contradiction `group:range-2051-2100:forming:handbuilt`).
