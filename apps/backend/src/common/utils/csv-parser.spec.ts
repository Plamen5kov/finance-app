import { parseCSV, parseCSVLine, parseAmount } from './csv-parser';

describe('parseCSV', () => {
  it('splits content into rows', () => {
    const result = parseCSV('a,b,c\n1,2,3');
    expect(result).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('handles \\r\\n line endings', () => {
    const result = parseCSV('a,b\r\n1,2');
    expect(result).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('skips empty lines', () => {
    const result = parseCSV('a,b\n\n1,2\n');
    expect(result).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('returns empty array for empty content', () => {
    expect(parseCSV('')).toEqual([]);
    expect(parseCSV('   \n  ')).toEqual([]);
  });
});

describe('parseCSVLine', () => {
  it('handles normal unquoted fields', () => {
    expect(parseCSVLine('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  it('handles quoted fields with commas', () => {
    expect(parseCSVLine('"hello, world",b,c')).toEqual(['hello, world', 'b', 'c']);
  });

  it('handles empty fields', () => {
    expect(parseCSVLine('a,,c')).toEqual(['a', '', 'c']);
  });

  it('handles single field', () => {
    expect(parseCSVLine('hello')).toEqual(['hello']);
  });
});

describe('parseAmount', () => {
  it('parses positive amount', () => expect(parseAmount('100.50')).toBe(100.5));
  it('parses negative amount', () => expect(parseAmount('-50.00')).toBe(-50));
  it('strips currency symbols', () => expect(parseAmount('€100.50')).toBe(100.5));
  it('strips dollar sign', () => expect(parseAmount('$200')).toBe(200));
  it('returns 0 for empty string', () => expect(parseAmount('')).toBe(0));
  it('returns 0 for whitespace', () => expect(parseAmount('  ')).toBe(0));
  it('returns 0 for non-numeric', () => expect(parseAmount('abc')).toBe(0));
});
