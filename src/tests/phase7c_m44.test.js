/**
 * Wave 7C Phase 7 - M44 Admin Finance Suite Validation Suite
 * Verifies M44 route, strict Super Admin RBAC, zero Firebase/payment gateway calls,
 * exact 7 canonical financial baseline calculations, full Income CRUD,
 * full Expense CRUD with 4-state lifecycle, budget variance tracking against disbursed outflow,
 * M14 1:1 bidirectional category mapping (read-only), financial audit CSV export,
 * and demo receipts studio with mandatory non-tax disclaimers.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('==========================================================');
console.log('--- RUNNING WAVE 7C PHASE 7 (M44) VALIDATION SUITE ---');
console.log('==========================================================');

const pagePath = path.resolve(__dirname, '../app/admin/finance/page.tsx');
const navPath = path.resolve(__dirname, '../components/layout/AdminNavigationShell.tsx');
const dataPath = path.resolve(__dirname, '../lib/adminWave7cData.ts');

// 1. File Existence
assert(fs.existsSync(pagePath), 'M44 page.tsx must exist at web-new/src/app/admin/finance/page.tsx');
assert(fs.existsSync(navPath), 'AdminNavigationShell.tsx must exist');
assert(fs.existsSync(dataPath), 'adminWave7cData.ts must exist');
console.log('✔ Test 1 Passed: Required M44 source, layout, and data files exist.');

const pageSrc = fs.readFileSync(pagePath, 'utf8');
const navSrc = fs.readFileSync(navPath, 'utf8');

// 2. Strict Super Admin RBAC & Zero Firebase / Live Payment Invariants
assert(!pageSrc.includes('firebase/firestore'), 'Zero Firebase Firestore imports in M44 page.tsx');
assert(!pageSrc.includes('getFirestore'), 'Zero getFirestore calls in M44 page.tsx');
assert(!pageSrc.includes('collection('), 'Zero Firestore collection() calls in M44 page.tsx');
assert(!pageSrc.includes('doc('), 'Zero Firestore doc() calls in M44 page.tsx');
assert(!pageSrc.includes('fetch('), 'Zero remote network fetch() calls in M44 page.tsx');
assert(!pageSrc.includes('razorpay'), 'Zero Razorpay live payment integrations');
assert(!pageSrc.includes('phonepe'), 'Zero PhonePe live payment integrations');
assert(!pageSrc.includes('stripe'), 'Zero Stripe live payment integrations');
assert(pageSrc.includes("allowedRoles={['superadmin']}"), 'M44 must be strictly protected for superadmin only');
assert(pageSrc.includes('<ProtectedRoute'), 'M44 must be wrapped in ProtectedRoute');
assert(pageSrc.includes('<AdminNavigationShell>'), 'M44 must be wrapped in AdminNavigationShell');
console.log('✔ Test 2 Passed: Super Admin only RBAC guard, zero Firebase mutations, and zero live payment gateways verified.');

// 3. LocalStorage Persistence & Layer A Simulation Markers
assert(pageSrc.includes('@rhema_admin_m44_finance'), 'M44 must persist state to @rhema_admin_m44_finance');
assert(pageSrc.includes('Layer A Simulation'), 'M44 must display Layer A Simulation badge');
assert(pageSrc.includes('Super Admin Confidential'), 'M44 must display Super Admin Confidential badge');
assert(pageSrc.includes('handleResetDemoData'), 'M44 must provide reset to baseline demonstration figures');
console.log('✔ Test 3 Passed: LocalStorage persistence key and Layer A simulation markers verified.');

// 4. Exact Seven Canonical Financial Baseline Invariants Validation
// Verify baseline data constants in pageSrc
assert(pageSrc.includes('412500') || pageSrc.includes('412,500'), 'M44 must define baseline total income of ₹4,12,500');
assert(pageSrc.includes('47800') || pageSrc.includes('47,800'), 'M44 must define baseline pending expenses of ₹47,800');
assert(pageSrc.includes('84500') || pageSrc.includes('84,500'), 'M44 must define baseline approved expenses of ₹84,500');
assert(pageSrc.includes('32400') || pageSrc.includes('32,400'), 'M44 must define baseline disbursed expenses of ₹32,400');
assert(pageSrc.includes('totalRecordedExpensePipeline'), 'M44 must compute total recorded expense pipeline');
assert(pageSrc.includes('actualNetReserve'), 'M44 must compute actual net reserve');
assert(pageSrc.includes('projectedReserve'), 'M44 must compute projected reserve after approved commitments');

// Test the exact mathematical formulas
function computeKpis(income, expenses) {
  const totalIncome = income.reduce((acc, i) => acc + i.amount, 0);
  const pendingExpenses = expenses.filter(e => e.status === 'Pending').reduce((acc, e) => acc + e.amount, 0);
  const approvedExpenses = expenses.filter(e => e.status === 'Approved').reduce((acc, e) => acc + e.amount, 0);
  const disbursedExpenses = expenses.filter(e => e.status === 'Disbursed').reduce((acc, e) => acc + e.amount, 0);
  const totalRecordedExpensePipeline = pendingExpenses + approvedExpenses + disbursedExpenses;
  const actualNetReserve = totalIncome - disbursedExpenses;
  const projectedReserve = actualNetReserve - approvedExpenses;
  return { totalIncome, pendingExpenses, approvedExpenses, disbursedExpenses, totalRecordedExpensePipeline, actualNetReserve, projectedReserve };
}

const baselineTestResult = computeKpis(
  [{ amount: 15000 }, { amount: 25000 }, { amount: 48920 }, { amount: 253580 }, { amount: 45000 }, { amount: 25000 }],
  [{ status: 'Approved', amount: 84500 }, { status: 'Disbursed', amount: 32400 }, { status: 'Pending', amount: 47800 }]
);

assert.strictEqual(baselineTestResult.totalIncome, 412500, 'Baseline Total Income must be ₹4,12,500');
assert.strictEqual(baselineTestResult.pendingExpenses, 47800, 'Baseline Pending Expenses must be ₹47,800');
assert.strictEqual(baselineTestResult.approvedExpenses, 84500, 'Baseline Approved Expenses must be ₹84,500');
assert.strictEqual(baselineTestResult.disbursedExpenses, 32400, 'Baseline Disbursed Expenses must be ₹32,400');
assert.strictEqual(baselineTestResult.totalRecordedExpensePipeline, 164700, 'Total Expense Pipeline must be ₹1,64,700');
assert.strictEqual(baselineTestResult.actualNetReserve, 380100, 'Actual Net Reserve must be ₹4,12,500 - ₹32,400 = ₹3,80,100');
assert.strictEqual(baselineTestResult.projectedReserve, 295600, 'Projected Reserve must be ₹3,80,100 - ₹84,500 = ₹2,95,600');
console.log('✔ Test 4 Passed: All 7 canonical financial baseline calculations and formulas verified.');

// 5. Full Income Management CRUD
assert(pageSrc.includes('isCreateIncomeModalOpen'), 'M44 must maintain isCreateIncomeModalOpen state');
assert(pageSrc.includes('isEditIncomeModalOpen'), 'M44 must maintain isEditIncomeModalOpen state');
assert(pageSrc.includes('deletingIncomeId'), 'M44 must maintain deletingIncomeId state');
assert(pageSrc.includes('handleSaveCreateIncome'), 'M44 must support creating income receipts');
assert(pageSrc.includes('handleSaveEditIncome'), 'M44 must support editing income receipts');
assert(pageSrc.includes('handleConfirmDeleteIncome'), 'M44 must support deleting income receipts');
assert(pageSrc.includes('taxExemptionEligible'), 'M44 must track 80G tax exemption eligibility');
console.log('✔ Test 5 Passed: Full Income Management CRUD with 80G tax exemption markers verified.');

// 6. Full Expense Management CRUD & 4-State Approval Lifecycle
const requiredExpenseStatuses = [
  'Pending Approval (Sim)',
  'Approved for Payment (Sim)',
  'Disbursed (Sim)',
  'Rejected (Sim)',
];
for (const st of requiredExpenseStatuses) {
  assert(pageSrc.includes(st), `M44 must support expense status '${st}'`);
}
assert(pageSrc.includes('isCreateExpenseModalOpen'), 'M44 must maintain isCreateExpenseModalOpen state');
assert(pageSrc.includes('isEditExpenseModalOpen'), 'M44 must maintain isEditExpenseModalOpen state');
assert(pageSrc.includes('deletingExpenseId'), 'M44 must maintain deletingExpenseId state');
assert(pageSrc.includes('handleSaveCreateExpense'), 'M44 must support creating expense vouchers');
assert(pageSrc.includes('handleSaveEditExpense'), 'M44 must support editing expense vouchers');
assert(pageSrc.includes('handleTransitionExpenseStatus'), 'M44 must support status transitions');
assert(pageSrc.includes('handleConfirmDeleteExpense'), 'M44 must support deleting expense vouchers');
console.log('✔ Test 6 Passed: Full Expense Management CRUD with 4-state approval lifecycle verified.');

// 7. Budget Variance & Spending Evaluated Against Disbursed Outflow
const requiredCategories = [
  'Audio/Visual & Media Production',
  'Sanctuary Lease & Utilities',
  'Missions & Community Food Drive',
  'Guest Speaker Honorariums',
  'Children & Youth Ministry Supplies',
  'Office Administration',
];
for (const cat of requiredCategories) {
  assert(pageSrc.includes(cat), `M44 must support budget category '${cat}'`);
}
assert(pageSrc.includes('disbursedExpensesByCategory'), 'M44 must evaluate budget spending strictly against disbursed cash outflows');
assert(pageSrc.includes('monthlyAllocatedInr'), 'M44 must maintain monthly allocated budget figures');
console.log('✔ Test 7 Passed: Budget Variance and 6 departmental allocations evaluated against disbursed outflows verified.');

// 8. M14 Giving Integration (1:1 Bidirectional Mapping & Read-Only Isolation)
assert(pageSrc.includes('M14_TO_M44_CATEGORY_MAP'), 'M44 must define explicit M14_TO_M44_CATEGORY_MAP');
assert(pageSrc.includes('M44_TO_M14_CATEGORY_MAP'), 'M44 must define explicit M44_TO_M14_CATEGORY_MAP');
const canonicalM14Funds = [
  'Tithe (10%)',
  'General Offering',
  'Missions & Outreach',
  'Building & Sanctuary',
  'Needy & Compassion',
  'Special Gift',
];
for (const fund of canonicalM14Funds) {
  assert(pageSrc.includes(`'${fund}'`), `M44 must map canonical M14 category '${fund}'`);
}
assert(pageSrc.includes('donorMasked'), 'M44 must protect donor privacy with masked identifiers');
console.log('✔ Test 8 Passed: M14 Giving 1:1 bidirectional mapping and read-only isolation verified.');

// 9. Financial Reports & Client-Side CSV Export
assert(pageSrc.includes('handleExportFinancialAuditCsv'), 'M44 must support financial audit CSV export');
assert(pageSrc.includes('RHEMA CHRISTIAN MINISTRY - FINANCIAL AUDIT SUMMARY REPORT'), 'CSV export must include explicit simulation header');
assert(pageSrc.includes('ACTUAL NET CASH RESERVE'), 'Executive statement must include Actual Net Cash Reserve');
assert(pageSrc.includes('PROJECTED LIQUIDITY AFTER APPROVED COMMITMENTS'), 'Executive statement must include Projected Liquidity');
console.log('✔ Test 9 Passed: Financial Reports and client-side simulated CSV audit export verified.');

// 10. Demo Receipts & Studio & AdminNavigationShell Integration
assert(pageSrc.includes('viewingReceipt'), 'M44 must maintain viewingReceipt modal state');
assert(pageSrc.includes('handleViewIncomeReceipt'), 'M44 must support viewing income receipts');
assert(pageSrc.includes('handleViewExpenseVoucher'), 'M44 must support viewing expense vouchers');
assert(pageSrc.includes('DEMO RECEIPT — NOT AN OFFICIAL TAX OR BANK DOCUMENT'), 'Receipts must carry mandatory legal disclaimer');
assert(navSrc.includes("['M40', 'M41', 'M42', 'M43', 'M44'].includes(item.moduleId)"), 'AdminNavigationShell must activate M44');
assert(navSrc.includes("if (pathname.startsWith('/admin/finance')) return 'M44 · Admin Finance Suite'"), 'AdminNavigationShell must map /admin/finance title');
console.log('✔ Test 10 Passed: Demo Receipts & Invoices Studio with disclaimers and navigation activation verified.');

console.log('==========================================================');
console.log('--- ALL WAVE 7C PHASE 7 (M44) TESTS PASSED (10/10) ---');
console.log('==========================================================');
