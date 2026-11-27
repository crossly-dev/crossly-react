'use client';

import {
  createContext,
  createElement,
  Fragment,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
import { loadCrosslyElements, type CrosslyTag } from './loader.js';
import type {
  CatalogLoadedDetail,
  CheckoutDetail,
  CrosslyRange,
  ErrorDetail,
  IndexLoadedDetail,
  MarkLoadedDetail,
} from './types.js';

/* ── Provider ──────────────────────────────────────────────────────── */

export interface CrosslyConfig {
  /** Publishable key (`crossly_pk_live_…` / `crossly_pk_test_…`). Public by design. */
  pk?: string;
  /** Override the API base (the embed's `api` attribute). Defaults to `https://crossly.net/api`. For testing. */
  api?: string;
}

const CrosslyContext = createContext<CrosslyConfig>({});

export interface CrosslyProviderProps extends CrosslyConfig {
  children?: ReactNode;
}

/** Supplies a default `pk` (and `api`) to every Crossly component below it. A component's own prop wins. */
export function CrosslyProvider({ pk, api, children }: CrosslyProviderProps): ReactElement {
  const value = useMemo<CrosslyConfig>(() => ({ pk, api }), [pk, api]);
  return createElement(CrosslyContext.Provider, { value }, children);
}

/** The `pk`/`api` from the nearest `<CrosslyProvider>`. */
export function useCrosslyConfig(): CrosslyConfig {
  return useContext(CrosslyContext);
}

/* ── Shared plumbing ───────────────────────────────────────────────── */

/** A typed event callback: the event's `detail` first, the raw `CustomEvent` second. */
export type CrosslyHandler<D> = (detail: D, event: CustomEvent<D>) => void;

export interface CrosslyBaseProps extends CrosslyConfig {
  id?: string;
  /** Applied to the custom element as `class`. Target it to set `--crossly-*` variables. */
  className?: string;
  /** Inline style on the custom element. CSS custom properties work: `{ '--crossly-accent': '#ff5a5f' }`. */
  style?: CSSProperties & Record<`--${string}`, string | number | undefined>;
  /**
   * Rendered on the server and until the elements are registered in the browser
   * (one dynamic import, shared by every component). Use it for a skeleton.
   */
  fallback?: ReactNode;
  /** `crossly:error`: the request failed (bad key, origin not allowed, network…). Also called if the embed script itself fails to load. */
  onError?: CrosslyHandler<ErrorDetail>;
}

// useLayoutEffect warns during SSR in React 18. Nothing below runs on a server
// anyway (the element only renders once `ready`), so plain useEffect there.
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

type Attrs = Record<string, string | number | null | undefined>;
type AnyHandler = CrosslyHandler<never> | undefined;

function stringAttrs(attrs: Attrs): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === '') continue;
    out[name] = String(value);
  }
  return out;
}

function syncAttr(el: Element, name: string, value: string | undefined): void {
  if (value === undefined || value === '') {
    if (el.hasAttribute(name)) el.removeAttribute(name);
  } else if (el.getAttribute(name) !== value) {
    el.setAttribute(name, value);
  }
}

interface ElementSpec {
  tag: CrosslyTag;
  base: CrosslyBaseProps;
  /** Rendered as attributes by React, so they are present before the element connects. */
  attrs: Attrs;
  /**
   * Attributes React cannot render. `key` is reserved by React, so
   * `<crossly-mark key>` gets it from a layout effect: the element's first,
   * synchronous pass sees it missing and makes no request, then the attribute
   * lands in the same commit (before paint) and triggers the one real load.
   */
  imperative?: Record<string, string | undefined>;
  /** DOM event name → callback. The key set must be stable per component. */
  events: Record<string, AnyHandler>;
}

function useCrosslyElement(spec: ElementSpec): ReactElement | null {
  const { tag, base, attrs, imperative, events } = spec;
  const config = useContext(CrosslyContext);
  const [ready, setReady] = useState(false);
  const ref = useRef<HTMLElement | null>(null);

  const handlers = useRef(events);
  const onError = useRef(base.onError);
  useIsoLayoutEffect(() => {
    handlers.current = events;
    onError.current = base.onError;
  });

  useEffect(() => {
    let live = true;
    loadCrosslyElements().then(
      () => {
        if (live) setReady(true);
      },
      (err: unknown) => {
        if (!live) return;
        const detail: ErrorDetail = {
          message: err instanceof Error ? err.message : 'Could not load the Crossly embed.',
        };
        onError.current?.(detail, new CustomEvent('crossly:error', { detail }));
      },
    );
    return () => {
      live = false;
    };
  }, []);

  const imperativeKey = imperative ? JSON.stringify(imperative) : '';
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el || !imperative) return;
    for (const [name, value] of Object.entries(imperative)) syncAttr(el, name, value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, imperativeKey]);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const names = [...Object.keys(handlers.current), 'crossly:error'];
    const listeners = names.map((name) => {
      const listener = (event: Event) => {
        const custom = event as CustomEvent<never>;
        // Ignore events bubbling up from a nested element we don't own.
        if (event.target !== el) return;
        const handler = name === 'crossly:error' ? onError.current : handlers.current[name];
        handler?.(custom.detail, custom);
      };
      el.addEventListener(name, listener);
      return [name, listener] as const;
    });
    return () => {
      for (const [name, listener] of listeners) el.removeEventListener(name, listener);
    };
  }, [ready]);

  if (!ready) return base.fallback === undefined ? null : createElement(Fragment, null, base.fallback);

  return createElement(tag, {
    ref,
    id: base.id,
    // Custom elements take `class`, not `className`, in React 18.
    class: base.className,
    style: base.style,
    ...stringAttrs({
      pk: base.pk ?? config.pk,
      api: base.api ?? config.api,
      ...attrs,
    }),
  });
}

