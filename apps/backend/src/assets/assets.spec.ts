import { toEur, computeAssetValue } from './assets.service';

describe('toEur', () => {
  it('EUR passthrough', () => expect(toEur(100, 'EUR')).toBe(100));
  it('null currency returns amount', () => expect(toEur(100, null)).toBe(100));
  it('undefined currency returns amount', () => expect(toEur(100)).toBe(100));
  it('BGN conversion', () => {
    const result = toEur(195.583, 'BGN');
    expect(result).toBeCloseTo(100, 0);
  });
  it('USD conversion', () => expect(toEur(100, 'USD')).toBe(92));
  it('GBP conversion', () => expect(toEur(100, 'GBP')).toBe(117));
  it('unknown currency returns amount', () => expect(toEur(100, 'JPY')).toBe(100));
});

describe('computeAssetValue', () => {
  it('no snapshots returns asset.value', () => {
    expect(computeAssetValue({ value: 5000 }, [])).toEqual({ value: 5000 });
  });

  it('DCA with qty and price', () => {
    const result = computeAssetValue({ value: 0 }, [
      { quantity: 10, price: 50 },
      { quantity: 5, price: 55 },
    ]);
    // totalQty = 15, latestPrice = null (asset has no latestPrice), uses first snapshot price = 50
    // Actually: price = asset.latestPrice ?? snapshots[0]?.price = 50
    // value = 15 * 50 = 750
    expect(result.value).toBe(750);
    expect(result.quantity).toBe(15);
  });

  it('zero total quantity returns asset.value', () => {
    const result = computeAssetValue({ value: 5000 }, [{ quantity: 0, price: 100 }]);
    expect(result.value).toBe(5000);
  });

  it('uses latestPrice when available', () => {
    const result = computeAssetValue({ value: 0, latestPrice: 100 }, [{ quantity: 10, price: 50 }]);
    // latestPrice=100 takes precedence: 10 * 100 = 1000
    expect(result.value).toBe(1000);
  });

  it('handles snapshots without quantity', () => {
    const result = computeAssetValue({ value: 5000 }, [{ price: 100 }]);
    // totalQty = 0, returns asset.value
    expect(result.value).toBe(5000);
  });
});
