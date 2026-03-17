import { round2 } from './money';

describe('round2', () => {
  it('rounds 10.005 to 10.01', () => expect(round2(10.005)).toBe(10.01));
  it('rounds 1.999999999 to 2', () => expect(round2(1.999999999)).toBe(2));
  it('handles zero', () => expect(round2(0)).toBe(0));
  it('rounds negative numbers', () => expect(round2(-1.555)).toBe(-1.55));
  it('leaves integers unchanged', () => expect(round2(100)).toBe(100));
  it('rounds 0.1 + 0.2 correctly', () => expect(round2(0.1 + 0.2)).toBe(0.3));
});
