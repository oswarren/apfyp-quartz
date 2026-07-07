import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import * as ExternalPlugin from "./.quartz/plugins"

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

const config = await loadQuartzConfig()
export default config
export const layout = await loadQuartzLayout()
