# apfyp-quartz — public site for A Penny For Your Pottery

Quartz v5 site for A Penny For Your Pottery (APFYP): a 10,000-piece numbered ceramic series priced at $0.01 × piece number, sold on Shopify. This repo is the **public frontend only** — story, catalog pages, essays. Shopify owns commerce.

## Architecture (the four layers)

| Layer | Role |
|---|---|
| Obsidian vault (`Desktop\claudeobsidian\claude-obsidian-main`) | **Private** knowledge/source layer. Never a publish source; material moves here → `content/` only by explicit per-page curation. |
| This repo `content/` | Public Markdown. If it's in `content/`, it's on the internet. |
| GitHub (`origin` = oswarren/apfyp-quartz) | Version control + deploy. Push to `main` → GitHub Actions → GitHub Pages at `oswarren.github.io/apfyp-quartz`. |
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

Buy links: `https://apennyforyourpottery.com/products/{shopify_handle}`; handles are stable `pottery-piece-N`.

## Taxonomy (discovery funnel)

`docs/taxonomy.md` is the registry of allowed tags — **a tag not listed there may not be used on any page**; add the term to the registry first (reviewable diff, 2-piece rule). Nested tags (`surface/crackle-glaze`, `mark/incised-number`, `batch/YYYY-MM-DD`) are the taxonomy carrier; Quartz auto-generates `/tags/...` listing pages. Visual tags only on pages with `visual_status: real_images_reviewed` — never on `images_unreviewed` generated pages. Technique explainers live in `content/techniques/` and carry their matching tag so they appear beside their pieces on tag pages. Funnel: piece page (tags + inline wikilinks) → technique/tag page → related pieces → Shopify.

## Workflow

- `main` = live site. Work on short-lived branches (`content/…`, `config/…`, `fix/…`), preview locally, merge.
- Local preview: `npx quartz build --serve` (default port 8080). Plain build check: `npx quartz build`.
- Content-only changes: build locally → merge. Config/layout/workflow/script changes: run the `code-reviewer` agent on the diff first.
- **Before every content merge**: `node scripts/lint-taxonomy.mjs` (registry-legal tags, provenance, wikilinks — exit 1 blocks) + the leak grep from rule 1.
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

Planned later (not yet): technical-writer, SEO/AEO agents once organic-performance work starts. Content generation agents live in the private vault, not here.
