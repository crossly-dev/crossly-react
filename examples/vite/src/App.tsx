import { useState } from 'react';
import {
  BuyButton,
  Catalog,
  CrosslyProvider,
  PriceIndex,
  type EmbedListing,
} from '@crossly/react';

// A publishable key is public by design: it can read your active listings and start a checkout, nothing else.
// Mint one in Crossly → Settings → Embeds. (In a real app, read it from import.meta.env.VITE_CROSSLY_PK.)
const PK = 'crossly_pk_live_replace_me';

export function App() {
  const [listings, setListings] = useState<EmbedListing[]>([]);
  const [error, setError] = useState<string | null>(null);

  return (
    <CrosslyProvider pk={PK}>
      <h1>My shop</h1>

      <Catalog
        limit={12}
        className="shop"
        style={{ '--crossly-accent': '#ff5a5f', '--crossly-min-col': '220px' }}
        fallback={<p>Loading listings…</p>}
        onLoaded={({ listings }) => setListings(listings)}
        onError={({ message }) => setError(message)}
      />
      {error && <p role="alert">{error}</p>}

      <h2>Buy directly</h2>
      <ul>
        {listings
          .filter((l) => l.available)
          .slice(0, 3)
          .map((l) => (
            <li key={l.id}>
              {l.title}{' '}
              <BuyButton
                listing={l.id}
                label="Buy"
                onCheckout={({ checkoutUrl }) => console.info('checkout', checkoutUrl)}
              />
            </li>
          ))}
      </ul>

      <h2>Market</h2>
      <PriceIndex slug="crossly-50" range="6m" />
    </CrosslyProvider>
  );
}
