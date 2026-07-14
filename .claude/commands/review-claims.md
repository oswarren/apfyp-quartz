---
description: Run a maker-verification review session over the claim registry (data/claims/).
---

# /review-claims — maker verification session

You are running a claim-review session with Warren (the maker and sole owner of A Penny For
Your Pottery). The archive's inferred claims already live in the claim registry at
`data/claims/` (schema: `data/claims/README.md`). Your job is to walk the **open queue**
(records with no `reviewed` date), ask Warren compact questions, and record his answers as
structured rulings. **You are not reviewing photographs.** The registry is the review queue.

Argument (optional): `$ARGUMENTS` may name a claim group, a range, an axis (`stoneware`,
`slip`, `handbuilt`), or `status` (recap only, ask nothing). No argument → resume from the
highest-value open item.

## Absolute rules (from CLAUDE.md + data/claims/README.md)

- **Never invent or re-infer.** You present what the registry already says and record what
  Warren says back. You do not propose new tags or new interpretations.
- **Never look at images** unless a claim is impossible to understand without one — say so
  and ask before doing it.
- **Write to the registry per round, before prose.** A ruling is saved the moment Warren
  gives it, so "stop" is always safe. Prose rewriting is a separate step (the writer agent),
  never mixed into a review round.
- **Maker answers outrank everything.** Never overwrite a `reviewed` record with inference.
  Never widen a group answer beyond the members Warren confirms. Never turn `probable` into
  `confirmed`. Never publish a `private` note.
- **Work on a branch** (`content/claims-session-N`). Every registry write is a reviewable diff.
- The repo is **public**. Private answers never enter `data/`; they get `private_ref: true`
  and go to the vault (`claude-obsidian-main/apfyp/claims-private.md`, keyed by claim id).

## Session start — the recap (always first)

Compute the recap from files, never from memory:

1. Read the tail of `docs/claims/review-log.md` — what the last session resolved.
2. Run `node scripts/claim-impact.mjs --queue 8` — the next highest-blast-radius open items.
3. Run `node scripts/claim-impact.mjs` — any ruled claims whose pages are still stale (work
   the writer still owes).

Then print a five-line recap:

```
Review session N — resuming
Last session (DATE): X claims resolved (breakdown). Y page diffs still pending.
Open queue: Q items — top by impact: <axis:value> (P pieces, F files).
Suggested next: <group>.
Say "go", name a group, or "stop" — everything saves as we go.
```

## The review loop — one claim group per round

Pick the next group (by impact = pieces × downstream files × publicness — titles and
descriptions outrank body prose). Present it compactly, then ask.

**Presenting a group** (chat, before the question):

```
Claim: <the assertion in plain words>
Currently on: <N pieces> — <collapsed member runs, e.g. 2236–2241, 2243>
  <batch date / range nickname so Warren places them by era, not number>
  e.g. 2236 (dark sandy bowl, glossy liner), 2238 (…) — 1–3 visual cues
Also rides on: <range page, technique page, SEO descriptions — the downstream files>
Registry id: <claim id>
```

Collapse runs, always give the total, offer "show photos" (pages carry CDN image URLs) only
if Warren asks. Never present more than one claim group per question round.

**Two modes:**

- **Mode Q — nuanced/heterogeneous groups.** One `AskUserQuestion` call, up to 4
  sub-questions _about this one group_:
  1. Fact: is the claim true? (`Yes` / `No — it's…` / `Probably / not sure` / `Varies`)
  2. Scope: does it hold for all listed? (`All` / `All except…` / `Only some…`)
  3. Output policy: may pages state it? (`State it plainly` / `Keep pages visual, fact on
record only` / `Private — vault only` / `Reword — I'll say how`)
  4. Naming (only when a tag name is implicated): keep / rename / demote to visual.
- **Mode L — homogeneous batch confirms.** A numbered chat list of ≤10 one-line claims,
  answered in free text: `"1 ok, 2 is glaze not slip, 3 defer, rest ok"`.

**Free-text answers** ("1 and 3 correct; 2 is glaze not slip; applies to 1754–1760 only") —
parse into `(claim-id → status, corrected_value, scope, exceptions)`, then **echo a Recorded:
table before/with the write**:

```
Recorded:
1. <claim> — CONFIRMED (all N)
2. <claim> — CORRECTED: glaze, not slip → registry + N pages flagged
3. <claim> — DEFERRED
Say a number to fix anything.
```

One clarifying question max per ambiguous item; if still unclear, set `deferred` and keep the
raw answer in `maker_response`. Then write the registry.

## Mapping answers to the registry

Edit the covering record(s) in `data/claims/*.yaml`. Set `reviewed` to today, `source: maker`,
and `maker_response` to Warren's public-safe wording. Status vocabulary (full list in the
README):

| Warren says              | status                         | other fields                                               |
| ------------------------ | ------------------------------ | ---------------------------------------------------------- |
| correct / yes            | `confirmed`                    | `assertable: true` only if he OKs stating it in prose      |
| wrong, it's X            | `corrected`                    | `corrected_value: X`, old value → `avoid_terms`            |
| false / not that         | `rejected`                     | value → `avoid_terms`                                      |
| real look, wrong process | `visual-only`                  | keep the tag, prose stays appearance-only                  |
| probably / think so      | `probable`                     | publishable only as first-person hedge, if `assertable`    |
| don't remember           | `probable` + `confidence: low` | `maker_response: "doesn't recall"`                         |
| skip                     | `deferred`                     | leave `reviewed` empty so it stays queued                  |
| never say this again     | `never-use`                    | value + wording → `avoid_terms`                            |
| private                  | keep true status               | `private_ref: true`, value/notes to the vault, not `data/` |

**Group scope + exceptions:** set the group record's `members` to exactly what Warren
confirms; put excluded pieces in `exceptions`. A piece-specific answer that differs from the
group gets its own `piece:` record (it overrides the group by scope resolution — README rule 3).
Never let a group answer silently cover a piece Warren didn't name.

**Hedged publishing (Warren's standing instruction):** `probable` + `assertable` prose uses
**first person** — "I believe…", "if I remember correctly…". Never "the maker recalls…".

After writing: `node scripts/extract-claims.mjs --write` (refresh affected_outputs against the
edited registry), then `node scripts/claim-impact.mjs` to show which pages are now stale.

## Ordering (impact-first, not numeric)

Default queue order is blast radius (`--queue`). The intended session sequence:
S1 the "glaze"-named tag family · S2 "stoneware" dark families (titles + SEO — highest
publicness) · S3 the "slip" prose sweep · S4 forming/`handbuilt` by era groups (the chawan
contradiction `group:range-2051-2100:forming:handbuilt` first) · S5 material-adjacent looks ·
S6 the making-note publish decisions (seed groups with `assertable: false`) · S7–S8 residue.
The 10 seeded rulings are already `confirmed`/`rejected` — never re-ask them; cite them as
settled context.

## Every 4 groups / on "stop"

Print a mini-recap (resolved this session, ~time of high-value work left). On "stop" or
session end:

1. Append a dated entry to `docs/claims/review-log.md` in the taxonomy-ruling style
   (what was confirmed/corrected/rejected, which groups, any new `avoid_terms`).
2. Print the next-session preview (`--queue 5`).
3. Remind Warren the writer step (rewriting stale pages from the confirmed facts) is separate
   and runs only after he approves — nothing is published in a review session.

Never deploy. Never rewrite piece prose inside a review round. Registry first, prose later.
