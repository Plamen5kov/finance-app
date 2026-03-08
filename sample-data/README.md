# Sample Data & Examples

This folder contains templates and example data to help develop and test the Finances PWA app.

## Folder Structure

```
sample-data/
├── revolut-statements/          # Bank statement exports
│   ├── README.md               # Instructions for adding Revolut CSV files
│   └── [your-statements here]
│
├── existing-data/              # Your historical financial data
│   ├── README.md               # Guidelines for data formats
│   ├── goals.json              # (optional) Your financial goals
│   ├── assets.json             # (optional) Your current assets
│   ├── allocation-plans.json   # (optional) Your income allocation history
│   ├── categories.json         # (optional) Your expense categories
│   └── expenses.json           # (optional) Your historical expenses
│
└── sample-data.md              # This file
```

## Getting Started

### Step 1: Add Revolut Statements
1. Go to `revolut-statements/` folder
2. Export your Revolut statement as CSV (follow instructions in README.md)
3. Save it to this folder, e.g., `revolut-jan-2025.csv`

### Step 2: Add Your Existing Data (Optional)
1. Go to `existing-data/` folder
2. Add JSON or CSV files with your current financial data
3. See README.md for supported formats and examples
4. Include only the data you have (all are optional)

## How We'll Use This Data

### Development & Testing
- **Parser Testing**: Verify the Revolut CSV parser handles your export format correctly
- **Database Seeding**: Automatically populate test database with realistic data
- **UI Testing**: Build forms and reports with actual data examples

### Feature Validation
- **Goal Tracking**: Test if your goals fit the goal planning feature
- **Asset Management**: Verify all your asset types (mortgage, ETFs, crypto, gold) are supported
- **Expense Categorization**: Validate that expense categories match your needs
- **Planned vs Actual**: Check if the comparison feature works with your allocation patterns

### Data Import/Export
- **Import Workflows**: Test that we can correctly ingest your data formats
- **Migration Scripts**: Create utilities to import old data when you're ready
- **Backup/Export**: Ensure data can be exported back to CSV/JSON if needed

## Data Privacy

- This data is **only for local development**
- It will **not be committed to git** (`.gitignore` excludes CSV/JSON files)
- It stays on your machine during development
- When deploying, you'll use the UI to import real data

## Example Use Case

Let's say you provide:
1. A Revolut statement from January 2025 with 50 transactions
2. Your 5 goals (Travel Fund €5000, Education Fund €8000, Emergency Fund €10000, etc.)
3. Your monthly allocation plan (€500 to travel, €400 to education fund, etc.)
4. Your asset list (€200k mortgage, 50 shares of VTSAX, 0.5 BTC, etc.)

We can then:
- ✅ Parse the Revolut CSV and create 50 test expense records
- ✅ Seed 5 goals in the database
- ✅ Create allocation plans in the system
- ✅ Set up asset tracking with your holdings
- ✅ Test the planned vs actual comparison feature with real numbers
- ✅ Validate that all expense categories work correctly

## File Naming Conventions

### Revolut Statements
```
revolut-[YEAR]-[MONTH].csv          # e.g., revolut-2025-01.csv
revolut-[MONTH]-[YEAR].csv          # e.g., revolut-jan-2025.csv
```

### Your Data
```
goals.json
assets.json
allocation-plans.json
categories.json
expenses.json
```

## Next Steps

1. **Add at least one Revolut statement** - This is most important for testing the parser
2. **(Optional) Add your existing data** - Helps validate the data model fits your needs
3. **Let me know** - Once you've added files, I can:
   - Create a data import utility
   - Build seed scripts for development
   - Update the database models if needed
   - Test the parsing and visualization

---

**Ready?** Add your sample data files, then let me know and we'll integrate everything into the development workflow! 🚀
