import { buildClassifierChain } from './transaction-classifier';

describe('buildClassifierChain', () => {
  const categoryMap = {
    'Salary / Income': 'cat-income',
    Other: 'cat-other',
    Groceries: 'cat-groceries',
  };

  it('uses saved merchant mapping first', () => {
    const savedMap = new Map([['Lidl', 'cat-groceries']]);
    const { classify } = buildClassifierChain(categoryMap, savedMap);
    expect(classify('Lidl', -50)).toBe('cat-groceries');
  });

  it('positive amount maps to income category', () => {
    const { classify } = buildClassifierChain(categoryMap, new Map());
    expect(classify('Some Employer', 3000)).toBe('cat-income');
  });

  it('negative amount with no mapping falls back to Other', () => {
    const { classify } = buildClassifierChain(categoryMap, new Map());
    expect(classify('Unknown Shop', -25)).toBe('cat-other');
  });

  it('falls back to Other when Salary/Income missing', () => {
    const noIncome = { Other: 'cat-other' };
    const { classify } = buildClassifierChain(noIncome, new Map());
    expect(classify('Employer', 3000)).toBe('cat-other');
  });

  it('chain has 3 classifiers', () => {
    const { chain } = buildClassifierChain(categoryMap, new Map());
    expect(chain).toHaveLength(3);
  });

  it('saved mapping takes priority over amount sign', () => {
    // Merchant mapped to groceries, but amount is positive (income)
    const savedMap = new Map([['Refund Store', 'cat-groceries']]);
    const { classify } = buildClassifierChain(categoryMap, savedMap);
    expect(classify('Refund Store', 50)).toBe('cat-groceries');
  });
});
