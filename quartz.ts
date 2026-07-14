import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import { componentRegistry } from "./quartz/components/registry"
import * as ExternalPlugin from "./.quartz/plugins"
import type { QuartzPluginData } from "@quartz-community/types"

// APFYP: hide the pieces/ file tree from the sidebar explorer. The Ledger
// (/pieces/), tags, ranges, and techniques are the browse surfaces — a
// several-hundred-item file list is not. Docs-sanctioned override surface
// (docs/features/explorer.md, "Advanced customization"). Pages stay built
// and linkable; only the explorer tree entry is removed.
// Notes: this REPLACES the plugin's default filter (which hides "tags"), so
// both exclusions must be listed here; the segment matches at ANY depth, not
// just top level; and the function is serialized to the client — it must
// stay closure-free.
ExternalPlugin.Explorer({
  filterFn: (node: { slugSegment: string }) =>
    node.slugSegment !== "pieces" && node.slugSegment !== "tags",
})

// APFYP: the Ledger (/pieces/) says "by number" — make listings honor it.
// Pieces sort numerically by piece_number; non-piece entries sort by title,
// intermixed (no folders-first pass, unlike the plugin default — fine while
// every content folder is flat). Unlike the Explorer filterFn above, this
// sort runs at build time and is not serialized to the client.
const byPieceNumberThenTitle = (a: QuartzPluginData, b: QuartzPluginData) => {
  const pa = (a.frontmatter as Record<string, unknown> | undefined)?.piece_number
  const pb = (b.frontmatter as Record<string, unknown> | undefined)?.piece_number
  const na = typeof pa === "number" ? pa : null
  const nb = typeof pb === "number" ? pb : null
  if (na !== null && nb !== null) return na - nb
  if (na !== null) return 1 // curated non-piece entries list first
  if (nb !== null) return -1
  // Ranges carry no piece_number; sort them by the numeric START of the range
  // (parsed from the range-<start>-<end> slug) so 541-619 precedes 2334-2335
  // instead of comparing titles/slugs as strings. Non-range pages fall through
  // to the title ordering below unchanged. This stays a consistent ordering
  // because a range page only ever shares a listing with other ranges (the
  // ranges/ folder holds only range pages, which are untagged) or with pieces
  // (which short-circuit above) — never with a title-sorted non-range page.
  const rangeStart = (d: QuartzPluginData): number | null => {
    const m = /(?:^|\/)range-(\d+)-\d+$/.exec(String(d.slug ?? ""))
    return m ? parseInt(m[1], 10) : null
  }
  const ra = rangeStart(a)
  const rb = rangeStart(b)
  if (ra !== null && rb !== null) return ra - rb
  const ta = a.frontmatter?.title?.toLowerCase() ?? ""
  const tb = b.frontmatter?.title?.toLowerCase() ?? ""
  return ta.localeCompare(tb)
}

// Note: ExternalPlugin.FolderPage is the plugin's RAW factory, not an
// override wrapper (the generated .quartz/plugins/index.ts only wraps exports
// whose `declare const` sits in dist/index.d.ts; FolderPage's lives in a
// chunk file) — calling it would register nothing. Register the override the
// same way the generated wrappers do, keyed by plugin directory name.
componentRegistry.setOptionOverrides("folder-page", {
  showSubfolders: true,
  showFolderCount: false, // each index page's own prose introduces its list
  sort: byPieceNumberThenTitle,
})

const config = await loadQuartzConfig()

// APFYP: tag pages previously shuffled by the plugin's default sort
// (byDateAndAlphabeticalFolderFirst — a hidden edit-date ordering). Give them the same
// Ledger order, so technique explainers lead and pieces ascend by number.
// setOptionOverrides("tag-page", { sort }) is NOT enough here: the loader
// does merge it into the factory opts per-key (config-loader.ts:445-447, so
// the numPages manifest default would survive), and TagPageOptions declares
// sort (.quartz/plugins/tag-page/src/pageType.ts:13) — but the vendored
// factory never forwards its opts to the body component (`body: TagContent`
// raw, dist/index.js:2918), and the dispatcher instantiates every page-type
// body with NO options (quartz/plugins/pageTypes/dispatcher.ts:30). The same
// override works for folder-page only because that factory closes over opts
// (`body: () => FolderContentComponent(opts)`). Until tag-page does the
// same upstream, rebind the loaded TagPage instance's body to a TagContent
// bound to the shared sort; TagContent merges its own { numPages: 10 }
// default internally, so nothing else changes.
let tagPageRebound = false
for (const pt of config.plugins.pageTypes ?? []) {
  if (pt.name === "TagPage") {
    pt.body = () => ExternalPlugin.TagContent({ sort: byPieceNumberThenTitle })
    tagPageRebound = true
  }
}
if (!tagPageRebound) {
  // Tripwire: if an upstream tag-page bump renames the instance, the rebind
  // silently matches nothing and tag pages revert to hidden edit-date order.
  throw new Error(
    "quartz.ts: no TagPage page-type instance found to rebind — tag-page plugin renamed/changed upstream?",
  )
}

export default config
export const layout = await loadQuartzLayout()
