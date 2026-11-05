import { toEur, computeAssetValue, AssetsService } from './assets.service';

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

describe('AssetsService position sync', () => {
  function setup(rows: { id: string; quantity: number | null; value: number }[]) {
    const prisma = {
      asset: {
        findUnique: jest.fn().mockResolvedValue({ id: 'a1', householdId: 'h1' }),
        update: jest.fn().mockResolvedValue({}),
      },
      assetSnapshot: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(async ({ where }: any) => ({ assetId: 'a1', ...rows.find((r) => r.id === where.id) })),
        create: jest.fn(async ({ data }: any) => {
          rows.push({ id: `s${rows.length}`, quantity: data.quantity ?? null, value: data.value });
          return data;
        }),
        update: jest.fn().mockResolvedValue({}),
        delete: jest.fn(async ({ where }: any) => rows.splice(rows.findIndex((r) => r.id === where.id), 1)),
        findMany: jest.fn(async () => rows.filter((r) => r.quantity != null)),
      },
    } as any;
    return { prisma, service: new AssetsService(prisma) };
  }

  it('recomputes quantity and costBasis from all purchase rows after a purchase', async () => {
    const { prisma, service } = setup([{ id: 's0', quantity: 332.39, value: 58000 }]);
    await service.addSnapshot('h1', 'a1', 2037.43, '2026-06-02', 174.44, 11.68);
    expect(prisma.asset.update).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: { quantity: 344.07, costBasis: 60037.43 },
    });
  });

  it('leaves the asset alone for a price-only row', async () => {
    const { prisma, service } = setup([{ id: 's0', quantity: 10, value: 1000 }]);
    await service.addSnapshot('h1', 'a1', 1200, '2026-09-01', 120);
    expect(prisma.asset.update).not.toHaveBeenCalled();
  });

  it('recomputes after deleting a purchase row', async () => {
    const { prisma, service } = setup([
      { id: 's0', quantity: 10, value: 1000 },
      { id: 's1', quantity: 5, value: 600 },
    ]);
    await service.deleteSnapshot('h1', 'a1', 's1');
    expect(prisma.asset.update).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: { quantity: 10, costBasis: 1000 },
    });
  });
});
