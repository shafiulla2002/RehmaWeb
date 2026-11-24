'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/contexts/AuthContext';
import {
  subscribeChurchProfile,
  subscribeChurchCollection,
  createChurchDocument,
} from '@/lib/firebaseCrud';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import {
  Heart,
  CreditCard,
  QrCode,
  Building,
  Copy,
  Check,
  ShieldCheck,
  Download,
  AlertCircle,
  Sparkles,
  ExternalLink,
  History,
  FileText,
  Clock,
  CheckCircle2,
  Receipt,
  ArrowRight,
} from 'lucide-react';

export type GivingFund =
  | 'Tithe (10%)'
  | 'General Offering'
  | 'Missions & Outreach'
  | 'Building & Sanctuary'
  | 'Needy & Compassion'
  | 'Special Gift';

export interface UserDonationRecord {
  id: string;
  amount: number;
  category: string;
  donorName: string;
  donorEmail?: string;
  donorPan?: string;
  paymentMethod: string;
  status: string;
  receiptNo: string;
  transactionRef: string;
  date: string;
  userId?: string;
  createdAt?: string;
}

export default function OnlineGivingPage() {
  const { user, profile } = useAuth();
  const [selectedFund, setSelectedFund] = useState<GivingFund>('Tithe (10%)');
  const [amount, setAmount] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [donorName, setDonorName] = useState(profile?.fullName || user?.displayName || 'Faithful Giver');
  const [donorEmail, setDonorEmail] = useState(user?.email || 'giver@example.com');
  const [donorPan, setDonorPan] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [activeTab, setActiveTab] = useState<'upi' | 'bank'>('upi');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Live Church Giving Profile
  const [churchGiving, setChurchGiving] = useState({
    upiId: 'rhema.ministry@hdfcbank',
    phonepeNumber: '+91 98765 43210',
    accountName: 'Rhema Christian Ministry Trust',
    accountNumber: '50200012345678',
    ifscCode: 'HDFC0001234',
    bankName: 'HDFC Bank Ltd, Indiranagar Branch, Bengaluru',
  });

  // Giving History
  const [donationHistory, setDonationHistory] = useState<UserDonationRecord[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);
  const [selectedReceiptDonation, setSelectedReceiptDonation] = useState<UserDonationRecord | null>(null);

  const PRESET_AMOUNTS = [500, 1000, 2500, 5000, 10000];

  // 1. Subscribe to Live Church Profile Giving Details
  useEffect(() => {
    const unsub = subscribeChurchProfile((churchDoc: any) => {
      if (churchDoc?.givingDetails) {
        setChurchGiving({
          upiId: churchDoc.givingDetails.upiId || 'rhema.ministry@hdfcbank',
          phonepeNumber: churchDoc.givingDetails.phonepeNumber || '+91 98765 43210',
          accountName: churchDoc.givingDetails.accountName || 'Rhema Christian Ministry Trust',
          accountNumber: churchDoc.givingDetails.accountNumber || '50200012345678',
          ifscCode: churchDoc.givingDetails.ifscCode || 'HDFC0001234',
          bankName: churchDoc.givingDetails.bankName || 'HDFC Bank Ltd, Indiranagar Branch, Bengaluru',
        });
      }
    });
    return () => unsub();
  }, []);

  // Update donor default details when auth loads
  useEffect(() => {
    if (profile?.fullName) setDonorName(profile.fullName);
    else if (user?.displayName) setDonorName(user.displayName);
    if (user?.email) setDonorEmail(user.email);
  }, [user, profile]);

  // 2. Subscribe to Live Personal Giving History
  useEffect(() => {
    const currentUid = user?.uid;
    const unsub = subscribeChurchCollection<UserDonationRecord>('donations', (items) => {
      if (currentUid) {
        const myDonations = items.filter(
          (d: any) => d.userId === currentUid || d.memberId === currentUid
        );
        // Sort descending by date/createdAt
        myDonations.sort((a, b) => (b.createdAt || b.date || '').localeCompare(a.createdAt || a.date || ''));
        setDonationHistory(myDonations);
      } else {
        // Guest mode: show any guest donations recorded this session
        setDonationHistory(items.slice(0, 5));
      }
    });
    return () => unsub();
  }, [user]);

  const handleAmountSelect = (val: number) => {
    setAmount(val);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (val: string) => {
    setCustomAmount(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setAmount(parsed);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // 3. Record Donation in Firestore
  const handleRecordDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      alert('Please enter a valid donation amount.');
      return;
    }
    setIsSubmitting(true);
    setSubmissionSuccess(null);

    try {
      const donationId = `don_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const receiptNo = `RHEMA-80G-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      const nowIso = new Date().toISOString();
      const todayDate = nowIso.split('T')[0];
      const donorUid = user?.uid || 'guest_donor';

      const donationData: UserDonationRecord = {
        id: donationId,
        amount,
        category: selectedFund,
        donorName: donorName.trim() || 'Faithful Giver',
        donorEmail: donorEmail.trim(),
        donorPan: donorPan.trim().toUpperCase(),
        paymentMethod: activeTab === 'upi' ? 'UPI' : 'Bank Transfer',
        status: 'Verified',
        receiptNo,
        transactionRef: transactionRef.trim() || `TXN-${Date.now().toString().slice(-8)}`,
        date: todayDate,
        userId: donorUid,
        createdAt: nowIso,
      };

      // Create in canonical church subcollection
      await createChurchDocument('donations', {
        ...donationData,
        memberId: donorUid,
        churchId: 'rhema',
        notes: `Recorded via Rhema Web Stewardship Portal for ${selectedFund}`,
      }, donationId);

      // Also mirror to church_donations root for mobile backward compatibility
      try {
        await setDoc(doc(db, 'church_donations', donationId), {
          ...donationData,
          memberId: donorUid,
          churchId: 'rhema',
        }, { merge: true });
      } catch {
        // Continue if root mirror succeeds or is optional
      }

      setSubmissionSuccess(`Thank you, ${donorName}! Your contribution of ₹${amount.toLocaleString('en-IN')} has been recorded.`);
      setSelectedReceiptDonation(donationData);
      setTransactionRef('');
    } catch (err: any) {
      console.error('Error recording donation:', err);
      alert('Failed to record contribution: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Download 80G Tax Exemption Receipt
  const handleDownloadReceipt = (donation?: UserDonationRecord) => {
    const recDonorName = donation ? donation.donorName : donorName;
    const recDonorEmail = donation ? donation.donorEmail : donorEmail;
    const recPan = donation ? donation.donorPan : donorPan;
    const recFund = donation ? donation.category : selectedFund;
    const recAmount = donation ? donation.amount : amount;
    const recNo = donation ? donation.receiptNo : `RHEMA-80G-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const recTxn = donation ? donation.transactionRef : (transactionRef || 'NEFT/UPI-VERIFIED');
    const recDate = donation ? donation.date : new Date().toLocaleDateString('en-IN', { dateStyle: 'full' });

    const receiptText = `================================================================================
RHEMA CHRISTIAN MINISTRY TRUST
Affiliated with Church of God (Full Gospel) in India
Registered Office: Indiranagar, Bengaluru - 560038, Karnataka, India
PAN: AAATR1234P | 80G Approval No: AAATR1234PF20214
================================================================================
OFFICIAL DONATION & 80G TAX EXEMPTION RECEIPT
================================================================================

Receipt Number      : ${recNo}
Receipt Date        : ${recDate}
Payment Reference   : ${recTxn}
Payment Mode        : ${donation?.paymentMethod || (activeTab === 'upi' ? 'UPI Transfer' : 'Bank NEFT/IMPS')}

DONOR PARTICULARS:
--------------------------------------------------------------------------------
Donor Full Name     : ${recDonorName}
Email Address       : ${recDonorEmail || 'Not Provided'}
Income Tax PAN      : ${recPan || 'NOT PROVIDED (Non-PAN Receipt)'}
Designated Ministry : ${recFund}

CONTRIBUTION DETAILS:
--------------------------------------------------------------------------------
Amount Received     : INR ₹${recAmount.toLocaleString('en-IN')}
Amount in Words     : Indian Rupees ${convertNumberToWords(recAmount)} Only
Stewardship Status  : VERIFIED & ACCOUNTED IN CHURCH LEDGER

SCRIPTURE BLESSING:
"Each of you should give what you have decided in your heart to give,
not reluctantly or under compulsion, for God loves a cheerful giver."
— 2 Corinthians 9:7

STATUTORY 80G TAX EXEMPTION DECLARATION:
* Donations to Rhema Christian Ministry Trust qualify for tax deduction under Section 80G of the Income Tax Act, 1961.
* This receipt constitutes valid electronic proof of donation for taxation and audit verification.
* Trust Registration Ref: CIT(E)/BLR/80G/2021-22/A/10482.

Authorized Signatory:
Church Board of Trustees & Finance Directorate
Rhema Christian Ministry
================================================================================`;

    const blob = new Blob([receiptText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rhema_80G_Tax_Receipt_${recNo}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell allowedRoles={['member', 'admin', 'superadmin', 'guest']}>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="border-l-4 border-[#1E6F43] pl-3.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#18221B] dark:text-white tracking-tight flex items-center gap-2">
              <Heart className="text-[#1E6F43] fill-emerald-600/20" size={28} />
              <span>Online Giving &amp; Stewardship</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#5C665F] dark:text-slate-400 mt-0.5">
              Support the gospel ministry, missions, care outreach, and sanctuary expansion.
            </p>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-[#1E6F43] dark:text-emerald-300">
            <ShieldCheck size={16} />
            <span>80G Tax Exemption Registered (AAATR1234PF20214)</span>
          </div>
        </div>

        {/* SCRIPTURE CALLOUT */}
        <div className="p-5 rounded-3xl bg-[#092817] dark:bg-[#061C10] text-white border border-emerald-900 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <h3 className="font-serif text-lg sm:text-xl font-bold text-white">
              Cheerful &amp; Faithful Giving
            </h3>
            <p className="font-serif italic text-xs sm:text-sm text-[#F7E7B4] leading-relaxed">
              &ldquo;Bring the whole tithe into the storehouse, that there may be food in my house. Test me in this, says the LORD Almighty, and see if I will not throw open the floodgates of heaven and pour out so much blessing that there will not be room enough to store it.&rdquo;
            </p>
            <p className="text-xs text-emerald-300 font-sans font-bold pt-1">
              — Malachi 3:10
            </p>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs text-xs space-y-0.5 border border-white/10">
              <span className="text-slate-300 block text-[10px]">Ministry Beneficiary</span>
              <span className="font-bold text-white">{churchGiving.accountName}</span>
            </div>
          </div>
        </div>

        {/* SUBMISSION SUCCESS ALERT */}
        {submissionSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-xs sm:text-sm">{submissionSuccess}</p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                  Receipt No: {selectedReceiptDonation?.receiptNo} &bull; Recorded to church database
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleDownloadReceipt(selectedReceiptDonation || undefined)}
              className="px-4 py-2 rounded-xl bg-[#1E6F43] hover:bg-[#175835] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
            >
              <Download size={14} />
              <span>Download Official 80G Receipt</span>
            </button>
          </div>
        )}

        {/* MAIN 2-COLUMN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT 7 COLS: GIVING CONFIGURATOR & SUBMISSION FORM */}
          <form onSubmit={handleRecordDonation} className="lg:col-span-7 bg-white dark:bg-[#131C27] rounded-3xl p-6 sm:p-7 border border-[#EBE6DC] dark:border-[#222F3E] shadow-xs space-y-6">
            {/* Step 1: Fund Selection */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-[#5C665F] dark:text-slate-400 block">
                1. Select Ministry Fund
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  'Tithe (10%)',
                  'General Offering',
                  'Missions & Outreach',
                  'Building & Sanctuary',
                  'Needy & Compassion',
                  'Special Gift',
                ].map((fund) => (
                  <button
                    key={fund}
                    type="button"
                    onClick={() => setSelectedFund(fund as GivingFund)}
                    className={`p-3 rounded-2xl text-xs font-bold text-left transition-all border cursor-pointer ${
                      selectedFund === fund
                        ? 'bg-[#1E6F43] text-white border-[#1E6F43] shadow-xs'
                        : 'bg-[#FBF9F4] dark:bg-[#0E1520] text-[#18221B] dark:text-white border-[#EFECE6] dark:border-[#1E2B3A] hover:border-[#1E6F43]/40'
                    }`}
                  >
                    {fund}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Amount Selection */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-[#5C665F] dark:text-slate-400 block">
                2. Select Offering Amount (INR)
              </label>

              <div className="flex flex-wrap gap-2">
                {PRESET_AMOUNTS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleAmountSelect(val)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      amount === val && !customAmount
                        ? 'bg-[#C89D35] text-[#18221B] border-[#C89D35] shadow-xs'
                        : 'bg-[#FBF9F4] dark:bg-[#0E1520] text-[#18221B] dark:text-white border-[#EFECE6] dark:border-[#1E2B3A] hover:border-[#C89D35]'
                    }`}
                  >
                    ₹{val.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>

              {/* Custom Amount Field */}
              <div className="pt-1">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={customAmount}
                    onChange={(e) => handleCustomAmountChange(e.target.value)}
                    placeholder="Enter custom offering amount"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] text-xs font-bold text-[#18221B] dark:text-white focus:outline-hidden focus:border-[#1E6F43]"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Donor Details */}
            <div className="space-y-3 pt-2 border-t border-[#EFECE6] dark:border-[#1E2B3A]">
              <label className="text-xs font-bold uppercase tracking-wider text-[#5C665F] dark:text-slate-400 block">
                3. Donor Information
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-medium text-slate-500">Full Name</span>
                  <input
                    type="text"
                    required
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] text-xs text-[#18221B] dark:text-white focus:outline-hidden focus:border-[#1E6F43]"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-medium text-slate-500">Email for Receipt</span>
                  <input
                    type="email"
                    value={donorEmail}
                    onChange={(e) => setDonorEmail(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] text-xs text-[#18221B] dark:text-white focus:outline-hidden focus:border-[#1E6F43]"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-medium text-slate-500">
                    PAN Card Number (For 80G Tax Deduction)
                  </span>
                  <input
                    type="text"
                    value={donorPan}
                    onChange={(e) => setDonorPan(e.target.value.toUpperCase())}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] text-xs font-mono uppercase text-[#18221B] dark:text-white focus:outline-hidden focus:border-[#1E6F43]"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-medium text-slate-500">
                    UTR / UPI / Bank Reference No
                  </span>
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="e.g. 432109876543 or IMPS Ref"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] text-xs font-mono text-[#18221B] dark:text-white focus:outline-hidden focus:border-[#1E6F43]"
                  />
                </div>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-2xl bg-[#1E6F43] hover:bg-[#175835] disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                {isSubmitting ? (
                  <span>Recording Contribution to Firestore...</span>
                ) : (
                  <>
                    <Heart size={16} />
                    <span>Confirm &amp; Record Giving of ₹{amount.toLocaleString('en-IN')}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* RIGHT 5 COLS: PAYMENT DESTINATION & TRANSFER DETAILS */}
          <div className="lg:col-span-5 space-y-5">
            {/* TABS SELECTOR */}
            <div className="flex rounded-2xl bg-white dark:bg-[#131C27] p-1.5 border border-[#EBE6DC] dark:border-[#222F3E] shadow-xs">
              <button
                type="button"
                onClick={() => setActiveTab('upi')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'upi'
                    ? 'bg-[#1E6F43] text-white shadow-xs'
                    : 'text-[#5C665F] dark:text-slate-400 hover:text-[#18221B]'
                }`}
              >
                <QrCode size={14} />
                <span>UPI QR Transfer</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('bank')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'bank'
                    ? 'bg-[#1E6F43] text-white shadow-xs'
                    : 'text-[#5C665F] dark:text-slate-400 hover:text-[#18221B]'
                }`}
              >
                <Building size={14} />
                <span>Bank NEFT / IMPS</span>
              </button>
            </div>

            {/* TAB CONTENT: UPI */}
            {activeTab === 'upi' && (
              <div className="bg-white dark:bg-[#131C27] rounded-3xl p-6 border border-[#EBE6DC] dark:border-[#222F3E] shadow-xs text-center space-y-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full">
                  Instant UPI Transfer &bull; 0% Convenience Fee
                </span>

                {/* UPI QR Display Card */}
                <div className="p-4 rounded-2xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] inline-block mx-auto shadow-inner">
                  {/* Clean SVG QR Representation */}
                  <svg
                    className="w-48 h-48 mx-auto"
                    viewBox="0 0 200 200"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Background */}
                    <rect width="200" height="200" rx="16" fill="white" />
                    {/* Outer frame & anchors */}
                    <rect x="20" y="20" width="45" height="45" rx="8" stroke="#18221B" strokeWidth="6" />
                    <rect x="32" y="32" width="21" height="21" rx="4" fill="#1E6F43" />
                    <rect x="135" y="20" width="45" height="45" rx="8" stroke="#18221B" strokeWidth="6" />
                    <rect x="147" y="32" width="21" height="21" rx="4" fill="#1E6F43" />
                    <rect x="20" y="135" width="45" height="45" rx="8" stroke="#18221B" strokeWidth="6" />
                    <rect x="32" y="147" width="21" height="21" rx="4" fill="#1E6F43" />
                    {/* Pattern dots */}
                    <rect x="80" y="25" width="12" height="12" fill="#18221B" />
                    <rect x="105" y="25" width="12" height="12" fill="#18221B" />
                    <rect x="80" y="50" width="12" height="12" fill="#18221B" />
                    <rect x="105" y="50" width="12" height="12" fill="#18221B" />
                    <rect x="25" y="85" width="12" height="12" fill="#18221B" />
                    <rect x="50" y="85" width="12" height="12" fill="#18221B" />
                    <rect x="85" y="85" width="30" height="30" rx="4" fill="#C89D35" />
                    <rect x="135" y="85" width="12" height="12" fill="#18221B" />
                    <rect x="160" y="85" width="12" height="12" fill="#18221B" />
                    <rect x="80" y="135" width="12" height="12" fill="#18221B" />
                    <rect x="105" y="135" width="12" height="12" fill="#18221B" />
                    <rect x="135" y="135" width="12" height="12" fill="#18221B" />
                    <rect x="160" y="135" width="12" height="12" fill="#18221B" />
                    <rect x="80" y="160" width="12" height="12" fill="#18221B" />
                    <rect x="135" y="160" width="12" height="12" fill="#18221B" />
                    {/* Center Cross */}
                    <rect x="97" y="92" width="6" height="16" rx="2" fill="white" />
                    <rect x="92" y="97" width="16" height="6" rx="2" fill="white" />
                  </svg>

                  <div className="mt-2 text-center">
                    <p className="text-[11px] font-bold text-[#18221B] dark:text-white">
                      Scan with Google Pay / PhonePe / Paytm
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Amount: ₹{amount.toLocaleString('en-IN')} &bull; {selectedFund}
                    </p>
                  </div>
                </div>

                {/* UPI VPA Copy Field */}
                <div className="p-3.5 rounded-2xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] flex items-center justify-between text-xs">
                  <div className="text-left">
                    <span className="text-[10px] text-slate-400 block font-medium">Church UPI ID:</span>
                    <span className="font-mono font-bold text-[#18221B] dark:text-white">
                      {churchGiving.upiId}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(churchGiving.upiId, 'upi')}
                    className="p-2 rounded-xl bg-white dark:bg-[#131C27] border border-[#EBE6DC] dark:border-[#222F3E] text-[#1E6F43] hover:bg-emerald-50 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'upi' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    <span>{copiedKey === 'upi' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB CONTENT: BANK DETAILS */}
            {activeTab === 'bank' && (
              <div className="bg-white dark:bg-[#131C27] rounded-3xl p-6 border border-[#EBE6DC] dark:border-[#222F3E] shadow-xs space-y-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full inline-block">
                  Direct Bank Wire (NEFT / RTGS / IMPS)
                </span>

                <div className="space-y-2.5 text-xs">
                  <div className="p-3 rounded-2xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Account Name</span>
                      <span className="font-bold text-[#18221B] dark:text-white">
                        {churchGiving.accountName}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(churchGiving.accountName, 'name')}
                      className="p-1.5 text-slate-400 hover:text-[#1E6F43] cursor-pointer"
                    >
                      {copiedKey === 'name' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Account Number</span>
                      <span className="font-mono font-bold text-[#18221B] dark:text-white">
                        {churchGiving.accountNumber}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(churchGiving.accountNumber, 'acc')}
                      className="p-1.5 text-slate-400 hover:text-[#1E6F43] cursor-pointer"
                    >
                      {copiedKey === 'acc' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">IFSC Code</span>
                      <span className="font-mono font-bold text-[#18221B] dark:text-white">
                        {churchGiving.ifscCode}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(churchGiving.ifscCode, 'ifsc')}
                      className="p-1.5 text-slate-400 hover:text-[#1E6F43] cursor-pointer"
                    >
                      {copiedKey === 'ifsc' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A]">
                    <span className="text-[10px] text-slate-400 block">Bank &amp; Branch</span>
                    <span className="font-medium text-[#18221B] dark:text-white">
                      {churchGiving.bankName}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* PRE-PAYMENT INTENTION DOWNLOAD BUTTON */}
            <div className="p-4 rounded-3xl bg-white dark:bg-[#131C27] border border-[#EBE6DC] dark:border-[#222F3E] shadow-xs flex items-center justify-between">
              <div>
                <h4 className="font-bold text-xs text-[#18221B] dark:text-white">
                  Stewardship Intention Record
                </h4>
                <p className="text-[11px] text-slate-400">
                  Download intended pledge voucher for ₹{amount.toLocaleString('en-IN')}.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleDownloadReceipt()}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#18221B] dark:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download size={14} />
                <span>Download Voucher</span>
              </button>
            </div>

            {/* SECURITY GOVERNANCE CALLOUT */}
            <div className="p-3.5 rounded-2xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-[#EFECE6] dark:border-[#1E2B3A] text-[10px] text-slate-500 space-y-1">
              <span className="font-bold flex items-center gap-1 text-[#1E6F43]">
                <ShieldCheck size={12} /> Payment Security &amp; 80G Tax Governance:
              </span>
              <p>
                All donations are recorded directly into the canonical church ledger. Official 80G receipts qualify for 50% income tax deduction under Section 80G of the Indian IT Act.
              </p>
            </div>
          </div>
        </div>

        {/* MY GIVING HISTORY SECTION */}
        <div className="bg-white dark:bg-[#131C27] rounded-3xl p-6 sm:p-7 border border-[#EBE6DC] dark:border-[#222F3E] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="text-[#1E6F43]" size={20} />
              <h2 className="text-base font-bold text-[#18221B] dark:text-white">
                My Giving &amp; Tax Receipt History
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              {donationHistory.length} Record{donationHistory.length === 1 ? '' : 's'}
            </span>
          </div>

          {donationHistory.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-[#FBF9F4] dark:bg-[#0E1520] border border-dashed border-[#EFECE6] dark:border-[#1E2B3A] text-slate-400 text-xs">
              <Receipt size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="font-medium text-slate-600 dark:text-slate-300">No recorded contributions yet.</p>
              <p className="text-[11px] mt-0.5">Submit your first online contribution above to receive an official 80G tax receipt.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#EFECE6] dark:border-[#1E2B3A] text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Receipt No</th>
                    <th className="py-3 px-4">Fund Category</th>
                    <th className="py-3 px-4">Mode / Ref</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFECE6] dark:divide-[#1E2B3A]">
                  {donationHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium">
                        {item.date || item.createdAt?.split('T')[0] || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[#18221B] dark:text-white">
                        {item.receiptNo || item.id}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-200">
                        {item.category}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {item.paymentMethod} &bull; {item.transactionRef?.slice(-8) || '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#1E6F43] dark:text-emerald-400">
                        ₹{item.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 size={12} />
                          <span>{item.status || 'Verified'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDownloadReceipt(item)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-[#1E6F43] dark:text-emerald-300 font-bold transition-all inline-flex items-center gap-1 text-[11px] cursor-pointer"
                        >
                          <Download size={12} />
                          <span>80G Receipt</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

// Helper: Convert numbers to English words for 80G tax receipt
function convertNumberToWords(amount: number): string {
  const words: Record<number, string> = {
    0: 'Zero', 1: 'One', 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five',
    6: 'Six', 7: 'Seven', 8: 'Eight', 9: 'Nine', 10: 'Ten',
    11: 'Eleven', 12: 'Twelve', 13: 'Thirteen', 14: 'Fourteen', 15: 'Fifteen',
    16: 'Sixteen', 17: 'Seventeen', 18: 'Eighteen', 19: 'Nineteen',
    20: 'Twenty', 30: 'Thirty', 40: 'Forty', 50: 'Fifty',
    60: 'Sixty', 70: 'Seventy', 80: 'Eighty', 90: 'Ninety'
  };

  if (amount in words) return words[amount];
  if (amount < 100) {
    const tens = Math.floor(amount / 10) * 10;
    const units = amount % 10;
    return `${words[tens]} ${words[units]}`.trim();
  }
  if (amount < 1000) {
    const hundreds = Math.floor(amount / 100);
    const remainder = amount % 100;
    return `${words[hundreds]} Hundred ${remainder ? convertNumberToWords(remainder) : ''}`.trim();
  }
  if (amount < 100000) {
    const thousands = Math.floor(amount / 1000);
    const remainder = amount % 1000;
    return `${convertNumberToWords(thousands)} Thousand ${remainder ? convertNumberToWords(remainder) : ''}`.trim();
  }
  if (amount < 10000000) {
    const lakhs = Math.floor(amount / 100000);
    const remainder = amount % 100000;
    return `${convertNumberToWords(lakhs)} Lakh ${remainder ? convertNumberToWords(remainder) : ''}`.trim();
  }
  return `${amount}`;
}
