/**
 * Demo seed: generates realistic synthetic data covering all features.
 * No CSV imports — purely programmatic.
 *
 * Run: npx ts-node prisma/seed-demo.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEMO_USER = {
  name: 'Demo User',
  email: 'demo@finances.local',
  password: 'DemoPassword123',
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function monthDate(year: number, month: number, day = 1): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Generate months from start to end (inclusive) as [year, month] tuples */
function monthRange(startYear: number, startMonth: number, endYear: number, endMonth: number): [number, number][] {
  const months: [number, number][] = [];
  let y = startYear, m = startMonth;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    months.push([y, m]);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}

/** Random float in range, rounded to 2 decimals */
function rand(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

/** Pick random item from array */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting demo seed...\n');

  // 1. Clean slate for demo user
  const existingUser = await prisma.user.findUnique({ where: { email: DEMO_USER.email } });
  if (existingUser) {
    const membership = await prisma.householdMember.findFirst({ where: { userId: existingUser.id } });
    if (membership) {
      await prisma.household.delete({ where: { id: membership.householdId } });
    }
    await prisma.user.delete({ where: { id: existingUser.id } });
  }

  // 2. Create user + household
  const hash = await bcrypt.hash(DEMO_USER.password, 10);
  const user = await prisma.user.create({
    data: { name: DEMO_USER.name, email: DEMO_USER.email, password: hash },
  });
  const household = await prisma.household.create({
    data: {
      name: 'Demo Household',
      members: { create: { userId: user.id, role: 'owner' } },
    },
  });
  const hid = household.id;
  const uid = user.id;
  console.log(`✅ User: ${user.email} | Household: ${hid}\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // LIABILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  // --- Mortgage: 250K, started Jan 2021, with lifecycle events ---
  const mortgage = await prisma.liability.create({
    data: {
      userId: uid, householdId: hid,
      type: 'mortgage', name: 'Home Mortgage', currency: 'EUR',
      value: 0, // will be set by snapshots logic
      metadata: {
        originalAmount: 250000,
        interestRate: 1.9,
        monthlyPayment: 1050,
        termMonths: 300,
        startDate: '2021-01-01',
        events: [
          { id: 'evt-1', type: 'extra_payment', date: '2022-06-01', amount: 10000, notes: 'Bonus payment' },
          { id: 'evt-2', type: 'refinance', date: '2023-09-01', newBalance: 210000, newRate: 2.4, newMonthlyPayment: 1200, notes: 'Bank refinance after rate hike' },
          { id: 'evt-3', type: 'rate_change', date: '2025-03-01', newRate: 2.1, notes: 'Rate reduced after ECB cut' },
          { id: 'evt-4', type: 'payment_change', date: '2025-06-01', newMonthlyPayment: 1350, notes: 'Increased payment to shorten term' },
        ],
      },
    },
  });

  // Amortize mortgage to generate snapshots
  const mortMeta = mortgage.metadata as any;
  let mBal = mortMeta.originalAmount;
  let mRate = mortMeta.interestRate;
  let mPay = mortMeta.monthlyPayment;
  const mortSnapshots: { liabilityId: string; value: number; capturedAt: Date }[] = [];
  const months2126 = monthRange(2021, 1, 2026, 3);

  for (const [y, m] of months2126) {
    const mk = monthKey(y, m);
    for (const evt of mortMeta.events) {
      const evtMk = evt.date.slice(0, 7);
      if (evtMk !== mk) continue;
      if (evt.type === 'extra_payment') mBal = Math.max(0, mBal - evt.amount);
      if (evt.type === 'refinance') {
        if (evt.newBalance != null) mBal = evt.newBalance;
        if (evt.newRate != null) mRate = evt.newRate;
        if (evt.newMonthlyPayment != null) mPay = evt.newMonthlyPayment;
      }
      if (evt.type === 'rate_change' && evt.newRate != null) mRate = evt.newRate;
      if (evt.type === 'payment_change' && evt.newMonthlyPayment != null) mPay = evt.newMonthlyPayment;
    }
    mortSnapshots.push({ liabilityId: mortgage.id, value: Math.round(mBal * 100) / 100, capturedAt: monthDate(y, m) });
    // Amortize after snapshot
    const monthlyRate = mRate / 100 / 12;
    const interest = mBal * monthlyRate;
    const principal = mPay - interest;
    if (principal > 0) mBal = Math.max(0, mBal - principal);
  }

  await prisma.liabilitySnapshot.createMany({ data: mortSnapshots });
  await prisma.liability.update({ where: { id: mortgage.id }, data: { value: mortSnapshots.at(-1)!.value } });
  console.log(`✅ Mortgage: ${mortSnapshots.length} snapshots, current balance: €${mortSnapshots.at(-1)!.value.toFixed(0)}`);

  // --- Car Leasing: 35K car, started Jun 2023, 48 months ---
  const leasing = await prisma.liability.create({
    data: {
      userId: uid, householdId: hid,
      type: 'leasing', name: 'Car Lease (BMW 3 Series)', currency: 'EUR',
      value: 0,
      metadata: {
        originalValue: 35000,
        downPayment: 7000,
        residualValue: 8750,
        interestRate: 3.9,
        monthlyPayment: 450,
        termMonths: 48,
        startDate: '2023-06-01',
      },
    },
  });

  const leaseMeta = leasing.metadata as any;
  let lBal = leaseMeta.originalValue - leaseMeta.downPayment;
  const lResidual = leaseMeta.residualValue;
  const leaseSnapshots: { liabilityId: string; value: number; capturedAt: Date }[] = [];
  const leaseMonths = monthRange(2023, 6, 2026, 3);

  for (const [y, m] of leaseMonths) {
    leaseSnapshots.push({ liabilityId: leasing.id, value: Math.round(lBal * 100) / 100, capturedAt: monthDate(y, m) });
    const monthlyRate = leaseMeta.interestRate / 100 / 12;
    const interest = lBal * monthlyRate;
    const principal = leaseMeta.monthlyPayment - interest;
    if (principal > 0) lBal = Math.max(lResidual, lBal - principal);
  }

  await prisma.liabilitySnapshot.createMany({ data: leaseSnapshots });
  await prisma.liability.update({ where: { id: leasing.id }, data: { value: leaseSnapshots.at(-1)!.value } });
  console.log(`✅ Car Lease: ${leaseSnapshots.length} snapshots, current balance: €${leaseSnapshots.at(-1)!.value.toFixed(0)}`);

  // --- Personal Loan: 15K, started Mar 2024, 36 months ---
  const loan = await prisma.liability.create({
    data: {
      userId: uid, householdId: hid,
      type: 'loan', name: 'Home Renovation Loan', currency: 'EUR',
      value: 0,
      metadata: {
        originalAmount: 15000,
        interestRate: 5.2,
        monthlyPayment: 450,
        termMonths: 36,
        startDate: '2024-03-01',
        events: [],
      },
    },
  });

  const loanMeta = loan.metadata as any;
  let lnBal = loanMeta.originalAmount;
  const loanSnapshots: { liabilityId: string; value: number; capturedAt: Date }[] = [];
  const loanMonths = monthRange(2024, 3, 2026, 3);

  for (const [y, m] of loanMonths) {
    loanSnapshots.push({ liabilityId: loan.id, value: Math.round(lnBal * 100) / 100, capturedAt: monthDate(y, m) });
    const monthlyRate = loanMeta.interestRate / 100 / 12;
    const interest = lnBal * monthlyRate;
    const principal = loanMeta.monthlyPayment - interest;
    if (principal > 0) lnBal = Math.max(0, lnBal - principal);
  }

  await prisma.liabilitySnapshot.createMany({ data: loanSnapshots });
  await prisma.liability.update({ where: { id: loan.id }, data: { value: loanSnapshots.at(-1)!.value } });
  console.log(`✅ Renovation Loan: ${loanSnapshots.length} snapshots, current balance: €${loanSnapshots.at(-1)!.value.toFixed(0)}\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // ASSETS
  // ═══════════════════════════════════════════════════════════════════════════

  // --- Apartment: bought Jan 2021 for €250K (matches mortgage), appreciates ---
  const apartment = await prisma.asset.create({
    data: {
      userId: uid, householdId: hid,
      type: 'apartment', name: 'City Apartment', value: 340000, currency: 'EUR',
    },
  });
  const aptValues: [string, number][] = [
    ['2021-01', 250000], ['2021-06', 255000], ['2022-01', 268000], ['2022-06', 275000],
    ['2023-01', 285000], ['2023-06', 292000], ['2024-01', 305000], ['2024-06', 315000],
    ['2025-01', 325000], ['2025-06', 335000], ['2026-01', 340000],
  ];
  await prisma.assetSnapshot.createMany({
    data: aptValues.map(([month, value]) => ({
      assetId: apartment.id, value, capturedAt: new Date(`${month}-01T00:00:00Z`),
    })),
  });
  console.log(`✅ Apartment: ${aptValues.length} snapshots, current: €340,000`);

  // --- Car: depreciates from €35K (matches lease) ---
  const car = await prisma.asset.create({
    data: {
      userId: uid, householdId: hid,
      type: 'apartment', name: 'BMW 3 Series', value: 27000, currency: 'EUR',
      metadata: { vehicleType: 'sedan', year: 2023 },
    },
  });
  const carValues: [string, number][] = [
    ['2023-06', 35000], ['2023-12', 33000], ['2024-06', 31000], ['2024-12', 29000],
    ['2025-06', 28000], ['2025-12', 27500], ['2026-03', 27000],
  ];
  await prisma.assetSnapshot.createMany({
    data: carValues.map(([month, value]) => ({
      assetId: car.id, value, capturedAt: new Date(`${month}-01T00:00:00Z`),
    })),
  });
  console.log(`✅ Car: ${carValues.length} snapshots, current: €27,000`);

  // --- ETF: Vanguard FTSE All-World (VWCE) — monthly DCA since Jan 2022 ---
  const etf1 = await prisma.asset.create({
    data: {
      userId: uid, householdId: hid,
      type: 'etf', name: 'Vanguard FTSE All-World (VWCE)', value: 0, currency: 'EUR',
      metadata: { ticker: 'VWCE', broker: 'Interactive Brokers' },
    },
  });
  const etfMonths = monthRange(2022, 1, 2026, 3);
  let etfVal = 0;
  const etfSnapshots: { assetId: string; value: number; capturedAt: Date }[] = [];
  for (const [y, m] of etfMonths) {
    etfVal += 400; // monthly contribution
    etfVal *= 1 + rand(-0.02, 0.035); // monthly return
    etfSnapshots.push({ assetId: etf1.id, value: Math.round(etfVal * 100) / 100, capturedAt: monthDate(y, m) });
  }
  await prisma.assetSnapshot.createMany({ data: etfSnapshots });
  await prisma.asset.update({ where: { id: etf1.id }, data: { value: etfSnapshots.at(-1)!.value } });
  console.log(`✅ ETF (VWCE): ${etfSnapshots.length} snapshots, current: €${etfSnapshots.at(-1)!.value.toFixed(0)}`);

  // --- ETF 2: iShares MSCI World (IWDA) — lump sum + sporadic additions ---
  const etf2 = await prisma.asset.create({
    data: {
      userId: uid, householdId: hid,
      type: 'etf', name: 'iShares MSCI World (IWDA)', value: 0, currency: 'EUR',
      metadata: { ticker: 'IWDA', broker: 'Interactive Brokers' },
    },
  });
  const iwdaMonths = monthRange(2023, 3, 2026, 3);
  let iwdaVal = 5000; // initial lump sum
  const iwdaSnapshots: { assetId: string; value: number; capturedAt: Date }[] = [];
  for (const [y, m] of iwdaMonths) {
    if (m % 3 === 0) iwdaVal += 1000; // quarterly top-up
    iwdaVal *= 1 + rand(-0.015, 0.03);
    iwdaSnapshots.push({ assetId: etf2.id, value: Math.round(iwdaVal * 100) / 100, capturedAt: monthDate(y, m) });
  }
  await prisma.assetSnapshot.createMany({ data: iwdaSnapshots });
  await prisma.asset.update({ where: { id: etf2.id }, data: { value: iwdaSnapshots.at(-1)!.value } });
  console.log(`✅ ETF (IWDA): ${iwdaSnapshots.length} snapshots, current: €${iwdaSnapshots.at(-1)!.value.toFixed(0)}`);

  // --- Crypto: Bitcoin ---
  const btc = await prisma.asset.create({
    data: {
      userId: uid, householdId: hid,
      type: 'crypto', name: 'Bitcoin (BTC)', value: 0, currency: 'EUR',
      quantity: 0.45, metadata: { symbol: 'BTC', wallet: 'Ledger' },
    },
  });
  // Approximate BTC/EUR prices at various months
  const btcPrices: [string, number][] = [
    ['2022-01', 33000], ['2022-06', 18500], ['2022-12', 15500],
    ['2023-03', 24000], ['2023-06', 27000], ['2023-09', 24500], ['2023-12', 39000],
    ['2024-03', 60000], ['2024-06', 58000], ['2024-09', 55000], ['2024-12', 87000],
    ['2025-03', 78000], ['2025-06', 82000], ['2025-09', 90000], ['2025-12', 85000],
    ['2026-03', 92000],
  ];
  await prisma.assetSnapshot.createMany({
    data: btcPrices.map(([month, price]) => ({
      assetId: btc.id, value: Math.round(0.45 * price * 100) / 100, price,
      capturedAt: new Date(`${month}-01T00:00:00Z`),
    })),
  });
  await prisma.asset.update({ where: { id: btc.id }, data: { value: Math.round(0.45 * 92000 * 100) / 100 } });
  console.log(`✅ BTC: ${btcPrices.length} snapshots, current: €${(0.45 * 92000).toFixed(0)}`);

  // --- Crypto: Ethereum ---
  const eth = await prisma.asset.create({
    data: {
      userId: uid, householdId: hid,
      type: 'crypto', name: 'Ethereum (ETH)', value: 0, currency: 'EUR',
      quantity: 3.2, metadata: { symbol: 'ETH', wallet: 'Ledger' },
    },
  });
  const ethPrices: [string, number][] = [
    ['2022-01', 2800], ['2022-06', 1000], ['2022-12', 1100],
    ['2023-03', 1600], ['2023-06', 1700], ['2023-09', 1500], ['2023-12', 2100],
    ['2024-03', 3200], ['2024-06', 3400], ['2024-09', 2300], ['2024-12', 3600],
    ['2025-03', 2000], ['2025-06', 2200], ['2025-09', 2500], ['2025-12', 2800],
    ['2026-03', 2400],
  ];
  await prisma.assetSnapshot.createMany({
    data: ethPrices.map(([month, price]) => ({
      assetId: eth.id, value: Math.round(3.2 * price * 100) / 100, price,
      capturedAt: new Date(`${month}-01T00:00:00Z`),
    })),
  });
  await prisma.asset.update({ where: { id: eth.id }, data: { value: Math.round(3.2 * 2400 * 100) / 100 } });
  console.log(`✅ ETH: ${ethPrices.length} snapshots, current: €${(3.2 * 2400).toFixed(0)}`);

  // --- Gold: physical gold ---
  const gold = await prisma.asset.create({
    data: {
      userId: uid, householdId: hid,
      type: 'gold', name: 'Physical Gold (50g)', value: 0, currency: 'EUR',
      quantity: 50, metadata: { purity: '999.9', form: 'bars' },
    },
  });
  // Gold price per gram EUR (approx)
  const goldPrices: [string, number][] = [
    ['2022-06', 55], ['2022-12', 56], ['2023-06', 58], ['2023-12', 60],
    ['2024-06', 68], ['2024-12', 76], ['2025-06', 82], ['2025-12', 86],
    ['2026-03', 88],
  ];
  await prisma.assetSnapshot.createMany({
    data: goldPrices.map(([month, pricePerGram]) => ({
      assetId: gold.id, value: 50 * pricePerGram, price: pricePerGram,
      capturedAt: new Date(`${month}-01T00:00:00Z`),
    })),
  });
  await prisma.asset.update({ where: { id: gold.id }, data: { value: 50 * 88 } });
  console.log(`✅ Gold: ${goldPrices.length} snapshots, current: €${50 * 88}\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPENSE CATEGORIES
  // ═══════════════════════════════════════════════════════════════════════════

  const categoryDefs = [
    { name: 'Salary', color: '#10B981', type: 'income' },
    { name: 'Freelance Income', color: '#34D399', type: 'income' },
    { name: 'Rent / Mortgage', color: '#6366F1', type: 'required' },
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
    { name: 'Childcare', color: '#FB923C', type: 'required' },
    { name: 'Gifts & Donations', color: '#F472B6', type: 'expense' },
    { name: 'Other', color: '#6B7280', type: 'expense' },
  ];

  const catMap: Record<string, string> = {};
  for (const def of categoryDefs) {
    const cat = await prisma.expenseCategory.create({
      data: { userId: uid, householdId: hid, name: def.name, color: def.color, type: def.type },
    });
    catMap[def.name] = cat.id;
  }
  console.log(`✅ Created ${categoryDefs.length} expense categories`);

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPENSES & INCOME — 14 months (Jan 2025 → Mar 2026)
  // ═══════════════════════════════════════════════════════════════════════════

  const expenseMonths = monthRange(2025, 1, 2026, 3);
  const allExpenses: {
    userId: string; householdId: string; amount: number; merchant: string | null;
    description: string | null; date: Date; categoryId: string; source: string;
  }[] = [];

  // Merchant pools per category
  const merchants: Record<string, string[]> = {
    'Groceries': ['Lidl', 'Aldi', 'Rewe', 'Edeka', 'Penny'],
    'Transport': ['Shell Gas Station', 'BP Fuel', 'City Metro', 'Uber', 'Parking Garage'],
    'Dining Out': ['Pizza Express', 'Sushi Palace', 'Cafe Nero', 'McDonalds', 'Local Bistro', 'Thai Kitchen'],
    'Entertainment': ['Cinema City', 'Steam Games', 'Book Store', 'Concert Hall', 'Bowling Alley'],
    'Healthcare': ['City Pharmacy', 'Dr. Mueller', 'Dentist Dr. Braun', 'Optician Plus'],
    'Shopping': ['Amazon', 'Zara', 'H&M', 'IKEA', 'Media Markt', 'Decathlon'],
    'Subscriptions': ['Netflix', 'Spotify', 'Gym Membership', 'iCloud', 'YouTube Premium', 'ChatGPT Plus'],
    'Education': ['Udemy', 'OReilly Books', 'Coursera'],
    'Travel': ['Booking.com', 'Ryanair', 'Airbnb', 'Hertz Car Rental'],
    'Childcare': ['Happy Kids Daycare', 'Babysitter Maria'],
    'Gifts & Donations': ['Gift Shop', 'Red Cross', 'Birthday Gift'],
  };

  // Description pools per category
  const descriptions: Record<string, string[]> = {
    'Groceries': ['Weekly groceries', 'Fruits and vegetables', 'Bread and dairy', 'Household supplies', 'Snacks and drinks', 'Meat and fish', 'Baby food and diapers'],
    'Transport': ['Tank full', 'Highway toll', 'Monthly metro pass', 'Ride to airport', 'Parking downtown', 'Fuel top-up'],
    'Dining Out': ['Lunch with colleagues', 'Friday dinner', 'Weekend brunch', 'Quick takeaway', 'Date night', 'Birthday celebration dinner'],
    'Entertainment': ['Movie tickets', 'New board game', 'Concert tickets', 'Bowling night', 'Video game purchase', 'Book order'],
    'Healthcare': ['Prescription medication', 'Annual checkup copay', 'Dental cleaning', 'New glasses', 'Vitamins and supplements', 'Physiotherapy session'],
    'Shopping': ['Winter jacket', 'Kitchen utensils', 'Running shoes', 'New desk lamp', 'Phone case', 'Bathroom towels', 'Kids clothing'],
    'Travel': ['Flight tickets', 'Hotel 3 nights', 'Vacation apartment', 'Rental car weekend', 'Travel insurance', 'Airport transfer'],
    'Gifts & Donations': ['Birthday present', 'Charity donation', 'Wedding gift', 'Christmas gifts', 'Housewarming gift'],
  };

  for (const [y, m] of expenseMonths) {
    const monthStart = monthDate(y, m);

    // --- INCOME ---
    // Salary: €4,200 net, arrives on the 1st
    allExpenses.push({
      userId: uid, householdId: hid, amount: 4200,
      merchant: 'TechCorp GmbH', description: `Salary ${monthKey(y, m)}`,
      date: monthDate(y, m, 1), categoryId: catMap['Salary'], source: 'manual',
    });

    // Freelance income: sporadic, ~€500-1500 every 2-3 months
    if (m % 3 === 1) {
      allExpenses.push({
        userId: uid, householdId: hid, amount: rand(500, 1500),
        merchant: 'Freelance Client', description: 'Consulting invoice',
        date: monthDate(y, m, rand(10, 25)), categoryId: catMap['Freelance Income'], source: 'manual',
      });
    }

    // --- REQUIRED EXPENSES ---
    // Rent/Mortgage payment
    allExpenses.push({
      userId: uid, householdId: hid, amount: -1350,
      merchant: 'Bank Mortgage Payment', description: 'Monthly mortgage',
      date: monthDate(y, m, 5), categoryId: catMap['Rent / Mortgage'], source: 'manual',
    });

    // Utilities: €120-220
    allExpenses.push({
      userId: uid, householdId: hid, amount: -rand(120, 220),
      merchant: pick(['City Electric', 'Water Works', 'Internet Provider']),
      description: 'Monthly utilities',
      date: monthDate(y, m, pick([8, 10, 12])), categoryId: catMap['Utilities'], source: 'manual',
    });

    // Insurance: €85 fixed
    allExpenses.push({
      userId: uid, householdId: hid, amount: -85,
      merchant: 'Allianz Insurance', description: 'Health & car insurance',
      date: monthDate(y, m, 1), categoryId: catMap['Insurance'], source: 'manual',
    });

    // Childcare: €350
    allExpenses.push({
      userId: uid, householdId: hid, amount: -350,
      merchant: 'Happy Kids Daycare', description: 'Monthly daycare',
      date: monthDate(y, m, 3), categoryId: catMap['Childcare'], source: 'manual',
    });

    // --- VARIABLE EXPENSES ---
    // Groceries: 8-12 transactions per month, €15-85 each
    const groceryCount = Math.floor(rand(8, 12));
    for (let i = 0; i < groceryCount; i++) {
      allExpenses.push({
        userId: uid, householdId: hid, amount: -rand(15, 85),
        merchant: pick(merchants['Groceries']), description: pick(descriptions['Groceries']),
        date: monthDate(y, m, Math.min(28, Math.floor(rand(1, 28)))),
        categoryId: catMap['Groceries'], source: 'imported',
      });
    }

    // Transport: 3-6 transactions, €10-80
    const transportCount = Math.floor(rand(3, 6));
    for (let i = 0; i < transportCount; i++) {
      allExpenses.push({
        userId: uid, householdId: hid, amount: -rand(10, 80),
        merchant: pick(merchants['Transport']), description: pick(descriptions['Transport']),
        date: monthDate(y, m, Math.min(28, Math.floor(rand(1, 28)))),
        categoryId: catMap['Transport'], source: 'imported',
      });
    }

    // Dining out: 4-8 times, €12-65
    const diningCount = Math.floor(rand(4, 8));
    for (let i = 0; i < diningCount; i++) {
      allExpenses.push({
        userId: uid, householdId: hid, amount: -rand(12, 65),
        merchant: pick(merchants['Dining Out']), description: pick(descriptions['Dining Out']),
        date: monthDate(y, m, Math.min(28, Math.floor(rand(1, 28)))),
        categoryId: catMap['Dining Out'], source: 'imported',
      });
    }

    // Entertainment: 1-3 times, €10-50
    const entCount = Math.floor(rand(1, 3));
    for (let i = 0; i < entCount; i++) {
      allExpenses.push({
        userId: uid, householdId: hid, amount: -rand(10, 50),
        merchant: pick(merchants['Entertainment']), description: pick(descriptions['Entertainment']),
        date: monthDate(y, m, Math.min(28, Math.floor(rand(1, 28)))),
        categoryId: catMap['Entertainment'], source: 'imported',
      });
    }

    // Healthcare: 0-2 times, €15-120
    if (Math.random() > 0.4) {
      allExpenses.push({
        userId: uid, householdId: hid, amount: -rand(15, 120),
        merchant: pick(merchants['Healthcare']), description: pick(descriptions['Healthcare']),
        date: monthDate(y, m, Math.floor(rand(5, 25))),
        categoryId: catMap['Healthcare'], source: 'imported',
      });
    }

    // Shopping: 1-4 times, €20-200
    const shopCount = Math.floor(rand(1, 4));
    for (let i = 0; i < shopCount; i++) {
      allExpenses.push({
        userId: uid, householdId: hid, amount: -rand(20, 200),
        merchant: pick(merchants['Shopping']), description: pick(descriptions['Shopping']),
        date: monthDate(y, m, Math.min(28, Math.floor(rand(1, 28)))),
        categoryId: catMap['Shopping'], source: 'imported',
      });
    }

    // Subscriptions: fixed monthly
    const subs = [
      { merchant: 'Netflix', amount: -15.99 },
      { merchant: 'Spotify', amount: -9.99 },
      { merchant: 'Gym Membership', amount: -39.90 },
      { merchant: 'iCloud', amount: -2.99 },
      { merchant: 'ChatGPT Plus', amount: -20 },
    ];
    for (const sub of subs) {
      allExpenses.push({
        userId: uid, householdId: hid, amount: sub.amount,
        merchant: sub.merchant, description: 'Monthly subscription',
        date: monthDate(y, m, pick([1, 2, 3, 15])),
        categoryId: catMap['Subscriptions'], source: 'imported',
      });
    }

    // Education: occasional, every 2-3 months
    if (m % 2 === 0) {
      allExpenses.push({
        userId: uid, householdId: hid, amount: -rand(15, 80),
        merchant: pick(merchants['Education']), description: 'Online course',
        date: monthDate(y, m, Math.floor(rand(5, 20))),
        categoryId: catMap['Education'], source: 'imported',
      });
    }

    // Travel: bigger expense every ~3 months
    if (m % 4 === 0) {
      const travelItems = Math.floor(rand(2, 4));
      for (let i = 0; i < travelItems; i++) {
        allExpenses.push({
          userId: uid, householdId: hid, amount: -rand(50, 400),
          merchant: pick(merchants['Travel']), description: pick(descriptions['Travel']),
          date: monthDate(y, m, Math.floor(rand(10, 25))),
          categoryId: catMap['Travel'], source: 'imported',
        });
      }
    }

    // Gifts: occasional
    if (Math.random() > 0.7) {
      allExpenses.push({
        userId: uid, householdId: hid, amount: -rand(20, 100),
        merchant: pick(merchants['Gifts & Donations']), description: pick(descriptions['Gifts & Donations']),
        date: monthDate(y, m, Math.floor(rand(5, 25))),
        categoryId: catMap['Gifts & Donations'], source: 'imported',
      });
    }
  }

  await prisma.expense.createMany({ data: allExpenses });
  const incomeCount = allExpenses.filter((e) => e.amount > 0).length;
  const expenseCount = allExpenses.filter((e) => e.amount < 0).length;
  console.log(`✅ Created ${incomeCount} income + ${expenseCount} expense entries (${expenseMonths.length} months)\n`);

  // Save merchant→category mappings
  const merchantMappings = new Map<string, string>();
  for (const exp of allExpenses) {
    if (exp.merchant && exp.amount < 0 && !merchantMappings.has(exp.merchant)) {
      merchantMappings.set(exp.merchant, exp.categoryId);
    }
  }
  await prisma.merchantCategoryMap.createMany({
    data: Array.from(merchantMappings.entries()).map(([merchant, categoryId]) => ({
      userId: uid, householdId: hid, merchant, categoryId,
    })),
  });
  console.log(`✅ Saved ${merchantMappings.size} merchant→category mappings`);

  // ═══════════════════════════════════════════════════════════════════════════
  // GOALS
  // ═══════════════════════════════════════════════════════════════════════════

  const emergencyGoal = await prisma.goal.create({
    data: {
      userId: uid, householdId: hid,
      name: 'Emergency Fund', targetAmount: 25000, currentAmount: 18500,
      targetDate: new Date('2026-12-31'), priority: 1, status: 'active',
      category: 'emergency', description: '6 months living expenses',
    },
  });

  const vacationGoal = await prisma.goal.create({
    data: {
      userId: uid, householdId: hid,
      name: 'Summer Vacation 2026', targetAmount: 5000, currentAmount: 3200,
      targetDate: new Date('2026-07-01'), priority: 2, status: 'active',
      category: 'travel', description: 'Family trip to Greece',
    },
  });

  const newCarGoal = await prisma.goal.create({
    data: {
      userId: uid, householdId: hid,
      name: 'Next Car Down Payment', targetAmount: 15000, currentAmount: 4800,
      targetDate: new Date('2027-06-01'), priority: 3, status: 'active',
      category: 'transport', description: 'Saving for next car when lease ends',
    },
  });

  const monthlyBudget = await prisma.goal.create({
    data: {
      userId: uid, householdId: hid,
      name: 'Monthly Savings Target', targetAmount: 800, currentAmount: 750,
      recurringPeriod: 'monthly', priority: 1, status: 'active',
      category: 'emergency', description: 'Save at least €800/month',
    },
  });

  console.log(`✅ Created 4 goals\n`);

  // Goal snapshots for emergency fund (growing over 14 months)
  const goalSnapData: {
    goalId: string; month: Date; targetAmount: number;
    balanceAsOf: number; onTrack: boolean;
  }[] = [];

  let emgBal = 10000;
  let vacBal = 0;
  let carBal = 0;
  for (const [y, m] of expenseMonths) {
    emgBal += rand(400, 800);
    goalSnapData.push({
      goalId: emergencyGoal.id, month: monthDate(y, m),
      targetAmount: 25000, balanceAsOf: Math.round(emgBal * 100) / 100,
      onTrack: emgBal > 15000,
    });

    vacBal += rand(150, 350);
    goalSnapData.push({
      goalId: vacationGoal.id, month: monthDate(y, m),
      targetAmount: 5000, balanceAsOf: Math.min(5000, Math.round(vacBal * 100) / 100),
      onTrack: true,
    });

    carBal += rand(200, 500);
    goalSnapData.push({
      goalId: newCarGoal.id, month: monthDate(y, m),
      targetAmount: 15000, balanceAsOf: Math.round(carBal * 100) / 100,
      onTrack: true,
    });

    goalSnapData.push({
      goalId: monthlyBudget.id, month: monthDate(y, m),
      targetAmount: 800, balanceAsOf: rand(600, 1100),
      onTrack: Math.random() > 0.2,
    });
  }

  await prisma.goalSnapshot.createMany({ data: goalSnapData });
  // Update current amounts
  await prisma.goal.update({ where: { id: emergencyGoal.id }, data: { currentAmount: emgBal } });
  await prisma.goal.update({ where: { id: vacationGoal.id }, data: { currentAmount: Math.min(5000, vacBal) } });
  await prisma.goal.update({ where: { id: newCarGoal.id }, data: { currentAmount: carBal } });
  console.log(`✅ Created ${goalSnapData.length} goal snapshots`);

  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n🎉 Demo seed complete!\n');
  console.log(`Login with:`);
  console.log(`  Email:    ${DEMO_USER.email}`);
  console.log(`  Password: ${DEMO_USER.password}`);
}

main()
  .catch((e) => {
    console.error('❌ Demo seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
