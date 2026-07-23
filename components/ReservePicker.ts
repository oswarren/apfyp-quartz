// APFYP: script + styles for the /reserve page.
//
// Why a registered component instead of a <script> in the Markdown: Quartz
// renders raw HTML from content, but an inline <script> in a page body neither
// survives the render reliably nor re-executes on SPA navigation (spa.inline
// re-runs head scripts only, so arriving at /reserve from another page would
// leave a dead widget). Component resources do re-run: componentResources.ts
// collects .css and .afterDOMLoaded from every component in
// componentRegistry.getAllComponents() into the site's global stylesheet and
// postscript, and the script re-attaches on each "nav" event.
//
// Why the markup lives in content/reserve.md rather than in this component:
// in Quartz v5 a page layout is assembled only from the plugin entries in
// quartz.config.yaml (config-loader.ts builds the PageTypeDispatcher from
// loadQuartzLayout() itself, so the documented `export const layout` override
// in quartz.ts is not consulted). Placing a repo-local component on the page
// would mean shipping a local plugin package; the widget markup is instead
// raw HTML in the page, the same pattern as content/archive-services.md.
//
// Registered in quartz.ts. The script is inert on every other page.

import { QuartzComponent, QuartzComponentConstructor } from "../quartz/components/types"
// @ts-ignore: the .inline.ts esbuild loader turns this import into a script string
import script from "./scripts/reserve.inline"

const styles = `
.reserve-widget {
  margin: 1.5rem 0 1.75rem;
  padding: 1.1rem 1.25rem;
  border: 1px solid var(--lightgray);
  border-radius: 5px;
}
.reserve-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
}
.reserve-label {
  font-weight: 600;
}
.reserve-input {
  width: 7.5rem;
  padding: 0.5rem 0.6rem;
  font-family: inherit;
  font-size: 1rem;
  color: var(--dark);
  background: var(--light);
  border: 1px solid var(--gray);
  border-radius: 4px;
}
.reserve-widget button {
  padding: 0.55rem 1.05rem;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 600;
  border: 1px solid var(--secondary);
  border-radius: 4px;
  cursor: pointer;
}
.reserve-go {
  background: var(--secondary);
  color: var(--light);
}
.reserve-random {
  background: transparent;
  color: var(--secondary);
}
.reserve-widget button:hover {
  opacity: 0.88;
}
.reserve-input:focus-visible,
.reserve-widget button:focus-visible {
  outline: 2px solid var(--dark);
  outline-offset: 2px;
}
.reserve-feedback {
  margin: 0.9rem 0 0;
  min-height: 1.5em;
  color: var(--darkgray);
}
`

const ReservePicker: QuartzComponentConstructor = () => {
  // Renders nothing: the widget's markup is authored in content/reserve.md.
  const Component: QuartzComponent = () => null
  Component.css = styles
  Component.afterDOMLoaded = script
  return Component
}

export default ReservePicker
