# apfyp-quartz — public site for A Penny For Your Pottery

Quartz v5 site for A Penny For Your Pottery (APFYP): a 10,000-piece numbered ceramic series priced at $0.01 × piece number, sold on Shopify. This repo is the **public frontend only** — story, catalog pages, essays. Shopify owns commerce.

## Architecture (the four layers)

| Layer | Role |
|---|---|
| Obsidian vault (`Desktop\claudeobsidian\claude-obsidian-main`) | **Private** knowledge/source layer. Never a publish source; material moves here → `content/` only by explicit per-page curation. |
| This repo `content/` | Public Markdown. If it's in `content/`, it's on the internet. |
| GitHub (`origin` = oswarren/apfyp-quartz) | Version control + deploy. Push to `main` → GitHub Actions → GitHub Pages, served at `archive.apennyforyourpottery.com` (repo name and served domain differ — the old `oswarren.github.io/apfyp-quartz` URL 301s here). |
| Shopify (`apennyforyourpottery.com`) | **Source of truth** for checkout, price, inventory, availability, product images. We link out; we never assert. |

## Hard rules

1. **Never commit**: CSV exports, `.env`, tokens (`shpat_`/`shpss_`), customer/order data, revenue figures, contact names, or anything from the vault's private notes. Pre-push check: `git diff origin/main | grep -E 'shpat_|shpss_|@gmail|\.csv'`.
2. **Never edit `quartz/` internals** (or other upstream-tracked code). Customize via `quartz.config.yaml` (theme, plugins, and the `layout:` section — Quartz v5 has no quartz.layout.ts) and custom components — keeps `git merge upstream/v5` cheap. `upstream` = jackyzha0/quartz.
3. **Never state live price/availability/inventory as fact.** Pages say "listed at $N" + link to the Shopify product. Inventory quantity in exports is unreliable by design (conflates sold with unmade).
4. **Don't create pages for unphotographed/reserve pieces** (~93% of the catalog). Piece pages exist only for photographed pieces.
5. **Ask before deleting, renaming, or moving existing content pages.**
6. **Content generation (Substack/Instagram/blurbs) lives in the private vault, not here** — its drafts and editorial system never enter this public repo.

## Content model

```
content/
  index.md        homepage
  about.md        the project, the penny rule, how to buy
  pieces/N.md     one page per photographed piece (schema below)
  ranges/         hand-curated collection/range pages (the storytelling unit)
  discover/       essays, process notes, project updates
```

Piece-page frontmatter schema (see `content/pieces/2250.md` for the reference example): `type: catalog-piece`, `piece_number`, `title`, `description`, `price`, `shopify_handle`, `product_url`, `image_urls` (Shopify CDN), `production_date`, `visual_status`, `checkout_source`, `editorial.claims_to_avoid` (list of claims this page must NOT make — respect it when editing).

`visual_status` values: `images_unreviewed` (generated, no visual claims allowed) · `ai_visual_reviewed` (Claude inspected the actual listing photos; page carries `visual_reviewed_by` + `visual_review_date`; treated as curated/frozen by the generator) · `real_images_reviewed` (human-checked — the gold standard; promote an AI-reviewed page by flipping the field after looking yourself). Visual review is report-first: no page gains visual metadata without its images having actually been viewed, and new taxonomy terms are proposed as candidates, never applied silently.

Buy links: `https://apennyforyourpottery.com/products/{shopify_handle}`; handles are stable `pottery-piece-N`.

### Reviewed-page standard (every `ai_visual_reviewed` / `real_images_reviewed` page)

1. Hero image with observed alt text.
2. Observed prose with a wikilink on each visible feature that has a `content/techniques/` explainer page.
3. One short bespoke Q&A block (bold question + 1–2 sentence answer ending with number and price) — drawn from that piece's own review evidence, never boilerplate.
4. Footer nav: `Previous/Next (where neighbor pages exist) · [[range-…|Full range]]` plus a discover/date link when one exists.
5. Full registry tags + per-piece `editorial.claims_to_avoid`.
6. **No process voice.** Customer copy never narrates the site's own caution — no "this page doesn't guess", "the page records the look and nothing else", or "what a photo can't prove". When a cause, material, or firing is unknown, describe only what's visible and **stop**; the open question goes to the maker via `/review-claims` (it becomes his answer on the page, or nothing), never onto the page as a hedge. Same failure family as the pulled "how this catalog is documented" meta-page — remove the internal vocabulary, don't explain it. First-person maker hedges ("I'm not sure what gives it that sheen") are fine. Lint **E8** enforces this; `node scripts/claim-impact.mjs --piece N --open` lists a page's unresolved questions to ask.

Explainer slugs = the tag leaf verbatim (`surface/scored-marks` → `techniques/scored-marks.md`). When a review batch approves new feature terms, they get explainer pages in the same pass so piece prose has link targets, and the run gets a `ranges/range-A-B.md` page as its grouping path (photography-date grouping is impossible when image filenames carry no timestamps).

