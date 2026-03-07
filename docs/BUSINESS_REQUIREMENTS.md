# Finances PWA App - Business Requirements

## Executive Summary

This is a personal finance management PWA designed for the user and their spouse to gain complete visibility and control over their financial situation. The app consolidates all financial data (mortgages, investments, expenses, and goals) into a single, intelligent planning tool. Rather than manually managing finances, users input their monthly income, and the app intelligently allocates it across goals (travel fund, baby fund, etc.) and required expenses (mortgage, insurance, taxes) while respecting deadlines and constraints.

**Core Promise**: Complete financial transparency + intelligent allocation planning + zero manual data entry through automation and document parsing.

---

## User Personas

### Primary Users
- **User (Owner 1)**: Primary financial planner, sets goals, reviews allocations, uploads statements
- **Spouse (Owner 2)**: Co-owner with full visibility and access, can review plans and upload documents
- Both users have their own login credentials but view the same consolidated financial picture

### Key Characteristics
- Tech-savvy enough to use a PWA app on phone and access documents
- Prefers automation over manual data entry
- Goal-oriented (trackable deadlines for goals)
- Data-driven decision making
- Values privacy (self-hosted, no external sharing)

---

## Core Features

### 1. Financial Overview Dashboard

**Primary Goal**: Instant visibility into net worth and monthly financial health

**Features**:
- **Net Worth Summary**: Total asset value minus total liabilities
  - Updated status (last update time)
  - Breakdown by category (property, investments, crypto, cash)
  - Month-over-month change visualization

- **Monthly Summary Card**:
  - Monthly income input
  - Total monthly allocated to goals
  - Total monthly allocated to required expenses
  - Remaining/surplus for other purposes

- **Quick Stats**:
  - Upcoming goal deadlines (countdown)
  - Required expenses due this month
  - Recent document uploads (Revolut statements parsed automatically)
  - Asset price updates status (last auto-update)

- **Visual Health Indicators**:
  - Emergency fund status (% of yearly expenses saved)
  - Goal progress (% towards each goal)
  - Expense tracking (% of budget spent this month)

---

### 2. Mortgage & Property Management

**Primary Goal**: Track mortgage obligations and property value growth

**Data Points**:
- Property value (user input)
- Mortgage balance (auto-calculated or manual entry)
- Loan amount (original)
- Interest rate (%)
- Monthly payment
- Remaining term (years)
- Payment due date
- Payoff timeline

**Features**:
- Display current mortgage details
- Show historical balance progression (monthly snapshots)
- Calculate equity buildup over time
- Property value trend (user updates periodic valuations)
- Payoff projection based on current rate

**Data Sources**:
- Manual input (bank statements, loan documents)
- Monthly snapshots from backend jobs
- User-provided updates

---

### 3. Investments Tracking

**A. ETF Holdings**

**Data Points** (per ETF):
- Ticker symbol (e.g., VTSAX, VOO)
- Quantity owned
- Average cost basis
- Current price (auto-updated monthly)
- Total value (calculated)
- Dividend yield (if applicable)
- Category/allocation (growth, dividend, etc.)

**B. Cryptocurrency Holdings**

**Data Points** (per coin):
- Coin name & symbol (BTC, ETH, etc.)
- Quantity owned
- Average cost basis
- Current price (auto-updated monthly via CoinGecko)
- Total value (calculated)
- Purchase date(s)

**C. Physical Gold Coins**

**Data Points** (per batch):
- Type/purity (e.g., 1oz 999.9 gold)
- Quantity
- Cost per unit
- Total cost
- Reference price per gram (manually updated or researched)
- Total value (calculated)
- Insurance value

**Features**:
- Display all holdings in a table/card view
- Sort by value, type, or potential return
- Show last update timestamp
- Historical snapshots (monthly for trends)
- Asset composition pie chart (% of total investments)
- Generate investment reports (allocation vs. goals)

**Automation**:
- Weekly/monthly price updates via:
  - Yahoo Finance API (ETFs)
  - CoinGecko API (Crypto) - free, no auth required
  - Manual input for gold prices
- Monthly snapshots stored for historical analysis
- Price alerts (if price changes >10% from last record)

**Data Sources**:
- User input (holdings, cost basis)
- Automated price feeds (API integrations)
- Monthly snapshots in database

---

### 4. Expense Tracking & Categorization

**Primary Goal**: Understand monthly spending patterns and categorize by purpose

