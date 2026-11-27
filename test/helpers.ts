import { vi } from 'vitest';

export const PK = 'crossly_pk_test_fixture';
export const API = 'https://api.crossly.test/api';

export const LISTING = {
  id: 'lst_1',
  title: "Levi's 501",
  description: null,
  priceCents: 4599,
  imageUrl: null,
  brand: "Levi's",
  size: '32',
  condition: 'good',
  available: true,
};

interface FakeReply {
  status?: number;
  body: unknown;
}

/** Stub global fetch with the only parts of Response the embed reads: ok, status, json(). */
export function mockFetch(reply: (url: string, init: RequestInit) => FakeReply) {
  const fn = vi.fn(async (input: string | URL, init: RequestInit = {}) => {
    const { status = 200, body } = reply(String(input), init);
    return { ok: status >= 200 && status < 300, status, json: async () => body } as unknown as Response;
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

export function headersOf(init: RequestInit | undefined): Record<string, string> {
  return (init?.headers ?? {}) as Record<string, string>;
}
