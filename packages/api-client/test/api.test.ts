import { describe, it, expect, vi } from 'vitest';
import { APIClient } from '../src';

describe('APIClient', () => {
  it('calls fetch with base url', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });
    const client = new APIClient('http://localhost');
    // @ts-ignore
    global.fetch = fetchMock;
    await client.getMenu();
    expect(fetchMock).toHaveBeenCalledWith('http://localhost/menu', expect.any(Object));
  });
});
