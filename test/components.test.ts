import { createElement as h } from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BuyButton,
  Catalog,
  CrosslyProvider,
  PriceIndex,
  PriceMark,
  isCrosslyDefined,
} from '../src/index.js';
import { API, LISTING, PK, headersOf, mockFetch } from './helpers.js';

afterEach(() => cleanup());

describe('<Catalog>', () => {
  it('renders the fallback, then <crossly-catalog> with attributes, and makes exactly one request', async () => {
    const fetch = mockFetch(() => ({ body: { data: [LISTING] } }));
    const onLoaded = vi.fn();
    const { container } = render(
      h(Catalog, {
        pk: PK,
        api: API,
        limit: 3,
        className: 'shop',
        style: { '--crossly-accent': '#ff5a5f' },
        fallback: h('p', null, 'loading'),
        onLoaded,
      }),
    );
    expect(container.textContent).toBe('loading');

    await waitFor(() => expect(onLoaded).toHaveBeenCalledTimes(1));
    expect(isCrosslyDefined()).toBe(true);

    const el = container.querySelector('crossly-catalog')!;
    expect(el).not.toBeNull();
    expect(el.getAttribute('pk')).toBe(PK);
    expect(el.getAttribute('limit')).toBe('3');
    expect(el.getAttribute('q')).toBeNull();
    expect(el.getAttribute('class')).toBe('shop');
    expect((el as HTMLElement).style.getPropertyValue('--crossly-accent')).toBe('#ff5a5f');

    const [detail, event] = onLoaded.mock.calls[0]!;
    expect(detail).toEqual({ listings: [LISTING] });
    expect((event as CustomEvent).type).toBe('crossly:loaded');

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe(`${API}/embed/v1/catalog?limit=3`);
    expect(headersOf(init)['x-crossly-key']).toBe(PK);
    expect(init?.credentials).toBe('omit');
    expect(el.shadowRoot!.textContent).toContain("Levi's 501");
  });

  it('takes pk and api from <CrosslyProvider>', async () => {
    const fetch = mockFetch(() => ({ body: { data: [] } }));
    const onLoaded = vi.fn();
    const { container } = render(h(CrosslyProvider, { pk: PK, api: API }, h(Catalog, { onLoaded })));
    await waitFor(() => expect(container.querySelector('crossly-catalog')).not.toBeNull());
    const el = container.querySelector('crossly-catalog')!;
    expect(el.getAttribute('pk')).toBe(PK);
    expect(el.getAttribute('api')).toBe(API);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(fetch.mock.calls[0]![0]).toBe(`${API}/embed/v1/catalog`);
  });

  it('reloads when a prop changes', async () => {
    const fetch = mockFetch(() => ({ body: { data: [LISTING] } }));
    const onLoaded = vi.fn();
    const { rerender } = render(h(Catalog, { pk: PK, api: API, limit: 3, onLoaded }));
    await waitFor(() => expect(onLoaded).toHaveBeenCalledTimes(1));
    rerender(h(Catalog, { pk: PK, api: API, limit: 5, onLoaded }));
    await waitFor(() => expect(onLoaded).toHaveBeenCalledTimes(2));
    expect(fetch.mock.calls.at(-1)![0]).toBe(`${API}/embed/v1/catalog?limit=5`);
  });

  it('calls onError with the API message', async () => {
    mockFetch(() => ({
      status: 401,
      body: { error: { code: 'unauthorized', message: 'A valid Crossly publishable key is required.' } },
    }));
    const onError = vi.fn();
    const onLoaded = vi.fn();
    render(h(Catalog, { pk: PK, api: API, onError, onLoaded }));
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError.mock.calls[0]![0]).toEqual({ message: 'A valid Crossly publishable key is required.' });
    expect(onLoaded).not.toHaveBeenCalled();
  });
});

describe('<BuyButton>', () => {
  it('posts the checkout and reports the hosted checkout URL', async () => {
    const checkoutUrl = 'https://crossly.net/checkout?item=lst_1%3A2&src=embed';
    const fetch = mockFetch(() => ({ body: { data: { checkoutUrl, mode: 'redirect' } } }));
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const onCheckout = vi.fn();
    const { container } = render(
      h(BuyButton, { pk: PK, api: API, listing: 'lst_1', quantity: 2, label: 'Get it', target: '_blank', onCheckout }),
    );

    await waitFor(() =>
      expect(container.querySelector('crossly-buy-button')?.shadowRoot?.querySelector('button')).toBeTruthy(),
    );
    const button = container.querySelector('crossly-buy-button')!.shadowRoot!.querySelector('button')!;
    expect(button.textContent).toBe('Get it');
    expect(button.disabled).toBe(false);
    expect(fetch).not.toHaveBeenCalled();

    button.click();
    await waitFor(() => expect(onCheckout).toHaveBeenCalledTimes(1));
    expect(onCheckout.mock.calls[0]![0]).toEqual({ checkoutUrl });
    expect(open).toHaveBeenCalledWith(checkoutUrl, '_blank', 'noopener,noreferrer');

    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe(`${API}/embed/v1/checkout`);
    expect(init?.method).toBe('POST');
    expect(headersOf(init)['content-type']).toBe('application/json');
    expect(JSON.parse(String(init?.body))).toEqual({
      items: [{ listingId: 'lst_1', quantity: 2 }],
      returnUrl: window.location.href,
    });
  });
});

describe('<PriceIndex> and <PriceMark>', () => {
  it('loads an index by slug with the default range', async () => {
    const index = {
      slug: 'crossly-50',
      name: 'Crossly 50',
      level: 104.2,
      changeBps: 431,
      points: [
        { day: '2026-11-01', value: 100 },
        { day: '2026-11-26', value: 104.2 },
      ],
      quality: 'A',
      n: 50,
      asOf: '2026-11-26',
      insufficient: false,
      href: 'https://crossly.net/vault/index/crossly-50',
    };
    const fetch = mockFetch(() => ({ body: { data: index } }));
    const onLoaded = vi.fn();
    render(h(PriceIndex, { pk: PK, api: API, slug: 'crossly-50', onLoaded }));
    await waitFor(() => expect(onLoaded).toHaveBeenCalledTimes(1));
    expect(onLoaded.mock.calls[0]![0]).toEqual({ index });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]![0]).toBe(`${API}/embed/v1/vault/index/crossly-50?range=1y`);
  });

  it('sets the reserved `key` attribute from bookKey and makes one request', async () => {
    const mark = {
      bookKey: 'var_1:nm:psa10',
      name: 'Charizard',
      label: 'PSA 10',
      imageUrl: null,
      mark: { cents: 125000, quality: 'B', asOf: '2026-11-26T00:00:00Z' },
      trades30d: 4,
      insufficient: false,
      points: [],
      href: 'https://crossly.net/vault/m/var_1',
    };
    const fetch = mockFetch(() => ({ body: { data: mark } }));
    const onLoaded = vi.fn();
    const { container } = render(
      h(PriceMark, { pk: PK, api: API, bookKey: 'var_1:nm:psa10', range: '3m', onLoaded }),
    );
    await waitFor(() => expect(onLoaded).toHaveBeenCalledTimes(1));
    expect(container.querySelector('crossly-mark')!.getAttribute('key')).toBe('var_1:nm:psa10');
    expect(onLoaded.mock.calls[0]![0]).toEqual({ mark });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]![0]).toBe(`${API}/embed/v1/vault/mark?bookKey=var_1%3Anm%3Apsa10&range=3m`);
  });
});
