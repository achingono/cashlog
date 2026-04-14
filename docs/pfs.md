## Product Requirements Document (PRD): Personal Financial Statement (PFS) Module

**Version:** 1.0  
**Status:** Draft  
**Target:** Developer / Engineering Team  

---

### 1. Executive Summary
The PFS module aims to transform raw, categorized financial data into a professional-grade report that mimics the output of a Certified Public Accountant (CPA). By aggregating assets, liabilities, and cash flow, the app will provide a holistic view of a user's financial health, utilizing an LLM to provide narrative context and strategic advice.

---

### 2. Functional Requirements

#### 2.1 Data Aggregation & Mapping
* **Balance Sheet Construction:** The system must pull the latest balances from linked accounts and map them to standard CPA categories (e.g., "Cash & Equivalents," "Marketable Securities").
* **Historical Comparison:** The system must store "snapshots" of net worth at the end of each month to generate "Statement of Changes" reports.

#### 2.2 The Interpretation Engine (LLM Integration)
The LLM will not just categorize; it will act as the "CPA Analyst."

* **Trend Analysis:** The LLM receives a JSON of the last 6 months of Net Worth and Cash Flow. It identifies anomalies (e.g., "Your discretionary spending increased by 15% despite a flat income").
* **Tax Sensitivity Analysis:** The LLM analyzes the ratio of taxable vs. tax-advantaged accounts and suggests shifts if the user's tax bracket is projected to change.
* **Solvency Benchmarking:** The LLM compares user ratios (DTI, Liquidity) against industry standards (e.g., "A liquidity ratio of 2.5 is below the recommended 3-6 months of expenses for your demographic").

#### 2.3 Automated Recommendations
* **Debt Snowball/Avalanche:** If liabilities are present, the LLM analyzes interest rates and balances to recommend a specific repayment priority.
* **Asset Rebalancing:** If one asset class (e.g., Tech Stocks) grows to represent >20% of the total portfolio, the LLM triggers a "Concentration Risk" warning.

---

### 3. Report Layout (The "CPA View")

The report should be exported as a clean, paginated PDF or a high-fidelity dashboard.

#### **Page 1: Executive Summary & Net Worth Snapshot**
* **Header:** User Name, Report Date, and Period Covered.
* **Net Worth Hero Number:** Large, bold font ($\text{Assets} - \text{Liabilities}$).
* **Visual Asset Allocation:** A sunburst or pie chart showing the breakdown of your wealth.


#### **Page 2: Statement of Financial Condition (Detailed)**
| Category | Current Value | % of Total |
| :--- | :--- | :--- |
| **ASSETS** | | |
| Cash & Equivalents | $24,500 | 8% |
| Brokerage Accounts | $145,000 | 48% |
| Retirement (401k/IRA) | $85,000 | 28% |
| Real Estate (Estimated) | $50,000 (Equity) | 16% |
| **TOTAL ASSETS** | **$304,500** | **100%** |
| | | |
| **LIABILITIES** | | |
| Credit Card Debt | $2,100 | <1% |
| Student Loans | $35,000 | 11% |
| **TOTAL LIABILITIES** | **$37,100** | |
| | | |
| **NET WORTH** | **$267,400** | |

#### **Page 3: CPA Narrative & Interpretation (LLM Generated)**
> **CPA Insight:** "Your net worth increased by 4.2% this quarter, primarily driven by market gains in your brokerage account. However, your liquidity ratio has dipped to 2.1. We recommend moving $5,000 from your low-yield checking to a High-Yield Savings Account (HYSA) to bolster your emergency fund while maintaining accessibility."

---

### 4. Technical Constraints & Security
* **Data Privacy:** All LLM prompts containing financial data must be anonymized (remove PII like account numbers or full names).
* **Calculation Accuracy:** The LLM **must not** perform the core math. Hard-coded logic/math engines (like Python's `pandas`) must calculate the sums and ratios; the LLM is provided the *results* of those calculations to interpret.

---

### 5. Success Metrics
* **User Engagement:** Users viewing the report at least once per month.
* **Accuracy:** Discrepancy between automated reports and user-provided manual adjustments < 2%.
* **Actionability:** 20% of users clicking a "Take Action" button based on an LLM recommendation.