**Expense Categories** (Predefined + Custom):
- **Income-Related**: Salary, Bonuses, Other income
- **Investing**: Monthly allocations to investments
- **Required/Fixed Expenses**:
  - Mortgage/rent payment
  - Car payments (if applicable)
  - Insurance (home, auto, life)
  - Property taxes
  - Utilities (electricity, water, gas, internet)
  - Groceries/food
  - Transport/gas
- **Discretionary**: Entertainment, dining out, shopping
- **Goals**: Specific allocations to named goals (travel fund, baby fund, etc.)
- **Other**: Miscellaneous

**Features**:
- Monthly expense breakdown by category
- Comparison to previous months/baseline
- Visual charts (pie chart for category breakdown)
- Identify spending trends (increasing/decreasing categories)
- Monthly totals and averages

**Data Sources**:
- Document parsing (Revolut statements initially)
- Manual categorization of imported transactions
- User input for non-tracked expenses

---

### 5. Document Parsing & Transaction Import

**Primary Goal**: Automate data entry by parsing bank statements and historical data

**Supported Documents** (MVP):

**a) Revolut Statements** (Ongoing)
- Parse transaction date, amount, currency, merchant, category
- Automatically categorize based on merchant/description
- Create expense records in system
- History of imported documents for reference

**b) Historical Financial Data** (One-time Import)
- **Purpose**: Establish baseline for net worth trends, goal progress, and historical analysis
- **Input Format**: CSV exports from user's existing financial tracking
  - Historical finances: Monthly snapshots of assets, goals, income, and expenses from 2015-present
  - Tax information: Historical annual tax data and calculations

**Historical Data Mapping**:
- Historical asset values (property, investments, crypto, gold) → Asset snapshots for trend visualization
- Historical monthly allocations → Allocation plan history
- Historical goal progress → Goal snapshots showing progress over years
- Tax information → Tax info records for annual tax planning
- Monthly income & expense patterns → Baseline for allocation calculations

**Future Support**:
- Other bank statements (CSV format)
- PDF statement parsing (with OCR)
- Direct API integrations (Revolut API when available)

**Features**:
- Drag-and-drop or file upload interface
- Preview parsed transactions before import
- Bulk categorization (mark multiple as "utilities", "groceries", etc.)
- Duplicate detection (prevent re-importing same statement)
- Document storage & date-stamped history
- Categorization suggestions (ML-based on merchant patterns)
- View imported transactions with metadata (import date, file name)
- **Historical data validation** (date range, format, completeness)
- **Data transformation** (Excel serial dates → proper dates, amount calculations)
- **Batch import** capability (import entire historical dataset at once)
- **Source tracking** (distinguish historical vs. real-time imported data)

**Process**:
1. User uploads CSV/PDF
2. Backend parses and validates file structure
3. Front-end shows preview of transactions/records to be imported
4. User reviews and confirms categorization
5. Data is transformed and inserted into database
6. Confirmation summary shows records created/updated
7. User can view imported transaction history anytime

---

### 6. Goals & Fund Planning

**Primary Goal**: Define financial milestones with deadlines and auto-calculate required savings

**Goal Types** (all use the same `Goal` model, differentiated by `recurringPeriod`):

1. **One-time Savings Goals** (`recurringPeriod: null`)
   - Discretionary: Travel fund, Baby fund, New car, Home renovation
   - Growth: Real estate down payment, Investment target
   - Life goals with long horizons (5–10 years ahead)
   - Supports any deadline, near or far

2. **Annual Recurring Goals** (`recurringPeriod: 'annual'`)
   - Yearly car insurance, Car registration, Annual tax payment
   - Save monthly toward the lump-sum; goal auto-resets for the next year after completion

3. **Monthly Recurring Goals** (`recurringPeriod: 'monthly'`)
   - Mortgage payment, Car loan, Utilities, Monthly taxes
   - Fixed amount reserved every month; no accumulation, no deadline
   - These behave like required expenses but are modeled as goals for a unified data model

**In the allocation tool**, goals are grouped visually by type:
- Monthly recurring goals shown first as "Fixed Monthly Costs"
- Annual goals shown as "Upcoming Lump-sum Obligations"
- One-time goals shown as "Savings Goals"

**Goal Data**:
- Goal name
- Target amount (currency)
- Target date (deadline)
- Current progress (calculated from monthly allocations)
- Monthly allocation required (auto-calculated)
- Category/type
- Priority (high, medium, low) - used in allocation algorithm
- Description/notes

