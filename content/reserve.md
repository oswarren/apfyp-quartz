---
type: catalog-reserve
title: "Reserve a piece by number"
description: "Jump to any piece from 2400 to 10000 on the Shopify store — type a number, or press R for a random one."
checkout_source: Shopify
---

Pieces 2400 through 10000 haven't been made yet, so they're reserved by number. Type a number from 2400 to 10000 below, or press **R** for a random one, and this page opens that piece's listing on the store.

<!-- Editing note: this block must stay contiguous. A blank line inside it splits
the CommonMark HTML block and the rest gets parsed as Markdown. Behaviour and
styles live in components/ReservePicker.ts (registered in quartz.ts), not in an
inline script — Quartz re-runs component scripts on SPA navigation, page scripts
it does not. -->
<div class="reserve-widget">
<form class="reserve-form" autocomplete="off">
<label class="reserve-label" for="reserve-number">Piece number</label>
<input class="reserve-input" id="reserve-number" name="reserve-number" type="number" inputmode="numeric" step="1" placeholder="2500" aria-describedby="reserve-feedback">
<button class="reserve-go" type="submit">Reserve</button>
<button class="reserve-random" type="button">Random piece</button>
</form>
<p class="reserve-feedback" id="reserve-feedback" role="status" aria-live="polite"></p>
</div>

A piece costs its number in cents — piece 2500 is listed at \$25.00, piece 4271 at \$42.71 — which is the same penny rule the whole series runs on. The [Shopify listing](https://apennyforyourpottery.com) is the only source of truth for price, availability, and checkout.

Numbers below 2400 aren't reservable: those pieces are already made. The photographed ones live in [the Ledger](pieces/).
