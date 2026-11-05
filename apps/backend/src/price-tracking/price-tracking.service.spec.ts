import { PriceTrackingService } from './price-tracking.service';

function setup() {
  const prisma = {
    asset: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'a1', name: 'DLR', type: 'etf', currency: 'EUR', quantity: 2, metadata: { ticker: 'DLR' } },
      ]),
      update: jest.fn().mockResolvedValue({}),
    },
    assetSnapshot: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
  } as any;
  const yahoo = { fetchPrice: jest.fn().mockResolvedValue({ price: 100, currency: 'EUR' }), fetchHistory: jest.fn().mockResolvedValue([]) };
  const currency = {
    clearCache: jest.fn(),
    toEur: jest.fn(async (v: number) => v),
    fromEur: jest.fn(async (v: number) => v),
  };
  const service = new PriceTrackingService(prisma, yahoo as any, {} as any, {} as any, currency as any);
  return { prisma, service };
}

describe('refreshPrices snapshot date', () => {
  afterEach(() => jest.useRealTimers());

  it('stamps a late refresh with the day it ran, not the 1st', async () => {
    jest.useFakeTimers({ now: new Date(2026, 8, 21, 10, 0) });
    const { prisma, service } = setup();
    await service.refreshPrices('h1');
    const created = prisma.assetSnapshot.create.mock.calls[0][0].data;
    expect(created.capturedAt.toISOString()).toBe('2026-09-21T00:00:00.000Z');
    expect(created).toMatchObject({ assetId: 'a1', value: 200, price: 100 });
  });

  it('keeps the scheduled run on the 1st', async () => {
    jest.useFakeTimers({ now: new Date(2026, 9, 1, 8, 0) });
    const { prisma, service } = setup();
    await service.refreshPrices('h1');
    expect(prisma.assetSnapshot.create.mock.calls[0][0].data.capturedAt.toISOString()).toBe('2026-10-01T00:00:00.000Z');
  });
});
