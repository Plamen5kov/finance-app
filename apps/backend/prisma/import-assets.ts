/**
 * Import assets + snapshots from mind.csv into a specific user's household.
 * Usage: npx ts-node prisma/import-assets.ts
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
  console.log('Importing assets for', TARGET_USER_EMAIL, '...\n');

  const user = await prisma.user.findUnique({ where: { email: TARGET_USER_EMAIL } });
  if (!user) throw new Error(`User ${TARGET_USER_EMAIL} not found`);

  const membership = await prisma.householdMember.findFirst({ where: { userId: user.id } });
  if (!membership) throw new Error('No household membership found');
  const householdId = membership.householdId;

  console.log(`User: ${user.email}, Household: ${householdId}\n`);

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
  const latestNNRow = [...dataRows].reverse().find((r) => parseFloat2(r[4]) > 0);
  const latestNNValue = latestNNRow ? parseFloat2(latestNNRow[4]) : 0;

  console.log(`Latest data: ${latestDate.toISOString().split('T')[0]}`);
  console.log(`  NN=${latestNNValue}, Crypto=${parseFloat2(latestRow[5])}, ETF=${parseFloat2(latestRow[6])}, Gold=${parseFloat2(latestRow[13])}\n`);

  // Upsert assets
  const upsertAsset = async (type: string, name: string, value: number) => {
    const existing = await prisma.asset.findFirst({ where: { householdId, type, name } });
    if (existing) {
      return prisma.asset.update({ where: { id: existing.id }, data: { value } });
    }
    return prisma.asset.create({
      data: { userId: user.id, householdId, type, name, value, currency: 'BGN' },
    });
  };

  const nnAsset = await upsertAsset('etf', 'NN', latestNNValue);
  const cryptoAsset = await upsertAsset('crypto', 'Crypto Portfolio', parseFloat2(latestRow[5]));
  const etfAsset = await upsertAsset('etf', 'ETF Portfolio', parseFloat2(latestRow[6]));
  const goldAsset = await upsertAsset('gold', 'Gold', parseFloat2(latestRow[13]));

  // Apartment
  const APARTMENT_SNAPSHOTS = [
    { month: '2020-02', value: 180000 },
    { month: '2022-12', value: 320000 },
    { month: '2025-11', value: 360000 },
    { month: '2026-03', value: 420000 },
  ];
  const apartmentAsset = await upsertAsset('apartment', 'Apartment', 420000);
  await prisma.assetSnapshot.deleteMany({ where: { assetId: apartmentAsset.id } });
  await prisma.assetSnapshot.createMany({
    data: APARTMENT_SNAPSHOTS.map(({ month, value }) => ({
      assetId: apartmentAsset.id,
      value,
      capturedAt: new Date(`${month}-01T00:00:00.000Z`),
    })),
  });
  console.log(`Created ${APARTMENT_SNAPSHOTS.length} apartment snapshots`);

  // Clear and re-import snapshots for CSV-managed assets
  const managedAssetIds = [nnAsset.id, cryptoAsset.id, etfAsset.id, goldAsset.id];
  await prisma.assetSnapshot.deleteMany({ where: { assetId: { in: managedAssetIds } } });

  const historicalRows = dataRows.filter((r) => {
    const d = parseDate(r[1]);
    return d !== null && d <= latestDate;
  });

  const snapshots: Array<{ assetId: string; value: number; capturedAt: Date }> = [];
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
  }

  await prisma.assetSnapshot.createMany({ data: snapshots });
  console.log(`Imported ${snapshots.length} asset snapshots`);
  console.log(`\nDone! 5 assets created/updated with full history.`);
}

main()
  .catch((e) => {
    console.error('Failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
