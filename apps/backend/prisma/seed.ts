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
 *   [13] gold        – gold value
 *   [14] emergency   – emergency fund
 *   [15] baby        – baby fund
 *   [16] total       – total investments
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { buildClassifierChain } from '../src/expenses/transaction-classifier';
import * as readline from 'readline';

const prisma = new PrismaClient();

const SAMPLE_DATA_DIR = path.join(__dirname, '../../../sample-data');
const FINANCES_CSV = path.join(SAMPLE_DATA_DIR, 'existing-data', 'mind.csv');
const REVOLUT_CSV = path.join(SAMPLE_DATA_DIR, 'revolut-statements/statment.csv');
const CAR_LEASING_CSV = path.join(SAMPLE_DATA_DIR, 'existing-data', 'car-leasing.csv');

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

/** Parse DD.MM.YYYY date string (used in car-leasing.csv) */
function parseLeasingDate(s: string): Date | null {
  if (!s || !s.trim()) return null;
  const parts = s.trim().split('.');
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts.map(Number);
  if (!dd || !mm || !yyyy) return null;
  const d = new Date(Date.UTC(yyyy, mm - 1, dd));
  return isNaN(d.getTime()) ? null : d;
}

/** Parse number with spaces as thousand separators, e.g. "23 387.77" */
function parseLeasingNumber(s: string): number {
  if (!s || !s.trim()) return 0;
  const n = parseFloat(s.replace(/\s/g, ''));
  return isNaN(n) ? 0 : n;
}