**Features**:
- Create/edit/delete goals
- Visual progress bar toward target
- Countdown to deadline
- Auto-calculate required monthly allocation to reach goal by deadline
  - Formula: (Target Amount - Current Amount) / (Months until deadline)
- Highlight goals that won't be reached at current savings rate
- Move goal deadline if needed
- **Mark goal as completed** when target amount is reached
- **Archive inactive goals** to keep dashboard clean
- **Delete goals** if no longer relevant

**Goal Lifecycle**:
- Create goal with target amount, deadline, and priority
- System calculates required monthly allocation automatically
- Monitor progress through allocation plan
- Mark as "completed" when target is reached
- Archive or delete when no longer needed

---

### 7. Monthly Recurring Goals (formerly "Required Monthly Expenses")

**Primary Role**: Fixed monthly obligations — modeled as Goals with `recurringPeriod: 'monthly'` for a unified data model

**Examples**:
- Mortgage/rent: €1200/month
- Car loan payment: €300/month
- Monthly utility bills: €150/month
- Monthly taxes: €660/month

**How they work**:
- Set `targetAmount` = the monthly amount to reserve
- No deadline (`targetDate` is null)
- Always reserved first in the allocation algorithm before savings goals
- Displayed separately in the UI as "Fixed Monthly Costs"

**Operations**:
- **Create** monthly recurring goal (e.g., "Car Loan €300/month")
- **Update** amount when it changes (utility rate increases, etc.)
- **Delete** when obligation ends (paid off loan, moved house, etc.)

**Challenge**: If multiple goals + required expenses exceed income
- App displays "over-committed" warning
- Suggests which goals might not be reachable
- Allows user to adjust priorities or deadlines

---

### 8. Smart Allocation Tool

**Primary Goal**: Intelligently distribute monthly income across goals and required expenses

**Input Parameters**:
1. Monthly gross/net income
2. Tax allocations (if applicable)
3. List of all active goals (with deadlines)
4. List of required monthly expenses

**Calculation Engine**:
The app should:
1. Reserve amounts for required monthly expenses (car payment, insurance, etc.)
2. Calculate minimum monthly savings needed for each goal to hit deadline
3. If total required > income: flag and notify user (needs to adjust goals/timeline)
4. If total required < income: distribute surplus based on priority

**Allocation Output**:
- Monthly allocation plan showing:
  - Amount allocated to each goal
  - Amount allocated to each required expense
  - Amount left over (discretionary spending)
- Confidence indicator: "At current rate, Goal X will be completed by [date]"
- Warnings: "Goal X won't be reached by deadline unless you allocate more"

**Features**:
- Save multiple allocation plans (scenarios)
- Compare "what-if" scenarios (e.g., "if I save 20% more")
- Monthly snapshot/history (see how allocation has changed)
- Export allocation plan (PDF or CSV)

**User Workflow**:
1. Input monthly income
2. Review all current goals
3. App auto-calculates allocation
4. User reviews and accepts
5. Used as reference for monthly allocation of finances

---

### 9. Financial Reports & Visualizations

**Primary Goal**: Understand trends, progress, and overall financial health


**Reports Available**:

**A. Net Worth Trend**
- Line chart showing net worth over time (yearly/monthly)
- Breakdown by category (property, investments, crypto, gold)
- Trend analysis (increasing/decreasing)
- Projected net worth (based on current savings rate)

**B. Investment Composition**
- Pie chart: allocation across asset types (ETFs, crypto, gold)
- Table: each holding with value and % of portfolio
- Compare to target allocation (if user sets one)

**C. Asset History**
- Historical snapshots of each asset (price history)
- Show purchase price vs. current price (gain/loss)
- ROI calculations

**D. Income Allocation**
- Visual breakdown of monthly income distribution
- Pie chart: % to goals, required expenses, discretionary
- Historical trends (how allocation has changed)

**E. Goal Progress Report**
- Summary of all goals with progress %
- Completed vs. in-progress vs. at-risk goals
- Timeline visualization (Gantt-style)

