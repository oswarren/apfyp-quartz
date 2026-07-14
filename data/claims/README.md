# APFYP claim registry

The machine-readable store of **fact status** for every technical claim the archive makes
(clay bodies, slips, glazes, forming, firing, maker intent). The narrative record of _review
sessions_ stays in `docs/taxonomy.md`'s ruling log; this registry is the single source of
truth for **what is confirmed, what is inferred, and what is rejected**.

Same exposure contract as the rulings log: everything in `data/` is public. **No field in
this schema may hold private text.** `maker_response` is the wording Warren approved for the
public record. Facts whose value itself is private get `private_ref: true` and the real
answer lives in the vault (`claude-obsidian-main/apfyp/claims-private.md`, keyed by claim id).

## Files

- `../claim-lexicon.yaml` — the vocabulary that turns prose into auditable claims; drives
  `scripts/extract-claims.mjs` and lint W3/E5.
- `groups.yaml` — records with `scope: group` (a family of pieces, a range, a technique page).
- `pieces-NNNN.yaml` — records with `scope: piece`, sharded per 100-piece block
  (`pieces-2200.yaml` holds pieces 2200–2299).

Files are machine-rewritten by `node scripts/extract-claims.mjs --write` — comments do not
survive a rewrite, which is why the schema lives here instead of inline.

## Record schema

```yaml
- id: piece:2236:clay-body:stoneware # scope:subject:axis:value — stable, never changes
  claim: "2236 is stoneware" # one human sentence; may carry review context
  subject: 2236 # piece number, or group slug for scope: group
  scope: piece # piece | group
  members: "2236-2241, 2243" # group scope only: the exact pieces covered
  axis: clay-body # clay-body | surface-material | forming | firing | intent | other
  value: stoneware # normalized value — use the lexicon key where one exists
  original: "dark sandy stoneware" # verbatim first-seen inferred wording; frozen
  status: unknown # confirmed | corrected | rejected | visual-only | probable | unknown | deferred | never-use
  corrected_value: # only when status: corrected
  superseded: # prior ruling on change, e.g. "probable (2026-07-20) -> confirmed"
  source: ai-inference # ai-inference | store-copy | visual-observation | maker | ruling-log
  confidence: low # high | medium | low — scripts may only lower it, never raise
  maker_response: # PUBLIC-SAFE wording only
  reviewed: # YYYY-MM-DD of the maker ruling; ABSENT = record is in the review queue
  assertable: false # may page prose state this as fact? set only by a maker ruling
  private_ref: false # true = a vault note exists under this claim id
  exceptions: [] # group scope only: pieces the ruling does NOT cover
  avoid_terms: [] # words banned on covered pages -> lint E5 (rejected/never-use/corrected)
  affected_outputs: # machine-owned, refreshed by extract-claims; never hand-edit
    - content/pieces/2236.md#title
```

## Status vocabulary

| status        | meaning                                                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `confirmed`   | maker says it is true. Prose may state it only if `assertable: true`.                                                                |
| `corrected`   | maker replaced the value — `corrected_value` holds the truth, `value` is now banned wording.                                         |
| `rejected`    | maker says it is false. Never regenerated; lint E5/E6 block reintroduction forever.                                                  |
| `visual-only` | the look is real, the technical interpretation is not endorsed — appearance words only.                                              |
| `probable`    | maker thinks so but isn't certain. Publishable only as hedged first-person prose ("I believe…"). Never silently becomes `confirmed`. |
| `unknown`     | extracted, not yet reviewed. The default for every harvested inference.                                                              |
| `deferred`    | maker skipped it; keeps the raw answer text in `maker_response` if any.                                                              |
| `never-use`   | do not use this claim or wording again, ever.                                                                                        |

## Invariants (enforced by scripts + lint)

1. Maker-sourced state outranks all inference. Scripts (`extract-claims.mjs`) may only write
   `affected_outputs`, `original` (first-seen only), and `confidence` (downward). They never
   write `status`, `reviewed`, `maker_response`, `assertable`, or `exceptions`.
2. `rejected` / `never-use` records are permanent. When re-extraction finds zero remaining
   occurrences the record keeps its ruling with an empty `affected_outputs`.
3. Scope resolution, most specific wins: piece record → group record naming the piece in
   `members` → group record covering it by range. `exceptions` punch holes in groups.
   Between overlapping groups, a maker-reviewed record beats an unreviewed one.
4. `probable` → `confirmed` requires a human diff that records the old state in `superseded`.
5. Repetition across generated pages is ONE claim: the same assertion in a piece's tag,
   prose, description, technique page, and range page is one record with many
   `affected_outputs` — never multiple pieces of evidence.

## Workflow loop

maker ruling (edit status/maker_response here) → `node scripts/extract-claims.mjs --write`
(refresh outputs) → `node scripts/claim-impact.mjs` (list stale pages) → edit the listed
pages → `node scripts/lint-taxonomy.mjs` (E5/E6 prove the fix landed) → merge.

Review sessions: `/review-claims` (see `.claude/commands/review-claims.md`). The queue is
derived — a record with no `reviewed` date is open. There is no separate queue file.
