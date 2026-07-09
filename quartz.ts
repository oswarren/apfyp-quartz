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
  filterFn: (node) => node.slugSegment !== "pieces" && node.slugSegment !== "tags",
})

// APFYP: the Ledger (/pieces/) says "by number" — make the listing honor it.
// Pieces sort numerically by piece_number; non-piece entries sort by title,
// intermixed (no folders-first pass, unlike the plugin default — fine while
// every content folder is flat). Unlike the Explorer filterFn above, this
// sort runs at build time and is not serialized to the client.
// Note: ExternalPlugin.FolderPage is the plugin's RAW factory, not an
// override wrapper (the generated .quartz/plugins/index.ts only wraps exports
// whose `declare const` sits in dist/index.d.ts; FolderPage's lives in a
// chunk file) — calling it would register nothing. Register the override the
// same way the generated wrappers do, keyed by plugin directory name.
componentRegistry.setOptionOverrides("folder-page", {
  showSubfolders: true,
  showFolderCount: false, // each index page's own prose introduces its list
  sort: (a: QuartzPluginData, b: QuartzPluginData) => {
    const pa = (a.frontmatter as Record<string, unknown> | undefined)?.piece_number
    const pb = (b.frontmatter as Record<string, unknown> | undefined)?.piece_number
    const na = typeof pa === "number" ? pa : null
    const nb = typeof pb === "number" ? pb : null
    if (na !== null && nb !== null) return na - nb
    if (na !== null) return 1 // curated non-piece entries list first
    if (nb !== null) return -1
    const ta = a.frontmatter?.title?.toLowerCase() ?? ""
    const tb = b.frontmatter?.title?.toLowerCase() ?? ""
    return ta.localeCompare(tb)
  },
})

const config = await loadQuartzConfig()
export default config
export const layout = await loadQuartzLayout()
