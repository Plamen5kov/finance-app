import { LiabilitiesService } from './liabilities.service';
import { MortgageMetadata, LeasingMetadata } from '@finances/shared';
import * as dateUtils from '../common/utils/date-utils';

const baseMortgage: MortgageMetadata = {
  originalAmount: 100000,
  interestRate: 3,
  monthlyPayment: 500,
  termMonths: 360,
  startDate: '2024-01-01',
  paymentDay: 15,
  events: [],
};

const baseLeasing: LeasingMetadata = {
  originalValue: 40000,
  downPayment: 8000,
  residualValue: 5000,
  interestRate: 4,
  monthlyPayment: 600,
  termMonths: 48,
  startDate: '2024-06-01',
  paymentDay: 1,
};

function mockPrisma() {
  return {
    liability: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn(),
      delete: jest.fn(),
    },
    liabilitySnapshot: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
    },
  } as any;
}

function createService(prisma: ReturnType<typeof mockPrisma>) {
  return new LiabilitiesService(prisma);
}

describe('scheduledBalanceRefresh', () => {
  let realDate: typeof Date;

  beforeEach(() => {
    realDate = globalThis.Date;
  });

  afterEach(() => {
    globalThis.Date = realDate;
    jest.restoreAllMocks();
  });

  function mockToday(day: number) {
    const original = globalThis.Date;
    const fakeNow = new original(2026, 3, day, 1, 0, 0); // April `day`, 2026
    jest.spyOn(dateUtils, 'currentMonthKey').mockReturnValue('2026-04');
    // Override Date constructor for new Date() calls that get today's date
    const MockDate = class extends original {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(fakeNow.getTime());
        } else {
          super(...(args as [any]));
        }
      }

      static now() {
        return fakeNow.getTime();
      }
    } as any;
    MockDate.UTC = original.UTC;
    globalThis.Date = MockDate;
  }

  it('updates liabilities whose paymentDay matches today', async () => {
    mockToday(15);
    const prisma = mockPrisma();
    prisma.liability.findMany.mockResolvedValue([
      {
        id: 'mort-1',
        name: 'Home Mortgage',
        type: 'mortgage',
        value: 99000,
        metadata: baseMortgage,
      },
      { id: 'lease-1', name: 'Car Lease', type: 'leasing', value: 30000, metadata: baseLeasing },
    ]);
    const service = createService(prisma);

    await service.scheduledBalanceRefresh();

    expect(prisma.liability.update).toHaveBeenCalledTimes(1);
    expect(prisma.liability.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'mort-1' } }),
    );
    expect(prisma.liabilitySnapshot.create).toHaveBeenCalledTimes(1);
  });

  it('skips liabilities without paymentDay', async () => {
    mockToday(1);
    const prisma = mockPrisma();
    const metaNoDay = { ...baseMortgage };
    delete (metaNoDay as any).paymentDay;
    prisma.liability.findMany.mockResolvedValue([
      { id: 'mort-1', name: 'Home', type: 'mortgage', value: 99000, metadata: metaNoDay },
    ]);
    const service = createService(prisma);

    await service.scheduledBalanceRefresh();

    expect(prisma.liability.update).not.toHaveBeenCalled();
  });

  it('skips liabilities whose paymentDay does not match today', async () => {
    mockToday(10);
    const prisma = mockPrisma();
    prisma.liability.findMany.mockResolvedValue([
      { id: 'mort-1', name: 'Home', type: 'mortgage', value: 99000, metadata: baseMortgage },
    ]);
    const service = createService(prisma);

    await service.scheduledBalanceRefresh();

    expect(prisma.liability.update).not.toHaveBeenCalled();
  });

  it('does not create a duplicate snapshot if one exists this month', async () => {
    mockToday(15);
    const prisma = mockPrisma();
    prisma.liability.findMany.mockResolvedValue([
      { id: 'mort-1', name: 'Home', type: 'mortgage', value: 99000, metadata: baseMortgage },
    ]);
    prisma.liabilitySnapshot.findFirst.mockResolvedValue({ id: 'existing-snap' });
    const service = createService(prisma);

    await service.scheduledBalanceRefresh();

    expect(prisma.liability.update).toHaveBeenCalledTimes(1);
    expect(prisma.liabilitySnapshot.create).not.toHaveBeenCalled();
  });

  it('handles both mortgage and leasing on the same day', async () => {
    mockToday(1);
    const prisma = mockPrisma();
    const mortOnFirst = { ...baseMortgage, paymentDay: 1 };
    prisma.liability.findMany.mockResolvedValue([
      { id: 'mort-1', name: 'Home', type: 'mortgage', value: 99000, metadata: mortOnFirst },
      { id: 'lease-1', name: 'Car', type: 'leasing', value: 30000, metadata: baseLeasing },
    ]);
    const service = createService(prisma);

    await service.scheduledBalanceRefresh();

    expect(prisma.liability.update).toHaveBeenCalledTimes(2);
    expect(prisma.liabilitySnapshot.create).toHaveBeenCalledTimes(2);
  });

  it('recalculates the correct balance value', async () => {
    mockToday(15);
    const prisma = mockPrisma();
    prisma.liability.findMany.mockResolvedValue([
      { id: 'mort-1', name: 'Home', type: 'mortgage', value: 100000, metadata: baseMortgage },
    ]);
    const service = createService(prisma);

    await service.scheduledBalanceRefresh();

    const updateCall = prisma.liability.update.mock.calls[0][0];
    const newValue = updateCall.data.value;
    // After ~27 months of 500/month on 100k at 3%, balance should be between 85k-95k
    expect(newValue).toBeGreaterThan(85000);
    expect(newValue).toBeLessThan(95000);
  });

  it('skips liabilities with null metadata', async () => {
    mockToday(1);
    const prisma = mockPrisma();
    prisma.liability.findMany.mockResolvedValue([
      { id: 'x', name: 'Manual', type: 'mortgage', value: 5000, metadata: null },
    ]);
    const service = createService(prisma);

    await service.scheduledBalanceRefresh();

    expect(prisma.liability.update).not.toHaveBeenCalled();
  });
});
