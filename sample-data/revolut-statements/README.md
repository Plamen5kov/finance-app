# Revolut Statement Samples

This folder contains example Revolut bank statements that we'll use to:
1. Understand the CSV export format
2. Build and test the document parsing logic
3. Create realistic sample data for development

## How to Add Your Revolut Statement

1. Export your Revolut statement as CSV:
   - Open Revolut app → Menu → Statements
   - Select a date range
   - Export as CSV
   - Save to this folder with a descriptive name, e.g., `revolut-jan-2025.csv`

2. You can anonymize sensitive data (merchant names) but keep the structure:
   - Keep transaction dates, amounts, and categories
   - You can replace real merchant names with generic ones like "Supermarket", "Gas Station", etc.

## CSV Format

Revolut typically exports with these columns:

```
Started Date,Completed Date,Description,Paid Out (EUR),Paid In (EUR),Exchange Rate,Category,Notes
2025-01-15,2025-01-15,SUPERMARKET ABC,-85.50,,1.0,Groceries,
2025-01-16,2025-01-16,ATM Withdrawal,-200.00,,1.0,Cash,
2025-01-18,2025-01-18,Salary Deposit,,3500.00,1.0,Income,
2025-01-20,2025-01-20,Amazon Purchase,-45.00,,1.0,Shopping,
```

## What We'll Extract

The parser will extract:
- **Date** - Transaction date
- **Amount** - Paid Out (expenses) or Paid In (income)
- **Merchant** - Description (e.g., "SUPERMARKET ABC")
- **Category** - Revolut's category or auto-categorized by us
- **Type** - Income or Expense

## Example Use Cases

Once you add a sample statement here:
- We can verify the CSV parser works correctly
- We can test expense categorization logic
- We can create realistic database seeding data
- We can build the import UI with real data patterns

---

**Note**: Feel free to add multiple statements from different months to test multi-month import scenarios.
