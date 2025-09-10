import { describe, it, expect } from 'vitest';
import { QrButton } from '../src/components/Button';

describe('QrButton', () => {
  it('sets label', () => {
    const el = new QrButton();
    el.setAttribute('label', 'Click');
    const btn = el.shadowRoot?.querySelector('button');
    expect(btn?.textContent).toBe('Click');
  });
});
