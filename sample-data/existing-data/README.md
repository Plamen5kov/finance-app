# Existing Financial Data

This folder is for you to share any existing financial data you've already gathered. This helps us:

1. **Understand your data structure** - How you currently track finances
2. **Design the app to fit your needs** - Build models that work with your data
3. **Create realistic test scenarios** - Seed the database with your actual goals and assets
4. **Validate import/export workflows** - Ensure data can flow in and out properly

## Data You Can Add

### 1. **Goals Data** (`goals.json` or `goals.csv`)

Your existing goals with targets and deadlines. Example format:

**JSON**:
```json
[
  {
    "name": "Travel Fund",
    "targetAmount": 5000,
    "targetDate": "2025-12-31",
    "priority": "high",
    "category": "travel",
    "startDate": "2025-01-01",
    "description": "Summer vacation to Greece"
  },
  {
    "name": "Emergency Fund",
    "targetAmount": 10000,
    "targetDate": "2026-06-30",
    "priority": "high",
    "category": "emergency"
  },
  {
    "name": "Education Fund",
    "targetAmount": 8000,
    "targetDate": "2026-09-01",
    "priority": "high",
    "category": "family"
  }
]
```

**CSV**:
```
Goal Name,Target Amount,Target Date,Priority,Category,Start Date,Description
Travel Fund,5000,2025-12-31,high,travel,2025-01-01,Summer vacation to Greece
Emergency Fund,10000,2026-06-30,high,emergency,,
Education Fund,8000,2026-09-01,high,family,,
```

### 2. **Assets Data** (`assets.json` or `assets.csv`)

Your current financial assets (investments, mortgages, crypto, gold). Example format:

**JSON**:
```json
[
  {
    "type": "mortgage",
    "name": "Home Mortgage",
    "currentBalance": 200000,
    "loanAmount": 250000,
    "interestRate": 2.5,
    "monthlyPayment": 1200,
    "remainingTerm": 20,
    "propertyValue": 450000
  },
  {
    "type": "etf",
    "name": "Vanguard Total Stock Market ETF (VTSAX)",
    "ticker": "VTSAX",
    "quantity": 50,
    "averageCost": 210,
    "currentPrice": 245
  },
  {
    "type": "crypto",
    "name": "Bitcoin",
    "symbol": "BTC",
    "quantity": 0.5,
    "averageCost": 35000,
    "currentPrice": 42000
  },
  {
    "type": "gold",
    "name": "Gold Coins",
    "quantity": 10,
    "purityOz": 1.0,
    "costPerUnit": 65,
    "currentPricePerUnit": 70
  }
]
```

**CSV**:
```
Type,Name/Ticker,Quantity,Average Cost,Current Price/Value,Monthly Payment,Interest Rate
mortgage,Home Mortgage,1,250000,200000,1200,2.5
etf,VTSAX,50,210,245,,
crypto,BTC,0.5,35000,42000,,
gold,Gold Coins,10,65,70,,
```

### 3. **Monthly Allocation Plans** (`allocation-plans.json` or `allocation-plans.csv`)

How you've been allocating income to goals and expenses. Example format:

**JSON**:
```json
[
  {
    "month": "2025-01",
    "monthlyIncome": 5000,
    "allocations": [
      { "goalId": "travel-fund", "goalName": "Travel Fund", "amount": 500 },
      { "goalId": "education-fund", "goalName": "Education Fund", "amount": 400 },
      { "goalId": "emergency-fund", "goalName": "Emergency Fund", "amount": 300 }
    ],
    "expenses": [
      { "category": "Mortgage", "amount": 1200 },
      { "category": "Utilities", "amount": 150 },
      { "category": "Groceries", "amount": 400 },
      { "category": "Insurance", "amount": 200 }
    ],
    "investmentAllocation": 600,
    "discretionary": 750
  }
]
```

**CSV**:
```
Month,Monthly Income,Travel Fund,Education Fund,Emergency Fund,Mortgage,Utilities,Groceries,Insurance,Investment,Discretionary
2025-01,5000,500,400,300,1200,150,400,200,600,750
2025-02,5000,500,400,300,1200,150,420,200,600,750
2025-03,5000,500,400,300,1200,160,410,200,600,750
```

### 4. **Expense Categories** (`categories.json` or `categories.csv`)

Your custom expense categories for tracking. Example format:

**JSON**:
```json
[
  { "name": "Groceries", "type": "expense", "color": "#FF6B6B" },
  { "name": "Utilities", "type": "expense", "color": "#4ECDC4" },
  { "name": "Car Insurance", "type": "expense", "color": "#45B7D1" },
  { "name": "Investing", "type": "goal", "color": "#96CEB4" },
  { "name": "Travel Fund", "type": "goal", "color": "#FFEAA7" }
]
```

**CSV**:
```
Category Name,Type,Color (hex)
Groceries,expense,#FF6B6B
Utilities,expense,#4ECDC4
Car Insurance,expense,#45B7D1
Investing,goal,#96CEB4
Travel Fund,goal,#FFEAA7
```

### 5. **Monthly Expenses** (`expenses.json` or `expenses.csv`)

Historical expense data for seeding. Example format:

**JSON**:
```json
[
  { "date": "2025-01-05", "amount": 85.50, "category": "Groceries", "merchant": "SUPERMARKET ABC", "description": "Weekly shopping" },
  { "date": "2025-01-10", "amount": 45.00, "category": "Entertainment", "merchant": "Netflix", "description": "Monthly subscription" },
  { "date": "2025-01-15", "amount": 125.00, "category": "Utilities", "merchant": "Electric Company", "description": "Electricity bill" }
]
```

**CSV**:
```
Date,Amount,Category,Merchant,Description
2025-01-05,85.50,Groceries,SUPERMARKET ABC,Weekly shopping
2025-01-10,45.00,Entertainment,Netflix,Monthly subscription
2025-01-15,125.00,Utilities,Electric Company,Electricity bill
```

## How to Share Your Data

1. **Choose a format**: JSON is preferred for structured data, CSV works for simple tables
2. **Anonymize if needed**: Replace real merchant names or identifying info
3. **Keep the structure**: Use the examples above as templates
4. **Add a brief note**: Include a comment about the data (e.g., "6 months of expenses")

## What Happens Next

Once you add data here, we will:
1. Create import utilities to read these files
2. Build seed scripts to populate the database during development
3. Use it for testing the parsing and visualization features
4. Validate that our app structure matches your real data needs

---

**Note**: This data is only for development purposes. When you deploy the app, you'll import real data through the UI.
