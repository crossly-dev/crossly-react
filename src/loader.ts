/**
 * Client-only registration of the @crossly/embed custom elements.
 *
 * `@crossly/embed` declares `class … extends HTMLElement` at module scope, so
 * importing it on a server (Next.js, Remix, Astro, Vite SSR) throws
 * `HTMLElement is not defined`. This module never imports it statically: the
 * elements are loaded with a dynamic `import()` the first time a component
 * mounts in a browser, and the promise is shared by every component on the
 * page.
 */

/** Every tag @crossly/embed registers. */
export const CROSSLY_TAGS = [
  'crossly-catalog',
  'crossly-buy-button',
  'crossly-index',
  'crossly-mark',
] as const;

export type CrosslyTag = (typeof CROSSLY_TAGS)[number];

let pending: Promise<void> | undefined;

/** True when all four elements are registered (by this package or by `https://crossly.net/embed.js`). */
export function isCrosslyDefined(): boolean {
  if (typeof window === 'undefined' || !window.customElements) return false;
  return CROSSLY_TAGS.every((tag) => window.customElements.get(tag) !== undefined);
}

/**
 * Register the Crossly custom elements. Safe to call any number of times; the
 * embed itself guards `customElements.define`, so a page that also includes the
 * hosted `embed.js` script does not throw.
 *
 * Rejects outside a browser.
 */
export function loadCrosslyElements(): Promise<void> {
  if (typeof window === 'undefined' || !window.customElements) {
    return Promise.reject(new Error('Crossly elements can only be registered in a browser.'));
  }
  if (isCrosslyDefined()) return Promise.resolve();
  pending ??= import('@crossly/embed').then(
    (embed) => {
      embed.defineCrosslyElements();
    },
    (err: unknown) => {
      // Let a later mount retry, e.g. after a flaky chunk load.
      pending = undefined;
      throw err;
    },
  );
  return pending;
}