## Taxonomy (discovery funnel)

`docs/taxonomy.md` is the registry of allowed tags — **a tag not listed there may not be used on any page**; add the term to the registry first (reviewable diff, 2-piece rule). Nested tags (`surface/crackle-glaze`, `mark/incised-number`, `batch/YYYY-MM-DD`) are the taxonomy carrier; Quartz auto-generates `/tags/...` listing pages. Visual tags only on pages with `visual_status: real_images_reviewed` — never on `images_unreviewed` generated pages. Technique explainers live in `content/techniques/` and carry their matching tag so they appear beside their pieces on tag pages. Funnel: piece page (tags + inline wikilinks) → technique/tag page → related pieces → Shopify.

## Claim registry (maker verification)

`data/claims/` is the machine-readable store of **fact status** for every technical claim the site asserts (clay bodies, slips, glazes, forming, firing, intent) — schema in `data/claims/README.md`. `docs/taxonomy.md` keeps the tag vocabulary and the narrative ruling log; the registry owns whether each claim is `confirmed`/`corrected`/`rejected`/`visual-only`/`probable`/`unknown`. Maker-confirmed facts outrank all AI inference; rejected claims never regenerate. Public repo, same exposure as the ruling log — no private text (private answers get `private_ref: true` and live in the vault).

- `node scripts/extract-claims.mjs [--write]` — harvest asserted technical claims from all content into the registry; idempotent, dry-run by default. Never writes maker fields (status/reviewed/maker_response/assertable).
- `node scripts/claim-impact.mjs [--queue N | --piece N [--open]]` — stale-page report after a ruling; review queue by blast radius; per-piece scope resolution; `--open` lists just that piece's unresolved questions (the "ask the maker" view behind Reviewed-page standard rule 6).
- `node scripts/lint-taxonomy.mjs` also enforces the registry: **E5** a page asserts a rejected/corrected term, **E6** a tag is rejected for its piece, **E7** the registry leaks private data; **E8** a piece/technique page carries a process-voice hedge (Reviewed-page standard rule 6); **W3** prose drifted a material word past the registry. Runs in `deploy.yml` — main can't ship a resurrected rejected claim or a process-voice hedge.
- Review with **`/review-claims`** (`.claude/commands/review-claims.md`): compact confirm/correct/reject questions to Warren, one group per round, answers saved to the registry per round; resumable via `docs/claims/review-log.md`. Never re-reviews images. After rulings, the **`apfyp-writer`** agent rewrites only the stale pages from confirmed facts (diff-first, never invents claims).

## Workflow

- `main` = live site. Work on short-lived branches (`content/…`, `config/…`, `fix/…`), preview locally, merge.
- Local preview: `npx quartz build --serve` (default port 8080). Plain build check: `npx quartz build`.
- Content-only changes: build locally → merge. Config/layout/workflow/script changes: run the `code-reviewer` agent on the diff first.
- **Before every content merge**: `node scripts/lint-taxonomy.mjs` (registry-legal tags, provenance, wikilinks, and claim-registry checks E5/E6/E7 — exit 1 blocks) + the leak grep from rule 1. After editing pages to reconcile a maker ruling, run `node scripts/extract-claims.mjs --write` then `node scripts/claim-impact.mjs` to confirm no stale pages remain.
- Piece-page generation: `node scripts/generate-pieces.mjs <csv-path> --survey` to audit an export, `--range A-B [--write]` to generate a reviewable batch. The CSV lives in the vault's `.raw/`, never in this repo. Pages without `generated: true` are curated and never touched by the script. When extending the catalog, start the new range one piece before the previous boundary (e.g. after 2261-2263, next batch is 2263-2400) so the boundary page's Next link refreshes.
- Conventional commits; `content:` prefix for page-only changes.

## Project agents (`.claude/agents/`)

Adapted from [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents) — only these five are installed by design; don't add more without asking.

| Agent | Use for |
|---|---|
| `minimal-change-engineer` | Any implementation work — smallest viable diff, scope guard |
| `git-workflow-master` | Branching, upstream syncs, deploy/rollback questions |
| `code-reviewer` | Pre-merge review of non-content changes (read-only) |
| `frontend-developer` | Layout/component/SCSS work, page templates |
| `data-engineer` | Generator/schema/lint work — CSV parsing, frontmatter contract, data-quality gates |
| `apfyp-writer` | Rewriting piece/technique/range prose AFTER maker verification — confirmed registry facts + safe visual observations only, never invents claims |

SEO/AEO handling is currently lint rules (E5/W3) + a checklist inside `apfyp-writer`; a dedicated SEO/AEO agent stays planned-later, adopted only when organic-performance work starts. Content generation (Substack/Instagram/blurbs) still lives in the private vault, not here.
