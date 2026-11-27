// @vitest-environment node
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BuyButton, Catalog, PriceIndex, PriceMark, loadCrosslyElements } from '../src/index.js';

describe('server rendering', () => {
  it('imports and renders without a DOM', () => {
    expect(typeof window).toBe('undefined');
    const html = renderToString(
      h(
        'div',
        null,
        h(Catalog, { pk: 'crossly_pk_test_x', fallback: h('p', null, 'loading') }),
        h(BuyButton, { pk: 'crossly_pk_test_x', listing: 'lst_1' }),
        h(PriceIndex, { pk: 'crossly_pk_test_x', slug: 'crossly-50' }),
        h(PriceMark, { pk: 'crossly_pk_test_x', bookKey: 'a:b:c' }),
      ),
    );
    expect(html).toBe('<div><p>loading</p></div>');
  });

  it('refuses to register elements on a server', async () => {
    await expect(loadCrosslyElements()).rejects.toThrow(/browser/);
  });
});