/** Read semicolon-delimited CSV (leasing schedule format) */
async function readSemicolonCSV(filePath: string): Promise<string[][]> {
  const rows: string[][] = [];
  const rl = readline.createInterface({ input: fs.createReadStream(filePath) });
  for await (const line of rl) {
    rows.push(line.split(';'));
  }
  return rows;
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting seed...\n');

  // 1. Upsert user + household
  const hash = await bcrypt.hash(SEED_USER.password, 10);
  const user = await prisma.user.upsert({
    where: { email: SEED_USER.email },
    update: {},
    create: { name: SEED_USER.name, email: SEED_USER.email, password: hash },
  });

  // Ensure household + membership exist
  let membership = await prisma.householdMember.findFirst({ where: { userId: user.id } });
  if (!membership) {
    const household = await prisma.household.create({
      data: {
        name: `${SEED_USER.name}'s Household`,
        members: { create: { userId: user.id, role: 'owner' } },
      },
    });
    membership = await prisma.householdMember.findFirst({ where: { userId: user.id, householdId: household.id } });
  }
  const householdId = membership!.householdId;
  console.log(`✅ User: ${user.email} (id: ${user.id}, household: ${householdId})`);

  // 2. Clear re-seedable data; preserve assets/liabilities, their metadata, and any manually-added snapshots.
  // Asset snapshots for CSV-managed assets are cleared below (after we have their IDs).
  await prisma.goalSnapshot.deleteMany({ where: { goal: { householdId } } });
  await prisma.goal.deleteMany({ where: { householdId } });
  await prisma.expense.deleteMany({ where: { householdId } });
  await prisma.merchantCategoryMap.deleteMany({ where: { householdId } });
  await prisma.expenseCategory.deleteMany({ where: { householdId } });
  console.log('🧹 Cleared goals/expenses (assets, liabilities, and manually-added snapshots preserved)\n');

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
    prisma.asset.findFirst({ where: { householdId, type, name } }).then((existing) =>
      existing
        ? prisma.asset.update({ where: { id: existing.id }, data: { value } })
        : prisma.asset.create({ data: { userId: user.id, householdId, type, name, value, currency: 'BGN' } }),
    );

  // Find latest NN value (last row with a non-zero NN value)
  const latestNNRow = [...dataRows].reverse().find((r) => parseFloat2(r[4]) > 0);
  const latestNNValue = latestNNRow ? parseFloat2(latestNNRow[4]) : 0;

  const nnAsset = await upsertAsset('etf', 'NN', latestNNValue);
  const cryptoAsset = await upsertAsset('crypto', 'Crypto Portfolio', parseFloat2(latestRow[5]));
  const etfAsset = await upsertAsset('etf', 'ETF Portfolio', parseFloat2(latestRow[6]));
  const goldAsset = await upsertAsset('gold', 'Gold', parseFloat2(latestRow[13]));
  const apartmentAsset = await upsertAsset('apartment', 'Apartment', 420000);

  // Find-or-create mortgage with lifecycle events
  const mortgageMetadata = {
    originalAmount: 180000,
    interestRate: 2.5,
    monthlyPayment: 475,
    termMonths: 240,
    startDate: '2020-02-01',
    events: [
      { id: 'evt-1', type: 'refinance', date: '2023-01-01', newBalance: 116458.37, newRate: 2.2, notes: 'Refinanced — rate dropped from 2.5% to 2.2%, balance includes effect of extra payments during 2020-2022' },
      { id: 'evt-2', type: 'payment_change', date: '2023-03-01', newMonthlyPayment: 1010.01, notes: 'Increased monthly payment to shorten term' },
      { id: 'evt-3', type: 'rate_change', date: '2025-01-01', newRate: 2.58, notes: 'Bank rate increase' },
    ],
  };
  let mortgageLiability = await prisma.liability.findFirst({ where: { householdId, type: 'mortgage', name: 'Home Mortgage' } });
  if (mortgageLiability) {
    mortgageLiability = await prisma.liability.update({
      where: { id: mortgageLiability.id },
      data: { value: parseFloat2(latestRow[11]), metadata: mortgageMetadata as object },
    });
  } else {
    mortgageLiability = await prisma.liability.create({
      data: {
        userId: user.id,
        householdId,
        type: 'mortgage',
        name: 'Home Mortgage',
        value: parseFloat2(latestRow[11]),
        currency: 'EUR',
        metadata: mortgageMetadata as object,
      },
    });
  }

  // Find-or-create car leasing liability
  // CSV columns (semicolon-separated): [0]=empty, [1]=№, [2]=date(DD.MM.YYYY),
  //   [3]=start_bgn, [4]=start_eur, [5]=principal_bgn, [6]=principal_eur,
  //   [7]=interest_bgn, [8]=interest_eur, [9]=payment_bgn, [10]=payment_eur,
  //   [11]=remaining_bgn, [12]=remaining_eur, [13]=prepayment
  const leasingRows = await readSemicolonCSV(CAR_LEASING_CSV);
  const leasingDataRows = leasingRows.filter((r) => {
    const num = parseInt(r[1]);
    return !isNaN(num) && num > 0 && num <= 60; // rows 1-60 are regular monthly payments
  });

  const today = new Date();
  const pastLeasingRows = leasingDataRows.filter((r) => {
    const d = parseLeasingDate(r[2]);
    return d !== null && d <= today;
  });

  // Current balance = remaining balance EUR from the most recent paid row
  const latestLeasingRow = pastLeasingRows.at(-1);
  const currentLeasingBalance = latestLeasingRow ? parseLeasingNumber(latestLeasingRow[12]) : 17053.54;

  const leasingMetadata = {
    originalValue: 28500.77,  // total car price (financed + down payment)
    downPayment: 5113,        // ~10K BGN converted to EUR
    residualValue: 6496.60,   // balloon payment due at end of term
    interestRate: 4.23,
    monthlyPayment: 335.47,
    termMonths: 60,
    startDate: '2024-03-06',
  };
  let carLeasingLiability = await prisma.liability.findFirst({
    where: { householdId, type: 'leasing', name: 'Car Lease' },
  });
  if (carLeasingLiability) {
    carLeasingLiability = await prisma.liability.update({
      where: { id: carLeasingLiability.id },
      data: { value: currentLeasingBalance, metadata: leasingMetadata as object },
    });
  } else {
    carLeasingLiability = await prisma.liability.create({
      data: {
        userId: user.id,
        householdId,
        type: 'leasing',
        name: 'Car Lease',
        value: currentLeasingBalance,
        currency: 'EUR',
        metadata: leasingMetadata as object,
      },
    });
  }

  console.log(`✅ Upserted 4 assets (NN, crypto, ETF, gold) + 2 liabilities (mortgage, car lease)`);

  // Seed historical leasing snapshots (one per paid installment)
  await prisma.liabilitySnapshot.deleteMany({ where: { liabilityId: carLeasingLiability.id } });
  const leasingSnapshots = pastLeasingRows.map((r) => ({
    liabilityId: carLeasingLiability!.id,
    value: parseLeasingNumber(r[12]), // remaining balance EUR
    capturedAt: parseLeasingDate(r[2])!,
  }));
  await prisma.liabilitySnapshot.createMany({ data: leasingSnapshots });
  console.log(`✅ Seeded ${leasingSnapshots.length} car leasing snapshots`);

  // 5. Create asset & liability snapshots from all historical rows up to latest date.
  // Only delete snapshots for CSV-managed assets so manually-added snapshots (e.g. apartment) are preserved.
  const APARTMENT_SNAPSHOTS = [
    { month: '2020-02', value: 180000 },
    { month: '2022-12', value: 320000 },
    { month: '2025-11', value: 360000 },
    { month: '2026-03', value: 420000 },
  ];
  await prisma.assetSnapshot.deleteMany({ where: { assetId: apartmentAsset.id } });
  await prisma.assetSnapshot.createMany({
    data: APARTMENT_SNAPSHOTS.map(({ month, value }) => ({
      assetId: apartmentAsset.id,
      value,
      capturedAt: new Date(`${month}-01T00:00:00.000Z`),
    })),
  });
  console.log(`✅ Seeded ${APARTMENT_SNAPSHOTS.length} apartment snapshots`);

  const managedAssetIds = [nnAsset.id, cryptoAsset.id, etfAsset.id, goldAsset.id];
  await prisma.assetSnapshot.deleteMany({ where: { assetId: { in: managedAssetIds } } });
  await prisma.liabilitySnapshot.deleteMany({ where: { liabilityId: mortgageLiability.id } });

  const historicalRows = dataRows.filter((r) => {
    const d = parseDate(r[1]);
    return d !== null && d <= latestDate;
  });

  const snapshots: Array<{ assetId: string; value: number; capturedAt: Date }> = [];
  const liabilitySnapshots: Array<{ liabilityId: string; value: number; capturedAt: Date }> = [];
  for (const row of historicalRows) {
    const capturedAt = parseDate(row[1])!;
    if (parseFloat2(row[4]) > 0)
      snapshots.push({ assetId: nnAsset.id, value: parseFloat2(row[4]), capturedAt });
    if (parseFloat2(row[5]) > 0)
      snapshots.push({ assetId: cryptoAsset.id, value: parseFloat2(row[5]), capturedAt });
    if (parseFloat2(row[6]) > 0)
      snapshots.push({ assetId: etfAsset.id, value: parseFloat2(row[6]), capturedAt });
    if (parseFloat2(row[13]) > 0)
      snapshots.push({ assetId: goldAsset.id, value: parseFloat2(row[13]), capturedAt });
    if (parseFloat2(row[11]) > 0)
      liabilitySnapshots.push({ liabilityId: mortgageLiability.id, value: parseFloat2(row[11]), capturedAt });
  }

  await prisma.assetSnapshot.createMany({ data: snapshots });
  await prisma.liabilitySnapshot.createMany({ data: liabilitySnapshots });
  console.log(`✅ Imported ${snapshots.length} asset snapshots, ${liabilitySnapshots.length} liability snapshots\n`);

  // 6. Create goals
  const emergencyGoal = await prisma.goal.create({
    data: {
      userId: user.id,
      householdId,
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
      householdId,
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

  // 7. Create expense categories
  const categoryDefs = [
    { name: 'Salary / Income', color: '#10B981', type: 'income' },
    { name: 'Housing', color: '#6366F1', type: 'required' },
    { name: 'Utilities', color: '#8B5CF6', type: 'required' },
    { name: 'Groceries', color: '#F59E0B', type: 'required' },
    { name: 'Transport', color: '#3B82F6', type: 'expense' },
    { name: 'Dining Out', color: '#EF4444', type: 'expense' },
    { name: 'Entertainment', color: '#EC4899', type: 'expense' },
    { name: 'Healthcare', color: '#14B8A6', type: 'expense' },
    { name: 'Shopping', color: '#F97316', type: 'expense' },
    { name: 'Subscriptions', color: '#A855F7', type: 'expense' },
    { name: 'Insurance', color: '#64748B', type: 'required' },
    { name: 'Education', color: '#06B6D4', type: 'expense' },
    { name: 'Travel', color: '#84CC16', type: 'expense' },
    { name: 'Other', color: '#6B7280', type: 'expense' },
  ];


  const categoryMap: Record<string, string> = {};
  for (const def of categoryDefs) {
    const cat = await prisma.expenseCategory.create({
      data: {
        userId: user.id,
        householdId,
        name: def.name,
        color: def.color,
        type: def.type,
      },
    });
    categoryMap[def.name] = cat.id;
  }
  console.log(`✅ Created ${categoryDefs.length} expense categories`);

  // 8. Import monthly income/expense history from mind.csv (2015+)
  // Split the "Fixed Expenses" lump sum into realistic sub-categories
  const historicalExpenses: Array<{
    userId: string; householdId: string; amount: number; description: string; merchant: string;
    date: Date; categoryId: string; source: string;
  }> = [];

  for (const row of dataRows) {
    const d = parseDate(row[1]);
    if (!d) continue;
    const income = parseFloat2(row[2]);
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    if (income > 0) {
      historicalExpenses.push({
        userId: user.id, householdId, amount: income,
        description: `Monthly salary ${monthStr}`,
        merchant: 'Employer', date: new Date(d.getFullYear(), d.getMonth(), 1),
        categoryId: categoryMap['Salary / Income'], source: 'imported',
      });
    }
  }
  await prisma.expense.createMany({ data: historicalExpenses });
  console.log(`✅ Imported ${historicalExpenses.length} historical income/expense records (2015+)\n`);

  // 9. Parse Revolut statement → expenses (mapped to proper categories)
  const revRows = await readCSV(REVOLUT_CSV);
  const revHeader = revRows[0];
  const descIdx = revHeader.indexOf('Description');
  const amountIdx = revHeader.indexOf('Amount');
  const dateIdx = revHeader.indexOf('Completed Date');
  const stateIdx = revHeader.indexOf('State');

  // Build classifier chain (saved mappings → amount sign → fallback)
  const existingMappings = await prisma.merchantCategoryMap.findMany({ where: { householdId } });
  const savedMerchantMap = new Map(existingMappings.map((m) => [m.merchant, m.categoryId]));
  const { classify } = buildClassifierChain(categoryMap, savedMerchantMap);

  // --- Parse and classify Revolut transactions (before March 2026 — March+ is for Import testing) ---
  const SEED_CUTOFF = '2026-03-01';
  const typeIdx = revHeader.indexOf('Type');
  const completedRows = revRows.slice(1).filter((r) => {
    if (!r[stateIdx]?.includes('COMPLETED')) return false;
    const type = r[typeIdx]?.trim();
    if (type === 'Exchange') return false;
    if (parseFloat2(r[amountIdx]) === 0) return false;
    const dateStr = r[dateIdx]?.trim();
    if (dateStr && dateStr >= SEED_CUTOFF) return false;
    return true;
  });

  const transactions: Array<{
    userId: string; householdId: string; amount: number; description: string; merchant: string;
    date: Date; categoryId: string; source: string;
  }> = [];
  const newMappings = new Map<string, string>();

  for (const row of completedRows) {
    const dateStr = row[dateIdx]?.trim();
    const amount = parseFloat2(row[amountIdx]);
    const merchant = row[descIdx]?.trim() ?? 'Unknown';
    if (!dateStr || amount === 0) continue;
    const date = new Date(dateStr.split(' ')[0]);
    if (isNaN(date.getTime())) continue;

    const categoryId = classify(merchant, amount);

    if (amount < 0 && !savedMerchantMap.has(merchant) && !newMappings.has(merchant)) {
      newMappings.set(merchant, categoryId);
    }

    transactions.push({
      userId: user.id, householdId, amount, description: merchant, merchant,
      date, categoryId, source: 'imported',
    });
  }

  // Persist new mappings for future imports
  if (newMappings.size > 0) {
    await prisma.merchantCategoryMap.createMany({
      data: Array.from(newMappings.entries()).map(([merchant, categoryId]) => ({
        userId: user.id, householdId, merchant, categoryId,
      })),
      skipDuplicates: true,
    });
    console.log(`✅ Saved ${newMappings.size} merchant→category mappings`);
  }

  await prisma.expense.createMany({ data: transactions });
  const expCount = transactions.filter((t) => t.amount < 0).length;
  const incCount = transactions.filter((t) => t.amount > 0).length;
  console.log(`✅ Imported ${expCount} expenses and ${incCount} income entries from Revolut statement\n`);

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
