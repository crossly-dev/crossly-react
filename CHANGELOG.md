# Changelog

All notable changes to `@crossly/react` are documented here. This project follows
[Semantic Versioning](https://semver.org/).

## 0.1.0 - 2026-11-27

First release.

- `<Catalog>`, `<BuyButton>`, `<PriceIndex>` and `<PriceMark>` wrap `<crossly-catalog>`, `<crossly-buy-button>`,
  `<crossly-index>` and `<crossly-mark>` from `@crossly/embed` ^0.1.0.
- Typed event callbacks: `onLoaded`, `onCheckout`, `onError` (`crossly:loaded`, `crossly:checkout`,
  `crossly:error`), called with `(detail, event)`.
- `<CrosslyProvider>` sets a default `pk` / `api` for its subtree.
- SSR-safe: no `window` access at import. The elements are registered on first client mount through one shared
  dynamic import. `fallback` renders on the server.
- Attributes are set before the element connects, so each mount makes one request.
- React 18.2+ and 19, ESM with TypeScript declarations.
