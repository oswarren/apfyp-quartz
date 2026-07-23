// APFYP: /reserve page behaviour. Bundled into the site's global postscript by
// componentResources (see components/ReservePicker.ts) and re-run on every SPA
// navigation via the "nav" event. It is a no-op on pages without the widget.

const MIN = 2400
const MAX = 10000
const PRODUCT_URL = "https://apennyforyourpottery.com/products/pottery-piece-"

// The penny rule: a piece costs its number in cents. 2500 -> $25.00, 4271 -> $42.71.
function priceOf(n: number): string {
  return `$${Math.floor(n / 100)}.${String(n % 100).padStart(2, "0")}`
}

// One short factual tag, highest-priority match only. Every in-range number
// below MAX is four digits, so the digit tests can assume that shape.
function notableTag(n: number): string | null {
  if (n === MAX) return "the final piece"
  const digits = String(n)
  if (digits.length === 4) {
    if (digits.split("").every((d) => d === digits[0])) return "a repdigit"
    if (digits === digits.split("").reverse().join("")) return "a palindrome"
    let ascending = true
    for (let i = 1; i < digits.length; i++) {
      if (Number(digits[i]) !== Number(digits[i - 1]) + 1) {
        ascending = false
        break
      }
    }
    if (ascending) return "a run"
  }
  if (n % 100 === 0) return `a round ${priceOf(n)}`
  return null
}

function describe(n: number): string {
  if (!Number.isInteger(n) || n < MIN || n > MAX) {
    return `Outside the reservable range (${MIN} to ${MAX})`
  }
  const tag = notableTag(n)
  return `Piece ${n} = ${priceOf(n)}${tag ? ` — ${tag}` : ""}`
}

// null for anything we must not redirect on: blank, non-integer, out of range.
function reservable(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === "") return null
  const n = Number(trimmed)
  if (!Number.isInteger(n) || n < MIN || n > MAX) return null
  return n
}

function isTyping(el: Element | null): boolean {
  if (!el) return false
  const tag = el.tagName
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    (el as HTMLElement).isContentEditable === true
  )
}

function setupReserve() {
  const widget = document.querySelector(".reserve-widget")
  if (!widget) return

  const form = widget.querySelector("form.reserve-form") as HTMLFormElement | null
  const input = widget.querySelector("input.reserve-input") as HTMLInputElement | null
  const randomButton = widget.querySelector("button.reserve-random") as HTMLButtonElement | null
  const feedback = widget.querySelector(".reserve-feedback") as HTMLElement | null
  if (!form || !input || !randomButton || !feedback) return

  const show = (raw: string) => {
    const trimmed = raw.trim()
    feedback.textContent = trimmed === "" ? "" : describe(Number(trimmed))
  }

  const go = (n: number) => window.location.assign(PRODUCT_URL + n)

  const onInput = () => show(input.value)

  // Covers both Enter in the number box and the Reserve button (type=submit).
  const onSubmit = (e: Event) => {
    e.preventDefault()
    show(input.value)
    const n = reservable(input.value)
    if (n !== null) go(n)
  }

  const onRandom = () => {
    const n = MIN + Math.floor(Math.random() * (MAX - MIN + 1))
    input.value = String(n)
    show(input.value)
    go(n)
  }

  // Bare "r" only: never while a field is focused (site search, the number box),
  // and never as part of a browser shortcut such as ctrl/cmd+r.
  const onKeydown = (e: KeyboardEvent) => {
    if (e.key !== "r" && e.key !== "R") return
    if (e.ctrlKey || e.metaKey || e.altKey) return
    if (isTyping(e.target as Element | null) || isTyping(document.activeElement)) return
    e.preventDefault()
    onRandom()
  }

  input.addEventListener("input", onInput)
  window.addCleanup(() => input.removeEventListener("input", onInput))
  form.addEventListener("submit", onSubmit)
  window.addCleanup(() => form.removeEventListener("submit", onSubmit))
  randomButton.addEventListener("click", onRandom)
  window.addCleanup(() => randomButton.removeEventListener("click", onRandom))
  document.addEventListener("keydown", onKeydown)
  window.addCleanup(() => document.removeEventListener("keydown", onKeydown))

  show(input.value)
}

document.addEventListener("nav", setupReserve)
