/**
 * Import goals + goal snapshots from mind.csv into a specific user's household.
 * Usage: npx ts-node prisma/import-goals.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const prisma = new PrismaClient();

const TARGET_USER_EMAIL = '5kov.p@proton.me';
const SAMPLE_DATA_DIR = path.join(__dirname, '../../../sample-data');
const FINANCES_CSV = path.join(SAMPLE_DATA_DIR, 'existing-data', 'mind.csv');

function parseDate(s: string): Date | null {
  if (!s || !s.trim()) return null;
  const parts = s.trim().split('/');
  if (parts.length !== 3) return null;
  const [mm, dd, yyyy] = parts.map(Number);
  if (!mm || !dd || !yyyy) return null;
  const d = new Date(Date.UTC(yyyy, mm - 1, dd));
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

async function main() {
  console.log('Importing goals for', TARGET_USER_EMAIL, '...\n');

  const user = await prisma.user.findUnique({ where: { email: TARGET_USER_EMAIL } });
  if (!user) throw new Error(`User ${TARGET_USER_EMAIL} not found`);

  const membership = await prisma.householdMember.findFirst({ where: { userId: user.id } });
  if (!membership) throw new Error('No household membership found');
  const householdId = membership.householdId;

  // Parse mind.csv
  const finRows = await readCSV(FINANCES_CSV);
  const dataRows = finRows.slice(1).filter((r) => {
    const d = parseDate(r[1]);
    return d !== null && r[2]?.trim();
  });

  const latestRow = [...dataRows].reverse()
    .find((r) => parseFloat2(r[5]) > 0 || parseFloat2(r[6]) > 0 || parseFloat2(r[13]) > 0);
  if (!latestRow) throw new Error('No complete data row found');
  const latestDate = parseDate(latestRow[1])!;

  // Upsert goals
  let emergencyGoal = await prisma.goal.findFirst({ where: { householdId, name: 'Emergency Fund' } });
  if (emergencyGoal) {
    emergencyGoal = await prisma.goal.update({
      where: { id: emergencyGoal.id },
      data: { currentAmount: parseFloat2(latestRow[14]) },
    });
  } else {
    emergencyGoal = await prisma.goal.create({
      data: {
        userId: user.id, householdId,
        name: 'Emergency Fund',
        targetAmount: 15000,
        currentAmount: parseFloat2(latestRow[14]),
        targetDate: new Date('2026-12-31'),
        priority: 1, status: 'active', category: 'emergency',
        description: '6 months of living expenses buffer',
      },
    });
  }

  let babyGoal = await prisma.goal.findFirst({ where: { householdId, name: 'Baby Fund' } });
  if (babyGoal) {
    babyGoal = await prisma.goal.update({
      where: { id: babyGoal.id },
      data: { currentAmount: parseFloat2(latestRow[15]) },
    });
  } else {
    babyGoal = await prisma.goal.create({
      data: {
        userId: user.id, householdId,
        name: 'Baby Fund',
        targetAmount: 20000,
        currentAmount: parseFloat2(latestRow[15]),
        targetDate: new Date('2026-09-01'),
        priority: 1, status: 'active', category: 'family',
        description: 'Baby expenses and preparations',
      },
    });
  }

  console.log(`Created/updated 2 goals`);
  console.log(`  Emergency Fund: ${emergencyGoal.currentAmount} / ${emergencyGoal.targetAmount}`);
  console.log(`  Baby Fund: ${babyGoal.currentAmount} / ${babyGoal.targetAmount}\n`);

  // Build goal snapshots
  const historicalRows = dataRows.filter((r) => {
    const d = parseDate(r[1]);
    return d !== null && d <= latestDate;
  });

  // Clear existing snapshots
  await prisma.goalSnapshot.deleteMany({ where: { goalId: { in: [emergencyGoal.id, babyGoal.id] } } });

  const realEmgByKey = new Map<string, number>();
  const realBabyByKey = new Map<string, number>();
  for (const row of historicalRows) {
    const d = parseDate(row[1])!;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (parseFloat2(row[14]) > 0) realEmgByKey.set(key, parseFloat2(row[14]));
    if (parseFloat2(row[15]) > 0) realBabyByKey.set(key, parseFloat2(row[15]));
  }

  const sortedEmgEntries = [...realEmgByKey.entries()].sort(([a], [b]) => a.localeCompare(b));
  const firstRealEmgKey = sortedEmgEntries[0]?.[0];
  const firstRealEmgVal = sortedEmgEntries[0]?.[1] ?? 0;

  const preRealRows = historicalRows.filter((row) => {
    const d = parseDate(row[1])!;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    return !firstRealEmgKey || key < firstRealEmgKey;
  });

  const goalSnaps: Array<{
    goalId: string; month: Date; targetAmount: number; balanceAsOf: number; onTrack: boolean;
  }> = [];

  for (let i = 0; i < historicalRows.length; i++) {
    const row = historicalRows[i];
    const d = parseDate(row[1])!;
    const month = new Date(d.getFullYear(), d.getMonth(), 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;

    const realEmgVal = realEmgByKey.get(key);
    const realBabyVal = realBabyByKey.get(key);

    let emgVal: number | null = null;
    if (realEmgVal !== undefined) {
      emgVal = realEmgVal;
    } else {
      const preIdx = preRealRows.indexOf(row);
      if (preIdx !== -1) {
        const total = preRealRows.length;
        emgVal = total > 1 ? Math.round((preIdx / (total - 1)) * firstRealEmgVal * 100) / 100 : 0;
      }
    }

    if (emgVal !== null) {
      goalSnaps.push({
        goalId: emergencyGoal.id, month,
        targetAmount: emergencyGoal.targetAmount,
        balanceAsOf: emgVal,
        onTrack: emgVal >= emergencyGoal.targetAmount * 0.5,
      });
    }

    if (realBabyVal !== undefined && realBabyVal > 0) {
      goalSnaps.push({
        goalId: babyGoal.id, month,
        targetAmount: babyGoal.targetAmount,
        balanceAsOf: realBabyVal,
        onTrack: true,
      });
    }
  }

  await prisma.goalSnapshot.createMany({ data: goalSnaps });
  console.log(`Created ${goalSnaps.length} goal snapshots`);
  console.log('\nDone!');
}

main()
  .catch((e) => { console.error('Failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