**F. Expense Analysis**
- Monthly expenses by category
- Trend analysis (are utilities increasing?
- Budget vs. actual (if user sets monthly budgets)
- Year-to-date totals by category

**Features**:
- Export reports to PDF
- Print-friendly layouts
- Customize date ranges
- Schedule automated reports (monthly email summary)

---

### 10. Planned vs Actual Comparison (New Feature)


**Primary Goal**: Visualize how actual progress compares to the allocation plan, helping you stay on track or adjust course

**Feature Overview**:
This feature displays dual-line charts showing:
- **Planned Line**: What the allocation plan said should happen
- **Actual Line**: What actually happened in reality

This comparison helps answer key questions:
- "Am I allocating money to goals as planned?"
- "Is my goal on track to be completed by the deadline?"
- "Which categories am I overspending on?"

**Comparison Types**:

**A. Monthly Allocation Comparison**
- **Planned**: Monthly allocation amounts planned for each goal/category (from allocation plan)
- **Actual**: Monthly amounts actually allocated to each goal/category (calculated from expenses)
- **View**: Dual line chart over multiple months
- **Insight**: Detect if you're consistently under/over allocating

Example:
```
Month      Planned (Investing)    Actual (Investing)    Status
Jan 2025   €500                   €480                 On track
Feb 2025   €500                   €320                 Below plan
Mar 2025   €500                   €550                 Above plan
```

**B. Goal-by-Goal Progress Comparison**
- **Planned Progress**: How much should have been saved toward each goal by now (based on plan)
- **Actual Progress**: How much was actually saved toward the goal
- **View**: Dual line chart for each goal, showing accumulation over time
- **Insight**: Early warning if goal is falling behind schedule

Example (Travel Fund Goal):
```
Month      Planned Saved    Actual Saved    Status
Jan 2025   €300             €280            -€20
Feb 2025   €600             €550            -€50
Mar 2025   €900             €850            -€50
```

**C. Goal Deadline Comparison**
- **Target Date**: Original deadline set for the goal
- **Projected Date**: When goal will actually be completed if current savings rate continues
- **Visual**: Display as a "on-track" / "off-track" indicator
- **Calculation**: (Remaining amount) / (Current monthly savings rate) = Months to goal

Example:
```
Goal Name        Target Date    Projected Date    Days Difference    Status
Travel Fund      Dec 2025       Jan 2026          +30 days           ⚠️ At Risk
Baby Fund        Jun 2026       Jun 2026          On time            ✅ On Track
Emergency Fund   Sep 2025       Dec 2025          +90 days           ❌ Delayed
```

**D. Category-Based Expense Comparison**
- **Planned**: Planned monthly allocation to each expense category
- **Actual**: Actual monthly spending in each category
- **View**: Dual line chart for each category (or combined view)
- **Insight**: Detect which categories have consistent overspending

Example (Utilities Category):
```
Month      Planned      Actual       Variance
Jan 2025   €150        €165         +€15 (over)
Feb 2025   €150        €142         -€8 (under)
Mar 2025   €150        €171         +€21 (over)
```

**Planned vs Actual Pages**:

1. **Allocation Comparison Page** (`/reports/allocation-comparison`)
   - Dual line chart: Planned vs Actual allocations (all goals)
   - Monthly breakdown table
   - Summary stats (total variance, biggest variance)
   - Filter by goal/category

2. **Goal Progress Comparison Page** (`/reports/goal-comparison` or `/goals/tracking`)
   - Select a specific goal
   - Dual line chart showing planned vs actual accumulated savings
   - Highlight days ahead/behind schedule
   - Recommendation: "You need to save €X more per month to stay on track"

3. **Deadline Tracking Page** (`/reports/deadline-status`)
   - Table of all goals with target vs projected dates
   - Color coding: 🟢 On track, 🟡 At risk (within 2 weeks), 🔴 Delayed
   - Days to deadline countdown
   - Quick "what-if" calculator (if I increase savings by 10%, when will it be done?)

4. **Category Expense Comparison** (`/reports/category-comparison`)
   - Dropdown to select category
   - Dual line chart: planned vs actual spending
   - Variance summary
   - Insights card (top 3 overspent months)

**Data Tracking Requirements**:

To enable this feature, the system needs to:
1. Store the approved allocation plan each month
2. Calculate actual allocations from expenses post-facto
3. Track historical goal balances (snapshots)
4. Recalculate projected completion dates monthly

**Workflow for Users**:

1. **Create Allocation Plan** → Allocates €500 to travel fund monthly
2. **Upload Expenses** → Adds expenses tagged to travel fund
3. **Review Comparison** → "Good, I saved €480 to travel fund, only €20 short"
4. **See Trend** → "For 2 months, I've been €20 short. Need to increase savings"
5. **Adjust Plan** → Increases allocation to €550 to make up shortfall

**Visual Design**:
- **Dual Line Chart**:
  - Planned line = solid, primary color (e.g., blue)
  - Actual line = dashed, secondary color (e.g., green)
  - Tooltip on hover shows: Month, Planned, Actual, Variance (± €)
  - Variance color coding: green if ahead, red if behind, yellow if close

- **Summary Cards**:
  - Total Variance (sum of all months)
  - Best Month (most on-track)
  - Worst Month (most off-track)
  - Trend Indicator (improving/declining)

---

### 10. Authentication & Access Control

**Primary Goal**: Secure the app for personal use by 2 users

**Features**:
- Email + password registration/login (JWT-based)
- Account creation for user and spouse
- Separate login credentials
- Access to shared financial data (both users see same data)
- User settings (password change, profile, preferences)
- Session management (logout, timeout)
- Password recovery via email

**Security**:
- Passwords hashed with bcrypt
- JWTs expire after 7 days (refresh tokens for longer sessions)
- HTTPS required in production
- Database encryption for sensitive fields (if needed)
- Rate limiting on auth endpoints
- No password reset links (secure email only)

**Per-User Settings**:
- Display preferences (currency, date format)
- Notification preferences (goal alerts, price updates)
- Email digest frequency

---

## User Workflows

### Workflow 1: Monthly Income Allocation Planning

1. **Beginning of Month**:
   - User logs into app
   - Sees dashboard with upcoming month
   - Confirms monthly income amount
   - Reviews all active goals and required expenses

2. **System Processing**:
   - Backend calculates minimum allocations to reach all goal deadlines
   - Identifies any over-committed scenarios
   - Suggests allocation based on priorities

3. **User Reviews**:
   - Views proposed allocation plan
   - Sees breakdown: "€500 to travel fund, €300 to baby fund, €1500 to mortgage, etc."
   - Can view "what-if" scenarios (what if I save 20% more?)
   - Confirms allocation plan

4. **Monthly Reference**:
   - User/spouse use this as reference for spending decisions
   - "We allocated €500 to investments this month"

### Workflow 2: Upload Revolut Statement

1. **User uploads CSV** from Revolut export
2. **System parses transactions** (date, amount, merchant)
3. **Preview screen** shows transactions with suggested categories
4. **User reviews and adjusts** categorization as needed
5. **Import confirmed** - transactions added to expense tracking
6. **Dashboard updates** to show new monthly expenses
7. **Goal progress recalculates** (if allocations need adjustment)

### Workflow 3: Check Goal Progress

1. **User opens Goals page**
2. **Views all active goals** with progress bars and countdowns
3. **Sees allocation required** to hit deadline
4. **Drill down** on specific goal to see:
   - Total amount saved so far
   - Monthly allocation to goal
   - Projected completion date
   - "On track / At risk / Completed

 status
5. **Adjust goal** if needed (extend deadline, reduce target, increase priority)

### Workflow 4: Monthly Investment Price Update

1. **First day of month** - Automated job runs
2. **System fetches** latest prices for ETFs, crypto
3. **Snapshots created** for historical tracking
4. **Dashboard updates** with new asset values
5. **User gets notification** (optional) of significant price changes
6. **Reports regenerated** with updated net worth

### Workflow 5: Financial Health Checkup

1. **User views dashboard**
2. **Glances at net worth** summary
3. **Reviews asset composition** (pie chart)
4. **Checks goal progress** (quick status)
5. **Views monthly allocation** summary
6. **Considers adjustments** if goals appear at-risk

---

## Data Flow Diagrams

### Authentication Flow
```
User → Frontend (SSR) → Login Form
                      → Submit Credentials
                      → Backend /api/auth/login
                      → Validate email/password
                      → Return JWT token
                      → Store in localStorage/cookie
                      → Dashboard loads
```

### Data Entry & Updates
```
Multiple Sources → Backend Processing → Database → Frontend Display

Sources:
1. User-uploaded documents → Parse → Transactions → Database
2. Automated jobs → Fetch prices → Create snapshots → Database
3. User input → Create/update goals → Database
4. Dashboard input → Calculate allocation → Database

Frontend:
- Reads database values (display-only)
- No direct edits to database
- All changes go through backend APIs
```

### Monthly Automation Job
```
Time: 1st of month
Job: Fetch & Update Prices

1. Bull Queue triggers "monthly-update" job
2. For each ETF:
   - Query ticker from database
   - Fetch price from Yahoo Finance API
   - Create AssetSnapshot in DB
3. For each Crypto holding:
   - Query symbol from database
   - Fetch price from CoinGecko API
   - Create AssetSnapshot in DB
4. Calculate new net worth snapshots
5. Frontend displays updated values with timestamp
```

---

## Data Model Overview

### Key Entities

**User**
- id (UUID)
- email (unique)
- hashed_password
- name
- phone (optional)
- profile_picture_url (optional)
- created_at, updated_at
- role: "owner" | "spouse" (both have equal access)

**Asset** (Mortgage, ETF, Crypto, Gold)
- id
- user_id
- type: "mortgage" | "etf" | "crypto" | "gold"
- name (e.g., "Home Mortgage", "VTSAX", "Bitcoin", "Gold Coins")
- value (current value in €)
- quantity (for ETF, crypto, gold)
- cost_basis (average cost)
- currency
- metadata (ticker, symbol, purity, etc.)
- created_at, updated_at

**AssetSnapshot** (Historical tracking)
- id
- asset_id
- value (snapshot value)
- price (per unit, if applicable)
- captured_at (timestamp)

**Expense**
- id
- user_id
- amount
- category_id
- merchant/description
- date
- source: "manual" | "imported" (from document)
- created_at

**ExpenseCategory**
- id
- user_id
- name (e.g., "Utilities", "Groceries")
- type: "income" | "expense" | "goal" | "required"
- color (for visualization)
- predefined: boolean

**Goal**
- id
- user_id
- name (e.g., "Travel Fund 2025")
- target_amount
- target_date (deadline)
- current_amount (sum of allocations)
- priority: 1-3 (high, medium, low)
- status: "active" | "at_risk" | "completed" | "archived"
- created_at, updated_at

**AllocationPlan**
- id
- user_id
- month (YYYY-MM)
- monthly_income
- allocations[] (array of goal → amount)
- required_expenses[] (array of category → amount)
- surplus (remaining)
- status: "proposed" | "approved" | "archived"
- created_at

**ActualAllocation** (For Planned vs Actual Comparison)
- id
- allocation_plan_id (links to planned allocation)
- user_id
- goal_id or category_id (what it was allocated to)
- type: "goal" | "category"
- planned_amount (from allocation plan)
- actual_amount (calculated from expenses for this month)
- month (YYYY-MM)
- variance (actual - planned)
- created_at, updated_at

**GoalSnapshot** (Historical Goal Balance Tracking)
- id
- goal_id
- month (YYYY-MM)
- target_amount (goal's target at this time)
- target_date (goal's deadline at this time)
- balance_as_of (accumulated amount saved toward goal)
- allocated_this_month (amount allocated to goal this month)
- actual_saved_this_month (actual amount saved calculated from expenses)
- projected_completion_date (calculated based on current savings rate)
- on_track: boolean (target_date >= projected_date)
- created_at

**Document**
- id
- user_id
- file_name
- file_type: "csv" | "pdf"
- file_url (cloud storage path)
- upload_date
- parse_status: "pending" | "parsed" | "error"
- metadata: {
    bank: "revolut",
    period: "2025-01-01 to 2025-01-31",
    transaction_count: 42
  }
- created_at

**Transaction** (Parsed from documents)
- id
- document_id
- amount
- currency
- date
- merchant
- description
- category_id (auto-categorized)
- created_at

---

## Security & Privacy Requirements

### Authentication & Authorization
- JWT-based authentication (no third-party OAuth)
- Users can only access their own financial data
- Admin endpoint (backend-only) for manual data updates
- Secure password requirements (min 12 characters, mixed case, numbers, symbols)
- Account lockout after 5 failed login attempts (15 min cooldown)

### Data Protection
- All data stored in PostgreSQL, encrypted at rest (if cloud provider supports)
- Sensitive fields could be encrypted: password_hash, SSN (if ever needed)
- API calls validated (CORS, rate limiting)
- File uploads scanned for malicious content
- Document storage on cloud (S3, Google Cloud, etc.) with signed URLs

### Privacy
- No data sharing with third parties
- No personal data in logs (sanitized)
- Delete account option (removes all user data)
- Data export option (download all personal data)

### Compliance (Future Considerations)
- GDPR compliance (EU-based user)
- Data retention policies (auto-delete old documents after 2 years)
- Regular security audits

---

## Non-Functional Requirements

### Performance
- Dashboard loads in < 2 seconds
- API responses < 200ms (99th percentile)
- Charts render smoothly with 2+ years of data
- Mobile app responsive (< 250ms load times on LTE)

### Reliability
- 99.5% uptime target
- Automated daily backups of database
- Disaster recovery plan (restore from backup in < 1 hour)
- Scheduled maintenance windows (monthly, 2 hours max)

### Scalability
- Designed for future expansion (multi-account support if needed)
- Modular backend supports adding new asset types
- Codebase supports team development (monorepo with clear boundaries)

### Accessibility
- WCAG 2.1 AA compliance (readable fonts, color contrast, keyboard nav)
- Mobile-first responsive design
- Clear error messages and guidance

### PWA Features
- Installable on iOS and Android home screens
- Offline support (cached data available offline)
- Minimal bundle size (< 500KB for initial load)
- Works in low-bandwidth scenarios

---

## MVP Scope vs. Future Features

### MVP (v1.0)
- ✅ User authentication (email/password)
- ✅ Dashboard with net worth summary
- ✅ Asset tracking (mortgage, ETF, crypto, gold)
- ✅ Monthly price updates (automated jobs)
- ✅ Expense tracking and categorization
- ✅ Document parsing (Revolut CSV initially)
- ✅ Goal planning and allocation tool
- ✅ Planned vs Actual comparison (dual-line charts showing goal/category performance)
- ✅ Basic financial reports

### Phase 2 (v1.1)
- Account sharing settings (read-only vs. edit)
- Multi-currency support (auto conversion)
- Budget features (set monthly budgets by category)
- More document parsers (other banks)
- Email alerts and notifications
- Scheduled reports

### Phase 3 (v2.0)
- Bank API integrations (Revolut API, Plaid)
- Real-time transaction notifications
- Investment recommendations
- Tax reporting tools
- Multi-account support (separate financial profiles)
- Advanced analytics (spending trends, forecasts)

### Phase 4 & Beyond
- Mobile native app (iOS/Android)
- AI-powered financial advisor
- Integration with accounting software
- Tax optimization suggestions
- Collaborative planning (shared goals with wife)

---

## Success Criteria

### User Adoption
- Successfully log in and view dashboard: 100%
- Create at least 1 goal: 100% (within first week)
- Upload first document: 100% (within first month)
- Monthly usage rate: 80%+ (use app at least 2x per month)

### Data Accuracy
- Transaction parsing accuracy: 95%+
- Asset price updates accuracy: 99%+
- Allocation calculations: 100% (no errors)

### Business Value
- Reduction in time spent on financial planning: 50%+
- Increased visibility into financial goals: 100%
- Confidence in goal achievement: High (user survey)
- Number of goals set and tracked: Min. 3 per user

### Technical Metrics
- Page load time: < 2 seconds (mobile)
- API response time: < 200ms (95th percentile)
- Uptime: 99.5%+
- Error rate: < 0.1%
- User-reported bugs: < 1 per month

---

## Assumptions & Constraints

### Assumptions
- Users have PostgreSQL database available (cloud provider)
- Users have Redis available (for job queue)
- ETF prices available via public APIs (Yahoo Finance, Alpha Vantage)
- Crypto prices available via CoinGecko (free tier)
- Users can export Revolut statements as CSV
- Goals have fixed deadlines (not flexible)

### Constraints
- No real-time data entry (all updates from files/jobs)
- No mobile native app in MVP (PWA only)
- No collaborative features in MVP (view-only access for spouse)
- No integration with external banks initially (manual file upload)
- Single-currency tracking (€ for now, multi-currency later)

### Out of Scope (Clearly Defined)
- Tax filing integration (for now)
- Investment advisory or robo-advisor features
- Insurance product recommendations
- Loan refinancing suggestions
- Multi-user editing (shared editing of goals - future feature)
- Real-time portfolio tracking
- News/market alerts
- Mobile app store native apps

---

## Conclusion

This Finances PWA app is designed to be a personal financial command center - combining visibility with intelligent automation. By automating routine tasks (price updates, document parsing) and providing smart allocation planning, the app reduces the mental overhead of financial management while increasing confidence in goal achievement. The modular backend architecture ensures the app can grow with user needs, from simple tracking to advanced financial planning.

