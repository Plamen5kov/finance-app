import { currentMonthKey, monthRange } from './date-utils';

describe('currentMonthKey', () => {
  it('returns YYYY-MM format', () => {
    const key = currentMonthKey();
    expect(key).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe('monthRange', () => {
  it('returns start of month and start of next month', () => {
    const { start, end } = monthRange('2026-03');
    expect(start).toEqual(new Date('2026-03-01T00:00:00.000Z'));
    expect(end).toEqual(new Date('2026-04-01T00:00:00.000Z'));
  });

  it('handles December to January rollover', () => {
    const { start, end } = monthRange('2025-12');
    expect(start).toEqual(new Date('2025-12-01T00:00:00.000Z'));
    expect(end).toEqual(new Date('2026-01-01T00:00:00.000Z'));
  });

  it('handles January', () => {
    const { start, end } = monthRange('2026-01');
    expect(start).toEqual(new Date('2026-01-01T00:00:00.000Z'));
    expect(end).toEqual(new Date('2026-02-01T00:00:00.000Z'));
  });
});