/* ── <Catalog> ─────────────────────────────────────────────────────── */

export interface CatalogProps extends CrosslyBaseProps {
  /** How many listings to show, 1–48. The API defaults to 12. */
  limit?: number;
  /** Free-text filter over title and brand. See the README: fresh searches need a proof-of-work the 0.1.0 embed does not send. */
  q?: string;
  /** `crossly:loaded`: the listings that were rendered. */
  onLoaded?: CrosslyHandler<CatalogLoadedDetail>;
}

/** `<crossly-catalog>`: the seller's active listings as a responsive grid. */
export function Catalog({ limit, q, onLoaded, ...base }: CatalogProps): ReactElement | null {
  return useCrosslyElement({
    tag: 'crossly-catalog',
    base,
    attrs: { limit, q },
    events: { 'crossly:loaded': onLoaded as AnyHandler },
  });
}

/* ── <BuyButton> ───────────────────────────────────────────────────── */

export interface BuyButtonProps extends CrosslyBaseProps {
  /** The listing id. Required. */
  listing: string;
  /** Units to buy. Default 1 (the API accepts 1–10). */
  quantity?: number;
  /** Button text. Default "Buy now". */
  label?: string;
  /** Where the hosted checkout opens. `_self` (default) navigates this tab; anything else is passed to `window.open`. */
  target?: '_self' | '_blank' | (string & {});
  /**
   * `crossly:checkout`: a Crossly-hosted checkout URL was issued. Fired just
   * before the embed navigates. The event is `cancelable`, but @crossly/embed
   * 0.1.0 navigates regardless of `preventDefault()`.
   */
  onCheckout?: CrosslyHandler<CheckoutDetail>;
}

/** `<crossly-buy-button>`: starts a Crossly-hosted checkout. It never takes payment details on your page. */
export function BuyButton({
  listing,
  quantity,
  label,
  target,
  onCheckout,
  ...base
}: BuyButtonProps): ReactElement | null {
  return useCrosslyElement({
    tag: 'crossly-buy-button',
    base,
    attrs: { listing, quantity, label, target },
    events: { 'crossly:checkout': onCheckout as AnyHandler },
  });
}

/* ── <PriceIndex> ──────────────────────────────────────────────────── */

export interface PriceIndexProps extends CrosslyBaseProps {
  /** The Vault Markets index slug, e.g. `crossly-50`. Required. */
  slug: string;
  /** Sparkline history. Default `1y`. */
  range?: CrosslyRange;
  /** `crossly:loaded`: the index payload that was rendered. */
  onLoaded?: CrosslyHandler<IndexLoadedDetail>;
}

/** `<crossly-index>`: a Crossly Vault Markets index level with its quality, n and as-of date. */
export function PriceIndex({ slug, range, onLoaded, ...base }: PriceIndexProps): ReactElement | null {
  return useCrosslyElement({
    tag: 'crossly-index',
    base,
    attrs: { slug, range },
    events: { 'crossly:loaded': onLoaded as AnyHandler },
  });
}

/* ── <PriceMark> ───────────────────────────────────────────────────── */

export interface PriceMarkProps extends CrosslyBaseProps {
  /** The market's book key, `<variantId>:<condition>:<grade>`. Rendered as the element's `key` attribute. Required. */
  bookKey: string;
  /** Sparkline history. Default `1y`. */
  range?: CrosslyRange;
  /** `crossly:loaded`: the mark payload that was rendered. */
  onLoaded?: CrosslyHandler<MarkLoadedDetail>;
}

/** `<crossly-mark>`: one Vault Markets market's mark, with its quality, trades in the last 30 days and as-of date. */
export function PriceMark({ bookKey, range, onLoaded, ...base }: PriceMarkProps): ReactElement | null {
  return useCrosslyElement({
    tag: 'crossly-mark',
    base,
    attrs: { range },
    imperative: { key: bookKey || undefined },
    events: { 'crossly:loaded': onLoaded as AnyHandler },
  });
}
