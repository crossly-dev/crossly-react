import type { EmbedIndexWidget, EmbedListing, EmbedMarkWidget } from '@crossly/embed';

export type { EmbedIndexWidget, EmbedListing, EmbedMarkWidget };

/** History window for `<crossly-index>` / `<crossly-mark>` sparklines. The embed falls back to `1y` for anything else. */
export type CrosslyRange = '1m' | '3m' | '6m' | '1y' | '5y';

/** `detail` of `crossly:loaded` from `<crossly-catalog>`. */
export interface CatalogLoadedDetail {
  listings: EmbedListing[];
}

/** `detail` of `crossly:loaded` from `<crossly-index>`. */
export interface IndexLoadedDetail {
  index: EmbedIndexWidget;
}

/** `detail` of `crossly:loaded` from `<crossly-mark>`. */
export interface MarkLoadedDetail {
  mark: EmbedMarkWidget;
}

/** `detail` of `crossly:checkout` from `<crossly-buy-button>`. */
export interface CheckoutDetail {
  checkoutUrl: string;
}

/** `detail` of `crossly:error` from every element. */
export interface ErrorDetail {
  message: string;
}

/** Map of DOM event name to its `detail`, as dispatched by @crossly/embed 0.1.x. */
export interface CrosslyEventMap {
  'crossly:loaded': CatalogLoadedDetail | IndexLoadedDetail | MarkLoadedDetail;
  'crossly:checkout': CheckoutDetail;
  'crossly:error': ErrorDetail;
}
