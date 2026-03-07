/**
 * Seed script: imports historical CSV data from mind.csv.
 *
 * Column mapping for mind.csv (no shifts – all columns aligned):
 *   [0]  (empty row number)
 *   [1]  month       – date string MM/DD/YYYY
 *   [2]  income      – monthly income (€ format)
 *   [3]  expenses    – fixed monthly expenses (€ format)
 *   [4]  NN          – accumulated NN savings
 *   [5]  crypto      – crypto portfolio value
 *   [6]  ETF         – ETF portfolio value
 *   [7]  mortgage    – mortgage opening balance
 *   [8]  payment     – monthly mortgage payment
 *   [9]  principal   – principal paid
 *   [10] interest    – interest paid
 *   [11] ending bal  – mortgage ending balance
 *   [12] ipr         – interest/principal ratio
 *   [13] gold        – gold (злато) value
 *   [14] emergency   – emergency fund
 *   [15] baby        – baby fund
 *   [16] total       – total investments
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const prisma = new PrismaClient();

const SAMPLE_DATA_DIR = path.join(__dirname, '../../../sample-data');
const FINANCES_CSV = path.join(SAMPLE_DATA_DIR, 'existing-data', 'mind.csv');
const REVOLUT_CSV = path.join(SAMPLE_DATA_DIR, 'revolut-statements/statment.csv');

const SEED_USER = {
  name: 'Plamen',
  email: 'plamen@finances.local',
  password: 'MyPassword123456',
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function parseDate(s: string): Date | null {
  if (!s || !s.trim()) return null;
  const parts = s.trim().split('/');
  if (parts.length !== 3) return null;
  const [mm, dd, yyyy] = parts.map(Number);
  if (!mm || !dd || !yyyy) return null;
  const d = new Date(Date.UTC(yyyy, mm - 1, dd)); // UTC midnight — avoids timezone month-shifts
  return isNaN(d.getTime()) ? null : d;
}

function parseFloat2(v: string): number {
  if (!v || !v.trim()) return 0;
  const n = parseFloat(v.replace(/[^\d.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function parseCSVLine(line: string): string[] {
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

async function readCSV(filePath: string): Promise<string[][]> {
  const rows: string[][] = [];
  const rl = readline.createInterface({ input: fs.createReadStream(filePath) });
  for await (const line of rl) {
    rows.push(parseCSVLine(line));
  }
  return rows;
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting seed...\n');

  // 1. Upsert user
  const hash = await bcrypt.hash(SEED_USER.password, 10);
  const user = await prisma.user.upsert({
    where: { email: SEED_USER.email },
    update: {},
    create: { name: SEED_USER.name, email: SEED_USER.email, password: hash },
  });
  console.log(`✅ User: ${user.email} (id: ${user.id})`);

  // 2. Clear re-seedable data; preserve assets/liabilities and their metadata
  await prisma.assetSnapshot.deleteMany({ where: { asset: { userId: user.id } } });
  await prisma.liabilitySnapshot.deleteMany({ where: { liability: { userId: user.id } } });
  await prisma.goalSnapshot.deleteMany({ where: { goal: { userId: user.id } } });
  await prisma.goal.deleteMany({ where: { userId: user.id } });
  await prisma.expense.deleteMany({ where: { userId: user.id } });
  await prisma.expenseCategory.deleteMany({ where: { userId: user.id } });
  console.log('🧹 Cleared snapshots/goals/expenses (assets/liabilities and their metadata preserved)\n');

  // 3. Parse mind.csv (clean column layout, no shifts)
  // Columns: [0]=empty, [1]=date(MM/DD/YYYY), [2]=income, [3]=expenses,
  //          [4]=NN, [5]=crypto, [6]=ETF, [7]=mortg open, [8]=payment,
  //          [9]=principal, [10]=interest, [11]=mortg end, [12]=ipr,
  //          [13]=gold, [14]=emergency fund, [15]=baby fund, [16]=total
  const finRows = await readCSV(FINANCES_CSV);
  const dataRows = finRows.slice(1).filter((r) => {
    const d = parseDate(r[1]);
    return d !== null && r[2]?.trim();
  });

  // Most recent row with investment data
  const latestRow = [...dataRows]
    .reverse()
    .find((r) => parseFloat2(r[5]) > 0 || parseFloat2(r[6]) > 0 || parseFloat2(r[13]) > 0);

  if (!latestRow) throw new Error('No complete data row found');

  const latestDate = parseDate(latestRow[1])!;
  console.log(`📅 Latest data row: ${latestDate.toISOString().split('T')[0]}`);
  console.log(`   crypto=${parseFloat2(latestRow[5]).toFixed(0)} BGN`);
  console.log(`   ETF=${parseFloat2(latestRow[6]).toFixed(0)} BGN`);
  console.log(`   mortgage balance=${parseFloat2(latestRow[11]).toFixed(0)} BGN`);
  console.log(`   gold=${parseFloat2(latestRow[13]).toFixed(0)} BGN`);
  console.log(`   emergency fund=${parseFloat2(latestRow[14]).toFixed(0)} BGN`);
  console.log(`   baby fund=${parseFloat2(latestRow[15]).toFixed(0)} BGN\n`);

  // 4. Find-or-create assets (preserve existing metadata/configuration)
  const upsertAsset = (type: string, name: string, value: number) =>
    prisma.asset.findFirst({ where: { userId: user.id, type, name } }).then((existing) =>
      existing
        ? prisma.asset.update({ where: { id: existing.id }, data: { value } })
        : prisma.asset.create({ data: { userId: user.id, type, name, value, currency: 'BGN' } }),
    );

  const cryptoAsset = await upsertAsset('crypto', 'Crypto Portfolio', parseFloat2(latestRow[5]));
  const etfAsset = await upsertAsset('etf', 'ETF Portfolio', parseFloat2(latestRow[6]));
  const goldAsset = await upsertAsset('gold', 'Gold (злато)', parseFloat2(latestRow[13]));

  // Find-or-create mortgage (preserve user-configured metadata like rate history)
  let mortgageLiability = await prisma.liability.findFirst({ where: { userId: user.id, type: 'mortgage', name: 'Home Mortgage' } });
  if (mortgageLiability) {
    mortgageLiability = await prisma.liability.update({
      where: { id: mortgageLiability.id },
      data: { value: parseFloat2(latestRow[11]) },
    });
  } else {
    mortgageLiability = await prisma.liability.create({
      data: {
        userId: user.id,
        type: 'mortgage',
        name: 'Home Mortgage',
        value: parseFloat2(latestRow[11]),
        currency: 'BGN',
        metadata: { monthlyPayment: parseFloat2(latestRow[8]), interestRate: 2.58, note: 'Remaining balance' },
      },
    });
  }

  console.log(`✅ Upserted 3 assets (crypto, ETF, gold) + 1 liability (mortgage)`);

  // 5. Create asset & liability snapshots from all historical rows up to latest date
  const historicalRows = dataRows.filter((r) => {
    const d = parseDate(r[1]);
    return d !== null && d <= latestDate;
  });

  // Collect existing snapshot months to avoid duplicates on re-runs
  const toMonthSet = (existing: Array<{ capturedAt: Date }>) =>
    new Set(existing.map((s) => s.capturedAt.toISOString().slice(0, 7)));

  const [existingCrypto, existingEtf, existingGold, existingMortgage] = await Promise.all([
    prisma.assetSnapshot.findMany({ where: { assetId: cryptoAsset.id }, select: { capturedAt: true } }),
    prisma.assetSnapshot.findMany({ where: { assetId: etfAsset.id }, select: { capturedAt: true } }),
    prisma.assetSnapshot.findMany({ where: { assetId: goldAsset.id }, select: { capturedAt: true } }),
    prisma.liabilitySnapshot.findMany({ where: { liabilityId: mortgageLiability.id }, select: { capturedAt: true } }),
  ]);
  const cryptoMonths = toMonthSet(existingCrypto);
  const etfMonths = toMonthSet(existingEtf);
  const goldMonths = toMonthSet(existingGold);
  const mortgageMonths = toMonthSet(existingMortgage);

  const snapshots: Array<{ assetId: string; value: number; capturedAt: Date }> = [];
  const liabilitySnapshots: Array<{ liabilityId: string; value: number; capturedAt: Date }> = [];
  for (const row of historicalRows) {
    const capturedAt = parseDate(row[1])!;
    const monthKey = capturedAt.toISOString().slice(0, 7);
    if (parseFloat2(row[5]) > 0 && !cryptoMonths.has(monthKey))
      snapshots.push({ assetId: cryptoAsset.id, value: parseFloat2(row[5]), capturedAt });
    if (parseFloat2(row[6]) > 0 && !etfMonths.has(monthKey))
      snapshots.push({ assetId: etfAsset.id, value: parseFloat2(row[6]), capturedAt });
    if (parseFloat2(row[13]) > 0 && !goldMonths.has(monthKey))
      snapshots.push({ assetId: goldAsset.id, value: parseFloat2(row[13]), capturedAt });
    if (parseFloat2(row[11]) > 0 && !mortgageMonths.has(monthKey))
      liabilitySnapshots.push({ liabilityId: mortgageLiability.id, value: parseFloat2(row[11]), capturedAt });
  }

  await prisma.assetSnapshot.createMany({ data: snapshots });
  await prisma.liabilitySnapshot.createMany({ data: liabilitySnapshots });
  console.log(`✅ Added ${snapshots.length} new asset snapshots, ${liabilitySnapshots.length} new liability snapshots\n`);

  // 6. Create goals
  const emergencyGoal = await prisma.goal.create({
    data: {
      userId: user.id,
      name: 'Emergency Fund',
      targetAmount: 15000,
      currentAmount: parseFloat2(latestRow[14]),
      targetDate: new Date('2026-12-31'),
      priority: 1,
      status: 'active',
      category: 'emergency',
      description: '6 months of living expenses buffer',
    },
  });

  const babyGoal = await prisma.goal.create({
    data: {
      userId: user.id,
      name: 'Baby Fund',
      targetAmount: 20000,
      currentAmount: parseFloat2(latestRow[15]),
      targetDate: new Date('2026-09-01'),
      priority: 1,
      status: 'active',
      category: 'family',
      description: 'Baby expenses and preparations',
    },
  });

  console.log(`✅ Created 2 goals (emergency fund, baby fund)`);

  // Add goal snapshots. Real data for both funds starts Sep 2023 (r[14]=emg, r[15]=baby).
  // For months before Sep 2023, interpolate emergency fund from 0 → first real value.
  const goalSnaps: Array<{
    goalId: string;
    month: Date;
    targetAmount: number;
    balanceAsOf: number;
    onTrack: boolean;
  }> = [];

  // Collect real values from CSV (r[14]=emg, r[15]=baby – no column shifts)
  const realEmgByKey: Map<string, number> = new Map();
  const realBabyByKey: Map<string, number> = new Map();
  for (const row of historicalRows) {
    const d = parseDate(row[1])!;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (parseFloat2(row[14]) > 0) realEmgByKey.set(key, parseFloat2(row[14]));
    if (parseFloat2(row[15]) > 0) realBabyByKey.set(key, parseFloat2(row[15]));
  }

  // Find first real emg value for interpolation anchor
  const sortedEmgEntries = [...realEmgByKey.entries()].sort(([a], [b]) => a.localeCompare(b));
  const firstRealEmgKey = sortedEmgEntries[0]?.[0];
  const firstRealEmgVal = sortedEmgEntries[0]?.[1] ?? 0;

  const preRealRows = historicalRows.filter((row) => {
    const d = parseDate(row[1])!;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    return !firstRealEmgKey || key < firstRealEmgKey;
  });

  for (let i = 0; i < historicalRows.length; i++) {
    const row = historicalRows[i];
    const d = parseDate(row[1])!;
    const month = new Date(d.getFullYear(), d.getMonth(), 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;

    const realEmgVal = realEmgByKey.get(key);
    const realBabyVal = realBabyByKey.get(key);

    // Emergency fund: real CSV data if available, else linear interpolation 0 → first real value
    // Only interpolate for rows that are genuinely before the first real data point.
    let emgVal: number | null = null;
    if (realEmgVal !== undefined) {
      emgVal = realEmgVal;
    } else {
      const preIdx = preRealRows.indexOf(row);
      if (preIdx !== -1) {
        const total = preRealRows.length;
        emgVal = total > 1 ? Math.round((preIdx / (total - 1)) * firstRealEmgVal * 100) / 100 : 0;
      }
      // preIdx === -1 means the row is after the first real date but has no value — skip it
    }

    if (emgVal !== null) {
      goalSnaps.push({
        goalId: emergencyGoal.id,
        month,
        targetAmount: emergencyGoal.targetAmount,
        balanceAsOf: emgVal,
        onTrack: emgVal >= emergencyGoal.targetAmount * 0.5,
      });
    }

    if (realBabyVal !== undefined && realBabyVal > 0)
      goalSnaps.push({
        goalId: babyGoal.id,
        month,
        targetAmount: babyGoal.targetAmount,
        balanceAsOf: realBabyVal,
        onTrack: true,
      });
  }
  await prisma.goalSnapshot.createMany({ data: goalSnaps });
  console.log(`✅ Created ${goalSnaps.length} goal snapshots\n`);

  // 7. Import monthly income/expense history from mind.csv (2015+)
  const salaryCat = await prisma.expenseCategory.create({
    data: { userId: user.id, name: 'Salary / Income', color: '#10B981', type: 'income' },
  });
  const fixedCat = await prisma.expenseCategory.create({
    data: { userId: user.id, name: 'Fixed Expenses', color: '#6366F1', type: 'expense' },
  });

  const historicalExpenses: Array<{
    userId: string; amount: number; description: string; merchant: string;
    date: Date; categoryId: string; source: string;
  }> = [];

  for (const row of dataRows) {
    const d = parseDate(row[1]);
    if (!d) continue;
    const income = parseFloat2(row[2]);
    const fixed = parseFloat2(row[3]);
    const expDate = new Date(d.getFullYear(), d.getMonth(), 1);

    if (income > 0) {
      historicalExpenses.push({
        userId: user.id, amount: income,
        description: `Monthly salary ${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        merchant: 'Employer', date: expDate, categoryId: salaryCat.id, source: 'imported',
      });
    }
    if (fixed > 0) {
      historicalExpenses.push({
        userId: user.id, amount: fixed,
        description: `Fixed expenses ${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        merchant: 'Various', date: expDate, categoryId: fixedCat.id, source: 'imported',
      });
    }
  }
  await prisma.expense.createMany({ data: historicalExpenses });
  console.log(`✅ Imported ${historicalExpenses.length} historical income/expense records (2015+)\n`);

  // 8. Parse Revolut statement → expenses
  const revRows = await readCSV(REVOLUT_CSV);
  const revHeader = revRows[0];
  // Columns: Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance
  const typeIdx = revHeader.indexOf('Type');
  const descIdx = revHeader.indexOf('Description');
  const amountIdx = revHeader.indexOf('Amount');
  const dateIdx = revHeader.indexOf('Completed Date');
  const stateIdx = revHeader.indexOf('State');

  // Create expense categories based on Revolut transaction types
  const categoryMap: Record<string, string> = {};
  const categoryDefs = [
    { name: 'Card Payment', color: '#EF4444', type: 'expense' },
    { name: 'Transfer', color: '#8B5CF6', type: 'expense' },
    { name: 'Income / Topup', color: '#10B981', type: 'income' },
    { name: 'Exchange', color: '#F59E0B', type: 'expense' },
    { name: 'Other', color: '#6B7280', type: 'expense' },
  ];

  for (const def of categoryDefs) {
    const cat = await prisma.expenseCategory.create({
      data: { userId: user.id, name: def.name, color: def.color, type: def.type },
    });
    categoryMap[def.name] = cat.id;
  }
  console.log(`✅ Created ${categoryDefs.length} expense categories`);

  // Import transactions as expenses (only outgoing card payments and transfers)
  const expenseRows = revRows.slice(1).filter((r) => {
    if (!r[stateIdx]?.includes('COMPLETED')) return false;
    const amount = parseFloat2(r[amountIdx]);
    return amount < 0; // only expenses (negative amounts)
  });

  const expenses: Array<{
    userId: string;
    amount: number;
    description: string;
    merchant: string;
    date: Date;
    categoryId: string;
    source: string;
  }> = [];

  for (const row of expenseRows) {
    const type = row[typeIdx]?.trim() ?? 'Other';
    const dateStr = row[dateIdx]?.trim();
    const amount = Math.abs(parseFloat2(row[amountIdx]));
    const description = row[descIdx]?.trim() ?? 'Unknown';

    if (!dateStr || amount === 0) continue;

    const date = new Date(dateStr.split(' ')[0]);
    if (isNaN(date.getTime())) continue;

    let catName = 'Other';
    if (type === 'Card Payment') catName = 'Card Payment';
    else if (type === 'Transfer') catName = 'Transfer';
    else if (type === 'Exchange') catName = 'Exchange';

    const categoryId = categoryMap[catName] ?? categoryMap['Other'];

    expenses.push({
      userId: user.id,
      amount,
      description,
      merchant: description,
      date,
      categoryId,
      source: 'imported',
    });
  }

  await prisma.expense.createMany({ data: expenses });
  console.log(`✅ Imported ${expenses.length} expenses from Revolut statement\n`);

  console.log('🎉 Seed complete!\n');
  console.log(`Login with:`);
  console.log(`  Email:    ${SEED_USER.email}`);
  console.log(`  Password: ${SEED_USER.password}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
