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
