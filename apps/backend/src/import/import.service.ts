import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { buildClassifierChain } from '../expenses/transaction-classifier';

export interface RevolutImportStats {
  imported: number;
  expenses: number;
  income: number;
  skipped: number;
  newMappings: number;
}

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Import a Revolut CSV statement for the given household.
   * Parses the CSV buffer, classifies transactions, saves expenses
   * and new merchant-category mappings.
   */
  async importRevolutCSV(
    householdId: string,
    userId: string,
    fileBuffer: Buffer,
  ): Promise<RevolutImportStats> {
    const content = fileBuffer.toString('utf-8');
    const rows = this.parseCSV(content);

    if (rows.length < 2) {
      throw new BadRequestException('CSV file is empty or has no data rows');
    }

    const header = rows[0];
    const typeIdx = header.indexOf('Type');
    const descIdx = header.indexOf('Description');
    const amountIdx = header.indexOf('Amount');
    const dateIdx = header.indexOf('Completed Date');
    const stateIdx = header.indexOf('State');

    if ([descIdx, amountIdx, dateIdx, stateIdx].includes(-1)) {
      throw new BadRequestException(
        'Invalid Revolut CSV format: missing required columns (Description, Amount, Completed Date, State)',
      );
    }

    // Build category map from household's existing categories
    const categories = await this.prisma.expenseCategory.findMany({
      where: { householdId },
    });
    const categoryMap: Record<string, string> = {};
    for (const cat of categories) {
      categoryMap[cat.name] = cat.id;
    }

    if (!categoryMap['Other']) {
      throw new BadRequestException(
        'No expense categories found for user. Please create at least an "Other" category first.',
      );
    }

    // Load existing merchant mappings
    const existingMappings = await this.prisma.merchantCategoryMap.findMany({
      where: { householdId },
    });
    const savedMerchantMap = new Map(
      existingMappings.map((m) => [m.merchant, m.categoryId]),
    );

    const { classify } = buildClassifierChain(
      categoryMap,
      savedMerchantMap,
    );

    // Filter and parse data rows
    const dataRows = rows.slice(1).filter((r) => {
      if (!r[stateIdx]?.includes('COMPLETED')) return false;
      if (typeIdx !== -1 && r[typeIdx]?.trim() === 'Exchange') return false;
      return this.parseAmount(r[amountIdx]) !== 0;
    });

    const transactions: Array<{
      userId: string;
      householdId: string;
      amount: number;
      description: string;
      merchant: string;
      date: Date;
      categoryId: string;
      source: string;
    }> = [];
    const newMappings = new Map<string, string>();

    for (const row of dataRows) {
      const dateStr = row[dateIdx]?.trim();
      const amount = this.parseAmount(row[amountIdx]);
      const merchant = row[descIdx]?.trim() ?? 'Unknown';

      if (!dateStr || amount === 0) continue;

      const date = new Date(dateStr.split(' ')[0]);
      if (isNaN(date.getTime())) continue;

      const categoryId = classify(merchant, amount);

      // Track new mappings for expenses only
      if (
        amount < 0 &&
        !savedMerchantMap.has(merchant) &&
        !newMappings.has(merchant)
      ) {
        newMappings.set(merchant, categoryId);
      }

      transactions.push({
        userId,
        householdId,
        amount,
        description: merchant,
        merchant,
        date,
        categoryId,
        source: 'imported',
      });
    }

    // Persist new merchant mappings
    if (newMappings.size > 0) {
      await this.prisma.merchantCategoryMap.createMany({
        data: Array.from(newMappings.entries()).map(
          ([merchant, categoryId]) => ({
            userId,
            householdId,
            merchant,
            categoryId,
          }),
        ),
        skipDuplicates: true,
      });
    }

    // Deduplicate: skip transactions that already exist (same household + merchant + amount + date)
    const existingExpenses = await this.prisma.expense.findMany({
      where: { householdId, source: 'imported' },
      select: { merchant: true, amount: true, date: true },
    });
    const existingKeys = new Set(
      existingExpenses.map(
        (e) =>
          `${e.merchant}|${e.amount}|${e.date.toISOString().slice(0, 10)}`,
      ),
    );

    const newTransactions = transactions.filter((t) => {
      const key = `${t.merchant}|${t.amount}|${t.date.toISOString().slice(0, 10)}`;
      if (existingKeys.has(key)) return false;
      existingKeys.add(key); // prevent duplicates within the same file
      return true;
    });

    // Persist transactions
    if (newTransactions.length > 0) {
      await this.prisma.expense.createMany({ data: newTransactions });
    }

    const skipped = transactions.length - newTransactions.length;
    const expenses = newTransactions.filter((t) => t.amount < 0).length;
    const income = newTransactions.filter((t) => t.amount > 0).length;

    this.logger.log(
      `Revolut import for household ${householdId} (user ${userId}): ${newTransactions.length} new (${expenses} exp, ${income} inc), ${skipped} skipped, ${newMappings.size} new mappings`,
    );

    return {
      imported: newTransactions.length,
      expenses,
      income,
      skipped,
      newMappings: newMappings.size,
    };
  }

  // ── CSV Parsing Helpers ───────────────────────────────────────────────────

  /**
   * Parse a CSV string into rows of string arrays.
   * Handles quoted fields containing commas.
   */
  private parseCSV(content: string): string[][] {
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    return lines.map((line) => this.parseCSVLine(line));
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += c;
      }
    }
    result.push(current);
    return result;
  }

  private parseAmount(v: string): number {
    if (!v || !v.trim()) return 0;
    const n = parseFloat(v.replace(/[^\d.-]/g, ''));
    return isNaN(n) ? 0 : n;
  }
}
