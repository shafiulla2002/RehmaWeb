'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AdminNavigationShell } from '@/components/layout/AdminNavigationShell';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  subscribeChurchCollection,
  createChurchDocument,
  updateChurchDocument,
  deleteChurchDocument,
} from '@/lib/firebaseCrud';
import {
  INITIAL_ADMIN_EXPENSES,
  INITIAL_ADMIN_DONATIONS,
  INITIAL_ADMIN_FINANCE_KPI,
  AdminExpenseVoucher,
  ExpenseCategory,
  ExpenseStatus,
  AdminDonationLedgerRecord,
} from '@/lib/adminWave7cData';
import { GivingFund } from '@/app/giving/page';
import {
  DollarSign,
  Receipt,
  TrendingUp,
  TrendingDown,
  PieChart,
  Calendar,
  Search,
  Filter,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Download,
  Printer,
  X,
  Check,
  Ban,
  ArrowRight,
  ShieldCheck,
  Building,
  CreditCard,
  FileText,
  User,
  Layers,
  ChevronRight,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

const STORAGE_KEY_FINANCE = '@rhema_admin_m44_finance';

// =========================================================================
// M44 TYPES & MODELS
// =========================================================================

export type FinanceTab =
  | 'dashboard'
  | 'income'
  | 'expenses'
  | 'budgets'
  | 'donations'
  | 'reports'
  | 'receipts';

export type M44IncomePurpose =
  | 'Tithes & Firstfruits'
  | 'General Offering'
  | 'Missions & Community Outreach'
  | 'Church Building & Sanctuary Expansion'
  | 'Needy & Benevolence Fund'
  | 'Special Thanksgiving Gift';

export interface AdminIncomeRecord {
  id: string; // e.g. "INC-2026-01"
  receiptNumber: string; // e.g. "RCPT-2026-1042"
  demoTag: 'Simulated Income Record (Demo)';
  sourceTitle: string; // e.g. "Sunday Morning Divine Tithes"
  donorMasked: string; // e.g. "Brother Samuel J. (Demo)"
  purpose: M44IncomePurpose;
  paymentMode: 'Digital UPI / NetBanking (Simulated)' | 'Cash Offering Counter (Simulated)' | 'Bank Cheque (Simulated)';
  amountInr: number;
  receivedDate: string; // YYYY-MM-DD
  taxExemptionEligible: boolean;
  notes?: string;
}

export interface FinanceBudgetRecord {
  id: string; // e.g. "BUDGET-2026-AV"
  category: ExpenseCategory;
  monthlyAllocatedInr: number;
  fiscalYear: number;
  notes: string;
}

export interface FinanceReceiptViewModel {
  transactionId: string;
  referenceNo: string;
  type: 'Income' | 'Expense';
  entityNameMasked: string; // Donor or Payee
  categoryOrPurpose: string;
  amountInr: number;
  issueDate: string;
  authorizedSignatory: string;
  disclaimerNotice: string;
}

// 1:1 Explicit Mapping between M14 GivingFund and M44 Income Purpose
const M14_TO_M44_CATEGORY_MAP: Record<GivingFund, M44IncomePurpose> = {
  'Tithe (10%)': 'Tithes & Firstfruits',
  'General Offering': 'General Offering',
  'Missions & Outreach': 'Missions & Community Outreach',
  'Building & Sanctuary': 'Church Building & Sanctuary Expansion',
  'Needy & Compassion': 'Needy & Benevolence Fund',
  'Special Gift': 'Special Thanksgiving Gift',
};

const M44_TO_M14_CATEGORY_MAP: Record<M44IncomePurpose, GivingFund> = {
  'Tithes & Firstfruits': 'Tithe (10%)',
  'General Offering': 'General Offering',
  'Missions & Community Outreach': 'Missions & Outreach',
  'Church Building & Sanctuary Expansion': 'Building & Sanctuary',
  'Needy & Benevolence Fund': 'Needy & Compassion',
  'Special Thanksgiving Gift': 'Special Gift',
};

// =========================================================================
// BASELINE SYNTHETIC DEMONSTRATION DATASETS
// =========================================================================

// Canonical Baseline Financial Constants
const CANONICAL_BASELINE_FINANCE = {
  totalIncome: 412500, // ₹4,12,500 Total Recorded Income
  pendingExpenses: 47800, // ₹47,800 Pending Vouchers
  approvedExpenses: 84500, // ₹84,500 Approved Commitments
  disbursedExpenses: 32400, // ₹32,400 Disbursed Outflow
  totalRecordedExpensePipeline: 164700, // ₹1,64,700 (47800 + 84500 + 32400)
  actualNetReserve: 380100, // ₹3,80,100 (412500 - 32400)
  projectedReserve: 295600, // ₹2,95,600 (380100 - 84500)
};

// Canonical Baseline Income Records (Sum: ₹4,12,500)
const BASELINE_M44_INCOME: AdminIncomeRecord[] = [
  {
    id: 'INC-2026-01',
    receiptNumber: 'RCPT-2026-1042',
    demoTag: 'Simulated Income Record (Demo)',
    sourceTitle: 'Online Tithe Batch - Sunday Service',
    donorMasked: 'Brother Samuel J. (Demo)',
    purpose: 'Tithes & Firstfruits',
    paymentMode: 'Digital UPI / NetBanking (Simulated)',
    amountInr: 15000,
    receivedDate: '2026-11-15',
    taxExemptionEligible: true,
    notes: 'Transferred via simulated net banking gateway batch.',
  },
  {
    id: 'INC-2026-02',
    receiptNumber: 'RCPT-2026-1043',
    demoTag: 'Simulated Income Record (Demo)',
    sourceTitle: 'Sanctuary Expansion Special Pledge',
    donorMasked: 'Sister Priscilla R. (Demo)',
    purpose: 'Church Building & Sanctuary Expansion',
    paymentMode: 'Digital UPI / NetBanking (Simulated)',
    amountInr: 25000,
    receivedDate: '2026-11-15',
    taxExemptionEligible: true,
    notes: 'Designated building fund contribution.',
  },
  {
    id: 'INC-2026-03',
    receiptNumber: 'RCPT-2026-1044',
    demoTag: 'Simulated Income Record (Demo)',
    sourceTitle: 'Sunday Morning 1st & 2nd Service Collections',
    donorMasked: 'Sunday Morning Anonymous Cash (Demo)',
    purpose: 'General Offering',
    paymentMode: 'Cash Offering Counter (Simulated)',
    amountInr: 48920,
    receivedDate: '2026-11-15',
    taxExemptionEligible: false,
    notes: 'Audited and sealed by head ushers and accounts deacon.',
  },
  {
    id: 'INC-2026-04',
    receiptNumber: 'RCPT-2026-1045',
    demoTag: 'Simulated Income Record (Demo)',
    sourceTitle: 'Combined Mid-Month Digital Stewardship',
    donorMasked: 'Congregation Monthly Automated Tithes (Demo)',
    purpose: 'Tithes & Firstfruits',
    paymentMode: 'Digital UPI / NetBanking (Simulated)',
    amountInr: 253580,
    receivedDate: '2026-11-16',
    taxExemptionEligible: true,
    notes: 'Recurring monthly stewardship automated batch.',
  },
  {
    id: 'INC-2026-05',
    receiptNumber: 'RCPT-2026-1046',
    demoTag: 'Simulated Income Record (Demo)',
    sourceTitle: 'Winter Slum Outreach Designated Sponsorship',
    donorMasked: 'Elders Benevolence Fellowship (Demo)',
    purpose: 'Missions & Community Outreach',
    paymentMode: 'Digital UPI / NetBanking (Simulated)',
    amountInr: 45000,
    receivedDate: '2026-11-17',
    taxExemptionEligible: true,
    notes: 'Directed strictly towards food crate and grain supplies.',
  },
  {
    id: 'INC-2026-06',
    receiptNumber: 'RCPT-2026-1047',
    demoTag: 'Simulated Income Record (Demo)',
    sourceTitle: 'Thanksgiving Dedication Gift',
    donorMasked: 'Deacon Family Thanksgiving (Demo)',
    purpose: 'Special Thanksgiving Gift',
    paymentMode: 'Bank Cheque (Simulated)',
    amountInr: 25000,
    receivedDate: '2026-11-18',
    taxExemptionEligible: true,
    notes: 'Annual child dedication thanksgiving gift.',
  },
];

// Baseline Expense Vouchers (Reconciled: Pending: ₹47,800, Approved: ₹84,500, Disbursed: ₹32,400. Total = ₹1,64,700)
const BASELINE_M44_EXPENSES: AdminExpenseVoucher[] = [
  {
    id: 'EXP-2026-00101',
    invoiceRefNumber: 'INV-COG-8812',
    demoTag: 'Simulated Finance Voucher (Demo)',
    category: 'Audio/Visual & Media Production',
    vendorName: 'Bangalore Pro-Audio Systems Pvt Ltd (Demo)',
    description: 'Procurement of 2x Shure SLXD Wireless Vocal Microphones and replacement XLR audio snake cabling for Main Sanctuary stage.',
    amountInr: 84500,
    expenseDate: '2026-11-14',
    status: 'Approved for Payment (Sim)',
    submittedBy: 'Brother Luke (Media Director Demo)',
    approvedBy: 'Senior Pastor John Mark (Super Admin Demo)',
    receiptAttachmentName: 'Invoice_8812_BangaloreProAudio.pdf [Simulated]',
    notes: 'Budget cleared from Q4 2026 Media Equipment Allocation.',
  },
  {
    id: 'EXP-2026-00102',
    invoiceRefNumber: 'INV-BLR-4019',
    demoTag: 'Simulated Finance Voucher (Demo)',
    category: 'Sanctuary Lease & Utilities',
    vendorName: 'BESCOM Electric Supply (Demo)',
    description: 'Monthly electricity tariff and commercial transformer servicing for Central Sanctuary complex.',
    amountInr: 32400,
    expenseDate: '2026-11-10',
    status: 'Disbursed (Sim)',
    submittedBy: 'Brother Thomas (Admin Office Demo)',
    approvedBy: 'Senior Pastor John Mark (Super Admin Demo)',
    receiptAttachmentName: 'Receipt_BESCOM_Nov2026.pdf [Simulated]',
    notes: 'Disbursed via automated utility clearance.',
  },
  {
    id: 'EXP-2026-00103',
    invoiceRefNumber: 'INV-FOOD-1044',
    demoTag: 'Simulated Finance Voucher (Demo)',
    category: 'Missions & Community Food Drive',
    vendorName: 'Karnataka Grain Wholesale Wholesalers (Demo)',
    description: 'Purchase of 50x 25kg Rice Bags, cooking oil, and lentils for November Slum Community Outreach.',
    amountInr: 47800,
    expenseDate: '2026-11-18',
    status: 'Pending Approval (Sim)',
    submittedBy: 'Pastor Andrew (Outreach Pastor Demo)',
    receiptAttachmentName: 'GrainWholesale_Receipt_Nov18.pdf [Simulated]',
    notes: 'Awaiting Super Admin disbursement approval for outreach weekend.',
  },
];

// Departmental Budgets (Monthly Allocations)
const BASELINE_M44_BUDGETS: FinanceBudgetRecord[] = [
  {
    id: 'BUDGET-01',
    category: 'Audio/Visual & Media Production',
    monthlyAllocatedInr: 100000,
    fiscalYear: 2026,
    notes: 'Live streaming licenses, broadcast switcher maintenance, stage audio equipment.',
  },
  {
    id: 'BUDGET-02',
    category: 'Sanctuary Lease & Utilities',
    monthlyAllocatedInr: 50000,
    fiscalYear: 2026,
    notes: 'Sanctuary power, water utilities, generator diesel, municipal charges.',
  },
  {
    id: 'BUDGET-03',
    category: 'Missions & Community Food Drive',
    monthlyAllocatedInr: 60000,
    fiscalYear: 2026,
    notes: 'Community outreach supplies, medical camp support, monthly hunger relief.',
  },
  {
    id: 'BUDGET-04',
    category: 'Guest Speaker Honorariums',
    monthlyAllocatedInr: 30000,
    fiscalYear: 2026,
    notes: 'Guest minister travel reimbursement, hospitality accommodations, blessing love gifts.',
  },
  {
    id: 'BUDGET-05',
    category: 'Children & Youth Ministry Supplies',
    monthlyAllocatedInr: 25000,
    fiscalYear: 2026,
    notes: 'Sunday school craft kits, children snacks, youth fellowship retreat materials.',
  },
  {
    id: 'BUDGET-06',
    category: 'Office Administration',
    monthlyAllocatedInr: 20000,
    fiscalYear: 2026,
    notes: 'Printing paper, communion elements, stationery, church office software subscriptions.',
  },
];

export default function AdminFinanceSuitePage() {
  const [activeTab, setActiveTab] = useState<FinanceTab>('dashboard');
  const [incomeList, setIncomeList] = useState<AdminIncomeRecord[]>(BASELINE_M44_INCOME);
  const [expenseList, setExpenseList] = useState<AdminExpenseVoucher[]>(BASELINE_M44_EXPENSES);
  const [budgetList, setBudgetList] = useState<FinanceBudgetRecord[]>(BASELINE_M44_BUDGETS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Search & Filter States
  const [incomeSearch, setIncomeSearch] = useState('');
  const [incomePurposeFilter, setIncomePurposeFilter] = useState<string>('ALL');
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>('ALL');
  const [expenseStatusFilter, setExpenseStatusFilter] = useState<string>('ALL');

  // Modals
  const [isCreateIncomeModalOpen, setIsCreateIncomeModalOpen] = useState(false);
  const [isEditIncomeModalOpen, setIsEditIncomeModalOpen] = useState(false);
  const [editingIncomeTarget, setEditingIncomeTarget] = useState<AdminIncomeRecord | null>(null);
  const [deletingIncomeId, setDeletingIncomeId] = useState<string | null>(null);

  const [isCreateExpenseModalOpen, setIsCreateExpenseModalOpen] = useState(false);
  const [isEditExpenseModalOpen, setIsEditExpenseModalOpen] = useState(false);
  const [editingExpenseTarget, setEditingExpenseTarget] = useState<AdminExpenseVoucher | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);

  // Printable Receipt Modal State
  const [viewingReceipt, setViewingReceipt] = useState<FinanceReceiptViewModel | null>(null);

  // Form State for Income
  const [incomeFormData, setIncomeFormData] = useState({
    sourceTitle: '',
    donorMasked: 'Brother / Sister (Demo)',
    purpose: 'Tithes & Firstfruits' as M44IncomePurpose,
    paymentMode: 'Digital UPI / NetBanking (Simulated)' as AdminIncomeRecord['paymentMode'],
    amountInr: 10000,
    receivedDate: '2026-11-20',
    taxExemptionEligible: true,
    notes: '',
  });

  // Form State for Expense
  const [expenseFormData, setExpenseFormData] = useState({
    invoiceRefNumber: '',
    category: 'Audio/Visual & Media Production' as ExpenseCategory,
    vendorName: '',
    description: '',
    amountInr: 15000,
    expenseDate: '2026-11-20',
    status: 'Pending Approval (Sim)' as ExpenseStatus,
    submittedBy: 'Ministry Department Lead (Demo)',
    notes: '',
  });

  // Live Firestore Synchronization with Baseline Seeding
  useEffect(() => {
    let seededIncome = false;
    let seededExpenses = false;

    const unsubIncome = subscribeChurchCollection<any>('donations', async (items) => {
      if (items.length === 0 && !seededIncome) {
        seededIncome = true;
        for (const inc of BASELINE_M44_INCOME) {
          try {
            await createChurchDocument('donations', {
              ...inc,
              amount: inc.amountInr,
              category: inc.purpose,
              donorName: inc.donorMasked,
              paymentMethod: inc.paymentMode,
              receiptNo: inc.receiptNumber,
              date: inc.receivedDate,
            }, inc.id);
          } catch (e) {
            console.error('Seeding income error:', e);
          }
        }
      } else if (items.length > 0) {
        const mapped = items.map((d: any) => ({
          id: d.id,
          receiptNumber: d.receiptNumber || d.receiptNo || `RCPT-2026-${d.id.slice(-4)}`,
          sourceTitle: d.sourceTitle || d.title || `Stewardship Offering (${d.category || d.purpose || 'General'})`,
          donorMasked: d.donorMasked || d.donorName || 'Faithful Giver',
          purpose: d.purpose || d.category || 'General Offering',
          paymentMode: d.paymentMode || d.paymentMethod || 'Online Transfer',
          amountInr: Number(d.amountInr ?? d.amount ?? 0),
          receivedDate: d.receivedDate || d.date || (d.createdAt ? d.createdAt.split('T')[0] : '2026-11-20'),
          taxExemptionEligible: d.taxExemptionEligible ?? true,
          notes: d.notes || '',
        } as AdminIncomeRecord));
        setIncomeList(mapped);
      }
    });

    const unsubExpenses = subscribeChurchCollection<any>('expenses', async (items) => {
      if (items.length === 0 && !seededExpenses) {
        seededExpenses = true;
        for (const exp of BASELINE_M44_EXPENSES) {
          try {
            await createChurchDocument('expenses', {
              ...exp,
              amount: exp.amountInr,
              date: exp.expenseDate,
            }, exp.id);
          } catch (e) {
            console.error('Seeding expense error:', e);
          }
        }
      } else if (items.length > 0) {
        const mapped = items.map((e: any) => ({
          id: e.id,
          invoiceRefNumber: e.invoiceRefNumber || `INV-${e.id.slice(-6)}`,
          category: e.category || 'Audio/Visual & Media Production',
          vendorName: e.vendorName || e.vendor || 'Authorized Ministry Vendor',
          description: e.description || e.notes || 'Church operational disbursement',
          amountInr: Number(e.amountInr ?? e.amount ?? 0),
          expenseDate: e.expenseDate || e.date || '2026-11-20',
          status: e.status || 'Approved for Payment (Sim)',
          submittedBy: e.submittedBy || 'Ministry Lead',
          approvedBy: e.approvedBy,
          notes: e.notes || '',
        } as AdminExpenseVoucher));
        setExpenseList(mapped);
      }
    });

    return () => {
      unsubIncome();
      unsubExpenses();
    };
  }, []);

  const persistFinanceState = (
    newIncome: AdminIncomeRecord[],
    newExpenses: AdminExpenseVoucher[],
    newBudgets: FinanceBudgetRecord[]
  ) => {
    setIncomeList(newIncome);
    setExpenseList(newExpenses);
    setBudgetList(newBudgets);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleResetDemoData = async () => {
    for (const inc of BASELINE_M44_INCOME) {
      try {
        await createChurchDocument('donations', {
          ...inc,
          amount: inc.amountInr,
          category: inc.purpose,
          donorName: inc.donorMasked,
          paymentMethod: inc.paymentMode,
          receiptNo: inc.receiptNumber,
          date: inc.receivedDate,
        }, inc.id);
      } catch (e) {
        console.error(e);
      }
    }
    for (const exp of BASELINE_M44_EXPENSES) {
      try {
        await createChurchDocument('expenses', {
          ...exp,
          amount: exp.amountInr,
          date: exp.expenseDate,
        }, exp.id);
      } catch (e) {
        console.error(e);
      }
    }
    showToast('Reset Finance Suite records to canonical baseline in Firestore');
  };

  // =========================================================================
  // FINANCIAL CALCULATION ENGINE (EXACT MATHEMATICAL FORMULAS)
  // =========================================================================

  const kpis = useMemo(() => {
    // 1. Total Recorded Income
    const totalIncome = incomeList.reduce((acc, inc) => acc + (inc.amountInr || 0), 0);

    // 2. Breakdown of Expenses by Lifecycle Status
    const pendingExpenses = expenseList
      .filter((e) => e.status === 'Pending Approval (Sim)')
      .reduce((acc, e) => acc + (e.amountInr || 0), 0);

    const approvedExpenses = expenseList
      .filter((e) => e.status === 'Approved for Payment (Sim)')
      .reduce((acc, e) => acc + (e.amountInr || 0), 0);

    const disbursedExpenses = expenseList
      .filter((e) => e.status === 'Disbursed (Sim)')
      .reduce((acc, e) => acc + (e.amountInr || 0), 0);

    const rejectedExpenses = expenseList
      .filter((e) => e.status === 'Rejected (Sim)')
      .reduce((acc, e) => acc + (e.amountInr || 0), 0);

    // 3. Total Recorded Expense Pipeline: Pending + Approved + Disbursed
    const totalRecordedExpensePipeline = pendingExpenses + approvedExpenses + disbursedExpenses;

    // 4. Actual Net Reserve: Total Income - Disbursed Expenses (Pending & Approved are NOT deducted)
    const actualNetReserve = totalIncome - disbursedExpenses;

    // 5. Projected Reserve After Approved Commitments: Actual Net Reserve - Approved Expenses
    const projectedReserve = actualNetReserve - approvedExpenses;

    // Voucher counts
    const pendingCount = expenseList.filter((e) => e.status === 'Pending Approval (Sim)').length;
    const approvedCount = expenseList.filter((e) => e.status === 'Approved for Payment (Sim)').length;
    const disbursedCount = expenseList.filter((e) => e.status === 'Disbursed (Sim)').length;

    // Category breakdown
    const incomeByPurpose: Record<string, number> = {};
    for (const inc of incomeList) {
      incomeByPurpose[inc.purpose] = (incomeByPurpose[inc.purpose] || 0) + inc.amountInr;
    }

    const disbursedExpensesByCategory: Record<string, number> = {};
    for (const exp of expenseList.filter((e) => e.status === 'Disbursed (Sim)')) {
      disbursedExpensesByCategory[exp.category] =
        (disbursedExpensesByCategory[exp.category] || 0) + exp.amountInr;
    }

    return {
      totalIncome,
      pendingExpenses,
      approvedExpenses,
      disbursedExpenses,
      rejectedExpenses,
      totalRecordedExpensePipeline,
      actualNetReserve,
      projectedReserve,
      pendingCount,
      approvedCount,
      disbursedCount,
      incomeByPurpose,
      disbursedExpensesByCategory,
    };
  }, [incomeList, expenseList]);

  // Filtered Income
  const filteredIncome = useMemo(() => {
    return incomeList.filter((inc) => {
      const matchSearch =
        !incomeSearch ||
        inc.receiptNumber.toLowerCase().includes(incomeSearch.toLowerCase()) ||
        inc.sourceTitle.toLowerCase().includes(incomeSearch.toLowerCase()) ||
        inc.donorMasked.toLowerCase().includes(incomeSearch.toLowerCase()) ||
        inc.purpose.toLowerCase().includes(incomeSearch.toLowerCase());
      const matchPurpose = incomePurposeFilter === 'ALL' || inc.purpose === incomePurposeFilter;
      return matchSearch && matchPurpose;
    });
  }, [incomeList, incomeSearch, incomePurposeFilter]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenseList.filter((exp) => {
      const matchSearch =
        !expenseSearch ||
        exp.id.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        exp.invoiceRefNumber.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        exp.vendorName.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        exp.description.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        exp.category.toLowerCase().includes(expenseSearch.toLowerCase());
      const matchCat = expenseCategoryFilter === 'ALL' || exp.category === expenseCategoryFilter;
      const matchStatus = expenseStatusFilter === 'ALL' || exp.status === expenseStatusFilter;
      return matchSearch && matchCat && matchStatus;
    });
  }, [expenseList, expenseSearch, expenseCategoryFilter, expenseStatusFilter]);

  // =========================================================================
  // ACTIONS: INCOME CRUD
  // =========================================================================

  const handleOpenCreateIncome = () => {
    setIncomeFormData({
      sourceTitle: '',
      donorMasked: 'Congregant Anonymous (Demo)',
      purpose: 'Tithes & Firstfruits',
      paymentMode: 'Digital UPI / NetBanking (Simulated)',
      amountInr: 10000,
      receivedDate: new Date().toISOString().split('T')[0],
      taxExemptionEligible: true,
      notes: '',
    });
    setIsCreateIncomeModalOpen(true);
  };

  const handleSaveCreateIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incomeFormData.sourceTitle || incomeFormData.amountInr <= 0) {
      showToast('Please enter a valid title and positive contribution amount.');
      return;
    }
    const newId = `INC-2026-${Date.now().toString().slice(-4)}`;
    const newRecord: AdminIncomeRecord = {
      id: newId,
      receiptNumber: `RCPT-2026-${Date.now().toString().slice(-4)}`,
      demoTag: 'Simulated Income Record (Demo)',
      sourceTitle: incomeFormData.sourceTitle,
      donorMasked: incomeFormData.donorMasked || 'Faithful Giver',
      purpose: incomeFormData.purpose,
      paymentMode: incomeFormData.paymentMode,
      amountInr: Number(incomeFormData.amountInr),
      receivedDate: incomeFormData.receivedDate,
      taxExemptionEligible: incomeFormData.taxExemptionEligible,
      notes: incomeFormData.notes,
    };
    try {
      await createChurchDocument('donations', {
        ...newRecord,
        amount: newRecord.amountInr,
        category: newRecord.purpose,
        donorName: newRecord.donorMasked,
        paymentMethod: newRecord.paymentMode,
        receiptNo: newRecord.receiptNumber,
        date: newRecord.receivedDate,
      }, newId);
      setIsCreateIncomeModalOpen(false);
      showToast(`Recorded income receipt ${newRecord.receiptNumber} in Firestore`);
    } catch (err: any) {
      showToast('Error saving income: ' + (err.message || 'Unknown error'));
    }
  };

  const handleOpenEditIncome = (inc: AdminIncomeRecord) => {
    setEditingIncomeTarget(inc);
    setIncomeFormData({
      sourceTitle: inc.sourceTitle,
      donorMasked: inc.donorMasked,
      purpose: inc.purpose,
      paymentMode: inc.paymentMode,
      amountInr: inc.amountInr,
      receivedDate: inc.receivedDate,
      taxExemptionEligible: inc.taxExemptionEligible,
      notes: inc.notes || '',
    });
    setIsEditIncomeModalOpen(true);
  };

  const handleSaveEditIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIncomeTarget) return;
    try {
      await updateChurchDocument('donations', editingIncomeTarget.id, {
        sourceTitle: incomeFormData.sourceTitle,
        donorMasked: incomeFormData.donorMasked,
        donorName: incomeFormData.donorMasked,
        purpose: incomeFormData.purpose,
        category: incomeFormData.purpose,
        paymentMode: incomeFormData.paymentMode,
        paymentMethod: incomeFormData.paymentMode,
        amountInr: Number(incomeFormData.amountInr),
        amount: Number(incomeFormData.amountInr),
        receivedDate: incomeFormData.receivedDate,
        date: incomeFormData.receivedDate,
        taxExemptionEligible: incomeFormData.taxExemptionEligible,
        notes: incomeFormData.notes,
      });
      setIsEditIncomeModalOpen(false);
      setEditingIncomeTarget(null);
      showToast(`Updated income record ${editingIncomeTarget.receiptNumber}`);
    } catch (err: any) {
      showToast('Error updating income: ' + (err.message || 'Unknown error'));
    }
  };

  const handleConfirmDeleteIncome = async () => {
    if (!deletingIncomeId) return;
    try {
      await deleteChurchDocument('donations', deletingIncomeId);
      setDeletingIncomeId(null);
      showToast('Deleted income transaction from Firestore');
    } catch (err: any) {
      showToast('Error deleting income: ' + (err.message || 'Unknown error'));
    }
  };

  // =========================================================================
  // ACTIONS: EXPENSE CRUD & APPROVAL LIFECYCLE
  // =========================================================================

  const handleOpenCreateExpense = () => {
    setExpenseFormData({
      invoiceRefNumber: `INV-COG-${Math.floor(1000 + Math.random() * 9000)}`,
      category: 'Audio/Visual & Media Production',
      vendorName: '',
      description: '',
      amountInr: 12000,
      expenseDate: new Date().toISOString().split('T')[0],
      status: 'Pending Approval (Sim)',
      submittedBy: 'Ministry Department Lead',
      notes: '',
    });
    setIsCreateExpenseModalOpen(true);
  };

  const handleSaveCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseFormData.vendorName || !expenseFormData.description || expenseFormData.amountInr <= 0) {
      showToast('Vendor name, description, and positive amount are required.');
      return;
    }
    const newId = `EXP-2026-${Date.now().toString().slice(-5)}`;
    const newVoucher: AdminExpenseVoucher = {
      id: newId,
      invoiceRefNumber: expenseFormData.invoiceRefNumber,
      demoTag: 'Simulated Finance Voucher (Demo)',
      category: expenseFormData.category,
      vendorName: expenseFormData.vendorName,
      description: expenseFormData.description,
      amountInr: Number(expenseFormData.amountInr),
      expenseDate: expenseFormData.expenseDate,
      status: expenseFormData.status,
      submittedBy: expenseFormData.submittedBy,
      approvedBy:
        expenseFormData.status === 'Approved for Payment (Sim)' || expenseFormData.status === 'Disbursed (Sim)'
          ? 'Senior Pastor (Administrator)'
          : undefined,
      receiptAttachmentName: `Attachment_${expenseFormData.invoiceRefNumber}.pdf`,
      notes: expenseFormData.notes,
    };
    try {
      await createChurchDocument('expenses', {
        ...newVoucher,
        amount: newVoucher.amountInr,
        date: newVoucher.expenseDate,
      }, newId);
      setIsCreateExpenseModalOpen(false);
      showToast(`Submitted expense voucher ${newVoucher.id} to Firestore`);
    } catch (err: any) {
      showToast('Error saving expense: ' + (err.message || 'Unknown error'));
    }
  };

  const handleOpenEditExpense = (exp: AdminExpenseVoucher) => {
    setEditingExpenseTarget(exp);
    setExpenseFormData({
      invoiceRefNumber: exp.invoiceRefNumber,
      category: exp.category,
      vendorName: exp.vendorName,
      description: exp.description,
      amountInr: exp.amountInr,
      expenseDate: exp.expenseDate,
      status: exp.status,
      submittedBy: exp.submittedBy,
      notes: exp.notes || '',
    });
    setIsEditExpenseModalOpen(true);
  };

  const handleSaveEditExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpenseTarget) return;
    try {
      const updates = {
        invoiceRefNumber: expenseFormData.invoiceRefNumber,
        category: expenseFormData.category,
        vendorName: expenseFormData.vendorName,
        description: expenseFormData.description,
        amountInr: Number(expenseFormData.amountInr),
        amount: Number(expenseFormData.amountInr),
        expenseDate: expenseFormData.expenseDate,
        date: expenseFormData.expenseDate,
        status: expenseFormData.status,
        submittedBy: expenseFormData.submittedBy,
        approvedBy:
          expenseFormData.status === 'Approved for Payment (Sim)' || expenseFormData.status === 'Disbursed (Sim)'
            ? editingExpenseTarget.approvedBy || 'Senior Pastor (Administrator)'
            : undefined,
        notes: expenseFormData.notes,
      };
      await updateChurchDocument('expenses', editingExpenseTarget.id, updates);
      setIsEditExpenseModalOpen(false);
      setEditingExpenseTarget(null);
      showToast(`Updated expense voucher ${editingExpenseTarget.id}`);
    } catch (err: any) {
      showToast('Error updating expense: ' + (err.message || 'Unknown error'));
    }
  };

  const handleTransitionExpenseStatus = async (expId: string, nextStatus: ExpenseStatus) => {
    try {
      const updates = {
        status: nextStatus,
        approvedBy:
          nextStatus === 'Approved for Payment (Sim)' || nextStatus === 'Disbursed (Sim)'
            ? 'Senior Pastor (Administrator)'
            : undefined,
      };
      await updateChurchDocument('expenses', expId, updates);
      showToast(`Expense voucher transitioned to "${nextStatus}" in Firestore`);
    } catch (err: any) {
      showToast('Error updating status: ' + (err.message || 'Unknown error'));
    }
  };

  const handleConfirmDeleteExpense = async () => {
    if (!deletingExpenseId) return;
    try {
      await deleteChurchDocument('expenses', deletingExpenseId);
      setDeletingExpenseId(null);
      showToast('Deleted expense voucher from Firestore');
    } catch (err: any) {
      showToast('Error deleting expense: ' + (err.message || 'Unknown error'));
    }
  };

  // =========================================================================
  // ACTIONS: CSV EXPORT (SIMULATED CLIENT-SIDE GENERATION)
  // =========================================================================

  const handleExportFinancialAuditCsv = () => {
    const headerLines = [
      '# RHEMA CHRISTIAN MINISTRY - FINANCIAL AUDIT SUMMARY REPORT',
      '# OPERATIONAL MODE: LAYER A FRONTEND SIMULATION (DEMO ONLY)',
      `# EXPORT DATE: ${new Date().toISOString()}`,
      `# TOTAL RECORDED INCOME: INR ${kpis.totalIncome}`,
      `# TOTAL DISBURSED EXPENSES: INR ${kpis.disbursedExpenses}`,
      `# ACTUAL NET RESERVE: INR ${kpis.actualNetReserve}`,
      `# APPROVED COMMITMENTS: INR ${kpis.approvedExpenses}`,
      `# PROJECTED RESERVE: INR ${kpis.projectedReserve}`,
      `# PENDING APPROVALS: INR ${kpis.pendingExpenses}`,
      '# -------------------------------------------------------------',
      'TransactionType,Id,ReferenceNumber,Date,CategoryOrPurpose,EntityMasked,AmountINR,Status,TaxExempt',
    ];

    const incomeRows = incomeList.map(
      (i) =>
        `Income,${i.id},${i.receiptNumber},${i.receivedDate},"${i.purpose}","${i.donorMasked}",${i.amountInr},Reconciled,${i.taxExemptionEligible}`
    );

    const expenseRows = expenseList.map(
      (e) =>
        `Expense,${e.id},${e.invoiceRefNumber},${e.expenseDate},"${e.category}","${e.vendorName}",${e.amountInr},"${e.status}",N/A`
    );

    const fullCsvContent = [...headerLines, ...incomeRows, ...expenseRows].join('\n');
    const blob = new Blob([fullCsvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rhema_Financial_Audit_${new Date().toISOString().split('T')[0]}_Simulated.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded simulated financial audit CSV report');
  };

  // =========================================================================
  // ACTIONS: PRINTABLE DEMO RECEIPT INSPECTOR
  // =========================================================================

  const handleViewIncomeReceipt = (inc: AdminIncomeRecord) => {
    setViewingReceipt({
      transactionId: inc.id,
      referenceNo: inc.receiptNumber,
      type: 'Income',
      entityNameMasked: inc.donorMasked,
      categoryOrPurpose: inc.purpose,
      amountInr: inc.amountInr,
      issueDate: inc.receivedDate,
      authorizedSignatory: 'Senior Pastor John Mark (General Overseer)',
      disclaimerNotice:
        'DEMO RECEIPT — NOT AN OFFICIAL TAX OR BANK DOCUMENT. THIS CERTIFICATE IS A SIMULATED RECORD FOR INTERNAL CHURCH WORKFLOW TRAINING ONLY.',
    });
  };

  const handleViewExpenseVoucher = (exp: AdminExpenseVoucher) => {
    setViewingReceipt({
      transactionId: exp.id,
      referenceNo: exp.invoiceRefNumber,
      type: 'Expense',
      entityNameMasked: exp.vendorName,
      categoryOrPurpose: exp.category,
      amountInr: exp.amountInr,
      issueDate: exp.expenseDate,
      authorizedSignatory: exp.approvedBy || 'Super Admin Board Authorization',
      disclaimerNotice:
        'DEMO DISBURSEMENT VOUCHER — NOT A COMMERCIAL TAX INVOICE. STRICTLY FOR INTERNAL FELLOWSHIP AUDITING SIMULATION.',
    });
  };

  return (
    <ProtectedRoute allowedRoles={['superadmin']}>
      <AdminNavigationShell>
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
          {/* TOAST NOTIFICATION */}
          {toastMessage && (
            <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-medium animate-in fade-in slide-in-from-bottom-3">
              <Sparkles size={18} className="shrink-0 text-amber-300" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* HEADER SECTION */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-red-950/80 border border-red-500/40 text-[10px] font-bold text-red-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck size={12} className="text-red-400" />
                  Super Admin Confidential
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-[10px] font-bold text-emerald-300">
                  Wave 7C · Phase 7 (M44)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-semibold text-amber-300">
                  Layer A Simulation
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                <Receipt className="text-emerald-400" size={28} />
                <span>Admin Finance Suite</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Executive church ledger, stewardship giving analytics, departmental expense vouchers, and simulated financial audits.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleExportFinancialAuditCsv}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
              >
                <Download size={14} className="text-emerald-400" />
                <span>Export Audit CSV</span>
              </button>
              <button
                type="button"
                onClick={handleResetDemoData}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
              >
                <RotateCcw size={14} className="text-amber-400" />
                <span>Reset Demo Data</span>
              </button>
            </div>
          </div>

          {/* PRIMARY EXECUTIVE KPI CARDS (EXACT MATHEMATICAL FORMULAS) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Recorded Income */}
            <div className="bg-[#0B192C]/90 border border-slate-800 rounded-2xl p-4 space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Recorded Income</span>
                <TrendingUp size={16} className="text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-white">
                ₹{kpis.totalIncome.toLocaleString('en-IN')}
              </div>
              <p className="text-[10px] text-slate-400">
                All reconciled tithes, pledges &amp; offerings ({incomeList.length} receipts)
              </p>
            </div>

            {/* Card 2: Actual Disbursed Expenses */}
            <div className="bg-[#0B192C]/90 border border-slate-800 rounded-2xl p-4 space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Disbursed Expenses</span>
                <TrendingDown size={16} className="text-rose-400" />
              </div>
              <div className="text-2xl font-black text-white">
                ₹{kpis.disbursedExpenses.toLocaleString('en-IN')}
              </div>
              <p className="text-[10px] text-rose-300/80">
                Completed cash outflows ({kpis.disbursedCount} vouchers disbursed)
              </p>
            </div>

            {/* Card 3: Actual Net Reserve Balance */}
            <div className="bg-[#0B192C]/90 border border-emerald-500/30 rounded-2xl p-4 space-y-1 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between text-emerald-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Actual Net Reserve</span>
                <ShieldCheck size={16} className="text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-300">
                ₹{kpis.actualNetReserve.toLocaleString('en-IN')}
              </div>
              <p className="text-[10px] text-emerald-400/90 font-medium">
                Income (₹{kpis.totalIncome.toLocaleString('en-IN')}) − Disbursed (₹{kpis.disbursedExpenses.toLocaleString('en-IN')})
              </p>
            </div>

            {/* Card 4: Projected Reserve After Approved Commitments */}
            <div className="bg-[#0B192C]/90 border border-amber-500/30 rounded-2xl p-4 space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-amber-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Projected Reserve</span>
                <Clock size={16} className="text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-300">
                ₹{kpis.projectedReserve.toLocaleString('en-IN')}
              </div>
              <p className="text-[10px] text-amber-400/90">
                After Approved Commitments (₹{kpis.approvedExpenses.toLocaleString('en-IN')} pending payout)
              </p>
            </div>
          </div>

          {/* SECONDARY PIPELINE BANNER */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Layers size={15} className="text-amber-400" />
              <span className="font-semibold text-slate-300">
                Expense Pipeline Breakdown:
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px]">
                Pending Approval: ₹{kpis.pendingExpenses.toLocaleString('en-IN')} ({kpis.pendingCount})
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/30 text-amber-300 font-mono text-[11px]">
                Approved for Payment: ₹{kpis.approvedExpenses.toLocaleString('en-IN')} ({kpis.approvedCount})
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-mono text-[11px]">
                Disbursed: ₹{kpis.disbursedExpenses.toLocaleString('en-IN')} ({kpis.disbursedCount})
              </span>
            </div>
            <div className="font-mono text-slate-400 text-[11px]">
              Total Recorded Expense Pipeline: <strong className="text-white">₹{kpis.totalRecordedExpensePipeline.toLocaleString('en-IN')}</strong>
            </div>
          </div>

          {/* TAB NAVIGATION (ALL 7 APPROVED FUNCTIONAL AREAS) */}
          <div className="border-b border-slate-800 flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: PieChart },
              { id: 'income', label: 'Income Management', icon: TrendingUp },
              { id: 'expenses', label: 'Expenses & Vouchers', icon: TrendingDown },
              { id: 'budgets', label: 'Budget Allocations', icon: Layers },
              { id: 'donations', label: 'Donations Overview', icon: DollarSign },
              { id: 'reports', label: 'Financial Reports', icon: FileText },
              { id: 'receipts', label: 'Demo Receipts & Studio', icon: Printer },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as FinanceTab)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-xl text-xs font-semibold whitespace-nowrap transition-all border-b-2 ${
                    isActive
                      ? 'border-emerald-400 text-white bg-slate-900/80 shadow-sm'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-emerald-400' : 'text-slate-400'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* ================================================================= */}
          {/* TAB 1: FINANCE DASHBOARD                                          */}
          {/* ================================================================= */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Trends & Monthly Performance */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 6-Month Visualizer Card */}
                <div className="lg:col-span-2 bg-[#0B192C]/80 border border-slate-800 rounded-3xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <TrendingUp size={16} className="text-emerald-400" />
                        <span>Monthly Income vs. Disbursed Outflow Trends</span>
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Historical stewardship vs. actual disbursed expenses (Jun–Nov 2026)
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-[10px] font-bold text-emerald-300">
                      Simulated 6-Month Trajectory
                    </span>
                  </div>

                  {/* SVG Chart */}
                  <div className="h-52 w-full pt-4">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 500 180">
                      {/* Grid lines */}
                      <line x1="40" y1="20" x2="480" y2="20" stroke="#1e293b" strokeDasharray="3 3" />
                      <line x1="40" y1="60" x2="480" y2="60" stroke="#1e293b" strokeDasharray="3 3" />
                      <line x1="40" y1="100" x2="480" y2="100" stroke="#1e293b" strokeDasharray="3 3" />
                      <line x1="40" y1="140" x2="480" y2="140" stroke="#1e293b" strokeDasharray="3 3" />

                      {/* Labels */}
                      <text x="5" y="25" fill="#64748b" fontSize="10">₹5.0L</text>
                      <text x="5" y="65" fill="#64748b" fontSize="10">₹3.5L</text>
                      <text x="5" y="105" fill="#64748b" fontSize="10">₹2.0L</text>
                      <text x="5" y="145" fill="#64748b" fontSize="10">₹50K</text>

                      {/* Income Path (Green) */}
                      <path
                        d="M 60 110 L 140 95 L 220 85 L 300 70 L 380 60 L 460 45"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      {/* Expense Path (Rose) */}
                      <path
                        d="M 60 135 L 140 130 L 220 125 L 300 120 L 380 130 L 460 132"
                        fill="none"
                        stroke="#f43f5e"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />

                      {/* Data Dots Income */}
                      {[
                        { x: 60, y: 110, m: 'Jun' },
                        { x: 140, y: 95, m: 'Jul' },
                        { x: 220, y: 85, m: 'Aug' },
                        { x: 300, y: 70, m: 'Sep' },
                        { x: 380, y: 60, m: 'Oct' },
                        { x: 460, y: 45, m: 'Nov' },
                      ].map((p, idx) => (
                        <g key={idx}>
                          <circle cx={p.x} cy={p.y} r="4" fill="#10b981" />
                          <text x={p.x - 10} y="165" fill="#94a3b8" fontSize="10">{p.m}</text>
                        </g>
                      ))}

                      {/* Data Dots Expenses */}
                      {[
                        { x: 60, y: 135 },
                        { x: 140, y: 130 },
                        { x: 220, y: 125 },
                        { x: 300, y: 120 },
                        { x: 380, y: 130 },
                        { x: 460, y: 132 },
                      ].map((p, idx) => (
                        <circle key={idx} cx={p.x} cy={p.y} r="4" fill="#f43f5e" />
                      ))}
                    </svg>
                  </div>

                  <div className="flex items-center justify-center gap-6 pt-2 border-t border-slate-800/80 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                      <span>Total Recorded Income (Stewardship)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                      <span>Disbursed Operational Expenses</span>
                    </div>
                  </div>
                </div>

                {/* Category Breakdown Progress */}
                <div className="bg-[#0B192C]/80 border border-slate-800 rounded-3xl p-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <PieChart size={16} className="text-amber-400" />
                      <span>Income Allocation by Purpose</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Breakdown across canonical fund designations
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    {Object.entries(kpis.incomeByPurpose).map(([purpose, amt]) => {
                      const pct = ((amt / (kpis.totalIncome || 1)) * 100).toFixed(1);
                      return (
                        <div key={purpose} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300 font-medium truncate">{purpose}</span>
                            <span className="text-emerald-400 font-mono font-bold">
                              ₹{amt.toLocaleString('en-IN')} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Recent Ledger Transactions Feed */}
              <div className="bg-[#0B192C]/80 border border-slate-800 rounded-3xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Clock size={16} className="text-emerald-400" />
                      <span>Recent Financial Transactions</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Consolidated chronological feed of verified receipts &amp; approved vouchers
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('reports')}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  >
                    <span>View Full Statement</span>
                    <ArrowRight size={13} />
                  </button>
                </div>

                <div className="divide-y divide-slate-800/80">
                  {/* Latest 3 Incomes */}
                  {incomeList.slice(0, 3).map((inc) => (
                    <div key={inc.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                          <TrendingUp size={16} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">{inc.sourceTitle}</h4>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {inc.receiptNumber} · {inc.donorMasked} · {inc.receivedDate}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-emerald-400 font-mono block">
                          +₹{inc.amountInr.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-emerald-400/80 uppercase font-semibold">
                          Reconciled (Sim)
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Latest 2 Expenses */}
                  {expenseList.slice(0, 2).map((exp) => (
                    <div key={exp.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-rose-950/80 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                          <TrendingDown size={16} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">{exp.vendorName}</h4>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {exp.id} ({exp.invoiceRefNumber}) · {exp.category} · {exp.expenseDate}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-rose-400 font-mono block">
                          -₹{exp.amountInr.toLocaleString('en-IN')}
                        </span>
                        <span
                          className={`text-[10px] font-semibold uppercase ${
                            exp.status === 'Disbursed (Sim)'
                              ? 'text-rose-400'
                              : exp.status === 'Approved for Payment (Sim)'
                              ? 'text-amber-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {exp.status.replace(' (Sim)', '')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 2: INCOME MANAGEMENT                                          */}
          {/* ================================================================= */}
          {activeTab === 'income' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  <div className="relative min-w-[220px] flex-1 max-w-md">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                    <input
                      type="text"
                      placeholder="Search receipts, donors, or fund purpose..."
                      value={incomeSearch}
                      onChange={(e) => setIncomeSearch(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <select
                    value={incomePurposeFilter}
                    onChange={(e) => setIncomePurposeFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ALL">All Giving Purposes</option>
                    <option value="Tithes & Firstfruits">Tithes &amp; Firstfruits</option>
                    <option value="General Offering">General Offering</option>
                    <option value="Missions & Community Outreach">Missions &amp; Outreach</option>
                    <option value="Church Building & Sanctuary Expansion">Building &amp; Sanctuary</option>
                    <option value="Needy & Benevolence Fund">Needy &amp; Benevolence</option>
                    <option value="Special Thanksgiving Gift">Special Gift</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleOpenCreateIncome}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition-colors shadow-md shadow-emerald-950/40 shrink-0"
                >
                  <Plus size={15} />
                  <span>Record Income Receipt</span>
                </button>
              </div>

              {/* Income Table */}
              <div className="bg-[#0B192C]/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Receipt No</th>
                        <th className="py-3 px-4">Source Title &amp; Purpose</th>
                        <th className="py-3 px-4">Donor (Masked)</th>
                        <th className="py-3 px-4">Payment Channel</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4 text-right">Amount (INR)</th>
                        <th className="py-3 px-4 text-center">80G Tax Exemption</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {filteredIncome.map((inc) => (
                        <tr key={inc.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
                            {inc.receiptNumber}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-white block">{inc.sourceTitle}</span>
                            <span className="text-[10px] text-emerald-400 block">{inc.purpose}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                            {inc.donorMasked}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300">
                              {inc.paymentMode.replace(' (Simulated)', '')}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                            {inc.receivedDate}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-300 text-sm whitespace-nowrap">
                            ₹{inc.amountInr.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {inc.taxExemptionEligible ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-[10px] font-bold text-emerald-300">
                                80G Eligible
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400">
                                Standard
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleViewIncomeReceipt(inc)}
                                title="Print demo receipt"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                              >
                                <Printer size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditIncome(inc)}
                                title="Edit income record"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingIncomeId(inc.id)}
                                title="Delete income record"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-rose-300 transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 3: EXPENSE MANAGEMENT (4-STAGE LIFECYCLE)                     */}
          {/* ================================================================= */}
          {activeTab === 'expenses' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  <div className="relative min-w-[220px] flex-1 max-w-md">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                    <input
                      type="text"
                      placeholder="Search voucher ID, vendor, or invoice..."
                      value={expenseSearch}
                      onChange={(e) => setExpenseSearch(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <select
                    value={expenseCategoryFilter}
                    onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ALL">All Expense Categories</option>
                    <option value="Audio/Visual & Media Production">Audio/Visual &amp; Media Production</option>
                    <option value="Sanctuary Lease & Utilities">Sanctuary Lease &amp; Utilities</option>
                    <option value="Missions & Community Food Drive">Missions &amp; Community Food Drive</option>
                    <option value="Guest Speaker Honorariums">Guest Speaker Honorariums</option>
                    <option value="Children & Youth Ministry Supplies">Children &amp; Youth Ministry Supplies</option>
                    <option value="Office Administration">Office Administration</option>
                  </select>
                  <select
                    value={expenseStatusFilter}
                    onChange={(e) => setExpenseStatusFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ALL">All Voucher Statuses</option>
                    <option value="Pending Approval (Sim)">Pending Approval</option>
                    <option value="Approved for Payment (Sim)">Approved for Payment</option>
                    <option value="Disbursed (Sim)">Disbursed</option>
                    <option value="Rejected (Sim)">Rejected</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleOpenCreateExpense}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-2 transition-colors shadow-md shadow-rose-950/40 shrink-0"
                >
                  <Plus size={15} />
                  <span>Create Expense Voucher</span>
                </button>
              </div>

              {/* Expense Table */}
              <div className="bg-[#0B192C]/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Voucher ID</th>
                        <th className="py-3 px-4">Vendor &amp; Description</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Invoice Ref</th>
                        <th className="py-3 px-4 text-right">Amount (INR)</th>
                        <th className="py-3 px-4 text-center">Lifecycle Status</th>
                        <th className="py-3 px-4 text-right">Approval Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {filteredExpenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
                            {exp.id}
                          </td>
                          <td className="py-3 px-4 max-w-xs">
                            <span className="font-semibold text-white block truncate">{exp.vendorName}</span>
                            <span className="text-[10px] text-slate-400 block line-clamp-1">{exp.description}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px]">
                              {exp.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                            {exp.invoiceRefNumber}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-rose-300 text-sm whitespace-nowrap">
                            ₹{exp.amountInr.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {exp.status === 'Disbursed (Sim)' ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-bold text-emerald-300">
                                Disbursed
                              </span>
                            ) : exp.status === 'Approved for Payment (Sim)' ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-[10px] font-bold text-amber-300">
                                Approved
                              </span>
                            ) : exp.status === 'Rejected (Sim)' ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-rose-950/80 border border-rose-500/40 text-[10px] font-bold text-rose-300">
                                Rejected
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-300">
                                Pending Approval
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Quick 1-Click Super Admin Actions */}
                              {exp.status === 'Pending Approval (Sim)' && (
                                <button
                                  type="button"
                                  onClick={() => handleTransitionExpenseStatus(exp.id, 'Approved for Payment (Sim)')}
                                  title="Approve for payment"
                                  className="px-2 py-1 rounded bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 text-[10px] font-bold border border-amber-500/30 transition-colors"
                                >
                                  Approve
                                </button>
                              )}
                              {exp.status === 'Approved for Payment (Sim)' && (
                                <button
                                  type="button"
                                  onClick={() => handleTransitionExpenseStatus(exp.id, 'Disbursed (Sim)')}
                                  title="Mark as disbursed"
                                  className="px-2 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 transition-colors"
                                >
                                  Disburse
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleViewExpenseVoucher(exp)}
                                title="Print demo voucher"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                              >
                                <Printer size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditExpense(exp)}
                                title="Edit voucher"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingExpenseId(exp.id)}
                                title="Delete voucher"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-rose-300 transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 4: BUDGET MANAGEMENT                                          */}
          {/* ================================================================= */}
          {activeTab === 'budgets' && (
            <div className="space-y-6">
              <div className="bg-[#0B192C]/80 border border-slate-800 rounded-3xl p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers size={16} className="text-emerald-400" />
                    <span>Departmental Budget Allocations vs. Actual Disbursed Spending</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Monthly spending evaluated strictly against actual disbursed cash outflows
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                  {budgetList.map((b) => {
                    const disbursedSpend = kpis.disbursedExpensesByCategory[b.category] || 0;
                    const allocated = b.monthlyAllocatedInr;
                    const remaining = allocated - disbursedSpend;
                    const utilizedPct = Number(((disbursedSpend / (allocated || 1)) * 100).toFixed(1));
                    const isOverspent = disbursedSpend >= allocated;
                    const isNearCap = utilizedPct >= 80 && !isOverspent;

                    return (
                      <div
                        key={b.id}
                        className={`bg-slate-900/90 border rounded-2xl p-4 space-y-3 transition-all ${
                          isOverspent
                            ? 'border-rose-500/50 shadow-rose-950/20'
                            : isNearCap
                            ? 'border-amber-500/40 shadow-amber-950/20'
                            : 'border-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold uppercase text-slate-400 block font-mono">
                              {b.id}
                            </span>
                            <h4 className="text-xs font-bold text-white">{b.category}</h4>
                          </div>
                          {isOverspent ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-950 border border-rose-500/40 text-[9px] font-bold text-rose-300">
                              Overspent
                            </span>
                          ) : isNearCap ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-950 border border-amber-500/40 text-[9px] font-bold text-amber-300">
                              Near Cap
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-[9px] font-bold text-emerald-300">
                              Healthy
                            </span>
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Disbursed Spend:</span>
                            <span className="font-mono font-bold text-white">
                              ₹{disbursedSpend.toLocaleString('en-IN')} / ₹{allocated.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${
                                isOverspent ? 'bg-rose-500' : isNearCap ? 'bg-amber-400' : 'bg-emerald-400'
                              }`}
                              style={{ width: `${Math.min(utilizedPct, 100)}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                            <span>Utilized: {utilizedPct}%</span>
                            <span className={remaining < 0 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                              {remaining >= 0 ? `Remaining: ₹${remaining.toLocaleString('en-IN')}` : `Over by: ₹${Math.abs(remaining).toLocaleString('en-IN')}`}
                            </span>
                          </div>
                        </div>

                        <p className="text-[10px] text-slate-400 italic line-clamp-2 pt-1 border-t border-slate-800">
                          {b.notes}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 5: DONATIONS & GIVING OVERVIEW (M14 READ-ONLY ISOLATION)      */}
          {/* ================================================================= */}
          {activeTab === 'donations' && (
            <div className="space-y-6">
              <div className="bg-[#0B192C]/80 border border-slate-800 rounded-3xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <DollarSign size={16} className="text-emerald-400" />
                      <span>M14 Online Giving &amp; Stewardship Integration (Read-Only)</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Explicit 1:1 bidirectional category mapping between M14 GivingFund and M44 Admin Ledger
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-semibold text-emerald-300">
                    Zero Live Gateways · Pure Simulation
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                  {(
                    [
                      'Tithe (10%)',
                      'General Offering',
                      'Missions & Outreach',
                      'Building & Sanctuary',
                      'Needy & Compassion',
                      'Special Gift',
                    ] as GivingFund[]
                  ).map((m14Fund) => {
                    const m44Purpose = M14_TO_M44_CATEGORY_MAP[m14Fund];
                    const fundReceipts = incomeList.filter((i) => i.purpose === m44Purpose);
                    const totalFundInr = fundReceipts.reduce((acc, i) => acc + i.amountInr, 0);

                    return (
                      <div key={m14Fund} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                            M14: {m14Fund}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {fundReceipts.length} Batches
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white">M44: {m44Purpose}</h4>
                        <div className="text-lg font-black text-emerald-300 font-mono">
                          ₹{totalFundInr.toLocaleString('en-IN')}
                        </div>
                        <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                          Anonymous aggregate without storing donor banking credentials or private PII.
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 6: FINANCIAL REPORTS & AUDIT STATEMENTS                       */}
          {/* ================================================================= */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="bg-[#0B192C]/80 border border-slate-800 rounded-3xl p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <FileText size={18} className="text-emerald-400" />
                      <span>Executive Financial Audit Statement (Nov 2026)</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Standardized accounting statement generated from immutable simulated ledgers
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportFinancialAuditCsv}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition-colors self-start sm:self-auto"
                  >
                    <Download size={14} />
                    <span>Download CSV Audit File</span>
                  </button>
                </div>

                {/* Balance Summary Table */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    A. Liquidity &amp; Reserve Summary
                  </h4>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="p-3.5 flex items-center justify-between border-b border-slate-800/80 text-xs">
                      <span className="text-slate-300">1. Total Recorded Stewardship Inflow (Income)</span>
                      <span className="font-mono font-bold text-emerald-400">
                        +₹{kpis.totalIncome.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="p-3.5 flex items-center justify-between border-b border-slate-800/80 text-xs">
                      <span className="text-slate-300">2. Total Disbursed Operating Expenses (Outflow)</span>
                      <span className="font-mono font-bold text-rose-400">
                        -₹{kpis.disbursedExpenses.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="p-3.5 flex items-center justify-between bg-emerald-950/30 border-b border-slate-800/80 text-xs font-bold">
                      <span className="text-emerald-300">3. ACTUAL NET CASH RESERVE (1 − 2)</span>
                      <span className="font-mono text-emerald-300 text-sm">
                        ₹{kpis.actualNetReserve.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="p-3.5 flex items-center justify-between border-b border-slate-800/80 text-xs">
                      <span className="text-slate-400">4. Less: Approved Commitments Awaiting Payout</span>
                      <span className="font-mono text-amber-400">
                        -₹{kpis.approvedExpenses.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="p-3.5 flex items-center justify-between bg-amber-950/20 text-xs font-bold">
                      <span className="text-amber-300">5. PROJECTED LIQUIDITY AFTER APPROVED COMMITMENTS (3 − 4)</span>
                      <span className="font-mono text-amber-300 text-sm">
                        ₹{kpis.projectedReserve.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pipeline Commitments Table */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    B. Committed &amp; Pending Expense Pipeline (Non-Deducted)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Pending Vouchers</span>
                      <div className="text-lg font-black text-white font-mono">
                        ₹{kpis.pendingExpenses.toLocaleString('en-IN')}
                      </div>
                      <span className="text-[10px] text-slate-500">{kpis.pendingCount} vouchers awaiting Super Admin</span>
                    </div>
                    <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                      <span className="text-[10px] text-amber-400 uppercase font-bold block">Approved Vouchers</span>
                      <div className="text-lg font-black text-amber-300 font-mono">
                        ₹{kpis.approvedExpenses.toLocaleString('en-IN')}
                      </div>
                      <span className="text-[10px] text-slate-500">{kpis.approvedCount} vouchers cleared for cashier</span>
                    </div>
                    <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                      <span className="text-[10px] text-rose-400 uppercase font-bold block">Disbursed Vouchers</span>
                      <div className="text-lg font-black text-rose-300 font-mono">
                        ₹{kpis.disbursedExpenses.toLocaleString('en-IN')}
                      </div>
                      <span className="text-[10px] text-slate-500">{kpis.disbursedCount} vouchers finalized &amp; paid</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 7: DEMO RECEIPTS & INVOICES STUDIO                            */}
          {/* ================================================================= */}
          {activeTab === 'receipts' && (
            <div className="space-y-6">
              <div className="bg-[#0B192C]/80 border border-slate-800 rounded-3xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Printer size={16} className="text-emerald-400" />
                      <span>Simulated Receipts &amp; Vouchers Studio</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Inspect and print official church demonstration vouchers with legal disclaimers
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* Select an income receipt */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp size={14} />
                      <span>Stewardship Receipts (Income)</span>
                    </h4>
                    <div className="space-y-2">
                      {incomeList.slice(0, 3).map((i) => (
                        <div
                          key={i.id}
                          onClick={() => handleViewIncomeReceipt(i)}
                          className="cursor-pointer bg-slate-800/60 hover:bg-slate-800 p-2.5 rounded-xl border border-slate-700/60 flex items-center justify-between transition-colors"
                        >
                          <div>
                            <span className="text-xs font-bold text-white block">{i.receiptNumber}</span>
                            <span className="text-[10px] text-slate-400">{i.donorMasked} · {i.purpose}</span>
                          </div>
                          <span className="text-xs font-mono font-bold text-emerald-400">
                            ₹{i.amountInr.toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Select an expense voucher */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingDown size={14} />
                      <span>Disbursement Vouchers (Expenses)</span>
                    </h4>
                    <div className="space-y-2">
                      {expenseList.slice(0, 3).map((e) => (
                        <div
                          key={e.id}
                          onClick={() => handleViewExpenseVoucher(e)}
                          className="cursor-pointer bg-slate-800/60 hover:bg-slate-800 p-2.5 rounded-xl border border-slate-700/60 flex items-center justify-between transition-colors"
                        >
                          <div>
                            <span className="text-xs font-bold text-white block">{e.id} ({e.invoiceRefNumber})</span>
                            <span className="text-[10px] text-slate-400">{e.vendorName}</span>
                          </div>
                          <span className="text-xs font-mono font-bold text-rose-400">
                            ₹{e.amountInr.toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* MODALS                                                            */}
          {/* ================================================================= */}

          {/* 1. Create Income Modal */}
          {isCreateIncomeModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#0B192C] border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp className="text-emerald-400" size={16} />
                    <span>Record New Income Receipt</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsCreateIncomeModalOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleSaveCreateIncome} className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Source / Batch Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sunday Morning Divine Service Tithes"
                      value={incomeFormData.sourceTitle}
                      onChange={(e) => setIncomeFormData({ ...incomeFormData, sourceTitle: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Donor Name (Masked)</label>
                      <input
                        type="text"
                        value={incomeFormData.donorMasked}
                        onChange={(e) => setIncomeFormData({ ...incomeFormData, donorMasked: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Amount (INR) *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={incomeFormData.amountInr}
                        onChange={(e) => setIncomeFormData({ ...incomeFormData, amountInr: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Purpose / Fund</label>
                      <select
                        value={incomeFormData.purpose}
                        onChange={(e) =>
                          setIncomeFormData({ ...incomeFormData, purpose: e.target.value as M44IncomePurpose })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Tithes & Firstfruits">Tithes &amp; Firstfruits</option>
                        <option value="General Offering">General Offering</option>
                        <option value="Missions & Community Outreach">Missions &amp; Outreach</option>
                        <option value="Church Building & Sanctuary Expansion">Building &amp; Sanctuary</option>
                        <option value="Needy & Benevolence Fund">Needy &amp; Benevolence</option>
                        <option value="Special Thanksgiving Gift">Special Gift</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Payment Mode</label>
                      <select
                        value={incomeFormData.paymentMode}
                        onChange={(e) =>
                          setIncomeFormData({
                            ...incomeFormData,
                            paymentMode: e.target.value as AdminIncomeRecord['paymentMode'],
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Digital UPI / NetBanking (Simulated)">Digital UPI / NetBanking</option>
                        <option value="Cash Offering Counter (Simulated)">Cash Offering Counter</option>
                        <option value="Bank Cheque (Simulated)">Bank Cheque</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Date</label>
                      <input
                        type="date"
                        value={incomeFormData.receivedDate}
                        onChange={(e) => setIncomeFormData({ ...incomeFormData, receivedDate: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        id="taxCheck"
                        checked={incomeFormData.taxExemptionEligible}
                        onChange={(e) =>
                          setIncomeFormData({ ...incomeFormData, taxExemptionEligible: e.target.checked })
                        }
                        className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
                      />
                      <label htmlFor="taxCheck" className="text-slate-300 select-none">
                        80G Tax Exemption Eligible
                      </label>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCreateIncomeModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                    >
                      Save Receipt
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 2. Edit Income Modal */}
          {isEditIncomeModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#0B192C] border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Edit3 className="text-emerald-400" size={16} />
                    <span>Edit Income Receipt {editingIncomeTarget?.receiptNumber}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsEditIncomeModalOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleSaveEditIncome} className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Source / Batch Title *</label>
                    <input
                      type="text"
                      required
                      value={incomeFormData.sourceTitle}
                      onChange={(e) => setIncomeFormData({ ...incomeFormData, sourceTitle: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Donor Name (Masked)</label>
                      <input
                        type="text"
                        value={incomeFormData.donorMasked}
                        onChange={(e) => setIncomeFormData({ ...incomeFormData, donorMasked: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Amount (INR) *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={incomeFormData.amountInr}
                        onChange={(e) => setIncomeFormData({ ...incomeFormData, amountInr: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Purpose / Fund</label>
                      <select
                        value={incomeFormData.purpose}
                        onChange={(e) =>
                          setIncomeFormData({ ...incomeFormData, purpose: e.target.value as M44IncomePurpose })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Tithes & Firstfruits">Tithes &amp; Firstfruits</option>
                        <option value="General Offering">General Offering</option>
                        <option value="Missions & Community Outreach">Missions &amp; Outreach</option>
                        <option value="Church Building & Sanctuary Expansion">Building &amp; Sanctuary</option>
                        <option value="Needy & Benevolence Fund">Needy &amp; Benevolence</option>
                        <option value="Special Thanksgiving Gift">Special Gift</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Payment Mode</label>
                      <select
                        value={incomeFormData.paymentMode}
                        onChange={(e) =>
                          setIncomeFormData({
                            ...incomeFormData,
                            paymentMode: e.target.value as AdminIncomeRecord['paymentMode'],
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Digital UPI / NetBanking (Simulated)">Digital UPI / NetBanking</option>
                        <option value="Cash Offering Counter (Simulated)">Cash Offering Counter</option>
                        <option value="Bank Cheque (Simulated)">Bank Cheque</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditIncomeModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                    >
                      Update Receipt
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 3. Create Expense Modal */}
          {isCreateExpenseModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#0B192C] border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingDown className="text-rose-400" size={16} />
                    <span>Create Expense Voucher</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsCreateExpenseModalOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleSaveCreateExpense} className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Invoice / Ref Number *</label>
                      <input
                        type="text"
                        required
                        value={expenseFormData.invoiceRefNumber}
                        onChange={(e) => setExpenseFormData({ ...expenseFormData, invoiceRefNumber: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-rose-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Amount (INR) *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={expenseFormData.amountInr}
                        onChange={(e) => setExpenseFormData({ ...expenseFormData, amountInr: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Vendor / Payee Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Bangalore Pro-Audio Systems Pvt Ltd"
                      value={expenseFormData.vendorName}
                      onChange={(e) => setExpenseFormData({ ...expenseFormData, vendorName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Category</label>
                    <select
                      value={expenseFormData.category}
                      onChange={(e) =>
                        setExpenseFormData({ ...expenseFormData, category: e.target.value as ExpenseCategory })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                    >
                      <option value="Audio/Visual & Media Production">Audio/Visual &amp; Media Production</option>
                      <option value="Sanctuary Lease & Utilities">Sanctuary Lease &amp; Utilities</option>
                      <option value="Missions & Community Food Drive">Missions &amp; Community Food Drive</option>
                      <option value="Guest Speaker Honorariums">Guest Speaker Honorariums</option>
                      <option value="Children & Youth Ministry Supplies">Children &amp; Youth Ministry Supplies</option>
                      <option value="Office Administration">Office Administration</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Description / Justification *</label>
                    <textarea
                      required
                      rows={2}
                      placeholder="e.g. Replacement cables and microphones for Sunday worship..."
                      value={expenseFormData.description}
                      onChange={(e) => setExpenseFormData({ ...expenseFormData, description: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Date</label>
                      <input
                        type="date"
                        value={expenseFormData.expenseDate}
                        onChange={(e) => setExpenseFormData({ ...expenseFormData, expenseDate: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Approval Status</label>
                      <select
                        value={expenseFormData.status}
                        onChange={(e) =>
                          setExpenseFormData({ ...expenseFormData, status: e.target.value as ExpenseStatus })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                      >
                        <option value="Pending Approval (Sim)">Pending Approval</option>
                        <option value="Approved for Payment (Sim)">Approved for Payment</option>
                        <option value="Disbursed (Sim)">Disbursed</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCreateExpenseModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold"
                    >
                      Submit Voucher
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 4. Edit Expense Modal */}
          {isEditExpenseModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#0B192C] border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Edit3 className="text-rose-400" size={16} />
                    <span>Edit Expense Voucher {editingExpenseTarget?.id}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsEditExpenseModalOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleSaveEditExpense} className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Invoice / Ref Number</label>
                      <input
                        type="text"
                        value={expenseFormData.invoiceRefNumber}
                        onChange={(e) => setExpenseFormData({ ...expenseFormData, invoiceRefNumber: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-rose-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Amount (INR)</label>
                      <input
                        type="number"
                        min="1"
                        value={expenseFormData.amountInr}
                        onChange={(e) => setExpenseFormData({ ...expenseFormData, amountInr: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Vendor Name</label>
                    <input
                      type="text"
                      value={expenseFormData.vendorName}
                      onChange={(e) => setExpenseFormData({ ...expenseFormData, vendorName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Category</label>
                    <select
                      value={expenseFormData.category}
                      onChange={(e) =>
                        setExpenseFormData({ ...expenseFormData, category: e.target.value as ExpenseCategory })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                    >
                      <option value="Audio/Visual & Media Production">Audio/Visual &amp; Media Production</option>
                      <option value="Sanctuary Lease & Utilities">Sanctuary Lease &amp; Utilities</option>
                      <option value="Missions & Community Food Drive">Missions &amp; Community Food Drive</option>
                      <option value="Guest Speaker Honorariums">Guest Speaker Honorariums</option>
                      <option value="Children & Youth Ministry Supplies">Children &amp; Youth Ministry Supplies</option>
                      <option value="Office Administration">Office Administration</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Status</label>
                    <select
                      value={expenseFormData.status}
                      onChange={(e) =>
                        setExpenseFormData({ ...expenseFormData, status: e.target.value as ExpenseStatus })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                    >
                      <option value="Pending Approval (Sim)">Pending Approval</option>
                      <option value="Approved for Payment (Sim)">Approved for Payment</option>
                      <option value="Disbursed (Sim)">Disbursed</option>
                      <option value="Rejected (Sim)">Rejected</option>
                    </select>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditExpenseModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold"
                    >
                      Update Voucher
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 5. Printable Receipt / Voucher Inspector Modal */}
          {viewingReceipt && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white text-slate-900 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setViewingReceipt(null)}
                  className="absolute right-4 top-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  <X size={16} />
                </button>

                {/* Printable Letterhead Header */}
                <div className="text-center border-b border-slate-200 pb-3">
                  <span className="text-[10px] font-bold tracking-widest text-emerald-800 uppercase block">
                    Rhema Christian Fellowship · Accounts Bureau
                  </span>
                  <h3 className="font-serif font-extrabold text-lg text-slate-900">
                    {viewingReceipt.type === 'Income'
                      ? 'OFFICIAL STEWARDSHIP RECEIPT (DEMO)'
                      : 'INTERNAL DISBURSEMENT VOUCHER (DEMO)'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Ref: {viewingReceipt.referenceNo} ({viewingReceipt.transactionId})
                  </p>
                </div>

                {/* Receipt Body */}
                <div className="space-y-2.5 text-xs py-1">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Date Issued:</span>
                    <span className="font-semibold text-slate-800 font-mono">{viewingReceipt.issueDate}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">
                      {viewingReceipt.type === 'Income' ? 'Contributor (Masked):' : 'Payee / Vendor:'}
                    </span>
                    <span className="font-semibold text-slate-900">{viewingReceipt.entityNameMasked}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Designated Allocation:</span>
                    <span className="font-semibold text-slate-800">{viewingReceipt.categoryOrPurpose}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b-2 border-slate-900 bg-slate-50 px-2 rounded-lg">
                    <span className="font-bold text-slate-700">Total Cleared Amount:</span>
                    <span className="font-mono font-black text-base text-emerald-700">
                      ₹{viewingReceipt.amountInr.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 text-[11px]">
                    <span className="text-slate-500">Authorized Signatory:</span>
                    <span className="font-semibold text-slate-800 italic">{viewingReceipt.authorizedSignatory}</span>
                  </div>
                </div>

                {/* Legal Watermark Notice */}
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-[10px] text-red-800 leading-relaxed font-sans font-medium">
                  <strong>GOVERNANCE NOTICE:</strong> {viewingReceipt.disclaimerNotice}
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">
                    Rhema Core · Wave 7C Simulated Ledger
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Printer size={13} />
                      <span>Print Document</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewingReceipt(null)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 6. Confirm Delete Income Dialog */}
          {deletingIncomeId && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#0B192C] border border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Delete Income Record?</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    This will remove the transaction from the persistent demonstration ledger and reactively adjust actual reserve calculations.
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeletingIncomeId(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteIncome}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
                  >
                    Confirm Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 7. Confirm Delete Expense Dialog */}
          {deletingExpenseId && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#0B192C] border border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Delete Expense Voucher?</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    This will remove the voucher from the ledger and release any committed departmental budget allocations.
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeletingExpenseId(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteExpense}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
                  >
                    Confirm Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminNavigationShell>
    </ProtectedRoute>
  );
}
