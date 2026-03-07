/**
 * Transaction Classifier — Chain of Responsibility
 *
 * Determines the category for a transaction by running it through
 * a chain of classifiers. First non-null result wins.
 *
 * Chain order:
 *   1. Saved merchant→category mappings (user overrides from DB)
 *   2. Amount sign (positive = income)
 *   3. Fallback → "Other"
 */

export type Classifier = (merchant: string, amount: number) => string | null;

/**
 * Build a classifier chain.
 *
 * @param categoryMap   - category name → category id
 * @param savedMerchantMap - merchant name → category id (user overrides)
 */
export function buildClassifierChain(
  categoryMap: Record<string, string>,
  savedMerchantMap: Map<string, string>,
): { classify: (merchant: string, amount: number) => string; chain: Classifier[] } {
  const fromSavedMapping: Classifier = (merchant) =>
    savedMerchantMap.get(merchant) ?? null;

  const fromAmountSign: Classifier = (_merchant, amount) =>
    amount > 0 ? (categoryMap['Salary / Income'] ?? categoryMap['Other']) : null;

  const fallback: Classifier = () => categoryMap['Other'];

  const chain: Classifier[] = [fromSavedMapping, fromAmountSign, fallback];

  function classify(merchant: string, amount: number): string {
    for (const c of chain) {
      const result = c(merchant, amount);
      if (result) return result;
    }
    return categoryMap['Other'];
  }

  return { classify, chain };
}
