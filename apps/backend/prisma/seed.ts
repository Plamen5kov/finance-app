/**
 * Seed script: imports historical CSV data into the database.
 *
 * Column mapping for historical-finances.csv:
 *   [0]  month       – Excel date serial
 *   [1]  income      – monthly income (BGN)
 *   [2]  expenses    – fixed monthly expenses (BGN)
 *   [3]  NN          – accumulated NN savings
 *   [4]  crypto      – crypto portfolio value (BGN, volatile)
 *   [5]  etf         – ETF portfolio value (BGN, growing)
 *   [6]  mortgStart  – mortgage opening balance for the month
 *   [7]  mortgPay    – mortgage payment amount
 *   [8]  principal   – principal paid
 *   [9]  interest    – interest paid
 *   [10] mortgEnd    – mortgage ending balance
 *   [11] ipr         – interest/principal ratio
 *   [12] gold        – gold (злато) value (BGN)
 *   [13] emergency   – emergency fund (BGN)
 *   [14] baby        – baby fund (BGN)
 *   [15] total       – total investments (BGN)
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const prisma = new PrismaClient();

const SAMPLE_DATA_DIR = path.join(__dirname, '../../../sample-data');
const FINANCES_CSV = path.join(SAMPLE_DATA_DIR, 'existing-data/historical-finances.csv');
const REVOLUT_CSV = path.join(SAMPLE_DATA_DIR, 'revolut-statements/statment.csv');

const SEED_USER = {
  name: 'Plamen',
  email: 'plamen@finances.local',
  password: 'MyPassword123456',
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function excelToDate(serial: string): Date | null {
  try {
    let s = parseInt(serial, 10);
    if (isNaN(s) || s < 1) return null;
    if (s > 60) s -= 1; // Excel 1900 leap-year bug
    const epoch = new Date(1900, 0, 1);
    epoch.setDate(epoch.getDate() + s - 1);
    return epoch;
  } catch {
    return null;
  }
}

function parseFloat2(v: string): number {
  if (!v || !v.trim()) return 0;
  const n = parseFloat(v.replace(/[^\d.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

async function readCSV(filePath: string): Promise<string[][]> {
  const rows: string[][] = [];
  const rl = readline.createInterface({ input: fs.createReadStream(filePath) });
  for await (const line of rl) {
    // Simple CSV split (values in this file don't contain commas inside quotes)
    rows.push(line.split(','));
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

  // 2. Clear existing seed data
  await prisma.assetSnapshot.deleteMany({ where: { asset: { userId: user.id } } });
  await prisma.goalSnapshot.deleteMany({ where: { goal: { userId: user.id } } });
  await prisma.expense.deleteMany({ where: { userId: user.id } });
  await prisma.expenseCategory.deleteMany({ where: { userId: user.id } });
  await prisma.asset.deleteMany({ where: { userId: user.id } });
  await prisma.goal.deleteMany({ where: { userId: user.id } });
  console.log('🧹 Cleared existing data\n');

  // 3. Parse historical finances CSV
  const finRows = await readCSV(FINANCES_CSV);
  // Skip header row, filter to rows with actual data
  const dataRows = finRows.slice(1).filter((r) => {
    const d = excelToDate(r[0]);
    return d !== null && r[1]?.trim();
  });

  // Most recent complete row (March 2026)
  const latestRow = [...dataRows]
    .reverse()
    .find((r) => parseFloat2(r[4]) > 0 || parseFloat2(r[5]) > 0 || parseFloat2(r[12]) > 0);

  if (!latestRow) throw new Error('No complete data row found');

  const latestDate = excelToDate(latestRow[0])!;
  console.log(`📅 Latest data row: ${latestDate.toISOString().split('T')[0]}`);
  console.log(`   crypto=${parseFloat2(latestRow[4]).toFixed(0)} BGN`);
  console.log(`   ETF=${parseFloat2(latestRow[5]).toFixed(0)} BGN`);
  console.log(`   mortgage balance=${parseFloat2(latestRow[10]).toFixed(0)} BGN`);
  console.log(`   gold=${parseFloat2(latestRow[12]).toFixed(0)} BGN`);
  console.log(`   emergency fund=${parseFloat2(latestRow[13]).toFixed(0)} BGN`);
  console.log(`   baby fund=${parseFloat2(latestRow[14]).toFixed(0)} BGN\n`);

  // 4. Create assets from latest row
  const cryptoAsset = await prisma.asset.create({
    data: {
      userId: user.id,
      type: 'crypto',
      name: 'Crypto Portfolio',
      value: parseFloat2(latestRow[4]),
      currency: 'BGN',
    },
  });

  const etfAsset = await prisma.asset.create({
    data: {
      userId: user.id,
      type: 'etf',
      name: 'ETF Portfolio',
      value: parseFloat2(latestRow[5]),
      currency: 'BGN',
    },
  });

  const goldAsset = await prisma.asset.create({
    data: {
      userId: user.id,
      type: 'gold',
      name: 'Gold (злато)',
      value: parseFloat2(latestRow[12]),
      currency: 'BGN',
    },
  });

  const mortgageEndBalance = parseFloat2(latestRow[10]);
  const mortgageAsset = await prisma.asset.create({
    data: {
      userId: user.id,
      type: 'mortgage',
      name: 'Home Mortgage',
      value: mortgageEndBalance,
      currency: 'BGN',
      metadata: {
        monthlyPayment: parseFloat2(latestRow[7]),
        interestRate: 2.58,
        note: 'Remaining balance',
      },
    },
  });

  console.log(`✅ Created 4 assets (crypto, ETF, gold, mortgage)`);

  // 5. Create asset snapshots from historical rows (monthly)
  const historicalRows = dataRows.filter((r) => {
    const d = excelToDate(r[0])!;
    return d <= latestDate;
  });

  const snapshots: Array<{ assetId: string; value: number; capturedAt: Date }> = [];
  for (const row of historicalRows) {
    const capturedAt = excelToDate(row[0])!;
    if (parseFloat2(row[4]) > 0)
      snapshots.push({ assetId: cryptoAsset.id, value: parseFloat2(row[4]), capturedAt });
    if (parseFloat2(row[5]) > 0)
      snapshots.push({ assetId: etfAsset.id, value: parseFloat2(row[5]), capturedAt });
    if (parseFloat2(row[12]) > 0)
      snapshots.push({ assetId: goldAsset.id, value: parseFloat2(row[12]), capturedAt });
    if (parseFloat2(row[10]) > 0)
      snapshots.push({ assetId: mortgageAsset.id, value: parseFloat2(row[10]), capturedAt });
  }

  await prisma.assetSnapshot.createMany({ data: snapshots });
  console.log(`✅ Created ${snapshots.length} asset history snapshots\n`);

  // 6. Create goals
  const emergencyGoal = await prisma.goal.create({
    data: {
      userId: user.id,
      name: 'Emergency Fund',
      targetAmount: 15000,
      currentAmount: parseFloat2(latestRow[13]),
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
      currentAmount: parseFloat2(latestRow[14]),
      targetDate: new Date('2026-09-01'),
      priority: 1,
      status: 'active',
      category: 'family',
      description: 'Baby expenses and preparations',
    },
  });

  console.log(`✅ Created 2 goals (emergency fund, baby fund)`);

  // Add goal snapshots for historical tracking
  const goalSnaps: Array<{
    goalId: string;
    month: Date;
    targetAmount: number;
    balanceAsOf: number;
    onTrack: boolean;
  }> = [];
  for (const row of historicalRows) {
    const d = excelToDate(row[0])!;
    const month = new Date(d.getFullYear(), d.getMonth(), 1); // YYYY-MM-01
    const emgVal = parseFloat2(row[13]);
    const babyVal = parseFloat2(row[14]);
    if (emgVal > 0)
      goalSnaps.push({
        goalId: emergencyGoal.id,
        month,
        targetAmount: emergencyGoal.targetAmount,
        balanceAsOf: emgVal,
        onTrack: emgVal >= emergencyGoal.targetAmount * 0.5,
      });
    if (babyVal > 0)
      goalSnaps.push({
        goalId: babyGoal.id,
        month,
        targetAmount: babyGoal.targetAmount,
        balanceAsOf: babyVal,
        onTrack: true,
      });
  }
  await prisma.goalSnapshot.createMany({ data: goalSnaps });
  console.log(`✅ Created ${goalSnaps.length} goal snapshots\n`);

  // 7. Parse Revolut statement → expenses
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
