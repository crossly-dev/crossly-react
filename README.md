# @crossly/react

[![npm](https://img.shields.io/npm/v/@crossly/react?color=10b981&label=npm)](https://www.npmjs.com/package/@crossly/react)
[![CI](https://github.com/crossly-dev/crossly-react/actions/workflows/ci.yml/badge.svg)](https://github.com/crossly-dev/crossly-react/actions/workflows/ci.yml)
[![React 18 | 19](https://img.shields.io/badge/react-18%20%7C%2019-61dafb)](#compatibility)
[![types](https://img.shields.io/npm/types/@crossly/react)](./src/components.ts)
[![license](https://img.shields.io/github/license/crossly-dev/crossly-react)](./LICENSE)

React components for the [Crossly](https://crossly.net) embeddable storefront. Put your Crossly listings, a buy
button and Vault Markets price widgets on your own React site, with typed props and typed event callbacks.

They wrap the custom elements from [`@crossly/embed`](https://github.com/crossly-dev/crossly-embed)
(`<crossly-catalog>`, `<crossly-buy-button>`, `<crossly-index>`, `<crossly-mark>`). Every prop, event and
default below comes from that package's source.

- **SSR-safe.** Nothing touches `window` at import. The elements are registered in the browser on first mount.
- **One request per mount.** Attributes are on the element before it connects, so it doesn't fetch twice.
- **No payments on your page.** The buy button sends the buyer to a Crossly-hosted checkout.
- **Public key only.** Uses a publishable key (`crossly_pk_live_…`). It is built to sit in page source.

> Using Next.js? [`@crossly/next`](https://github.com/crossly-dev/crossly-next) re-exports these components for
> the App Router and adds server-side fetch helpers.

## Install

```bash
npm install @crossly/react
# pnpm add @crossly/react · yarn add @crossly/react · bun add @crossly/react
```

`react` (18.2+ or 19) is a peer dependency. `@crossly/embed` is installed with this package (see
[Why `@crossly/embed` is a dependency](#why-crosslyembed-is-a-dependency)).

## Quick start

Mint a publishable key in **Crossly → Settings → Embeds**.

```tsx
import { BuyButton, Catalog, CrosslyProvider } from '@crossly/react';

export function Shop() {
  return (
    <CrosslyProvider pk={import.meta.env.VITE_CROSSLY_PK}>
      <Catalog
        limit={24}
        fallback={<p>Loading the shop…</p>}
        onLoaded={({ listings }) => console.log(`${listings.length} listings`)}
        onError={({ message }) => console.warn(message)}
      />

      <BuyButton listing="lst_123" label="Buy now" />
    </CrosslyProvider>
  );
}
```

A full Vite app is in [`examples/vite`](./examples/vite).

## Components

Every component accepts these props:

| prop | type | |
|---|---|---|
| `pk` | `string` | Your publishable key. **Required** here or on `<CrosslyProvider>`. The prop wins. Without it the element shows "Missing `pk`". |
| `api` | `string` | Overrides the API base (default `https://crossly.net/api`). For testing. |
| `className` | `string` | Set as `class` on the custom element. |
| `style` | `CSSProperties` | Inline style on the custom element. `--crossly-*` variables work. |
| `id` | `string` | Set on the custom element. |
| `fallback` | `ReactNode` | Rendered on the server and until the elements are registered. Use it for a skeleton. |
| `onError` | `(detail: { message: string }, event) => void` | `crossly:error`: the API rejected the request, or the embed script failed to load. |

Callbacks get the event's `detail` first and the raw `CustomEvent` second.

### `<Catalog>` (`<crossly-catalog>`)

Your active listings as a responsive grid. Sold items show "Sold" in place of a price.

| prop | type | default | |
|---|---|---|---|
| `limit` | `number` | `12` | How many to show, 1–48. |
| `q` | `string` | | Free-text filter over title and brand. See [Known limitations](#known-limitations). |
| `onLoaded` | `(detail: { listings: EmbedListing[] }, event) => void` | | `crossly:loaded`: the listings that were rendered. |

`EmbedListing` is `{ id, title, description, priceCents, imageUrl, brand, size, condition, available }`. Money is
always integer cents.

### `<BuyButton>` (`<crossly-buy-button>`)

Starts a checkout. It POSTs `{ items: [{ listingId, quantity }], returnUrl: location.href }` and sends the buyer to
the returned Crossly-hosted URL.

| prop | type | default | |
|---|---|---|---|
| `listing` | `string` | | **Required.** The listing id. The button is disabled without it. |
| `quantity` | `number` | `1` | Units (the API accepts 1–10). |
| `label` | `string` | `"Buy now"` | Button text. Shows "Starting checkout…" while the request runs. |
| `target` | `'_self' \| '_blank' \| string` | `'_self'` | `_self` navigates this tab. Any other value goes to `window.open(url, target, 'noopener,noreferrer')`. |
| `onCheckout` | `(detail: { checkoutUrl: string }, event) => void` | | `crossly:checkout`: the checkout URL was issued, just before navigation. |

### `<PriceIndex>` (`<crossly-index>`)

A Crossly Vault Markets index level, its move, a sparkline, and what it rests on (quality letter, n markets,
as-of date). Shows **Insufficient data** when the data is too thin.

| prop | type | default | |
|---|---|---|---|
| `slug` | `string` | | **Required.** The index slug, e.g. `crossly-50`. |
| `range` | `'1m' \| '3m' \| '6m' \| '1y' \| '5y'` | `'1y'` | Sparkline history. |
| `onLoaded` | `(detail: { index: EmbedIndexWidget }, event) => void` | | `crossly:loaded`. |

### `<PriceMark>` (`<crossly-mark>`)

One vault market's mark, with its quality letter, trades in the last 30 days and as-of date. Shows **No market
yet** when there isn't one.

| prop | type | default | |
|---|---|---|---|
| `bookKey` | `string` | | **Required.** The market's book key, `<variantId>:<condition>:<grade>`. This becomes the element's `key` attribute (React reserves `key`, so the prop has a different name). |
| `range` | `'1m' \| '3m' \| '6m' \| '1y' \| '5y'` | `'1y'` | Sparkline history. |
| `onLoaded` | `(detail: { mark: EmbedMarkWidget }, event) => void` | | `crossly:loaded`. |

### `<CrosslyProvider>`

`<CrosslyProvider pk api>` sets the default `pk` and `api` for every component below it. `useCrosslyConfig()`
reads them.

### Utilities

| export | |
|---|---|
| `loadCrosslyElements(): Promise<void>` | Registers the four elements. Browser only (rejects on a server). Shared and idempotent. |
| `isCrosslyDefined(): boolean` | `true` once all four tags are registered, by this package or by the hosted `embed.js`. |
| `CROSSLY_TAGS` | The four tag names. |
| types | `EmbedListing`, `EmbedIndexWidget`, `EmbedMarkWidget`, `CrosslyRange`, `CatalogLoadedDetail`, `CheckoutDetail`, `IndexLoadedDetail`, `MarkLoadedDetail`, `ErrorDetail`, `CrosslyEventMap`, and every `*Props`. |

`formatPrice(cents, currency?, locale?)` comes from `@crossly/embed`. Import it in client code only, because that
module defines `HTMLElement` subclasses when it loads.

## Theming

The elements use Shadow DOM, so your CSS can't break their layout. They expose CSS custom properties and `::part`s.
Set the variables **on the element** (by tag, `className`, or `style`), not on a parent: each element declares
its own defaults on `:host`, and those override inherited values.

```css
crossly-catalog,
crossly-buy-button {
  --crossly-accent: #ff5a5f;   /* buttons */
  --crossly-radius: 2px;
  --crossly-min-col: 260px;    /* grid column minimum */
  --crossly-card-bg: #fafafa;
}
crossly-catalog::part(card)  { box-shadow: 0 2px 8px rgb(0 0 0 / 0.08); }
crossly-catalog::part(title) { font-family: Georgia, serif; }
```

```tsx
<Catalog className="shop" style={{ '--crossly-accent': '#ff5a5f' }} />
```

| variable | default (light) | dark (`prefers-color-scheme`) |
|---|---|---|
| `--crossly-gap` | `16px` | |
| `--crossly-radius` | `10px` | |
| `--crossly-fg` | `#111` | `#f3f4f6` |
| `--crossly-muted` | `#666` | `#9ca3af` |
| `--crossly-accent` | `#10b981` | |
| `--crossly-card-bg` | `#fff` | `#111827` |
| `--crossly-border` | `#e5e7eb` | `#374151` |
| `--crossly-min-col` | `200px` | |

| element | parts |
|---|---|
| `crossly-catalog` | `grid`, `card`, `image`, `title`, `meta`, `price` |
| `crossly-buy-button` | `button` |
| `crossly-index`, `crossly-mark` | `widget`, `title`, `value`, `change` (index), `image` (mark), `sparkline`, `meta` |

Fonts are inherited from your page.

## SSR and frameworks

- **Server:** `@crossly/embed` declares `class … extends HTMLElement` at module scope, so importing it on a server
  throws. This package never imports it statically. On the server (and on the first client render, so hydration
  matches) each component renders only its `fallback`.
- **Client:** on first mount, one shared dynamic `import('@crossly/embed')` registers the elements. Each component
  then renders its custom element with all attributes set before it connects, so the element makes one request.
- **React Server Components:** the modules start with `'use client'`, so you can render them from a Server
  Component. In Next.js, use [`@crossly/next`](https://github.com/crossly-dev/crossly-next).
- **Already loading `https://crossly.net/embed.js`?** That's fine. Registration is guarded, and the components
  reuse elements that are already defined.

## Known limitations

These come from `@crossly/embed` 0.1.0 and the live API. The wrapper does not hide them:

- **`crossly:checkout` can't be cancelled yet.** The event is dispatched as `cancelable`, but 0.1.0 navigates
  even if you call `preventDefault()`. Use `onCheckout` for analytics, not to replace navigation.
- **`q` (text search).** For a fresh search (`q` of 2+ characters), the API requires a proof-of-work header.
  The 0.1.0 element doesn't send one, so a `q` search surfaces through `onError` ("A proof-of-work solution is
  required for search…"). A catalog without `q` is unaffected.
- **Origin allowlist.** If your key has an allowlist (Settings → Embeds), the page origin must be on it. That
  covers both the requests and the checkout `returnUrl`, which is always the current page. An empty allowlist
  permits any origin.

## Why `@crossly/embed` is a dependency

It's a regular dependency, not a peer. These components are a typed facade over one exact contract (attribute
names, event names, `detail` shapes), so this package states which embed range it was written against and installs
it with itself. You install one package, not two. If your page also loads the hosted `embed.js`, nothing breaks:
`defineCrosslyElements()` skips tags that are already registered.

## Compatibility

| | |
|---|---|
| React | 18.2+ and 19 (CI runs both) |
| Module format | ESM, with TypeScript declarations |
| Browsers | anything with Custom Elements v1 and Shadow DOM (all evergreen browsers) |

## Links

- Crossly docs: https://crossly.net/docs
- The elements: https://github.com/crossly-dev/crossly-embed
- Next.js: https://github.com/crossly-dev/crossly-next
- Other frameworks: [Vue](https://github.com/crossly-dev/crossly-vue) ·
  [Nuxt](https://github.com/crossly-dev/crossly-nuxt) · [Svelte](https://github.com/crossly-dev/crossly-svelte) ·
  [Angular](https://github.com/crossly-dev/crossly-angular) ·
  [React Native](https://github.com/crossly-dev/crossly-react-native)
- Security: see the org [security policy](https://github.com/crossly-dev/.github/blob/main/SECURITY.md). Use
  private vulnerability reporting on this repo.

## License

[MIT](./LICENSE)
