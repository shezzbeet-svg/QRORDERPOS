import { describe, it, expect } from 'vitest';
import { restaurantSchema } from '../src';

describe('schemas', () => {
  it('parses restaurant', () => {
    const data = restaurantSchema.parse({
      id: '00000000-0000-0000-0000-000000000000',
      name: 'Demo',
      timezone: 'Asia/Karachi',
      locale: 'en-PK',
      serviceFee: 0,
      tipOptions: [0, 5, 10]
    });
    expect(data.name).toBe('Demo');
  });
});
